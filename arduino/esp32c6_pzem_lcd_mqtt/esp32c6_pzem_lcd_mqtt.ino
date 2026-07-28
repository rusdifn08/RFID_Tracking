/**
 * ESP32-C6 SuperMini + PZEM-004T v4 + LCD I2C 16x2
 * MQTT broker: 10.5.0.106:1883
 *
 * Continuity KPI (selaras LCD <-> backend <-> dashboard):
 *   - Counter Run/Loss/Off di ESP + NVS adalah sumber kebenaran
 *   - Tiap telemetry kirim run_sec/loss_sec/off_sec -> backend TIMPA DB
 *   - Reset dashboard -> MQTT reset_day -> ESP nol -> LCD & dashboard 0
 *   - WiFi putus -> timer tetap jalan; reconnect -> publishTelemetry sync
 *
 * Topics (sama protokol backend-rust):
 *   iot/gistex/{CODE}/telemetry/pzem
 *   iot/gistex/{CODE}/status/pzem
 *   iot/gistex/{CODE}/cmd | ack
 *
 * Wiring:
 *   PZEM UART1  ESP RX=GPIO17 <- PZEM TX
 *               ESP TX=GPIO16 -> PZEM RX
 *               GND bersama, PZEM L/N ke AC
 *   LCD I2C     SDA=GPIO20  SCL=GPIO19  VCC=3V3/5V  addr 0x27
 *   BTN page    GPIO9 -> GND (INPUT_PULLUP), tap = ganti halaman LCD
 *   BTN reset   GPIO10 -> GND, tahan 2 dtk = reset counter hari ini
 *
 * Board Arduino IDE: "ESP32C6 Dev Module" / SuperMini C6
 * Library: PubSubClient, ArduinoJson, PZEM004Tv30, LiquidCrystal_I2C
 *          Preferences (built-in ESP32) untuk NVS
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <PZEM004Tv30.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Preferences.h>
#include <time.h>

// ===================== CONFIG =====================
static const char *WIFI_SSID = "Robot_Resource (Lokal)";
static const char *WIFI_PASS = "robot@9876";

static const char *MQTT_HOST = "10.5.0.106";
static const uint16_t MQTT_PORT = 1883;
static const char *MQTT_CLIENT_ID = "esp-c6-pzem-sew001";

static const char *MACHINE_CODE = "SEW-001";
static const char *DEVICE_UID = "esp-c6-pzem-001";
static const char *TOPIC_PREFIX = "iot/gistex";
static const char *SENSOR_NAME = "pzem";

// Pin ESP32-C6 SuperMini (sesuai wiring board)
#define SDA_PIN     20
#define SCL_PIN     19
#define PZEM_RX_PIN 17  // Dihubungkan ke TX PZEM
#define PZEM_TX_PIN 16  // Dihubungkan ke RX PZEM
#define I2C_SDA     SDA_PIN
#define I2C_SCL     SCL_PIN
#define BTN_PAGE    9
#define BTN_RESET   10
#define LCD_ADDR    0x27

// Timing
static const uint32_t PZEM_MS = 500;
static const uint32_t TELEMETRY_MS = 1000;
static const uint32_t STATUS_MS = 5000;
static const uint32_t LCD_MS = 250;
static const uint32_t LCD_PAGE_AUTO_MS = 4000;
static const uint32_t WIFI_RETRY_MS = 5000;
static const uint32_t MQTT_RETRY_MS = 3000;
static const uint32_t BTN_DEBOUNCE_MS = 40;
static const uint32_t BTN_LONG_MS = 2000;
static const uint32_t NVS_SAVE_MS = 10000;  // simpan flash max tiap 10 dtk (hemat wear)

// Threshold deteksi — disinkron dari dashboard via MQTT set_calibration
float currentThresholdA = 0.01f;  // default sensitif; dashboard bisa override
float powerThresholdW = 0.0f;  // 0 = off, deteksi hanya dari arus
// Tegangan di atas ini = Power On (meski idle)
float voltageOnV = 180.0f;

// NTP WIB = UTC+7
static const long GMT_OFFSET_SEC = 7 * 3600;
static const int DAYLIGHT_OFFSET_SEC = 0;
static const char *NTP_SERVER = "pool.ntp.org";
// ==================================================

HardwareSerial PZEM_UART(1);
PZEM004Tv30 pzem(PZEM_UART, PZEM_RX_PIN, PZEM_TX_PIN);
LiquidCrystal_I2C lcd(LCD_ADDR, 16, 2);
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
Preferences prefs;

char topicTelemetry[96];
char topicStatus[96];
char topicCmd[96];
char topicAck[96];
char willPayload[220];

enum OpStatus : uint8_t { ST_OFF = 0, ST_IDLE = 1, ST_RUNNING = 2 };
enum LcdPage : uint8_t { PAGE_RUNLOSS = 0, PAGE_POWER = 1, PAGE_NET = 2, PAGE_COUNT = 3 };

OpStatus opStatus = ST_OFF;
LcdPage lcdPage = PAGE_RUNLOSS;
bool lcdManualHold = false;

uint32_t runSec = 0;
uint32_t lossSec = 0;  // idle berarus
uint32_t offSec = 0;
uint32_t lastTickMs = 0;
int lastWibYmd = -1;  // YYYYMMDD

uint32_t nvsRun = 0, nvsLoss = 0, nvsOff = 0;
uint32_t lastNvsSaveMs = 0;
bool countersDirty = false;

float lastV = 0, lastA = 0, lastW = 0, lastE = 0, lastHz = 0, lastPf = 0;
bool pzemOk = false;
uint16_t pzemFailCount = 0;
uint16_t mqttFailCount = 0;
uint16_t wifiFailCount = 0;

bool wifiWasOk = false;
bool mqttWasOk = false;
bool ntpOk = false;
String lastState = "boot";

uint32_t lastPzemMs = 0;
uint32_t lastTelemetryMs = 0;
uint32_t lastStatusMs = 0;
uint32_t lastLcdMs = 0;
uint32_t lastPageAutoMs = 0;
uint32_t lastWifiAttemptMs = 0;
uint32_t lastMqttAttemptMs = 0;

bool btnPagePrev = true;
bool btnResetPrev = true;
uint32_t btnPageDownMs = 0;
uint32_t btnResetDownMs = 0;

void publishTelemetry();
void saveCounters(bool force);

int wibYmdNow() {
  struct tm ti;
  if (!getLocalTime(&ti, 50)) return -1;
  return (ti.tm_year + 1900) * 10000 + (ti.tm_mon + 1) * 100 + ti.tm_mday;
}

void loadCounters() {
  prefs.begin("pzemkpi", true);
  runSec = prefs.getUInt("run", 0);
  lossSec = prefs.getUInt("loss", 0);
  offSec = prefs.getUInt("off", 0);
  lastWibYmd = prefs.getInt("ymd", -1);
  prefs.end();
  nvsRun = runSec;
  nvsLoss = lossSec;
  nvsOff = offSec;
  countersDirty = false;
  Serial.printf("[NVS] load RUN=%lu LOS=%lu OFF=%lu ymd=%d\n",
                (unsigned long)runSec, (unsigned long)lossSec, (unsigned long)offSec, lastWibYmd);
}

void saveCounters(bool force) {
  uint32_t now = millis();
  bool changed = (runSec != nvsRun) || (lossSec != nvsLoss) || (offSec != nvsOff);
  if (!force && !changed) return;
  if (!force && (now - lastNvsSaveMs < NVS_SAVE_MS)) {
    countersDirty = true;
    return;
  }

  prefs.begin("pzemkpi", false);
  prefs.putUInt("run", runSec);
  prefs.putUInt("loss", lossSec);
  prefs.putUInt("off", offSec);
  if (lastWibYmd > 0) prefs.putInt("ymd", lastWibYmd);
  prefs.end();

  nvsRun = runSec;
  nvsLoss = lossSec;
  nvsOff = offSec;
  lastNvsSaveMs = now;
  countersDirty = false;
  if (force) {
    Serial.printf("[NVS] save RUN=%lu LOS=%lu OFF=%lu\n",
                  (unsigned long)runSec, (unsigned long)lossSec, (unsigned long)offSec);
  }
}

void markCountersDirty() {
  countersDirty = true;
}

void buildTopics() {
  snprintf(topicTelemetry, sizeof(topicTelemetry), "%s/%s/telemetry/%s", TOPIC_PREFIX, MACHINE_CODE, SENSOR_NAME);
  snprintf(topicStatus, sizeof(topicStatus), "%s/%s/status/%s", TOPIC_PREFIX, MACHINE_CODE, SENSOR_NAME);
  snprintf(topicCmd, sizeof(topicCmd), "%s/%s/cmd", TOPIC_PREFIX, MACHINE_CODE);
  snprintf(topicAck, sizeof(topicAck), "%s/%s/ack", TOPIC_PREFIX, MACHINE_CODE);
  snprintf(willPayload, sizeof(willPayload),
           "{\"device_uid\":\"%s\",\"machine_code\":\"%s\",\"sensor\":\"%s\",\"state\":\"mqtt_lost\",\"online\":false,\"detail\":\"MQTT LWT\"}",
           DEVICE_UID, MACHINE_CODE, SENSOR_NAME);
}

static const char *statusStr(OpStatus s) {
  switch (s) {
    case ST_RUNNING: return "running";
    case ST_IDLE: return "idle";
    default: return "off";
  }
}

void fmtHms(uint32_t sec, char *out, size_t n) {
  uint32_t h = sec / 3600;
  uint32_t m = (sec % 3600) / 60;
  uint32_t s = sec % 60;
  snprintf(out, n, "%02lu:%02lu:%02lu", (unsigned long)h, (unsigned long)m, (unsigned long)s);
}

float productivityPct() {
  uint32_t powerOn = runSec + lossSec;
  if (powerOn == 0) return 0;
  return (100.0f * runSec) / (float)powerOn;
}

void resetDayCounters(const char *reason) {
  runSec = 0;
  lossSec = 0;
  offSec = 0;
  lastTickMs = millis();
  saveCounters(true);
  Serial.printf("[DAY] reset counters (%s)\n", reason);
}

// ---------- LCD ----------
void lcdPrint2(const char *l1, const char *l2) {
  lcd.setCursor(0, 0);
  lcd.print(l1);
  for (int i = strlen(l1); i < 16; i++) lcd.print(' ');
  lcd.setCursor(0, 1);
  lcd.print(l2);
  for (int i = strlen(l2); i < 16; i++) lcd.print(' ');
}

void renderLcd() {
  char a[17], b[17], t1[10], t2[10];
  switch (lcdPage) {
    case PAGE_RUNLOSS: {
      fmtHms(runSec, t1, sizeof(t1));
      fmtHms(lossSec, t2, sizeof(t2));
      char st = opStatus == ST_RUNNING ? 'R' : (opStatus == ST_IDLE ? 'I' : 'O');
      snprintf(a, sizeof(a), "RUN %s  %c", t1, st);
      snprintf(b, sizeof(b), "LOS %s", t2);
      lcdPrint2(a, b);
      break;
    }
    case PAGE_POWER: {
      if (!pzemOk) {
        lcdPrint2("PZEM FAIL", "cek kabel/AC");
      } else {
        snprintf(a, sizeof(a), "%5.1fV %4.2fA", lastV, lastA);
        snprintf(b, sizeof(b), "%5.0fW P:%4.0f%%", lastW, productivityPct());
        lcdPrint2(a, b);
      }
      break;
    }
    case PAGE_NET: {
      if (WiFi.status() != WL_CONNECTED) {
        lcdPrint2("WiFi ...", WIFI_SSID);
      } else if (!mqtt.connected()) {
        snprintf(a, sizeof(a), "IP %s", WiFi.localIP().toString().c_str());
        lcdPrint2(a, "MQTT ...");
      } else {
        snprintf(a, sizeof(a), "MQTT OK %ddBm", WiFi.RSSI());
        snprintf(b, sizeof(b), "%s", MACHINE_CODE);
        lcdPrint2(a, b);
      }
      break;
    }
    default:
      break;
  }
}

// ---------- MQTT status ----------
void publishStatus(const char *state, const char *detail, bool sensorOk) {
  if (!mqtt.connected()) return;
  StaticJsonDocument<420> doc;
  doc["device_uid"] = DEVICE_UID;
  doc["machine_code"] = MACHINE_CODE;
  doc["sensor"] = SENSOR_NAME;
  doc["state"] = state;
  doc["online"] = true;
  doc["wifi_ok"] = WiFi.status() == WL_CONNECTED;
  doc["mqtt_ok"] = true;
  doc["sensor_ok"] = sensorOk;
  doc["detail"] = detail;
  doc["rssi"] = WiFi.RSSI();
  doc["ip"] = WiFi.localIP().toString();
  doc["uptime_sec"] = millis() / 1000;
  doc["fail_count"] = pzemFailCount;
  doc["run_sec"] = runSec;
  doc["loss_sec"] = lossSec;
  doc["off_sec"] = offSec;
  doc["op_status"] = statusStr(opStatus);

  char buf[420];
  size_t n = serializeJson(doc, buf);
  if (mqtt.publish(topicStatus, (const uint8_t *)buf, n, false) && lastState != state) {
    Serial.printf("[STATUS] %s — %s\n", state, detail);
    lastState = state;
  }
}

void publishAck(const char *command, bool ok) {
  StaticJsonDocument<192> doc;
  doc["device_uid"] = DEVICE_UID;
  doc["command"] = command;
  doc["ok"] = ok;
  doc["current_threshold_a"] = currentThresholdA;
  doc["power_threshold_w"] = powerThresholdW;
  doc["run_sec"] = runSec;
  doc["loss_sec"] = lossSec;
  char buf[192];
  size_t n = serializeJson(doc, buf);
  mqtt.publish(topicAck, buf, n);
}

void onMqttMessage(char *topic, byte *payload, unsigned int length) {
  StaticJsonDocument<320> doc;
  if (deserializeJson(doc, payload, length)) return;
  const char *cmd = doc["command"] | "";

  if (strcmp(cmd, "set_calibration") == 0) {
    if (doc.containsKey("current_threshold_a")) {
      float v = doc["current_threshold_a"].as<float>();
      // terima 0.005..50 A (0.01 dari dashboard valid)
      if (v >= 0.005f && v <= 50.0f) currentThresholdA = v;
    }
    if (doc.containsKey("power_threshold_w")) {
      float v = doc["power_threshold_w"].as<float>();
      if (v >= 0.0f && v <= 5000.0f) powerThresholdW = v;  // 0 = nonaktif
    }
    if (doc.containsKey("voltage_on_v")) {
      float v = doc["voltage_on_v"].as<float>();
      if (v >= 50.0f && v <= 300.0f) voltageOnV = v;
    }
    Serial.printf("[CMD] thr A=%.3f W=%.1f Von=%.0f\n", currentThresholdA, powerThresholdW, voltageOnV);
    publishAck(cmd, true);
  } else if (strcmp(cmd, "reset_day") == 0) {
    const char *target = doc["sensor"] | "";
    if (target[0] != '\0' && strcmp(target, SENSOR_NAME) != 0) return;
    resetDayCounters("mqtt");
    publishAck(cmd, true);
    publishTelemetry();
    publishStatus("ok", "day counters reset via MQTT", pzemOk);
  } else if (strcmp(cmd, "ping") == 0) {
    publishAck(cmd, true);
  } else if (strcmp(cmd, "lcd_page") == 0) {
    lcdPage = (LcdPage)((lcdPage + 1) % PAGE_COUNT);
    lcdManualHold = true;
    lastPageAutoMs = millis();
    publishAck(cmd, true);
  }
}

bool ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!wifiWasOk) {
      wifiWasOk = true;
      configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
      Serial.printf("[WiFi] OK %s RSSI=%d\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
    }
    return true;
  }
  if (wifiWasOk) {
    saveCounters(true);
    wifiWasOk = false;
    mqttWasOk = false;
    ntpOk = false;
    Serial.println("[WiFi] lost - counters saved to NVS");
  }

  // Jangan setHostname / mode / begin ulang saat STA masih connecting (ESP-C6 error)
  uint32_t now = millis();
  if (now - lastWifiAttemptMs < WIFI_RETRY_MS) return false;
  lastWifiAttemptMs = now;
  wifiFailCount++;

  Serial.printf("[WiFi] reconnect #%u ...\n", wifiFailCount);
  WiFi.disconnect(false);
  delay(50);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  uint8_t tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40) {
    delay(250);
    tries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    wifiWasOk = true;
    configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
    Serial.printf("[WiFi] OK %s\n", WiFi.localIP().toString().c_str());
    return true;
  }
  Serial.println("[WiFi] timeout - coba lagi nanti");
  return false;
}

bool ensureMqtt() {
  if (mqtt.connected()) {
    if (!mqttWasOk) {
      mqttWasOk = true;
      saveCounters(true);
      publishTelemetry();
      publishStatus("resync", "MQTT reconnect — sync Run/Loss dari ESP", pzemOk);
    }
    return true;
  }
  if (WiFi.status() != WL_CONNECTED) return false;
  if (mqttWasOk) {
    saveCounters(true);
    mqttWasOk = false;
  }

  uint32_t now = millis();
  if (now - lastMqttAttemptMs < MQTT_RETRY_MS) return false;
  lastMqttAttemptMs = now;
  mqttFailCount++;

  bool ok = mqtt.connect(MQTT_CLIENT_ID, topicStatus, 1, true, willPayload);
  if (ok) {
    mqtt.subscribe(topicCmd);
    mqttWasOk = true;
    saveCounters(true);
    publishAck("boot", true);
    publishTelemetry();  // dorong nilai NVS/lokal ke dashboard
    publishStatus("resync", "MQTT connected — sync Run/Loss dari ESP", pzemOk);
    return true;
  }
  Serial.printf("[MQTT] fail rc=%d\n", mqtt.state());
  return false;
}

OpStatus classify(float v, float a, float w, bool ok) {
  (void)v;  // tegangan tidak menentukan status; hanya arus (+ power fallback)
  if (!ok) return ST_OFF;

  // A ≈ 0 → Mati; 0 < A < thr → Idle; A >= thr → Running
  const float NOISE_A = 0.005f;
  if (a < NOISE_A) return ST_OFF;

  float thrA = currentThresholdA;
  if (thrA < NOISE_A) thrA = NOISE_A;

  bool running = (a >= thrA);
  if (!running && powerThresholdW > 0.0f) {
    running = (w >= powerThresholdW);
  }
  return running ? ST_RUNNING : ST_IDLE;
}

void tickTimers() {
  uint32_t now = millis();
  if (lastTickMs == 0) {
    lastTickMs = now;
    return;
  }
  uint32_t dt = (now - lastTickMs) / 1000;
  if (dt == 0) return;
  lastTickMs += dt * 1000;

  switch (opStatus) {
    case ST_RUNNING: runSec += dt; break;
    case ST_IDLE: lossSec += dt; break;
    default: offSec += dt; break;
  }
  markCountersDirty();
}

void checkWibMidnight() {
  int ymd = wibYmdNow();
  if (ymd < 0) return;
  ntpOk = true;

  if (lastWibYmd < 0) {
    // Pertama kali NTP OK: jika counter NVS dari hari lain, reset
    lastWibYmd = ymd;
    if (runSec + lossSec + offSec > 0) {
      // ponytail: tanpa ymd tersimpan, anggap counter milik hari ini (lanjut)
      saveCounters(true);
    } else {
      saveCounters(true);
    }
    return;
  }
  if (ymd != lastWibYmd) {
    publishStatus("day_cut", "WIB midnight / hari baru - reset counter", pzemOk);
    lastWibYmd = ymd;
    resetDayCounters("wib_midnight");
    if (mqtt.connected()) publishTelemetry();
  }
}

void readPzem() {
  float v = pzem.voltage();
  bool ok = !isnan(v);
  float a = 0, w = 0, e = 0, f = 0, pf = 0;
  if (!ok) {
    pzemFailCount++;
    pzemOk = false;
    if (pzemFailCount == 1 || (pzemFailCount % 10) == 0) {
      publishStatus("sensor_fail", "PZEM NaN — cek TX/RX/GND/L-N AC", false);
    }
  } else {
    if (!pzemOk) publishStatus("sensor_ok", "PZEM terbaca", true);
    pzemOk = true;
    pzemFailCount = 0;
    a = pzem.current();
    w = pzem.power();
    e = pzem.energy();
    f = pzem.frequency();
    pf = pzem.pf();
    if (isnan(a)) a = 0;
    if (isnan(w)) w = 0;
    if (isnan(e)) e = 0;
    if (isnan(f)) f = 0;
    if (isnan(pf)) pf = 0;
  }
  lastV = ok ? v : 0;
  lastA = a;
  lastW = w;
  lastE = e;
  lastHz = f;
  lastPf = pf;
  opStatus = classify(lastV, lastA, lastW, ok);
}

void publishTelemetry() {
  if (!mqtt.connected()) return;
  StaticJsonDocument<480> doc;
  doc["device_uid"] = DEVICE_UID;
  doc["machine_code"] = MACHINE_CODE;
  doc["pzem_ok"] = pzemOk;
  doc["sensor_ok"] = pzemOk;
  doc["voltage_v"] = lastV;
  doc["current_a"] = lastA;
  doc["power_w"] = lastW;
  doc["energy_kwh"] = lastE;
  doc["frequency_hz"] = lastHz;
  doc["power_factor"] = lastPf;
  doc["op_status"] = statusStr(opStatus);
  doc["run_sec"] = runSec;
  doc["loss_sec"] = lossSec;
  doc["off_sec"] = offSec;
  doc["power_on_sec"] = runSec + lossSec;
  doc["productivity_pct"] = productivityPct();
  doc["current_threshold_a"] = currentThresholdA;
  doc["power_threshold_w"] = powerThresholdW;
  doc["fail_count"] = pzemFailCount;

  char buf[480];
  size_t n = serializeJson(doc, buf);
  mqtt.publish(topicTelemetry, (const uint8_t *)buf, n, false);
}

void handleButtons() {
  uint32_t now = millis();
  bool pageUp = digitalRead(BTN_PAGE) == HIGH;
  bool resetUp = digitalRead(BTN_RESET) == HIGH;

  if (!pageUp && btnPagePrev) btnPageDownMs = now;
  if (pageUp && !btnPagePrev && (now - btnPageDownMs) > BTN_DEBOUNCE_MS) {
    lcdPage = (LcdPage)((lcdPage + 1) % PAGE_COUNT);
    lcdManualHold = true;
    lastPageAutoMs = now;
    renderLcd();
  }
  btnPagePrev = pageUp;

  if (!resetUp && btnResetPrev) btnResetDownMs = now;
  if (!resetUp && (now - btnResetDownMs) >= BTN_LONG_MS && btnResetDownMs > 0) {
    resetDayCounters("btn_long");
    publishStatus("ok", "day reset via button", pzemOk);
    btnResetDownMs = 0;  // cegah spam
    lcdPage = PAGE_RUNLOSS;
    renderLcd();
  }
  if (resetUp) btnResetDownMs = 0;
  btnResetPrev = resetUp;
}

void setup() {
  Serial.begin(115200);
  delay(300);
  pinMode(BTN_PAGE, INPUT_PULLUP);
  pinMode(BTN_RESET, INPUT_PULLUP);

  buildTopics();
  loadCounters();  // lanjutkan Run/Loss setelah restart

  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();
  {
    char t1[10], t2[10], line[17];
    fmtHms(runSec, t1, sizeof(t1));
    fmtHms(lossSec, t2, sizeof(t2));
    snprintf(line, sizeof(line), "R%s L%s", t1, t2);
    lcdPrint2("NVS restore", line);
  }

  PZEM_UART.begin(9600, SERIAL_8N1, PZEM_RX_PIN, PZEM_TX_PIN);
  delay(800);

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
  mqtt.setBufferSize(512);
  mqtt.setKeepAlive(15);

  WiFi.mode(WIFI_STA);
  WiFi.setHostname(MQTT_CLIENT_ID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  lastWifiAttemptMs = millis();  // cegah ensureWifi() begin ulang saat masih connecting
  lastTickMs = millis();
  lastPageAutoMs = millis();

  Serial.println("[BOOT] ESP32-C6 SuperMini PZEM+LCD + NVS persist");
  Serial.printf("[BOOT] MQTT %s:%u  topic %s\n", MQTT_HOST, MQTT_PORT, topicTelemetry);
  Serial.printf("[BOOT] WiFi connecting to %s ...\n", WIFI_SSID);
}

void loop() {
  ensureWifi();
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqtt.connected()) ensureMqtt();
    else mqtt.loop();
    checkWibMidnight();
  }

  uint32_t now = millis();

  if (now - lastPzemMs >= PZEM_MS) {
    lastPzemMs = now;
    readPzem();
    tickTimers();
  }

  // Simpan berkala (juga saat offline)
  if (countersDirty) saveCounters(false);

  if (mqtt.connected() && (now - lastTelemetryMs >= TELEMETRY_MS)) {
    lastTelemetryMs = now;
    publishTelemetry();
  }

  if (mqtt.connected() && (now - lastStatusMs >= STATUS_MS)) {
    lastStatusMs = now;
    if (pzemOk) publishStatus("ok", "ESP-C6+PZEM sehat", true);
    else publishStatus("sensor_fail", "ESP online, PZEM gagal", false);
  }

  handleButtons();

  if (!lcdManualHold && (now - lastPageAutoMs >= LCD_PAGE_AUTO_MS)) {
    lastPageAutoMs = now;
    lcdPage = (LcdPage)((lcdPage + 1) % PAGE_COUNT);
  }
  if (lcdManualHold && (now - lastPageAutoMs >= 12000)) lcdManualHold = false;

  if (now - lastLcdMs >= LCD_MS) {
    lastLcdMs = now;
    renderLcd();
  }
}

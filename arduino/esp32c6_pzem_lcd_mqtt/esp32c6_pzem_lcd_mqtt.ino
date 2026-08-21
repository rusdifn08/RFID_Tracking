/**
 * ESP32-C6 SuperMini + PZEM-004T v4 + LCD I2C 16x2
 * Firmware final: metadata (operator/NIK/style/line/location/kalibrasi) dari backend
 * via retained desired_state. WiFi/MQTT auth dari NVS / Setup AP — tanpa password di source.
 *
 * Arduino IDE: ESP32C6 Dev Module, flash 4MB, partition scheme = Custom
 *   (Tools → Partition Scheme → pilih csv di folder sketch: partitions.csv)
 *
 * Topics:
 *   iot/gistex/{CODE}/telemetry/pzem | status/pzem | cmd | ack | desired
 *   iot/gistex/dev/{UID}/cmd | desired | lcd_state
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <PZEM004Tv30.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Preferences.h>
#include <Update.h>
#include <time.h>
#include <esp_wifi.h>
#include <esp_system.h>
#include <esp_task_wdt.h>
#include <esp_ota_ops.h>
#include <mbedtls/sha256.h>

#ifndef ENABLE_LOCAL_BUTTONS
#define ENABLE_LOCAL_BUTTONS 1
#endif
#ifndef ENABLE_SETUP_AP
#define ENABLE_SETUP_AP 1
#endif
#ifndef FACTORY_WIFI_SSID
#define FACTORY_WIFI_SSID ""
#endif
#ifndef FACTORY_WIFI_PASSWORD
#define FACTORY_WIFI_PASSWORD ""
#endif
#ifndef FACTORY_MQTT_USER
#define FACTORY_MQTT_USER ""
#endif
#ifndef FACTORY_MQTT_PASSWORD
#define FACTORY_MQTT_PASSWORD ""
#endif
#ifndef FACTORY_MQTT_HOST
#define FACTORY_MQTT_HOST "10.5.0.106"
#endif
#ifndef FACTORY_MQTT_PORT
#define FACTORY_MQTT_PORT 1883
#endif
#ifndef FACTORY_MACHINE_CODE
#define FACTORY_MACHINE_CODE "JUKI006"
#endif
#ifndef FACTORY_DEVICE_UID
#define FACTORY_DEVICE_UID "006"
#endif
#ifndef DEVICE_CAPABILITIES
#define DEVICE_CAPABILITIES "desired,ota,setup_ap,lcd_pages,wdt"
#endif

static const char *FW_VERSION = "2.0.0";
static const uint8_t PROTOCOL_VERSION = 1;
static const char *CAPABILITIES = DEVICE_CAPABILITIES;

// ===================== CONFIG (identitas default; kredensial hanya NVS / Setup AP) =====================
static const char *DEFAULT_MQTT_HOST = FACTORY_MQTT_HOST;
static const uint16_t DEFAULT_MQTT_PORT = FACTORY_MQTT_PORT;
static const char *DEFAULT_MACHINE_CODE = FACTORY_MACHINE_CODE;
static const char *DEFAULT_DEVICE_UID = FACTORY_DEVICE_UID;
static const bool DEFAULT_LOGIN_REQUIRED = false;
static const uint8_t LOGIN_DEFAULT_REV = 2;
static const char *TOPIC_PREFIX = "iot/gistex";
static const char *SENSOR_NAME = "pzem";
static const uint32_t MQTT_BUF_SIZE = 4096;

// Runtime identity (NVS / Setup AP / MQTT)
char wifiSsid[48];
char wifiPass[64];
char mqttHost[48];
char mqttUser[32];
char mqttPass[64];
uint16_t mqttPort = DEFAULT_MQTT_PORT;
char machineCode[24];
char deviceUid[24];
char mqttClientId[40];
char bootId[12];
char lastCmdId[40];
uint32_t lastDesiredRev = 0;
bool wifiCredsDirty = false;
bool mqttNeedsReconnect = false;
bool setupApMode = false;
bool wifiScanPending = false;

#define LCD_DYN_MAX 6
char lcdDynL1[LCD_DYN_MAX][17];
char lcdDynL2[LCD_DYN_MAX][17];
uint8_t lcdDynN = 0;

WebServer setupHttp(80);
DNSServer setupDns;
uint32_t setupApSinceMs = 0;

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
static const uint32_t LCD_PAGE_AUTO_MS = 4000;  // 4 dtk per slide
static const uint32_t LCD_SCROLL_MS = 350;
static const uint32_t WIFI_RETRY_MS = 8000;
static const uint32_t MQTT_RETRY_MS = 3000;
static const uint32_t MQTT_RETRY_MAX_MS = 60000;
static const uint16_t MQTT_KEEPALIVE_SEC = 60;
static const uint16_t MQTT_SOCKET_TIMEOUT_SEC = 10;
static const uint32_t BTN_DEBOUNCE_MS = 40;
static const uint32_t BTN_LONG_MS = 2000;
static const uint32_t NVS_SAVE_MS = 60000UL;  // counter flash max tiap 60 dtk
static const uint32_t RECOVERY_REBOOT_MS = 10 * 60 * 1000UL;
static const uint32_t SETUP_AP_TIMEOUT_MS = 10UL * 60UL * 1000UL;
static const uint32_t FACTORY_HOLD_MS = 5000;
static const uint32_t WDT_TIMEOUT_MS = 15000;

uint32_t mqttBackoffMs = MQTT_RETRY_MS;

// Threshold deteksi — disinkron dari dashboard via MQTT set_calibration
float currentThresholdA = 0.6f;  // Running ≥ A (dashboard bisa override)
float offCurrentA = 0.01f;       // Mati jika A < off; Idle = off…thr (dashboard bisa override)
float powerThresholdW = 0.0f;  // 0 = off, deteksi hanya dari arus
float voltageOnV = 180.0f;
uint32_t filterAktifMs = 1500;
uint32_t filterDiamMs = 1500;
uint32_t lcdAutoMs = LCD_PAGE_AUTO_MS;
bool kpiFromBackend = false;  // true = LCD tampil angka dari backend
bool loginSystemOn = DEFAULT_LOGIN_REQUIRED;  // wajib login (default kode / NVS / dashboard)
bool operatorLoggedIn = false;  // login harian (WIB)
int loginWibYmd = -1;
char lcdFlashScroll[48];        // running text overlay 5 dtk
bool lcdFlashScrollOn = false;
char lcdName[40] = "";      // machine name / Brand+Proses
char lcdProcess[40] = "";   // proses saja
char lcdOperator[40] = "";  // nama operator aktif (tanpa code mesin)
uint8_t lcdScrollPos = 0;
uint32_t lastScrollMs = 0;

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
char topicDevCmd[96];
char topicLcdState[96];
char topicDevLcd[96];
char topicDesired[96];
char topicDevDesired[96];
char topicAck[96];
char willPayload[220];

enum OpStatus : uint8_t { ST_OFF = 0, ST_IDLE = 1, ST_RUNNING = 2 };

OpStatus opStatus = ST_OFF;
OpStatus pendStatus = ST_OFF;
uint32_t pendSinceMs = 0;
uint8_t lcdPage = 0;
bool lcdManualHold = false;
uint32_t loginFlashUntilMs = 0;  // LCD flash sampai millis ini
char lcdLoginLine1[17];
char lcdLoginLine2[17];

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
bool ipReportedOnce = false;  // IP hanya dikirim 1x per sesi MQTT connect
bool ntpOk = false;
String lastState = "boot";

uint32_t lastPzemMs = 0;
uint32_t lastTelemetryMs = 0;
uint32_t lastStatusMs = 0;
uint32_t lastLcdMs = 0;
uint32_t lastPageAutoMs = 0;
uint32_t lastWifiAttemptMs = 0;
uint32_t lastMqttAttemptMs = 0;
uint32_t offlineSinceMs = 0;
uint32_t factoryHoldMs = 0;

bool btnPagePrev = true;
bool btnResetPrev = true;
uint32_t btnPageDownMs = 0;
uint32_t btnResetDownMs = 0;

void publishTelemetry();
void saveCounters(bool force);
void wifiBeginCurrent();
void loadCalibration();
void saveCalibration();
void loadLoginState();
OpStatus classify(float v, float a, float w, bool ok);
static const char *statusStr(OpStatus s);
void saveLoginState();
void setOperatorLoggedIn(bool ok, bool flashAck);
void clearOperatorLogin(const char *reason);
void loadIdentity();
void saveIdentity();
void buildTopics();
void applyIdentity(const char *code, const char *uid);
void resubscribeMqtt();
void applyStatusFilter(OpStatus raw);
void publishConfigAck(const char *cmd);
void publishWifiScanAck();
void publishAck(const char *command, bool ok);
void publishAckErr(const char *command, const char *err);
void startSetupAp(const char *why);
void stopSetupAp();
void handleSetupAp();
bool wifiProvisioned();
void applyDesiredState(JsonObject doc);
void runOtaUpdate(const char *url, const char *shaHex, const char *ver);
void factoryReset();
void wdtFeed();
void confirmOtaIfPending();
const char *resetReasonStr();

int wibYmdNow() {
  struct tm ti;
  if (!getLocalTime(&ti, 50)) return -1;
  return (ti.tm_year + 1900) * 10000 + (ti.tm_mon + 1) * 100 + ti.tm_mday;
}

void buildMqttClientId() {
  // Unik per board: hindari bentrok client_id (penyebab kick ↔ reconnect loop)
  uint16_t chip = (uint16_t)(ESP.getEfuseMac() & 0xFFFF);
  snprintf(mqttClientId, sizeof(mqttClientId), "%s-%s-%04X", machineCode, deviceUid, chip);
}

void loadIdentity() {
  strncpy(wifiSsid, FACTORY_WIFI_SSID, sizeof(wifiSsid) - 1);
  strncpy(wifiPass, FACTORY_WIFI_PASSWORD, sizeof(wifiPass) - 1);
  strncpy(mqttUser, FACTORY_MQTT_USER, sizeof(mqttUser) - 1);
  strncpy(mqttPass, FACTORY_MQTT_PASSWORD, sizeof(mqttPass) - 1);
  wifiSsid[sizeof(wifiSsid) - 1] = 0;
  wifiPass[sizeof(wifiPass) - 1] = 0;
  mqttUser[sizeof(mqttUser) - 1] = 0;
  mqttPass[sizeof(mqttPass) - 1] = 0;
  strncpy(mqttHost, DEFAULT_MQTT_HOST, sizeof(mqttHost) - 1);
  mqttHost[sizeof(mqttHost) - 1] = 0;
  mqttPort = DEFAULT_MQTT_PORT;
  strncpy(machineCode, DEFAULT_MACHINE_CODE, sizeof(machineCode) - 1);
  strncpy(deviceUid, DEFAULT_DEVICE_UID, sizeof(deviceUid) - 1);
  machineCode[sizeof(machineCode) - 1] = 0;
  deviceUid[sizeof(deviceUid) - 1] = 0;

  char tmp[64];
  prefs.begin("pzemid", true);
  if (prefs.getString("ssid", tmp, sizeof(tmp)) > 0) {
    strncpy(wifiSsid, tmp, sizeof(wifiSsid) - 1);
    wifiSsid[sizeof(wifiSsid) - 1] = 0;
  }
  if (prefs.getString("pass", tmp, sizeof(tmp)) > 0) {
    strncpy(wifiPass, tmp, sizeof(wifiPass) - 1);
    wifiPass[sizeof(wifiPass) - 1] = 0;
  }
  if (prefs.getString("mhost", tmp, sizeof(tmp)) > 0) {
    strncpy(mqttHost, tmp, sizeof(mqttHost) - 1);
    mqttHost[sizeof(mqttHost) - 1] = 0;
  }
  mqttPort = (uint16_t)prefs.getUShort("mport", DEFAULT_MQTT_PORT);
  if (mqttPort == 0) mqttPort = DEFAULT_MQTT_PORT;
  if (prefs.getString("muser", tmp, sizeof(tmp)) > 0) {
    strncpy(mqttUser, tmp, sizeof(mqttUser) - 1);
    mqttUser[sizeof(mqttUser) - 1] = 0;
  }
  if (prefs.getString("mpass", tmp, sizeof(tmp)) > 0) {
    strncpy(mqttPass, tmp, sizeof(mqttPass) - 1);
    mqttPass[sizeof(mqttPass) - 1] = 0;
  }
  if (prefs.getString("code", tmp, sizeof(tmp)) > 0) {
    strncpy(machineCode, tmp, sizeof(machineCode) - 1);
    machineCode[sizeof(machineCode) - 1] = 0;
  }
  if (prefs.getString("uid", tmp, sizeof(tmp)) > 0) {
    strncpy(deviceUid, tmp, sizeof(deviceUid) - 1);
    deviceUid[sizeof(deviceUid) - 1] = 0;
  }
  lastDesiredRev = prefs.getUInt("drev", 0);
  prefs.end();
  buildMqttClientId();
}

void saveIdentity() {
  prefs.begin("pzemid", false);
  prefs.putString("ssid", wifiSsid);
  prefs.putString("pass", wifiPass);
  prefs.putString("mhost", mqttHost);
  prefs.putUShort("mport", mqttPort);
  prefs.putString("muser", mqttUser);
  prefs.putString("mpass", mqttPass);
  prefs.putString("code", machineCode);
  prefs.putString("uid", deviceUid);
  prefs.putUInt("drev", lastDesiredRev);
  prefs.end();
}

bool wifiProvisioned() {
  return wifiSsid[0] && wifiPass[0];
}

void buildTopics() {
  snprintf(topicTelemetry, sizeof(topicTelemetry), "%s/%s/telemetry/%s", TOPIC_PREFIX, machineCode, SENSOR_NAME);
  snprintf(topicStatus, sizeof(topicStatus), "%s/%s/status/%s", TOPIC_PREFIX, machineCode, SENSOR_NAME);
  snprintf(topicCmd, sizeof(topicCmd), "%s/%s/cmd", TOPIC_PREFIX, machineCode);
  snprintf(topicDevCmd, sizeof(topicDevCmd), "%s/dev/%s/cmd", TOPIC_PREFIX, deviceUid);
  snprintf(topicLcdState, sizeof(topicLcdState), "%s/%s/lcd_state", TOPIC_PREFIX, machineCode);
  snprintf(topicDevLcd, sizeof(topicDevLcd), "%s/dev/%s/lcd_state", TOPIC_PREFIX, deviceUid);
  snprintf(topicDesired, sizeof(topicDesired), "%s/%s/desired", TOPIC_PREFIX, machineCode);
  snprintf(topicDevDesired, sizeof(topicDevDesired), "%s/dev/%s/desired", TOPIC_PREFIX, deviceUid);
  snprintf(topicAck, sizeof(topicAck), "%s/%s/ack", TOPIC_PREFIX, machineCode);
  snprintf(willPayload, sizeof(willPayload),
           "{\"device_uid\":\"%s\",\"machine_code\":\"%s\",\"sensor\":\"%s\",\"state\":\"mqtt_lost\",\"online\":false,\"detail\":\"MQTT LWT\"}",
           deviceUid, machineCode, SENSOR_NAME);
}

void resubscribeMqtt() {
  if (!mqtt.connected()) return;
  mqtt.subscribe(topicCmd);
  mqtt.subscribe(topicDevCmd);
  mqtt.subscribe(topicLcdState);
  mqtt.subscribe(topicDevLcd);
  mqtt.subscribe(topicDesired);
  mqtt.subscribe(topicDevDesired);
}

void applyIdentity(const char *code, const char *uid) {
  bool changed = false;
  if (code && code[0] && strcmp(code, machineCode) != 0) {
    strncpy(machineCode, code, sizeof(machineCode) - 1);
    machineCode[sizeof(machineCode) - 1] = 0;
    changed = true;
  }
  if (uid && uid[0] && strcmp(uid, deviceUid) != 0) {
    strncpy(deviceUid, uid, sizeof(deviceUid) - 1);
    deviceUid[sizeof(deviceUid) - 1] = 0;
    changed = true;
  }
  if (!changed) return;

  buildMqttClientId();
  if (mqtt.connected()) {
    mqtt.unsubscribe(topicCmd);
    mqtt.unsubscribe(topicDevCmd);
    mqtt.unsubscribe(topicLcdState);
    mqtt.unsubscribe(topicDevLcd);
    mqtt.unsubscribe(topicDesired);
    mqtt.unsubscribe(topicDevDesired);
  }
  buildTopics();
  saveIdentity();
  mqttNeedsReconnect = true;  // client id / LWT perlu connect ulang
}

void loadCalibration() {
  prefs.begin("pzemcal", true);
  currentThresholdA = prefs.getFloat("thrA", currentThresholdA);
  offCurrentA = prefs.getFloat("offA", offCurrentA);
  powerThresholdW = prefs.getFloat("thrW", powerThresholdW);
  voltageOnV = prefs.getFloat("von", voltageOnV);
  filterAktifMs = prefs.getUInt("fAktif", filterAktifMs);
  filterDiamMs = prefs.getUInt("fDiam", filterDiamMs);
  lcdAutoMs = prefs.getUInt("lcdAuto", lcdAutoMs);
  if (lcdAutoMs == 5000) lcdAutoMs = LCD_PAGE_AUTO_MS;  // migrasi default lama 5s → 4s
  if (lcdAutoMs < 4000) lcdAutoMs = 4000;  // min 4 dtk per slide
  kpiFromBackend = prefs.getBool("kpiBe", false);
  prefs.getString("lcdName", lcdName, sizeof(lcdName));
  prefs.getString("lcdProc", lcdProcess, sizeof(lcdProcess));
  prefs.getString("lcdOp", lcdOperator, sizeof(lcdOperator));
  prefs.end();
  // migrasi default lama 0.03 → 0.01 (Idle/MSN ON mulai di atas 0.01 A)
  bool offMigrated = false;
  if (offCurrentA >= 0.02f && offCurrentA <= 0.04f) {
    offCurrentA = 0.01f;
    offMigrated = true;
  }
  if (offMigrated) saveCalibration();
}

void saveCalibration() {
  prefs.begin("pzemcal", false);
  prefs.putFloat("thrA", currentThresholdA);
  prefs.putFloat("offA", offCurrentA);
  prefs.putFloat("thrW", powerThresholdW);
  prefs.putFloat("von", voltageOnV);
  prefs.putUInt("fAktif", filterAktifMs);
  prefs.putUInt("fDiam", filterDiamMs);
  prefs.putUInt("lcdAuto", lcdAutoMs);
  prefs.putBool("kpiBe", kpiFromBackend);
  prefs.putString("lcdName", lcdName);
  prefs.putString("lcdProc", lcdProcess);
  prefs.putString("lcdOp", lcdOperator);
  prefs.end();
}

void loadLoginState() {
  prefs.begin("pzemlogin", false);
  uint8_t rev = prefs.getUChar("sysRev", 0);
  operatorLoggedIn = prefs.getBool("ok", false);
  loginWibYmd = (int)prefs.getInt("ymd", -1);
  if (rev != LOGIN_DEFAULT_REV) {
    // Firmware default berubah → paksa sysOn dari kode, bukan NVS lama
    loginSystemOn = DEFAULT_LOGIN_REQUIRED;
    prefs.putUChar("sysRev", LOGIN_DEFAULT_REV);
    prefs.putBool("sysOn", loginSystemOn);
  } else {
    loginSystemOn = prefs.getBool("sysOn", DEFAULT_LOGIN_REQUIRED);
  }
  prefs.end();
  // System Login OFF → jangan tampil "OPERATOR BELUM…"
  if (!loginSystemOn) {
    operatorLoggedIn = true;
    if (loginWibYmd < 0) {
      int ymd = wibYmdNow();
      loginWibYmd = ymd > 0 ? ymd : 0;
    }
    saveLoginState();
  }
}

void saveLoginState() {
  prefs.begin("pzemlogin", false);
  prefs.putBool("ok", operatorLoggedIn);
  prefs.putInt("ymd", loginWibYmd);
  prefs.putBool("sysOn", loginSystemOn);
  prefs.end();
}

void clearOperatorLogin(const char *reason) {
  // System Login OFF → mesin tetap boleh jalan tanpa login harian
  if (!loginSystemOn) {
    operatorLoggedIn = true;
    int ymd = wibYmdNow();
    loginWibYmd = ymd > 0 ? ymd : 0;
    saveLoginState();
    return;
  }
  operatorLoggedIn = false;
  loginWibYmd = -1;
  saveLoginState();
}

void setOperatorLoggedIn(bool ok, bool /*flashAck*/) {
  int ymd = wibYmdNow();
  operatorLoggedIn = ok;
  loginWibYmd = ok ? (ymd > 0 ? ymd : loginWibYmd) : -1;
  if (ok && loginWibYmd < 0) loginWibYmd = 0;  // NTP belum: tetap tandai login sampai midnight check
  if (!ok) lcdOperator[0] = 0;
  saveLoginState();
}

void applyStatusFilter(OpStatus raw) {
  uint32_t now = millis();
  // Off segera (A < 0.01) — jangan biarkan Loss/Run nambah saat mesin mati
  if (raw == ST_OFF) {
    opStatus = ST_OFF;
    pendStatus = ST_OFF;
    pendSinceMs = now;
    return;
  }
  if (raw == opStatus) {
    pendStatus = raw;
    pendSinceMs = now;
    return;
  }
  if (raw != pendStatus) {
    pendStatus = raw;
    pendSinceMs = now;
    return;
  }
  uint32_t need = (raw == ST_RUNNING) ? filterAktifMs : filterDiamMs;
  if (need < 50) need = 50;
  if (now - pendSinceMs >= need) {
    opStatus = raw;
  }
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
}

void markCountersDirty() {
  countersDirty = true;
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
  clearOperatorLogin(reason);  // hari baru → wajib login lagi
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

/** Custom CGRAM untuk digit besar (tinggi 2 baris LCD). */
void lcdLoadBigDigitChars() {
  // 0=LT 1=UB 2=RT 3=LL 4=LB 5=LR 6=UMB 7=LMB
  static const byte LT[8]  = {0b00111, 0b01111, 0b11111, 0b11111, 0b11111, 0b11111, 0b11111, 0b11111};
  static const byte UB[8]  = {0b11111, 0b11111, 0b11111, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000};
  static const byte RT[8]  = {0b11100, 0b11110, 0b11111, 0b11111, 0b11111, 0b11111, 0b11111, 0b11111};
  static const byte LL[8]  = {0b11111, 0b11111, 0b11111, 0b11111, 0b11111, 0b01111, 0b00111, 0b00000};
  static const byte LB[8]  = {0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b11111, 0b11111, 0b11111};
  static const byte LR[8]  = {0b11111, 0b11111, 0b11111, 0b11111, 0b11111, 0b11110, 0b11100, 0b00000};
  static const byte UMB[8] = {0b11111, 0b11111, 0b11111, 0b00000, 0b00000, 0b00000, 0b11111, 0b11111};
  static const byte LMB[8] = {0b11111, 0b00000, 0b00000, 0b00000, 0b00000, 0b11111, 0b11111, 0b11111};
  lcd.createChar(0, (uint8_t *)LT);
  lcd.createChar(1, (uint8_t *)UB);
  lcd.createChar(2, (uint8_t *)RT);
  lcd.createChar(3, (uint8_t *)LL);
  lcd.createChar(4, (uint8_t *)LB);
  lcd.createChar(5, (uint8_t *)LR);
  lcd.createChar(6, (uint8_t *)UMB);
  lcd.createChar(7, (uint8_t *)LMB);
}

/** Gambar satu digit 0–9, lebar 3 kolom × 2 baris, di kolom `col`. */
void lcdDrawBigDigit(uint8_t col, char ch) {
  // top[3], bot[3] — indeks CGRAM atau ' ' / 0xFF block
  static const char TOP[10][3] = {
      {0, 1, 2}, {' ', 1, 2}, {6, 6, 2}, {6, 6, 2}, {3, 4, 2},
      {0, 6, 6}, {0, 6, 6}, {1, 1, 2}, {0, 6, 2}, {0, 6, 2},
  };
  static const char BOT[10][3] = {
      {3, 4, 5}, {' ', 4, 5}, {3, 7, 7}, {7, 7, 5}, {' ', ' ', 5},
      {7, 7, 5}, {3, 7, 5}, {' ', ' ', 5}, {3, 7, 5}, {7, 7, 5},
  };
  if (ch < '0' || ch > '9') return;
  int d = ch - '0';
  lcd.setCursor(col, 0);
  for (int i = 0; i < 3; i++) {
    char c = TOP[d][i];
    if (c == ' ') lcd.print(' ');
    else lcd.write((uint8_t)c);
  }
  lcd.setCursor(col, 1);
  for (int i = 0; i < 3; i++) {
    char c = BOT[d][i];
    if (c == ' ') lcd.print(' ');
    else lcd.write((uint8_t)c);
  }
}

/**
 * Splash UID besar sesuai nomor UID (006 tetap 006), sebelum MAC & WiFi.
 */
void showUidSplashLcd(uint32_t ms) {
  lcd.clear();
  lcdLoadBigDigitChars();

  char digits[5];
  int n = 0;
  for (int i = 0; deviceUid[i] && n < 4; i++) {
    if (deviceUid[i] >= '0' && deviceUid[i] <= '9') digits[n++] = deviceUid[i];
  }
  if (n == 0) {
    lcdPrint2("UID", deviceUid[0] ? deviceUid : "?");
    delay(ms);
    lcd.clear();
    return;
  }
  int width = 3 * n + (n > 1 ? n - 1 : 0);
  int start = (16 - width) / 2;
  if (start < 0) start = 0;
  for (int i = 0; i < n; i++) {
    lcdDrawBigDigit((uint8_t)(start + i * 4), digits[i]);
  }
  delay(ms);
  lcd.clear();
}

void showMacSplashLcd(uint32_t ms) {
  WiFi.mode(WIFI_STA);
  uint8_t m[6];
  WiFi.macAddress(m);
  char top[12], bot[12];
  snprintf(top, sizeof(top), "%02X:%02X:%02X", m[0], m[1], m[2]);
  snprintf(bot, sizeof(bot), "%02X:%02X:%02X", m[3], m[4], m[5]);
  char a[17], b[17];
  centerLcd16(top, a);
  centerLcd16(bot, b);
  lcdPrint2(a, b);
  delay(ms);
  lcd.clear();
}

/** Status koneksi WiFi / MQTT di LCD (boot & reconnect). */
void showConnLcd(const char *title, const char *detail) {
  char a[17], b[17];
  snprintf(a, sizeof(a), "%.16s", title && title[0] ? title : "Connecting...");
  snprintf(b, sizeof(b), "%.16s", detail && detail[0] ? detail : " ");
  lcdPrint2(a, b);
}

/** Brand + Proses untuk slide identitas (nama mesin tampilan). */
/** Proses murni (tanpa brand). Fallback terakhir ke machine_name. */
void buildProcessOnly(char *out, size_t n) {
  if (lcdProcess[0]) {
    snprintf(out, n, "%s", lcdProcess);
  } else if (lcdName[0]) {
    snprintf(out, n, "%s", lcdName);
  } else {
    snprintf(out, n, "%s", " ");
  }
}

/** JUKI002 → JUKI-002 (sisipkan '-' sebelum digit). */
void formatMachineLabel(char *out, size_t n) {
  int i = 0;
  while (machineCode[i] && !(machineCode[i] >= '0' && machineCode[i] <= '9')) i++;
  if (i > 0 && machineCode[i]) {
    snprintf(out, n, "%.*s-%s", i, machineCode, machineCode + i);
  } else {
    snprintf(out, n, "%s", machineCode);
  }
}

/** Ratakan teks di tengah 16 kolom LCD. */
void centerLcd16(const char *src, char *out17) {
  size_t len = strlen(src);
  if (len >= 16) {
    memcpy(out17, src, 16);
    out17[16] = 0;
    return;
  }
  size_t pad = (16 - len) / 2;
  memset(out17, ' ', 16);
  out17[16] = 0;
  memcpy(out17 + pad, src, len);
}

/** Jendela 16 char dari teks panjang (running text). */
void scrollWindow16(const char *text, char *out17) {
  size_t len = strlen(text);
  if (len <= 16) {
    snprintf(out17, 17, "%s", text);
    for (size_t i = len; i < 16; i++) out17[i] = ' ';
    out17[16] = 0;
    return;
  }
  // padding "  " di ujung agar loop mulus
  char padded[64];
  snprintf(padded, sizeof(padded), "%s  ", text);
  size_t plen = strlen(padded);
  if (plen == 0) {
    memset(out17, ' ', 16);
    out17[16] = 0;
    return;
  }
  uint8_t pos = lcdScrollPos % (uint8_t)plen;
  for (int i = 0; i < 16; i++) {
    out17[i] = padded[(pos + (uint8_t)i) % plen];
  }
  out17[16] = 0;
}

uint8_t lcdSlideCount() {
  if (setupApMode) return 1;
  if (WiFi.status() != WL_CONNECTED || !mqtt.connected()) return 2;
  if (loginSystemOn && !operatorLoggedIn) return 2;
  uint8_t n = 3;  // run/loss, off/idle, V/I
  n += lcdDynN > 0 ? lcdDynN : 1;  // identity atau halaman dari backend
  return n;
}

void flashLcdMsg(const char *l1, const char *l2) {
  lcdFlashScrollOn = false;
  lcdFlashScroll[0] = 0;
  snprintf(lcdLoginLine1, sizeof(lcdLoginLine1), "%.16s", l1 && l1[0] ? l1 : "Data Tersimpan");
  if (l2 && l2[0]) {
    snprintf(lcdLoginLine2, sizeof(lcdLoginLine2), "%.16s", l2);
  } else {
    snprintf(lcdLoginLine2, sizeof(lcdLoginLine2), "UID %s", deviceUid);
  }
  loginFlashUntilMs = millis() + 5000;
  renderLcd();
}

/** Pesan panjang → running text 5 detik (System Login On/Off). */
void flashLcdScrollMsg(const char *longMsg, const char *l2) {
  strncpy(lcdFlashScroll, longMsg && longMsg[0] ? longMsg : "Data Tersimpan", sizeof(lcdFlashScroll) - 1);
  lcdFlashScroll[sizeof(lcdFlashScroll) - 1] = 0;
  // selalu running text agar pesan System Login terbaca penuh
  lcdFlashScrollOn = true;
  lcdScrollPos = 0;
  lastScrollMs = millis();
  lcdLoginLine1[0] = 0;
  if (l2 && l2[0]) {
    snprintf(lcdLoginLine2, sizeof(lcdLoginLine2), "%.16s", l2);
  } else {
    snprintf(lcdLoginLine2, sizeof(lcdLoginLine2), "UID %s", deviceUid);
  }
  loginFlashUntilMs = millis() + 5000;
  renderLcd();
}

void renderLcd() {
  char a[17], b[17], t1[10], t2[10], label[20], brandProc[48];

  // Overlay flash 5 detik (login / data saved / system login)
  if (loginFlashUntilMs != 0) {
    if (millis() < loginFlashUntilMs) {
      if (lcdFlashScrollOn && lcdFlashScroll[0]) {
        uint32_t now = millis();
        if (now - lastScrollMs >= LCD_SCROLL_MS) {
          lastScrollMs = now;
          lcdScrollPos++;
        }
        scrollWindow16(lcdFlashScroll, a);
        lcdPrint2(a, lcdLoginLine2[0] ? lcdLoginLine2 : " ");
      } else {
        lcdPrint2(
          lcdLoginLine1[0] ? lcdLoginLine1 : "Login Sukses",
          lcdLoginLine2[0] ? lcdLoginLine2 : " ");
      }
      return;
    }
    loginFlashUntilMs = 0;
    lcdFlashScrollOn = false;
    lcdFlashScroll[0] = 0;
    lcdLoginLine1[0] = 0;
    lcdLoginLine2[0] = 0;
  }

  if (setupApMode) {
    lcdPrint2("SETUP WIFI", WiFi.softAPSSID().c_str());
    return;
  }
  if (WiFi.status() != WL_CONNECTED) {
    if (((uint8_t)lcdPage % 2) == 0) {
      showConnLcd("Reconnect Wifi", wifiSsid);
    } else {
      fmtHms(lossSec, t1, sizeof(t1));
      fmtHms(runSec, t2, sizeof(t2));
      snprintf(a, sizeof(a), "Loss : %s", t1);
      snprintf(b, sizeof(b), "Runn : %s", t2);
      lcdPrint2(a, b);
    }
    return;
  }
  if (!mqtt.connected()) {
    if (((uint8_t)lcdPage % 2) == 0) {
      showConnLcd(mqttFailCount > 0 ? "MQTT reconnect.." : "MQTT connecting", mqttHost);
    } else {
      fmtHms(lossSec, t1, sizeof(t1));
      fmtHms(runSec, t2, sizeof(t2));
      snprintf(a, sizeof(a), "Loss : %s", t1);
      snprintf(b, sizeof(b), "Runn : %s", t2);
      lcdPrint2(a, b);
    }
    return;
  }

  // System login ON + belum login → 2 slide peringatan (tanpa machine code)
  if (loginSystemOn && !operatorLoggedIn) {
    uint8_t p = (uint8_t)lcdPage % 2;
    if (p == 0) {
      lcdPrint2("OPERATOR BELUM", "MELAKUKAN LOGIN");
    } else {
      char top[20];
      snprintf(top, sizeof(top), "UID %s", deviceUid);
      centerLcd16(top, a);
      char uidLine[20];
      buildProcessOnly(uidLine, sizeof(uidLine));
      centerLcd16(uidLine, b);
      lcdPrint2(a, b);
    }
    return;
  }

  uint8_t n = lcdSlideCount();
  uint8_t p = n ? (lcdPage % n) : 0;
  if (p == 0) {
    fmtHms(lossSec, t1, sizeof(t1));
    fmtHms(runSec, t2, sizeof(t2));
    snprintf(a, sizeof(a), "Loss : %s", t1);
    snprintf(b, sizeof(b), "Runn : %s", t2);
    lcdPrint2(a, b);
    return;
  }
  if (p == 1) {
    fmtHms(offSec, t1, sizeof(t1));
    fmtHms(lossSec, t2, sizeof(t2));
    snprintf(a, sizeof(a), "MSN OFF:%s", t1);
    snprintf(b, sizeof(b), "MSN ON :%s", t2);
    lcdPrint2(a, b);
    return;
  }
  if (p == 2) {
    if (!pzemOk) {
      snprintf(a, sizeof(a), "Voltage :  --- V");
      snprintf(b, sizeof(b), "Current :  --- A");
    } else {
      snprintf(a, sizeof(a), "Voltage : %3.0f V", lastV);
      if (lastA < 10.0f) snprintf(b, sizeof(b), "Current : %4.2f A", lastA);
      else snprintf(b, sizeof(b), "Current : %4.1f A", lastA);
    }
    lcdPrint2(a, b);
    return;
  }
  uint8_t di = p - 3;
  if (lcdDynN > 0 && di < lcdDynN) {
    snprintf(a, sizeof(a), "%s", lcdDynL1[di]);
    snprintf(b, sizeof(b), "%s", lcdDynL2[di]);
    lcdPrint2(a, b);
    return;
  }
  const char *op = lcdOperator[0] ? lcdOperator : "Belum Login";
  if (strlen(op) > 16) {
    uint32_t now = millis();
    if (now - lastScrollMs >= LCD_SCROLL_MS) {
      lastScrollMs = now;
      lcdScrollPos++;
    }
    scrollWindow16(op, a);
  } else {
    centerLcd16(op, a);
  }
  buildProcessOnly(brandProc, sizeof(brandProc));
  if (strlen(brandProc) > 16) {
    uint32_t now = millis();
    if (now - lastScrollMs >= LCD_SCROLL_MS) {
      lastScrollMs = now;
      lcdScrollPos++;
    }
    scrollWindow16(brandProc, b);
  } else {
    snprintf(b, sizeof(b), "%s", brandProc);
  }
  lcdPrint2(a, b);
}

void wdtFeed() {
  esp_task_wdt_reset();
}

const char *resetReasonStr() {
  switch (esp_reset_reason()) {
    case ESP_RST_POWERON: return "power";
    case ESP_RST_SW: return "sw";
    case ESP_RST_PANIC: return "panic";
    case ESP_RST_INT_WDT:
    case ESP_RST_TASK_WDT:
    case ESP_RST_WDT: return "wdt";
    case ESP_RST_BROWNOUT: return "brownout";
    default: return "other";
  }
}

void factoryReset() {
  prefs.begin("pzemid", false); prefs.clear(); prefs.end();
  prefs.begin("pzemcal", false); prefs.clear(); prefs.end();
  prefs.begin("pzemlogin", false); prefs.clear(); prefs.end();
  prefs.begin("pzemkpi", false); prefs.clear(); prefs.end();
  prefs.begin("pzemota", false); prefs.clear(); prefs.end();
  lastDesiredRev = 0;
  wifiSsid[0] = 0;
  wifiPass[0] = 0;
  mqttUser[0] = 0;
  mqttPass[0] = 0;
  flashLcdMsg("Factory reset", "Setup AP");
  delay(400);
  ESP.restart();
}

static const char SETUP_HTML[] PROGMEM = R"HTML(
<!DOCTYPE html><html><head><meta name=viewport content="width=device-width,initial-scale=1">
<title>Gistex Setup</title>
<style>body{font-family:sans-serif;max-width:420px;margin:12px auto;padding:8px}
input{width:100%;padding:8px;margin:4px 0 10px;box-sizing:border-box}
button{width:100%;padding:10px;background:#2563eb;color:#fff;border:0}</style></head>
<body><h3>Gistex ESP Setup</h3>
<form method=POST action=/save>
SSID<input name=ssid required>
Password<input name=pass type=password required>
MQTT host<input name=mhost value="10.5.0.106" required>
MQTT port<input name=mport value="1883">
MQTT user<input name=muser>
MQTT password<input name=mpass type=password>
UID<input name=uid required>
Machine code<input name=code required>
<button>Simpan & reboot</button></form></body></html>
)HTML";

void startSetupAp(const char *why) {
  (void)why;
  if (setupApMode) return;
  setupApMode = true;
  setupApSinceMs = millis();
  char ap[24];
  snprintf(ap, sizeof(ap), "GISTEX-SETUP-%s", deviceUid[0] ? deviceUid : "ESP");
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ap);
  setupDns.start(53, "*", WiFi.softAPIP());
  setupHttp.on("/", HTTP_GET, []() {
    setupHttp.send_P(200, "text/html", SETUP_HTML);
  });
  setupHttp.on("/save", HTTP_POST, []() {
    String ssid = setupHttp.arg("ssid");
    String pass = setupHttp.arg("pass");
    String host = setupHttp.arg("mhost");
    String user = setupHttp.arg("muser");
    String mp = setupHttp.arg("mpass");
    String uid = setupHttp.arg("uid");
    String code = setupHttp.arg("code");
    uint16_t port = (uint16_t)setupHttp.arg("mport").toInt();
    if (!ssid.length() || !pass.length() || !host.length() || !uid.length() || !code.length()) {
      setupHttp.send(400, "text/plain", "field wajib kosong");
      return;
    }
    strncpy(wifiSsid, ssid.c_str(), sizeof(wifiSsid) - 1);
    strncpy(wifiPass, pass.c_str(), sizeof(wifiPass) - 1);
    strncpy(mqttHost, host.c_str(), sizeof(mqttHost) - 1);
    strncpy(mqttUser, user.c_str(), sizeof(mqttUser) - 1);
    strncpy(mqttPass, mp.c_str(), sizeof(mqttPass) - 1);
    strncpy(deviceUid, uid.c_str(), sizeof(deviceUid) - 1);
    strncpy(machineCode, code.c_str(), sizeof(machineCode) - 1);
    wifiSsid[sizeof(wifiSsid) - 1] = 0;
    wifiPass[sizeof(wifiPass) - 1] = 0;
    mqttHost[sizeof(mqttHost) - 1] = 0;
    mqttUser[sizeof(mqttUser) - 1] = 0;
    mqttPass[sizeof(mqttPass) - 1] = 0;
    deviceUid[sizeof(deviceUid) - 1] = 0;
    machineCode[sizeof(machineCode) - 1] = 0;
    mqttPort = port > 0 ? port : DEFAULT_MQTT_PORT;
    saveIdentity();
    setupHttp.send(200, "text/plain", "Tersimpan. Reboot...");
    delay(300);
    ESP.restart();
  });
  setupHttp.onNotFound([]() { setupHttp.send_P(200, "text/html", SETUP_HTML); });
  setupHttp.begin();
  flashLcdMsg("SETUP WIFI", ap);
}

void stopSetupAp() {
  if (!setupApMode) return;
  setupHttp.stop();
  setupDns.stop();
  WiFi.softAPdisconnect(true);
  setupApMode = false;
}

void handleSetupAp() {
  if (!setupApMode) return;
  setupDns.processNextRequest();
  setupHttp.handleClient();
  if (millis() - setupApSinceMs >= SETUP_AP_TIMEOUT_MS && wifiProvisioned()) {
    stopSetupAp();
    WiFi.mode(WIFI_STA);
    wifiBeginCurrent();
  }
}

void applyLcdPages(JsonVariant pages) {
  lcdDynN = 0;
  if (!pages.is<JsonArray>()) return;
  JsonArray arr = pages.as<JsonArray>();
  for (JsonObject o : arr) {
    if (lcdDynN >= LCD_DYN_MAX) break;
    const char *l1 = o["l1"] | "";
    const char *l2 = o["l2"] | "";
    snprintf(lcdDynL1[lcdDynN], 17, "%.16s", l1);
    snprintf(lcdDynL2[lcdDynN], 17, "%.16s", l2);
    lcdDynN++;
  }
}

void applyDesiredState(JsonObject doc) {
  const char *target = doc["target_uid"] | "";
  if (target[0] && strcmp(target, deviceUid) != 0) return;
  uint32_t rev = doc["revision"] | 0;
  if (rev > 0 && rev <= lastDesiredRev) {
    publishAck("desired_state", true);
    return;
  }
  if (rev == 0 && lastDesiredRev > 0) {
    return;
  }
  const char *wd = doc["work_date"] | "";
  if (wd[0]) {
    int wy = 0, wm = 0, wday = 0;
    int ymd = wibYmdNow();
    if (ymd > 0 && sscanf(wd, "%d-%d-%d", &wy, &wm, &wday) == 3) {
      int wymd = wy * 10000 + wm * 100 + wday;
      if (wymd != ymd && (doc["login_required"] | loginSystemOn)) {
        setOperatorLoggedIn(false, false);
      }
    }
  }
  if (doc.containsKey("login_required")) loginSystemOn = doc["login_required"].as<bool>();
  bool ok = doc["logged_in"] | operatorLoggedIn;
  if (!loginSystemOn) ok = true;
  setOperatorLoggedIn(ok, false);
  if (doc.containsKey("machine_name")) {
    strncpy(lcdName, doc["machine_name"] | "", sizeof(lcdName) - 1);
    lcdName[sizeof(lcdName) - 1] = 0;
  }
  if (doc.containsKey("process_name")) {
    strncpy(lcdProcess, doc["process_name"] | "", sizeof(lcdProcess) - 1);
    lcdProcess[sizeof(lcdProcess) - 1] = 0;
  }
  const char *op = doc["operator_name"] | "";
  if (ok && op[0]) {
    strncpy(lcdOperator, op, sizeof(lcdOperator) - 1);
    lcdOperator[sizeof(lcdOperator) - 1] = 0;
  }
  if (doc.containsKey("current_threshold_a")) {
    float v = doc["current_threshold_a"].as<float>();
    if (v >= 0.005f && v <= 50.0f) currentThresholdA = v;
  }
  if (doc.containsKey("power_threshold_w")) {
    float v = doc["power_threshold_w"].as<float>();
    if (v >= 0.0f && v <= 5000.0f) powerThresholdW = v;
  }
  if (doc.containsKey("off_current_a")) {
    float v = doc["off_current_a"].as<float>();
    if (v >= 0.0f && v <= 5.0f) offCurrentA = v;
  }
  if (doc.containsKey("lcd_auto_ms")) {
    uint32_t v = doc["lcd_auto_ms"].as<uint32_t>();
    if (v >= 4000 && v <= 60000) lcdAutoMs = v;
  }
  if (doc.containsKey("kpi_source")) {
    const char *src = doc["kpi_source"] | "esp";
    kpiFromBackend = (strcmp(src, "telemetry") == 0 || strcmp(src, "backend") == 0);
  }
  if (doc["lcd_pages"].is<JsonArray>()) applyLcdPages(doc["lcd_pages"]);
  if (rev > 0) lastDesiredRev = rev;
  saveLoginState();
  saveCalibration();
  saveIdentity();
  renderLcd();
  publishAck("desired_state", true);
}

static bool parseSha256Hex(const char *hex, uint8_t out[32]) {
  if (!hex || strlen(hex) != 64) return false;
  for (int i = 0; i < 32; i++) {
    char a = hex[i * 2], b = hex[i * 2 + 1];
    auto nibble = [](char c) -> int {
      if (c >= '0' && c <= '9') return c - '0';
      if (c >= 'a' && c <= 'f') return c - 'a' + 10;
      if (c >= 'A' && c <= 'F') return c - 'A' + 10;
      return -1;
    };
    int hi = nibble(a), lo = nibble(b);
    if (hi < 0 || lo < 0) return false;
    out[i] = (uint8_t)((hi << 4) | lo);
  }
  return true;
}

static int fwVerCmp(const char *a, const char *b) {
  int a1 = 0, a2 = 0, a3 = 0, b1 = 0, b2 = 0, b3 = 0;
  sscanf(a, "%d.%d.%d", &a1, &a2, &a3);
  sscanf(b, "%d.%d.%d", &b1, &b2, &b3);
  if (a1 != b1) return a1 - b1;
  if (a2 != b2) return a2 - b2;
  return a3 - b3;
}

void runOtaUpdate(const char *url, const char *shaHex, const char *ver) {
  if (!url || !url[0] || !shaHex || !shaHex[0]) {
    publishAckErr("ota_update", "url/sha256 wajib");
    return;
  }
  if (strncmp(url, "https://", 8) != 0) {
    publishAckErr("ota_update", "https wajib");
    return;
  }
  if (ver && ver[0] && fwVerCmp(ver, FW_VERSION) <= 0) {
    publishAckErr("ota_update", "same_or_older");
    return;
  }
  uint8_t expect[32];
  if (!parseSha256Hex(shaHex, expect)) {
    publishAckErr("ota_update", "sha256 invalid");
    return;
  }
  flashLcdMsg("OTA download", ver && ver[0] ? ver : "fw");
  saveCounters(true);
  WiFiClientSecure tls;
  HTTPClient http;
  tls.setInsecure();  // integritas = SHA-256 body, bukan CA store
  if (!http.begin(tls, url)) {
    publishAckErr("ota_update", "begin https gagal");
    return;
  }
  http.setTimeout(180000);
  int code = http.GET();
  if (code != 200) {
    http.end();
    publishAckErr("ota_update", "http status");
    return;
  }
  int len = http.getSize();
  if (len <= 0 || !Update.begin(len > 0 ? (size_t)len : UPDATE_SIZE_UNKNOWN)) {
    http.end();
    publishAckErr("ota_update", "update begin");
    return;
  }
  mbedtls_sha256_context ctx;
  mbedtls_sha256_init(&ctx);
  mbedtls_sha256_starts(&ctx, 0);
  WiFiClient *stream = http.getStreamPtr();
  uint8_t buf[1024];
  int written = 0;
  uint32_t lastDataMs = millis();
  while (http.connected() && (len < 0 || written < len)) {
    wdtFeed();
    size_t avail = stream->available();
    if (!avail) {
      if (millis() - lastDataMs > 30000) {
        Update.abort();
        http.end();
        publishAckErr("ota_update", "timeout");
        return;
      }
      delay(10);
      continue;
    }
    lastDataMs = millis();
    int rd = stream->readBytes(buf, avail > sizeof(buf) ? sizeof(buf) : avail);
    if (rd <= 0) break;
    mbedtls_sha256_update(&ctx, buf, rd);
    if (Update.write(buf, rd) != (size_t)rd) {
      Update.abort();
      http.end();
      publishAckErr("ota_update", "write");
      return;
    }
    written += rd;
  }
  uint8_t got[32];
  mbedtls_sha256_finish(&ctx, got);
  mbedtls_sha256_free(&ctx);
  http.end();
  if (memcmp(got, expect, 32) != 0) {
    Update.abort();
    publishAckErr("ota_update", "sha256 mismatch");
    return;
  }
  if (!Update.end(true)) {
    publishAckErr("ota_update", "end");
    return;
  }
  prefs.begin("pzemota", false);
  prefs.putBool("pending", true);
  prefs.end();
  publishAck("ota_update", true);
  delay(400);
  ESP.restart();
}

void confirmOtaIfPending() {
  prefs.begin("pzemota", true);
  bool pending = prefs.getBool("pending", false);
  prefs.end();
  if (!pending) return;
  const esp_partition_t *run = esp_ota_get_running_partition();
  if (run) esp_ota_mark_app_valid_cancel_rollback();
  prefs.begin("pzemota", false);
  prefs.putBool("pending", false);
  prefs.end();
}

// ---------- MQTT status ----------
void publishStatus(const char *state, const char *detail, bool sensorOk) {
  if (!mqtt.connected()) return;
  StaticJsonDocument<640> doc;
  doc["device_uid"] = deviceUid;
  doc["machine_code"] = machineCode;
  doc["sensor"] = SENSOR_NAME;
  doc["state"] = state;
  doc["online"] = true;
  doc["wifi_ok"] = WiFi.status() == WL_CONNECTED;
  doc["mqtt_ok"] = true;
  doc["sensor_ok"] = sensorOk;
  doc["detail"] = detail;
  doc["rssi"] = WiFi.RSSI();
  doc["uptime_sec"] = millis() / 1000;
  doc["fail_count"] = pzemFailCount;
  doc["wifi_fail"] = wifiFailCount;
  doc["mqtt_fail"] = mqttFailCount;
  doc["run_sec"] = runSec;
  doc["loss_sec"] = lossSec;
  doc["off_sec"] = offSec;
  doc["op_status"] = statusStr(opStatus);
  doc["fw"] = FW_VERSION;
  doc["proto"] = PROTOCOL_VERSION;
  doc["boot_id"] = bootId;
  doc["reset_reason"] = resetReasonStr();
  doc["free_heap"] = ESP.getFreeHeap();
  doc["revision"] = lastDesiredRev;
  doc["capabilities"] = CAPABILITIES;

  char buf[640];
  size_t n = serializeJson(doc, buf);
  bool retain = (strcmp(state, "online") == 0 || strcmp(state, "resync") == 0);
  if (mqtt.publish(topicStatus, (const uint8_t *)buf, n, retain) && lastState != state) {
    lastState = state;
  }
}

void publishNetworkOnce() {
  if (!mqtt.connected() || ipReportedOnce) return;
  if (WiFi.status() != WL_CONNECTED) return;
  StaticJsonDocument<384> doc;
  doc["device_uid"] = deviceUid;
  doc["machine_code"] = machineCode;
  doc["sensor"] = SENSOR_NAME;
  doc["state"] = "network";
  doc["online"] = true;
  doc["wifi_ok"] = true;
  doc["mqtt_ok"] = true;
  doc["sensor_ok"] = pzemOk;
  doc["detail"] = "IP report once after MQTT connect";
  doc["rssi"] = WiFi.RSSI();
  doc["ip"] = WiFi.localIP().toString();
  {
    uint8_t m[6];
    char macStr[18];
    WiFi.macAddress(m);
    snprintf(macStr, sizeof(macStr), "%02X:%02X:%02X:%02X:%02X:%02X",
             m[0], m[1], m[2], m[3], m[4], m[5]);
    doc["mac"] = macStr;
  }
  doc["wifi_ssid"] = wifiSsid;
  doc["ip_once"] = true;
  char buf[384];
  size_t n = serializeJson(doc, buf);
  if (mqtt.publish(topicStatus, (const uint8_t *)buf, n, false)) {
    ipReportedOnce = true;
  }
}

void publishAck(const char *command, bool ok) {
  publishAckErr(command, ok ? "" : "fail");
}

void publishAckErr(const char *command, const char *err) {
  StaticJsonDocument<384> doc;
  doc["device_uid"] = deviceUid;
  doc["command"] = command;
  doc["ok"] = !(err && err[0]);
  if (err && err[0]) doc["error"] = err;
  if (lastCmdId[0]) doc["command_id"] = lastCmdId;
  doc["fw"] = FW_VERSION;
  doc["proto"] = PROTOCOL_VERSION;
  doc["boot_id"] = bootId;
  doc["revision"] = lastDesiredRev;
  doc["free_heap"] = ESP.getFreeHeap();
  doc["reset_reason"] = resetReasonStr();
  doc["current_threshold_a"] = currentThresholdA;
  doc["run_sec"] = runSec;
  doc["loss_sec"] = lossSec;
  char buf[384];
  size_t n = serializeJson(doc, buf);
  mqtt.publish(topicAck, buf, n);
}

void publishConfigAck(const char *cmd) {
  StaticJsonDocument<384> doc;
  doc["device_uid"] = deviceUid;
  doc["machine_code"] = machineCode;
  doc["command"] = cmd;
  doc["ok"] = true;
  doc["wifi_ssid"] = wifiSsid;
  doc["mqtt_host"] = mqttHost;
  doc["current_threshold_a"] = currentThresholdA;
  doc["off_current_a"] = offCurrentA;
  doc["power_threshold_w"] = powerThresholdW;
  doc["filter_aktif_ms"] = filterAktifMs;
  doc["filter_diam_ms"] = filterDiamMs;
  doc["lcd_auto_ms"] = lcdAutoMs;
  doc["fw"] = FW_VERSION;
  doc["proto"] = PROTOCOL_VERSION;
  doc["machine_name"] = lcdName;
  doc["process_name"] = lcdProcess;
  doc["run_sec"] = runSec;
  doc["loss_sec"] = lossSec;
  doc["off_sec"] = offSec;
  char buf[384];
  size_t n = serializeJson(doc, buf);
  mqtt.publish(topicAck, buf, n);
}

void publishWifiScanAck() {
  if (WiFi.status() != WL_CONNECTED) {
    publishAckErr("wifi_scan", "wifi down");
    return;
  }
  flashLcdMsg("Scan WiFi ...", " ");
  int n = WiFi.scanNetworks(true, false);  // async start
  uint32_t t0 = millis();
  while (WiFi.scanComplete() < 0 && millis() - t0 < 8000) {
    wdtFeed();
    delay(50);
  }
  n = WiFi.scanComplete();
  if (n < 0) {
    publishAckErr("wifi_scan", "scan fail");
    return;
  }
  StaticJsonDocument<1024> doc;
  doc["device_uid"] = deviceUid;
  doc["machine_code"] = machineCode;
  doc["command"] = "wifi_scan";
  doc["ok"] = true;
  JsonArray arr = doc.createNestedArray("wifi_list");
  int cap = n > 8 ? 8 : n;
  for (int i = 0; i < cap; i++) {
    JsonObject ap = arr.createNestedObject();
    ap["ssid"] = WiFi.SSID(i);
    ap["rssi"] = WiFi.RSSI(i);
    ap["secure"] = WiFi.encryptionType(i) != WIFI_AUTH_OPEN;
  }
  char buf[1024];
  size_t len = serializeJson(doc, buf);
  mqtt.publish(topicAck, buf, len);
  WiFi.scanDelete();
  flashLcdMsg("Scan WiFi OK", " ");
}

void onMqttMessage(char *topic, byte *payload, unsigned int length) {
  (void)topic;
  if (length > 2500) {
    publishAckErr("parse", "payload too large");
    return;
  }
  StaticJsonDocument<2048> doc;
  if (deserializeJson(doc, payload, length)) return;
  const char *cmd = doc["command"] | "";
  const char *cid = doc["command_id"] | doc["id"] | "";
  if (cid[0]) {
    if (strcmp(cid, lastCmdId) == 0) {
      publishAck(cmd[0] ? cmd : "dup", true);
      return;
    }
    strncpy(lastCmdId, cid, sizeof(lastCmdId) - 1);
    lastCmdId[sizeof(lastCmdId) - 1] = 0;
  }
  const char *target = doc["target_uid"] | "";
  if (target[0] && strcmp(target, deviceUid) != 0) return;

  bool destructive = !strcmp(cmd, "reboot") || !strcmp(cmd, "reset_day") ||
                     !strcmp(cmd, "factory_reset") || !strcmp(cmd, "ota_update");
  if (destructive && !(doc["confirm"] | false)) {
    publishAckErr(cmd, "confirm=true wajib");
    return;
  }

  if (strcmp(cmd, "desired_state") == 0 || strcmp(cmd, "login_status") == 0) {
    applyDesiredState(doc.as<JsonObject>());
    return;
  }

  if (strcmp(cmd, "wifi_scan") == 0) {
    wifiScanPending = true;
  } else if (strcmp(cmd, "set_identity") == 0) {
    const char *code = doc["machine_code"] | "";
    const char *uid = doc["device_uid"] | "";
    applyIdentity(code, uid);

    if (doc.containsKey("machine_name")) {
      const char *n = doc["machine_name"] | "";
      strncpy(lcdName, n, sizeof(lcdName) - 1);
      lcdName[sizeof(lcdName) - 1] = '\0';
    }
    if (doc.containsKey("process_name")) {
      const char *p = doc["process_name"] | "";
      strncpy(lcdProcess, p, sizeof(lcdProcess) - 1);
      lcdProcess[sizeof(lcdProcess) - 1] = '\0';
    }
    if (doc.containsKey("current_threshold_a")) {
      float v = doc["current_threshold_a"].as<float>();
      if (v >= 0.005f && v <= 50.0f) currentThresholdA = v;
    }
    if (doc.containsKey("off_current_a")) {
      float v = doc["off_current_a"].as<float>();
      if (v >= 0.0f && v <= 5.0f) offCurrentA = v;
    }
    if (doc.containsKey("power_threshold_w")) {
      float v = doc["power_threshold_w"].as<float>();
      if (v >= 0.0f && v <= 5000.0f) powerThresholdW = v;
    }
    if (doc.containsKey("filter_aktif_ms")) {
      uint32_t v = doc["filter_aktif_ms"].as<uint32_t>();
      if (v >= 50 && v <= 60000) filterAktifMs = v;
    }
    if (doc.containsKey("filter_diam_ms")) {
      uint32_t v = doc["filter_diam_ms"].as<uint32_t>();
      if (v >= 50 && v <= 60000) filterDiamMs = v;
    }
    if (doc.containsKey("lcd_auto_ms")) {
      uint32_t v = doc["lcd_auto_ms"].as<uint32_t>();
      if (v >= 4000 && v <= 60000) lcdAutoMs = v;
    }
    if (doc.containsKey("kpi_source")) {
      const char *src = doc["kpi_source"] | "esp";
      kpiFromBackend = (strcmp(src, "telemetry") == 0 || strcmp(src, "backend") == 0);
    }
    saveCalibration();
    renderLcd();
    publishConfigAck(cmd);
  } else if (strcmp(cmd, "set_network") == 0) {
    bool dirty = false;
    if (doc.containsKey("wifi_ssid")) {
      const char *s = doc["wifi_ssid"] | "";
      if (s[0] && strcmp(s, wifiSsid) != 0) {
        strncpy(wifiSsid, s, sizeof(wifiSsid) - 1);
        wifiSsid[sizeof(wifiSsid) - 1] = 0;
        dirty = true;
        wifiCredsDirty = true;
      }
    }
    if (doc.containsKey("wifi_pass")) {
      const char *p = doc["wifi_pass"] | "";
      strncpy(wifiPass, p, sizeof(wifiPass) - 1);
      wifiPass[sizeof(wifiPass) - 1] = 0;
      dirty = true;
      wifiCredsDirty = true;
    }
    if (doc.containsKey("mqtt_host")) {
      const char *h = doc["mqtt_host"] | "";
      if (h[0] && strcmp(h, mqttHost) != 0) {
        strncpy(mqttHost, h, sizeof(mqttHost) - 1);
        mqttHost[sizeof(mqttHost) - 1] = 0;
        dirty = true;
        mqtt.setServer(mqttHost, mqttPort);
        mqttNeedsReconnect = true;
      }
    }
    if (doc.containsKey("mqtt_port")) {
      uint16_t p = (uint16_t)doc["mqtt_port"].as<int>();
      if (p > 0 && p != mqttPort) {
        mqttPort = p;
        dirty = true;
        mqtt.setServer(mqttHost, mqttPort);
        mqttNeedsReconnect = true;
      }
    }
    if (doc.containsKey("mqtt_user")) {
      strncpy(mqttUser, doc["mqtt_user"] | "", sizeof(mqttUser) - 1);
      mqttUser[sizeof(mqttUser) - 1] = 0;
      dirty = true;
      mqttNeedsReconnect = true;
    }
    if (doc.containsKey("mqtt_pass")) {
      strncpy(mqttPass, doc["mqtt_pass"] | "", sizeof(mqttPass) - 1);
      mqttPass[sizeof(mqttPass) - 1] = 0;
      dirty = true;
      mqttNeedsReconnect = true;
    }
    if (dirty) saveIdentity();
    publishConfigAck(cmd);
  } else if (strcmp(cmd, "set_calibration") == 0) {
    if (doc.containsKey("current_threshold_a")) {
      float v = doc["current_threshold_a"].as<float>();
      if (v >= 0.005f && v <= 50.0f) currentThresholdA = v;
    }
    if (doc.containsKey("off_current_a")) {
      float v = doc["off_current_a"].as<float>();
      if (v >= 0.0f && v <= 5.0f) offCurrentA = v;
    }
    if (doc.containsKey("power_threshold_w")) {
      float v = doc["power_threshold_w"].as<float>();
      if (v >= 0.0f && v <= 5000.0f) powerThresholdW = v;
    }
    if (doc.containsKey("voltage_on_v")) {
      float v = doc["voltage_on_v"].as<float>();
      if (v >= 50.0f && v <= 300.0f) voltageOnV = v;
    }
    if (doc.containsKey("filter_aktif_ms")) {
      uint32_t v = doc["filter_aktif_ms"].as<uint32_t>();
      if (v >= 50 && v <= 60000) filterAktifMs = v;
    }
    if (doc.containsKey("filter_diam_ms")) {
      uint32_t v = doc["filter_diam_ms"].as<uint32_t>();
      if (v >= 50 && v <= 60000) filterDiamMs = v;
    }
    saveCalibration();
    publishAck(cmd, true);
  } else if (strcmp(cmd, "set_display") == 0) {
    if (doc.containsKey("machine_name")) {
      const char *n = doc["machine_name"] | "";
      strncpy(lcdName, n, sizeof(lcdName) - 1);
      lcdName[sizeof(lcdName) - 1] = '\0';
    }
    if (doc.containsKey("process_name")) {
      const char *p = doc["process_name"] | "";
      strncpy(lcdProcess, p, sizeof(lcdProcess) - 1);
      lcdProcess[sizeof(lcdProcess) - 1] = '\0';
    }
    if (doc.containsKey("operator_name")) {
      const char *op = doc["operator_name"] | "";
      if (op[0]) {
        strncpy(lcdOperator, op, sizeof(lcdOperator) - 1);
        lcdOperator[sizeof(lcdOperator) - 1] = '\0';
      }
    }
    if (doc.containsKey("lcd_auto_ms")) {
      uint32_t v = doc["lcd_auto_ms"].as<uint32_t>();
      if (v >= 4000 && v <= 60000) lcdAutoMs = v;
    }
    if (doc.containsKey("lcd_page")) {
      int p = doc["lcd_page"].as<int>();
      if (p >= 0 && p < (int)lcdSlideCount()) {
        lcdPage = (uint8_t)p;
        lcdScrollPos = 0;
        lcdManualHold = true;
        lastPageAutoMs = millis();
      }
    }
    if (doc.containsKey("lcd_pages")) applyLcdPages(doc["lcd_pages"]);
    saveCalibration();
    renderLcd();
    publishAck(cmd, true);
  } else if (strcmp(cmd, "sync_kpi") == 0) {
    const char *src = doc["source"] | "esp";
    if (strcmp(src, "backend") == 0) {
      kpiFromBackend = true;
      if (doc.containsKey("run_sec")) runSec = doc["run_sec"].as<uint32_t>();
      if (doc.containsKey("loss_sec")) lossSec = doc["loss_sec"].as<uint32_t>();
      if (doc.containsKey("off_sec")) offSec = doc["off_sec"].as<uint32_t>();
      saveCounters(true);
    } else {
      kpiFromBackend = false;
    }
    saveCalibration();
    renderLcd();
    publishAck(cmd, true);
    publishTelemetry();
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
    lcdPage = lcdSlideCount() ? (lcdPage + 1) % lcdSlideCount() : 0;
    lcdScrollPos = 0;
    lcdManualHold = true;
    lastPageAutoMs = millis();
    renderLcd();
    publishAck(cmd, true);
  } else if (strcmp(cmd, "get_config") == 0) {
    publishConfigAck(cmd);
  } else if (strcmp(cmd, "login_success") == 0) {
    setOperatorLoggedIn(true, true);
    const char *msg = doc["lcd_message"] | "Login Sukses";
    snprintf(lcdLoginLine1, sizeof(lcdLoginLine1), "%.16s", msg[0] ? msg : "Login Sukses");
    const char *op = doc["operator_name"] | "";
    if (op[0]) {
      snprintf(lcdLoginLine2, sizeof(lcdLoginLine2), "%.16s", op);
      strncpy(lcdOperator, op, sizeof(lcdOperator) - 1);
      lcdOperator[sizeof(lcdOperator) - 1] = 0;
    } else {
      const char *st = doc["garment_style"] | "";
      const char *nik = doc["operator_nik"] | "";
      snprintf(lcdLoginLine2, sizeof(lcdLoginLine2), "%.16s", st[0] ? st : (nik[0] ? nik : " "));
    }
    loginFlashUntilMs = millis() + 5000;
    renderLcd();
    publishAck(cmd, true);
  } else if (strcmp(cmd, "data_saved") == 0) {
    // Indikator dari Control Machine / sync dashboard
    const char *msg = doc["message"] | "Data Tersimpan";
    char line2[17];
    const char *br = doc["branch"] | "";
    const char *ln = doc["line_name"] | "";
    if (br[0] || ln[0]) {
      snprintf(line2, sizeof(line2), "%.7s %.7s", br[0] ? br : "-", ln[0] ? ln : "-");
    } else {
      snprintf(line2, sizeof(line2), "UID %s", deviceUid);
    }
    flashLcdMsg(msg[0] ? msg : "Data Tersimpan", line2);
    publishAck(cmd, true);
  } else if (strcmp(cmd, "set_login_system") == 0) {
    // login_required / enabled: true = System Login ON (wajib), false = OFF
    bool en = loginSystemOn;
    if (doc.containsKey("login_required")) en = doc["login_required"].as<bool>();
    else if (doc.containsKey("enabled")) en = doc["enabled"].as<bool>();
    loginSystemOn = en;
    if (!loginSystemOn) {
      operatorLoggedIn = true;
      int ymd = wibYmdNow();
      loginWibYmd = ymd > 0 ? ymd : 0;
    } else {
      clearOperatorLogin("login_system_on");
    }
    saveLoginState();
    const char *msg = doc["message"] | "";
    if (!msg[0]) {
      msg = loginSystemOn ? "System Login Di Aktifkan" : "System Login Non-Aktifkan";
    }
    flashLcdScrollMsg(msg, " ");
    publishAck(cmd, true);
  } else if (strcmp(cmd, "ota_update") == 0) {
    runOtaUpdate(doc["url"] | "", doc["sha256"] | "", doc["version"] | "");
  } else if (strcmp(cmd, "factory_reset") == 0) {
    publishAck(cmd, true);
    delay(200);
    factoryReset();
  } else if (strcmp(cmd, "reboot") == 0) {
    publishAck(cmd, true);
    delay(200);
    ESP.restart();
  }
}

/** Optimasi STA ESP32-C6: WiFi 6 (11ax) + TX max + tanpa modem sleep */
void applyWifiStaOptimizations() {
  WiFi.setSleep(false);
  esp_wifi_set_ps(WIFI_PS_NONE);
#ifdef WIFI_PROTOCOL_11AX
  // C6: izinkan 11B/G/N/AX — AP WiFi 6 akan nego HE20
  esp_wifi_set_protocol(
      WIFI_IF_STA,
      WIFI_PROTOCOL_11B | WIFI_PROTOCOL_11G | WIFI_PROTOCOL_11N | WIFI_PROTOCOL_11AX);
#else
  esp_wifi_set_protocol(
      WIFI_IF_STA, WIFI_PROTOCOL_11B | WIFI_PROTOCOL_11G | WIFI_PROTOCOL_11N);
#endif
  // Satuan 0.25 dBm; 80 ≈ 20 dBm
  esp_wifi_set_max_tx_power(80);
}

void wifiBeginCurrent() {
  if (!wifiProvisioned() || setupApMode) return;
  saveCounters(true);
  WiFi.disconnect(false);
  delay(40);
  applyWifiStaOptimizations();
  WiFi.setHostname(mqttClientId);
  WiFi.begin(wifiSsid, wifiPass);
  lastWifiAttemptMs = millis();
}

bool ensureWifi() {
  if (setupApMode) return false;
  if (!wifiProvisioned()) {
#if ENABLE_SETUP_AP
    startSetupAp("nvs kosong");
#endif
    return false;
  }
  if (WiFi.status() == WL_CONNECTED) {
    if (!wifiWasOk) {
      wifiWasOk = true;
      configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
    }
    return true;
  }
  if (wifiWasOk) {
    saveCounters(true);
    wifiWasOk = false;
    mqttWasOk = false;
    ntpOk = false;
    if (mqtt.connected()) mqtt.disconnect();
    ipReportedOnce = false;
  }
  uint32_t now = millis();
  if (now - lastWifiAttemptMs >= WIFI_RETRY_MS) {
    wifiFailCount++;
    wifiBeginCurrent();
  }
  return false;
}

bool ensureMqtt() {
  if (mqtt.connected()) {
    if (!mqttWasOk) {
      mqttWasOk = true;
      mqttBackoffMs = MQTT_RETRY_MS;
      ipReportedOnce = false;
      saveCounters(true);
      publishNetworkOnce();
      publishTelemetry();
      publishStatus("online", "MQTT connected", pzemOk);
    }
    return true;
  }
  if (WiFi.status() != WL_CONNECTED) return false;
  if (mqttWasOk) {
    saveCounters(true);
    mqttWasOk = false;
  }

  uint32_t now = millis();
  if (now - lastMqttAttemptMs < mqttBackoffMs) return false;
  lastMqttAttemptMs = now;
  mqttFailCount++;

  const char *user = mqttUser[0] ? mqttUser : nullptr;
  const char *pass = mqttUser[0] ? mqttPass : nullptr;
  bool ok = mqtt.connect(mqttClientId, user, pass, topicStatus, 1, true, willPayload, true);
  if (ok) {
    mqttBackoffMs = MQTT_RETRY_MS;
    ipReportedOnce = false;
    resubscribeMqtt();
    mqttWasOk = true;
    saveCounters(true);
    publishNetworkOnce();
    publishAck("boot", true);
    publishTelemetry();
    publishStatus("online", "MQTT connected", pzemOk);
    return true;
  }
  if (mqttBackoffMs < MQTT_RETRY_MAX_MS) {
    uint32_t next = mqttBackoffMs * 2;
    mqttBackoffMs = next > MQTT_RETRY_MAX_MS ? MQTT_RETRY_MAX_MS : next;
  }
  return false;
}

OpStatus classify(float v, float a, float w, bool ok) {
  (void)v;  // ponytail: tegangan tidak menentukan status; hanya arus (abaikan power fallback)
  if (!ok) return ST_OFF;

  // A < off → Mati; off ≤ A < thr → Idle; A ≥ thr → Running
  float offA = offCurrentA;
  if (offA < 0.0f) offA = 0.01f;
  if (a < offA) return ST_OFF;

  float thrA = currentThresholdA;
  if (thrA <= offA) thrA = offA + 0.001f;

  bool running = (a >= thrA);
  (void)w; // power tidak dipakai untuk status
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

  // Mode backend: angka Run/Loss dari sync MQTT, jangan naikkan lokal
  if (kpiFromBackend) return;

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

  // Login NVS dari hari lain → anggap belum login
  if (operatorLoggedIn && loginWibYmd > 0 && loginWibYmd != ymd) {
    clearOperatorLogin("ymd_mismatch");
  }
  // Login tanpa ymd (NTP baru OK) → ikat ke hari ini
  if (operatorLoggedIn && loginWibYmd <= 0) {
    loginWibYmd = ymd;
    saveLoginState();
  }

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
  applyStatusFilter(classify(lastV, lastA, lastW, ok));
}

void publishTelemetry() {
  if (!mqtt.connected()) return;
  StaticJsonDocument<480> doc;
  doc["device_uid"] = deviceUid;
  doc["machine_code"] = machineCode;
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
  doc["fw"] = FW_VERSION;
  doc["proto"] = PROTOCOL_VERSION;
  doc["boot_id"] = bootId;
  doc["fail_count"] = pzemFailCount;

  char buf[480];
  size_t n = serializeJson(doc, buf);
  mqtt.publish(topicTelemetry, (const uint8_t *)buf, n, false);
}

void handleButtons() {
  uint32_t now = millis();
  bool pageUp = digitalRead(BTN_PAGE) == HIGH;
  bool resetUp = digitalRead(BTN_RESET) == HIGH;

  if (!pageUp && !resetUp) {
    if (factoryHoldMs == 0) factoryHoldMs = now;
    else if (now - factoryHoldMs >= FACTORY_HOLD_MS) {
      factoryHoldMs = 0;
      factoryReset();
    }
  } else {
    factoryHoldMs = 0;
  }

  if (!pageUp && btnPagePrev) btnPageDownMs = now;
  if (pageUp && !btnPagePrev && (now - btnPageDownMs) > BTN_DEBOUNCE_MS) {
    uint8_t n = lcdSlideCount();
    lcdPage = n ? (lcdPage + 1) % n : 0;
    lcdScrollPos = 0;
    lcdManualHold = true;
    lastPageAutoMs = now;
    renderLcd();
  }
  btnPagePrev = pageUp;

  if (!resetUp && btnResetPrev) btnResetDownMs = now;
  if (!resetUp && (now - btnResetDownMs) >= BTN_LONG_MS && btnResetDownMs > 0 && pageUp) {
    resetDayCounters("btn_long");
    publishStatus("ok", "day reset via button", pzemOk);
    btnResetDownMs = 0;
    lcdPage = 0;
    renderLcd();
  }
  if (resetUp) btnResetDownMs = 0;
  btnResetPrev = resetUp;
}

void setup() {
  delay(300);
#if ENABLE_LOCAL_BUTTONS
  pinMode(BTN_PAGE, INPUT_PULLUP);
  pinMode(BTN_RESET, INPUT_PULLUP);
#endif

  snprintf(bootId, sizeof(bootId), "%08lX", (unsigned long)(ESP.getEfuseMac() ^ millis()));
  lastCmdId[0] = 0;

  loadIdentity();
  buildTopics();
  loadCounters();
  loadCalibration();
  loadLoginState();

#ifdef ESP_IDF_VERSION_MAJOR
  esp_task_wdt_config_t wdt = {
      .timeout_ms = WDT_TIMEOUT_MS,
      .idle_core_mask = 0,
      .trigger_panic = true,
  };
  esp_task_wdt_reconfigure(&wdt);
  esp_task_wdt_add(NULL);
#else
  esp_task_wdt_init(WDT_TIMEOUT_MS / 1000, true);
  esp_task_wdt_add(NULL);
#endif

  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();
  showUidSplashLcd(2000);
  showMacSplashLcd(2500);

  PZEM_UART.begin(9600, SERIAL_8N1, PZEM_RX_PIN, PZEM_TX_PIN);
  delay(400);

  mqtt.setServer(mqttHost, mqttPort);
  mqtt.setCallback(onMqttMessage);
  mqtt.setBufferSize(MQTT_BUF_SIZE);
  mqtt.setKeepAlive(MQTT_KEEPALIVE_SEC);
  mqtt.setSocketTimeout(MQTT_SOCKET_TIMEOUT_SEC);
  confirmOtaIfPending();

#if ENABLE_SETUP_AP
  bool holdBoth = false;
#if ENABLE_LOCAL_BUTTONS
  holdBoth = digitalRead(BTN_PAGE) == LOW && digitalRead(BTN_RESET) == LOW;
#endif
  if (holdBoth || !wifiProvisioned()) {
    startSetupAp(holdBoth ? "tombol" : "nvs");
  } else
#endif
  {
    WiFi.mode(WIFI_STA);
    wifiBeginCurrent();
  }
  lastTickMs = millis();
  lastPageAutoMs = millis();
}

void loop() {
  wdtFeed();
  uint32_t now = millis();
#if ENABLE_SETUP_AP
  handleSetupAp();
#endif

  if (wifiScanPending) {
    wifiScanPending = false;
    publishWifiScanAck();
  }

  if (wifiCredsDirty) {
    wifiCredsDirty = false;
    stopSetupAp();
    WiFi.mode(WIFI_STA);
    wifiBeginCurrent();
  }

  if (mqttNeedsReconnect) {
    mqttNeedsReconnect = false;
    if (mqtt.connected()) mqtt.disconnect();
  }

  ensureWifi();
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqtt.connected()) ensureMqtt();
    else mqtt.loop();
    checkWibMidnight();
  }

  bool fullyOnline = (WiFi.status() == WL_CONNECTED) && mqtt.connected();
  if (fullyOnline || setupApMode) {
    offlineSinceMs = 0;
  } else if (wifiProvisioned()) {
    if (offlineSinceMs == 0) offlineSinceMs = now;
    if ((now - offlineSinceMs) >= RECOVERY_REBOOT_MS) {
      saveCounters(true);
      delay(120);
      ESP.restart();
    }
  }

  if (mqtt.connected()) mqtt.loop();

  if (now - lastPzemMs >= PZEM_MS) {
    lastPzemMs = now;
    readPzem();
    tickTimers();
  }

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

#if ENABLE_LOCAL_BUTTONS
  handleButtons();
#endif

  uint8_t nSlide = lcdSlideCount();
  if (nSlide && lcdPage >= nSlide) lcdPage = 0;
  if (!lcdManualHold && (now - lastPageAutoMs >= lcdAutoMs)) {
    lastPageAutoMs = now;
    lcdPage = nSlide ? (lcdPage + 1) % nSlide : 0;
    lcdScrollPos = 0;
  }
  if (lcdManualHold && (now - lastPageAutoMs >= 12000)) lcdManualHold = false;

  if (now - lastLcdMs >= LCD_MS) {
    lastLcdMs = now;
    renderLcd();
  }
}

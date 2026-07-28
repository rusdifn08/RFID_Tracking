/**
 * ESP32-32U + ADXL345 → MQTT telemetry + health + Run/Loss lokal (NVS)
 *
 * Topics:
 *   iot/gistex/{CODE}/telemetry/adxl
 *   iot/gistex/{CODE}/status/adxl
 *   iot/gistex/{CODE}/cmd | ack
 *
 * Getaran = |dx|+|dy|+|dz| (delta ~50ms), kirim peak tiap TELEMETRY_MS.
 * Run/Loss dihitung LOKAL + NVS (sama pola PZEM C6):
 *   - WiFi putus → timer tetap jalan, tersimpan berkala
 *   - Reconnect → publish counter ke dashboard
 *   - reset_day via MQTT → nolkan RAM+NVS
 *   - Cut hari baru 00:00 WIB (NTP)
 */

#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_ADXL345_U.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <time.h>

static const char *WIFI_SSID = "Robot_Resource (Lokal)";
static const char *WIFI_PASS = "robot@9876";

static const char *MQTT_HOST = "10.5.0.106";
static const uint16_t MQTT_PORT = 1883;
static const char *MQTT_CLIENT_ID = "esp-adxl-sew001";

static const char *MACHINE_CODE = "SEW-001";
static const char *DEVICE_UID = "esp-adxl-001";
static const char *TOPIC_PREFIX = "iot/gistex";
static const char *SENSOR_NAME = "adxl";

static const uint32_t TELEMETRY_MS = 200;
static const uint32_t STATUS_MS = 5000;
static const uint32_t SAMPLE_MS = 50;
static const uint32_t WIFI_RETRY_MS = 5000;
static const uint32_t MQTT_RETRY_MS = 3000;
static const uint32_t NVS_SAVE_MS = 10000;

static const long GMT_OFFSET_SEC = 7 * 3600;
static const int DAYLIGHT_OFFSET_SEC = 0;
static const char *NTP_SERVER = "pool.ntp.org";

#define BUZZER_PIN 25

float gForceThreshold = 0.50f;
int filterAktifMs = 500;
int filterDiamMs = 3000;

Adafruit_ADXL345_Unified accel(12345);
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
Preferences prefs;

char topicTelemetry[96];
char topicStatus[96];
char topicCmd[96];
char topicAck[96];
char willPayload[192];

uint32_t lastTelemetryMs = 0;
uint32_t lastStatusMs = 0;
uint32_t lastSampleMs = 0;
uint32_t lastWifiAttemptMs = 0;
uint32_t lastMqttAttemptMs = 0;
uint16_t sensorFailCount = 0;
uint16_t mqttFailCount = 0;
uint16_t wifiFailCount = 0;

bool accelReady = false;
bool wifiWasOk = false;
bool mqttWasOk = false;
bool sensorWasOk = false;
bool ntpOk = false;
String lastState = "boot";

float last_x = 0, last_y = 0, last_z = 0;
bool hasLast = false;
float peakVibration = 0;
float lastAx = 0, lastAy = 0, lastAz = 0;
float lastVib = 0;

enum OpStatus : uint8_t { ST_OFF = 0, ST_IDLE = 1, ST_RUNNING = 2 };
OpStatus opStatus = ST_OFF;

uint32_t runSec = 0;
uint32_t lossSec = 0;
uint32_t offSec = 0;
uint32_t lastTickMs = 0;
int lastWibYmd = -1;

uint32_t nvsRun = 0, nvsLoss = 0, nvsOff = 0;
uint32_t lastNvsSaveMs = 0;
bool countersDirty = false;

// Sticky peak (sama filter_diam backend)
uint32_t lastPeakAboveMs = 0;
uint32_t activeSinceMs = 0;
bool wantActiveSticky = false;

void beep(uint16_t ms) {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(ms);
  digitalWrite(BUZZER_PIN, LOW);
}

void saveCounters(bool force);

int wibYmdNow() {
  struct tm ti;
  if (!getLocalTime(&ti, 50)) return -1;
  return (ti.tm_year + 1900) * 10000 + (ti.tm_mon + 1) * 100 + ti.tm_mday;
}

void loadCounters() {
  prefs.begin("adxlkpi", true);
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
  prefs.begin("adxlkpi", false);
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

void markCountersDirty() { countersDirty = true; }

void resetDayCounters(const char *reason) {
  runSec = 0;
  lossSec = 0;
  offSec = 0;
  lastTickMs = millis();
  lastPeakAboveMs = 0;
  activeSinceMs = 0;
  wantActiveSticky = false;
  saveCounters(true);
  Serial.printf("[DAY] reset counters (%s)\n", reason);
}

static const char *statusStr(OpStatus s) {
  switch (s) {
    case ST_RUNNING: return "running";
    case ST_IDLE: return "idle";
    default: return "off";
  }
}

float productivityPct() {
  uint32_t powerOn = runSec + lossSec;
  if (powerOn == 0) return 0;
  return (100.0f * runSec) / (float)powerOn;
}

void buildTopics() {
  snprintf(topicTelemetry, sizeof(topicTelemetry), "%s/%s/telemetry/%s", TOPIC_PREFIX, MACHINE_CODE, SENSOR_NAME);
  snprintf(topicStatus, sizeof(topicStatus), "%s/%s/status/%s", TOPIC_PREFIX, MACHINE_CODE, SENSOR_NAME);
  snprintf(topicCmd, sizeof(topicCmd), "%s/%s/cmd", TOPIC_PREFIX, MACHINE_CODE);
  snprintf(topicAck, sizeof(topicAck), "%s/%s/ack", TOPIC_PREFIX, MACHINE_CODE);
  snprintf(willPayload, sizeof(willPayload),
           "{\"device_uid\":\"%s\",\"machine_code\":\"%s\",\"sensor\":\"%s\",\"state\":\"mqtt_lost\",\"online\":false,\"detail\":\"MQTT LWT — koneksi putus\"}",
           DEVICE_UID, MACHINE_CODE, SENSOR_NAME);
}

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
  doc["fail_count"] = sensorFailCount;
  doc["mqtt_fail_count"] = mqttFailCount;
  doc["wifi_fail_count"] = wifiFailCount;
  doc["run_sec"] = runSec;
  doc["loss_sec"] = lossSec;
  doc["off_sec"] = offSec;
  doc["op_status"] = statusStr(opStatus);

  char buf[420];
  size_t n = serializeJson(doc, buf);
  if (mqtt.publish(topicStatus, (const uint8_t *)buf, n, false)) {
    if (lastState != state) {
      Serial.printf("[STATUS] %s — %s\n", state, detail);
      lastState = state;
    }
  }
}

void publishAck(const char *command, bool ok) {
  StaticJsonDocument<220> doc;
  doc["device_uid"] = DEVICE_UID;
  doc["command"] = command;
  doc["ok"] = ok;
  doc["g_force_threshold"] = gForceThreshold;
  doc["filter_aktif_ms"] = filterAktifMs;
  doc["filter_diam_ms"] = filterDiamMs;
  doc["run_sec"] = runSec;
  doc["loss_sec"] = lossSec;
  doc["off_sec"] = offSec;
  char buf[220];
  size_t n = serializeJson(doc, buf);
  mqtt.publish(topicAck, buf, n);
}

void publishTelemetry();

void onMqttMessage(char *topic, byte *payload, unsigned int length) {
  StaticJsonDocument<320> doc;
  if (deserializeJson(doc, payload, length)) return;
  const char *cmd = doc["command"] | "";
  if (strcmp(cmd, "set_calibration") == 0) {
    if (doc.containsKey("g_force_threshold")) {
      float v = doc["g_force_threshold"].as<float>();
      if (v >= 0.01f && v <= 20.0f) gForceThreshold = v;
    }
    if (doc.containsKey("filter_aktif_ms")) {
      int v = doc["filter_aktif_ms"].as<int>();
      if (v >= 50 && v <= 60000) filterAktifMs = v;
    }
    if (doc.containsKey("filter_diam_ms")) {
      int v = doc["filter_diam_ms"].as<int>();
      if (v >= 100 && v <= 120000) filterDiamMs = v;
    }
    Serial.printf("[CMD] G=%.2f aktif=%d diam=%d\n", gForceThreshold, filterAktifMs, filterDiamMs);
    beep(120);
    publishAck(cmd, true);
  } else if (strcmp(cmd, "ping") == 0) {
    publishAck(cmd, true);
    publishStatus(sensorWasOk ? "ok" : "sensor_fail", "pong", sensorWasOk);
  } else if (strcmp(cmd, "reset_day") == 0) {
    const char *target = doc["sensor"] | "";
    if (target[0] != '\0' && strcmp(target, SENSOR_NAME) != 0) return;
    hasLast = false;
    peakVibration = 0;
    lastAx = lastAy = lastAz = 0;
    lastVib = 0;
    resetDayCounters("mqtt");
    beep(120);
    publishAck(cmd, true);
    publishTelemetry();
    publishStatus(sensorWasOk ? "ok" : "sensor_fail", "day counters reset via MQTT", sensorWasOk);
  }
}

bool ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!wifiWasOk) {
      wifiWasOk = true;
      configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
      Serial.printf("[WiFi] OK IP=%s RSSI=%d\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
    }
    return true;
  }
  if (wifiWasOk) {
    saveCounters(true);
    wifiWasOk = false;
    mqttWasOk = false;
    ntpOk = false;
    Serial.println("[WiFi] lost — counters saved to NVS");
  }
  uint32_t now = millis();
  if (now - lastWifiAttemptMs < WIFI_RETRY_MS) return false;
  lastWifiAttemptMs = now;
  wifiFailCount++;
  Serial.printf("[WiFi] reconnect #%u ...\n", wifiFailCount);
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(MQTT_CLIENT_ID);
  WiFi.disconnect(false);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  uint8_t tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(250);
    Serial.print(".");
    tries++;
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    wifiWasOk = true;
    configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
    Serial.printf("[WiFi] OK IP=%s\n", WiFi.localIP().toString().c_str());
    return true;
  }
  return false;
}

bool ensureMqtt() {
  if (mqtt.connected()) {
    if (!mqttWasOk) {
      mqttWasOk = true;
      saveCounters(true);
      publishTelemetry();
      publishStatus("resync", "MQTT reconnect — sync Run/Loss dari ESP", sensorWasOk);
    }
    return true;
  }
  if (WiFi.status() != WL_CONNECTED) return false;
  if (mqttWasOk) {
    mqttWasOk = false;
    Serial.println("[MQTT] disconnected");
  }
  uint32_t now = millis();
  if (now - lastMqttAttemptMs < MQTT_RETRY_MS) return false;
  lastMqttAttemptMs = now;
  mqttFailCount++;
  Serial.printf("[MQTT] connect #%u ...\n", mqttFailCount);
  bool ok = mqtt.connect(MQTT_CLIENT_ID, topicStatus, 1, true, willPayload);
  if (ok) {
    mqtt.subscribe(topicCmd);
    mqttWasOk = true;
    Serial.printf("[MQTT] ok, sub %s\n", topicCmd);
    publishAck("boot", true);
    publishTelemetry();
    publishStatus(
        accelReady ? "mqtt_ok" : "sensor_fail",
        accelReady ? "MQTT connected — sync Run/Loss" : "MQTT OK tapi ADXL345 tidak terdeteksi (I2C/kabel)",
        accelReady);
    beep(80);
    return true;
  }
  Serial.printf("[MQTT] fail rc=%d\n", mqtt.state());
  return false;
}

void sampleVibration() {
  if (!accelReady) return;
  sensors_event_t event;
  accel.getEvent(&event);
  float ax = event.acceleration.x;
  float ay = event.acceleration.y;
  float az = event.acceleration.z;
  lastAx = ax;
  lastAy = ay;
  lastAz = az;

  if (!hasLast) {
    last_x = ax;
    last_y = ay;
    last_z = az;
    hasLast = true;
    return;
  }
  float vib = fabsf(ax - last_x) + fabsf(ay - last_y) + fabsf(az - last_z);
  last_x = ax;
  last_y = ay;
  last_z = az;
  if (vib > peakVibration) peakVibration = vib;
}

/**
 * Classify: sticky peak + filter_aktif / filter_diam (selaras backend ADXL).
 * Running = getaran ≥ thr (sticky filter_diam). Idle = sensor OK, vib kecil.
 * Off = sensor gagal ATAU getaran ≈ 0 lama (diam total).
 */
OpStatus classify(float vibPeak, bool ok) {
  if (!ok) {
    wantActiveSticky = false;
    activeSinceMs = 0;
    return ST_OFF;
  }
  uint32_t now = millis();
  if (vibPeak >= gForceThreshold) {
    lastPeakAboveMs = now;
  }
  bool aboveSticky = (lastPeakAboveMs > 0) && ((now - lastPeakAboveMs) < (uint32_t)filterDiamMs);

  if (aboveSticky) {
    if (activeSinceMs == 0) activeSinceMs = now;
    if ((now - activeSinceMs) >= (uint32_t)filterAktifMs) {
      wantActiveSticky = true;
    }
  } else {
    activeSinceMs = 0;
    wantActiveSticky = false;
  }

  if (wantActiveSticky) return ST_RUNNING;
  // Getaran hampir 0 dan sticky habis → mati; ada noise kecil → idle
  const float OFF_G = 0.02f;
  if (vibPeak < OFF_G && (lastPeakAboveMs == 0 || (now - lastPeakAboveMs) >= (uint32_t)filterDiamMs)) {
    return ST_OFF;
  }
  return ST_IDLE;
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
    lastWibYmd = ymd;
    saveCounters(true);
    return;
  }
  if (ymd != lastWibYmd) {
    publishStatus("day_cut", "WIB midnight / hari baru - reset counter", sensorWasOk);
    lastWibYmd = ymd;
    resetDayCounters("wib_midnight");
    if (mqtt.connected()) publishTelemetry();
  }
}

void publishTelemetry() {
  if (!mqtt.connected()) return;

  if (!accelReady) {
    sensorFailCount++;
    if (sensorFailCount == 1 || (sensorFailCount % 10) == 0) {
      publishStatus("sensor_fail", "ADXL345 tidak terdeteksi — cek I2C SDA/SCL/VCC/GND", false);
    }
    opStatus = ST_OFF;
    StaticJsonDocument<320> doc;
    doc["device_uid"] = DEVICE_UID;
    doc["machine_code"] = MACHINE_CODE;
    doc["sensor_ok"] = false;
    doc["ax"] = 0;
    doc["ay"] = 0;
    doc["az"] = 0;
    doc["vibration"] = 0;
    doc["fail_count"] = sensorFailCount;
    doc["op_status"] = statusStr(opStatus);
    doc["run_sec"] = runSec;
    doc["loss_sec"] = lossSec;
    doc["off_sec"] = offSec;
    doc["power_on_sec"] = runSec + lossSec;
    doc["productivity_pct"] = productivityPct();
    char buf[320];
    size_t n = serializeJson(doc, buf);
    mqtt.publish(topicTelemetry, (const uint8_t *)buf, n, false);
    return;
  }

  float vib = peakVibration;
  peakVibration = 0;
  lastVib = vib;
  if (!sensorWasOk) {
    sensorWasOk = true;
    publishStatus("sensor_ok", "ADXL345 terbaca", true);
  }

  opStatus = classify(vib, true);

  StaticJsonDocument<360> doc;
  doc["device_uid"] = DEVICE_UID;
  doc["machine_code"] = MACHINE_CODE;
  doc["sensor_ok"] = true;
  doc["ax"] = lastAx;
  doc["ay"] = lastAy;
  doc["az"] = lastAz;
  doc["vibration"] = vib;
  doc["op_status"] = statusStr(opStatus);
  doc["run_sec"] = runSec;
  doc["loss_sec"] = lossSec;
  doc["off_sec"] = offSec;
  doc["power_on_sec"] = runSec + lossSec;
  doc["productivity_pct"] = productivityPct();
  doc["g_force_threshold"] = gForceThreshold;

  char buf[360];
  size_t n = serializeJson(doc, buf);
  if (mqtt.publish(topicTelemetry, (const uint8_t *)buf, n, false)) {
    Serial.printf("[TX] vib=%.3f %s RUN=%lu LOS=%lu\n",
                  vib, statusStr(opStatus), (unsigned long)runSec, (unsigned long)lossSec);
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  buildTopics();
  loadCounters();

  accelReady = accel.begin();
  if (!accelReady) {
    Serial.println("[CRITICAL] ADXL345 not found — tetap jalan untuk kirim status/health");
    beep(200);
    delay(200);
    beep(200);
  } else {
    accel.setRange(ADXL345_RANGE_16_G);
    sampleVibration();
    sensorWasOk = true;
    Serial.println("[ADXL] OK");
  }

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
  mqtt.setBufferSize(512);
  mqtt.setKeepAlive(15);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  lastTickMs = millis();
  Serial.println("[BOOT] ESP32 ADXL — telemetry + health + NVS Run/Loss");
  Serial.printf("[NVS] restored RUN=%lu LOS=%lu OFF=%lu\n",
                (unsigned long)runSec, (unsigned long)lossSec, (unsigned long)offSec);
}

void loop() {
  ensureWifi();
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqtt.connected()) ensureMqtt();
    else mqtt.loop();
    checkWibMidnight();
  }

  uint32_t now = millis();
  if (now - lastSampleMs >= SAMPLE_MS) {
    lastSampleMs = now;
    sampleVibration();
  }

  // Timer offline juga (continuity) — classify tiap detik saja di tick
  static uint32_t lastClassifyMs = 0;
  if (now - lastClassifyMs >= 200) {
    lastClassifyMs = now;
    if (accelReady) {
      opStatus = classify(peakVibration > 0 ? peakVibration : lastVib, true);
    } else {
      opStatus = ST_OFF;
    }
    tickTimers();
  }
  if (countersDirty) saveCounters(false);

  if (mqtt.connected() && (now - lastTelemetryMs >= TELEMETRY_MS)) {
    lastTelemetryMs = now;
    publishTelemetry();
  }
  if (mqtt.connected() && (now - lastStatusMs >= STATUS_MS)) {
    lastStatusMs = now;
    if (sensorWasOk) publishStatus("ok", "ESP+ADXL sehat", true);
    else publishStatus("sensor_fail", "ESP online, ADXL belum sehat", false);
  }
}

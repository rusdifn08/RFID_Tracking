/**
 * ESP32-32U + PZEM-004T v4 → MQTT telemetry + health status
 *
 * Topics:
 *   iot/gistex/{CODE}/telemetry/pzem   — data listrik / heartbeat
 *   iot/gistex/{CODE}/status/pzem      — health (wifi/mqtt/sensor)
 *   iot/gistex/{CODE}/ack              — jawaban command
 *   iot/gistex/{CODE}/cmd              — command dari backend
 *
 * Wiring (silang TX/RX):
 *   ESP32 GPIO16 (RX) ← PZEM TX
 *   ESP32 GPIO17 (TX) → PZEM RX
 *   GND bersama · PZEM L/N ke AC (wajib)
 * Jika tetap NaN: set PZEM_SWAP_PINS 1 lalu flash ulang.
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <PZEM004Tv30.h>

// ============ CONFIG ============
static const char *WIFI_SSID = "Robot_Resource (Lokal)";
static const char *WIFI_PASS = "robot@9876";

static const char *MQTT_HOST = "10.5.0.106";
static const uint16_t MQTT_PORT = 1883;
static const char *MQTT_CLIENT_ID = "esp-pzem-sew001";

static const char *MACHINE_CODE = "SEW-001";
static const char *DEVICE_UID = "esp-pzem-001";
static const char *TOPIC_PREFIX = "iot/gistex";
static const char *SENSOR_NAME = "pzem";

static const uint32_t TELEMETRY_MS = 1000;
static const uint32_t STATUS_MS = 5000;
static const uint32_t WIFI_RETRY_MS = 5000;
static const uint32_t MQTT_RETRY_MS = 3000;

#ifndef PZEM_SWAP_PINS
#define PZEM_SWAP_PINS 0
#endif

#if PZEM_SWAP_PINS
#define PZEM_RX_PIN 17
#define PZEM_TX_PIN 16
#else
#define PZEM_RX_PIN 16
#define PZEM_TX_PIN 17
#endif
// =================================

HardwareSerial &PZEM_UART = Serial2;
PZEM004Tv30 pzem(PZEM_UART, PZEM_RX_PIN, PZEM_TX_PIN);
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

char topicTelemetry[96];
char topicStatus[96];
char topicCmd[96];
char topicAck[96];
char willPayload[192];

uint32_t lastTelemetryMs = 0;
uint32_t lastStatusMs = 0;
uint32_t lastWifiAttemptMs = 0;
uint32_t lastMqttAttemptMs = 0;
uint16_t pzemFailCount = 0;
uint16_t mqttFailCount = 0;
uint16_t wifiFailCount = 0;

bool wifiWasOk = false;
bool mqttWasOk = false;
bool sensorWasOk = false;
String lastState = "boot";

void buildTopics() {
  snprintf(topicTelemetry, sizeof(topicTelemetry), "%s/%s/telemetry/%s", TOPIC_PREFIX, MACHINE_CODE, SENSOR_NAME);
  snprintf(topicStatus, sizeof(topicStatus), "%s/%s/status/%s", TOPIC_PREFIX, MACHINE_CODE, SENSOR_NAME);
  snprintf(topicCmd, sizeof(topicCmd), "%s/%s/cmd", TOPIC_PREFIX, MACHINE_CODE);
  snprintf(topicAck, sizeof(topicAck), "%s/%s/ack", TOPIC_PREFIX, MACHINE_CODE);
  snprintf(willPayload, sizeof(willPayload),
           "{\"device_uid\":\"%s\",\"machine_code\":\"%s\",\"sensor\":\"%s\",\"state\":\"mqtt_lost\",\"online\":false,\"detail\":\"MQTT LWT — koneksi putus\"}",
           DEVICE_UID, MACHINE_CODE, SENSOR_NAME);
}

/** Publish health ke topic status (retained=false; LWT retained via connect will) */
void publishStatus(const char *state, const char *detail, bool sensorOk) {
  if (!mqtt.connected()) return;

  StaticJsonDocument<384> doc;
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
  doc["mqtt_fail_count"] = mqttFailCount;
  doc["wifi_fail_count"] = wifiFailCount;

  char buf[384];
  size_t n = serializeJson(doc, buf);
  if (mqtt.publish(topicStatus, (const uint8_t *)buf, n, false)) {
    if (lastState != state) {
      Serial.printf("[STATUS] %s — %s\n", state, detail);
      lastState = state;
    }
  }
}

void publishAck(const char *command, bool ok) {
  StaticJsonDocument<128> doc;
  doc["device_uid"] = DEVICE_UID;
  doc["command"] = command;
  doc["ok"] = ok;
  char buf[128];
  size_t n = serializeJson(doc, buf);
  mqtt.publish(topicAck, buf, n);
}

void onMqttMessage(char *topic, byte *payload, unsigned int length) {
  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, payload, length)) return;
  const char *cmd = doc["command"] | "";
  if (strcmp(cmd, "set_calibration") == 0) {
    Serial.printf("[CMD] set_calibration current_a=%.3f power_w=%.1f\n",
                  doc["current_threshold_a"] | -1.0f,
                  doc["power_threshold_w"] | -1.0f);
    publishAck(cmd, true);
  } else if (strcmp(cmd, "ping") == 0) {
    publishAck(cmd, true);
    publishStatus(sensorWasOk ? "ok" : "sensor_fail", "pong", sensorWasOk);
  }
}

bool ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!wifiWasOk) {
      wifiWasOk = true;
      Serial.printf("[WiFi] OK IP=%s RSSI=%d\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
    }
    return true;
  }

  if (wifiWasOk) {
    wifiWasOk = false;
    mqttWasOk = false;
    Serial.println("[WiFi] lost — akan reconnect");
  }

  uint32_t now = millis();
  if (now - lastWifiAttemptMs < WIFI_RETRY_MS) return false;
  lastWifiAttemptMs = now;
  wifiFailCount++;

  Serial.printf("[WiFi] reconnect #%u %s ...\n", wifiFailCount, WIFI_SSID);
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
    Serial.printf("[WiFi] OK IP=%s -> MQTT %s:%u\n",
                  WiFi.localIP().toString().c_str(), MQTT_HOST, MQTT_PORT);
    return true;
  }
  Serial.printf("[WiFi] fail (status=%d)\n", WiFi.status());
  return false;
}

bool ensureMqtt() {
  if (mqtt.connected()) {
    if (!mqttWasOk) {
      mqttWasOk = true;
      publishStatus("mqtt_ok", "MQTT connected", sensorWasOk);
    }
    return true;
  }

  if (WiFi.status() != WL_CONNECTED) return false;

  if (mqttWasOk) {
    mqttWasOk = false;
    Serial.println("[MQTT] disconnected — reconnect...");
  }

  uint32_t now = millis();
  if (now - lastMqttAttemptMs < MQTT_RETRY_MS) return false;
  lastMqttAttemptMs = now;
  mqttFailCount++;

  Serial.printf("[MQTT] connect #%u %s:%u ...\n", mqttFailCount, MQTT_HOST, MQTT_PORT);
  // LWT: kalau ESP putus mendadak, broker publish state=mqtt_lost
  bool ok = mqtt.connect(MQTT_CLIENT_ID, topicStatus, 1, true, willPayload);
  if (ok) {
    mqtt.subscribe(topicCmd);
    mqttWasOk = true;
    Serial.printf("[MQTT] ok, sub %s\n", topicCmd);
    publishAck("boot", true);
    publishStatus("mqtt_ok", "MQTT connected / reconnected", sensorWasOk);
    return true;
  }
  Serial.printf("[MQTT] fail rc=%d\n", mqtt.state());
  return false;
}

void initPzemUart() {
  PZEM_UART.begin(9600, SERIAL_8N1, PZEM_RX_PIN, PZEM_TX_PIN);
  delay(1000);
  Serial.printf("[PZEM] UART2 RX=%d TX=%d baud=9600 swap=%d\n",
                PZEM_RX_PIN, PZEM_TX_PIN, PZEM_SWAP_PINS);
  Serial.printf("[PZEM] addr=0x%02X\n", pzem.getAddress());
}

void publishPzem() {
  float v = pzem.voltage();
  bool ok = !isnan(v);
  float a = 0, w = 0, e = 0, f = 0, pf = 0;

  if (!ok) {
    pzemFailCount++;
    if (sensorWasOk || pzemFailCount == 1 || (pzemFailCount % 5) == 0) {
      publishStatus(
          "sensor_fail",
          "PZEM tidak terbaca (NaN) — cek kabel TX/RX, GND, L/N AC, atau SWAP_PINS",
          false);
      Serial.println("[PZEM] sensor_fail — kabel/modul?");
    }
    sensorWasOk = false;
  } else {
    if (!sensorWasOk) {
      publishStatus("sensor_ok", "PZEM terbaca kembali", true);
    }
    sensorWasOk = true;
    pzemFailCount = 0;
    a = pzem.current();
    w = pzem.power();
    e = pzem.energy();
    f = pzem.frequency();
    pf = pzem.pf();
  }

  StaticJsonDocument<360> doc;
  doc["device_uid"] = DEVICE_UID;
  doc["machine_code"] = MACHINE_CODE;
  doc["pzem_ok"] = ok;
  doc["sensor_ok"] = ok;
  doc["voltage_v"] = ok ? v : 0.0;
  doc["current_a"] = (!ok || isnan(a)) ? 0.0 : a;
  doc["power_w"] = (!ok || isnan(w)) ? 0.0 : w;
  doc["energy_kwh"] = (!ok || isnan(e)) ? 0.0 : e;
  doc["frequency_hz"] = (!ok || isnan(f)) ? 0.0 : f;
  doc["power_factor"] = (!ok || isnan(pf)) ? 0.0 : pf;
  doc["fail_count"] = pzemFailCount;

  char buf[360];
  size_t n = serializeJson(doc, buf);
  if (mqtt.publish(topicTelemetry, (const uint8_t *)buf, n, false)) {
    if (ok) Serial.printf("[TX] V=%.1f A=%.3f W=%.1f\n", v, a, w);
    else if (pzemFailCount == 1 || (pzemFailCount % 5) == 0)
      Serial.printf("[TX heartbeat] sensor_fail #%u\n", pzemFailCount);
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  buildTopics();
  initPzemUart();

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
  mqtt.setBufferSize(512);
  mqtt.setKeepAlive(15);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.println("[BOOT] ESP32 PZEM — telemetry + health status");
  Serial.printf("[BOOT] status topic %s\n", topicStatus);
}

void loop() {
  ensureWifi();
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqtt.connected()) ensureMqtt();
    else mqtt.loop();
  }

  uint32_t now = millis();
  if (mqtt.connected() && (now - lastTelemetryMs >= TELEMETRY_MS)) {
    lastTelemetryMs = now;
    publishPzem();
  }
  if (mqtt.connected() && (now - lastStatusMs >= STATUS_MS)) {
    lastStatusMs = now;
    if (sensorWasOk) publishStatus("ok", "ESP+PZEM sehat", true);
    else publishStatus("sensor_fail", "ESP online, PZEM belum terbaca", false);
  }
}

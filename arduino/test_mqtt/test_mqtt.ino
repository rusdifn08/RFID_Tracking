/**
 * test_mqtt.ino — Uji WiFi + MQTT (status+telemetry) + LCD I2C
 *
 * Board: ESP32-C6 Dev Module / SuperMini C6
 * Library: PubSubClient, ArduinoJson, LiquidCrystal_I2C
 *
 * Wiring LCD I2C 16x2: SDA=GPIO20 SCL=GPIO19 addr 0x27
 *
 * Topics:
 *   iot/gistex/JUKI018/status/pzem
 *   iot/gistex/JUKI018/telemetry/pzem
 *
 * Monitor di SSH:
 *   mosquitto_sub -h 10.5.2.222 -p 1883 -t 'iot/gistex/JUKI018/#' -v
 *   # atau khusus telemetry:
 *   mosquitto_sub -h 10.5.2.222 -p 1883 -t 'iot/gistex/JUKI018/telemetry/pzem' -v
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

static const char *DEFAULT_WIFI_SSID = "Tracked (3)";
static const char *DEFAULT_WIFI_PASS = "Factory@RFID";

static const char *MACHINE_CODE = "JUKI018";
static const char *DEVICE_UID = "018";
static const char *SENSOR_NAME = "pzem";
static const char *TOPIC_PREFIX = "iot/gistex";

// Primary robotic + fallback lokal (backend biasanya subscribe keduanya)
static const char *MQTT_HOSTS[] = {"10.5.2.222", "10.5.0.106"};
static const uint8_t MQTT_HOST_COUNT = 2;
static const uint16_t MQTT_PORT = 1883;

#define I2C_SDA 20
#define I2C_SCL 19
#define LCD_ADDR 0x27

static const uint32_t WIFI_TIMEOUT_MS = 20000;
static const uint32_t PUBLISH_MS = 2000;   // status + telemetry tiap 2 dtk
static const uint32_t MQTT_RETRY_MS = 2500;
static const uint32_t LCD_PAGE_MS = 2500;

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
LiquidCrystal_I2C lcd(LCD_ADDR, 16, 2);

char topicStatus[96];
char topicTelemetry[96];
char mqttClientId[40];
char lwtPayload[192];
char macStr[18];
char activeMqttHost[32] = "10.5.2.222";
uint8_t mqttHostIdx = 0;

uint32_t lastPublishMs = 0;
uint32_t lastMqttTryMs = 0;
uint32_t lastLcdMs = 0;
uint8_t lcdPage = 0;

void lcdShow(const char *l1, const char *l2) {
  lcd.setCursor(0, 0);
  lcd.print(l1);
  for (int i = strlen(l1); i < 16; i++) lcd.print(' ');
  lcd.setCursor(0, 1);
  lcd.print(l2);
  for (int i = strlen(l2); i < 16; i++) lcd.print(' ');
}

void refreshMac() {
  uint8_t mac[6];
  WiFi.macAddress(mac);
  snprintf(macStr, sizeof(macStr), "%02X:%02X:%02X:%02X:%02X:%02X",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
}

void setupLcd() {
  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();
  lcdShow(MACHINE_CODE, "UID 018 TEST");
  delay(600);
}

void updateLcd() {
  char line1[17];
  char line2[17];

  switch (lcdPage % 4) {
    case 0:
      snprintf(line1, sizeof(line1), "%s", MACHINE_CODE);
      snprintf(line2, sizeof(line2), "UID %s", DEVICE_UID);
      break;
    case 1:
      snprintf(line1, sizeof(line1), "MAC ADDRESS");
      snprintf(line2, sizeof(line2), "%s", macStr);
      break;
    case 2: {
      String ssid = WiFi.SSID();
      if (ssid.length() > 16) ssid = ssid.substring(0, 16);
      snprintf(line1, sizeof(line1), "WiFi %ddBm", WiFi.RSSI());
      snprintf(line2, sizeof(line2), "%s", ssid.c_str());
      break;
    }
    default:
      snprintf(line1, sizeof(line1), "MQTT %s", mqtt.connected() ? "OK" : "WAIT");
      // tampil host singkat + IP
      if (mqtt.connected()) {
        snprintf(line2, sizeof(line2), "%s", WiFi.localIP().toString().c_str());
      } else {
        snprintf(line2, sizeof(line2), "%s", activeMqttHost);
      }
      break;
  }
  lcdShow(line1, line2);
}

void buildTopics() {
  snprintf(topicStatus, sizeof(topicStatus), "%s/%s/status/%s",
           TOPIC_PREFIX, MACHINE_CODE, SENSOR_NAME);
  snprintf(topicTelemetry, sizeof(topicTelemetry), "%s/%s/telemetry/%s",
           TOPIC_PREFIX, MACHINE_CODE, SENSOR_NAME);
  snprintf(lwtPayload, sizeof(lwtPayload),
           "{\"device_uid\":\"%s\",\"machine_code\":\"%s\",\"sensor\":\"%s\","
           "\"state\":\"mqtt_lost\",\"online\":false,\"mac\":\"%s\","
           "\"detail\":\"MQTT LWT test\"}",
           DEVICE_UID, MACHINE_CODE, SENSOR_NAME, macStr);
  uint8_t mac[6];
  WiFi.macAddress(mac);
  snprintf(mqttClientId, sizeof(mqttClientId), "esp-%s-%02X%02X%02X",
           DEVICE_UID, mac[3], mac[4], mac[5]);
}

bool tcpReachable(const char *host, uint16_t port, uint32_t timeoutMs) {
  WiFiClient probe;
  probe.setTimeout(timeoutMs);
  bool ok = probe.connect(host, port, timeoutMs);
  if (ok) probe.stop();
  return ok;
}

void publishStatus(const char *state, const char *detail) {
  if (!mqtt.connected()) return;

  StaticJsonDocument<640> doc;
  doc["device_uid"] = DEVICE_UID;
  doc["machine_code"] = MACHINE_CODE;
  doc["sensor"] = SENSOR_NAME;
  doc["state"] = state;
  doc["online"] = true;
  doc["wifi_ok"] = WiFi.status() == WL_CONNECTED;
  doc["mqtt_ok"] = true;
  doc["mqtt_service"] = activeMqttHost;
  doc["mqtt_server"] = activeMqttHost;
  doc["mqtt_host"] = activeMqttHost;
  doc["sensor_ok"] = true;
  doc["detail"] = detail;
  doc["rssi"] = WiFi.RSSI();
  doc["ip"] = WiFi.localIP().toString();
  doc["mac"] = macStr;
  doc["mac_addr"] = macStr;
  doc["wifi_mac"] = macStr;
  doc["wifi_ssid"] = WiFi.SSID();
  doc["uptime_sec"] = millis() / 1000;
  doc["fail_count"] = 0;
  doc["run_sec"] = 0;
  doc["loss_sec"] = 0;
  doc["off_sec"] = 0;
  doc["ip_once"] = true;

  char buf[640];
  size_t n = serializeJson(doc, buf);
  // retain=true menimpa LWT mqtt_lost di broker (supaya /devices tidak stuck OFFLINE)
  bool ok = mqtt.publish(topicStatus, (const uint8_t *)buf, n, true);
  Serial.printf("[MQTT] status %s → %s (%u B) retain mac=%s\n",
                ok ? "OK" : "FAIL", topicStatus, (unsigned)n, macStr);
}

void publishTelemetry() {
  if (!mqtt.connected()) return;

  // Dummy PZEM agar topic telemetry/pzem hidup (tanpa sensor fisik)
  StaticJsonDocument<512> doc;
  doc["device_uid"] = DEVICE_UID;
  doc["machine_code"] = MACHINE_CODE;
  doc["pzem_ok"] = true;
  doc["sensor_ok"] = true;
  doc["voltage_v"] = 220.0;
  doc["current_a"] = 0.05;
  doc["power_w"] = 11.0;
  doc["energy_kwh"] = 0.001;
  doc["frequency_hz"] = 50.0;
  doc["power_factor"] = 0.95;
  doc["op_status"] = "IDLE";
  doc["run_sec"] = 0;
  doc["loss_sec"] = 0;
  doc["off_sec"] = 0;
  doc["power_on_sec"] = 0;
  doc["productivity_pct"] = 0.0;
  doc["fail_count"] = 0;
  doc["mqtt_service"] = activeMqttHost;
  doc["mqtt_server"] = activeMqttHost;
  doc["mac"] = macStr;
  doc["ip"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();
  doc["wifi_ssid"] = WiFi.SSID();

  char buf[512];
  size_t n = serializeJson(doc, buf);
  bool ok = mqtt.publish(topicTelemetry, (const uint8_t *)buf, n, false);
  Serial.printf("[MQTT] tele   %s → %s (%u B) mac=%s host=%s\n",
                ok ? "OK" : "FAIL", topicTelemetry, (unsigned)n, macStr, activeMqttHost);
}

void publishAll(const char *state, const char *detail) {
  publishStatus(state, detail);
  publishTelemetry();
}

bool tryConnectOne(const char *host) {
  strncpy(activeMqttHost, host, sizeof(activeMqttHost) - 1);
  activeMqttHost[sizeof(activeMqttHost) - 1] = '\0';

  lcdShow("MQTT CONNECT", host);
  Serial.printf("[MQTT] TCP probe %s:%u ...\n", host, MQTT_PORT);
  if (!tcpReachable(host, MQTT_PORT, 3000)) {
    Serial.printf("[MQTT] TCP gagal ke %s (tidak reachable)\n", host);
    lcdShow("TCP GAGAL", host);
    return false;
  }

  mqtt.setServer(host, MQTT_PORT);
  Serial.printf("[MQTT] connect %s client=%s ...\n", host, mqttClientId);
  bool ok = mqtt.connect(mqttClientId, nullptr, nullptr, topicStatus, 0, true, lwtPayload);
  if (!ok) {
    Serial.printf("[MQTT] connect gagal rc=%d host=%s\n", mqtt.state(), host);
    char rcLine[17];
    snprintf(rcLine, sizeof(rcLine), "rc=%d", mqtt.state());
    lcdShow("MQTT GAGAL", rcLine);
    return false;
  }

  Serial.printf("[MQTT] connected host=%s mac=%s\n", host, macStr);
  lcdShow("MQTT OK", host);
  publishAll("network", "test_mqtt connected");
  publishAll("ok", "ESP-C6 test WiFi+MQTT sehat");
  return true;
}

bool ensureMqtt() {
  if (mqtt.connected()) return true;
  uint32_t now = millis();
  if (now - lastMqttTryMs < MQTT_RETRY_MS) return false;
  lastMqttTryMs = now;

  // Coba host bergiliran: 222 lalu 106
  for (uint8_t i = 0; i < MQTT_HOST_COUNT; i++) {
    uint8_t idx = (mqttHostIdx + i) % MQTT_HOST_COUNT;
    if (tryConnectOne(MQTT_HOSTS[idx])) {
      mqttHostIdx = idx;
      return true;
    }
  }
  mqttHostIdx = (mqttHostIdx + 1) % MQTT_HOST_COUNT;
  return false;
}

void setupWifi() {
  WiFi.mode(WIFI_STA);
  lcdShow("WIFI CONNECT", DEFAULT_WIFI_SSID);
  Serial.printf("[WiFi] connect SSID=%s\n", DEFAULT_WIFI_SSID);
  WiFi.begin(DEFAULT_WIFI_SSID, DEFAULT_WIFI_PASS);

  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - t0 > WIFI_TIMEOUT_MS) {
      Serial.println("[WiFi] timeout — reboot");
      lcdShow("WIFI GAGAL", "Reboot...");
      delay(2000);
      ESP.restart();
    }
    delay(300);
    Serial.print('.');
  }
  Serial.println();
  refreshMac();
  Serial.printf("[WiFi] OK ssid=%s ip=%s rssi=%d mac=%s\n",
                WiFi.SSID().c_str(),
                WiFi.localIP().toString().c_str(),
                WiFi.RSSI(), macStr);
  lcdShow("WIFI OK", WiFi.localIP().toString().c_str());
  delay(500);
  lcdShow("MAC ADDRESS", macStr);
  delay(900);
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println();
  Serial.println("=== test_mqtt JUKI018 / uid 018 ===");
  Serial.printf("WiFi %s | MQTT %s lalu fallback %s\n",
                DEFAULT_WIFI_SSID, MQTT_HOSTS[0], MQTT_HOSTS[1]);

  setupLcd();
  setupWifi();
  buildTopics();

  mqtt.setKeepAlive(60);
  mqtt.setSocketTimeout(8);
  mqtt.setBufferSize(768);

  ensureMqtt();
  lastPublishMs = millis();
  lastLcdMs = millis();
  updateLcd();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] putus — reconnect");
    lcdShow("WIFI PUTUS", "Reconnect...");
    WiFi.disconnect();
    WiFi.begin(DEFAULT_WIFI_SSID, DEFAULT_WIFI_PASS);
    uint32_t t0 = millis();
    while (WiFi.status() != WL_CONNECTED) {
      if (millis() - t0 > WIFI_TIMEOUT_MS) {
        lcdShow("WIFI GAGAL", "Reboot...");
        delay(2000);
        ESP.restart();
      }
      delay(300);
    }
    refreshMac();
    buildTopics();
    lcdShow("WIFI OK", WiFi.localIP().toString().c_str());
  }

  if (!mqtt.connected()) {
    ensureMqtt();
  } else {
    mqtt.loop();
  }

  uint32_t now = millis();
  if (mqtt.connected() && (now - lastPublishMs >= PUBLISH_MS)) {
    lastPublishMs = now;
    publishAll("ok", "ESP-C6 test WiFi+MQTT sehat");
  }

  if (now - lastLcdMs >= LCD_PAGE_MS) {
    lastLcdMs = now;
    lcdPage++;
    updateLcd();
  }
}

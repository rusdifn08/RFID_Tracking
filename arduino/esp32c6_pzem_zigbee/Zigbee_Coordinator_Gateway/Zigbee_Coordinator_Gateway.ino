/**
 * Zigbee_Coordinator_Gateway.ino
 * ESP32-C6 — Zigbee Coordinator + Wi-Fi + MQTT bridge + LCD I2C 16x2
 *
 * Tools (WAJIB):
 *   Board: ESP32C6 Dev Module
 *   Zigbee Mode: Zigbee ZCZR (coordinator/router)
 *   Partition Scheme: Custom (partitions.csv di folder ini)
 *   Core Debug Level: None
 *
 * LCD I2C clean (1 layar): WIFI:OK/X  MQTT:OK/X | NODES: n
 * Boot: WiFi + MQTT wajib OK dulu, baru start Zigbee.
 */

#ifndef ZIGBEE_MODE_ZCZR
#error "Tools → Zigbee Mode → Zigbee ZCZR"
#endif

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <time.h>
#include <stdlib.h>
#include <esp_wifi.h>
#if __has_include("esp_coexist.h")
#include "esp_coexist.h"
#endif
#include "Zigbee.h"
#include "zb_protocol.h"
#include "ZigbeeGistexEP.h"

static const char *WIFI_SSID = "Robot_Resource (Lokal)";
static const char *WIFI_PASS = "robot@9876";
static const char *MQTT_HOST = "10.5.0.106";
static const uint16_t MQTT_PORT = 1883;
static const char *TOPIC_PREFIX = "iot/gistex";
static const char *SENSOR_NAME = "pzem";
static const long GMT_OFFSET_SEC = 7 * 3600;
static const uint32_t MQTT_RETRY_MIN_MS = 3000;
static const uint32_t MQTT_RETRY_MAX_MS = 20000;
static const uint16_t MQTT_KEEPALIVE_SEC = 45;
static const uint16_t MQTT_SOCKET_TIMEOUT_SEC = 5;
static const uint8_t MAX_NODES = 16;
/** Node dihapus dari tabel setelah diam sangat lama. */
static const uint32_t NODE_OFFLINE_MS = 600000UL;  // 10 menit

#define I2C_SDA 20
#define I2C_SCL 19
#define LCD_ADDR 0x27
static const uint32_t LCD_MS = 400;
static const uint32_t WIFI_KICK_MS = 3000UL;       // retry WiFi tiap 3 dtk (bukan 60 dtk)
static const uint32_t WIFI_STUCK_MS = 20000UL;     // paksa disconnect jika pending > 20 dtk
static const uint32_t WIFI_HEALTH_MS = 30000UL;    // cek IP valid tiap 30 dtk
static const uint32_t MESH_PUB_MS = 3000UL;
static const uint32_t NODE_ONLINE_MS = 120000UL;  // node online jika TEL < 2 menit
static const uint32_t PERMIT_JOIN_REFRESH_MS = 45000UL;  // buka join tiap 45 dtk
static const uint32_t ZB_KEEPALIVE_MS = 10000UL;         // TIME ping ke Router (10 dtk)
static const int8_t ZB_TX_POWER_DBM = 20;               // max TX Zigbee ESP32-C6

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
ZigbeeGistexEP zbEp(ZB_EP, true);
LiquidCrystal_I2C lcd(LCD_ADDR, 16, 2);

struct NodeMap {
  bool used;
  char uid[8];
  char code[12];
  uint16_t short_addr;
  uint32_t last_seen_ms;
  uint32_t run_sec, loss_sec, off_sec;
  uint8_t op_status;
  bool pzem_ok;
  float current_a;
  float voltage_v;
};

NodeMap nodes[MAX_NODES];
uint8_t zbSeq = 0;
int lastWibYmd = -1;
bool ntpOk = false;
uint32_t lastMqttAttemptMs = 0;
uint32_t mqttRetryMs = MQTT_RETRY_MIN_MS;
uint8_t mqttFailStreak = 0;
char topicWildcardCmd[64];
char topicWildcardDevCmd[72];
char topicMesh[64];

char lastTelUid[8] = "";
uint32_t lastLcdMs = 0;
uint32_t lastMeshPubMs = 0;
uint32_t lastWifiBeginMs = 0;
uint32_t lastWifiKickMs = 0;
uint32_t lastWifiHealthMs = 0;
uint32_t lastWifiLogMs = 0;
uint32_t wifiLostSinceMs = 0;
uint32_t lastOpenNetMs = 0;
uint32_t lastZbKeepaliveMs = 0;
bool wifiBeginPending = false;
bool wifiLoggedOk = false;
bool bootLinkReady = false;
char mqttClientId[24] = "";

void mqttHardReset();

/** Inisialisasi WiFi STA sekali — auto-reconnect + TX kuat + no sleep. */
void initWifiSta() {
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.setAutoReconnect(true);
  esp_wifi_set_ps(WIFI_PS_NONE);
  WiFi.setTxPower(WIFI_POWER_19_5dBm);
#if __has_include("esp_coexist.h")
  esp_coex_preference_set(ESP_COEX_PREFER_BALANCE);
#endif
}

void onWiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
  switch (event) {
    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
      wifiLoggedOk = true;
      wifiBeginPending = false;
      wifiLostSinceMs = 0;
      Serial.printf("[WiFi] GOT_IP %s rssi=%d\n",
                    WiFi.localIP().toString().c_str(), WiFi.RSSI());
      break;
    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
      wifiLoggedOk = false;
      if (wifiLostSinceMs == 0) wifiLostSinceMs = millis();
      mqttHardReset();
      Serial.printf("[WiFi] DISCONNECTED reason=%d\n",
                    (int)info.wifi_sta_disconnected.reason);
      break;
    default:
      break;
  }
}

static bool wifiHasIp() {
  return WiFi.status() == WL_CONNECTED && WiFi.localIP() != IPAddress(0, 0, 0, 0);
}

static const char *linkAnimDots() {
  static const char *f[] = { ".  ", ".. ", "...", "   " };
  return f[(millis() / 350UL) % 4];
}

const char *wifiStatusStr(wl_status_t s) {
  switch (s) {
    case WL_IDLE_STATUS: return "IDLE";
    case WL_NO_SSID_AVAIL: return "NO_SSID";
    case WL_SCAN_COMPLETED: return "SCAN_DONE";
    case WL_CONNECTED: return "CONNECTED";
    case WL_CONNECT_FAILED: return "CONNECT_FAIL";
    case WL_CONNECTION_LOST: return "LOST";
    case WL_DISCONNECTED: return "DISCONNECTED";
    default: return "OTHER";
  }
}

void lcdPrint2(const char *l1, const char *l2) {
  lcd.setCursor(0, 0);
  lcd.print(l1);
  for (int i = (int)strlen(l1); i < 16; i++) lcd.print(' ');
  lcd.setCursor(0, 1);
  lcd.print(l2);
  for (int i = (int)strlen(l2); i < 16; i++) lcd.print(' ');
}

uint8_t countNodes() {
  uint8_t n = 0;
  for (int i = 0; i < MAX_NODES; i++) if (nodes[i].used) n++;
  return n;
}

uint8_t countNodesOnline() {
  uint32_t now = millis();
  uint8_t n = 0;
  for (int i = 0; i < MAX_NODES; i++) {
    if (!nodes[i].used) continue;
    if (now - nodes[i].last_seen_ms <= NODE_ONLINE_MS) n++;
  }
  return n;
}

/** Satu layar: WIFI/MQTT OK, animasi reconnect, atau X. */
void renderLcd() {
  char a[17], b[17];
  bool wifiOk = wifiHasIp();
  bool mqttOk = mqtt.connected();
  const char *anim = linkAnimDots();

  if (wifiOk && mqttOk) {
    snprintf(a, sizeof(a), "WIFI:OK MQTT:OK");
  } else if (wifiOk && !mqttOk) {
    snprintf(a, sizeof(a), "WIFI:OK MQTT%s", anim);
  } else if (wifiBeginPending || wifiLostSinceMs > 0) {
    snprintf(a, sizeof(a), "WIFI%s MQTT:X ", anim);
  } else {
    snprintf(a, sizeof(a), "WIFI:X MQTT:X ");
  }
  snprintf(b, sizeof(b), "NODES: %u", (unsigned)countNodes());
  lcdPrint2(a, b);
}
// ---------- mini JSON helpers (tanpa ArduinoJson) ----------
static bool jsonFindKey(const char *json, const char *key, const char **valStart) {
  if (!json || !key) return false;
  char pat[48];
  snprintf(pat, sizeof(pat), "\"%s\"", key);
  const char *p = strstr(json, pat);
  if (!p) return false;
  p = strchr(p + strlen(pat), ':');
  if (!p) return false;
  p++;
  while (*p == ' ' || *p == '\t') p++;
  *valStart = p;
  return true;
}

static bool jsonGetStr(const char *json, const char *key, char *out, size_t n) {
  const char *p;
  if (!jsonFindKey(json, key, &p) || *p != '"') return false;
  p++;
  size_t i = 0;
  while (*p && *p != '"' && i + 1 < n) {
    if (*p == '\\' && p[1]) p++;
    out[i++] = *p++;
  }
  out[i] = 0;
  return true;
}

static bool jsonGetFloat(const char *json, const char *key, float *out) {
  const char *p;
  if (!jsonFindKey(json, key, &p)) return false;
  *out = strtof(p, nullptr);
  return true;
}

static bool jsonGetU32(const char *json, const char *key, uint32_t *out) {
  const char *p;
  if (!jsonFindKey(json, key, &p)) return false;
  *out = (uint32_t)strtoul(p, nullptr, 10);
  return true;
}

static bool jsonGetBool(const char *json, const char *key, bool *out) {
  const char *p;
  if (!jsonFindKey(json, key, &p)) return false;
  if (!strncmp(p, "true", 4)) { *out = true; return true; }
  if (!strncmp(p, "false", 5)) { *out = false; return true; }
  if (*p == '1') { *out = true; return true; }
  if (*p == '0') { *out = false; return true; }
  return false;
}

void upsertNode(const char *uid, const char *code, uint16_t addr) {
  if (!uid || !uid[0]) return;
  for (int i = 0; i < MAX_NODES; i++) {
    if (nodes[i].used && strncmp(nodes[i].uid, uid, sizeof(nodes[i].uid)) == 0) {
      nodes[i].short_addr = addr;
      nodes[i].last_seen_ms = millis();
      if (code && code[0]) zb_str_copy(nodes[i].code, sizeof(nodes[i].code), code);
      return;
    }
  }
  for (int i = 0; i < MAX_NODES; i++) {
    if (!nodes[i].used) {
      memset(&nodes[i], 0, sizeof(nodes[i]));
      nodes[i].used = true;
      zb_str_copy(nodes[i].uid, sizeof(nodes[i].uid), uid);
      zb_str_copy(nodes[i].code, sizeof(nodes[i].code), code ? code : "");
      nodes[i].short_addr = addr;
      nodes[i].last_seen_ms = millis();
      Serial.printf("[ZB] node join uid=%s code=%s addr=0x%04X\n", uid, code ? code : "", addr);
      return;
    }
  }
  Serial.printf("[ZB] node table full — drop uid=%s\n", uid);
}

NodeMap *findByUid(const char *uid) {
  if (!uid) return nullptr;
  for (int i = 0; i < MAX_NODES; i++) {
    if (nodes[i].used && strncmp(nodes[i].uid, uid, sizeof(nodes[i].uid)) == 0) return &nodes[i];
  }
  return nullptr;
}

NodeMap *findByCode(const char *code) {
  if (!code) return nullptr;
  for (int i = 0; i < MAX_NODES; i++) {
    if (nodes[i].used && strncmp(nodes[i].code, code, sizeof(nodes[i].code)) == 0) return &nodes[i];
  }
  return nullptr;
}

void buildTopics(const char *code, char *tel, char *st, char *ack, size_t n) {
  snprintf(tel, n, "%s/%s/telemetry/%s", TOPIC_PREFIX, code, SENSOR_NAME);
  snprintf(st, n, "%s/%s/status/%s", TOPIC_PREFIX, code, SENSOR_NAME);
  snprintf(ack, n, "%s/%s/ack", TOPIC_PREFIX, code);
}

const char *opStr(uint8_t s) {
  if (s == 2) return "running";
  if (s == 1) return "idle";
  return "off";
}

void pubTelemetry(const ZbTelFrame *f) {
  if (!mqtt.connected() || !f) return;
  char tel[96], st[96], ack[96], buf[512];
  buildTopics(f->p.machine_code, tel, st, ack, sizeof(tel));
  uint32_t tot = f->p.run_sec + f->p.loss_sec + f->p.off_sec;
  float prod = tot ? (100.0f * f->p.run_sec / (float)tot) : 0.0f;
  int n = snprintf(buf, sizeof(buf),
    "{\"device_uid\":\"%s\",\"machine_code\":\"%s\",\"transport\":\"zigbee\",\"pzem_ok\":%s,\"sensor_ok\":%s,"
    "\"voltage_v\":%.1f,\"current_a\":%.3f,\"power_w\":%.1f,\"energy_kwh\":%.3f,"
    "\"frequency_hz\":%.1f,\"power_factor\":%.2f,\"op_status\":\"%s\","
    "\"run_sec\":%lu,\"loss_sec\":%lu,\"off_sec\":%lu,\"power_on_sec\":%lu,"
    "\"productivity_pct\":%.2f,\"current_threshold_a\":%.3f,\"power_threshold_w\":0,"
    "\"fail_count\":%u}",
    f->hdr.uid, f->p.machine_code,
    f->p.pzem_ok ? "true" : "false", f->p.pzem_ok ? "true" : "false",
    f->p.voltage_v, f->p.current_a, f->p.power_w, f->p.energy_kwh,
    f->p.frequency_hz, f->p.power_factor, opStr(f->p.op_status),
    (unsigned long)f->p.run_sec, (unsigned long)f->p.loss_sec, (unsigned long)f->p.off_sec,
    (unsigned long)(f->p.run_sec + f->p.loss_sec), prod, f->p.current_threshold_a,
    (unsigned)f->p.fail_count);
  if (n > 0) mqtt.publish(tel, (const uint8_t *)buf, (size_t)n, false);
}

void pubStatus(const ZbStatusFrame *f) {
  if (!mqtt.connected() || !f) return;
  char tel[96], st[96], ack[96], buf[420];
  buildTopics(f->p.machine_code, tel, st, ack, sizeof(tel));
  int n = snprintf(buf, sizeof(buf),
    "{\"device_uid\":\"%s\",\"machine_code\":\"%s\",\"transport\":\"zigbee\",\"sensor\":\"%s\",\"state\":\"%s\","
    "\"online\":%s,\"wifi_ok\":true,\"mqtt_ok\":true,\"sensor_ok\":%s,\"detail\":\"%s\","
    "\"rssi\":%u,\"uptime_sec\":%lu,\"run_sec\":%lu,\"loss_sec\":%lu,\"off_sec\":%lu,"
    "\"op_status\":\"%s\"}",
    f->hdr.uid, f->p.machine_code, SENSOR_NAME, f->p.state,
    f->p.online ? "true" : "false", f->p.sensor_ok ? "true" : "false", f->p.detail,
    (unsigned)f->p.lqi, (unsigned long)(millis() / 1000),
    (unsigned long)f->p.run_sec, (unsigned long)f->p.loss_sec, (unsigned long)f->p.off_sec,
    opStr(f->p.op_status));
  if (n > 0) mqtt.publish(st, (const uint8_t *)buf, (size_t)n, false);
}

void pubAck(const ZbAckFrame *f) {
  if (!mqtt.connected() || !f) return;
  char tel[96], st[96], ack[96], buf[256];
  buildTopics(f->p.machine_code, tel, st, ack, sizeof(tel));
  int n = snprintf(buf, sizeof(buf),
    "{\"device_uid\":\"%s\",\"command\":\"%s\",\"ok\":%s,\"current_threshold_a\":%.3f,"
    "\"power_threshold_w\":%.1f,\"run_sec\":%lu,\"loss_sec\":%lu,\"off_sec\":%lu}",
    f->hdr.uid, f->p.command, f->p.ok ? "true" : "false",
    f->p.current_threshold_a, f->p.power_threshold_w,
    (unsigned long)f->p.run_sec, (unsigned long)f->p.loss_sec, (unsigned long)f->p.off_sec);
  if (n > 0) mqtt.publish(ack, buf, (size_t)n);
}

void pubLwtOffline(const char *uid, const char *code) {
  if (!mqtt.connected() || !code || !code[0]) return;
  char tel[96], st[96], ack[96], buf[220];
  buildTopics(code, tel, st, ack, sizeof(tel));
  int n = snprintf(buf, sizeof(buf),
    "{\"device_uid\":\"%s\",\"machine_code\":\"%s\",\"transport\":\"zigbee\",\"sensor\":\"%s\",\"state\":\"mqtt_lost\","
    "\"online\":false,\"detail\":\"Zigbee node timeout\"}",
    uid ? uid : "", code, SENSOR_NAME);
  if (n > 0) mqtt.publish(st, (const uint8_t *)buf, (size_t)n, true);
}

void onZbRx(const uint8_t *data, uint16_t len, uint16_t src_short, uint8_t src_ep) {
  (void)src_ep;
  if (!data || len < sizeof(ZbHdr)) return;
  const ZbHdr *h = (const ZbHdr *)data;
  if (!zb_hdr_ok(h)) return;

  if (h->type == ZB_MSG_HELLO && len >= sizeof(ZbHelloFrame)) {
    const ZbHelloFrame *f = (const ZbHelloFrame *)data;
    const char *uid = f->p.device_uid[0] ? f->p.device_uid : f->hdr.uid;
    upsertNode(uid, f->p.machine_code, src_short);
    Serial.printf("[ZB] HELLO uid=%s code=%s from=0x%04X nodes=%u\n",
                  uid, f->p.machine_code, src_short, (unsigned)countNodes());
    return;
  }
  if (h->type == ZB_MSG_TEL && len >= sizeof(ZbTelFrame)) {
    const ZbTelFrame *f = (const ZbTelFrame *)data;
    upsertNode(f->hdr.uid, f->p.machine_code, src_short);
    NodeMap *n = findByUid(f->hdr.uid);
    if (n) {
      n->run_sec = f->p.run_sec;
      n->loss_sec = f->p.loss_sec;
      n->off_sec = f->p.off_sec;
      n->op_status = f->p.op_status;
      n->pzem_ok = f->p.pzem_ok;
      n->current_a = f->p.current_a;
      n->voltage_v = f->p.voltage_v;
    }
    zb_str_copy(lastTelUid, sizeof(lastTelUid), f->hdr.uid);
    pubTelemetry(f);
    return;
  }
  if (h->type == ZB_MSG_STATUS && len >= sizeof(ZbStatusFrame)) {
    const ZbStatusFrame *f = (const ZbStatusFrame *)data;
    upsertNode(f->hdr.uid, f->p.machine_code, src_short);
    NodeMap *n = findByUid(f->hdr.uid);
    if (n) {
      n->op_status = f->p.op_status;
      n->run_sec = f->p.run_sec;
      n->loss_sec = f->p.loss_sec;
      n->off_sec = f->p.off_sec;
      n->last_seen_ms = millis();
    }
    pubStatus(f);
    return;
  }
  if (h->type == ZB_MSG_ACK && len >= sizeof(ZbAckFrame)) {
    pubAck((const ZbAckFrame *)data);
  }
}

bool sendCmdToNode(NodeMap *n, ZbCmdPayload *p) {
  if (!n || !p) return false;
  ZbCmdFrame fr;
  memset(&fr, 0, sizeof(fr));
  zb_hdr_fill(&fr.hdr, ZB_MSG_CMD, ++zbSeq, n->uid, sizeof(ZbCmdPayload));
  fr.p = *p;
  zb_str_copy(fr.p.device_uid, sizeof(fr.p.device_uid), n->uid);
  return zbEp.sendToRouter(n->short_addr, (const uint8_t *)&fr, sizeof(fr));
}

ZbCmdId mapCommandName(const char *cmd) {
  if (!cmd) return ZB_CMD_NOP;
  if (!strcmp(cmd, "set_identity")) return ZB_CMD_SET_IDENTITY;
  if (!strcmp(cmd, "set_calibration")) return ZB_CMD_SET_CALIBRATION;
  if (!strcmp(cmd, "set_display")) return ZB_CMD_SET_DISPLAY;
  if (!strcmp(cmd, "sync_kpi")) return ZB_CMD_SYNC_KPI;
  if (!strcmp(cmd, "reset_day")) return ZB_CMD_RESET_DAY;
  if (!strcmp(cmd, "ping")) return ZB_CMD_PING;
  if (!strcmp(cmd, "lcd_page")) return ZB_CMD_LCD_PAGE;
  if (!strcmp(cmd, "get_config")) return ZB_CMD_GET_CONFIG;
  if (!strcmp(cmd, "login_success")) return ZB_CMD_LOGIN_SUCCESS;
  if (!strcmp(cmd, "data_saved")) return ZB_CMD_DATA_SAVED;
  if (!strcmp(cmd, "set_login_system")) return ZB_CMD_SET_LOGIN_SYSTEM;
  if (!strcmp(cmd, "login_status")) return ZB_CMD_LOGIN_STATUS;
  if (!strcmp(cmd, "reboot")) return ZB_CMD_REBOOT;
  return ZB_CMD_NOP;
}

void fillCmdFromJson(ZbCmdPayload *p, const char *json, ZbCmdId id) {
  memset(p, 0, sizeof(*p));
  p->cmd = (uint8_t)id;
  jsonGetStr(json, "machine_code", p->machine_code, sizeof(p->machine_code));
  jsonGetStr(json, "device_uid", p->device_uid, sizeof(p->device_uid));
  jsonGetStr(json, "machine_name", p->machine_name, sizeof(p->machine_name));
  jsonGetStr(json, "process_name", p->process_name, sizeof(p->process_name));
  jsonGetStr(json, "operator_name", p->operator_name, sizeof(p->operator_name));
  if (!jsonGetStr(json, "lcd_message", p->message, sizeof(p->message))) {
    jsonGetStr(json, "message", p->message, sizeof(p->message));
  }
  jsonGetFloat(json, "current_threshold_a", &p->current_threshold_a);
  jsonGetFloat(json, "off_current_a", &p->off_current_a);
  jsonGetFloat(json, "power_threshold_w", &p->power_threshold_w);
  jsonGetFloat(json, "voltage_on_v", &p->voltage_on_v);
  jsonGetU32(json, "filter_aktif_ms", &p->filter_aktif_ms);
  jsonGetU32(json, "filter_diam_ms", &p->filter_diam_ms);
  jsonGetU32(json, "lcd_auto_ms", &p->lcd_auto_ms);
  jsonGetU32(json, "run_sec", &p->run_sec);
  jsonGetU32(json, "loss_sec", &p->loss_sec);
  jsonGetU32(json, "off_sec", &p->off_sec);

  bool login_req = false, logged_in = false;
  jsonGetBool(json, "login_required", &login_req);
  if (!login_req) jsonGetBool(json, "enabled", &login_req);
  jsonGetBool(json, "logged_in", &logged_in);
  char src[16] = "";
  jsonGetStr(json, "source", src, sizeof(src));
  bool kpi_be = (!strcmp(src, "backend") || !strcmp(src, "telemetry"));
  if (login_req) p->flags |= 0x01;
  if (logged_in) p->flags |= 0x02;
  if (kpi_be) p->flags |= 0x04;
}

void onMqttMessage(char *topic, byte *payload, unsigned int length) {
  char json[768];
  if (length >= sizeof(json)) length = sizeof(json) - 1;
  memcpy(json, payload, length);
  json[length] = 0;

  char cmd[32] = "";
  if (!jsonGetStr(json, "command", cmd, sizeof(cmd)) || !cmd[0]) return;
  if (!strcmp(cmd, "set_network") || !strcmp(cmd, "wifi_scan")) return;

  ZbCmdId id = mapCommandName(cmd);
  if (id == ZB_CMD_NOP) return;

  ZbCmdPayload p;
  fillCmdFromJson(&p, json, id);

  NodeMap *n = nullptr;
  if (p.device_uid[0]) n = findByUid(p.device_uid);
  if (!n && p.machine_code[0]) n = findByCode(p.machine_code);
  if (!n && topic) {
    const char *p1 = strstr(topic, "/dev/");
    if (p1) {
      p1 += 5;
      char uid[8];
      memset(uid, 0, sizeof(uid));
      for (int i = 0; i < 7 && p1[i] && p1[i] != '/'; i++) uid[i] = p1[i];
      n = findByUid(uid);
    }
  }
  if (!n) return;
  sendCmdToNode(n, &p);
}

/** Publish snapshot mesh ke MQTT — dashboard ikut data Coordinator. */
void pubMeshSnapshot() {
  if (!mqtt.connected()) return;
  uint32_t now = millis();
  uint8_t total = countNodes();
  uint8_t online = countNodesOnline();
  bool wifiOk = wifiHasIp();

  char buf[900];
  int pos = snprintf(buf, sizeof(buf),
    "{\"transport\":\"zigbee\",\"wifi_ok\":%s,\"mqtt_ok\":true,"
    "\"nodes_total\":%u,\"nodes_online\":%u,\"nodes\":[",
    wifiOk ? "true" : "false", (unsigned)total, (unsigned)online);

  bool first = true;
  for (int i = 0; i < MAX_NODES; i++) {
    if (!nodes[i].used) continue;
    uint32_t age = (now - nodes[i].last_seen_ms) / 1000UL;
    bool nodeOnline = (now - nodes[i].last_seen_ms) <= NODE_ONLINE_MS;
    if (!first && pos < (int)sizeof(buf) - 4) {
      buf[pos++] = ',';
      buf[pos] = 0;
    }
    first = false;
    int n = snprintf(buf + pos, sizeof(buf) - (size_t)pos,
      "{\"device_uid\":\"%s\",\"machine_code\":\"%s\",\"online\":%s,"
      "\"op_status\":\"%s\",\"voltage_v\":%.1f,\"current_a\":%.3f,"
      "\"power_w\":%.1f,\"lqi\":0,\"age_sec\":%lu}",
      nodes[i].uid, nodes[i].code, nodeOnline ? "true" : "false",
      opStr(nodes[i].op_status), nodes[i].voltage_v, nodes[i].current_a,
      nodes[i].current_a * nodes[i].voltage_v, (unsigned long)age);
    if (n > 0) pos += n;
    if (pos >= (int)sizeof(buf) - 80) break;
  }
  if (pos < (int)sizeof(buf) - 2) {
    snprintf(buf + pos, sizeof(buf) - (size_t)pos, "]}");
  }
  mqtt.publish(topicMesh, (const uint8_t *)buf, strlen(buf), false);
}

/** Bersihkan socket MQTT yang macet. */
void mqttHardReset() {
  mqtt.disconnect();
  wifiClient.stop();
  delay(20);
}

/** WiFi reconnect agresif — retry tiap 3 dtk, tidak stuck 60 dtk. */
void ensureWifi() {
  uint32_t now = millis();

  if (wifiHasIp()) {
    if (!wifiLoggedOk) {
      wifiLoggedOk = true;
      wifiBeginPending = false;
      wifiLostSinceMs = 0;
      Serial.printf("[WiFi] OK ip=%s rssi=%d\n",
                    WiFi.localIP().toString().c_str(), WiFi.RSSI());
    }
    return;
  }

  wifiLoggedOk = false;
  if (wifiLostSinceMs == 0) wifiLostSinceMs = now;

  // Cek IP kosong walau status CONNECTED → kick
  if (WiFi.status() == WL_CONNECTED && WiFi.localIP() == IPAddress(0, 0, 0, 0)) {
    Serial.println(F("[WiFi] CONNECTED tapi IP 0.0.0.0 — kick"));
    mqttHardReset();
    WiFi.disconnect(false, false);
    delay(80);
    wifiBeginPending = false;
  }

  if (wifiBeginPending && (now - lastWifiBeginMs) < WIFI_KICK_MS) {
    return;  // tunggu 3 dtk, bukan 60 dtk
  }

  bool stuck = wifiBeginPending && (now - lastWifiBeginMs) >= WIFI_STUCK_MS;
  wl_status_t st = WiFi.status();
  // Saat STA masih connecting (sering terbaca IDLE), jangan ubah config / begin ulang.
  if (wifiBeginPending && st == WL_IDLE_STATUS && !stuck) {
    return;
  }
  if (st == WL_CONNECT_FAILED || st == WL_NO_SSID_AVAIL || stuck) {
    Serial.printf("[WiFi] hard kick status=%s stuck=%d\n", wifiStatusStr(st), stuck ? 1 : 0);
    mqttHardReset();
    WiFi.disconnect(false, false);
    delay(120);
    wifiBeginPending = false;
  }

  if ((now - lastWifiKickMs) < WIFI_KICK_MS && wifiBeginPending) {
    return;
  }

  Serial.printf("[WiFi] reconnect SSID=\"%s\" status=%s\n", WIFI_SSID, wifiStatusStr(st));
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  lastWifiBeginMs = now;
  lastWifiKickMs = now;
  wifiBeginPending = true;
}

/** Cek kesehatan WiFi berkala — putus diam-diam. */
void wifiHealthCheck() {
  uint32_t now = millis();
  if (now - lastWifiHealthMs < WIFI_HEALTH_MS) return;
  lastWifiHealthMs = now;

  if (!wifiHasIp()) return;

  int rssi = WiFi.RSSI();
  if (rssi < -90) {
    Serial.printf("[WiFi] RSSI lemah %d — tetap monitor\n", rssi);
  }
}

/** Boot: blok sampai WiFi OK (LCD clean update). */
bool waitWifiBoot() {
  Serial.printf("[WiFi] boot connect SSID=\"%s\" (wajib OK)\n", WIFI_SSID);
  wifiBeginPending = false;
  wifiLoggedOk = false;
  wifiLostSinceMs = 0;
  initWifiSta();
  uint32_t t0 = millis();
  while (!wifiHasIp()) {
    ensureWifi();
    renderLcd();
    delay(200);
    if ((millis() - t0) > 120000UL) {
      Serial.println("[WiFi] boot still failing — hard kick");
      wifiBeginPending = false;
      WiFi.disconnect(true, false);
      delay(500);
      t0 = millis();
    }
  }
  Serial.printf("[WiFi] boot OK ip=%s\n", WiFi.localIP().toString().c_str());
  renderLcd();
  return true;
}

/** Boot: blok sampai MQTT OK (setelah WiFi). */
bool waitMqttBoot() {
  Serial.printf("[MQTT] boot connect %s:%u (wajib OK)\n", MQTT_HOST, MQTT_PORT);
  mqttRetryMs = MQTT_RETRY_MIN_MS;
  mqttFailStreak = 0;
  lastMqttAttemptMs = 0;
  uint32_t t0 = millis();
  while (!mqtt.connected()) {
    if (!wifiHasIp()) {
      ensureWifi();
    } else {
      ensureMqtt();
    }
    renderLcd();
    delay(200);
    if ((millis() - t0) > 90000UL) {
      Serial.println("[MQTT] boot still failing — reset socket + WiFi kick");
      mqttHardReset();
      mqttRetryMs = MQTT_RETRY_MIN_MS;
      lastMqttAttemptMs = 0;
      wifiBeginPending = false;
      wifiLoggedOk = false;
      WiFi.disconnect(false, false);
      delay(300);
      t0 = millis();
    }
  }
  Serial.println("[MQTT] boot OK");
  renderLcd();
  return true;
}

void ensureMqtt() {
  if (mqtt.connected()) {
    mqttFailStreak = 0;
    mqttRetryMs = MQTT_RETRY_MIN_MS;
    return;
  }
  if (!wifiHasIp()) return;
  uint32_t now = millis();
  if (now - lastMqttAttemptMs < mqttRetryMs) return;
  lastMqttAttemptMs = now;

  mqtt.setSocketTimeout(MQTT_SOCKET_TIMEOUT_SEC);
  mqtt.setKeepAlive(MQTT_KEEPALIVE_SEC);

  if (!mqttClientId[0]) {
    snprintf(mqttClientId, sizeof(mqttClientId), "zb-gw-%04X",
             (uint16_t)(ESP.getEfuseMac() & 0xFFFF));
  }

  if (!mqtt.connected()) {
    mqttHardReset();
  }

  Serial.printf("[MQTT] reconnect host=%s:%u client=%s\n", MQTT_HOST, MQTT_PORT, mqttClientId);

  if (mqtt.connect(mqttClientId)) {
    mqttFailStreak = 0;
    mqttRetryMs = MQTT_RETRY_MIN_MS;
    mqtt.subscribe(topicWildcardCmd);
    mqtt.subscribe(topicWildcardDevCmd);
    Serial.println("[MQTT] OK");
    return;
  }

  mqttFailStreak++;
  if (mqttRetryMs < MQTT_RETRY_MAX_MS) {
    uint32_t next = mqttRetryMs + 2000;
    mqttRetryMs = next > MQTT_RETRY_MAX_MS ? MQTT_RETRY_MAX_MS : next;
  }
  Serial.printf("[MQTT] FAIL state=%d streak=%u\n", mqtt.state(), (unsigned)mqttFailStreak);
}

/** Prioritas: WiFi dulu, lalu MQTT. Keduanya dipanggil tiap loop. */
void ensureLinks() {
  ensureWifi();
  wifiHealthCheck();
  if (wifiHasIp()) {
    ensureMqtt();
    mqtt.loop();  // jaga socket hidup walau belum fully connected
  }
}

void checkMidnightBroadcast() {
  if (!ntpOk) return;
  time_t now = time(nullptr);
  struct tm ti;
  localtime_r(&now, &ti);
  int ymd = (ti.tm_year + 1900) * 10000 + (ti.tm_mon + 1) * 100 + ti.tm_mday;
  if (lastWibYmd < 0) { lastWibYmd = ymd; return; }
  if (ymd == lastWibYmd) return;
  lastWibYmd = ymd;

  ZbTimeFrame fr;
  memset(&fr, 0, sizeof(fr));
  zb_hdr_fill(&fr.hdr, ZB_MSG_TIME, ++zbSeq, "*", sizeof(ZbTimePayload));
  fr.p.ymd = ymd;
  fr.p.midnight = 1;
  fr.p.epoch_wib = (int32_t)now;
  zbEp.broadcast((const uint8_t *)&fr, sizeof(fr));
}

/** Keep-alive TIME (bukan midnight) — Router tahu Coordinator hidup & rejoin setelah flash. */
void broadcastZbKeepalive() {
  ZbTimeFrame fr;
  memset(&fr, 0, sizeof(fr));
  zb_hdr_fill(&fr.hdr, ZB_MSG_TIME, ++zbSeq, "*", sizeof(ZbTimePayload));
  if (ntpOk) {
    time_t now = time(nullptr);
    struct tm ti;
    localtime_r(&now, &ti);
    fr.p.ymd = (ti.tm_year + 1900) * 10000 + (ti.tm_mon + 1) * 100 + ti.tm_mday;
    fr.p.epoch_wib = (int32_t)now;
  } else {
    fr.p.ymd = lastWibYmd > 0 ? lastWibYmd : 0;
    fr.p.epoch_wib = 0;
  }
  fr.p.midnight = 0;
  zbEp.broadcast((const uint8_t *)&fr, sizeof(fr));
}

/** Channel mask lebar sebelum begin (TX power set setelah begin). */
void zbBoostRadio() {
  Zigbee.setPrimaryChannelMask(ESP_ZB_TRANSCEIVER_ALL_CHANNELS_MASK);
  Serial.println(F("[ZB] primary channel mask = ALL"));
}

void checkNodeTimeouts() {
  uint32_t now = millis();
  for (int i = 0; i < MAX_NODES; i++) {
    if (!nodes[i].used) continue;
    if (now - nodes[i].last_seen_ms > NODE_OFFLINE_MS) {
      Serial.printf("[ZB] node timeout uid=%s\n", nodes[i].uid);
      pubLwtOffline(nodes[i].uid, nodes[i].code);
      nodes[i].used = false;
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(400);
  Serial.println();
  Serial.println(F("=== Gistex Zigbee Coordinator Gateway ==="));

  memset(nodes, 0, sizeof(nodes));
  snprintf(topicWildcardCmd, sizeof(topicWildcardCmd), "%s/+/cmd", TOPIC_PREFIX);
  snprintf(topicWildcardDevCmd, sizeof(topicWildcardDevCmd), "%s/dev/+/cmd", TOPIC_PREFIX);
  snprintf(topicMesh, sizeof(topicMesh), "%s/coordinator/mesh", TOPIC_PREFIX);

  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();
  lcdPrint2("COORDINATOR", "boot link...");
  delay(600);

  initWifiSta();
  WiFi.onEvent(onWiFiEvent);

  // 1) WiFi wajib OK dulu
  Serial.println(F("[BOOT] step1 WiFi (wajib)"));
  waitWifiBoot();

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
  mqtt.setBufferSize(1024);
  mqtt.setKeepAlive(MQTT_KEEPALIVE_SEC);
  mqtt.setSocketTimeout(MQTT_SOCKET_TIMEOUT_SEC);
  snprintf(mqttClientId, sizeof(mqttClientId), "zb-gw-%04X",
           (uint16_t)(ESP.getEfuseMac() & 0xFFFF));

  configTime(GMT_OFFSET_SEC, 0, "pool.ntp.org");
  for (int i = 0; i < 20 && time(nullptr) < 1700000000; i++) delay(200);
  ntpOk = time(nullptr) > 1700000000;
  Serial.printf("[NTP] %s\n", ntpOk ? "OK" : "pending");

  // 2) Zigbee Coordinator SEBELUM tunggu MQTT — Router bisa join walau MQTT macet
  Serial.println(F("[BOOT] step2 Zigbee (prioritas join Router)"));
  zbBoostRadio();
  zbEp.setManufacturerAndModel("Gistex", "PZEM-ZB-GW");
  zbEp.allowMultipleBinding(true);
  zbEp.onGistexRx(onZbRx);
  Zigbee.addEndpoint(&zbEp);
  Zigbee.setRebootOpenNetwork(254);

  if (!Zigbee.begin(ZIGBEE_COORDINATOR)) {
    Serial.println(F("[ZB] begin FAIL — reboot"));
    lcdPrint2("Zigbee FAIL", "reboot...");
    delay(1000);
    ESP.restart();
  }
  esp_zb_set_tx_power(ZB_TX_POWER_DBM);
  Zigbee.openNetwork(254);
  lastOpenNetMs = millis();
  lastZbKeepaliveMs = millis();
  for (int i = 0; i < 5; i++) {
    broadcastZbKeepalive();
    delay(80);
  }
  Serial.println(F("[ZB] OK network open (permit join 254s)"));
  renderLcd();

  // 3) MQTT — coba 30 dtk, tidak blok Router join selamanya
  Serial.println(F("[BOOT] step3 MQTT (non-block 30s)"));
  mqttRetryMs = MQTT_RETRY_MIN_MS;
  mqttFailStreak = 0;
  lastMqttAttemptMs = 0;
  uint32_t mqttT0 = millis();
  while (!mqtt.connected() && (millis() - mqttT0) < 30000UL) {
    ensureMqtt();
    renderLcd();
    delay(200);
  }
  bootLinkReady = mqtt.connected();
  if (!bootLinkReady) {
    Serial.println(F("[MQTT] boot pending — Zigbee sudah jalan, MQTT reconnect di loop"));
  } else {
    Serial.println(F("[MQTT] boot OK"));
  }

  // ponytail: jangan blok di sini — biarkan loop yang reconnect MQTT/WiFi
  if (!wifiHasIp()) {
    Serial.println(F("[WiFi] re-check setelah Zigbee begin"));
    wifiBeginPending = false;
    initWifiSta();
    ensureWifi();
  }

  lastMeshPubMs = millis();
  pubMeshSnapshot();
  lastLcdMs = millis();
  renderLcd();
  Serial.println(F("[BOOT] ready — WIFI+MQTT+Zigbee"));
}

void loop() {
  uint32_t now = millis();

  // WiFi + MQTT reconnect selalu jalan (tidak stuck)
  ensureLinks();

  if (wifiHasIp() && mqtt.connected()) {
    mqtt.loop();
    checkMidnightBroadcast();
    if (now - lastMeshPubMs >= MESH_PUB_MS) {
      lastMeshPubMs = now;
      pubMeshSnapshot();
    }
  }

  // Keep-alive Zigbee — tetap jalan walau WiFi/MQTT down
  if (now - lastZbKeepaliveMs >= ZB_KEEPALIVE_MS) {
    lastZbKeepaliveMs = now;
    broadcastZbKeepalive();
  }

  checkNodeTimeouts();

  // Permit-join sering: Router flash ulang / factoryReset harus bisa masuk
  if (now - lastOpenNetMs >= PERMIT_JOIN_REFRESH_MS) {
    lastOpenNetMs = now;
    Zigbee.openNetwork(254);
    Serial.println(F("[ZB] re-open permit join"));
  }

  if (now - lastLcdMs >= LCD_MS) {
    lastLcdMs = now;
    renderLcd();
  }
}

/**
 * ESP32-C6 SuperMini + PZEM-004T v4 + LCD I2C 16x2
 * MQTT broker robotic: 10.5.2.222:1883 (lokal Tracked → MQTT_HOST_LOCAL)
 *
 * Continuity KPI (selaras LCD <-> backend <-> dashboard):
 *   - kpi_source=esp: counter ESP = sumber → dashboard & LCD sama
 *   - kpi_source=telemetry: dashboard dari DB → MQTT sync_kpi ke LCD
 *   - set_calibration / set_display dari backend (NVS di ESP)
 *   - Reset dashboard -> MQTT reset_day -> ESP nol -> LCD & dashboard 0
 *   - Deep sleep: OFF ≥ 2 jam → wajib MQTT dulu (reboot 1× jika belum connect),
 *     kirim deep_sleep_enter, sleep 20 mnt; bangun → WiFi+MQTT → kirim OFF →
 *     tunggu 5 mnt; masih OFF → sleep lagi; ON → deep_sleep_exit
 *   - Counter Run/Loss/Off tetap jalan + NVS saat WiFi putus; MQTT sync saat nyambung
 *   - LCD saat reconnect: 2 slide (Reconnect Wifi · Runn/Loss)
 *
 * Topics (sama protokol backend-rust):
 *   iot/gistex/{CODE}/telemetry/pzem
 *   iot/gistex/{CODE}/status/pzem
 *   iot/gistex/{CODE}/cmd | ack
 *   iot/gistex/dev/{UID}/cmd          — channel stabil (code bisa berubah dinamis)
 *   cmd: set_identity | set_network | set_calibration | set_display | sync_kpi
 *        | set_login_system | data_saved
 * System Login ON → wajib login harian; OFF → KPI langsung jalan
 * LCD: boot → UID besar 2 digit (00) → MAC ADDRESS → baru WiFi
 * LCD: jika belum login → 2 slide: (1) OPERATOR BELUM/MELAKUKAN LOGIN (2) nama mesin + UID
 * LCD slides setelah login (auto 4 dtk):
 *   1 Loss/Runn · 2 Brand+Proses + kode · 3 OFF/IDLE · 4 Voltage/Current
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
 #include <esp_wifi.h>
 #include <esp_idf_version.h>
 #include <esp_sleep.h>
 
 // ===================== CONFIG (default flash; bisa diubah dashboard → NVS) =====================
static const char *DEFAULT_WIFI_SSID = "Tracked (9)";
static const char *DEFAULT_WIFI_PASS = "Factory@RFID";
static const char *MQTT_HOST_ROBOTIC = "10.5.2.222";   // Broker robotic (Tracked)
static const uint16_t MQTT_PORT_ROBOTIC = 1883;

/** Cadangan: hanya dipakai setelah primary gagal ≥ 30 menit */
static const char *DEFAULT_WIFI_SSID_FALLBACK = "GM3_DuckDown";
static const char *DEFAULT_WIFI_PASS_FALLBACK = "Factory@Maja";
static const char *MQTT_HOST_LOCAL = "10.5.0.106";      // Broker saat WiFi cadangan / lokal
static const uint16_t MQTT_PORT_LOCAL = 1883;

// Default awal MQTT (dinamis disesuaikan SSID)
static const char *DEFAULT_MQTT_HOST = MQTT_HOST_ROBOTIC;
static const uint16_t MQTT_PORT = 1883;
// WiFi boot awal timeout
static const uint32_t BOOT_WIFI_TIMEOUT_MS = 12000;  // 12 detik
 static const char *DEFAULT_MACHINE_CODE = "JUKI011";
 static const char *DEFAULT_DEVICE_UID = "011";
 /** true = wajib login operator; false = KPI jalan tanpa login (default firmware) */
 static const bool DEFAULT_LOGIN_REQUIRED = false;
 /** Bump saat ganti DEFAULT_LOGIN_REQUIRED agar NVS sysOn ikut reset */
 static const uint8_t LOGIN_DEFAULT_REV = 2;
 static const char *TOPIC_PREFIX = "iot/gistex";
 static const char *SENSOR_NAME = "pzem";
 
 // Runtime identity (dinamis dari MQTT / NVS)
 char wifiSsid[48];
 char wifiPass[48];
 char mqttHost[48];
 char machineCode[24];
 char deviceUid[24];
 char mqttClientId[40];
 bool wifiCredsDirty = false;  // reconnect WiFi setelah set_network
 bool mqttNeedsReconnect = false;
 
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
 static const uint32_t WIFI_RETRY_MS = 8000;              // retry SSID yang sama
 static const uint32_t WIFI_PRIMARY_ONLY_MS = 30UL * 60UL * 1000UL;  // 30 mnt baru ke cadangan
 static const uint32_t WIFI_FALLBACK_RETRY_MS = 10UL * 60UL * 1000UL; // 10 mnt di cadangan lalu balik primary
 /** Watchdog sinyal lemah: roam ke BSSID lebih kuat (anti putus di area noise) */
 static const int8_t WIFI_RSSI_ROAM_DBM = -85;           // lebih ketat: jangan roam terlalu sering
 static const int8_t WIFI_RSSI_ROAM_IMPROVE_DB = 8;      // hanya roam jika ≥8 dB lebih kuat
 static const uint8_t WIFI_RSSI_BAD_HITS = 5;            // butuh lebih banyak sampel jelek
 static const uint32_t WIFI_RSSI_CHECK_MS = 15000;
 static const uint32_t MQTT_RETRY_MS = 5000;       // jeda awal reconnect (jangan spam)
 static const uint32_t MQTT_RETRY_MAX_MS = 120000; // max backoff 2 mnt
 static const uint16_t MQTT_KEEPALIVE_SEC = 60;    // 60s: lebih tahan WiFi noise / scan singkat
 static const uint16_t MQTT_SOCKET_TIMEOUT_SEC = 15;
 /** Setelah MQTT nyambung, tahan roam WiFi agar tidak putus-nyambung */
 static const uint32_t MQTT_STABLE_BEFORE_ROAM_MS = 5UL * 60UL * 1000UL;
 static const uint32_t WIFI_ROAM_COOLDOWN_MS = 5UL * 60UL * 1000UL;
 static const uint32_t BTN_DEBOUNCE_MS = 40;
 static const uint32_t BTN_LONG_MS = 2000;
 static const uint32_t NVS_SAVE_MS = 10000;  // simpan flash max tiap 10 dtk (hemat wear)
 static const uint32_t RECOVERY_REBOOT_MS = 10 * 60 * 1000UL; // 10 menit gagal konek total -> reboot self-heal
 /** Mesin OFF terus selama ini → deep sleep (wajib MQTT dulu) */
 static const uint32_t OFF_BEFORE_SLEEP_MS = 2UL * 60UL * 60UL * 1000UL;  // 2 jam
 /** Timer wake */
 static const uint64_t DEEP_SLEEP_US = 20ULL * 60ULL * 1000000ULL;  // 20 menit
 static const uint32_t SLEEP_CHUNK_SEC = 20UL * 60UL;
 /** Setelah bangun + MQTT: pantau mesin ON selama ini sebelum sleep lagi */
 static const uint32_t DS_WAKE_WATCH_MS = 5UL * 60UL * 1000UL;  // 5 menit
 
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
 char topicDevCmd[96];  // iot/gistex/dev/{UID}/cmd
 char topicAck[96];
 char topicHistory[96];       // iot/gistex/{CODE}/history
 char topicHistoryDaily[96];  // iot/gistex/{CODE}/history/daily
 char willPayload[220];

// ===== 7-Day (1 Minggu) History Memory di NVS =====
struct DailyHistoryEntry {
  int ymd;             // YYYYMMDD (contoh: 20260821)
  uint32_t runSec;     // RUNNING detik
  uint32_t lossSec;    // LOSS / IDLE detik
  uint32_t offSec;     // OFF detik
  uint32_t powerOnSec; // runSec + lossSec
  float prodPct;       // (runSec / powerOnSec) * 100%
  uint32_t savedAt;    // Unix timestamp snapshot 00:00
};

static const uint8_t MAX_HISTORY_DAYS = 7;
DailyHistoryEntry dailyHistory[MAX_HISTORY_DAYS];
uint8_t dailyHistoryCount = 0;
 
 enum OpStatus : uint8_t { ST_OFF = 0, ST_IDLE = 1, ST_RUNNING = 2 };
 enum LcdPage : uint8_t {
   PAGE_RUNLOSS = 0,   // Slide 1: Loss / Runn
   PAGE_IDENTITY = 1,  // Slide 2: Brand+Proses (scroll) / kode mesin tengah
   PAGE_OFFIDLE = 2,   // Slide 3: OFF / IDLE
   PAGE_VI = 3,        // Slide 4: Voltage / Current
   PAGE_COUNT = 4
 };
 
 OpStatus opStatus = ST_OFF;
 OpStatus pendStatus = ST_OFF;
 uint32_t pendSinceMs = 0;
 LcdPage lcdPage = PAGE_RUNLOSS;
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
 enum WifiPhase : uint8_t { WP_PRIMARY = 0, WP_FALLBACK = 1 };
 WifiPhase wifiPhase = WP_PRIMARY;
 uint32_t wifiTryStartMs = 0;
 uint32_t wifiDownSinceMs = 0;  // mulai putus terus (untuk timer 30 mnt)
 bool wifiAllFailed = false;
 uint32_t lastRssiCheckMs = 0;
 uint8_t wifiRssiBadHits = 0;
 uint32_t lastMqttAttemptMs = 0;
 uint32_t mqttConnectedAtMs = 0;   // kapan MQTT terakhir sukses connect
 uint32_t lastWifiRoamMs = 0;
 bool mqttEverConnected = false;   // false = boot pertama (clean session)
 uint32_t offlineSinceMs = 0;
 uint32_t offSinceMs = 0;  // millis saat mulai OFF terus (untuk deep sleep)
 bool dsPendingExit = false;  // bangun sleep + mesin ON → publish exit setelah MQTT
 bool dsWakeWatch = false;    // bangun sleep, tunggu 5 mnt dengan WiFi/MQTT
 uint32_t dsWatchStartMs = 0; // 0 = belum mulai (tunggu MQTT)
 
 bool btnPagePrev = true;
 bool btnResetPrev = true;
 uint32_t btnPageDownMs = 0;
 uint32_t btnResetDownMs = 0;
 
 void publishTelemetry();
 void saveCounters(bool force);
 void wifiResetCycle();
 void wifiBeginCurrent();
 void loadCalibration();
 void saveCalibration();
 void loadLoginState();
 void enterDeepSleep(const char *reason, bool firstEnter);
 void handleDeepSleepWake();
 void publishDeepSleepEvent(const char *state, uint32_t fromEpoch, uint32_t toEpoch);
 void tryPublishDeepSleepExit();
 void serviceDeepSleepLogic();
 bool tryEnterDeepSleepWithMqtt(const char *reason, bool firstEnter);
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
 void updateMqttHostForSsid(const char *ssid);
 
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
   strncpy(wifiSsid, DEFAULT_WIFI_SSID, sizeof(wifiSsid) - 1);
   strncpy(wifiPass, DEFAULT_WIFI_PASS, sizeof(wifiPass) - 1);
   strncpy(mqttHost, DEFAULT_MQTT_HOST, sizeof(mqttHost) - 1);
   strncpy(machineCode, DEFAULT_MACHINE_CODE, sizeof(machineCode) - 1);
   strncpy(deviceUid, DEFAULT_DEVICE_UID, sizeof(deviceUid) - 1);
   wifiSsid[sizeof(wifiSsid) - 1] = 0;
   wifiPass[sizeof(wifiPass) - 1] = 0;
   mqttHost[sizeof(mqttHost) - 1] = 0;
   machineCode[sizeof(machineCode) - 1] = 0;
   deviceUid[sizeof(deviceUid) - 1] = 0;
 
   // NVS override (dari set_identity / set_network dashboard)
   char tmp[48];
   prefs.begin("pzemid", true);
   if (prefs.getString("ssid", tmp, sizeof(tmp)) > 0) {
     if (strcmp(tmp, "GM3_DuckDown") == 0 || strcmp(tmp, "Robot_Resource (Lokal)") == 0) {
       strncpy(wifiSsid, DEFAULT_WIFI_SSID, sizeof(wifiSsid) - 1);
       strncpy(wifiPass, DEFAULT_WIFI_PASS, sizeof(wifiPass) - 1);
     } else {
       strncpy(wifiSsid, tmp, sizeof(wifiSsid) - 1);
     }
     wifiSsid[sizeof(wifiSsid) - 1] = 0;
   }
   if (prefs.getString("pass", tmp, sizeof(tmp)) > 0) {
     if (strcmp(tmp, "Factory@Maja") == 0 || strcmp(tmp, "robot@9876") == 0) {
       strncpy(wifiPass, DEFAULT_WIFI_PASS, sizeof(wifiPass) - 1);
     } else {
       strncpy(wifiPass, tmp, sizeof(wifiPass) - 1);
     }
     wifiPass[sizeof(wifiPass) - 1] = 0;
   }
   if (prefs.getString("mhost", tmp, sizeof(tmp)) > 0) {
     strncpy(mqttHost, tmp, sizeof(mqttHost) - 1);
     mqttHost[sizeof(mqttHost) - 1] = 0;
   }
   if (prefs.getString("code", tmp, sizeof(tmp)) > 0) {
     strncpy(machineCode, tmp, sizeof(machineCode) - 1);
     machineCode[sizeof(machineCode) - 1] = 0;
   }
   if (prefs.getString("uid", tmp, sizeof(tmp)) > 0) {
     strncpy(deviceUid, tmp, sizeof(deviceUid) - 1);
     deviceUid[sizeof(deviceUid) - 1] = 0;
   }
   prefs.end();
 
   updateMqttHostForSsid(wifiSsid);
   buildMqttClientId();
 }
 
 void updateMqttHostForSsid(const char *ssid) {
  const char *targetHost = MQTT_HOST_LOCAL;
  if (ssid && (strstr(ssid, "Tracked") != nullptr || strcmp(ssid, DEFAULT_WIFI_SSID) == 0)) {
    targetHost = MQTT_HOST_ROBOTIC;  // Tracked → 10.5.2.222
  } else {
    targetHost = MQTT_HOST_LOCAL;    // GM3_DuckDown → 10.5.0.106
  }
  if (strcmp(mqttHost, targetHost) != 0) {
    strncpy(mqttHost, targetHost, sizeof(mqttHost) - 1);
    mqttHost[sizeof(mqttHost) - 1] = 0;
    mqtt.setServer(mqttHost, MQTT_PORT);
    mqttNeedsReconnect = true;
  }
}

 void saveIdentity() {
   prefs.begin("pzemid", false);
   prefs.putString("ssid", wifiSsid);
   prefs.putString("pass", wifiPass);
   prefs.putString("mhost", mqttHost);
   prefs.putString("code", machineCode);
   prefs.putString("uid", deviceUid);
   prefs.end();
 }
 
 void buildTopics() {
   snprintf(topicTelemetry, sizeof(topicTelemetry), "%s/%s/telemetry/%s", TOPIC_PREFIX, machineCode, SENSOR_NAME);
   snprintf(topicStatus, sizeof(topicStatus), "%s/%s/status/%s", TOPIC_PREFIX, machineCode, SENSOR_NAME);
   snprintf(topicCmd, sizeof(topicCmd), "%s/%s/cmd", TOPIC_PREFIX, machineCode);
   snprintf(topicDevCmd, sizeof(topicDevCmd), "%s/dev/%s/cmd", TOPIC_PREFIX, deviceUid);
   snprintf(topicAck, sizeof(topicAck), "%s/%s/ack", TOPIC_PREFIX, machineCode);
   snprintf(topicHistory, sizeof(topicHistory), "%s/%s/history", TOPIC_PREFIX, machineCode);
   snprintf(topicHistoryDaily, sizeof(topicHistoryDaily), "%s/%s/history/daily", TOPIC_PREFIX, machineCode);
   snprintf(willPayload, sizeof(willPayload),
            "{\"device_uid\":\"%s\",\"machine_code\":\"%s\",\"sensor\":\"%s\",\"state\":\"mqtt_lost\",\"online\":false,\"detail\":\"MQTT LWT\"}",
            deviceUid, machineCode, SENSOR_NAME);
 }
 
 void resubscribeMqtt() {
   if (!mqtt.connected()) return;
   mqtt.subscribe(topicCmd);
   mqtt.subscribe(topicDevCmd);
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
 
 // ===== 7-DAY NVS MEMORY IMPLEMENTATION =====
 void loadDailyHistory() {
   dailyHistoryCount = 0;
   memset(dailyHistory, 0, sizeof(dailyHistory));
   prefs.begin("pzemhist", true);
   uint8_t cnt = prefs.getUChar("cnt", 0);
   if (cnt > MAX_HISTORY_DAYS) cnt = MAX_HISTORY_DAYS;
   size_t readBytes = prefs.getBytes("data", dailyHistory, sizeof(dailyHistory));
   prefs.end();
   if (readBytes > 0) {
     dailyHistoryCount = cnt;
   }
 }
 
 void saveDailyHistory() {
   prefs.begin("pzemhist", false);
   prefs.putUChar("cnt", dailyHistoryCount);
   prefs.putBytes("data", dailyHistory, sizeof(dailyHistory));
   prefs.end();
 }
 
 void formatYmdDateStr(int ymd, char *out, size_t n) {
   if (ymd < 10000000) {
     snprintf(out, n, "1970-01-01");
     return;
   }
   int y = ymd / 10000;
   int m = (ymd % 10000) / 100;
   int d = ymd % 100;
   snprintf(out, n, "%04d-%02d-%02d", y, m, d);
 }
 
 void publishDailyHistorySnapshot(const DailyHistoryEntry &e) {
   if (!mqtt.connected()) return;
   char dateStr[16];
   formatYmdDateStr(e.ymd, dateStr, sizeof(dateStr));
 
   StaticJsonDocument<512> doc;
   doc["device_uid"] = deviceUid;
   doc["machine_code"] = machineCode;
   doc["ymd"] = e.ymd;
   doc["date"] = dateStr;
   doc["run_sec"] = e.runSec;
   doc["loss_sec"] = e.lossSec;
   doc["idle_sec"] = e.lossSec;
   doc["off_sec"] = e.offSec;
   doc["power_on_sec"] = e.powerOnSec;
   doc["productivity_pct"] = e.prodPct;
   doc["saved_at"] = e.savedAt;
   doc["mqtt_service"] = mqttHost;
 
   char buf[512];
   size_t len = serializeJson(doc, buf);
   mqtt.publish(topicHistoryDaily, (const uint8_t *)buf, len, true);
 }
 
 void publishAllDailyHistory() {
   if (!mqtt.connected()) return;
   StaticJsonDocument<2048> doc;
   doc["device_uid"] = deviceUid;
   doc["machine_code"] = machineCode;
   doc["command"] = "get_history";
   doc["count"] = dailyHistoryCount;
   doc["max_days"] = MAX_HISTORY_DAYS;
   doc["mqtt_service"] = mqttHost;
   JsonArray arr = doc.createNestedArray("history");
   for (uint8_t i = 0; i < dailyHistoryCount; i++) {
     char dateStr[16];
     formatYmdDateStr(dailyHistory[i].ymd, dateStr, sizeof(dateStr));
     JsonObject o = arr.createNestedObject();
     o["ymd"] = dailyHistory[i].ymd;
     o["date"] = dateStr;
     o["run_sec"] = dailyHistory[i].runSec;
     o["loss_sec"] = dailyHistory[i].lossSec;
     o["idle_sec"] = dailyHistory[i].lossSec;
     o["off_sec"] = dailyHistory[i].offSec;
     o["power_on_sec"] = dailyHistory[i].powerOnSec;
     o["productivity_pct"] = dailyHistory[i].prodPct;
     o["saved_at"] = dailyHistory[i].savedAt;
   }
 
   char buf[2048];
   size_t len = serializeJson(doc, buf);
   mqtt.publish(topicHistory, (const uint8_t *)buf, len, false);
 }
 
 void recordDailySnapshot(int ymd, uint32_t rSec, uint32_t lSec, uint32_t oSec) {
   if (ymd <= 0) return;
   int existingIdx = -1;
   for (uint8_t i = 0; i < dailyHistoryCount; i++) {
     if (dailyHistory[i].ymd == ymd) {
       existingIdx = i;
       break;
     }
   }
 
   DailyHistoryEntry entry;
   entry.ymd = ymd;
   entry.runSec = rSec;
   entry.lossSec = lSec;
   entry.offSec = oSec;
   entry.powerOnSec = rSec + lSec;
   entry.prodPct = (entry.powerOnSec > 0) ? ((100.0f * rSec) / (float)entry.powerOnSec) : 0.0f;
   time_t nowSec = 0;
   time(&nowSec);
   entry.savedAt = (uint32_t)nowSec;
 
   if (existingIdx >= 0) {
     dailyHistory[existingIdx] = entry;
   } else {
     if (dailyHistoryCount < MAX_HISTORY_DAYS) {
       dailyHistory[dailyHistoryCount++] = entry;
     } else {
       // Hapus yang tertua (> 7 hari), geser array ke kiri
       for (uint8_t i = 0; i < MAX_HISTORY_DAYS - 1; i++) {
         dailyHistory[i] = dailyHistory[i + 1];
       }
       dailyHistory[MAX_HISTORY_DAYS - 1] = entry;
     }
   }
   saveDailyHistory();
   publishDailyHistorySnapshot(entry);
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
  * Splash nomor UID besar 2 digit (contoh 00 / 06) sebelum MAC & WiFi.
  */
 void showUidSplashLcd(uint32_t ms) {
   lcd.clear();
   lcdLoadBigDigitChars();
 
   char digits[8];
   int n = 0;
   for (int i = 0; deviceUid[i] && n < 7; i++) {
     if (deviceUid[i] >= '0' && deviceUid[i] <= '9') digits[n++] = deviceUid[i];
   }
   char d0 = '0', d1 = '0';
   if (n >= 2) {
     d0 = digits[n - 2];
     d1 = digits[n - 1];
   } else if (n == 1) {
     d1 = digits[0];
   }
   // 2 digit × lebar 3 + 1 spasi = 7 kolom, tengah 16
   lcdDrawBigDigit(4, d0);
   lcdDrawBigDigit(9, d1);
   delay(ms);
   lcd.clear();
 }
 
 void showMacSplashLcd(uint32_t ms) {
   WiFi.mode(WIFI_STA);
   String mac = WiFi.macAddress();  // AA:BB:CC:DD:EE:FF
   char hex[13];
   int j = 0;
   for (unsigned i = 0; i < mac.length() && j < 12; i++) {
     char c = mac[i];
     if (c != ':') hex[j++] = c;
   }
   hex[j] = 0;
   char line2[17];
   memset(line2, ' ', 16);
   line2[16] = 0;
   int len = (int)strlen(hex);
   int pad = len < 16 ? (16 - len) / 2 : 0;
   memcpy(line2 + pad, hex, len > 16 ? 16 : (size_t)len);
   lcdPrint2("  MAC ADDRESS", line2);
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
   if (WiFi.status() != WL_CONNECTED || !mqtt.connected()) return 2;
   if (!loginSystemOn || operatorLoggedIn) return (uint8_t)PAGE_COUNT;
   return 2;
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
 
   // WiFi/MQTT belum siap → 2 slide: reconnect + Run/Loss (counter tetap jalan)
   if (wifiAllFailed && WiFi.status() != WL_CONNECTED) {
     lcdPrint2("GAGAL KONEKSI", wifiPhase == WP_FALLBACK ? "Cadangan WiFi" : "Tracked WiFi");
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
 
   switch (lcdPage) {
     case PAGE_RUNLOSS: {
       // Slide 1: Loss / Runn
       fmtHms(lossSec, t1, sizeof(t1));
       fmtHms(runSec, t2, sizeof(t2));
       snprintf(a, sizeof(a), "Loss : %s", t1);
       snprintf(b, sizeof(b), "Runn : %s", t2);
       lcdPrint2(a, b);
       break;
     }
     case PAGE_IDENTITY: {
       // Slide 2: Atas=Operator, Bawah=Proses (tanpa brand, tanpa machine code)
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
       break;
     }
     case PAGE_OFFIDLE: {
       // Slide 3: mesin mati + mesin ON (idle) — 16 kolom
       // "MSN OFF:00:00:00" / "MSN ON :00:00:00"
       fmtHms(offSec, t1, sizeof(t1));
       fmtHms(lossSec, t2, sizeof(t2));
       snprintf(a, sizeof(a), "MSN OFF:%s", t1);
       snprintf(b, sizeof(b), "MSN ON :%s", t2);
       lcdPrint2(a, b);
       break;
     }
     case PAGE_VI: {
       // Slide 4: Voltage / Current (16 kolom, spasi seperti contoh)
       // "Voltage : 220 V" / "Current : 0.01 A"
       if (!pzemOk) {
         snprintf(a, sizeof(a), "Voltage :  --- V");
         snprintf(b, sizeof(b), "Current :  --- A");
       } else {
         snprintf(a, sizeof(a), "Voltage : %3.0f V", lastV);
         if (lastA < 10.0f) {
           snprintf(b, sizeof(b), "Current : %4.2f A", lastA);
         } else {
           snprintf(b, sizeof(b), "Current : %4.1f A", lastA);
         }
       }
       lcdPrint2(a, b);
       break;
     }
     default:
       break;
   }
 }
 
 // ---------- Deep sleep (OFF ≥ 2 jam → MQTT dulu → sleep 20 mnt → wake WiFi/MQTT → nunggu 5 mnt) ----------
 uint32_t epochNowOr0() {
   time_t t = time(nullptr);
   return (t > 100000) ? (uint32_t)t : 0;
 }
 
 void publishDeepSleepEvent(const char *state, uint32_t fromEpoch, uint32_t toEpoch) {
   if (!mqtt.connected()) return;
   StaticJsonDocument<480> doc;
   doc["device_uid"] = deviceUid;
   doc["machine_code"] = machineCode;
   doc["sensor"] = SENSOR_NAME;
   doc["state"] = state;
   doc["online"] = (strcmp(state, "deep_sleep_exit") == 0);
   doc["wifi_ok"] = WiFi.status() == WL_CONNECTED;
   doc["mqtt_ok"] = true;
   doc["mqtt_service"] = mqttHost;
   doc["sensor_ok"] = pzemOk;
   doc["detail"] = (strcmp(state, "deep_sleep_enter") == 0)
                       ? "OFF ≥2 jam — deep sleep 20 mnt wake"
                       : (strcmp(state, "deep_sleep_wake") == 0)
                             ? "Bangun — cek OFF 5 mnt"
                             : "Bangun — mesin nyala lagi";
   doc["rssi"] = WiFi.RSSI();
   doc["uptime_sec"] = millis() / 1000;
   doc["run_sec"] = runSec;
   doc["loss_sec"] = lossSec;
   doc["off_sec"] = offSec;
   doc["op_status"] = statusStr(opStatus);
   if (fromEpoch > 0) doc["deep_sleep_from"] = fromEpoch;
   if (toEpoch > 0) doc["deep_sleep_to"] = toEpoch;
   if (fromEpoch > 0 && toEpoch > fromEpoch) {
     doc["duration_sec"] = toEpoch - fromEpoch;
   }
   char buf[480];
   size_t n = serializeJson(doc, buf);
   // retain enter supaya /devices tahu DEEPSLEEP
   bool retain = (strcmp(state, "deep_sleep_enter") == 0 || strcmp(state, "deep_sleep_exit") == 0);
   mqtt.publish(topicStatus, (const uint8_t *)buf, n, retain);
   lastState = state;
 }
 
 void deepSleepHardwareStart() {
   lcdPrint2("Deep sleep", "wake 20 min");
   delay(250);
   if (mqtt.connected()) mqtt.disconnect();
   WiFi.disconnect(true);
   WiFi.mode(WIFI_OFF);
   esp_sleep_enable_timer_wakeup(DEEP_SLEEP_US);
   esp_deep_sleep_start();
 }
 
 /** Wajib WiFi+MQTT sebelum sleep. Belum connect → reboot 1× lalu terus coba (jangan sleep). */
 bool tryEnterDeepSleepWithMqtt(const char *reason, bool firstEnter) {
   (void)reason;
   bool wifiOk = (WiFi.status() == WL_CONNECTED);
   bool mqttOk = mqtt.connected();
 
   if (!wifiOk || !mqttOk) {
     prefs.begin("pzemkpi", false);
     bool alreadyReboot = prefs.getBool("dsReb", false);
     prefs.putBool("dsWant", true);
     prefs.end();
 
     if (!alreadyReboot) {
       Serial.println("[DS] belum WiFi/MQTT → reboot 1x sebelum deep sleep");
       lcdPrint2("DS: reboot", "cari WiFi/MQTT");
       saveCounters(true);
       prefs.begin("pzemkpi", false);
       prefs.putBool("dsReb", true);
       prefs.putBool("dsWant", true);
       prefs.end();
       delay(500);
       ESP.restart();
     }
     // Sudah pernah reboot — jangan sleep dulu, terus coba connect
     lcdPrint2("DS tunggu", mqttOk ? "WiFi..." : "WiFi+MQTT...");
     return false;
   }
 
   // Sudah connect — kirim MQTT dulu baru sleep
   saveCounters(true);
   uint32_t nowEp = epochNowOr0();
   if (firstEnter) {
     prefs.begin("pzemkpi", false);
     prefs.putBool("dsOn", true);
     prefs.putULong("dsFrom", nowEp);
     prefs.putULong("dsLast", nowEp);
     prefs.putBool("dsWant", false);
     prefs.putBool("dsReb", false);
     prefs.end();
   } else {
     prefs.begin("pzemkpi", false);
     prefs.putBool("dsOn", true);
     prefs.putBool("dsWant", false);
     prefs.putBool("dsReb", false);
     prefs.end();
   }
 
   publishStatus("ok", "sebelum deep sleep — mesin OFF", pzemOk);
   publishTelemetry();
   publishDeepSleepEvent("deep_sleep_enter", firstEnter ? nowEp : 0, 0);
   delay(300);
   mqtt.loop();
   delay(200);
 
   deepSleepHardwareStart();
   return true;  // tidak kembali
 }
 
 void enterDeepSleep(const char *reason, bool firstEnter) {
   tryEnterDeepSleepWithMqtt(reason, firstEnter);
 }
 
 void handleDeepSleepWake() {
   prefs.begin("pzemkpi", false);
   bool dsOn = prefs.getBool("dsOn", false);
   uint32_t fromEp = prefs.getULong("dsFrom", 0);
   uint32_t lastEp = prefs.getULong("dsLast", fromEp);
   prefs.end();
   if (!dsOn) return;
 
   // Tambah durasi sleep ke off_sec (~20 mnt)
   uint32_t nowEp = epochNowOr0();
   uint32_t dt = SLEEP_CHUNK_SEC;
   if (nowEp > 0 && lastEp > 0 && nowEp > lastEp) {
     dt = nowEp - lastEp;
     if (dt > 2 * SLEEP_CHUNK_SEC) dt = SLEEP_CHUNK_SEC;
   }
   offSec += dt;
   saveCounters(true);
 
   prefs.begin("pzemkpi", false);
   if (nowEp > 0) prefs.putULong("dsLast", nowEp);
   prefs.end();
 
   readPzem();
   OpStatus raw = classify(lastV, lastA, lastW, pzemOk);
   opStatus = raw;
   pendStatus = raw;
 
   if (raw != ST_OFF && pzemOk) {
     dsPendingExit = true;
     dsWakeWatch = false;
     prefs.begin("pzemkpi", false);
     prefs.putBool("dsOn", false);
     prefs.putBool("dsExit", true);
     prefs.putULong("dsFrom", fromEp);
     prefs.end();
     lcdPrint2("Wake: machine", "ON - connect");
   } else {
     // Masih OFF — WAJIB WiFi+MQTT dulu, kirim data, nunggu 5 mnt (jangan sleep langsung)
     dsWakeWatch = true;
     dsWatchStartMs = 0;
     lcdPrint2("Wake: OFF", "WiFi+MQTT dulu");
   }
 }
 
 void tryPublishDeepSleepExit() {
   prefs.begin("pzemkpi", false);
   bool need = prefs.getBool("dsExit", false) || dsPendingExit;
   uint32_t fromEp = prefs.getULong("dsFrom", 0);
   prefs.end();
   if (!need || !mqtt.connected()) return;
   uint32_t toEp = epochNowOr0();
   if (toEp == 0) toEp = fromEp + SLEEP_CHUNK_SEC;
   publishDeepSleepEvent("deep_sleep_exit", fromEp, toEp);
   prefs.begin("pzemkpi", false);
   prefs.putBool("dsExit", false);
   prefs.putBool("dsOn", false);
   prefs.putBool("dsWant", false);
   prefs.putBool("dsReb", false);
   prefs.remove("dsFrom");
   prefs.remove("dsLast");
   prefs.end();
   dsPendingExit = false;
   dsWakeWatch = false;
   dsWatchStartMs = 0;
 }
 
 /** Dipanggil dari loop: dsWant (setelah reboot) + wake watch 5 mnt. */
 void serviceDeepSleepLogic() {
   // Mesin nyala saat nunggu enter → batalkan
   if (opStatus != ST_OFF && pzemOk) {
     prefs.begin("pzemkpi", false);
     bool want = prefs.getBool("dsWant", false);
     prefs.end();
     if (want) {
       prefs.begin("pzemkpi", false);
       prefs.putBool("dsWant", false);
       prefs.putBool("dsReb", false);
       prefs.end();
     }
   }
 
   prefs.begin("pzemkpi", false);
   bool wantEnter = prefs.getBool("dsWant", false);
   prefs.end();
   if (wantEnter && opStatus == ST_OFF) {
     tryEnterDeepSleepWithMqtt("ds_want", true);
     return;
   }
 
   if (!dsWakeWatch) return;
 
   // Tunggu WiFi+MQTT sebelum mulai timer 5 mnt
   if (WiFi.status() != WL_CONNECTED || !mqtt.connected()) {
     lcdPrint2("Wake tunggu", "WiFi / MQTT");
     return;
   }
 
   if (dsWatchStartMs == 0) {
     dsWatchStartMs = millis();
     prefs.begin("pzemkpi", false);
     uint32_t fromEp = prefs.getULong("dsFrom", 0);
     prefs.end();
     publishDeepSleepEvent("deep_sleep_wake", fromEp, 0);
     publishStatus("ok", "wake check — mesin masih OFF", pzemOk);
     publishTelemetry();
     lcdPrint2("Wake: pantau", "5 mnt OFF?");
     Serial.println("[DS] wake MQTT OK — pantau 5 menit");
   }
 
   // Mesin nyala dalam jendela 5 mnt
   if (opStatus != ST_OFF && pzemOk) {
     dsPendingExit = true;
     prefs.begin("pzemkpi", false);
     prefs.putBool("dsOn", false);
     prefs.putBool("dsExit", true);
     prefs.end();
     tryPublishDeepSleepExit();
     dsWakeWatch = false;
     dsWatchStartMs = 0;
     offSinceMs = 0;
     return;
   }
 
   uint32_t elapsed = millis() - dsWatchStartMs;
   if (elapsed < DS_WAKE_WATCH_MS) {
     char line2[17];
     uint32_t left = (DS_WAKE_WATCH_MS - elapsed) / 1000;
     snprintf(line2, sizeof(line2), "OFF sisa %lum", (unsigned long)((left + 59) / 60));
     if ((millis() / 1000) % 10 == 0) lcdPrint2("Wake pantau", line2);
     return;
   }
 
   // Masih OFF setelah 5 mnt → kirim MQTT sleep lagi
   Serial.println("[DS] masih OFF 5 mnt → deep sleep 20 mnt");
   dsWakeWatch = false;
   dsWatchStartMs = 0;
   tryEnterDeepSleepWithMqtt("still_off_5m", false);
 }
 
 // ---------- MQTT status ----------
 void wifiMacString(char out[18]) {
   uint8_t mac[6];
   WiFi.macAddress(mac);
   snprintf(out, 18, "%02X:%02X:%02X:%02X:%02X:%02X",
            mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
 }

 void publishStatus(const char *state, const char *detail, bool sensorOk) {
   if (!mqtt.connected()) return;
   StaticJsonDocument<512> doc;
   doc["device_uid"] = deviceUid;
   doc["machine_code"] = machineCode;
   doc["sensor"] = SENSOR_NAME;
   doc["state"] = state;
   doc["online"] = true;
   doc["wifi_ok"] = WiFi.status() == WL_CONNECTED;
   doc["mqtt_ok"] = true;
   doc["mqtt_service"] = mqttHost;
   doc["sensor_ok"] = sensorOk;
   doc["detail"] = detail;
   doc["rssi"] = WiFi.RSSI();
   char mac[18];
   wifiMacString(mac);
   doc["mac"] = mac;
   doc["wifi_ssid"] = wifiSsid;
   // IP tidak dikirim tiap status — hanya publishNetworkOnce() saat connect
   doc["uptime_sec"] = millis() / 1000;
   doc["fail_count"] = pzemFailCount;
   doc["run_sec"] = runSec;
   doc["loss_sec"] = lossSec;
   doc["off_sec"] = offSec;
   doc["op_status"] = statusStr(opStatus);
 
   char buf[512];
   size_t n = serializeJson(doc, buf);
   // Retain HANYA saat ganti state / event penting — heartbeat "ok" tanpa retain
   // (retain tiap 5 dtk membebani broker & memicu flapping di sisi subscribe)
   bool doRetain = (lastState != state) ||
                   (strcmp(state, "network") == 0) ||
                   (strcmp(state, "resync") == 0);
   if (mqtt.publish(topicStatus, (const uint8_t *)buf, n, doRetain) && lastState != state) {
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
   char mac[18];
   wifiMacString(mac);
   doc["mac"] = mac;
   doc["wifi_ssid"] = wifiSsid;
   doc["mqtt_service"] = mqttHost;
   doc["mqtt_server"] = mqttHost;
   doc["ip_once"] = true;
   char buf[384];
   size_t n = serializeJson(doc, buf);
   if (mqtt.publish(topicStatus, (const uint8_t *)buf, n, true)) {
     ipReportedOnce = true;
   }
 }
 
 void publishAck(const char *command, bool ok) {
   StaticJsonDocument<192> doc;
   doc["device_uid"] = deviceUid;
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
 
 void publishConfigAck(const char *cmd) {
   StaticJsonDocument<384> doc;
   doc["device_uid"] = deviceUid;
   doc["machine_code"] = machineCode;
   doc["command"] = cmd;
   doc["ok"] = true;
   doc["wifi_ssid"] = wifiSsid;
   doc["mqtt_host"] = mqttHost;
   doc["mqtt_service"] = mqttHost;
   doc["current_threshold_a"] = currentThresholdA;
   doc["off_current_a"] = offCurrentA;
   doc["power_threshold_w"] = powerThresholdW;
   doc["filter_aktif_ms"] = filterAktifMs;
   doc["filter_diam_ms"] = filterDiamMs;
   doc["lcd_auto_ms"] = lcdAutoMs;
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
     publishAck("wifi_scan", false);
     return;
   }
   flashLcdMsg("Scan WiFi ...", " ");
   int n = WiFi.scanNetworks(false, true);
   if (n < 0) {
     publishAck("wifi_scan", false);
     return;
   }
 
   StaticJsonDocument<3072> doc;
   doc["device_uid"] = deviceUid;
   doc["machine_code"] = machineCode;
   doc["command"] = "wifi_scan";
   doc["ok"] = true;
   JsonArray arr = doc.createNestedArray("wifi_list");
   int cap = n > 12 ? 12 : n;
   for (int i = 0; i < cap; i++) {
     JsonObject ap = arr.createNestedObject();
     ap["ssid"] = WiFi.SSID(i);
     ap["rssi"] = WiFi.RSSI(i);
     ap["secure"] = WiFi.encryptionType(i) != WIFI_AUTH_OPEN;
     ap["channel"] = 0;
   }
   char buf[3072];
   size_t len = serializeJson(doc, buf);
   mqtt.publish(topicAck, buf, len);
   WiFi.scanDelete();
   flashLcdMsg("Scan WiFi OK", " ");
 }
 
 void onMqttMessage(char *topic, byte *payload, unsigned int length) {
   (void)topic;
   StaticJsonDocument<512> doc;
   if (deserializeJson(doc, payload, length)) return;
   const char *cmd = doc["command"] | "";
 
   if (strcmp(cmd, "wifi_scan") == 0) {
     publishWifiScanAck();
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
         mqtt.setServer(mqttHost, MQTT_PORT);
         mqttNeedsReconnect = true;
       }
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
         lcdPage = (LcdPage)p;
         lcdScrollPos = 0;
         lcdManualHold = true;
         lastPageAutoMs = millis();
       }
     }
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
     lcdPage = (LcdPage)((lcdPage + 1) % lcdSlideCount());
     lcdScrollPos = 0;
     lcdManualHold = true;
     lastPageAutoMs = millis();
     renderLcd();
     publishAck(cmd, true);
   } else if (strcmp(cmd, "get_config") == 0) {
     publishConfigAck(cmd);
   } else if (strcmp(cmd, "get_history") == 0 || strcmp(cmd, "sync_history") == 0) {
     publishAllDailyHistory();
   } else if (strcmp(cmd, "clear_history") == 0) {
     dailyHistoryCount = 0;
     memset(dailyHistory, 0, sizeof(dailyHistory));
     saveDailyHistory();
     publishAck(cmd, true);
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
   } else if (strcmp(cmd, "login_status") == 0) {
     // Sinkron dari backend saat boot/resync
     if (doc.containsKey("login_required")) {
       loginSystemOn = doc["login_required"].as<bool>();
     }
     bool ok = doc["logged_in"] | false;
     if (!loginSystemOn) {
       ok = true;  // OFF → jangan paksa slide "OPERATOR BELUM"
     }
     setOperatorLoggedIn(ok, false);
     saveLoginState();
     if (ok) {
       const char *op = doc["operator_name"] | "";
       if (op[0]) {
         snprintf(lcdLoginLine2, sizeof(lcdLoginLine2), "%.16s", op);
         strncpy(lcdOperator, op, sizeof(lcdOperator) - 1);
         lcdOperator[sizeof(lcdOperator) - 1] = 0;
       }
     }
     renderLcd();
     publishAck(cmd, true);
   } else if (strcmp(cmd, "reboot") == 0) {
     publishAck(cmd, true);
     delay(200);
     ESP.restart();
   }
 }
 
 /**
  * Optimasi WiFi STA ESP32-C6 SuperMini (sinyal jauh + noise industri):
  * 1. PS_NONE — radio 100% aktif (anti packet loss / latency spike).
  * 2. TX max 21 dBm — jangkauan uplink lebih jauh.
  * 3. HT20 — sensitivitas RX lebih baik (+~3 dB) vs HT40 di lingkungan noise.
  * 4. 11b/g/n/ax — HE20 bila AP Wi‑Fi 6, fallback mulus.
  * 5. Country ID ch 1–13 — scan channel lokal penuh.
  * 6. ALL_CHANNEL_SCAN + CONNECT_AP_BY_SIGNAL — pilih BSSID RSSI terkuat.
  * 7. failure_retry_cnt tinggi — tahan flapping auth di edge coverage.
  * 8. Watchdog RSSI (wifiWatchRssiAndRoam) — roam ke AP lebih kuat jika sinyal jelek.
  */
 void applyWifiStaOptimizations() {
   WiFi.persistent(false);
   WiFi.setAutoReconnect(true);
   WiFi.setSleep(false);
   esp_wifi_set_ps(WIFI_PS_NONE);
 
   wifi_country_t country;
   memset(&country, 0, sizeof(country));
   strcpy(country.cc, "ID");
   country.schan = 1;
   country.nchan = 13;
   country.max_tx_power = 20;
   country.policy = WIFI_COUNTRY_POLICY_AUTO;
   esp_wifi_set_country(&country);
 
   esp_wifi_set_bandwidth(WIFI_IF_STA, WIFI_BW_HT20);
 
 #ifdef WIFI_PROTOCOL_11AX
   esp_wifi_set_protocol(
       WIFI_IF_STA,
       WIFI_PROTOCOL_11B | WIFI_PROTOCOL_11G | WIFI_PROTOCOL_11N | WIFI_PROTOCOL_11AX);
 #else
   esp_wifi_set_protocol(
       WIFI_IF_STA, WIFI_PROTOCOL_11B | WIFI_PROTOCOL_11G | WIFI_PROTOCOL_11N);
 #endif
 
   // 0.25 dBm units; 84 = 21.0 dBm
   esp_wifi_set_max_tx_power(84);
 
   // ponytail: STA inactive lebih longgar agar AP tidak drop cepat saat noise spike
   esp_wifi_set_inactive_time(WIFI_IF_STA, 30);
 
   wifi_config_t conf;
   if (esp_wifi_get_config(WIFI_IF_STA, &conf) == ESP_OK) {
     conf.sta.scan_method = WIFI_ALL_CHANNEL_SCAN;
     conf.sta.sort_method = WIFI_CONNECT_AP_BY_SIGNAL;
     conf.sta.threshold.rssi = -127;  // jangan tolak AP lemah saat connect awal
     conf.sta.threshold.authmode = WIFI_AUTH_OPEN;
     conf.sta.listen_interval = 3;    // beacon listen lebih sering (anti miss AP)
 #if ESP_IDF_VERSION_MAJOR >= 4
     conf.sta.failure_retry_cnt = 8;
 #endif
 #ifdef CONFIG_ESP_WIFI_ENABLE_WPA3_SAE
     conf.sta.pmf_cfg.capable = true;
     conf.sta.pmf_cfg.required = false;
 #endif
     esp_wifi_set_config(WIFI_IF_STA, &conf);
   }
 }
 
 void wifiCopyCreds(const char *ssid, const char *pass) {
   strncpy(wifiSsid, ssid ? ssid : "", sizeof(wifiSsid) - 1);
   strncpy(wifiPass, pass ? pass : "", sizeof(wifiPass) - 1);
   wifiSsid[sizeof(wifiSsid) - 1] = 0;
   wifiPass[sizeof(wifiPass) - 1] = 0;
   updateMqttHostForSsid(wifiSsid);
 }
 
 void wifiLoadPrimary() {
   wifiPhase = WP_PRIMARY;
   wifiCopyCreds(DEFAULT_WIFI_SSID, DEFAULT_WIFI_PASS);
 }
 
 void wifiLoadFallback() {
   wifiPhase = WP_FALLBACK;
   wifiCopyCreds(DEFAULT_WIFI_SSID_FALLBACK, DEFAULT_WIFI_PASS_FALLBACK);
 }
 
 void wifiBeginCurrent() {
   saveCounters(true);
   WiFi.disconnect(false);
   delay(30);
   updateMqttHostForSsid(wifiSsid);
   applyWifiStaOptimizations();
   WiFi.setHostname(mqttClientId);
   WiFi.begin(wifiSsid, wifiPass);
 
   // Re-apply setelah begin (IDF kadang reset sebagian config)
   wifi_config_t conf;
   if (esp_wifi_get_config(WIFI_IF_STA, &conf) == ESP_OK) {
     conf.sta.scan_method = WIFI_ALL_CHANNEL_SCAN;
     conf.sta.sort_method = WIFI_CONNECT_AP_BY_SIGNAL;
     conf.sta.threshold.rssi = -127;
 #if ESP_IDF_VERSION_MAJOR >= 4
     conf.sta.failure_retry_cnt = 8;
 #endif
     esp_wifi_set_config(WIFI_IF_STA, &conf);
   }
   esp_wifi_set_ps(WIFI_PS_NONE);
   esp_wifi_set_max_tx_power(84);
   WiFi.setSleep(false);
 
   wifiTryStartMs = millis();
   lastWifiAttemptMs = wifiTryStartMs;
   wifiRssiBadHits = 0;
   lastRssiCheckMs = millis();
 }
 
 /** Scan SSID yang sama; reconnect ke BSSID yang ≥ improveDb lebih kuat. */
 bool wifiRoamToStrongerBssid() {
   if (WiFi.status() != WL_CONNECTED) return false;
   uint32_t now = millis();
   if (lastWifiRoamMs != 0 && (now - lastWifiRoamMs) < WIFI_ROAM_COOLDOWN_MS) return false;
   // Jangan roam saat MQTT baru stabil — scan blocking mematikan keepalive
   if (mqtt.connected() && mqttConnectedAtMs != 0 &&
       (now - mqttConnectedAtMs) < MQTT_STABLE_BEFORE_ROAM_MS) {
     return false;
   }
 
   String curSsid = WiFi.SSID();
   if (curSsid.length() == 0) return false;
   int curRssi = WiFi.RSSI();
   uint8_t curBssid[6];
   memcpy(curBssid, WiFi.BSSID(), 6);
 
   // Service MQTT dulu sebelum scan blocking
   if (mqtt.connected()) mqtt.loop();
 
   int n = WiFi.scanNetworks(/*async=*/false, /*hidden=*/true);
   if (n <= 0) {
     WiFi.scanDelete();
     if (mqtt.connected()) mqtt.loop();
     return false;
   }
 
   int bestIdx = -1;
   int32_t bestRssi = curRssi + WIFI_RSSI_ROAM_IMPROVE_DB;
   for (int i = 0; i < n; i++) {
     if (!curSsid.equals(WiFi.SSID(i))) continue;
     uint8_t *bss = WiFi.BSSID(i);
     if (!bss) continue;
     if (memcmp(bss, curBssid, 6) == 0) continue;
     int32_t r = WiFi.RSSI(i);
     if (r > bestRssi) {
       bestRssi = r;
       bestIdx = i;
     }
   }
 
   if (bestIdx < 0) {
     WiFi.scanDelete();
     if (mqtt.connected()) mqtt.loop();
     return false;
   }
 
   uint8_t bestBssid[6];
   memcpy(bestBssid, WiFi.BSSID(bestIdx), 6);
   int32_t channel = WiFi.channel(bestIdx);
   WiFi.scanDelete();
 
   Serial.printf("[WiFi] roam RSSI %d→%d dBm BSSID %02X:%02X:%02X:%02X:%02X:%02X\n",
                 curRssi, (int)bestRssi,
                 bestBssid[0], bestBssid[1], bestBssid[2],
                 bestBssid[3], bestBssid[4], bestBssid[5]);
 
   saveCounters(true);
   if (mqtt.connected()) {
     mqtt.disconnect();
     mqttWasOk = false;
   }
   ipReportedOnce = false;
 
   WiFi.disconnect(false);
   delay(40);
   applyWifiStaOptimizations();
   WiFi.setHostname(mqttClientId);
   WiFi.begin(wifiSsid, wifiPass, channel, bestBssid, true);
   esp_wifi_set_ps(WIFI_PS_NONE);
   esp_wifi_set_max_tx_power(84);
   wifiRssiBadHits = 0;
   lastRssiCheckMs = millis();
   lastWifiRoamMs = millis();
   return true;
 }
 
 /** Saat connected: pantau RSSI lemah → roam; sinyal bagus → reset hit. */
 void wifiWatchRssiAndRoam() {
   uint32_t now = millis();
   if (now - lastRssiCheckMs < WIFI_RSSI_CHECK_MS) return;
   lastRssiCheckMs = now;
 
   int rssi = WiFi.RSSI();
   if (rssi > WIFI_RSSI_ROAM_DBM) {
     wifiRssiBadHits = 0;
     // jaga radio tetap full (beberapa AP/PS bisa nyalakan sleep lagi)
     esp_wifi_set_ps(WIFI_PS_NONE);
     WiFi.setSleep(false);
     return;
   }
 
   wifiRssiBadHits++;
   Serial.printf("[WiFi] RSSI lemah %d dBm hit=%u/%u\n",
                 rssi, wifiRssiBadHits, WIFI_RSSI_BAD_HITS);
   if (wifiRssiBadHits < WIFI_RSSI_BAD_HITS) return;
   wifiRssiBadHits = 0;
   wifiRoamToStrongerBssid();
 }
 
 void wifiResetCycle() {
   wifiAllFailed = false;
   wifiDownSinceMs = millis();
   wifiLoadPrimary();
   wifiBeginCurrent();
 }
 
 bool ensureWifi() {
   uint32_t now = millis();
 
   if (WiFi.status() == WL_CONNECTED) {
     if (!wifiWasOk) {
       wifiWasOk = true;
       wifiAllFailed = false;
       wifiDownSinceMs = 0;
       wifiRssiBadHits = 0;
       updateMqttHostForSsid(wifiSsid);
       configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
       saveIdentity();
       Serial.printf("[WiFi] OK ssid=%s ip=%s mqtt=%s\n",
                     wifiSsid, WiFi.localIP().toString().c_str(), mqttHost);
     }
     wifiWatchRssiAndRoam();
     return true;
   }
 
   if (wifiWasOk) {
     saveCounters(true);
     wifiWasOk = false;
     mqttWasOk = false;
     ntpOk = false;
     wifiRssiBadHits = 0;
     if (mqtt.connected()) mqtt.disconnect();
     ipReportedOnce = false;
     wifiDownSinceMs = now;
     wifiAllFailed = false;
     wifiLoadPrimary();  // putus → balik ke Tracked (9) dulu
     wifiBeginCurrent();
     return false;
   }
 
   if (wifiDownSinceMs == 0) {
     wifiResetCycle();
     return false;
   }
 
   uint32_t downFor = now - wifiDownSinceMs;
 
   if (wifiPhase == WP_PRIMARY) {
     wifiAllFailed = false;
     if (downFor >= WIFI_PRIMARY_ONLY_MS) {
       Serial.println("[WiFi] primary gagal ≥30 mnt → cadangan GM3_DuckDown");
       wifiLoadFallback();
       wifiBeginCurrent();
       return false;
     }
     if (now - wifiTryStartMs >= WIFI_RETRY_MS) {
       wifiLoadPrimary();
       wifiBeginCurrent();
     }
     return false;
   }
 
   // WP_FALLBACK — satu opsi cadangan
   if (downFor >= WIFI_PRIMARY_ONLY_MS + WIFI_FALLBACK_RETRY_MS) {
     // cadangan juga gagal lama → balik primary, timer 30 mnt ulang
     Serial.println("[WiFi] cadangan gagal → ulang Tracked (9)");
     wifiAllFailed = true;
     wifiDownSinceMs = now;
     wifiLoadPrimary();
     wifiBeginCurrent();
     return false;
   }
 
   if (now - wifiTryStartMs >= WIFI_RETRY_MS) {
     wifiLoadFallback();
     wifiBeginCurrent();
   }
   // LCD "GAGAL" setelah >1 mnt di fase cadangan masih putus
   wifiAllFailed = (downFor > WIFI_PRIMARY_ONLY_MS + 60000UL);
   return false;
 }
 
 bool ensureMqtt() {
   if (mqtt.connected()) {
     if (!mqttWasOk) {
       mqttWasOk = true;
       mqttBackoffMs = MQTT_RETRY_MS;
       mqttConnectedAtMs = millis();
       ipReportedOnce = false;
       saveCounters(true);
       publishNetworkOnce();
       publishTelemetry();
       // retain sekali saat nyambung — timpa LWT
       publishStatus("resync", "MQTT reconnect — sync Run/Loss dari ESP", pzemOk);
       tryPublishDeepSleepExit();
     }
     return true;
   }
   if (WiFi.status() != WL_CONNECTED) return false;
   if (mqttWasOk) {
     saveCounters(true);
     mqttWasOk = false;
     Serial.println("[MQTT] disconnected — will reconnect with backoff");
   }
 
   uint32_t now = millis();
   if (now - lastMqttAttemptMs < mqttBackoffMs) return false;
   lastMqttAttemptMs = now;
   mqttFailCount++;
 
   // Pastikan socket lama bersih sebelum connect ulang
   mqtt.disconnect();
   delay(50);
   mqtt.setServer(mqttHost, MQTT_PORT);
   mqtt.setKeepAlive(MQTT_KEEPALIVE_SEC);
   mqtt.setSocketTimeout(MQTT_SOCKET_TIMEOUT_SEC);
 
   // Boot pertama: clean session. Reconnect: keep session (lebih ringan di broker)
   bool cleanSession = !mqttEverConnected;
   Serial.printf("[MQTT] connect %s:%u client=%s clean=%d backoff=%lums\n",
                 mqttHost, MQTT_PORT, mqttClientId, cleanSession ? 1 : 0,
                 (unsigned long)mqttBackoffMs);
 
   bool ok = mqtt.connect(mqttClientId, nullptr, nullptr, topicStatus, 1, true, willPayload,
                          cleanSession);
   if (ok) {
     mqttEverConnected = true;
     mqttBackoffMs = MQTT_RETRY_MS;
     mqttConnectedAtMs = millis();
     ipReportedOnce = false;
     resubscribeMqtt();
     mqttWasOk = true;
     saveCounters(true);
     publishNetworkOnce();
     publishAck("boot", true);
     publishTelemetry();
     publishStatus("resync", "MQTT connected — sync Run/Loss dari ESP", pzemOk);
     // History 7 hari: hanya boot pertama / setelah lama offline — jangan tiap reconnect
     if (cleanSession) {
       publishAllDailyHistory();
     }
     tryPublishDeepSleepExit();
     Serial.println("[MQTT] connected OK");
     return true;
   }
 
   Serial.printf("[MQTT] connect gagal state=%d\n", mqtt.state());
   // Exponential backoff: 5s → 10s → … → 120s (hindari ban broker)
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
      // ===== JAM 00:00 WIB PERGANTIAN HARI =====
      // 1. Simpan snapshot data hari yang berakhir (lastWibYmd) ke memori 7 hari
      recordDailySnapshot(lastWibYmd, runSec, lossSec, offSec);
 
      // 2. Publish status & telemetry
      publishStatus("day_cut", "WIB midnight / hari baru - snapshot 7 hari tersimpan & reset counter", pzemOk);
      lastWibYmd = ymd;
      resetDayCounters("wib_midnight");
      if (mqtt.connected()) {
        publishTelemetry();
        publishAllDailyHistory();
      }
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
   doc["power_threshold_w"] = powerThresholdW;
   doc["fail_count"] = pzemFailCount;
   doc["mqtt_service"] = mqttHost;
 
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
     lcdPage = (LcdPage)((lcdPage + 1) % lcdSlideCount());
     lcdScrollPos = 0;
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
   delay(300);
   pinMode(BTN_PAGE, INPUT_PULLUP);
   pinMode(BTN_RESET, INPUT_PULLUP);

   loadIdentity();
   buildTopics();
   loadCounters();  // lanjutkan Run/Loss setelah restart
   loadDailyHistory(); // load memori riwayat 7 hari (1 minggu)
   loadCalibration();
   loadLoginState();

   Wire.begin(I2C_SDA, I2C_SCL);
   lcd.init();
   lcd.backlight();

   bool fromDeepSleep = (esp_sleep_get_wakeup_cause() == ESP_SLEEP_WAKEUP_TIMER);
 
   if (!fromDeepSleep) {
     showUidSplashLcd(2000);
     showMacSplashLcd(2500);
   }
 
   PZEM_UART.begin(9600, SERIAL_8N1, PZEM_RX_PIN, PZEM_TX_PIN);
   delay(400);
 
   if (fromDeepSleep) {
     handleDeepSleepWake();  // set dsWakeWatch atau dsPendingExit — tidak sleep langsung
   }
 
   mqtt.setServer(mqttHost, MQTT_PORT);
   mqtt.setCallback(onMqttMessage);
   mqtt.setBufferSize(1024);
   mqtt.setKeepAlive(MQTT_KEEPALIVE_SEC);
   mqtt.setSocketTimeout(MQTT_SOCKET_TIMEOUT_SEC);
 
   WiFi.mode(WIFI_STA);
 
   // Boot / wake: selalu coba WiFi (wake deep sleep juga butuh MQTT)
   showConnLcd(fromDeepSleep ? "Wake WiFi" : "Connecting WiFi", wifiSsid);
   wifiBeginCurrent();
   uint32_t bootWifiStart = millis();
   bool bootWifiOk = false;
   while ((millis() - bootWifiStart) < BOOT_WIFI_TIMEOUT_MS) {
     if (WiFi.status() == WL_CONNECTED) {
       bootWifiOk = true;
       break;
     }
     delay(200);
     uint32_t elapsed = millis() - bootWifiStart;
     uint32_t remaining = (BOOT_WIFI_TIMEOUT_MS > elapsed) ? ((BOOT_WIFI_TIMEOUT_MS - elapsed) / 1000) : 0;
     char countLine[17];
     snprintf(countLine, sizeof(countLine), "%.10s %luds", wifiSsid, (unsigned long)remaining);
     showConnLcd(fromDeepSleep ? "Wake WiFi" : "Connecting WiFi", countLine);
   }
   if (bootWifiOk) {
     wifiWasOk = true;
     wifiAllFailed = false;
     wifiPhase = WP_PRIMARY;
     wifiDownSinceMs = 0;
     configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
     showConnLcd("WiFi OK!", WiFi.localIP().toString().c_str());
     delay(600);
   } else {
     showConnLcd("WiFi Retry", DEFAULT_WIFI_SSID);
     delay(500);
   }
 
   if (WiFi.status() != WL_CONNECTED) {
     wifiResetCycle();
   }
   lastTickMs = millis();
   lastPageAutoMs = millis();
   offSinceMs = 0;
 }
 
 void loop() {
   uint32_t now = millis();
   if (wifiCredsDirty) {
     wifiCredsDirty = false;
     wifiAllFailed = false;
     wifiBeginCurrent();
   }
 
   if (mqttNeedsReconnect) {
     mqttNeedsReconnect = false;
     if (mqtt.connected()) {
       mqtt.disconnect();
     }
   }
 
   ensureWifi();
   if (WiFi.status() == WL_CONNECTED) {
     if (!mqtt.connected()) {
       ensureMqtt();
     } else {
       mqtt.loop();
     }
     checkWibMidnight();
   }
 
   // Reboot hanya jika semua WiFi sudah gagal lama (failover masih jalan → jangan restart)
   bool fullyOnline = (WiFi.status() == WL_CONNECTED) && mqtt.connected();
   if (fullyOnline || !wifiAllFailed) {
     offlineSinceMs = 0;
   } else {
     if (offlineSinceMs == 0) offlineSinceMs = now;
     if ((now - offlineSinceMs) >= RECOVERY_REBOOT_MS) {
       saveCounters(true);
       delay(120);
       ESP.restart();
     }
   }
 
   // Service MQTT sering (keepalive + inbound cmd) — hindari blocking lama tanpa loop
   if (mqtt.connected()) {
     mqtt.loop();
   }
 
   if (now - lastPzemMs >= PZEM_MS) {
     lastPzemMs = now;
     readPzem();
     tickTimers();
     if (mqtt.connected()) mqtt.loop();
 
     // Deep sleep: OFF terus ≥ 2 jam → wajib MQTT dulu
     if (opStatus == ST_OFF) {
       if (offSinceMs == 0) offSinceMs = now;
       else if ((now - offSinceMs) >= OFF_BEFORE_SLEEP_MS && !dsWakeWatch) {
         tryEnterDeepSleepWithMqtt("off_2h", true);
       }
     } else {
       offSinceMs = 0;
     }
   }
 
   serviceDeepSleepLogic();
 
   // Simpan berkala (juga saat offline)
   if (countersDirty) saveCounters(false);
 
   if (mqtt.connected() && (now - lastTelemetryMs >= TELEMETRY_MS)) {
     lastTelemetryMs = now;
     publishTelemetry();
     mqtt.loop();
   }
 
   if (mqtt.connected() && (now - lastStatusMs >= STATUS_MS)) {
     lastStatusMs = now;
     if (pzemOk) publishStatus("ok", "ESP-C6+PZEM sehat", true);
     else publishStatus("sensor_fail", "ESP online, PZEM gagal", false);
     mqtt.loop();
   }
 
   handleButtons();
 
   if (!lcdManualHold && (now - lastPageAutoMs >= lcdAutoMs)) {
     lastPageAutoMs = now;
     lcdPage = (LcdPage)((lcdPage + 1) % lcdSlideCount());
     lcdScrollPos = 0;
   }
   if (lcdManualHold && (now - lastPageAutoMs >= 12000)) lcdManualHold = false;
 
   if (now - lastLcdMs >= LCD_MS) {
     lastLcdMs = now;
     renderLcd();
   }
 }
 
/**
 * ESP32-C6 SuperMini + PZEM-004T v4 + LCD I2C 16x2
 * Zigbee Router Node — port dari esp32c6_pzem_lcd_mqtt (WiFi/MQTT → Zigbee)
 *
 * Tools:
 *   Board: ESP32C6 Dev Module
 *   Zigbee Mode: Zigbee ZCZR (coordinator/router)
 *   Partition Scheme: Custom  ← pakai partitions.csv di folder ini (app ~2MB)
 *   Core Debug Level: None
 *
 * Library wajib: PZEM004Tv30, LiquidCrystal_I2C
 *          Preferences (built-in ESP32) untuk NVS
 */

#ifndef ZIGBEE_MODE_ZCZR
#error "Tools → Zigbee Mode → Zigbee ZCZR"
#endif

#include <Arduino.h>
#include <string.h>
#include <PZEM004Tv30.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Preferences.h>
#include "Zigbee.h"
#include "zb_protocol.h"
#include "ZigbeeGistexEP.h"

// ===================== CONFIG (default flash; bisa diubah dashboard → NVS) =====================
static const char *DEFAULT_MACHINE_CODE = "JUKI0002";
static const char *DEFAULT_DEVICE_UID = "0002";
/** true = wajib login operator; false = KPI jalan tanpa login (default firmware) */
static const bool DEFAULT_LOGIN_REQUIRED = false;
/** Bump saat ganti DEFAULT_LOGIN_REQUIRED agar NVS sysOn ikut reset */
static const uint8_t LOGIN_DEFAULT_REV = 2;
static const char *SENSOR_NAME = "pzem";

// Runtime identity (dinamis dari Zigbee CMD / NVS)
char machineCode[24];
char deviceUid[24];

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
static const uint32_t TELEMETRY_MS = 2000;   // 2 dtk — kurangi flood ke stack Zigbee
static const uint32_t ZB_SEND_FAIL_MAX = 80; // threshold LCD (bukan 30 — lock sibuk ≠ putus)
static const uint32_t STATUS_MS = 5000;
static const uint32_t LCD_MS = 250;
static const uint32_t LCD_PAGE_AUTO_MS = 4000;  // 4 dtk per slide
static const uint32_t LCD_SCROLL_MS = 350;
static const uint32_t BTN_DEBOUNCE_MS = 40;
static const uint32_t BTN_LONG_MS = 2000;
static const uint32_t NVS_SAVE_MS = 10000;  // simpan flash max tiap 10 dtk (hemat wear)
static const uint32_t RECOVERY_REJOIN_MS = 3 * 60 * 1000UL;   // 3 mnt gagal join → factoryReset (bukan reboot)
static const uint32_t ORPHAN_REJOIN_MS = 90 * 1000UL;        // connected tapi tak ada RX Coord → factoryReset
static const uint32_t REJOIN_RATE_MS = 15 * 60 * 1000UL;      // max 3x factoryReset per 15 mnt
static const uint8_t REJOIN_RATE_MAX = 3;
static const uint32_t HELLO_MS = 4000UL;
static const int8_t ZB_TX_POWER_DBM = 20;
static const uint32_t BTN_ZB_RESET_MS = 5000;  // tahan PAGE 5 dtk = Zigbee factory reset

// Threshold deteksi — disinkron dari dashboard via Zigbee set_calibration
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

// YMD dari Coordinator (ZB_MSG_TIME) — tanpa NTP lokal
int syncedWibYmd = -1;
bool timeOk = false;
// ==================================================

HardwareSerial PZEM_UART(1);
PZEM004Tv30 pzem(PZEM_UART, PZEM_RX_PIN, PZEM_TX_PIN);
LiquidCrystal_I2C lcd(LCD_ADDR, 16, 2);
Preferences prefs;
ZigbeeGistexEP zbEp(ZB_EP);

enum OpStatus : uint8_t { ST_OFF = 0, ST_IDLE = 1, ST_RUNNING = 2 };
enum LcdPage : uint8_t {
  PAGE_RUNLOSS = 0,      // Slide 1: Loss / Runn
  PAGE_IDENTITY = 1,     // Slide 2: Operator / proses
  PAGE_OFFIDLE = 2,      // Slide 3: OFF / IDLE
  PAGE_VI = 3,           // Slide 4: Voltage / Current
  PAGE_NODE_ACTIVE = 4,  // Slide 5: NODES ACTIVE + UID
  PAGE_COUNT = 5
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
uint16_t zbFailCount = 0;

bool zbWasOk = false;
bool zbCoordSynced = false;  // sudah terima frame dari Coordinator
char lastState[24] = "boot";
uint8_t zbSeq = 0;

uint32_t lastHelloMs = 0;
uint32_t lastCoordRxMs = 0;   // terakhir terima frame dari Coordinator
uint32_t zbConnectedSinceMs = 0;  // mulai connected (grace sebelum orphan)
uint16_t zbSendFail = 0;      // gagal kirim ke Coord beruntun
uint32_t lastPzemMs = 0;
uint32_t lastTelemetryMs = 0;
uint32_t lastStatusMs = 0;
uint32_t lastLcdMs = 0;
uint32_t lastPageAutoMs = 0;
uint32_t offlineSinceMs = 0;

bool btnPagePrev = true;
bool btnResetPrev = true;
uint32_t btnPageDownMs = 0;
uint32_t btnResetDownMs = 0;

void publishTelemetry();
void publishStatus(const char *state, const char *detail, bool sensorOk);
void publishAck(const char *command, bool ok);
void publishConfigAck(const char *cmd);
void saveCounters(bool force);
void loadCalibration();
void saveCalibration();
void loadLoginState();
void saveLoginState();
void setOperatorLoggedIn(bool ok, bool flashAck);
void clearOperatorLogin(const char *reason);
void loadIdentity();
void saveIdentity();
void applyIdentity(const char *code, const char *uid);
void applyStatusFilter(OpStatus raw);
void renderLcd();
void sendHello();
void onZbCmd(const ZbCmdPayload *p);
void handleZbTime(const ZbTimePayload *p);

int wibYmdNow() {
  // ponytail: YMD dari Coordinator TIME, bukan NTP lokal
  return syncedWibYmd;
}

void loadIdentity() {
  strncpy(machineCode, DEFAULT_MACHINE_CODE, sizeof(machineCode) - 1);
  strncpy(deviceUid, DEFAULT_DEVICE_UID, sizeof(deviceUid) - 1);
  machineCode[sizeof(machineCode) - 1] = 0;
  deviceUid[sizeof(deviceUid) - 1] = 0;

  char tmp[48];
  prefs.begin("pzemid", true);
  if (prefs.getString("code", tmp, sizeof(tmp)) > 0) {
    strncpy(machineCode, tmp, sizeof(machineCode) - 1);
    machineCode[sizeof(machineCode) - 1] = 0;
  }
  if (prefs.getString("uid", tmp, sizeof(tmp)) > 0) {
    strncpy(deviceUid, tmp, sizeof(deviceUid) - 1);
    deviceUid[sizeof(deviceUid) - 1] = 0;
  }
  prefs.end();
}

void saveIdentity() {
  prefs.begin("pzemid", false);
  prefs.putString("code", machineCode);
  prefs.putString("uid", deviceUid);
  prefs.end();
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
  saveIdentity();
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
  (void)reason;
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
  if (ok && loginWibYmd < 0) loginWibYmd = 0;  // TIME belum: tetap tandai login sampai midnight check
  if (!ok) lcdOperator[0] = 0;
  saveLoginState();
}

void applyStatusFilter(OpStatus raw) {
  uint32_t now = millis();
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
  uint8_t LT[8]  = {0b00111, 0b01111, 0b11111, 0b11111, 0b11111, 0b11111, 0b11111, 0b11111};
  uint8_t UB[8]  = {0b11111, 0b11111, 0b11111, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000};
  uint8_t RT[8]  = {0b11100, 0b11110, 0b11111, 0b11111, 0b11111, 0b11111, 0b11111, 0b11111};
  uint8_t LL[8]  = {0b11111, 0b11111, 0b11111, 0b11111, 0b11111, 0b01111, 0b00111, 0b00000};
  uint8_t LB[8]  = {0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b11111, 0b11111, 0b11111};
  uint8_t LR[8]  = {0b11111, 0b11111, 0b11111, 0b11111, 0b11111, 0b11110, 0b11100, 0b00000};
  uint8_t UMB[8] = {0b11111, 0b11111, 0b11111, 0b00000, 0b00000, 0b00000, 0b11111, 0b11111};
  uint8_t LMB[8] = {0b11111, 0b00000, 0b00000, 0b00000, 0b00000, 0b11111, 0b11111, 0b11111};
  lcd.createChar(0, LT);
  lcd.createChar(1, UB);
  lcd.createChar(2, RT);
  lcd.createChar(3, LL);
  lcd.createChar(4, LB);
  lcd.createChar(5, LR);
  lcd.createChar(6, UMB);
  lcd.createChar(7, LMB);
}

/** Gambar satu digit 0–9, lebar 3 kolom × 2 baris, di kolom `col`. */
void lcdDrawBigDigit(uint8_t col, char ch) {
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
 * Splash UID besar di boot (sebelum Zigbee join).
 * Sumber: deviceUid setelah loadIdentity() — ikut DEFAULT_DEVICE_UID saat flash.
 */
void showUidSplashLcd(uint32_t ms) {
  lcd.clear();
  lcdLoadBigDigitChars();

  char digits[5];
  int n = 0;
  for (int i = 0; deviceUid[i] && n < 4; i++) {
    if (deviceUid[i] >= '0' && deviceUid[i] <= '9') digits[n++] = deviceUid[i];
  }
  digits[n] = 0;
  if (n == 0) {
    lcdPrint2("UID", deviceUid[0] ? deviceUid : "?");
    delay(ms);
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

/** Status koneksi Zigbee di LCD (boot & reconnect). */
void showConnLcd(const char *title, const char *detail) {
  char a[17], b[17];
  snprintf(a, sizeof(a), "%.16s", title && title[0] ? title : "Connecting...");
  snprintf(b, sizeof(b), "%.16s", detail && detail[0] ? detail : " ");
  lcdPrint2(a, b);
}

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

static bool coordLinkOk() {
  if (!Zigbee.connected()) return false;
  // ponytail: ACTIVE hanya jika benar-benar pernah RX dari Coordinator
  return lastCoordRxMs > 0 && (millis() - lastCoordRxMs) <= ORPHAN_REJOIN_MS;
}

static bool coordLinkStale() {
  if (!Zigbee.connected()) return false;
  if (lastCoordRxMs > 0) return (millis() - lastCoordRxMs) > ORPHAN_REJOIN_MS;
  return zbConnectedSinceMs > 0 && (millis() - zbConnectedSinceMs) > ORPHAN_REJOIN_MS;
}

void renderLcd() {
  char a[17], b[17];
  snprintf(b, sizeof(b), "-- UID %s --", deviceUid[0] ? deviceUid : "----");
  if (!Zigbee.connected()) {
    snprintf(a, sizeof(a), "MENUNGGU JOIN");
  } else if (!coordLinkOk() && zbConnectedSinceMs > 0 &&
             (millis() - zbConnectedSinceMs) > 15000UL) {
    snprintf(a, sizeof(a), "SALAH JARINGAN");
  } else if (coordLinkOk()) {
    snprintf(a, sizeof(a), "NODES ACTIVE");
  } else if (lastCoordRxMs > 0 && zbSendFail >= ZB_SEND_FAIL_MAX &&
             (millis() - lastCoordRxMs) > 45000UL) {
    snprintf(a, sizeof(a), "KIRIM GAGAL");
  } else if (Zigbee.connected()) {
    snprintf(a, sizeof(a), "MENUNGGU COORD");
  } else {
    snprintf(a, sizeof(a), "TIDAK AKTIF");
  }
  lcdPrint2(a, b);
}

static bool zbSend(const uint8_t *data, uint16_t len) {
  bool ok = zbEp.sendToCoordinator(data, len);
  if (ok) zbSendFail = 0;
  else if (zbSendFail < 60000) zbSendFail++;
  return ok;
}

// ---------- Zigbee publish ----------
void publishStatus(const char *state, const char *detail, bool sensorOk) {
  if (!Zigbee.connected()) return;
  ZbStatusFrame fr;
  memset(&fr, 0, sizeof(fr));
  zb_hdr_fill(&fr.hdr, ZB_MSG_STATUS, ++zbSeq, deviceUid, sizeof(ZbStatusPayload));
  zb_str_copy(fr.p.machine_code, sizeof(fr.p.machine_code), machineCode);
  zb_str_copy(fr.p.state, sizeof(fr.p.state), state);
  zb_str_copy(fr.p.detail, sizeof(fr.p.detail), detail);
  fr.p.online = 1;
  fr.p.sensor_ok = sensorOk ? 1 : 0;
  fr.p.op_status = (uint8_t)opStatus;
  fr.p.run_sec = runSec;
  fr.p.loss_sec = lossSec;
  fr.p.off_sec = offSec;
  fr.p.lqi = 0;
  if (zbSend((const uint8_t *)&fr, sizeof(fr)) && strcmp(lastState, state) != 0) {
    strncpy(lastState, state, sizeof(lastState) - 1);
    lastState[sizeof(lastState) - 1] = 0;
  }
}

void publishAck(const char *command, bool ok) {
  if (!Zigbee.connected()) return;
  ZbAckFrame fr;
  memset(&fr, 0, sizeof(fr));
  zb_hdr_fill(&fr.hdr, ZB_MSG_ACK, ++zbSeq, deviceUid, sizeof(ZbAckPayload));
  zb_str_copy(fr.p.machine_code, sizeof(fr.p.machine_code), machineCode);
  zb_str_copy(fr.p.command, sizeof(fr.p.command), command);
  fr.p.ok = ok ? 1 : 0;
  fr.p.current_threshold_a = currentThresholdA;
  fr.p.power_threshold_w = powerThresholdW;
  fr.p.run_sec = runSec;
  fr.p.loss_sec = lossSec;
  fr.p.off_sec = offSec;
  zbSend((const uint8_t *)&fr, sizeof(fr));
}

void publishConfigAck(const char *cmd) {
  publishAck(cmd, true);
}

void publishTelemetry() {
  if (!Zigbee.connected()) return;
  ZbTelFrame fr;
  memset(&fr, 0, sizeof(fr));
  zb_hdr_fill(&fr.hdr, ZB_MSG_TEL, ++zbSeq, deviceUid, sizeof(ZbTelPayload));
  zb_str_copy(fr.p.machine_code, sizeof(fr.p.machine_code), machineCode);
  fr.p.voltage_v = lastV;
  fr.p.current_a = lastA;
  fr.p.power_w = lastW;
  fr.p.energy_kwh = lastE;
  fr.p.frequency_hz = lastHz;
  fr.p.power_factor = lastPf;
  fr.p.op_status = (uint8_t)opStatus;
  fr.p.pzem_ok = pzemOk ? 1 : 0;
  fr.p.run_sec = runSec;
  fr.p.loss_sec = lossSec;
  fr.p.off_sec = offSec;
  fr.p.current_threshold_a = currentThresholdA;
  fr.p.fail_count = pzemFailCount;
  zbSend((const uint8_t *)&fr, sizeof(fr));
}

void sendHello() {
  if (!Zigbee.connected()) return;
  ZbHelloFrame fr;
  memset(&fr, 0, sizeof(fr));
  zb_hdr_fill(&fr.hdr, ZB_MSG_HELLO, ++zbSeq, deviceUid, sizeof(ZbHelloPayload));
  zb_str_copy(fr.p.machine_code, sizeof(fr.p.machine_code), machineCode);
  zb_str_copy(fr.p.device_uid, sizeof(fr.p.device_uid), deviceUid);
  zbSend((const uint8_t *)&fr, sizeof(fr));
}

static const char *zbCmdName(uint8_t cmd) {
  switch (cmd) {
    case ZB_CMD_SET_IDENTITY: return "set_identity";
    case ZB_CMD_SET_CALIBRATION: return "set_calibration";
    case ZB_CMD_SET_DISPLAY: return "set_display";
    case ZB_CMD_SYNC_KPI: return "sync_kpi";
    case ZB_CMD_RESET_DAY: return "reset_day";
    case ZB_CMD_PING: return "ping";
    case ZB_CMD_LCD_PAGE: return "lcd_page";
    case ZB_CMD_GET_CONFIG: return "get_config";
    case ZB_CMD_LOGIN_SUCCESS: return "login_success";
    case ZB_CMD_DATA_SAVED: return "data_saved";
    case ZB_CMD_SET_LOGIN_SYSTEM: return "set_login_system";
    case ZB_CMD_LOGIN_STATUS: return "login_status";
    case ZB_CMD_REBOOT: return "reboot";
    default: return "nop";
  }
}

void onZbCmd(const ZbCmdPayload *p) {
  if (!p) return;
  uint8_t cmd = p->cmd;

  if (cmd == ZB_CMD_SET_IDENTITY) {
    applyIdentity(p->machine_code[0] ? p->machine_code : nullptr,
                  p->device_uid[0] ? p->device_uid : nullptr);
    if (p->machine_name[0]) {
      strncpy(lcdName, p->machine_name, sizeof(lcdName) - 1);
      lcdName[sizeof(lcdName) - 1] = '\0';
    }
    if (p->process_name[0]) {
      strncpy(lcdProcess, p->process_name, sizeof(lcdProcess) - 1);
      lcdProcess[sizeof(lcdProcess) - 1] = '\0';
    }
    if (p->current_threshold_a >= 0.005f && p->current_threshold_a <= 50.0f)
      currentThresholdA = p->current_threshold_a;
    // ponytail: 0 = field kosong dari memset CMD; nilai off valid biasanya > 0
    if (p->off_current_a > 0.0f && p->off_current_a <= 5.0f)
      offCurrentA = p->off_current_a;
    if (p->power_threshold_w > 0.0f && p->power_threshold_w <= 5000.0f)
      powerThresholdW = p->power_threshold_w;
    if (p->filter_aktif_ms >= 50 && p->filter_aktif_ms <= 60000)
      filterAktifMs = p->filter_aktif_ms;
    if (p->filter_diam_ms >= 50 && p->filter_diam_ms <= 60000)
      filterDiamMs = p->filter_diam_ms;
    if (p->lcd_auto_ms >= 4000 && p->lcd_auto_ms <= 60000)
      lcdAutoMs = p->lcd_auto_ms;
    if (p->flags & 0x04) kpiFromBackend = true;
    saveCalibration();
    renderLcd();
    publishConfigAck(zbCmdName(cmd));
  } else if (cmd == ZB_CMD_SET_CALIBRATION) {
    if (p->current_threshold_a >= 0.005f && p->current_threshold_a <= 50.0f)
      currentThresholdA = p->current_threshold_a;
    if (p->off_current_a >= 0.0f && p->off_current_a <= 5.0f)
      offCurrentA = p->off_current_a;
    if (p->power_threshold_w >= 0.0f && p->power_threshold_w <= 5000.0f)
      powerThresholdW = p->power_threshold_w;
    if (p->voltage_on_v >= 50.0f && p->voltage_on_v <= 300.0f)
      voltageOnV = p->voltage_on_v;
    if (p->filter_aktif_ms >= 50 && p->filter_aktif_ms <= 60000)
      filterAktifMs = p->filter_aktif_ms;
    if (p->filter_diam_ms >= 50 && p->filter_diam_ms <= 60000)
      filterDiamMs = p->filter_diam_ms;
    saveCalibration();
    publishAck(zbCmdName(cmd), true);
  } else if (cmd == ZB_CMD_SET_DISPLAY) {
    if (p->machine_name[0]) {
      strncpy(lcdName, p->machine_name, sizeof(lcdName) - 1);
      lcdName[sizeof(lcdName) - 1] = '\0';
    }
    if (p->process_name[0]) {
      strncpy(lcdProcess, p->process_name, sizeof(lcdProcess) - 1);
      lcdProcess[sizeof(lcdProcess) - 1] = '\0';
    }
    if (p->operator_name[0]) {
      strncpy(lcdOperator, p->operator_name, sizeof(lcdOperator) - 1);
      lcdOperator[sizeof(lcdOperator) - 1] = '\0';
    }
    if (p->lcd_auto_ms >= 4000 && p->lcd_auto_ms <= 60000)
      lcdAutoMs = p->lcd_auto_ms;
    saveCalibration();
    renderLcd();
    publishAck(zbCmdName(cmd), true);
  } else if (cmd == ZB_CMD_SYNC_KPI) {
    if (p->flags & 0x04) {
      kpiFromBackend = true;
      runSec = p->run_sec;
      lossSec = p->loss_sec;
      offSec = p->off_sec;
      saveCounters(true);
    } else {
      kpiFromBackend = false;
    }
    saveCalibration();
    renderLcd();
    publishAck(zbCmdName(cmd), true);
    publishTelemetry();
  } else if (cmd == ZB_CMD_RESET_DAY) {
    resetDayCounters("zb_cmd");
    publishAck(zbCmdName(cmd), true);
    publishTelemetry();
    publishStatus("ok", "day counters reset via Zigbee", pzemOk);
  } else if (cmd == ZB_CMD_PING) {
    publishAck(zbCmdName(cmd), true);
  } else if (cmd == ZB_CMD_LCD_PAGE) {
    lcdPage = (LcdPage)((lcdPage + 1) % lcdSlideCount());
    lcdScrollPos = 0;
    lcdManualHold = true;
    lastPageAutoMs = millis();
    renderLcd();
    publishAck(zbCmdName(cmd), true);
  } else if (cmd == ZB_CMD_GET_CONFIG) {
    publishConfigAck(zbCmdName(cmd));
  } else if (cmd == ZB_CMD_LOGIN_SUCCESS) {
    setOperatorLoggedIn(true, true);
    const char *msg = p->message[0] ? p->message : "Login Sukses";
    snprintf(lcdLoginLine1, sizeof(lcdLoginLine1), "%.16s", msg);
    if (p->operator_name[0]) {
      snprintf(lcdLoginLine2, sizeof(lcdLoginLine2), "%.16s", p->operator_name);
      strncpy(lcdOperator, p->operator_name, sizeof(lcdOperator) - 1);
      lcdOperator[sizeof(lcdOperator) - 1] = 0;
    } else {
      snprintf(lcdLoginLine2, sizeof(lcdLoginLine2), " ");
    }
    loginFlashUntilMs = millis() + 5000;
    renderLcd();
    publishAck(zbCmdName(cmd), true);
  } else if (cmd == ZB_CMD_DATA_SAVED) {
    const char *msg = p->message[0] ? p->message : "Data Tersimpan";
    char line2[17];
    snprintf(line2, sizeof(line2), "UID %s", deviceUid);
    flashLcdMsg(msg, line2);
    publishAck(zbCmdName(cmd), true);
  } else if (cmd == ZB_CMD_SET_LOGIN_SYSTEM) {
    loginSystemOn = (p->flags & 0x01) != 0;
    if (!loginSystemOn) {
      operatorLoggedIn = true;
      int ymd = wibYmdNow();
      loginWibYmd = ymd > 0 ? ymd : 0;
    } else {
      clearOperatorLogin("login_system_on");
    }
    saveLoginState();
    const char *msg = p->message[0] ? p->message
      : (loginSystemOn ? "System Login Di Aktifkan" : "System Login Non-Aktifkan");
    flashLcdScrollMsg(msg, " ");
    publishAck(zbCmdName(cmd), true);
  } else if (cmd == ZB_CMD_LOGIN_STATUS) {
    loginSystemOn = (p->flags & 0x01) != 0;
    bool ok = (p->flags & 0x02) != 0;
    if (!loginSystemOn) ok = true;
    setOperatorLoggedIn(ok, false);
    saveLoginState();
    if (ok && p->operator_name[0]) {
      snprintf(lcdLoginLine2, sizeof(lcdLoginLine2), "%.16s", p->operator_name);
      strncpy(lcdOperator, p->operator_name, sizeof(lcdOperator) - 1);
      lcdOperator[sizeof(lcdOperator) - 1] = 0;
    }
    renderLcd();
    publishAck(zbCmdName(cmd), true);
  } else if (cmd == ZB_CMD_REBOOT) {
    publishAck(zbCmdName(cmd), true);
    delay(200);
    ESP.restart();
  }
}

void handleZbTime(const ZbTimePayload *p) {
  if (!p) return;
  if (p->ymd > 0) {
    syncedWibYmd = p->ymd;
    timeOk = true;
  }

  // Login NVS dari hari lain → anggap belum login
  int ymd = syncedWibYmd;
  if (ymd > 0) {
    if (operatorLoggedIn && loginWibYmd > 0 && loginWibYmd != ymd) {
      clearOperatorLogin("ymd_mismatch");
    }
    if (operatorLoggedIn && loginWibYmd <= 0) {
      loginWibYmd = ymd;
      saveLoginState();
    }
  }

  if (p->midnight) {
    if (ymd > 0) {
      if (lastWibYmd > 0 && ymd != lastWibYmd) {
        publishStatus("day_cut", "WIB midnight / hari baru - reset counter", pzemOk);
      }
      lastWibYmd = ymd;
    }
    resetDayCounters("wib_midnight");
    if (Zigbee.connected()) publishTelemetry();
    return;
  }

  if (ymd > 0 && lastWibYmd < 0) {
    lastWibYmd = ymd;
    saveCounters(true);
  } else if (ymd > 0 && ymd != lastWibYmd) {
    publishStatus("day_cut", "WIB midnight / hari baru - reset counter", pzemOk);
    lastWibYmd = ymd;
    resetDayCounters("wib_midnight");
    if (Zigbee.connected()) publishTelemetry();
  }
}

void zbOnFirstCoordRx() {
  if (zbCoordSynced) return;
  zbCoordSynced = true;
  Serial.println(F("[ZB] Coordinator RX OK — sync telemetry"));
  for (int i = 0; i < 3; i++) {
    sendHello();
    delay(60);
  }
  lastHelloMs = millis();
  publishAck("boot", true);
  publishTelemetry();
  publishStatus("resync", "Coordinator RX — sync Run/Loss", pzemOk);
  renderLcd();
}

void onZbRx(const uint8_t *data, uint16_t len, uint16_t src_short, uint8_t src_ep) {
  (void)src_short;
  (void)src_ep;
  if (!data || len < sizeof(ZbHdr)) return;
  const ZbHdr *h = (const ZbHdr *)data;
  if (!zb_hdr_ok(h)) return;

  // Ada RX dari Coord → link mesh benar (bukan jaringan orphan setelah flash)
  lastCoordRxMs = millis();
  zbSendFail = 0;
  zbClearRejoinRate();
  zbOnFirstCoordRx();

  // Filter UID: kosong / "*" / match deviceUid
  if (h->uid[0] && h->uid[0] != '*' && strncmp(h->uid, deviceUid, sizeof(h->uid)) != 0) {
    return;
  }

  if (h->type == ZB_MSG_CMD && len >= sizeof(ZbCmdFrame)) {
    onZbCmd(&((const ZbCmdFrame *)data)->p);
    return;
  }
  if (h->type == ZB_MSG_TIME && len >= sizeof(ZbTimeFrame)) {
    handleZbTime(&((const ZbTimeFrame *)data)->p);
    return;
  }
}

/** Hapus NVS Zigbee → join ulang ke Coordinator baru (setelah flash Coord). */
void zbFactoryRejoin(const char *reason) {
  Serial.printf("[ZB] factoryReset (%s) — rejoin mesh\n", reason ? reason : "?");
  lcdPrint2("ZB REJOIN...", deviceUid);
  saveCounters(true);
  delay(200);
  Zigbee.factoryReset();  // reboot
}

/** Reset counter setelah join benar-benar OK (ada RX dari Coordinator). */
void zbClearRejoinRate() {
  prefs.begin("pzemzb", false);
  prefs.putUInt("frN", 0);
  prefs.putUInt("frW", 0);
  prefs.end();
}

/**
 * factoryReset dengan rate-limit — hindari loop reboot tanpa henti
 * jika Coordinator mati / WiFi MQTT macet.
 */
void maybeFactoryRejoin(const char *reason) {
  prefs.begin("pzemzb", false);
  uint32_t cnt = prefs.getUInt("frN", 0);
  uint32_t winMs = prefs.getUInt("frW", 0);
  uint32_t now = millis();
  if (winMs == 0 || (now - winMs) > REJOIN_RATE_MS) {
    cnt = 0;
    winMs = now;
    prefs.putUInt("frW", winMs);
  }
  if (cnt >= REJOIN_RATE_MAX) {
    prefs.end();
    Serial.printf("[ZB] skip factoryReset (%s) — limit %u/%u, cek Coordinator\n",
                  reason ? reason : "?", cnt, REJOIN_RATE_MAX);
    lcdPrint2("TIDAK AKTIF", "Cek Coordinator");
    return;
  }
  prefs.putUInt("frN", cnt + 1);
  prefs.putUInt("frW", winMs);
  prefs.end();
  zbFactoryRejoin(reason);
}

bool ensureZigbee() {
  if (Zigbee.connected()) {
    if (!zbWasOk) {
      zbWasOk = true;
      zbFailCount = 0;
      zbSendFail = 0;
      zbCoordSynced = false;
      zbConnectedSinceMs = millis();
      lastCoordRxMs = 0;
      esp_zb_set_tx_power(ZB_TX_POWER_DBM);
      for (int i = 0; i < 5; i++) {
        sendHello();
        delay(120);
      }
      lastHelloMs = millis();
      renderLcd();
    } else if (coordLinkStale()) {
      // Connected tapi bukan jaringan Coordinator aktif (setelah flash Coord)
      maybeFactoryRejoin("orphan_no_coord_rx");
    }
    return true;
  }
  if (zbWasOk) {
    saveCounters(true);
    zbWasOk = false;
    zbCoordSynced = false;
    lastCoordRxMs = 0;
    zbConnectedSinceMs = 0;
    renderLcd();
  }
  zbFailCount++;
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

  // Mode backend: angka Run/Loss dari sync Zigbee, jangan naikkan lokal
  if (kpiFromBackend) return;

  switch (opStatus) {
    case ST_RUNNING: runSec += dt; break;
    case ST_IDLE: lossSec += dt; break;
    default: offSec += dt; break;
  }
  markCountersDirty();
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

void handleButtons() {
  uint32_t now = millis();
  bool pageUp = digitalRead(BTN_PAGE) == HIGH;
  bool resetUp = digitalRead(BTN_RESET) == HIGH;

  if (!pageUp && btnPagePrev) btnPageDownMs = now;
  // Tahan PAGE 5 dtk → Zigbee factory reset (rejoin setelah flash Coordinator)
  if (!pageUp && btnPageDownMs > 0 && (now - btnPageDownMs) >= BTN_ZB_RESET_MS) {
    btnPageDownMs = 0;
    zbFactoryRejoin("btn_page_5s");
  }
  if (pageUp && !btnPagePrev && (now - btnPageDownMs) > BTN_DEBOUNCE_MS && btnPageDownMs > 0) {
    // short press: cycle page (mode clean LCD = no-op visual)
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
    btnResetDownMs = 0;
    lcdPage = PAGE_RUNLOSS;
    renderLcd();
  }
  if (resetUp) btnResetDownMs = 0;
  btnResetPrev = resetUp;
}

void setup() {
  delay(300);
  Serial.begin(115200);
  pinMode(BTN_PAGE, INPUT_PULLUP);
  pinMode(BTN_RESET, INPUT_PULLUP);

  loadIdentity();
  loadCounters();  // lanjutkan Run/Loss setelah restart
  loadCalibration();
  loadLoginState();

  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();
  // Boot pertama: UID besar 2 dtk (sebelum Zigbee)
  showUidSplashLcd(2000);
  {
    char t1[10], t2[10], line[17];
    fmtHms(runSec, t1, sizeof(t1));
    fmtHms(lossSec, t2, sizeof(t2));
    snprintf(line, sizeof(line), "R%s L%s", t1, t2);
    lcdPrint2("NVS restore", line);
  }
  delay(800);
  renderLcd();

  PZEM_UART.begin(9600, SERIAL_8N1, PZEM_RX_PIN, PZEM_TX_PIN);
  delay(400);

  Zigbee.setPrimaryChannelMask(ESP_ZB_TRANSCEIVER_ALL_CHANNELS_MASK);
  zbEp.setManufacturerAndModel("Gistex", "PZEM-ZB-RTR");
  zbEp.allowMultipleBinding(true);
  zbEp.onGistexRx(onZbRx);
  Zigbee.addEndpoint(&zbEp);

  if (!Zigbee.begin(ZIGBEE_ROUTER)) {
    delay(1000);
    ESP.restart();
  }
  esp_zb_set_tx_power(ZB_TX_POWER_DBM);

  uint32_t t0 = millis();
  while (!Zigbee.connected() && (millis() - t0) < 90000UL) {
    renderLcd();
    delay(200);
  }
  if (!Zigbee.connected()) {
    // ponytail: reboot biasa TIDAK hapus NVS Zigbee lama — wajib factoryReset
    maybeFactoryRejoin("boot_join_timeout");
  }
  if (Zigbee.connected()) {
    zbWasOk = true;
    zbCoordSynced = false;
    zbConnectedSinceMs = millis();
    lastCoordRxMs = 0;
    esp_zb_set_tx_power(ZB_TX_POWER_DBM);
    for (int i = 0; i < 5; i++) {
      sendHello();
      delay(150);
    }
    lastHelloMs = millis();
    // Telemetry/status ditunda sampai RX Coordinator (zbOnFirstCoordRx)
  }
  renderLcd();

  lastTickMs = millis();
  lastPageAutoMs = millis();
}

void loop() {
  uint32_t now = millis();

  ensureZigbee();

  bool fullyOnline = Zigbee.connected();
  if (fullyOnline) {
    offlineSinceMs = 0;
  } else {
    if (offlineSinceMs == 0) offlineSinceMs = now;
    if ((now - offlineSinceMs) >= RECOVERY_REJOIN_MS) {
      offlineSinceMs = now;  // cegah spam tiap loop
      maybeFactoryRejoin("offline_recovery");
    }
  }

  if (now - lastPzemMs >= PZEM_MS) {
    lastPzemMs = now;
    readPzem();
    tickTimers();
  }

  if (countersDirty) saveCounters(false);

  if (zbCoordSynced && Zigbee.connected() && (now - lastTelemetryMs >= TELEMETRY_MS)) {
    lastTelemetryMs = now;
    publishTelemetry();
  }

  if (Zigbee.connected() && (now - lastHelloMs >= HELLO_MS)) {
    lastHelloMs = now;
    sendHello();
  }

  if (zbCoordSynced && Zigbee.connected() && (now - lastStatusMs >= STATUS_MS)) {
    lastStatusMs = now;
    if (pzemOk) publishStatus("ok", "ESP-C6+PZEM sehat", true);
    else publishStatus("sensor_fail", "ESP online, PZEM gagal", false);
  }

  handleButtons();

  if (now - lastLcdMs >= LCD_MS) {
    lastLcdMs = now;
    renderLcd();
  }
}

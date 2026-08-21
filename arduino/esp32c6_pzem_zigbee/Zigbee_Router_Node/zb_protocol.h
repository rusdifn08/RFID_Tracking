/**
 * zb_protocol.h — Paket biner shared Coordinator ↔ Router (Gistex PZEM)
 *
 * SERIALIZE / DESERIALIZE:
 *   Semua struct pakai packed (1-byte align). Kirim sebagai payload custom
 *   Zigbee cluster 0xFC10, command 0x01 (DATA).
 *
 * Alur:
 *   Router  --ZbTelFrame-->  Coordinator  --JSON MQTT-->  Broker
 *   Broker  --JSON MQTT-->  Coordinator  --ZbCmdFrame-->  Router
 *
 * Batas APS ~80B: TEL/STATUS muat 1 frame. CMD string panjang bisa 2 frag
 * (lihat ZbFragHdr) — v1 kirim 1 frame dengan string dipotong ke ukuran field.
 */
#pragma once
#include <stdint.h>
#include <string.h>

static const uint16_t ZB_MAGIC = 0x4754;  // 'GT'
static const uint8_t ZB_PROTO_VER = 1;
static const uint16_t ZB_CLUSTER_ID = 0xFC10;  // > 0xFC00 custom
static const uint8_t ZB_CMD_DATA = 0x01;
static const uint8_t ZB_EP = 10;

enum ZbMsgType : uint8_t {
  ZB_MSG_TEL = 1,       // Router → Coord: telemetry
  ZB_MSG_STATUS = 2,    // Router → Coord: status/LWT-like
  ZB_MSG_ACK = 3,       // Router → Coord: ack
  ZB_MSG_CMD = 10,      // Coord → Router: command
  ZB_MSG_TIME = 11,     // Coord → Router: NTP/YMD + midnight flag
  ZB_MSG_HELLO = 12,    // Router → Coord: join announce (uid/code)
};

enum ZbCmdId : uint8_t {
  ZB_CMD_NOP = 0,
  ZB_CMD_SET_IDENTITY = 1,
  ZB_CMD_SET_CALIBRATION = 2,
  ZB_CMD_SET_DISPLAY = 3,
  ZB_CMD_SYNC_KPI = 4,
  ZB_CMD_RESET_DAY = 5,
  ZB_CMD_PING = 6,
  ZB_CMD_LCD_PAGE = 7,
  ZB_CMD_GET_CONFIG = 8,
  ZB_CMD_LOGIN_SUCCESS = 9,
  ZB_CMD_DATA_SAVED = 10,
  ZB_CMD_SET_LOGIN_SYSTEM = 11,
  ZB_CMD_LOGIN_STATUS = 12,
  ZB_CMD_REBOOT = 13,
};

#pragma pack(push, 1)

/** Header 12 byte — selalu di depan setiap frame. */
typedef struct {
  uint16_t magic;     // ZB_MAGIC
  uint8_t ver;        // ZB_PROTO_VER
  uint8_t type;       // ZbMsgType
  uint8_t seq;
  char uid[8];        // device_uid, null-terminated, max 7 digit
  uint8_t payload_len;
} ZbHdr;  // 12 bytes

/** Telemetry Router→Coord (~68B + hdr = ~80B). */
typedef struct {
  char machine_code[12];
  float voltage_v;
  float current_a;
  float power_w;
  float energy_kwh;
  float frequency_hz;
  float power_factor;
  uint8_t op_status;   // 0=off 1=idle 2=running
  uint8_t pzem_ok;
  uint32_t run_sec;
  uint32_t loss_sec;
  uint32_t off_sec;
  float current_threshold_a;
  uint16_t fail_count;
} ZbTelPayload;

typedef struct {
  ZbHdr hdr;
  ZbTelPayload p;
} ZbTelFrame;

/** Status singkat Router→Coord. */
typedef struct {
  char machine_code[12];
  char state[12];      // ok / sensor_fail / day_cut / resync
  char detail[24];
  uint8_t online;
  uint8_t sensor_ok;
  uint8_t op_status;
  uint32_t run_sec;
  uint32_t loss_sec;
  uint32_t off_sec;
  uint8_t lqi;         // link quality Zigbee (0–255)
} ZbStatusPayload;

typedef struct {
  ZbHdr hdr;
  ZbStatusPayload p;
} ZbStatusFrame;

/** Hello saat join. */
typedef struct {
  char machine_code[12];
  char device_uid[8];
} ZbHelloPayload;

typedef struct {
  ZbHdr hdr;
  ZbHelloPayload p;
} ZbHelloFrame;

/**
 * Command Coord→Router — field string fixed (potong jika lebih panjang).
 * flags bit: 0=login_required 1=logged_in 2=kpi_from_backend
 */
typedef struct {
  uint8_t cmd;  // ZbCmdId
  uint8_t flags;
  char machine_code[12];
  char device_uid[8];
  char machine_name[24];
  char process_name[24];
  char operator_name[24];
  char message[28];
  float current_threshold_a;
  float off_current_a;
  float power_threshold_w;
  float voltage_on_v;
  uint32_t filter_aktif_ms;
  uint32_t filter_diam_ms;
  uint32_t lcd_auto_ms;
  uint32_t run_sec;
  uint32_t loss_sec;
  uint32_t off_sec;
  int32_t ymd;  // YYYYMMDD untuk TIME / login
} ZbCmdPayload;

typedef struct {
  ZbHdr hdr;
  ZbCmdPayload p;
} ZbCmdFrame;

/** TIME sync / midnight broadcast. */
typedef struct {
  int32_t ymd;          // YYYYMMDD WIB
  uint8_t midnight;     // 1 = trigger resetDayCounters
  int32_t epoch_wib;    // unix +7 approximate (optional)
} ZbTimePayload;

typedef struct {
  ZbHdr hdr;
  ZbTimePayload p;
} ZbTimeFrame;

/** ACK Router→Coord (untuk publish ke topic ack). */
typedef struct {
  char machine_code[12];
  char command[16];
  uint8_t ok;
  float current_threshold_a;
  float power_threshold_w;
  uint32_t run_sec;
  uint32_t loss_sec;
  uint32_t off_sec;
} ZbAckPayload;

typedef struct {
  ZbHdr hdr;
  ZbAckPayload p;
} ZbAckFrame;

#pragma pack(pop)

static inline void zb_hdr_fill(ZbHdr *h, uint8_t type, uint8_t seq, const char *uid, uint8_t plen) {
  h->magic = ZB_MAGIC;
  h->ver = ZB_PROTO_VER;
  h->type = type;
  h->seq = seq;
  memset(h->uid, 0, sizeof(h->uid));
  if (uid) strncpy(h->uid, uid, sizeof(h->uid) - 1);
  h->payload_len = plen;
}

static inline bool zb_hdr_ok(const ZbHdr *h) {
  return h && h->magic == ZB_MAGIC && h->ver == ZB_PROTO_VER;
}

static inline void zb_str_copy(char *dst, size_t n, const char *src) {
  if (!dst || n == 0) return;
  memset(dst, 0, n);
  if (src) strncpy(dst, src, n - 1);
}

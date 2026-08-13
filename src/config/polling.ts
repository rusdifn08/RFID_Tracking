/**
 * Konfigurasi interval polling API (satuan: detik) untuk dashboard.
 * Dipakai oleh Dashboard RFID dan komponen terkait (/wira, /monitoring/line, mqtt-login-success, mqtt-info, finishing).
 * Di kode, nilai detik dikalikan 1000 untuk refetchInterval/setInterval (ms).
 */

/** Polling data tracking /wira (QC, PQC, output) — default 5 detik */
export const POLLING_WIRA_SECONDS = 5;

/** Saat query /wira error, retry setelah sekian detik */
export const POLLING_WIRA_ERROR_RETRY_SECONDS = 15;

/** Polling data WO / monitoring/line (Data Line card) — default 5 detik */
export const POLLING_MONITORING_LINE_SECONDS = 5;

/** Saat query monitoring/line error, retry setelah sekian detik */
export const POLLING_MONITORING_LINE_ERROR_RETRY_SECONDS = 10;

/** Polling API mqtt-login-success (event login QC/PQC untuk LED) — default 1.5 detik */
export const POLLING_MQTT_LOGIN_SUCCESS_SECONDS = 5;

/** Polling API mqtt-info (event info MQTT) — default 1.5 detik */
export const POLLING_MQTT_INFO_SECONDS = 5;

/** Polling data finishing (Room Status: Dryroom, Folding, Reject Room) — default 30 detik */
export const POLLING_FINISHING_SECONDS = 30;

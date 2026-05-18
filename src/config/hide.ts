/**
 * Konfigurasi kartu yang disembunyikan di dashboard.
 * true = kartu disembunyikan (tidak tampil, tidak ada request API).
 * false = kartu ditampilkan.
 */

/** Room Status card (Dryroom, Folding, Reject Room, Hourly Data) di Dashboard RFID */
export const HIDE_ROOM_STATUS_CARD = false;

/** Kartu Cutting Proses di halaman RFID Tracking (dashboard utama) */
export const HIDE_CARD_CUTTING_PROSES = false;

/** Kartu Sewing Proses di halaman RFID Tracking (dashboard utama) */
export const HIDE_CARD_SEWING_PROSES = true;

/** Ikon shift (matahari/bulan) di kartu Production Line dan Sewing Line. true = disembunyikan, false = ditampilkan */
export const HIDE_SHIFT_ICON = false;

/** Tombol Scan QC Repair di header Tabel Quality Control (Dashboard QC Cutting). true = disembunyikan */
export const HIDE_SCAN_QC_REPAIR = true;

// --- Form Report Export (halaman FormData / Gistex Command Center) ---
/** true = kartu tidak di-render (tanpa request); ubah ke false untuk menampilkan lagi */

/** WIP All Lines — Rekap WIP semua line (`/line`) */
export const HIDE_FORM_EXPORT_WIP_ALL_LINES = true;

/** Card Progress — List card status progress (`/card/progress`) */
export const HIDE_FORM_EXPORT_CARD_PROGRESS = true;

/** Card Done — List card status done (`/card/done`) */
export const HIDE_FORM_EXPORT_CARD_DONE = true;

/** Card Waiting — List card status waiting (`/card/waiting`) */
export const HIDE_FORM_EXPORT_CARD_WAITING = true;

/** Tracking Join — Data tracking gabungan (`/tracking/join`) */
export const HIDE_FORM_EXPORT_TRACKING_JOIN = true;

/**
 * Kotak kiri atas di kartu Production Line / Sewing Line:
 * - "brand" atau 0 = tampilkan nama brand (style dari API) + ikon brand dari assets
 * - "shift" atau 1 = tampilkan ikon shift (matahari/bulan)
 * Bisa pakai string "brand" | "shift" atau number 0 (brand) / 1 (shift).
 */
export const SHOW_PRODUCTION_LINE_CARD: 'brand' | 'shift' | 0 | 1 = 'brand';

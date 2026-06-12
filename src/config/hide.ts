/**
 * Konfigurasi kartu yang disembunyikan di dashboard.
 * true = kartu disembunyikan (tidak tampil, tidak ada request API).
 * false = kartu ditampilkan.
 */

/** Room Status card (Dryroom, Folding, Reject Room, Hourly Data) di Dashboard RFID */
export const HIDE_ROOM_STATUS_CARD = true;

/** Kartu Cutting Proses di halaman RFID Tracking (dashboard utama) */
export const HIDE_CARD_CUTTING_PROSES = false;

/** Kartu Sewing Proses di halaman RFID Tracking (dashboard utama) */
export const HIDE_CARD_SEWING_PROSES = true;

/** Kartu Batch System di halaman RFID Tracking */
export const HIDE_CARD_BATCH_SYSTEM = true;

// --- Home (Gistex Command Center — kartu modul utama) ---
/** true = kartu tidak di-render di halaman home */

/** Kartu RFID Tracking di home */
export const HIDE_HOME_CARD_RFID_TRACKING = false;

/** Kartu Needle Manager di home */
export const HIDE_HOME_CARD_NEEDLE_MANAGER = false;

/** Kartu RFID Sewing Proses di home */
export const HIDE_HOME_CARD_RFID_SEWING_PROSES = false;

export type HomeCardId = 'rfid-tracking' | 'needle-manager' | 'sewing-proses';

/** Cek apakah kartu home disembunyikan berdasarkan id modul. */
export function isHomeCardHidden(cardId: HomeCardId): boolean {
    switch (cardId) {
        case 'rfid-tracking':
            return HIDE_HOME_CARD_RFID_TRACKING;
        case 'needle-manager':
            return HIDE_HOME_CARD_NEEDLE_MANAGER;
        case 'sewing-proses':
            return HIDE_HOME_CARD_RFID_SEWING_PROSES;
        default:
            return false;
    }
}

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
 * Export Daily Output (Per WO & Line) — kolom PIC / NIK karyawan.
 * true = kolom tidak ditulis ke Excel (data API tetap di-fetch, hanya disembunyikan di file).
 */
export const HIDE_FORM_EXPORT_DAILY_OUTPUT_PIC_NIK = true;

/** Prefix header yang dihilangkan dari Excel saat HIDE_FORM_EXPORT_DAILY_OUTPUT_PIC_NIK = true */
export const HIDE_DAILY_OUTPUT_HEADER_PREFIXES: readonly string[] = ['PIC -', 'NIK -'];

/**
 * Kotak kiri atas di kartu Production Line / Sewing Line:
 * - "brand" atau 0 = tampilkan nama brand (style dari API) + ikon brand dari assets
 * - "shift" atau 1 = tampilkan ikon shift (matahari/bulan)
 * Bisa pakai string "brand" | "shift" atau number 0 (brand) / 1 (shift).
 */
export const SHOW_PRODUCTION_LINE_CARD: 'brand' | 'shift' | 0 | 1 = 'brand';

// --- Dashboard RFID (Data Line card) ---
/** Angka di judul "Data Line X" (dashboard RFID). true = tampil "Data Line" tanpa nomor */
export const HIDE_DATA_LINE_NUMBER = true;

// --- Production Line grid (/monitoring-rfid, modal pengaturan supervisor) ---
/** Line ID yang disembunyikan di environment MJL (kartu tidak tampil, tidak fetch style/wira). */
export const HIDDEN_PRODUCTION_LINE_IDS_MJL: readonly number[] = [14, 15, 16, 21];

/** Filter kartu production line yang boleh ditampilkan per environment. */
export function filterVisibleProductionLines<T extends { id: number }>(
    lines: T[],
    environment: 'CLN' | 'MJL' | 'MJL2' | 'GCC'
): T[] {
    if (environment !== 'MJL') return lines;
    const hidden = new Set(HIDDEN_PRODUCTION_LINE_IDS_MJL);
    return lines.filter((line) => !hidden.has(line.id));
}

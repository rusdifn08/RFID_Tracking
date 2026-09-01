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

/** Kartu Monitoring Machine di home */
export const HIDE_HOME_CARD_MONITORING_MACHINE = false;

/** Kartu Machine Productivity di home (`/machine-productivity`). true = disembunyikan */
export const HIDE_HOME_CARD_MACHINE_PRODUCTIVITY = false;

/** Kartu Monitoring Shipment di home */
export const HIDE_HOME_CARD_MONITORING_SHIPMENT = false;

/** Kartu Vibe Prendi di home */
export const HIDE_HOME_CARD_VIBE_PRENDI = false;

export type HomeCardId =
    | 'rfid-tracking'
    | 'needle-manager'
    | 'sewing-proses'
    | 'monitoring-machine'
    | 'machine-productivity'
    | 'monitoring-shipment'
    | 'vibe-prendi';

/** Cek apakah kartu home disembunyikan berdasarkan id modul. */
export function isHomeCardHidden(cardId: HomeCardId): boolean {
    switch (cardId) {
        case 'rfid-tracking':
            return HIDE_HOME_CARD_RFID_TRACKING;
        case 'needle-manager':
            return HIDE_HOME_CARD_NEEDLE_MANAGER;
        case 'sewing-proses':
            return HIDE_HOME_CARD_RFID_SEWING_PROSES;
        case 'monitoring-machine':
            return HIDE_HOME_CARD_MONITORING_MACHINE;
        case 'machine-productivity':
            return HIDE_HOME_CARD_MACHINE_PRODUCTIVITY;
        case 'monitoring-shipment':
            return HIDE_HOME_CARD_MONITORING_SHIPMENT;
        case 'vibe-prendi':
            return HIDE_HOME_CARD_VIBE_PRENDI;
        default:
            return false;
    }
}

/** Ikon shift (matahari/bulan) di kartu Production Line dan Sewing Line. true = disembunyikan, false = ditampilkan */
export const HIDE_SHIFT_ICON = true;

/** Kotak brand (mont-bell) kiri atas kartu Production Line (/monitoring-rfid). true = disembunyikan */
export const HIDE_PRODUCTION_LINE_BRAND = true;

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

// --- Dashboard Sewing Line (batch card indicators) ---
/**
 * Badge indikator perbandingan batch (IN Terbesar, IN Terkecil, OUT Terbesar, OUT Terkecil)
 * di kartu batch pada dashboard sewing line.
 * true = badge disembunyikan, hanya tampil default "Bundle-N".
 */
export const HIDE_SEWING_BATCH_HIGHLIGHT_BADGES = true;

// --- Supply Sewing Card ---
/**
 * Flag untuk menyembunyikan atau menampilkan status "Coming Soon" pada card Supply Sewing
 * true = Tampilkan "Soon" dan nonaktifkan tombol
 * false = Tampilkan tombol normal
 */
export const COMINGSOON_SUPPLY_SEWING = false;

/** Menyembunyikan tombol filter di dalam setiap card di Dashboard Cutting */
export const HIDE_CUTTING_CARD_FILTERS = true;

/**
 * Line ID yang di-nonaktifkan (abu-abu, tidak bisa diklik) di halaman /sewing.
 * Hapus ID dari array → card aktif. Array kosong → semua line aktif.
 * Card tetap tampil (bukan filter render).
 */
export const DISABLED_SEWING_LINE_IDS: readonly number[] = [
    111, 1, 2, 3, 4, 7, 8, 9, 10, 11, 12, 13,
];

// --- Machine Productivity Dashboard Cards ---
/** Kartu Detail Data di Machine Productivity. true = disembunyikan */
export const HIDE_MACHINE_PRODUCTIVITY_CARD_DETAIL = false;

/** Kartu PZEM-004T Data di Machine Productivity. true = disembunyikan */
export const HIDE_MACHINE_PRODUCTIVITY_CARD_PZEM = false;

/** Kartu ADXL345 Data di Machine Productivity. true = disembunyikan */
export const HIDE_MACHINE_PRODUCTIVITY_CARD_ADXL = false;

/** Kartu Resume Mesin di Machine Productivity. true = disembunyikan */
export const HIDE_MACHINE_PRODUCTIVITY_CARD_RESUME = false;

/** Kartu Compare Data di Machine Productivity. true = disembunyikan */
export const HIDE_MACHINE_PRODUCTIVITY_CARD_COMPARE = false;

/** Kartu Login Mesin di Machine Productivity. true = disembunyikan */
export const HIDE_MACHINE_PRODUCTIVITY_CARD_LOGIN = false;

/** Kartu Control Machine di Machine Productivity. true = disembunyikan */
export const HIDE_MACHINE_PRODUCTIVITY_CARD_CONTROL = false;

/** Kartu Monitor Zigbee Nodes di Machine Productivity. true = disembunyikan */
export const HIDE_MACHINE_PRODUCTIVITY_CARD_ZIGBEE = false;

/**
 * Simulasi data dummy — HANYA aktif di `/monitoring-machine/juki` (enableSim prop).
 * Resume di `/machine-productivity/resume` selalu data real (tanpa &sim=1).
 */
export const SIMULASI_MACHINE = true;

export type MachineProductivityCardId =
    | 'detail'
    | 'resume'
    | 'compare'
    | 'pzem'
    | 'adxl'
    | 'login'
    | 'control'
    | 'zigbee';

/** Cek apakah kartu Machine Productivity disembunyikan */
export function isMachineProductivityCardHidden(cardId: MachineProductivityCardId): boolean {
    switch (cardId) {
        case 'detail':
            return HIDE_MACHINE_PRODUCTIVITY_CARD_DETAIL;
        case 'pzem':
            return HIDE_MACHINE_PRODUCTIVITY_CARD_PZEM;
        case 'adxl':
            return HIDE_MACHINE_PRODUCTIVITY_CARD_ADXL;
        case 'resume':
            return HIDE_MACHINE_PRODUCTIVITY_CARD_RESUME;
        case 'compare':
            return HIDE_MACHINE_PRODUCTIVITY_CARD_COMPARE;
        case 'login':
            return HIDE_MACHINE_PRODUCTIVITY_CARD_LOGIN;
        case 'control':
            return HIDE_MACHINE_PRODUCTIVITY_CARD_CONTROL;
        case 'zigbee':
            return HIDE_MACHINE_PRODUCTIVITY_CARD_ZIGBEE;
        default:
            return true;
    }
}


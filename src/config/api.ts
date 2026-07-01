/**
 * Konfigurasi API (TypeScript)
 * File untuk mengakses server dan API
 */

// ============================================
// KONFIGURASI SERVER
// ============================================

// Mode development atau production
const isDevelopment = import.meta.env.DEV;

// Import utility untuk mendapatkan local IP
import { getApiBaseUrl } from '../utils/network';

// Konfigurasi Port - berbeda per environment
// MJL: 8000, MJL2: 8001, CLN: 8000
// Deteksi port proxy berdasarkan port frontend
const getProxyPort = (): number => {
    if (typeof window === 'undefined') return 8000;
    const currentPort = window.location.port;
    // Port 5174 = MJL2 → proxy port 8001
    if (currentPort === '5174') {
        return 8001;
    }
    // Port 5175 = GCC → proxy port 8002
    if (currentPort === '5175') {
        return 8002;
    }
    // Port 5173 = MJL → proxy port 8000
    // Port lainnya (CLN) → proxy port 8000
    return 8000;
};

const PROXY_PORT = getProxyPort(); // Port untuk proxy server (server.js) - dinamis berdasarkan environment
// Backend API menggunakan IP eksplisit 10.8.0.104:7000 (dikonfigurasi di server.js)

/**
 * Base URL server frontend / proxy lokal (Node `server.js`), host = sama dengan tab browser.
 * Hanya untuk route yang **tidak ada di backend Django** (mis. `GET /api/scanning/dryroom/operator` + file `scanning_dryroom.json`).
 * Scan Dryroom Check In/Out tetap memakai backend: `POST /garment/dryroom/in|out` lewat `API_BASE_URL` — jangan ubah ke sini.
 */
export const getNodeProxyBaseUrl = (): string => {
    const fromEnv = import.meta.env.VITE_NODE_PROXY_URL as string | undefined;
    if (fromEnv != null && String(fromEnv).trim() !== '') {
        return String(fromEnv).replace(/\/$/, '');
    }
    return getApiBaseUrl(getProxyPort());
};

// Base URL untuk API Server (Proxy Server)
// Dev MJL/CLN: http://hostname:8000 (proxy server.js di mesin yang sama).
// Dev MJL2 (5174): http://10.6.0.99:8001 (proxy server.js di host backend MJL2).
// Dev HTTPS: same-origin → Vite proxy. Prod: hostname:port → backend :7000.
export const API_BASE_URL = isDevelopment
    ? (() => {
        // Untuk development, gunakan hostname dari window.location yang otomatis menyesuaikan
        // Ini memastikan proxy server dicari di mesin yang sama dengan frontend
        const baseUrl = getApiBaseUrl(PROXY_PORT);
        const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
        console.log(`🔧 [API CONFIG] Development mode - Detected hostname: ${currentHostname}`);
        console.log(`🔧 [API CONFIG] Development mode - API_BASE_URL: ${baseUrl}`);
        console.log(`🔧 [API CONFIG] Proxy server harus berjalan di: ${baseUrl}`);
        console.log(`🔧 [API CONFIG] ✅ FLEKSIBEL: Proxy URL otomatis menyesuaikan dengan mesin yang menjalankan frontend`);
        return baseUrl;
    })()
    : import.meta.env.VITE_API_URL || getApiBaseUrl(PROXY_PORT);

// Fungsi untuk mendapatkan backend IP berdasarkan environment (untuk keperluan lain)
const getBackendIP = (): string => {
    // Deteksi environment dari localStorage atau default
    if (typeof window !== 'undefined') {
        const storedEnv = localStorage.getItem('backend_environment');
        if (storedEnv === 'MJL') {
            return '10.5.0.106';
        } else if (storedEnv === 'MJL2') {
            return '10.6.0.99';
        } else if (storedEnv === 'GCC') {
            return '10.5.0.106';
        }
    }
    // Default: CLN
    return '10.8.0.104';
};

// Port backend WebSocket — default 7000; override dev: VITE_BACKEND_PORT
const BACKEND_WS_PORT = Number(import.meta.env.VITE_BACKEND_PORT || 7000) || 7000;

// Base URL untuk WebSocket - langsung ke backend API (bukan proxy)
// Menggunakan function untuk mendapatkan URL secara dinamis berdasarkan environment
export const getWSBaseUrl = (): string => {
    const backendIP = getBackendIP();
    const wsUrl = `ws://${backendIP}:${BACKEND_WS_PORT}`;

    if (isDevelopment && typeof window !== 'undefined') {
        console.log(`🔧 [WS CONFIG] Development mode - WS_BASE_URL: ${wsUrl}`);
    }

    return import.meta.env.VITE_WS_URL || wsUrl;
};

// Export WS_BASE_URL sebagai computed value (akan di-update saat environment berubah)
export const WS_BASE_URL = getWSBaseUrl();

// WebSocket URL untuk WIRA Dashboard - FLEKSIBEL berdasarkan environment dan backend IP
// Menggunakan function untuk mendapatkan URL secara dinamis berdasarkan environment
export const getWiraDashboardWSUrl = (): string => {
    const backendIP = getBackendIP();
    const wsUrl = `ws://${backendIP}:${BACKEND_WS_PORT}/ws/wira-dashboard`;

    if (isDevelopment && typeof window !== 'undefined') {
        console.log(`🔧 [WIRA WS CONFIG] Development mode - WIRA_DASHBOARD_WS_URL: ${wsUrl}`);
        console.log(`🔧 [WIRA WS CONFIG] Backend IP: ${backendIP} (Environment: ${localStorage.getItem('backend_environment') || 'CLN'})`);
    }

    return import.meta.env.VITE_WIRA_DASHBOARD_WS_URL || wsUrl;
};

// Export WIRA_DASHBOARD_WS_URL sebagai computed value (akan di-update saat environment berubah)
export const WIRA_DASHBOARD_WS_URL = getWiraDashboardWSUrl();

// ============================================
// PRODUCTION SCHEDULE API CONFIGURATION
// ============================================

// Base URL untuk Production Schedule API
export const PROD_SCH_API_BASE_URL = 'http://10.8.18.60:7186';

// API Key untuk Production Schedule API
export const PROD_SCH_API_KEY = '332100185';

// ============================================
// MJL API KEY CONFIGURATION
// ============================================

// API Key untuk MJL Backend (10.5.0.106)
export const MJL_API_KEY = '6lYZkryM.j50CVZgnpBl8X7Nx6sy5KRyY6ET7k3Cb';
export const MJL_API_KEY_HEADER = 'X-Api-Key';

/** Environment backend (proxy + dashboard). */
export type BackendEnvironment = 'CLN' | 'MJL' | 'MJL2' | 'GCC';

// Cache untuk environment (CLN, MJL, MJL2, atau GCC)
let cachedEnvironment: BackendEnvironment | null = null;

// Inisialisasi dari localStorage/port saat module load agar dari awal tidak pakai CLN saat jalan di MJL
if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('backend_environment');
    if (stored === 'MJL' || stored === 'MJL2' || stored === 'CLN' || stored === 'GCC') {
        cachedEnvironment = stored;
    } else {
        const port = window.location.port;
        if (port === '5173') cachedEnvironment = 'MJL';
        else if (port === '5174') cachedEnvironment = 'MJL2';
        else if (port === '5175') cachedEnvironment = 'GCC';
        else cachedEnvironment = 'CLN';
    }
}

/** Nilai environment untuk initial state (localStorage lalu port), agar first paint sesuai env (MJL/CLN). */
export const getInitialEnvironment = (): BackendEnvironment => {
    if (typeof window === 'undefined') return 'CLN';
    const stored = localStorage.getItem('backend_environment');
    if (stored === 'MJL' || stored === 'MJL2' || stored === 'CLN' || stored === 'GCC') return stored;
    const port = window.location.port;
    if (port === '5173') return 'MJL';
    if (port === '5174') return 'MJL2';
    if (port === '5175') return 'GCC';
    return 'CLN';
};

// Fungsi untuk set environment cache (dipanggil dari komponen yang fetch /api/config/environment)
export const setBackendEnvironment = (env: BackendEnvironment): void => {
    cachedEnvironment = env;
    localStorage.setItem('backend_environment', env);
};

// Getter untuk environment yang sudah di-cache (bisa dipakai untuk conditional logic)
export const getBackendEnvironment = (): BackendEnvironment | null => cachedEnvironment;

// -----------------------------------------------
// Single-request cache: /api/config/environment (1x per refresh)
// -----------------------------------------------
let environmentFetchPromise: Promise<BackendEnvironment> | null = null;

/**
 * Ambil environment dari API. Hanya 1x request per session; pemanggil berikutnya dapat promise yang sama.
 * Gunakan ini di komponen agar /api/config/environment tidak dipanggil berulang (Breadcrumb, LineDetail, dll).
 */
export async function getEnvironmentFromAPI(): Promise<BackendEnvironment> {
    if (environmentFetchPromise) return environmentFetchPromise;
    const currentPort = typeof window !== 'undefined' ? window.location.port : '';
    const fallbackEnv: BackendEnvironment =
        currentPort === '5174' ? 'MJL2' : currentPort === '5173' ? 'MJL' : currentPort === '5175' ? 'GCC' : 'CLN';
    environmentFetchPromise = (async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/config/environment`, { headers: getDefaultHeaders() });
            if (response.ok) {
                const data = await response.json();
                const raw = data.environment;
                const env: BackendEnvironment =
                    raw === 'GCC' || raw === 'gcc'
                        ? 'GCC'
                        : raw === 'MJL2'
                          ? 'MJL2'
                          : raw === 'MJL'
                            ? 'MJL'
                            : 'CLN';
                setBackendEnvironment(env);
                return env;
            }
        } catch (e) {
            console.warn('[ENV] Fetch failed, using fallback:', fallbackEnv);
        }
        setBackendEnvironment(fallbackEnv);
        return fallbackEnv;
    })();
    return environmentFetchPromise;
}

// -----------------------------------------------
// Single-request cache: /api/supervisor-data?environment=X (1x per env per refresh)
// -----------------------------------------------
export interface SupervisorDataPayload {
    supervisors: Record<string, string>;
    startTimes: Record<string, string>;
    targets?: Record<string, number>;
    displayTitles?: Record<string, string>;
}

const supervisorDataCache: Partial<Record<BackendEnvironment, SupervisorDataPayload>> = {};
const supervisorDataPromise: Partial<Record<BackendEnvironment, Promise<SupervisorDataPayload | null>>> = {};

/**
 * Ambil supervisor data dari API. Satu request per environment; pemanggil berikutnya dapat cache/promise yang sama.
 * Panggil invalidateSupervisorDataCache(env) setelah POST update agar data segar.
 */
export async function getSupervisorDataFromAPI(environment: BackendEnvironment): Promise<SupervisorDataPayload | null> {
    if (supervisorDataCache[environment]) return supervisorDataCache[environment];
    if (supervisorDataPromise[environment]) return supervisorDataPromise[environment]!;
    const prom = (async (): Promise<SupervisorDataPayload | null> => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/supervisor-data?environment=${environment}`, {
                headers: getDefaultHeaders(),
            });
            if (!res.ok) return null;
            const data = await res.json();
            if (!data?.success || !data?.data) return null;
            const payload: SupervisorDataPayload = {
                supervisors: data.data.supervisors || {},
                startTimes: data.data.startTimes || {},
                targets: undefined,
                displayTitles: {},
            };
            if (data.data.targets && typeof data.data.targets === 'object') {
                payload.targets = {};
                Object.keys(data.data.targets).forEach(key => {
                    const v = data.data.targets[key];
                    payload.targets![key] = typeof v === 'number' && v >= 0 ? v : 0;
                });
            }
            if (data.data.displayTitles && typeof data.data.displayTitles === 'object') {
                payload.displayTitles = {};
                Object.keys(data.data.displayTitles).forEach(key => {
                    const v = data.data.displayTitles[key];
                    if (typeof v === 'string' && v.trim()) {
                        payload.displayTitles![key] = v.trim();
                    }
                });
            }
            supervisorDataCache[environment] = payload;
            return payload;
        } catch {
            return null;
        }
    })();
    supervisorDataPromise[environment] = prom;
    return prom;
}

/** Invalidasi cache supervisor data (panggil setelah simpan/edit) agar refetch berikutnya dapat data terbaru. */
export function invalidateSupervisorDataCache(environment: BackendEnvironment): void {
    delete supervisorDataCache[environment];
    delete supervisorDataPromise[environment];
}

// Fungsi untuk mendapatkan default branch berdasarkan environment
export const getDefaultBranch = (): string => {
    const storedEnv = localStorage.getItem('backend_environment');
    if (storedEnv === 'MJL') {
        return 'MJ1';
    }
    if (storedEnv === 'CLN') {
        return 'CJL';
    }
    // Default: CLN -> CJL
    return 'CJL';
};

/**
 * Helper function untuk mendapatkan default headers dengan API Key untuk semua environment
 * @returns Headers object dengan API Key untuk semua environment (CLN, MJL, MJL2)
 */
export const getDefaultHeaders = (): HeadersInit => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    // Tambahkan API Key header untuk semua environment (CLN, MJL, MJL2)
    headers[MJL_API_KEY_HEADER] = MJL_API_KEY;

    return headers;
};

/** Path proxy → backend GET label cutting GCC (query `barcode`). */
export const GCC_CUTTING_LIST_PATH = '/api/gcc/cutting/list';

export interface GccCuttingFormFields {
    barcode: string;
    workOrder: string;
    style: string;
    buyer: string;
    item: string;
    color: string;
    size: string;
    bagian: string;
    noIkat: string;
    placing: string;
    season: string;
    country: string;
}

function extractFirstCuttingRow(payload: unknown): Record<string, unknown> | null {
    if (payload == null || typeof payload !== 'object') return null;
    const p = payload as Record<string, unknown>;
    if (Array.isArray(payload)) {
        const first = (payload as unknown[])[0];
        return first && typeof first === 'object' ? (first as Record<string, unknown>) : null;
    }
    const data = p.data;
    if (Array.isArray(data)) {
        const first = data[0];
        return first && typeof first === 'object' ? (first as Record<string, unknown>) : null;
    }
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        return data as Record<string, unknown>;
    }
    const results = p.results;
    if (Array.isArray(results)) {
        const first = results[0];
        return first && typeof first === 'object' ? (first as Record<string, unknown>) : null;
    }
    return p;
}

function pickStr(row: Record<string, unknown> | null, keys: string[]): string {
    if (!row) return '';
    for (const k of keys) {
        const v = row[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') {
            return String(v).trim();
        }
    }
    return '';
}

/** Normalisasi respons API cutting list ke field tampilan (toleran variasi nama key backend). */
export function mapGccCuttingPayloadToForm(barcode: string, payload: unknown): GccCuttingFormFields {
    const row = extractFirstCuttingRow(payload);
    return {
        barcode: barcode.trim(),
        workOrder: pickStr(row, ['wo', 'WO', 'wo_no', 'nomor_wo', 'work_order', 'no_wo']),
        style: pickStr(row, ['style', 'style_no', 'Style No', 'styleNo']),
        buyer: pickStr(row, ['buyer', 'Buyer']),
        item: pickStr(row, ['item', 'Item', 'deskripsi', 'description']),
        color: pickStr(row, ['color', 'Color', 'warna', 'Warna']),
        size: pickStr(row, ['size', 'Size']),
        bagian: pickStr(row, ['bagian', 'Bagian', 'section']),
        noIkat: pickStr(row, ['no_ikat', 'noIkat', 'No. Ikat', 'bundle', 'no_bundle']),
        placing: pickStr(row, ['placing', 'Placing', 'meja', 'Meja']),
        season: pickStr(row, ['season', 'Season']),
        country: pickStr(row, ['country', 'Country', 'negara']),
    };
}

/** Default URL daftar bundle (service cutting). Override: VITE_GCC_CUTTING_LIST_URL (base atau path penuh). */
const DEFAULT_GCC_CUTTING_FULL_LIST_URL = 'http://10.5.0.107:9000/api/gcc/cutting/list';

/** Header API service cutting (:9000). Override: VITE_GCC_CUTTING_RFID_KEY_HEADER, VITE_GCC_CUTTING_RFID_KEY */
const GCC_CUTTING_RFID_KEY_HEADER_DEFAULT = 'rfid-key';
const GCC_CUTTING_RFID_KEY_DEFAULT = '0011779933';

/** Same-origin di browser agar Network tab menampilkan path API backend (`/api/...`). */
function resolveSameOriginServiceUrl(apiPath: string, directUrl: string): string {
    if (typeof window !== 'undefined') {
        const p = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
        return `${window.location.origin}${p}`;
    }
    return directUrl;
}

function getGccCuttingBundlesRequestHeaders(): HeadersInit {
    const name =
        (import.meta.env.VITE_GCC_CUTTING_RFID_KEY_HEADER as string | undefined)?.trim() ||
        GCC_CUTTING_RFID_KEY_HEADER_DEFAULT;
    const value =
        (import.meta.env.VITE_GCC_CUTTING_RFID_KEY as string | undefined)?.trim() ||
        GCC_CUTTING_RFID_KEY_DEFAULT;
    return {
        Accept: 'application/json',
        [name]: value,
    };
}

/** Resolves URL GET daftar bundle: env → same-origin `/api/gcc/cutting/list` → default langsung ke :9000. */
export function resolveGccCuttingBundlesListUrl(): string {
    const fromEnv = (import.meta.env.VITE_GCC_CUTTING_LIST_URL as string | undefined)?.trim();
    if (fromEnv) {
        const t = fromEnv.replace(/\/$/, '');
        return t.includes('/api/gcc/cutting/list') ? t : `${t}/api/gcc/cutting/list`;
    }
    return resolveSameOriginServiceUrl('/api/gcc/cutting/list', DEFAULT_GCC_CUTTING_FULL_LIST_URL);
}

/** Resolve URL GET checking history bundle cutting (`/api/gcc/cutting/check`). */
export function resolveGccCuttingCheckUrl(): string {
    const fromEnv = (import.meta.env.VITE_GCC_CUTTING_CHECK_URL as string | undefined)?.trim();
    if (fromEnv) {
        const t = fromEnv.replace(/\/$/, '');
        return t.includes('/api/gcc/cutting/check') ? t : `${t}/api/gcc/cutting/check`;
    }
    const listEnv = (import.meta.env.VITE_GCC_CUTTING_LIST_URL as string | undefined)?.trim();
    if (listEnv) {
        const t = listEnv.replace(/\/$/, '');
        if (t.includes('/api/gcc/cutting/list')) return t.replace('/api/gcc/cutting/list', '/api/gcc/cutting/check');
        return `${t}/api/gcc/cutting/check`;
    }
    return resolveSameOriginServiceUrl('/api/gcc/cutting/check', 'http://10.5.0.107:9000/api/gcc/cutting/check');
}

/** Satu baris history dari GET `/api/gcc/cutting/check?rfid_bundles=`. */
export interface GccCuttingCheckLogItem {
    id: number;
    id_user?: number;
    last_status?: string;
    qty_batch?: number;
    batch?: string;
    log_created_at?: string;
    barcode?: string;
    rfid_bundles?: string;
    wo?: string;
    style?: string;
    meja?: string;
    warna?: string;
    size?: string;
    no_ikat?: number;
    no_urut?: string;
    season?: string;
    country?: string;
    bundle_created_at?: string;
}

export interface GccCuttingCheckApiResponse {
    code?: number;
    status?: string;
    message?: string;
    count?: number;
    data?: GccCuttingCheckLogItem[];
}

/** GET history tracking bundle cutting (GCC :9000). */
export async function getGccCuttingCheck(rfid_bundles: string): Promise<{
    success: boolean;
    data?: GccCuttingCheckLogItem[];
    message?: string;
    error?: string;
    status?: number;
}> {
    const rid = String(rfid_bundles || '').trim();
    if (!rid) return { success: false, error: 'RFID bundle wajib diisi' };
    try {
        const base = resolveGccCuttingCheckUrl();
        let reqUrl: string;
        try {
            const u = new URL(base);
            u.searchParams.set('rfid_bundles', rid);
            reqUrl = u.toString();
        } catch {
            reqUrl = `${base}?rfid_bundles=${encodeURIComponent(rid)}`;
        }
        const res = await fetch(reqUrl, {
            method: 'GET',
            headers: getGccCuttingBundlesRequestHeaders(),
        });
        const text = await res.text();
        let parsed: unknown = null;
        try {
            parsed = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
        } catch {
            return { success: false, error: 'Respons checking cutting bukan JSON', status: 502 };
        }
        const body = parsed as GccCuttingCheckApiResponse;
        const st = String(body.status || '').toLowerCase();
        const okByBody =
            !(typeof body.code === 'number' && body.code >= 400) &&
            (body.code === 200 || st === 'success' || (Array.isArray(body.data) && st !== 'error'));
        if (!res.ok || !okByBody) {
            const msg =
                body.message ||
                body.status ||
                (typeof body.code === 'number' ? `code ${body.code}` : null) ||
                `HTTP ${res.status}`;
            return { success: false, error: String(msg), status: res.status };
        }
        const rows = Array.isArray(body.data) ? body.data : [];
        return {
            success: true,
            data: rows,
            message: body.message,
            status: res.status,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal GET checking cutting',
            status: 500,
        };
    }
}

const DEFAULT_GCC_HOME_DASHBOARD_URL = 'http://10.5.0.107:9000/api/homedashboard';

/** Resolve URL GET dashboard cutting home (`/api/homedashboard`, service :9000). */
export function resolveGccHomeDashboardUrl(): string {
    const fromEnv = (import.meta.env.VITE_GCC_HOME_DASHBOARD_URL as string | undefined)?.trim();
    if (fromEnv) {
        const t = fromEnv.replace(/\/$/, '');
        return t.includes('/api/homedashboard') ? t : `${t}/api/homedashboard`;
    }
    return resolveSameOriginServiceUrl('/api/homedashboard', DEFAULT_GCC_HOME_DASHBOARD_URL);
}

/** Satu baris dari GET `/api/homedashboard` (aggregate status bundle → supermarket). */
export interface HomeDashboardItem {
    rfid_bundles?: string;
    id_bundles?: number;
    barcode?: string;
    last_status?: string;
    wo?: string;
    style?: string;
    warna?: string;
    size?: string;
    qty_batch?: number;
    line?: string | number;
    lokasi?: string;
    [key: string]: unknown;
}

/**
 * GET — snapshot dashboard cutting command center (`/api/homedashboard`).
 * Browser: same-origin `/api/homedashboard`. Prod/dev override: `VITE_GCC_HOME_DASHBOARD_URL`.
 */
export async function getHomeDashboard(): Promise<ApiResponse<HomeDashboardItem[]>> {
    try {
        const url = resolveGccHomeDashboardUrl();
        const res = await fetch(url, {
            method: 'GET',
            headers: getGccCuttingBundlesRequestHeaders(),
            cache: 'no-store',
        });
        const text = await res.text();
        let json: unknown = null;
        try {
            json = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
        } catch {
            return { success: false, error: 'Respons server bukan JSON' };
        }
        const body = json as {
            code?: number;
            status?: string;
            message?: string;
            data?: unknown;
        };
        if (!res.ok) {
            const msg = body?.message || body?.status || `HTTP ${res.status}`;
            return { success: false, error: typeof msg === 'string' ? msg : 'Gagal memuat home dashboard' };
        }
        if (body.code != null && body.code !== 200) {
            return {
                success: false,
                error: typeof body.message === 'string' ? body.message : `API code ${body.code}`,
            };
        }
        const arr = Array.isArray(body.data) ? body.data : [];
        return { success: true, data: arr as HomeDashboardItem[] };
    } catch (e) {
        return {
            success: false,
            error: e instanceof Error ? e.message : 'Gagal memuat home dashboard',
        };
    }
}

/** Satu baris bundle dari GET …/api/gcc/cutting/list (service :9000). */
export interface GccCuttingBundleRow {
    idBundles?: number;
    cuttingOrderBreakdownBundleId?: number;
    barcode?: string;
    rfidBundles?: string;
    wo?: string;
    style?: string;
    meja?: string | number;
    warna?: string;
    size?: string;
    noIkat?: number | string;
    placing?: string;
    season?: string;
    country?: string;
    createdAt?: string;
    [key: string]: unknown;
}

/** Map satu baris bundle API (GET …/api/gcc/cutting/list) ke form tampilan. */
export function mapGccCuttingBundleRowToForm(row: Record<string, unknown>): GccCuttingFormFields {
    const pl = pickStr(row, ['placing']);
    const meja = pickStr(row, ['meja']);
    const placingParts = [pl, meja ? `Meja ${meja}` : ''].filter(Boolean);
    const placingCombined = placingParts.join(' · ');
    return {
        barcode: pickStr(row, ['barcode']),
        workOrder: pickStr(row, ['wo', 'WO']),
        style: pickStr(row, ['style']),
        buyer: pickStr(row, ['country', 'buyer', 'Buyer']),
        item: pl || pickStr(row, ['item', 'Item']),
        color: pickStr(row, ['warna', 'color', 'Color']),
        size: pickStr(row, ['size', 'Size']),
        bagian: pickStr(row, ['bagian', 'Bagian']),
        noIkat: pickStr(row, ['noIkat', 'no_ikat']),
        placing: placingCombined,
        season: pickStr(row, ['season', 'Season']),
        country: pickStr(row, ['country', 'Country']),
    };
}

function isSameLocalCalendarDay(iso: string, ref: Date): boolean {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;
    return (
        d.getFullYear() === ref.getFullYear() &&
        d.getMonth() === ref.getMonth() &&
        d.getDate() === ref.getDate()
    );
}

/** Hanya bundle yang `createdAt` jatuh pada hari yang sama dengan `dateRef` (timezone lokal browser). */
export function filterGccBundlesByCreatedLocalDate(
    rows: GccCuttingBundleRow[],
    dateRef: Date = new Date()
): GccCuttingBundleRow[] {
    return rows.filter((r) => r.createdAt != null && isSameLocalCalendarDay(String(r.createdAt), dateRef));
}

/** Bundle yang `createdAt` jatuh di antara `fromDate` dan `toDate` (inclusive, timezone lokal browser). */
export function filterGccBundlesByCreatedLocalDateRange(
    rows: GccCuttingBundleRow[],
    fromDate: Date,
    toDate: Date
): GccCuttingBundleRow[] {
    const startOfFrom = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate(), 0, 0, 0, 0);
    const endOfTo = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999);
    return rows.filter((r) => {
        if (r.createdAt == null) return false;
        const d = new Date(String(r.createdAt));
        if (Number.isNaN(d.getTime())) return false;
        return d >= startOfFrom && d <= endOfTo;
    });
}

/** Ambil array `data` dari body { code, data: [...] }. */
export function extractGccCuttingBundlesData(payload: unknown): GccCuttingBundleRow[] {
    if (payload == null || typeof payload !== 'object') return [];
    const p = payload as Record<string, unknown>;
    const data = p.data;
    if (!Array.isArray(data)) return [];
    return data.filter((x): x is GccCuttingBundleRow => x != null && typeof x === 'object');
}

/**
 * GET — daftar bundle penuh dari service cutting (`/api/gcc/cutting/list`).
 * Browser: same-origin `/api/gcc/cutting/list` (hindari CORS). Override: VITE_GCC_CUTTING_LIST_URL.
 */
export async function fetchGccCuttingBundlesList(): Promise<unknown> {
    const url = resolveGccCuttingBundlesListUrl();
    const res = await fetch(url, {
        method: 'GET',
        headers: getGccCuttingBundlesRequestHeaders(),
    });
    const text = await res.text();
    let data: unknown = null;
    try {
        data = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
    } catch {
        throw new Error('Respons server bukan JSON');
    }
    if (!res.ok) {
        const msg =
            (data as { message?: string })?.message ||
            (data as { status?: string })?.status ||
            `HTTP ${res.status}`;
        throw new Error(typeof msg === 'string' ? msg : 'Gagal memuat daftar bundle');
    }
    const code = (data as { code?: number })?.code;
    if (code != null && code !== 200) {
        const st = (data as { status?: string })?.status;
        throw new Error(typeof st === 'string' ? st : `API code ${code}`);
    }
    return data;
}

/** GET — memuat data label cutting berdasarkan kode barcode/QR (mis. BD20260504-566275). */
export async function fetchGccCuttingListByBarcode(barcode: string): Promise<unknown> {
    const b = barcode.trim();
    if (!b) {
        throw new Error('Barcode kosong');
    }
    const listBaseUrl = resolveGccCuttingBundlesListUrl();
    const requestUrl = new URL(listBaseUrl, typeof window !== 'undefined' ? window.location.origin : undefined);
    requestUrl.searchParams.set('barcode', b);
    const res = await fetch(requestUrl.toString(), {
        method: 'GET',
        headers: getGccCuttingBundlesRequestHeaders(),
    });
    const text = await res.text();
    let data: unknown = null;
    try {
        data = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
    } catch {
        throw new Error('Respons server bukan JSON');
    }
    if (!res.ok) {
        const msg =
            (data as { message?: string })?.message ||
            (data as { error?: string })?.error ||
            `Gagal memuat data (${res.status})`;
        throw new Error(msg);
    }
    return data;
}

// ============================================
// TYPES
// ============================================

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    status?: number;
    response?: Response;
}

export interface RFIDData {
    id: string;
    status: 'active' | 'inactive';
    line: string;
    createdAt: string;
}

export interface LineStatistics {
    good: number;
    rework: number;
    hasper: number;
    reject: number;
    total: number;
}

export interface LineData {
    id: string;
    name: string;
    statistics: LineStatistics;
    pieData: Array<{ name: string; value: number; color: string }>;
    kpi: {
        onTarget: number;
        vulnerable: number;
        offTarget: number;
        currentKPI: number;
    };
    workOrders: Array<{
        workOrder: string;
        item: string;
        style: string;
        qty: number;
    }>;
}

export interface LoginRequest {
    nik: string;
    password: string;
}

export interface LoginResponse {
    debug?: boolean;
    success: boolean;
    password_hash?: string; // MD5 hash dari password
    user?: {
        bagian: string;
        line: string;
        nama: string;
        nik: string;
        no_hp: string;
        pwd_md5: string; // MD5 hash password dari database
        password_hash?: string; // Beberapa backend mengirim hash di level user
        rfid_user: string;
        telegram: string;
        // Untuk backward compatibility
        jabatan?: string;
        role?: string;
    };
    error?: string;
    // Untuk backward compatibility dengan POST endpoint
    token?: string;
    data?: {
        token: string;
        user: {
            nik: string;
            name: string;
            jabatan: string;
            role: string;
        };
    };
}

export interface ProductionData {
    overall: {
        good: number;
        reject: number;
        rework: number;
        hasper: number;
        total: number;
        date: string;
    };
    byLine: {
        [key: string]: {
            good: number;
            reject: number;
            rework: number;
            hasper: number;
            total: number;
        };
    };
    daily: Array<{
        date: string;
        good: number;
        reject: number;
        rework: number;
    }>;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Mendapatkan URL lengkap untuk API endpoint
 * @param endpoint - Endpoint path (contoh: '/api/rfid')
 * @returns URL lengkap
 */
export const getApiUrl = (endpoint: string = ''): string => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${API_BASE_URL}${cleanEndpoint}`;
};

/**
 * Mendapatkan URL untuk WebSocket
 * @param path - WebSocket path (contoh: '/ws' atau '/wira/detail')
 * @returns WebSocket URL lengkap
 */
export const getWebSocketUrl = (path: string = '/ws'): string => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    // Gunakan getWSBaseUrl() untuk mendapatkan URL yang selalu update dengan environment terbaru
    return `${getWSBaseUrl()}${cleanPath}`;
};

// ============================================
// API CLIENT FUNCTIONS
// ============================================

/**
 * Fungsi untuk membuat request ke API
 * @param endpoint - Endpoint path
 * @param options - Fetch options (method, body, headers, dll)
 * @returns Response dari server
 */
export const apiRequest = async <T = any>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> => {
    const url = getApiUrl(endpoint);

    // Gunakan getDefaultHeaders() untuk konsistensi dan memastikan API Key ditambahkan
    const defaultHeaders = getDefaultHeaders();

    const config: RequestInit = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };

    try {
        const response = await fetch(url, config);

        // Handle non-JSON responses
        const contentType = response.headers.get('content-type');
        let data;

        const tryParseJsonText = (text: string): unknown | null => {
            const trimmed = text.replace(/^\uFEFF/, '').trim();
            if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
            try {
                return JSON.parse(trimmed);
            } catch {
                return null;
            }
        };

        if (contentType && contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (jsonError) {
                const text = await response.text();
                const parsed = tryParseJsonText(text);
                if (parsed != null) {
                    data = parsed;
                } else {
                    return {
                        success: false,
                        error: text || `HTTP ${response.status}: ${response.statusText}`,
                        data: undefined,
                        status: response.status
                    };
                }
            }
        } else {
            const text = await response.text();
            const parsed = tryParseJsonText(text);
            if (parsed != null) {
                data = parsed;
            } else {
                return {
                    success: false,
                    error: text || `HTTP ${response.status}: ${response.statusText}`,
                    data: undefined,
                    status: response.status
                };
            }
        }

        // Jika response tidak OK, return error response dengan data yang ada
        if (!response.ok) {
            // Jika status 404 dan message adalah "NIK tidak ada", gunakan pesan tersebut
            if (response.status === 404 && (data.message === 'NIK tidak ada' || data.error === 'NIK tidak ada')) {
                return {
                    success: false,
                    error: 'NIK tidak ada',
                    data: data,
                    status: 404
                };
            }
            return {
                success: false,
                error: data.message || data.error || data.detail || `HTTP ${response.status}: ${response.statusText}`,
                data: data,
                status: response.status
            };
        }

        // Parse response data
        // Untuk tracking/line endpoint, kita perlu return seluruh data object
        // Karena response structure: { success, line, data: {...} }
        // Jangan ambil data.data karena kita butuh seluruh object
        let responseData = data;

        // Hanya ambil data.data jika endpoint bukan tracking/line
        // Tracking/line perlu seluruh object { success, line, data }
        if (!endpoint.includes('/tracking/line')) {
            const nested = (data as Record<string, unknown> | null)?.data;
            const nestedIsObject =
                nested != null && typeof nested === 'object' && !Array.isArray(nested);
            // GET /user sering mengembalikan password_hash di root tapi user di data.data —
            // jangan pakai `data.data || data` saja atau hash hilang dan login selalu gagal.
            if (nestedIsObject) {
                const n = nested as Record<string, unknown>;
                const root = data as Record<string, unknown>;
                responseData = {
                    ...n,
                    ...root,
                    user: (root.user ?? n.user) as unknown,
                    password_hash: (root.password_hash ?? n.password_hash) as unknown,
                    pwd_md5: (root.pwd_md5 ?? n.pwd_md5) as unknown,
                } as typeof data;
                // { success, data: { count, data: T[] } } — spread root menimpa `data` array jadi wrapper object
                if (Array.isArray(n.data)) {
                    (responseData as Record<string, unknown>).data = n.data;
                }
            } else {
                responseData = (data as { data?: unknown }).data ?? data;
            }
        }


        return {
            success: true,
            data: responseData,
            response: response,
            status: response.status
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Log error untuk debugging
        if (isDevelopment) {
            console.error(`❌ [API REQUEST] Error fetching ${url}:`, error);
            console.error(`❌ [API REQUEST] Error message: ${errorMessage}`);
            console.error(`❌ [API REQUEST] API_BASE_URL: ${API_BASE_URL}`);
            console.error(`❌ [API REQUEST] Full URL: ${url}`);
            console.error(`❌ [API REQUEST] Pastikan proxy server (server.js) berjalan di: ${API_BASE_URL}`);
        } else {
            console.error(`❌ [API REQUEST] Error [${endpoint}]:`, error);
        }

        // Handle "Failed to fetch" error specifically
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
            const detailedError = isDevelopment
                ? `Tidak dapat terhubung ke server. Pastikan proxy server (server.js) berjalan di ${API_BASE_URL}. Error: ${errorMessage}`
                : 'Error connecting to backend API';
            return {
                success: false,
                error: detailedError,
                data: undefined,
                status: 0
            };
        }

        return {
            success: false,
            error: errorMessage || 'Error connecting to backend API',
            data: undefined,
            status: 500
        };
    }
};

// ============================================
// API METHODS - GET
// ============================================

/**
 * GET request
 * @param endpoint - Endpoint path
 * @param params - Query parameters
 * @returns Response data
 */
export const apiGet = async <T = any>(
    endpoint: string,
    params: Record<string, string | number> = {}
): Promise<ApiResponse<T>> => {
    let url = endpoint;

    // Tambahkan query parameters jika ada
    if (Object.keys(params).length > 0) {
        const queryString = new URLSearchParams(
            Object.entries(params).reduce((acc, [key, value]) => {
                acc[key] = String(value);
                return acc;
            }, {} as Record<string, string>)
        ).toString();
        url = `${endpoint}?${queryString}`;
    }

    return await apiRequest<T>(url, {
        method: 'GET',
    });
};

// ============================================
// API METHODS - POST
// ============================================

/**
 * POST request
 * @param endpoint - Endpoint path
 * @param data - Data yang akan dikirim
 * @returns Response data
 */
export const apiPost = async <T = any>(
    endpoint: string,
    data: any = {}
): Promise<ApiResponse<T>> => {
    const requestOptions: RequestInit = {
        method: 'POST',
    };

    // Kirim body jika data tidak kosong (meskipun ada query parameter)
    // Untuk endpoint seperti /garment/folding/out?rfid_garment=xxx dengan body { nik: "xxx" }
    if (data && Object.keys(data).length > 0) {
        requestOptions.body = JSON.stringify(data);
    }

    return await apiRequest<T>(endpoint, requestOptions);
};

// ============================================
// API METHODS - PUT
// ============================================

/**
 * PUT request
 * @param endpoint - Endpoint path
 * @param data - Data yang akan diupdate
 * @returns Response data
 */
export const apiPut = async <T = any>(
    endpoint: string,
    data: any = {}
): Promise<ApiResponse<T>> => {
    return await apiRequest<T>(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

// ============================================
// API METHODS - DELETE
// ============================================

/**
 * DELETE request
 * @param endpoint - Endpoint path
 * @returns Response data
 */
export const apiDelete = async <T = any>(
    endpoint: string
): Promise<ApiResponse<T>> => {
    return await apiRequest<T>(endpoint, {
        method: 'DELETE',
    });
};

// ============================================
// SPECIFIC API ENDPOINTS
// ============================================

/**
 * Health check endpoint
 * @returns Health status
 */
export const checkHealth = async (): Promise<ApiResponse> => {
    return await apiGet('/health');
};

/**
 * Get production statistics
 * @returns Production statistics
 */
export const getProductionStatistics = async (): Promise<ApiResponse> => {
    return await apiGet('/api/production/statistics');
};

/**
 * Get line data by ID
 * @param lineId - Line ID (contoh: '1' atau 1)
 * @returns Line data
 */
export const getLineData = async (lineId: string | number): Promise<ApiResponse<LineData>> => {
    return await apiGet<LineData>(`/api/line/${lineId}`);
};

/**
 * Get all lines
 * @returns All lines data
 */
export const getAllLines = async (): Promise<ApiResponse<LineData[]>> => {
    return await apiGet<LineData[]>('/api/line');
};

/**
 * Get all RFID
 * @returns All RFID data
 */
export const getAllRFID = async (): Promise<ApiResponse<RFIDData[]>> => {
    return await apiGet<RFIDData[]>('/api/rfid');
};

/**
 * Get RFID by ID
 * @param rfidId - RFID ID
 * @returns RFID data
 */
export const getRFIDById = async (rfidId: string): Promise<ApiResponse<RFIDData>> => {
    return await apiGet<RFIDData>(`/api/rfid/${rfidId}`);
};

/**
 * Create new RFID
 * @param rfidData - RFID data (id, status, line)
 * @returns Created RFID data
 */
export const createRFID = async (rfidData: Partial<RFIDData>): Promise<ApiResponse<RFIDData>> => {
    return await apiPost<RFIDData>('/api/rfid', rfidData);
};

/**
 * Update RFID
 * @param rfidId - RFID ID
 * @param rfidData - Updated RFID data
 * @returns Updated RFID data
 */
export const updateRFID = async (
    rfidId: string,
    rfidData: Partial<RFIDData>
): Promise<ApiResponse<RFIDData>> => {
    return await apiPut<RFIDData>(`/api/rfid/${rfidId}`, rfidData);
};

/**
 * Delete RFID
 * @param rfidId - RFID ID
 * @returns Deleted RFID data
 */
export const deleteRFID = async (rfidId: string): Promise<ApiResponse<RFIDData>> => {
    return await apiDelete<RFIDData>(`/api/rfid/${rfidId}`);
};

// ============================================
// AUTH ENDPOINTS
// ============================================

/**
 * Login dengan NIK dan Password menggunakan API baru
 * @param nik - NIK user
 * @param password - Password user (akan di-hash dengan MD5)
 * @returns Login response dengan user data
 */
export const login = async (nik: string, password?: string): Promise<ApiResponse<LoginResponse>> => {
    // Import MD5 hashing
    const CryptoJS = await import('crypto-js');

    // Hardcoded admin credentials - tidak perlu API
    if (nik === '12345' && password === 'admin') {
        const adminResponse: LoginResponse = {
            success: true,
            user: {
                nik: '12345',
                nama: 'Administrator',
                bagian: 'IT',
                line: '',
                no_hp: '',
                pwd_md5: '',
                rfid_user: '',
                telegram: '',
                jabatan: 'Administrator',
                role: 'admin'
            }
        };

        return {
            success: true,
            data: adminResponse,
            status: 200
        };
    }

    // Validasi password harus ada
    if (!password) {
        return {
            success: false,
            error: 'Password harus diisi',
            status: 400
        };
    }

    try {
        // Panggil API baru: GET /user?nik=...
        const endpoint = `/user?nik=${encodeURIComponent(nik)}`;
        const response = await apiGet<LoginResponse>(endpoint);


        // Cek jika response berhasil dan ada data user
        if (response.success && response.data && response.data.user) {
            // Hash password input dengan MD5
            const passwordHash = CryptoJS.MD5(password).toString();

            // Backend berbeda environment:
            // - GCC: hash di response.password_hash
            // - Env lain: hash di response.user.pwd_md5
            // Fallback ke beberapa kemungkinan field agar login tidak false negative.
            const dbPasswordHash = (
                response.data.password_hash ||
                response.data.user.pwd_md5 ||
                response.data.user.password_hash ||
                ''
            ).toString().trim();


            if (passwordHash.toLowerCase() === dbPasswordHash.toLowerCase()) {
                return {
                    success: true,
                    data: {
                        ...response.data,
                        success: true,
                        password_hash: passwordHash
                    },
                    status: 200
                };
            } else {
                // Password tidak cocok
                return {
                    success: false,
                    error: 'NIK atau Password salah',
                    status: 401
                };
            }
        } else {
            // User tidak ditemukan - cek apakah ini benar-benar 404 atau error lain
            if (response.status === 404) {
                return {
                    success: false,
                    error: 'NIK tidak ada',
                    status: 404
                };
            } else if (!response.success) {
                // Error dari API
                return {
                    success: false,
                    error: response.error || 'NIK tidak ada',
                    status: response.status || 404
                };
            } else {
                // Response success tapi tidak ada user data
                return {
                    success: false,
                    error: 'NIK tidak ada',
                    status: 404
                };
            }
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Terjadi kesalahan saat login',
            status: 500
        };
    }
};

/**
 * Login dengan NIK dan Password (POST request - untuk backward compatibility)
 * @param credentials - Login credentials (nik, password)
 * @returns Login response dengan token dan user data
 */
export const loginWithPassword = async (credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    // Gunakan GET request dengan query parameters
    return await login(credentials.nik, credentials.password);
};

// ============================================
// PRODUCTION DATA ENDPOINTS
// ============================================

/**
 * Get production data (Good, Reject, Rework)
 * @param lineId - Optional line ID untuk filter by line
 * @returns Production data
 */
export const getProductionData = async (lineId?: string | number): Promise<ApiResponse<ProductionData | any>> => {
    const endpoint = lineId ? `/api/production/data?lineId=${lineId}` : '/api/production/data';
    return await apiGet(endpoint);
};

// ============================================
// TRACKING DATA ENDPOINTS
// ============================================

export interface TrackingLineData {
    success: boolean;
    line: string;
    data: {
        good: string;
        output_line: string;
        pqc_good: string;
        pqc_reject: string;
        pqc_rework: string;
        reject: string;
        rework: string;
    };
}

/**
 * Get tracking data by line
 * @param line - Line number (1, 2, 3, etc.)
 * @returns Tracking line data
 */
export const getTrackingLineData = async (line: string | number): Promise<ApiResponse<TrackingLineData>> => {
    const endpoint = `/tracking/line?line=${encodeURIComponent(line)}`;
    return await apiGet<TrackingLineData>(endpoint);
};

// ============================================
// CARD DATA ENDPOINTS
// ============================================

export interface CardSummaryData {
    done: string;
    progress: string;
    total_cards: number;
    waiting: string;
}

export interface CardData {
    buyer: string;
    color: string;
    id_garment: number;
    isDone: string;
    isMove: string;
    item: string;
    rfid_garment: string;
    size: string;
    style: string;
    timestamp: string;
    updated: string;
    wo: string;
}

export interface CardResponse {
    count: number;
    data: CardData[];
    success?: boolean;
}

/**
 * Get card summary data
 * @returns Card summary data (done, progress, total_cards, waiting)
 */
export const getCardSummary = async (): Promise<ApiResponse<{ data: CardSummaryData[]; success: boolean }>> => {
    return await apiGet('/card');
};

/**
 * Get card data with progress status
 * @returns Card data with progress status
 */
export const getCardProgress = async (): Promise<ApiResponse<CardResponse>> => {
    return await apiGet<CardResponse>('/card/progress');
};

/**
 * Get card data with done status
 * @returns Card data with done status
 */
export const getCardDone = async (): Promise<ApiResponse<CardResponse>> => {
    return await apiGet<CardResponse>('/card/done');
};

/**
 * Get card data with waiting status
 * @returns Card data with waiting status
 */
export const getCardWaiting = async (): Promise<ApiResponse<CardResponse>> => {
    return await apiGet<CardResponse>('/card/waiting');
};

/**
 * Detail data per status & line (untuk modal Detail dan Output per Jam).
 * Contoh: GET /wira/detail?status=output_sewing&line=1&tanggal_from=2026-03-06&tanggal_to=2026-03-06
 * Response (output_sewing): { status, data: { summary_per_jam: [...], raw_data: [...] } }
 */
export const getWiraDetail = async (
    status: string,
    line: string | number,
    options?: { tanggal_from?: string; tanggal_to?: string }
): Promise<ApiResponse<{ status: string; filter_applied?: Record<string, string>; count?: number; data?: any; summary_per_jam?: unknown[] }>> => {
    const params: Record<string, string> = { status, line: String(line) };
    if (options?.tanggal_from) params.tanggal_from = options.tanggal_from;
    if (options?.tanggal_to) params.tanggal_to = options.tanggal_to;
    return await apiGet('/wira/detail', params);
};

export interface NeedlePickingItem {
    tanggal: string;
    needle_pick_time: string;
    needle_putting_time?: string;
    nama_operator: string;
    /** API terbaru memakai `nik`; `account` tetap opsional untuk kompatibilitas lama. */
    nik?: string;
    account?: string;
    line?: string;
    needle_parameter: string;
    model: string;
    qty?: number;
    location: string;
    operator_picture_path?: string;
    operator_picture_url?: string;
}

export interface NeedlePickingsResponse {
    count: number;
    data: NeedlePickingItem[];
}

export interface NeedleStockItem {
    nama_mesin?: string;
    name_machine?: string;
    needle_parameter: string;
    producer?: string;
    needle_type?: string;
    needle_size?: string;
    needle_style?: string;
    stock?: number;
    machine_picture_file?: string;
    machine_picture_url?: string;
}

export interface NeedleStockResponse {
    count: number;
    data: NeedleStockItem[];
}

/**
 * Needle Manager - daftar pengambilan needle.
 * Proxy path: /api/needle/pickings (server.js -> http://10.5.0.107:8080).
 * Query backend memakai tanggalfrom & tanggalto.
 */
export const getNeedlePickings = async (params: {
    tanggalfrom: string;
    tanggalto: string;
}): Promise<ApiResponse<NeedlePickingsResponse>> => {
    return await apiGet<NeedlePickingsResponse>('/api/needle/pickings', {
        tanggalfrom: params.tanggalfrom,
        tanggalto: params.tanggalto,
    });
};

/**
 * Needle Manager — data putting (proxy: /api/needle/putting).
 */
export const getNeedlePutting = async (params: {
    tanggalfrom: string;
    tanggalto: string;
}): Promise<ApiResponse<NeedlePickingsResponse>> => {
    return await apiGet<NeedlePickingsResponse>('/api/needle/putting', {
        tanggalfrom: params.tanggalfrom,
        tanggalto: params.tanggalto,
    });
};

/** Needle Manager — master stock + machine image. */
export const getNeedleStock = async (): Promise<ApiResponse<NeedleStockResponse>> => {
    return await apiGet<NeedleStockResponse>('/api/needle/stockneedle');
};

// ============================================
// FINISHING API ENDPOINTS
// ============================================

export interface FinishingRoomData {
    waiting: number;
    checkin: number;
    checkout: number;
}

export interface FinishingRejectRoomData extends FinishingRoomData {
    reject_mati: number;
}

export interface FinishingData {
    dryroom: FinishingRoomData;
    folding: FinishingRoomData;
    reject_room: FinishingRejectRoomData;
}

/**
 * Get finishing data
 * @returns Finishing data (dryroom, folding, reject_room)
 */
export const getFinishingData = async (): Promise<ApiResponse<FinishingData>> => {
    return await apiGet<FinishingData>('/finishing');
};

/**
 * Params untuk filter finishing (real-time status Dryroom/Folding)
 */
export interface GetFinishingDataParams {
    date_from?: string;
    date_to?: string;
    tanggalfrom?: string;
    tanggalto?: string;
    wo?: string;
    line?: string;
}

/**
 * Get finishing data dengan filter tanggal dan WO (untuk dashboard Dryroom & Folding)
 * Backend dapat mengembalikan data terfilter; bila backend belum mendukung, response sama dengan getFinishingData().
 * @param params - Optional filter: date_from (YYYY-MM-DD), date_to (YYYY-MM-DD), wo
 */
export const getFinishingDataWithFilter = async (params?: GetFinishingDataParams): Promise<ApiResponse<FinishingData>> => {
    const tanggalFrom = params?.tanggalfrom || params?.date_from;
    const tanggalTo = params?.tanggalto || params?.date_to;

    if (!tanggalFrom && !tanggalTo && !params?.wo && !params?.line) {
        return await apiGet<FinishingData>('/finishing');
    }

    const search = new URLSearchParams();
    if (tanggalFrom) search.set('tanggalfrom', tanggalFrom);
    if (tanggalTo) search.set('tanggalto', tanggalTo);
    if (params.wo) search.set('wo', params.wo);
    if (params.line) search.set('line', params.line);
    const query = search.toString();
    return await apiGet<FinishingData>(`/finishing${query ? `?${query}` : ''}`);
};

/**
 * Get finishing data per line
 * @param lineId - Line ID (e.g., "3")
 * @returns Finishing data (dryroom, folding, reject_room) for specific line
 */
export const getFinishingDataByLine = async (
    lineId: string,
    options?: { tanggalfrom?: string; tanggalto?: string }
): Promise<ApiResponse<FinishingData>> => {
    const query = new URLSearchParams({ line: lineId });
    if (options?.tanggalfrom) query.set('tanggalfrom', options.tanggalfrom);
    if (options?.tanggalto) query.set('tanggalto', options.tanggalto);
    return await apiGet<FinishingData>(`/finishing?${query.toString()}`);
};

/**
 * Interface untuk response check in/out finishing
 */
export interface FinishingCheckResponse {
    rfid_garment?: string;
    rfid?: string;
    area?: 'dryroom' | 'folding';
    action?: 'checkin' | 'checkout';
    timestamp?: string;
    message?: string;
    success?: boolean;
    wo?: string;
    style?: string;
    item?: string;
    buyer?: string;
    color?: string;
    size?: string;
    status?: string;
    nik_operator?: string;
    nama_operator?: string;
    is_done?: string;
    error?: string;
}

/**
 * Dryroom Check In — API backend (Django): `POST /garment/dryroom/in?rfid_garment=…` (+ body `{ nik }` opsional).
 * Request lewat `API_BASE_URL` (biasanya proxy `server.js` → forward ke backend :7000).
 */
export const dryroomCheckIn = async (rfid_garment: string, nik?: string): Promise<ApiResponse<FinishingCheckResponse>> => {
    const trimmed = nik?.trim();
    const body = trimmed ? { nik: trimmed } : {};
    return await apiPost<FinishingCheckResponse>(`/garment/dryroom/in?rfid_garment=${encodeURIComponent(rfid_garment)}`, body);
};

/**
 * Dryroom Check Out — API backend: `POST /garment/dryroom/out?rfid_garment=…` (+ body `{ nik }` opsional).
 * Sama seperti check in: lewat `API_BASE_URL`, bukan endpoint `/api/scanning/...`.
 */
export const dryroomCheckOut = async (rfid_garment: string, nik?: string): Promise<ApiResponse<FinishingCheckResponse>> => {
    const trimmed = nik?.trim();
    const body = trimmed ? { nik: trimmed } : {};
    return await apiPost<FinishingCheckResponse>(`/garment/dryroom/out?rfid_garment=${encodeURIComponent(rfid_garment)}`, body);
};

/**
 * Dryroom Urgent — `POST /garment/dryroom/urgent?rfid_garment={rfid}`
 * Body: `{ "nik": "string" }`
 */
export const dryroomUrgent = async (rfid_garment: string, nik?: string): Promise<ApiResponse<FinishingCheckResponse>> => {
    const trimmedRfid = rfid_garment?.trim();
    if (!trimmedRfid) {
        return { success: false, error: 'rfid_garment wajib diisi', status: 400 };
    }
    const trimmed = nik?.trim();
    const body = trimmed ? { nik: trimmed } : {};
    return await apiPost<FinishingCheckResponse>(
        `/garment/dryroom/urgent?rfid_garment=${encodeURIComponent(trimmedRfid)}`,
        body
    );
};

/** Satu scan sukses terakhir per mode (dari respons API dryroom in/out). */
export interface ScanningDryroomLastScan {
    rfid: string | null;
    wo: string | null;
    item: string | null;
    buyer: string | null;
    style: string | null;
    color: string | null;
    size: string | null;
    status: string | null;
    message: string | null;
    updatedAt: string | null;
}

/**
 * Panel dryroom per mode: operator terpisah Check In vs Check Out + detail scan terakhir.
 * Hanya di `server.js`; query `mode=checkin|checkout`.
 */
export interface ScanningDryroomPanelState {
    mode: 'checkin' | 'checkout' | 'urgent';
    nama_operator: string;
    nik_operator: string;
    updatedAt: string | null;
    last_scan: ScanningDryroomLastScan | null;
}

/** Baca operator + last scan — server Node; `mode` harus sesuai tab Check In / Check Out. */
export const getScanningDryroomOperator = async (
    mode: 'checkin' | 'checkout' | 'urgent' = 'checkin'
): Promise<ApiResponse<ScanningDryroomPanelState>> => {
    const q =
        mode === 'checkout' ? '?mode=checkout' : mode === 'urgent' ? '?mode=urgent' : '?mode=checkin';
    const url = `${getNodeProxyBaseUrl()}/api/scanning/dryroom/operator${q}`;
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: getDefaultHeaders(),
        });
        const contentType = response.headers.get('content-type');
        let data: Record<string, unknown>;
        if (contentType && contentType.includes('application/json')) {
            data = (await response.json()) as Record<string, unknown>;
        } else {
            const text = await response.text();
            return {
                success: false,
                error: text || `HTTP ${response.status}`,
                data: undefined,
                status: response.status,
            };
        }
        if (!response.ok) {
            return {
                success: false,
                error: String(data.message || data.error || `HTTP ${response.status}`),
                data: undefined,
                status: response.status,
            };
        }
        const responseData = (data.data !== undefined ? data.data : data) as ScanningDryroomPanelState;
        return {
            success: true,
            data: responseData,
            status: response.status,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (isDevelopment) {
            console.warn('[getScanningDryroomOperator] Proxy Node harus jalan di', getNodeProxyBaseUrl(), errorMessage);
        }
        return {
            success: false,
            error: errorMessage,
            data: undefined,
            status: 0,
        };
    }
};

/**
 * Folding Check In
 * @param rfid_garment - Nomor RFID garment yang akan di-check in
 * @param nik - NIK user (wajib di backend; sama pola dengan dryroom check-in)
 * @returns Response data check in
 */
export const foldingCheckIn = async (rfid_garment: string, nik?: string): Promise<ApiResponse<FinishingCheckResponse>> => {
    const trimmed = nik?.trim();
    // Backend beberapa environment memakai `nik` atau `nik_user` di JSON (pesan validasi: "NIK User").
    const body = trimmed ? { nik: trimmed, nik_user: trimmed } : {};
    return await apiPost<FinishingCheckResponse>(`/garment/folding/in?rfid_garment=${encodeURIComponent(rfid_garment)}`, body);
};

export const foldingCheckOut = async (rfid_garment: string, nik?: string, tableNumber?: number): Promise<ApiResponse<FinishingCheckResponse>> => {
    const body: { nik?: string; table?: string } = {};
    if (nik) body.nik = nik;
    if (tableNumber) body.table = tableNumber.toString();
    return await apiPost<FinishingCheckResponse>(`/garment/folding/out?rfid_garment=${encodeURIComponent(rfid_garment)}`, body);
};

/**
 * Folding Urgent — `POST /garment/folding/urgent?rfid_garment={rfid}`
 * Body: `{ "nik": "string" }`
 */
export const foldingUrgent = async (rfid_garment: string, nik?: string): Promise<ApiResponse<FinishingCheckResponse>> => {
    const trimmedRfid = rfid_garment?.trim();
    if (!trimmedRfid) {
        return { success: false, error: 'rfid_garment wajib diisi', status: 400 };
    }
    const trimmed = nik?.trim();
    const body = trimmed ? { nik: trimmed } : {};
    return await apiPost<FinishingCheckResponse>(
        `/garment/folding/urgent?rfid_garment=${encodeURIComponent(trimmedRfid)}`,
        body
    );
};

/**
 * Reject Room Check In
 * @param rfid_garment - Nomor RFID garment yang akan di-check in
 * @returns Response data check in
 */
export const rejectRoomCheckIn = async (rfid_garment: string): Promise<ApiResponse<FinishingCheckResponse>> => {
    return await apiPost<FinishingCheckResponse>(`/garment/reject/in?rfid_garment=${encodeURIComponent(rfid_garment)}`, {});
};

/**
 * Reject Room Check Out
 * @param rfid_garment - Nomor RFID garment yang akan di-check out
 * @returns Response data check out
 */
export const rejectRoomCheckOut = async (rfid_garment: string): Promise<ApiResponse<FinishingCheckResponse>> => {
    return await apiPost<FinishingCheckResponse>(`/garment/reject/out?rfid_garment=${encodeURIComponent(rfid_garment)}`, {});
};

/**
 * Reject Room Reject Mati (Scrap)
 * @param rfid_garment - Nomor RFID garment yang di-scan untuk reject mati / scrap
 * @returns Response data
 */
export const rejectRoomScrap = async (rfid_garment: string): Promise<ApiResponse<FinishingCheckResponse>> => {
    return await apiPost<FinishingCheckResponse>(`/garment/reject/scrap?rfid_garment=${encodeURIComponent(rfid_garment)}`, {});
};

// ============================================
// QC / PQC CHECK (Dashboard RFID scan)
// Backend: POST http://10.5.0.106:7000/qc/check | /pqc/check
// ============================================

export type QcCheckStatus = 'GOOD' | 'REWORK' | 'REJECT';
export type PqcCheckStatus = 'PQC_GOOD' | 'PQC_REWORK' | 'PQC_REJECT';

export interface QcCheckRequest {
    rfid_garment: string;
    status_qc: QcCheckStatus;
    rfid_user: string;
}

export interface PqcCheckRequest {
    rfid_garment: string;
    status_pqc: PqcCheckStatus;
    rfid_user: string;
}

export interface QcPqcCheckResponse {
    success?: boolean;
    message?: string;
    detail?: string;
    error?: string;
    [key: string]: unknown;
}

/** QC check — status GOOD, REWORK, atau REJECT (user QC/ROBOTIC). */
export const postQcCheck = async (body: QcCheckRequest): Promise<ApiResponse<QcPqcCheckResponse>> => {
    return await apiPost<QcPqcCheckResponse>('/qc/check', body);
};

/** PQC check — status PQC_GOOD, PQC_REWORK, atau PQC_REJECT (user PQC/ROBOTIC). */
export const postPqcCheck = async (body: PqcCheckRequest): Promise<ApiResponse<QcPqcCheckResponse>> => {
    return await apiPost<QcPqcCheckResponse>('/pqc/check', body);
};

// ============================================
// ACTIVE USERS API ENDPOINTS
// ============================================

export interface ActiveUser {
    nik: string;
    name: string;
    jabatan: string;
    line: string;
    loginTime: string;
    ipAddress: string;
}

/**
 * Get active users (yang sedang login)
 * @param line - Optional line number untuk get user by line
 * @returns Response data active users
 */
export const getActiveUsers = async (line?: string | number): Promise<ApiResponse<ActiveUser | ActiveUser[]>> => {
    const endpoint = line ? `/api/active-users?line=${line}` : '/api/active-users';
    return await apiGet<ActiveUser | ActiveUser[]>(endpoint);
};

/**
 * Get user yang sedang scan di folding table (realtime tracking)
 * @param table - Table number (optional)
 * @returns User yang sedang scan atau null
 */
export const getScanningUsers = async (table?: string | number): Promise<ApiResponse<{ nik: string; name: string; line: string; scanStartTime: string } | { nik: string; name: string; line: string; scanStartTime: string }[]>> => {
    const endpoint = table ? `/api/scanning-users?table=${table}` : '/api/scanning-users';
    return await apiGet<{ nik: string; name: string; line: string; scanStartTime: string } | { nik: string; name: string; line: string; scanStartTime: string }[]>(endpoint);
};

/**
 * Logout user dan hapus dari active sessions
 * @param nik - NIK user yang akan logout (optional)
 * @param line - Line number yang akan logout (optional)
 * @returns Response data logout
 */
export const logoutUser = async (nik?: string, line?: string | number): Promise<ApiResponse> => {
    const body: { nik?: string; line?: string } = {};
    if (nik) body.nik = nik;
    if (line) body.line = line.toString();
    return await apiPost('/api/auth/logout', body);
};

/**
 * Cek apakah session user masih valid di server (setelah auto-logout, session di server dihapus)
 * @param nik - NIK user dari localStorage
 * @returns { valid: true } jika masih login, { valid: false } jika harus login lagi
 */
export const checkSession = async (nik: string): Promise<ApiResponse<{ valid: boolean }>> => {
    return await apiGet<{ valid: boolean }>('/api/auth/session', { nik });
};

// ============================================
// PRODUCTION SCHEDULE API ENDPOINTS
// ============================================

export interface WOBreakdownData {
    id: number;
    wo_no: string;
    start_date: string;
    finish_date: string;
    style: string;
    buyer: string;
    product_name: string;
    color: string;
    size: string;
    qty: string;
    branch: string;
    line: string;
}

export interface WOBreakdownResponse {
    data: WOBreakdownData[];
}

/**
 * Get WO Breakdown dari Production Schedule API
 * @param branch - Branch code (contoh: 'CJL')
 * @param startDateFrom - Start date from (format: YYYY-MM-DD)
 * @param startDateTo - Start date to (format: YYYY-MM-DD, optional)
 * @returns WO Breakdown data (semua WO dari semua line)
 */
export const getWOBreakdown = async (
    branch: string = 'CJL',
    startDateFrom?: string,
    startDateTo?: string
): Promise<ApiResponse<WOBreakdownResponse>> => {
    try {
        // Gunakan proxy endpoint dari server.js untuk menghindari CORS dan rate limiting
        // Proxy akan memanggil ke 10.8.18.60:7186 dengan header GCC-API-KEY
        // Parameter Line dihilangkan agar mendapatkan semua WO dari setiap line
        let apiUrl = `${API_BASE_URL}/api/prod-sch/get-wo-breakdown?branch=${encodeURIComponent(branch)}`;

        // Tambahkan start_date_from jika ada
        if (startDateFrom) {
            apiUrl += `&start_date_from=${encodeURIComponent(startDateFrom)}`;
        }

        // Tambahkan start_date_to jika ada
        if (startDateTo) {
            apiUrl += `&start_date_to=${encodeURIComponent(startDateTo)}`;
        }

        console.log('🔵 [WO BREAKDOWN API] Fetching via proxy:', apiUrl);

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                ...getDefaultHeaders(),
            },
        });

        console.log('🔵 [WO BREAKDOWN API] Response status:', response.status, response.statusText);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
            console.error('❌ [WO BREAKDOWN API] Error response:', errorMessage);
            return {
                success: false,
                error: errorMessage,
                data: undefined,
                status: response.status
            };
        }

        const result: WOBreakdownResponse = await response.json();
        console.log('✅ [WO BREAKDOWN API] Success:', result);

        return {
            success: true,
            data: result,
            status: response.status
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ [WO BREAKDOWN API] Fetch error:', error);
        console.error('❌ [WO BREAKDOWN API] Error details:', {
            message: errorMessage,
            stack: error instanceof Error ? error.stack : undefined
        });

        return {
            success: false,
            error: errorMessage,
            data: undefined,
            status: 500
        };
    }
};

// ============================================
// CUTTING PROSES — Bundle (inputRFID) + scan state lokal (proxy server.js)
// ============================================

export interface InputRfidCuttingBody {
    rfid_garment: string;
    /** Alias eksplisit untuk payload API GCC output */
    rfid_bundles?: string;
    item: string;
    buyer: string;
    style: string;
    wo: string;
    color: string;
    size: string;
    /** Jumlah pcs per bundle (opsional; dikirim juga sebagai `wty` untuk kompatibilitas backend) */
    qty?: number;
    wty?: number;
    /** Total batch register cutting (Daftar RFID Cutting) */
    total_batch?: number;
    /** Field opsional untuk endpoint GCC output */
    barcode?: string;
    placing?: string;
    season?: string;
    country?: string;
    meja?: string;
    warna?: string;
    no_ikat?: string | number;
    no_urut?: string | number;
    id_bundles?: string | number;
    id_user?: string | number;
    nik?: string;
    qty_output?: number;
    last_status?: string;
    output_time?: string;
}

export interface GccCuttingRfidBatchItem {
    batch: number;
    rfid_batch: string;
}

export interface GccCuttingRegisterBatchBody {
    barcode: string;
    rfid_bundles: string;
    rfid_batch: GccCuttingRfidBatchItem[];
}

/** Pesan UI saat batch belum di-plot di sistem DT. */
export const GCC_CUTTING_REG_BATCH_NOT_PLOTTED_MSG =
    'Hubungi Team DT karena data batch belum di plot';

/** Satu baris batch dari GET `/api/gcc/cutting/reg/batch` (body `{ barcode }`). */
export interface GccCuttingRegBatchRow {
    id_bundles?: number;
    cutting_order_breakdown_bundle_id?: number;
    barcode?: string;
    batch?: string | number;
    ket_batch?: string;
    rfid_batch?: string | null;
    qty_bundles?: number;
}

/** Respons GET `/api/gcc/cutting/reg/batch` (body `{ barcode }`). */
export interface GccCuttingRegBatchResponse {
    code?: number;
    status?: string;
    message?: string;
    count?: number;
    data?: GccCuttingRegBatchRow[];
}

function getLoggedNik(): string {
    if (typeof window === 'undefined') return '';
    try {
        const raw = localStorage.getItem('user');
        if (!raw) return '';
        const u = JSON.parse(raw) as { nik?: string };
        return typeof u.nik === 'string' ? u.nik : '';
    } catch {
        return '';
    }
}

/** Resolve URL POST bundle GCC reg (`/api/gcc/cutting/reg`) untuk fitur Input Register. */
function resolveGccCuttingRegUrl(): string {
    const fromEnv = (import.meta.env.VITE_GCC_CUTTING_REG_URL as string | undefined)?.trim();
    if (fromEnv) {
        const t = fromEnv.replace(/\/$/, '');
        return t.includes('/api/gcc/cutting/reg') ? t : `${t}/api/gcc/cutting/reg`;
    }
    const listEnv = (import.meta.env.VITE_GCC_CUTTING_LIST_URL as string | undefined)?.trim();
    if (listEnv) {
        const t = listEnv.replace(/\/$/, '');
        if (t.includes('/api/gcc/cutting/list')) return t.replace('/api/gcc/cutting/list', '/api/gcc/cutting/reg');
        return `${t}/api/gcc/cutting/reg`;
    }
    return resolveSameOriginServiceUrl('/api/gcc/cutting/reg', 'http://10.5.0.107:9000/api/gcc/cutting/reg');
}

/** Resolve URL GET daftar batch register (`/api/gcc/cutting/reg/batch`). */
function resolveGccCuttingRegBatchUrl(): string {
    const fromEnv = (import.meta.env.VITE_GCC_CUTTING_REG_BATCH_URL as string | undefined)?.trim();
    if (fromEnv) {
        const t = fromEnv.replace(/\/$/, '');
        return t.includes('/api/gcc/cutting/reg/batch') ? t : `${t}/api/gcc/cutting/reg/batch`;
    }
    const regEnv = (import.meta.env.VITE_GCC_CUTTING_REG_URL as string | undefined)?.trim();
    if (regEnv) {
        const t = regEnv.replace(/\/$/, '');
        if (t.includes('/api/gcc/cutting/reg')) return t.replace('/api/gcc/cutting/reg', '/api/gcc/cutting/reg/batch');
        return `${t}/api/gcc/cutting/reg/batch`;
    }
    const listEnv = (import.meta.env.VITE_GCC_CUTTING_LIST_URL as string | undefined)?.trim();
    if (listEnv) {
        const t = listEnv.replace(/\/$/, '');
        if (t.includes('/api/gcc/cutting/list')) return t.replace('/api/gcc/cutting/list', '/api/gcc/cutting/reg/batch');
        return `${t}/api/gcc/cutting/reg/batch`;
    }
    return resolveSameOriginServiceUrl('/api/gcc/cutting/reg/batch', 'http://10.5.0.107:9000/api/gcc/cutting/reg/batch');
}

/** Normalisasi pesan error batch register — batch belum di-plot → arahkan ke Team DT. */
export function resolveGccCuttingRegBatchError(
    body: GccCuttingRegBatchResponse | unknown,
    fallback = 'Gagal memuat daftar batch register'
): string {
    const b = body as GccCuttingRegBatchResponse;
    const msg = String(b?.message ?? '').trim();
    const dataNull = b?.data == null;
    const dataEmpty = Array.isArray(b?.data) && b.data.length === 0;
    if (dataNull || dataEmpty || /data batch tidak ditemukan/i.test(msg)) {
        return GCC_CUTTING_REG_BATCH_NOT_PLOTTED_MSG;
    }
    return msg || fallback;
}

/** Urutkan baris batch berdasarkan nomor batch ascending. */
export function sortGccCuttingRegBatchRows(rows: GccCuttingRegBatchRow[]): GccCuttingRegBatchRow[] {
    return [...rows].sort((a, b) => {
        const na = Number(a?.batch);
        const nb = Number(b?.batch);
        if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
        return String(a?.batch ?? '').localeCompare(String(b?.batch ?? ''), undefined, { numeric: true });
    });
}

/** Ambil array batch dari respons GET `/api/gcc/cutting/reg/batch`. */
export function extractGccCuttingRegBatchRows(data: unknown): GccCuttingRegBatchRow[] {
    if (!data || typeof data !== 'object') return [];
    const body = data as GccCuttingRegBatchResponse;
    const raw = Array.isArray(body.data) ? body.data : [];
    return sortGccCuttingRegBatchRows(raw);
}

/**
 * Ambil daftar batch untuk register cutting.
 * Browser POST ke proxy lokal; proxy meneruskan GET + body `{ barcode }` ke
 * `http://10.5.0.107:9000/api/gcc/cutting/reg/batch`.
 */
export async function fetchGccCuttingRegBatchList(
    barcode: string
): Promise<ApiResponse<GccCuttingRegBatchResponse>> {
    const bc = String(barcode || '').trim();
    if (!bc) {
        return { success: false, error: 'Barcode wajib diisi', status: 400 };
    }
    const baseUrl = resolveGccCuttingRegBatchUrl();
    try {
        const res = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                ...getGccCuttingBundlesRequestHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ barcode: bc }),
        });
        const text = await res.text();
        let data: unknown = null;
        try {
            data = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
        } catch {
            return { success: false, error: 'Respons batch register bukan JSON', status: 502 };
        }
        const body = data as GccCuttingRegBatchResponse;
        const rows = extractGccCuttingRegBatchRows(data);
        if (!res.ok || !isGccCuttingApiBodyOk(data) || rows.length === 0) {
            return {
                success: false,
                error: resolveGccCuttingRegBatchError(
                    body,
                    body.message || body.status || `HTTP ${res.status}`
                ),
                data: body,
                status: res.status,
            };
        }
        return { success: true, data: body, status: res.status };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal memuat daftar batch register',
            status: 500,
        };
    }
}

/** URL register cutting — selalu same-origin `/api/gcc/cutting/reg` di browser. */
function resolveGccCuttingRegFallbackUrls(): string[] {
    return [resolveGccCuttingRegUrl()];
}

/** Resolve URL POST bundle GCC output (`/api/gcc/cutting/output`) untuk Scanning Station Bundle. */
function resolveGccCuttingOutputUrl(): string {
    const fromEnv = (import.meta.env.VITE_GCC_CUTTING_OUTPUT_URL as string | undefined)?.trim();
    if (fromEnv) {
        const t = fromEnv.replace(/\/$/, '');
        return t.includes('/api/gcc/cutting/output') ? t : `${t}/api/gcc/cutting/output`;
    }
    const listEnv = (import.meta.env.VITE_GCC_CUTTING_LIST_URL as string | undefined)?.trim();
    if (listEnv) {
        const t = listEnv.replace(/\/$/, '');
        if (t.includes('/api/gcc/cutting/list')) return t.replace('/api/gcc/cutting/list', '/api/gcc/cutting/output');
        return `${t}/api/gcc/cutting/output`;
    }
    return resolveSameOriginServiceUrl('/api/gcc/cutting/output', 'http://10.5.0.107:9000/api/gcc/cutting/output');
}

/** Resolve URL POST supply sewing (`/api/gcc/cutting/sewing`). */
function resolveGccCuttingSewingUrl(): string {
    const fromEnv = (import.meta.env.VITE_GCC_CUTTING_SEWING_URL as string | undefined)?.trim();
    if (fromEnv) {
        const t = fromEnv.replace(/\/$/, '');
        return t.includes('/api/gcc/cutting/sewing') ? t : `${t}/api/gcc/cutting/sewing`;
    }
    return resolveSameOriginServiceUrl('/api/gcc/cutting/sewing', 'http://10.5.0.107:9000/api/gcc/cutting/sewing');
}

/** `GM 1` → `GM1` untuk body API sewing. */
export function formatGccCuttingSewingBranch(location: string): string {
    return String(location || '')
        .trim()
        .replace(/\s+/g, '')
        .toUpperCase();
}

/** Nomor line UI → `L01` sesuai kontrak API sewing. */
export function formatGccCuttingSewingLine(lineNum: number): number {
    return lineNum;
}

export interface GccCuttingSewingRequest {
    rfid_bundles: string;
    nik: string;
    line: string | number;
    branch: string;
    qty_receive: string;
}

export interface GccCuttingSewingResponse {
    code?: number;
    status?: string;
    message?: string;
    data?: {
        id_bundles?: number;
        rfid_bundles?: string;
        id_user?: number;
        nik?: string;
        last_status?: string;
        batch?: string;
        qty_batch?: number;
        qty_sewing?: number;
        line?: string;
        branch?: string;
        is_done?: number;
        last_time_sewing?: string;
    };
}

/** POST supply sewing scan — `/api/gcc/cutting/sewing`. */
export async function postGccCuttingSewing(
    body: GccCuttingSewingRequest
): Promise<ApiResponse<GccCuttingSewingResponse>> {
    const payload: GccCuttingSewingRequest = {
        rfid_bundles: String(body.rfid_bundles || '').trim(),
        nik: String(body.nik || '').trim(),
        line: body.line !== '' ? body.line : '',
        branch: String(body.branch || '').trim(),
        qty_receive: String(body.qty_receive ?? '').trim(),
    };
    if (!payload.rfid_bundles || !payload.nik || !payload.line || !payload.branch || !payload.qty_receive) {
        return { success: false, error: 'Field wajib: rfid_bundles, nik, line, branch, qty_receive.', status: 400 };
    }
    const url = resolveGccCuttingSewingUrl();
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                ...getGccCuttingBundlesRequestHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const text = await res.text();
        let data: unknown = null;
        try {
            data = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
        } catch {
            return { success: false, error: 'Respons POST sewing bukan JSON', status: 502 };
        }
        const bodyRes = data as GccCuttingSewingResponse;
        const code = bodyRes?.code;
        const okByBody = code == null || code === 200;
        if (!res.ok || !okByBody) {
            const msg = bodyRes.message || bodyRes.status || `HTTP ${res.status}`;
            return { success: false, error: String(msg), data: bodyRes, status: res.status };
        }
        return { success: true, data: bodyRes, status: res.status };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal POST supply sewing',
            status: 500,
        };
    }
}

/** Resolve URL POST QC bundle GCC (`/api/gcc/cutting/qc`) untuk Scanning Station Quality Control. */
function resolveGccCuttingQcUrl(): string {
    const fromEnv = (import.meta.env.VITE_GCC_CUTTING_QC_URL as string | undefined)?.trim();
    if (fromEnv) {
        const t = fromEnv.replace(/\/$/, '');
        return t.includes('/api/gcc/cutting/qc') ? t : `${t}/api/gcc/cutting/qc`;
    }
    const listEnv = (import.meta.env.VITE_GCC_CUTTING_LIST_URL as string | undefined)?.trim();
    if (listEnv) {
        const t = listEnv.replace(/\/$/, '');
        if (t.includes('/api/gcc/cutting/list')) return t.replace('/api/gcc/cutting/list', '/api/gcc/cutting/qc');
        return `${t}/api/gcc/cutting/qc`;
    }
    return resolveSameOriginServiceUrl('/api/gcc/cutting/qc', 'http://10.5.0.107:9000/api/gcc/cutting/qc');
}

/** Resolve URL GET GCC qty QC (`/api/gcc/cutting/qc/qty`) untuk pre-check RFID QC. */
function resolveGccCuttingQcQtyUrl(): string {
    const fromEnv = (import.meta.env.VITE_GCC_CUTTING_QC_QTY_URL as string | undefined)?.trim();
    if (fromEnv) {
        const t = fromEnv.replace(/\/$/, '');
        return t.includes('/api/gcc/cutting/qc/qty') ? t : `${t}/api/gcc/cutting/qc/qty`;
    }
    const qcEnv = (import.meta.env.VITE_GCC_CUTTING_QC_URL as string | undefined)?.trim();
    if (qcEnv) {
        const t = qcEnv.replace(/\/$/, '');
        if (t.includes('/api/gcc/cutting/qc')) return t.replace('/api/gcc/cutting/qc', '/api/gcc/cutting/qc/qty');
        return `${t}/api/gcc/cutting/qc/qty`;
    }
    const listEnv = (import.meta.env.VITE_GCC_CUTTING_LIST_URL as string | undefined)?.trim();
    if (listEnv) {
        const t = listEnv.replace(/\/$/, '');
        if (t.includes('/api/gcc/cutting/list')) return t.replace('/api/gcc/cutting/list', '/api/gcc/cutting/qc/qty');
        return `${t}/api/gcc/cutting/qc/qty`;
    }
    return resolveSameOriginServiceUrl('/api/gcc/cutting/qc/qty', 'http://10.5.0.107:9000/api/gcc/cutting/qc/qty');
}

/** Resolve URL GET qty repair (`/api/gcc/cutting/qc/qty/repair`). */
export function resolveGccCuttingQcQtyRepairUrl(): string {
    const fromEnv = (import.meta.env.VITE_GCC_CUTTING_QC_QTY_REPAIR_URL as string | undefined)?.trim();
    if (fromEnv) {
        const t = fromEnv.replace(/\/$/, '');
        return t.includes('/api/gcc/cutting/qc/qty/repair') ? t : `${t}/api/gcc/cutting/qc/qty/repair`;
    }
    const qtyUrl = resolveGccCuttingQcQtyUrl();
    if (qtyUrl.includes('/qc/qty')) return `${qtyUrl.replace(/\/$/, '')}/repair`;
    return resolveSameOriginServiceUrl(
        '/api/gcc/cutting/qc/qty/repair',
        'http://10.5.0.107:9000/api/gcc/cutting/qc/qty/repair'
    );
}

/** Resolve URL POST repair → good (`/api/gcc/cutting/qc/repair/good`). */
export function resolveGccCuttingQcRepairGoodUrl(): string {
    const fromEnv = (import.meta.env.VITE_GCC_CUTTING_QC_REPAIR_GOOD_URL as string | undefined)?.trim();
    if (fromEnv) {
        const t = fromEnv.replace(/\/$/, '');
        return t.includes('/api/gcc/cutting/qc/repair/good') ? t : `${t}/api/gcc/cutting/qc/repair/good`;
    }
    const qcUrl = resolveGccCuttingQcUrl();
    if (qcUrl.includes('/api/gcc/cutting/qc')) return `${qcUrl.replace(/\/$/, '')}/repair/good`;
    return resolveSameOriginServiceUrl(
        '/api/gcc/cutting/qc/repair/good',
        'http://10.5.0.107:9000/api/gcc/cutting/qc/repair/good'
    );
}

/** Resolve URL POST repair → reject (`/api/gcc/cutting/qc/repair/reject`). */
export function resolveGccCuttingQcRepairRejectUrl(): string {
    const fromEnv = (import.meta.env.VITE_GCC_CUTTING_QC_REPAIR_REJECT_URL as string | undefined)?.trim();
    if (fromEnv) {
        const t = fromEnv.replace(/\/$/, '');
        return t.includes('/api/gcc/cutting/qc/repair/reject') ? t : `${t}/api/gcc/cutting/qc/repair/reject`;
    }
    const qcUrl = resolveGccCuttingQcUrl();
    if (qcUrl.includes('/api/gcc/cutting/qc')) return `${qcUrl.replace(/\/$/, '')}/repair/reject`;
    return resolveSameOriginServiceUrl(
        '/api/gcc/cutting/qc/repair/reject',
        'http://10.5.0.107:9000/api/gcc/cutting/qc/repair/reject'
    );
}

export interface GccCuttingQcQtyRepairResponse {
    code?: number;
    status?: string;
    message?: string;
    data?: {
        id_bundles?: number;
        rfid_bundles?: string;
        qty_repair?: number;
    };
}

export interface GccCuttingQcRepairActionData {
    id_bundles?: number;
    rfid_bundles?: string;
    id_user?: number;
    nik?: string;
    last_status?: string;
    batch?: string;
    qty_batch?: number;
    qty_output?: number;
    qty_good_before?: number;
    qty_repair_before?: number;
    qty_reject?: number;
    qty_good_after?: number;
    qty_repair_after?: number;
    repair_good_time?: string;
    tracking_log_id?: number;
}

export interface GccCuttingQcRepairActionResponse {
    code?: number;
    status?: string;
    message?: string;
    data?: GccCuttingQcRepairActionData;
}

async function gccCuttingQcGetJson<T>(url: string, rfid_bundles: string): Promise<ApiResponse<T>> {
    const rid = String(rfid_bundles || '').trim();
    if (!rid) return { success: false, error: 'RFID wajib diisi', status: 400 };
    try {
        const qsUrl = `${url}${url.includes('?') ? '&' : '?'}rfid_bundles=${encodeURIComponent(rid)}`;
        const res = await fetch(qsUrl, {
            method: 'GET',
            headers: getGccCuttingBundlesRequestHeaders(),
        });
        const text = await res.text();
        let data: unknown = null;
        try {
            data = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
        } catch {
            return { success: false, error: 'Respons bukan JSON', status: 502 };
        }
        if (!res.ok || !isGccCuttingApiBodyOk(data)) {
            const body = data as { message?: string; status?: string };
            const msg = body.message || body.status || `HTTP ${res.status}`;
            return { success: false, error: String(msg), data: data as T, status: res.status };
        }
        return { success: true, data: data as T, status: res.status };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal GET',
            status: 500,
        };
    }
}

async function gccCuttingQcPostJson<T>(
    url: string,
    body: { rfid_bundles: string; qty: number; nik: string }
): Promise<ApiResponse<T>> {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                ...getGccCuttingBundlesRequestHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        const text = await res.text();
        let data: unknown = null;
        try {
            data = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
        } catch {
            return { success: false, error: 'Respons bukan JSON', status: 502 };
        }
        const parsed = data as { code?: number; status?: string; message?: string };
        const st = String(parsed.status || '').toLowerCase();
        const okByBody = !(typeof parsed.code === 'number' && parsed.code >= 400) && (parsed.code === 200 || st === 'success');
        if (!res.ok || !okByBody) {
            const msg = parsed.message || parsed.status || `HTTP ${res.status}`;
            return { success: false, error: String(msg), data: data as T, status: res.status };
        }
        return { success: true, data: data as T, status: res.status };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal POST',
            status: 500,
        };
    }
}

/** GET qty repair untuk bundle (sebelum Send To Good / Reject). */
export const getGccCuttingQcQtyRepair = async (rfid_bundles: string): Promise<ApiResponse<GccCuttingQcQtyRepairResponse>> => {
    return gccCuttingQcGetJson<GccCuttingQcQtyRepairResponse>(resolveGccCuttingQcQtyRepairUrl(), rfid_bundles);
};

/** POST konversi repair → good. */
export const postGccCuttingQcRepairGood = async (body: {
    rfid_bundles: string;
    qty: number;
    nik?: string | number;
}): Promise<ApiResponse<GccCuttingQcRepairActionResponse>> => {
    const nik = body.nik != null && String(body.nik).trim() !== '' ? String(body.nik).trim() : getLoggedNik();
    return gccCuttingQcPostJson<GccCuttingQcRepairActionResponse>(resolveGccCuttingQcRepairGoodUrl(), {
        rfid_bundles: body.rfid_bundles,
        qty: Math.max(0, Number(body.qty) || 0),
        nik,
    });
};

/** POST konversi repair → reject. */
export const postGccCuttingQcRepairReject = async (body: {
    rfid_bundles: string;
    qty: number;
    nik?: string | number;
}): Promise<ApiResponse<GccCuttingQcRepairActionResponse>> => {
    const nik = body.nik != null && String(body.nik).trim() !== '' ? String(body.nik).trim() : getLoggedNik();
    return gccCuttingQcPostJson<GccCuttingQcRepairActionResponse>(resolveGccCuttingQcRepairRejectUrl(), {
        rfid_bundles: body.rfid_bundles,
        qty: Math.max(0, Number(body.qty) || 0),
        nik,
    });
};

/** Resolve URL POST GCC supermarket (`/api/gcc/cutting/smarket`). */
function resolveGccCuttingSmarketUrl(): string {
    const fromEnv = (import.meta.env.VITE_GCC_CUTTING_SMARKET_URL as string | undefined)?.trim();
    if (fromEnv) {
        const t = fromEnv.replace(/\/$/, '');
        return t.includes('/api/gcc/cutting/smarket') ? t : `${t}/api/gcc/cutting/smarket`;
    }
    const listEnv = (import.meta.env.VITE_GCC_CUTTING_LIST_URL as string | undefined)?.trim();
    if (listEnv) {
        const t = listEnv.replace(/\/$/, '');
        if (t.includes('/api/gcc/cutting/list')) return t.replace('/api/gcc/cutting/list', '/api/gcc/cutting/smarket');
        return `${t}/api/gcc/cutting/smarket`;
    }
    return resolveSameOriginServiceUrl('/api/gcc/cutting/smarket', 'http://10.5.0.107:9000/api/gcc/cutting/smarket');
}

/** Resolve URL GET dashboard Supermarket (`/api/gcc/cutting/smarket/data`). */
function resolveGccCuttingSmarketDataUrl(): string {
    const fromEnv = (import.meta.env.VITE_GCC_CUTTING_SMARKET_DATA_URL as string | undefined)?.trim();
    if (fromEnv) {
        const t = fromEnv.replace(/\/$/, '');
        return t.includes('/api/gcc/cutting/smarket/data') ? t : `${t}/api/gcc/cutting/smarket/data`;
    }
    const smarketEnv = (import.meta.env.VITE_GCC_CUTTING_SMARKET_URL as string | undefined)?.trim();
    if (smarketEnv) {
        const t = smarketEnv.replace(/\/$/, '');
        if (t.includes('/api/gcc/cutting/smarket')) return t.replace('/api/gcc/cutting/smarket', '/api/gcc/cutting/smarket/data');
        return `${t}/api/gcc/cutting/smarket/data`;
    }
    const listEnv = (import.meta.env.VITE_GCC_CUTTING_LIST_URL as string | undefined)?.trim();
    if (listEnv) {
        const t = listEnv.replace(/\/$/, '');
        if (t.includes('/api/gcc/cutting/list')) return t.replace('/api/gcc/cutting/list', '/api/gcc/cutting/smarket/data');
        return `${t}/api/gcc/cutting/smarket/data`;
    }
    return resolveSameOriginServiceUrl('/api/gcc/cutting/smarket/data', 'http://10.5.0.107:9000/api/gcc/cutting/smarket/data');
}

/** Resolve URL GET dashboard QC (`/api/gcc/cutting/qc/data`). */
function resolveGccCuttingQcDataUrl(): string {
    const fromEnv = (import.meta.env.VITE_GCC_CUTTING_QC_DATA_URL as string | undefined)?.trim();
    if (fromEnv) {
        const t = fromEnv.replace(/\/$/, '');
        return t.includes('/api/gcc/cutting/qc/data') ? t : `${t}/api/gcc/cutting/qc/data`;
    }
    const qcEnv = (import.meta.env.VITE_GCC_CUTTING_QC_URL as string | undefined)?.trim();
    if (qcEnv) {
        const t = qcEnv.replace(/\/$/, '');
        if (t.includes('/api/gcc/cutting/qc')) return t.replace('/api/gcc/cutting/qc', '/api/gcc/cutting/qc/data');
        return `${t}/api/gcc/cutting/qc/data`;
    }
    const listEnv = (import.meta.env.VITE_GCC_CUTTING_LIST_URL as string | undefined)?.trim();
    if (listEnv) {
        const t = listEnv.replace(/\/$/, '');
        if (t.includes('/api/gcc/cutting/list')) return t.replace('/api/gcc/cutting/list', '/api/gcc/cutting/qc/data');
        return `${t}/api/gcc/cutting/qc/data`;
    }
    return resolveSameOriginServiceUrl('/api/gcc/cutting/qc/data', 'http://10.5.0.107:9000/api/gcc/cutting/qc/data');
}

/** Builder payload umum untuk endpoint GCC reg/output. */
function buildGccCuttingBundlePayload(body: InputRfidCuttingBody): Record<string, unknown> {
    const q = body.qty != null && !Number.isNaN(Number(body.qty)) ? Number(body.qty) : undefined;
    return {
        id_bundles: body.id_bundles ?? '',
        rfid_bundles: body.rfid_bundles ?? body.rfid_garment ?? '',
        barcode: body.barcode ?? '',
        wo: body.wo ?? '',
        style: body.style ?? '',
        size: body.size ?? '',
        meja: body.meja ?? '',
        warna: body.warna ?? body.color ?? '',
        no_ikat: body.no_ikat ?? '',
        no_urut: body.no_urut ?? '',
        season: body.season ?? '',
        country: body.country ?? '',
        qty_bundles: q ?? '',
        total_batch:
            body.total_batch != null && !Number.isNaN(Number(body.total_batch))
                ? Number(body.total_batch)
                : '',
        placing: body.placing ?? '',
        id_user: body.id_user ?? '',
        nik: body.nik ?? getLoggedNik(),
        qty_output: body.qty_output ?? q ?? '',
        last_status: body.last_status ?? 'bundle',
        output_time: body.output_time ?? new Date().toISOString(),
    };
}

/** Builder payload khusus endpoint GCC output (minimal sesuai kontrak API). */
function buildGccCuttingOutputPayload(body: InputRfidCuttingBody): Record<string, unknown> {
    return {
        rfid_bundles: body.rfid_bundles ?? body.rfid_garment ?? '',
        nik: body.nik ?? getLoggedNik(),
    };
}

/** POST register bundle ke service GCC (`/api/gcc/cutting/reg`). */
export async function postGccCuttingBundleRegister(body: InputRfidCuttingBody): Promise<ApiResponse<unknown>> {
    const payload = buildGccCuttingBundlePayload(body);
    const url = resolveGccCuttingRegUrl();
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                ...getGccCuttingBundlesRequestHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const text = await res.text();
        let data: unknown = null;
        try {
            data = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
        } catch {
            return { success: false, error: 'Respons POST output bundle bukan JSON', status: 502 };
        }
        const code = (data as { code?: number })?.code;
        const okByBody = code == null || code === 200;
        if (!res.ok || !okByBody) {
            const msg =
                (data as { message?: string })?.message ||
                (data as { status?: string })?.status ||
                `HTTP ${res.status}`;
            return { success: false, error: String(msg), data, status: res.status };
        }
        return { success: true, data, status: res.status };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal POST output bundle',
            status: 500,
        };
    }
}

/** POST register RFID batch bundle ke service GCC (`/api/gcc/cutting/reg`). */
export async function postGccCuttingBundleBatchRegister(
    body: GccCuttingRegisterBatchBody
): Promise<ApiResponse<unknown>> {
    const payload: GccCuttingRegisterBatchBody = {
        barcode: String(body.barcode || '').trim(),
        rfid_bundles: String(body.rfid_bundles || '').trim(),
        rfid_batch: Array.isArray(body.rfid_batch)
            ? body.rfid_batch.map((it) => ({
                  batch: Number(it?.batch) || 0,
                  rfid_batch: String(it?.rfid_batch || '').trim(),
              }))
            : [],
    };
    let lastError: ApiResponse<unknown> = {
        success: false,
        error: 'Gagal POST register batch bundle',
        status: 500,
    };
    const urls = resolveGccCuttingRegFallbackUrls();
    for (let i = 0; i < urls.length; i += 1) {
        const url = urls[i];
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    ...getGccCuttingBundlesRequestHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const text = await res.text();
            let data: unknown = null;
            try {
                data = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
            } catch {
                lastError = {
                    success: false,
                    error: `Respons register batch bukan JSON dari ${url}`,
                    status: 502,
                };
                continue;
            }
            if (res.ok && isGccCuttingApiBodyOk(data)) {
                return { success: true, data, status: res.status };
            }

            const msg =
                (data as { message?: string })?.message ||
                (data as { status?: string })?.status ||
                `HTTP ${res.status}`;
            lastError = {
                success: false,
                error: `Register batch gagal di ${url}: ${String(msg)}`,
                data,
                status: res.status,
            };

            // Retry hanya untuk kasus yang umum terjadi saat proxy/host menolak rute.
            if (res.status === 403 || res.status === 404 || res.status === 405 || res.status === 502) {
                continue;
            }
            return lastError;
        } catch (error) {
            lastError = {
                success: false,
                error: `Network error register batch ke ${url}: ${error instanceof Error ? error.message : 'unknown error'}`,
                status: 500,
            };
            // Coba URL fallback berikutnya.
            continue;
        }
    }
    return lastError;
}

/** POST output bundle ke service GCC (`/api/gcc/cutting/output`). */
export async function postGccCuttingBundleOutput(body: InputRfidCuttingBody): Promise<ApiResponse<unknown>> {
    const payload = buildGccCuttingOutputPayload(body);
    const url = resolveGccCuttingOutputUrl();
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                ...getGccCuttingBundlesRequestHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const text = await res.text();
        let data: unknown = null;
        try {
            data = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
        } catch {
            return { success: false, error: 'Respons POST output bundle bukan JSON', status: 502 };
        }
        const code = (data as { code?: number })?.code;
        const okByBody = code == null || code === 200;
        if (!res.ok || !okByBody) {
            const msg =
                (data as { message?: string })?.message ||
                (data as { status?: string })?.status ||
                `HTTP ${res.status}`;
            return { success: false, error: String(msg), data, status: res.status };
        }
        return { success: true, data, status: res.status };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal POST output bundle',
            status: 500,
        };
    }
}

export const inputRfidCuttingBundle = async (body: InputRfidCuttingBody): Promise<ApiResponse<unknown>> => {
    const q = body.qty != null && !Number.isNaN(Number(body.qty)) ? Number(body.qty) : undefined;
    const outputRes = await postGccCuttingBundleOutput(body);
    if (!outputRes.success) {
        return outputRes;
    }
    const outputData = (outputRes.data as { data?: Record<string, unknown> } | undefined)?.data;
    const qtyFromOutputRaw = outputData?.qty_bundles ?? outputData?.qty_output;
    const qtyFromOutput =
        qtyFromOutputRaw != null && !Number.isNaN(Number(qtyFromOutputRaw)) ? Number(qtyFromOutputRaw) : undefined;
    const woFromOutput =
        outputData?.wo != null && String(outputData.wo).trim() !== '' ? String(outputData.wo).trim() : undefined;
    const styleFromOutput =
        outputData?.style != null && String(outputData.style).trim() !== '' ? String(outputData.style).trim() : undefined;
    const buyerFromOutput =
        outputData?.country != null && String(outputData.country).trim() !== '' ? String(outputData.country).trim() : undefined;
    const itemFromOutput =
        outputData?.placing != null && String(outputData.placing).trim() !== '' ? String(outputData.placing).trim() : undefined;
    const colorFromOutput =
        outputData?.warna != null && String(outputData.warna).trim() !== '' ? String(outputData.warna).trim() : undefined;
    const sizeFromOutput =
        outputData?.size != null && String(outputData.size).trim() !== '' ? String(outputData.size).trim() : undefined;

    // Tetap update state lokal agar dashboard internal (scan-state) tetap sinkron.
    const payload: Record<string, unknown> = { ...body };
    const finalQty = qtyFromOutput ?? q;
    if (finalQty != null) {
        payload.qty = finalQty;
        payload.wty = finalQty;
    }
    if (woFromOutput) payload.wo = woFromOutput;
    if (styleFromOutput) payload.style = styleFromOutput;
    if (buyerFromOutput) payload.buyer = buyerFromOutput;
    if (itemFromOutput) payload.item = itemFromOutput;
    if (colorFromOutput) payload.color = colorFromOutput;
    if (sizeFromOutput) payload.size = sizeFromOutput;

    const localRes = await apiPost('/api/cutting/bundle-scan', payload);
    if (!localRes.success) {
        return {
            success: true,
            data: outputRes.data,
            status: outputRes.status,
            error: localRes.error,
        };
    }
    return {
        ...localRes,
        data: outputRes.data,
    };
};

export interface CuttingScanHistoryEntry {
    rfid_garment: string;
    at: string;
    qty?: number;
    good?: number;
    repair?: number;
    reject?: number;
    wo?: string | null;
    style?: string | null;
    buyer?: string | null;
    item?: string | null;
    color?: string | null;
    size?: string | null;
    location?: string | null;
    line?: string | null;
    /** Lokasi GM untuk Supply Sewing (mis. `GM 1`). */
    gm?: string | null;
    /** true jika baris riwayat dari Check Out (dengan GM + line). */
    checkout?: boolean;
}

export interface CuttingScanStateDoc {
    bundle: { count: number; history: CuttingScanHistoryEntry[] };
    qc: { goodTotal: number; repairTotal?: number; rejectTotal: number; history: CuttingScanHistoryEntry[] };
    store: { count: number; history: CuttingScanHistoryEntry[] };
    supply: { count: number; history: CuttingScanHistoryEntry[] };
}

/** True jika `iso` jatuh pada hari kalender lokal yang sama dengan `day`. */
export function cuttingHistoryIsoOnLocalDay(iso: string | undefined, day: Date): boolean {
    if (iso == null || String(iso).trim() === '') return false;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;
    return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
}

/** Salin state scan cutting dengan riwayat per tahap difilter ke hari ini (timezone browser). */
export function filterCuttingScanStateToLocalToday(doc: CuttingScanStateDoc, day: Date = new Date()): CuttingScanStateDoc {
    const bundleHist = (doc.bundle.history ?? []).filter((h) => cuttingHistoryIsoOnLocalDay(h.at, day));
    const qcHist = (doc.qc.history ?? []).filter((h) => cuttingHistoryIsoOnLocalDay(h.at, day));
    const storeHist = (doc.store.history ?? []).filter((h) => cuttingHistoryIsoOnLocalDay(h.at, day));
    const supplyHist = (doc.supply.history ?? []).filter((h) => cuttingHistoryIsoOnLocalDay(h.at, day));
    const goodTotal = qcHist.reduce((s, h) => s + (h.good ?? 0), 0);
    const repairTotal = qcHist.reduce((s, h) => s + (h.repair ?? 0), 0);
    const rejectTotal = qcHist.reduce((s, h) => s + (h.reject ?? 0), 0);
    return {
        bundle: { count: bundleHist.length, history: bundleHist },
        qc: { goodTotal, repairTotal, rejectTotal, history: qcHist },
        store: { count: storeHist.length, history: storeHist },
        supply: { count: supplyHist.length, history: supplyHist },
    };
}

export const getCuttingScanState = async (): Promise<ApiResponse<CuttingScanStateDoc>> => {
    return await apiGet<CuttingScanStateDoc>('/api/cutting/scan-state');
};

export interface CuttingQcScanResponse {
    requires_input?: boolean;
    message?: string;
    rfid_garment?: string;
    qty?: number;
    wo?: string | null;
    style?: string | null;
    buyer?: string | null;
    item?: string | null;
    color?: string | null;
    size?: string | null;
    good?: number;
    repair?: number;
    reject?: number;
    location?: string;
    data?: {
        rfid_garment: string;
        qty: number;
        wo?: string | null;
        style?: string | null;
        buyer?: string | null;
        item?: string | null;
        color?: string | null;
        size?: string | null;
        good?: number;
        repair?: number;
        reject?: number;
        location?: string;
    };
}

export interface GccCuttingQcQtyResponse {
    code?: number | string;
    status?: string;
    message?: string;
    success?: boolean;
    data?: {
        id_bundles?: number;
        rfid_bundles?: string;
        qty_output?: number | string;
        qty_bundles?: number | string;
        qty?: number | string;
    };
}

/** Normalisasi sukses respons GCC cutting (HTTP 200 + body code/status). */
export function isGccCuttingApiBodyOk(data: unknown): boolean {
    const body = data as {
        code?: number | string;
        status?: string;
        success?: boolean;
        data?: unknown;
    };
    const st = String(body?.status ?? '').toLowerCase();
    const codeNum = body?.code != null && body.code !== '' ? Number(body.code) : NaN;
    const hasErrorCode = Number.isFinite(codeNum) && codeNum >= 400;
    return (
        body?.success !== false &&
        !hasErrorCode &&
        (body?.success === true ||
            !Number.isFinite(codeNum) ||
            codeNum === 200 ||
            st === 'success' ||
            st === 'ok' ||
            (body?.data != null && st !== 'error'))
    );
}

/** Ambil qty bundle dari respons GET `/api/gcc/cutting/qc/qty`. */
export function extractGccCuttingQcQty(body: GccCuttingQcQtyResponse | undefined): number {
    const inner = body?.data;
    const candidates = [inner?.qty_output, inner?.qty_bundles, inner?.qty];
    for (const raw of candidates) {
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) return Math.floor(n);
    }
    return 1;
}

export const getGccCuttingQcQty = async (rfidBundles: string): Promise<ApiResponse<GccCuttingQcQtyResponse>> => {
    const rid = String(rfidBundles || '').trim();
    if (!rid) return { success: false, error: 'RFID wajib diisi', status: 400 };
    const url = resolveGccCuttingQcQtyUrl();
    const payload = { rfid_bundles: rid };
    try {
        // Beberapa gateway tidak menerima GET body; utamakan query string agar kompatibel lintas browser/proxy.
        const qsUrl = `${url}${url.includes('?') ? '&' : '?'}rfid_bundles=${encodeURIComponent(rid)}`;
        let res = await fetch(qsUrl, {
            method: 'GET',
            headers: {
                ...getGccCuttingBundlesRequestHeaders(),
                'Content-Type': 'application/json',
            },
        });
        if (!res.ok && (res.status === 404 || res.status === 405 || res.status === 415)) {
            res = await fetch(url, {
                method: 'POST',
                headers: {
                    ...getGccCuttingBundlesRequestHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
        }
        const text = await res.text();
        let data: unknown = null;
        try {
            data = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
        } catch {
            return { success: false, error: 'Respons GET qty QC GCC bukan JSON', status: 502 };
        }
        if (!res.ok || !isGccCuttingApiBodyOk(data)) {
            const msg =
                (data as { message?: string })?.message ||
                (data as { status?: string })?.status ||
                `HTTP ${res.status}`;
            return { success: false, error: String(msg), data: data as GccCuttingQcQtyResponse, status: res.status };
        }
        return { success: true, data: data as GccCuttingQcQtyResponse, status: res.status };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal GET qty QC GCC',
            status: 500,
        };
    }
};

export const postCuttingQcScan = async (body: {
    rfid_garment: string;
    good?: number;
    repair?: number;
    reject?: number;
    nik?: string | number;
}): Promise<ApiResponse<CuttingQcScanResponse>> => {
    const hasQcCounters =
        body.good != null && body.repair != null && body.reject != null;

    // Step scan awal (tanpa counter) tetap gunakan endpoint lokal untuk validasi qty + popup input.
    if (!hasQcCounters) {
        return await apiPost<CuttingQcScanResponse>('/api/cutting/qc-scan', body);
    }

    // Step konfirmasi QC (dengan counter) wajib hit API GCC /api/gcc/cutting/qc.
    const gccUrl = resolveGccCuttingQcUrl();
    const gccPayload = {
        rfid_bundles: body.rfid_garment,
        reject: Math.max(0, Number(body.reject) || 0),
        repair: Math.max(0, Number(body.repair) || 0),
        good: Math.max(0, Number(body.good) || 0),
        nik: body.nik ?? getLoggedNik(),
    };

    try {
        const gccRes = await fetch(gccUrl, {
            method: 'POST',
            headers: {
                ...getGccCuttingBundlesRequestHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(gccPayload),
        });
        const text = await gccRes.text();
        let gccData: unknown = null;
        try {
            gccData = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
        } catch {
            return { success: false, error: 'Respons POST QC GCC bukan JSON', status: 502 };
        }
        const code = (gccData as { code?: number })?.code;
        const okByBody = code == null || code === 200;
        if (!gccRes.ok || !okByBody) {
            const msg =
                (gccData as { message?: string })?.message ||
                (gccData as { status?: string })?.status ||
                `HTTP ${gccRes.status}`;
            return { success: false, error: String(msg), data: gccData as CuttingQcScanResponse, status: gccRes.status };
        }

        // Tetap sinkron ke state lokal dashboard QC.
        const localRes = await apiPost<CuttingQcScanResponse>('/api/cutting/qc-scan', body);
        if (!localRes.success) {
            return {
                success: true,
                data: gccData as CuttingQcScanResponse,
                status: gccRes.status,
                error: localRes.error,
            };
        }
        return {
            ...localRes,
            data: gccData as CuttingQcScanResponse,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal POST QC GCC',
            status: 500,
        };
    }
};

export const postCuttingStoreScan = async (body: {
    rfid_garment: string;
    mode?: 'checkin' | 'checkout' | 'urgent';
    /** Wajib untuk mode Supply Urgent dan Check Out: angka line (≥ 1). */
    line?: number | string;
    /** Wajib untuk mode Supply Urgent dan Check Out: `GM 1` atau `GM 2`. */
    location?: string;
    /** Opsional: override NIK operator. Jika kosong, ambil dari user login. */
    nik?: string | number;
}): Promise<ApiResponse<unknown>> => {
    const mode = body.mode ?? 'checkin';
    const gccStatus: 'in' | 'out' | 'urgent' = mode === 'checkout' ? 'out' : mode === 'urgent' ? 'urgent' : 'in';
    const normalizedLineRaw = body.line == null ? '' : String(body.line).trim();
    const digitsOnly = normalizedLineRaw.replace(/[^\d]/g, '');
    const normalizedLine = digitsOnly ? parseInt(digitsOnly, 10) : '';
    const normalizedBranch = String(body.location ?? '')
        .trim()
        .replace(/\s+/g, '')
        .toUpperCase();

    // Guard frontend: untuk status OUT/URGENT, line & branch wajib valid sebelum request dikirim.
    if (gccStatus === 'out' || gccStatus === 'urgent') {
        if (!normalizedLine && normalizedLine !== 0) {
            return {
                success: false,
                error: 'Line wajib diisi dengan angka untuk status OUT/URGENT.',
                status: 400,
            };
        }
        if (normalizedBranch !== 'GM1' && normalizedBranch !== 'GM2') {
            return {
                success: false,
                error: 'Branch wajib GM1 atau GM2 untuk status OUT/URGENT.',
                status: 400,
            };
        }
    }

    const gccPayloadBase = {
        nik: String(body.nik ?? getLoggedNik() ?? '').trim(),
        status: gccStatus,
        rfid_bundles: String(body.rfid_garment || '').trim(),
    };
    const gccPayload =
        gccStatus === 'out' || gccStatus === 'urgent'
            ? {
                  ...gccPayloadBase,
                  line: normalizedLine,
                  branch: normalizedBranch,
              }
            : gccPayloadBase;

    try {
        const gccRes = await fetch(resolveGccCuttingSmarketUrl(), {
            method: 'POST',
            headers: {
                ...getGccCuttingBundlesRequestHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(gccPayload),
        });
        const text = await gccRes.text();
        let gccData: unknown = null;
        try {
            gccData = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
        } catch {
            return { success: false, error: 'Respons POST Supermarket GCC bukan JSON', status: 502 };
        }
        const successByBody = (gccData as { success?: boolean } | null)?.success;
        const code = (gccData as { code?: number } | null)?.code;
        const okByBody = (successByBody == null || successByBody === true) && (code == null || code === 200);
        if (!gccRes.ok || !okByBody) {
            const msg =
                (gccData as { message?: string })?.message ||
                (gccData as { status?: string })?.status ||
                `HTTP ${gccRes.status}`;
            return { success: false, error: String(msg), data: gccData, status: gccRes.status };
        }

        // Tetap sinkron ke state lokal dashboard cutting.
        const localRes = await apiPost('/api/cutting/store-scan', body);
        if (!localRes.success) {
            return {
                success: true,
                data: gccData,
                status: gccRes.status,
                error: localRes.error,
            };
        }
        return {
            ...localRes,
            data: gccData,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal POST Supermarket GCC',
            status: 500,
        };
    }
};

export const postCuttingSupplySewingScan = async (body: {
    rfid_bundles: string;
    nik: string;
    /** Nomor line (angka ≥ 1). */
    line: string | number;
    /** `GM 1` atau `GM 2`. */
    location: string;
    /** Quantity receive (string sesuai API). */
    qty_receive: string | number;
}): Promise<ApiResponse<GccCuttingSewingResponse>> => {
    const lineNum = Math.max(1, Math.floor(Number(body.line) || 1));
    return postGccCuttingSewing({
        rfid_bundles: String(body.rfid_bundles || '').trim(),
        nik: String(body.nik || '').trim(),
        line: formatGccCuttingSewingLine(lineNum),
        branch: formatGccCuttingSewingBranch(body.location),
        qty_receive: String(body.qty_receive ?? '').trim(),
    });
};

/** Satu baris agregat per jam dari GET `/api/gcc/cutting/smarket/data`. */
export interface GccSmarketDashboardHourRow {
    jam: string;
    check_in?: number;
    check_out?: number;
    supply_urgent?: number;
}

/** Satu baris tabel dashboard supermarket dari GET `/api/gcc/cutting/smarket/data`. */
export interface GccSmarketDashboardItem {
    tanggal?: string;
    id_bundles?: number;
    rfid_bundles?: string;
    wo?: string;
    qty_output?: number;
    qty_good?: number;
    qty_smarket_in?: number;
    last_time_smarket_in?: string | null;
    qty_smarket_out?: number;
    last_time_smarket_out?: string | null;
    qty?: number;
    line?: string | null;
    branch?: string | null;
    last_status?: string;
    smarket_time?: string | null;
}

/** Objek `data` pada respons GET `/api/gcc/cutting/smarket/data`. */
export interface GccSmarketDashboardPayload {
    tanggal_from?: string;
    tanggal_to?: string;
    summary?: {
        jumlah_bundle?: number;
        check_in?: number;
        check_out?: number;
        supply_urgent?: number;
    };
    data_per_jam?: GccSmarketDashboardHourRow[];
    total_data?: number;
    items?: GccSmarketDashboardItem[];
}

/** Body JSON GET `/api/gcc/cutting/smarket/data` (bisa `status: "success"` tanpa field `success`). */
export interface GccCuttingSmarketDashboardDataResponse {
    code?: number;
    status?: string;
    message?: string;
    success?: boolean;
    data?: GccSmarketDashboardPayload;
}

/** Satu baris agregat per jam dari GET `/api/gcc/cutting/qc/data`. */
export interface GccQcDashboardHourRow {
    jam: string;
    good?: number;
    repair?: number;
    reject?: number;
}

/** Satu baris tabel dashboard QC dari GET `/api/gcc/cutting/qc/data`. */
export interface GccQcDashboardItem {
    tanggal?: string;
    id_bundles?: number;
    rfid_bundles?: string;
    wo?: string;
    qty_output?: number;
    qty_good?: number;
    qty_repair?: number;
    qty_reject?: number;
}

/** Objek `data` pada respons GET `/api/gcc/cutting/qc/data`. */
export interface GccQcDashboardPayload {
    tanggal_from?: string;
    tanggal_to?: string;
    summary?: {
        jumlah_bundle?: number;
        total_good?: number;
        total_repair?: number;
        total_reject?: number;
    };
    data_per_jam?: GccQcDashboardHourRow[];
    total_data?: number;
    items?: GccQcDashboardItem[];
}

/** Body JSON GET `/api/gcc/cutting/qc/data`. */
export interface GccCuttingQcDashboardDataResponse {
    code?: number;
    status?: string;
    message?: string;
    success?: boolean;
    data?: GccQcDashboardPayload;
}

/** Query opsional GET `/api/gcc/cutting/smarket/data` (contoh: `?tanggalfrom=2026-03-05&tanggalto=2026-03-06`). */
export type GccCuttingSmarketDashboardQueryParams = {
    tanggalfrom?: string;
    tanggalto?: string;
};

export const getGccCuttingSmarketDashboardData = async (
    params?: GccCuttingSmarketDashboardQueryParams,
): Promise<ApiResponse<GccCuttingSmarketDashboardDataResponse>> => {
    try {
        const base = resolveGccCuttingSmarketDataUrl();
        let reqUrl = base;
        if (params?.tanggalfrom != null || params?.tanggalto != null) {
            let u: URL;
            try {
                u = new URL(base);
            } catch {
                u = new URL(base, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
            }
            if (params.tanggalfrom != null && String(params.tanggalfrom).trim() !== '') {
                u.searchParams.set('tanggalfrom', String(params.tanggalfrom).trim());
            }
            if (params.tanggalto != null && String(params.tanggalto).trim() !== '') {
                u.searchParams.set('tanggalto', String(params.tanggalto).trim());
            }
            reqUrl = u.toString();
        }
        const res = await fetch(reqUrl, {
            method: 'GET',
            headers: getGccCuttingBundlesRequestHeaders(),
        });
        const text = await res.text();
        let data: unknown = null;
        try {
            data = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
        } catch {
            return { success: false, error: 'Respons dashboard smarket GCC bukan JSON', status: 502 };
        }
        const body = data as GccCuttingSmarketDashboardDataResponse;
        const st = String(body.status || '').toLowerCase();
        const okByBody =
            body.success !== false &&
            !(typeof body.code === 'number' && body.code >= 400) &&
            (body.success === true || body.code === 200 || st === 'success' || (body.data != null && st !== 'error'));
        if (!res.ok || !okByBody) {
            const msg =
                body.message ||
                body.status ||
                (typeof body.code === 'number' ? `code ${body.code}` : null) ||
                `HTTP ${res.status}`;
            return { success: false, error: String(msg), data: body, status: res.status };
        }
        return { success: true, data: body, status: res.status };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal GET dashboard smarket GCC',
            status: 500,
        };
    }
};

/** Query opsional GET `/api/gcc/cutting/qc/data` (contoh: `?tanggalfrom=2026-03-05&tanggalto=2026-03-06`). */
export type GccCuttingQcDashboardQueryParams = {
    tanggalfrom?: string;
    tanggalto?: string;
};

export const getGccCuttingQcDashboardData = async (
    params?: GccCuttingQcDashboardQueryParams,
): Promise<ApiResponse<GccCuttingQcDashboardDataResponse>> => {
    try {
        const base = resolveGccCuttingQcDataUrl();
        let reqUrl = base;
        if (params?.tanggalfrom != null || params?.tanggalto != null) {
            let u: URL;
            try {
                u = new URL(base);
            } catch {
                u = new URL(base, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
            }
            if (params.tanggalfrom != null && String(params.tanggalfrom).trim() !== '') {
                u.searchParams.set('tanggalfrom', String(params.tanggalfrom).trim());
            }
            if (params.tanggalto != null && String(params.tanggalto).trim() !== '') {
                u.searchParams.set('tanggalto', String(params.tanggalto).trim());
            }
            reqUrl = u.toString();
        }
        const res = await fetch(reqUrl, {
            method: 'GET',
            headers: getGccCuttingBundlesRequestHeaders(),
        });
        const text = await res.text();
        let data: unknown = null;
        try {
            data = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
        } catch {
            return { success: false, error: 'Respons dashboard QC GCC bukan JSON', status: 502 };
        }
        const body = data as GccCuttingQcDashboardDataResponse;
        const st = String(body.status || '').toLowerCase();
        const okByBody =
            body.success !== false &&
            !(typeof body.code === 'number' && body.code >= 400) &&
            (body.success === true || body.code === 200 || st === 'success' || (body.data != null && st !== 'error'));
        if (!res.ok || !okByBody) {
            const msg =
                body.message ||
                body.status ||
                (typeof body.code === 'number' ? `code ${body.code}` : null) ||
                `HTTP ${res.status}`;
            return { success: false, error: String(msg), data: body, status: res.status };
        }
        return { success: true, data: body, status: res.status };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal GET dashboard QC GCC',
            status: 500,
        };
    }
};

function resolveGccCuttingQcReportUrl(): string {
    const fromEnv = (import.meta.env.VITE_GCC_CUTTING_QC_REPORT_URL as string | undefined)?.trim();
    if (fromEnv) {
        const t = fromEnv.replace(/\/$/, '');
        return t.includes('/api/gcc/cutting/qc/report') ? t : `${t}/api/gcc/cutting/qc/report`;
    }
    const dataUrl = resolveGccCuttingQcDataUrl();
    if (dataUrl.includes('/qc/data')) return dataUrl.replace('/qc/data', '/qc/report');
    return resolveSameOriginServiceUrl(
        '/api/gcc/cutting/qc/report',
        'http://10.5.0.107:9000/api/gcc/cutting/qc/report'
    );
}

export interface GccCuttingQcReportSummary {
    total_bundle_qc?: number;
    total_bundle_good?: number;
    total_bundle_repair?: number;
    total_bundle_reject?: number;
    total_qty_good?: number;
    total_qty_repair?: number;
    total_qty_reject?: number;
    total_qty_qc?: number;
    good_rate_percent?: number;
    repair_rate_percent?: number;
    reject_rate_percent?: number;
}

export interface GccCuttingQcReportItem {
    qc_time?: string;
    status_qc?: string;
    id_bundles?: number;
    rfid_bundles?: string;
    barcode?: string;
    wo?: string;
    style?: string;
    warna?: string;
    size?: string;
    meja?: string;
    no_ikat?: number;
    no_urut?: string;
    season?: string;
    country?: string;
    placing?: string;
    qty_output?: number;
    qty_good?: number;
    qty_repair?: number;
    qty_reject?: number;
    qty_status?: number;
}

export interface GccCuttingQcReportData {
    tanggal_from?: string;
    tanggal_to?: string;
    summary?: GccCuttingQcReportSummary;
    items?: GccCuttingQcReportItem[];
}

export interface GccCuttingQcReportResponse {
    code?: number;
    status?: string;
    message?: string;
    count?: number;
    data?: GccCuttingQcReportData;
}

/** GET report QC Cutting untuk export Excel (`/api/gcc/cutting/qc/report`). */
export const getGccCuttingQcReport = async (
    params: GccCuttingQcDashboardQueryParams,
): Promise<ApiResponse<GccCuttingQcReportResponse>> => {
    try {
        const base = resolveGccCuttingQcReportUrl();
        let reqUrl = base;
        if (params?.tanggalfrom != null || params?.tanggalto != null) {
            let u: URL;
            try {
                u = new URL(base);
            } catch {
                u = new URL(base, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
            }
            if (params.tanggalfrom != null && String(params.tanggalfrom).trim() !== '') {
                u.searchParams.set('tanggalfrom', String(params.tanggalfrom).trim());
            }
            if (params.tanggalto != null && String(params.tanggalto).trim() !== '') {
                u.searchParams.set('tanggalto', String(params.tanggalto).trim());
            }
            reqUrl = u.toString();
        }
        const res = await fetch(reqUrl, {
            method: 'GET',
            headers: getGccCuttingBundlesRequestHeaders(),
        });
        const text = await res.text();
        let data: unknown = null;
        try {
            data = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
        } catch {
            return { success: false, error: 'Respons report QC GCC bukan JSON', status: 502 };
        }
        if (!res.ok || !isGccCuttingApiBodyOk(data)) {
            const body = data as GccCuttingQcReportResponse;
            const msg = body.message || body.status || `HTTP ${res.status}`;
            return { success: false, error: String(msg), data: body, status: res.status };
        }
        return { success: true, data: data as GccCuttingQcReportResponse, status: res.status };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal GET report QC GCC',
            status: 500,
        };
    }
};

function resolveGccCuttingSmarketOutReportUrl(): string {
    const fromEnv = (import.meta.env.VITE_GCC_CUTTING_SMARKET_OUT_REPORT_URL as string | undefined)?.trim();
    if (fromEnv) {
        const t = fromEnv.replace(/\/$/, '');
        return t.includes('/api/gcc/cutting/report/smarket/out') ? t : `${t}/api/gcc/cutting/report/smarket/out`;
    }
    const smarketEnv = (import.meta.env.VITE_GCC_CUTTING_SMARKET_URL as string | undefined)?.trim();
    if (smarketEnv) {
        const t = smarketEnv.replace(/\/$/, '');
        if (t.endsWith('/api/gcc/cutting/smarket')) {
            return `${t.replace(/\/api\/gcc\/cutting\/smarket$/, '')}/api/gcc/cutting/report/smarket/out`;
        }
        return `${t}/api/gcc/cutting/report/smarket/out`;
    }
    return resolveSameOriginServiceUrl(
        '/api/gcc/cutting/report/smarket/out',
        'http://10.5.0.107:9000/api/gcc/cutting/report/smarket/out'
    );
}

export interface GccCuttingSmarketOutReportItem {
    status_terakhir?: string;
    waktu_dibuat?: string;
    waktu_terakhir?: string;
    style?: string;
    bagian?: string;
    warna?: string;
    wo?: string;
    barcode_gcc?: string;
    rfid?: string;
    no_ikat?: number;
    no_urut?: string;
    season?: string;
    placing?: string;
    ukuran?: string;
    qty_good?: number;
    qty_market_out?: number;
    meja?: string;
    tujuan?: string;
    line?: string;
    branch?: string;
}

export interface GccCuttingSmarketOutReportData {
    tanggal_from?: string;
    tanggal_to?: string;
    total_data?: number;
    items?: GccCuttingSmarketOutReportItem[];
}

export interface GccCuttingSmarketOutReportResponse {
    code?: number;
    status?: string;
    message?: string;
    data?: GccCuttingSmarketOutReportData;
}

/** GET report bundle OUT SMarket → Sewing (`/api/gcc/cutting/report/smarket/out`). */
export const getGccCuttingSmarketOutReport = async (
    params: GccCuttingQcDashboardQueryParams,
): Promise<ApiResponse<GccCuttingSmarketOutReportResponse>> => {
    try {
        const base = resolveGccCuttingSmarketOutReportUrl();
        let reqUrl = base;
        if (params?.tanggalfrom != null || params?.tanggalto != null) {
            let u: URL;
            try {
                u = new URL(base);
            } catch {
                u = new URL(base, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
            }
            if (params.tanggalfrom != null && String(params.tanggalfrom).trim() !== '') {
                u.searchParams.set('tanggalfrom', String(params.tanggalfrom).trim());
            }
            if (params.tanggalto != null && String(params.tanggalto).trim() !== '') {
                u.searchParams.set('tanggalto', String(params.tanggalto).trim());
            }
            reqUrl = u.toString();
        }
        const res = await fetch(reqUrl, {
            method: 'GET',
            headers: getGccCuttingBundlesRequestHeaders(),
        });
        const text = await res.text();
        let data: unknown = null;
        try {
            data = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
        } catch {
            return { success: false, error: 'Respons report SMarket OUT bukan JSON', status: 502 };
        }
        if (!res.ok || !isGccCuttingApiBodyOk(data)) {
            const body = data as GccCuttingSmarketOutReportResponse;
            const msg = body.message || body.status || `HTTP ${res.status}`;
            return { success: false, error: String(msg), data: body, status: res.status };
        }
        return { success: true, data: data as GccCuttingSmarketOutReportResponse, status: res.status };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal GET report SMarket OUT',
            status: 500,
        };
    }
};

// ============================================
// SEWING LAYOUT — user + SMV master (:9000)
// ============================================

const DEFAULT_SEWING_SERVICE_BASE = 'http://10.5.0.107:9000';

/** Header autentikasi service sewing/SMV (:9000) — sama pola dengan GCC cutting. */
function getSewingServiceRequestHeaders(): HeadersInit {
    return getGccCuttingBundlesRequestHeaders();
}

/** Base URL service sewing/SMV (:9000). Browser: same-origin (`/user`, `/api/smv/...`). */
export function resolveSewingServiceBaseUrl(): string {
    const fromEnv = (import.meta.env.VITE_SEWING_SERVICE_BASE_URL as string | undefined)?.trim();
    if (fromEnv) return fromEnv.replace(/\/$/, '');
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    return DEFAULT_SEWING_SERVICE_BASE;
}

export type SewingServiceUserResponse = {
    success: boolean;
    count: number;
    user: Array<{
        nik: string;
        nama: string;
        no_hp: string;
        line: string;
        telegram: string;
        bagian: string;
        branch: string;
        rfid_user: string;
    }>;
};

export type SmvMasterApiResponse = {
    code: number;
    status: string;
    message: string;
    count: number;
    data: Array<{
        smv_id: number;
        smv_header_id: number;
        tanggal: string;
        buyer: string;
        style: string;
        short_itm: string | null;
        long_itm: string | null;
        item: string;
        nama_proses: string;
        cycle_time: number;
        smv_minute: number;
        output_pj: number;
        sepatu: string | null;
        corong: string | null;
        mesin: string | null;
        brand: string | null;
        cat: string;
        prd_on_capacity: number;
        actual_mp: number;
        manpower_need: number;
        working_time: number | null;
        targets: number | null;
        working_balance: number | null;
        actual_unit: number;
        attachment1: string | null;
        attachment2: string | null;
        attachment3: string | null;
        file1: string | null;
        file2: string | null;
        file3: string | null;
        user: string;
        ai_smv_master_mesin_id: number | null;
    }>;
};

export type SewingLayoutOperatorPayload = {
    nik: string;
    nama: string;
    rfid_user: string;
    line: string;
};

export type SewingLayoutSlotPayload = {
    position: number;
    smv_id: number;
    nama_proses: string;
    mesin: string | null;
    cat: string;
    smv_minute: number;
    cycle_time: number;
    manpower_need: number;
    operator: SewingLayoutOperatorPayload | null;
    batch?: number;
};

export type SewingLayoutDataPayload = {
    line: string;
    style: string;
    environment: string;
    buyer?: string;
    item?: string;
    updatedAt: string;
    slots: SewingLayoutSlotPayload[];
};

/** GET /user?bagian=SEWING dari service :9000 */
export async function fetchSewingUsers(bagian = 'SEWING'): Promise<ApiResponse<SewingServiceUserResponse>> {
    try {
        const base = resolveSewingServiceBaseUrl();
        const url = `${base}/user?bagian=${encodeURIComponent(bagian)}`;
        const res = await fetch(url, { headers: getSewingServiceRequestHeaders() });
        const data = (await res.json()) as SewingServiceUserResponse & { message?: string; error?: string };
        if (!res.ok || !data?.success) {
            return {
                success: false,
                error: (data as { message?: string })?.message || `HTTP ${res.status}`,
                data,
                status: res.status,
            };
        }
        return { success: true, data, status: res.status };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal mengambil data user sewing',
            status: 500,
        };
    }
}

/** GET /api/smv/master?style=... dari service :9000 */
export async function fetchSmvMasterByStyle(style: string): Promise<ApiResponse<SmvMasterApiResponse>> {
    try {
        const base = resolveSewingServiceBaseUrl();
        const url = `${base}/api/smv/master?style=${encodeURIComponent(style.trim())}`;
        const res = await fetch(url, { headers: getSewingServiceRequestHeaders() });
        const data = (await res.json()) as SmvMasterApiResponse;
        if (!res.ok || data?.code !== 200 || !Array.isArray(data?.data)) {
            return {
                success: false,
                error: data?.message || `HTTP ${res.status}`,
                data,
                status: res.status,
            };
        }
        return { success: true, data, status: res.status };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal mengambil data SMV master',
            status: 500,
        };
    }
}

/** GET layout tersimpan (embedded backend / frontend) */
export async function getSewingLayoutData(
    line: string,
    environment: BackendEnvironment
): Promise<ApiResponse<SewingLayoutDataPayload | null>> {
    try {
        const url = `${API_BASE_URL}/api/sewing-layout-data?line=${encodeURIComponent(line)}&environment=${encodeURIComponent(environment)}`;
        const res = await fetch(url, { headers: getDefaultHeaders() });
        const body = await res.json();
        if (!res.ok || !body?.success) {
            return {
                success: false,
                error: body?.error || `HTTP ${res.status}`,
                status: res.status,
            };
        }
        return { success: true, data: body.data ?? null, status: res.status };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal mengambil layout sewing',
            status: 500,
        };
    }
}

export type SewingLayoutPostRowPayload = {
    smv_id: number;
    rfid_user: string;
    batch: number;
};

export type SewingLayoutPostBody = {
    line: string;
    style: string;
    environment: string;
    data: SewingLayoutPostRowPayload[];
};

export type SewingLayoutPostEntry = SewingLayoutPostBody & {
    count: number;
    updatedAt: string;
};

/** GET hasil POST layout uji coba (sewing_layout_post.json) */
export async function getSewingLayoutPost(
    line?: string,
    style?: string,
    environment?: BackendEnvironment
): Promise<ApiResponse<{ latest: SewingLayoutPostEntry | null; entries: SewingLayoutPostEntry[] }>> {
    try {
        const params = new URLSearchParams();
        if (line) params.set('line', line);
        if (style) params.set('style', style);
        if (environment) params.set('environment', environment);
        const qs = params.toString();
        const url = `${API_BASE_URL}/api/sewing-layout-post${qs ? `?${qs}` : ''}`;
        const res = await fetch(url, { headers: getDefaultHeaders() });
        const body = await res.json();
        if (!res.ok || !body?.success) {
            return {
                success: false,
                error: body?.error || `HTTP ${res.status}`,
                status: res.status,
            };
        }
        return {
            success: true,
            data: { latest: body.latest ?? null, entries: body.entries ?? [] },
            status: res.status,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal mengambil layout post',
            status: 500,
        };
    }
}

export type SmvMasterCombineRow = {
    smv_id: number;
    rfid_user: string;
    batch: number;
};

export type SmvMasterCombineResponse = {
    code?: number;
    status?: string;
    message?: string;
    data?: unknown;
};

/** Pesan error HTTP — status 403 ditampilkan ramah ke operator. */
export function formatHttpStatusError(status?: number, message?: string): string {
    if (status === 403) return 'BACKEND KERJA WOYY !!';
    const raw = String(message ?? '').trim();
    if (raw === 'HTTP 403' || /HTTP\s+403(\b|:)/i.test(raw)) return 'BACKEND KERJA WOYY !!';
    return raw || (status != null ? `HTTP ${status}` : 'Terjadi kesalahan');
}

/** True jika endpoint combine belum tersedia di server (:404 / :405). */
export function isSmvMasterCombineEndpointMissing(status?: number): boolean {
    return status === 404 || status === 405;
}

/**
 * POST gabung SMV + operator ke service sewing.
 * Body: `{ style, line, data: [{ smv_id, rfid_user, batch }, ...] }`
 */
export async function postSmvMasterCombine(body: {
    style: string;
    line: string;
    data: SmvMasterCombineRow[];
}): Promise<ApiResponse<SmvMasterCombineResponse> & { endpointMissing?: boolean }> {
    const rows = Array.isArray(body.data) ? body.data : [];
    if (rows.length === 0) {
        return { success: false, error: 'Data combine kosong', status: 400 };
    }
    const url = `${resolveSewingServiceBaseUrl()}/api/smv/master/combine`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                ...getSewingServiceRequestHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                style: String(body.style || '').trim(),
                line: String(body.line || '').trim(),
                data: rows,
            }),
        });
        const text = await res.text();
        let parsed: SmvMasterCombineResponse | null = null;
        try {
            parsed = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
        } catch {
            return {
                success: false,
                error: 'Respons combine SMV bukan JSON',
                status: 502,
                endpointMissing: isSmvMasterCombineEndpointMissing(res.status),
            };
        }
        const code = parsed?.code;
        const okByBody = code == null || code === 200;
        if (!res.ok || !okByBody) {
            const rawMsg = parsed?.message || parsed?.status || `HTTP ${res.status}`;
            return {
                success: false,
                error: formatHttpStatusError(res.status, String(rawMsg)),
                data: parsed ?? undefined,
                status: res.status,
                endpointMissing: isSmvMasterCombineEndpointMissing(res.status),
            };
        }
        return { success: true, data: parsed ?? undefined, status: res.status };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal POST combine SMV',
            status: 500,
        };
    }
}

/** POST layout uji coba — format ringkas smv_id, rfid_user, batch */
export async function postSewingLayoutTest(
    payload: SewingLayoutPostBody
): Promise<ApiResponse<SewingLayoutPostEntry>> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/sewing-layout-post`, {
            method: 'POST',
            headers: {
                ...getDefaultHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const body = await res.json();
        if (!res.ok || !body?.success) {
            return {
                success: false,
                error: body?.error || `HTTP ${res.status}`,
                status: res.status,
            };
        }
        return { success: true, data: body.data as SewingLayoutPostEntry, status: res.status };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal POST layout uji coba',
            status: 500,
        };
    }
}

/** POST simpan layout agar embedded backend dapat membaca */
export async function saveSewingLayoutData(
    payload: SewingLayoutDataPayload
): Promise<ApiResponse<SewingLayoutDataPayload>> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/sewing-layout-data`, {
            method: 'POST',
            headers: {
                ...getDefaultHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const body = await res.json();
        if (!res.ok || !body?.success) {
            return {
                success: false,
                error: body?.error || `HTTP ${res.status}`,
                status: res.status,
            };
        }
        return { success: true, data: body.data as SewingLayoutDataPayload, status: res.status };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal menyimpan layout sewing',
            status: 500,
        };
    }
}

// ============================================
// PREP OPERATOR BATCH API
// ============================================

/** Payload untuk POST /api/prep/op_batch. */
export interface PrepOpBatchPayload {
    nik: string;
    line: string;
    batch: string;
    ket_batch: string;
    scan_type: string;
    is_active: string;
}

/** Respons dari POST /api/prep/op_batch. */
export interface PrepOpBatchResponseData {
    id: number;
    operator_name: string;
    nik: string;
    rfid_user: string;
    line_no: number;
    batch_no: number;
    ket_batch: string;
    scan_type: string;
    is_active: number;
    created_at: string;
    updated_at: string;
}

/** Resolve URL POST /api/prep/op_batch (service :9000 MJL). */
function resolvePrepOpBatchUrl(): string {
    return resolveSameOriginServiceUrl('/api/prep/op_batch', 'http://10.5.0.107:9000/api/prep/op_batch');
}

/**
 * POST — simpan data akses operator batch prep.
 * Browser: same-origin `/api/prep/op_batch`. Backend: `http://10.5.0.107:9000/api/prep/op_batch`.
 */
export async function postPrepOpBatch(
    payload: PrepOpBatchPayload
): Promise<ApiResponse<PrepOpBatchResponseData>> {
    try {
        const url = resolvePrepOpBatchUrl();
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'rfid-key': '0011779933',
            },
            body: JSON.stringify(payload),
        });
        const text = await res.text();
        let parsed: unknown = null;
        try {
            parsed = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
        } catch {
            return { success: false, error: 'Respons server bukan JSON', status: 502 };
        }
        const body = parsed as {
            code?: number;
            status?: string;
            message?: string;
            data?: PrepOpBatchResponseData;
        };
        if (!res.ok || (body.code != null && body.code >= 400)) {
            const msg = body.message || body.status || `HTTP ${res.status}`;
            return { success: false, error: typeof msg === 'string' ? msg : 'Gagal menyimpan operator batch', status: res.status };
        }
        return {
            success: true,
            data: body.data,
            status: res.status,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal POST operator batch prep',
            status: 500,
        };
    }
}

/** Respons data dari GET /api/prep/batch_layout. */
export interface PrepBatchLayoutData {
    batch_layout_id: number;
    rfid_user: string;
    nama: string;
    nik: string;
    branch: string;
    line: string;
    timestamp: string;
    isDone: number;
    batch: number;
    ket_batch: string;
}

/** Resolve URL GET /api/prep/batch_layout (service :9000 MJL). */
function resolvePrepBatchLayoutUrl(): string {
    return resolveSameOriginServiceUrl('/api/prep/batch_layout', 'http://10.5.0.107:9000/api/prep/batch_layout');
}

/**
 * GET — mengambil satu record terbaru dari tabel batch_layout untuk RFID user tertentu.
 * Browser: same-origin `/api/prep/batch_layout`. Backend: `http://10.5.0.107:9000/api/prep/batch_layout`.
 */
export async function getPrepBatchLayout(
    rfidUser: string
): Promise<ApiResponse<PrepBatchLayoutData>> {
    const rid = String(rfidUser || '').trim();
    if (!rid) return { success: false, error: 'RFID user wajib diisi.' };
    try {
        const base = resolvePrepBatchLayoutUrl();
        let reqUrl: string;
        try {
            const u = new URL(base);
            u.searchParams.set('rfid_user', rid);
            reqUrl = u.toString();
        } catch {
            reqUrl = `${base}?rfid_user=${encodeURIComponent(rid)}`;
        }
        const res = await fetch(reqUrl, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'rfid-key': '0011779933',
            },
        });
        const text = await res.text();
        let parsed: unknown = null;
        try {
            parsed = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
        } catch {
            return { success: false, error: 'Respons server bukan JSON', status: 502 };
        }
        const body = parsed as {
            code?: number;
            status?: string;
            message?: string;
            count?: number;
            data?: PrepBatchLayoutData | null;
        };
        if (!res.ok || (body.code != null && body.code >= 400)) {
            const msg = body.message || body.status || `HTTP ${res.status}`;
            return { success: false, error: typeof msg === 'string' ? msg : 'Gagal mengambil batch layout', status: res.status };
        }
        return {
            success: true,
            data: body.data ?? undefined,
            status: res.status,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal GET batch layout',
            status: 500,
        };
    }
}

/** Respons data untuk satu row dari GET /api/prep/op_access. */
export interface PrepOpAccessData {
    id: number;
    operator_name: string;
    nik: string;
    rfid_user: string;
    line_no: number | string;
    batch_no: number | string;
    ket_batch: string;
    scan_type: string;
    is_active: number;
    created_at: string;
    updated_at: string;
}

/** Resolve URL GET /api/prep/op_access (service :9000 MJL). */
function resolvePrepOpAccessUrl(): string {
    return resolveSameOriginServiceUrl('/api/prep/op_access', 'http://10.5.0.107:9000/api/prep/op_access');
}

/**
 * GET — mengambil list operator batch terdaftar.
 * Browser: same-origin `/api/prep/op_access`. Backend: `http://10.5.0.107:9000/api/prep/op_access`.
 */
export async function getPrepOpAccess(): Promise<ApiResponse<PrepOpAccessData[]>> {
    try {
        const reqUrl = resolvePrepOpAccessUrl();
        const res = await fetch(reqUrl, {
            method: 'GET',
            headers: getGccCuttingBundlesRequestHeaders(),
        });
        const text = await res.text();
        let parsed: unknown = null;
        try {
            parsed = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
        } catch {
            return { success: false, error: 'Respons server bukan JSON', status: 502 };
        }
        const body = parsed as {
            code?: number;
            status?: string;
            message?: string;
            count?: number;
            data?: PrepOpAccessData[];
        };
        if (!res.ok || (body.code != null && body.code >= 400)) {
            const msg = body.message || body.status || `HTTP ${res.status}`;
            return { success: false, error: typeof msg === 'string' ? msg : 'Gagal mengambil data operator akses', status: res.status };
        }
        return {
            success: true,
            data: body.data || [],
            status: res.status,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal GET data operator akses',
            status: 500,
        };
    }
}

export interface PrepListBatchData {
    no: number;
    ket_batch: string;
}

function resolvePrepListBatchUrl(): string {
    return resolveSameOriginServiceUrl('/api/prep/list_batch', 'http://10.5.0.107:9000/api/prep/list_batch');
}

export async function getPrepListBatch(): Promise<ApiResponse<PrepListBatchData[]>> {
    try {
        const reqUrl = resolvePrepListBatchUrl();
        const res = await fetch(reqUrl, {
            method: 'GET',
            headers: getGccCuttingBundlesRequestHeaders(),
        });
        const text = await res.text();
        let parsed: unknown = null;
        try {
            parsed = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
        } catch {
            return { success: false, error: 'Respons server bukan JSON', status: 502 };
        }
        const body = parsed as {
            code?: number;
            status?: string;
            message?: string;
            count?: number;
            data?: PrepListBatchData[];
        };
        if (!res.ok || (body.code != null && body.code >= 400)) {
            const msg = body.message || body.status || `HTTP ${res.status}`;
            return { success: false, error: typeof msg === 'string' ? msg : 'Gagal mengambil data list batch', status: res.status };
        }
        return {
            success: true,
            data: body.data || [],
            status: res.status,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal GET data list batch',
            status: 500,
        };
    }
}

/**
 * Update user data (line) berdasarkan rfid_user
 * POST /user/update_user
 */
export async function updateUserData(payload: {
    rfid_user: string;
    line: string;
}): Promise<ApiResponse<{ 
    id_user: number;
    nama: string;
    nik: string;
    rfid_user: string;
    line_sebelumnya: string;
    line_baru: string;
}>> {
    return await apiPost('/user/update_user', payload);
}

export interface GccCuttingOutputDashboardDataResponse {
    tanggal_from: string;
    tanggal_to: string;
    summary: {
        jumlah_bundle: number;
        total_qty_output: number;
    };
    data_per_jam: {
        jam: string;
        output: number;
        qty_output: number;
    }[];
    count?: number;
    items?: any[];
}

function resolveGccCuttingOutputDataUrl(): string {
    const fromEnv = (import.meta.env.VITE_GCC_CUTTING_OUTPUT_DATA_URL as string | undefined)?.trim();
    if (fromEnv) {
        return fromEnv;
    }
    if (typeof window !== 'undefined') {
        const t = window.location.origin;
        if (t.includes('/api/gcc/cutting/list')) return t.replace('/api/gcc/cutting/list', '/api/gcc/cutting/output/data');
        return `${t}/api/gcc/cutting/output/data`;
    }
    return resolveSameOriginServiceUrl(
        '/api/gcc/cutting/output/data',
        'http://10.5.0.107:9000/api/gcc/cutting/output/data'
    );
}

export type GccCuttingOutputDashboardQueryParams = {
    tanggalfrom?: string;
    tanggalto?: string;
};

export const getGccCuttingOutputDashboardData = async (
    params?: GccCuttingOutputDashboardQueryParams
): Promise<ApiResponse<GccCuttingOutputDashboardDataResponse>> => {
    const base = resolveGccCuttingOutputDataUrl();
    let reqUrl = base;
    if (params) {
        const u = new URL(base, typeof window !== 'undefined' ? window.location.origin : undefined);
        if (params.tanggalfrom) u.searchParams.set('tanggalfrom', params.tanggalfrom);
        if (params.tanggalto) u.searchParams.set('tanggalto', params.tanggalto);
        reqUrl = u.toString();
    }
    try {
        const res = await fetch(reqUrl, {
            method: 'GET',
            headers: getGccCuttingBundlesRequestHeaders(),
        });
        const text = await res.text();
        let data: unknown;
        try {
            data = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
        } catch {
            return { success: false, error: 'Respons JSON tidak valid' };
        }
        if (!res.ok) {
            const err = (data as { message?: string })?.message || `HTTP ${res.status}`;
            return { success: false, error: err, status: res.status };
        }
        const body = (data as any)?.data || data;
        return { success: true, data: body as GccCuttingOutputDashboardDataResponse };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/** Satu baris agregat per jam dari GET `/api/gcc/cutting/sewing/data`. */
export interface GccSewingDashboardHourRow {
    jam: string;
    GM1?: number;
    GM2?: number;
}

/** Satu baris tabel dashboard sewing dari GET `/api/gcc/cutting/sewing/data`. */
export interface GccSewingDashboardItem {
    tanggal?: string;
    id_bundles?: number;
    rfid_bundles?: string;
    wo?: string;
    style?: string;
    buyer?: string;
    country?: string;
    warna?: string;
    color?: string;
    size?: string;
    ukuran?: string;
    qty_sewing?: number;
    last_time_sewing?: string;
    line?: string;
    branch?: string;
    last_status?: string;
    smarket_time?: string;
}

/** Objek `data` pada respons GET `/api/gcc/cutting/sewing/data`. */
export interface GccSewingDashboardPayload {
    tanggal_from?: string;
    tanggal_to?: string;
    summary?: {
        jumlah_bundle?: number;
        GM1?: number;
        GM2?: number;
        total_scan?: number;
    };
    data_per_jam?: GccSewingDashboardHourRow[];
    total_data?: number;
    items?: GccSewingDashboardItem[];
}

/** Body JSON GET `/api/gcc/cutting/sewing/data` */
export interface GccCuttingSewingDashboardDataResponse {
    code?: number;
    status?: string;
    message?: string;
    data?: GccSewingDashboardPayload;
    success?: boolean;
}

export type GccCuttingSewingDashboardQueryParams = {
    tanggalfrom?: string;
    tanggalto?: string;
};

function resolveGccCuttingSewingDataUrl(): string {
    const sewingEnv = (import.meta.env.VITE_GCC_CUTTING_SEWING_URL as string | undefined)?.trim();
    if (sewingEnv) {
        const t = sewingEnv.replace(/\/$/, '');
        if (t.endsWith('/api/gcc/cutting/sewing')) return `${t}/data`;
        return `${t}/api/gcc/cutting/sewing/data`;
    }
    return resolveSameOriginServiceUrl('/api/gcc/cutting/sewing/data', 'http://10.5.0.107:9000/api/gcc/cutting/sewing/data');
}

export async function getGccCuttingSewingDashboardData(
    params?: GccCuttingSewingDashboardQueryParams
): Promise<ApiResponse<GccSewingDashboardPayload>> {
    let url = resolveGccCuttingSewingDataUrl();
    if (params) {
        const urlParams = new URLSearchParams();
        if (params.tanggalfrom) urlParams.append('tanggalfrom', params.tanggalfrom);
        if (params.tanggalto) urlParams.append('tanggalto', params.tanggalto);
        const qs = urlParams.toString();
        if (qs) url += `?${qs}`;
    }
    try {
        const res = await fetch(url, { headers: getGccCuttingBundlesRequestHeaders() });
        const text = await res.text();
        let data: unknown = null;
        try {
            data = text.replace(/^\uFEFF/, '').trim() ? JSON.parse(text) : null;
        } catch {
            return { success: false, error: 'Respons GET Sewing Dashboard bukan JSON', status: 502 };
        }
        if (!isGccCuttingApiBodyOk(data)) {
            const bodyRes = data as GccCuttingSewingDashboardDataResponse | null;
            const msg = bodyRes?.message || bodyRes?.status || `HTTP ${res.status}`;
            return { success: false, error: String(msg), status: res.status };
        }
        const successBody = data as GccCuttingSewingDashboardDataResponse;
        if (!successBody.data) {
            return { success: false, error: 'Tidak ada properti `data` pada respons API.', status: 500 };
        }
        return { success: true, data: successBody.data, status: res.status };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Gagal memuat data sewing', status: 500 };
    }
}

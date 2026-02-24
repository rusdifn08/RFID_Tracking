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
    // Port 5173 = MJL → proxy port 8000
    // Port lainnya (CLN) → proxy port 8000
    return 8000;
};

const PROXY_PORT = getProxyPort(); // Port untuk proxy server (server.js) - dinamis berdasarkan environment
// Backend API menggunakan IP eksplisit 10.8.0.104:7000 (dikonfigurasi di server.js)

// Base URL untuk API Server (Proxy Server)
// FLEKSIBILITAS: Otomatis menyesuaikan dengan IP/hostname dari mesin yang menjalankan frontend
// - Jika akses dari localhost → proxy di localhost:8000
// - Jika akses dari 10.5.0.2 → proxy di 10.5.0.2:8000
// - Jika akses dari IP lain → proxy di IP tersebut:8000
// 
// Server.js kemudian akan memanggil backend API di 10.8.0.104:7000 atau 10.5.0.106:7000
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
            return '10.5.0.99';
        }
    }
    // Default: CLN
    return '10.8.0.104';
};

// Port backend WebSocket (sama untuk semua environment)
const BACKEND_WS_PORT = 7000;

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

// Cache untuk environment (CLN, MJL, atau MJL2)
let cachedEnvironment: 'CLN' | 'MJL' | 'MJL2' | null = null;

// Fungsi untuk set environment cache (dipanggil dari komponen yang fetch /api/config/environment)
export const setBackendEnvironment = (env: 'CLN' | 'MJL' | 'MJL2'): void => {
    cachedEnvironment = env;
    localStorage.setItem('backend_environment', env);
};

// Getter untuk environment yang sudah di-cache (bisa dipakai untuk conditional logic)
export const getBackendEnvironment = (): 'CLN' | 'MJL' | 'MJL2' | null => cachedEnvironment;

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

        if (contentType && contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (jsonError) {
                const text = await response.text();
                return {
                    success: false,
                    error: text || `HTTP ${response.status}: ${response.statusText}`,
                    data: undefined,
                    status: response.status
                };
            }
        } else {
            const text = await response.text();
            return {
                success: false,
                error: text || `HTTP ${response.status}: ${response.statusText}`,
                data: undefined,
                status: response.status
            };
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
            responseData = data.data || data;
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

            // Bandingkan dengan pwd_md5 dari database
            const dbPasswordHash = response.data.user.pwd_md5 || '';


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
 * Detail data per status & line (untuk modal Detail di Dashboard RFID).
 * Contoh: GET /wira/detail?status=output_sewing&line=1
 * Response: { status: "success", filter_applied: { line, status }, count, data: [...] }
 */
export const getWiraDetail = async (
    status: string,
    line: string | number
): Promise<ApiResponse<{ status: string; filter_applied?: Record<string, string>; count?: number; data?: any[] }>> => {
    return await apiGet('/wira/detail', { status, line: String(line) });
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
 * Get finishing data per line
 * @param lineId - Line ID (e.g., "3")
 * @returns Finishing data (dryroom, folding, reject_room) for specific line
 */
export const getFinishingDataByLine = async (lineId: string): Promise<ApiResponse<FinishingData>> => {
    return await apiGet<FinishingData>(`/finishing?line=${encodeURIComponent(lineId)}`);
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
    is_done?: string;
    error?: string;
}

/**
 * Dryroom Check In
 * @param rfid_garment - Nomor RFID garment yang akan di-check in
 * @returns Response data check in
 */
export const dryroomCheckIn = async (rfid_garment: string): Promise<ApiResponse<FinishingCheckResponse>> => {
    return await apiPost<FinishingCheckResponse>(`/garment/dryroom/in?rfid_garment=${encodeURIComponent(rfid_garment)}`, {});
};

/**
 * Dryroom Check Out
 * @param rfid_garment - Nomor RFID garment yang akan di-check out
 * @returns Response data check out
 */
export const dryroomCheckOut = async (rfid_garment: string): Promise<ApiResponse<FinishingCheckResponse>> => {
    return await apiPost<FinishingCheckResponse>(`/garment/dryroom/out?rfid_garment=${encodeURIComponent(rfid_garment)}`, {});
};

/**
 * Folding Check In
 * @param rfid_garment - Nomor RFID garment yang akan di-check in
 * @returns Response data check in
 */
export const foldingCheckIn = async (rfid_garment: string): Promise<ApiResponse<FinishingCheckResponse>> => {
    return await apiPost<FinishingCheckResponse>(`/garment/folding/in?rfid_garment=${encodeURIComponent(rfid_garment)}`, {});
};

export const foldingCheckOut = async (rfid_garment: string, nik?: string, tableNumber?: number): Promise<ApiResponse<FinishingCheckResponse>> => {
    const body: { nik?: string; table?: string } = {};
    if (nik) body.nik = nik;
    if (tableNumber) body.table = tableNumber.toString();
    return await apiPost<FinishingCheckResponse>(`/garment/folding/out?rfid_garment=${encodeURIComponent(rfid_garment)}`, body);
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


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
import { getApiBaseUrl, getLocalIP } from '../utils/network';

// Konfigurasi Port
const PROXY_PORT = 8000; // Port untuk proxy server (server.js)
// Backend API menggunakan IP eksplisit 10.8.0.104:7000 (dikonfigurasi di server.js)

// Base URL untuk API Server (Proxy Server)
// Frontend memanggil server.js (proxy) yang berjalan di local IP:8000
// Server.js kemudian akan memanggil backend API di 10.8.0.104:7000
export const API_BASE_URL = isDevelopment
    ? getApiBaseUrl(PROXY_PORT)  // Server.js (Proxy) - menggunakan local IP dengan port 8000
    : import.meta.env.VITE_API_URL || getApiBaseUrl(PROXY_PORT);

// Base URL untuk WebSocket (jika diperlukan)
export const WS_BASE_URL = isDevelopment
    ? `ws://${getLocalIP()}:${PROXY_PORT}`
    : import.meta.env.VITE_WS_URL || `ws://${getLocalIP()}:${PROXY_PORT}`;

// ============================================
// PRODUCTION SCHEDULE API CONFIGURATION
// ============================================

// Base URL untuk Production Schedule API
export const PROD_SCH_API_BASE_URL = 'http://10.8.18.60:7186';

// API Key untuk Production Schedule API
export const PROD_SCH_API_KEY = '332100185';

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
 * @param path - WebSocket path (contoh: '/ws')
 * @returns WebSocket URL lengkap
 */
export const getWebSocketUrl = (path: string = '/ws'): string => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${WS_BASE_URL}${cleanPath}`;
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

    const defaultHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    const config: RequestInit = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };

    try {
        const response = await fetch(url, config);

        // Parse JSON response
        const data = await response.json();

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
                error: data.message || data.error || `HTTP ${response.status}: ${response.statusText}`,
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
        console.error(`❌ [API REQUEST] Error [${endpoint}]:`, error);
        
        // Handle "Failed to fetch" error specifically
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
            return {
                success: false,
                error: `Tidak dapat terhubung ke proxy server. Pastikan server.js (proxy) berjalan di http://${getLocalIP()}:8000. Backend API harus berjalan di http://10.8.0.104:7000`,
                data: undefined,
                status: 500
            };
        }
        
        return {
            success: false,
            error: errorMessage,
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
    return await apiRequest<T>(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
    });
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
                // Password cocok, return success
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
 * @param line - Line code (contoh: 'L1')
 * @param startDateFrom - Start date from (format: YYYY-MM-DD)
 * @param startDateTo - Start date to (format: YYYY-MM-DD, optional)
 * @returns WO Breakdown data
 */
export const getWOBreakdown = async (
    branch: string = 'CJL',
    line: string = 'L1',
    startDateFrom?: string,
    startDateTo?: string
): Promise<ApiResponse<WOBreakdownResponse>> => {
    try {
        // Gunakan proxy endpoint dari server.js untuk menghindari CORS dan rate limiting
        // Proxy akan memanggil ke 10.8.18.60:7186 dengan header GCC-API-KEY
        let apiUrl = `${API_BASE_URL}/api/prod-sch/get-wo-breakdown?branch=${encodeURIComponent(branch)}&line=${encodeURIComponent(line)}`;
        
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
                'Content-Type': 'application/json',
                'Accept': 'application/json',
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


/**
 * Utility untuk mendapatkan Local Network IP Address
 * 
 * FLEKSIBILITAS: Fungsi ini otomatis menyesuaikan dengan IP/hostname dari mesin yang menjalankan frontend
 * - Jika akses dari localhost → proxy di localhost:8000
 * - Jika akses dari 10.5.0.2 → proxy di 10.5.0.2:8000
 * - Jika akses dari IP lain → proxy di IP tersebut:8000
 */

/**
 * Mendapatkan local network IP address
 * Menggunakan window.location.hostname yang otomatis menyesuaikan dengan mesin yang menjalankan frontend
 * 
 * @returns IP atau hostname dari mesin yang menjalankan frontend
 * 
 * @example
 * - Akses dari http://localhost:5173 → return 'localhost'
 * - Akses dari http://10.5.0.2:5173 → return '10.5.0.2'
 * - Akses dari http://192.168.1.100:5173 → return '192.168.1.100'
 */
export const getLocalIP = (): string => {
    // Di browser, kita tidak bisa langsung mendapatkan IP
    // Gunakan window.location.hostname yang otomatis menyesuaikan dengan mesin yang menjalankan frontend
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        
        // Jika hostname adalah localhost atau 127.0.0.1, gunakan localhost
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'localhost';
        }
        
        // Untuk IP atau hostname lain, gunakan hostname tersebut
        // Ini memastikan proxy server (server.js) akan dicari di mesin yang sama dengan frontend
        // Contoh:
        // - Jika frontend di 10.5.0.2:5173, proxy akan dicari di 10.5.0.2:8000
        // - Jika frontend di 192.168.1.100:5173, proxy akan dicari di 192.168.1.100:8000
        return hostname;
    }
    
    // Fallback untuk SSR atau environment tanpa window
    return 'localhost';
};

/**
 * Mendapatkan API Base URL dengan local IP
 * @param port - Port number (default: 7000 untuk proxy server)
 */
/** Host proxy server.js untuk MJL2 dev (port frontend 5174 → proxy :8001). */
const MJL2_DEV_PROXY = 'http://10.6.0.99:8001';

export const getApiBaseUrl = (port: number = 7000): string => {
    const fromEnv = import.meta.env.VITE_NODE_PROXY_URL as string | undefined;
    if (fromEnv?.trim()) return fromEnv.replace(/\/$/, '');

    if (typeof window !== 'undefined' && import.meta.env.DEV) {
        // HTTPS dev: same-origin → Vite proxy (hindari mixed content ke http://IP:8000)
        if (window.location.protocol === 'https:') {
            return window.location.origin;
        }
        // MJL2 dev: server.js di 10.6.0.99:8001, bukan mesin Vite (10.5.0.2:5174)
        if (window.location.port === '5174' && port === 8001) {
            return MJL2_DEV_PROXY;
        }
    }
    const ip = getLocalIP();
    return `http://${ip}:${port}`;
};

/**
 * Mendapatkan Backend API URL dengan local IP
 * @param port - Port number (default: 8000 untuk backend API)
 */
export const getBackendApiUrl = (port: number = 8000): string => {
    const ip = getLocalIP();
    return `http://${ip}:${port}`;
};


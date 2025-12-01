/**
 * Utility untuk mendapatkan Local Network IP Address
 */

/**
 * Mendapatkan local network IP address
 * Menggunakan window.location.hostname sebagai fallback
 */
export const getLocalIP = (): string => {
    // Di browser, kita tidak bisa langsung mendapatkan IP
    // Gunakan window.location.hostname atau localhost
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        // Jika hostname adalah localhost atau 127.0.0.1, gunakan localhost
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'localhost';
        }
        return hostname;
    }
    return 'localhost';
};

/**
 * Mendapatkan API Base URL dengan local IP
 * @param port - Port number (default: 7000 untuk proxy server)
 */
export const getApiBaseUrl = (port: number = 7000): string => {
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


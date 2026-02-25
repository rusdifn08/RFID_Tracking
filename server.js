/**
 * Proxy Server untuk Frontend
 * Server proxy yang menghubungkan frontend dengan backend API
 */

import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ============================================
// KONFIGURASI NETWORK
// ============================================

/**
 * Mendapatkan Local Network IP Address
 */
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] || []) {
            // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// Konfigurasi IP dan Port
const LOCAL_IP = getLocalIP(); // IP local untuk Proxy Server (mengikuti PC yang digunakan)

// Backend IP - bisa diatur melalui environment variable atau command line argument
// Default: 10.8.0.104 (CLN)
// Alternatif: 10.5.0.106 (MJL) - set via BACKEND_IP environment variable
let BACKEND_IP = process.env.BACKEND_IP || '10.8.0.104';

// Variabel untuk menyimpan environment (CLN, MJL, atau MJL2)
let CURRENT_ENV = 'CLN';

// Cek command line argument untuk menentukan IP
// Format: node server.js cln atau node server.js mjl atau node server.js mjl2
const args = process.argv.slice(2);
if (args.includes('cln')) {
    BACKEND_IP = '10.8.0.104';
    CURRENT_ENV = 'CLN';
} else if (args.includes('mjl')) {
    BACKEND_IP = '10.5.0.106';
    CURRENT_ENV = 'MJL';
} else if (args.includes('mjl2')) {
    BACKEND_IP = '10.5.0.99';
    CURRENT_ENV = 'MJL2';
} else if (process.env.BACKEND_IP) {
    BACKEND_IP = process.env.BACKEND_IP;
    CURRENT_ENV = BACKEND_IP === '10.5.0.106' ? 'MJL' : 'CLN';
} else {
}

// Port untuk proxy server - berbeda per environment agar bisa run bersamaan
// MJL: 8000, MJL2: 8001, CLN: 8000
let PORT = process.env.PORT || 8000;
if (CURRENT_ENV === 'MJL2') {
    PORT = 8001; // Port berbeda untuk MJL2 agar bisa run bersamaan dengan MJL
} else if (CURRENT_ENV === 'MJL') {
    PORT = 8000; // Port untuk MJL
} else {
    PORT = 8000; // Port untuk CLN (default)
}

const HOST = '0.0.0.0'; // Listen di semua network interface

// Port untuk backend API - semua environment menggunakan port 7000
const BACKEND_PORT = 7000;

// Backend API URL - menggunakan IP yang sudah dikonfigurasi dengan port yang sesuai
const BACKEND_API_URL = process.env.BACKEND_API_URL || `http://${BACKEND_IP}:${BACKEND_PORT}`;

// API Key untuk MJL dan CLN (sama untuk semua environment)
const API_KEY = '6lYZkryM.j50CVZgnpBl8X7Nx6sy5KRyY6ET7k3Cb';
const API_KEY_HEADER = 'X-Api-Key';
// Alias untuk backward compatibility
const MJL_API_KEY = API_KEY;
const MJL_API_KEY_HEADER = API_KEY_HEADER;



// ============================================
// USER TRACKING SYSTEM
// ============================================

// Path file untuk menyimpan data user yang login
const USER_LOG_FILE = path.join(__dirname, 'user_logs.json');

// In-memory storage untuk active sessions (user yang sedang login)
// Format: { [environment_lineNumber]: { nik, name, jabatan, line, loginTime, ipAddress, environment } }
// Contoh: { 'CLN_1': {...}, 'MJL_1': {...}, 'MJL2_1': {...} }
// Key format: {ENVIRONMENT}_{lineNumber} untuk memisahkan per environment
const activeSessions = new Map();

// Session web: semua user yang login ke aplikasi (untuk validasi setelah auto-logout)
// Key format: {ENVIRONMENT}_{nik} - digunakan oleh GET /api/auth/session
const webSessions = new Map();

// In-memory storage untuk user yang sedang scan di folding table (realtime tracking)
// Format: { [tableNumber]: { nik, name, line, scanStartTime } }
// Digunakan untuk mode all-users: menampilkan user yang sedang scan di dashboard
const scanningUsers = new Map();

// In-memory storage untuk folding checkout data per table dan per jam
// Format: { [date]: { [tableNumber]: { [hour]: count } } }
// Contoh: { '2025-01-19': { '3': { '08': 5, '09': 10, ... }, ... } }
const foldingCheckoutData = new Map();

// Path file untuk menyimpan data folding checkout
const FOLDING_CHECKOUT_FILE = path.join(__dirname, 'folding_checkout_data.json');
// Path file untuk menyimpan data detail folding checkout (rfid, wo, item, dll)
const FOLDING_CHECKOUT_DETAIL_FILE = path.join(__dirname, 'folding_checkout_detail.json');
// Path file untuk menyimpan data shift (siang/malam) per line
const SHIFT_DATA_FILE = path.join(__dirname, 'shift_data.json');
// Path file untuk menyimpan data supervisor per line
const SUPERVISOR_DATA_FILE = path.join(__dirname, 'supervisor_data.json');

/**
 * Fungsi untuk menyimpan data folding checkout
 */
function saveFoldingCheckout(tableNumber, rfid_garment, nik, responseData) {
    try {
        const now = new Date();
        const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        // Logika untuk menentukan hour slot
        // Jam pertama: 07:30 - 09:00 (07:30-08:59 masuk ke slot '07:30')
        // Jam selanjutnya: 09:00-10:00, 10:00-11:00, dst
        let hour;
        if (currentHour === 7 && currentMinute >= 30) {
            // 07:30 - 07:59 masuk ke slot pertama
            hour = '07:30';
        } else if (currentHour === 8) {
            // 08:00 - 08:59 masuk ke slot pertama
            hour = '07:30';
        } else {
            // Jam lainnya menggunakan format standar
            hour = currentHour.toString().padStart(2, '0');
        }

        const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Load data existing untuk count - dengan struktur per environment
        let checkoutData = {};
        if (fs.existsSync(FOLDING_CHECKOUT_FILE)) {
            try {
                const fileContent = fs.readFileSync(FOLDING_CHECKOUT_FILE, 'utf-8');
                checkoutData = JSON.parse(fileContent);
            } catch (e) {
                checkoutData = {};
            }
        }

        // Initialize structure per environment jika belum ada
        if (!checkoutData[CURRENT_ENV]) {
            checkoutData[CURRENT_ENV] = {};
        }
        if (!checkoutData[CURRENT_ENV][date]) {
            checkoutData[CURRENT_ENV][date] = {};
        }
        if (!checkoutData[CURRENT_ENV][date][tableNumber]) {
            checkoutData[CURRENT_ENV][date][tableNumber] = {};
        }
        if (!checkoutData[CURRENT_ENV][date][tableNumber][hour]) {
            checkoutData[CURRENT_ENV][date][tableNumber][hour] = 0;
        }

        // Increment count
        const oldCount = checkoutData[CURRENT_ENV][date][tableNumber][hour] || 0;
        checkoutData[CURRENT_ENV][date][tableNumber][hour] = oldCount + 1;
        const newCount = checkoutData[CURRENT_ENV][date][tableNumber][hour];

        // Hitung total untuk table ini hari ini
        let totalToday = 0;
        Object.values(checkoutData[CURRENT_ENV][date][tableNumber] || {}).forEach(count => {
            totalToday += count;
        });

        // Simpan count ke file
        fs.writeFileSync(FOLDING_CHECKOUT_FILE, JSON.stringify(checkoutData, null, 2), 'utf-8');

        // Simpan data detail jika ada response data - dengan struktur per environment
        if (responseData) {
            let detailData = {};
            if (fs.existsSync(FOLDING_CHECKOUT_DETAIL_FILE)) {
                try {
                    const fileContent = fs.readFileSync(FOLDING_CHECKOUT_DETAIL_FILE, 'utf-8');
                    detailData = JSON.parse(fileContent);
                } catch (e) {
                    detailData = {};
                }
            }

            // Initialize structure per environment untuk detail data
            if (!detailData[CURRENT_ENV]) {
                detailData[CURRENT_ENV] = {};
            }
            if (!detailData[CURRENT_ENV][date]) {
                detailData[CURRENT_ENV][date] = {};
            }
            if (!detailData[CURRENT_ENV][date][tableNumber]) {
                detailData[CURRENT_ENV][date][tableNumber] = [];
            }

            // Tambahkan data detail baru
            const detailItem = {
                id: Date.now(), // Unique ID
                rfid: responseData.rfid || rfid_garment,
                wo: responseData.wo || '-',
                style: responseData.style || '-',
                item: responseData.item || '-',
                buyer: responseData.buyer || '-',
                color: responseData.color || '-',
                size: responseData.size || '-',
                status: 'Shipment',
                timestamp: now.toISOString(),
                line: tableNumber.toString(),
                nik_operator: responseData.nik_operator || nik,
                is_done: responseData.is_done || 'done',
                environment: CURRENT_ENV // Tambahkan environment info
            };

            detailData[CURRENT_ENV][date][tableNumber].unshift(detailItem); // Tambahkan di awal array

            // Simpan detail data ke file
            fs.writeFileSync(FOLDING_CHECKOUT_DETAIL_FILE, JSON.stringify(detailData, null, 2), 'utf-8');
        }

        // Update in-memory storage
        if (!foldingCheckoutData.has(date)) {
            foldingCheckoutData.set(date, new Map());
        }
        const dateMap = foldingCheckoutData.get(date);
        if (!dateMap.has(tableNumber)) {
            dateMap.set(tableNumber, new Map());
        }
        const tableMap = dateMap.get(tableNumber);
        tableMap.set(hour, newCount);

        // Console log dengan detail lengkap
    } catch (error) {
        console.error('❌ [FOLDING CHECKOUT] Error saving data:', error.message);
    }
}

/**
 * Migrate data folding checkout dari struktur lama ke struktur baru (per environment)
 * Struktur lama: { "date": { "table": {...} } }
 * Struktur baru: { "CLN": { "date": {...} }, "MJL": {...}, "MJL2": {...} }
 */
function migrateFoldingCheckoutData() {
    try {
        if (!fs.existsSync(FOLDING_CHECKOUT_FILE)) {
            return;
        }

        const fileContent = fs.readFileSync(FOLDING_CHECKOUT_FILE, 'utf-8');
        const checkoutData = JSON.parse(fileContent);

        // Cek apakah sudah menggunakan struktur baru (ada key CLN, MJL, atau MJL2)
        const hasNewStructure = checkoutData.CLN || checkoutData.MJL || checkoutData.MJL2;

        if (hasNewStructure) {
            // Sudah menggunakan struktur baru, tidak perlu migrate
            return;
        }

        // Struktur lama: migrate semua data ke CLN (karena data lama biasanya dari CLN)
        console.log('🔄 [MIGRATE FOLDING CHECKOUT] Migrating old structure to new structure...');
        const migratedData = {
            CLN: checkoutData, // Data lama dianggap dari CLN
            MJL: {},
            MJL2: {}
        };

        // Simpan data yang sudah di-migrate
        fs.writeFileSync(FOLDING_CHECKOUT_FILE, JSON.stringify(migratedData, null, 2), 'utf-8');
        console.log('✅ [MIGRATE FOLDING CHECKOUT] Migration completed. Old data moved to CLN environment.');

        // Migrate detail data juga
        if (fs.existsSync(FOLDING_CHECKOUT_DETAIL_FILE)) {
            try {
                const detailFileContent = fs.readFileSync(FOLDING_CHECKOUT_DETAIL_FILE, 'utf-8');
                const detailData = JSON.parse(detailFileContent);

                // Cek apakah sudah menggunakan struktur baru
                const hasNewDetailStructure = detailData.CLN || detailData.MJL || detailData.MJL2;

                if (!hasNewDetailStructure) {
                    const migratedDetailData = {
                        CLN: detailData, // Data lama dianggap dari CLN
                        MJL: {},
                        MJL2: {}
                    };

                    fs.writeFileSync(FOLDING_CHECKOUT_DETAIL_FILE, JSON.stringify(migratedDetailData, null, 2), 'utf-8');
                    console.log('✅ [MIGRATE FOLDING CHECKOUT DETAIL] Migration completed. Old data moved to CLN environment.');
                }
            } catch (e) {
                console.error('❌ [MIGRATE FOLDING CHECKOUT DETAIL] Error:', e.message);
            }
        }
    } catch (error) {
        console.error('❌ [MIGRATE FOLDING CHECKOUT] Error:', error.message);
    }
}

/**
 * Load folding checkout data dari file saat server start
 * Hanya load data dari environment yang sesuai (CLN, MJL, atau MJL2)
 */
function loadFoldingCheckoutData() {
    try {
        if (!fs.existsSync(FOLDING_CHECKOUT_FILE)) {
            return;
        }

        const fileContent = fs.readFileSync(FOLDING_CHECKOUT_FILE, 'utf-8');
        const checkoutData = JSON.parse(fileContent);

        // Load hanya data dari environment yang sesuai
        // Struktur baru: { "CLN": { "date": {...} }, "MJL": {...}, "MJL2": {...} }
        // Struktur lama (backward compatibility): { "date": {...} } - akan di-migrate otomatis
        let envData = {};

        if (checkoutData[CURRENT_ENV]) {
            // Struktur baru: data sudah terpisah per environment
            envData = checkoutData[CURRENT_ENV];
        } else {
            // Struktur lama: data belum terpisah, hanya load jika CURRENT_ENV adalah CLN (default)
            // Untuk backward compatibility, hanya CLN yang akan load data lama
            if (CURRENT_ENV === 'CLN') {
                envData = checkoutData;
            } else {
                // Untuk MJL dan MJL2, jika tidak ada data dengan struktur baru, skip
                console.log(`ℹ️ [LOAD FOLDING CHECKOUT] No data found for ${CURRENT_ENV} environment`);
                return;
            }
        }

        // Load ke in-memory storage
        Object.keys(envData).forEach(date => {
            const dateMap = new Map();
            Object.keys(envData[date]).forEach(tableNumber => {
                const tableMap = new Map();
                Object.keys(envData[date][tableNumber]).forEach(hour => {
                    tableMap.set(hour, envData[date][tableNumber][hour]);
                });
                dateMap.set(tableNumber, tableMap);
            });
            foldingCheckoutData.set(date, dateMap);
        });

        if (CURRENT_ENV === 'MJL2') {
            console.log(`✅ [LOAD FOLDING CHECKOUT] Loaded data for ${CURRENT_ENV}: ${Object.keys(envData).length} dates`);
        }

    } catch (error) {
        console.error('❌ [FOLDING CHECKOUT] Error loading data:', error.message);
    }
}

/**
 * Load active sessions dari file user_logs.json saat server start
 * Hanya load user dengan jabatan FOLDING yang belum logout
 */
function loadActiveSessionsFromFile() {
    try {
        if (!fs.existsSync(USER_LOG_FILE)) {
            return;
        }

        const fileContent = fs.readFileSync(USER_LOG_FILE, 'utf-8');
        const userLogs = JSON.parse(fileContent);

        // Extract line number dari nama user
        const extractLineNumber = (name) => {
            if (!name) return null;
            const match = name.match(/\d+/);
            return match ? parseInt(match[0]) : null;
        };

        // Load user dengan jabatan FOLDING yang belum logout (logoutTime null)
        // HANYA load user dari environment yang sesuai (CLN, MJL, atau MJL2)
        let loadedCount = 0;
        userLogs.forEach((log, index) => {
            // Extract line number dengan prioritas: dari name, lalu dari line field
            let lineNumber = extractLineNumber(log.name);
            if (!lineNumber && log.line) {
                // Jika tidak ditemukan dari name, coba dari line field
                // Convert ke number jika string
                const lineValue = typeof log.line === 'string' ? parseInt(log.line) : log.line;
                if (!isNaN(lineValue) && lineValue > 0) {
                    lineNumber = lineValue;
                }
            }

            const isFolding = (log.jabatan === 'FOLDING' || log.bagian === 'FOLDING');
            const isNotLoggedOut = !log.logoutTime;

            // Filter berdasarkan environment - hanya load user dari environment yang sesuai
            // Cek environment dari log.environment atau log.backendIP
            const logEnvironment = log.environment || (log.backendIP === '10.8.0.104' ? 'CLN' :
                log.backendIP === '10.5.0.106' ? 'MJL' :
                    log.backendIP === '10.5.0.99' ? 'MJL2' : null);
            const isSameEnvironment = logEnvironment === CURRENT_ENV;

            // Hanya load jika: FOLDING, belum logout, dan environment sama
            if (lineNumber && isFolding && isNotLoggedOut && isSameEnvironment) {
                // Gunakan key dengan environment prefix untuk memisahkan per environment
                const sessionKey = `${CURRENT_ENV}_${lineNumber.toString()}`;
                activeSessions.set(sessionKey, {
                    nik: log.nik,
                    name: log.name,
                    jabatan: log.jabatan,
                    line: lineNumber.toString(),
                    loginTime: log.loginTime,
                    ipAddress: log.ipAddress,
                    environment: CURRENT_ENV
                });
                loadedCount++;
            }
        });

        // Hanya tampilkan jumlah akun yang login
        if (loadedCount > 0) {
            console.log(`✅ [LOAD ACTIVE SESSIONS] ${loadedCount} active FOLDING session(s) loaded for ${CURRENT_ENV}`);
        } else {
            console.log(`ℹ️ [LOAD ACTIVE SESSIONS] No active FOLDING sessions found for ${CURRENT_ENV}`);
        }
    } catch (error) {
        console.error('❌ [ACTIVE SESSION] Error loading active sessions from file:', error.message);
    }
}

/**
 * Fungsi untuk menyimpan data user yang login
 */
function saveUserLogin(userData, req) {
    try {
        // Baca data existing
        let userLogs = [];
        if (fs.existsSync(USER_LOG_FILE)) {
            const fileContent = fs.readFileSync(USER_LOG_FILE, 'utf-8');
            try {
                userLogs = JSON.parse(fileContent);
            } catch (e) {
                userLogs = [];
            }
        }

        // Tambahkan data login baru
        const loginData = {
            nik: userData.nik || userData.NIK || '',
            name: userData.nama || userData.name || '',
            jabatan: userData.bagian || userData.jabatan || '',
            bagian: userData.bagian || '',
            role: userData.role || 'user',
            rfid_user: userData.rfid_user || '',
            line: userData.line || '',
            ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown',
            userAgent: req.headers['user-agent'] || 'Unknown',
            loginTime: new Date().toISOString(),
            logoutTime: null,
            backendIP: BACKEND_IP,
            environment: CURRENT_ENV, // Simpan environment info untuk filtering
            timestamp: new Date().toISOString()
        };

        userLogs.push(loginData);

        // Simpan ke file
        fs.writeFileSync(USER_LOG_FILE, JSON.stringify(userLogs, null, 2), 'utf-8');

        // Extract line number dari nama user (contoh: "TABLE 5" -> 5, "MEJA 4" -> 4)
        const extractLineNumber = (name) => {
            if (!name) return null;
            // Cari angka di nama (TABLE 5, MEJA 4, FO_3, dll)
            const match = name.match(/\d+/);
            return match ? parseInt(match[0]) : null;
        };

        // Simpan ke active sessions jika jabatan adalah FOLDING
        // Extract line number dengan prioritas: dari name, lalu dari line field
        let lineNumber = extractLineNumber(loginData.name);
        if (!lineNumber && loginData.line) {
            // Jika tidak ditemukan dari name, coba dari line field
            // Convert ke number jika string
            const lineValue = typeof loginData.line === 'string' ? parseInt(loginData.line) : loginData.line;
            if (!isNaN(lineValue) && lineValue > 0) {
                lineNumber = lineValue;
            }
        }
        const isFolding = (loginData.jabatan === 'FOLDING' || loginData.bagian === 'FOLDING');

        // Log untuk debugging - khusus untuk MJL2
        if (CURRENT_ENV === 'MJL2') {
            console.log(`🔍 [SAVE USER LOGIN] Processing login:`, {
                nik: loginData.nik,
                name: loginData.name,
                line: loginData.line,
                extractedLine: extractLineNumber(loginData.name),
                finalLineNumber: lineNumber,
                jabatan: loginData.jabatan,
                bagian: loginData.bagian,
                isFolding,
                willAddToActiveSessions: lineNumber && isFolding
            });
        }

        if (lineNumber && isFolding) {
            // Gunakan key dengan environment prefix untuk memisahkan per environment
            // Format: {ENVIRONMENT}_{lineNumber} (contoh: 'CLN_1', 'MJL_1', 'MJL2_1')
            const sessionKey = `${CURRENT_ENV}_${lineNumber.toString()}`;
            activeSessions.set(sessionKey, {
                nik: loginData.nik,
                name: loginData.name,
                jabatan: loginData.jabatan,
                line: lineNumber.toString(),
                loginTime: loginData.loginTime,
                ipAddress: loginData.ipAddress,
                environment: CURRENT_ENV // Simpan environment info
            });

            if (CURRENT_ENV === 'MJL2') {
                console.log(`✅ [SAVE USER LOGIN] Added to activeSessions: NIK ${loginData.nik}, Line ${lineNumber.toString()}, Name: ${loginData.name}, Environment: ${CURRENT_ENV}`);
                console.log(`✅ [SAVE USER LOGIN] Session key: ${sessionKey}`);
                console.log(`✅ [SAVE USER LOGIN] Current activeSessions keys:`, Array.from(activeSessions.keys()));
            }
        } else {
            if (CURRENT_ENV === 'MJL2') {
                console.warn(`⚠️ [SAVE USER LOGIN] User NOT added to activeSessions:`, {
                    reason: !lineNumber ? 'No line number' : !isFolding ? 'Not FOLDING' : 'Unknown',
                    lineNumber,
                    isFolding
                });
            }
        }

        return loginData;
    } catch (error) {
        console.error('❌ [USER TRACKING] Error menyimpan data user:', error.message);
        return null;
    }
}

/**
 * Fungsi untuk update logout time dan hapus dari active sessions
 */
function updateUserLogout(nik, req) {
    try {
        if (!fs.existsSync(USER_LOG_FILE)) {
            return;
        }

        const fileContent = fs.readFileSync(USER_LOG_FILE, 'utf-8');
        let userLogs = [];
        try {
            userLogs = JSON.parse(fileContent);
        } catch (e) {
            return;
        }

        // Extract line number dari nama user
        const extractLineNumber = (name) => {
            if (!name) return null;
            const match = name.match(/\d+/);
            return match ? parseInt(match[0]) : null;
        };

        // Update logout time untuk login terakhir yang belum logout (jika NIK ada)
        let loggedOutUser = null;
        if (nik) {
            for (let i = userLogs.length - 1; i >= 0; i--) {
                if (userLogs[i].nik === nik && !userLogs[i].logoutTime) {
                    userLogs[i].logoutTime = new Date().toISOString();
                    loggedOutUser = userLogs[i];
                    break;
                }
            }
            fs.writeFileSync(USER_LOG_FILE, JSON.stringify(userLogs, null, 2), 'utf-8');

            // Hapus dari active sessions jika user adalah FOLDING
            // Hanya hapus dari environment yang sesuai
            if (loggedOutUser) {
                const lineNumber = extractLineNumber(loggedOutUser.name) || loggedOutUser.line;
                const logEnvironment = loggedOutUser.environment || (loggedOutUser.backendIP === '10.8.0.104' ? 'CLN' :
                    loggedOutUser.backendIP === '10.5.0.106' ? 'MJL' :
                        loggedOutUser.backendIP === '10.5.0.99' ? 'MJL2' : null);
                const isSameEnvironment = logEnvironment === CURRENT_ENV;

                if (lineNumber && (loggedOutUser.jabatan === 'FOLDING' || loggedOutUser.bagian === 'FOLDING') && isSameEnvironment) {
                    // Gunakan key dengan environment prefix
                    const sessionKey = `${CURRENT_ENV}_${lineNumber.toString()}`;
                    activeSessions.delete(sessionKey);
                }
            }
        }

        // Logout time updated (log removed for successful requests)
    } catch (error) {
        console.error('❌ [USER TRACKING] Error update logout:', error.message);
    }
}

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// HELPER FUNCTION - PROXY REQUEST
// ============================================

/**
 * Helper function untuk proxy request ke backend API
 * @param {string} endpoint - Endpoint path (contoh: '/user')
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Object} options - Options untuk fetch (method, body, dll)
 */
async function proxyRequest(endpoint, req, res, options = {}) {
    try {
        // Build query string dari req.query
        const queryParams = new URLSearchParams();
        Object.keys(req.query).forEach(key => {
            if (req.query[key]) {
                queryParams.append(key, req.query[key]);
            }
        });

        const queryString = queryParams.toString();
        const url = `${BACKEND_API_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;

        // Log untuk tracking time endpoints
        const isTrackingTimeEndpoint = ['/line', '/rework', '/qc-pqc', '/pqc-rework', '/pqc-indryroom',
            '/indryroom-outdryroom', '/outdryroom-infolding', '/infolding-outfolding', '/last-status', '/cycletime'].includes(endpoint);


        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 detik timeout

        // Siapkan headers dasar
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers,
        };

        // Tambahkan API Key untuk semua environment (MJL, MJL2, dan CLN)
        headers[API_KEY_HEADER] = API_KEY;

        // Forward headers dari request original jika ada (untuk session/token)
        if (req.headers.authorization) {
            headers['Authorization'] = req.headers.authorization;
        }
        if (req.headers.cookie) {
            headers['Cookie'] = req.headers.cookie;
        }


        const response = await fetch(url, {
            method: options.method || req.method || 'GET',
            headers: headers,
            body: options.body || (req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : undefined),
            signal: controller.signal
        }).catch((fetchError) => {
            clearTimeout(timeoutId);
            console.error(`❌ [PROXY] Fetch error for ${endpoint}:`, fetchError);
            if (endpoint === '/wira') {
                console.error(`❌ [WIRA] Failed to fetch from ${url}`);
                console.error(`❌ [WIRA] Error details:`, fetchError.message);
            }
            if (isTrackingTimeEndpoint) {
                console.error(`❌ [TRACKING TIME] Failed to fetch ${endpoint} from ${url}`);
            }
            throw fetchError;
        });

        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        let data;
        try {
            const textData = await response.text();
            if (textData) {
                data = JSON.parse(textData);
            }
        } catch (parseError) {
            console.error(`❌ [PROXY] JSON parse error for ${endpoint}:`, parseError);
            if (isTrackingTimeEndpoint) {
                console.error(`❌ [TRACKING TIME] Invalid JSON response from ${endpoint}`);
            }
            throw new Error('Invalid JSON response from backend API');
        }

        // Log untuk tracking time endpoints - hanya untuk error atau warning
        if (isTrackingTimeEndpoint) {
            if (hasData === 0 && response.ok) {
                console.warn(`⚠️ [TRACKING TIME] ${endpoint} returned empty data`);
            }
        }

        // Forward response dengan status code yang sama
        res.status(response.status).json(data);
    } catch (error) {
        console.error(`\n❌ [PROXY] Error for ${endpoint}:`, error);
        let errorMessage = 'Error connecting to backend API';
        let statusCode = 500;

        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            errorMessage = 'Request timeout - Backend API tidak merespon dalam 30 detik';
            statusCode = 504;
        } else if (error.message.includes('Failed to fetch') || error.message.includes('ECONNREFUSED')) {
            errorMessage = `Tidak dapat terhubung ke backend API. Pastikan ${BACKEND_API_URL} berjalan.`;
            statusCode = 503;
        } else if (error.message.includes('Invalid JSON')) {
            errorMessage = 'Backend API mengembalikan response yang tidak valid';
            statusCode = 502;
        }

        return res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

// ============================================
// MOCK DATA - DIHAPUS
// ============================================
// Semua mockdata telah dihapus, menggunakan backend API langsung

// ============================================
// ROUTES
// ============================================

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        server: 'Mock API Server',
        version: '1.0.0'
    });
});

// Environment Config Endpoint
app.get('/api/config/environment', (req, res) => {
    // Deteksi environment dari referer/origin header untuk membedakan port 5174 (MJL2) vs 5173 (MJL)
    const referer = req.headers.referer || req.headers.origin || '';
    const port = referer.match(/:(\d+)/)?.[1];

    let environment = CURRENT_ENV;

    // Jika port 5174 terdeteksi, pastikan environment adalah MJL2
    if (port === '5174') {
        environment = 'MJL2';
    } else if (port === '5173' && CURRENT_ENV === 'MJL') {
        environment = 'MJL';
    } else {
        // Gunakan CURRENT_ENV sebagai default
        environment = CURRENT_ENV;
    }

    res.json({
        success: true,
        environment: environment,
        backendIP: BACKEND_IP,
        backendURL: BACKEND_API_URL,
        detectedPort: port || 'unknown',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// CONNECTION HEALTH CHECK
// ============================================

// Database Configuration
const DATABASE_URL = 'http://10.5.0.99/db/garment';
const BACKEND_API_URL_CHECK = process.env.BACKEND_API_URL || BACKEND_API_URL;

// MySQL Configuration - Berbeda untuk setiap IP
// CLN (10.8.0.104): user 'robot', password 'robot123'
// MJL (10.5.0.106): user 'root', password 'satu1'
let MYSQL_USER, MYSQL_PASSWORD;

if (BACKEND_IP === '10.5.0.106') {
    // Konfigurasi untuk MJL
    MYSQL_USER = 'root';
    MYSQL_PASSWORD = 'satu1';
} else {
    // Konfigurasi default untuk CLN (10.8.0.104)
    MYSQL_USER = 'robot';
    MYSQL_PASSWORD = 'robot123';
}

const MYSQL_CONFIG = {
    host: BACKEND_IP, // MySQL host mengikuti backend IP
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: 'db_garmenttracking',  // Database name dari phpmyadmin
    group: 'db',
    table: 'garment',
    connectionLimit: 10,
    connectTimeout: 5000
};


/**
 * Check koneksi ke database
 * @returns {Promise<Object>} Status koneksi database
 */
async function checkDatabaseConnection() {
    const startTime = Date.now();
    try {
        // Coba koneksi ke database dengan GET request (atau bisa menggunakan OPTIONS untuk check)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout 5 detik

        const response = await fetch(`${DATABASE_URL}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        return {
            status: 'ok',
            connected: response.ok || response.status === 404 || response.status === 405, // 404/405 berarti server merespons
            responseTime: `${responseTime}ms`,
            statusCode: response.status,
            message: response.ok ? 'Database connection successful' : 'Database server responded but endpoint may not exist',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        const responseTime = Date.now() - startTime;
        return {
            status: 'error',
            connected: false,
            responseTime: `${responseTime}ms`,
            message: error.message || 'Failed to connect to database',
            error: error.name === 'AbortError' ? 'Connection timeout (5s)' : error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Check koneksi ke MySQL database
 * @returns {Promise<Object>} Status koneksi MySQL
 */
async function checkMySQLConnection() {
    const startTime = Date.now();
    let connection = null;

    try {
        // Buat koneksi MySQL
        connection = await mysql.createConnection({
            host: MYSQL_CONFIG.host,
            user: MYSQL_CONFIG.user,
            password: MYSQL_CONFIG.password,
            database: MYSQL_CONFIG.database,
            connectTimeout: MYSQL_CONFIG.connectTimeout
        });

        // Test query untuk check koneksi dan table
        const [tables] = await connection.execute(
            `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?`,
            [MYSQL_CONFIG.database, MYSQL_CONFIG.table]
        );

        // Test query untuk check apakah table garment ada dan bisa diakses
        const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${MYSQL_CONFIG.table} LIMIT 1`);

        const responseTime = Date.now() - startTime;

        // Tutup koneksi
        await connection.end();

        return {
            status: 'ok',
            connected: true,
            responseTime: `${responseTime}ms`,
            message: 'MySQL connection successful',
            details: {
                host: MYSQL_CONFIG.host,
                database: MYSQL_CONFIG.database,
                table: MYSQL_CONFIG.table,
                tableExists: tables[0].count > 0,
                tableAccessible: true,
                rowCount: rows[0].count
            },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        const responseTime = Date.now() - startTime;

        // Pastikan koneksi ditutup jika ada error
        if (connection) {
            try {
                await connection.end();
            } catch (e) {
                // Ignore error saat menutup koneksi
            }
        }

        return {
            status: 'error',
            connected: false,
            responseTime: `${responseTime}ms`,
            message: error.message || 'Failed to connect to MySQL',
            error: error.code || error.message,
            details: {
                host: MYSQL_CONFIG.host,
                database: MYSQL_CONFIG.database,
                table: MYSQL_CONFIG.table
            },
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Check koneksi ke API backend
 * @returns {Promise<Object>} Status koneksi API
 */
async function checkApiConnection() {
    const startTime = Date.now();
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout 5 detik

        // Siapkan headers dengan API Key jika backend adalah MJL
        const headers = {
            'Content-Type': 'application/json',
        };

        // Tambahkan API Key header jika backend IP adalah MJL (10.5.0.106)
        // API Key sudah ditambahkan di headers dasar untuk semua environment
        headers[API_KEY_HEADER] = API_KEY;

        const response = await fetch(`${BACKEND_API_URL_CHECK}/health`, {
            method: 'GET',
            headers: headers,
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        let responseData = null;
        try {
            responseData = await response.json();
        } catch (e) {
            // Jika response bukan JSON, tetap anggap berhasil jika status OK
        }

        return {
            status: 'ok',
            connected: response.ok,
            responseTime: `${responseTime}ms`,
            statusCode: response.status,
            message: response.ok ? 'API connection successful' : `API returned status ${response.status}`,
            data: responseData,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        const responseTime = Date.now() - startTime;
        return {
            status: 'error',
            connected: false,
            responseTime: `${responseTime}ms`,
            message: error.message || 'Failed to connect to API',
            error: error.name === 'AbortError' ? 'Connection timeout (5s)' : error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Check koneksi WebSocket ke backend WIRA Dashboard
 * @returns {Promise<Object>} Status koneksi WebSocket
 */
async function checkWebSocketConnection() {
    const startTime = Date.now();
    const wsUrl = `ws://${BACKEND_IP}:${BACKEND_PORT}/ws/wira-dashboard`;

    return new Promise((resolve) => {
        let resolved = false;
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                const responseTime = Date.now() - startTime;
                resolve({
                    status: 'error',
                    connected: false,
                    responseTime: `${responseTime}ms`,
                    message: 'WebSocket connection timeout (5s)',
                    error: 'Connection timeout',
                    url: wsUrl,
                    backendIP: BACKEND_IP,
                    backendPort: BACKEND_PORT,
                    environment: CURRENT_ENV,
                    timestamp: new Date().toISOString()
                });
            }
        }, 5000); // Timeout 5 detik

        try {
            const ws = new WebSocket(wsUrl);

            ws.on('open', () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    const responseTime = Date.now() - startTime;
                    ws.close();
                    resolve({
                        status: 'ok',
                        connected: true,
                        responseTime: `${responseTime}ms`,
                        message: 'WebSocket connection successful',
                        url: wsUrl,
                        backendIP: BACKEND_IP,
                        backendPort: BACKEND_PORT,
                        environment: CURRENT_ENV,
                        timestamp: new Date().toISOString()
                    });
                }
            });

            ws.on('error', (error) => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    const responseTime = Date.now() - startTime;
                    resolve({
                        status: 'error',
                        connected: false,
                        responseTime: `${responseTime}ms`,
                        message: error.message || 'WebSocket connection failed',
                        error: error.message || 'Unknown error',
                        url: wsUrl,
                        backendIP: BACKEND_IP,
                        backendPort: BACKEND_PORT,
                        environment: CURRENT_ENV,
                        timestamp: new Date().toISOString()
                    });
                }
            });

            ws.on('close', () => {
                // Connection closed - sudah di-handle di on('open') atau on('error')
            });
        } catch (error) {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                const responseTime = Date.now() - startTime;
                resolve({
                    status: 'error',
                    connected: false,
                    responseTime: `${responseTime}ms`,
                    message: error.message || 'Failed to create WebSocket connection',
                    error: error.message || 'Unknown error',
                    url: wsUrl,
                    backendIP: BACKEND_IP,
                    backendPort: BACKEND_PORT,
                    environment: CURRENT_ENV,
                    timestamp: new Date().toISOString()
                });
            }
        }
    });
}

// Health Check Endpoint - Check semua koneksi
app.get('/api/health/check', async (req, res) => {

    const [databaseStatus, mysqlStatus, apiStatus, wsStatus] = await Promise.allSettled([
        checkDatabaseConnection(),
        checkMySQLConnection(),
        checkApiConnection(),
        checkWebSocketConnection()
    ]);

    const databaseResult = databaseStatus.status === 'fulfilled'
        ? databaseStatus.value
        : {
            status: 'error',
            connected: false,
            message: 'Error checking database connection',
            error: databaseStatus.reason?.message || 'Unknown error',
            timestamp: new Date().toISOString()
        };

    const mysqlResult = mysqlStatus.status === 'fulfilled'
        ? mysqlStatus.value
        : {
            status: 'error',
            connected: false,
            message: 'Error checking MySQL connection',
            error: mysqlStatus.reason?.message || 'Unknown error',
            timestamp: new Date().toISOString()
        };

    const apiResult = apiStatus.status === 'fulfilled'
        ? apiStatus.value
        : {
            status: 'error',
            connected: false,
            message: 'Error checking API connection',
            error: apiStatus.reason?.message || 'Unknown error',
            timestamp: new Date().toISOString()
        };

    const wsResult = wsStatus.status === 'fulfilled'
        ? wsStatus.value
        : {
            status: 'error',
            connected: false,
            message: 'Error checking WebSocket connection',
            error: wsStatus.reason?.message || 'Unknown error',
            timestamp: new Date().toISOString()
        };

    const overallStatus = databaseResult.connected && mysqlResult.connected && apiResult.connected && wsResult.connected ? 'ok' : 'degraded';

    // Log results - hanya untuk error
    if (!databaseResult.connected) {
        console.error('❌ [HEALTH CHECK] Database Connection FAILED');
        console.error(`   Error: ${databaseResult.error || databaseResult.message}`);
    }
    if (!mysqlResult.connected) {
        console.error('❌ [HEALTH CHECK] MySQL Connection FAILED');
        console.error(`   Error: ${mysqlResult.error || mysqlResult.message}`);
    }
    if (!apiResult.connected) {
        console.error('❌ [HEALTH CHECK] API Connection FAILED');
        console.error(`   Error: ${apiResult.error || apiResult.message}`);
    }
    if (!wsResult.connected) {
        console.error('❌ [HEALTH CHECK] WebSocket Connection FAILED');
        console.error(`   Error: ${wsResult.error || wsResult.message}`);
    }

    res.json({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        checks: {
            database: {
                url: DATABASE_URL,
                ...databaseResult
            },
            mysql: {
                config: {
                    host: MYSQL_CONFIG.host,
                    database: MYSQL_CONFIG.database,
                    table: MYSQL_CONFIG.table
                },
                ...mysqlResult
            },
            api: {
                url: BACKEND_API_URL_CHECK,
                ...apiResult
            },
            websocket: {
                url: `ws://${BACKEND_IP}:${BACKEND_PORT}/ws/wira-dashboard`,
                ...wsResult
            }
        },
        summary: {
            total: 4,
            passed: (databaseResult.connected ? 1 : 0) + (mysqlResult.connected ? 1 : 0) + (apiResult.connected ? 1 : 0) + (wsResult.connected ? 1 : 0),
            failed: (databaseResult.connected ? 0 : 1) + (mysqlResult.connected ? 0 : 1) + (apiResult.connected ? 0 : 1) + (wsResult.connected ? 0 : 1)
        }
    });
});

// Individual Database Health Check
app.get('/api/health/database', async (req, res) => {
    const result = await checkDatabaseConnection();

    if (!result.connected) {
        console.error('❌ [DATABASE HEALTH CHECK] FAILED');
        console.error(`   URL: ${DATABASE_URL}`);
        console.error(`   Error: ${result.error || result.message}`);
    }

    res.status(result.connected ? 200 : 503).json({
        url: DATABASE_URL,
        ...result
    });
});

// Individual MySQL Health Check
app.get('/api/health/mysql', async (req, res) => {
    const result = await checkMySQLConnection();

    if (!result.connected) {
        console.error('❌ [MYSQL HEALTH CHECK] FAILED');
        console.error(`   Host: ${MYSQL_CONFIG.host}`);
        console.error(`   Database: ${MYSQL_CONFIG.database}`);
        console.error(`   Error: ${result.error || result.message}`);
    }

    res.status(result.connected ? 200 : 503).json({
        config: {
            host: MYSQL_CONFIG.host,
            database: MYSQL_CONFIG.database,
            table: MYSQL_CONFIG.table
        },
        ...result
    });
});

// Individual API Health Check
app.get('/api/health/api', async (req, res) => {
    const result = await checkApiConnection();

    if (!result.connected) {
        console.error('❌ [API HEALTH CHECK] FAILED');
        console.error(`   URL: ${BACKEND_API_URL_CHECK}`);
        console.error(`   Error: ${result.error || result.message}`);
    }

    res.status(result.connected ? 200 : 503).json({
        url: BACKEND_API_URL_CHECK,
        ...result
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Mock API Server untuk RFID Monitoring',
        endpoints: {
            health: '/health',
            login: '/api/auth/login',
            production: '/api/production/statistics',
            productionData: '/api/production/data',
            line: '/api/line/:id',
            rfid: '/api/rfid',
            rfidById: '/api/rfid/:id'
        }
    });
});

// ============================================
// AUTH ROUTES
// ============================================

// Login endpoint sudah dipindah ke bawah (line ~821) dengan support rfid_user

// Login endpoint (POST - untuk backward compatibility)
// Menggunakan backend API yang sebenarnya
app.post('/api/auth/login', async (req, res) => {
    const { nik, password } = req.body;

    // Validasi input
    if (!nik || !password) {
        return res.status(400).json({
            success: false,
            message: 'NIK dan Password harus diisi'
        });
    }

    try {
        // Panggil API backend yang sebenarnya menggunakan GET
        const apiUrl = `${BACKEND_API_URL}/login?nik=${encodeURIComponent(nik)}&password=${encodeURIComponent(password)}`;

        // Siapkan headers dengan API Key untuk semua environment
        const headers = {
            [API_KEY_HEADER]: API_KEY
        };

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: headers
        });
        const data = await response.json();

        if (data.success) {
            // Simpan data user login untuk tracking
            if (data.user) {
                saveUserLogin(data.user, req);
                // Daftarkan session web agar setelah auto-logout user harus login lagi
                const webKey = `${CURRENT_ENV}_${data.user.nik}`;
                webSessions.set(webKey, { nik: data.user.nik, loginTime: new Date().toISOString() });
            }
            return res.json({
                success: true,
                data: {
                    token: `token-${nik}`,
                    user: {
                        nik: data.user?.nik,
                        name: data.user?.nama,
                        jabatan: data.user?.bagian,
                        role: 'user'
                    }
                },
                message: 'Login berhasil',
                timestamp: new Date().toISOString()
            });
        } else {
            return res.status(response.status || 401).json({
                success: false,
                message: data.message || 'NIK tidak ditemukan'
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error connecting to backend API',
            error: error.message
        });
    }
});

// ============================================
// PRODUCTION DATA ROUTES - DIHAPUS (menggunakan mockdata)
// ============================================
// Semua route yang menggunakan mockdata telah dihapus
// Gunakan endpoint backend API langsung

// ============================================
// API ENDPOINTS - MySQL Data Query
// ============================================

/**
 * Query data user dari API backend berdasarkan NIK
 * GET /user?nik=
 * Endpoint ini memanggil API backend menggunakan BACKEND_API_URL (port dinamis berdasarkan environment)
 */
app.get('/user', async (req, res) => {
    const { nik, rfid_user } = req.query;

    // Log removed for successful requests - only errors will be logged

    // Jika ada rfid_user, proxy langsung ke backend dan track jika berhasil
    if (rfid_user) {
        try {
            // Proxy request ke backend
            const queryParams = new URLSearchParams();
            queryParams.append('rfid_user', rfid_user);
            const backendUrl = `${BACKEND_API_URL}/user?${queryParams.toString()}`;

            const headers = {
                'Content-Type': 'application/json',
            };

            // API Key sudah ditambahkan di headers dasar untuk semua environment
            headers[API_KEY_HEADER] = API_KEY;

            const response = await fetch(backendUrl, {
                method: 'GET',
                headers: headers
            });

            // Handle non-JSON responses
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                try {
                    data = await response.json();
                } catch (jsonError) {
                    const text = await response.text();
                    console.error(`❌ [USER API] JSON parse error:`, jsonError);
                    console.error(`❌ [USER API] Response text:`, text);
                    return res.status(response.status).json({
                        success: false,
                        message: 'Error parsing response from backend API',
                        error: text || jsonError.message,
                        timestamp: new Date().toISOString()
                    });
                }
            } else {
                const text = await response.text();
                return res.status(response.status).json({
                    success: false,
                    message: 'Invalid response from backend API',
                    error: text || `HTTP ${response.status}: ${response.statusText}`,
                    timestamp: new Date().toISOString()
                });
            }

            // Jika berhasil dan ada user data, track login
            if (response.ok && data.success && data.user) {
                saveUserLogin(data.user, req);
            }

            return res.status(response.status).json(data);
        } catch (error) {
            console.error(`❌ [USER API] Error fetching user by RFID:`, error);
            return res.status(500).json({
                success: false,
                message: 'Error connecting to backend API',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    if (!nik) {
        console.error(`❌ [SERVER] NIK atau rfid_user parameter is required`);
        return res.status(400).json({
            success: false,
            message: 'NIK atau rfid_user parameter is required',
            timestamp: new Date().toISOString()
        });
    }

    try {
        // Panggil API backend yang sebenarnya menggunakan BACKEND_API_URL (port dinamis)
        const backendUrl = `${BACKEND_API_URL}/user?nik=${encodeURIComponent(nik)}`;

        const startTime = Date.now();

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 detik timeout

        // Siapkan headers dengan API Key jika backend adalah MJL
        const headers = {
            'Content-Type': 'application/json',
        };

        // Tambahkan API Key header jika backend IP adalah MJL (10.5.0.106)
        // API Key sudah ditambahkan di headers dasar untuk semua environment
        headers[API_KEY_HEADER] = API_KEY;

        const response = await fetch(backendUrl, {
            method: 'GET',
            headers: headers,
            signal: controller.signal
        }).catch((fetchError) => {
            clearTimeout(timeoutId);
            console.error(`❌ [USER API] Fetch error for NIK ${nik}:`, fetchError);
            console.error(`❌ [USER API] Backend URL: ${backendUrl}`);
            console.error(`❌ [USER API] Headers:`, JSON.stringify(headers, null, 2));
            throw fetchError;
        });

        clearTimeout(timeoutId);

        const endTime = Date.now();
        const duration = endTime - startTime;

        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            console.error(`❌ [USER API] JSON parse error:`, parseError);
            const textData = await response.text();
            console.error(`❌ [USER API] Response text:`, textData);
            throw new Error('Invalid JSON response from backend API');
        }

        // Forward response dari backend API langsung ke frontend
        // Backend API mengembalikan struktur: { success, debug, password_hash, user }

        // Jika response OK, forward langsung ke frontend
        if (response.ok) {
            // Simpan data user login jika ada user data (untuk tracking)
            if (data.success && data.user) {
                saveUserLogin(data.user, req);
            }
            // Forward response dari backend API langsung (termasuk debug, password_hash, user)
            return res.json(data);
        } else {
            // Response tidak OK
            console.error(`❌ [USER API] Backend API returned error`);
            return res.status(response.status || 404).json({
                success: false,
                message: data.message || data.error || 'User not found',
                error: data.message || data.error || 'User not found',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error(`\n❌ [USER API] ==========================================`);
        console.error(`❌ [USER API] ERROR fetching user from backend API`);
        console.error(`❌ [USER API] NIK: ${nik}`);
        console.error(`❌ [USER API] Error type: ${error.constructor.name}`);
        console.error(`❌ [USER API] Error message: ${error.message}`);
        console.error(`❌ [USER API] Error stack:`, error.stack);
        console.error(`❌ [USER API] Timestamp: ${new Date().toISOString()}`);
        console.error(`❌ [USER API] ==========================================\n`);

        // Handle specific error types
        let errorMessage = 'Error connecting to backend API';
        let statusCode = 500;

        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            errorMessage = 'Request timeout - Backend API tidak merespon dalam 10 detik';
            statusCode = 504;
        } else if (error.message.includes('Failed to fetch') || error.message.includes('ECONNREFUSED')) {
            errorMessage = `Tidak dapat terhubung ke backend API. Pastikan ${BACKEND_API_URL} berjalan.`;
            statusCode = 503;
        } else if (error.message.includes('Invalid JSON')) {
            errorMessage = 'Backend API mengembalikan response yang tidak valid';
            statusCode = 502;
        }

        return res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Query data dari MySQL berdasarkan rfid_user
 * GET /login?rfid_user=
 */
app.get('/login', async (req, res) => {
    const { rfid_user, nik, password } = req.query;

    // Jika ada rfid_user, query ke MySQL
    if (rfid_user) {
        try {
            const connection = await mysql.createConnection({
                host: MYSQL_CONFIG.host,
                user: MYSQL_CONFIG.user,
                password: MYSQL_CONFIG.password,
                database: MYSQL_CONFIG.database,
                connectTimeout: MYSQL_CONFIG.connectTimeout
            });

            // Query untuk cek user berdasarkan rfid_user
            // Asumsi ada table user dengan kolom rfid_user
            const [rows] = await connection.execute(
                `SELECT * FROM user WHERE rfid_user = ? LIMIT 1`,
                [rfid_user]
            );

            await connection.end();

            if (rows.length > 0) {
                // Simpan data user login untuk tracking
                saveUserLogin(rows[0], req);
                return res.json({
                    success: true,
                    data: rows[0],
                    message: 'User found',
                    timestamp: new Date().toISOString()
                });
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('MySQL Error [login]:', error);
            return res.status(500).json({
                success: false,
                message: 'Database error',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Fallback ke login dengan NIK dan password (existing logic)
    if (!nik) {
        return res.status(400).json({
            success: false,
            message: 'NIK atau rfid_user harus diisi'
        });
    }

    try {
        const apiUrl = `${BACKEND_API_URL}/login?nik=${encodeURIComponent(nik)}${password ? `&password=${encodeURIComponent(password)}` : ''}`;

        // Siapkan headers dengan API Key jika backend adalah MJL
        const headers = {
            'Content-Type': 'application/json',
        };

        // Tambahkan API Key header jika backend IP adalah MJL (10.5.0.106)
        // API Key sudah ditambahkan di headers dasar untuk semua environment
        headers[API_KEY_HEADER] = API_KEY;

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: headers
        });

        const data = await response.json();

        if (data.success) {
            // Simpan data user login untuk tracking
            if (data.user) {
                saveUserLogin(data.user, req);
            }
            return res.json({
                debug: true,
                success: true,
                user: {
                    bagian: data.user?.bagian,
                    nama: data.user?.nama,
                    nik: data.user?.nik,
                    password: data.user?.password
                }
            });
        } else {
            return res.status(response.status || 401).json({
                message: data.message || 'NIK tidak ditemukan',
                success: false
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error connecting to backend API',
            error: error.message
        });
    }
});

/**
 * POST /garment/update - Update data garment
 * Body: { rfid_garment, wo, style, buyer, item, color, size }
 * Endpoint ini juga digunakan untuk GET data garment berdasarkan RFID (hanya dengan rfid_garment di body)
 * HARUS didefinisikan SEBELUM route /garment agar tidak tertimpa
 */
app.post('/garment/update', async (req, res) => {
    // Log removed for successful requests
    return await proxyRequest('/garment/update', req, res);
});

/**
 * Query data garment - Proxy ke Backend API
 * GET /garment - Menampilkan semua data tabel garment
 * GET /garment?isDone= - Menampilkan semua data garment yang isDone kosong
 * GET /garment?isDone=Done - Menampilkan semua data garment yang isDone = done
 * GET /garment?rfid_garment= - Filter data garment by rfid_garment
 */
app.get('/garment', async (req, res) => {
    return await proxyRequest('/garment', req, res);
});

/**
 * Insert data garment ke MySQL
 * POST /garment
 * Body: { rfid_garment, item, buyer, style, wo, color, size }
 */
app.post('/garment', async (req, res) => {
    const { rfid_garment, item, buyer, style, wo, color, size } = req.body;

    // Validasi required fields
    if (!rfid_garment) {
        return res.status(400).json({
            success: false,
            message: 'rfid_garment is required',
            timestamp: new Date().toISOString()
        });
    }

    // Normalize rfid_garment (trim dan convert to string)
    const normalizedRfid = String(rfid_garment).trim();

    let connection;
    try {
        connection = await mysql.createConnection({
            host: MYSQL_CONFIG.host,
            user: MYSQL_CONFIG.user,
            password: MYSQL_CONFIG.password,
            database: MYSQL_CONFIG.database,
            connectTimeout: MYSQL_CONFIG.connectTimeout
        });

        // Mulai transaction untuk memastikan atomicity
        await connection.beginTransaction();

        // Cek duplikasi RFID sebelum insert - CEK SEMUA DATA rfid_garment di database
        // Log removed for successful requests

        // Debug: Tampilkan semua rfid_garment yang ada di database (untuk verifikasi)
        try {
            const [allRfids] = await connection.execute(
                `SELECT DISTINCT rfid_garment FROM ${MYSQL_CONFIG.table} ORDER BY rfid_garment LIMIT 20`
            );
            const rfidList = allRfids.map(r => String(r.rfid_garment).trim());
            // Log removed for successful requests
            // Log removed for successful requests
        } catch (err) {
            console.error(`   ⚠️  Could not fetch existing RFIDs:`, err.message);
        }

        // Query untuk cek duplikasi - gunakan beberapa metode untuk memastikan
        let duplicateFound = false;
        let existingData = null;

        // Method 1: Direct comparison (paling umum)
        try {
            const [rows1] = await connection.execute(
                `SELECT rfid_garment, id_garment 
                 FROM ${MYSQL_CONFIG.table} 
                 WHERE rfid_garment = ? 
                 LIMIT 1`,
                [normalizedRfid]
            );

            if (rows1 && rows1.length > 0) {
                duplicateFound = true;
                existingData = rows1[0];
                console.error(`   ❌ Method 1 (direct): FOUND DUPLICATE!`);
                console.error(`      Existing ID: ${rows1[0].id_garment}, RFID: "${rows1[0].rfid_garment}"`);
            }
        } catch (err) {
            console.error(`   ❌ Method 1 error:`, err.message);
        }

        // Method 2: String comparison (untuk handle INT/VARCHAR conversion)
        if (!duplicateFound) {
            try {
                const [rows2] = await connection.execute(
                    `SELECT rfid_garment, id_garment 
                     FROM ${MYSQL_CONFIG.table} 
                     WHERE CAST(rfid_garment AS CHAR) = ? 
                     LIMIT 1`,
                    [normalizedRfid]
                );

                if (rows2 && rows2.length > 0) {
                    duplicateFound = true;
                    existingData = rows2[0];
                    console.error(`   ❌ Method 2 (CAST): FOUND DUPLICATE!`);
                    console.error(`      Existing ID: ${rows2[0].id_garment}, RFID: "${rows2[0].rfid_garment}"`);
                }
            } catch (err) {
                console.error(`   ❌ Method 2 error:`, err.message);
            }
        }

        // Method 3: Trim comparison (untuk handle whitespace)
        if (!duplicateFound) {
            try {
                const [rows3] = await connection.execute(
                    `SELECT rfid_garment, id_garment 
                     FROM ${MYSQL_CONFIG.table} 
                     WHERE TRIM(CAST(rfid_garment AS CHAR)) = ? 
                     LIMIT 1`,
                    [normalizedRfid]
                );

                if (rows3 && rows3.length > 0) {
                    duplicateFound = true;
                    existingData = rows3[0];
                    console.error(`   ❌ Method 3 (TRIM): FOUND DUPLICATE!`);
                    console.error(`      Existing ID: ${rows3[0].id_garment}, RFID: "${rows3[0].rfid_garment}"`);
                }
            } catch (err) {
                console.error(`   ❌ Method 3 error:`, err.message);
            }
        }

        // Jika ditemukan duplikasi, BLOCK INSERT
        if (duplicateFound && existingData) {
            await connection.rollback();
            await connection.end();
            console.error(`\n   ❌❌❌ BLOCKING INSERT - RFID "${normalizedRfid}" ALREADY EXISTS ❌❌❌`);
            console.error(`   Existing record ID: ${existingData.id_garment}\n`);

            return res.status(409).json({
                success: false,
                message: 'RFID sudah ada di database (Duplikasi)',
                error: 'Duplicate entry',
                isDuplicate: true,
                data: {
                    rfid_garment: normalizedRfid,
                    existing: true,
                    existingId: existingData.id_garment
                },
                timestamp: new Date().toISOString()
            });
        }

        // No duplicate found - OK to insert (log removed)

        // Insert data langsung ke MySQL database
        // Log removed for successful requests

        const [result] = await connection.execute(
            `INSERT INTO ${MYSQL_CONFIG.table} (rfid_garment, item, buyer, style, wo, color, size) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                normalizedRfid,
                item || null,
                buyer || null,
                style || null,
                wo || null,
                color || null,
                size || null
            ]
        );

        // Commit transaction
        await connection.commit();
        await connection.end();

        // Data inserted successfully (log removed)

        return res.status(201).json({
            success: true,
            message: 'Data berhasil disimpan',
            data: {
                rfid_garment: normalizedRfid,
                item,
                buyer,
                style,
                wo,
                color,
                size,
                insertId: result.insertId
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('MySQL Error [garment POST]:', error);

        // Rollback transaction jika masih ada
        try {
            if (connection && !connection._fatalError) {
                await connection.rollback();
                await connection.end();
            }
        } catch (rollbackError) {
            console.error('Error during rollback:', rollbackError);
        }

        // Handle duplicate entry error (fallback jika pengecekan sebelumnya gagal)
        if (error.code === 'ER_DUP_ENTRY' || error.code === 1062) {
            return res.status(409).json({
                success: false,
                message: 'RFID sudah ada di database (Duplikasi)',
                error: error.message,
                isDuplicate: true,
                timestamp: new Date().toISOString()
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Database error',
            error: error.message,
            code: error.code,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Get tracking data by line - Proxy ke Backend API
 * GET /tracking/line - Menampilkan semua data pada tracking movement
 * GET /tracking/line?line=1 - Menampilkan data sum pada tracking movement filter per line
 */
app.get('/tracking/line', async (req, res) => {
    return await proxyRequest('/tracking/line', req, res);
});

// Endpoint tracking/line yang lama dihapus karena sudah diganti dengan proxyRequest di atas
/*
app.get('/tracking/line', async (req, res) => {
    const { line } = req.query;

    if (!line) {
        return res.status(400).json({
            success: false,
            message: 'line parameter is required',
            timestamp: new Date().toISOString()
        });
    }

    try {
        // Panggil backend API menggunakan local IP
        const backendUrl = `${BACKEND_API_URL}/tracking/line?line=${encodeURIComponent(line)}`;
        // Log removed for successful requests
        
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 detik timeout
        
        // Siapkan headers dengan API Key jika backend adalah MJL
        const headers = {
            'Content-Type': 'application/json',
        };
        
        // Tambahkan API Key header jika backend IP adalah MJL (10.5.0.106)
        // API Key sudah ditambahkan di headers dasar untuk semua environment
        headers[API_KEY_HEADER] = API_KEY;
        
        const response = await fetch(backendUrl, {
            method: 'GET',
            headers: headers,
            signal: controller.signal
        }).catch((fetchError) => {
            clearTimeout(timeoutId);
            console.error(`❌ [TRACKING LINE API] Fetch error:`, fetchError);
            throw fetchError;
        });
        
        clearTimeout(timeoutId);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        // Log removed for successful requests

        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            console.error(`❌ [TRACKING LINE API] JSON parse error:`, parseError);
            const textData = await response.text();
            console.error(`❌ [TRACKING LINE API] Response text:`, textData);
            throw new Error('Invalid JSON response from backend API');
        }
        
        // Log removed for successful requests

        if (response.ok && data.success) {
            // Log removed for successful requests
            return res.json(data);
        } else {
            console.error(`❌ [TRACKING LINE API] Tracking data not found for line ${line}`);
            return res.status(response.status || 404).json({
                success: false,
                message: data.message || 'Tracking data not found',
                error: data.error,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error(`\n❌ [TRACKING LINE API] ==========================================`);
        console.error(`❌ [TRACKING LINE API] ERROR fetching tracking data`);
        console.error(`❌ [TRACKING LINE API] Line: ${line}`);
        console.error(`❌ [TRACKING LINE API] Error type: ${error.constructor.name}`);
        console.error(`❌ [TRACKING LINE API] Error message: ${error.message}`);
        console.error(`❌ [TRACKING LINE API] ==========================================\n`);
        
        let errorMessage = 'Error connecting to backend API';
        let statusCode = 500;
        
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            errorMessage = 'Request timeout - Backend API tidak merespon dalam 10 detik';
            statusCode = 504;
        } else if (error.message.includes('Failed to fetch') || error.message.includes('ECONNREFUSED')) {
            errorMessage = `Tidak dapat terhubung ke backend API. Pastikan ${BACKEND_API_URL} berjalan.`;
            statusCode = 503;
        } else if (error.message.includes('Invalid JSON')) {
            errorMessage = 'Backend API mengembalikan response yang tidak valid';
            statusCode = 502;
        }
        
        return res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Proxy untuk WO/Production Branch API - Proxy ke Backend API
 * GET /wo/production_branch - Menampilkan all data production branch
 * GET /wo/production_branch?production_branch=CJL - Menampilkan semua data berdasarkan production branch
 * GET /wo/production_branch?production_branch=CJL&line=L1 - Menampilkan semua data berdasarkan production branch dan line
 * GET /wo/production_branch?production_branch=cjl&line=L1&start_date_from=2025-11-1&start_date_to=2025-11-28 - Menampilkan semua data berdasarkan production branch, line, dan rentang Waktu
 */
app.get('/wo/production_branch', async (req, res) => {
    return await proxyRequest('/wo/production_branch', req, res);
});

/**
 * Proxy untuk WO/Branch API - Proxy ke Backend API
 * GET /wo/branch?branch=cjl&line=L1 - Menampilkan semua data berdasarkan branch dan line
 * GET /wo/branch?branch=cjl&line=L1&start_date_from=2025-12-3 - Menampilkan semua data berdasarkan branch, line, dan tanggal mulai
 * GET /wo/branch?branch=cjl&line=L1&start_date_from=2025-12-3&start_date_to=2025-12-10 - Menampilkan semua data berdasarkan branch, line, dan rentang tanggal
 */
app.get('/wo/branch', async (req, res) => {
    return await proxyRequest('/wo/branch', req, res);
});

/**
 * Proxy untuk Production Schedule API - get-wo-breakdown
 * GET /api/prod-sch/get-wo-breakdown?branch=CJL&start_date_from=2025-12-01
 * Proxy ke 10.8.18.60:7186 dengan header GCC-API-KEY
 * Note: Parameter Line dihilangkan agar mendapatkan semua WO dari setiap line
 */
app.get('/api/prod-sch/get-wo-breakdown', async (req, res) => {
    try {
        const { branch, start_date_from, start_date_to } = req.query;

        // Build query string (tanpa parameter line)
        const queryParams = new URLSearchParams();
        if (branch) queryParams.append('branch', branch);
        if (start_date_from) queryParams.append('start_date_from', start_date_from);
        if (start_date_to) queryParams.append('start_date_to', start_date_to);

        const queryString = queryParams.toString();
        const url = `http://10.8.18.60:7186/api/prod-sch/get-wo-breakdown${queryString ? `?${queryString}` : ''}`;



        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 detik timeout

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'GCC-API-KEY': '332100185',
            },
            signal: controller.signal
        }).catch((fetchError) => {
            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;
            console.error(`\n❌ [PROD-SCH API] ==========================================`);
            console.error(`❌ [PROD-SCH API] ❌ API TIDAK DAPAT DIAKSES ❌`);
            console.error(`❌ [PROD-SCH API] URL: ${url}`);
            console.error(`❌ [PROD-SCH API] Error: ${fetchError.message}`);
            console.error(`❌ [PROD-SCH API] Duration: ${duration}ms`);
            console.error(`❌ [PROD-SCH API] ==========================================\n`);
            throw fetchError;
        });

        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        let data;
        try {
            const textData = await response.text();
            if (textData) {
                data = JSON.parse(textData);
            }
        } catch (parseError) {
            console.error(`\n❌ [PROD-SCH API] ==========================================`);
            console.error(`❌ [PROD-SCH API] ❌ ERROR PARSING RESPONSE ❌`);
            console.error(`❌ [PROD-SCH API] URL: ${url}`);
            console.error(`❌ [PROD-SCH API] Status: ${response.status} ${response.statusText}`);
            console.error(`❌ [PROD-SCH API] Parse Error: ${parseError.message}`);
            console.error(`❌ [PROD-SCH API] Duration: ${duration}ms`);
            console.error(`❌ [PROD-SCH API] ==========================================\n`);
            throw new Error('Invalid JSON response from Production Schedule API');
        }

        // Log hasil request
        if (response.ok) {
            const dataCount = data?.data ? (Array.isArray(data.data) ? data.data.length : 1) : 0;

        } else {
            console.error(`\n❌ [PROD-SCH API] ==========================================`);
            console.error(`❌ [PROD-SCH API] ❌ API MENGEMBALIKAN ERROR ❌`);
            console.error(`❌ [PROD-SCH API] URL: ${url}`);
            console.error(`❌ [PROD-SCH API] Status: ${response.status} ${response.statusText}`);
            console.error(`❌ [PROD-SCH API] Response:`, JSON.stringify(data, null, 2));
            console.error(`❌ [PROD-SCH API] Duration: ${duration}ms`);
            console.error(`❌ [PROD-SCH API] ==========================================\n`);
        }

        // Forward response dengan status code yang sama
        res.status(response.status).json(data);
    } catch (error) {
        console.error(`\n❌ [PROD-SCH API] ==========================================`);
        console.error(`❌ [PROD-SCH API] ❌ ERROR CONNECTING TO API ❌`);
        console.error(`❌ [PROD-SCH API] Error: ${error.message}`);
        console.error(`❌ [PROD-SCH API] Stack:`, error.stack);
        console.error(`❌ [PROD-SCH API] ==========================================\n`);
        let errorMessage = 'Error connecting to Production Schedule API';
        let statusCode = 500;

        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            errorMessage = 'Request timeout - Production Schedule API tidak merespon dalam 30 detik';
            statusCode = 504;
        } else if (error.message.includes('Failed to fetch') || error.message.includes('ECONNREFUSED')) {
            errorMessage = 'Tidak dapat terhubung ke Production Schedule API (10.8.18.60:7186)';
            statusCode = 503;
        } else if (error.message.includes('Invalid JSON')) {
            errorMessage = 'Production Schedule API mengembalikan response yang tidak valid';
            statusCode = 502;
        }

        return res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint wo/production_branch yang lama dihapus karena sudah diganti dengan proxyRequest di atas
/*
app.get('/wo/production_branch', async (req, res) => {
    // Log removed for successful requests
    
    const { production_branch, line } = req.query;

    if (!production_branch || !line) {
        return res.status(400).json({
            success: false,
            message: 'production_branch and line parameters are required',
            timestamp: new Date().toISOString()
        });
    }

    try {
        // Panggil backend API menggunakan local IP
        const backendUrl = `${BACKEND_API_URL}/wo/production_branch?production_branch=${encodeURIComponent(production_branch)}&line=${encodeURIComponent(line)}`;
        // Log removed for successful requests
        
        const startTime = Date.now();
        const controller = new AbortController();
        // Tingkatkan timeout menjadi 30 detik karena API mungkin membutuhkan waktu lebih lama
        const timeoutId = setTimeout(() => {
            console.warn(`⏰ [WO PRODUCTION BRANCH API] Request timeout setelah 30 detik`);
            controller.abort();
        }, 30000); // 30 detik timeout
        
        // Siapkan headers dengan API Key jika backend adalah MJL
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
        
        // Tambahkan API Key header jika backend IP adalah MJL (10.5.0.106)
        // API Key sudah ditambahkan di headers dasar untuk semua environment
        headers[API_KEY_HEADER] = API_KEY;
        
        let response;
        try {
            response = await fetch(backendUrl, {
                method: 'GET',
                headers: headers,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
        } catch (fetchError) {
            clearTimeout(timeoutId);
            console.error(`❌ [WO PRODUCTION BRANCH API] Fetch error:`, fetchError);
            console.error(`❌ [WO PRODUCTION BRANCH API] Error name:`, fetchError.name);
            console.error(`❌ [WO PRODUCTION BRANCH API] Error message:`, fetchError.message);
            
            // Jika timeout, berikan pesan yang lebih jelas
            if (fetchError.name === 'AbortError' || fetchError.message.includes('aborted')) {
                throw new Error(`Request timeout - Backend API tidak merespon dalam 30 detik. Pastikan ${BACKEND_API_URL} berjalan dan dapat diakses.`);
            }
            throw fetchError;
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Cek apakah response OK
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unable to read error response');
            console.error(`❌ [WO PRODUCTION BRANCH API] Response tidak OK:`, errorText);
            throw new Error(`Backend API returned ${response.status}: ${response.statusText}`);
        }

        let data;
        try {
            const responseText = await response.text();
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error(`❌ [WO PRODUCTION BRANCH API] JSON parse error:`, parseError);
            console.error(`❌ [WO PRODUCTION BRANCH API] Parse error message:`, parseError.message);
            throw new Error('Invalid JSON response from backend API');
        }

        // Log removed for successful requests

        if (response.ok && data.success) {
            return res.json(data);
        } else {
            console.error(`❌ [WO PRODUCTION BRANCH API] Response tidak sukses atau data tidak ditemukan`);
            return res.status(response.status || 404).json({
                success: false,
                message: data.message || data.error || 'WO data not found',
                error: data.error,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error(`\n❌ [WO PRODUCTION BRANCH API] ==========================================`);
        console.error(`❌ [WO PRODUCTION BRANCH API] ERROR fetching WO data`);
        console.error(`❌ [WO PRODUCTION BRANCH API] Production Branch: ${production_branch}`);
        console.error(`❌ [WO PRODUCTION BRANCH API] Line: ${line}`);
        console.error(`❌ [WO PRODUCTION BRANCH API] Error type: ${error.constructor.name}`);
        console.error(`❌ [WO PRODUCTION BRANCH API] Error message: ${error.message}`);
        console.error(`❌ [WO PRODUCTION BRANCH API] ==========================================\n`);
        
        let errorMessage = 'Error connecting to backend API';
        let statusCode = 500;
        
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            errorMessage = 'Request timeout - Backend API tidak merespon dalam 10 detik';
            statusCode = 504;
        } else if (error.message.includes('Failed to fetch') || error.message.includes('ECONNREFUSED')) {
            errorMessage = `Tidak dapat terhubung ke backend API. Pastikan ${BACKEND_API_URL} berjalan.`;
            statusCode = 503;
        } else if (error.message.includes('Invalid JSON')) {
            errorMessage = 'Backend API mengembalikan response yang tidak valid';
            statusCode = 502;
        }
        
        return res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /tracking?rfid_garment= - Proxy ke backend API (garment_detail + tracking_history)
 */
app.get('/tracking', async (req, res) => {
    return await proxyRequest('/tracking', req, res);
});

// ============================================
// API ENDPOINTS BARU - PROXY KE BACKEND API
// ============================================

// Endpoint /user sudah ada di atas, tidak perlu duplikasi
// Endpoint /user mendukung:
// - GET /user?nik= - Get data user by nik (sudah ada)
// - GET /user?rfid_user= - Get data user by rfid_user (akan di-handle oleh endpoint yang sudah ada dengan modifikasi)

// Endpoint /garment, /wo/production_branch, dan /tracking/line sudah didefinisikan di atas
// Tidak perlu duplikasi

/**
 * GET /tracking/join - Menampilkan semua data inner join table tracking_movement dan tracking_movement_end
 * GET /tracking/join?line=1 - Menampilkan data sum inner join berdasarkan line
 */
app.get('/tracking/join', async (req, res) => {
    return await proxyRequest('/tracking/join', req, res);
});

/**
 * GET /tracking/rfid_garment - Menampilkan all data pada tracking berdasarkan rfid_garment
 * GET /tracking/rfid_garment?rfid_garment=0003841573 - Menampilkan filter data tracking by rfid_garment
 */
app.get('/tracking/rfid_garment', async (req, res) => {
    return await proxyRequest('/tracking/rfid_garment', req, res);
});

/**
 * GET /tracking/check?rfid_garment=0003221040 - Cek data garment berdasarkan RFID
 */
app.get('/tracking/check', async (req, res) => {
    return await proxyRequest('/tracking/check', req, res);
});

/**
 * GET /monitoring/line?line=1 - Dashboard
 */
app.get('/monitoring/line', async (req, res) => {
    return await proxyRequest('/monitoring/line', req, res);
});

/**
 * GET /wira?line=1 - WIRA data untuk Dashboard RFID
 */
app.get('/wira', async (req, res) => {

    try {
        const result = await proxyRequest('/wira', req, res);
        return result;
    } catch (error) {
        console.error(`❌ [WIRA] Error:`, error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching WIRA data',
            error: error.message,
            backend: `${BACKEND_IP}:${BACKEND_PORT}`,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /wira/detail?line=1&wo=185759&tipe=qc&kategori=wira - Detail WIRA/REWORK data
 */
app.get('/wira/detail', async (req, res) => {
    return await proxyRequest('/wira/detail', req, res);
});

/**
 * GET /report/wira?line=1&wo=185759&tanggalfrom=2025-11-27&tanggalto=2025-11-28 - Report wira
 */
app.get('/report/wira', async (req, res) => {
    return await proxyRequest('/report/wira', req, res);
});

/**
 * POST /inputRFID - Input RFID garment ke database
 * Body: { rfid_garment, wo, style, buyer, item, color, size }
 */
app.post('/inputRFID', async (req, res) => {
    // Log removed for successful requests
    return await proxyRequest('/inputRFID', req, res);
});

/**
 * POST /inputUser - Input user baru ke database
 * Body: { rfid_user, password, nama, nik, bagian, line, telegram, no_hp }
 */
app.post('/inputUser', async (req, res) => {
    // Log removed for successful requests
    return await proxyRequest('/inputUser', req, res);
});

/**
 * POST /scrap - Set RFID garment ke status SCRAP
 * Body: { rfid_garment }
 */
app.post('/scrap', async (req, res) => {
    // Log removed for successful requests
    return await proxyRequest('/scrap', req, res);
});

// ============================================
// FINISHING API ENDPOINTS
// ============================================

/**
 * POST /garment/dryroom/in - Check in RFID garment ke area Dryroom
 * Query: ?rfid_garment=xxx
 */
app.post('/garment/dryroom/in', async (req, res) => {
    // Log removed for successful requests
    // Log removed for successful requests
    return await proxyRequest('/garment/dryroom/in', req, res);
});

/**
 * POST /garment/dryroom/out - Check out RFID garment dari area Dryroom
 * Query: ?rfid_garment=xxx
 */
app.post('/garment/dryroom/out', async (req, res) => {
    // Log removed for successful requests
    return await proxyRequest('/garment/dryroom/out', req, res);
});

/**
 * POST /garment/folding/in - Check in RFID garment ke area Folding
 * Query: ?rfid_garment=xxx
 */
app.post('/garment/folding/in', async (req, res) => {
    // Log removed for successful requests
    return await proxyRequest('/garment/folding/in', req, res);
});

/**
 * POST /garment/folding/out - Check out RFID garment dari area Folding
 * Query: ?rfid_garment=xxx
 * Body: { nik: "xxx", table: "xxx" } (optional)
 */
app.post('/garment/folding/out', async (req, res) => {
    try {
        const { nik, table } = req.body || {};
        const rfid_garment = req.query.rfid_garment;

        // Log untuk debugging - khusus untuk MJL2
        if (CURRENT_ENV === 'MJL2') {
            console.log(`🔍 [FOLDING CHECKOUT MJL2] Request received:`, {
                nik,
                table,
                rfid_garment,
                activeSessionsCount: activeSessions.size,
                activeSessionsKeys: Array.from(activeSessions.keys())
            });
        }

        // Extract table number dan NIK dari body atau dari active session
        let tableNumber = table;
        let finalNik = nik;

        // Jika NIK tidak tersedia tapi table number ada, cari NIK dari active sessions berdasarkan table number
        if (!finalNik || finalNik.trim() === '' || finalNik === '00000000') {
            if (tableNumber) {
                const sessionKey = `${CURRENT_ENV}_${tableNumber.toString()}`;
                const activeUser = activeSessions.get(sessionKey);
                if (activeUser && activeUser.nik) {
                    finalNik = activeUser.nik;
                    console.log(`✅ [FOLDING CHECKOUT] NIK ditemukan dari active sessions untuk table ${tableNumber}: ${finalNik}`);
                } else {
                    // Coba cari dengan matching yang lebih fleksibel
                    for (const [key, user] of activeSessions.entries()) {
                        if (!key.startsWith(`${CURRENT_ENV}_`)) continue;
                        const lineNum = key.replace(`${CURRENT_ENV}_`, '');
                        if (lineNum === tableNumber.toString() ||
                            lineNum === tableNumber ||
                            parseInt(lineNum) === parseInt(tableNumber) ||
                            user.line === tableNumber.toString() ||
                            user.line === tableNumber) {
                            if (user.nik) {
                                finalNik = user.nik;
                                console.log(`✅ [FOLDING CHECKOUT] NIK ditemukan dari active sessions (flexible match) untuk table ${tableNumber}: ${finalNik}`);
                                break;
                            }
                        }
                    }
                }
            }
        }

        // Jika table number tidak tersedia tapi NIK ada, cari table number dari active sessions berdasarkan NIK
        if (!tableNumber && finalNik) {
            // Cari table number dari active sessions berdasarkan NIK
            // Hanya cari di environment yang sesuai (format key: {ENV}_{lineNumber})
            for (const [sessionKey, user] of activeSessions.entries()) {
                // Hanya proses jika key dimulai dengan CURRENT_ENV
                if (sessionKey.startsWith(`${CURRENT_ENV}_`) && user.nik === finalNik) {
                    // Extract line number dari key (format: {ENV}_{lineNumber})
                    const lineNum = sessionKey.replace(`${CURRENT_ENV}_`, '');
                    tableNumber = lineNum;
                    if (CURRENT_ENV === 'MJL2') {
                        console.log(`✅ [FOLDING CHECKOUT MJL2] Found table number ${tableNumber} for NIK ${finalNik}`);
                    }
                    break;
                }
            }

            if (!tableNumber && CURRENT_ENV === 'MJL2') {
                console.warn(`⚠️ [FOLDING CHECKOUT MJL2] Table number not found for NIK ${finalNik}`);
                console.warn(`⚠️ [FOLDING CHECKOUT MJL2] Available active sessions for ${CURRENT_ENV}:`,
                    Array.from(activeSessions.entries())
                        .filter(([key]) => key.startsWith(`${CURRENT_ENV}_`))
                        .map(([key, user]) => ({ key, line: key.replace(`${CURRENT_ENV}_`, ''), nik: user.nik, name: user.name }))
                );
            }
        }

        // Track user yang sedang scan (untuk mode all-users - realtime display)
        if (tableNumber && finalNik) {
            // Cari user info dari active sessions atau request body
            // Hanya cari di environment yang sesuai
            let userInfo = null;
            const sessionKey = `${CURRENT_ENV}_${tableNumber.toString()}`;

            for (const [key, user] of activeSessions.entries()) {
                // Hanya proses jika key dimulai dengan CURRENT_ENV dan NIK cocok
                if (key.startsWith(`${CURRENT_ENV}_`) && user.nik === finalNik) {
                    userInfo = user;
                    break;
                }
            }

            // Jika user info ditemukan, simpan ke scanningUsers untuk realtime tracking
            if (userInfo) {
                scanningUsers.set(tableNumber.toString(), {
                    nik: userInfo.nik,
                    name: userInfo.name,
                    line: tableNumber.toString(),
                    scanStartTime: new Date().toISOString()
                });
            } else {
                // Jika tidak ada di active sessions, coba ambil dari active sessions berdasarkan table
                const activeUser = activeSessions.get(sessionKey);
                if (activeUser) {
                    scanningUsers.set(tableNumber.toString(), {
                        nik: activeUser.nik,
                        name: activeUser.name,
                        line: tableNumber.toString(),
                        scanStartTime: new Date().toISOString()
                    });
                }
            }
        }

        // Update request body dengan NIK yang sudah diperbaiki (jika ada)
        const requestBody = { ...req.body };
        if (finalNik && finalNik.trim() !== '' && finalNik !== '00000000') {
            requestBody.nik = finalNik;
        }
        if (tableNumber) {
            requestBody.table = tableNumber.toString();
        }

        // Proxy request ke backend API dan tangkap response
        const response = await fetch(`${BACKEND_API_URL}/garment/folding/out?rfid_garment=${encodeURIComponent(rfid_garment || '')}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                [API_KEY_HEADER]: API_KEY
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        // Jika checkout berhasil, simpan data dan log
        // Cek apakah response berhasil (status 200 atau 201, dan message mengandung "Success")
        const isSuccess = (response.status === 200 || response.status === 201) &&
            (data?.success || (data?.message && data.message.includes('Success')));

        if (isSuccess && finalNik && rfid_garment) {
            if (tableNumber) {
                // Simpan data checkout dengan response data lengkap
                saveFoldingCheckout(tableNumber, rfid_garment, finalNik, data);
            } else {
                console.error(`❌ [FOLDING CHECKOUT] Table number tidak ditemukan untuk NIK: ${finalNik}, RFID: ${rfid_garment}`);
            }
        } else {
            console.error(`❌ [FOLDING CHECKOUT] Checkout tidak berhasil - Status: ${response.status}, Message: ${data?.message}, NIK: ${finalNik}, RFID: ${rfid_garment}`);
            // Jika checkout gagal, hapus dari scanningUsers setelah delay kecil (untuk memberikan waktu UI update)
            if (tableNumber) {
                setTimeout(() => {
                    scanningUsers.delete(tableNumber.toString());
                }, 2000); // Hapus setelah 2 detik
            }
        }

        // Kirim response ke client
        res.status(response.status).json(data);
    } catch (error) {
        console.error('❌ [FOLDING CHECKOUT] Error:', error);
        // Fallback ke proxyRequest jika ada error
        return await proxyRequest('/garment/folding/out', req, res);
    }
});

/**
 * GET /finishing - Get finishing data (dryroom, folding, reject_room statistics)
 */
app.get('/finishing', async (req, res) => {
    // Log removed for successful requests
    // Log removed for successful requests
    return await proxyRequest('/finishing', req, res);
});

// ============================================
// PRODUCTION TRACKING TIME API ENDPOINTS
// ============================================

/**
 * GET /line - Get time line to QC
 * Query: ?tanggalfrom=2026-1-28&tanggalto=2026-1-28
 */
app.get('/line', async (req, res) => {
    const { tanggalfrom, tanggalto } = req.query;
    return await proxyRequest('/line', req, res);
});

/**
 * GET /rework - Get rework duration (output to rework or reject)
 * Query: ?tanggalfrom=2026-1-28&tanggalto=2026-1-28&id_garment=xxx (optional)
 */
app.get('/rework', async (req, res) => {
    const { tanggalfrom, tanggalto, id_garment } = req.query;
    return await proxyRequest('/rework', req, res);
});

/**
 * GET /qc-pqc - Get duration from QC to PQC checking
 * Query: ?tanggalfrom=2026-1-28&tanggalto=2026-1-28&id_garment=xxx (optional)
 */
app.get('/qc-pqc', async (req, res) => {
    const { tanggalfrom, tanggalto, id_garment } = req.query;
    return await proxyRequest('/qc-pqc', req, res);
});

/**
 * GET /pqc-rework - Get duration from output to PQC rework or PQC reject
 * Query: ?tanggalfrom=2026-1-28&tanggalto=2026-1-28&id_garment=xxx (optional)
 */
app.get('/pqc-rework', async (req, res) => {
    const { tanggalfrom, tanggalto, id_garment } = req.query;
    return await proxyRequest('/pqc-rework', req, res);
});

/**
 * GET /pqc-indryroom - Get duration from PQC good to in dryroom
 * Query: ?tanggalfrom=2026-1-28&tanggalto=2026-1-28&id_garment=xxx (optional)
 */
app.get('/pqc-indryroom', async (req, res) => {
    const { tanggalfrom, tanggalto, id_garment } = req.query;
    return await proxyRequest('/pqc-indryroom', req, res);
});

/**
 * GET /indryroom-outdryroom - Get duration from in dryroom to out dryroom
 * Query: ?tanggalfrom=2026-1-28&tanggalto=2026-1-28&id_garment=xxx (optional)
 */
app.get('/indryroom-outdryroom', async (req, res) => {
    const { tanggalfrom, tanggalto, id_garment } = req.query;
    return await proxyRequest('/indryroom-outdryroom', req, res);
});

/**
 * GET /outdryroom-infolding - Get duration from out dryroom to in folding
 * Query: ?tanggalfrom=2026-1-28&tanggalto=2026-1-28&id_garment=xxx (optional)
 */
app.get('/outdryroom-infolding', async (req, res) => {
    const { tanggalfrom, tanggalto, id_garment } = req.query;
    return await proxyRequest('/outdryroom-infolding', req, res);
});

/**
 * GET /infolding-outfolding - Get duration from in folding to out folding
 * Query: ?tanggalfrom=2026-1-28&tanggalto=2026-1-28&id_garment=xxx (optional)
 */
app.get('/infolding-outfolding', async (req, res) => {
    const { tanggalfrom, tanggalto, id_garment } = req.query;
    return await proxyRequest('/infolding-outfolding', req, res);
});

/**
 * GET /last-status - Get last status
 * Query: ?tanggalfrom=2026-1-28&tanggalto=2026-1-28&id_garment=xxx (optional)
 */
app.get('/last-status', async (req, res) => {
    const { tanggalfrom, tanggalto, id_garment } = req.query;
    return await proxyRequest('/last-status', req, res);
});

/**
 * GET /cycletime - Get cycle time data (single query API)
 * Query: ?tanggalfrom=2026-1-28&tanggalto=2026-2-6
 * Menggunakan IP backend sesuai environment (CLN, MJL, MJL2)
 */
app.get('/cycletime', async (req, res) => {
    const { tanggalfrom, tanggalto } = req.query;

    try {
        // Gunakan BACKEND_API_URL sesuai environment
        // CLN: 10.8.0.104:7000
        // MJL: 10.5.0.106:7000
        // MJL2: 10.5.0.99:7000 (atau sesuai konfigurasi)

        // Build query parameters
        const queryParams = new URLSearchParams();
        if (tanggalfrom) queryParams.append('tanggalfrom', tanggalfrom);
        if (tanggalto) queryParams.append('tanggalto', tanggalto);

        const queryString = queryParams.toString();
        const url = `${BACKEND_API_URL}/cycletime${queryString ? `?${queryString}` : ''}`;

        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 detik timeout

        // Siapkan headers dengan API Key
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            [API_KEY_HEADER]: API_KEY
        };

        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
            signal: controller.signal
        }).catch((fetchError) => {
            clearTimeout(timeoutId);
            console.error(`❌ [CYCLE TIME] Failed to fetch from ${url}`);
            console.error(`❌ [CYCLE TIME] Error details:`, fetchError.message);
            throw fetchError;
        });

        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        let data;
        try {
            const textData = await response.text();
            if (textData) {
                data = JSON.parse(textData);
            }
        } catch (parseError) {
            console.error(`❌ [CYCLE TIME] JSON parse error:`, parseError);
            throw new Error('Invalid JSON response from cycle time API');
        }

        // Log untuk tracking time endpoints - hanya untuk error atau warning
        if (data && data.status === 'success' && data.count === 0 && response.ok) {
            console.warn(`⚠️ [CYCLE TIME] ${url} returned empty data`);
        }

        res.status(response.status).json(data);
    } catch (error) {
        console.error(`❌ [CYCLE TIME] Error:`, error);
        let errorMessage = 'Error connecting to cycle time API';
        let statusCode = 500;

        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            errorMessage = 'Request timeout - Cycle time API tidak merespon dalam 30 detik';
            statusCode = 504;
        } else if (error.message.includes('Failed to fetch') || error.message.includes('ECONNREFUSED')) {
            errorMessage = `Tidak dapat terhubung ke cycle time API. Pastikan ${BACKEND_API_URL} berjalan.`;
            statusCode = 503;
        } else if (error.message.includes('Invalid JSON')) {
            errorMessage = 'Cycle time API mengembalikan response yang tidak valid';
            statusCode = 502;
        }

        return res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/active-users - Get active users (yang sedang login)
 * Query: ?line= (optional) - Get user by line/table number
 */
app.get('/api/active-users', (req, res) => {
    const { line } = req.query;

    if (line) {
        // Get user by line/table number
        // Gunakan key dengan environment prefix: {ENV}_{lineNumber}
        const sessionKey = `${CURRENT_ENV}_${line.toString()}`;
        let user = activeSessions.get(sessionKey);

        // Jika tidak ditemukan, coba cari dengan matching yang lebih fleksibel
        // Hanya cari di environment yang sesuai
        if (!user) {
            // Cari di semua active sessions yang line-nya cocok dan environment sama
            for (const [key, sessionUser] of activeSessions.entries()) {
                // Hanya proses jika key dimulai dengan CURRENT_ENV
                if (!key.startsWith(`${CURRENT_ENV}_`)) continue;

                // Extract line number dari key (format: {ENV}_{lineNumber})
                const lineNum = key.replace(`${CURRENT_ENV}_`, '');

                // Match exact atau match dengan konversi number
                if (lineNum === line.toString() ||
                    lineNum === line ||
                    parseInt(lineNum) === parseInt(line) ||
                    sessionUser.line === line.toString() ||
                    sessionUser.line === line) {
                    user = sessionUser;
                    break;
                }
            }
        }

        if (user) {
            return res.json({
                success: true,
                data: user,
                timestamp: new Date().toISOString()
            });
        } else {
            // Log untuk debugging - khusus untuk MJL2
            if (CURRENT_ENV === 'MJL2') {
                console.warn(`⚠️ [ACTIVE USERS] No active user found for line/table ${line} in MJL2`);
                console.warn(`⚠️ [ACTIVE USERS] Available active sessions for ${CURRENT_ENV}:`,
                    Array.from(activeSessions.keys()).filter(key => key.startsWith(`${CURRENT_ENV}_`))
                );
                // Tampilkan detail semua active sessions untuk debugging (hanya environment yang sesuai)
                const allSessions = Array.from(activeSessions.entries())
                    .filter(([key]) => key.startsWith(`${CURRENT_ENV}_`))
                    .map(([key, user]) => ({
                        key,
                        line: key.replace(`${CURRENT_ENV}_`, ''),
                        nik: user.nik,
                        name: user.name,
                        jabatan: user.jabatan,
                        environment: user.environment
                    }));
                console.warn(`⚠️ [ACTIVE USERS] All active sessions details for ${CURRENT_ENV}:`, allSessions);
                console.warn(`⚠️ [ACTIVE USERS] Requested line/table: "${line}" (type: ${typeof line})`);
            }
            return res.json({
                success: false,
                data: null,
                message: `No active user found for line/table ${line}`,
                timestamp: new Date().toISOString()
            });
        }
    } else {
        // Get all active users - HANYA dari environment yang sesuai
        const allUsers = Array.from(activeSessions.entries())
            .filter(([key]) => key.startsWith(`${CURRENT_ENV}_`))
            .map(([key, user]) => {
                // Extract line number dari key (format: {ENV}_{lineNumber})
                const lineNum = key.replace(`${CURRENT_ENV}_`, '');
                return {
                    line: lineNum,
                    ...user
                };
            });
        return res.json({
            success: true,
            data: allUsers,
            count: allUsers.length,
            environment: CURRENT_ENV,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/scanning-users - Get user yang sedang scan di folding table (realtime tracking)
 * Query: ?table={tableNumber} (optional)
 */
app.get('/api/scanning-users', (req, res) => {
    const { table } = req.query;

    if (table) {
        // Get user yang sedang scan untuk table tertentu
        const scanningUser = scanningUsers.get(table.toString());
        if (scanningUser) {
            return res.json({
                success: true,
                data: scanningUser,
                timestamp: new Date().toISOString()
            });
        } else {
            return res.json({
                success: false,
                data: null,
                message: `No scanning user found for table ${table}`,
                timestamp: new Date().toISOString()
            });
        }
    } else {
        // Get all scanning users
        const users = Array.from(scanningUsers.values());
        return res.json({
            success: true,
            data: users,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /card - Get summary data card (done, progress, total_cards, waiting)
 */
app.get('/card', async (req, res) => {
    return await proxyRequest('/card', req, res);
});

/**
 * GET /card/progress - Get data card dengan status progress
 */
app.get('/card/progress', async (req, res) => {
    return await proxyRequest('/card/progress', req, res);
});

/**
 * GET /card/done - Get data card dengan status done
 */
app.get('/card/done', async (req, res) => {
    return await proxyRequest('/card/done', req, res);
});

/**
 * GET /card/waiting - Get data card dengan status waiting
 */
app.get('/card/waiting', async (req, res) => {
    return await proxyRequest('/card/waiting', req, res);
});

/**
 * POST /api/auth/logout - Logout user dan hapus dari active sessions
 * Body: { nik: "xxx" } atau { line: "xxx" }
 */
app.post('/api/auth/logout', (req, res) => {
    const { nik, line } = req.body;

    if (!nik && !line) {
        return res.status(400).json({
            success: false,
            message: 'NIK atau line parameter is required',
            timestamp: new Date().toISOString()
        });
    }

    try {
        // Extract line number dari nama user
        const extractLineNumber = (name) => {
            if (!name) return null;
            const match = name.match(/\d+/);
            return match ? parseInt(match[0]) : null;
        };

        // Jika ada line, hapus langsung dari activeSessions
        // Gunakan key dengan environment prefix
        if (line) {
            const sessionKey = `${CURRENT_ENV}_${line.toString()}`;
            const user = activeSessions.get(sessionKey);
            if (user) {
                const userNik = user.nik;
                activeSessions.delete(sessionKey);
                webSessions.delete(`${CURRENT_ENV}_${userNik}`);
                // Update logout time di file menggunakan NIK
                updateUserLogout(userNik, req);
                return res.json({
                    success: true,
                    message: `User logged out from Line ${line}: ${user.name}`,
                    environment: CURRENT_ENV,
                    timestamp: new Date().toISOString()
                });
            } else {
                return res.json({
                    success: false,
                    message: `No active user found for line ${line} in environment ${CURRENT_ENV}`,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Jika ada NIK, cari di activeSessions dan hapus
        if (nik) {
            webSessions.delete(`${CURRENT_ENV}_${nik}`);
            let found = false;
            // Hanya cari di environment yang sesuai
            for (const [key, user] of activeSessions.entries()) {
                // Hanya proses jika key dimulai dengan CURRENT_ENV dan NIK cocok
                if (key.startsWith(`${CURRENT_ENV}_`) && user.nik === nik) {
                    activeSessions.delete(key);
                    found = true;
                    // Update logout time di file
                    updateUserLogout(nik, req);
                    return res.json({
                        success: true,
                        message: `User logged out: ${user.name}`,
                        line: lineNum,
                        timestamp: new Date().toISOString()
                    });
                }
            }

            if (!found) {
                // Update logout time di file meskipun tidak ada di activeSessions
                updateUserLogout(nik, req);
                return res.json({
                    success: true,
                    message: `Web session cleared for NIK ${nik}`,
                    timestamp: new Date().toISOString()
                });
            }
        }

        return res.status(400).json({
            success: false,
            message: 'Invalid request',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ [LOGOUT] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error processing logout',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/auth/session - Cek apakah session user masih valid (untuk validasi setelah auto-logout)
 * Query: ?nik=xxx
 * Return: { valid: true } atau { valid: false } - jika false, frontend harus clear storage dan redirect ke login
 */
app.get('/api/auth/session', (req, res) => {
    const { nik } = req.query;
    if (!nik || typeof nik !== 'string') {
        return res.status(400).json({ valid: false, message: 'Parameter nik required' });
    }
    const key = `${CURRENT_ENV}_${nik.trim()}`;
    const valid = webSessions.has(key);
    return res.json({ valid: !!valid, timestamp: new Date().toISOString() });
});

/**
 * GET /api/folding/detail - Get detail data folding checkout per table
 * Query: ?date=YYYY-MM-DD&table=1 (optional, default: today, all tables)
 */
app.get('/api/folding/detail', (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const table = req.query.table;

        // Load detail data dari file - dengan struktur per environment
        let detailData = {};
        if (fs.existsSync(FOLDING_CHECKOUT_DETAIL_FILE)) {
            try {
                const fileContent = fs.readFileSync(FOLDING_CHECKOUT_DETAIL_FILE, 'utf-8');
                detailData = JSON.parse(fileContent);
            } catch (e) {
                detailData = {};
            }
        }

        // Ambil data hanya dari environment yang sesuai
        // Struktur baru: { "CLN": { "date": {...} }, "MJL": {...}, "MJL2": {...} }
        // Struktur lama (backward compatibility): { "date": {...} } - hanya untuk CLN
        let envDetailData = {};
        if (detailData[CURRENT_ENV]) {
            envDetailData = detailData[CURRENT_ENV];
        } else if (CURRENT_ENV === 'CLN' && detailData[date]) {
            // Backward compatibility: jika struktur lama dan CLN
            envDetailData = detailData;
        }

        const dateData = envDetailData[date] || {};

        // Jika ada filter table, return data untuk table tersebut saja
        if (table) {
            const tableData = dateData[table] || [];
            return res.json({
                success: true,
                data: tableData,
                date,
                table,
                count: tableData.length,
                timestamp: new Date().toISOString()
            });
        }

        // Jika tidak ada filter, return semua data
        return res.json({
            success: true,
            data: dateData,
            date,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ [FOLDING DETAIL] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching folding detail data',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/folding/hourly - Get folding checkout data per jam dan per table
 * Query: ?date=YYYY-MM-DD (optional, default: today)
 */
app.get('/api/folding/hourly', (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        // Jam pertama: 07:30 (mencakup 07:30-08:59), kemudian 09:00-10:00, 10:00-11:00, dst
        const hours = ['07:30', '09', '10', '11', '12', '13', '14', '15', '16', '17'];

        // Get data dari in-memory atau file
        let dateData = {};
        if (foldingCheckoutData.has(date)) {
            const dateMap = foldingCheckoutData.get(date);
            dateMap.forEach((tableMap, tableNumber) => {
                if (!dateData[tableNumber]) {
                    dateData[tableNumber] = {};
                }
                tableMap.forEach((count, hour) => {
                    dateData[tableNumber][hour] = count;
                });
            });
        } else {
            // Load dari file jika tidak ada di memory - dengan filter environment
            if (fs.existsSync(FOLDING_CHECKOUT_FILE)) {
                try {
                    const fileContent = fs.readFileSync(FOLDING_CHECKOUT_FILE, 'utf-8');
                    const checkoutData = JSON.parse(fileContent);

                    // Ambil data hanya dari environment yang sesuai
                    // Struktur baru: { "CLN": { "date": {...} }, "MJL": {...}, "MJL2": {...} }
                    // Struktur lama (backward compatibility): { "date": {...} } - hanya untuk CLN
                    if (checkoutData[CURRENT_ENV]) {
                        dateData = checkoutData[CURRENT_ENV][date] || {};
                    } else if (CURRENT_ENV === 'CLN' && checkoutData[date]) {
                        // Backward compatibility: jika struktur lama dan CLN
                        dateData = checkoutData[date] || {};
                    } else {
                        dateData = {};
                    }
                } catch (e) {
                    dateData = {};
                }
            }
        }

        // Format response
        const result = hours.map(hour => {
            // Format hour untuk response
            // Jika hour adalah '07:30', gunakan langsung
            // Jika hour adalah '09', '10', dll, format menjadi '09:00', '10:00', dll
            const hourFormatted = hour.includes(':') ? hour : `${hour}:00`;

            // Untuk mencari data, kita perlu handle beberapa kasus:
            // 1. Jika hour adalah '07:30', gabungkan data dari '07:30', '07:30-09:00', '07', dan '08' (backward compatibility)
            // 2. Jika hour adalah '09', cari data dengan key '09'
            let table1Count = 0, table2Count = 0, table3Count = 0, table4Count = 0;
            let table5Count = 0, table6Count = 0, table7Count = 0, table8Count = 0;

            if (hour === '07:30') {
                // Gabungkan data dari slot baru dan slot lama (backward compatibility)
                // Cek semua kemungkinan key: '07:30', '07:30-09:00', '07', '08'
                const keys = ['07:30', '07:30-09:00', '07', '08'];
                keys.forEach(key => {
                    table1Count += dateData['1']?.[key] || 0;
                    table2Count += dateData['2']?.[key] || 0;
                    table3Count += dateData['3']?.[key] || 0;
                    table4Count += dateData['4']?.[key] || 0;
                    table5Count += dateData['5']?.[key] || 0;
                    table6Count += dateData['6']?.[key] || 0;
                    table7Count += dateData['7']?.[key] || 0;
                    table8Count += dateData['8']?.[key] || 0;
                });
            } else {
                // Untuk jam lainnya, gunakan key langsung
                const hourKey = hour;
                table1Count = dateData['1']?.[hourKey] || 0;
                table2Count = dateData['2']?.[hourKey] || 0;
                table3Count = dateData['3']?.[hourKey] || 0;
                table4Count = dateData['4']?.[hourKey] || 0;
                table5Count = dateData['5']?.[hourKey] || 0;
                table6Count = dateData['6']?.[hourKey] || 0;
                table7Count = dateData['7']?.[hourKey] || 0;
                table8Count = dateData['8']?.[hourKey] || 0;
            }

            return {
                hour: hourFormatted,
                table1: table1Count,
                table2: table2Count,
                table3: table3Count,
                table4: table4Count,
                table5: table5Count,
                table6: table6Count,
                table7: table7Count,
                table8: table8Count,
            };
        });

        return res.json({
            success: true,
            data: result,
            date,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ [FOLDING HOURLY] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching hourly folding data',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Load shift data dari file saat server start
 * Auto-migrate data lama ke environment-aware keys untuk semua environment
 */
function loadShiftData() {
    try {
        let shiftData;

        if (!fs.existsSync(SHIFT_DATA_FILE)) {
            // Buat file default jika belum ada
            shiftData = {
                shifts: {},
                lastUpdated: new Date().toISOString(),
                description: "Data shift untuk production lines. 'day' = shift siang, 'night' = shift malam. Key adalah line ID dengan environment prefix untuk line yang shared (CLN_1, MJL_1, MJL2_1, dll)"
            };
            fs.writeFileSync(SHIFT_DATA_FILE, JSON.stringify(shiftData, null, 2), 'utf-8');
        } else {
            const fileContent = fs.readFileSync(SHIFT_DATA_FILE, 'utf-8');
            shiftData = JSON.parse(fileContent);
        }

        if (!shiftData.shifts) {
            shiftData.shifts = {};
        }

        // Auto-migrate: Migrate data lama ke environment-aware keys untuk semua environment
        // Ini akan berjalan setiap kali loadShiftData() dipanggil untuk memastikan data ter-migrate
        let migratedCount = 0;

        // Default shift values untuk setiap environment
        const defaultShifts = {
            CLN: { '0': 'day', '1': 'day', '2': 'day', '3': 'day', '4': 'day', '5': 'day' },
            MJL: { '111': 'day', '1': 'day', '2': 'day', '3': 'day', '4': 'day', '5': 'day', '6': 'day', '7': 'day', '8': 'day', '9': 'day', '10': 'day', '11': 'day', '12': 'day', '13': 'day', '14': 'day', '15': 'day' },
            MJL2: { '112': 'day', '1': 'day', '2': 'day', '3': 'day', '4': 'day', '5': 'day', '6': 'day', '7': 'day', '8': 'day', '9': 'day' }
        };

        // Migrate CLN (line 1-5)
        for (let i = 1; i <= 5; i++) {
            const lineId = i.toString();
            const envKey = `CLN_${lineId}`;

            // Jika belum ada environment-aware key, migrate dari key lama atau default
            if (!shiftData.shifts[envKey]) {
                const oldValue = shiftData.shifts[lineId];
                shiftData.shifts[envKey] = oldValue || defaultShifts.CLN[lineId] || 'day';
                if (oldValue) {
                    migratedCount++;
                }
            }
        }

        // Migrate MJL (line 1-9)
        for (let i = 1; i <= 9; i++) {
            const lineId = i.toString();
            const envKey = `MJL_${lineId}`;

            // Jika belum ada environment-aware key, migrate dari key lama atau default
            if (!shiftData.shifts[envKey]) {
                const oldValue = shiftData.shifts[lineId];
                shiftData.shifts[envKey] = oldValue || defaultShifts.MJL[lineId] || 'day';
                if (oldValue) {
                    migratedCount++;
                }
            }
        }

        // Migrate MJL2 (line 1-9)
        for (let i = 1; i <= 9; i++) {
            const lineId = i.toString();
            const envKey = `MJL2_${lineId}`;

            // Jika belum ada environment-aware key, migrate dari key lama atau default
            if (!shiftData.shifts[envKey]) {
                const oldValue = shiftData.shifts[lineId];
                shiftData.shifts[envKey] = oldValue || defaultShifts.MJL2[lineId] || 'day';
                if (oldValue) {
                    migratedCount++;
                }
            }
        }

        // Migrate All Production Line untuk setiap environment
        if (!shiftData.shifts['0']) {
            shiftData.shifts['0'] = defaultShifts.CLN['0'] || 'day';
        }
        if (!shiftData.shifts['111']) {
            shiftData.shifts['111'] = defaultShifts.MJL['111'] || 'day';
        }
        if (!shiftData.shifts['112']) {
            shiftData.shifts['112'] = defaultShifts.MJL2['112'] || 'day';
        }

        // Migrate MJL line 10-15 (spesifik MJL, tidak shared)
        for (let i = 10; i <= 15; i++) {
            const lineId = i.toString();
            if (!shiftData.shifts[lineId]) {
                shiftData.shifts[lineId] = defaultShifts.MJL[lineId] || 'day';
            }
        }

        // Simpan jika ada perubahan
        if (migratedCount > 0) {
            shiftData.lastUpdated = new Date().toISOString();
            shiftData.description = "Data shift untuk production lines. 'day' = shift siang, 'night' = shift malam. Key adalah line ID dengan environment prefix untuk line yang shared (CLN_1, MJL_1, MJL2_1, dll)";
            fs.writeFileSync(SHIFT_DATA_FILE, JSON.stringify(shiftData, null, 2), 'utf-8');
        }

        return shiftData;
    } catch (error) {
        console.error('❌ [SHIFT DATA] Error loading data:', error.message);
        return { shifts: {}, lastUpdated: new Date().toISOString(), description: '' };
    }
}

/**
 * Save shift data ke file
 */
function saveShiftData(shiftData) {
    try {
        shiftData.lastUpdated = new Date().toISOString();
        fs.writeFileSync(SHIFT_DATA_FILE, JSON.stringify(shiftData, null, 2), 'utf-8');
    } catch (error) {
        console.error('❌ [SHIFT DATA] Error saving data:', error.message);
        throw error; // Re-throw untuk ditangani di endpoint
    }
}

/**
 * GET /api/shift-data - Get shift data untuk semua line berdasarkan environment
 */
app.get('/api/shift-data', (req, res) => {
    try {
        // Deteksi environment dari referer/origin header untuk membedakan port 5174 (MJL2) vs 5173 (MJL)
        const referer = req.headers.referer || req.headers.origin || '';
        const port = referer.match(/:(\d+)/)?.[1];

        // Deteksi environment dari query, port, atau CURRENT_ENV
        const queryEnv = req.query.environment;
        let detectedEnv = CURRENT_ENV;

        // Jika port 5174 terdeteksi, pastikan environment adalah MJL2
        if (port === '5174') {
            detectedEnv = 'MJL2';
        } else if (port === '5173' && CURRENT_ENV === 'MJL') {
            detectedEnv = 'MJL';
        }

        const environment = queryEnv === 'MJL' || queryEnv === 'MJL2' || queryEnv === 'CLN' ? queryEnv : detectedEnv;

        const shiftData = loadShiftData();
        const allShifts = shiftData.shifts || {};

        // Filter data berdasarkan environment
        // CLN: line 0, 1-5
        // MJL: line 111, 1-15
        // MJL2: line 112, 1-9
        const filteredShifts = {};

        // Data default untuk fallback
        const defaultCLN = {
            '0': 'day', '1': 'day', '2': 'day', '3': 'day', '4': 'day', '5': 'day'
        };

        const defaultMJL = {
            '111': 'day', '1': 'day', '2': 'day', '3': 'day', '4': 'day', '5': 'day',
            '6': 'day', '7': 'day', '8': 'day', '9': 'day', '10': 'day',
            '11': 'day', '12': 'day', '13': 'day', '14': 'day', '15': 'day'
        };

        const defaultMJL2 = {
            '112': 'day', '1': 'day', '2': 'day', '3': 'day', '4': 'day', '5': 'day',
            '6': 'day', '7': 'day', '8': 'day', '9': 'day'
        };

        if (environment === 'MJL') {
            // MJL: ambil line 111 dan 1-15
            const defaultData = defaultMJL;
            Object.keys(defaultData).forEach(lineId => {
                const id = parseInt(lineId, 10);
                // Untuk line 1-9 yang shared: gunakan environment-aware key (MJL_1, dll)
                if (id >= 1 && id <= 9) {
                    const envKey = `MJL_${lineId}`;
                    filteredShifts[lineId] = allShifts[envKey] || allShifts[lineId] || defaultData[lineId];
                } else {
                    // Line 111 dan 10-15: gunakan dari JSON jika ada, jika tidak gunakan default
                    filteredShifts[lineId] = allShifts[lineId] || defaultData[lineId];
                }
            });
        } else if (environment === 'MJL2') {
            // MJL2: ambil line 112 dan 1-9
            const defaultData = defaultMJL2;
            Object.keys(defaultData).forEach(lineId => {
                const id = parseInt(lineId, 10);
                // Untuk line 1-9 yang shared: gunakan environment-aware key (MJL2_1, dll)
                if (id >= 1 && id <= 9) {
                    const envKey = `MJL2_${lineId}`;
                    filteredShifts[lineId] = allShifts[envKey] || allShifts[lineId] || defaultData[lineId];
                } else {
                    // Line 112: gunakan dari JSON jika ada, jika tidak gunakan default
                    filteredShifts[lineId] = allShifts[lineId] || defaultData[lineId];
                }
            });
        } else {
            // CLN: ambil line 0 dan 1-5
            const defaultData = defaultCLN;
            Object.keys(defaultData).forEach(lineId => {
                const id = parseInt(lineId, 10);
                // Untuk line 1-5: gunakan environment-aware key (CLN_1, dll)
                if (id >= 1 && id <= 5) {
                    const envKey = `CLN_${lineId}`;
                    filteredShifts[lineId] = allShifts[envKey] || allShifts[lineId] || defaultData[lineId];
                } else {
                    // Line 0: gunakan dari JSON jika ada, jika tidak gunakan default
                    filteredShifts[lineId] = allShifts[lineId] || defaultData[lineId];
                }
            });
        }

        return res.json({
            success: true,
            data: filteredShifts,
            environment: environment,
            lastUpdated: shiftData.lastUpdated,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ [SHIFT DATA] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching shift data',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/shift-data - Update shift data untuk line tertentu
 * Body: { lineId: number, shift: 'day' | 'night', environment?: 'CLN' | 'MJL' | 'MJL2' }
 */
app.post('/api/shift-data', (req, res) => {
    try {
        const { lineId, shift, environment: reqEnv } = req.body;

        if (lineId === undefined || lineId === null) {
            console.error(`❌ [SHIFT DATA] Missing lineId in request`);
            return res.status(400).json({
                success: false,
                message: 'Invalid request. lineId is required',
                received: req.body,
                timestamp: new Date().toISOString()
            });
        }

        if (shift !== 'day' && shift !== 'night') {
            console.error(`❌ [SHIFT DATA] Invalid shift value: ${shift}`);
            return res.status(400).json({
                success: false,
                message: 'Invalid request. shift must be "day" or "night"',
                received: { lineId, shift },
                timestamp: new Date().toISOString()
            });
        }

        // Deteksi environment dari referer/origin header untuk membedakan port 5174 (MJL2) vs 5173 (MJL)
        const referer = req.headers.referer || req.headers.origin || '';
        const port = referer.match(/:(\d+)/)?.[1];

        // Deteksi environment dari request, port, atau CURRENT_ENV
        let detectedEnv = CURRENT_ENV;

        // Jika port 5174 terdeteksi, pastikan environment adalah MJL2
        if (port === '5174') {
            detectedEnv = 'MJL2';
        } else if (port === '5173' && CURRENT_ENV === 'MJL') {
            detectedEnv = 'MJL';
        }

        const environment = reqEnv === 'MJL' || reqEnv === 'MJL2' || reqEnv === 'CLN' ? reqEnv : detectedEnv;

        const shiftData = loadShiftData();
        if (!shiftData.shifts) {
            shiftData.shifts = {};
        }

        const lineIdStr = lineId.toString();
        const id = parseInt(lineIdStr, 10);

        // Untuk line yang shared, simpan dengan environment-aware key
        // Format: "MJL_1", "CLN_1", "MJL2_1", dll untuk line yang shared
        // Format: "1", "111", "112", "10", dll untuk line spesifik environment
        let storageKey = lineIdStr;
        if (environment === 'CLN' && id >= 1 && id <= 5) {
            // Line 1-5 untuk CLN: simpan dengan environment prefix
            storageKey = `${environment}_${lineIdStr}`;
        } else if (environment === 'MJL' && id >= 1 && id <= 9) {
            // Line 1-9 untuk MJL: simpan dengan environment prefix
            storageKey = `${environment}_${lineIdStr}`;
        } else if (environment === 'MJL2' && id >= 1 && id <= 9) {
            // Line 1-9 untuk MJL2: simpan dengan environment prefix
            storageKey = `MJL2_${lineIdStr}`;
        }

        const oldShift = shiftData.shifts[storageKey] || shiftData.shifts[lineIdStr] || 'day';
        shiftData.shifts[storageKey] = shift;

        // Hapus key lama jika berbeda (untuk backward compatibility)
        if (storageKey !== lineIdStr && shiftData.shifts[lineIdStr]) {
            // Hanya hapus jika key lama tidak sama dengan key baru
            // Ini untuk menghindari konflik data
            delete shiftData.shifts[lineIdStr];
        }

        saveShiftData(shiftData);

        return res.json({
            success: true,
            message: `Shift updated for line ${lineId} (${environment})`,
            data: {
                lineId: lineIdStr,
                shift: shift,
                oldShift: oldShift,
                storageKey: storageKey,
                environment: environment
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ [SHIFT DATA] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating shift data',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Load supervisor data dari file
 * Auto-migrate data dari production_line.ts jika JSON kosong
 */
function loadSupervisorData() {
    try {
        let supervisorData;

        if (!fs.existsSync(SUPERVISOR_DATA_FILE)) {
            // Buat file default jika belum ada
            supervisorData = {
                supervisors: {},
                startTimes: {},
                targets: {},
                lastUpdated: new Date().toISOString(),
                description: "Data supervisor, jam masuk, dan target untuk production lines. Key adalah line ID (0 untuk All Production Line CLN, 111 untuk All Production Line MJL, 1-15 untuk Production Line 1-15)"
            };
            fs.writeFileSync(SUPERVISOR_DATA_FILE, JSON.stringify(supervisorData, null, 2), 'utf-8');
        } else {
            const fileContent = fs.readFileSync(SUPERVISOR_DATA_FILE, 'utf-8');
            supervisorData = JSON.parse(fileContent);
        }

        // Auto-migrate: Migrate data lama ke environment-aware keys untuk SEMUA environment
        // Ini akan berjalan setiap kali loadSupervisorData() dipanggil untuk memastikan data ter-migrate
        // Tidak perlu cek supervisorCount karena kita ingin migrate untuk semua environment sekaligus

        // Default supervisor values untuk semua environment
        const defaultSupervisors = {
            CLN: { '0': 'Rusdi', '1': 'RISMAN', '2': 'ROIS', '3': 'IIM', '4': 'FITRI', '5': 'SUMI' },
            MJL: { '111': 'Rusdi', '1': 'DATI', '2': 'SUSI', '3': 'DEDE', '4': 'DEDE', '5': 'HENI', '6': 'IYAH & DEDEH', '7': '-', '8': '-', '9': 'DALENA', '10': 'DALENA', '11': 'TATAN', '12': 'SITI', '13': 'DEDE WINDY', '14': 'TINI', '15': 'LINA' },
            MJL2: { '112': 'Rusdi', '1': 'NENG JUNENGSIH', '2': 'IMAS SUMINAR', '3': 'ROSMIATI', '4': 'EKA MUSTIKA', '5': 'ELI ERNAWATI', '6': 'ENO KARMI', '7': 'DINI AGUSTINA', '8': 'NINING SRI WAHYUNI', '9': 'NENG DIAH RODIAH' }
        };

        // Default startTimes untuk semua environment
        const defaultStartTimes = {
            CLN: { '0': '07:30', '1': '07:30', '2': '07:30', '3': '07:30', '4': '07:30', '5': '07:30' },
            MJL: { '111': '07:30', '1': '07:30', '2': '07:30', '3': '07:30', '4': '07:30', '5': '07:30', '6': '07:30', '7': '07:30', '8': '07:30', '9': '07:30', '10': '07:30', '11': '07:30', '12': '07:30', '13': '07:30', '14': '07:30', '15': '07:30' },
            MJL2: { '112': '07:30', '1': '07:30', '2': '07:30', '3': '07:30', '4': '07:30', '5': '07:30', '6': '19:30', '7': '19:30', '8': '07:30', '9': '07:30' }
        };

        if (!supervisorData.supervisors) {
            supervisorData.supervisors = {};
        }
        if (!supervisorData.startTimes) {
            supervisorData.startTimes = {};
        }
        if (!supervisorData.targets) {
            supervisorData.targets = {};
        }

        let migratedCount = 0;

        // Migrate CLN (line 1-5)
        for (let i = 1; i <= 5; i++) {
            const lineId = i.toString();
            const envKey = `CLN_${lineId}`;

            // Jika belum ada environment-aware key, migrate dari key lama atau default
            if (!supervisorData.supervisors[envKey]) {
                const oldValue = supervisorData.supervisors[lineId];
                supervisorData.supervisors[envKey] = oldValue || defaultSupervisors.CLN[lineId] || '-';
                if (oldValue) {
                    migratedCount++;
                }
            }
        }

        // Migrate MJL (line 1-9)
        for (let i = 1; i <= 9; i++) {
            const lineId = i.toString();
            const envKey = `MJL_${lineId}`;

            // Jika belum ada environment-aware key, migrate dari key lama atau default
            if (!supervisorData.supervisors[envKey]) {
                const oldValue = supervisorData.supervisors[lineId];
                supervisorData.supervisors[envKey] = oldValue || defaultSupervisors.MJL[lineId] || '-';
                if (oldValue) {
                    migratedCount++;
                }
            }
        }

        // Migrate MJL2 (line 1-9)
        for (let i = 1; i <= 9; i++) {
            const lineId = i.toString();
            const envKey = `MJL2_${lineId}`;

            // Jika belum ada environment-aware key, migrate dari key lama atau default
            if (!supervisorData.supervisors[envKey]) {
                const oldValue = supervisorData.supervisors[lineId];
                supervisorData.supervisors[envKey] = oldValue || defaultSupervisors.MJL2[lineId] || '-';
                if (oldValue) {
                    migratedCount++;
                }
            }
        }

        // Migrate startTimes untuk CLN (line 1-5)
        for (let i = 1; i <= 5; i++) {
            const lineId = i.toString();
            const envKey = `CLN_${lineId}`;
            if (!supervisorData.startTimes[envKey]) {
                supervisorData.startTimes[envKey] = defaultStartTimes.CLN[lineId] || '07:30';
            }
        }

        // Migrate startTimes untuk MJL (line 1-9)
        for (let i = 1; i <= 9; i++) {
            const lineId = i.toString();
            const envKey = `MJL_${lineId}`;
            if (!supervisorData.startTimes[envKey]) {
                supervisorData.startTimes[envKey] = defaultStartTimes.MJL[lineId] || '07:30';
            }
        }

        // Migrate startTimes untuk MJL2 (line 1-9)
        for (let i = 1; i <= 9; i++) {
            const lineId = i.toString();
            const envKey = `MJL2_${lineId}`;
            if (!supervisorData.startTimes[envKey]) {
                supervisorData.startTimes[envKey] = defaultStartTimes.MJL2[lineId] || '07:30';
            }
        }

        // Default targets (0 = belum di-set, acuan di dashboard line)
        for (let i = 1; i <= 5; i++) {
            const lineId = i.toString();
            const envKey = `CLN_${lineId}`;
            if (supervisorData.targets[envKey] === undefined) supervisorData.targets[envKey] = 0;
        }
        for (let i = 1; i <= 9; i++) {
            const lineId = i.toString();
            const envKey = `MJL_${lineId}`;
            if (supervisorData.targets[envKey] === undefined) supervisorData.targets[envKey] = 0;
        }
        for (let i = 1; i <= 9; i++) {
            const lineId = i.toString();
            const envKey = `MJL2_${lineId}`;
            if (supervisorData.targets[envKey] === undefined) supervisorData.targets[envKey] = 0;
        }
        if (supervisorData.targets['0'] === undefined) supervisorData.targets['0'] = 0;
        if (supervisorData.targets['111'] === undefined) supervisorData.targets['111'] = 0;
        if (supervisorData.targets['112'] === undefined) supervisorData.targets['112'] = 0;
        for (let i = 10; i <= 15; i++) {
            if (supervisorData.targets[i.toString()] === undefined) supervisorData.targets[i.toString()] = 0;
        }

        // Migrate All Production Line untuk setiap environment
        if (!supervisorData.supervisors['0']) {
            supervisorData.supervisors['0'] = defaultSupervisors.CLN['0'] || 'Rusdi';
        }
        if (!supervisorData.startTimes['0']) {
            supervisorData.startTimes['0'] = defaultStartTimes.CLN['0'] || '07:30';
        }
        if (!supervisorData.supervisors['111']) {
            supervisorData.supervisors['111'] = defaultSupervisors.MJL['111'] || 'Rusdi';
        }
        if (!supervisorData.startTimes['111']) {
            supervisorData.startTimes['111'] = defaultStartTimes.MJL['111'] || '07:30';
        }
        if (!supervisorData.supervisors['112']) {
            supervisorData.supervisors['112'] = defaultSupervisors.MJL2['112'] || 'Rusdi';
        }
        if (!supervisorData.startTimes['112']) {
            supervisorData.startTimes['112'] = defaultStartTimes.MJL2['112'] || '07:30';
        }

        // Migrate MJL line 10-15 (spesifik MJL, tidak shared)
        for (let i = 10; i <= 15; i++) {
            const lineId = i.toString();
            if (!supervisorData.supervisors[lineId]) {
                supervisorData.supervisors[lineId] = defaultSupervisors.MJL[lineId] || '-';
            }
            if (!supervisorData.startTimes[lineId]) {
                supervisorData.startTimes[lineId] = defaultStartTimes.MJL[lineId] || '07:30';
            }
        }

        // Simpan jika ada perubahan
        if (migratedCount > 0 || !supervisorData.startTimes || Object.keys(supervisorData.startTimes).length === 0) {
            supervisorData.lastUpdated = new Date().toISOString();
            supervisorData.description = "Data supervisor dan jam masuk untuk production lines. Key adalah line ID dengan environment prefix untuk line yang shared (CLN_1, MJL_1, MJL2_1, dll). Format startTime: HH:mm (24-hour format).";
            fs.writeFileSync(SUPERVISOR_DATA_FILE, JSON.stringify(supervisorData, null, 2), 'utf-8');
        }

        return supervisorData;
    } catch (error) {
        console.error('❌ [SUPERVISOR DATA] Error loading data:', error.message);
        return { supervisors: {}, lastUpdated: new Date().toISOString(), description: '' };
    }
}

/**
 * Save supervisor data ke file
 */
function saveSupervisorData(supervisorData) {
    try {
        supervisorData.lastUpdated = new Date().toISOString();
        fs.writeFileSync(SUPERVISOR_DATA_FILE, JSON.stringify(supervisorData, null, 2), 'utf-8');
    } catch (error) {
        console.error('❌ [SUPERVISOR DATA] Error saving data:', error.message);
        throw error; // Re-throw untuk ditangani di endpoint
    }
}

/**
 * GET /api/supervisor-data - Get supervisor data untuk semua line
 * Query: ?environment=CLN|MJL|MJL2 (optional, default: detect from CURRENT_ENV)
 */
app.get('/api/supervisor-data', (req, res) => {
    try {
        // Deteksi environment dari referer/origin header untuk membedakan port 5174 (MJL2) vs 5173 (MJL)
        const referer = req.headers.referer || req.headers.origin || '';
        const port = referer.match(/:(\d+)/)?.[1];

        // Deteksi environment dari query, port, atau CURRENT_ENV
        const queryEnv = req.query.environment;
        let detectedEnv = CURRENT_ENV;

        // Jika port 5174 terdeteksi, pastikan environment adalah MJL2
        if (port === '5174') {
            detectedEnv = 'MJL2';
        } else if (port === '5173' && CURRENT_ENV === 'MJL') {
            detectedEnv = 'MJL';
        }

        const environment = queryEnv === 'MJL' || queryEnv === 'MJL2' || queryEnv === 'CLN' ? queryEnv : detectedEnv;

        const supervisorData = loadSupervisorData();
        const allSupervisors = supervisorData.supervisors || {};
        const allStartTimes = supervisorData.startTimes || {};
        const allTargets = supervisorData.targets || {};

        // Filter data berdasarkan environment
        // CLN: line 0, 1-5
        // MJL: line 111, 1-15
        // MJL2: line 112, 1-8
        // Untuk line 1-5 yang ada di CLN, gunakan data default dari production_line.ts jika tidak ada di JSON
        const filteredSupervisors = {};
        const filteredStartTimes = {};
        const filteredTargets = {};

        // Default startTimes untuk fallback
        const defaultStartTimesCLN = {
            '0': '07:30', '1': '07:30', '2': '07:30', '3': '07:30', '4': '07:30', '5': '07:30'
        };
        const defaultStartTimesMJL = {
            '111': '07:30', '1': '07:30', '2': '07:30', '3': '07:30', '4': '07:30', '5': '07:30',
            '6': '07:30', '7': '07:30', '8': '07:30', '9': '07:30', '10': '07:30', '11': '07:30',
            '12': '07:30', '13': '07:30', '14': '07:30', '15': '07:30', '16': '07:30'
        };
        const defaultStartTimesMJL2 = {
            '112': '07:30', '1': '07:30', '2': '07:30', '3': '07:30', '4': '07:30', '5': '07:30',
            '6': '19:30', '7': '19:30', '8': '07:30', '9': '07:30'
        };

        // Data default untuk fallback
        const defaultCLN = {
            '0': 'Rusdi', '1': 'RISMAN', '2': 'ROIS', '3': 'IIM',
            '4': 'FITRI', '5': 'SUMI'
        };

        const defaultMJL = {
            '111': 'Rusdi', '1': 'DATI', '2': 'SUSI', '3': 'DEDE', '4': 'DEDE',
            '5': 'HENI', '6': 'IYAH & DEDEH', '7': '-', '8': '-', '9': 'DALENA',
            '10': 'DALENA', '11': 'TATAN', '12': 'SITI', '13': 'DEDE WINDY',
            '14': 'TINI', '15': 'LINA', '16': '-'
        };

        const defaultMJL2 = {
            '112': 'Rusdi', '1': 'NENG JUNENGSIH', '2': 'IMAS SUMINAR',
            '3': 'ROSMIATI', '4': 'EKA MUSTIKA', '5': 'ELI ERNAWATI',
            '6': 'ENO KARMI', '7': 'DINI AGUSTINA', '8': 'NINING SRI WAHYUNI', '9': 'NENG DIAH RODIAH'
        };

        if (environment === 'MJL') {
            // MJL: ambil line 111 dan 1-15
            const defaultData = defaultMJL;
            const defaultStartData = defaultStartTimesMJL;
            Object.keys(defaultData).forEach(lineId => {
                const id = parseInt(lineId, 10);
                // Untuk line 1-9 yang shared: 
                // HANYA gunakan environment-aware key (MJL_1, dll) atau default MJL
                // JANGAN gunakan allSupervisors[lineId] karena itu mungkin data CLN dari migration lama
                if (id >= 1 && id <= 9) {
                    const envKey = `MJL_${lineId}`;
                    // Hanya gunakan environment-aware key atau default, TIDAK gunakan key lama
                    filteredSupervisors[lineId] = allSupervisors[envKey] || defaultData[lineId];
                    filteredStartTimes[lineId] = allStartTimes[envKey] || defaultStartData[lineId] || '07:30';
                    filteredTargets[lineId] = typeof allTargets[envKey] === 'number' ? allTargets[envKey] : (typeof allTargets[lineId] === 'number' ? allTargets[lineId] : 0);
                } else {
                    // Line 111 dan 10-16: gunakan dari JSON (key MJL_10..MJL_16 atau 10..16), jika tidak default
                    const mjlKey = id >= 10 && id <= 16 ? `MJL_${lineId}` : lineId;
                    filteredSupervisors[lineId] = allSupervisors[mjlKey] || allSupervisors[lineId] || defaultData[lineId];
                    filteredStartTimes[lineId] = allStartTimes[mjlKey] || allStartTimes[lineId] || defaultStartData[lineId] || '07:30';
                    filteredTargets[lineId] = typeof allTargets[mjlKey] === 'number' ? allTargets[mjlKey] : (typeof allTargets[lineId] === 'number' ? allTargets[lineId] : 0);
                }
            });
        } else if (environment === 'MJL2') {
            // MJL2: ambil line 112 dan 1-9
            const defaultData = defaultMJL2;
            const defaultStartData = defaultStartTimesMJL2;
            Object.keys(defaultData).forEach(lineId => {
                const id = parseInt(lineId, 10);
                // Untuk line 1-9 yang shared: 
                // HANYA gunakan environment-aware key (MJL2_1, dll) atau default MJL2
                if (id >= 1 && id <= 9) {
                    const envKey = `MJL2_${lineId}`;
                    // Hanya gunakan environment-aware key atau default, TIDAK gunakan key lama
                    filteredSupervisors[lineId] = allSupervisors[envKey] || defaultData[lineId];
                    filteredStartTimes[lineId] = allStartTimes[envKey] || defaultStartData[lineId] || '07:30';
                    filteredTargets[lineId] = typeof allTargets[envKey] === 'number' ? allTargets[envKey] : (typeof allTargets[lineId] === 'number' ? allTargets[lineId] : 0);
                } else {
                    // Line 112: gunakan dari JSON jika ada, jika tidak gunakan default
                    filteredSupervisors[lineId] = allSupervisors[lineId] || defaultData[lineId];
                    filteredStartTimes[lineId] = allStartTimes[lineId] || defaultStartData[lineId] || '07:30';
                    filteredTargets[lineId] = typeof allTargets[lineId] === 'number' ? allTargets[lineId] : 0;
                }
            });
        } else {
            // CLN: ambil line 0 dan 1-5
            const defaultData = defaultCLN;
            const defaultStartData = defaultStartTimesCLN;
            Object.keys(defaultData).forEach(lineId => {
                const id = parseInt(lineId, 10);
                // Untuk line 1-5:
                // HANYA gunakan environment-aware key (CLN_1, dll) atau default CLN
                // JANGAN gunakan allSupervisors[lineId] karena itu mungkin data MJL dari migration lama
                if (id >= 1 && id <= 5) {
                    const envKey = `CLN_${lineId}`;
                    // Hanya gunakan environment-aware key atau default, TIDAK gunakan key lama
                    filteredSupervisors[lineId] = allSupervisors[envKey] || defaultData[lineId];
                    filteredStartTimes[lineId] = allStartTimes[envKey] || defaultStartData[lineId] || '07:30';
                    filteredTargets[lineId] = typeof allTargets[envKey] === 'number' ? allTargets[envKey] : (typeof allTargets[lineId] === 'number' ? allTargets[lineId] : 0);
                } else {
                    // Line 0: gunakan dari JSON jika ada, jika tidak gunakan default
                    filteredSupervisors[lineId] = allSupervisors[lineId] || defaultData[lineId];
                    filteredStartTimes[lineId] = allStartTimes[lineId] || defaultStartData[lineId] || '07:30';
                    filteredTargets[lineId] = typeof allTargets[lineId] === 'number' ? allTargets[lineId] : 0;
                }
            });
        }

        return res.json({
            success: true,
            data: {
                supervisors: filteredSupervisors,
                startTimes: filteredStartTimes,
                targets: filteredTargets
            },
            environment: environment,
            lastUpdated: supervisorData.lastUpdated,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ [SUPERVISOR DATA] GET Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching supervisor data',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/target-data - Get target data untuk semua line (sumber: supervisor_data.json, system sama)
 * Query: ?environment=CLN|MJL|MJL2 (optional)
 * Response: { success, data: { targets: { "1": 170, "2": 195, ... } }, environment, lastUpdated, timestamp }
 */
app.get('/api/target-data', (req, res) => {
    try {
        const referer = req.headers.referer || req.headers.origin || '';
        const port = referer.match(/:(\d+)/)?.[1];
        const queryEnv = req.query.environment;
        let detectedEnv = CURRENT_ENV;
        if (port === '5174') detectedEnv = 'MJL2';
        else if (port === '5173' && CURRENT_ENV === 'MJL') detectedEnv = 'MJL';
        const environment = queryEnv === 'MJL' || queryEnv === 'MJL2' || queryEnv === 'CLN' ? queryEnv : detectedEnv;

        const supervisorData = loadSupervisorData();
        const allTargets = supervisorData.targets || {};

        const filteredTargets = {};
        const defaultTargetsCLN = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
        const defaultTargetsMJL = { '111': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0, '10': 0, '11': 0, '12': 0, '13': 0, '14': 0, '15': 0, '16': 0 };
        const defaultTargetsMJL2 = { '112': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0 };

        if (environment === 'MJL') {
            Object.keys(defaultTargetsMJL).forEach(lineId => {
                const id = parseInt(lineId, 10);
                const mjlKey = id >= 1 && id <= 16 ? `MJL_${lineId}` : lineId;
                filteredTargets[lineId] = typeof allTargets[mjlKey] === 'number' ? allTargets[mjlKey] : (typeof allTargets[lineId] === 'number' ? allTargets[lineId] : 0);
            });
        } else if (environment === 'MJL2') {
            Object.keys(defaultTargetsMJL2).forEach(lineId => {
                const id = parseInt(lineId, 10);
                if (id >= 1 && id <= 9) {
                    const envKey = `MJL2_${lineId}`;
                    filteredTargets[lineId] = typeof allTargets[envKey] === 'number' ? allTargets[envKey] : (typeof allTargets[lineId] === 'number' ? allTargets[lineId] : 0);
                } else {
                    filteredTargets[lineId] = typeof allTargets[lineId] === 'number' ? allTargets[lineId] : 0;
                }
            });
        } else {
            Object.keys(defaultTargetsCLN).forEach(lineId => {
                const id = parseInt(lineId, 10);
                if (id >= 1 && id <= 5) {
                    const envKey = `CLN_${lineId}`;
                    filteredTargets[lineId] = typeof allTargets[envKey] === 'number' ? allTargets[envKey] : (typeof allTargets[lineId] === 'number' ? allTargets[lineId] : 0);
                } else {
                    filteredTargets[lineId] = typeof allTargets[lineId] === 'number' ? allTargets[lineId] : 0;
                }
            });
        }

        return res.json({
            success: true,
            data: { targets: filteredTargets },
            environment,
            lastUpdated: supervisorData.lastUpdated,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ [TARGET DATA] GET Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching target data',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/supervisor-data - Update supervisor data untuk line tertentu
 * Body: { lineId: number, supervisor: string }
 */
app.post('/api/supervisor-data', (req, res) => {
    try {
        const { lineId, supervisor, startTime, target, environment: reqEnv } = req.body;

        if (lineId === undefined || lineId === null) {
            console.error(`❌ [SUPERVISOR DATA] Missing lineId in request`);
            return res.status(400).json({
                success: false,
                message: 'Invalid request. lineId is required',
                received: req.body,
                timestamp: new Date().toISOString()
            });
        }

        // Deteksi environment dari request atau CURRENT_ENV
        const detectedEnv = CURRENT_ENV;
        const environment = reqEnv === 'MJL' || reqEnv === 'MJL2' || reqEnv === 'CLN' ? reqEnv : detectedEnv;

        const supervisorData = loadSupervisorData();
        if (!supervisorData.supervisors) {
            supervisorData.supervisors = {};
        }
        if (!supervisorData.startTimes) {
            supervisorData.startTimes = {};
        }
        if (!supervisorData.targets) {
            supervisorData.targets = {};
        }

        const lineIdStr = lineId.toString();
        const id = parseInt(lineIdStr, 10);

        // Untuk line yang shared, simpan dengan environment-aware key
        // Format: "MJL_1", "CLN_1", "MJL2_1", dll untuk line yang shared
        // Format: "1", "111", "112", "10", dll untuk line spesifik environment
        let storageKey = lineIdStr;
        if (environment === 'CLN' && id >= 1 && id <= 5) {
            // Line 1-5 untuk CLN: simpan dengan environment prefix
            storageKey = `${environment}_${lineIdStr}`;
        } else if (environment === 'MJL' && id >= 1 && id <= 9) {
            // Line 1-9 untuk MJL: simpan dengan environment prefix
            storageKey = `${environment}_${lineIdStr}`;
        } else if (environment === 'MJL2' && id >= 1 && id <= 9) {
            // Line 1-9 untuk MJL2: simpan dengan environment prefix
            storageKey = `MJL2_${lineIdStr}`;
        }

        // Update supervisor jika ada
        if (supervisor !== undefined && supervisor !== null) {
            if (typeof supervisor !== 'string' || !supervisor.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid request. supervisor must be a non-empty string',
                    received: { lineId, supervisor },
                    timestamp: new Date().toISOString()
                });
            }

            const oldSupervisor = supervisorData.supervisors[storageKey] || supervisorData.supervisors[lineIdStr] || '-';
            supervisorData.supervisors[storageKey] = supervisor.trim();

            // Hapus key lama jika berbeda (untuk backward compatibility)
            if (storageKey !== lineIdStr && supervisorData.supervisors[lineIdStr]) {
                delete supervisorData.supervisors[lineIdStr];
            }
        }

        // Update startTime jika ada
        if (startTime !== undefined && startTime !== null) {
            // Validasi format startTime (HH:mm)
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (typeof startTime !== 'string' || !timeRegex.test(startTime)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid request. startTime must be in HH:mm format (24-hour)',
                    received: { lineId, startTime },
                    timestamp: new Date().toISOString()
                });
            }

            const oldStartTime = supervisorData.startTimes[storageKey] || supervisorData.startTimes[lineIdStr] || '07:30';
            supervisorData.startTimes[storageKey] = startTime.trim();

            // Hapus key lama jika berbeda (untuk backward compatibility)
            if (storageKey !== lineIdStr && supervisorData.startTimes[lineIdStr]) {
                delete supervisorData.startTimes[lineIdStr];
            }
        }

        // Update target jika ada (number >= 0, untuk acuan distribusi dashboard line)
        if (target !== undefined && target !== null) {
            const numTarget = typeof target === 'number' ? target : parseInt(String(target), 10);
            if (!Number.isNaN(numTarget) && numTarget >= 0) {
                supervisorData.targets[storageKey] = numTarget;
                if (storageKey !== lineIdStr && supervisorData.targets[lineIdStr] !== undefined) {
                    delete supervisorData.targets[lineIdStr];
                }
            }
        }

        saveSupervisorData(supervisorData);

        const currentTarget = typeof supervisorData.targets[storageKey] === 'number' ? supervisorData.targets[storageKey] : (typeof supervisorData.targets[lineIdStr] === 'number' ? supervisorData.targets[lineIdStr] : 0);
        return res.json({
            success: true,
            message: `Data updated for line ${lineId}`,
            data: {
                lineId: lineIdStr,
                supervisor: supervisorData.supervisors[storageKey] || supervisorData.supervisors[lineIdStr] || '-',
                startTime: supervisorData.startTimes[storageKey] || supervisorData.startTimes[lineIdStr] || '07:30',
                target: currentTarget,
                environment: environment
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ [SUPERVISOR DATA] POST Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating supervisor data',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/folding/count - Get total count folding checkout per table
 * Query: ?date=YYYY-MM-DD (optional, default: today)
 */
app.get('/api/folding/count', (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];

        // Get data dari in-memory atau file
        let dateData = {};
        if (foldingCheckoutData.has(date)) {
            const dateMap = foldingCheckoutData.get(date);
            dateMap.forEach((tableMap, tableNumber) => {
                let total = 0;
                tableMap.forEach((count) => {
                    total += count;
                });
                dateData[tableNumber] = total;
            });
        } else {
            // Load dari file jika tidak ada di memory - dengan filter environment
            if (fs.existsSync(FOLDING_CHECKOUT_FILE)) {
                try {
                    const fileContent = fs.readFileSync(FOLDING_CHECKOUT_FILE, 'utf-8');
                    const checkoutData = JSON.parse(fileContent);

                    // Ambil data hanya dari environment yang sesuai
                    // Struktur baru: { "CLN": { "date": {...} }, "MJL": {...}, "MJL2": {...} }
                    // Struktur lama (backward compatibility): { "date": {...} } - hanya untuk CLN
                    let dayData = {};
                    if (checkoutData[CURRENT_ENV]) {
                        dayData = checkoutData[CURRENT_ENV][date] || {};
                    } else if (CURRENT_ENV === 'CLN' && checkoutData[date]) {
                        // Backward compatibility: jika struktur lama dan CLN
                        dayData = checkoutData[date] || {};
                    }

                    // Calculate total per table
                    Object.keys(dayData).forEach(tableNumber => {
                        let total = 0;
                        Object.values(dayData[tableNumber]).forEach(count => {
                            total += count;
                        });
                        dateData[tableNumber] = total;
                    });
                } catch (e) {
                    dateData = {};
                }
            }
        }

        return res.json({
            success: true,
            data: {
                table1: dateData['1'] || 0,
                table2: dateData['2'] || 0,
                table3: dateData['3'] || 0,
                table4: dateData['4'] || 0,
                table5: dateData['5'] || 0,
                table6: dateData['6'] || 0,
                table7: dateData['7'] || 0,
                table8: dateData['8'] || 0,
            },
            date,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ [FOLDING COUNT] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching folding count data',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 Handler - HARUS di akhir, setelah semua route
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        message: `Route ${req.method} ${req.path} tidak ditemukan`
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message
    });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, HOST, () => {
    // Log environment info
    console.log(`\n🚀 [SERVER START] Proxy Server starting...`);
    console.log(`   Environment: ${CURRENT_ENV}`);
    console.log(`   Backend IP: ${BACKEND_IP}`);
    console.log(`   Backend Port: ${BACKEND_PORT}`);
    console.log(`   Backend URL: ${BACKEND_API_URL}`);
    console.log(`   Proxy Server: http://${LOCAL_IP}:${PORT}\n`);

    // Test koneksi MySQL saat server start
    checkMySQLConnection().then(result => {
        if (result.connected) {
        } else {
            console.error('❌ MySQL Connection: FAILED');
            console.error(`   Error: ${result.error || result.message}`);
        }
    }).catch(err => {
        console.error('❌ MySQL Connection: FAILED');
        console.error(`   Error: ${err.message}`);
    });

    // Test koneksi WebSocket saat server start
    checkWebSocketConnection().then(result => {
        if (result.connected) {
            console.log('✅ WebSocket Connection: CONNECTED');
            console.log(`   URL: ${result.url}`);
            console.log(`   Backend IP: ${result.backendIP}`);
            console.log(`   Environment: ${result.environment}`);
            console.log(`   Response Time: ${result.responseTime}`);
        } else {
            console.error('❌ WebSocket Connection: FAILED');
            console.error(`   URL: ${result.url}`);
            console.error(`   Backend IP: ${result.backendIP}`);
            console.error(`   Environment: ${result.environment}`);
            console.error(`   Error: ${result.error || result.message}`);
        }
    }).catch(err => {
        console.error('❌ WebSocket Connection: FAILED');
        console.error(`   Error: ${err.message}`);
    });


    // Load active sessions dari file saat server start
    loadActiveSessionsFromFile();

    // Load shift data dari file saat server start
    loadShiftData();

    // Load supervisor data dari file saat server start
    loadSupervisorData();

    // Migrate data lama ke struktur baru (jika perlu)
    migrateFoldingCheckoutData();

    // Load folding checkout data dari file saat server start
    loadFoldingCheckoutData();

    // ============================================
    // AUTO-LOGOUT SETIAP HARI
    // ============================================

    /**
     * Fungsi untuk logout semua user setiap hari (auto-logout)
     * Logout dilakukan setiap hari pada jam 00:00 (midnight)
     */
    function scheduleDailyAutoLogout() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0); // Set ke jam 00:00:00

        const msUntilMidnight = tomorrow.getTime() - now.getTime();

        console.log(`⏰ [AUTO-LOGOUT] Scheduled daily auto-logout for ${CURRENT_ENV} at ${tomorrow.toISOString()}`);
        console.log(`⏰ [AUTO-LOGOUT] Will logout all users in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);

        setTimeout(() => {
            performDailyAutoLogout();

            // Schedule untuk hari berikutnya (recurring)
            scheduleDailyAutoLogout();
        }, msUntilMidnight);
    }

    /**
     * Fungsi untuk melakukan auto-logout semua user
     */
    function performDailyAutoLogout() {
        try {
            console.log(`🔄 [AUTO-LOGOUT] Starting daily auto-logout for ${CURRENT_ENV}...`);

            // Logout semua user dari activeSessions untuk environment ini
            let loggedOutCount = 0;
            const usersToLogout = [];

            // Kumpulkan semua user dari environment ini
            for (const [key, user] of activeSessions.entries()) {
                if (key.startsWith(`${CURRENT_ENV}_`)) {
                    usersToLogout.push({ key, user });
                }
            }

            // Update logout time di file dan hapus dari activeSessions
            if (fs.existsSync(USER_LOG_FILE)) {
                const fileContent = fs.readFileSync(USER_LOG_FILE, 'utf-8');
                let userLogs = [];
                try {
                    userLogs = JSON.parse(fileContent);
                } catch (e) {
                    userLogs = [];
                }

                // Update logout time untuk semua user dari environment ini yang belum logout
                const now = new Date().toISOString();
                for (const { user } of usersToLogout) {
                    // Cari login terakhir yang belum logout untuk NIK ini
                    for (let i = userLogs.length - 1; i >= 0; i--) {
                        const log = userLogs[i];
                        const logEnvironment = log.environment || (log.backendIP === '10.8.0.104' ? 'CLN' :
                            log.backendIP === '10.5.0.106' ? 'MJL' :
                                log.backendIP === '10.5.0.99' ? 'MJL2' : null);

                        if (log.nik === user.nik &&
                            !log.logoutTime &&
                            logEnvironment === CURRENT_ENV) {
                            log.logoutTime = now;
                            loggedOutCount++;
                            break;
                        }
                    }
                }

                // Simpan ke file
                fs.writeFileSync(USER_LOG_FILE, JSON.stringify(userLogs, null, 2), 'utf-8');
            }

            // Hapus dari activeSessions
            for (const { key } of usersToLogout) {
                activeSessions.delete(key);
            }

            // Hapus semua session web untuk environment ini (agar user harus login lagi saat akses link)
            let webCleared = 0;
            for (const key of Array.from(webSessions.keys())) {
                if (key.startsWith(`${CURRENT_ENV}_`)) {
                    webSessions.delete(key);
                    webCleared++;
                }
            }
            if (webCleared > 0) {
                console.log(`✅ [AUTO-LOGOUT] Cleared ${webCleared} web session(s) for ${CURRENT_ENV}`);
            }

            console.log(`✅ [AUTO-LOGOUT] Auto-logout completed for ${CURRENT_ENV}: ${loggedOutCount} users logged out`);
            console.log(`✅ [AUTO-LOGOUT] Remaining active sessions for ${CURRENT_ENV}: ${Array.from(activeSessions.keys()).filter(k => k.startsWith(`${CURRENT_ENV}_`)).length}`);
        } catch (error) {
            console.error(`❌ [AUTO-LOGOUT] Error during auto-logout for ${CURRENT_ENV}:`, error.message);
        }
    }

    // Start auto-logout scheduler
    scheduleDailyAutoLogout();

});


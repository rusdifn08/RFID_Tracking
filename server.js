/**
 * Proxy Server untuk Frontend
 * Server proxy yang menghubungkan frontend dengan backend API
 */

import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import os from 'os';

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
const BACKEND_IP = '10.8.0.104'; // IP eksplisit untuk Backend API (tetap sama)
const PORT = process.env.PORT || 8000; // Port untuk proxy server (frontend proxy)
const HOST = '0.0.0.0'; // Listen di semua network interface
const BACKEND_PORT = 7000; // Port untuk backend API

// Backend API URL - menggunakan IP eksplisit dengan port 7000
const BACKEND_API_URL = process.env.BACKEND_API_URL || `http://${BACKEND_IP}:${BACKEND_PORT}`;

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
        
        console.log(`\n🔍 [PROXY] ${req.method} ${endpoint}`);
        console.log(`🔍 [PROXY] URL: ${url}`);
        
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 detik timeout
        
        const response = await fetch(url, {
            method: options.method || req.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers,
            },
            body: options.body || (req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : undefined),
            signal: controller.signal
        }).catch((fetchError) => {
            clearTimeout(timeoutId);
            console.error(`❌ [PROXY] Fetch error:`, fetchError);
            throw fetchError;
        });
        
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        console.log(`⏱️  [PROXY] Request duration: ${duration}ms`);
        console.log(`📥 [PROXY] Response status: ${response.status} ${response.statusText}`);
        
        let data;
        try {
            const textData = await response.text();
            if (textData) {
                data = JSON.parse(textData);
            }
        } catch (parseError) {
            console.error(`❌ [PROXY] JSON parse error:`, parseError);
            throw new Error('Invalid JSON response from backend API');
        }
        
        // Forward response dengan status code yang sama
        res.status(response.status).json(data);
    } catch (error) {
        console.error(`\n❌ [PROXY] Error:`, error);
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

// ============================================
// CONNECTION HEALTH CHECK
// ============================================

// Database Configuration
const DATABASE_URL = 'http://10.5.0.99/db/garment';
const BACKEND_API_URL_CHECK = process.env.BACKEND_API_URL || BACKEND_API_URL;

// MySQL Configuration
const MYSQL_CONFIG = {
    host: '10.8.0.104',
    user: 'robot',
    password: 'robot123',
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

        const response = await fetch(`${BACKEND_API_URL_CHECK}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
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

// Health Check Endpoint - Check semua koneksi
app.get('/api/health/check', async (req, res) => {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 HEALTH CHECK - Checking Connections');
    console.log('='.repeat(60));

    const [databaseStatus, mysqlStatus, apiStatus] = await Promise.allSettled([
        checkDatabaseConnection(),
        checkMySQLConnection(),
        checkApiConnection()
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

    const overallStatus = databaseResult.connected && mysqlResult.connected && apiResult.connected ? 'ok' : 'degraded';

    // Log results
    console.log('📊 Database Connection:');
    console.log(`   Status: ${databaseResult.connected ? '✅ OK' : '❌ FAILED'}`);
    console.log(`   Response Time: ${databaseResult.responseTime || 'N/A'}`);
    console.log(`   Message: ${databaseResult.message}`);
    if (databaseResult.error) {
        console.log(`   Error: ${databaseResult.error}`);
    }

    console.log('\n🗄️  MySQL Connection:');
    console.log(`   Status: ${mysqlResult.connected ? '✅ OK' : '❌ FAILED'}`);
    console.log(`   Response Time: ${mysqlResult.responseTime || 'N/A'}`);
    console.log(`   Message: ${mysqlResult.message}`);
    if (mysqlResult.details) {
        console.log(`   Host: ${mysqlResult.details.host}`);
        console.log(`   Database: ${mysqlResult.details.database}`);
        console.log(`   Table: ${mysqlResult.details.table}`);
        console.log(`   Table Exists: ${mysqlResult.details.tableExists ? '✅' : '❌'}`);
    }
    if (mysqlResult.error) {
        console.log(`   Error: ${mysqlResult.error}`);
    }

    console.log('\n📡 API Connection:');
    console.log(`   Status: ${apiResult.connected ? '✅ OK' : '❌ FAILED'}`);
    console.log(`   Response Time: ${apiResult.responseTime || 'N/A'}`);
    console.log(`   Message: ${apiResult.message}`);
    if (apiResult.error) {
        console.log(`   Error: ${apiResult.error}`);
    }

    console.log(`\n🎯 Overall Status: ${overallStatus === 'ok' ? '✅ ALL OK' : '⚠️  DEGRADED'}`);
    console.log('='.repeat(60) + '\n');

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
            }
        },
        summary: {
            total: 3,
            passed: (databaseResult.connected ? 1 : 0) + (mysqlResult.connected ? 1 : 0) + (apiResult.connected ? 1 : 0),
            failed: (databaseResult.connected ? 0 : 1) + (mysqlResult.connected ? 0 : 1) + (apiResult.connected ? 0 : 1)
        }
    });
});

// Individual Database Health Check
app.get('/api/health/database', async (req, res) => {
    const result = await checkDatabaseConnection();
    
    console.log('\n' + '='.repeat(60));
    console.log('🔍 DATABASE HEALTH CHECK');
    console.log('='.repeat(60));
    console.log(`URL: ${DATABASE_URL}`);
    console.log(`Status: ${result.connected ? '✅ OK' : '❌ FAILED'}`);
    console.log(`Response Time: ${result.responseTime || 'N/A'}`);
    console.log(`Message: ${result.message}`);
    if (result.error) {
        console.log(`Error: ${result.error}`);
    }
    console.log('='.repeat(60) + '\n');

    res.status(result.connected ? 200 : 503).json({
        url: DATABASE_URL,
        ...result
    });
});

// Individual MySQL Health Check
app.get('/api/health/mysql', async (req, res) => {
    const result = await checkMySQLConnection();
    
    console.log('\n' + '='.repeat(60));
    console.log('🔍 MYSQL HEALTH CHECK');
    console.log('='.repeat(60));
    console.log(`Host: ${MYSQL_CONFIG.host}`);
    console.log(`Database: ${MYSQL_CONFIG.database}`);
    console.log(`Table: ${MYSQL_CONFIG.table}`);
    console.log(`Status: ${result.connected ? '✅ OK' : '❌ FAILED'}`);
    console.log(`Response Time: ${result.responseTime || 'N/A'}`);
    console.log(`Message: ${result.message}`);
    if (result.details) {
        console.log(`Table Exists: ${result.details.tableExists ? '✅' : '❌'}`);
        console.log(`Table Accessible: ${result.details.tableAccessible ? '✅' : '❌'}`);
    }
    if (result.error) {
        console.log(`Error: ${result.error}`);
    }
    console.log('='.repeat(60) + '\n');

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
    
    console.log('\n' + '='.repeat(60));
    console.log('🔍 API HEALTH CHECK');
    console.log('='.repeat(60));
    console.log(`URL: ${BACKEND_API_URL_CHECK}`);
    console.log(`Status: ${result.connected ? '✅ OK' : '❌ FAILED'}`);
    console.log(`Response Time: ${result.responseTime || 'N/A'}`);
    console.log(`Message: ${result.message}`);
    if (result.error) {
        console.log(`Error: ${result.error}`);
    }
    console.log('='.repeat(60) + '\n');

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
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.success) {
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
 * Endpoint ini memanggil API backend menggunakan local IP dengan port 7000
 */
app.get('/user', async (req, res) => {
    const { nik, rfid_user } = req.query;
    
    console.log(`\n📥 [SERVER] ==========================================`);
    console.log(`📥 [SERVER] Received request: GET /user`);
    console.log(`📥 [SERVER] Query params:`, req.query);
    console.log(`📥 [SERVER] NIK: ${nik}`);
    console.log(`📥 [SERVER] RFID User: ${rfid_user}`);
    console.log(`📥 [SERVER] Client IP: ${req.ip || req.connection.remoteAddress}`);
    console.log(`📥 [SERVER] Timestamp: ${new Date().toISOString()}`);

    // Jika ada rfid_user, proxy langsung ke backend
    if (rfid_user) {
        return await proxyRequest('/user', req, res);
    }
    
    if (!nik) {
        console.log(`❌ [SERVER] NIK atau rfid_user parameter is required`);
        return res.status(400).json({
            success: false,
            message: 'NIK atau rfid_user parameter is required',
            timestamp: new Date().toISOString()
        });
    }

    try {
        // Panggil API backend yang sebenarnya: http://10.8.0.104:7000/user?nik=...
        const backendUrl = `${BACKEND_API_URL}/user?nik=${encodeURIComponent(nik)}`;
        console.log(`\n🔍 [USER API] ==========================================`);
        console.log(`🔍 [USER API] Fetching user data from backend API`);
        console.log(`🔍 [USER API] URL: ${backendUrl}`);
        console.log(`🔍 [USER API] NIK: ${nik}`);
        console.log(`🔍 [USER API] Timestamp: ${new Date().toISOString()}`);
        
        const startTime = Date.now();
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 detik timeout
        
        const response = await fetch(backendUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: controller.signal
        }).catch((fetchError) => {
            clearTimeout(timeoutId);
            console.error(`❌ [USER API] Fetch error:`, fetchError);
            throw fetchError;
        });
        
        clearTimeout(timeoutId);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`⏱️  [USER API] Request duration: ${duration}ms`);
        console.log(`📥 [USER API] Response status: ${response.status} ${response.statusText}`);

        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            console.error(`❌ [USER API] JSON parse error:`, parseError);
            const textData = await response.text();
            console.error(`❌ [USER API] Response text:`, textData);
            throw new Error('Invalid JSON response from backend API');
        }
        
        console.log(`📥 [USER API] Response success: ${data.success}`);
        console.log(`📥 [USER API] Response has user: ${!!data.user}`);
        if (data.user) {
            console.log(`📥 [USER API] User NIK: ${data.user.nik}`);
            console.log(`📥 [USER API] User Name: ${data.user.nama}`);
        }
        console.log(`📥 [USER API] Full response data:`, JSON.stringify(data, null, 2));

        // Forward response dari backend API langsung ke frontend
        // Backend API mengembalikan struktur: { success, debug, password_hash, user }
        console.log(`📥 [USER API] Response data:`, JSON.stringify(data, null, 2));
        
        // Jika response OK, forward langsung ke frontend
        if (response.ok) {
            console.log(`✅ [USER API] Forwarding response to client`);
            console.log(`📥 [SERVER] ==========================================\n`);
            // Forward response dari backend API langsung (termasuk debug, password_hash, user)
            return res.json(data);
        } else {
            // Response tidak OK
            console.log(`❌ [USER API] Backend API returned error`);
            console.log(`📤 [SERVER] Sending error response to client`);
            console.log(`📥 [SERVER] ==========================================\n`);
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
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();

        if (data.success) {
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
        console.log(`\n🔍 [DUPLICATE CHECK] Checking RFID: "${normalizedRfid}"`);
        
        // Debug: Tampilkan semua rfid_garment yang ada di database (untuk verifikasi)
        try {
            const [allRfids] = await connection.execute(
                `SELECT DISTINCT rfid_garment FROM ${MYSQL_CONFIG.table} ORDER BY rfid_garment LIMIT 20`
            );
            const rfidList = allRfids.map(r => String(r.rfid_garment).trim());
            console.log(`   📋 Existing RFID in DB (sample):`, rfidList);
            console.log(`   🔎 Looking for: "${normalizedRfid}"`);
        } catch (err) {
            console.log(`   ⚠️  Could not fetch existing RFIDs:`, err.message);
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
                console.log(`   ⚠️  Method 1 (direct): FOUND DUPLICATE!`);
                console.log(`      Existing ID: ${rows1[0].id_garment}, RFID: "${rows1[0].rfid_garment}"`);
            }
        } catch (err) {
            console.log(`   ⚠️  Method 1 error:`, err.message);
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
                    console.log(`   ⚠️  Method 2 (CAST): FOUND DUPLICATE!`);
                    console.log(`      Existing ID: ${rows2[0].id_garment}, RFID: "${rows2[0].rfid_garment}"`);
                }
            } catch (err) {
                console.log(`   ⚠️  Method 2 error:`, err.message);
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
                    console.log(`   ⚠️  Method 3 (TRIM): FOUND DUPLICATE!`);
                    console.log(`      Existing ID: ${rows3[0].id_garment}, RFID: "${rows3[0].rfid_garment}"`);
                }
            } catch (err) {
                console.log(`   ⚠️  Method 3 error:`, err.message);
            }
        }
        
        // Jika ditemukan duplikasi, BLOCK INSERT
        if (duplicateFound && existingData) {
            await connection.rollback();
            await connection.end();
            console.log(`\n   ❌❌❌ BLOCKING INSERT - RFID "${normalizedRfid}" ALREADY EXISTS ❌❌❌`);
            console.log(`   Existing record ID: ${existingData.id_garment}\n`);
            
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
        
        console.log(`   ✅✅✅ No duplicate found - OK to insert ✅✅✅\n`);

        // Insert data langsung ke MySQL database
        console.log(`📥 Inserting data to MySQL:`);
        console.log(`   Host: ${MYSQL_CONFIG.host}`);
        console.log(`   Database: ${MYSQL_CONFIG.database}`);
        console.log(`   Table: ${MYSQL_CONFIG.table}`);
        console.log(`   Data:`, { rfid_garment: normalizedRfid, item, buyer, style, wo, color, size });

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

        console.log(`✅ Data inserted successfully to MySQL:`);
        console.log(`   RFID: ${normalizedRfid}`);
        console.log(`   Insert ID: ${result.insertId}`);

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
        console.log(`\n🔍 [TRACKING LINE API] Fetching tracking data from: ${backendUrl}`);
        console.log(`🔍 [TRACKING LINE API] Line: ${line}`);
        
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 detik timeout
        
        const response = await fetch(backendUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: controller.signal
        }).catch((fetchError) => {
            clearTimeout(timeoutId);
            console.error(`❌ [TRACKING LINE API] Fetch error:`, fetchError);
            throw fetchError;
        });
        
        clearTimeout(timeoutId);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`⏱️  [TRACKING LINE API] Request duration: ${duration}ms`);
        console.log(`📥 [TRACKING LINE API] Response status: ${response.status} ${response.statusText}`);

        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            console.error(`❌ [TRACKING LINE API] JSON parse error:`, parseError);
            const textData = await response.text();
            console.error(`❌ [TRACKING LINE API] Response text:`, textData);
            throw new Error('Invalid JSON response from backend API');
        }
        
        console.log(`📥 [TRACKING LINE API] Response data:`, JSON.stringify(data, null, 2));
        
        // Tampilkan detail data yang diterima dari API
        if (data.success && data.data) {
            console.log(`\n📊 [TRACKING LINE API] ==========================================`);
            console.log(`📊 [TRACKING LINE API] DATA TRACKING LINE ${line}:`);
            console.log(`📊 [TRACKING LINE API]   Success: ${data.success}`);
            console.log(`📊 [TRACKING LINE API]   Line: ${data.line}`);
            console.log(`📊 [TRACKING LINE API]   Data Details:`);
            console.log(`📊 [TRACKING LINE API]     - good: ${data.data.good}`);
            console.log(`📊 [TRACKING LINE API]     - rework: ${data.data.rework}`);
            console.log(`📊 [TRACKING LINE API]     - reject: ${data.data.reject}`);
            console.log(`📊 [TRACKING LINE API]     - pqc_good: ${data.data.pqc_good}`);
            console.log(`📊 [TRACKING LINE API]     - pqc_rework: ${data.data.pqc_rework}`);
            console.log(`📊 [TRACKING LINE API]     - pqc_reject: ${data.data.pqc_reject}`);
            console.log(`📊 [TRACKING LINE API]     - output_line: ${data.data.output_line}`);
            console.log(`📊 [TRACKING LINE API] ==========================================\n`);
        }

        if (response.ok && data.success) {
            console.log(`✅ [TRACKING LINE API] Tracking data found for line ${line}`);
            console.log(`✅ [TRACKING LINE API] Sending response to client...`);
            return res.json(data);
        } else {
            console.log(`❌ [TRACKING LINE API] Tracking data not found for line ${line}`);
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
 * GET /api/prod-sch/get-wo-breakdown?branch=CJL&line=L1&start_date_from=2025-12-01
 * Proxy ke 10.8.18.60:7186 dengan header GCC-API-KEY
 */
app.get('/api/prod-sch/get-wo-breakdown', async (req, res) => {
    try {
        const { branch, line, start_date_from, start_date_to } = req.query;
        
        // Build query string
        const queryParams = new URLSearchParams();
        if (branch) queryParams.append('branch', branch);
        if (line) queryParams.append('line', line);
        if (start_date_from) queryParams.append('start_date_from', start_date_from);
        if (start_date_to) queryParams.append('start_date_to', start_date_to);
        
        const queryString = queryParams.toString();
        const url = `http://10.8.18.60:7186/api/prod-sch/get-wo-breakdown${queryString ? `?${queryString}` : ''}`;
        
        console.log(`\n🔵 [PROD-SCH PROXY] GET /api/prod-sch/get-wo-breakdown`);
        console.log(`🔵 [PROD-SCH PROXY] URL: ${url}`);
        
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
            console.error(`❌ [PROD-SCH PROXY] Fetch error:`, fetchError);
            throw fetchError;
        });
        
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        console.log(`⏱️  [PROD-SCH PROXY] Request duration: ${duration}ms`);
        console.log(`📥 [PROD-SCH PROXY] Response status: ${response.status} ${response.statusText}`);
        
        let data;
        try {
            const textData = await response.text();
            if (textData) {
                data = JSON.parse(textData);
            }
        } catch (parseError) {
            console.error(`❌ [PROD-SCH PROXY] JSON parse error:`, parseError);
            throw new Error('Invalid JSON response from Production Schedule API');
        }
        
        // Forward response dengan status code yang sama
        res.status(response.status).json(data);
    } catch (error) {
        console.error(`\n❌ [PROD-SCH PROXY] Error:`, error);
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
    console.log(`\n🔍 [WO PRODUCTION BRANCH API] ==========================================`);
    console.log(`🔍 [WO PRODUCTION BRANCH API] ✅ ENDPOINT HIT! Request received`);
    console.log(`🔍 [WO PRODUCTION BRANCH API] Method: ${req.method}`);
    console.log(`🔍 [WO PRODUCTION BRANCH API] Path: ${req.path}`);
    console.log(`🔍 [WO PRODUCTION BRANCH API] Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
    console.log(`🔍 [WO PRODUCTION BRANCH API] Query:`, req.query);
    
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
        console.log(`\n🔍 [WO PRODUCTION BRANCH API] Fetching WO data from: ${backendUrl}`);
        console.log(`🔍 [WO PRODUCTION BRANCH API] Production Branch: ${production_branch}`);
        console.log(`🔍 [WO PRODUCTION BRANCH API] Line: ${line}`);
        
        const startTime = Date.now();
        const controller = new AbortController();
        // Tingkatkan timeout menjadi 30 detik karena API mungkin membutuhkan waktu lebih lama
        const timeoutId = setTimeout(() => {
            console.warn(`⏰ [WO PRODUCTION BRANCH API] Request timeout setelah 30 detik`);
            controller.abort();
        }, 30000); // 30 detik timeout
        
        let response;
        try {
            response = await fetch(backendUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
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
        console.log(`⏱️  [WO PRODUCTION BRANCH API] Request duration: ${duration}ms`);
        console.log(`📥 [WO PRODUCTION BRANCH API] Response status: ${response.status} ${response.statusText}`);
        console.log(`📥 [WO PRODUCTION BRANCH API] Response OK: ${response.ok}`);

        // Cek apakah response OK
        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unable to read error response');
            console.error(`❌ [WO PRODUCTION BRANCH API] Response tidak OK:`, errorText);
            throw new Error(`Backend API returned ${response.status}: ${response.statusText}`);
        }

        let data;
        try {
            const responseText = await response.text();
            console.log(`📥 [WO PRODUCTION BRANCH API] Response text (first 500 chars):`, responseText.substring(0, 500));
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error(`❌ [WO PRODUCTION BRANCH API] JSON parse error:`, parseError);
            console.error(`❌ [WO PRODUCTION BRANCH API] Parse error message:`, parseError.message);
            throw new Error('Invalid JSON response from backend API');
        }

        console.log(`📥 [WO PRODUCTION BRANCH API] Response data:`, JSON.stringify(data, null, 2));
        
        // Tampilkan detail data yang diterima dari API
        if (data.success && data.data && Array.isArray(data.data)) {
            console.log(`\n📊 [WO PRODUCTION BRANCH API] ==========================================`);
            console.log(`📊 [WO PRODUCTION BRANCH API] DATA WO PRODUCTION BRANCH:`);
            console.log(`📊 [WO PRODUCTION BRANCH API]   Success: ${data.success}`);
            console.log(`📊 [WO PRODUCTION BRANCH API]   Count: ${data.count}`);
            console.log(`📊 [WO PRODUCTION BRANCH API]   Line: ${data.line}`);
            console.log(`📊 [WO PRODUCTION BRANCH API]   Production Branch: ${data.production_branch}`);
            console.log(`📊 [WO PRODUCTION BRANCH API]   Data Items: ${data.data.length}`);
            data.data.forEach((item, index) => {
                console.log(`📊 [WO PRODUCTION BRANCH API]   Item ${index + 1}:`);
                console.log(`📊 [WO PRODUCTION BRANCH API]     - WO No: ${item.wo_no}`);
                console.log(`📊 [WO PRODUCTION BRANCH API]     - Style: ${item.style}`);
                console.log(`📊 [WO PRODUCTION BRANCH API]     - Buyer: ${item.buyer}`);
                console.log(`📊 [WO PRODUCTION BRANCH API]     - Qty: ${item.total_qty_order}`);
            });
            console.log(`📊 [WO PRODUCTION BRANCH API] ==========================================\n`);
        }

        if (response.ok && data.success) {
            console.log(`✅ [WO PRODUCTION BRANCH API] WO data found`);
            console.log(`✅ [WO PRODUCTION BRANCH API] Sending response to client...`);
            return res.json(data);
        } else {
            console.warn(`⚠️ [WO PRODUCTION BRANCH API] Response tidak sukses atau data tidak ditemukan`);
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
 * Query data tracking dari MySQL berdasarkan rfid_garment
 * GET /tracking?rfid_garment=
 */
app.get('/tracking', async (req, res) => {
    const { rfid_garment } = req.query;

    if (!rfid_garment) {
        return res.status(400).json({
            success: false,
            message: 'rfid_garment parameter is required',
            timestamp: new Date().toISOString()
        });
    }

    try {
        const connection = await mysql.createConnection({
            host: MYSQL_CONFIG.host,
            user: MYSQL_CONFIG.user,
            password: MYSQL_CONFIG.password,
            database: MYSQL_CONFIG.database,
            connectTimeout: MYSQL_CONFIG.connectTimeout
        });

        // Query untuk cek tracking berdasarkan rfid_garment
        // Asumsi ada table tracking dengan kolom rfid_garment
        const [rows] = await connection.execute(
            `SELECT * FROM tracking WHERE rfid_garment = ? ORDER BY created_at DESC`,
            [rfid_garment]
        );

        await connection.end();

        return res.json({
            success: true,
            data: rows,
            count: rows.length,
            message: rows.length > 0 ? 'Tracking data found' : 'No tracking data found',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('MySQL Error [tracking]:', error);
        return res.status(500).json({
            success: false,
            message: 'Database error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
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
    return await proxyRequest('/wira', req, res);
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
    console.log(`\n📥 [POST /inputRFID] Request received`);
    console.log(`📥 [POST /inputRFID] Body:`, req.body);
    return await proxyRequest('/inputRFID', req, res);
});

/**
 * POST /inputUser - Input user baru ke database
 * Body: { rfid_user, password, nama, nik, bagian, line, telegram, no_hp }
 */
app.post('/inputUser', async (req, res) => {
    console.log(`\n📥 [POST /inputUser] Request received`);
    console.log(`📥 [POST /inputUser] Body:`, req.body);
    return await proxyRequest('/inputUser', req, res);
});

/**
 * POST /scrap - Set RFID garment ke status SCRAP
 * Body: { rfid_garment }
 */
app.post('/scrap', async (req, res) => {
    console.log(`\n📥 [POST /scrap] Request received`);
    console.log(`📥 [POST /scrap] Body:`, req.body);
    return await proxyRequest('/scrap', req, res);
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
    // Test koneksi MySQL saat server start
    checkMySQLConnection().then(result => {
        if (result.connected) {
            console.log('✅ MySQL Connection: OK');
            console.log(`   Host: ${MYSQL_CONFIG.host}`);
            console.log(`   Database: ${MYSQL_CONFIG.database}`);
            console.log(`   Table: ${MYSQL_CONFIG.table}`);
        } else {
            console.log('❌ MySQL Connection: FAILED');
            console.log(`   Error: ${result.error || result.message}`);
        }
    }).catch(err => {
        console.log('❌ MySQL Connection: FAILED');
        console.log(`   Error: ${err.message}`);
    });

    // Test API endpoints - Tampilkan Backend API URL (bukan server.js URL)
    console.log('\n📡 Test Koneksi MySQL & Cek Data API (Backend API):');
    console.log(`   Backend API URL: ${BACKEND_API_URL}`);
    console.log(`   GET  ${BACKEND_API_URL}/user?nik= (Login dengan NIK)`);
    console.log(`   GET  ${BACKEND_API_URL}/login?rfid_user=`);
    console.log(`   GET  ${BACKEND_API_URL}/tracking/line?line= (Tracking data by line)`);
    console.log(`   GET  ${BACKEND_API_URL}/wo/production_branch?production_branch=&line= (WO/Production data)`);
    console.log(`\n📡 Server.js Endpoints (Proxy Server):`);
    console.log(`   Server.js URL: http://${LOCAL_IP}:${PORT}`);
    console.log(`   Backend API URL: ${BACKEND_API_URL}`);
    console.log(`   GET  http://${LOCAL_IP}:${PORT}/user?nik= (Proxy ke Backend API)`);
    console.log(`   GET  http://${LOCAL_IP}:${PORT}/user?rfid_user= (Proxy ke Backend API)`);
    console.log(`   GET  http://${LOCAL_IP}:${PORT}/garment (Proxy ke Backend API)`);
    console.log(`   GET  http://${LOCAL_IP}:${PORT}/tracking/line (Proxy ke Backend API)`);
    console.log(`   GET  http://${LOCAL_IP}:${PORT}/wo/production_branch (Proxy ke Backend API)`);
    console.log(`   GET  http://${LOCAL_IP}:${PORT}/monitoring/line (Proxy ke Backend API)`);
    console.log(`   GET  http://${LOCAL_IP}:${PORT}/wira (Proxy ke Backend API)`);
    console.log(`   GET  http://${LOCAL_IP}:${PORT}/report/wira (Proxy ke Backend API)`);
    console.log(`   GET  http://${LOCAL_IP}:${PORT}/card (Proxy ke Backend API)`);
    console.log(`   GET  http://${LOCAL_IP}:${PORT}/card/progress (Proxy ke Backend API)`);
    console.log(`   GET  http://${LOCAL_IP}:${PORT}/card/done (Proxy ke Backend API)`);
    console.log(`   GET  http://${LOCAL_IP}:${PORT}/card/waiting (Proxy ke Backend API)`);
    console.log(`   POST http://${LOCAL_IP}:${PORT}/inputRFID (Proxy ke Backend API)`);
    console.log(`   POST http://${LOCAL_IP}:${PORT}/inputUser (Proxy ke Backend API)`);
    console.log(`   GET  http://${LOCAL_IP}:${PORT}/api/prod-sch/get-wo-breakdown (Proxy ke Production Schedule API)`);
    console.log(`\n🚀 Server running on:`);
    console.log(`   - http://localhost:${PORT} (Local access)`);
    console.log(`   - http://${LOCAL_IP}:${PORT} (Network access - gunakan IP ini untuk akses dari komputer lain)`);
    console.log(`\n💾 MySQL Database: ${MYSQL_CONFIG.host}/${MYSQL_CONFIG.database}/${MYSQL_CONFIG.table}\n`);
});


/**
 * Mock Server untuk Testing API
 * Server lokal untuk development dan testing
 */

import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';

const app = express();
const PORT = process.env.PORT || 8000; // Port untuk API server
const HOST = '0.0.0.0'; // Listen di semua network interface (bisa diakses dari 10.5.0.7)
const SERVER_IP = '10.8.10.104'; // IP yang digunakan untuk akses dari frontend (untuk akses dari komputer lain)
// Backend API URL - Backend API yang sebenarnya (Python Flask)
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://10.8.10.120:8000';

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// MOCK DATA
// ============================================

// Mock data untuk RFID
const mockRFIDData = {
    line1: {
        id: 'line1',
        name: 'LINE 1',
        statistics: {
            good: 12,
            rework: 2,
            hasper: 3,
            reject: 9,
            total: 26
        },
        pieData: [
            { name: 'Good Product', value: 12, color: '#00e676' },
            { name: 'Rework Product', value: 2, color: '#ffea00' },
            { name: 'Hasper Product', value: 3, color: '#ff9100' },
            { name: 'Reject Product', value: 9, color: '#ff1744' }
        ],
        kpi: {
            onTarget: 70,
            vulnerable: 23,
            offTarget: 7,
            currentKPI: 24
        },
        workOrders: [
            { workOrder: 'WO-001', item: 'Item A', style: 'Style 1', qty: 100 },
            { workOrder: 'WO-002', item: 'Item B', style: 'Style 2', qty: 150 },
            { workOrder: 'WO-003', item: 'Item C', style: 'Style 3', qty: 200 }
        ]
    },
    line2: {
        id: 'line2',
        name: 'LINE 2',
        statistics: {
            good: 15,
            rework: 1,
            hasper: 2,
            reject: 5,
            total: 23
        },
        pieData: [
            { name: 'Good Product', value: 15, color: '#00e676' },
            { name: 'Rework Product', value: 1, color: '#ffea00' },
            { name: 'Hasper Product', value: 2, color: '#ff9100' },
            { name: 'Reject Product', value: 5, color: '#ff1744' }
        ],
        kpi: {
            onTarget: 75,
            vulnerable: 20,
            offTarget: 5,
            currentKPI: 28
        },
        workOrders: [
            { workOrder: 'WO-004', item: 'Item D', style: 'Style 4', qty: 120 },
            { workOrder: 'WO-005', item: 'Item E', style: 'Style 5', qty: 180 }
        ]
    }
};

// Mock data untuk daftar RFID
const mockDaftarRFID = [
    { id: 'RFID-001', status: 'active', line: 'line1', createdAt: '2024-11-01T10:00:00Z' },
    { id: 'RFID-002', status: 'active', line: 'line1', createdAt: '2024-11-01T11:00:00Z' },
    { id: 'RFID-003', status: 'inactive', line: 'line2', createdAt: '2024-11-01T12:00:00Z' },
    { id: 'RFID-004', status: 'active', line: 'line2', createdAt: '2024-11-01T13:00:00Z' }
];

// Tidak menggunakan mock data lagi, langsung menggunakan API backend yang sebenarnya

// Mock data untuk production statistics (Good, Reject, Rework)
const mockProductionData = {
    overall: {
        good: 45,
        reject: 18,
        rework: 8,
        hasper: 12,
        total: 83,
        date: new Date().toISOString().split('T')[0]
    },
    byLine: {
        line1: {
            good: 12,
            reject: 9,
            rework: 2,
            hasper: 3,
            total: 26
        },
        line2: {
            good: 15,
            reject: 5,
            rework: 1,
            hasper: 2,
            total: 23
        },
        line3: {
            good: 18,
            reject: 4,
            rework: 5,
            hasper: 7,
            total: 34
        }
    },
    daily: [
        { date: '2024-11-01', good: 40, reject: 15, rework: 7 },
        { date: '2024-11-02', good: 42, reject: 16, rework: 8 },
        { date: '2024-11-03', good: 45, reject: 18, rework: 8 }
    ]
};

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
const BACKEND_API_URL_CHECK = process.env.BACKEND_API_URL || 'http://10.8.10.120:8000';

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
// PRODUCTION DATA ROUTES
// ============================================

// Get production data (Good, Reject, Rework)
app.get('/api/production/data', (req, res) => {
    const { lineId } = req.query;

    if (lineId) {
        // Get data by line
        const lineData = mockProductionData.byLine[`line${lineId}`];

        if (!lineData) {
            return res.status(404).json({
                success: false,
                error: 'Line tidak ditemukan'
            });
        }

        return res.json({
            success: true,
            data: {
                lineId: `line${lineId}`,
                ...lineData
            },
            timestamp: new Date().toISOString()
        });
    }

    // Get overall data
    res.json({
        success: true,
        data: mockProductionData,
        timestamp: new Date().toISOString()
    });
});

// Production Statistics
app.get('/api/production/statistics', (req, res) => {
    const allStats = Object.values(mockRFIDData).reduce((acc, line) => {
        acc.good += line.statistics.good;
        acc.rework += line.statistics.rework;
        acc.hasper += line.statistics.hasper;
        acc.reject += line.statistics.reject;
        acc.total += line.statistics.total;
        return acc;
    }, { good: 0, rework: 0, hasper: 0, reject: 0, total: 0 });

    res.json({
        success: true,
        data: {
            overall: allStats,
            lines: Object.values(mockRFIDData).map(line => ({
                lineId: line.id,
                lineName: line.name,
                statistics: line.statistics
            }))
        },
        timestamp: new Date().toISOString()
    });
});

// Line Data by ID
app.get('/api/line/:id', (req, res) => {
    const { id } = req.params;
    const lineData = mockRFIDData[`line${id}`] || mockRFIDData.line1;

    if (!lineData) {
        return res.status(404).json({
            success: false,
            error: 'Line not found'
        });
    }

    res.json({
        success: true,
        data: lineData,
        timestamp: new Date().toISOString()
    });
});

// Get All Lines
app.get('/api/line', (req, res) => {
    res.json({
        success: true,
        data: Object.values(mockRFIDData),
        timestamp: new Date().toISOString()
    });
});

// Daftar RFID - Get All
app.get('/api/rfid', (req, res) => {
    res.json({
        success: true,
        data: mockDaftarRFID,
        count: mockDaftarRFID.length,
        timestamp: new Date().toISOString()
    });
});

// Daftar RFID - Get By ID
app.get('/api/rfid/:id', (req, res) => {
    const { id } = req.params;
    const rfid = mockDaftarRFID.find(r => r.id === id);

    if (!rfid) {
        return res.status(404).json({
            success: false,
            error: 'RFID not found'
        });
    }

    res.json({
        success: true,
        data: rfid,
        timestamp: new Date().toISOString()
    });
});

// Daftar RFID - Create
app.post('/api/rfid', (req, res) => {
    const { id, status, line } = req.body;

    if (!id) {
        return res.status(400).json({
            success: false,
            error: 'RFID ID is required'
        });
    }

    const newRFID = {
        id,
        status: status || 'active',
        line: line || 'line1',
        createdAt: new Date().toISOString()
    };

    mockDaftarRFID.push(newRFID);

    res.status(201).json({
        success: true,
        data: newRFID,
        message: 'RFID created successfully',
        timestamp: new Date().toISOString()
    });
});

// Daftar RFID - Update
app.put('/api/rfid/:id', (req, res) => {
    const { id } = req.params;
    const { status, line } = req.body;

    const rfidIndex = mockDaftarRFID.findIndex(r => r.id === id);

    if (rfidIndex === -1) {
        return res.status(404).json({
            success: false,
            error: 'RFID not found'
        });
    }

    if (status) mockDaftarRFID[rfidIndex].status = status;
    if (line) mockDaftarRFID[rfidIndex].line = line;

    res.json({
        success: true,
        data: mockDaftarRFID[rfidIndex],
        message: 'RFID updated successfully',
        timestamp: new Date().toISOString()
    });
});

// Daftar RFID - Delete
app.delete('/api/rfid/:id', (req, res) => {
    const { id } = req.params;
    const rfidIndex = mockDaftarRFID.findIndex(r => r.id === id);

    if (rfidIndex === -1) {
        return res.status(404).json({
            success: false,
            error: 'RFID not found'
        });
    }

    const deleted = mockDaftarRFID.splice(rfidIndex, 1)[0];

    res.json({
        success: true,
        data: deleted,
        message: 'RFID deleted successfully',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// API ENDPOINTS - MySQL Data Query
// ============================================

/**
 * Query data user dari API backend berdasarkan NIK
 * GET /user?nik=
 * Endpoint ini memanggil API backend di http://10.8.10.120:8000/user?nik=...
 */
app.get('/user', async (req, res) => {
    const { nik } = req.query;
    
    console.log(`\n📥 [SERVER] ==========================================`);
    console.log(`📥 [SERVER] Received request: GET /user`);
    console.log(`📥 [SERVER] Query params:`, req.query);
    console.log(`📥 [SERVER] NIK: ${nik}`);
    console.log(`📥 [SERVER] Client IP: ${req.ip || req.connection.remoteAddress}`);
    console.log(`📥 [SERVER] Timestamp: ${new Date().toISOString()}`);

    if (!nik) {
        console.log(`❌ [SERVER] NIK parameter is missing`);
        return res.status(400).json({
            success: false,
            message: 'NIK parameter is required',
            timestamp: new Date().toISOString()
        });
    }

    try {
        // Panggil API backend yang sebenarnya: http://10.8.10.120:8000/user?nik=...
        const backendUrl = `http://10.8.10.120:8000/user?nik=${encodeURIComponent(nik)}`;
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

        // Cek apakah user ditemukan - prioritas: cek data.user dulu
        if (data.user && data.user.nik) {
            // User ditemukan
            console.log(`✅ [USER API] User found: ${data.user?.nama} (NIK: ${data.user?.nik})`);
            console.log(`📤 [SERVER] Sending success response to client`);
            console.log(`📥 [SERVER] ==========================================\n`);
            return res.json({
                success: true,
                debug: data.debug || false,
                password_hash: data.password_hash || '',
                user: data.user,
                timestamp: new Date().toISOString()
            });
        } else if (response.ok && data.success && data.user) {
            // Fallback: cek response.ok dan data.success
            console.log(`✅ [USER API] User found (fallback): ${data.user?.nama} (NIK: ${data.user?.nik})`);
            console.log(`📤 [SERVER] Sending success response to client`);
            console.log(`📥 [SERVER] ==========================================\n`);
            return res.json({
                success: true,
                debug: data.debug || false,
                password_hash: data.password_hash || '',
                user: data.user,
                timestamp: new Date().toISOString()
            });
        } else {
            // NIK tidak ditemukan
            console.log(`❌ [USER API] User not found for NIK: ${nik}`);
            console.log(`❌ [USER API] Response details:`, {
                ok: response.ok,
                status: response.status,
                dataSuccess: data.success,
                hasUser: !!data.user,
                dataKeys: Object.keys(data || {})
            });
            console.log(`📤 [SERVER] Sending error response to client`);
            console.log(`📥 [SERVER] ==========================================\n`);
            return res.status(response.status || 404).json({
                success: false,
                message: 'NIK tidak ada',
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
            errorMessage = 'Tidak dapat terhubung ke backend API. Pastikan http://10.8.10.120:8000 berjalan.';
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
 * Query data garment dari MySQL berdasarkan rfid_garment
 * GET /garment?rfid_garment=
 */
app.get('/garment', async (req, res) => {
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

        // Query untuk cek data garment berdasarkan rfid_garment
        const [rows] = await connection.execute(
            `SELECT * FROM ${MYSQL_CONFIG.table} WHERE rfid_garment = ? LIMIT 1`,
            [rfid_garment]
        );

        await connection.end();

        if (rows.length > 0) {
            return res.json({
                success: true,
                data: rows[0],
                message: 'Garment data found',
                timestamp: new Date().toISOString()
            });
        } else {
            return res.status(404).json({
                success: false,
                message: 'Garment data not found',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('MySQL Error [garment GET]:', error);
        return res.status(500).json({
            success: false,
            message: 'Database error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
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
 * Get tracking data by line (proxy ke backend API)
 * GET /tracking/line?line=1
 */
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
        // Panggil backend API: http://10.8.10.120:8000/tracking/line?line=...
        const backendUrl = `http://10.8.10.120:8000/tracking/line?line=${encodeURIComponent(line)}`;
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
            errorMessage = 'Tidak dapat terhubung ke backend API. Pastikan http://10.8.10.120:8000 berjalan.';
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
 * Proxy untuk WO/Production Branch API
 * GET /wo/production_branch?production_branch=MJ1&line=L1
 */
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
        // Panggil backend API: http://10.8.10.120:8000/wo/production_branch?production_branch=...&line=...
        const backendUrl = `http://10.8.10.120:8000/wo/production_branch?production_branch=${encodeURIComponent(production_branch)}&line=${encodeURIComponent(line)}`;
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
                throw new Error('Request timeout - Backend API tidak merespon dalam 30 detik. Pastikan http://10.8.10.120:8000 berjalan dan dapat diakses.');
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
            errorMessage = 'Tidak dapat terhubung ke backend API. Pastikan http://10.8.10.120:8000 berjalan.';
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
    console.log(`   Server.js URL: http://${SERVER_IP}:${PORT}`);
    console.log(`   GET  http://${SERVER_IP}:${PORT}/user?nik= (Proxy ke Backend API)`);
    console.log(`   GET  http://${SERVER_IP}:${PORT}/garment?rfid_garment= (Query MySQL)`);
    console.log(`   POST http://${SERVER_IP}:${PORT}/garment (Insert data langsung ke MySQL)`);
    console.log(`   GET  http://${SERVER_IP}:${PORT}/tracking?rfid_garment= (Query MySQL)`);
    console.log(`\n🚀 Server running on:`);
    console.log(`   - http://localhost:${PORT} (Local access)`);
    console.log(`   - http://10.8.10.104:${PORT} (Network access - gunakan IP ini untuk akses dari komputer lain)`);
    console.log(`   - http://${SERVER_IP}:${PORT} (Alternative network access)`);
    console.log(`\n💾 MySQL Database: ${MYSQL_CONFIG.host}/${MYSQL_CONFIG.database}/${MYSQL_CONFIG.table}\n`);
});


/**
 * User Tracking System
 * Script untuk melihat data user yang sudah login
 * 
 * Usage: npm run user
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path file untuk menyimpan data user
const USER_LOG_FILE = path.join(__dirname, 'user_logs.json');

/**
 * Membaca dan menampilkan data user yang sudah login
 */
function displayUserLogs() {
    try {
        // Cek apakah file ada
        if (!fs.existsSync(USER_LOG_FILE)) {
            console.log('\n' + '='.repeat(80));
            console.log('📋 USER TRACKING SYSTEM');
            console.log('='.repeat(80));
            console.log('\n⚠️  Belum ada data user yang login');
            console.log('   File user_logs.json akan dibuat otomatis saat ada user yang login pertama kali.');
            console.log('\n💡 Cara menggunakan:');
            console.log('   1. Pastikan server.js sedang berjalan (npm run server)');
            console.log('   2. Login melalui aplikasi web');
            console.log('   3. Data login akan otomatis tersimpan di user_logs.json');
            console.log('   4. Jalankan "npm run user" lagi untuk melihat data');
            console.log('\n📁 File akan dibuat di: ' + USER_LOG_FILE);
            console.log('='.repeat(80) + '\n');
            return;
        }

        // Baca file JSON
        const fileContent = fs.readFileSync(USER_LOG_FILE, 'utf-8');
        const userLogs = JSON.parse(fileContent);

        if (!userLogs || !Array.isArray(userLogs) || userLogs.length === 0) {
            console.log('📋 Tidak ada data user yang login');
            return;
        }

        // Tampilkan data
        console.log('\n' + '='.repeat(80));
        console.log('📊 DATA USER YANG SUDAH LOGIN');
        console.log('='.repeat(80));
        console.log(`Total Login: ${userLogs.length}\n`);

        // Group by NIK untuk menghitung jumlah login per user
        const userStats = {};
        userLogs.forEach(log => {
            const nik = log.nik || 'Unknown';
            if (!userStats[nik]) {
                userStats[nik] = {
                    nik: nik,
                    name: log.name || log.nama || 'Unknown',
                    jabatan: log.jabatan || log.bagian || 'Unknown',
                    loginCount: 0,
                    lastLogin: null,
                    firstLogin: null
                };
            }
            userStats[nik].loginCount++;
            const loginTime = new Date(log.loginTime);
            if (!userStats[nik].lastLogin || loginTime > new Date(userStats[nik].lastLogin)) {
                userStats[nik].lastLogin = log.loginTime;
            }
            if (!userStats[nik].firstLogin || loginTime < new Date(userStats[nik].firstLogin)) {
                userStats[nik].firstLogin = log.loginTime;
            }
        });

        // Tampilkan summary per user
        console.log('📈 SUMMARY PER USER:');
        console.log('-'.repeat(80));
        Object.values(userStats).forEach((stat, index) => {
            console.log(`\n${index + 1}. ${stat.name} (NIK: ${stat.nik})`);
            console.log(`   Jabatan: ${stat.jabatan}`);
            console.log(`   Total Login: ${stat.loginCount}x`);
            console.log(`   First Login: ${new Date(stat.firstLogin).toLocaleString('id-ID')}`);
            console.log(`   Last Login: ${new Date(stat.lastLogin).toLocaleString('id-ID')}`);
        });

        // Tampilkan detail semua login
        console.log('\n' + '='.repeat(80));
        console.log('📝 DETAIL SEMUA LOGIN:');
        console.log('='.repeat(80));

        userLogs.forEach((log, index) => {
            console.log(`\n${index + 1}. Login #${index + 1}`);
            console.log(`   NIK: ${log.nik || 'Unknown'}`);
            console.log(`   Nama: ${log.name || log.nama || 'Unknown'}`);
            console.log(`   Jabatan: ${log.jabatan || log.bagian || 'Unknown'}`);
            console.log(`   Role: ${log.role || 'user'}`);
            console.log(`   IP Address: ${log.ipAddress || 'Unknown'}`);
            console.log(`   User Agent: ${log.userAgent || 'Unknown'}`);
            console.log(`   Login Time: ${new Date(log.loginTime).toLocaleString('id-ID')}`);
            if (log.logoutTime) {
                console.log(`   Logout Time: ${new Date(log.logoutTime).toLocaleString('id-ID')}`);
                const duration = new Date(log.logoutTime) - new Date(log.loginTime);
                const hours = Math.floor(duration / 3600000);
                const minutes = Math.floor((duration % 3600000) / 60000);
                console.log(`   Duration: ${hours}h ${minutes}m`);
            } else {
                console.log(`   Status: Masih Login`);
            }
        });

        console.log('\n' + '='.repeat(80));
        console.log('✅ Selesai');
        console.log('='.repeat(80) + '\n');

    } catch (error) {
        console.error('❌ Error membaca data user:', error.message);
        console.error(error);
    }
}

// Jalankan
displayUserLogs();

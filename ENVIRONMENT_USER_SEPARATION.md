# Pemisahan Data User Per Environment (CLN, MJL, MJL2)

## 📋 Ringkasan

Sistem sekarang memisahkan data user per environment (CLN, MJL, MJL2) dan melakukan auto-logout setiap hari pada jam 00:00.

## 🔄 Perubahan yang Dilakukan

### 1. Pemisahan Active Sessions Per Environment

**Sebelum:**
```javascript
// Format: { [lineNumber]: { nik, name, ... } }
activeSessions.set('1', { nik: '123', name: 'User 1', ... });
```

**Sesudah:**
```javascript
// Format: { [environment_lineNumber]: { nik, name, ..., environment } }
// Contoh: 'CLN_1', 'MJL_1', 'MJL2_1'
activeSessions.set('CLN_1', { nik: '123', name: 'User 1', environment: 'CLN', ... });
activeSessions.set('MJL_1', { nik: '456', name: 'User 2', environment: 'MJL', ... });
activeSessions.set('MJL2_1', { nik: '789', name: 'User 3', environment: 'MJL2', ... });
```

### 2. Filter User Logs Berdasarkan Environment

**`saveUserLogin()`:**
- Menyimpan `environment: CURRENT_ENV` ke `user_logs.json`
- Menggunakan key dengan environment prefix: `{ENV}_{lineNumber}`

**`loadActiveSessionsFromFile()`:**
- Hanya load user dari environment yang sesuai
- Filter berdasarkan `log.environment` atau `log.backendIP`
- Hanya load jika `logEnvironment === CURRENT_ENV`

### 3. Update Semua Endpoint yang Menggunakan activeSessions

**`/api/active-users`:**
- Menggunakan key dengan environment prefix: `{ENV}_{lineNumber}`
- Hanya return user dari environment yang sesuai

**`/garment/folding/out`:**
- Hanya cari user di environment yang sesuai
- Filter berdasarkan key prefix

**`/api/auth/logout`:**
- Hanya logout user dari environment yang sesuai
- Menggunakan key dengan environment prefix

### 4. Auto-Logout Setiap Hari

**Fitur:**
- Logout otomatis semua user setiap hari pada jam 00:00 (midnight)
- Hanya logout user dari environment yang sesuai
- Update `logoutTime` di `user_logs.json`
- Hapus dari `activeSessions`
- Recurring: schedule untuk hari berikutnya

## 🔐 Keamanan dan Isolasi

### ✅ Data User Terpisah Per Environment

1. **Active Sessions:**
   - CLN: Key format `CLN_1`, `CLN_2`, ...
   - MJL: Key format `MJL_1`, `MJL_2`, ...
   - MJL2: Key format `MJL2_1`, `MJL2_2`, ...

2. **User Logs:**
   - Setiap log menyimpan `environment: CURRENT_ENV`
   - Filter berdasarkan environment saat load

3. **Login Validation:**
   - User login hanya valid untuk environment yang sesuai
   - User dari CLN tidak bisa akses data MJL atau MJL2

### ✅ Auto-Logout Harian

1. **Waktu:** Setiap hari jam 00:00 (midnight)
2. **Scope:** Hanya logout user dari environment yang sesuai
3. **Proses:**
   - Update `logoutTime` di `user_logs.json`
   - Hapus dari `activeSessions`
   - Log jumlah user yang di-logout

## 📊 Contoh Data

### Active Sessions (In-Memory)

```javascript
{
  'CLN_1': { nik: '001', name: 'User CLN', environment: 'CLN', ... },
  'CLN_2': { nik: '002', name: 'User CLN 2', environment: 'CLN', ... },
  'MJL_1': { nik: '101', name: 'User MJL', environment: 'MJL', ... },
  'MJL2_1': { nik: '201', name: 'User MJL2', environment: 'MJL2', ... }
}
```

### User Logs (File: user_logs.json)

```json
[
  {
    "nik": "001",
    "name": "User CLN",
    "environment": "CLN",
    "backendIP": "10.8.0.104",
    "loginTime": "2026-02-09T08:00:00.000Z",
    "logoutTime": null
  },
  {
    "nik": "101",
    "name": "User MJL",
    "environment": "MJL",
    "backendIP": "10.5.0.106",
    "loginTime": "2026-02-09T08:00:00.000Z",
    "logoutTime": null
  }
]
```

## 🔄 Alur Kerja

### 1. User Login

```
User login di CLN (10.8.0.104:8000)
    ↓
saveUserLogin() menyimpan:
  - environment: 'CLN'
  - backendIP: '10.8.0.104'
    ↓
activeSessions.set('CLN_1', { ... })
```

### 2. Load Active Sessions

```
Server start untuk CLN
    ↓
loadActiveSessionsFromFile()
    ↓
Filter: hanya load log dengan environment === 'CLN'
    ↓
activeSessions.set('CLN_1', { ... })
```

### 3. Get Active Users

```
GET /api/active-users?line=1 (dari CLN)
    ↓
Cari key: 'CLN_1'
    ↓
Return user dari CLN_1
```

### 4. Auto-Logout

```
Jam 00:00 (midnight)
    ↓
performDailyAutoLogout()
    ↓
Filter: hanya user dengan key.startsWith('CLN_')
    ↓
Update logoutTime di user_logs.json
    ↓
Hapus dari activeSessions
    ↓
Schedule untuk hari berikutnya
```

## 🧪 Testing

### Test 1: Login di CLN
1. Login di CLN (10.8.0.104:8000)
2. Cek `activeSessions` → harus ada key `CLN_1`
3. Cek `user_logs.json` → harus ada `environment: 'CLN'`

### Test 2: Login di MJL
1. Login di MJL (10.5.0.106:8000)
2. Cek `activeSessions` → harus ada key `MJL_1`
3. Cek `user_logs.json` → harus ada `environment: 'MJL'`

### Test 3: Data Tidak Tercampur
1. Login user di CLN
2. Login user di MJL
3. Cek `activeSessions` → harus ada `CLN_1` dan `MJL_1` (terpisah)
4. Get active users dari CLN → hanya return user CLN
5. Get active users dari MJL → hanya return user MJL

### Test 4: Auto-Logout
1. Login beberapa user
2. Tunggu sampai jam 00:00 (atau test dengan mengubah waktu)
3. Cek `activeSessions` → semua user dari environment tersebut harus dihapus
4. Cek `user_logs.json` → semua user harus punya `logoutTime`

## 📝 Catatan Penting

1. **Environment Detection:**
   - Environment ditentukan dari command line argument (`cln`, `mjl`, `mjl2`)
   - Atau dari `BACKEND_IP` (10.8.0.104 = CLN, 10.5.0.106 = MJL, 10.5.0.99 = MJL2)

2. **Backward Compatibility:**
   - User logs lama tanpa `environment` akan di-detect dari `backendIP`
   - Migration otomatis saat load

3. **Auto-Logout:**
   - Hanya logout user dari environment yang sesuai
   - Tidak mempengaruhi user dari environment lain
   - Recurring: otomatis schedule untuk hari berikutnya

4. **Data Isolation:**
   - Setiap environment memiliki data user yang terpisah
   - Tidak ada kesamaan data antar environment
   - User dari CLN tidak bisa akses data MJL atau MJL2

# Dokumentasi Sistem Folding Out

## 📋 Ringkasan

Sistem Folding Out adalah fitur untuk melakukan checkout RFID garment dari area Folding. Sistem ini memerlukan validasi NIK user yang sedang login di table tertentu sebelum checkout dapat dilakukan.

## 🔄 Alur Kerja Sistem

### 1. **Frontend: Dashboard Folding**

**Lokasi:** `src/pages/DashboardFolding.tsx`

#### A. Table Detail Modal

Saat user membuka table detail modal:

```typescript
// Fetch active user untuk table ini
const { data: activeUserData, refetch: refetchActiveUser } = useQuery({
    queryKey: ['active-user-folding-modal', tableNumber],
    queryFn: async () => {
        const response = await getActiveUsers(tableNumber);
        if (!response.success || !response.data) {
            return null;
        }
        return Array.isArray(response.data) ? response.data[0] : response.data;
    },
    refetchInterval: 10000, // Refresh setiap 10 detik
    staleTime: 0, // Data selalu fresh
    refetchOnMount: true,
    refetchOnWindowFocus: true,
});
```

**Proses:**
1. Frontend memanggil `getActiveUsers(tableNumber)` untuk mendapatkan user yang login di table tersebut
2. API endpoint: `GET /api/active-users?line={tableNumber}`
3. Response berisi data user (NIK, name, jabatan, line) jika ada user yang login
4. Jika tidak ada user, `activeUserData` akan `null`

#### B. Scanning Modal

Saat user melakukan checkout:

```typescript
<ScanningFinishingModal
    type="folding"
    defaultAction="checkout"
    tableNumber={tableNumber}
    nik={activeUserData?.nik || undefined}
    onSuccess={...}
/>
```

**Proses:**
1. Modal menerima `nik` dari `activeUserData`
2. Jika `activeUserData` null, `nik` akan `undefined`
3. Modal akan menampilkan error jika NIK tidak valid saat checkout

### 2. **Frontend: Scanning Modal Validation**

**Lokasi:** `src/components/ScanningFinishingModal.tsx`

#### A. Validasi NIK

```typescript
// Validasi: NIK harus ada dan valid untuk checkout folding
const trimmedNik = nik ? nik.trim() : '';

// Validasi dasar: NIK tidak boleh kosong atau "00000000"
if (!trimmedNik || trimmedNik === '' || trimmedNik === '00000000') {
    throw new Error('NIK user tidak tersedia atau tidak valid. Pastikan user sudah login di table ini sebelum melakukan checkout.');
}

// Validasi: Pastikan NIK tidak mengandung karakter dummy atau placeholder
const isDummyNik = trimmedNik.length >= 6 && (
    trimmedNik.startsWith('123456') || 
    trimmedNik.startsWith('234567') || 
    // ... pola dummy lainnya
);

if (isDummyNik) {
    throw new Error('NIK user tidak tersedia. Pastikan user sudah login di table ini sebelum melakukan checkout.');
}
```

**Validasi yang dilakukan:**
- ✅ NIK tidak boleh kosong
- ✅ NIK tidak boleh "00000000"
- ✅ NIK tidak boleh dummy/placeholder (minimal 6 digit berurutan)
- ✅ NIK pendek seperti "01", "02" **DIIZINKAN** (tidak ada validasi panjang minimum)

#### B. API Call

```typescript
response = await foldingCheckOut(trimmedRfid, trimmedNik, tableNumber);
```

**Proses:**
1. Memanggil `foldingCheckOut()` dari `src/config/api.ts`
2. Endpoint: `POST /garment/folding/out?rfid_garment={rfid}`
3. Body: `{ nik: "01", table: "1" }`

### 3. **Backend: API Endpoint**

**Lokasi:** `server.js`

#### A. Endpoint `/api/active-users`

```javascript
app.get('/api/active-users', (req, res) => {
    const { line } = req.query;
    
    if (line) {
        // Get user by line/table number
        let user = activeSessions.get(line.toString());
        
        // Jika tidak ditemukan, coba cari dengan matching yang lebih fleksibel
        if (!user) {
            for (const [lineNum, sessionUser] of activeSessions.entries()) {
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
            return res.json({ success: true, data: user });
        } else {
            return res.json({ success: false, data: null });
        }
    }
});
```

**Proses:**
1. Mencari user di `activeSessions` berdasarkan `line` (table number)
2. Matching fleksibel: exact match, number match, atau line property match
3. Return user data jika ditemukan, atau `null` jika tidak ditemukan

#### B. Endpoint `/garment/folding/out`

```javascript
app.post('/garment/folding/out', async (req, res) => {
    const { nik, table } = req.body || {};
    const rfid_garment = req.query.rfid_garment;
    
    // Extract table number dari body atau dari active session berdasarkan NIK
    let tableNumber = table;
    if (!tableNumber && nik) {
        // Cari table number dari active sessions berdasarkan NIK
        for (const [lineNum, user] of activeSessions.entries()) {
            if (user.nik === nik) {
                tableNumber = lineNum;
                break;
            }
        }
    }
    
    // Proxy request ke backend API
    const response = await fetch(`${BACKEND_API_URL}/garment/folding/out?rfid_garment=${rfid_garment}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            [API_KEY_HEADER]: API_KEY
        },
        body: JSON.stringify(req.body || {})
    });
    
    // Simpan data checkout jika berhasil
    if (isSuccess && nik && rfid_garment && tableNumber) {
        saveFoldingCheckout(tableNumber, rfid_garment, nik, data);
    }
    
    return res.status(response.status).json(data);
});
```

**Proses:**
1. Menerima request dengan `nik` dan `table` di body
2. Jika `table` tidak ada, cari dari `activeSessions` berdasarkan NIK
3. Proxy request ke backend API dengan NIK dan table
4. Simpan data checkout ke file jika berhasil

### 4. **Backend: Active Sessions Management**

**Lokasi:** `server.js`

#### A. Load Active Sessions dari File

```javascript
function loadActiveSessionsFromFile() {
    const userLogs = JSON.parse(fs.readFileSync(USER_LOG_FILE, 'utf-8'));
    
    userLogs.forEach((log) => {
        const lineNumber = extractLineNumber(log.name) || log.line;
        
        if (lineNumber && 
            (log.jabatan === 'FOLDING' || log.bagian === 'FOLDING') && 
            !log.logoutTime) {
            activeSessions.set(lineNumber.toString(), {
                nik: log.nik,
                name: log.name,
                jabatan: log.jabatan,
                line: lineNumber.toString(),
                loginTime: log.loginTime,
                ipAddress: log.ipAddress
            });
        }
    });
}
```

**Proses:**
1. Load data dari `user_logs.json` saat server start
2. Filter user dengan:
   - `jabatan === 'FOLDING'` atau `bagian === 'FOLDING'`
   - `logoutTime === null` (belum logout)
3. Extract line number dari `name` atau gunakan `line` langsung
4. Simpan ke `activeSessions` Map dengan key `lineNumber.toString()`

#### B. Save User Login

```javascript
function saveUserLogin(userData, req) {
    // Simpan ke file user_logs.json
    // ...
    
    // Simpan ke active sessions jika jabatan adalah FOLDING
    const lineNumber = extractLineNumber(loginData.name) || loginData.line;
    
    if (lineNumber && (loginData.jabatan === 'FOLDING' || loginData.bagian === 'FOLDING')) {
        activeSessions.set(lineNumber.toString(), {
            nik: loginData.nik,
            name: loginData.name,
            jabatan: loginData.jabatan,
            line: lineNumber.toString(),
            loginTime: loginData.loginTime,
            ipAddress: loginData.ipAddress
        });
    }
}
```

**Proses:**
1. Saat user login, simpan ke `user_logs.json`
2. Jika jabatan adalah FOLDING, tambahkan ke `activeSessions`
3. Key: `lineNumber.toString()` (contoh: "1", "2", "3")

#### C. Extract Line Number

```javascript
const extractLineNumber = (name) => {
    if (!name) return null;
    const match = name.match(/\d+/);
    return match ? parseInt(match[0]) : null;
};
```

**Proses:**
1. Cari angka pertama di nama user dengan regex `/\d+/`
2. Contoh:
   - `"FO_1"` → `1`
   - `"01"` → `1`
   - `"TABLE 5"` → `5`
   - `"MEJA 4"` → `4`

## ⚠️ Masalah yang Terjadi

### 1. **Error: "NIK user tidak tersedia atau tidak valid"**

#### Penyebab:
- User belum login di table tersebut
- `activeUserData` null karena tidak ada user di `activeSessions`
- NIK tidak ter-pass ke `ScanningFinishingModal`

#### Alur Masalah:
1. User membuka table detail modal
2. Frontend memanggil `GET /api/active-users?line=1`
3. Backend mencari di `activeSessions` dengan key "1"
4. Jika tidak ditemukan, return `{ success: false, data: null }`
5. Frontend `activeUserData` menjadi `null`
6. `ScanningFinishingModal` menerima `nik={undefined}`
7. Saat checkout, validasi NIK gagal → Error

### 2. **User ada di `user_logs.json` tapi tidak ter-load ke `activeSessions`**

#### Penyebab:
1. **Server start sebelum user login:**
   - `loadActiveSessionsFromFile()` hanya dipanggil saat server start
   - Jika user login setelah server start, data tidak ter-load dari file
   - Data hanya masuk ke `activeSessions` via `saveUserLogin()` saat login

2. **Format nama user tidak sesuai:**
   - `extractLineNumber()` mencari angka di nama
   - Jika nama adalah "01" (tanpa prefix), akan extract "01" → `1` ✅
   - Jika nama adalah "FO_1", akan extract "1" → `1` ✅
   - Jika nama tidak mengandung angka, akan gunakan `log.line` ✅

3. **Environment detection:**
   - Logging khusus untuk MJL2 hanya muncul jika `CURRENT_ENV === 'MJL2'`
   - Pastikan server dijalankan dengan `node server.js mjl2`

4. **Data di `user_logs.json` sudah logout:**
   - Jika `logoutTime` tidak null, user tidak akan ter-load
   - Hanya user dengan `logoutTime === null` yang ter-load

### 3. **Mismatch Line/Table Number**

#### Penyebab:
- Table number yang diminta tidak cocok dengan key di `activeSessions`
- Contoh:
  - Frontend request: `line=1` (number)
  - `activeSessions` key: `"1"` (string)
  - Matching harus dilakukan dengan konversi type

#### Solusi:
- Matching fleksibel di endpoint `/api/active-users`:
  ```javascript
  if (lineNum === line.toString() ||
      lineNum === line ||
      parseInt(lineNum) === parseInt(line) ||
      sessionUser.line === line.toString() ||
      sessionUser.line === line) {
      user = sessionUser;
      break;
  }
  ```

## 🔧 Solusi yang Sudah Diterapkan

### 1. **Validasi NIK yang Lebih Fleksibel**

**Sebelum:**
```typescript
if (!nik || nik.trim() === '' || nik === '00000000' || nik.length < 4) {
    throw new Error('NIK tidak valid');
}
```

**Sesudah:**
```typescript
const trimmedNik = nik ? nik.trim() : '';

// Hanya tolak jika kosong atau "00000000"
if (!trimmedNik || trimmedNik === '' || trimmedNik === '00000000') {
    throw new Error('NIK tidak valid');
}

// Hanya tolak dummy NIK yang jelas (minimal 6 digit berurutan)
const isDummyNik = trimmedNik.length >= 6 && (
    trimmedNik.startsWith('123456') || 
    // ... pola dummy lainnya
);
```

**Hasil:**
- ✅ NIK pendek seperti "01", "02" sekarang **DIIZINKAN**
- ✅ Validasi lebih fokus pada NIK yang benar-benar invalid

### 2. **Matching Fleksibel di `/api/active-users`**

**Sebelum:**
```javascript
const user = activeSessions.get(line.toString());
if (!user) {
    return res.json({ success: false, data: null });
}
```

**Sesudah:**
```javascript
let user = activeSessions.get(line.toString());

if (!user) {
    // Cari dengan matching fleksibel
    for (const [lineNum, sessionUser] of activeSessions.entries()) {
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
```

**Hasil:**
- ✅ Matching lebih robust untuk berbagai format line/table number
- ✅ Handle perbedaan type (string vs number)

### 3. **Logging Detail untuk Debugging**

**Tambahan:**
- Logging di `loadActiveSessionsFromFile()` untuk melihat proses loading
- Logging di `saveUserLogin()` untuk melihat proses login
- Logging di `/api/active-users` untuk melihat proses pencarian
- Logging di `/garment/folding/out` untuk melihat proses checkout
- Logging khusus untuk MJL2 environment

**Hasil:**
- ✅ Lebih mudah untuk debugging masalah
- ✅ Dapat melihat alur data dari awal sampai akhir

## 📊 Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Login                                               │
│    POST /api/auth/login                                    │
│    → saveUserLogin()                                       │
│    → Simpan ke user_logs.json                              │
│    → Tambah ke activeSessions (jika FOLDING)               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. User Buka Table Detail Modal                            │
│    GET /api/active-users?line=1                            │
│    → Cari di activeSessions dengan key "1"                 │
│    → Return user data atau null                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. User Scan RFID untuk Checkout                           │
│    ScanningFinishingModal                                   │
│    → Validasi NIK (tidak kosong, bukan dummy)              │
│    → POST /garment/folding/out?rfid_garment=xxx            │
│    → Body: { nik: "01", table: "1" }                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Backend Process Checkout                                │
│    → Cari table number dari activeSessions (jika perlu)    │
│    → Proxy ke BACKEND_API_URL/garment/folding/out           │
│    → Simpan data checkout jika berhasil                    │
└─────────────────────────────────────────────────────────────┘
```

## 🔍 Checklist untuk Troubleshooting

### Jika Error "NIK tidak tersedia":

1. ✅ **Cek apakah user sudah login:**
   - Buka `user_logs.json`
   - Cari user dengan `jabatan === 'FOLDING'` dan `logoutTime === null`
   - Pastikan `line` sesuai dengan table number

2. ✅ **Cek apakah user ter-load ke activeSessions:**
   - Restart server dan lihat log `[LOAD ACTIVE SESSIONS]`
   - Atau cek log `[SAVE USER LOGIN]` saat user login
   - Pastikan `activeSessions` memiliki key yang sesuai

3. ✅ **Cek environment:**
   - Pastikan server dijalankan dengan `node server.js mjl2` untuk MJL2
   - Atau `npm run server:mjl2`
   - Cek log `[SERVER START]` untuk memastikan environment benar

4. ✅ **Cek format nama user:**
   - Jika nama adalah "01", `extractLineNumber("01")` akan return `1`
   - Pastikan `log.line` juga sesuai (contoh: "1")

5. ✅ **Cek matching di `/api/active-users`:**
   - Lihat log `[ACTIVE USERS]` untuk melihat proses pencarian
   - Pastikan line/table number yang diminta cocok dengan key di `activeSessions`

### Jika User tidak ter-load dari file:

1. ✅ **Cek `user_logs.json`:**
   - Pastikan user memiliki `jabatan === 'FOLDING'` atau `bagian === 'FOLDING'`
   - Pastikan `logoutTime === null`
   - Pastikan `line` ada dan sesuai`

2. ✅ **Cek `extractLineNumber()`:**
   - Test dengan nama user yang ada di file
   - Pastikan return value sesuai dengan `log.line`

3. ✅ **Cek server start:**
   - Pastikan `loadActiveSessionsFromFile()` dipanggil saat server start
   - Lihat log `[LOAD ACTIVE SESSIONS]` untuk melihat proses loading

## 📝 Catatan Penting

1. **Active Sessions hanya untuk FOLDING:**
   - Hanya user dengan `jabatan === 'FOLDING'` atau `bagian === 'FOLDING'` yang disimpan di `activeSessions`
   - User dengan jabatan lain (ROBOTIC, IT, MANAGER) tidak disimpan

2. **Key di activeSessions:**
   - Key adalah `lineNumber.toString()` (contoh: "1", "2", "3")
   - Harus match dengan table number yang diminta

3. **NIK Valid:**
   - NIK pendek seperti "01", "02" **VALID** dan **DIIZINKAN**
   - Hanya NIK kosong, "00000000", atau dummy yang ditolak

4. **Environment Detection:**
   - Logging khusus untuk MJL2 hanya muncul jika `CURRENT_ENV === 'MJL2'`
   - Pastikan server dijalankan dengan argument yang benar

5. **Real-time Updates:**
   - `activeSessions` di-update saat user login/logout
   - Frontend melakukan polling setiap 10 detik untuk mendapatkan data terbaru

## 🚀 Best Practices

1. **Selalu pastikan user login sebelum checkout:**
   - User harus login di table yang sesuai
   - Pastikan `activeUserData` tidak null sebelum checkout

2. **Gunakan logging untuk debugging:**
   - Aktifkan logging khusus untuk environment tertentu
   - Periksa log saat server start dan saat user login

3. **Test dengan berbagai format NIK:**
   - Test dengan NIK pendek ("01", "02")
   - Test dengan NIK panjang
   - Test dengan NIK dummy untuk memastikan validasi bekerja

4. **Monitor activeSessions:**
   - Periksa `activeSessions` secara berkala
   - Pastikan data sesuai dengan `user_logs.json`

## 📚 Referensi

- **Frontend Components:**
  - `src/pages/DashboardFolding.tsx` - Dashboard utama
  - `src/components/ScanningFinishingModal.tsx` - Modal scanning
  - `src/config/api.ts` - API functions

- **Backend Endpoints:**
  - `GET /api/active-users?line={tableNumber}` - Get active user
  - `POST /garment/folding/out?rfid_garment={rfid}` - Checkout folding

- **Backend Functions:**
  - `loadActiveSessionsFromFile()` - Load dari file saat start
  - `saveUserLogin()` - Save saat login
  - `extractLineNumber()` - Extract line dari nama

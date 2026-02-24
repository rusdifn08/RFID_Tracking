# Dokumentasi API RFID Tracking System

Dokumentasi lengkap untuk semua API yang digunakan dalam aplikasi RFID Tracking System.

## 📋 Daftar Isi

1. [Konfigurasi API](#konfigurasi-api)
2. [Authentication API](#authentication-api)
3. [RFID/Garment API](#rfidgarment-api)
4. [Tracking API](#tracking-api)
5. [Card API](#card-api)
6. [Dashboard/Monitoring API](#dashboardmonitoring-api)
7. [Production Schedule API](#production-schedule-api)
8. [WO/Production API](#woproduction-api)
9. [Health Check API](#health-check-api)

---

## Konfigurasi API

### Base URL

- **Development**: `http://[LOCAL_IP]:8000` (Proxy Server)
- **Backend API**: `http://10.8.0.104:7000` (Backend Server)
- **Production Schedule API**: `http://10.8.18.60:7186`

### File Konfigurasi

- **`src/config/api.ts`**: Konfigurasi utama API client
- **`server.js`**: Proxy server yang menghubungkan frontend dengan backend API

---

## Authentication API

### 1. Login User

**Endpoint**: `GET /user?nik={nik}`

**Deskripsi**: Login user dengan NIK. Password akan di-hash dengan MD5 dan dibandingkan dengan database.

**Lokasi Penggunaan**:
- `src/config/api.ts` - Fungsi `login()`
- `src/hooks/useAuth.ts` - Hook `useLogin()`
- `src/pages/Login.tsx` - Halaman login

**Parameter Query**:
- `nik` (string, required): Nomor Induk Karyawan

**Request Body**: Tidak ada

**Response Success** (200):
```json
{
  "success": true,
  "user": {
    "nik": "12345",
    "nama": "John Doe",
    "bagian": "IT",
    "line": "1",
    "no_hp": "081234567890",
    "pwd_md5": "5f4dcc3b5aa765d61d8327deb882cf99",
    "rfid_user": "RFID001",
    "telegram": "@johndoe",
    "jabatan": "Administrator",
    "role": "admin"
  }
}
```

**Response Error** (404):
```json
{
  "success": false,
  "error": "NIK tidak ada"
}
```

**Response Error** (401):
```json
{
  "success": false,
  "error": "NIK atau Password salah"
}
```

---

### 2. Registrasi User Baru

**Endpoint**: `POST /inputUser`

**Deskripsi**: Menambahkan user baru ke database.

**Lokasi Penggunaan**:
- `src/hooks/useAuth.ts` - Hook `useRegister()`
- `src/pages/Register.tsx` - Halaman registrasi

**Parameter Query**: Tidak ada

**Request Body**:
```json
{
  "rfid_user": "RFID001",
  "password": "password123",
  "nama": "John Doe",
  "nik": "12345",
  "bagian": "IT",
  "line": "1",
  "telegram": "@johndoe",
  "no_hp": "081234567890"
}
```

**Response Success** (200):
```json
{
  "success": true,
  "message": "User berhasil ditambahkan"
}
```

**Response Error** (400/500):
```json
{
  "success": false,
  "error": "Pesan error",
  "message": "Detail error"
}
```

---

## RFID/Garment API

### 1. Get Data Garment

**Endpoint**: `GET /garment`

**Deskripsi**: Mendapatkan semua data garment atau dengan filter tertentu.

**Lokasi Penggunaan**:
- `server.js` - Proxy endpoint
- Digunakan untuk mendapatkan data garment berdasarkan kondisi tertentu

**Parameter Query**:
- `isDone` (string, optional): Filter berdasarkan status isDone
  - Kosong: Data dengan isDone kosong
  - `"Done"`: Data dengan isDone = Done
- `rfid_garment` (string, optional): Filter berdasarkan RFID garment

**Request Body**: Tidak ada

**Response Success** (200):
```json
{
  "success": true,
  "data": [
    {
      "id_garment": 1,
      "rfid_garment": "0003841573",
      "wo": "185759",
      "style": "STYLE001",
      "buyer": "BUYER001",
      "item": "ITEM001",
      "color": "BLACK",
      "size": "M",
      "isDone": "Done",
      "isMove": "1",
      "timestamp": "2025-01-15T10:30:00Z",
      "updated": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

### 2. Input RFID Garment

**Endpoint**: `POST /inputRFID`

**Deskripsi**: Menambahkan RFID garment baru ke database.

**Lokasi Penggunaan**:
- `src/components/ScanningRFIDNew.tsx` - Komponen scanning RFID
- `src/pages/DaftarRFID.tsx` - Halaman daftar RFID

**Parameter Query**: Tidak ada

**Request Body**:
```json
{
  "rfid_garment": "0003841573",
  "item": "ITEM001",
  "buyer": "BUYER001",
  "style": "STYLE001",
  "wo": "185759",
  "color": "BLACK",
  "size": "M"
}
```

**Response Success** (200):
```json
{
  "success": true,
  "message": "Garment berhasil ditambahkan"
}
```

**Response Error** (409 - Duplicate):
```json
{
  "success": false,
  "isDuplicate": true,
  "message": "RFID sudah ada di database (Duplikasi)"
}
```

---

### 3. Set RFID ke Status SCRAP

**Endpoint**: `POST /scrap`

**Deskripsi**: Mengubah status RFID garment menjadi SCRAP.

**Lokasi Penggunaan**:
- `src/hooks/useDaftarRFID.ts` - Hook untuk daftar RFID
- `src/components/daftar/ScanRejectModal.tsx` - Modal scan reject

**Parameter Query**: Tidak ada

**Request Body**:
```json
{
  "rfid_garment": "0003841573"
}
```

**Response Success** (200):
```json
{
  "success": true,
  "message": "Berhasil diset ke SCRAP"
}
```

---

### 4. Check Data Garment by RFID

**Endpoint**: `GET /tracking/check?rfid_garment={rfid_garment}`

**Deskripsi**: Mengecek apakah RFID garment ada di database dan mendapatkan datanya.

**Lokasi Penggunaan**:
- `src/pages/DaftarRFID.tsx` - Query untuk check garment data
- `src/pages/StatusRFID.tsx` - Check status RFID

**Parameter Query**:
- `rfid_garment` (string, required): RFID garment yang akan dicek

**Request Body**: Tidak ada

**Response Success** (200):
```json
{
  "success": true,
  "data": {
    "id_garment": 1,
    "rfid_garment": "0003841573",
    "wo": "185759",
    "style": "STYLE001",
    "buyer": "BUYER001",
    "item": "ITEM001",
    "color": "BLACK",
    "size": "M",
    "isDone": "Done",
    "isMove": "1"
  }
}
```

**Response Error** (404):
```json
{
  "success": false,
  "message": "RFID tidak ditemukan"
}
```

---

### 5. Get Tracking Data by RFID Garment

**Endpoint**: `GET /tracking/rfid_garment?rfid_garment={rfid_garment}`

**Deskripsi**: Mendapatkan semua data tracking berdasarkan RFID garment.

**Lokasi Penggunaan**:
- `src/hooks/useListRFID.ts` - Hook untuk list RFID
- `src/hooks/useCheckingRFID.ts` - Hook untuk checking RFID
- `src/hooks/useCheckingRFIDQuery.ts` - Query hook untuk checking RFID
- `src/pages/DashboardRFID.tsx` - Dashboard RFID

**Parameter Query**:
- `rfid_garment` (string, optional): Filter berdasarkan RFID garment. Jika tidak ada, mengembalikan semua data.

**Request Body**: Tidak ada

**Response Success** (200):
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": 1,
      "id_garment": 1,
      "rfid_garment": "0003841573",
      "rfid_user": "RFID001",
      "wo": "185759",
      "style": "STYLE001",
      "buyer": "BUYER001",
      "item": "ITEM001",
      "color": "BLACK",
      "size": "M",
      "line": "1",
      "bagian": "SEWING",
      "nama": "John Doe",
      "last_status": "GOOD",
      "timestamp": "2025-01-15T10:30:00Z",
      "rejectCount": 0,
      "reworkCount": 0
    }
  ]
}
```

---

## Tracking API

### 1. Get Tracking Data by Line

**Endpoint**: `GET /tracking/line?line={line}`

**Deskripsi**: Mendapatkan data tracking movement berdasarkan line.

**Lokasi Penggunaan**:
- `src/config/api.ts` - Fungsi `getTrackingLineData()`
- `server.js` - Proxy endpoint

**Parameter Query**:
- `line` (string/number, optional): Nomor line (1, 2, 3, dll). Jika tidak ada, mengembalikan semua data.

**Request Body**: Tidak ada

**Response Success** (200):
```json
{
  "success": true,
  "line": "1",
  "data": {
    "good": "100",
    "rework": "10",
    "reject": "5",
    "hasper": "2",
    "pqc_good": "95",
    "pqc_rework": "8",
    "pqc_reject": "3",
    "output_line": "90"
  }
}
```

---

### 2. Get Tracking Join Data

**Endpoint**: `GET /tracking/join?line={line}`

**Deskripsi**: Mendapatkan data inner join antara tabel tracking_movement dan tracking_movement_end.

**Lokasi Penggunaan**:
- `server.js` - Proxy endpoint

**Parameter Query**:
- `line` (string/number, optional): Nomor line. Jika tidak ada, mengembalikan semua data.

**Request Body**: Tidak ada

**Response Success** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "rfid_garment": "0003841573",
      "line": "1",
      "bagian": "SEWING",
      "status": "GOOD",
      "timestamp": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

## Card API

### 1. Get Card Progress

**Endpoint**: `GET /card/progress`

**Deskripsi**: Mendapatkan data card dengan status progress (isDone kosong atau null).

**Lokasi Penggunaan**:
- `src/hooks/useDaftarRFID.ts` - Hook untuk fetch registered RFID
- `src/config/api.ts` - Fungsi `getCardProgress()`

**Parameter Query**: Tidak ada

**Request Body**: Tidak ada

**Response Success** (200):
```json
{
  "success": true,
  "count": 50,
  "data": [
    {
      "id_garment": 1,
      "rfid_garment": "0003841573",
      "wo": "185759",
      "style": "STYLE001",
      "buyer": "BUYER001",
      "item": "ITEM001",
      "color": "BLACK",
      "size": "M",
      "isDone": "",
      "isMove": "1",
      "timestamp": "2025-01-15T10:30:00Z",
      "updated": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

### 2. Get Card Done

**Endpoint**: `GET /card/done`

**Deskripsi**: Mendapatkan data card dengan status done (isDone = "Done").

**Lokasi Penggunaan**:
- `src/hooks/useDaftarRFID.ts` - Hook untuk fetch registered RFID
- `src/config/api.ts` - Fungsi `getCardDone()`

**Parameter Query**: Tidak ada

**Request Body**: Tidak ada

**Response Success** (200):
```json
{
  "success": true,
  "count": 30,
  "data": [
    {
      "id_garment": 1,
      "rfid_garment": "0003841573",
      "wo": "185759",
      "style": "STYLE001",
      "buyer": "BUYER001",
      "item": "ITEM001",
      "color": "BLACK",
      "size": "M",
      "isDone": "Done",
      "isMove": "1",
      "timestamp": "2025-01-15T10:30:00Z",
      "updated": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

### 3. Get Card Waiting

**Endpoint**: `GET /card/waiting`

**Deskripsi**: Mendapatkan data card dengan status waiting (isDone = "waiting").

**Lokasi Penggunaan**:
- `src/hooks/useDaftarRFID.ts` - Hook untuk fetch registered RFID
- `src/config/api.ts` - Fungsi `getCardWaiting()`

**Parameter Query**: Tidak ada

**Request Body**: Tidak ada

**Response Success** (200):
```json
{
  "success": true,
  "count": 20,
  "data": [
    {
      "id_garment": 1,
      "rfid_garment": "0003841573",
      "wo": "185759",
      "style": "STYLE001",
      "buyer": "BUYER001",
      "item": "ITEM001",
      "color": "BLACK",
      "size": "M",
      "isDone": "waiting",
      "isMove": "1",
      "timestamp": "2025-01-15T10:30:00Z",
      "updated": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

### 4. Get Card Summary

**Endpoint**: `GET /card`

**Deskripsi**: Mendapatkan summary data card (done, progress, total_cards, waiting).

**Lokasi Penggunaan**:
- `src/config/api.ts` - Fungsi `getCardSummary()`

**Parameter Query**: Tidak ada

**Request Body**: Tidak ada

**Response Success** (200):
```json
{
  "success": true,
  "data": [
    {
      "done": "30",
      "progress": "50",
      "total_cards": 100,
      "waiting": "20"
    }
  ]
}
```

---

## Dashboard/Monitoring API

### 1. Get Monitoring Data by Line

**Endpoint**: `GET /monitoring/line?LINE={line}`

**Deskripsi**: Mendapatkan data monitoring untuk dashboard berdasarkan line.

**Lokasi Penggunaan**:
- `src/hooks/useDashboardRFID.ts` - Hook untuk dashboard RFID
- `src/pages/DashboardRFID.tsx` - Halaman dashboard

**Parameter Query**:
- `LINE` (string/number, required): Nomor line (parameter harus kapital: LINE, bukan line)

**Request Body**: Tidak ada

**Response Success** (200):
```json
{
  "success": true,
  "data": {
    "wo": "185759",
    "style": "STYLE001",
    "buyer": "BUYER001",
    "item": "ITEM001",
    "color": "BLACK",
    "size": "M",
    "balance": 1000,
    "good": 800,
    "reject": 50,
    "rework": 30,
    "wira": 20,
    "outputSewing": 750,
    "pqcGood": 700,
    "pqcReject": 40,
    "pqcRework": 25,
    "pqcWira": 15,
    "line": "1"
  }
}
```

---

### 2. Get WIRA Data

**Endpoint**: `GET /wira?LINE={line}&wo={wo}&tanggalfrom={tanggalfrom}&tanggalto={tanggalto}`

**Deskripsi**: Mendapatkan data WIRA untuk dashboard RFID dengan filter line, WO, dan tanggal.

**Lokasi Penggunaan**:
- `src/hooks/useDashboardRFID.ts` - Hook untuk dashboard RFID
- `src/hooks/useDashboardRFIDQuery.ts` - Query hook untuk dashboard
- `src/pages/DashboardRFID.tsx` - Halaman dashboard

**Parameter Query**:
- `LINE` (string/number, optional): Nomor line (parameter harus kapital: LINE, bukan line)
- `wo` (string, optional): Work Order number
- `tanggalfrom` (string, optional): Tanggal mulai (format: YYYY-M-D, contoh: 2025-1-15)
- `tanggalto` (string, optional): Tanggal akhir (format: YYYY-M-D, contoh: 2025-1-20)

**Request Body**: Tidak ada

**Response Success** (200):
```json
{
  "success": true,
  "data": [
    {
      "Line": "1",
      "WO": "185759",
      "Style": "STYLE001",
      "Buyer": "BUYER001",
      "Item": "ITEM001",
      "Good": 800,
      "Rework": 30,
      "Reject": 50,
      "WIRA": 20,
      "PQC Good": 700,
      "PQC Rework": 25,
      "PQC Reject": 40,
      "PQC WIRA": 15,
      "Output Sewing": 750,
      "Balance": 1000
    }
  ]
}
```

---

### 3. Get WIRA Detail

**Endpoint**: `GET /wira/detail?LINE={line}&wo={wo}&tipe={tipe}&kategori={kategori}`

**Deskripsi**: Mendapatkan detail data WIRA/REWORK berdasarkan line, WO, tipe (QC/PQC), dan kategori (rework/wira).

**Lokasi Penggunaan**:
- `src/pages/DashboardRFID.tsx` - Halaman dashboard untuk detail modal

**Parameter Query**:
- `LINE` (string/number, required): Nomor line (parameter harus kapital: LINE, bukan line)
- `wo` (string, required): Work Order number
- `tipe` (string, required): Tipe data - `"qc"` atau `"pqc"`
- `kategori` (string, required): Kategori data - `"rework"` atau `"wira"`

**Request Body**: Tidak ada

**Response Success** (200):
```json
{
  "success": true,
  "data": [
    {
      "rfid_garment": "0003841573",
      "wo": "185759",
      "style": "STYLE001",
      "buyer": "BUYER001",
      "item": "ITEM001",
      "color": "BLACK",
      "size": "M",
      "line": "1",
      "bagian": "SEWING",
      "nama": "John Doe",
      "rfid_user": "RFID001",
      "last_status": "REWORK",
      "timestamp": "2025-01-15T10:30:00Z",
      "reworkCount": 1,
      "rejectCount": 0
    }
  ]
}
```

---

### 4. Get WIRA Report

**Endpoint**: `GET /report/wira?line={line}&wo={wo}&tanggalfrom={tanggalfrom}&tanggalto={tanggalto}`

**Deskripsi**: Mendapatkan report WIRA dengan filter line, WO, dan rentang tanggal.

**Lokasi Penggunaan**:
- `server.js` - Proxy endpoint

**Parameter Query**:
- `line` (string/number, optional): Nomor line
- `wo` (string, optional): Work Order number
- `tanggalfrom` (string, optional): Tanggal mulai (format: YYYY-MM-DD)
- `tanggalto` (string, optional): Tanggal akhir (format: YYYY-MM-DD)

**Request Body**: Tidak ada

**Response Success** (200):
```json
{
  "success": true,
  "data": [
    {
      "line": "1",
      "wo": "185759",
      "date": "2025-01-15",
      "good": 100,
      "rework": 10,
      "reject": 5,
      "wira": 3
    }
  ]
}
```

---

## Production Schedule API

### 1. Get WO Breakdown

**Endpoint**: `GET /api/prod-sch/get-wo-breakdown?branch={branch}&start_date_from={start_date_from}&start_date_to={start_date_to}`

**Deskripsi**: Mendapatkan data WO Breakdown dari Production Schedule API eksternal.

**Lokasi Penggunaan**:
- `src/config/api.ts` - Fungsi `getWOBreakdown()`
- `src/hooks/useDaftarRFID.ts` - Hook untuk fetch production branch data
- `src/pages/DaftarRFID.tsx` - Halaman daftar RFID

**Parameter Query**:
- `branch` (string, optional): Branch code (default: "CJL")
- `start_date_from` (string, optional): Tanggal mulai (format: YYYY-MM-DD)
- `start_date_to` (string, optional): Tanggal akhir (format: YYYY-MM-DD)

**Request Body**: Tidak ada

**Headers**:
- `GCC-API-KEY: 332100185` (dikelola oleh proxy server)

**Response Success** (200):
```json
{
  "data": [
    {
      "id": 1,
      "wo_no": "185759",
      "start_date": "2025-01-15",
      "finish_date": "2025-01-20",
      "style": "STYLE001",
      "buyer": "BUYER001",
      "product_name": "ITEM001",
      "color": "BLACK",
      "size": "M",
      "qty": "1000",
      "branch": "CJL",
      "line": "L1"
    }
  ]
}
```

**Catatan**: API ini dipanggil melalui proxy server yang menambahkan header `GCC-API-KEY` secara otomatis.

---

## WO/Production API

### 1. Get Production Branch Data

**Endpoint**: `GET /wo/production_branch?production_branch={production_branch}&line={line}&start_date_from={start_date_from}&start_date_to={start_date_to}`

**Deskripsi**: Mendapatkan data production branch dengan filter production branch, line, dan rentang tanggal.

**Lokasi Penggunaan**:
- `server.js` - Proxy endpoint

**Parameter Query**:
- `production_branch` (string, optional): Production branch code (contoh: "CJL")
- `line` (string, optional): Line code (contoh: "L1")
- `start_date_from` (string, optional): Tanggal mulai (format: YYYY-M-D)
- `start_date_to` (string, optional): Tanggal akhir (format: YYYY-M-D)

**Request Body**: Tidak ada

**Response Success** (200):
```json
{
  "success": true,
  "data": [
    {
      "wo_no": "185759",
      "production_branch": "CJL",
      "line": "L1",
      "start_date": "2025-01-15",
      "finish_date": "2025-01-20",
      "style": "STYLE001",
      "buyer": "BUYER001",
      "item": "ITEM001",
      "color": "BLACK",
      "size": "M",
      "qty": "1000"
    }
  ]
}
```

---

### 2. Get WO Branch Data

**Endpoint**: `GET /wo/branch?branch={branch}&line={line}&start_date_from={start_date_from}&start_date_to={start_date_to}`

**Deskripsi**: Mendapatkan data WO berdasarkan branch dan line dengan filter tanggal.

**Lokasi Penggunaan**:
- `server.js` - Proxy endpoint

**Parameter Query**:
- `branch` (string, optional): Branch code (contoh: "cjl")
- `line` (string, optional): Line code (contoh: "L1")
- `start_date_from` (string, optional): Tanggal mulai (format: YYYY-M-D)
- `start_date_to` (string, optional): Tanggal akhir (format: YYYY-M-D)

**Request Body**: Tidak ada

**Response Success** (200):
```json
{
  "success": true,
  "data": [
    {
      "wo_no": "185759",
      "branch": "cjl",
      "line": "L1",
      "start_date": "2025-01-15",
      "finish_date": "2025-01-20",
      "style": "STYLE001",
      "buyer": "BUYER001",
      "item": "ITEM001",
      "color": "BLACK",
      "size": "M",
      "qty": "1000"
    }
  ]
}
```

---

## Health Check API

### 1. Health Check

**Endpoint**: `GET /health`

**Deskripsi**: Mengecek status server apakah berjalan dengan baik.

**Lokasi Penggunaan**:
- `src/components/ScanningRFIDNew.tsx` - Check server status sebelum scanning
- `src/config/api.ts` - Fungsi `checkHealth()`

**Parameter Query**: Tidak ada

**Request Body**: Tidak ada

**Response Success** (200):
```json
{
  "status": "ok",
  "message": "Server is running",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "server": "Mock API Server",
  "version": "1.0.0"
}
```

---

## Update Data API

### 1. Update Garment Data

**Endpoint**: `PUT /garment` atau `POST /garment/update`

**Deskripsi**: Mengupdate data garment yang sudah ada.

**Lokasi Penggunaan**:
- `src/pages/DaftarRFID.tsx` - Update data garment

**Parameter Query**: Tidak ada

**Request Body**:
```json
{
  "rfid_garment": "0003841573",
  "wo": "185759",
  "style": "STYLE001",
  "buyer": "BUYER001",
  "item": "ITEM001",
  "color": "BLACK",
  "size": "M"
}
```

**Response Success** (200):
```json
{
  "success": true,
  "message": "Data berhasil diupdate"
}
```

---

## Catatan Penting

### 1. Format Tanggal

- **API Backend**: Format `YYYY-M-D` (contoh: `2025-1-15`)
- **API Production Schedule**: Format `YYYY-MM-DD` (contoh: `2025-01-15`)
- **Frontend Input**: Format `YYYY-MM-DD` (contoh: `2025-01-15`)

### 2. Proxy Server

Semua request dari frontend melewati proxy server (`server.js`) yang berjalan di port 8000. Proxy server kemudian meneruskan request ke backend API di `http://10.8.0.104:7000`.

### 3. Error Handling

Semua API mengembalikan response dengan format:
```json
{
  "success": boolean,
  "data": any,
  "error": string (jika error),
  "message": string (jika ada)
}
```

### 4. Authentication

- Login menggunakan NIK dan password (MD5 hash)
- Password di-hash di frontend sebelum dikirim ke backend
- Backend membandingkan hash password dengan hash di database

### 5. CORS

Proxy server menangani CORS untuk semua request ke backend API.

---

## Daftar File yang Menggunakan API

### Hooks
- `src/hooks/useAuth.ts` - Authentication hooks
- `src/hooks/useDaftarRFID.ts` - Daftar RFID hooks
- `src/hooks/useListRFID.ts` - List RFID hooks
- `src/hooks/useDashboardRFID.ts` - Dashboard RFID hooks
- `src/hooks/useCheckingRFID.ts` - Checking RFID hooks
- `src/hooks/useDashboardRFIDQuery.ts` - Dashboard RFID query hooks
- `src/hooks/useCheckingRFIDQuery.ts` - Checking RFID query hooks
- `src/hooks/useListRFIDQuery.ts` - List RFID query hooks

### Pages
- `src/pages/Login.tsx` - Halaman login
- `src/pages/Register.tsx` - Halaman registrasi
- `src/pages/DaftarRFID.tsx` - Halaman daftar RFID
- `src/pages/ListRFID.tsx` - Halaman list RFID
- `src/pages/DashboardRFID.tsx` - Halaman dashboard RFID
- `src/pages/CheckingRFID.tsx` - Halaman checking RFID
- `src/pages/StatusRFID.tsx` - Halaman status RFID

### Components
- `src/components/ScanningRFIDNew.tsx` - Komponen scanning RFID
- `src/components/daftar/ScanRejectModal.tsx` - Modal scan reject

### Config
- `src/config/api.ts` - Konfigurasi dan fungsi API client

### Server
- `server.js` - Proxy server untuk menghubungkan frontend dengan backend API

---

**Dibuat**: 2025-01-XX  
**Versi**: 1.0.0  
**Framework**: Laravel 11 + Filament 4 + Tailwind CSS 4


# Dokumentasi API Finishing (Dryroom & Folding)

Dokumentasi lengkap untuk API endpoints yang digunakan pada fitur scanning finishing (Dryroom dan Folding).

## 📋 Daftar Endpoint

1. [Dryroom Check In](#1-dryroom-check-in)
2. [Dryroom Check Out](#2-dryroom-check-out)
3. [Folding Check In](#3-folding-check-in)
4. [Get Finishing Data](#4-get-finishing-data)

---

## 1. Dryroom Check In

**Endpoint**: `POST /garment/dryroom/in?rfid_garment=xxx`

**Deskripsi**: Melakukan check in RFID garment ke area Dryroom. RFID garment akan dicatat masuk ke area Dryroom dan status akan diupdate.

**Lokasi Penggunaan**:
- `src/components/ScanningFinishingModal.tsx` - Modal scanning untuk Dryroom
- `src/config/api.ts` - Fungsi `dryroomCheckIn()`

**Parameter Query**:
- `rfid_garment` (string, required): Nomor RFID garment yang akan di-check in

**Request Body**: Tidak ada (menggunakan query parameter)

**Response Success** (200):
```json
{
  "success": true,
  "message": "RFID berhasil di-check in ke Dryroom",
  "data": {
    "rfid_garment": "0003841573",
    "area": "dryroom",
    "action": "checkin",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

**Response Error** (400 - Bad Request):
```json
{
  "success": false,
  "error": "RFID garment tidak ditemukan di database"
}
```

**Response Error** (409 - Conflict):
```json
{
  "success": false,
  "error": "RFID sudah di-check in ke Dryroom",
  "isDuplicate": true
}
```

**Response Error** (500 - Internal Server Error):
```json
{
  "success": false,
  "error": "Gagal menyimpan data ke database"
}
```

---

## 2. Dryroom Check Out

**Endpoint**: `POST /garment/dryroom/out?rfid_garment=xxx`

**Deskripsi**: Melakukan check out RFID garment dari area Dryroom. RFID garment akan dicatat keluar dari area Dryroom dan status akan diupdate.

**Lokasi Penggunaan**:
- `src/components/ScanningFinishingModal.tsx` - Modal scanning untuk Dryroom
- `src/config/api.ts` - Fungsi `dryroomCheckOut()`

**Parameter Query**:
- `rfid_garment` (string, required): Nomor RFID garment yang akan di-check out

**Request Body**: Tidak ada (menggunakan query parameter)

**Response Success** (200):
```json
{
  "success": true,
  "message": "RFID berhasil di-check out dari Dryroom",
  "data": {
    "rfid_garment": "0003841573",
    "area": "dryroom",
    "action": "checkout",
    "timestamp": "2025-01-15T11:30:00Z"
  }
}
```

**Response Error** (400 - Bad Request):
```json
{
  "success": false,
  "error": "RFID garment tidak ditemukan di database"
}
```

**Response Error** (409 - Conflict):
```json
{
  "success": false,
  "error": "RFID belum di-check in ke Dryroom",
  "isDuplicate": true
}
```

**Response Error** (500 - Internal Server Error):
```json
{
  "success": false,
  "error": "Gagal menyimpan data ke database"
}
```

---

## 3. Folding Check In

**Endpoint**: `POST /garment/folding/in?rfid_garment=xxx`

**Deskripsi**: Melakukan check in RFID garment ke area Folding. RFID garment akan dicatat masuk ke area Folding dan status akan diupdate.

**Lokasi Penggunaan**:
- `src/components/ScanningFinishingModal.tsx` - Modal scanning untuk Folding
- `src/config/api.ts` - Fungsi `foldingCheckIn()`

**Parameter Query**:
- `rfid_garment` (string, required): Nomor RFID garment yang akan di-check in

**Request Body**: Tidak ada (menggunakan query parameter)

**Response Success** (200):
```json
{
  "success": true,
  "message": "RFID berhasil di-check in ke Folding",
  "data": {
    "rfid_garment": "0003841573",
    "area": "folding",
    "action": "checkin",
    "timestamp": "2025-01-15T12:30:00Z"
  }
}
```

**Response Error** (400 - Bad Request):
```json
{
  "success": false,
  "error": "RFID garment tidak ditemukan di database"
}
```

**Response Error** (409 - Conflict):
```json
{
  "success": false,
  "error": "RFID sudah di-check in ke Folding",
  "isDuplicate": true
}
```

**Response Error** (500 - Internal Server Error):
```json
{
  "success": false,
  "error": "Gagal menyimpan data ke database"
}
```

---

## 4. Get Finishing Data

**Endpoint**: `GET /finishing`

**Deskripsi**: Mendapatkan data statistik finishing (Dryroom, Folding, dan Reject Room).

**Lokasi Penggunaan**:
- `src/pages/DashboardRFIDFinishing.tsx` - Dashboard finishing
- `src/config/api.ts` - Fungsi `getFinishingData()`

**Parameter Query**: Tidak ada

**Request Body**: Tidak ada

**Response Success** (200):
```json
{
  "success": true,
  "data": {
    "dryroom": {
      "waiting": 10,
      "checkin": 25,
      "checkout": 15
    },
    "folding": {
      "waiting": 5,
      "checkin": 20,
      "checkout": 10
    },
    "reject_room": {
      "waiting": 2,
      "checkin": 8,
      "checkout": 3,
      "reject_mati": 1
    }
  }
}
```

**Response Error** (500 - Internal Server Error):
```json
{
  "success": false,
  "error": "Gagal mengambil data finishing"
}
```

---

## 📝 Catatan Implementasi Backend

### Database Schema (Contoh)

Disarankan untuk memiliki tabel tracking finishing dengan struktur seperti:

```sql
CREATE TABLE finishing_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rfid_garment VARCHAR(50) NOT NULL,
    area ENUM('dryroom', 'folding') NOT NULL,
    action ENUM('checkin', 'checkout') NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_rfid (rfid_garment),
    INDEX idx_area_action (area, action),
    INDEX idx_timestamp (timestamp)
);
```

### Logika Check In/Out

1. **Check In**:
   - Validasi RFID garment ada di database
   - Cek apakah RFID sudah di-check in (jika sudah, return error 409)
   - Insert record dengan action = 'checkin'
   - Update statistik finishing

2. **Check Out**:
   - Validasi RFID garment ada di database
   - Cek apakah RFID sudah di-check in sebelumnya (jika belum, return error 409)
   - Insert record dengan action = 'checkout'
   - Update statistik finishing

### Update Statistik

Setelah setiap check in/out, update statistik di tabel atau cache:
- `dryroom.waiting`: RFID yang belum di-check in
- `dryroom.checkin`: RFID yang sudah di-check in tapi belum check out
- `dryroom.checkout`: RFID yang sudah di-check out
- Sama untuk `folding`

### Validasi

1. RFID garment harus ada di tabel `garment` atau `rfid_data`
2. Untuk check out, harus ada record check in sebelumnya
3. Untuk check in, tidak boleh ada record check in aktif (belum check out)

---

## 🔗 Base URL

- **Development**: `http://[LOCAL_IP]:8000` (Proxy Server)
- **Backend API**: `http://10.8.0.104:7000` (Backend Server)

---

## 📌 Contoh Request (cURL)

### Dryroom Check In
```bash
curl -X POST "http://10.8.0.104:7000/garment/dryroom/in?rfid_garment=0003841573" \
  -H "Content-Type: application/json"
```

### Dryroom Check Out
```bash
curl -X POST "http://10.8.0.104:7000/garment/dryroom/out?rfid_garment=0003841573" \
  -H "Content-Type: application/json"
```

### Folding Check In
```bash
curl -X POST "http://10.8.0.104:7000/garment/folding/in?rfid_garment=0003841573" \
  -H "Content-Type: application/json"
```

---

## ✅ Testing Checklist

- [ ] Test check in dryroom dengan RFID valid
- [ ] Test check in dryroom dengan RFID tidak valid (404)
- [ ] Test check in dryroom duplikasi (409)
- [ ] Test check out dryroom dengan RFID yang sudah check in
- [ ] Test check out dryroom dengan RFID yang belum check in (409)
- [ ] Test check in folding dengan RFID valid
- [ ] Test check in folding dengan RFID tidak valid (404)
- [ ] Test check in folding duplikasi (409)
- [ ] Test get finishing data
- [ ] Test error handling dan response format

---

**Last Updated**: 2025-01-15
**Version**: 1.0.0


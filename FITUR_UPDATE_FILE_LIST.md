# Daftar File untuk Fitur Update Data RFID

## ✅ Status Autofill
**YA, autofill sudah ada dan berfungsi!**

Ketika user memasukkan/mem-scan RFID dan menekan Enter:
1. Sistem akan fetch data garment dari API `/garment/update?rfid_garment=xxx`
2. Data yang diterima akan **otomatis mengisi** semua field:
   - WO (Work Order)
   - Style
   - Buyer
   - Item
   - Color
   - Size

**Lokasi kode autofill:**
- `src/pages/DaftarRFID.tsx` - Line 267-323 (useEffect untuk auto-fill)
- `src/pages/DaftarRFID.tsx` - Line 96-120 (garmentQuery untuk fetch data)

---

## 📁 File yang Harus Di-Copy untuk Fitur Update

### 1. **Core Files (Wajib)**

#### Pages
```
src/pages/DaftarRFID.tsx
```
- Halaman utama dengan logic update
- Mengandung state management untuk update modal
- Mengandung query untuk fetch garment data
- Mengandung logic autofill

#### Components
```
src/components/daftar/UpdateDataModal.tsx
```
- Modal component untuk update data
- Form dengan field WO, Style, Buyer, Item, Color, Size
- Support autofill dari API response

#### Hooks
```
src/hooks/useDaftarRFID.ts
```
- Custom hook dengan logic untuk daftar RFID
- Mengandung state management untuk update
- Mengandung logic untuk fetch WO breakdown

#### Config/API
```
src/config/api.ts
```
- API configuration
- Function `getWOBreakdown()` - untuk fetch WO breakdown data
- Function `updateRFID()` - untuk update RFID data (jika ada)
- Function `getDefaultHeaders()` - untuk API headers

### 2. **Supporting Components (Opsional, tapi disarankan)**

#### Components Daftar
```
src/components/daftar/RegistrationForm.tsx
```
- Form registration yang memiliki tombol "UPDATE RFID"
- Jika tidak di-copy, tombol update tidak akan muncul

```
src/components/daftar/DateFilterModal.tsx
```
- Modal untuk filter tanggal (digunakan untuk fetch WO breakdown)
- Diperlukan jika ingin filter WO berdasarkan tanggal

### 3. **Dependencies (Wajib)**

#### Utils
```
src/utils/dateUtils.ts (jika ada)
```
- Helper functions untuk format tanggal

#### Types/Interfaces
- Semua type definitions yang digunakan di file-file di atas

### 4. **Backend/Server Files**

#### Server
```
server.js
```
- Endpoint `/garment/update` - untuk fetch data garment berdasarkan RFID
- Endpoint `/garment/update` (POST) - untuk update data garment
- Endpoint `/api/prod-sch/get-wo-breakdown` - untuk fetch WO breakdown

---

## 📋 Checklist File untuk Copy

### ✅ Wajib Di-Copy:
- [x] `src/pages/DaftarRFID.tsx`
- [x] `src/components/daftar/UpdateDataModal.tsx`
- [x] `src/hooks/useDaftarRFID.ts`
- [x] `src/config/api.ts` (atau bagian yang relevan)
- [x] `server.js` (atau bagian endpoint `/garment/update`)

### ⚠️ Opsional (Tapi Disarankan):
- [ ] `src/components/daftar/RegistrationForm.tsx` (untuk tombol Update)
- [ ] `src/components/daftar/DateFilterModal.tsx` (untuk filter tanggal)
- [ ] `src/components/daftar/RegisteredRFIDModal.tsx` (jika perlu)
- [ ] `src/components/daftar/ScanRejectModal.tsx` (jika perlu)

### 📦 Dependencies yang Diperlukan:
- [x] `@tanstack/react-query` - untuk data fetching
- [x] `react-hook-form` - untuk form handling (jika digunakan)
- [x] `zod` - untuk validation (jika digunakan)
- [x] `lucide-react` - untuk icons

---

## 🔧 Cara Kerja Autofill

1. **User scan/ketik RFID** di input field Update Modal
2. **User tekan Enter** → `onRfidKeyDown` dipanggil
3. **RFID disimpan** ke `submittedRfid` state
4. **Query di-trigger** → `garmentQuery` fetch ke `/garment/update?rfid_garment=xxx`
5. **Data diterima** → `useEffect` (line 268-323) auto-fill form:
   ```typescript
   setUpdateFormData({
       rfid_garment: submittedRfid.trim(),
       wo: garmentData.wo || garmentData.WO,
       style: garmentData.style || garmentData.STYLE,
       buyer: garmentData.buyer || garmentData.BUYER,
       item: garmentData.item || garmentData.ITEM,
       color: garmentData.color || garmentData.COLOR,
       size: garmentData.size || garmentData.SIZE
   });
   ```
6. **Form terisi otomatis** dengan data dari API

---

## 🎯 Endpoint API yang Diperlukan

### GET `/garment/update?rfid_garment={rfid}`
**Response:**
```json
{
  "success": true,
  "data": {
    "wo": "186859",
    "style": "1106803",
    "buyer": "HEXAPOLE COMPANY LIMITED",
    "item": "LIGHT SHELL HOODED K'S 140~160",
    "color": "BLACK",
    "size": "M"
  },
  "message": "Data garment berhasil dimuat"
}
```

### POST `/garment/update`
**Request Body:**
```json
{
  "rfid_garment": "0003585886",
  "wo": "186859",
  "style": "1106803",
  "buyer": "HEXAPOLE COMPANY LIMITED",
  "item": "LIGHT SHELL HOODED K'S 140~160",
  "color": "BLACK",
  "size": "M"
}
```

---

## 📝 Catatan Penting

1. **Autofill sudah berfungsi** - Tidak perlu modifikasi tambahan
2. **Fallback mechanism** - Jika API `/garment/update` tidak mengembalikan data lengkap, sistem akan menggunakan data dari WO breakdown sebagai fallback
3. **Error handling** - Sistem sudah handle error jika data tidak ditemukan atau server tidak bisa diakses
4. **Loading state** - Ada loading indicator saat fetch data garment

---

## 🚀 Quick Start untuk Folder Baru

1. Copy semua file wajib ke folder baru
2. Pastikan dependencies terinstall (`npm install`)
3. Pastikan backend server memiliki endpoint `/garment/update`
4. Test dengan scan RFID dan tekan Enter
5. Form akan otomatis terisi dengan data dari API

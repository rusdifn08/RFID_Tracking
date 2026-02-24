# 📚 Penjelasan: Apakah Bisa Tanpa `server.js`?

## 🎯 Jawaban Singkat

**BISA**, tapi dengan beberapa kondisi dan trade-off. Mari kita bahas detailnya.

---

## 🏗️ Arsitektur Saat Ini

```
┌─────────────────┐
│  Frontend       │
│  (React)        │
│  localhost:5173 │
└────────┬────────┘
         │ fetch ke
         ↓
┌─────────────────┐
│  server.js      │ ← PROXY SERVER (yang ingin dihilangkan)
│  10.8.10.160:8000│
└────────┬────────┘
         │ fetch ke
         ↓
┌─────────────────┐
│  Backend API    │ ← BACKEND ASLI (Python Flask)
│  10.8.10.120:8000│
└─────────────────┘
```

---

## ❓ Mengapa Ada `server.js`?

### 1. **Mengatasi CORS (Cross-Origin Resource Sharing)**
- Browser memblokir request dari frontend ke backend yang berbeda domain/IP
- `server.js` bertindak sebagai "jembatan" (proxy) di tengah
- Server-to-server tidak ada masalah CORS

### 2. **Akses ke MySQL Database**
- Frontend **TIDAK BISA** langsung akses database MySQL (keamanan browser)
- `server.js` bisa koneksi ke MySQL dan mengekspos endpoint
- Contoh: Endpoint `/garment` POST yang insert ke MySQL

### 3. **Transformasi Data**
- `server.js` bisa memproses/transform data sebelum dikirim ke frontend
- Bisa menambahkan logging, error handling, dll

---

## ✅ Apakah Bisa Tanpa `server.js`?

**BISA**, dengan 2 opsi:

### **Opsi 1: Backend API Support CORS** ⭐ (Paling Mudah)

Jika backend API di `10.8.10.120:8000` sudah support CORS, frontend bisa langsung panggil backend.

**Yang Perlu Dilakukan:**

1. **Ubah `src/config/api.ts`:**
```typescript
// Ganti dari:
export const API_BASE_URL = 'http://10.8.10.160:8000'; // server.js

// Menjadi:
export const API_BASE_URL = 'http://10.8.10.120:8000'; // Langsung ke backend
```

2. **Pastikan Backend Support CORS:**
Backend harus mengirim header:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
```

**Kelebihan:**
- ✅ Tidak perlu `server.js`
- ✅ Lebih sederhana
- ✅ Hanya perlu 1 terminal (`npm run dev`)

**Kekurangan:**
- ❌ Endpoint yang butuh MySQL (seperti `/garment` POST) tidak bisa digunakan
- ❌ Backend harus support CORS
- ❌ Tidak bisa akses database langsung dari frontend

---

### **Opsi 2: Menggunakan Vite Proxy** ⭐⭐ (Recommended untuk Development)

Vite bisa jadi proxy di development, jadi tidak perlu `server.js` saat development.

**Yang Perlu Dilakukan:**

1. **Edit `vite.config.ts`:**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    open: false,
    // Tambahkan proxy di sini
    proxy: {
      '/api': {
        target: 'http://10.8.10.120:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/user': {
        target: 'http://10.8.10.120:8000',
        changeOrigin: true,
      },
      '/tracking': {
        target: 'http://10.8.10.120:8000',
        changeOrigin: true,
      },
      '/wo': {
        target: 'http://10.8.10.120:8000',
        changeOrigin: true,
      },
      '/garment': {
        target: 'http://10.8.10.120:8000',
        changeOrigin: true,
      },
      '/login': {
        target: 'http://10.8.10.120:8000',
        changeOrigin: true,
      },
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
})
```

2. **Ubah `src/config/api.ts`:**
```typescript
// Untuk development, gunakan relative path (Vite akan proxy)
export const API_BASE_URL = import.meta.env.DEV 
  ? '' // Kosong = gunakan relative path, Vite akan proxy
  : 'http://10.8.10.120:8000'; // Production: langsung ke backend
```

**Kelebihan:**
- ✅ Tidak perlu `server.js` di development
- ✅ Hanya perlu 1 terminal (`npm run dev`)
- ✅ Vite otomatis handle proxy
- ✅ Tidak perlu ubah banyak kode

**Kekurangan:**
- ❌ Hanya bekerja di development (saat `npm run dev`)
- ❌ Di production tetap butuh proxy server (bisa pakai Nginx, Apache, atau `server.js`)
- ❌ Endpoint yang butuh MySQL tetap tidak bisa (kecuali backend handle sendiri)

---

## ⚠️ Masalah Jika Tanpa `server.js`

### 1. **CORS Error**
Jika backend tidak support CORS, browser akan memblokir request:
```
Access to fetch at 'http://10.8.10.120:8000/user?nik=...' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

### 2. **Tidak Bisa Akses MySQL Langsung**
Frontend **TIDAK BISA** koneksi ke MySQL karena:
- Browser tidak mengizinkan koneksi database langsung (keamanan)
- Endpoint seperti `/garment` POST yang insert ke MySQL tidak bisa digunakan
- Harus melalui backend API yang handle database

### 3. **Keamanan**
- Kredensial database tidak boleh ada di frontend
- Semua akses database harus melalui backend

---

## 🎯 Rekomendasi

### Untuk Development:
✅ **Gunakan Vite Proxy** (Opsi 2)
- Lebih mudah
- Tidak perlu `server.js`
- Hanya perlu `npm run dev`

### Untuk Production:
✅ **Tetap Gunakan Proxy Server**
- Bisa pakai `server.js`
- Atau pakai Nginx/Apache sebagai reverse proxy
- Atau pastikan backend support CORS dan handle semua endpoint

---

## 📝 Kesimpulan

**BISA tanpa `server.js`**, tapi:

1. **Jika semua endpoint sudah ada di backend API** → Bisa langsung panggil backend (dengan CORS support)
2. **Jika ada endpoint yang butuh MySQL** → Harus melalui backend API atau tetap pakai `server.js`
3. **Untuk development** → Bisa pakai Vite proxy (tidak perlu `server.js`)
4. **Untuk production** → Tetap butuh proxy server atau backend support CORS

**Pilihan terbaik untuk Anda (Frontend Developer):**
- Development: Pakai Vite Proxy (tidak perlu `server.js`)
- Production: Minta backend team untuk support CORS, atau tetap pakai `server.js`

---

## 🔧 Implementasi: Vite Proxy (Tanpa server.js)

Saya bisa bantu implementasikan Vite Proxy jika Anda mau. Ini akan membuat Anda tidak perlu menjalankan `server.js` saat development.

Apakah Anda ingin saya implementasikan Vite Proxy sekarang?


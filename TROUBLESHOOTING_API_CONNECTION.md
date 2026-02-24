# Troubleshooting: API Connection Error "Failed to fetch"

## Masalah
Saat menjalankan dev di local (IP 10.5.0.2), data backend gagal diambil dengan error "Failed to fetch".

## Penyebab
Frontend mencoba connect ke proxy server (server.js) di `http://10.5.0.2:8000`, tetapi:
1. Proxy server tidak berjalan di mesin tersebut
2. Proxy server berjalan tapi tidak bisa diakses dari IP tersebut
3. Network connectivity issue

## Solusi

### 1. Pastikan Proxy Server Berjalan
Proxy server (server.js) **HARUS** berjalan di mesin yang sama dengan frontend.

**Untuk MJL environment:**
```bash
npm run server:mjl
# atau
node server.js mjl
```

**Untuk MJL2 environment:**
```bash
npm run server:mjl2
# atau
node server.js mjl2
```

**Untuk CLN environment:**
```bash
npm run server:cln
# atau
node server.js cln
```

### 2. Jalankan Frontend dan Proxy Server Bersamaan
Gunakan script `dev:all` untuk menjalankan keduanya bersamaan:

**Untuk MJL:**
```bash
npm run dev:all:mjl
```

**Untuk MJL2:**
```bash
npm run dev:all:mjl2
```

**Untuk CLN:**
```bash
npm run dev:all:cln
```

### 3. Verifikasi Proxy Server Berjalan
Cek apakah proxy server berjalan dengan mengakses:
- `http://10.5.0.2:8000/api/config/environment` (atau IP yang sesuai)
- Seharusnya return JSON dengan environment info

### 4. Cek Network Connectivity
Pastikan:
- Frontend dan proxy server berjalan di mesin yang sama
- Port 8000 tidak digunakan oleh aplikasi lain
- Firewall tidak memblokir port 8000

### 5. Cek Console Log
Setelah perbaikan, console akan menampilkan:
- `🔧 [API CONFIG] Development mode - API_BASE_URL: http://10.5.0.2:8000`
- `🔧 [API CONFIG] Proxy server harus berjalan di: http://10.5.0.2:8000`
- `🌐 [API REQUEST] Attempting to fetch: ...`
- `✅ [API REQUEST] Response status: 200 for ...`

Jika masih error, akan muncul:
- `❌ [API REQUEST] Error fetching ...`
- `❌ [API REQUEST] Pastikan proxy server (server.js) berjalan di: ...`

## Alur Kerja

```
Frontend (10.5.0.2:5173)
    ↓
API Request ke: http://10.5.0.2:8000/api/...
    ↓
Proxy Server (server.js) di 10.5.0.2:8000
    ↓
Backend API (10.5.0.106:7000 untuk MJL)
```

## Catatan Penting

1. **Proxy server HARUS berjalan di mesin yang sama dengan frontend**
   - Jika frontend di 10.5.0.2, proxy server juga harus di 10.5.0.2
   - Jika frontend di localhost, proxy server juga harus di localhost

2. **Backend API bisa berbeda**
   - Backend API bisa di 10.5.0.106:7000 (MJL)
   - Proxy server akan forward request ke backend yang sesuai

3. **Environment Detection**
   - Proxy server menentukan environment berdasarkan command line argument (`mjl`, `mjl2`, `cln`)
   - Frontend akan detect environment dari proxy server response

## Testing

1. Buka browser console
2. Cek log `🔧 [API CONFIG]` untuk melihat API_BASE_URL
3. Pastikan proxy server berjalan di URL tersebut
4. Cek log `🌐 [API REQUEST]` untuk melihat request yang dikirim
5. Cek log `✅ [API REQUEST]` atau `❌ [API REQUEST]` untuk melihat hasil

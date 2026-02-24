# Fleksibilitas Proxy Frontend

## ✅ Ya, Proxy Frontend Sudah Fleksibel!

Sistem proxy frontend **otomatis menyesuaikan** dengan IP/hostname dari mesin yang menjalankan frontend.

## Cara Kerja

### 1. Deteksi Otomatis IP/Hostname

Frontend menggunakan `window.location.hostname` untuk menentukan di mana frontend diakses:

```typescript
// src/utils/network.ts
export const getLocalIP = (): string => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        // Otomatis menggunakan hostname dari URL yang diakses
        return hostname === 'localhost' || hostname === '127.0.0.1' 
            ? 'localhost' 
            : hostname;
    }
    return 'localhost';
};
```

### 2. Contoh Fleksibilitas

| URL yang Diakses | Proxy Server yang Dicari | Keterangan |
|-----------------|-------------------------|------------|
| `http://localhost:5173` | `http://localhost:8000` | Development lokal |
| `http://127.0.0.1:5173` | `http://localhost:8000` | Development lokal (IP) |
| `http://10.5.0.2:5173` | `http://10.5.0.2:8000` | Development di jaringan lokal |
| `http://192.168.1.100:5173` | `http://192.168.1.100:8000` | Development di jaringan lain |
| `http://pc-name:5173` | `http://pc-name:8000` | Development dengan hostname |

### 3. Alur Kerja

```
User mengakses frontend di: http://10.5.0.2:5173
    ↓
Frontend detect hostname: 10.5.0.2
    ↓
API_BASE_URL otomatis: http://10.5.0.2:8000
    ↓
Frontend request ke: http://10.5.0.2:8000/api/...
    ↓
Proxy server (server.js) harus berjalan di: 10.5.0.2:8000
    ↓
Proxy server forward ke backend: 10.5.0.106:7000 (MJL)
```

## Keuntungan

### ✅ Tidak Perlu Konfigurasi Manual
- Tidak perlu set IP secara manual
- Tidak perlu edit kode saat pindah mesin
- Otomatis menyesuaikan dengan environment

### ✅ Multi-Environment Support
- Bisa dijalankan di berbagai mesin
- Setiap mesin otomatis menggunakan IP-nya sendiri
- Tidak ada konflik antar mesin

### ✅ Development Fleksibel
- Bisa diakses dari localhost
- Bisa diakses dari IP jaringan lokal
- Bisa diakses dari mesin lain di jaringan yang sama

## Persyaratan

### ⚠️ Proxy Server Harus Berjalan di Mesin yang Sama

**PENTING:** Proxy server (server.js) **HARUS** berjalan di mesin yang sama dengan frontend:

- ✅ Jika frontend di `localhost:5173` → proxy harus di `localhost:8000`
- ✅ Jika frontend di `10.5.0.2:5173` → proxy harus di `10.5.0.2:8000`
- ❌ Jika frontend di `10.5.0.2:5173` tapi proxy di `10.5.0.106:8000` → **ERROR**

### Cara Menjalankan

**Opsi 1: Jalankan Bersamaan (Recommended)**
```bash
# Untuk MJL
npm run dev:all:mjl

# Untuk MJL2
npm run dev:all:mjl2

# Untuk CLN
npm run dev:all:cln
```

**Opsi 2: Jalankan Terpisah**
```bash
# Terminal 1: Proxy Server
npm run server:mjl  # atau server:mjl2, server:cln

# Terminal 2: Frontend
npm run dev
```

## Verifikasi

Setelah frontend berjalan, cek console log:

```
🔧 [API CONFIG] Development mode - Detected hostname: 10.5.0.2
🔧 [API CONFIG] Development mode - API_BASE_URL: http://10.5.0.2:8000
🔧 [API CONFIG] Proxy server harus berjalan di: http://10.5.0.2:8000
🔧 [API CONFIG] ✅ FLEKSIBEL: Proxy URL otomatis menyesuaikan dengan mesin yang menjalankan frontend
```

## Troubleshooting

### Error: "Failed to fetch"

**Penyebab:** Proxy server tidak berjalan di mesin yang sama dengan frontend

**Solusi:**
1. Pastikan proxy server berjalan di mesin yang sama
2. Cek console log untuk melihat API_BASE_URL yang digunakan
3. Pastikan proxy server berjalan di URL tersebut

### Error: "Connection refused"

**Penyebab:** Port 8000 tidak terbuka atau digunakan aplikasi lain

**Solusi:**
1. Cek apakah port 8000 sudah digunakan: `netstat -ano | findstr :8000` (Windows)
2. Tutup aplikasi yang menggunakan port 8000
3. Restart proxy server

## Kesimpulan

✅ **Proxy frontend sudah fleksibel dan otomatis menyesuaikan** dengan mesin yang menjalankan frontend.

✅ **Tidak perlu konfigurasi manual** - cukup jalankan frontend dan proxy server di mesin yang sama.

✅ **Multi-environment support** - bisa dijalankan di berbagai mesin tanpa konflik.

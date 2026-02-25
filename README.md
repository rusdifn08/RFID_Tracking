# RFID Tracking

RFID Tracking untuk Gistex Garment Indonesia.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite (Rolldown)
- **UI:** Material UI (MUI) 7, Tailwind CSS 4, Lucide React
- **State & Data:** TanStack Query, Zustand, React Hook Form + Zod
- **Charts:** Recharts
- **Proxy & Backend:** Node.js (Express), WebSocket, MySQL2
- **Export:** ExcelJS, xlsx

## Menjalankan Aplikasi

Masuk ke folder frontend di tiap branch
CLN  -> C:\frontend\RFID_Tracking
MJL  -> C:\RFID_NEW
MJl2 -> C:\frontend\RFID_GM2
### 1. Install dependensi

```bash
npm install
```

### 2. Menjalankan frontend dan server

Aplikasi membutuhkan **proxy server** (Express) dan **frontend** (Vite) berjalan bersamaan.

**Opsi A – Satu perintah (disarankan):**

```bash
# Default (CLN – backend 10.8.0.104)
npm run dev:all

# Atau per environment:
npm run dev:all:cln   # CLN
npm run dev:all:mjl    # MJL (backend 10.5.0.106)
npm run dev:all:mjl2   # MJL2 (backend 10.5.0.99, port 8001 & 5174)
```

**Opsi B – Dua terminal:**

| Terminal 1 – Frontend | Terminal 2 – Proxy server      |
|-----------------------|--------------------------------|
| `npm run dev`         | `npm run server` (default CLN) |
| `npm run dev:mjl2`    | `npm run server:mjl2` (MJL2)   |

- **Frontend:** `http://localhost:5173` (atau `http://localhost:5174` untuk MJL2)
- **Proxy server:** Mengikuti IP mesin yang menjalankan frontend, port **8000** (CLN/MJL) atau **8001** (MJL2).  
  Contoh: `http://localhost:8000` atau `http://10.8.10.104:8000` jika akses dari jaringan.

**Catatan:** Konfigurasi frontend (`src/config/api.ts`) otomatis memakai host yang sama dengan yang dipakai buka aplikasi, sehingga proxy cukup dijalankan di mesin yang sama dengan frontend.

---

## Environment & Backend

| Environment   | Backend IP | Proxy port | Frontend port (opsional) |
|---------------|------------|------------|--------------------------|
| CLN (default) | 10.8.0.104 | 8000       | 5173                     |
| MJL           | 10.5.0.106 | 8000       | 5173                     |
| MJL2          | 10.5.0.99  | 8001       | 5174                     |

- **Lokasi konfigurasi backend:** `server.js` (variabel `BACKEND_IP`, `PORT`).
- **Lokasi konfigurasi frontend:** `src/config/api.ts` (base URL proxy dan WebSocket).

---

## Konfigurasi MySQL

Digunakan oleh proxy server untuk koneksi ke database (jika dipakai):

- **Host:** 10.8.0.104 (atau sesuai environment)
- **User / Password / Database:** Dikonfigurasi di `server.js` (bagian koneksi MySQL).

---

## API (ringkasan)

- **Auth:** `GET /user?nik=...`, `GET /login?nik=...&password=...`
- **Garment:** `GET /garment?rfid_garment=...`, `POST /garment`
- **Tracking:** `GET /tracking/line?line=...`, `GET /tracking?rfid_garment=...`
- **WO:** `GET /wo/production_branch?production_branch=...&line=...`
- **Health:** `GET /health`, `GET /api/health/check`, `/api/health/mysql`, `/api/health/database`, `/api/health/api`

Dokumentasi rinci route ada di `server.js`.

---

## Script npm

| Script                                                 | Keterangan                        |
|--------------------------------------------------------|-----------------------------------|
| `npm run dev`                                          | Jalankan frontend (Vite)          |
| `npm run build`                                        | Build production                  |
| `npm run server`                                       | Jalankan proxy server (CLN)       |
| `npm run server:cln` / `server:mjl` / `server:mjl2`    | Proxy per environment             |
| `npm run dev:all`                                      | Frontend + server bersamaan (CLN) |
| `npm run dev:all:cln` / `dev:all:mjl` / `dev:all:mjl2` | Frontend + server per environment |
| `npm run preview`                                      | Preview build production          |

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

Aplikasi membutuhkan **proxy server** (`server.js`) dan **frontend** (Vite) berjalan bersamaan.

**Opsi A – Satu perintah (disarankan):**

Semua perintah `dev:all:*` memakai `scripts/dev-all.mjs` — menjalankan proxy + Vite sekaligus dan menampilkan ringkasan port di terminal (termasuk **Akses Web**).

```bash
# Default (CLN – backend 10.8.0.104)
npm run dev:all

# Per environment:
npm run dev:all:cln    # CLN
npm run dev:all:mjl    # MJL (backend 10.5.0.106)
npm run dev:all:mjl2   # MJL2 (backend 10.6.0.99)
npm run dev:all:gcc    # GCC
```

**Custom port (opsional):**

Tambahkan `--` lalu flag port. Jika tidak diisi, dipakai default per environment.

```bash
# MJL — contoh semua flag
npm run dev:all:mjl -- -portfrontend 5173 -portbackend 7000 -portbackendgcc 9000

# MJL2 — port frontend custom (mis. 5175)
npm run dev:all:mjl2 -- -portfrontend 5175 -portbackend 7001 -portbackendgcc 9000

# Format alternatif dengan =
npm run dev:all:mjl -- -portfrontend=5180 -portbackend=7000
```

| Flag | Default | Keterangan |
|------|---------|------------|
| `-portfrontend` | 5173 / 5174 / 5175 | Port Vite (browser) |
| `-portbackend` | 7000 | Port API backend Django (`/wira`, `/garment`, dll.) |
| `-portbackendgcc` | 9000 | Port service GCC Cutting & Sewing (`10.5.0.107`) |

> **Tidak diubah oleh flag di atas:** API Production Schedule tetap `http://10.8.18.60:7186` (`PROD_SCH_API_BASE_URL` di `src/config/api.ts`).

**Contoh output saat start:**

```
[dev-all] Konfigurasi dev
  Environment     : MJL2
  Akses Web       : http://10.5.0.2:5174
  Akses Lokal     : http://localhost:5174
  Frontend (Vite) : 5174
  Backend API     : http://10.6.0.99:7000
  GCC / Sewing    : http://10.5.0.107:9000
  Prod Schedule   : http://10.8.18.60:7186 (tetap, tidak diubah)

🚀 [SERVER START] Proxy Server starting...
   Environment: MJL2
   Backend IP: 10.6.0.99
   Backend Port: 7000
   Backend URL: http://10.6.0.99:7000
   Proxy Server: http://10.5.0.2:8001
   Akses Web: http://10.5.0.2:5174
   Akses Lokal: http://localhost:5174
```

- **Akses Web:** IP LAN mesin dev + port frontend — buka dari HP/komputer lain di jaringan yang sama.
- **Proxy Server:** `server.js` di mesin lokal (port 8000 / 8001 / 8002 sesuai environment).

**Opsi B – Dua terminal (tanpa custom port):**

| Terminal 1 – Frontend | Terminal 2 – Proxy server      |
|-----------------------|--------------------------------|
| `npm run dev`         | `npm run server` (default CLN) |
| `npm run dev`         | `npm run server:mjl`           |
| `npm run dev:mjl2`    | `npm run server:mjl2`          |
| `npm run dev:gcc`     | `npm run server:gcc`           |

**Catatan:** Konfigurasi frontend (`src/config/api.ts`) otomatis menyesuaikan host browser. MJL2 dev mengarahkan API ke proxy di `10.6.0.99:8001` (bukan lewat port Vite).

---

## Environment & Backend

| Environment   | Backend IP | Backend API | Proxy port | Frontend (default) | GCC/Sewing |
|---------------|------------|-------------|------------|--------------------|------------|
| CLN (default) | 10.8.0.104 | :7000       | 8000       | 5173               | 10.5.0.107:9000 |
| MJL           | 10.5.0.106 | :7000       | 8000       | 5173               | 10.5.0.107:9000 |
| MJL2          | 10.6.0.99  | :7000       | 8001       | 5174               | 10.5.0.107:9000 |
| GCC           | 10.5.0.106 | :7000       | 8002       | 5175               | 10.5.0.107:9000 |

- **Lokasi konfigurasi proxy:** `server.js` (`BACKEND_IP`, `PORT`, `BACKEND_PORT`).
- **Lokasi konfigurasi frontend:** `src/config/api.ts`, `src/utils/network.ts`, `vite.config.ts`.
- **Launcher dev + custom port:** `scripts/dev-all.mjs`.

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

| Script | Keterangan |
|--------|------------|
| `npm run dev` | Jalankan frontend Vite (port 5173) |
| `npm run dev:mjl2` | Vite port 5174 |
| `npm run dev:gcc` | Vite port 5175 |
| `npm run build` | Build production |
| `npm run server` | Proxy server CLN |
| `npm run server:cln` / `server:mjl` / `server:mjl2` / `server:gcc` | Proxy per environment |
| `npm run dev:all` | Proxy + Vite (CLN) via `scripts/dev-all.mjs` |
| `npm run dev:all:cln` / `dev:all:mjl` / `dev:all:mjl2` / `dev:all:gcc` | Proxy + Vite per environment; dukung flag `-portfrontend`, `-portbackend`, `-portbackendgcc` |
| `npm run preview` | Preview build production |

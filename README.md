# RFID_Tracking
RFID Tracking For Gistex Garment Indonesia

## Tech Stack

- React + TypeScript + Vite
- Python Flask
- Material UI
- TanStack Query
- Tailwind CSS 4
- MQTT

## Getting Started

### Menjalankan Aplikasi

#### 1. Install Dependencies

Pertama, install semua module yang diperlukan:

```bash
npm install
```

#### 2. Menjalankan Aplikasi

Aplikasi ini memerlukan **2 terminal** untuk berjalan dengan baik:

#### Terminal 1 - Frontend (React + Vite)
```bash
npm run dev
```
Frontend akan berjalan di `http://localhost:5173` (atau port yang tersedia)

#### Terminal 2 - Server Frontend (Express Proxy Server)
```bash
npm run server
```
Server akan berjalan di `http://10.8.10.160:8000` dan berfungsi sebagai proxy ke backend API.

**Catatan:** Pastikan kedua terminal berjalan bersamaan agar aplikasi dapat berfungsi dengan baik.

---

### Konfigurasi MySQL

Aplikasi menggunakan MySQL database dengan konfigurasi berikut:

```javascript
Host: 10.8.0.104
User: robot
Password: robot123
Database: db_garmenttracking
Table: garment
```

**Lokasi konfigurasi:** `server.js` (baris 158-167)

---

### IP Backend yang Digunakan

#### Frontend Server (Proxy Server)
- **IP:** `10.8.10.160`
- **Port:** `8000`
- **URL:** `http://10.8.10.160:8000`
- **Fungsi:** Server proxy yang menghubungkan frontend dengan backend API

#### Backend API Server
- **IP:** `10.8.10.120`
- **Port:** `8000`
- **URL:** `http://10.8.10.120:8000`
- **Fungsi:** Backend API utama yang menyediakan data dan logika bisnis

**Lokasi konfigurasi:**
- Frontend API URL: `src/config/api.ts` (baris 16-18)
- Backend API URL: `server.js` (baris 15, 155, 815, 1331, 1455)

---

### API Endpoints yang Digunakan

#### Authentication
- `GET /user?nik={nik}` - Mendapatkan data user berdasarkan NIK
- `GET /login?nik={nik}&password={password}` - Login dengan NIK dan password
- `GET /login?rfid_user={rfid_user}` - Login dengan RFID user

#### Garment Data
- `GET /garment?rfid_garment={rfid_garment}` - Mendapatkan data garment berdasarkan RFID
- `POST /garment` - Insert data garment baru ke database
  ```json
  {
    "rfid_garment": "string",
    "item": "string",
    "buyer": "string",
    "style": "string",
    "wo": "string",
    "color": "string",
    "size": "string"
  }
  ```

#### Tracking Data
- `GET /tracking/line?line={line_number}` - Mendapatkan data tracking berdasarkan line
  - Response: `{ success, line, data: { good, rework, reject, pqc_good, pqc_rework, pqc_reject, output_line } }`
- `GET /tracking?rfid_garment={rfid_garment}` - Mendapatkan data tracking berdasarkan RFID garment

#### Work Order (WO) Data
- `GET /wo/production_branch?production_branch={branch}&line={line}` - Mendapatkan data WO berdasarkan production branch dan line
  - Contoh: `GET /wo/production_branch?production_branch=MJ1&line=L1`
  - Response: `{ success, data: [{ wo_no, product_name, style, buyer, colors, breakdown_sizes, total_qty_order }] }`

#### Health Check
- `GET /health` - Health check server
- `GET /api/health/check` - Check semua koneksi (database, MySQL, API)
- `GET /api/health/mysql` - Check koneksi MySQL
- `GET /api/health/database` - Check koneksi database
- `GET /api/health/api` - Check koneksi backend API

**Lokasi dokumentasi API:** `server.js` (routes mulai dari baris 136)

---

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

# Dokumentasi API dan Server

## 📋 Daftar File

1. **`server.js`** - Mock server lokal untuk testing API
2. **`src/config/api.ts`** - Konfigurasi dan fungsi untuk mengakses API (TypeScript)
3. **`src/config/api.js`** - Konfigurasi dan fungsi untuk mengakses API (JavaScript)

## 🚀 Cara Menjalankan

### 1. Install Dependencies

```bash
npm install
```

### 2. Menjalankan Mock Server

```bash
npm run server
```

Server akan berjalan di: `http://10.5.0.2:3000`

### 3. Menjalankan Frontend (Vite)

```bash
npm run dev
```

Frontend akan berjalan di: `http://10.5.0.2:5173`

### 4. Menjalankan Keduanya Bersamaan

```bash
npm run dev:all
```

## 📡 Endpoint API yang Tersedia

### Health Check
- **GET** `/health` - Cek status server

### Production
- **GET** `/api/production/statistics` - Statistik produksi keseluruhan

### Line
- **GET** `/api/line` - Semua data line
- **GET** `/api/line/:id` - Data line berdasarkan ID (contoh: `/api/line/1`)

### RFID
- **GET** `/api/rfid` - Semua data RFID
- **GET** `/api/rfid/:id` - Data RFID berdasarkan ID
- **POST** `/api/rfid` - Membuat RFID baru
- **PUT** `/api/rfid/:id` - Update RFID
- **DELETE** `/api/rfid/:id` - Hapus RFID

## 💻 Contoh Penggunaan API

### Menggunakan TypeScript (api.ts)

```typescript
import { 
    checkHealth, 
    getProductionStatistics, 
    getLineData,
    getAllRFID,
    createRFID 
} from './config/api';

// Health check
const health = await checkHealth();
console.log(health);

// Get production statistics
const stats = await getProductionStatistics();
console.log(stats);

// Get line data
const lineData = await getLineData(1);
console.log(lineData);

// Get all RFID
const allRFID = await getAllRFID();
console.log(allRFID);

// Create new RFID
const newRFID = await createRFID({
    id: 'RFID-005',
    status: 'active',
    line: 'line1'
});
console.log(newRFID);
```

### Menggunakan Generic API Methods

```typescript
import { apiGet, apiPost, apiPut, apiDelete } from './config/api';

// GET request
const response = await apiGet('/api/rfid');

// POST request
const newData = await apiPost('/api/rfid', {
    id: 'RFID-006',
    status: 'active',
    line: 'line2'
});

// PUT request
const updated = await apiPut('/api/rfid/RFID-006', {
    status: 'inactive'
});

// DELETE request
const deleted = await apiDelete('/api/rfid/RFID-006');
```

## 🔧 Konfigurasi

### IP dan Port

- **Frontend**: `10.5.0.2:5173` (dikonfigurasi di `vite.config.ts`)
- **API Server**: `10.5.0.2:3000` (dikonfigurasi di `server.js`)

### Environment Variables

Anda bisa menggunakan environment variables untuk mengubah URL API:

```env
VITE_API_URL=http://10.5.0.2:3000
VITE_WS_URL=ws://10.5.0.2:3000
```

## 📝 Catatan

- Server ini adalah **mock server** untuk testing saja
- Data yang disimpan di memory, akan hilang saat server restart
- Untuk production, ganti URL API di `src/config/api.ts` dengan URL server yang sebenarnya


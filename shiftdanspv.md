# Dokumentasi Mekanisme Data Shift dan Supervisor

## 📍 Lokasi Penyimpanan Data

### 1. **Data Shift**
- **File**: `shift_data.json` (di root project)
- **Path**: `C:\Rusdi\RFID_Tracking\shift_data.json`
- **Format**: JSON file dengan struktur:
```json
{
  "shifts": {
    "0": "day",
    "1": "day",
    "CLN_1": "day",
    "MJL_1": "night",
    "MJL2_1": "day",
    "111": "day",
    "112": "night"
  },
  "lastUpdated": "2026-02-04T01:13:08.319Z",
  "description": "..."
}
```

### 2. **Data Supervisor**
- **File**: `supervisor_data.json` (di root project)
- **Path**: `C:\Rusdi\RFID_Tracking\supervisor_data.json`
- **Format**: JSON file dengan struktur:
```json
{
  "supervisors": {
    "0": "Rusdi",
    "111": "Rusdi",
    "112": "Rusdi",
    "CLN_1": "RISMAN",
    "MJL_1": "DATI",
    "MJL2_1": "NENG JUNENGSIH"
  },
  "lastUpdated": "2026-01-27T03:04:18.343Z",
  "description": "..."
}
```

### 3. **Server-side Storage**
- **Backend**: Data disimpan di server.js (Node.js Express server)
- **Functions**: 
  - `loadShiftData()` - Membaca dari `shift_data.json`
  - `saveShiftData()` - Menyimpan ke `shift_data.json`
  - `loadSupervisorData()` - Membaca dari `supervisor_data.json`
  - `saveSupervisorData()` - Menyimpan ke `supervisor_data.json`

---

## 🔄 Mekanisme Real-Time Synchronization

### **Apakah perubahan di PC A akan terlihat di PC B?**

**✅ YA**, perubahan di PC A akan otomatis terlihat di PC B dan semua device yang mengakses aplikasi. Mekanisme sync menggunakan kombinasi:

1. **Polling (Setiap 3 detik)**
2. **Event-based Updates (Instant)**
3. **Window Focus Refresh**

---

## 📊 Struktur Data per Environment

### **Environment-Aware Keys**

Data disimpan dengan key yang berbeda untuk menghindari konflik antar environment:

#### **CLN (Cikarang)**
- **All Production Line**: Key `"0"`
- **Line 1-5**: Key `"CLN_1"`, `"CLN_2"`, `"CLN_3"`, `"CLN_4"`, `"CLN_5"`

#### **MJL (Majalaya)**
- **All Production Line**: Key `"111"`
- **Line 1-9**: Key `"MJL_1"`, `"MJL_2"`, ..., `"MJL_9"`
- **Line 10-15**: Key `"10"`, `"11"`, `"12"`, `"13"`, `"14"`, `"15"`

#### **MJL2 (Majalaya 2)**
- **All Production Line**: Key `"112"`
- **Line 1-9**: Key `"MJL2_1"`, `"MJL2_2"`, ..., `"MJL2_9"`

---

## 🔄 Flow Update Data

### **1. User Update Data (PC A)**

```
┌─────────────┐
│   PC A      │
│  (Frontend) │
└──────┬──────┘
       │
       │ 1. User klik edit button
       │ 2. Buka EditSupervisorShiftModal
       │ 3. User ubah supervisor/shift
       │ 4. User klik Save
       │
       ▼
┌─────────────────────────────────────┐
│  POST /api/supervisor-data          │
│  POST /api/shift-data               │
│  Body: {                            │
│    lineId: 1,                       │
│    supervisor: "Nama Baru",         │
│    shift: "night",                  │
│    environment: "MJL2"              │
│  }                                  │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  server.js (Backend)                │
│  1. Terima request                  │
│  2. Deteksi environment             │
│  3. Generate storage key            │
│     (MJL2_1 untuk line 1 di MJL2)   │
│  4. Update shift_data.json          │
│  5. Update supervisor_data.json    │
│  6. Return success response         │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  PC A (Frontend)                    │
│  1. Terima success response         │
│  2. Dispatch event:                 │
│     - window.dispatchEvent(         │
│         'supervisorUpdated'         │
│       )                             │
│     - window.dispatchEvent(         │
│         'shiftUpdated'              │
│       )                             │
└─────────────────────────────────────┘
```

### **2. Real-Time Sync ke PC B**

```
┌─────────────────────────────────────┐
│  PC B (Frontend)                    │
│                                     │
│  Event Listeners:                   │
│  - 'supervisorUpdated'             │
│  - 'shiftUpdated'                  │
│  - 'focus' (window focus)          │
│                                     │
│  Polling:                           │
│  - setInterval(3 detik)            │
│    → GET /api/supervisor-data      │
│    → GET /api/shift-data           │
└──────┬──────────────────────────────┘
       │
       │ Event triggered dari PC A
       │ (hanya untuk tab/window yang sama)
       │
       ▼
┌─────────────────────────────────────┐
│  Polling Mechanism                  │
│  (Setiap 3 detik)                   │
│                                     │
│  GET /api/supervisor-data?         │
│    environment=MJL2                 │
│  GET /api/shift-data?              │
│    environment=MJL2                 │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  server.js (Backend)                │
│  1. Baca shift_data.json           │
│  2. Baca supervisor_data.json       │
│  3. Filter berdasarkan environment │
│  4. Return filtered data            │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  PC B (Frontend)                    │
│  1. Terima data terbaru             │
│  2. Update state (lineShifts)       │
│  3. Update state (supervisorData)   │
│  4. Re-render UI                    │
└─────────────────────────────────────┘
```

---

## 🔍 Detail Mekanisme Synchronization

### **1. Polling Mechanism**

**Lokasi**: `src/components/RFIDLineContent.tsx`

```typescript
// Setup polling untuk real-time update (setiap 3 detik)
pollingIntervalRef.current = setInterval(() => {
    loadSupervisorData();
    loadShiftData();
}, 3000);
```

**Cara Kerja**:
- Setiap 3 detik, frontend memanggil API untuk mendapatkan data terbaru
- Tidak peduli apakah ada perubahan atau tidak
- Memastikan semua device selalu memiliki data yang up-to-date

**Keuntungan**:
- ✅ Reliable - tidak bergantung pada event
- ✅ Works across different devices/browsers
- ✅ Simple implementation

**Kekurangan**:
- ⚠️ Network overhead (request setiap 3 detik)
- ⚠️ Delay maksimal 3 detik untuk melihat perubahan

### **2. Event-Based Updates**

**Lokasi**: `src/components/EditSupervisorShiftModal.tsx`

```typescript
// Dispatch custom event untuk real-time update di semua tab/window
window.dispatchEvent(new CustomEvent('shiftUpdated'));
```

**Cara Kerja**:
- Setelah berhasil update, dispatch custom event
- Event listener di semua tab/window yang sama akan trigger
- Langsung refresh data tanpa menunggu polling

**Event Listeners**:
```typescript
window.addEventListener('supervisorUpdated', handleSupervisorUpdate);
window.addEventListener('shiftUpdated', handleShiftUpdate);
```

**Keuntungan**:
- ✅ Instant update (tidak perlu menunggu polling)
- ✅ Efficient (hanya refresh saat ada perubahan)

**Kekurangan**:
- ⚠️ Hanya bekerja untuk tab/window yang sama (same browser)
- ⚠️ Tidak bekerja untuk device/browser yang berbeda

### **3. Window Focus Refresh**

**Lokasi**: `src/components/RFIDLineContent.tsx`

```typescript
// Refresh saat window focus (user kembali ke tab)
const handleFocus = () => {
    loadSupervisorData();
    loadShiftData();
};
window.addEventListener('focus', handleFocus);
```

**Cara Kerja**:
- Saat user kembali ke tab/window, langsung refresh data
- Memastikan data selalu fresh saat user aktif

**Keuntungan**:
- ✅ Data selalu fresh saat user kembali
- ✅ Tidak perlu manual refresh

---

## 🔐 Environment Detection

### **Backend Detection**

**Lokasi**: `server.js`

```javascript
// Deteksi environment dari referer/origin header
const referer = req.headers.referer || req.headers.origin || '';
const port = referer.match(/:(\d+)/)?.[1];

let detectedEnv = CURRENT_ENV;

// Jika port 5174 terdeteksi, pastikan environment adalah MJL2
if (port === '5174') {
    detectedEnv = 'MJL2';
} else if (port === '5173' && CURRENT_ENV === 'MJL') {
    detectedEnv = 'MJL';
}

const environment = reqEnv === 'MJL' || reqEnv === 'MJL2' || reqEnv === 'CLN' 
    ? reqEnv 
    : detectedEnv;
```

**Cara Kerja**:
1. Extract port dari referer/origin header
2. Port 5174 → MJL2
3. Port 5173 → MJL
4. Default → CLN atau CURRENT_ENV

### **Frontend Detection**

**Lokasi**: `src/components/RFIDLineContent.tsx`, `src/config/api.ts`

```typescript
// Deteksi environment berdasarkan port sebagai fallback
const currentPort = window.location.port;
let fallbackEnv: 'CLN' | 'MJL' | 'MJL2' = 'CLN';

if (currentPort === '5174') {
    fallbackEnv = 'MJL2';
} else if (currentPort === '5173') {
    fallbackEnv = 'MJL';
} else {
    fallbackEnv = 'CLN';
}
```

**Cara Kerja**:
1. Baca port dari `window.location.port`
2. Port 5174 → MJL2
3. Port 5173 → MJL
4. Default → CLN

---

## 📝 API Endpoints

### **GET /api/shift-data**

**Query Parameters**:
- `environment` (optional): `'CLN' | 'MJL' | 'MJL2'`

**Response**:
```json
{
  "success": true,
  "data": {
    "0": "day",
    "CLN_1": "day",
    "MJL_1": "night",
    "MJL2_1": "day"
  },
  "environment": "MJL2",
  "lastUpdated": "2026-02-04T01:13:08.319Z",
  "timestamp": "2026-02-04T01:13:08.319Z"
}
```

**Cara Kerja**:
1. Baca `shift_data.json`
2. Deteksi environment dari referer/query
3. Filter data berdasarkan environment
4. Return filtered data

### **POST /api/shift-data**

**Request Body**:
```json
{
  "lineId": 1,
  "shift": "night",
  "environment": "MJL2"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Shift updated for line 1 (MJL2)",
  "data": {
    "lineId": "1",
    "shift": "night",
    "oldShift": "day",
    "storageKey": "MJL2_1",
    "environment": "MJL2"
  },
  "timestamp": "2026-02-04T01:13:08.319Z"
}
```

**Cara Kerja**:
1. Terima request body
2. Deteksi environment
3. Generate storage key (environment-aware)
4. Update `shift_data.json`
5. Return success response

### **GET /api/supervisor-data**

**Query Parameters**:
- `environment` (optional): `'CLN' | 'MJL' | 'MJL2'`

**Response**:
```json
{
  "success": true,
  "data": {
    "0": "Rusdi",
    "CLN_1": "RISMAN",
    "MJL_1": "DATI",
    "MJL2_1": "NENG JUNENGSIH"
  },
  "environment": "MJL2",
  "lastUpdated": "2026-01-27T03:04:18.343Z",
  "timestamp": "2026-02-04T01:13:08.319Z"
}
```

### **POST /api/supervisor-data**

**Request Body**:
```json
{
  "lineId": 1,
  "supervisor": "Nama Baru",
  "environment": "MJL2"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Supervisor updated for line 1 (MJL2)",
  "data": {
    "lineId": "1",
    "supervisor": "Nama Baru",
    "oldSupervisor": "Nama Lama",
    "storageKey": "MJL2_1",
    "environment": "MJL2"
  },
  "timestamp": "2026-02-04T01:13:08.319Z"
}
```

---

## 🔄 Complete Flow: Update dari PC A ke PC B

### **Timeline**

```
Time    PC A                          Server                    PC B
─────────────────────────────────────────────────────────────────────────
0s      User klik edit button
1s      Buka modal edit
2s      User ubah supervisor/shift
3s      User klik Save
        │
        ├─ POST /api/supervisor-data
        ├─ POST /api/shift-data
        │
        ▼
4s                          Terima request
                            Update shift_data.json
                            Update supervisor_data.json
                            Return success
        │
        ▼
5s      Dispatch event:
        - 'supervisorUpdated'
        - 'shiftUpdated'
        │
        │ (Event hanya untuk tab/window yang sama)
        │
        ▼
6s      Event listener trigger
        → loadSupervisorData()
        → loadShiftData()
        │
        │ (Polling untuk device/browser berbeda)
        │
        ▼
7s                          GET /api/supervisor-data
                            GET /api/shift-data
                            Return filtered data
        │
        ▼
8s                                              Terima data terbaru
                                                Update state
                                                Re-render UI
```

---

## 🎯 Kesimpulan

### **Apakah perubahan di PC A akan terlihat di PC B?**

**✅ YA**, dengan mekanisme:

1. **Polling (Setiap 3 detik)**
   - Semua device memanggil API setiap 3 detik
   - Maksimal delay: 3 detik
   - Works across different devices/browsers

2. **Event-Based (Instant untuk tab/window yang sama)**
   - Update instant untuk tab/window yang sama
   - Delay: < 1 detik
   - Hanya untuk browser yang sama

3. **Window Focus Refresh**
   - Refresh saat user kembali ke tab
   - Memastikan data fresh

### **Data Storage**

- **Lokasi**: File JSON di server (`shift_data.json`, `supervisor_data.json`)
- **Format**: Environment-aware keys untuk menghindari konflik
- **Sync**: Real-time melalui polling + events

### **Environment Separation**

- **CLN**: Data terpisah dengan prefix `CLN_`
- **MJL**: Data terpisah dengan prefix `MJL_`
- **MJL2**: Data terpisah dengan prefix `MJL2_`
- **No Conflict**: Setiap environment memiliki data sendiri

---

## 📚 Referensi File

- **Backend**: `server.js` (line 2675-2919 untuk shift, 2929-3290 untuk supervisor)
- **Frontend**: 
  - `src/components/RFIDLineContent.tsx` (polling & event listeners)
  - `src/components/EditSupervisorShiftModal.tsx` (update & dispatch events)
- **Data Files**:
  - `shift_data.json`
  - `supervisor_data.json`

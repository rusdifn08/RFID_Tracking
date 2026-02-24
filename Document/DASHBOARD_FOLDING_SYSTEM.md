# Dokumentasi Sistem Dashboard Folding

## Daftar Isi
1. [Overview](#overview)
2. [Arsitektur Sistem](#arsitektur-sistem)
3. [Komponen Utama](#komponen-utama)
4. [Data Flow](#data-flow)
5. [API Endpoints](#api-endpoints)
6. [State Management](#state-management)
7. [Optimistic Updates](#optimistic-updates)
8. [Real-time Updates](#real-time-updates)
9. [Access Control](#access-control)
10. [Optimasi Performance](#optimasi-performance)
11. [File Storage](#file-storage)
12. [Fitur Detail](#fitur-detail)

---

## Overview

Dashboard Folding adalah sistem monitoring dan tracking untuk proses folding garment di production line. Sistem ini menampilkan data real-time dari 8 table folding, tracking scanning RFID, dan distribusi data per line production.

### Teknologi yang Digunakan
- **Frontend**: React 18 + TypeScript
- **State Management**: React Query (TanStack Query)
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Backend Proxy**: Node.js + Express
- **Storage**: JSON Files (folding_checkout_data.json, folding_checkout_detail.json)

---

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         DashboardFolding.tsx                          │   │
│  │  - State Management                                   │   │
│  │  - UI Components                                      │   │
│  │  - Data Processing                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         ScanningFinishingModal.tsx                   │   │
│  │  - RFID Scanning                                      │   │
│  │  - Sound Effects                                      │   │
│  │  - Success/Error Handling                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP Requests
┌─────────────────────────────────────────────────────────────┐
│              Proxy Server (server.js)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - API Proxying                                      │   │
│  │  - Data Storage (JSON Files)                          │   │
│  │  - User Session Management                            │   │
│  │  - Folding Checkout Tracking                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP Requests
┌─────────────────────────────────────────────────────────────┐
│              Backend API (10.5.0.106:7000)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - /finishing?line={line}                            │   │
│  │  - /garment/folding/out                              │   │
│  │  - /monitoring/line?line={line}                      │   │
│  │  - /user?nik={nik}                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Komponen Utama

### 1. DashboardFolding Component

**File**: `src/pages/DashboardFolding.tsx`

Komponen utama yang mengatur seluruh dashboard folding.

#### Props
Tidak ada props (root component)

#### State Variables

```typescript
// UI State
const [hoveredTable, setHoveredTable] = useState<number | null>(null);
const [selectedTable, setSelectedTable] = useState<number | null>(null);
const [isLoaded, setIsLoaded] = useState(false);
const [selectedTableDetail, setSelectedTableDetail] = useState<number | null>(null);
const [showFoldingScanModal, setShowFoldingScanModal] = useState(false);

// Optimistic Update State
const [optimisticCounts, setOptimisticCounts] = useState<Record<number, number>>({});
const [lastKnownCounts, setLastKnownCounts] = useState<Record<number, number>>({});

// Filter State
const [filterWo, setFilterWo] = useState<string>('');
const [filterDateFrom, setFilterDateFrom] = useState<string>('');
const [filterDateTo, setFilterDateTo] = useState<string>('');
const [showWoFilterModal, setShowWoFilterModal] = useState(false);
const [showDateFilterModal, setShowDateFilterModal] = useState(false);
const [showDetailModal, setShowDetailModal] = useState(false);
const [detailModalType, setDetailModalType] = useState<FinishingMetricType>('waiting');
const [detailModalSection, setDetailModalSection] = useState<FinishingSection>('folding');
const [detailSearchQuery, setDetailSearchQuery] = useState('');

// Data Tracking State
const [linesWithData, setLinesWithData] = useState<Set<string>>(new Set());
const [isInitialCheckDone, setIsInitialCheckDone] = useState(false);
```

#### Data Queries

**1. Active Users Query**
```typescript
const { data: activeUsersResponse } = useQuery({
  queryKey: ['active-users-folding'],
  queryFn: async () => {
    const response = await getActiveUsers();
    return response.success ? response.data : [];
  },
  refetchInterval: 10000, // 10 detik
  staleTime: 5000,
  retry: 2,
});
```
- **Purpose**: Mengambil daftar user yang sedang login
- **Refresh**: Setiap 10 detik
- **Data Structure**: Array of `{ line, nik, name, jabatan, bagian }`

**2. Finishing Data Query**
```typescript
const { data: finishingResponse } = useQuery({
  queryKey: ['finishing-data-folding'],
  queryFn: async () => {
    const response = await getFinishingData();
    return response.data;
  },
  staleTime: 20000,
  refetchInterval: 60000, // 60 detik
  refetchOnWindowFocus: true,
  retry: 3,
});
```
- **Purpose**: Mengambil summary data finishing (waiting, checkin, checkout)
- **Refresh**: Setiap 60 detik atau saat window focus

**3. Initial Line Check Query**
```typescript
const { data: allLineFinishingData } = useQuery({
  queryKey: ['finishing-data-all-lines-folding-initial'],
  queryFn: async () => {
    // Fetch semua line (1-15) sekali untuk cek mana yang ada data
    // Return: Record<lineNumber, { finishing, wo }>
  },
  staleTime: Infinity, // Tidak akan dianggap stale
  refetchInterval: false, // Tidak refetch otomatis
  refetchOnWindowFocus: false,
  refetchOnMount: true, // Hanya fetch saat mount
});
```
- **Purpose**: Initial check untuk menentukan line mana yang ada data
- **Optimasi**: Hanya dijalankan sekali saat component mount
- **Output**: Set `linesWithData` dengan line yang aktif

**4. Active Lines Query**
```typescript
const { data: activeLineFinishingData } = useQuery({
  queryKey: ['finishing-data-active-lines-folding', Array.from(linesWithData).sort().join(',')],
  queryFn: async () => {
    // Hanya fetch line yang ada datanya
  },
  enabled: isInitialCheckDone && linesWithData.size > 0,
  staleTime: 30000,
  refetchInterval: 120000, // 2 menit
  refetchOnWindowFocus: false,
});
```
- **Purpose**: Fetch data untuk line yang aktif saja
- **Optimasi**: Hanya fetch line yang ada data, refresh setiap 2 menit

**5. Hourly Folding Data Query**
```typescript
const { data: hourlyFoldingDataResponse } = useQuery({
  queryKey: ['hourly-folding-checkout-data'],
  queryFn: async () => {
    // GET /api/folding/hourly?date={today}
    // Return: Array of { hour, table1, table2, ..., table8 }
  },
  staleTime: 20000,
  refetchInterval: 30000, // 30 detik
  refetchOnWindowFocus: true,
});
```
- **Purpose**: Data per jam untuk chart "Hourly Shipment Table Folding"
- **Data Source**: Custom endpoint `/api/folding/hourly`

**6. Table Count Query**
```typescript
const { data: tableCountDataResponse } = useQuery({
  queryKey: ['folding-checkout-count-per-table'],
  queryFn: async () => {
    // GET /api/folding/count?date={today}
    // Return: { table1, table2, ..., table8 }
  },
  staleTime: 20000,
  refetchInterval: 30000, // 30 detik
  refetchOnWindowFocus: true,
});
```
- **Purpose**: Total count per table untuk card "Shipment Station Folding"
- **Data Source**: Custom endpoint `/api/folding/count`

**7. Table WO Data Query**
```typescript
const { data: tableWoData } = useQuery({
  queryKey: ['table-wo-data', activeUsersMap.size],
  queryFn: async () => {
    // Hanya fetch WO untuk table yang ada active user
    // GET /api/folding/detail?date={today}&table={tableNum}
    // Return: Record<tableNumber, wo>
  },
  enabled: activeUsersMap.size > 0,
  staleTime: 20000,
  refetchInterval: 60000, // 60 detik
  refetchOnWindowFocus: true,
});
```
- **Purpose**: WO terakhir untuk setiap table
- **Optimasi**: Hanya fetch untuk table yang ada active user

---

## Data Flow

### 1. Flow Data Finishing Line

```
Component Mount
    ↓
Initial Check Query
    ↓
Fetch semua line (1-15) → /finishing?line={line}
    ↓
Cek data per line (waiting, checkin, checkout)
    ↓
Set linesWithData (line yang ada data)
    ↓
Active Lines Query (hanya line yang ada data)
    ↓
Merge Data (allLineFinishingData + activeLineFinishingData)
    ↓
Process untuk Table Distribution
```

### 2. Flow Scanning Folding Out

```
User Scan RFID
    ↓
ScanningFinishingModal
    ↓
POST /garment/folding/out?rfid_garment={rfid}
    Body: { nik, table }
    ↓
server.js intercept response
    ↓
Save to folding_checkout_data.json (count)
    Save to folding_checkout_detail.json (detail)
    ↓
Return response to frontend
    ↓
onSuccess callback
    ↓
Optimistic Update (increment count immediately)
    ↓
Invalidate queries
    ↓
Refetch data (real-time update)
```

### 3. Flow Optimistic Update

```
Scan Success
    ↓
Set lastKnownCount (current count before increment)
    ↓
Increment optimisticCounts[tableNumber] += 1
    ↓
UI Update (immediate, no wait for API)
    ↓
Refetch tableCountData
    ↓
useEffect monitor: currentRealCount >= lastKnown + optimistic
    ↓
Reset optimisticCount (data sudah ter-update)
```

---

## API Endpoints

### Frontend → Proxy Server

#### 1. Get Active Users
```
GET /api/active-users
Response: {
  success: true,
  data: [
    { line: "1", nik: "01", name: "FO_1", jabatan: "FOLDING", bagian: "FOLDING" },
    ...
  ]
}
```

#### 2. Get Finishing Data
```
GET /finishing
Response: {
  folding: { waiting: 0, checkin: 0, checkout: 0 },
  dryroom: { waiting: 0, checkin: 0, checkout: 0 },
  reject_room: { waiting: 0, checkin: 0, checkout: 0, reject_mati: 0 }
}
```

#### 3. Get Finishing Data by Line
```
GET /finishing?line={lineNumber}
Response: {
  folding: { waiting: 0, checkin: 0, checkout: 0 },
  dryroom: { waiting: 0, checkin: 0, checkout: 0 },
  reject_room: { waiting: 0, checkin: 0, checkout: 0 }
}
```

#### 4. Folding Checkout
```
POST /garment/folding/out?rfid_garment={rfid}
Body: { nik: "02", table: "4" }
Response: {
  message: "Success OUT Folding",
  rfid: "0008390438",
  wo: "186808",
  style: "1128733",
  item: "STORM CRUISER JACKET M'S",
  buyer: "HEXAPOLE COMPANY LIMITED",
  color: "BK",
  size: "L",
  status: "OUT_FOLDING",
  nik_operator: "02",
  is_done: "done"
}
```

#### 5. Get Hourly Folding Data
```
GET /api/folding/hourly?date={YYYY-MM-DD}
Response: {
  success: true,
  data: [
    { hour: "08:00", table1: 5, table2: 3, ..., table8: 0 },
    { hour: "09:00", table1: 10, table2: 7, ..., table8: 0 },
    ...
  ]
}
```

#### 6. Get Table Count
```
GET /api/folding/count?date={YYYY-MM-DD}
Response: {
  success: true,
  data: {
    table1: 15,
    table2: 10,
    table3: 8,
    ...
    table8: 0
  }
}
```

#### 7. Get Table Detail
```
GET /api/folding/detail?date={YYYY-MM-DD}&table={tableNumber}
Response: {
  success: true,
  data: [
    {
      id: 1737288000000,
      rfid: "0008390438",
      wo: "186808",
      style: "1128733",
      item: "STORM CRUISER JACKET M'S",
      buyer: "HEXAPOLE COMPANY LIMITED",
      color: "BK",
      size: "L",
      status: "Shipment",
      timestamp: "2025-01-19T08:58:44.000Z",
      line: "4",
      nik_operator: "02",
      is_done: "done"
    },
    ...
  ]
}
```

#### 8. Get Monitoring Line
```
GET /monitoring/line?line={lineNumber}
Response: {
  success: true,
  data: {
    WO: "186808",
    Item: "STORM CRUISER JACKET M'S",
    Style: "1128733",
    Buyer: "HEXAPOLE COMPANY LIMITED",
    Color: "BK",
    Size: "L"
  }
}
```

---

## State Management

### 1. React Query Cache

React Query digunakan untuk:
- **Caching**: Data di-cache berdasarkan `queryKey`
- **Stale Time**: Data dianggap fresh selama periode tertentu
- **Refetch Interval**: Auto-refetch pada interval tertentu
- **Background Updates**: Update data di background tanpa blocking UI

### 2. Local State (useState)

**Optimistic Counts**
```typescript
const [optimisticCounts, setOptimisticCounts] = useState<Record<number, number>>({});
// Format: { 1: 2, 4: 1 } = table 1 ada 2 optimistic, table 4 ada 1
```

**Last Known Counts**
```typescript
const [lastKnownCounts, setLastKnownCounts] = useState<Record<number, number>>({});
// Format: { 1: 10, 4: 5 } = table 1 terakhir diketahui 10, table 4 terakhir 5
```

**Lines With Data**
```typescript
const [linesWithData, setLinesWithData] = useState<Set<string>>(new Set());
// Format: Set(["1", "3", "4"]) = line 1, 3, 4 yang ada data
```

### 3. Computed State (useMemo)

**Active Users Map**
```typescript
const activeUsersMap = useMemo(() => {
  const map = new Map<string, ActiveUser>();
  activeUsersResponse?.forEach(user => {
    map.set(user.line.toString(), user);
  });
  return map;
}, [activeUsersResponse]);
```

**Check Out Stations**
```typescript
const checkOutStations = useMemo(() => {
  return Array.from({ length: 8 }, (_, i) => {
    const tableNum = i + 1;
    const apiCount = tableCountDataResponse?.[`table${tableNum}`] ?? 0;
    const optimisticCount = optimisticCounts[tableNum] || 0;
    const total = apiCount + optimisticCount;
    const wo = tableWoData?.[tableNum] || '-';
    const activeUser = activeUsersMap.get(tableNum.toString());
    
    return {
      tableNumber: tableNum,
      count: total,
      wo: wo,
      operator: activeUser?.name || '',
      operatorNIK: activeUser?.nik || '',
      color: TABLE_COLORS[i],
      hasUser: !!activeUser,
      canAccess: canAccessTable(tableNum),
    };
  });
}, [lineChartData, tableCountDataResponse, optimisticCounts, activeUsersMap, canAccessTable, tableWoData]);
```

**Table Distribution Data**
```typescript
const tableDistributionData = useMemo(() => {
  if (!mergedLineFinishingData) return [];
  
  const result: TableDistributionData[] = [];
  productionLines.forEach((line) => {
    const lineNumber = line.line || line.id.toString();
    const lineData = mergedLineFinishingData[lineNumber];
    const finishing = lineData?.finishing;
    
    // Hanya tampilkan jika ada data
    if (waiting === 0 && checkIn === 0 && checkOut === 0) return;
    
    result.push({
      line: `Line ${lineNumber}`,
      wo: wo?.wo || '-',
      item: wo?.item || '-',
      waiting,
      checkIn,
      checkOut,
      operatorNIK: operator.nik,
      operatorName: operator.name,
    });
  });
  
  return result;
}, [mergedLineFinishingData, productionLines]);
```

---

## Optimistic Updates

### Konsep
Optimistic update memungkinkan UI update segera setelah user action, tanpa menunggu response dari server. Ini memberikan pengalaman yang lebih responsif.

### Implementasi

#### 1. On Scan Success
```typescript
onSuccess={() => {
  // Simpan count saat ini SEBELUM increment
  const currentCount = tableCountData ?? 0;
  setLastKnownCount(currentCount);
  
  // Increment optimistic count
  setOptimisticCounts(prev => ({
    ...prev,
    [tableNumber]: (prev[tableNumber] || 0) + 1
  }));
  
  // Refetch data
  refetchData(tableNumber);
}}
```

#### 2. Reset Logic
```typescript
useEffect(() => {
  const currentRealCount = tableCountData ?? 0;
  
  if (optimisticCount > 0) {
    const expectedCount = lastKnownCount + optimisticCount;
    // Jika data real sudah mencapai expected, reset optimistic
    if (currentRealCount >= expectedCount) {
      setOptimisticCounts(prev => {
        const newCounts = { ...prev };
        delete newCounts[tableNumber];
        return newCounts;
      });
      setLastKnownCount(currentRealCount);
    }
  }
}, [tableCountData, optimisticCount, lastKnownCount]);
```

### Alur Optimistic Update

```
1. User scan RFID → Success
2. Set lastKnownCount = currentCount (misal: 5)
3. Increment optimisticCounts[table] += 1
4. UI langsung update: count = 5 + 1 = 6
5. Refetch data dari API
6. API return: count = 6
7. useEffect detect: 6 >= 5 + 1 → true
8. Reset optimisticCounts[table] = 0
9. UI tetap 6 (karena sudah sesuai dengan real data)
```

---

## Real-time Updates

### 1. Query Refetch Intervals

| Query          | Interval  | Purpose                    |
|----------------|-----------|----------------------------|
| Active Users   | 10 detik  | Update user yang login     |
| Finishing Data | 60 detik  | Update summary data        |
| Hourly Data    | 30 detik  | Update chart data          |
| Table Count    | 30 detik  | Update card counts         |
| Active Lines   | 120 detik | Update line data           |
| Table WO       | 60 detik  | Update WO terakhir         |
| Table Detail   | 30 detik  | Update detail data (modal) |

### 2. Manual Refetch Triggers

- **After Scan Success**: Invalidate semua related queries
- **Window Focus**: Refetch saat user kembali ke tab
- **Manual Refresh**: Button refresh di UI

### 3. Query Invalidation

```typescript
// Setelah scan success
queryClient.invalidateQueries({ queryKey: ['hourly-folding-checkout-data'] });
queryClient.invalidateQueries({ queryKey: ['folding-checkout-count-per-table'] });
queryClient.invalidateQueries({ queryKey: ['table-detail-data', tableNumber] });
queryClient.invalidateQueries({ queryKey: ['table-wo-data'] });
```

---

## Access Control

### 1. User Roles

Role yang bisa akses semua table:
- `FOLDING`
- `IT`
- `ROBOTIC`
- `MANAGER`

### 2. Access Logic

```typescript
const canAccessTable = useCallback((tableNumber: number): boolean => {
  if (!user) return false;
  
  const userRole = user.jabatan || user.bagian || '';
  const allowedRoles = ['FOLDING', 'IT', 'ROBOTIC', 'MANAGER'];
  
  // Jika role diizinkan, bisa akses semua
  if (allowedRoles.includes(userRole)) return true;
  
  // Cek apakah user login di table ini
  const activeUser = activeUsersMap.get(tableNumber.toString());
  if (activeUser && activeUser.nik === user.nik) return true;
  
  return false;
}, [user, activeUsersMap]);
```

### 3. Visual Indicators

- **Can Access**: 
  - Card normal (opacity: 1)
  - Cursor pointer
  - Hover effects aktif
  - Clickable
  
- **Cannot Access**:
  - Card disabled (opacity: 0.5)
  - Cursor not-allowed
  - No hover effects
  - Not clickable

---

## Optimasi Performance

### 1. Conditional Fetching

**Hanya fetch line yang ada data:**
```typescript
// Initial check: fetch semua line sekali
// Setelah itu: hanya fetch line yang ada data
enabled: isInitialCheckDone && linesWithData.size > 0
```

**Hanya fetch table yang ada active user:**
```typescript
// Table WO data
enabled: activeUsersMap.size > 0

// Table detail (modal)
enabled: !!tableNumber && hasActiveUser
```

### 2. Stale Time Configuration

| Query         | Stale Time | Reason                    |
|---------------|------------|---------------------------|
| Initial Check | Infinity   | Hanya sekali saat mount   |
| Active Lines  | 30 detik   | Data tidak sering berubah |
| Hourly Data   | 20 detik   | Update cukup sering       |
| Table Count   | 20 detik   | Update cukup sering       |
| Table WO      | 20 detik   | WO tidak sering berubah   |

### 3. Refetch Interval Optimization

- **Initial Check**: `false` (tidak refetch)
- **Active Lines**: 120 detik (2 menit)
- **Hourly/Count**: 30 detik
- **Table WO**: 60 detik

### 4. Memoization

- `useMemo` untuk computed values
- `useCallback` untuk functions
- Dependency arrays yang tepat

### 5. Request Reduction

**Sebelum Optimasi:**
- Fetch 15 line setiap 60 detik = ~900 request/jam
- Fetch 8 table detail setiap 5 detik = ~960 request/jam
- Total: ~1860 request/jam

**Sesudah Optimasi:**
- Initial check: 15 request sekali
- Active lines (3 line): 3 request per 2 menit = ~90 request/jam
- Table detail (hanya yang ada user): ~50 request/jam
- Total: ~140 request/jam

**Pengurangan: ~92%**

---

## File Storage

### 1. folding_checkout_data.json

**Purpose**: Menyimpan count per table per jam per hari

**Structure**:
```json
{
  "2025-01-20": {
    "4": {
      "08": 5,
      "09": 10,
      "10": 8
    },
    "totalPerTable": {
      "4": 23
    }
  }
}
```

**Operations**:
- **Read**: Saat server start (loadFoldingCheckoutData)
- **Write**: Setiap scan success (saveFoldingCheckout)
- **Location**: Root project directory

### 2. folding_checkout_detail.json

**Purpose**: Menyimpan detail lengkap setiap scan (RFID, WO, Item, dll)

**Structure**:
```json
{
  "2025-01-20": {
    "4": [
      {
        "id": 1737288000000,
        "rfid": "0008390438",
        "wo": "186808",
        "style": "1128733",
        "item": "STORM CRUISER JACKET M'S",
        "buyer": "HEXAPOLE COMPANY LIMITED",
        "color": "BK",
        "size": "L",
        "status": "Shipment",
        "timestamp": "2025-01-19T08:58:44.000Z",
        "line": "4",
        "nik_operator": "02",
        "is_done": "done"
      }
    ]
  }
}
```

**Operations**:
- **Read**: Via API `/api/folding/detail`
- **Write**: Setiap scan success (saveFoldingCheckout dengan responseData)
- **Location**: Root project directory

### 3. Server-side Functions

**saveFoldingCheckout(tableNumber, rfid_garment, nik, responseData)**
```javascript
function saveFoldingCheckout(tableNumber, rfid_garment, nik, responseData) {
  // 1. Load existing data
  // 2. Increment count per hour
  // 3. Save detail data
  // 4. Update in-memory storage
  // 5. Write to file
  // 6. Console log
}
```

**loadFoldingCheckoutData()**
```javascript
function loadFoldingCheckoutData() {
  // 1. Check if file exists
  // 2. Read file
  // 3. Parse JSON
  // 4. Load to in-memory Map
}
```

---

## Fitur Detail

### 1. Shipment Station Folding Cards

**Location**: Main dashboard, 8 cards (Table 1-8)

**Data Source**:
- Count: `tableCountDataResponse[tableX] + optimisticCounts[X]`
- WO: `tableWoData[X]` (WO terakhir dari scanning)
- Operator: `activeUsersMap.get(X.toString())`

**Features**:
- Real-time count update
- WO display (terakhir)
- Operator info (jika ada user login)
- Color coding per table
- Access control (disabled jika tidak bisa akses)
- Click to open detail modal

**Card States**:
- **Has User**: Tampilkan operator name dan NIK
- **No User**: Kosong (tidak tampilkan operator)
- **Can Access**: Normal, clickable
- **Cannot Access**: Disabled, not clickable

### 2. Hourly Shipment Table Folding Chart

**Location**: Main dashboard, line chart

**Data Source**: `hourlyFoldingDataResponse`

**Chart Configuration**:
- Type: Line Chart (Recharts)
- X-Axis: Hours (08:00 - 15:00)
- Y-Axis: Count
- Lines: 8 lines (table1 - table8)
- Colors: TABLE_COLORS array

**Update Frequency**: 30 detik

### 3. Table Distribution Folding

**Location**: Right side of main dashboard

**Data Source**: `tableDistributionData` (computed from `mergedLineFinishingData`)

**Columns**:
- Line
- WO
- Item
- Waiting
- Check In
- Check Out

**Features**:
- Hanya tampilkan line yang ada data
- Export to Excel
- Filter by WO (future)
- Filter by Date (future)

**Data Processing**:
```typescript
// Filter: hanya line dengan data folding (tidak semua 0)
if (waiting === 0 && checkIn === 0 && checkOut === 0) return;

// Operator: dari activeUsersMap atau dummy
const operator = activeUser || dummyOperators[index];
```

### 4. Table Detail Modal

**Location**: Modal saat click card table

**Components**:
- **Left Panel**:
  - Shipment Table Card (count, WO, operator)
  - Detail Data Table (RFID, WO, Item, Color, Size, Status, Time)
  
- **Right Panel**:
  - Scanning Modal (RFID scanner)

**Data Sources**:
- Count: `tableCountData + optimisticCount`
- WO: `tableWoModal` (query khusus modal)
- Detail: `tableDetailData` (dari `/api/folding/detail`)

**Features**:
- Real-time scanning
- Auto-focus RFID input
- Sound effects (success/error)
- Optimistic updates
- Auto-refresh setiap 30 detik

### 5. Scanning Finishing Modal

**Location**: Modal untuk scanning RFID

**Features**:
- **Auto-focus**: Input selalu focused
- **Keyboard Suppression**: `inputMode="none"` untuk mobile
- **Sound Effects**: 
  - Success: `assets/success.mp3`
  - Error: `assets/error.mp3`
- **Real-time Feedback**: Tampilkan scanned items
- **Error Handling**: Tampilkan error message

**Scan Flow**:
```
1. User scan RFID
2. Trim whitespace
3. Validate RFID
4. Call API: POST /garment/folding/out
5. Play sound (success/error)
6. Add to scanned items list
7. Call onSuccess callback
8. Optimistic update
9. Refetch data
```

### 6. Access Control System

**User Roles**:
- **FOLDING**: Operator folding (bisa akses table sendiri)
- **IT**: IT staff (bisa akses semua)
- **ROBOTIC**: Robotic team (bisa akses semua)
- **MANAGER**: Manager (bisa akses semua)

**Access Rules**:
1. Role `FOLDING`, `IT`, `ROBOTIC`, `MANAGER` → bisa akses semua table
2. User dengan NIK yang sama dan line yang sama → bisa akses table tersebut
3. Selain itu → tidak bisa akses

**Implementation**:
```typescript
const canAccessTable = (tableNumber: number): boolean => {
  // Check role
  if (allowedRoles.includes(userRole)) return true;
  
  // Check NIK and line match
  const activeUser = activeUsersMap.get(tableNumber.toString());
  if (activeUser?.nik === user.nik) return true;
  
  return false;
};
```

### 7. Filter System

**Current Filters**:
- WO Filter (modal)
- Date Filter (modal)

**Future Filters**:
- Line filter
- Status filter
- Operator filter

### 8. Export Functionality

**Export to Excel**:
- Function: `exportFinishingToExcel`
- Format: Excel (.xlsx)
- Data: Table Distribution data
- Columns: Line, WO, Style, Item, Buyer, Operator NIK, Operator Name, Waiting, Check In, Check Out

---

## Error Handling

### 1. API Error Handling

```typescript
try {
  const response = await apiCall();
  if (!response.ok) {
    throw new Error('Failed to fetch');
  }
  return await response.json();
} catch (error) {
  console.error('Error:', error);
  return defaultValue; // Fallback value
}
```

### 2. Query Error Handling

React Query automatically handles:
- Retry logic (configurable)
- Error states
- Loading states

### 3. User Feedback

- **Success**: Sound effect + success message
- **Error**: Sound effect + error message
- **Loading**: Loading indicators

---

## Console Logging

### Server-side Logs

**Folding Checkout Success**:
```
📦 [FOLDING CHECKOUT] ==========================================
📦 [FOLDING CHECKOUT] ✅ Check Out Berhasil!
📦 [FOLDING CHECKOUT] RFID: 0008390438
📦 [FOLDING CHECKOUT] Table: 4
📦 [FOLDING CHECKOUT] NIK: 02
📦 [FOLDING CHECKOUT] WO: 186808
📦 [FOLDING CHECKOUT] Item: STORM CRUISER JACKET M'S
📦 [FOLDING CHECKOUT] Time: 08:58:44
📦 [FOLDING CHECKOUT] Hour 08:00 - Count: 4 → 5
📦 [FOLDING CHECKOUT] Total Table 4 Hari Ini: 23
📦 [FOLDING CHECKOUT] ==========================================
```

**User Login**:
```
🔐 [USER LOGIN] ==========================================
🔐 [USER LOGIN] ✅ User berhasil login!
🔐 [USER LOGIN] NIK: 02
🔐 [USER LOGIN] Nama: FO_4
🔐 [USER LOGIN] Jabatan: FOLDING
🔐 [USER LOGIN] ==========================================
```

---

## Testing & Debugging

### 1. React Query DevTools

Install React Query DevTools untuk debugging:
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<ReactQueryDevtools initialIsOpen={false} />
```

### 2. Network Tab

Monitor network requests di browser DevTools:
- Filter by "finishing" atau "folding"
- Check request frequency
- Verify response data

### 3. Console Logs

- Server logs: Terminal running `server.js`
- Client logs: Browser console
- Error logs: Both locations

---

## Future Improvements

### 1. WebSocket Integration
- Real-time updates tanpa polling
- Push notifications untuk events

### 2. Advanced Filtering
- Multi-select filters
- Date range picker
- Search functionality

### 3. Analytics Dashboard
- Statistics per table
- Trends over time
- Performance metrics

### 4. Offline Support
- Service Worker
- Local storage backup
- Sync when online

---

## Troubleshooting

### Issue: Data tidak update real-time
**Solution**: 
- Check `refetchInterval` configuration
- Verify query invalidation after scan
- Check network tab for failed requests

### Issue: Optimistic update tidak reset
**Solution**:
- Check `lastKnownCount` is set correctly
- Verify `useEffect` dependency array
- Check API response matches expected format

### Issue: Too many requests
**Solution**:
- Verify `enabled` conditions
- Check `staleTime` configuration
- Ensure conditional fetching is working

### Issue: Access control tidak bekerja
**Solution**:
- Verify user data structure
- Check `activeUsersMap` is populated
- Verify role comparison logic

---

## Conclusion

Dashboard Folding adalah sistem yang kompleks dengan banyak fitur dan optimasi. Dokumentasi ini mencakup semua aspek dari high-level architecture sampai low-level implementation details. Untuk pertanyaan lebih lanjut, refer ke kode source atau hubungi development team.

---

**Last Updated**: 2025-01-20
**Version**: 1.0.0
**Author**: Development Team

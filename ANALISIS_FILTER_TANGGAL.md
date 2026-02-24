# 📊 ANALISIS SISTEM FILTER TANGGAL - Dashboard RFID

## 🔍 MASALAH YANG DITEMUKAN

**Filter tanggal TIDAK berfungsi** untuk menampilkan data di dashboard karena:
1. Data yang ditampilkan diambil dari **WebSocket** yang tidak menerima parameter filter tanggal
2. Filter tanggal hanya digunakan untuk **Export Excel**, bukan untuk menampilkan data real-time

---

## 📋 CARA KERJA SISTEM SAAT INI

### 1. **Alur Filter Tanggal di UI**

```
User mengubah tanggal di DataLineCard
    ↓
onDateFromChange / onDateToChange dipanggil
    ↓
setFilterDateFrom / setFilterDateTo (Zustand Store)
    ↓
filterDateFrom & filterDateTo tersimpan di store
    ↓
❌ TAPI TIDAK DIGUNAKAN UNTUK FETCH DATA!
```

**File terkait:**
- `src/components/dashboard/DataLineCard.tsx` (line 25-34, 1057-1058)
- `src/stores/dashboardStore.ts` (line 29-32, 72-76)
- `src/pages/DashboardRFID.tsx` (line 85-86, 1057-1058)

### 2. **Sumber Data Dashboard**

#### A. **Data Tracking (Good, Rework, Reject, WIRA, dll)**
- **Sumber**: WebSocket (`useWiraDashboardWebSocket`)
- **File**: `src/hooks/useDashboardRFIDQuery.ts` (line 240-251)
- **Masalah**: WebSocket tidak menerima parameter filter tanggal
- **Hasil**: Data selalu real-time tanpa filter tanggal

```typescript
// src/hooks/useDashboardRFIDQuery.ts (line 240-251)
const { data: wiraWebSocketData } = useWiraDashboardWebSocket({
    enabled: true,
});

// Extract line data dari WebSocket data
const trackingData = useMemo(() => {
    return extractLineDataFromWebSocket(
        wiraWebSocketData?.data,
        lineId,
        filterWo || undefined  // ❌ Hanya filter WO, TIDAK ada filter tanggal!
    );
}, [wiraWebSocketData?.data, lineId, filterWo]);
```

#### B. **Data WO (Work Order)**
- **Sumber**: API `/monitoring/line` atau `/wira?wo=xxx`
- **File**: `src/hooks/useDashboardRFIDQuery.ts` (line 127-225)
- **Masalah**: API call tidak menggunakan `filterDateFrom` dan `filterDateTo`
- **Hasil**: Data WO tidak terfilter berdasarkan tanggal

```typescript
// src/hooks/useDashboardRFIDQuery.ts (line 127-136)
const fetchWoData = async (lineId: string, filterWo: string) => {
    let url = `${API_BASE_URL}/monitoring/line?line=${encodeURIComponent(normalizedLineId)}`;
    
    if (filterWo) {
        url = `${API_BASE_URL}/wira?wo=${encodeURIComponent(filterWo)}`;
    }
    // ❌ TIDAK ADA PARAMETER filterDateFrom & filterDateTo!
}
```

#### C. **Export Excel**
- **Sumber**: API `/wira?LINE={line}&tanggalfrom={from}&tanggalto={to}`
- **File**: `src/pages/DashboardRFID.tsx` (line 757-778)
- **Status**: ✅ **BERFUNGSI** - Filter tanggal digunakan untuk export

```typescript
// src/pages/DashboardRFID.tsx (line 778)
const url = `${API_BASE_URL}/wira?LINE=${encodeURIComponent(lineId)}&tanggalfrom=${encodeURIComponent(formattedDate)}&tanggalto=${encodeURIComponent(formattedDate)}`;
```

---

## 🔌 API YANG TERSEDIA

### API `/wira` dengan Filter Tanggal

**Endpoint**: `GET /wira?LINE={line}&wo={wo}&tanggalfrom={tanggalfrom}&tanggalto={tanggalto}`

**Parameter:**
- `LINE` (string/number, optional): Nomor line
- `wo` (string, optional): Work Order number
- `tanggalfrom` (string, optional): Tanggal mulai (format: `YYYY-M-D`, contoh: `2025-1-15`)
- `tanggalto` (string, optional): Tanggal akhir (format: `YYYY-M-D`, contoh: `2025-1-20`)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "Line": "1",
      "WO": "185759",
      "Style": "STYLE001",
      "Buyer": "BUYER001",
      "Item": "ITEM001",
      "Good": 800,
      "Rework": 30,
      "Reject": 50,
      "WIRA": 20,
      "PQC Good": 700,
      "PQC Rework": 25,
      "PQC Reject": 40,
      "PQC WIRA": 15,
      "Output Sewing": 750,
      "Balance": 1000
    }
  ]
}
```

**Status**: ✅ API ini **MENDUKUNG** filter tanggal, tapi **TIDAK DIGUNAKAN** untuk menampilkan data dashboard

---

## 🐛 ROOT CAUSE ANALYSIS

### Masalah Utama:
1. **Data Dashboard dari WebSocket**: WebSocket memberikan data real-time tanpa filter tanggal
2. **Filter Tanggal Hanya di Store**: Filter tanggal disimpan tapi tidak digunakan untuk fetch data
3. **API `/wira` dengan Filter Tanggal Tersedia**: API sudah mendukung filter tanggal, tapi tidak digunakan

### Dampak:
- User mengubah filter tanggal → UI update → TAPI data tidak berubah
- Data yang ditampilkan selalu real-time (tanpa filter tanggal)
- Filter tanggal hanya berpengaruh saat export Excel

---

## 💡 SOLUSI YANG DISARANKAN

### Opsi 1: **Hybrid Approach (Recommended)**
- Gunakan **WebSocket** untuk data real-time (default)
- Ketika filter tanggal aktif, **fallback ke API `/wira`** dengan parameter tanggal
- Update data secara berkala (polling) saat filter tanggal aktif

### Opsi 2: **Full API dengan Polling**
- Selalu gunakan API `/wira` dengan parameter filter tanggal
- Polling setiap 5 detik untuk update data
- Nonaktifkan WebSocket saat filter tanggal aktif

### Opsi 3: **WebSocket dengan Filter Client-Side**
- Tetap gunakan WebSocket untuk data real-time
- Filter data di client-side berdasarkan tanggal timestamp
- **Keterbatasan**: Hanya bisa filter data yang sudah diterima, tidak bisa filter data historis

---

## 📝 REKOMENDASI IMPLEMENTASI

### Langkah 1: Modifikasi `useDashboardRFIDQuery.ts`

```typescript
// Tambahkan logika: jika filter tanggal aktif, gunakan API, jika tidak, gunakan WebSocket
const shouldUseAPI = filterDateFrom || filterDateTo;

if (shouldUseAPI) {
    // Fetch dari API /wira dengan parameter tanggal
    const url = `${API_BASE_URL}/wira?LINE=${lineId}&tanggalfrom=${formattedFrom}&tanggalto=${formattedTo}`;
    // ... fetch dan update state
} else {
    // Gunakan WebSocket (seperti sekarang)
    // ... extract dari WebSocket
}
```

### Langkah 2: Update `fetchWoData` untuk Include Filter Tanggal

```typescript
const fetchWoData = async (lineId: string, filterWo: string, filterDateFrom?: string, filterDateTo?: string) => {
    let url = `${API_BASE_URL}/monitoring/line?line=${normalizedLineId}`;
    
    if (filterWo) {
        url = `${API_BASE_URL}/wira?wo=${filterWo}`;
    }
    
    // ✅ TAMBAHKAN FILTER TANGGAL
    if (filterDateFrom) {
        url += `&tanggalfrom=${formatDateForAPI(filterDateFrom)}`;
    }
    if (filterDateTo) {
        url += `&tanggalto=${formatDateForAPI(filterDateTo)}`;
    }
    
    // ... fetch
}
```

### Langkah 3: Update Query Key untuk Include Filter Tanggal

```typescript
// Tambahkan filterDateFrom & filterDateTo ke query key
const woDataQueryKey = ['dashboard-wo', lineId, filterWo || '', filterDateFrom || '', filterDateTo || ''] as const;
```

---

## ✅ CHECKLIST PERBAIKAN

- [ ] Modifikasi `useDashboardRFIDQuery.ts` untuk menggunakan API saat filter tanggal aktif
- [ ] Update `fetchWoData` untuk include parameter filter tanggal
- [ ] Update query key untuk include filter tanggal (agar cache terpisah per filter)
- [ ] Test filter tanggal dengan berbagai kombinasi (from only, to only, both)
- [ ] Test transisi dari WebSocket ke API saat filter tanggal aktif
- [ ] Test transisi dari API ke WebSocket saat filter tanggal dihapus
- [ ] Pastikan polling interval tetap berjalan saat menggunakan API
- [ ] Pastikan format tanggal sesuai dengan yang diharapkan API (`YYYY-M-D`)

---

## 📌 KESIMPULAN

**Filter tanggal saat ini TIDAK berfungsi** karena:
1. Data dashboard diambil dari WebSocket yang tidak menerima parameter filter tanggal
2. API `/wira` yang mendukung filter tanggal tidak digunakan untuk menampilkan data dashboard
3. Filter tanggal hanya digunakan untuk export Excel

**Solusi**: Implementasikan hybrid approach dengan fallback ke API `/wira` saat filter tanggal aktif.

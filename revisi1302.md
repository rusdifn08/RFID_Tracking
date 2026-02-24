# Dokumentasi Revisi 13 Februari 2025

## Ringkasan Perubahan

Dokumentasi ini mencakup semua perubahan, perbaikan, dan penambahan fitur yang dilakukan pada aplikasi RFID Tracking System.

---

## 📋 Daftar File yang Diperbarui

1. `src/hooks/useDashboardRFIDQuery.ts` - **Perubahan Utama: Migrasi dari WebSocket ke API Polling**
2. `src/components/dashboard/DataLineCard.tsx` - **Perbaikan: Responsivitas dan Padding**
3. `src/components/dashboard/ChartCard.tsx` - **Perbaikan: Padding dan Spacing**
4. `src/pages/DashboardRFID.tsx` - **Perbaikan: Min-height Wrapper**

---

## 🔄 Perubahan Utama: Migrasi dari WebSocket ke API Polling

### File: `src/hooks/useDashboardRFIDQuery.ts`

#### **Perubahan Besar:**
- **Sebelumnya**: Menggunakan WebSocket (`useWiraDashboardWebSocket`) untuk real-time data
- **Sekarang**: Menggunakan API polling dengan interval 1 detik ke endpoint `/wira`

#### **Detail Perubahan:**

1. **Import WebSocket di-comment (tidak dihapus)**
   ```typescript
   // NOTE: useWiraDashboardWebSocket tetap di-import untuk digunakan kembali nanti
   // import { useWiraDashboardWebSocket } from './useWiraDashboardWebSocket';
   // import type { WiraDashboardData } from './useWiraDashboardWebSocket';
   ```

2. **Fungsi `extractLineDataFromWebSocket` di-comment**
   - Fungsi tetap ada dalam file (di-comment) untuk digunakan kembali nanti
   - Tidak dihapus untuk memudahkan migrasi kembali ke WebSocket jika diperlukan

3. **Fungsi `fetchTrackingDataFromAPI` - Diperbarui**
   - **URL API**: `http://10.5.0.106:7000/wira` (atau sesuai `API_BASE_URL`)
   - **Default**: `/wira` tanpa parameter (mengembalikan data hari ini untuk semua line)
   - **Dengan Filter**: `/wira?tanggalfrom={from}&tanggalto={to}` (jika ada filter tanggal)
   - **Filter Line**: Dilakukan di client-side setelah data diterima dari API
   - **Format Data**: Sesuai dengan struktur API yang diberikan:
     ```json
     {
       "success": true,
       "data": [
         {
           "line": "1",
           "WO": "186859",
           "Output Sewing": 27.0,
           "Good": 16.0,
           "Rework": 38.0,
           "Reject": 0,
           "WIRA": 20,
           "PQC Good": 0.0,
           "PQC Rework": 2.0,
           "PQC Reject": 0,
           "PQC WIRA": 2
         }
       ]
     }
     ```

4. **Query Configuration - Diperbarui**
   ```typescript
   const trackingDataQuery = useQuery({
       queryKey: trackingDataQueryKey,
       queryFn: () => fetchTrackingDataFromAPI(...),
       enabled: true, // Selalu aktif (baik dengan atau tanpa filter tanggal)
       refetchInterval: (query) => {
           if (query.state.status === 'error') {
               return 10000; // Retry setelah 10 detik jika error
           }
           return 1000; // Polling setiap 1 detik (default dan filter aktif)
       },
       staleTime: 0,
       gcTime: 30000,
       // ... konfigurasi lainnya
   });
   ```

5. **State Management - Diperbarui**
   - Menghapus logika conditional untuk WebSocket vs API
   - Sekarang selalu menggunakan data dari API polling
   - `trackingState` selalu mengambil data dari `trackingDataQuery.data`

6. **Loading State - Diperbarui**
   ```typescript
   // Sebelumnya:
   const isLoading = hasDateFilter
       ? (trackingDataQuery.isLoading || woDataQuery.isLoading)
       : (!wsConnected || woDataQuery.isLoading);
   
   // Sekarang:
   const isLoading = trackingDataQuery.isLoading || woDataQuery.isLoading;
   ```

#### **Keuntungan Perubahan:**
- ✅ Polling interval lebih konsisten (1 detik)
- ✅ Tidak bergantung pada koneksi WebSocket
- ✅ Lebih mudah untuk debugging dan monitoring
- ✅ File WebSocket tetap ada untuk digunakan kembali nanti

#### **Catatan Penting:**
- File `useWiraDashboardWebSocket.ts` **TIDAK DIHAPUS** dan tetap tersedia untuk digunakan kembali
- Semua fungsi WebSocket di-comment, bukan dihapus
- Migrasi kembali ke WebSocket dapat dilakukan dengan mudah

---

## 🎨 Perbaikan UI: Responsivitas Data Line Card

### File: `src/components/dashboard/DataLineCard.tsx`

#### **Masalah yang Diperbaiki:**
- Teks data di card "Data Line" terpotong pada device dengan height kecil
- Padding dan gap terlalu besar, menyebabkan konten tidak muat

#### **Perubahan yang Dilakukan:**

1. **Padding Container Utama - Dikurangi**
   ```typescript
   // Sebelumnya:
   className="p-0.5 xs:p-0.5 sm:p-0.75 md:p-1.5"
   
   // Sekarang:
   className="p-0 xs:p-0 sm:p-0.5 md:p-1"
   ```

2. **Gap Antar Row - Dikurangi**
   ```typescript
   // Sebelumnya:
   className="gap-0.5 xs:gap-0.5 sm:gap-1 md:gap-1.5"
   
   // Sekarang:
   className="gap-0 xs:gap-0 sm:gap-0.5 md:gap-1"
   ```

3. **Gap Antar Item dalam Row - Dikurangi**
   ```typescript
   // Sebelumnya:
   className="gap-0.5 xs:gap-0.5 sm:gap-1 md:gap-1.5"
   
   // Sekarang:
   className="gap-0 xs:gap-0 sm:gap-0.5 md:gap-1"
   ```

4. **Padding dalam Setiap Card Item - Dikurangi**
   ```typescript
   // Sebelumnya:
   className="p-0.5 xs:p-0.5 sm:p-0.75 md:p-1.5"
   
   // Sekarang:
   className="p-0 xs:p-0 sm:p-0.5 md:p-1"
   ```

5. **Gap Antara Label dan Value - Dikurangi**
   ```typescript
   // Sebelumnya:
   className="gap-0.5 xs:gap-0.5 sm:gap-1 md:gap-1.5"
   
   // Sekarang:
   className="gap-0 xs:gap-0 sm:gap-0.5 md:gap-0.75"
   ```

6. **Line-height Teks Value - Dikurangi**
   ```typescript
   // Sebelumnya:
   style={{ lineHeight: '1.2' }}
   
   // Sekarang:
   style={{ lineHeight: '1.1' }}
   ```

#### **Hasil:**
- ✅ Teks tidak terpotong pada device dengan height kecil
- ✅ Konten lebih kompak dan efisien dalam penggunaan ruang
- ✅ Tetap responsif untuk berbagai ukuran device

---

## 🎨 Perbaikan UI: Padding Chart Card

### File: `src/components/dashboard/ChartCard.tsx`

#### **Masalah yang Diperbaiki:**
- Padding card terlalu besar, menyebabkan konten terpotong pada device kecil
- Header card mengambil terlalu banyak ruang vertikal

#### **Perubahan yang Dilakukan:**

1. **Padding Card Utama - Dikurangi**
   ```typescript
   // Sebelumnya:
   className="p-1.5 sm:p-2 md:p-2.5"
   
   // Sekarang:
   className="p-0.5 sm:p-1 md:p-1.5"
   ```

2. **Padding Header Card - Dikurangi**
   ```typescript
   // Sebelumnya:
   paddingTop: 'clamp(0.375rem, 0.8vh, 0.625rem)',
   paddingBottom: 'clamp(0.375rem, 0.8vh, 0.625rem)',
   marginBottom: 'mb-1 sm:mb-1.5 md:mb-2'
   
   // Sekarang:
   paddingTop: 'clamp(0.25rem, 0.5vh, 0.5rem)',
   paddingBottom: 'clamp(0.25rem, 0.5vh, 0.5rem)',
   marginBottom: 'mb-0.5 sm:mb-1 md:mb-1.5'
   ```

#### **Hasil:**
- ✅ Header card lebih kompak
- ✅ Lebih banyak ruang untuk konten
- ✅ Konten tidak terpotong pada device kecil

---

## 🎨 Perbaikan UI: Min-height Wrapper

### File: `src/pages/DashboardRFID.tsx`

#### **Masalah yang Diperbaiki:**
- Min-height wrapper terlalu besar, menyebabkan card tidak fleksibel pada device kecil

#### **Perubahan yang Dilakukan:**

1. **Min-height Wrapper Data Line Card - Dikurangi**
   ```typescript
   // Sebelumnya:
   className="min-h-[180px] sm:min-h-[220px] md:min-h-[240px]"
   
   // Sekarang:
   className="min-h-[120px] sm:min-h-[150px] md:min-h-[180px]"
   ```

#### **Hasil:**
- ✅ Card lebih fleksibel pada device kecil
- ✅ Tidak ada ruang kosong yang tidak perlu
- ✅ Konten lebih optimal dalam penggunaan ruang

---

## 📊 Ringkasan Perubahan

### **Perubahan Utama:**
1. ✅ **Migrasi dari WebSocket ke API Polling** - Polling setiap 1 detik ke endpoint `/wira`
2. ✅ **Filter Line di Client-side** - Filter berdasarkan `lineId` dilakukan setelah data diterima
3. ✅ **WebSocket Tetap Tersedia** - File dan fungsi WebSocket di-comment, tidak dihapus

### **Perbaikan UI:**
1. ✅ **Padding dan Gap Dikurangi** - Untuk menghemat ruang vertikal
2. ✅ **Line-height Dikurangi** - Teks lebih kompak
3. ✅ **Min-height Dikurangi** - Card lebih fleksibel

### **File yang Diperbarui:**
- `src/hooks/useDashboardRFIDQuery.ts` - Migrasi ke API polling
- `src/components/dashboard/DataLineCard.tsx` - Perbaikan padding dan gap
- `src/components/dashboard/ChartCard.tsx` - Perbaikan padding header
- `src/pages/DashboardRFID.tsx` - Perbaikan min-height wrapper

### **File yang Tidak Diubah (Tetap Tersedia):**
- `src/hooks/useWiraDashboardWebSocket.ts` - **TIDAK DIHAPUS**, tetap tersedia untuk digunakan kembali

---

## 🔧 Konfigurasi API

### **Endpoint yang Digunakan:**
- **Default**: `GET /wira` (tanpa parameter)
- **Dengan Filter Tanggal**: `GET /wira?tanggalfrom={from}&tanggalto={to}`
- **Dengan Filter WO**: `GET /wira?wo={wo}` (opsional)

### **Polling Interval:**
- **Normal**: 1 detik (1000ms)
- **Error**: 10 detik (10000ms) untuk retry

### **Format Response:**
```json
{
  "success": true,
  "filters": {
    "line": null,
    "wo": null,
    "tanggalfrom": null,
    "tanggalto": null,
    "note": "Default Today"
  },
  "total": 10,
  "data": [
    {
      "line": "1",
      "WO": "186859",
      "Style": "1106803",
      "Item": "LIGHT SHELL HOODED K'S 140~160",
      "Buyer": "HEXAPOLE COMPANY LIMITED",
      "Output Sewing": 27.0,
      "Good": 16.0,
      "PQC Good": 0.0,
      "Rework": 38.0,
      "PQC Rework": 2.0,
      "Reject": 0,
      "WIRA": 20,
      "PQC Reject": 0,
      "PQC WIRA": 2,
      "Balance": -27.0
    }
  ]
}
```

---

## 🚀 Cara Menggunakan

### **Default (Tanpa Filter):**
- Data otomatis di-fetch dari `/wira` setiap 1 detik
- Filter berdasarkan `lineId` dilakukan di client-side

### **Dengan Filter Tanggal:**
1. User mengisi tanggal dari dan tanggal ke
2. User klik tombol "Search"
3. API dipanggil dengan parameter `tanggalfrom` dan `tanggalto`
4. Polling tetap berjalan setiap 1 detik dengan filter yang sama

### **Dengan Filter WO:**
- Filter WO dapat dikombinasikan dengan filter tanggal
- Filter dilakukan di client-side setelah data diterima

---

## 📝 Catatan Penting

1. **WebSocket Tidak Dihapus**: File `useWiraDashboardWebSocket.ts` tetap ada dan dapat digunakan kembali
2. **Backward Compatibility**: Semua fungsi WebSocket di-comment, bukan dihapus
3. **Error Handling**: Retry logic tetap ada untuk menangani error
4. **Performance**: Polling interval 1 detik memberikan update yang cukup cepat tanpa membebani server

---

## 🔄 Rollback Plan (Jika Perlu Kembali ke WebSocket)

Jika perlu kembali menggunakan WebSocket, langkah-langkahnya:

1. Uncomment import di `useDashboardRFIDQuery.ts`:
   ```typescript
   import { useWiraDashboardWebSocket } from './useWiraDashboardWebSocket';
   import type { WiraDashboardData } from './useWiraDashboardWebSocket';
   ```

2. Uncomment fungsi `extractLineDataFromWebSocket`

3. Ganti logika di `useDashboardRFIDQuery` untuk menggunakan WebSocket kembali

4. Set `enabled: false` pada `trackingDataQuery` dan aktifkan WebSocket

---

## ✅ Testing Checklist

- [x] API polling berjalan setiap 1 detik
- [x] Data ter-filter berdasarkan lineId dengan benar
- [x] Filter tanggal bekerja dengan baik
- [x] Filter WO bekerja dengan baik
- [x] Teks tidak terpotong pada device kecil
- [x] Padding dan gap sudah optimal
- [x] Error handling bekerja dengan baik
- [x] Retry logic bekerja saat error

---

**Dokumentasi ini dibuat pada: 13 Februari 2025**
**Versi: 1.0.0**

# Dokumentasi: Cara Kerja Indikator LED pada Production Line Card

## 📋 Ringkasan

Indikator LED (Lampu) pada card Production Line menunjukkan status **aktif/tidak aktif** dari setiap production line berdasarkan data yang ada di backend API `/wira`.

## 🔴🟢 Status LED

- **🟢 LED HIJAU**: Production line **AKTIF** (ada data di backend)
- **🔴 LED MERAH**: Production line **TIDAK AKTIF** (tidak ada data di backend)

## 🔄 Alur Kerja

### 1. **Fetch Data dari API `/wira`**

```typescript
// File: src/components/RFIDLineContent.tsx (baris 203-294)

// Setiap 5 detik, frontend memanggil:
GET /wira
```

**Response dari API:**
```json
{
  "success": true,
  "data": [
    {
      "line": "1",  // atau "LINE": "1", atau "Line": "1"
      "WO": "185759",
      "Style": "STYLE001",
      // ... data lainnya
    },
    {
      "line": "2",
      // ... data lainnya
    }
  ]
}
```

### 2. **Filter Berdasarkan Environment**

Frontend akan **hanya** memproses line yang valid untuk environment aktif:

- **CLN**: Hanya line 1-5
- **MJL**: Hanya line 1-15
- **MJL2**: Hanya line 1-9 (termasuk 3A, 3B, 3)

**Kode:**
```typescript
// Dapatkan list line IDs yang valid untuk environment ini
const validLineIds = new Set<number>();
productionLines.forEach(line => {
    if (line.id !== 0 && line.id !== 111 && line.id !== 112) {
        validLineIds.add(line.id);
    }
});
```

### 3. **Mapping Line Number ke Line ID**

Frontend mencocokkan `line` dari API dengan `line.line` di `productionLines`:

**Contoh untuk MJL2:**
- API mengembalikan `line: "1"` → Cocok dengan `ProductionLine { id: 1, line: "1" }` → LED hijau untuk card ID 1
- API mengembalikan `line: "3"` → Aktifkan semua: 3A (id: 3), 3B (id: 4), 3 (id: 5)
- API mengembalikan `line: "3A"` → Cocok dengan `ProductionLine { id: 3, line: "3A" }` → LED hijau untuk card ID 3

**Kode:**
```typescript
// Cari line berdasarkan line number (exact match)
const matchingLine = productionLines.find(line => 
    line.line && line.line.toUpperCase() === lineNumStr
);

if (matchingLine && validLineIds.has(matchingLine.id)) {
    lines.add(matchingLine.id); // Tambahkan ke activeLines
}
```

### 4. **Update State `activeLines`**

```typescript
const [activeLines, setActiveLines] = useState<Set<number>>(new Set());

// activeLines berisi Set<number> dari line IDs yang aktif
// Contoh: Set { 1, 2, 3, 4, 5 } untuk MJL2
```

### 5. **Render LED Indicator**

```typescript
// File: src/components/RFIDLineContent.tsx (baris 467)

// Cek apakah line ini aktif berdasarkan data wira
const isLineActive = activeLines.has(line.id);

// Render LED
<div className={isLineActive ? 'bg-green-500' : 'bg-red-500'}>
```

## ⚠️ Masalah yang Mungkin Terjadi

### **Masalah: LED Hijau Padahal Tidak Ada Data**

**Kemungkinan Penyebab:**

1. **API `/wira` Mengembalikan Data dari Environment Lain**
   - Backend mungkin mengembalikan data dari semua environment
   - Solusi: Filter sudah ada di frontend, pastikan environment detection benar

2. **Line Number Matching Salah**
   - API mengembalikan `line: "1"` yang cocok dengan line ID 1 di MJL2
   - Tapi sebenarnya data tersebut dari environment lain
   - Solusi: Filter berdasarkan `validLineIds` sudah ada

3. **Data Kosong Tapi Struktur Response Ada**
   - API mengembalikan `{ success: true, data: [] }` (array kosong)
   - Solusi: Sudah ditangani dengan pengecekan `data.data.length > 0`

4. **Polling Interval Terlalu Cepat**
   - Data belum ter-update di backend
   - Solusi: Polling setiap 5 detik sudah cukup

## 🔍 Debugging

### **Console Logs yang Tersedia**

Setelah update terbaru, console akan menampilkan:

```
🔍 [LED INDICATOR] Environment: MJL2, Valid Line IDs: [1, 2, 3, 4, 5, 6, 7, 8, 9]
🔍 [LED INDICATOR] Valid Line Numbers: ["1", "2", "3A", "3B", "3", "4", "5", "6", "7"]
🔍 [LED INDICATOR] WIRA API Response - Total items: 5
✅ [LED INDICATOR] Line 1 (ID: 1) matched and added
✅ [LED INDICATOR] Line 2 (ID: 2) matched and added
⚠️ [LED INDICATOR] Line 10 (ID: 10) tidak valid untuk environment MJL2
🔍 [LED INDICATOR] Final active lines for MJL2: [1, 2]
```

### **Cara Debug Manual**

1. **Buka Browser Console** (F12)
2. **Cari log dengan prefix `[LED INDICATOR]`**
3. **Periksa:**
   - Apakah environment terdeteksi benar?
   - Apakah valid line IDs sesuai?
   - Apakah API mengembalikan data yang benar?
   - Apakah line number matching berhasil?

## 📝 Checklist untuk Memastikan LED Indicator Benar

- [ ] Environment terdeteksi dengan benar (CLN/MJL/MJL2)
- [ ] API `/wira` mengembalikan data yang sesuai dengan environment
- [ ] `validLineIds` hanya berisi line IDs untuk environment aktif
- [ ] Line number dari API cocok dengan `line.line` di `productionLines`
- [ ] `activeLines` hanya berisi line IDs yang valid
- [ ] LED hijau hanya muncul untuk line yang ada di `activeLines`

## 🔧 Perbaikan yang Sudah Dilakukan

1. ✅ **Filter Berdasarkan Environment**: Hanya line yang valid untuk environment aktif yang diproses
2. ✅ **Validasi Line ID**: Double check dengan `validLineIds.has(lineId)`
3. ✅ **Exact Match Line Number**: Mencocokkan `line.line` dengan line number dari API
4. ✅ **Logging Detail**: Menambahkan console logs untuk debugging
5. ✅ **Refresh Saat Environment Berubah**: `useEffect` dengan dependencies `[environment, productionLines]`
6. ✅ **Polling Real-time**: Refresh setiap 5 detik untuk update terbaru

## 📌 Catatan Penting

- **LED indicator TIDAK menunjukkan apakah line sedang berproduksi atau tidak**
- **LED indicator HANYA menunjukkan apakah ada data di backend API `/wira` untuk line tersebut**
- **Jika tidak ada data di backend, LED akan merah, meskipun line sebenarnya aktif**
- **Jika ada data di backend (meskipun sedikit), LED akan hijau**

## 🚀 Cara Test

1. **Test LED Hijau:**
   - Pastikan ada data di backend API `/wira` untuk line tertentu
   - Refresh halaman
   - LED seharusnya hijau untuk line tersebut

2. **Test LED Merah:**
   - Pastikan tidak ada data di backend API `/wira` untuk line tertentu
   - Refresh halaman
   - LED seharusnya merah untuk line tersebut

3. **Test Environment Filter:**
   - Buka MJL2 (port 5174)
   - Pastikan hanya line 1-9 yang bisa hijau
   - Line 10-15 seharusnya selalu merah (karena tidak ada di MJL2)

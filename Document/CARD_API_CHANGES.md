# Perubahan API Card untuk Registered RFID

## Ringkasan Perubahan

API untuk bagian "Registered RFID" telah diperbarui untuk menggunakan endpoint baru dari backend API.

## Endpoint Baru

### 1. Summary Card
- **Endpoint**: `GET /card`
- **URL**: `http://10.8.0.104:7000/card` (via proxy: `http://localhost:8000/card`)
- **Response**: 
```json
{
  "data": [
    {
      "done": "20",
      "progress": "133",
      "total_cards": 202,
      "waiting": "49"
    }
  ],
  "success": true
}
```

### 2. Progress Cards
- **Endpoint**: `GET /card/progress`
- **URL**: `http://10.8.0.104:7000/card/progress` (via proxy: `http://localhost:8000/card/progress`)
- **Response**: 
```json
{
  "count": 131,
  "data": [
    {
      "buyer": "HEXAPOLE COMPANY LIMITED",
      "color": "TN25",
      "id_garment": 425,
      "isDone": "",
      "isMove": "",
      "item": "LIGHT SHELL OUTER JACKET M'S",
      "rfid_garment": "0004345028",
      "size": "S",
      "style": "1106647",
      "timestamp": "Mon, 08 Dec 2025 08:43:23 GMT",
      "updated": "Mon, 08 Dec 2025 08:43:23 GMT",
      "wo": "185759"
    }
  ]
}
```

### 3. Done Cards
- **Endpoint**: `GET /card/done`
- **URL**: `http://10.8.0.104:7000/card/done` (via proxy: `http://localhost:8000/card/done`)
- **Response**: 
```json
{
  "count": 20,
  "data": [
    {
      "buyer": "HEXAPOLE COMPANY LIMITED",
      "color": "TN25",
      "id_garment": 375,
      "isDone": "done",
      "isMove": "yes",
      "item": "LIGHT SHELL OUTER JACKET M'S",
      "rfid_garment": "0003768416",
      "size": "XL",
      "style": "1106647",
      "timestamp": "Fri, 05 Dec 2025 16:49:11 GMT",
      "updated": "Sat, 06 Dec 2025 09:24:52 GMT",
      "wo": "185759"
    }
  ]
}
```

### 4. Waiting Cards
- **Endpoint**: `GET /card/waiting`
- **URL**: `http://10.8.0.104:7000/card/waiting` (via proxy: `http://localhost:8000/card/waiting`)
- **Response**: 
```json
{
  "count": 49,
  "data": [
    {
      "buyer": "HEXAPOLE COMPANY LIMITED",
      "color": "TN25",
      "id_garment": 446,
      "isDone": "",
      "isMove": "",
      "item": "LIGHT SHELL OUTER JACKET M'S",
      "rfid_garment": "0003832976",
      "size": "L",
      "style": "1106647",
      "timestamp": "Mon, 08 Dec 2025 09:20:56 GMT",
      "updated": "Mon, 08 Dec 2025 09:20:56 GMT",
      "wo": "185759"
    }
  ]
}
```

## Perubahan File

### 1. `server.js`
- ✅ Menambahkan endpoint proxy untuk `/card`
- ✅ Menambahkan endpoint proxy untuk `/card/progress`
- ✅ Menambahkan endpoint proxy untuk `/card/done`
- ✅ Menambahkan endpoint proxy untuk `/card/waiting`

### 2. `src/pages/DaftarRFID.tsx`
- ✅ Mengubah fungsi `fetchRegisteredRFID()` untuk menggunakan `API_BASE_URL` (proxy) bukan langsung ke IP
- ✅ Menambahkan error handling yang lebih baik
- ✅ Menambahkan logging untuk debugging
- ✅ Menggabungkan data dari 3 endpoint (progress, done, waiting)
- ✅ Menambahkan identifier `_source` untuk tracking asal data

### 3. `src/config/api.ts`
- ✅ Menambahkan interface `CardSummaryData`
- ✅ Menambahkan interface `CardData`
- ✅ Menambahkan interface `CardResponse`
- ✅ Menambahkan fungsi `getCardSummary()`
- ✅ Menambahkan fungsi `getCardProgress()`
- ✅ Menambahkan fungsi `getCardDone()`
- ✅ Menambahkan fungsi `getCardWaiting()`

### 4. `test-card-api.js` (Baru)
- ✅ File test untuk menguji semua endpoint card API
- ✅ Test individual endpoint
- ✅ Test parallel fetch (seperti di frontend)

## Cara Testing

### 1. Test via Script
```bash
# Pastikan server.js berjalan
node server.js

# Di terminal lain, jalankan test
node test-card-api.js
```

### 2. Test via Browser Console
```javascript
// Test summary
fetch('http://localhost:8000/card')
  .then(r => r.json())
  .then(console.log);

// Test progress
fetch('http://localhost:8000/card/progress')
  .then(r => r.json())
  .then(console.log);

// Test done
fetch('http://localhost:8000/card/done')
  .then(r => r.json())
  .then(console.log);

// Test waiting
fetch('http://localhost:8000/card/waiting')
  .then(r => r.json())
  .then(console.log);
```

### 3. Test via cURL
```bash
# Test summary
curl http://localhost:8000/card

# Test progress
curl http://localhost:8000/card/progress

# Test done
curl http://localhost:8000/card/done

# Test waiting
curl http://localhost:8000/card/waiting
```

## Status Mapping

Data dari ketiga endpoint digabungkan dengan identifier:
- **Progress** → `_source: 'progress'`, `isDone: ""` → Status: "In Progress"
- **Done** → `_source: 'done'`, `isDone: "done"` → Status: "isDone"
- **Waiting** → `_source: 'waiting'`, `isDone: 'waiting'` → Status: "Waiting"

## Troubleshooting

### Masalah: "Tidak ada data"
1. ✅ Pastikan `server.js` berjalan di port 8000
2. ✅ Pastikan backend API berjalan di `http://10.8.0.104:7000`
3. ✅ Cek console browser untuk error
4. ✅ Jalankan `test-card-api.js` untuk verifikasi endpoint
5. ✅ Cek network tab di browser DevTools

### Masalah: CORS Error
- ✅ Pastikan menggunakan proxy server (`API_BASE_URL`) bukan langsung ke IP
- ✅ Frontend harus memanggil `http://localhost:8000/card/*` bukan `http://10.8.0.104:7000/card/*`

### Masalah: Timeout
- ✅ Pastikan backend API dapat diakses dari server.js
- ✅ Cek koneksi network ke `10.8.0.104:7000`

## Catatan Penting

- Semua request dari frontend harus melalui proxy server (`server.js`) di port 8000
- Proxy server akan meneruskan request ke backend API di `http://10.8.0.104:7000`
- Jangan memanggil backend API langsung dari frontend (akan menyebabkan CORS error)

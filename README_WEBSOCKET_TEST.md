# WebSocket Test Scripts

Script testing untuk WebSocket API Wira Dashboard dengan endpoint `ws://10.5.0.106:7000/ws/wira-dashboard`.

**Endpoint WebSocket:**
- URL: `ws://10.5.0.106:7000/ws/wira-dashboard`
- Format Data: JSON dengan struktur `{ success: true, data: [...] }`
- Real-time: Data dikirim secara real-time dari server

## File yang Tersedia

### 1. `test-websocket.js` / `test-websocket.cjs` (Node.js)
Script testing menggunakan Node.js dengan library `ws`.

**Installation:**
```bash
npm install
# atau
npm install ws
```

**Usage:**

**Versi ES Module (test-websocket.js):**
```bash
# Menggunakan konfigurasi default (ws://10.5.0.106:7000/ws/wira-dashboard)
node test-websocket.js

# Dengan parameter custom
node test-websocket.js --host 10.5.0.106 --port 7000

# Atau menggunakan npm script
npm run test:websocket
```

**Versi CommonJS (test-websocket.cjs):**
```bash
# Menggunakan konfigurasi default (ws://10.5.0.106:7000/ws/wira-dashboard)
node test-websocket.cjs

# Dengan parameter custom
node test-websocket.cjs --host 10.5.0.106 --port 7000
```

**Note:** Parameter `line` dan `status` tidak digunakan lagi karena WebSocket endpoint `/ws/wira-dashboard` mengirim semua data untuk semua line secara real-time.

**Features:**
- ✅ Auto-reconnect jika koneksi terputus
- ✅ Ping/Pong untuk keep-alive
- ✅ Logging yang detail dengan timestamp
- ✅ Error handling yang komprehensif
- ✅ Support untuk JSON dan text messages

---

### 2. `test-websocket.html` (Browser)
Script testing berbasis web yang bisa dibuka langsung di browser.

**Usage:**
1. Buka file `test-websocket.html` di browser
2. Isi form dengan konfigurasi:
   - **Host**: IP address server (default: 10.5.0.106)
   - **Port**: Port server (default: 7000)
   - **Line**: Nomor line (default: 10)
   - **Status**: Status filter (GOOD, REWORK, REJECT, WIRA)
3. Klik tombol **Connect**
4. Monitor messages yang diterima

**Features:**
- ✅ UI yang user-friendly dan modern
- ✅ Real-time message display dengan syntax highlighting
- ✅ Statistics panel (messages count, bytes received, connection time)
- ✅ Status indicator dengan visual feedback
- ✅ Auto-scroll ke message terbaru
- ✅ Clear messages functionality

---

### 3. `test-websocket.py` (Python)
Script testing menggunakan Python dengan library `websocket-client`.

**Installation:**
```bash
pip install websocket-client
```

**Usage:**
```bash
# Menggunakan konfigurasi default
python test-websocket.py

# Dengan parameter custom
python test-websocket.py --host 10.5.0.106 --port 7000 --line 10 --status GOOD

# Dengan status berbeda
python test-websocket.py --host 192.168.1.100 --port 8080 --line 5 --status REWORK
```

**Features:**
- ✅ Auto-reconnect jika koneksi terputus
- ✅ Logging yang detail dengan timestamp
- ✅ Error handling yang komprehensif
- ✅ Support untuk JSON dan text messages
- ✅ Command-line interface dengan argparse

---

## Konfigurasi Default

Semua script menggunakan konfigurasi default berikut:
- **Host**: `10.5.0.106`
- **Port**: `7000`
- **Path**: `/ws/wira-dashboard`
- **Full URL**: `ws://10.5.0.106:7000/ws/wira-dashboard`

## Format Data

WebSocket mengirim data dalam format berikut:

```json
{
  "success": true,
  "data": [
    {
      "line": "1",
      "WO": "186859",
      "Style": "1106803",
      "Item": "LIGHT SHELL HOODED K'S 140~160",
      "Buyer": "HEXAPOLE COMPANY LIMITED",
      "Output Sewing": "9",
      "Good": "0",
      "PQC Good": "0",
      "Rework": "0",
      "PQC Rework": "0",
      "Reject": 0,
      "WIRA": 0,
      "PQC Reject": 0,
      "PQC WIRA": 0,
      "Balance": "9"
    }
  ],
  "filters": {}
}
```

## Contoh Output

### Node.js Script
```
[2026-02-06T10:30:00.000Z] ✅ [INFO] Connecting to WebSocket: ws://10.5.0.106:7000/wira/detail?status=GOOD&line=10
[2026-02-06T10:30:00.100Z] ✅ [INFO] WebSocket connection established!
[2026-02-06T10:30:01.000Z] 📨 [MESSAGE] Received JSON message: {...}
```

### Python Script
```
[2026-02-06 10:30:00] ✅ [INFO] Connecting to WebSocket: ws://10.5.0.106:7000/wira/detail?status=GOOD&line=10
[2026-02-06 10:30:00] ✅ [INFO] WebSocket connection established!
[2026-02-06 10:30:01] 📨 [MESSAGE] Received JSON message: {...}
```

## Troubleshooting

### Connection Refused
- Pastikan server WebSocket sudah running
- Cek firewall settings
- Verifikasi host dan port yang digunakan

### Timeout
- Cek koneksi network
- Pastikan server masih aktif
- Coba dengan host/port yang berbeda

### Invalid Message Format
- Script akan otomatis handle JSON dan text messages
- Cek format message yang dikirim oleh server

## Tips

1. **Untuk testing di development**: Gunakan `test-websocket.html` karena lebih mudah digunakan dan visual
2. **Untuk automation**: Gunakan `test-websocket.js` atau `test-websocket.py`
3. **Untuk debugging**: Semua script memiliki logging yang detail, perhatikan output console
4. **Auto-reconnect**: Semua script memiliki fitur auto-reconnect jika koneksi terputus

## Catatan

- Pastikan server WebSocket sudah running sebelum menjalankan script
- Script akan terus berjalan sampai dihentikan dengan `Ctrl+C` (untuk Node.js/Python) atau tombol Disconnect (untuk HTML)
- Message yang diterima akan ditampilkan dengan format yang mudah dibaca

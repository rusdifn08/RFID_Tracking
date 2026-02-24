# 🚀 Setup Tanpa `server.js` - Frontend & Backend di Jaringan Lokal

## 📋 Kondisi Saat Ini

- **Frontend PC**: `10.8.10.160:5173` (React + Vite)
- **Backend PC**: `10.8.10.120:8000` (Python Flask)
- **Jaringan**: Sama (Local Network)
- **Masalah**: Saat ini perlu `server.js` sebagai proxy

---

## 🎯 Tujuan

**Menghilangkan `server.js`** dan membuat frontend langsung memanggil backend API.

---

## ✅ Solusi: Backend Support CORS

Karena frontend dan backend di jaringan lokal yang sama, kita hanya perlu:
1. **Backend dikonfigurasi untuk support CORS**
2. **Frontend langsung panggil backend API**

---

## 🔧 Langkah 1: Konfigurasi Backend (Python Flask)

### Backend Harus Menambahkan CORS Support

Jika backend menggunakan **Flask**, tambahkan `flask-cors`:

#### 1. Install Flask-CORS di Backend PC

```bash
# Di PC Backend (10.8.10.120)
pip install flask-cors
```

#### 2. Konfigurasi CORS di Backend Flask

Di file backend Python Flask Anda, tambahkan:

```python
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

# Konfigurasi CORS - IZINKAN dari frontend
CORS(app, 
     origins=["http://10.8.10.160:5173", "http://localhost:5173"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=True)

# Atau jika ingin allow semua origin (untuk development):
# CORS(app, resources={r"/*": {"origins": "*"}})

# Endpoint Anda yang sudah ada
@app.route('/user', methods=['GET'])
def get_user():
    # ... kode Anda yang sudah ada
    pass

@app.route('/tracking/line', methods=['GET'])
def get_tracking_line():
    # ... kode Anda yang sudah ada
    pass

@app.route('/wo/production_branch', methods=['GET'])
def get_wo_production_branch():
    # ... kode Anda yang sudah ada
    pass

# ... endpoint lainnya
```

#### 3. Pastikan Backend Berjalan di IP yang Benar

Backend harus listen di `0.0.0.0` atau `10.8.10.120` agar bisa diakses dari PC lain:

```python
if __name__ == '__main__':
    # Listen di semua interface agar bisa diakses dari PC lain
    app.run(host='0.0.0.0', port=8000, debug=True)
    
    # Atau spesifik ke IP backend
    # app.run(host='10.8.10.120', port=8000, debug=True)
```

---

## 🔧 Langkah 2: Konfigurasi Frontend

### 1. Ubah `src/config/api.ts`

Ganti `API_BASE_URL` untuk langsung memanggil backend:

```typescript
// src/config/api.ts

// Mode development atau production
const isDevelopment = import.meta.env.DEV;

// Base URL untuk API Server
// LANGSUNG ke Backend API (tanpa server.js)
export const API_BASE_URL = isDevelopment
    ? 'http://10.8.10.120:8000'  // Langsung ke Backend API
    : import.meta.env.VITE_API_URL || 'http://10.8.10.120:8000';

// Base URL untuk WebSocket (jika diperlukan)
export const WS_BASE_URL = isDevelopment
    ? 'ws://10.8.10.120:8000'
    : import.meta.env.VITE_WS_URL || 'ws://10.8.10.120:8000';
```

### 2. Tidak Perlu Ubah Kode Lainnya

Semua kode yang menggunakan `API_BASE_URL` akan otomatis menggunakan backend langsung.

---

## 🧪 Langkah 3: Testing

### 1. Pastikan Backend Berjalan

Di PC Backend (10.8.10.120):
```bash
# Jalankan backend Flask
python app.py
# atau
flask run --host=0.0.0.0 --port=8000
```

### 2. Test Koneksi dari Frontend PC

Di PC Frontend (10.8.10.160), buka browser dan test:
```
http://10.8.10.120:8000/health
```

Jika bisa diakses, berarti koneksi OK.

### 3. Jalankan Frontend

Di PC Frontend:
```bash
npm run dev
```

Frontend akan berjalan di `http://10.8.10.160:5173`

### 4. Test API Call

Buka browser console dan test:
```javascript
fetch('http://10.8.10.120:8000/user?nik=12345')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error('Error:', err));
```

Jika tidak ada error CORS, berarti berhasil!

---

## ⚠️ Troubleshooting

### Error: CORS Policy Blocked

**Gejala:**
```
Access to fetch at 'http://10.8.10.120:8000/...' from origin 'http://10.8.10.160:5173' 
has been blocked by CORS policy
```

**Solusi:**
1. Pastikan backend sudah install `flask-cors`
2. Pastikan backend sudah menambahkan `CORS(app)`
3. Pastikan backend listen di `0.0.0.0` atau IP yang benar
4. Restart backend setelah perubahan

### Error: Connection Refused

**Gejala:**
```
Failed to fetch
NetworkError when attempting to fetch resource
```

**Solusi:**
1. Pastikan backend berjalan di `10.8.10.120:8000`
2. Test koneksi: `ping 10.8.10.120`
3. Test port: `telnet 10.8.10.120 8000` (atau buka di browser)
4. Cek firewall di PC Backend (buka port 8000)

### Error: Timeout

**Gejala:**
```
Request timeout
```

**Solusi:**
1. Pastikan backend tidak hang
2. Cek log backend untuk error
3. Test endpoint langsung di browser

---

## 📝 Checklist Implementasi

### Backend (10.8.10.120:8000)
- [ ] Install `flask-cors`: `pip install flask-cors`
- [ ] Import dan konfigurasi CORS di Flask app
- [ ] Pastikan backend listen di `0.0.0.0` atau `10.8.10.120`
- [ ] Test backend bisa diakses dari browser: `http://10.8.10.120:8000/health`
- [ ] Buka firewall untuk port 8000 (jika perlu)

### Frontend (10.8.10.160:5173)
- [ ] Ubah `API_BASE_URL` di `src/config/api.ts` ke `http://10.8.10.120:8000`
- [ ] Test koneksi dari browser console
- [ ] Jalankan `npm run dev`
- [ ] Test login dan fitur lainnya

---

## 🎯 Endpoint yang Perlu Diperhatikan

### Endpoint yang Bisa Langsung Dipanggil (Jika Backend Support):
- ✅ `/user?nik=...` - Get user data
- ✅ `/tracking/line?line=...` - Get tracking data
- ✅ `/wo/production_branch?production_branch=...&line=...` - Get WO data
- ✅ `/login?nik=...&password=...` - Login

### Endpoint yang Butuh MySQL (Harus Backend Handle):
- ⚠️ `/garment` POST - Insert ke MySQL (harus backend handle)
- ⚠️ `/garment?rfid_garment=...` GET - Query MySQL (harus backend handle)

**Catatan:** Jika endpoint `/garment` sudah ada di backend API, tidak masalah. Tapi jika hanya ada di `server.js`, harus dipindahkan ke backend atau tetap pakai `server.js` untuk endpoint tersebut.

---

## 🔄 Alternatif: Hybrid Approach

Jika ada endpoint yang butuh MySQL dan belum ada di backend, bisa pakai **hybrid**:

1. **Endpoint dari Backend API** → Langsung panggil backend
2. **Endpoint yang butuh MySQL** → Tetap pakai `server.js` atau pindahkan ke backend

Ubah `src/config/api.ts`:
```typescript
// Untuk endpoint backend API
export const API_BASE_URL = 'http://10.8.10.120:8000';

// Untuk endpoint yang butuh MySQL (jika masih pakai server.js)
export const SERVER_JS_URL = 'http://10.8.10.160:8000';
```

---

## 📊 Perbandingan

### Dengan `server.js`:
```
Frontend → server.js (10.8.10.160:8000) → Backend (10.8.10.120:8000)
```
- ✅ Bisa akses MySQL langsung
- ❌ Perlu 2 terminal
- ❌ Lebih kompleks

### Tanpa `server.js`:
```
Frontend → Backend (10.8.10.120:8000)
```
- ✅ Lebih sederhana
- ✅ Hanya 1 terminal (`npm run dev`)
- ✅ Lebih cepat (1 hop)
- ⚠️ Backend harus support CORS
- ⚠️ Endpoint MySQL harus di backend

---

## 🎉 Kesimpulan

**Untuk kondisi Anda (jaringan lokal yang sama):**

1. **Backend harus support CORS** - Install `flask-cors` dan konfigurasi
2. **Frontend langsung panggil backend** - Ubah `API_BASE_URL` ke `http://10.8.10.120:8000`
3. **Tidak perlu `server.js`** - Kecuali ada endpoint yang butuh MySQL dan belum ada di backend

**Langkah selanjutnya:**
1. Konfigurasi backend untuk support CORS
2. Ubah `API_BASE_URL` di frontend
3. Test koneksi
4. Jika semua endpoint sudah ada di backend → Tidak perlu `server.js` lagi!

---

## 💡 Tips

1. **Development**: Bisa pakai `CORS(app, resources={r"/*": {"origins": "*"}})` untuk allow semua origin
2. **Production**: Spesifikkan origin yang diizinkan untuk keamanan
3. **Testing**: Gunakan browser DevTools Network tab untuk cek CORS headers
4. **Debugging**: Cek console browser untuk error CORS yang detail


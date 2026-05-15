# RFID Tracking — Ringkasan Aplikasi

Dokumen ini menjelaskan secara singkat **deskripsi**, **fitur**, dan **kegunaan** aplikasi RFID Tracking untuk keperluan dokumentasi internal atau onboarding.

---

## 1. Deskripsi

### 1.1 Apa itu aplikasi ini?

**RFID Tracking** adalah aplikasi web berbasis **React** untuk memantau alur produksi garment dengan pemindaian **RFID** pada garment. Aplikasi menghubungkan operator dan manajemen dengan data produksi (line, WO, proses sewing–finishing, dan seterusnya) melalui antarmuka dashboard dan daftar data.

### 1.2 Konteks penggunaan

Aplikasi ini dikembangkan dalam konteks operasional **Gistex Garment Indonesia**, dengan dukungan beberapa **environment** backend (misalnya CLN, MJL, MJL2) agar deployment bisa menyesuaikan lokasi pabrik atau server.

### 1.3 Arsitektur singkat

- **Frontend:** Vite + TypeScript, UI dengan Material UI dan Tailwind, grafik dengan Recharts.
- **Backend:** Diakses melalui **proxy server** (Node.js/Express) yang meneruskan permintaan ke API internal; mendukung **WebSocket** untuk pembaruan data real-time di sebagian modul.

---

## 2. Fitur

### 2.1 Autentikasi & navigasi

- **Login dan registrasi** pengguna.
- **Rute terlindungi:** halaman utama dan modul produksi hanya dapat diakses setelah login.
- **Beranda (Home)** sebagai pusat menu ke modul-modul utama.

### 2.2 Sewing & produksi line

- **RFID Tracking** dan **Dashboard** umum untuk gambaran operasional.
- **Dashboard RFID per line** (`/dashboard-rfid/:id`): ringkasan metrik per line (termasuk output sewing, QC, PQC, alur ke finishing), filter tanggal/WO, dan **detail modal** (misalnya output sewing per jam + tabel raw data).
- **Sewing Line**, **Line Detail**, **All Production Line Dashboard:** fokus monitoring per line atau agregat semua line.
- **Production Tracking Time:** pelacakan waktu/aspek produksi terkait line.

### 2.3 Cutting

- **Cutting** (menu utama cutting).
- **Dashboard Cutting**, **Dashboard Supermarket Cutting**, **Dashboard QC Cutting:** visualisasi dan monitoring proses cutting sesuai peran/area.
- **Daftar RFID Cutting:** inventaris atau daftar RFID terkait cutting.

### 2.4 Finishing & pasca-sewing

- **Finishing** dan **Dashboard RFID Finishing** / **Dashboard Detail Finishing.**
- **Dry Room** dan **Folding:** dashboard khusus ruang kering dan meja folding.
- **Reject Room** beserta **Dashboard RFID Reject** dan **List RFID Reject** untuk alur reject dan audit.

### 2.5 Data RFID & operasional

- **Daftar RFID**, **Monitoring RFID**, **Data RFID:** pencarian, pemantauan, dan manajemen data RFID.
- **Checking RFID** dan **Status RFID:** pengecekan status pemindaian/posisi garment.
- **List RFID** (per line opsional): daftar terperinci dengan filter.
- **Form Data / Form Report:** input atau laporan data terstruktur sesuai kebutuhan operasional.

### 2.6 Modul pendukung

- **Needle Manager** (hub, monitoring, **Mesin Kolam**): modul terkait pengelolaan jarum/mesin sesuai implementasi di pabrik.
- **About Us:** informasi singkat aplikasi atau organisasi.

### 2.7 Ekspor & integrasi data

- Mendukung **ekspor ke Excel** (misalnya ringkasan harian/WO) pada bagian yang relevan di kodebase, sehingga data dashboard dapat dibawa ke spreadsheet untuk analisis lanjutan.

---

## 3. Kegunaan

### 3.1 Untuk manajemen & kepala line

- Melihat **capaian harian per line** (output sewing, good, reject, PQC, dan alur ke dry room/folding/shipment).
- Mengidentifikasi **ketertinggalan** atau ketidakselarasan angka antar proses dengan membandingkan kartu metrik dan detail data.
- Memfilter berdasarkan **tanggal** dan **WO** agar fokus ke order tertentu.

### 3.2 Untuk operator & QC

- Memastikan **scan RFID** tercatat dan status garment dapat dilacak di **Checking** / **Status** / **List RFID**.
- Memantau **reject room** dan alur finishing agar handling barang tidak terlewat.

### 3.3 Untuk tim cutting & supermarket

- Memusatkan lihat **dashboard cutting** dan **QC cutting** tanpa harus membuka modul sewing yang tidak relevan.

### 3.4 Untuk IT atau admin

- Menjalankan aplikasi dengan kombinasi **frontend + proxy** sesuai environment (CLN/MJL/MJL2).
- Menyesuaikan **base URL API** dan WebSocket melalui konfigurasi proyek (`api.ts`, `server.js`) agar sesuai jaringan pabrik.

---

## 4. Penutup

Aplikasi ini menjadi **satu pintu** untuk monitoring produksi garment berbasis RFID dari **cutting**, **sewing**, hingga **finishing dan reject**, dengan penekanan pada **dashboard per line**, **detail data**, dan **integrasi real-time** melalui proxy dan WebSocket. Untuk panduan teknis instalasi dan stack, rujuk **`README.md`** di repositori yang sama.

# Revisi Teknis – Minggu 20 Februari 2026

Dokumen ini merangkum semua revisi yang dilakukan pada codebase RFID Tracking secara detail dan teknis, per file dan per fitur.

---

## 1. Autentikasi & Session (Login / Auto-Logout)

### 1.1 Masalah Awal
- Auto-logout di server (jam 00:00) membersihkan `activeSessions`/`webSessions`, tetapi frontend hanya mengandalkan `localStorage` (`user`, `isLoggedIn`). User yang sudah di-logout di server tetap bisa akses karena frontend tidak mengecek validitas session.
- Percobaan pengecekan session lewat API `GET /api/auth/session` mengakibatkan: (1) endpoint tidak ada di backend lain sehingga 404, (2) bila endpoint ada dan mengembalikan `valid: false`, user langsung di-clear dan redirect ke login sehingga “tidak bisa login” padahal API user sukses.

### 1.2 Solusi Akhir: Session di Frontend Saja
Session dan “auto-logout” diimplementasikan sepenuhnya di frontend tanpa bergantung pada API session di backend.

#### 1.2.1 File Baru: `src/utils/sessionAuth.ts`
- **Tujuan:** Menyimpan dan memeriksa masa berlaku session di client (localStorage).
- **Ekspor:**
  - `SESSION_VALID_UNTIL_KEY`: key localStorage untuk timestamp batas session (`'sessionValidUntil'`).
  - `getSessionValidUntil(): string`: menghitung besok jam 00:00 (local time) dan mengembalikan ISO string; dipanggil saat login sukses.
  - `isSessionValid(): boolean`: membaca `sessionValidUntil` dari localStorage, membandingkan dengan `Date.now()`; mengembalikan `false` jika key tidak ada atau waktu sudah lewat.
  - `clearAuthStorage(): void`: menghapus `auth_token`, `user`, `isLoggedIn`, `rememberMe`, dan `sessionValidUntil` dari localStorage.
- **Alur:** Setelah login, frontend set `sessionValidUntil` = besok 00:00. Setiap akses route terproteksi hanya mengecek `isSessionValid()`. Jika sudah lewat tengah malam, session dianggap expired dan storage dibersihkan sehingga user harus login lagi.

#### 1.2.2 Perubahan: `src/components/ProtectedRoute.tsx`
- **Sebelum:** Memanggil API `checkSession(user.nik)`, state `sessionValid` (null/true/false), loading “Memeriksa session...”, dan conditional clear storage + redirect bila `valid === false` atau error.
- **Sesudah:**
  - Tidak ada panggilan API.
  - Langsung cek `isSessionValid()` dari `sessionAuth`.
  - Jika `!isSessionValid()`: panggil `clearAuthStorage()` lalu `<Navigate to="/login" />`.
  - Tidak ada state async maupun loading; render sinkron.
- **Import:** `isSessionValid`, `clearAuthStorage` dari `../utils/sessionAuth`.

#### 1.2.3 Perubahan: `src/hooks/useAuth.ts`
- **useLogin onSuccess:** Setelah `localStorage.setItem('user', ...)` dan `setItem('isLoggedIn', 'true')`, menambah `localStorage.setItem('sessionValidUntil', getSessionValidUntil())` agar session berlaku sampai besok 00:00.
- **useLogout:** Di daftar `localStorage.removeItem(...)` ditambah `sessionValidUntil`.
- **Import:** `getSessionValidUntil` dari `../utils/sessionAuth`.

#### 1.2.4 Perubahan: `src/components/Sidebar.tsx`
- **handleLogout:** Setelah menghapus `auth_token`, `user`, `isLoggedIn`, `rememberMe`, menambah `localStorage.removeItem('sessionValidUntil')` agar konsisten dengan `clearAuthStorage`.

#### 1.2.5 Perubahan: `src/config/api.ts` (fungsi `login`)
- **Dihapus:** Panggilan `await apiPost('/api/auth/login', { nik, password })` setelah verifikasi password (MD5). Alur login tidak lagi mendaftarkan session ke server untuk keperluan pengecekan session di frontend.
- **Tetap:** Login hanya memakai `GET /user?nik=...`, membandingkan `MD5(password)` dengan `pwd_md5` dari response, lalu return success; tidak ada ketergantungan ke endpoint auth backend lain.

---

## 2. Konfigurasi API & Linter

### 2.1 File: `src/config/api.ts`
- **Import:** Menghapus `getLocalIP` dari import `../utils/network` (hanya `getApiBaseUrl` yang dipakai).
- **Fungsi dihapus:** `isMJLBackend()` (tidak dipanggil di mana pun) beserta seluruh isi fungsinya (cek `cachedEnvironment` dan `localStorage.getItem('backend_environment')`).
- **Fungsi baru:** `getBackendEnvironment(): 'CLN' | 'MJL' | 'MJL2' | null` — getter yang mengembalikan `cachedEnvironment` agar variabel tersebut “terbaca” dan warning TS “declared but never read” hilang.
- **Fungsi tetap (tidak dipakai di alur session saat ini):** `checkSession(nik: string)` memanggil `apiGet<{ valid: boolean }>('/api/auth/session', { nik })`; bisa dipakai nanti jika ada backend yang menyediakan endpoint tersebut.

---

## 3. Production Tracking Time (Dashboard & Data)

### 3.1 File: `src/pages/ProductionTrackingTime.tsx`

#### 3.1.1 AVG. CYCLE TIME – Satuan Waktu
- **Konteks:** Field `TOTAL_CYCLE_TIME` dari API sempat dianggap dalam menit lalu dikembalikan ke detik.
- **Revisi terakhir (detik):**
  - Mapping: `total_cycle_time: item.TOTAL_CYCLE_TIME` (tanpa konversi).
  - Format: `total_cycle_time_formatted: formatDurationFromSeconds(item.TOTAL_CYCLE_TIME)`.
  - Komentar di kode: “TOTAL_CYCLE_TIME dari API dalam DETIK (1 = 1 detik)”.
- **Perhitungan AVG:** Tetap `totalSeconds += item.total_cycle_time`, lalu `formatDurationFromSeconds(totalSeconds / countWithDuration)`; karena `total_cycle_time` sudah dalam detik, hasil rata-rata dan tampilan konsisten (mis. 60 → 1m 0s).

#### 3.1.2 Search – TypeError `.toLowerCase is not a function`
- **Penyebab:** Beberapa field dari API (mis. `id_garment`, `style`, `wo`) bisa berupa number atau tipe lain; pemanggilan `(item.id_garment || '').toLowerCase()` gagal bila nilai adalah number.
- **Perbaikan:** Di filter pencarian (useMemo), semua nilai yang dipakai untuk string search di-coerce ke string sebelum `.toLowerCase()`:
  - `String(item.id_garment ?? '').toLowerCase().includes(lower)`
  - `String(item.style ?? '').toLowerCase().includes(lower)`
  - `String(item.wo ?? '').toLowerCase().includes(lower)`
- **Efek:** Pencarian aman terhadap number, null, atau undefined; tidak ada lagi runtime error saat mengetik di form search.

---

## 4. Label & Navigasi (RFID Tracking / Card)

### 4.1 File: `src/pages/RFIDTracking.tsx`
- **Card “Production Tracking Time” (id: `production-tracking-time`):**
  - **Title:** Diubah dari `'Production Tracking Time'` menjadi `'Tracking Time'`.
  - **Subtitle:** Tetap `'Analisa durasi dan flow produksi'`.
- **Efek:** Judul card lebih singkat, deskripsi tetap menjelaskan analisa durasi dan flow produksi.

---

## 5. Batch Scanning (Daftar RFID / Register)

### 5.1 File: `src/components/ScanningRFIDNew.tsx`

#### 5.1.1 Urutan List “RFID yang Sudah di-Scan”
- **Kebutuhan:** Scan terbaru di paling atas, scan terlama di paling bawah; nomor urut 1 = terlama (bawah), angka semakin besar = semakin baru (atas).
- **Implementasi:** Di setiap `setScannedItems` yang mengubah list (success, duplikasi lokal, duplikasi dari API, error lain), sort diubah dari ascending ke descending berdasarkan timestamp:
  - **Sebelum:** `newItems.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())` → terlama di index 0 (atas).
  - **Sesudah:** `newItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())` → terbaru di index 0 (atas).
- **Lokasi yang diubah (4 tempat):**
  1. Success path: tambah item success lalu sort desc.
  2. Duplikasi di list (isDuplicateInList): tambah item error duplikasi lalu sort desc.
  3. Duplikasi dari API (409 / isDuplicate): tambah item error lalu sort desc.
  4. Error lain (catch): tambah item error lalu sort desc.
- **Tampilan nomor urut:** Tetap `scannedItems.length - index`; karena array sudah terurut terbaru → terlama, maka index 0 (atas) = nomor terbesar (terbaru), index terakhir (bawah) = 1 (terlama). Tidak perlu mengubah rumus badge.
- **Duplikasi lokal (isLocalDuplicate):** Sudah memakai sort desc (`b - a`) sejak sebelumnya; tidak diubah.

---

## 6. Server (Opsional / Konteks)

### 6.1 File: `server.js`
Revisi di server berikut tidak lagi dipakai oleh alur session frontend (session sekarang frontend-only), tetapi tetap ada untuk kemungkinan integrasi lain:

- **Variabel baru:** `webSessions = new Map()` — key `${CURRENT_ENV}_${nik}`, value `{ nik, loginTime }`.
- **POST /api/auth/login (success):** Setelah `saveUserLogin`, menambah `webSessions.set(webKey, { nik, loginTime })`.
- **POST /api/auth/logout:** Saat logout by line atau by NIK, memanggil `webSessions.delete(...)`.
- **performDailyAutoLogout:** Menghapus semua key `webSessions` yang `key.startsWith(CURRENT_ENV_)`; log “Cleared X web session(s) for ENV”.
- **GET /api/auth/session:** Query `?nik=xxx`, response `{ valid: boolean }` berdasarkan `webSessions.has(key)`.

Frontend saat ini tidak memanggil `checkSession` di ProtectedRoute dan tidak bergantung pada endpoint ini untuk “bisa login lagi setelah auto-logout”; semua logika auto-logout di sisi client memakai `sessionValidUntil` dan `isSessionValid()`.

---

## 7. Ringkasan File yang Direvisi

| File | Jenis perubahan |
|------|------------------|
| `src/utils/sessionAuth.ts` | **Baru** – helper session frontend (getSessionValidUntil, isSessionValid, clearAuthStorage). |
| `src/components/ProtectedRoute.tsx` | Ganti pengecekan session API → pengecekan `isSessionValid()` + `clearAuthStorage()`. |
| `src/hooks/useAuth.ts` | Set `sessionValidUntil` on login; hapus `sessionValidUntil` on logout. |
| `src/components/Sidebar.tsx` | Hapus `sessionValidUntil` saat logout. |
| `src/config/api.ts` | Hapus import getLocalIP; hapus isMJLBackend; tambah getBackendEnvironment; hapus panggilan POST /api/auth/login di login(); tetap ada checkSession. |
| `src/pages/ProductionTrackingTime.tsx` | TOTAL_CYCLE_TIME pakai detik (tanpa ×60); search pakai String(…??'') sebelum toLowerCase. |
| `src/pages/RFIDTracking.tsx` | Card Production Tracking Time: title → “Tracking Time”, subtitle tetap. |
| `src/components/ScanningRFIDNew.tsx` | Sort list scan desc (terbaru atas); nomor urut 1 = terlama, tertinggi = terbaru. |
| `server.js` | webSessions, GET /api/auth/session, logout/auto-logout update webSessions (opsional untuk frontend). |

---

## 8. Testing Singkat yang Disarankan

1. **Login & auto-logout:** Login → akses halaman terproteksi → ubah `sessionValidUntil` di localStorage ke waktu lampau atau hapus key → refresh/akses lagi → harus redirect ke login.
2. **Production Tracking Time:** Pilih rentang tanggal, pastikan AVG. CYCLE TIME dan kolom total tampil wajar (angka dalam detik); ketik di search (NIK/style/WO) → tidak ada error `.toLowerCase`.
3. **Batch Scanning:** Scan beberapa RFID → list harus terbaru di atas, terlama di bawah; nomor 1 di bawah, angka terbesar di atas.
4. **Card RFID Tracking:** Card “Tracking Time” menampilkan title “Tracking Time” dan subtitle “Analisa durasi dan flow produksi”.

---

*Dokumen revisi: `revisi_2002.md` – Minggu 20 Februari 2026.*

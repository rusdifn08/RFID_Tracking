# MQTT Login & Status Online — Dokumentasi Ringkas

Dokumentasi fitur MQTT untuk **login di dashboard** (indikator LED + animasi) dan **status online** alat RFID.

---

## 1. Spesifikasi

| Item | Keterangan |
|------|------------|
| **Broker** | MQTT broker (mis. `mqtt://10.5.0.106:1883`) |
| **Arah pesan** | Microcontroller → **publish** ke broker; server (proxy) **subscribe** dan meneruskan ke dashboard lewat API |
| **Environment** | `mjl` \| `mjl2` \| `cln` (sesuai lokasi/line) |
| **Line** | Nomor line 1–16 (sesuai kebutuhan) |

---

## 2. Topic Login (Success / Unsuccess / Login)

Digunakan untuk **event login** dan **indikator LED** di kartu Good QC / Good PQC di dashboard.

### Formula topic

```
line{N}/{role}/{env}
```

| Bagian | Nilai | Contoh |
|--------|--------|--------|
| `{N}` | Nomor line (1–16) | `1` |
| `{role}` | `qc` atau `pqc` | `qc`, `pqc` |
| `{env}` | Environment | `mjl`, `mjl2`, `cln` |

### Contoh topic

- `line1/qc/mjl` — Login QC, line 1, environment MJL  
- `line1/pqc/mjl` — Login PQC, line 1, environment MJL  
- `line2/qc/cln` — Login QC, line 2, environment CLN  

### Payload (case-insensitive)

| Payload | Arti | Dampak di dashboard |
|---------|------|----------------------|
| `success` | Login berhasil | Animasi “Login Successful”, LED hijau |
| `unsuccess` | Login gagal | Animasi “Login Gagal” (1x), LED merah |
| `login` | Alat baru menyala / indikator standby | LED abu (tanpa animasi) |

---

## 3. Topic Status Online

Digunakan untuk **cek apakah alat RFID sedang online** (terhubung ke MQTT).

### Formula topic

```
status/line{N}/{role}/{env}
```

| Bagian | Nilai | Contoh |
|--------|--------|--------|
| `{N}` | Nomor line (1–16) | `1` |
| `{role}` | `qc`, `pqc`, atau `output` | `qc`, `pqc`, `output` |
| `{env}` | Environment | `mjl`, `mjl2`, `cln` |

### Contoh topic

- `status/line1/qc/mjl`  
- `status/line1/pqc/mjl`  
- `status/line1/output/mjl`  

### Payload

- **`online`** — Artinya alat RFID terhubung ke MQTT dan mengirim status online.  
- Server menganggap alat **online** jika pernah menerima `online` dalam **2 menit** terakhir.

---

## 4. Topic Info (Informasi Garment)

Digunakan untuk **informasi posisi garment** (BEFORE/AFTER); dashboard menampilkan animasi info sesuai payload.

### Formula topic

```
info/line{N}/{role}/{env}
```

| Bagian | Nilai | Contoh |
|--------|--------|--------|
| `{N}` | Nomor line (1–16) | `1` |
| `{role}` | `qc` atau `pqc` | `qc`, `pqc` |
| `{env}` | Environment | `mjl`, `mjl2`, `cln` |

### Contoh topic

- `info/line1/qc/mjl` — Info dari QC, line 1  
- `info/line1/pqc/mjl` — Info dari PQC, line 1  

### Payload (case-insensitive, dikirim persis)

| Payload | Teks animasi di dashboard |
|---------|----------------------------|
| `BEFORE_OUTPUT` | Garment Masih Berada di Output |
| `BEFORE_PQC` | Garment Masih Berada di PQC |
| `BEFORE_QC` | Garment Masih Berada di QC |
| `AFTER_QC` | Garment Sudah Berada di QC Good |
| `AFTER_PQC` | Garment Sudah Berada di PQC Good |

- **BEFORE_*** → informasi “garment masih berada di …”.  
- **AFTER_*** → informasi “garment sudah berada di … Good”.

---

## 5. Alur di Microcontroller

### 4.1 Saat terhubung ke MQTT

1. Microcontroller connect ke broker MQTT.
2. **Langsung publish** satu kali (atau periodik) ke **topic login** dengan payload **`login`**:
   - QC: `line{N}/qc/{env}` → payload `login`
   - PQC: `line{N}/pqc/{env}` → payload `login`
3. (Opsional) Publish ke **topic status online** dengan payload **`online`**:
   - `status/line{N}/qc/{env}` → payload `online`
   - `status/line{N}/pqc/{env}` → payload `online`
   - `status/line{N}/output/{env}` → payload `online` (jika ada device output)

### 5.2 Saat tap RFID (ID Card) — proses login

1. User tap ID Card di reader RFID.
2. Microcontroller memproses login (validasi ke backend/local).
3. Sesuai hasil:
   - **Login berhasil** → publish ke **topic login** (`line{N}/qc/{env}` atau `line{N}/pqc/{env}`) dengan payload **`success`**.
   - **Login gagal** → publish ke **topic login** yang sama dengan payload **`unsuccess`**.

Ringkas:

- Connect MQTT → kirim **`login`** ke topic login (dan boleh **`online`** ke topic status).
- Tap RFID → proses login → kirim **`success`** atau **`unsuccess`** ke topic login.

---

## 5. API untuk Dashboard

Dashboard tidak subscribe MQTT langsung; server (proxy) yang subscribe dan menyediakan API.

### 6.1 Event login & LED

- **Endpoint:** `GET /api/mqtt-login-success?line={N}`  
- **Response:** `event` (success), `eventFail` (unsuccess), `ledStatus` (qc/pqc: success \| unsuccess \| login).  
- Dashboard polling (mis. 1,5 detik) untuk menampilkan animasi dan LED.

### 6.2 Status online

- **Endpoint:** `GET /api/mqtt-status-online?line={N}`  
- **Response:** `status.qc`, `status.pqc`, `status.output` masing-masing `{ online: true/false, at?: number }`.  
- Alat dianggap online jika dalam 2 menit terakhir pernah mengirim payload `online` ke topic status yang sesuai.

---

## 6. Ringkasan Topic & Payload

| Kegunaan | Topic | Payload | Keterangan |
|----------|--------|---------|------------|
| Login event + LED | `line{N}/qc/{env}` | `success` \| `unsuccess` \| `login` | QC |
| Login event + LED | `line{N}/pqc/{env}` | `success` \| `unsuccess` \| `login` | PQC |
| Status online | `status/line{N}/qc/{env}` | `online` | QC online |
| Status online | `status/line{N}/pqc/{env}` | `online` | PQC online |
| Status online | `status/line{N}/output/{env}` | `online` | Output online |
| Info garment | `info/line{N}/qc/{env}` | `BEFORE_*` \| `AFTER_*` | Lihat tabel payload info |
| Info garment | `info/line{N}/pqc/{env}` | `BEFORE_*` \| `AFTER_*` | Lihat tabel payload info |

**`{N}`** = 1–16, **`{env}`** = `mjl` \| `mjl2` \| `cln`.

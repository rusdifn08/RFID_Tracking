# Update Firmware ESP32 PZEM — v2.0.0

Ringkasan perubahan finalisasi firmware berbasis **desired state**. Metadata (operator, NIK, style, line, location, kalibrasi, teks LCD) diubah dari backend/frontend, bukan dengan flash ulang tiap mesin.

---

## Kenapa tidak ada nama WiFi dan password di source?

**Sengaja dihilangkan** dari file `.ino`.

### Masalah versi lama
- SSID + password pabrik tertulis di source (contoh `WIFI_SSID` / `WIFI_PASS`).
- Password masuk Git → risiko bocor.
- Ganti WiFi pabrik = harus ubah kode + flash ulang semua ESP.
- Satu firmware untuk banyak lokasi jadi susah.

### Cara baru (v2)
Kredensial **tidak** di-hardcode. Disimpan di **NVS** (flash internal) lewat **Setup AP**:

1. Flash sekali firmware v2 (tanpa password di kode).
2. Jika NVS kosong, atau **kedua tombol ditahan saat boot**, ESP buka AP: `GISTEX-SETUP-{UID}`.
3. Hubungkan HP/laptop ke AP itu, buka `http://192.168.4.1`.
4. Isi form: **SSID WiFi**, **password WiFi**, MQTT host/port/user/password, UID, machine code.
5. Simpan → reboot → ESP connect ke WiFi pabrik dari NVS.

### Apa arti “kedua tombol ditahan saat boot”?

Ada **dua tombol fisik** di board:

| Tombol | Pin | Fungsi biasa |
|--------|-----|----------------|
| Page (ganti halaman LCD) | GPIO 9 | Tekan singkat = ganti slide LCD |
| Reset hari | GPIO 10 | Tahan ~2 detik = reset counter hari |

**Saat boot** = saat ESP baru dinyalakan / di-reboot:

1. Tekan **Page + Reset hari bersamaan** sebelum/saat power on.
2. Tahan sampai LCD tampil `SETUP WIFI` (AP `GISTEX-SETUP-…` muncul).
3. Lepas tombol, connect HP ke AP itu, isi WiFi di browser.

Ini **bukan** factory reset. Factory reset = kedua tombol ditahan **~5 detik setelah ESP sudah jalan** (hapus NVS WiFi/MQTT). Mode “tombol saat boot” hanya membuka Setup AP untuk ganti WiFi tanpa harus hapus semua data.

Password WiFi/MQTT **tidak pernah** dikirim di ACK MQTT atau log Serial.

| Item | Di source `.ino`? | Di mana disimpan? |
|------|-------------------|-------------------|
| SSID WiFi | Tidak | NVS / Setup AP |
| Password WiFi | Tidak | NVS / Setup AP |
| MQTT user/password | Tidak | NVS / Setup AP |
| MQTT host default | Ya (`10.5.0.106`) — hanya hint form | Override di Setup AP |
| Machine code / UID default | Ya (untuk boot pertama) | Override NVS / Setup AP / MQTT |

Factory reset (kedua tombol ~5 detik) menghapus NVS → AP setup muncul lagi.

---

## Yang dihilangkan

| Item | Alasan |
|------|--------|
| SSID / password WiFi di source | Secret tidak boleh di Git; provisioning lewat Setup AP |
| Deep sleep saat PZEM gagal / offline | Perangkat harus selalu siap terima `desired_state` dan OTA |
| Write NVS counter tiap ~10 detik | Kurangi wear flash; sekarang interval 60 detik + saat transisi/reconnect/reset |
| Ketergantungan flash ulang untuk ganti operator/style/line/location | Diganti kontrak `desired_state` retained dari backend |
| Mosquitto `allow_anonymous true` (target produksi) | Diganti autentikasi username/password |

---

## Yang ditambahkan

### Firmware (`esp32c6_pzem_lcd_mqtt.ino`)

| Fitur | Keterangan |
|-------|------------|
| `FW_VERSION` / `PROTOCOL_VERSION` / `boot_id` / capabilities | Diagnostics di boot, status, ACK |
| Topic retained `…/desired` + `…/dev/{UID}/desired` | Sumber state utama (operator, kalibrasi, `lcd_pages`, revision) |
| ACK lengkap | `command_id`, ok/error, fw, heap, reset reason |
| Validasi command | Target UID, ukuran JSON, rentang angka, `confirm:true` untuk destruktif |
| LCD dinamis `lcd_pages` | Maks 6 halaman 16×2 dari backend — teks baru tanpa flash |
| Setup AP `GISTEX-SETUP-xxxx` | Provisioning WiFi + MQTT tanpa secret di source |
| MQTT auth dari NVS | User/password opsional sesuai broker |
| OTA HTTPS + SHA-256 | Tolak HTTP, tolak versi sama/lebih lama, dual partition, rollback boot gagal |
| `partitions.csv` | Dua slot OTA di flash 4 MB |
| Task watchdog (~15 s) | Recovery hang |
| Factory reset dua tombol | Aman + hapus kredensial NVS |
| Tanggal counter WIB di NVS | Cegah data hari lama terbawa |

### Backend / broker / Docker

| Fitur | Keterangan |
|-------|------------|
| `MQTT_USER` / `MQTT_PASSWORD` | Env opsional; kosong = anonymous (transisi) |
| Publisher `desired_state` retained + revision | Monotonik; WebSocket `machine_meta` tetap ke frontend |
| `POST /api/machines/{id}/ota` | Body `{ url, sha256, version }` — binary tidak di repo |
| Mosquitto password file | Di luar Git (`mosquitto.passwd`) |
| Kompatibilitas topic lama | `cmd` / `lcd_state` / `login_status` masih dikirim |

---

## Alur singkat v2

```
Setup AP (pertama kali)
    → WiFi + MQTT auth di NVS
    → ESP publish telemetry + fw/proto/capabilities
    → Backend publish retained desired_state + revision
    → ESP validasi → terapkan LCD/operator/kalibrasi → ACK
    → Frontend update langsung via WebSocket
    → OTA (opsional): HTTPS + SHA-256 → slot baru → confirm / rollback
```

---

## Cara isi WiFi setelah flash v2

1. Arduino IDE: **ESP32C6 Dev Module**, flash **4MB**, Partition Scheme **Custom** (`partitions.csv`).
2. Flash firmware.
3. LCD tampil `SETUP WIFI` / SSID AP `GISTEX-SETUP-006` (contoh UID).
4. Connect ke AP → browser `192.168.4.1` → isi WiFi + MQTT → Simpan & reboot.
5. Pastikan Mosquitto + backend pakai user/password yang sama (lihat `backend-rust/mosquitto/README.md`).

Ubah WiFi kemudian: factory reset (dua tombol 5 detik) atau kirim `factory_reset` MQTT dengan `confirm: true`, lalu Setup AP lagi. Atau (jika sudah online) command `set_network` dari dashboard — password tetap tidak muncul di source code.

---

## Batas yang disengaja

- Tidak menyimpan seluruh telemetry mentah saat offline; counter Run/Loss/Off di NVS jadi sumber pemulihan.
- MQTT: auth username/password di LAN, **bukan** TLS. OTA tetap HTTPS + SHA-256 + rollback.

---

## File terkait

- Firmware: `arduino/esp32c6_pzem_lcd_mqtt/esp32c6_pzem_lcd_mqtt.ino`
- Wiring v2: `arduino/esp32c6_pzem_lcd_mqtt/wiring.md`
- Partition: `arduino/esp32c6_pzem_lcd_mqtt/partitions.csv`
- Setup singkat: `arduino/README.md`
- Broker: `backend-rust/mosquitto/`

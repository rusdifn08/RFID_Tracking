# Wiring — Firmware v2.0.0 (ESP32-C6 + PZEM + LCD)

Hardware **sama** dengan versi sebelumnya. Upgrade v2 hanya firmware (desired_state, Setup AP, OTA, MQTT auth). Pin di bawah cocok dengan `esp32c6_pzem_lcd_mqtt.ino` v2.

Board: **ESP32-C6 SuperMini** · Sensor: **PZEM-004T v4** · Display: **LCD I2C 16×2** (`0x27`)

Lihat juga: [`update_v2.md`](update_v2.md) · [`README.md`](../README.md)

---

## Daya

| ESP32-C6 | Sumber |
|----------|--------|
| 5V / USB | Power board (stabil; WiFi + OTA butuh arus cukup) |
| GND | GND bersama semua modul |

v2 **tidak deep sleep** — ESP selalu hidup. Pastikan supply 5V cukup untuk WiFi terus-menerus.

---

## PZEM-004T (UART)

| ESP32-C6 | PZEM-004T | Keterangan |
|----------|-----------|------------|
| GPIO **17** (RX) | **TX** | Silang |
| GPIO **16** (TX) | **RX** | Silang |
| GND | GND | Wajib bersama |
| — | L / N | Sisi AC (ukur beban mesin) |

> UART silang: RX↔TX. Jangan sambung jalur data 5V ke pin ESP.  
> Jika PZEM gagal baca: ESP v2 **tetap online** (hanya status `sensor_fail`) — cek TX/RX/GND/L-N.

---

## LCD I2C 16×2 (addr `0x27`)

| ESP32-C6 | LCD |
|----------|-----|
| GPIO **20** | SDA |
| GPIO **19** | SCL |
| 3V3 atau 5V | VCC |
| GND | GND |

Jika LCD blank: cek alamat I2C (`0x27` vs `0x3F`) dan pull-up SDA/SCL.

---

## Tombol (INPUT_PULLUP → tekan ke GND)

| ESP32-C6 | Label | Fungsi v2 |
|----------|-------|-----------|
| GPIO **9** | Page | Tekan singkat = ganti halaman LCD |
| GPIO **10** | Reset hari | Tahan **~2 detik** = reset counter Run/Loss/Off hari ini |
| GPIO **9 + 10** | Keduanya | Lihat kombinasi di bawah |

### Kombinasi tombol (baru di v2)

| Aksi | Cara | Hasil |
|------|------|--------|
| **Setup AP** (ganti WiFi/MQTT) | Tahan **kedua tombol saat boot** (power on / reboot) | AP `GISTEX-SETUP-{UID}` → isi form di `http://192.168.4.1` |
| **Setup AP** otomatis | NVS belum ada SSID/password | Sama, tanpa tekan tombol |
| **Factory reset** | Kedua tombol ditahan **~5 detik** saat ESP sudah jalan | Hapus WiFi/MQTT/login NVS → reboot ke Setup AP |
| Reset hari saja | Hanya GPIO10 tahan 2 detik (GPIO9 tidak ditekan) | Counter hari nol |

Wiring tombol: satu kaki ke GPIO, kaki lain ke **GND**. Tidak perlu resistor eksternal (pakai pull-up internal).

---

## Diagram ringkas

```
ESP32-C6 SuperMini              PZEM-004T
──────────────────              ─────────
GPIO17 (RX)  <───────────────  TX
GPIO16 (TX)  ───────────────>  RX
GND          ────────────────  GND
                               L / N ──→ AC mesin

ESP32-C6 SuperMini              LCD I2C 16x2 (0x27)
──────────────────              ───────────────────
GPIO20 (SDA) ────────────────  SDA
GPIO19 (SCL) ────────────────  SCL
3V3 / 5V     ────────────────  VCC
GND          ────────────────  GND

GPIO9  ──[ tombol Page ]── GND
GPIO10 ──[ tombol Reset ]── GND
```

---

## Pin map (kode ↔ fisik)

| `#define` di firmware | GPIO | Modul |
|-----------------------|------|--------|
| `PZEM_RX_PIN` | 17 | PZEM TX |
| `PZEM_TX_PIN` | 16 | PZEM RX |
| `I2C_SDA` / `SDA_PIN` | 20 | LCD SDA |
| `I2C_SCL` / `SCL_PIN` | 19 | LCD SCL |
| `BTN_PAGE` | 9 | Tombol page |
| `BTN_RESET` | 10 | Tombol reset hari / kombo |
| `LCD_ADDR` | — | `0x27` |

---

## Cek setelah wiring + flash v2

1. USB power → LCD nyala (splash UID/MAC).
2. Belum pernah isi WiFi → LCD `SETUP WIFI` / AP `GISTEX-SETUP-…`.
3. Sudah isi WiFi → connect STA, MQTT, slide Loss/Run.
4. Tombol Page → ganti slide.
5. Kedua tombol 5 detik → factory reset (uji di bench, bukan di produksi sembarangan).
6. Cabut PZEM sementara → ESP tetap MQTT online, LCD Voltage/Current `---`.

**Peringatan listrik:** sisi L/N PZEM bertegangan AC. Matikan power mesin sebelum menyambung/melepas kabel AC.

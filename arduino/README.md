# Firmware ESP32 — Machine Productivity IoT

| Folder | Board | Sensor | Catatan |
|--------|-------|--------|---------|
| `esp32_pzem_mqtt` | ESP32 klasik | PZEM-004T | MQTT saja |
| `esp32_adxl_mqtt` | ESP32 klasik | ADXL345 | MQTT + health |
| **`esp32c6_pzem_lcd_mqtt`** | **ESP32-C6 SuperMini** | PZEM + LCD 16x2 | Firmware final: `desired_state` + OTA |

Broker default: **`10.5.0.106:1883`** (username/password, bukan anonymous).

Prefix: `iot/gistex/{MACHINE_CODE}/` dan channel stabil `iot/gistex/dev/{UID}/`

- `telemetry/pzem` — data + `run_sec`/`loss_sec` + `fw`/`proto`/`boot_id`
- `status/pzem` — health / LWT; status `online` retained (menimpa LWT)
- `desired` — **retained desired_state** (operator, NIK, style, line, location, kalibrasi, `lcd_pages`)
- `cmd` / `ack` — perintah ad-hoc + ACK (`command_id`, error, fw)
- `lcd_state` — kompatibilitas firmware lama

## Kontrak backend ↔ ESP C6

Metadata (operator/NIK/style/line/location/kalibrasi/halaman LCD) **bukan** di-flash. Backend publish retained `desired_state` + `revision` monotonik. Firmware abaikan revision lama dan field asing.

OTA: `POST /api/machines/{id}/ota` body `{ "url": "https://...", "sha256": "<64 hex>", "version": "2.0.1" }`. Binary tidak disimpan di repo. ESP: HTTPS + SHA-256 + dual partition + rollback jika boot gagal.

## ESP32-C6 SuperMini (`esp32c6_pzem_lcd_mqtt`)

**Arduino IDE**

1. Board: **ESP32C6 Dev Module**, flash **4MB**
2. Partition Scheme: **Custom** — file `esp32c6_pzem_lcd_mqtt/partitions.csv` (dua slot OTA `app0`/`app1` @ 0x1C0000)
3. Serial 115200
4. Library: PubSubClient, ArduinoJson, PZEM004Tv30, LiquidCrystal_I2C

**Provisioning (tanpa password di source)**

- Flash sekali. Jika NVS kosong atau **kedua tombol ditahan saat boot**, ESP buka AP `GISTEX-SETUP-{UID}`.
- Buka `http://192.168.4.1` — isi SSID, password WiFi, MQTT host/port/user/password, UID, machine code.
- AP tertutup setelah simpan atau timeout 10 menit. Password tidak pernah dikirim di ACK/log.
- Factory reset: kedua tombol tahan ~5 detik (atau MQTT `factory_reset` + `confirm: true`).

**Pin:** PZEM RX17/TX16 · LCD I2C SDA20/SCL19 · tombol page GPIO9 · reset-hari (tahan 2s) / factory (bersama page) GPIO10

Perangkat **selalu online** (tidak deep sleep). PZEM gagal tidak membuat ESP tidur.

## Setup singkat

1. Mosquitto: `allow_anonymous false` + `mosquitto_passwd` — lihat `backend-rust/mosquitto/README.md`
2. `backend-rust` `.env` → `MQTT_HOST`, `MQTT_USER`, `MQTT_PASSWORD` (sama dengan broker)
3. Flash ESP C6 dengan partition custom, provision lewat Setup AP
4. Dashboard: operator/style/line/location langsung via WebSocket; LCD menyusul dari retained `desired` setelah ESP reconnect

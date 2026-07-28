# Firmware ESP32 — Machine Productivity IoT

| Folder | Board | Sensor | Catatan |
|--------|-------|--------|---------|
| `esp32_pzem_mqtt` | ESP32 klasik | PZEM-004T | MQTT saja |
| `esp32_adxl_mqtt` | ESP32 klasik | ADXL345 | MQTT + health |
| **`esp32c6_pzem_lcd_mqtt`** | **ESP32-C6 SuperMini** | PZEM + LCD 16x2 | Run/Loss **lokal** di LCD |

Broker default: **`10.5.0.106:1883`**

Prefix: `iot/gistex/{MACHINE_CODE}/`

- `telemetry/pzem|adxl` — data (+ `run_sec`/`loss_sec` di firmware C6)
- `status/pzem|adxl` — health / LWT
- `cmd` / `ack` — kalibrasi, `reset_day`, `ping`

## ESP32-C6 SuperMini + LCD (`esp32c6_pzem_lcd_mqtt`)

**Hitung di ESP (bukan backend):**
- **RUN** = detik RUNNING (arus/daya ≥ threshold)
- **LOS** = detik IDLE (tegangan ON, belum running) = Loss Time
- Cut otomatis **00:00 WIB** (NTP)
- LCD halaman: Run/Loss → V/A/W/% → WiFi/MQTT

**Pin:** PZEM RX17/TX16 · LCD I2C SDA20/SCL19 · tombol page GPIO9 · reset-hari (tahan 2s) GPIO10

**Library:** PubSubClient, ArduinoJson, PZEM004Tv30, LiquidCrystal_I2C

**Board IDE:** ESP32C6 Dev Module

## Setup singkat

1. Mosquitto di `10.5.0.106:1883`
2. Ubah WiFi / `MACHINE_CODE` / `DEVICE_UID` di `.ino`
3. `backend-rust` `.env` → `MQTT_HOST=10.5.0.106`
4. Flash & buka Serial 115200

# Backend Rust IoT (ADXL345 + PZEM-004T)

## Arsitektur singkat

- **ESP32 → MQTT (Mosquitto lokal)** untuk telemetry 1 Hz dan command
- **Dashboard → WebSocket** (`/ws`) untuk live status
- **Axum** subscribe MQTT, simpan Neon PostgreSQL, broadcast ke WebSocket

## Auto-provision mesin (MQTT)

ESP baru dengan `machine_code` + `device_uid` valid **otomatis** masuk DB:

1. Topic `iot/gistex/JUKI003/telemetry/pzem` + payload `device_uid=003`
2. Backend `find_or_provision` → insert `machines` + tautkan `devices`
3. Telemetry/status diproses seperti mesin yang sudah ada

Aturan kode: huruf+angka, 3–32 karakter (contoh `JUKI001`…`JUKI010`, `SEW-001`).  
Seed awal: **tidak ada**. Mesin hanya muncul setelah ESP kirim MQTT (auto-provision + baris di `devices`).
Dummy `JUKI001`–`JUKI010` tanpa device dihapus di migrasi `015`.

## Setup Mosquitto (Windows)

1. Install dari https://mosquitto.org/download/ (atau `winget install EclipseFoundation.Mosquitto`)
2. **Matikan service bawaan** (hanya listen `127.0.0.1`, ESP tidak bisa connect):

```powershell
# PowerShell Administrator
Stop-Service mosquitto
Set-Service mosquitto -StartupType Disabled
```

3. Jalankan **satu** broker dengan config repo (bind `0.0.0.0:1883`):

```powershell
mosquitto -c backend-rust\mosquitto\mosquitto.conf -v
```

4. Di `.env`, set `MQTT_HOST=10.5.0.106` (broker LAN), **bukan** `127.0.0.1` jika service Mosquitto Windows masih jalan — dua broker = ESP publish ke satu, backend subscribe ke yang lain.

3. Test publish (terminal lain):

```powershell
mosquitto_pub -h 127.0.0.1 -t "iot/gistex/SEW-001/telemetry/adxl" -m "{\"device_uid\":\"esp-demo-1\",\"ax\":0.1,\"ay\":0.2,\"az\":0.9}"
mosquitto_pub -h 127.0.0.1 -t "iot/gistex/SEW-001/telemetry/pzem" -m "{\"device_uid\":\"esp-demo-1\",\"voltage_v\":220,\"current_a\":0.5,\"power_w\":80,\"energy_kwh\":1.2}"
```

Topic command (ESP subscribe): `iot/gistex/{machine_code}/cmd`

## Setup database Neon

1. Salin `.env.example` → `.env`
2. Isi `DATABASE_URL` (pakai `sslmode=require`; hapus `channel_binding=require` jika sqlx gagal connect)
3. Migrasi dijalankan otomatis saat backend start

## Jalankan backend

```powershell
cd backend-rust
cargo run
```

Health: `GET http://127.0.0.1:8088/health`  
API mesin: `GET http://127.0.0.1:8088/api/machines`  
WebSocket: `ws://127.0.0.1:8088/ws`

## Default kalibrasi

| Parameter | Default |
|-----------|---------|
| G-Force threshold | 0.5 |
| Filter Aktif | 500 ms |
| Filter Diam | 3000 ms |
| Power threshold | 20 W |

## Payload ESP32 (1 Hz)

ADXL:

```json
{"device_uid":"esp-xxx","ax":0.12,"ay":-0.05,"az":0.98}
```

PZEM:

```json
{"device_uid":"esp-xxx","voltage_v":220.1,"current_a":0.45,"power_w":75.2,"energy_kwh":12.4,"frequency_hz":50,"power_factor":0.9}
```

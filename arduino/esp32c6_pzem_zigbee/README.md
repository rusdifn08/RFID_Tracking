# Zigbee Mesh — Gistex PZEM (Coordinator + Router)

Gantikan arsitektur Wi‑Fi/MQTT per-node dengan **Zigbee Mesh**. Backend MQTT tetap sama.

```
[Router ESP32-C6 + PZEM + LCD]  --Zigbee biner-->  [Coordinator ESP32-C6]
                                                          | Wi-Fi
                                                          v
                                                   MQTT 10.5.0.106:1883
                                                          |
                                                   backend-rust (tidak berubah)
```

Sketch Wi‑Fi lama (`esp32c6_pzem_lcd_mqtt`) **tetap ada** — ini jalur baru paralel.

## Folder

| Sketch | Peran |
|--------|--------|
| `Zigbee_Coordinator_Gateway/` | Wi‑Fi + MQTT + Zigbee Coordinator + NTP midnight |
| `Zigbee_Router_Node/` | PZEM + LCD + KPI + Zigbee Router (tanpa Wi‑Fi) |
| `zb_protocol.h` | Struct paket biner (shared) |
| `ZigbeeGistexEP.h` | Custom cluster `0xFC10` |

## Arduino IDE — Tools (WAJIB)

Untuk **kedua** board ESP32-C6:

1. Board: **ESP32C6 Dev Module**
2. **Zigbee Mode → Zigbee ZCZR (coordinator/router)**
3. Partition: **Custom** (`partitions.csv` di folder sketch)
4. **Core Debug Level → None**
5. Core ESP32 **≥ 3.x**

Library: Coordinator = **PubSubClient**. Router = `PZEM004Tv30`, `LiquidCrystal_I2C`.

## Urutan flash & rejoin (PENTING)

Setelah **flash ulang Coordinator**, jaringan Zigbee **baru** terbentuk. Router yang sudah pernah join masih menyimpan PAN lama di NVS → LCD bisa `NODES ACTIVE` lokal tapi Coordinator `NODES: 0`.

### Prosedur benar

1. Flash **Coordinator** dulu → tunggu `WIFI:OK` + Zigbee open (MQTT boleh `X` sementara — Zigbee tetap jalan).
2. Flash **Router** (set `DEFAULT_DEVICE_UID` / `DEFAULT_MACHINE_CODE`).
3. Kalau Router sudah pernah flash / tidak join:
   - **Opsi A:** Tools → **Erase All Flash Before Sketch Upload → Enabled** lalu upload Router.
   - **Opsi B:** Tahan tombol **PAGE 5 detik** → `ZB REJOIN...` (factory reset Zigbee, reboot).
4. Router otomatis: gagal join / orphan → **factoryReset** (bukan reboot biasa). Max 3x per 15 mnt.
5. LCD Router: `NODES ACTIVE` + UID. LCD Coord: `NODES: n` harus naik.

### Optimasi radio (sudah di firmware)

- TX power Zigbee **20 dBm**
- Channel mask **semua channel**
- Coordinator **TIME keep-alive** tiap 15 dtk
- Permit-join refresh tiap **45 dtk**
- Router **HELLO** tiap 4 dtk + burst 3x saat join

## Protokol biner (`zb_protocol.h`)

- `ZB_MSG_TEL` / `STATUS` / `ACK` / `CMD` / `TIME` / `HELLO`
- Coordinator juga publish snapshot `iot/gistex/coordinator/mesh` (dashboard realtime)

## Wiring Router

| Fungsi | GPIO |
|--------|------|
| PZEM RX / TX | 17 / 16 |
| LCD SDA / SCL | 20 / 19 |
| BTN page / reset | 9 / 10 |

Coordinator: USB + antena + Wi‑Fi + LCD I2C (SDA20/SCL19).

## Tombol Router

| Tombol | Aksi |
|--------|------|
| PAGE tahan **5 dtk** | Zigbee factory reset → rejoin |
| RESET tahan **2 dtk** | Reset counter hari (KPI) |

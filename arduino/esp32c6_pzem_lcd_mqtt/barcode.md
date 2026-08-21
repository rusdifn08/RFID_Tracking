# Barcode / QR Login Mesin (ESP32-C6)

## Format link (utama)

```
{ORIGIN}/ops/ml/{DEVICE_UID}
```

| Bagian | Sumber | Contoh |
|--------|--------|--------|
| `ORIGIN` | `VITE_APP_PUBLIC_ORIGIN` atau origin browser | `http://10.5.0.2:5173` |
| `DEVICE_UID` | UID ESP (unik, tetap) | `001` |

**Contoh:**

```
http://10.5.0.2:5173/ops/ml/001
```

Machine Code (`JUKI001`, `JUKI002`, …) **boleh diubah** di Control Machine tanpa ganti sticker QR — resolve login hanya lewat **UID**.

UID harus sudah terdaftar di tabel `devices` (set Device UID di Control Machine / auto dari MQTT).

### Env frontend

```env
VITE_APP_PUBLIC_ORIGIN=http://10.5.0.2:5173
VITE_IOT_API_URL=http://10.5.0.2:8088
```

---

## Template cetak (10 alat)

| UID | Link QR |
|-----|---------|
| `001` | `{ORIGIN}/ops/ml/001` |
| `002` | `{ORIGIN}/ops/ml/002` |
| `003` | `{ORIGIN}/ops/ml/003` |
| `004` | `{ORIGIN}/ops/ml/004` |
| `005` | `{ORIGIN}/ops/ml/005` |
| `006` | `{ORIGIN}/ops/ml/006` |
| `007` | `{ORIGIN}/ops/ml/007` |
| `008` | `{ORIGIN}/ops/ml/008` |
| `009` | `{ORIGIN}/ops/ml/009` |
| `010` | `{ORIGIN}/ops/ml/010` |

Dengan ORIGIN `http://10.5.0.2:5173`:

```
http://10.5.0.2:5173/ops/ml/001
http://10.5.0.2:5173/ops/ml/002
http://10.5.0.2:5173/ops/ml/003
http://10.5.0.2:5173/ops/ml/004
http://10.5.0.2:5173/ops/ml/005
http://10.5.0.2:5173/ops/ml/006
http://10.5.0.2:5173/ops/ml/007
http://10.5.0.2:5173/ops/ml/008
http://10.5.0.2:5173/ops/ml/009
http://10.5.0.2:5173/ops/ml/010
```

---

## Legacy (masih didukung)

```
{ORIGIN}/ops/ml/{UID}/{slug-code}   → contoh /ops/ml/002/juki-002
{ORIGIN}/m/MESIN001
```

---

## LCD sebelum login (2 slide, 5 dtk)

| Slide | Baris 1 | Baris 2 |
|-------|---------|---------|
| 1 | `OPERATOR BELUM` | `MELAKUKAN LOGIN` |
| 2 | `  JUKI-002  ` (tengah) | `  UID 002  ` (tengah) |

Setelah login → 3 slide Loss/Runn · Brand+Proses · OFFLINE/IDLE.

---

## API

- Gate UID: `GET /api/machines/by-gate/{uid}`
- Gate lama: `GET /api/machines/by-gate/{uid}/{slug}`
- Legacy: `GET /api/machines/by-barcode/MESIN001`

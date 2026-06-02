# Dokumentasi API Cutting (Khusus IP 10.5.0.107:9000)

Dokumen ini **hanya** berisi endpoint Cutting yang mengarah ke backend:

- Base URL: `http://10.5.0.107:9000`
- Prefix endpoint: `/api/gcc/cutting/*`

## Header

- Header autentikasi default pada integrasi ini:
  - `rfid-key: 0011779933`
- Pada project, header key/value bisa dioverride dari env:
  - `VITE_GCC_CUTTING_RFID_KEY_HEADER`
  - `VITE_GCC_CUTTING_RFID_KEY`

---

## 1) List & Register Bundle

### `GET http://10.5.0.107:9000/api/gcc/cutting/list`
- **Method**: `GET`
- **Query (opsional)**:
  - `barcode=<kode_barcode>`
- **Request body**: tidak ada

### `POST http://10.5.0.107:9000/api/gcc/cutting/reg`
- **Method**: `POST`
- **Request body**:
```json
{
  "id_bundles": "",
  "rfid_bundles": "RFID001",
  "barcode": "BD20260504-566275",
  "wo": "WO123",
  "style": "STYLE001",
  "size": "M",
  "meja": "",
  "warna": "BLACK",
  "no_ikat": "",
  "no_urut": "",
  "season": "",
  "country": "",
  "qty_bundles": 1,
  "placing": "A1",
  "id_user": "",
  "nik": "123456",
  "qty_output": 1,
  "last_status": "bundle",
  "output_time": "2026-05-08T08:00:00.000Z"
}
```

---

## 2) Scanning Bundle / QC / Supermarket

### `POST http://10.5.0.107:9000/api/gcc/cutting/output`
- **Method**: `POST`
- **Request body**:
```json
{
  "rfid_bundles": "RFID001",
  "nik": "123456"
}
```

### `GET http://10.5.0.107:9000/api/gcc/cutting/qc/qty`
- **Method utama**: `GET`
- **Query**:
  - `rfid_bundles=RFID001`
- **Request body**: tidak ada

### `POST http://10.5.0.107:9000/api/gcc/cutting/qc/qty` (fallback)
- **Method fallback** (jika GET tidak diterima gateway): `POST`
- **Request body**:
```json
{
  "rfid_bundles": "RFID001"
}
```

### `POST http://10.5.0.107:9000/api/gcc/cutting/qc`
- **Method**: `POST`
- **Request body**:
```json
{
  "rfid_bundles": "RFID001",
  "reject": 1,
  "repair": 2,
  "good": 17,
  "nik": "123456"
}
```

### `POST http://10.5.0.107:9000/api/gcc/cutting/smarket`
- **Method**: `POST`
- **Request body**:
```json
{
  "nik": "123456",
  "status": "in",
  "line": "L01",
  "branch": "GM1",
  "rfid_bundles": "RFID001"
}
```
- **Nilai `status`**: `in`, `out`, `urgent`

---

## 3) Dashboard Data Cutting

### `GET http://10.5.0.107:9000/api/gcc/cutting/qc/data`
- **Method**: `GET`
- **Request body**: tidak ada
- **Field response utama**:
  - `bundle`
  - `good`
  - `repair`
  - `reject`

### `GET http://10.5.0.107:9000/api/gcc/cutting/smarket/data`
- **Method**: `GET`
- **Request body**: tidak ada
- **Field response utama**:
  - `bundle`
  - `in`
  - `out`
  - `urgent`
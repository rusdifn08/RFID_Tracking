-- Operator + proses untuk mesin yang masih "Zigzag Plaket" tanpa NIK (UID 001, 006, 007, 008).
INSERT INTO operators (nik, name)
VALUES
  ('92500415', 'Apriliani'),
  ('92600605', 'Neng Rani'),
  ('92500253', 'Fitriyana Amelia'),
  ('92500742', 'Bintan Kamila')
ON CONFLICT (nik) DO UPDATE SET name = EXCLUDED.name, is_active = TRUE, updated_at = NOW();

UPDATE machines m
SET process_name = v.process_name,
    default_operator_nik = v.nik,
    default_operator_name = v.nama,
    updated_at = NOW()
FROM (VALUES
  ('001', 'JUKI001', 'Double Pouch', '92500415', 'Apriliani'),
  ('006', 'JUKI006', 'Hood Mid', '92600605', 'Neng Rani'),
  ('007', 'JUKI007', 'Hood Mid', '92500253', 'Fitriyana Amelia'),
  ('008', 'JUKI008', 'Gabung Variasi Hoodie', '92500742', 'Bintan Kamila')
) AS v(uid, code, process_name, nik, nama)
WHERE m.code = v.code
   OR EXISTS (SELECT 1 FROM devices d WHERE d.machine_id = m.id AND d.device_uid = v.uid);

INSERT INTO daily_shifts (machine_id, work_date, operator_id, operator_nik, operator_name, shift_status)
SELECT m.id,
       (NOW() AT TIME ZONE 'Asia/Jakarta')::date,
       o.id,
       v.nik,
       v.nama,
       'work'
FROM (VALUES
  ('001', 'JUKI001', '92500415', 'Apriliani'),
  ('006', 'JUKI006', '92600605', 'Neng Rani'),
  ('007', 'JUKI007', '92500253', 'Fitriyana Amelia'),
  ('008', 'JUKI008', '92500742', 'Bintan Kamila')
) AS v(uid, code, nik, nama)
JOIN machines m ON m.code = v.code
JOIN operators o ON o.nik = v.nik
ON CONFLICT (machine_id, work_date) DO UPDATE SET
  operator_id = EXCLUDED.operator_id,
  operator_nik = EXCLUDED.operator_nik,
  operator_name = EXCLUDED.operator_name,
  shift_status = EXCLUDED.shift_status,
  updated_at = NOW();

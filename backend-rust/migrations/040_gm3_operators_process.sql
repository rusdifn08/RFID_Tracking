-- 040_gm3_operators_process.sql
-- 1. Update semua mesin menjadi GM3
UPDATE machines
SET branch = 'GM3',
    line_name = '',
    location_note = 'GM3',
    updated_at = NOW();

-- 2. Daftarkan / perbarui operators
INSERT INTO operators (nik, name)
VALUES
  ('92600716', 'Bila'),
  ('92500709', 'Dita'),
  ('92501247', 'Silsi'),
  ('92501204', 'Triwulandari'),
  ('92600163', 'Rika De Sinta'),
  ('92600626', 'Eka Rismayanti'),
  ('92500542', 'Lala'),
  ('92500104', 'Eka Nur Alfiah'),
  ('92500604', 'Desti Maharani'),
  ('92400285', 'Yenni Komala Yasmin')
ON CONFLICT (nik) DO UPDATE
SET name = EXCLUDED.name,
    is_active = TRUE,
    updated_at = NOW();

-- 3. Update process_name & default operator per UID
UPDATE machines m
SET process_name = v.process_name,
    default_operator_nik = v.nik,
    default_operator_name = v.nama,
    branch = 'GM3',
    line_name = '',
    location_note = 'GM3',
    updated_at = NOW()
FROM (VALUES
  ('004', 'Kiri Vertikal', '92500104', 'Eka Nur Alfiah'),
  ('009', 'Front Kiri Horizontal', '92501204', 'Triwulandari'),
  ('010', 'Quilting Flip After Down', '92600626', 'Eka Rismayanti'),
  ('011', 'Front Depan Kiri Horizontal', '92400285', 'Yenni Komala Yasmin'),
  ('012', 'Front Kiri Vertikal', '92501247', 'Silsi'),
  ('013', 'Front Kanan Horizontal', '92600163', 'Rika De Sinta'),
  ('014', 'Kanan Vertikal', '92500542', 'Lala'),
  ('015', 'Front Kanan Vertikal', '92500709', 'Dita'),
  ('016', 'Front Zipper Horizontal', '92600716', 'Bila'),
  ('017', 'Front Quilting Kanan Horizontal', '92500604', 'Desti Maharani')
) AS v(uid, process_name, nik, nama)
WHERE EXISTS (SELECT 1 FROM devices d WHERE d.machine_id = m.id AND d.device_uid = v.uid)
   OR m.code = 'JUKI' || v.uid
   OR (v.uid = '004' AND m.code = 'SEW-001');

-- 4. Sinkronkan daily_shifts hari ini
INSERT INTO daily_shifts (machine_id, work_date, operator_id, operator_nik, operator_name, shift_status)
SELECT DISTINCT ON (m.id)
       m.id,
       (NOW() AT TIME ZONE 'Asia/Jakarta')::date,
       o.id,
       v.nik,
       v.nama,
       'work'
FROM (VALUES
  ('004', '92500104', 'Eka Nur Alfiah'),
  ('009', '92501204', 'Triwulandari'),
  ('010', '92600626', 'Eka Rismayanti'),
  ('011', '92400285', 'Yenni Komala Yasmin'),
  ('012', '92501247', 'Silsi'),
  ('013', '92600163', 'Rika De Sinta'),
  ('014', '92500542', 'Lala'),
  ('015', '92500709', 'Dita'),
  ('016', '92600716', 'Bila'),
  ('017', '92500604', 'Desti Maharani')
) AS v(uid, nik, nama)
JOIN machines m ON (EXISTS (SELECT 1 FROM devices d WHERE d.machine_id = m.id AND d.device_uid = v.uid)
                   OR m.code = 'JUKI' || v.uid
                   OR (v.uid = '004' AND m.code = 'SEW-001'))
JOIN operators o ON o.nik = v.nik
ON CONFLICT (machine_id, work_date) DO UPDATE SET
  operator_id = EXCLUDED.operator_id,
  operator_nik = EXCLUDED.operator_nik,
  operator_name = EXCLUDED.operator_name,
  shift_status = 'work',
  updated_at = NOW();

-- 5. Sinkronkan daily_shifts tanggal simulasi (2026-08-04)
INSERT INTO daily_shifts (machine_id, work_date, operator_id, operator_nik, operator_name, shift_status)
SELECT DISTINCT ON (m.id)
       m.id,
       DATE '2026-08-04',
       o.id,
       v.nik,
       v.nama,
       'work'
FROM (VALUES
  ('004', '92500104', 'Eka Nur Alfiah'),
  ('009', '92501204', 'Triwulandari'),
  ('010', '92600626', 'Eka Rismayanti'),
  ('011', '92400285', 'Yenni Komala Yasmin'),
  ('012', '92501247', 'Silsi'),
  ('013', '92600163', 'Rika De Sinta'),
  ('014', '92500542', 'Lala'),
  ('015', '92500709', 'Dita'),
  ('016', '92600716', 'Bila'),
  ('017', '92500604', 'Desti Maharani')
) AS v(uid, nik, nama)
JOIN machines m ON (EXISTS (SELECT 1 FROM devices d WHERE d.machine_id = m.id AND d.device_uid = v.uid)
                   OR m.code = 'JUKI' || v.uid
                   OR (v.uid = '004' AND m.code = 'SEW-001'))
JOIN operators o ON o.nik = v.nik
ON CONFLICT (machine_id, work_date) DO UPDATE SET
  operator_id = EXCLUDED.operator_id,
  operator_nik = EXCLUDED.operator_nik,
  operator_name = EXCLUDED.operator_name,
  shift_status = 'work',
  updated_at = NOW();

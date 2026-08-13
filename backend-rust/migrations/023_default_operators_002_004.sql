-- Operator default + proses untuk UID 002–004
UPDATE machines m
SET
  default_operator_name = 'Siti Elisyah',
  default_operator_nik = '92400864',
  process_name = 'Lapis Kancing Hoodie dan Variasi Zigzag',
  updated_at = NOW()
WHERE m.code = 'JUKI002'
   OR EXISTS (SELECT 1 FROM devices d WHERE d.machine_id = m.id AND d.device_uid = '002');

UPDATE machines m
SET
  default_operator_name = 'Rosita Mirawati',
  default_operator_nik = '92400583',
  process_name = 'Pasang Zipper ke planet',
  updated_at = NOW()
WHERE m.code = 'JUKI003'
   OR EXISTS (SELECT 1 FROM devices d WHERE d.machine_id = m.id AND d.device_uid = '003');

UPDATE machines m
SET
  default_operator_name = 'Alifyah Dewi Kirana',
  default_operator_nik = '92600762',
  process_name = 'Lapis kancing Tangan',
  updated_at = NOW()
WHERE m.code = 'SEW-001'
   OR EXISTS (SELECT 1 FROM devices d WHERE d.machine_id = m.id AND d.device_uid = '004');

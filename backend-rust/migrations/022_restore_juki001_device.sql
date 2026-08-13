-- Pastikan JUKI001 ada dan device UID 001 terikat ke mesin itu (bukan JUKI002).
INSERT INTO machines (code, name, brand, process_name, machine_type, kpi_source, login_required)
VALUES ('JUKI001', 'JUKI Zigzag Plaket', 'JUKI', 'Zigzag Plaket', 'sewing', 'esp', TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  process_name = EXCLUDED.process_name,
  updated_at = NOW();

UPDATE devices d
SET machine_id = m.id
FROM machines m
WHERE d.device_uid = '001'
  AND m.code = 'JUKI001'
  AND d.machine_id IS DISTINCT FROM m.id;

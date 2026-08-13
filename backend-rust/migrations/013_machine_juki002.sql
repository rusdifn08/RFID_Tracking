-- Daftarkan mesin JUKI002 + device ESP "001" (selaras firmware MACHINE_CODE / DEVICE_UID)
-- Barcode tidak di-set di sini: unik per mesin, diisi dari Control Machine.
INSERT INTO machines (code, name, brand, process_name, machine_type, location_note, kpi_source)
VALUES (
    'JUKI002',
    'JUKI Zigzag Plaket',
    'JUKI',
    'Zigzag Plaket',
    'sewing',
    '',
    'esp'
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    brand = EXCLUDED.brand,
    process_name = EXCLUDED.process_name,
    updated_at = NOW();

INSERT INTO devices (machine_id, device_uid, is_online)
SELECT id, '001', FALSE
FROM machines
WHERE code = 'JUKI002'
ON CONFLICT (device_uid) DO UPDATE SET
    machine_id = EXCLUDED.machine_id;

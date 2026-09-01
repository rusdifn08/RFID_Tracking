-- Slot UID 019 & 020 — placeholder menunggu hardware; monitoring sudah 21 mesin (001–021).
INSERT INTO machines (code, name, brand, process_name, machine_type, location_note, kpi_source, barcode)
VALUES
    ('JUKI019', 'JUKI', 'JUKI', '—', 'sewing', '', 'esp', 'MESIN019'),
    ('JUKI020', 'JUKI', 'JUKI', '—', 'sewing', '', 'esp', 'MESIN020')
ON CONFLICT (code) DO UPDATE SET
    brand = EXCLUDED.brand,
    process_name = EXCLUDED.process_name,
    updated_at = NOW();

INSERT INTO devices (machine_id, device_uid, is_online)
SELECT m.id, v.uid, FALSE
FROM (VALUES ('JUKI019', '019'), ('JUKI020', '020')) AS v(code, uid)
JOIN machines m ON m.code = v.code
ON CONFLICT (device_uid) DO UPDATE SET
    machine_id = EXCLUDED.machine_id;

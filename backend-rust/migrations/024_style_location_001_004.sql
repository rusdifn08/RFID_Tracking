-- Style + Location: UID 001–004
-- Location di machines (branch / line_name); Style di daily_shifts hari ini.

-- UID 001 → GM3, style 1101494
UPDATE machines m
SET branch = 'GM3',
    line_name = '',
    location_note = 'GM3',
    updated_at = NOW()
WHERE m.code = 'JUKI001'
   OR EXISTS (SELECT 1 FROM devices d WHERE d.machine_id = m.id AND d.device_uid = '001');

-- UID 002–004 → GM 1 Line 1, style 1101750
UPDATE machines m
SET branch = 'GM 1',
    line_name = 'Line 1',
    location_note = 'GM 1 Line 1',
    updated_at = NOW()
WHERE m.code IN ('JUKI002', 'JUKI003', 'SEW-001')
   OR EXISTS (
     SELECT 1 FROM devices d
     WHERE d.machine_id = m.id AND d.device_uid IN ('002', '003', '004')
   );

-- Style hari ini (UPSERT; jangan timpa operator yang sudah login)
INSERT INTO daily_shifts (machine_id, work_date, operator_nik, operator_name, garment_style, shift_status)
SELECT m.id,
       CURRENT_DATE,
       COALESCE(m.default_operator_nik, ''),
       COALESCE(m.default_operator_name, ''),
       '1101494',
       'idle'
FROM machines m
WHERE m.code = 'JUKI001'
   OR EXISTS (SELECT 1 FROM devices d WHERE d.machine_id = m.id AND d.device_uid = '001')
ON CONFLICT (machine_id, work_date) DO UPDATE
SET garment_style = EXCLUDED.garment_style,
    updated_at = NOW();

INSERT INTO daily_shifts (machine_id, work_date, operator_nik, operator_name, garment_style, shift_status)
SELECT m.id,
       CURRENT_DATE,
       COALESCE(m.default_operator_nik, ''),
       COALESCE(m.default_operator_name, ''),
       '1101750',
       'idle'
FROM machines m
WHERE m.code IN ('JUKI002', 'JUKI003', 'SEW-001')
   OR EXISTS (
     SELECT 1 FROM devices d
     WHERE d.machine_id = m.id AND d.device_uid IN ('002', '003', '004')
   )
ON CONFLICT (machine_id, work_date) DO UPDATE
SET garment_style = EXCLUDED.garment_style,
    updated_at = NOW();

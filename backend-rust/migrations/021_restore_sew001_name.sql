-- Pulihkan nama tampilan SEW-001 (tertimpa identity singkat "SEW")
UPDATE machines
SET brand = 'JUKI',
    process_name = 'Zigzag Plaket',
    name = 'JUKI Zigzag Plaket',
    updated_at = NOW()
WHERE code = 'SEW-001'
  AND (brand IN ('', 'SEW') OR process_name = '' OR name IN ('SEW', 'SEW-001'));

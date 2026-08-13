-- Brand + nama proses; name = brand || ' ' || process_name
ALTER TABLE machines ADD COLUMN IF NOT EXISTS brand TEXT NOT NULL DEFAULT '';
ALTER TABLE machines ADD COLUMN IF NOT EXISTS process_name TEXT NOT NULL DEFAULT '';

-- Mesin tunggal saat ini → JUKI Zigzag Plaket (code/No tetap)
UPDATE machines
SET brand = 'JUKI',
    process_name = 'Zigzag Plaket',
    name = 'JUKI Zigzag Plaket',
    updated_at = NOW()
WHERE code = 'SEW-001'
   OR name ILIKE '%template%'
   OR name ILIKE '%sewing%';

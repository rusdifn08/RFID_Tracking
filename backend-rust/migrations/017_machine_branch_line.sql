-- Lokasi mesin: Branch (GM1) + Line (Line 1)
ALTER TABLE machines ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT '';
ALTER TABLE machines ADD COLUMN IF NOT EXISTS line_name TEXT NOT NULL DEFAULT '';

-- Backfill line dari location_note lama jika masih kosong
UPDATE machines
SET line_name = TRIM(location_note)
WHERE (line_name IS NULL OR line_name = '')
  AND location_note IS NOT NULL
  AND TRIM(location_note) <> '';

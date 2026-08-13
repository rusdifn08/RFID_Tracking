-- Garment WO fields pada shift harian (style = nomor style garment, bukan machine code)
ALTER TABLE daily_shifts ADD COLUMN IF NOT EXISTS garment_style TEXT;
ALTER TABLE daily_shifts ADD COLUMN IF NOT EXISTS wo TEXT;
ALTER TABLE daily_shifts ADD COLUMN IF NOT EXISTS size_label TEXT;
ALTER TABLE daily_shifts ADD COLUMN IF NOT EXISTS buyer TEXT;
ALTER TABLE daily_shifts ADD COLUMN IF NOT EXISTS item_name TEXT;
ALTER TABLE daily_shifts ADD COLUMN IF NOT EXISTS color_name TEXT;
-- work | broken | maintenance
ALTER TABLE daily_shifts ADD COLUMN IF NOT EXISTS shift_status TEXT NOT NULL DEFAULT 'work';

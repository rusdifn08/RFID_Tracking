-- Barcode QR mesin (MESIN001 … MESIN100) untuk login operator via scan kamera
ALTER TABLE machines ADD COLUMN IF NOT EXISTS barcode TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_machines_barcode_unique
    ON machines (barcode)
    WHERE barcode IS NOT NULL;

-- Hanya isi jika kosong DAN MESIN001 belum dipakai mesin lain
UPDATE machines m
SET barcode = 'MESIN001',
    updated_at = NOW()
WHERE m.code = 'SEW-001'
  AND (m.barcode IS NULL OR m.barcode = '')
  AND NOT EXISTS (
    SELECT 1 FROM machines x WHERE x.barcode = 'MESIN001' AND x.id <> m.id
  );

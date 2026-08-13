-- Default operator per mesin (tampil di Resume jika belum login harian)
ALTER TABLE machines ADD COLUMN IF NOT EXISTS default_operator_nik TEXT;
ALTER TABLE machines ADD COLUMN IF NOT EXISTS default_operator_name TEXT;

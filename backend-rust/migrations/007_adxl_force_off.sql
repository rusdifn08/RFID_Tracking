-- Paksa status ADXL ke mati dari dashboard
ALTER TABLE machines
  ADD COLUMN IF NOT EXISTS adxl_force_off BOOLEAN NOT NULL DEFAULT FALSE;

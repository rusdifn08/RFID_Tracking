-- Flag ESP sedang deep sleep (tampil DEEPSLEEP di /devices)
ALTER TABLE devices ADD COLUMN IF NOT EXISTS in_deep_sleep BOOLEAN NOT NULL DEFAULT FALSE;

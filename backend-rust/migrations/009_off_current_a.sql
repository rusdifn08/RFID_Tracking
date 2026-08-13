-- Ambang arus "mesin mati" (default 0.03 A); Running tetap current_threshold_a (default baru 0.6 A).
ALTER TABLE machines ADD COLUMN IF NOT EXISTS off_current_a DOUBLE PRECISION NOT NULL DEFAULT 0.03;
ALTER TABLE machines ALTER COLUMN current_threshold_a SET DEFAULT 0.6;

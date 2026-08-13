-- Snapshot Machine Off real (dibekukan saat sim mulai — tidak ikut telemetry live)
ALTER TABLE sim_machine_kpi ADD COLUMN IF NOT EXISTS off_sec INT NOT NULL DEFAULT 0;
ALTER TABLE sim_machine_kpi ADD COLUMN IF NOT EXISTS off_frozen BOOLEAN NOT NULL DEFAULT FALSE;

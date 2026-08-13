-- Setpoint arus stabil per fase simulasi (idle ~0.5A, running ~0.6–1.2A)
ALTER TABLE sim_machine_kpi ADD COLUMN IF NOT EXISTS amp_a REAL NOT NULL DEFAULT 0.52;

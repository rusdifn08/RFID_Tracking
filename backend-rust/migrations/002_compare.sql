-- Perbandingan deteksi PZEM (arus) vs ADXL345 (getaran) pada mesin yang sama
ALTER TABLE machines ADD COLUMN IF NOT EXISTS status_adxl TEXT NOT NULL DEFAULT 'offline';
ALTER TABLE machines ADD COLUMN IF NOT EXISTS status_pzem TEXT NOT NULL DEFAULT 'offline';
ALTER TABLE machines ADD COLUMN IF NOT EXISTS current_threshold_a DOUBLE PRECISION NOT NULL DEFAULT 0.15;

UPDATE machines SET status_adxl = status WHERE status_adxl = 'offline' AND status <> 'offline';
UPDATE machines SET status_pzem = status WHERE status_pzem = 'offline' AND status <> 'offline';

CREATE TABLE IF NOT EXISTS sensor_status_log (
    id              BIGSERIAL PRIMARY KEY,
    machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    sensor          TEXT NOT NULL CHECK (sensor IN ('adxl', 'pzem')),
    from_status     TEXT,
    to_status       TEXT NOT NULL,
    magnitude_g     DOUBLE PRECISION,
    current_a       DOUBLE PRECISION,
    power_w         DOUBLE PRECISION,
    ts              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sensor_log_machine_ts ON sensor_status_log(machine_id, ts DESC);

CREATE TABLE IF NOT EXISTS detection_compare_daily (
    id                  BIGSERIAL PRIMARY KEY,
    machine_id          UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    work_date           DATE NOT NULL,
    total_samples       INTEGER NOT NULL DEFAULT 0,
    agree_samples       INTEGER NOT NULL DEFAULT 0,
    pzem_only_active    INTEGER NOT NULL DEFAULT 0,
    adxl_only_active    INTEGER NOT NULL DEFAULT 0,
    both_running        INTEGER NOT NULL DEFAULT 0,
    both_idle           INTEGER NOT NULL DEFAULT 0,
    pzem_running_sec    INTEGER NOT NULL DEFAULT 0,
    adxl_running_sec    INTEGER NOT NULL DEFAULT 0,
    UNIQUE (machine_id, work_date)
);

CREATE TABLE IF NOT EXISTS detection_disputes (
    id              BIGSERIAL PRIMARY KEY,
    machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    status_adxl     TEXT NOT NULL,
    status_pzem     TEXT NOT NULL,
    magnitude_g     DOUBLE PRECISION,
    current_a       DOUBLE PRECISION,
    ts              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_machine_ts ON detection_disputes(machine_id, ts DESC);

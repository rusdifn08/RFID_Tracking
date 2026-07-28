-- Rekap periode operasi (disimpan otomatis saat reset counter)
CREATE TABLE IF NOT EXISTS operation_periods (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    sensor          TEXT NOT NULL CHECK (sensor IN ('pzem', 'adxl')),
    work_date       DATE NOT NULL,
    period_start    TIMESTAMPTZ NOT NULL,
    period_end      TIMESTAMPTZ NOT NULL,
    machine_code    TEXT NOT NULL,
    machine_name    TEXT NOT NULL,
    location_note   TEXT,
    operator_nik    TEXT,
    operator_name   TEXT,
    running_sec     INTEGER NOT NULL DEFAULT 0,
    idle_sec        INTEGER NOT NULL DEFAULT 0,
    off_sec         INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operation_periods_machine_ts
    ON operation_periods(machine_id, sensor, period_end DESC);

CREATE INDEX IF NOT EXISTS idx_operation_periods_date
    ON operation_periods(work_date DESC, machine_id);

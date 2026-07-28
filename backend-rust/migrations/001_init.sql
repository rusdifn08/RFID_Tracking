-- IoT Machine Productivity schema (ADXL345 + PZEM-004T V4)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS machines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    machine_type    TEXT NOT NULL DEFAULT 'sewing',
    location_note   TEXT,
    status          TEXT NOT NULL DEFAULT 'offline'
                    CHECK (status IN ('running', 'idle', 'offline', 'error')),
    g_force_threshold   DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    filter_aktif_ms     INTEGER NOT NULL DEFAULT 500,
    filter_diam_ms      INTEGER NOT NULL DEFAULT 3000,
    power_threshold_w   DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    device_uid      TEXT NOT NULL UNIQUE,
    firmware        TEXT,
    last_seen_at    TIMESTAMPTZ,
    is_online       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_machine ON devices(machine_id);

CREATE TABLE IF NOT EXISTS telemetry_adxl (
    id              BIGSERIAL PRIMARY KEY,
    machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    device_uid      TEXT NOT NULL,
    ts              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ax              DOUBLE PRECISION NOT NULL,
    ay              DOUBLE PRECISION NOT NULL,
    az              DOUBLE PRECISION NOT NULL,
    magnitude_g     DOUBLE PRECISION NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_adxl_machine_ts ON telemetry_adxl(machine_id, ts DESC);

CREATE TABLE IF NOT EXISTS telemetry_pzem (
    id              BIGSERIAL PRIMARY KEY,
    machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    device_uid      TEXT NOT NULL,
    ts              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    voltage_v       DOUBLE PRECISION NOT NULL,
    current_a       DOUBLE PRECISION NOT NULL,
    power_w         DOUBLE PRECISION NOT NULL,
    energy_kwh      DOUBLE PRECISION NOT NULL,
    frequency_hz    DOUBLE PRECISION,
    power_factor    DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS idx_pzem_machine_ts ON telemetry_pzem(machine_id, ts DESC);

CREATE TABLE IF NOT EXISTS machine_status_log (
    id              BIGSERIAL PRIMARY KEY,
    machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    from_status     TEXT,
    to_status       TEXT NOT NULL,
    reason          TEXT,
    magnitude_g     DOUBLE PRECISION,
    power_w         DOUBLE PRECISION,
    ts              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_log_machine_ts ON machine_status_log(machine_id, ts DESC);

CREATE TABLE IF NOT EXISTS work_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ,
    duration_sec    INTEGER,
    energy_start_kwh DOUBLE PRECISION,
    energy_end_kwh   DOUBLE PRECISION,
    energy_kwh      DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS idx_sessions_machine ON work_sessions(machine_id, started_at DESC);

CREATE TABLE IF NOT EXISTS daily_productivity (
    id              BIGSERIAL PRIMARY KEY,
    machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    work_date       DATE NOT NULL,
    running_sec     INTEGER NOT NULL DEFAULT 0,
    idle_sec        INTEGER NOT NULL DEFAULT 0,
    offline_sec     INTEGER NOT NULL DEFAULT 0,
    energy_kwh      DOUBLE PRECISION NOT NULL DEFAULT 0,
    utilization_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
    UNIQUE (machine_id, work_date)
);

CREATE TABLE IF NOT EXISTS device_commands (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    device_uid      TEXT,
    command         TEXT NOT NULL,
    payload         JSONB,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'sent', 'acked', 'failed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acked_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS alerts (
    id              BIGSERIAL PRIMARY KEY,
    machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    alert_type      TEXT NOT NULL,
    severity        TEXT NOT NULL DEFAULT 'info',
    message         TEXT NOT NULL,
    is_resolved     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_open ON alerts(machine_id, is_resolved, created_at DESC);

-- Seed satu mesin contoh untuk uji ESP32
INSERT INTO machines (code, name, machine_type, location_note)
VALUES ('SEW-001', 'Sewing Machine 001', 'sewing', 'Area sample')
ON CONFLICT (code) DO NOTHING;

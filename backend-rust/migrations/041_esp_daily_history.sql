-- 041_esp_daily_history.sql
CREATE TABLE IF NOT EXISTS esp_daily_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    device_uid VARCHAR(32) NOT NULL,
    work_date DATE NOT NULL,
    ymd INT NOT NULL,
    run_sec INT NOT NULL DEFAULT 0,
    loss_sec INT NOT NULL DEFAULT 0,
    off_sec INT NOT NULL DEFAULT 0,
    power_on_sec INT NOT NULL DEFAULT 0,
    productivity_pct DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    mqtt_service VARCHAR(48),
    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_esp_daily_history UNIQUE (machine_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_esp_daily_history_work_date ON esp_daily_history (work_date);
CREATE INDEX IF NOT EXISTS idx_esp_daily_history_device_uid ON esp_daily_history (device_uid);

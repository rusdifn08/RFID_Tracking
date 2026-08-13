-- Periode deep sleep ESP (mesin OFF lama → hemat daya)
CREATE TABLE IF NOT EXISTS device_deep_sleep (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES machines (id) ON DELETE CASCADE,
    device_uid TEXT NOT NULL,
    sleep_from TIMESTAMPTZ NOT NULL,
    sleep_to TIMESTAMPTZ,
    duration_sec INT,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_deep_sleep_machine_from
    ON device_deep_sleep (machine_id, sleep_from DESC);

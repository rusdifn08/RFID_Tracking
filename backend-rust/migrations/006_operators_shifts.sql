-- Operator manual (NIK + nama) + assign shift harian per mesin
CREATE TABLE IF NOT EXISTS operators (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nik         TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_shifts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    work_date       DATE NOT NULL,
    operator_id     UUID REFERENCES operators(id) ON DELETE SET NULL,
    operator_nik    TEXT NOT NULL,
    operator_name   TEXT NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (machine_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_shifts_date ON daily_shifts(work_date DESC);
CREATE INDEX IF NOT EXISTS idx_operators_nik ON operators(nik);

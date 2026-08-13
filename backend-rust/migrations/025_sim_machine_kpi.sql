-- KPI simulasi sementara (run/idle mulai 0; machine off tetap dari data real)
CREATE TABLE IF NOT EXISTS sim_machine_kpi (
    machine_id      UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    work_date       DATE NOT NULL,
    run_sec         INT NOT NULL DEFAULT 0,
    idle_sec        INT NOT NULL DEFAULT 0,
    phase           TEXT NOT NULL DEFAULT 'idle',
    phase_left_sec  INT NOT NULL DEFAULT 60,
    target_prod     REAL NOT NULL DEFAULT 0.55,
    last_tick_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (machine_id, work_date),
    CONSTRAINT sim_machine_kpi_phase_chk CHECK (phase IN ('running', 'idle'))
);

-- Titik grafik arus simulasi (dipruning berkala)
CREATE TABLE IF NOT EXISTS sim_machine_chart (
    id          BIGSERIAL PRIMARY KEY,
    machine_id  UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    work_date   DATE NOT NULL,
    ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    phase       TEXT NOT NULL,
    current_a   REAL NOT NULL,
    power_w     REAL NOT NULL DEFAULT 0,
    voltage_v   REAL NOT NULL DEFAULT 220
);

CREATE INDEX IF NOT EXISTS sim_machine_chart_lookup
  ON sim_machine_chart (machine_id, work_date, ts DESC);

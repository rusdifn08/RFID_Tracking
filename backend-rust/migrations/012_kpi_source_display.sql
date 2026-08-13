-- Sumber KPI: 'esp' = counter ESP (selaras LCD) | 'telemetry' = hitung dari telemetry DB
ALTER TABLE machines ADD COLUMN IF NOT EXISTS kpi_source TEXT NOT NULL DEFAULT 'esp';
ALTER TABLE machines ADD COLUMN IF NOT EXISTS lcd_auto_ms INTEGER NOT NULL DEFAULT 4000;

UPDATE machines SET kpi_source = 'esp' WHERE kpi_source IS NULL OR kpi_source = '';

-- Aktifkan kembali UID 005-007 dan reset histori sekali saja.
-- Karena migrasi raw dieksekusi tiap boot, pakai marker agar tidak menghapus data berulang.

CREATE TABLE IF NOT EXISTS migration_marks (
  key text PRIMARY KEY,
  done_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM migration_marks WHERE key = 'restore_uid_005_007_fresh_v1') THEN
    RETURN;
  END IF;

  -- Pastikan mesin ada.
  INSERT INTO machines (code, name, brand, process_name, machine_type, kpi_source)
  VALUES
    ('JUKI005', 'JUKI Zigzag Plaket', 'JUKI', 'Zigzag Plaket', 'sewing', 'esp'),
    ('JUKI006', 'JUKI Zigzag Plaket', 'JUKI', 'Zigzag Plaket', 'sewing', 'esp'),
    ('JUKI007', 'JUKI Zigzag Plaket', 'JUKI', 'Zigzag Plaket', 'sewing', 'esp')
  ON CONFLICT (code) DO NOTHING;

  -- Bersihkan riwayat lama terkait UID 005-007 (telemetry by device uid).
  DELETE FROM telemetry_pzem WHERE device_uid IN ('005','006','007');
  DELETE FROM telemetry_adxl WHERE device_uid IN ('005','006','007');

  -- Bersihkan riwayat agregat/status per mesin JUKI005-007.
  WITH m AS (
    SELECT id FROM machines WHERE code IN ('JUKI005','JUKI006','JUKI007')
  )
  DELETE FROM operation_periods WHERE machine_id IN (SELECT id FROM m);

  WITH m AS (
    SELECT id FROM machines WHERE code IN ('JUKI005','JUKI006','JUKI007')
  )
  DELETE FROM sensor_status_log WHERE machine_id IN (SELECT id FROM m);

  WITH m AS (
    SELECT id FROM machines WHERE code IN ('JUKI005','JUKI006','JUKI007')
  )
  DELETE FROM machine_status_log WHERE machine_id IN (SELECT id FROM m);

  WITH m AS (
    SELECT id FROM machines WHERE code IN ('JUKI005','JUKI006','JUKI007')
  )
  DELETE FROM detection_compare_daily WHERE machine_id IN (SELECT id FROM m);

  WITH m AS (
    SELECT id FROM machines WHERE code IN ('JUKI005','JUKI006','JUKI007')
  )
  DELETE FROM daily_productivity WHERE machine_id IN (SELECT id FROM m);

  WITH m AS (
    SELECT id FROM machines WHERE code IN ('JUKI005','JUKI006','JUKI007')
  )
  DELETE FROM detection_disputes WHERE machine_id IN (SELECT id FROM m);

  WITH m AS (
    SELECT id FROM machines WHERE code IN ('JUKI005','JUKI006','JUKI007')
  )
  DELETE FROM work_sessions WHERE machine_id IN (SELECT id FROM m);

  -- Lepas binding device lama 005-007, akan terisi lagi saat device publish data baru.
  DELETE FROM devices WHERE device_uid IN ('005','006','007');

  INSERT INTO migration_marks(key) VALUES ('restore_uid_005_007_fresh_v1')
  ON CONFLICT (key) DO NOTHING;
END $$;

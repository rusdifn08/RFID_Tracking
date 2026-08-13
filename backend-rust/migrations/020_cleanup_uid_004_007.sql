-- Cleanup UID dummy 005–007 (bukan 004 — 004 = SEW-001 aktif).
-- Idempotent tiap boot.

DO $$
BEGIN
  DELETE FROM machines m
  WHERE EXISTS (
    SELECT 1 FROM devices d
    WHERE d.machine_id = m.id
      AND d.device_uid IN ('005', '006', '007')
  );

  DELETE FROM devices
  WHERE device_uid IN ('005', '006', '007');

  -- Hapus juga mesin kode JUKI005–007 jika masih tersisa tanpa device
  DELETE FROM machines
  WHERE code IN ('JUKI005', 'JUKI006', 'JUKI007');

  -- Rename UID firmware lama → 004 (hanya jika 004 belum ada)
  IF NOT EXISTS (SELECT 1 FROM devices WHERE device_uid = '004') THEN
    UPDATE devices
    SET device_uid = '004'
    WHERE device_uid = 'esp-c6-pzem-001';
  ELSE
    DELETE FROM devices WHERE device_uid = 'esp-c6-pzem-001';
  END IF;
END $$;

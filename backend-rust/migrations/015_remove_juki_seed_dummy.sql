-- Hapus seed dummy JUKI001–JUKI010 yang belum pernah kirim MQTT (tidak punya device).
-- JUKI002 (atau mesin lain yang sudah punya devices) tetap.
DELETE FROM machines m
WHERE m.code ~ '^JUKI[0-9]{3}$'
  AND NOT EXISTS (
    SELECT 1 FROM devices d WHERE d.machine_id = m.id
  );

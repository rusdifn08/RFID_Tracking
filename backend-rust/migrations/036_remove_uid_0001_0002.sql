-- Dummy Zigbee UID 0001/0002 (JUKI0001/JUKI0002) — tidak dipakai, hilangkan dari monitoring.
DELETE FROM machines
WHERE code IN ('JUKI0001', 'JUKI0002')
   OR id IN (
     SELECT machine_id FROM devices WHERE device_uid IN ('0001', '0002')
   );

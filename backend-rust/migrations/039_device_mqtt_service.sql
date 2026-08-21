-- 039_device_mqtt_service.sql
-- Menyimpan IP service MQTT aktif (10.5.0.106 lokal vs 10.5.2.223 robotic)

ALTER TABLE devices ADD COLUMN IF NOT EXISTS mqtt_service VARCHAR(48);

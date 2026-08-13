-- Tandai jalur link device: wifi (ESP langsung MQTT) vs zigbee (via Coordinator bridge).
ALTER TABLE devices ADD COLUMN IF NOT EXISTS link_type TEXT NOT NULL DEFAULT 'wifi';

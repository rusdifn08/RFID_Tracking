-- Status System Login yang dilaporkan ESP (telemetry / ACK), terpisah dari machines.login_required (desired).
ALTER TABLE devices ADD COLUMN IF NOT EXISTS esp_login_required BOOLEAN;

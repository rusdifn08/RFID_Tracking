-- Wajib login harian per mesin (ON = harus login, OFF = jalan tanpa login)
ALTER TABLE machines ADD COLUMN IF NOT EXISTS login_required BOOLEAN NOT NULL DEFAULT TRUE;

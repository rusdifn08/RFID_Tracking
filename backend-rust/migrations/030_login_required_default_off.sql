-- Samakan default firmware: System Login OFF (KPI tanpa wajib login)
UPDATE machines SET login_required = FALSE WHERE login_required IS DISTINCT FROM FALSE;
ALTER TABLE machines ALTER COLUMN login_required SET DEFAULT FALSE;

-- Idle / MSN ON mulai di atas 0.01 A; Running tetap >= current_threshold_a (0.6)
UPDATE machines SET off_current_a = 0.01 WHERE off_current_a IS DISTINCT FROM 0.01;
ALTER TABLE machines ALTER COLUMN off_current_a SET DEFAULT 0.01;

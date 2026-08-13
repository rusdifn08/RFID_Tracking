-- Sim KPI diikat ke device_uid agar aman jika mesin di-recreate (UUID baru)
ALTER TABLE sim_machine_kpi ADD COLUMN IF NOT EXISTS device_uid TEXT;

UPDATE sim_machine_kpi s
SET device_uid = d.device_uid
FROM devices d
WHERE d.machine_id = s.machine_id
  AND (s.device_uid IS NULL OR s.device_uid = '');

-- Ganti PK: jangan cascade-hapus sim saat machines recreate
ALTER TABLE sim_machine_kpi DROP CONSTRAINT IF EXISTS sim_machine_kpi_pkey;

DO $$
DECLARE
  conname text;
BEGIN
  FOR conname IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    WHERE tc.table_name = 'sim_machine_kpi'
      AND tc.constraint_type = 'FOREIGN KEY'
  LOOP
    EXECUTE format('ALTER TABLE sim_machine_kpi DROP CONSTRAINT %I', conname);
  END LOOP;
END $$;

ALTER TABLE sim_machine_kpi ALTER COLUMN machine_id DROP NOT NULL;

-- PK baru berbasis device_uid + tanggal (fallback machine_id jika uid kosong)
ALTER TABLE sim_machine_kpi
  ADD COLUMN IF NOT EXISTS id UUID NOT NULL DEFAULT gen_random_uuid();

-- pastikan id unik sebagai PK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'sim_machine_kpi' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE sim_machine_kpi ADD CONSTRAINT sim_machine_kpi_pkey PRIMARY KEY (id);
  END IF;
END $$;

ALTER TABLE sim_machine_kpi
  ADD CONSTRAINT sim_machine_kpi_machine_id_fkey
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sim_machine_kpi_device_day
  ON sim_machine_kpi (device_uid, work_date)
  WHERE device_uid IS NOT NULL AND device_uid <> '';

CREATE UNIQUE INDEX IF NOT EXISTS sim_machine_kpi_machine_day
  ON sim_machine_kpi (machine_id, work_date)
  WHERE machine_id IS NOT NULL;

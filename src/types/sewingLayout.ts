export type SewingUserRow = {
  nik: string;
  nama: string;
  no_hp: string;
  line: string;
  telegram: string;
  bagian: string;
  branch: string;
  rfid_user: string;
};

export type SmvMasterRow = {
  smv_id: number;
  smv_header_id: number;
  tanggal: string;
  buyer: string;
  style: string;
  short_itm: string | null;
  long_itm: string | null;
  item: string;
  nama_proses: string;
  cycle_time: number;
  smv_minute: number;
  output_pj: number;
  sepatu: string | null;
  corong: string | null;
  mesin: string | null;
  brand: string | null;
  cat: string;
  prd_on_capacity: number;
  actual_mp: number;
  manpower_need: number;
  working_time: number | null;
  targets: number | null;
  working_balance: number | null;
  actual_unit: number;
  attachment1: string | null;
  attachment2: string | null;
  attachment3: string | null;
  file1: string | null;
  file2: string | null;
  file3: string | null;
  user: string;
  ai_smv_master_mesin_id: number | null;
};

export type SewingLayoutOperator = {
  nik: string;
  nama: string;
  rfid_user: string;
  line: string;
};

export type SewingLayoutSlot = {
  position: number;
  smv_id: number;
  nama_proses: string;
  mesin: string | null;
  cat: string;
  smv_minute: number;
  cycle_time: number;
  manpower_need: number;
  operator: SewingLayoutOperator | null;
  /** Batch per proses (1–10) */
  batch: number;
};

export type SewingLayoutPayload = {
  line: string;
  style: string;
  environment: string;
  buyer?: string;
  item?: string;
  updatedAt: string;
  slots: SewingLayoutSlot[];
};

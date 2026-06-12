import type { SewingLayoutPayload, SewingLayoutSlot, SewingUserRow, SmvMasterRow } from '../types/sewingLayout';

export const BATCH_MIN = 1;
export const BATCH_MAX = 10;
export const BATCH_DEFAULT = 1;

export const clampLayoutBatch = (value: number): number =>
  Math.min(BATCH_MAX, Math.max(BATCH_MIN, Math.round(value)));

/** Normalisasi label line: "LINE 1" / "1" → "1" */
export function normalizeSewingLineKey(line: string | number | null | undefined): string {
  const raw = String(line ?? '').trim().toUpperCase().replace(/^LINE\s*/i, '');
  const num = parseInt(raw, 10);
  return Number.isFinite(num) ? String(num) : raw;
}

export function userMatchesSewingLine(userLine: string, lineId: string): boolean {
  return normalizeSewingLineKey(userLine) === normalizeSewingLineKey(lineId);
}

export function filterSewingUsersByLine(users: SewingUserRow[], lineId: string): SewingUserRow[] {
  return users.filter((u) => userMatchesSewingLine(u.line, lineId));
}

export function buildLayoutSlotsFromSmv(
  smvRows: SmvMasterRow[],
  existingSlots?: SewingLayoutSlot[]
): SewingLayoutSlot[] {
  const existingBySmvId = new Map((existingSlots ?? []).map((s) => [s.smv_id, s]));
  const sorted = [...smvRows].sort((a, b) => a.smv_id - b.smv_id);

  return sorted.map((row, index) => {
    const prev = existingBySmvId.get(row.smv_id);
    return {
      position: index + 1,
      smv_id: row.smv_id,
      nama_proses: row.nama_proses,
      mesin: row.mesin,
      cat: row.cat,
      smv_minute: row.smv_minute,
      cycle_time: row.cycle_time,
      manpower_need: row.manpower_need,
      operator: prev?.operator ?? null,
      batch: clampLayoutBatch(
        prev?.batch ?? (prev as SewingLayoutSlot & { vatch?: number })?.vatch ?? BATCH_DEFAULT
      ),
    };
  });
}

export function buildSewingLayoutPayload(params: {
  lineId: string;
  style: string;
  environment: string;
  smvRows: SmvMasterRow[];
  slots: SewingLayoutSlot[];
}): SewingLayoutPayload {
  const first = params.smvRows[0];
  return {
    line: normalizeSewingLineKey(params.lineId),
    style: params.style.trim(),
    environment: params.environment,
    buyer: first?.buyer,
    item: first?.item,
    updatedAt: new Date().toISOString(),
    slots: params.slots,
  };
}

export type SewingLayoutPostRow = {
  smv_id: number;
  rfid_user: string;
  batch: number;
};

export type SewingLayoutPostPayload = {
  line: string;
  style: string;
  environment: string;
  data: SewingLayoutPostRow[];
};

/** Payload POST uji coba — hanya baris yang sudah punya operator */
export function buildLayoutPostPayload(params: {
  lineId: string;
  style: string;
  environment: string;
  slots: SewingLayoutSlot[];
}): SewingLayoutPostPayload {
  const data: SewingLayoutPostRow[] = params.slots
    .filter((s) => s.operator?.rfid_user)
    .map((s) => ({
      smv_id: s.smv_id,
      rfid_user: s.operator!.rfid_user,
      batch: clampLayoutBatch(s.batch),
    }));

  return {
    line: normalizeSewingLineKey(params.lineId),
    style: params.style.trim(),
    environment: params.environment,
    data,
  };
}

/** Terapkan hasil GET layout-post ke slots (match by smv_id) */
export function applyLayoutPostToSlots(
  slots: SewingLayoutSlot[],
  rows: SewingLayoutPostRow[],
  users: SewingUserRow[]
): SewingLayoutSlot[] {
  const bySmv = new Map(rows.map((r) => [r.smv_id, r]));
  return slots.map((slot) => {
    const row = bySmv.get(slot.smv_id);
    if (!row) return slot;
    const user =
      users.find((u) => u.rfid_user === row.rfid_user) ??
      users.find((u) => u.nik === row.rfid_user);
    return {
      ...slot,
      batch: clampLayoutBatch(row.batch),
      operator: user
        ? {
            nik: user.nik,
            nama: user.nama,
            rfid_user: user.rfid_user,
            line: user.line,
          }
        : {
            nik: row.rfid_user,
            nama: row.rfid_user,
            rfid_user: row.rfid_user,
            line: '',
          },
    };
  });
}

/**
 * Profil AMV per proses: kecepatan simulasi (ms/pcs) bervariasi per batch & proses.
 * AMV = waktu riil menit/pcs; SMV target dari data flow.
 */

export type ProcessAmvProfile = {
  processId: string;
  batchNo: number;
  processIdx: number;
  machineId: string;
  manPower: number;
  smvTarget: number;
  /** Waktu simulasi per 1 pcs (ms) — lebih besar = lebih lambat */
  msPerPcs: number;
};

const BATCH_MS_FACTOR: Record<number, number> = {
  1: 1.0,
  2: 1.22,
  3: 1.28,
  4: 1.45,
  5: 1.15,
  6: 1.75,
  7: 1.55,
};

/** Proses awal lebih cepat, sewing tengah lebih lambat, QC sedang */
const PROCESS_MS_FACTOR = [0.92, 1.05, 1.38, 1.48, 1.02];

const defaultManPower = (category: string): number => {
  const c = category.trim().toLowerCase();
  if (c === 'qc') return 1;
  if (c === 'assembling' || c === 'assembly' || c === 'ironing') return 2;
  if (c === 'sewing') return 2;
  return 1;
};

const calcMsPerPcs = (batchNo: number, processIdx: number, smvTarget: number): number => {
  const batchF = BATCH_MS_FACTOR[batchNo] ?? 1.2;
  const procF = PROCESS_MS_FACTOR[processIdx] ?? 1.1;
  const base = Math.max(0.12, smvTarget) * 60 * 1000;
  return Math.round(base * batchF * procF * 1.35);
};

type FlowProc = {
  processId: string;
  target: number;
  category: string;
  machineId?: string;
  manPower?: number;
};

type FlowLane = { batch: number; processes: FlowProc[] };

/** Bangun profil dari lane flow (dipanggil sekali di modul simulasi) */
export const buildAmvProfilesFromLanes = (lanes: FlowLane[]): Map<string, ProcessAmvProfile> => {
  const map = new Map<string, ProcessAmvProfile>();
  for (const lane of lanes) {
    lane.processes.forEach((proc, processIdx) => {
      const key = `${lane.batch}-${processIdx}`;
      map.set(key, {
        processId: proc.processId,
        batchNo: lane.batch,
        processIdx,
        machineId: proc.machineId ?? `MC-${proc.processId}`,
        manPower: proc.manPower ?? defaultManPower(proc.category),
        smvTarget: proc.target,
        msPerPcs: calcMsPerPcs(lane.batch, processIdx, proc.target),
      });
    });
  }
  return map;
};

export const SIM_TICK_MS = 500;

/**
 * Percepatan simulasi: 1 detik wall clock = 6 detik waktu produksi.
 * Contoh: 12 detik produksi → selesai dalam ~2 detik layar; AMV tetap tercatat 12 detik (0,20 menit).
 */
export const SIM_SPEED_FACTOR = 6;

/** Jitter ±15% per pcs agar AMV fluktuatif */
export const jitterMsPerPcs = (
  baseMs: number,
  batchNo: number,
  processIdx: number,
  bundleNo: number,
  pcsIndex: number
): number => {
  const seed = batchNo * 997 + processIdx * 131 + bundleNo * 17 + pcsIndex * 3;
  const wave = ((seed % 31) - 15) / 100;
  return Math.max(1200, Math.round(baseMs * (1 + wave)));
};

import { getBatchSnapshot, getBundleTargetPcs, getLastProcessOutput } from '../data/sewing/sewingDummyConfig';
import type { SewingFlowBatch } from '../types/sewingDashboard';
import {
  getBundlePcsAtProcess,
  isLanePipelineActive,
  type LineBatchSim,
  type ProcessSimState,
} from './sewingBatchSimulation';

/** RFID bundle 12 digit, diawali 00 — contoh: 000100007000 (batch 1, bundle 7) */
export const formatBundleRfid12 = (batchNo: number, bundleNo: number): string => {
  const raw = `00${String(batchNo).padStart(2, '0')}${String(bundleNo).padStart(5, '0')}000`;
  return raw.slice(0, 12);
};

export const PRODUCTION_BATCH_MAX = 5;
export const ASSEMBLY_BATCH_NO = 6;

export const isProductionBatch = (batchNo: number): boolean =>
  batchNo >= 1 && batchNo <= PRODUCTION_BATCH_MAX;

export const isAssemblyBatch = (batchNo: number): boolean => batchNo === ASSEMBLY_BATCH_NO;

/** Konversi total pcs → jumlah bundle untuk tampilan kartu */
export const pcsToBundleCount = (pcs: number, pcsPerBundle: number): number =>
  pcsPerBundle > 0 ? Math.max(0, Math.round(pcs / pcsPerBundle)) : 0;

export type BatchInOutMetrics = {
  /** Total pcs scan masuk (proses pertama) */
  pcsIn: number;
  /** Total pcs scan selesai (proses terakhir) */
  pcsOut: number;
  wip: number;
  efficiencyPct: number;
  outProgressPct: number;
};

/** KPI line: max IN & min OUT dari batch produksi (1–5), bukan assembly */
export type LineOverviewKpi = {
  /** IN terbesar di antara batch produksi */
  prosesBatch: number;
  /** OUT terkecil di antara batch produksi */
  finishBatch: number;
  wip: number;
  efficiencyPct: number;
};

export type BatchBundleStatus = {
  bundleNo: number;
  rfid: string;
  scannedIn: boolean;
  scannedOut: boolean;
  outputPcs: number;
  targetPcs: number;
  persentase: number;
  /** Waktu scan masuk (HH:mm) */
  scanInAt: string | null;
  /** Waktu scan selesai (HH:mm) */
  scanOutAt: string | null;
  /** Durasi dari IN s/d OUT */
  durationLabel: string | null;
};

/** Ringkasan progress batch — selaras kartu (IN/OUT bundle, output pcs) */
export type BatchProgressFromMetrics = {
  bundleIn: number;
  targetOutput: number;
  actual: number;
  balance: number;
  persentase: number;
};

export const buildBatchProgressFromMetrics = (
  metrics: BatchInOutMetrics,
  pcsPerBundle: number
): BatchProgressFromMetrics => {
  const bundleIn = pcsToBundleCount(metrics.pcsIn, pcsPerBundle);
  const targetOutput = bundleIn * pcsPerBundle;
  const actual = metrics.pcsOut;
  return {
    bundleIn,
    targetOutput,
    actual,
    balance: actual - targetOutput,
    persentase: metrics.efficiencyPct,
  };
};

const formatClock = (totalMin: number): string => {
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const formatDurationLabel = (minutes: number): string => {
  if (minutes < 60) return `${minutes} menit`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} jam ${m} menit` : `${h} jam`;
};

/** Dummy waktu scan deterministik per batch + bundle (demo / snapshot) */
const bundleScanTimeline = (
  batchNo: number,
  bundleNo: number,
  scannedIn: boolean,
  scannedOut: boolean,
  outputPcs: number,
  targetPcs: number
): Pick<BatchBundleStatus, 'scanInAt' | 'scanOutAt' | 'durationLabel'> => {
  if (!scannedIn) {
    return { scanInAt: null, scanOutAt: null, durationLabel: null };
  }

  const dayStartMin = 7 * 60 + (batchNo - 1) * 12;
  const inMin = dayStartMin + (bundleNo - 1) * 38 + ((batchNo * bundleNo) % 11);
  const scanInAt = formatClock(inMin);

  if (!scannedOut) {
    return { scanInAt, scanOutAt: null, durationLabel: 'Dalam proses' };
  }

  const ratio = targetPcs > 0 ? Math.min(1, outputPcs / targetPcs) : 0.85;
  const durationMin = Math.round(28 + ratio * 52 + ((bundleNo + batchNo) % 9));
  const scanOutAt = formatClock(inMin + durationMin);

  return {
    scanInAt,
    scanOutAt,
    durationLabel: formatDurationLabel(durationMin),
  };
};

const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);

const bundleSummaryPct = (output: number, target: number) =>
  target > 0 ? Math.round((output / target) * 100) : 0;

const bundleNosAtProcess = (proc: ProcessSimState | undefined): number[] => {
  if (!proc) return [];
  const nos = new Set<number>();
  Object.keys(proc.bundleOutputs).forEach((k) => {
    const n = Number(k);
    if (n > 0) nos.add(n);
  });
  if (proc.working?.bundleNo && proc.working.bundleNo > 0) nos.add(proc.working.bundleNo);
  return [...nos];
};

const sumPcsAtProcess = (proc: ProcessSimState | undefined): number =>
  bundleNosAtProcess(proc).reduce((sum, bn) => sum + getBundlePcsAtProcess(proc, bn), 0);

/** IN snapshot: akumulasi pcs di proses pertama */
export const countPcsInFromSnapshot = (batchNo: number): number => {
  const snap = getBatchSnapshot(batchNo);
  if (!snap) return 0;

  let sum = 0;
  for (const key of Object.keys(snap.bundles)) {
    const row = snap.bundles[Number(key)];
    if (row) sum += row[0] ?? 0;
  }
  return sum;
};

/** OUT snapshot: akumulasi pcs di proses terakhir */
export const countPcsOutFromSnapshot = (batchNo: number, lastProcessIdx: number): number => {
  const snap = getBatchSnapshot(batchNo);
  if (!snap) return 0;

  let sum = 0;
  for (const key of Object.keys(snap.bundles)) {
    const row = snap.bundles[Number(key)];
    if (row) sum += row[lastProcessIdx] ?? 0;
  }
  return sum;
};

/** IN sim: total pcs scan di proses pertama */
export const countPcsInFromSim = (simLane: LineBatchSim): number =>
  sumPcsAtProcess(simLane.processes[0]);

/** OUT sim: total pcs scan di proses terakhir */
export const countPcsOutFromSim = (simLane: LineBatchSim): number => {
  const lastIdx = simLane.processes.length - 1;
  return sumPcsAtProcess(simLane.processes[lastIdx]);
};

/** @deprecated gunakan countPcsInFromSnapshot */
export const countBundleInFromSnapshot = (batchNo: number): number => {
  const snap = getBatchSnapshot(batchNo);
  if (!snap) return 0;
  let count = 0;
  for (let b = 1; b <= snap.leadBundle; b++) {
    const row = snap.bundles[b];
    if (row && row[0] > 0) count++;
  }
  return Math.max(count, snap.leadBundle > 0 ? snap.leadBundle : 0);
};

/** @deprecated gunakan countPcsOutFromSnapshot */
export const countBundleOutFromSnapshot = (batchNo: number, lastProcessIdx: number): number => {
  const snap = getBatchSnapshot(batchNo);
  if (!snap) return 0;
  let count = 0;
  for (const key of Object.keys(snap.bundles)) {
    const bn = Number(key);
    if (bn <= 0) continue;
    const row = snap.bundles[bn];
    if (row && (row[lastProcessIdx] ?? 0) > 0) count++;
  }
  return count;
};

/** @deprecated gunakan countPcsInFromSim */
export const countBundleInFromSim = (simLane: LineBatchSim): number => {
  const first = simLane.processes[0];
  if (!first) return 0;
  return bundleNosAtProcess(first).length;
};

/** @deprecated gunakan countPcsOutFromSim */
export const countBundleOutFromSim = (simLane: LineBatchSim): number => {
  const lastIdx = simLane.processes.length - 1;
  return bundleNosAtProcess(simLane.processes[lastIdx]).length;
};

export const computeBatchInOutMetrics = (
  batchNo: number,
  lane: SewingFlowBatch | undefined,
  simLane: LineBatchSim | undefined,
  useLive: boolean
): BatchInOutMetrics => {
  const lastIdx = (lane?.processes.length ?? 1) - 1;

  let pcsIn = 0;
  let pcsOut = 0;

  if (useLive && simLane && isLanePipelineActive(simLane)) {
    pcsIn = countPcsInFromSim(simLane);
    pcsOut = countPcsOutFromSim(simLane);
  } else {
    pcsIn = countPcsInFromSnapshot(batchNo);
    pcsOut = countPcsOutFromSnapshot(batchNo, lastIdx);
  }

  const wip = Math.max(0, pcsIn - pcsOut);
  const efficiencyPct = pct(pcsOut, pcsIn);
  const outProgressPct = efficiencyPct;

  return { pcsIn, pcsOut, wip, efficiencyPct, outProgressPct };
};

/** Batch Masuk Proses = max IN bundle; Batch Selesai = min OUT bundle — hanya batch 1–5 */
export const computeLineOverviewKpi = (
  batches: Array<{ batch: number; pcsIn: number; pcsOut: number }>,
  pcsPerBundle: number
): LineOverviewKpi => {
  const production = batches.filter((b) => isProductionBatch(b.batch));
  const prosesBatch =
    production.length > 0
      ? Math.max(...production.map((b) => pcsToBundleCount(b.pcsIn, pcsPerBundle)))
      : 0;
  const finishBatch =
    production.length > 0
      ? Math.min(...production.map((b) => pcsToBundleCount(b.pcsOut, pcsPerBundle)))
      : 0;
  const wip = Math.max(0, prosesBatch - finishBatch);
  const efficiencyPct = pct(finishBatch, prosesBatch);
  return { prosesBatch, finishBatch, wip, efficiencyPct };
};

export type ProductionBatchHighlight = 'inMax' | 'inMin' | 'outMax' | 'outMin';

/** Batch dengan IN/OUT terbesar & terkecil di antara batch produksi 1–5 */
export const computeProductionBatchHighlights = (
  batches: Array<{ batch: number; pcsIn: number; pcsOut: number }>,
  pcsPerBundle: number
): Map<number, ProductionBatchHighlight[]> => {
  const production = batches.filter((b) => isProductionBatch(b.batch));
  const map = new Map<number, ProductionBatchHighlight[]>();
  if (production.length === 0) return map;

  const rows = production.map((b) => ({
    batch: b.batch,
    bundleIn: pcsToBundleCount(b.pcsIn, pcsPerBundle),
    bundleOut: pcsToBundleCount(b.pcsOut, pcsPerBundle),
  }));

  const inMax = Math.max(...rows.map((r) => r.bundleIn));
  const inMin = Math.min(...rows.map((r) => r.bundleIn));
  const outMax = Math.max(...rows.map((r) => r.bundleOut));
  const outMin = Math.min(...rows.map((r) => r.bundleOut));

  const add = (batchNo: number, tag: ProductionBatchHighlight) => {
    const list = map.get(batchNo) ?? [];
    if (!list.includes(tag)) list.push(tag);
    map.set(batchNo, list);
  };

  rows.forEach((r) => {
    if (r.bundleIn === inMax) add(r.batch, 'inMax');
    if (r.bundleIn === inMin) add(r.batch, 'inMin');
    if (r.bundleOut === outMax) add(r.batch, 'outMax');
    if (r.bundleOut === outMin) add(r.batch, 'outMin');
  });

  return map;
};

/**
 * Assembly (batch 6): IN = min OUT batch produksi 1–5 (gate bottleneck).
 * Tidak boleh melebihi output terendah dari tiap batch komponen.
 */
export const applyAssemblyInConstraint = <T extends BatchInOutMetrics & { batch: number }>(
  batches: T[]
): T[] => {
  const production = batches.filter((b) => isProductionBatch(b.batch));
  const gateIn = production.length > 0 ? Math.min(...production.map((b) => b.pcsOut)) : 0;

  return batches.map((b) => {
    if (!isAssemblyBatch(b.batch)) return b;
    const pcsIn = gateIn;
    const wip = Math.max(0, pcsIn - b.pcsOut);
    const efficiencyPct = pct(b.pcsOut, pcsIn);
    return { ...b, pcsIn, wip, efficiencyPct, outProgressPct: efficiencyPct };
  });
};

export const buildBatchBundleStatusList = (
  batchNo: number,
  lane: SewingFlowBatch,
  simLane: LineBatchSim | undefined,
  useLive: boolean,
  pcsPerBundle: number
): BatchBundleStatus[] => {
  const lastIdx = lane.processes.length - 1;
  const snap = getBatchSnapshot(batchNo);
  const maxBundle = useLive && simLane && isLanePipelineActive(simLane)
    ? Math.max(
        0,
        ...bundleNosAtProcess(simLane.processes[0]),
        ...bundleNosAtProcess(simLane.processes[lastIdx])
      )
    : snap?.leadBundle ?? 0;

  if (maxBundle <= 0) return [];

  const rows: BatchBundleStatus[] = [];

  for (let bundleNo = 1; bundleNo <= maxBundle; bundleNo++) {
    let scannedIn = false;
    let scannedOut = false;
    let outputPcs = 0;

    if (useLive && simLane && isLanePipelineActive(simLane)) {
      const first = simLane.processes[0];
      const last = simLane.processes[lastIdx];
      const inVal = first?.bundleOutputs[bundleNo] ?? (first?.working?.bundleNo === bundleNo ? first.working.progress : 0);
      scannedIn = inVal > 0 || first?.working?.bundleNo === bundleNo;
      outputPcs = last?.bundleOutputs[bundleNo] ?? (last?.working?.bundleNo === bundleNo ? last.working.progress : 0);
      scannedOut = outputPcs > 0;
    } else if (snap?.bundles[bundleNo]) {
      const row = snap.bundles[bundleNo];
      scannedIn = (row[0] ?? 0) > 0;
      outputPcs = row[lastIdx] ?? 0;
      scannedOut = outputPcs > 0;
    } else {
      outputPcs = getLastProcessOutput(batchNo, bundleNo);
      scannedOut = outputPcs > 0;
      scannedIn = bundleNo <= (snap?.leadBundle ?? 0);
    }

    const targetPcs = getBundleTargetPcs(bundleNo, pcsPerBundle);
    const timeline = bundleScanTimeline(
      batchNo,
      bundleNo,
      scannedIn,
      scannedOut,
      outputPcs,
      targetPcs
    );
    rows.push({
      bundleNo,
      rfid: formatBundleRfid12(batchNo, bundleNo),
      scannedIn,
      scannedOut,
      outputPcs,
      targetPcs,
      persentase: bundleSummaryPct(outputPcs, targetPcs),
      ...timeline,
    });
  }

  return rows;
};

export type HourlyTrendPoint = {
  hour: string;
  in: number;
  out: number;
};

/** Bangun trend per jam dari total IN/OUT (dummy + live offset) */
export const buildHourlyTrendFromTotals = (
  baseTrend: HourlyTrendPoint[],
  totalIn: number,
  totalOut: number
): HourlyTrendPoint[] => {
  if (baseTrend.length === 0) return [];

  const baseIn = baseTrend[baseTrend.length - 1]?.in ?? 1;
  const baseOut = baseTrend[baseTrend.length - 1]?.out ?? 1;
  const inScale = baseIn > 0 ? totalIn / baseIn : 1;
  const outScale = baseOut > 0 ? totalOut / baseOut : 1;

  return baseTrend.map((pt, idx) => {
    const isLast = idx === baseTrend.length - 1;
    return {
      hour: pt.hour,
      in: isLast ? totalIn : Math.round(pt.in * inScale),
      out: isLast ? totalOut : Math.round(pt.out * outScale),
    };
  });
};

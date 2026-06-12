import type { SewingFlowBatch } from '../types/sewingDashboard';
import {
  getBatchOutputProgressFromSnapshot,
  getBatchSnapshot,
  getBundleIntakePcs,
  getBundleNos,
  getBundleTargetPcs,
  getLastProcessOutput,
  getLastProcessOutputSum,
  getSimOrderTargetPcs,
  PCS_PER_BUNDLE_DEMO,
  type BundleProcessOutputs,
} from '../data/sewing/sewingDummyConfig';
import { DEMO_CHAIN_BY_BATCH } from './sewingFlowDummyNormalize';
import {
  getLaneHeaderOutput,
  getLaneLeadBundle,
  isLanePipelineActive,
  maxBundleNoForProcess,
  type LineBatchSim,
} from './sewingBatchSimulation';

/** Idle = snapshot; saat simulasi jalan = lead bundle dari state sim */
export const resolveCurrentBundle = (
  batchNo: number,
  meta?: { currentBundle?: number },
  simLane?: LineBatchSim,
  useLive?: boolean
): number => {
  const snapLead = getBatchSnapshot(batchNo)?.leadBundle;
  const staticLead = snapLead ?? meta?.currentBundle ?? 1;
  if (!useLive || !simLane) return staticLead;
  if (isLanePipelineActive(simLane)) return getLaneLeadBundle(simLane);
  return staticLead;
};

export type BundleProcessStep = {
  processNo: number;
  processName: string;
  target: number;
  actual: number;
  reject: number;
  persentase: number;
};

export type BatchBundleRow = {
  bundleNo: number;
  output: number;
  reject: number;
  /** Target kapasitas bundle (biasanya 15 pcs) */
  target: number;
  persentase: number;
  processes: BundleProcessStep[];
};

const bundleSummaryPct = (output: number, target: number) =>
  target > 0 ? Math.round((output / target) * 100) : 0;

/** Target order penuh = jumlah bundle order × pcs/bundle; actual = output proses terakhir */
export const computeBatchOrderProgressPct = (
  actualOutput: number,
  orderBundleCount: number,
  pcsPerBundle: number
): number => {
  const targetOutput = getSimOrderTargetPcs(orderBundleCount, pcsPerBundle);
  if (targetOutput <= 0) return 0;
  return Math.min(100, Math.round((actualOutput / targetOutput) * 100));
};

export const parseOrderBundleCount = (demoQty: string | undefined): number => {
  if (!demoQty) return 0;
  const m = demoQty.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
};

const intakeQtyForBundle = (
  simLane: LineBatchSim,
  bundleNo: number,
  pcsPerBundle: number
): number => {
  const first = simLane.processes[0];
  if (first.bundleOutputs[bundleNo] !== undefined) {
    return first.bundleOutputs[bundleNo];
  }
  if (first.working?.bundleNo === bundleNo) {
    return first.working.inputQty;
  }
  return getBundleIntakePcs(simLane.batchNo, bundleNo, pcsPerBundle);
};

/** Detail P1–P5 dari snapshot dummy (selalu terisi jika batch ada di config) */
export const buildBundleProcessStepsFromSnapshot = (
  batchNo: number,
  bundleNo: number,
  lane: SewingFlowBatch,
  pcsPerBundle: number
): BundleProcessStep[] | null => {
  const row = getBatchSnapshot(batchNo)?.bundles[bundleNo] as BundleProcessOutputs | undefined;
  if (!row) return null;

  const procCount = lane.processes.length;
  return Array.from({ length: procCount }, (_, processIdx) => {
    const proc = lane.processes[processIdx];
    const target =
      processIdx === 0
        ? getBundleIntakePcs(batchNo, bundleNo, pcsPerBundle)
        : row[processIdx - 1] ?? 0;
    const actual = row[processIdx] ?? 0;
    return {
      processNo: processIdx + 1,
      processName: proc?.processName ?? `Proses ${processIdx + 1}`,
      target,
      actual,
      reject: Math.max(0, target - actual),
      persentase: bundleSummaryPct(actual, target),
    };
  });
};

const simHasProcessBundleData = (simLane: LineBatchSim, processIdx: number, bundleNo: number): boolean => {
  const proc = simLane.processes[processIdx];
  return (
    proc.bundleOutputs[bundleNo] !== undefined ||
    proc.working?.bundleNo === bundleNo
  );
};

export const buildBundleProcessSteps = (
  batchNo: number,
  bundleNo: number,
  lane: SewingFlowBatch,
  pcsPerBundle: number,
  simLane?: LineBatchSim,
  useLiveSim?: boolean
): BundleProcessStep[] => {
  const fromSnap = buildBundleProcessStepsFromSnapshot(batchNo, bundleNo, lane, pcsPerBundle);
  if (fromSnap) {
    if (!useLiveSim || !simLane) return fromSnap;
    return fromSnap.map((step, processIdx) => {
      if (!simHasProcessBundleData(simLane, processIdx, bundleNo)) return step;
      const target = targetForProcessBundle(
        batchNo,
        processIdx,
        bundleNo,
        pcsPerBundle,
        simLane
      );
      const actual = actualForProcessBundleSim(simLane, processIdx, bundleNo);
      return {
        ...step,
        target,
        actual,
        reject: Math.max(0, target - actual),
        persentase: bundleSummaryPct(actual, target),
      };
    });
  }

  return Array.from({ length: lane.processes.length }, (_, processIdx) => {
    const proc = lane.processes[processIdx];
    const target = targetForProcessBundle(
      batchNo,
      processIdx,
      bundleNo,
      pcsPerBundle,
      useLiveSim ? simLane : undefined
    );
    const actual =
      useLiveSim && simLane
        ? actualForProcessBundleSim(simLane, processIdx, bundleNo)
        : actualForProcessBundleStatic(batchNo, processIdx, bundleNo);
    return {
      processNo: processIdx + 1,
      processName: proc?.processName ?? `Proses ${processIdx + 1}`,
      target,
      actual,
      reject: Math.max(0, target - actual),
      persentase: bundleSummaryPct(actual, target),
    };
  });
};

const toBundleRow = (
  batchNo: number,
  bundleNo: number,
  output: number,
  reject: number,
  lane: SewingFlowBatch,
  pcsPerBundle: number,
  simLane?: LineBatchSim,
  useLiveSim?: boolean
): BatchBundleRow => {
  const target = getBundleTargetPcs(bundleNo, pcsPerBundle);
  return {
    bundleNo,
    output,
    reject,
    target,
    persentase: bundleSummaryPct(output, target),
    // Dropdown proses: ikuti sim jika live, else snapshot
    processes: buildBundleProcessSteps(batchNo, bundleNo, lane, pcsPerBundle, simLane, useLiveSim),
  };
};

export const buildBundleRowsFromSim = (
  simLane: LineBatchSim | undefined,
  pcsPerBundle: number,
  batchNo: number,
  lane: SewingFlowBatch
): BatchBundleRow[] => {
  if (!simLane) return [];

  const lastIdx = lane.processes.length - 1;
  const last = simLane.processes[lastIdx];
  const bundleNos = new Set<number>();

  Object.keys(last.bundleOutputs).forEach((k) => bundleNos.add(Number(k)));
  if (last.working) bundleNos.add(last.working.bundleNo);

  const sorted = [...bundleNos].filter((n) => n > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return [];

  return sorted.map((bundleNo) => {
    let output = last.bundleOutputs[bundleNo];
    if (output === undefined && last.working?.bundleNo === bundleNo) {
      output = last.working.progress;
    }
    output = output ?? 0;
    const intake = intakeQtyForBundle(simLane, bundleNo, pcsPerBundle);
    return toBundleRow(
      batchNo,
      bundleNo,
      output,
      Math.max(0, intake - output),
      lane,
      pcsPerBundle,
      simLane,
      true
    );
  });
};

export const buildBundleRowsForBatch = (
  batchNo: number,
  lane: SewingFlowBatch,
  pcsPerBundle: number,
  simLane?: LineBatchSim,
  useLiveSim?: boolean
): BatchBundleRow[] => {
  if (useLiveSim && simLane && isLanePipelineActive(simLane)) {
    const fromSim = buildBundleRowsFromSim(simLane, pcsPerBundle, batchNo, lane);
    if (fromSim.length > 0) return fromSim;

    const last = simLane.processes[simLane.processes.length - 1];
    const bundleNos = new Set<number>();
    Object.keys(last.bundleOutputs).forEach((k) => bundleNos.add(Number(k)));
    if (last.working) bundleNos.add(last.working.bundleNo);
    const sorted = [...bundleNos].filter((n) => n > 0).sort((a, b) => a - b);
    if (sorted.length > 0) {
      return sorted.map((bundleNo) => {
        let output = last.bundleOutputs[bundleNo];
        if (output === undefined && last.working?.bundleNo === bundleNo) {
          output = last.working.progress;
        }
        output = output ?? 0;
        const intake = intakeQtyForBundle(simLane, bundleNo, pcsPerBundle);
        return toBundleRow(
          batchNo,
          bundleNo,
          output,
          Math.max(0, intake - output),
          lane,
          pcsPerBundle,
          simLane,
          true
        );
      });
    }
    return [];
  }

  const snap = getBatchSnapshot(batchNo);
  if (snap) {
    return getBundleNos(batchNo).map((bundleNo) => {
      const output = getLastProcessOutput(batchNo, bundleNo);
      const cap = getBundleTargetPcs(bundleNo, pcsPerBundle);
      const reject = Math.max(0, cap - output);
      return toBundleRow(batchNo, bundleNo, output, reject, lane, pcsPerBundle);
    });
  }

  return [];
};

export type BatchOutputProgressSummary = {
  totalBundle: number;
  targetOutput: number;
  actual: number;
  balance: number;
  persentase: number;
};

/** Bundle yang sudah sampai proses terakhir (selesai + yang sedang dikerjakan) */
export const getBundlesAtLastProcessFromSim = (simLane: LineBatchSim): number[] => {
  const lastIdx = simLane.processes.length - 1;
  const last = simLane.processes[lastIdx];
  const bundleNos = new Set<number>();
  Object.keys(last.bundleOutputs).forEach((k) => {
    const n = Number(k);
    if (n > 0) bundleNos.add(n);
  });
  if (last.working && last.working.bundleNo > 0) {
    bundleNos.add(last.working.bundleNo);
  }
  return [...bundleNos].sort((a, b) => a - b);
};

/** Ringkasan progress dari state sim — target = totalBundle di P5 × 15, actual = output P5 */
export const buildBatchOutputProgressSummaryFromSim = (
  simLane: LineBatchSim,
  pcsPerBundle: number
): BatchOutputProgressSummary => {
  const bundleNos = getBundlesAtLastProcessFromSim(simLane);
  const totalBundle = bundleNos.length;
  const targetOutput = bundleNos.reduce(
    (sum, bn) => sum + getBundleTargetPcs(bn, pcsPerBundle),
    0
  );
  const actual = getLaneHeaderOutput(simLane);
  const balance = actual - targetOutput;
  const persentase = targetOutput > 0 ? Math.round((actual / targetOutput) * 100) : 0;
  return { totalBundle, targetOutput, actual, balance, persentase };
};

export const buildBatchOutputProgressSummary = (
  batchNo: number,
  pcsPerBundle: number,
  simLane?: LineBatchSim,
  useLiveSim?: boolean
): BatchOutputProgressSummary => {
  if (useLiveSim && simLane && isLanePipelineActive(simLane)) {
    return buildBatchOutputProgressSummaryFromSim(simLane, pcsPerBundle);
  }

  return getBatchOutputProgressFromSnapshot(batchNo, pcsPerBundle);
};

export const totalOutputPcs = (
  batchNo: number,
  batch: { doneCount?: number; activePcs?: number },
  pcsPerBundle = PCS_PER_BUNDLE_DEMO,
  simLane?: LineBatchSim,
  useLiveSim?: boolean
): number => {
  if (useLiveSim && simLane && isLanePipelineActive(simLane)) {
    return getLaneHeaderOutput(simLane);
  }
  const progress = getBatchOutputProgressFromSnapshot(batchNo, pcsPerBundle);
  return progress.actual || (batch.activePcs ?? batch.doneCount ?? 0);
};

export type ProcessBundleTableRow = {
  bundleNo: number;
  target: number;
  actual: number;
  selisih: number;
  persentase: number;
};

function targetForProcessBundle(
  batchNo: number,
  processIdx: number,
  bundleNo: number,
  pcsPerBundle: number,
  simLane?: LineBatchSim
): number {
  if (simLane) {
    if (processIdx === 0) return intakeQtyForBundle(simLane, bundleNo, pcsPerBundle);
    const prev = simLane.processes[processIdx - 1];
    if (prev.bundleOutputs[bundleNo] !== undefined) return prev.bundleOutputs[bundleNo];
    if (prev.working?.bundleNo === bundleNo) return prev.working.inputQty;
  }

  const snap = getBatchSnapshot(batchNo);
  const row = snap?.bundles[bundleNo] as BundleProcessOutputs | undefined;
  if (row) {
    if (processIdx === 0) return getBundleIntakePcs(batchNo, bundleNo, pcsPerBundle);
    return row[processIdx - 1] ?? pcsPerBundle;
  }

  const chain = DEMO_CHAIN_BY_BATCH[batchNo];
  return processIdx === 0
    ? getBundleTargetPcs(bundleNo, pcsPerBundle)
    : chain?.[processIdx - 1] ?? pcsPerBundle;
}

function actualForProcessBundleStatic(
  batchNo: number,
  processIdx: number,
  bundleNo: number
): number {
  const snap = getBatchSnapshot(batchNo);
  const row = snap?.bundles[bundleNo] as BundleProcessOutputs | undefined;
  if (row) return row[processIdx] ?? 0;
  return 0;
}

function actualForProcessBundleSim(
  simLane: LineBatchSim,
  processIdx: number,
  bundleNo: number
): number {
  const proc = simLane.processes[processIdx];
  if (proc.bundleOutputs[bundleNo] !== undefined) return proc.bundleOutputs[bundleNo];
  if (proc.working?.bundleNo === bundleNo) return proc.working.progress;
  return 0;
}

const toTableRow = (bundleNo: number, target: number, actual: number): ProcessBundleTableRow => {
  const selisih = actual - target;
  const persentase = target > 0 ? Math.round((actual / target) * 100) : 0;
  return { bundleNo, target, actual, selisih, persentase };
};

export const buildProcessBundleTableRows = (
  batchNo: number,
  processIndex: number,
  leadBundle: number,
  pcsPerBundle: number,
  simLane?: LineBatchSim,
  useLiveSim?: boolean
): ProcessBundleTableRow[] => {
  const maxBundle = maxBundleNoForProcess(leadBundle, processIndex, batchNo);
  if (maxBundle <= 0) return [];

  const bundleNos = Array.from({ length: maxBundle }, (_, i) => i + 1);

  if (useLiveSim && simLane) {
    return bundleNos.map((bundleNo) => {
      const target = targetForProcessBundle(batchNo, processIndex, bundleNo, pcsPerBundle, simLane);
      const actual = actualForProcessBundleSim(simLane, processIndex, bundleNo);
      return toTableRow(bundleNo, target, actual);
    });
  }

  return bundleNos.map((bundleNo) => {
    const target = targetForProcessBundle(batchNo, processIndex, bundleNo, pcsPerBundle);
    const actual = actualForProcessBundleStatic(batchNo, processIndex, bundleNo);
    return toTableRow(bundleNo, target, actual);
  });
};

export const resolveLeadBundle = (
  batchNo: number,
  leadBundle: number,
  simLane?: LineBatchSim,
  useLive?: boolean
): number => resolveCurrentBundle(batchNo, { currentBundle: leadBundle }, simLane, useLive);

/** Total output proses = jumlah actual bundle yang tampil di tabel (pipeline) */
export const processTotalOutputPcs = (
  batchNo: number,
  processIndex: number,
  leadBundle: number,
  pcsPerBundle: number,
  simLane?: LineBatchSim,
  useLiveSim?: boolean
): number => {
  const rows = buildProcessBundleTableRows(
    batchNo,
    processIndex,
    leadBundle,
    pcsPerBundle,
    simLane,
    useLiveSim
  );
  return rows.reduce((sum, row) => sum + row.actual, 0);
};

export const processTargetOutputPcs = (
  batchNo: number,
  processIndex: number,
  leadBundle: number,
  pcsPerBundle: number,
  simLane?: LineBatchSim,
  useLiveSim?: boolean
): number => {
  const lead = resolveLeadBundle(batchNo, leadBundle, simLane, useLiveSim);
  const rows = buildProcessBundleTableRows(
    batchNo,
    processIndex,
    lead,
    pcsPerBundle,
    simLane,
    useLiveSim
  );
  const activeBundle = maxBundleNoForProcess(lead, processIndex, batchNo) || 1;
  const row = rows.find((r) => r.bundleNo === activeBundle) ?? rows[rows.length - 1];
  return row?.target ?? getBundleTargetPcs(activeBundle, pcsPerBundle);
};

/** Metadata batch card dari snapshot dummy */
export const buildStaticBatchMeta = (
  batchNo: number,
  meta: {
    batch: number;
    type: string;
    processCount: number;
    currentBundle?: number;
    [key: string]: unknown;
  },
  pcsPerBundle = PCS_PER_BUNDLE_DEMO,
  orderBundleCount = 0
) => {
  const progress = getBatchOutputProgressFromSnapshot(batchNo, pcsPerBundle);
  const actual = progress.actual;
  const orderCount =
    orderBundleCount > 0 ? orderBundleCount : getBatchSnapshot(batchNo)?.orderBundles ?? 0;
  const snap = getBatchSnapshot(batchNo);
  return {
    ...meta,
    currentBundle: snap?.leadBundle ?? resolveCurrentBundle(batchNo, meta, undefined, false),
    doneCount: actual,
    activePcs: actual,
    progressPct: computeBatchOrderProgressPct(actual, orderCount, pcsPerBundle),
  };
};

export { getLastProcessOutputSum };

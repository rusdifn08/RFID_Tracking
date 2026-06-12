/** Simulasi alur bundle batch 1–6 untuk dashboard sewing (AMV time-based per pcs) */

import {
  buildAmvProfilesFromLanes,
  jitterMsPerPcs,
  SIM_SPEED_FACTOR,
  SIM_TICK_MS,
  type ProcessAmvProfile,
} from '../data/sewing/sewingProcessAmvConfig';
import {
  getBatchSnapshot,
  getBundleTargetPcs,
  SIM_ORDER_BUNDLE_COUNT,
  type BundleProcessOutputs,
} from '../data/sewing/sewingDummyConfig';

export const SIM_PROCESSES_PER_BATCH = 5;
export const SIM_ASSEMBLY_BATCH_6_SOURCES = [2, 3, 4] as const;

let laneProcessCounts: Record<number, number> = {};

export const setLaneProcessCounts = (counts: Record<number, number>): void => {
  laneProcessCounts = counts;
};

export const getLaneProcessCount = (batchNo: number): number =>
  laneProcessCounts[batchNo] ?? SIM_PROCESSES_PER_BATCH;

export type QueuedBundle = { bundleNo: number; qty: number };

export type PcsWorkLog = {
  bundleNo: number;
  pcsNo: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  amvMinutes: number;
};

export type WorkingBundle = {
  bundleNo: number;
  inputQty: number;
  progress: number;
  pcsElapsedMs: number;
  currentPcsStartedAt: number | null;
};

export type ProcessSimState = {
  queue: QueuedBundle[];
  working: WorkingBundle | null;
  bundleOutputs: Record<number, number>;
  totalOutput: number;
  amvTotalMs: number;
  amvUnitCount: number;
  sessionStartedAt: string | null;
  lastFinishedAt: string | null;
  recentPcsLogs: PcsWorkLog[];
};

let amvProfileMap = new Map<string, ProcessAmvProfile>();

export const initAmvProfiles = (
  lanes: { batch: number; processes: { processId: string; target: number; category: string; machineId?: string; manPower?: number }[] }[]
) => {
  amvProfileMap = buildAmvProfilesFromLanes(lanes);
};

const getAmvProfile = (batchNo: number, processIdx: number): ProcessAmvProfile | undefined =>
  amvProfileMap.get(`${batchNo}-${processIdx}`);

export type LineBatchSim = {
  batchNo: number;
  processes: ProcessSimState[];
  /** Batch 1–5: bundle berikutnya dari intake / cutting */
  incomingBundleNo: number;
};

export type SimulationState = {
  batches: LineBatchSim[];
  /** Menunggu output akhir dari semua source sebelum feed assembly */
  assemblyGate: Record<6, Record<number, Partial<Record<number, number>>>>;
};

const emptyProcess = (): ProcessSimState => ({
  queue: [],
  working: null,
  bundleOutputs: {},
  totalOutput: 0,
  amvTotalMs: 0,
  amvUnitCount: 0,
  sessionStartedAt: null,
  lastFinishedAt: null,
  recentPcsLogs: [],
});

const beginWorkingBundle = (
  proc: ProcessSimState,
  bundleNo: number,
  inputQty: number
): void => {
  const now = Date.now();
  if (!proc.sessionStartedAt) {
    proc.sessionStartedAt = new Date(now).toISOString();
  }
  proc.working = {
    bundleNo,
    inputQty,
    progress: 0,
    pcsElapsedMs: 0,
    currentPcsStartedAt: now,
  };
};

const toIso = (ms: number): string => {
  const t = Number(ms);
  const d = new Date(t);
  return Number.isFinite(t) && !Number.isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
};

const pushPcsLog = (
  proc: ProcessSimState,
  w: WorkingBundle,
  productionMs: number,
  finishedAtMs: number
) => {
  const wallMs = Math.max(1, Math.round(productionMs / SIM_SPEED_FACTOR));
  const startedAtMs = w.currentPcsStartedAt ?? finishedAtMs - wallMs;
  const amvMinutes = Number((productionMs / 60000).toFixed(2));
  const log: PcsWorkLog = {
    bundleNo: w.bundleNo,
    pcsNo: w.progress + 1,
    startedAt: toIso(startedAtMs),
    finishedAt: toIso(finishedAtMs),
    durationMs: productionMs,
    amvMinutes,
  };
  proc.amvTotalMs += productionMs;
  proc.amvUnitCount += 1;
  proc.lastFinishedAt = log.finishedAt;
  proc.recentPcsLogs = [...proc.recentPcsLogs, log].slice(-40);
};

const advanceAmvOnProcess = (
  batch: LineBatchSim,
  processIdx: number,
  tickMs: number
): void => {
  const proc = batch.processes[processIdx];
  const w = proc.working;
  if (!w) return;

  const profile = getAmvProfile(batch.batchNo, processIdx);
  const baseMs = profile?.msPerPcs ?? 12000;
  const manPower = Math.max(1, profile?.manPower ?? 1);
  w.pcsElapsedMs += tickMs;

  while (w.progress < w.inputQty) {
    const productionMs = jitterMsPerPcs(
      Math.round(baseMs / manPower),
      batch.batchNo,
      processIdx,
      w.bundleNo,
      w.progress + 1
    );
    const wallMs = Math.max(200, Math.round(productionMs / SIM_SPEED_FACTOR));
    if (w.pcsElapsedMs < wallMs) break;

    w.pcsElapsedMs -= wallMs;
    const finishedAt = Date.now();
    pushPcsLog(proc, w, productionMs, finishedAt);
    w.progress += 1;
    w.currentPcsStartedAt = finishedAt;
  }
};

export const createInitialSimulationState = (
  counts?: Record<number, number>
): SimulationState => {
  if (counts) setLaneProcessCounts(counts);
  const batchNos = counts
    ? [...new Set(Object.keys(counts).map(Number))].sort((a, b) => a - b)
    : [1, 2, 3, 4, 5, 6];
  return {
    batches: batchNos.map((batchNo) => ({
      batchNo,
      processes: Array.from({ length: getLaneProcessCount(batchNo) }, emptyProcess),
      incomingBundleNo: 1,
    })),
    assemblyGate: { 6: {} },
  };
};

/** Reject mengikuti data dummy jika bundle ada di snapshot; selain itu pseudo */
const getRejectCount = (
  batchNo: number,
  processIdx: number,
  bundleNo: number,
  inputQty: number
): number => {
  const snap = getBatchSnapshot(batchNo);
  const row = snap?.bundles[bundleNo] as BundleProcessOutputs | undefined;
  if (row && row[processIdx] !== undefined) {
    return Math.max(0, inputQty - row[processIdx]);
  }
  if (bundleNo > 5) return 0;
  const seed = batchNo * 17 + processIdx * 3 + bundleNo;
  return seed % 5 === 0 ? 1 : 0;
};

const getBatch = (state: SimulationState, batchNo: number) =>
  state.batches.find((b) => b.batchNo === batchNo)!;

/** Pcs terkumpul per nomor bundle di satu proses (selesai + progress aktif). */
export const getBundlePcsAtProcess = (
  proc: ProcessSimState | undefined,
  bundleNo: number
): number => {
  if (!proc || bundleNo <= 0) return 0;
  const stored = proc.bundleOutputs[bundleNo] ?? 0;
  if (proc.working?.bundleNo === bundleNo) return stored + proc.working.progress;
  return stored;
};

const isBundleCompleteAtProcess = (
  proc: ProcessSimState | undefined,
  bundleNo: number,
  pcsPerBundle: number
): boolean =>
  getBundlePcsAtProcess(proc, bundleNo) >= getBundleTargetPcs(bundleNo, pcsPerBundle);

/** Bundle aktif untuk +1 pcs manual — hormati urutan bundle & proses sebelumnya. */
const resolveActiveBumpBundle = (
  batch: LineBatchSim,
  processIdx: number,
  pcsPerBundle: number
): number | null => {
  const proc = batch.processes[processIdx];
  if (!proc) return null;

  for (let bundleNo = 1; bundleNo <= SIM_ORDER_BUNDLE_COUNT; bundleNo += 1) {
    const target = getBundleTargetPcs(bundleNo, pcsPerBundle);
    if (getBundlePcsAtProcess(proc, bundleNo) >= target) continue;

    for (let b = 1; b < bundleNo; b += 1) {
      if (!isBundleCompleteAtProcess(proc, b, pcsPerBundle)) return null;
    }

    if (processIdx > 0) {
      const prev = batch.processes[processIdx - 1];
      if (!isBundleCompleteAtProcess(prev, bundleNo, pcsPerBundle)) return null;
    }

    return bundleNo;
  }
  return null;
};

const feedNextProcessAfterBundleComplete = (
  state: SimulationState,
  batch: LineBatchSim,
  processIdx: number,
  bundleNo: number,
  outputQty: number
): void => {
  const lastIdx = getLaneProcessCount(batch.batchNo) - 1;
  if (processIdx < lastIdx) {
    const nextProc = batch.processes[processIdx + 1];
    const alreadyQueued = nextProc?.queue.some((q) => q.bundleNo === bundleNo);
    const alreadyWorking = nextProc?.working?.bundleNo === bundleNo;
    if (nextProc && !alreadyQueued && !alreadyWorking) {
      nextProc.queue.push({ bundleNo, qty: outputQty });
    }
    return;
  }
  onLaneLastProcessComplete(state, batch.batchNo, bundleNo, outputQty);
};

const markAssemblySource = (
  state: SimulationState,
  sourceBatch: number,
  bundleNo: number,
  outputQty: number
) => {
  const gate = state.assemblyGate[6];
  if (!gate[bundleNo]) gate[bundleNo] = {};
  gate[bundleNo][sourceBatch] = outputQty;

  const sources = SIM_ASSEMBLY_BATCH_6_SOURCES;
  const row = gate[bundleNo];
  if (!sources.every((s) => row[s] !== undefined)) return;

  const minQty = Math.min(...sources.map((s) => row[s]!));
  const lane = getBatch(state, 6);
  const alreadyQueued = lane.processes[0].queue.some((q) => q.bundleNo === bundleNo);
  const alreadyWorking = lane.processes[0].working?.bundleNo === bundleNo;
  if (!alreadyQueued && !alreadyWorking) {
    lane.processes[0].queue.push({ bundleNo, qty: minQty });
  }
};

const onLaneLastProcessComplete = (
  state: SimulationState,
  batchNo: number,
  bundleNo: number,
  outputQty: number
) => {
  if ((SIM_ASSEMBLY_BATCH_6_SOURCES as readonly number[]).includes(batchNo)) {
    markAssemblySource(state, batchNo, bundleNo, outputQty);
  }
};

const finishWorking = (state: SimulationState, batch: LineBatchSim, processIdx: number) => {
  const proc = batch.processes[processIdx];
  if (!proc) return;
  const w = proc.working;
  if (!w) return;

  const reject = getRejectCount(batch.batchNo, processIdx, w.bundleNo, w.inputQty);
  const outputQty = Math.max(0, w.inputQty - reject);
  const alreadyCounted = proc.bundleOutputs[w.bundleNo] ?? 0;
  proc.bundleOutputs[w.bundleNo] = outputQty;
  proc.totalOutput += Math.max(0, outputQty - alreadyCounted);
  proc.working = null;

  const lastIdx = getLaneProcessCount(batch.batchNo) - 1;
  const nextProc = batch.processes[processIdx + 1];
  if (processIdx < lastIdx && nextProc) {
    nextProc.queue.push({ bundleNo: w.bundleNo, qty: outputQty });
  } else {
    onLaneLastProcessComplete(state, batch.batchNo, w.bundleNo, outputQty);
  }
};

const resumeWorkingBundle = (
  proc: ProcessSimState,
  bundleNo: number,
  targetQty: number
): boolean => {
  const partial = proc.bundleOutputs[bundleNo] ?? 0;
  if (partial >= targetQty) return false;
  beginWorkingBundle(proc, bundleNo, targetQty);
  if (proc.working && partial > 0) {
    proc.working.progress = partial;
    delete proc.bundleOutputs[bundleNo];
  }
  return true;
};

const startFromQueue = (batch: LineBatchSim, processIdx: number, pcsPerBundle: number): boolean => {
  const proc = batch.processes[processIdx];
  if (!proc || proc.working || proc.queue.length === 0) return false;
  const next = proc.queue.shift()!;
  const targetQty = getBundleTargetPcs(next.bundleNo, pcsPerBundle);
  return resumeWorkingBundle(proc, next.bundleNo, targetQty);
};

const startIntakeBundle = (batch: LineBatchSim, pcsPerBundle: number): boolean => {
  if (batch.batchNo > 5) return false;
  const proc = batch.processes[0];
  if (!proc || proc.working || proc.queue.length > 0) return false;

  let bundleNo = batch.incomingBundleNo;
  while (bundleNo <= SIM_ORDER_BUNDLE_COUNT) {
    const targetQty = getBundleTargetPcs(bundleNo, pcsPerBundle);
    const partial = proc.bundleOutputs[bundleNo] ?? 0;
    if (partial < targetQty) {
      batch.incomingBundleNo = bundleNo + 1;
      return resumeWorkingBundle(proc, bundleNo, targetQty);
    }
    bundleNo += 1;
  }
  return false;
};

const tryActivateProcess = (batch: LineBatchSim, processIdx: number, pcsPerBundle: number) => {
  if (startFromQueue(batch, processIdx, pcsPerBundle)) return;
  if (processIdx === 0 && batch.batchNo <= 5) {
    startIntakeBundle(batch, pcsPerBundle);
  }
};

const cloneState = (state: SimulationState): SimulationState => ({
  batches: state.batches.map((b) => ({
    ...b,
    processes: b.processes.map((p) => ({
      ...p,
      queue: [...p.queue],
      working: p.working ? { ...p.working } : null,
      bundleOutputs: { ...p.bundleOutputs },
      totalOutput: p.totalOutput,
      amvTotalMs: p.amvTotalMs,
      amvUnitCount: p.amvUnitCount,
      sessionStartedAt: p.sessionStartedAt,
      lastFinishedAt: p.lastFinishedAt,
      recentPcsLogs: [...p.recentPcsLogs],
    })),
  })),
  assemblyGate: {
    6: Object.fromEntries(
      Object.entries(state.assemblyGate[6]).map(([k, v]) => [k, { ...v }])
    ),
  },
});

/** Saat pause: simpan progress bundle aktif supaya edit manual (A/B/…) bisa lanjut. */
export const commitWorkingForManualEdit = (state: SimulationState): SimulationState => {
  const next = cloneState(state);
  for (const batch of next.batches) {
    const procCount = Math.min(getLaneProcessCount(batch.batchNo), batch.processes.length);
    for (let pIdx = 0; pIdx < procCount; pIdx += 1) {
      const proc = batch.processes[pIdx];
      const w = proc?.working;
      if (!proc || !w) continue;
      const stored = proc.bundleOutputs[w.bundleNo] ?? 0;
      proc.bundleOutputs[w.bundleNo] = stored + w.progress;
      proc.working = null;
    }
  }
  return next;
};

/** Mulai intake bundle 1 di batch 1–5 saat Play */
export const kickstartProduction = (state: SimulationState, pcsPerBundle: number): SimulationState => {
  const next = cloneState(state);
  for (let batchNo = 1; batchNo <= 5; batchNo++) {
    tryActivateProcess(getBatch(next, batchNo), 0, pcsPerBundle);
  }
  return next;
};

/** Satu tick: akumulasi waktu AMV per pcs, lalu aktivasi antrian */
export const simulationTick = (
  state: SimulationState,
  pcsPerBundle: number,
  tickMs = SIM_TICK_MS
): SimulationState => {
  const next = cloneState(state);

  for (const batch of next.batches) {
    const procCount = Math.min(getLaneProcessCount(batch.batchNo), batch.processes.length);
    for (let pIdx = 0; pIdx < procCount; pIdx++) {
      const proc = batch.processes[pIdx];
      if (!proc?.working) continue;
      advanceAmvOnProcess(batch, pIdx, tickMs);
      if (proc.working && proc.working.progress >= proc.working.inputQty) {
        finishWorking(next, batch, pIdx);
      }
    }
  }

  // Aktivasi berurutan proses 0→N agar antrian bundle dari proses sebelumnya terisi dulu
  for (const batch of next.batches) {
    const procCount = Math.min(getLaneProcessCount(batch.batchNo), batch.processes.length);
    for (let pIdx = 0; pIdx < procCount; pIdx++) {
      const proc = batch.processes[pIdx];
      if (!proc || proc.working) continue;
      tryActivateProcess(batch, pIdx, pcsPerBundle);
    }
  }

  return next;
};

/** Grup proses satu operator — manual A/B mem-bump seluruh grup. */
const MANUAL_SYNC_GROUPS: Record<number, number[][]> = {
  1: [[0, 1, 2]],
  2: [
    [0, 1, 2],
    [3, 4, 5],
  ],
};

/** Grup sinkron untuk tombol manual (A→proses 1–3, B→iron 4–6 di batch 2). */
export const resolveManualBumpGroup = (
  batchNo: number,
  processIdx: number
): number[] | null => {
  const groups = MANUAL_SYNC_GROUPS[batchNo];
  if (!groups) return null;
  for (const group of groups) {
    if (group.includes(processIdx)) return group;
  }
  return null;
};

/** @deprecated gunakan resolveManualBumpGroup */
export const getSynchronizedProcessCount = (batchNo: number): number => {
  const groups = MANUAL_SYNC_GROUPS[batchNo];
  return groups ? Math.max(...groups.flat()) + 1 : 0;
};

export const isSynchronizedProcess = (batchNo: number, processIdx: number): boolean => {
  if (batchNo === 1) return processIdx < getLaneProcessCount(1);
  if (batchNo === 2) return processIdx <= 5;
  return false;
};

/** @deprecated gunakan isSynchronizedProcess */
export const isSynchronizedLane = (batchNo: number): boolean =>
  batchNo === 1 || batchNo === 2;

const sumAllBundlePcsAtProcess = (
  proc: ProcessSimState | undefined,
  pcsPerBundle: number
): number => {
  if (!proc) return 0;
  let sum = 0;
  for (let b = 1; b <= SIM_ORDER_BUNDLE_COUNT; b += 1) {
    const pcs = getBundlePcsAtProcess(proc, b);
    if (pcs <= 0) continue;
    sum += Math.min(pcs, getBundleTargetPcs(b, pcsPerBundle));
  }
  return sum;
};

/** Qty kartu proses live = akumulasi pcs per bundle dalam jangkauan pipeline. */
export const getProcessPipelineOutputQty = (
  batch: LineBatchSim,
  processIdx: number,
  pcsPerBundle = 15
): number => {
  const proc = batch.processes[processIdx];
  if (!proc) return 0;

  if (isSynchronizedProcess(batch.batchNo, processIdx)) {
    return sumAllBundlePcsAtProcess(proc, pcsPerBundle);
  }

  const lead = getLaneLeadBundle(batch, pcsPerBundle);
  const maxB = maxBundleNoForProcess(lead, processIdx, batch.batchNo);
  if (maxB <= 0) return 0;
  let sum = 0;
  for (let b = 1; b <= maxB; b += 1) {
    const target = getBundleTargetPcs(b, pcsPerBundle);
    sum += Math.min(getBundlePcsAtProcess(proc, b), target);
  }
  return sum;
};

/** Qty kartu proses = akumulasi selesai + progress bundle aktif */
export const getProcessDisplayQty = (proc: ProcessSimState): number => {
  const inProgress = proc.working?.progress ?? 0;
  return proc.totalOutput + inProgress;
};

export const getProcessSimStatus = (proc: ProcessSimState): 'Running' | 'Waiting' | 'Done' => {
  if (proc.working) return 'Running';
  if (proc.queue.length > 0) return 'Waiting';
  if (proc.totalOutput > 0) return 'Running';
  return 'Waiting';
};

/** Angka besar header batch = output akumulasi proses terakhir (pipeline). */
export const getLaneHeaderOutput = (
  batch: LineBatchSim,
  pcsPerBundle = 15
): number => {
  const lastIdx = getLaneProcessCount(batch.batchNo) - 1;
  return getProcessPipelineOutputQty(batch, lastIdx, pcsPerBundle);
};

export const isLanePipelineActive = (batch: LineBatchSim): boolean => {
  if (batch.batchNo <= 5 && batch.incomingBundleNo > 1) return true;
  return batch.processes.some(
    (p) =>
      p.working !== null ||
      p.queue.length > 0 ||
      p.totalOutput > 0 ||
      p.amvUnitCount > 0 ||
      Object.values(p.bundleOutputs).some((qty) => qty > 0)
  );
};

/** @deprecated gunakan getLaneHeaderOutput — tetap diekspor agar tidak ReferenceError */
export const countLaneDoneProcesses = (batch: LineBatchSim): number =>
  batch.processes.filter((p) => p.totalOutput > 0).length;

const capLeadBundle = (batch: LineBatchSim, bundleNo: number): number =>
  batch.batchNo <= 5 ? Math.min(bundleNo, SIM_ORDER_BUNDLE_COUNT) : bundleNo;

/** Bundle terdepan di proses 0 — proses lain tertinggal sesuai index. */
export const getLaneLeadBundle = (batch: LineBatchSim, pcsPerBundle = 15): number => {
  const p0 = batch.processes[0];
  if (p0?.working) return capLeadBundle(batch, p0.working.bundleNo);

  for (let b = 1; b <= SIM_ORDER_BUNDLE_COUNT; b += 1) {
    const pcs = getBundlePcsAtProcess(p0, b);
    const target = getBundleTargetPcs(b, pcsPerBundle);
    if (pcs > 0 && pcs < target) return capLeadBundle(batch, b);
  }

  let lastComplete = 0;
  for (let b = 1; b <= SIM_ORDER_BUNDLE_COUNT; b += 1) {
    if (isBundleCompleteAtProcess(p0, b, pcsPerBundle)) lastComplete = b;
    else if (getBundlePcsAtProcess(p0, b) > 0) return capLeadBundle(batch, b);
  }
  if (lastComplete > 0) {
    return capLeadBundle(batch, Math.min(lastComplete + 1, SIM_ORDER_BUNDLE_COUNT));
  }

  if (batch.batchNo <= 5) return capLeadBundle(batch, Math.max(1, batch.incomingBundleNo - 1));
  return 1;
};

/** Maks nomor bundle aktif di proses index (batch 1 sinkron = lead; lainnya lead − index). */
export const maxBundleNoForProcess = (
  leadBundle: number,
  processIdx: number,
  batchNo?: number
): number =>
  batchNo != null && isSynchronizedProcess(batchNo, processIdx)
    ? leadBundle
    : Math.max(0, leadBundle - processIdx);

/** @deprecated gunakan getLaneLeadBundle */
export const getLaneCurrentBundle = (batch: LineBatchSim): number => getLaneLeadBundle(batch);

/** Progress bar: proporsi proses yang sudah pernah mengeluarkan output */
export const laneProgressPct = (batch: LineBatchSim): number => {
  const active = batch.processes.filter((p) => p.totalOutput > 0).length;
  const total = getLaneProcessCount(batch.batchNo);
  return Math.min(100, Math.round((active / total) * 100));
};

/** +1 pcs ke bundle aktif untuk semua proses dalam satu grup operator. */
export const manualBumpProcessGroupOutput = (
  state: SimulationState,
  batchNo: number,
  processIndices: number[],
  pcsPerBundle = 15,
  amount = 1
): SimulationState => {
  if (processIndices.length === 0) return state;

  const next = cloneState(state);
  const batch = getBatch(next, batchNo);
  const leadIdx = processIndices[0];
  const bundleNo = resolveActiveBumpBundle(batch, leadIdx, pcsPerBundle);
  if (bundleNo == null) return state;

  const now = new Date().toISOString();
  let anyAdded = false;
  const laneLastIdx = getLaneProcessCount(batchNo) - 1;

  for (const pIdx of processIndices) {
    const proc = batch.processes[pIdx];
    if (!proc) continue;

    let priorBundlesOk = true;
    for (let b = 1; b < bundleNo; b += 1) {
      if (!isBundleCompleteAtProcess(proc, b, pcsPerBundle)) {
        priorBundlesOk = false;
        break;
      }
    }
    if (!priorBundlesOk) continue;

    const target = getBundleTargetPcs(bundleNo, pcsPerBundle);
    const current = getBundlePcsAtProcess(proc, bundleNo);
    const nextPcs = Math.min(target, current + amount);
    const added = nextPcs - current;
    if (added <= 0) continue;

    if (!proc.sessionStartedAt) proc.sessionStartedAt = now;
    proc.lastFinishedAt = now;
    proc.bundleOutputs[bundleNo] = nextPcs;
    proc.totalOutput += added;
    proc.amvUnitCount += added;
    const profile = getAmvProfile(batchNo, pIdx);
    proc.amvTotalMs += (profile?.msPerPcs ?? 12000) * added;
    anyAdded = true;

    if (nextPcs >= target && pIdx === laneLastIdx) {
      onLaneLastProcessComplete(next, batchNo, bundleNo, nextPcs);
    }
  }

  if (!anyAdded) return state;

  if (batchNo <= 5 && leadIdx === 0) {
    batch.incomingBundleNo = Math.max(batch.incomingBundleNo, bundleNo + 1);
  }
  return next;
};

/** @deprecated gunakan manualBumpProcessGroupOutput */
export const manualBumpSynchronizedLinkedOutput = (
  state: SimulationState,
  batchNo: number,
  pcsPerBundle = 15,
  amount = 1
): SimulationState => {
  const group = MANUAL_SYNC_GROUPS[batchNo]?.[0];
  if (!group) return state;
  return manualBumpProcessGroupOutput(state, batchNo, group, pcsPerBundle, amount);
};

/** @deprecated gunakan manualBumpProcessGroupOutput */
export const manualBumpBatch1LinkedOutput = (
  state: SimulationState,
  pcsPerBundle = 15,
  amount = 1
): SimulationState => manualBumpProcessGroupOutput(state, 1, [0, 1, 2], pcsPerBundle, amount);

/** Saat pause: +1 pcs ke bundle aktif (maks 15/bundle, pipeline antar proses). */
export const manualBumpProcessOutput = (
  state: SimulationState,
  batchNo: number,
  processIdx: number,
  amount = 1,
  pcsPerBundle = 15
): SimulationState => {
  const next = cloneState(state);
  const batch = getBatch(next, batchNo);
  const procCount = Math.min(getLaneProcessCount(batchNo), batch.processes.length);
  if (processIdx < 0 || processIdx >= procCount) return state;

  const proc = batch.processes[processIdx];
  if (!proc) return state;

  const bundleNo = resolveActiveBumpBundle(batch, processIdx, pcsPerBundle);
  if (bundleNo == null) return state;

  const target = getBundleTargetPcs(bundleNo, pcsPerBundle);
  const current = getBundlePcsAtProcess(proc, bundleNo);
  const nextPcs = Math.min(target, current + amount);
  const added = nextPcs - current;
  if (added <= 0) return state;

  const now = new Date().toISOString();
  if (!proc.sessionStartedAt) proc.sessionStartedAt = now;
  proc.lastFinishedAt = now;
  proc.bundleOutputs[bundleNo] = nextPcs;
  proc.totalOutput += added;
  proc.amvUnitCount += added;
  const profile = getAmvProfile(batchNo, processIdx);
  proc.amvTotalMs += (profile?.msPerPcs ?? 12000) * added;

  if (processIdx === 0 && batch.batchNo <= 5) {
    batch.incomingBundleNo = Math.max(batch.incomingBundleNo, bundleNo + 1);
  }

  if (nextPcs >= target) {
    feedNextProcessAfterBundleComplete(next, batch, processIdx, bundleNo, nextPcs);
  }

  return next;
};

/** Huruf A=proses 1 → index 0; tidak valid jika di luar jumlah proses batch. */
export const letterToProcessIndex = (letter: string, batchNo: number): number | null => {
  const code = letter.toLowerCase().charCodeAt(0);
  const base = 'a'.charCodeAt(0);
  if (code < base || code > 'z'.charCodeAt(0)) return null;
  const idx = code - base;
  const max = getLaneProcessCount(batchNo);
  return idx >= 0 && idx < max ? idx : null;
};

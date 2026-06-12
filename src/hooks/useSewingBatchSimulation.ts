import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import flowData from '../data/sewing/sewing-flow-detail.json';
import type { SewingBatchMeta, SewingFlowBatch } from '../types/sewingDashboard';
import {
  buildStaticBatchMeta,
  computeBatchOrderProgressPct,
  parseOrderBundleCount,
  resolveCurrentBundle,
} from '../utils/sewingBatchDetailData';
import {
  getBatchHeaderOutputFromFlow,
  normalizeFlowBatchQty,
} from '../utils/sewingFlowDummyNormalize';
import { SIM_TICK_MS } from '../data/sewing/sewingProcessAmvConfig';
import { formatScanRange, resolveLiveAmvMinutes } from '../utils/sewingAmvUtils';
import {
  commitWorkingForManualEdit,
  createInitialSimulationState,
  initAmvProfiles,
  kickstartProduction,
  getLaneHeaderOutput,
  getProcessDisplayQty,
  getProcessPipelineOutputQty,
  getProcessSimStatus,
  resolveManualBumpGroup,
  manualBumpProcessGroupOutput,
  manualBumpProcessOutput,
  simulationTick,
  letterToProcessIndex,
  type SimulationState,
} from '../utils/sewingBatchSimulation';

export type SimStatus = 'idle' | 'running' | 'paused';

export type SewingBatchSimulationApi = {
  playing: boolean;
  /** idle = dummy, running = sim jalan, paused = sim berhenti tapi data sim tetap */
  simStatus: SimStatus;
  play: () => void;
  pause: () => void;
  reset: () => void;
  /** Batch terpilih untuk edit manual saat pause (1–6). */
  selectedEditBatch: number | null;
  selectEditBatch: (batchNo: number) => void;
  bumpEditProcess: (processIdx: number) => void;
  /** Keyboard A/B/… saat pause — pakai ref batch agar langsung setelah tekan 1–6. */
  bumpEditProcessForKey: (key: string) => void;
  displayBatches: SewingFlowBatch[];
  displayBatchMeta: SewingBatchMeta[];
  useLive: boolean;
  sim: SimulationState;
};

export const useSewingBatchSimulation = (
  staticBatches: SewingFlowBatch[],
  staticBatchMeta: SewingBatchMeta[],
  pcsPerBundle: number
): SewingBatchSimulationApi => {
  const normalizedStaticBatches = useMemo(
    () => normalizeFlowBatchQty(staticBatches, pcsPerBundle) as SewingFlowBatch[],
    [staticBatches, pcsPerBundle]
  );

  const laneProcessCounts = useMemo(
    () =>
      Object.fromEntries(
        normalizedStaticBatches.map((lane) => [lane.batch, lane.processes.length])
      ) as Record<number, number>,
    [normalizedStaticBatches]
  );

  useEffect(() => {
    initAmvProfiles(normalizedStaticBatches);
  }, [normalizedStaticBatches]);

  const normalizedStaticMeta = useMemo(
    () =>
      staticBatchMeta.map((meta) => {
        const lane = staticBatches.find((l) => l.batch === meta.batch);
        const orderBundleCount = parseOrderBundleCount(lane?.demoQty);
        return buildStaticBatchMeta(meta.batch, meta, pcsPerBundle, orderBundleCount);
      }),
    [staticBatchMeta, staticBatches, pcsPerBundle]
  );

  const [playing, setPlaying] = useState(false);
  /** Tetap true setelah Play / edit manual sampai Reset — jangan kembali ke dummy saat Pause. */
  const [simEngaged, setSimEngaged] = useState(false);
  const [selectedEditBatch, setSelectedEditBatch] = useState<number | null>(null);
  const selectedEditBatchRef = useRef<number | null>(null);
  const [sim, setSim] = useState<SimulationState>(() =>
    createInitialSimulationState(laneProcessCounts)
  );

  useEffect(() => {
    selectedEditBatchRef.current = selectedEditBatch;
  }, [selectedEditBatch]);

  useEffect(() => {
    setPlaying(false);
    setSimEngaged(false);
    setSelectedEditBatch(null);
    selectedEditBatchRef.current = null;
    setSim(createInitialSimulationState(laneProcessCounts));
  }, [laneProcessCounts]);

  const reset = useCallback(() => {
    setPlaying(false);
    setSimEngaged(false);
    setSelectedEditBatch(null);
    selectedEditBatchRef.current = null;
    setSim(createInitialSimulationState(laneProcessCounts));
  }, [laneProcessCounts]);

  const selectEditBatch = useCallback(
    (batchNo: number) => {
      const maxBatch = staticBatchMeta.length;
      if (batchNo < 1 || batchNo > maxBatch) return;
      selectedEditBatchRef.current = batchNo;
      setSelectedEditBatch(batchNo);
      setSimEngaged(true);
    },
    [staticBatchMeta.length]
  );

  const bumpEditProcess = useCallback(
    (processIdx: number) => {
      if (playing) return;
      const batchNo = selectedEditBatchRef.current;
      if (batchNo == null) return;
      const group = resolveManualBumpGroup(batchNo, processIdx);
      setSim((prev) =>
        group
          ? manualBumpProcessGroupOutput(prev, batchNo, group, pcsPerBundle, 1)
          : manualBumpProcessOutput(prev, batchNo, processIdx, 1, pcsPerBundle)
      );
      setSimEngaged(true);
    },
    [playing, pcsPerBundle]
  );

  const bumpEditProcessForKey = useCallback(
    (key: string) => {
      if (playing) return;
      const batchNo = selectedEditBatchRef.current;
      if (batchNo == null) return;
      const processIdx = letterToProcessIndex(key, batchNo);
      if (processIdx == null) return;
      const group = resolveManualBumpGroup(batchNo, processIdx);
      setSim((prev) =>
        group
          ? manualBumpProcessGroupOutput(prev, batchNo, group, pcsPerBundle, 1)
          : manualBumpProcessOutput(prev, batchNo, processIdx, 1, pcsPerBundle)
      );
      setSimEngaged(true);
    },
    [playing, pcsPerBundle]
  );

  const play = useCallback(() => {
    setSim((prev) => kickstartProduction(prev, pcsPerBundle));
    setSimEngaged(true);
    setPlaying(true);
  }, [pcsPerBundle]);

  const pause = useCallback(() => {
    setPlaying(false);
    setSim((prev) => commitWorkingForManualEdit(prev));
    setSimEngaged(true);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setSim((prev) => simulationTick(prev, pcsPerBundle, SIM_TICK_MS));
    }, SIM_TICK_MS);
    return () => window.clearInterval(id);
  }, [playing, pcsPerBundle]);

  const useLive = simEngaged;
  const simStatus: SimStatus = !simEngaged ? 'idle' : playing ? 'running' : 'paused';

  const liveBatches: SewingFlowBatch[] = normalizedStaticBatches.map((lane): SewingFlowBatch => {
    const simLane = sim.batches.find((b) => b.batchNo === lane.batch);
    if (!simLane) return lane;
    return {
      ...lane,
      processes: lane.processes.map((node, idx): SewingFlowBatch['processes'][number] => {
        const proc = simLane.processes[idx];
        if (!proc) return node;
        const liveAmv = resolveLiveAmvMinutes(proc);
        const liveQty = playing
          ? getProcessPipelineOutputQty(simLane, idx, pcsPerBundle)
          : Math.max(
              getProcessPipelineOutputQty(simLane, idx, pcsPerBundle),
              getProcessDisplayQty(proc)
            );
        return {
          ...node,
          qtyValue: useLive ? liveQty : node.qtyValue,
          status: getProcessSimStatus(proc),
          actual: liveAmv ?? 0,
          actualBad: liveAmv != null && liveAmv > node.target,
          amvUnitCount: proc.amvUnitCount,
          scan:
            proc.sessionStartedAt != null
              ? formatScanRange(proc.sessionStartedAt, proc.lastFinishedAt)
              : node.scan,
        };
      }),
    };
  });

  const liveBatchMeta: SewingBatchMeta[] = normalizedStaticMeta.map((meta): SewingBatchMeta => {
    const simLane = sim.batches.find((b) => b.batchNo === meta.batch);
    const lane = normalizedStaticBatches.find((l) => l.batch === meta.batch);
    const orderBundleCount = parseOrderBundleCount(lane?.demoQty);
    if (!simLane) return meta;
    const currentBundle = resolveCurrentBundle(meta.batch, meta, simLane, true);
    const headerOutput = getLaneHeaderOutput(simLane, pcsPerBundle);
    const progressPct = computeBatchOrderProgressPct(
      headerOutput,
      orderBundleCount,
      pcsPerBundle
    );
    const anyRunning = simLane.processes.some((p) => p.working !== null);
    return {
      ...meta,
      currentBundle,
      doneCount: headerOutput,
      progressPct,
      activePcs: headerOutput,
      runningCount: anyRunning ? Math.max(1, meta.runningCount ?? 1) : 0,
    };
  });

  return {
    playing,
    simStatus,
    play,
    pause,
    reset,
    selectedEditBatch,
    selectEditBatch,
    bumpEditProcess,
    bumpEditProcessForKey,
    displayBatches: useLive ? liveBatches : normalizedStaticBatches,
    displayBatchMeta: useLive ? liveBatchMeta : normalizedStaticMeta,
    useLive,
    sim,
  };
};

export type { SewingBatchMeta, SewingFlowBatch } from '../types/sewingDashboard';

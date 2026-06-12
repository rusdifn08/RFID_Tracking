import {
  BATCH_DUMMY_SNAPSHOT,
  getBatchSnapshot,
  getDemoChainForBatch,
  getBatchHeaderOutputQty,
  getProcessAccumulatedQty,
  PCS_PER_BUNDLE_DEMO,
} from '../data/sewing/sewingDummyConfig';

type ProcessNode = { qtyValue: number | string; [key: string]: unknown };
type FlowBatch = { batch: number; processes: ProcessNode[]; [key: string]: unknown };

const toQty = (v: number | string): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
};

export const DEMO_LAST_OUTPUT_BY_BATCH: Record<number, number> = Object.fromEntries(
  Object.keys(BATCH_DUMMY_SNAPSHOT).map((k) => {
    const batchNo = Number(k);
    return [batchNo, getBatchHeaderOutputQty(batchNo)];
  })
);

export const DEMO_CHAIN_BY_BATCH: Record<number, number[]> = Object.fromEntries(
  Object.keys(BATCH_DUMMY_SNAPSHOT).map((k) => [Number(k), getDemoChainForBatch(Number(k))])
);

/** Qty kartu = akumulasi pipeline (lead − index), sama untuk batch produksi & assembly */
export const normalizeFlowBatchQty = (batches: FlowBatch[], pcsPerBundle = PCS_PER_BUNDLE_DEMO): FlowBatch[] => {
  return batches.map((lane) => {
    const snap = getBatchSnapshot(lane.batch);
    const processes = lane.processes.map((node, idx) => {
      let qtyValue = toQty(node.qtyValue);
      if (snap) {
        qtyValue = getProcessAccumulatedQty(lane.batch, idx);
      } else {
        const chain = DEMO_CHAIN_BY_BATCH[lane.batch];
        const prev =
          idx === 0
            ? pcsPerBundle
            : toQty(lane.processes[idx - 1]?.qtyValue ?? chain?.[idx - 1] ?? pcsPerBundle);
        qtyValue = Math.min(chain?.[idx] ?? qtyValue, prev);
      }
      return { ...node, qtyValue };
    });

    for (let i = 1; i < processes.length; i++) {
      const prevQty = toQty(processes[i - 1].qtyValue);
      const cur = toQty(processes[i].qtyValue);
      if (cur > prevQty) {
        processes[i] = { ...processes[i], qtyValue: prevQty };
      }
    }

    return { ...lane, processes };
  });
};

export const getBatchHeaderOutputFromFlow = (lane: FlowBatch): number => {
  const snap = getBatchSnapshot(lane.batch);
  if (snap) return getBatchHeaderOutputQty(lane.batch);
  const last = lane.processes[lane.processes.length - 1];
  return last ? toQty(last.qtyValue) : 0;
};

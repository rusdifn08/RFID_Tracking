import flowData from '../data/sewing/sewing-flow-detail.json';
import batchData from '../data/sewing/sewing-batch-dashboard.json';

/** Satu lane / batch dari sewing-flow-detail.json */
export type SewingFlowBatch = (typeof flowData.batches)[number];

/** Metadata batch untuk kartu header (semua field opsional simulasi) */
export type SewingBatchMeta = {
  batch: number;
  type: string;
  processCount: number;
  doneCount: number;
  runningCount?: number;
  holdCount: number;
  progressPct: number;
  qcCount: number;
  avgActual: number | string;
  avgTarget?: number;
  currentBundle?: number;
  activePcs?: number;
  /** Pcs sudah scan masuk (proses pertama) */
  pcsIn?: number;
  /** Pcs sudah scan OUT (proses terakhir) */
  pcsOut?: number;
  wip?: number;
  efficiencyPct?: number;
};

export const SEWING_BATCH_META_STATIC: SewingBatchMeta[] = batchData.batches as SewingBatchMeta[];

/**

 * Sumber tunggal data dummy sewing dashboard.

 * Aturan: pipeline lead − index; output N ≤ N−1; assembly = MIN output P5 sumber per bundle.

 */



export const PCS_PER_BUNDLE_DEMO = 15;

export const SIM_LAST_PROCESS_IDX = 4;

const BATCH_LAST_PROCESS_IDX: Record<number, number> = {
  1: 2,
  2: 10,
  3: 15,
};

const padBundleRow = (values: number[], size = 11): BundleProcessOutputs => {
  const row = [...values];
  while (row.length < size) row.push(0);
  return row;
};

const padBundleRow16 = (values: number[]): BundleProcessOutputs => padBundleRow(values, 16);

/** Snapshot linear: bundleIn scan IN, bundleOut selesai di proses terakhir */
const makeBatchSnapshot = (
  bundleIn: number,
  bundleOut: number,
  lastProcessIdx: number,
  rowPad: number
): BatchDummySnapshot => {
  const bundles: Record<number, BundleProcessOutputs> = {};
  for (let n = 1; n <= bundleIn; n++) {
    const base = new Array(Math.max(rowPad, lastProcessIdx + 1)).fill(0);
    base[0] = PCS_PER_BUNDLE_DEMO;
    const done = n <= bundleOut;
    for (let p = 1; p <= lastProcessIdx; p++) {
      if (done || p < lastProcessIdx) base[p] = PCS_PER_BUNDLE_DEMO;
    }
    bundles[n] = rowPad >= 16 ? padBundleRow16(base) : padBundleRow(base, rowPad);
  }
  return { leadBundle: bundleIn, orderBundles: 10, bundles };
};

/** Index proses terakhir per batch. */
export const getBatchLastProcessIdx = (batchNo: number): number =>
  BATCH_LAST_PROCESS_IDX[batchNo] ?? SIM_LAST_PROCESS_IDX;

export const SIM_ORDER_BUNDLE_COUNT = 10;

export const SIM_LAST_BUNDLE_PCS = 10;



export const ASSEMBLY_6_SOURCES = [2, 3, 4] as const;



export type BundleProcessOutputs = number[];



export type BatchDummySnapshot = {

  leadBundle: number;

  orderBundles: number;

  bundles: Record<number, BundleProcessOutputs>;

};



/** Batch 1–5 — selaras dashboard demo (IN/OUT bundle per kartu) */
const PRODUCTION_BATCHES: Record<number, BatchDummySnapshot> = {
  1: makeBatchSnapshot(32, 24, 2, 5),
  2: makeBatchSnapshot(28, 18, 10, 11),
  3: makeBatchSnapshot(35, 22, 15, 16),
  4: makeBatchSnapshot(30, 20, 4, 5),
  5: makeBatchSnapshot(26, 21, 4, 5),
};



const p5 = (batchNo: number, bundleNo: number): number => {

  const row = PRODUCTION_BATCHES[batchNo]?.bundles[bundleNo];

  if (!row) return 0;

  const idx = getBatchLastProcessIdx(batchNo);

  return row[idx] ?? 0;

};



const assemblyRowFromIntake = (intake: number): BundleProcessOutputs =>
  padBundleRow([
    intake,
    intake,
    Math.max(0, intake - 1),
    Math.max(0, intake - 1),
    Math.max(0, intake - 2),
  ]);



const minP5 = (sources: readonly number[], bundleNo: number, extra?: Record<number, number>): number => {

  const outs = sources.map((s) => (s === 6 && extra ? extra[bundleNo] ?? 0 : p5(s, bundleNo)));

  if (outs.some((o) => o <= 0)) return 0;

  return Math.min(...outs);

};



const buildAssemblySnapshot = (

  bundleCount: number,

  leadBundle: number,

  intakeForBundle: (n: number) => number

): Record<number, BundleProcessOutputs> => {

  const bundles: Record<number, BundleProcessOutputs> = {};

  for (let n = 1; n <= bundleCount; n++) {

    const intake = intakeForBundle(n);

    if (intake <= 0) continue;

    if (n === leadBundle) {

      bundles[n] = [intake, intake, Math.max(0, intake - 1), 0, 0];

    } else {

      bundles[n] = assemblyRowFromIntake(intake);

    }

  }

  return bundles;

};



const BATCH_6_SNAPSHOT = makeBatchSnapshot(18, 12, 4, 5);

const B6_P5: Record<number, number> = Object.fromEntries(
  Object.entries(BATCH_6_SNAPSHOT.bundles).map(([k, row]) => [Number(k), row[4] ?? 0])
);

const PRODUCTION_BATCHES_67: Record<number, BatchDummySnapshot> = {
  6: BATCH_6_SNAPSHOT,
};

const PRODUCTION_BATCHES_EXTRA: Record<number, BatchDummySnapshot> = {

  7: {

    leadBundle: 5,

    orderBundles: 10,

    bundles: {

      1: [14, 13, 12, 11, 10],

      2: [14, 13, 12, 11, 9],

      3: [14, 13, 12, 10, 8],

      4: [14, 12, 11, 9, 7],

      5: [13, 11, 10, 8, 0],

    },

  },

  8: {

    leadBundle: 4,

    orderBundles: 10,

    bundles: {

      1: [12, 11, 10, 9, 8],

      2: [12, 11, 10, 9, 7],

      3: [11, 10, 9, 8, 6],

      4: [10, 9, 8, 6, 0],

    },

  },

};



export const BATCH_DUMMY_SNAPSHOT: Record<number, BatchDummySnapshot> = {

  ...PRODUCTION_BATCHES,

  ...PRODUCTION_BATCHES_67,

  ...PRODUCTION_BATCHES_EXTRA,

};



export const B2_B3_B4_LAST_B1 = [p5(2, 1), p5(3, 1), p5(4, 1)] as const;

export const ASSEMBLY_6_INTAKE = Math.min(...B2_B3_B4_LAST_B1);



export const getBundleTargetPcs = (

  bundleNo: number,

  pcsPerBundle = PCS_PER_BUNDLE_DEMO

): number => (bundleNo === SIM_ORDER_BUNDLE_COUNT ? SIM_LAST_BUNDLE_PCS : pcsPerBundle);



export const getSimOrderTargetPcs = (

  orderBundleCount: number,

  pcsPerBundle = PCS_PER_BUNDLE_DEMO

): number => {

  if (orderBundleCount <= 0) return 0;

  return (

    (orderBundleCount - 1) * pcsPerBundle +

    getBundleTargetPcs(orderBundleCount, pcsPerBundle)

  );

};



export const getAssemblyGateIntake = (bundleNo: number): number =>

  minP5(ASSEMBLY_6_SOURCES, bundleNo);



export const getBatchSnapshot = (batchNo: number): BatchDummySnapshot | undefined =>

  BATCH_DUMMY_SNAPSHOT[batchNo];



export const getBundleNos = (batchNo: number): number[] => {

  const snap = getBatchSnapshot(batchNo);

  if (!snap) return [];

  return Object.keys(snap.bundles)

    .map(Number)

    .sort((a, b) => a - b);

};



export const getLastProcessOutput = (batchNo: number, bundleNo: number): number => {

  const row = getBatchSnapshot(batchNo)?.bundles[bundleNo];

  const idx = getBatchLastProcessIdx(batchNo);

  return row ? row[idx] ?? 0 : 0;

};



const maxBundlesAtProcess = (leadBundle: number, processIdx: number): number =>

  Math.max(0, leadBundle - processIdx);



export const getProcessAccumulatedQty = (batchNo: number, processIdx: number): number => {

  const snap = getBatchSnapshot(batchNo);

  if (!snap) return 0;

  const maxB = maxBundlesAtProcess(snap.leadBundle, processIdx);

  if (maxB <= 0) return 0;

  let sum = 0;

  for (let b = 1; b <= maxB; b++) {

    sum += snap.bundles[b]?.[processIdx] ?? 0;

  }

  return sum;

};



export const getBatchHeaderOutputQty = (batchNo: number): number =>

  getProcessAccumulatedQty(batchNo, getBatchLastProcessIdx(batchNo));



export const getDemoChainForBatch = (batchNo: number): number[] => {

  const snap = getBatchSnapshot(batchNo);

  if (!snap) return [15, 15, 14, 13, 12];

  return (snap.bundles[snap.leadBundle] ?? [15, 15, 14, 13, 12]) as unknown as number[];

};



export const getLastProcessOutputSum = (batchNo: number): number =>

  getBundleNos(batchNo).reduce((s, bn) => s + getLastProcessOutput(batchNo, bn), 0);



export const getBundlesAtLastProcess = (batchNo: number): number[] =>

  getBundleNos(batchNo).filter((bn) => getLastProcessOutput(batchNo, bn) > 0);



export const getBatchOutputProgressFromSnapshot = (

  batchNo: number,

  pcsPerBundle = PCS_PER_BUNDLE_DEMO

) => {

  const snap = getBatchSnapshot(batchNo);

  const lastIdx = getBatchLastProcessIdx(batchNo);

  const maxB = snap ? maxBundlesAtProcess(snap.leadBundle, lastIdx) : 0;

  const targetOutput =

    maxB > 0

      ? Array.from({ length: maxB }, (_, i) => getBundleTargetPcs(i + 1, pcsPerBundle)).reduce(

          (s, n) => s + n,

          0

        )

      : 0;

  const actual = getBatchHeaderOutputQty(batchNo);

  return {

    totalBundle: maxB,

    targetOutput,

    actual,

    balance: actual - targetOutput,

    persentase: targetOutput > 0 ? Math.round((actual / targetOutput) * 100) : 0,

    orderTarget: getSimOrderTargetPcs(snap?.orderBundles ?? 0, pcsPerBundle),

  };

};



export const getBatchBundleListRows = (

  batchNo: number,

  pcsPerBundle = PCS_PER_BUNDLE_DEMO

) => {

  const snap = getBatchSnapshot(batchNo);

  if (!snap) return [];

  return getBundleNos(batchNo).map((bundleNo) => {

    const output = getLastProcessOutput(batchNo, bundleNo);

    const cap =

      batchNo >= 6

        ? snap.bundles[bundleNo]?.[0] ?? 0

        : getBundleTargetPcs(bundleNo, pcsPerBundle);

    return { bundleNo, output, reject: Math.max(0, cap - output) };

  });

};



export const getBundleIntakePcs = (

  batchNo: number,

  bundleNo: number,

  pcsPerBundle = PCS_PER_BUNDLE_DEMO

): number => {

  if (batchNo <= 5) return getBundleTargetPcs(bundleNo, pcsPerBundle);

  return getAssemblyGateIntake(bundleNo) || ASSEMBLY_6_INTAKE;

};



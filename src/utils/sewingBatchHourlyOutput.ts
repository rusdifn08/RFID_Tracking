/** Trend output pcs per jam per batch — dummy & normalisasi chart */

export type BatchHourlyOutputPoint = {
  hour: string;
} & Record<string, number | string>;

export type BatchHourlyOutputSeries = {
  batch: number;
  dataKey: string;
  label: string;
  color: string;
};

/** Warna garis per batch (1–8) */
export const BATCH_HOURLY_OUTPUT_COLORS: Record<number, string> = {
  1: '#2563eb',
  2: '#7c3aed',
  3: '#0891b2',
  4: '#d97706',
  5: '#e11d48',
  6: '#059669',
  7: '#6366f1',
  8: '#14b8a6',
};

export const batchHourlyOutputKey = (batchNo: number): string => `batch${batchNo}`;

export const buildBatchHourlyOutputSeries = (batchNos: number[]): BatchHourlyOutputSeries[] =>
  batchNos.map((batch) => ({
    batch,
    dataKey: batchHourlyOutputKey(batch),
    label: `Batch ${batch}`,
    color: BATCH_HOURLY_OUTPUT_COLORS[batch] ?? '#64748b',
  }));

/** Pastikan setiap titik punya key batch yang dibutuhkan */
export const normalizeHourlyBatchOutput = (
  rows: BatchHourlyOutputPoint[],
  batchNos: number[]
): BatchHourlyOutputPoint[] =>
  rows.map((row) => {
    const next: BatchHourlyOutputPoint = { hour: String(row.hour) };
    batchNos.forEach((b) => {
      const key = batchHourlyOutputKey(b);
      const raw = row[key];
      next[key] = typeof raw === 'number' ? raw : Number(raw) || 0;
    });
    return next;
  });

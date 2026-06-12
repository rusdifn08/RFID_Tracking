/** Fitur tersembunyi: jumlah batch card di dashboard (default 6, max 8 via +/-) */
export const SEWING_DASHBOARD_BATCH_MIN = 6;
export const SEWING_DASHBOARD_BATCH_MAX = 8;
export const SEWING_DASHBOARD_BATCH_DEFAULT = SEWING_DASHBOARD_BATCH_MIN;

export const clampVisibleBatchCount = (count: number): number =>
  Math.min(SEWING_DASHBOARD_BATCH_MAX, Math.max(SEWING_DASHBOARD_BATCH_MIN, count));

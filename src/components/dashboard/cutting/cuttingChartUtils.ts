/** Recharts Pie: `percent` bisa rasio 0–1 atau sudah 0–100 */
export function formatPieSlicePercent(percent: number | undefined): string {
    if (percent == null || Number.isNaN(Number(percent))) return '0';
    const p = Number(percent);
    const pct = p > 1 ? p : p * 100;
    return pct.toFixed(1);
}

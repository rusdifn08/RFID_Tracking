import type { PcsWorkLog, ProcessSimState } from './sewingBatchSimulation';

export type AmvVsTargetTone = 'good' | 'warn' | 'bad';

/** AMV > target = hijau; kurang sedikit (<0.1) = orange; kurang >=0.1 = merah */
export const getAmvVsTargetTone = (target: number, amvActual: number): AmvVsTargetTone => {
  if (amvActual > target) return 'good';
  const gapBelow = target - amvActual;
  if (gapBelow < 0.1) return 'warn';
  return 'bad';
};

export const amvVsTargetTextClass = (tone: AmvVsTargetTone): string => {
  if (tone === 'good') return 'text-green-600';
  if (tone === 'warn') return 'text-amber-600';
  return 'text-red-600';
};

export const amvVsTargetBadgeClass = (tone: AmvVsTargetTone): string => {
  if (tone === 'good') return 'bg-green-500/15 text-green-700';
  if (tone === 'warn') return 'bg-amber-500/15 text-amber-700';
  return 'bg-red-500/15 text-red-700';
};

export type AmvBundleGroup = {
  bundleNo: number;
  unitCount: number;
  avgAmvMinutes: number;
  pcsLogs: PcsWorkLog[];
};

export const groupPcsLogsByBundle = (logs: PcsWorkLog[]): AmvBundleGroup[] => {
  const map = new Map<number, PcsWorkLog[]>();
  for (const log of logs) {
    const arr = map.get(log.bundleNo) ?? [];
    arr.push(log);
    map.set(log.bundleNo, arr);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([bundleNo, pcsLogs]) => {
      const totalMs = pcsLogs.reduce((s, l) => s + l.durationMs, 0);
      const unitCount = pcsLogs.length;
      const avgAmvMinutes =
        unitCount > 0 ? Number((totalMs / unitCount / 60000).toFixed(2)) : 0;
      return {
        bundleNo,
        unitCount,
        avgAmvMinutes,
        pcsLogs: [...pcsLogs].sort((a, b) => b.pcsNo - a.pcsNo),
      };
    });
};

export const formatTimeHms = (isoOrMs: string | number | null | undefined): string => {
  if (isoOrMs == null) return '—';
  const d = typeof isoOrMs === 'number' ? new Date(isoOrMs) : new Date(isoOrMs);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const formatScanRange = (
  startedAt: string | null | undefined,
  lastFinishedAt: string | null | undefined
): string => {
  if (!startedAt) return '—';
  const start = formatTimeHms(startedAt);
  const end = lastFinishedAt ? formatTimeHms(lastFinishedAt) : '…';
  return `${start} - ${end}`;
};

export const formatDurationSec = (ms: number): string => {
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)} dtk`;
  const min = Math.floor(sec / 60);
  const rem = Math.round(sec % 60);
  return `${min}m ${rem}dtk`;
};

export const getAmvMinutes = (proc: ProcessSimState): number => {
  if (proc.amvUnitCount <= 0) return 0;
  return Number((proc.amvTotalMs / proc.amvUnitCount / 60000).toFixed(2));
};

/** AMV valid hanya jika sudah ada pcs tercatat */
export const resolveLiveAmvMinutes = (
  proc: ProcessSimState | null | undefined
): number | null => {
  if (!proc || proc.amvUnitCount <= 0) return null;
  const fromTotals = getAmvMinutes(proc);
  if (fromTotals > 0) return fromTotals;
  if (proc.recentPcsLogs.length > 0) {
    const totalMs = proc.recentPcsLogs.reduce((s, l) => s + l.durationMs, 0);
    return Number((totalMs / proc.recentPcsLogs.length / 60000).toFixed(2));
  }
  return null;
};

/** Output rata-rata per jam (pcs/jam) dari AMV menit/pcs */
export const getWorkingOutputPerHour = (amvMinutes: number): number | null => {
  if (amvMinutes <= 0) return null;
  return Number((60 / amvMinutes).toFixed(1));
};

export const formatAmvMinutes = (amvMinutes: number | null | undefined): string =>
  amvMinutes != null && amvMinutes > 0 ? amvMinutes.toFixed(2) : '—';

export const formatAmvGap = (
  target: number,
  amvMinutes: number | null | undefined
): string => {
  if (amvMinutes == null || amvMinutes <= 0) return '—';
  const gap = Number((amvMinutes - target).toFixed(2));
  return `${gap > 0 ? '+' : ''}${gap.toFixed(2)}`;
};

export const formatWorkingOutputPerHour = (amvMinutes: number | null | undefined): string => {
  if (amvMinutes == null || amvMinutes <= 0) return '—';
  const out = getWorkingOutputPerHour(amvMinutes);
  return out != null ? `${out} pcs/jam` : '—';
};

const toOutputQty = (qtyValue: number | string): number => {
  const n = typeof qtyValue === 'number' ? qtyValue : Number(qtyValue);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
};

/**
 * AMV kartu/modal:
 * - Dummy: pakai `dummyActual` dari JSON jika output > 0
 * - Live sim: jika sudah ada pcs tercatat (amvUnitCount) — tidak bergantung qty snapshot
 */
export const resolveProcessAmvMinutes = (params: {
  useLive: boolean;
  qtyValue: number | string;
  dummyActual: number;
  liveAmvMinutes?: number | null;
  amvUnitCount?: number;
}): number | null => {
  if (params.useLive) {
    if ((params.amvUnitCount ?? 0) <= 0) return null;
    const live = params.liveAmvMinutes;
    return live != null && live > 0 ? live : null;
  }

  const qty = toOutputQty(params.qtyValue);
  if (qty <= 0) return null;
  return params.dummyActual > 0 ? params.dummyActual : null;
};

export const getRecentPcsLogs = (proc: ProcessSimState, limit = 12): PcsWorkLog[] =>
  proc.recentPcsLogs.slice(-limit).reverse();

export const getAllPcsLogsNewestFirst = (proc: ProcessSimState): PcsWorkLog[] =>
  [...proc.recentPcsLogs].reverse();

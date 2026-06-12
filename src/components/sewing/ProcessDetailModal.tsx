import { memo, useEffect, useMemo, useState } from 'react';
import {
  buildProcessBundleTableRows,
  processTargetOutputPcs,
  processTotalOutputPcs,
  resolveCurrentBundle,
} from '../../utils/sewingBatchDetailData';
import { maxBundleNoForProcess, getProcessPipelineOutputQty } from '../../utils/sewingBatchSimulation';
import type { SimulationState } from '../../utils/sewingBatchSimulation';
import {
  amvVsTargetBadgeClass,
  amvVsTargetTextClass,
  formatDurationSec,
  formatScanRange,
  formatTimeHms,
  formatAmvGap,
  formatAmvMinutes,
  formatWorkingOutputPerHour,
  getAllPcsLogsNewestFirst,
  getAmvVsTargetTone,
  groupPcsLogsByBundle,
  resolveLiveAmvMinutes,
  resolveProcessAmvMinutes,
} from '../../utils/sewingAmvUtils';
import { smvVariance, statusLabel, type ProcessDetailContext } from '../../utils/sewingProcessDetail';
import type { SewingFlowBatch } from '../../types/sewingDashboard';
import {
  cn,
  MODAL_HERO_BG,
  PROCESS_STATUS_CHIP,
  type CategoryKind,
} from './sewingBatchTw';
import {
  ModalHeroGlow,
  ModalHeroGrid,
  operatorInitials,
  SewingDetailModalShell,
} from './SewingDetailModalShell';

type FlowProcess = SewingFlowBatch['processes'][number];

const categoryLabel: Record<CategoryKind, string> = {
  helper: 'Helper',
  sewing: 'Sewing',
  qc: 'QC',
  assembly: 'Assembly',
};

const categoryKind = (category: string): CategoryKind => {
  const c = category.trim().toLowerCase();
  if (c === 'helper') return 'helper';
  if (c === 'qc') return 'qc';
  if (c === 'assembling' || c === 'assembly' || c === 'ironing') return 'assembly';
  return 'sewing';
};

type ProcessDetailModalProps = {
  open: boolean;
  onClose: () => void;
  process: FlowProcess | null;
  ctx: ProcessDetailContext | null;
  sim?: SimulationState;
  useLiveSim?: boolean;
};

const modalCard = 'rounded-[0.65rem] border border-blue-100 bg-white p-2.5 shadow-[0_2px_10px_rgba(37,99,235,0.06)]';
const modalCardHead = 'mb-2 flex items-center justify-between gap-2';
const modalCardTitle = 'm-0 text-[0.68rem] font-extrabold uppercase tracking-wider text-slate-500';
const modalLabel = 'mb-0.5 block text-[0.56rem] font-bold uppercase tracking-wide text-slate-400';
const modalStrong = 'text-[0.78rem] font-extrabold leading-snug text-blue-900 break-words';

const ProcessDetailModal = memo(
  ({ open, onClose, process, ctx, sim, useLiveSim }: ProcessDetailModalProps) => {
    const [expandedAmvBundle, setExpandedAmvBundle] = useState<number | null>(null);

    useEffect(() => {
      if (!open) setExpandedAmvBundle(null);
    }, [open]);

    const detail = useMemo(() => {
      if (!process || !ctx) return null;

      const kind = categoryKind(process.category);
      const variance = smvVariance(process.target, process.actual);
      const outputUnit = process.qtyClass === 'pcs' ? 'pcs' : 'bundle';
      const statusKey = process.status.toLowerCase();
      const simLane = sim?.batches.find((b) => b.batchNo === ctx.batchNo);
      const leadBundle = resolveCurrentBundle(
        ctx.batchNo,
        { currentBundle: ctx.currentBundle },
        simLane,
        useLiveSim
      );
      const activeBundleNo = maxBundleNoForProcess(leadBundle, ctx.processIndex, ctx.batchNo) || 1;
      const maxBundleAtProcess = activeBundleNo;
      const targetOutput = processTargetOutputPcs(
        ctx.batchNo,
        ctx.processIndex,
        leadBundle,
        ctx.pcsPerBundle,
        simLane,
        useLiveSim
      );
      const bundleTable = buildProcessBundleTableRows(
        ctx.batchNo,
        ctx.processIndex,
        leadBundle,
        ctx.pcsPerBundle,
        simLane,
        useLiveSim
      );
      const totalOutput = processTotalOutputPcs(
        ctx.batchNo,
        ctx.processIndex,
        leadBundle,
        ctx.pcsPerBundle,
        simLane,
        useLiveSim
      );
      const simProc = simLane?.processes[ctx.processIndex];
      const livePipelineQty =
        useLiveSim && simLane
          ? getProcessPipelineOutputQty(simLane, ctx.processIndex, ctx.pcsPerBundle)
          : Math.max(0, Math.round(Number(process.qtyValue) || 0));
      const liveAmv = simProc && useLiveSim ? resolveLiveAmvMinutes(simProc) : null;
      const amvActual = resolveProcessAmvMinutes({
        useLive: !!useLiveSim,
        qtyValue: livePipelineQty,
        dummyActual: process.actual,
        liveAmvMinutes: liveAmv,
        amvUnitCount: simProc?.amvUnitCount,
      });
      const amvVariance =
        amvActual != null ? smvVariance(process.target, amvActual) : null;
      const amvUnitCount =
        useLiveSim && simProc
          ? simProc.amvUnitCount
          : amvActual != null
            ? Math.max(0, Math.round(Number(process.qtyValue) || 0))
            : 0;
      const amvBundleGroups =
        simProc && useLiveSim && amvUnitCount > 0
          ? groupPcsLogsByBundle(getAllPcsLogsNewestFirst(simProc))
          : [];
      const amvTone =
        amvActual != null ? getAmvVsTargetTone(process.target, amvActual) : null;
      const workingOutputPerHour = formatWorkingOutputPerHour(amvActual);
      const scanDisplay =
        simProc?.sessionStartedAt && useLiveSim
          ? formatScanRange(simProc.sessionStartedAt, simProc.lastFinishedAt)
          : process.scan;
      const machineId = (process as { machineId?: string }).machineId ?? '—';
      const manPower = (process as { manPower?: number }).manPower ?? 1;

      return {
        kind,
        variance,
        outputUnit,
        statusKey,
        targetOutput,
        bundleTable,
        totalOutput,
        leadBundle,
        activeBundleNo,
        maxBundleAtProcess,
        amvActual,
        amvVariance,
        amvUnitCount,
        amvBundleGroups,
        amvTone,
        workingOutputPerHour,
        scanDisplay,
        machineId,
        manPower,
      };
    }, [process, ctx, sim, useLiveSim]);

    if (!open || !process || !ctx || !detail) return null;

    const {
      kind,
      variance,
      outputUnit,
      statusKey,
      targetOutput,
      bundleTable,
      totalOutput,
      leadBundle,
      activeBundleNo,
      maxBundleAtProcess,
      amvActual,
      amvVariance,
      amvUnitCount,
      amvBundleGroups,
      amvTone,
      workingOutputPerHour,
      scanDisplay,
      machineId,
      manPower,
    } = detail;

    return (
      <SewingDetailModalShell
        open={open}
        onClose={onClose}
        labelledBy="sd-v2-detail-title"
        heroClassName={MODAL_HERO_BG[kind]}
        footerLabel="Proses"
        hero={
          <>
            <ModalHeroGlow />
            <ModalHeroGrid />
            <div className="relative z-[1] flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                <span className="inline-flex h-[1.65rem] min-w-[1.65rem] shrink-0 items-center justify-center rounded-md border border-white/35 bg-white/20 px-1.5 text-[0.72rem] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
                  {process.no}
                </span>
                <div className="min-w-0">
                  <p className="m-0 text-[0.62rem] font-bold uppercase tracking-wider text-white/80">
                    Batch {ctx.batchNo} • {ctx.batchType}
                  </p>
                  <h2
                    id="sd-v2-detail-title"
                    className="m-0 mt-1 text-[clamp(0.95rem,2vh,1.12rem)] font-black leading-tight tracking-tight"
                  >
                    {process.processName}
                  </h2>
                  <p className="mt-0.5 text-[0.68rem] leading-snug text-white/80">{process.processId}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="inline-flex items-center rounded-full border border-transparent bg-white/20 px-2 py-0.5 text-[0.58rem] font-extrabold text-white">
                      {categoryLabel[kind]}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[0.58rem] font-extrabold',
                        PROCESS_STATUS_CHIP[statusKey] ?? PROCESS_STATUS_CHIP.waiting
                      )}
                    >
                      {statusLabel(process.status)}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 text-[0.58rem] font-extrabold text-white/90">
                      Bundle ke-{activeBundleNo}
                    </span>
                  </div>
                </div>
              </div>
              <div className="min-w-[4.25rem] shrink-0 rounded-lg border border-white/30 bg-white/15 px-2 py-1.5 text-center backdrop-blur-sm">
                <span className="block text-[0.52rem] font-bold uppercase tracking-wide opacity-90">
                  Total output
                </span>
                <strong className="mt-0.5 block text-[1.35rem] font-black leading-none">{totalOutput}</strong>
              </div>
            </div>
          </>
        }
      >
        <section className={modalCard}>
          <div className={modalCardHead}>
            <h3 className={modalCardTitle}>Operator &amp; mesin</h3>
          </div>
          <div className="flex items-start gap-2.5">
            <div
              className="flex h-[2.35rem] w-[2.35rem] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-[0.78rem] font-black text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)]"
              aria-hidden
            >
              {operatorInitials(process.operator)}
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-3 gap-2 max-sm:grid-cols-2">
              <div>
                <span className={modalLabel}>Nama lengkap</span>
                <strong className={modalStrong}>{process.operator}</strong>
              </div>
              <div>
                <span className={modalLabel}>NIK</span>
                <strong className={modalStrong}>{process.nik}</strong>
              </div>
              <div>
                <span className={modalLabel}>Mesin</span>
                <strong className={modalStrong}>{process.machine}</strong>
              </div>
              <div>
                <span className={modalLabel}>Mesin ID</span>
                <strong className={modalStrong}>{machineId}</strong>
              </div>
              <div>
                <span className={modalLabel}>Man power</span>
                <strong className={modalStrong}>{manPower} orang</strong>
              </div>
              <div>
                <span className={modalLabel}>Waktu scan</span>
                <strong className={modalStrong}>{scanDisplay}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className={modalCard}>
          <div className={modalCardHead}>
            <h3 className={modalCardTitle}>SMV (menit)</h3>
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[0.58rem] font-bold',
                variance > 0 ? 'bg-amber-500/15 text-amber-700' : 'bg-green-500/15 text-green-700'
              )}
            >
              Selisih {variance > 0 ? '+' : ''}
              {variance.toFixed(2)}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 max-sm:grid-cols-2">
            {[
              { label: 'Target', value: process.target.toFixed(2) },
              { label: 'History', value: process.historical.toFixed(2) },
              { label: 'Action', value: process.actual.toFixed(2) },
              {
                label: 'Gap vs Target',
                value: `${variance > 0 ? '+' : ''}${variance.toFixed(2)}`,
                accent: true,
              },
            ].map((m) => (
              <div
                key={m.label}
                className={cn(
                  'rounded-md border border-slate-200 bg-gradient-to-b from-white to-[#f8fbff] px-1 py-1.5 text-center',
                  m.accent && 'border-blue-500/35 bg-blue-600/[0.06]'
                )}
              >
                <span className="block text-[0.54rem] font-bold uppercase tracking-wide text-slate-400">
                  {m.label}
                </span>
                <b className="mt-0.5 block text-[0.88rem] font-black text-blue-900">
                  {m.value}
                </b>
              </div>
            ))}
          </div>
        </section>

        <section className={modalCard}>
          <div className={modalCardHead}>
            <h3 className={modalCardTitle}>AMV (menit) — actual</h3>
            {amvVariance != null && amvTone != null ? (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[0.58rem] font-bold',
                  amvVsTargetBadgeClass(amvTone)
                )}
              >
                Gap AMV {formatAmvGap(process.target, amvActual)}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[0.58rem] font-bold text-slate-500">
                Belum ada output
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-sm:grid-cols-1 sm:grid-cols-4">
            <div className="rounded-md border border-slate-200 bg-gradient-to-b from-white to-[#f8fbff] px-1 py-1.5 text-center">
              <span className="block text-[0.54rem] font-bold uppercase tracking-wide text-slate-400">
                SMV Target
              </span>
              <b className="mt-0.5 block text-[0.88rem] font-black text-blue-900">
                {process.target.toFixed(2)}
              </b>
            </div>
            <div className="rounded-md border border-blue-500/35 bg-blue-600/[0.06] px-1 py-1.5 text-center">
              <span className="block text-[0.54rem] font-bold uppercase tracking-wide text-slate-400">
                AMV Actual
              </span>
              <b
                className={cn(
                  'mt-0.5 block text-[0.88rem] font-black',
                  amvTone != null ? amvVsTargetTextClass(amvTone) : 'text-slate-400'
                )}
              >
                {formatAmvMinutes(amvActual)}
              </b>
            </div>
            <div className="rounded-md border border-slate-200 bg-gradient-to-b from-white to-[#f8fbff] px-1 py-1.5 text-center">
              <span className="block text-[0.54rem] font-bold uppercase tracking-wide text-slate-400">
                Unit tercatat
              </span>
              <b className="mt-0.5 block text-[0.88rem] font-black text-blue-900">
                {amvUnitCount > 0 ? amvUnitCount : '—'}
              </b>
            </div>
            <div className="rounded-md border border-violet-200 bg-violet-50/80 px-1 py-1.5 text-center">
              <span className="block text-[0.54rem] font-bold uppercase tracking-wide text-slate-400">
                Working Time
              </span>
              <b className="mt-0.5 block text-[0.78rem] font-black leading-tight text-violet-800">
                {workingOutputPerHour}
              </b>
              <span className="mt-0.5 block text-[0.5rem] font-semibold text-slate-400">
                output / jam (rata-rata)
              </span>
            </div>
          </div>
          {amvBundleGroups.length > 0 ? (
            <ul className="mt-2 max-h-44 space-y-1 overflow-auto">
              {amvBundleGroups.map((group) => {
                const bundleTone = getAmvVsTargetTone(process.target, group.avgAmvMinutes);
                const expanded = expandedAmvBundle === group.bundleNo;
                return (
                  <li key={group.bundleNo} className="list-none">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedAmvBundle((prev) =>
                          prev === group.bundleNo ? null : group.bundleNo
                        )
                      }
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left transition-colors',
                        expanded
                          ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200'
                          : 'border-slate-200 bg-gradient-to-r from-white to-[#f8fbff] hover:border-blue-200 hover:bg-blue-50/40'
                      )}
                      aria-expanded={expanded}
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span
                          className={cn(
                            'inline-flex h-4 w-4 shrink-0 items-center justify-center text-[0.62rem] font-black text-blue-700 transition-transform',
                            expanded && 'rotate-90'
                          )}
                          aria-hidden
                        >
                          ▶
                        </span>
                        <span className="text-[0.66rem] font-extrabold text-blue-900">
                          Bundle {group.bundleNo}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-[0.62rem] font-bold text-slate-700">
                        <span>
                          {group.unitCount} pcs
                        </span>
                        <span className="text-slate-300">|</span>
                        <span>
                          AMV{' '}
                          <strong className={cn('font-black', amvVsTargetTextClass(bundleTone))}>
                            {group.avgAmvMinutes.toFixed(2)}
                          </strong>
                        </span>
                      </span>
                    </button>
                    {expanded ? (
                      <div className="mt-1 overflow-hidden rounded-md border border-slate-200">
                        <table className="w-full border-collapse text-[0.62rem]">
                          <thead>
                            <tr className="bg-slate-100">
                              {['Pcs', 'Mulai', 'Selesai', 'Durasi', 'AMV'].map((h) => (
                                <th
                                  key={h}
                                  className="border-b border-slate-200 px-1.5 py-1 text-left text-[0.54rem] font-extrabold uppercase text-slate-500"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {group.pcsLogs.map((log, i) => (
                              <tr key={`${log.bundleNo}-${log.pcsNo}-${i}`} className="even:bg-[#fafcff]">
                                <td className="px-1.5 py-1 font-bold">{log.pcsNo}</td>
                                <td className="px-1.5 py-1 tabular-nums">{formatTimeHms(log.startedAt)}</td>
                                <td className="px-1.5 py-1 tabular-nums">{formatTimeHms(log.finishedAt)}</td>
                                <td className="px-1.5 py-1">{formatDurationSec(log.durationMs)}</td>
                                <td
                                  className={cn(
                                    'px-1.5 py-1 font-bold',
                                    amvVsTargetTextClass(getAmvVsTargetTone(process.target, log.amvMinutes))
                                  )}
                                >
                                  {log.amvMinutes.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-[0.62rem] text-slate-500">
              {useLiveSim
                ? 'Belum ada pcs selesai — AMV & Working Time akan muncul setelah proses menghasilkan output.'
                : 'Jalankan simulasi Play untuk mencatat timestamp, durasi per pcs, dan AMV aktual.'}
            </p>
          )}
        </section>

        <section className={modalCard}>
          <div className={modalCardHead}>
            <h3 className={modalCardTitle}>Output &amp; bundle</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className={modalLabel}>Target output</span>
              <strong className={modalStrong}>
                {targetOutput} {outputUnit}
              </strong>
            </div>
            <div>
              <span className={modalLabel}>Total output</span>
              <strong className={modalStrong}>{totalOutput}</strong>
            </div>
            <div>
              <span className={modalLabel}>Kapasitas bundle</span>
              <strong className={modalStrong}>{ctx.pcsPerBundle} pcs / bundle</strong>
            </div>
            <div>
              <span className={modalLabel}>Bundle aktif</span>
              <strong className={modalStrong}>Ke-{activeBundleNo}</strong>
            </div>
          </div>
        </section>

        <section className={modalCard}>
          <div className={modalCardHead}>
            <h3 className={modalCardTitle}>Daftar bundle</h3>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-600/10 px-2 py-0.5 text-[0.58rem] font-bold text-blue-700">
              {maxBundleAtProcess > 0 ? `1 – ${maxBundleAtProcess}` : '—'}
            </span>
          </div>
          <div className="max-h-52 overflow-auto rounded-md border border-slate-200">
            <table className="w-full border-collapse text-[0.66rem]">
              <thead>
                <tr>
                  {['Bundle', 'Target', 'Actual', 'Selisih', '%'].map((h) => (
                    <th
                      key={h}
                      className="sticky top-0 z-[1] border-b border-slate-200 bg-slate-100 px-2 py-1.5 text-left text-[0.56rem] font-extrabold uppercase tracking-wide text-slate-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bundleTable.map((row) => (
                  <tr
                    key={row.bundleNo}
                    className={cn(
                      'border-b border-slate-50 even:bg-[#fafcff] hover:bg-blue-50',
                      row.bundleNo === activeBundleNo && 'bg-blue-50/80'
                    )}
                  >
                    <td className="px-2 py-1.5 font-extrabold text-blue-900">Bundle {row.bundleNo}</td>
                    <td className="px-2 py-1.5 font-semibold text-slate-700">{row.target}</td>
                    <td className="px-2 py-1.5 font-black text-blue-800">{row.actual}</td>
                    <td
                      className={cn(
                        'px-2 py-1.5 font-bold',
                        row.selisih < 0 ? 'text-red-600' : row.selisih > 0 ? 'text-green-700' : 'text-slate-600'
                      )}
                    >
                      {row.selisih > 0 ? '+' : ''}
                      {row.selisih}
                    </td>
                    <td className="px-2 py-1.5 font-extrabold text-slate-800">{row.persentase}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[0.62rem] leading-relaxed text-slate-500">
            Pipeline: proses {ctx.processIndex + 1} bundle ke-{activeBundleNo} (lead intake bundle ke-
            {leadBundle}). Total output = jumlah actual bundle di tabel.
          </p>
        </section>
      </SewingDetailModalShell>
    );
  }
);

ProcessDetailModal.displayName = 'ProcessDetailModal';

export default ProcessDetailModal;

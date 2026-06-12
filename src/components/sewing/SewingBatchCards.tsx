import { memo, useEffect, useRef } from 'react';
import type { SewingBatchMeta } from '../../types/sewingDashboard';
import {
  pcsToBundleCount,
  type BatchInOutMetrics,
  type ProductionBatchHighlight,
} from '../../utils/sewingBatchInOut';
import {
  amvVsTargetTextClass,
  formatAmvGap,
  formatAmvMinutes,
  getAmvVsTargetTone,
  resolveProcessAmvMinutes,
} from '../../utils/sewingAmvUtils';
import {
  BATCH_BADGE,
  CAT_DOT,
  cn,
  FLUID,
  PANEL_CAT,
  type CategoryKind,
} from './sewingBatchTw';

const MiniMetric = ({
  label,
  value,
  unit,
  tone,
  className,
  valueClassName,
}: {
  label: string;
  value: string | number;
  unit?: string;
  tone: 'amber' | 'violet' | 'slate' | 'blue' | 'teal' | 'rose';
  className?: string;
  valueClassName?: string;
}) => {
  const shell = 'border-blue-100/70 bg-blue-50/35';
  const valueTone = {
    amber: 'text-amber-900',
    violet: 'text-violet-900',
    slate: 'text-slate-900',
    blue: 'text-blue-900',
    teal: 'text-teal-900',
    rose: 'text-rose-900',
  };

  return (
    <div
      className={cn(
        'flex h-full min-h-0 min-w-0 flex-col items-center justify-center gap-[clamp(0.14rem,0.32vh,0.22rem)]',
        'rounded-md border px-[clamp(0.18rem,0.4vw,0.45rem)] py-[clamp(0.12rem,0.35vh,0.4rem)] text-center',
        shell,
        className
      )}
    >
      <span
        className={cn(
          'w-full truncate pb-[0.06rem] font-semibold leading-snug tracking-wide text-blue-700',
          FLUID.metricInline
        )}
      >
        {label}
      </span>
      <span className="flex w-full items-baseline justify-center gap-0.5">
        <strong
          className={cn(
            'truncate font-black tabular-nums',
            FLUID.metricSm,
            valueClassName ?? valueTone[tone]
          )}
        >
          {value}
        </strong>
        {unit ? (
          <span className={cn('shrink-0 font-semibold text-slate-400/90', FLUID.caption)}>{unit}</span>
        ) : null}
      </span>
    </div>
  );
};

const METRIC_LABEL = 'block text-[clamp(0.44rem,0.85vh,0.52rem)] font-bold leading-none text-slate-400';
const METRIC_VALUE = 'block text-[clamp(0.52rem,1.05vh,0.75rem)] font-extrabold leading-none text-blue-900';

type BatchSummary = Pick<
  SewingBatchMeta,
  'batch' | 'type' | 'currentBundle' | 'doneCount' | 'processCount' | 'qcCount' | 'holdCount' | 'avgActual' | 'progressPct'
>;

export const BatchSummaryCard = memo(
  ({ batch, onOpen }: { batch: BatchSummary; onOpen: () => void }) => {
    const badgesRef = useRef<HTMLDivElement>(null);
    const currentBundle = batch.currentBundle ?? 1;

    useEffect(() => {
      const el = badgesRef.current;
      if (!el) return;

      const syncSmvLabel = () => {
        el.classList.remove('smv-compact');
        requestAnimationFrame(() => {
          const needsCompact = el.scrollWidth > el.clientWidth + 1;
          el.classList.toggle('smv-compact', needsCompact);
        });
      };

      syncSmvLabel();
      const ro = new ResizeObserver(syncSmvLabel);
      ro.observe(el);
      const card = el.closest('[data-batch-card]');
      if (card) ro.observe(card);
      return () => ro.disconnect();
    }, [batch.processCount, batch.qcCount, batch.holdCount, batch.avgActual]);

    return (
      <article
        data-batch-card
        className={cn(
          'min-w-0 cursor-pointer overflow-hidden rounded-[0.65rem] border border-blue-200 bg-white shadow-[0_2px_10px_rgba(37,99,235,0.08)]',
          'transition-[transform,box-shadow] duration-200 ease-out',
          'hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(37,99,235,0.16)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
        )}
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen();
          }
        }}
        aria-label={`Detail Batch ${batch.batch}: ${batch.type}`}
      >
        <div className="flex min-h-[clamp(2.5rem,6vh,3.2rem)] items-stretch justify-between gap-1.5 bg-gradient-to-br from-[#1e4d9c] via-blue-600 to-blue-500 px-[clamp(0.38rem,0.9vw,0.5rem)] py-[clamp(0.28rem,0.75vh,0.42rem)] text-white">
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-y-[clamp(0.02rem,0.2vh,0.08rem)]">
            <h3 className="m-0 text-[clamp(0.72rem,1.35vh,0.92rem)] font-extrabold leading-[1.1] tracking-tight">
              Batch {batch.batch}
            </h3>
            <p className="m-0 truncate text-[clamp(0.52rem,1vh,0.64rem)] leading-[1.15] text-white/80">
              {batch.type}
            </p>
            <p className="m-0 truncate text-[clamp(0.5rem,0.95vh,0.6rem)] font-extrabold leading-[1.1] text-white">
              Bundle ke-{currentBundle}
            </p>
          </div>
          <div className="flex h-[clamp(1.85rem,4.5vh,2.35rem)] min-w-[clamp(1.85rem,4.5vh,2.35rem)] shrink-0 items-center justify-center self-center rounded-md bg-white px-1.5 text-[clamp(1rem,2.2vh,1.35rem)] font-black leading-none text-blue-700 shadow-[inset_0_0_0_1px_#bfdbfe]">
            {batch.doneCount}
          </div>
        </div>
        <div className="px-1.5 pb-1.5 pt-1">
          <div
            ref={badgesRef}
            className="flex min-w-0 flex-nowrap items-center gap-[clamp(0.12rem,0.25vw,0.2rem)] overflow-hidden [&.smv-compact_.sd-smv-prefix]:hidden"
          >
            <span
              className={cn(
                'inline-flex min-w-0 shrink items-center whitespace-nowrap rounded-full px-[clamp(0.22rem,0.45vw,0.38rem)] py-[clamp(0.08rem,0.2vh,0.12rem)] text-[clamp(0.44rem,0.85vh,0.52rem)] font-extrabold leading-tight',
                BATCH_BADGE.sewing
              )}
            >
              {batch.processCount} Proses
            </span>
            {batch.qcCount > 0 ? (
              <span
                className={cn(
                  'inline-flex min-w-0 shrink items-center whitespace-nowrap rounded-full px-[clamp(0.22rem,0.45vw,0.38rem)] py-[clamp(0.08rem,0.2vh,0.12rem)] text-[clamp(0.44rem,0.85vh,0.52rem)] font-extrabold leading-tight',
                  BATCH_BADGE.qc
                )}
              >
                {batch.qcCount} QC
              </span>
            ) : null}
            {batch.holdCount > 0 ? (
              <span
                className={cn(
                  'inline-flex min-w-0 shrink items-center whitespace-nowrap rounded-full px-[clamp(0.22rem,0.45vw,0.38rem)] py-[clamp(0.08rem,0.2vh,0.12rem)] text-[clamp(0.44rem,0.85vh,0.52rem)] font-extrabold leading-tight',
                  BATCH_BADGE.muted
                )}
              >
                {batch.holdCount} Hold
              </span>
            ) : null}
            <span
              className={cn(
                'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-[clamp(0.22rem,0.45vw,0.38rem)] py-[clamp(0.08rem,0.2vh,0.12rem)] text-[clamp(0.44rem,0.85vh,0.52rem)] font-extrabold leading-tight',
                BATCH_BADGE.helper
              )}
              title={`SMV ${batch.avgActual}`}
            >
              <span className="sd-smv-prefix">SMV </span>
              {batch.avgActual}
            </span>
          </div>
          <div className="mt-1 h-[0.38rem] overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-blue-600 to-green-500"
              style={{ width: `${batch.progressPct}%` }}
            />
          </div>
        </div>
      </article>
    );
  }
);

BatchSummaryCard.displayName = 'BatchSummaryCard';

type BatchOverview = Pick<
  SewingBatchMeta,
  'batch' | 'type' | 'currentBundle'
> &
  BatchInOutMetrics;

const HIGHLIGHT_BADGE: Record<
  ProductionBatchHighlight,
  { text: string; className: string }
> = {
  inMax: {
    text: 'IN Terbesar',
    className: 'bg-blue-600/12 text-blue-700 ring-1 ring-blue-300/50',
  },
  inMin: {
    text: 'IN Terkecil',
    className: 'bg-sky-500/12 text-sky-700 ring-1 ring-sky-300/50',
  },
  outMax: {
    text: 'OUT Terbesar',
    className: 'bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-300/50',
  },
  outMin: {
    text: 'OUT Terkecil',
    className: 'bg-orange-500/12 text-orange-700 ring-1 ring-orange-300/50',
  },
};

const batchHeaderBadges = (
  highlights: ProductionBatchHighlight[] | undefined,
  currentBundle: number
) => {
  if (highlights && highlights.length > 0) {
    return highlights.map((h) => HIGHLIGHT_BADGE[h]);
  }
  return [
    {
      text: `Bundle-${currentBundle}`,
      className: 'bg-blue-600/10 text-blue-700',
    },
  ];
};

export const BatchOverviewCard = memo(
  ({
    batch,
    pcsPerBundle = 15,
    highlight,
    onOpen,
  }: {
    batch: BatchOverview;
    pcsPerBundle?: number;
    highlight?: ProductionBatchHighlight[];
    onOpen: () => void;
  }) => {
    const currentBundle = batch.currentBundle ?? 1;
    const bundleIn = pcsToBundleCount(batch.pcsIn, pcsPerBundle);
    const bundleOut = pcsToBundleCount(batch.pcsOut, pcsPerBundle);
    const wipBundle = Math.max(0, bundleIn - bundleOut);
    /** Output pcs = bundle OUT × pcs per bundle */
    const outputPcs = bundleOut * pcsPerBundle;
    const progressPct = Math.min(100, batch.outProgressPct);
    const badges = batchHeaderBadges(highlight, currentBundle);

    return (
      <article
        data-batch-card
        className={cn(
          'flex h-full min-h-0 cursor-pointer flex-col overflow-hidden rounded-xl',
          'border border-blue-100/80 bg-white shadow-sm transition-all duration-200',
          'hover:border-blue-300 hover:shadow-[0_6px_20px_rgba(37,99,235,0.12)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
        )}
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen();
          }
        }}
        aria-label={`Detail Batch ${batch.batch}: IN ${bundleIn} bundle, OUT ${bundleOut} bundle`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-1 border-b border-blue-50 bg-gradient-to-r from-blue-50/90 to-white px-[clamp(0.4rem,0.75vw,0.65rem)] py-[clamp(0.3rem,0.55vh,0.45rem)]">
          <h3 className={cn('m-0 min-w-0 truncate font-bold leading-tight text-slate-900', FLUID.body)}>
            Batch {batch.batch}
            <span className="font-medium text-slate-400"> · </span>
            <span className="font-semibold text-blue-700">{batch.type}</span>
          </h3>
          <span className="flex shrink-0 flex-wrap items-center justify-end gap-0.5">
            {badges.map((badge) => (
              <span
                key={badge.text}
                className={cn(
                  'rounded-md px-[clamp(0.25rem,0.45vw,0.4rem)] py-0.5 font-bold',
                  FLUID.caption,
                  badge.className
                )}
              >
                {badge.text}
              </span>
            ))}
          </span>
        </div>

        {/*
          Proporsi tinggi (2fr : 2fr : auto):
          - Baris IN/OUT = 2fr → tinggi kotak IN/OUT = 2× tinggi satu sel WIP
          - Baris metrics = 2fr (2 baris × 1fr) → WIP = 1fr
        */}
        <div
          className={cn(
            'grid min-h-0 flex-1',
            'grid-rows-[minmax(clamp(2.4rem,5.5vh,4.5rem),2fr)_minmax(clamp(2.2rem,5vh,4rem),2fr)_auto]',
            'gap-[clamp(0.12rem,0.35vh,0.28rem)]',
            'px-[clamp(0.3rem,0.55vw,0.5rem)]'
          )}
        >
          {/* IN / OUT — tinggi = 2× kartu WIP */}
          <div className={cn('grid min-h-0 h-full grid-cols-2', FLUID.gap)}>
            <div className="flex h-full min-h-0 items-center justify-between gap-2 rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50/80 to-white px-[clamp(0.35rem,0.55vw,0.5rem)]">
              <span className={cn('shrink-0 font-bold uppercase tracking-wide text-blue-500', FLUID.body)}>IN</span>
              <span className="flex items-baseline gap-0.5">
                <strong className={cn('font-black tabular-nums leading-none text-blue-700', FLUID.metricInOut)}>
                  {bundleIn}
                </strong>
                <span className={cn('font-semibold text-blue-400/80', FLUID.caption)}>Bundle</span>
              </span>
            </div>
            <div className="flex h-full min-h-0 items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-white px-[clamp(0.35rem,0.55vw,0.5rem)]">
              <span className={cn('shrink-0 font-bold uppercase tracking-wide text-emerald-600', FLUID.body)}>OUT</span>
              <span className="flex items-baseline gap-0.5">
                <strong className={cn('font-black tabular-nums leading-none text-emerald-700', FLUID.metricInOut)}>
                  {bundleOut}
                </strong>
                <span className={cn('font-semibold text-emerald-400/80', FLUID.caption)}>Bundle</span>
              </span>
            </div>
          </div>

          {/* Mini metrics — WIP, Percentage, Output */}
          <div
            className={cn(
              'grid h-full min-h-0 grid-cols-3 grid-rows-1 items-stretch',
              'gap-[clamp(0.12rem,0.35vh,0.28rem)]'
            )}
          >
            <MiniMetric label="WIP" value={wipBundle} unit="Bundle" tone="amber" />
            <MiniMetric label="Percentage" value={`${batch.efficiencyPct}%`} tone="violet" />
            <MiniMetric label="Output" value={outputPcs} unit="pcs" tone="slate" />
          </div>

          {/* Progress OUT/IN — sedikit di atas dasar kartu + padding bawah */}
          <div
            className="shrink-0 mt-[clamp(0.15rem,0.32vh,0.28rem)] pb-[clamp(0.38rem,0.6vh,0.52rem)]"
            aria-label={`Progress OUT terhadap IN ${progressPct}%`}
          >
            <div className="h-[clamp(0.32rem,0.75vh,0.55rem)] overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-emerald-500 transition-[width] duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </article>
    );
  }
);

BatchOverviewCard.displayName = 'BatchOverviewCard';

type FlowProcess = {
  no: number;
  processName: string;
  category: string;
  operator: string;
  nik: string;
  qtyValue: number | string;
  target: number;
  historical: number;
  actual: number;
  actualBad?: boolean;
  amvUnitCount?: number;
};

export const ProcessPanelCard = memo(
  ({
    node,
    kind,
    categoryTitle,
    onOpen,
    useLive = false,
  }: {
    node: FlowProcess;
    kind: CategoryKind;
    categoryTitle: string;
    onOpen: () => void;
    useLive?: boolean;
  }) => {
    const cat = PANEL_CAT[kind];
    const amvMinutes = resolveProcessAmvMinutes({
      useLive,
      qtyValue: node.qtyValue,
      dummyActual: node.actual,
      liveAmvMinutes:
        useLive && (node.amvUnitCount ?? 0) > 0 && node.actual > 0 ? node.actual : null,
      amvUnitCount: node.amvUnitCount,
    });
    const amvTone = amvMinutes != null ? getAmvVsTargetTone(node.target, amvMinutes) : null;
    const amvColor = amvTone != null ? amvVsTargetTextClass(amvTone) : 'text-slate-400';

    return (
      <article
        className={cn(
          'relative box-border flex h-full min-h-0 flex-col gap-[clamp(0.06rem,0.18vh,0.12rem)] overflow-hidden rounded-[0.55rem] border border-slate-200 bg-white',
          'px-[clamp(0.28rem,0.7vw,0.38rem)] py-[clamp(0.22rem,0.5vh,0.32rem)] shadow-sm',
          'cursor-pointer transition-[transform,box-shadow,border-color] duration-200 ease-out',
          'hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_6px_16px_rgba(37,99,235,0.14)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
          'max-[900px]:h-auto max-[900px]:min-h-[5.15rem]'
        )}
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen();
          }
        }}
        aria-label={`Detail proses ${node.no}: ${node.processName}`}
      >
        <span
          className={cn(
            'absolute right-1.5 top-1.5 z-[1] h-[0.46rem] w-[0.46rem] shrink-0 rounded-full border-[1.5px] border-white shadow-[0_0_0_1px_rgba(15,23,42,0.12)]',
            CAT_DOT[kind]
          )}
          title={categoryTitle}
          aria-hidden
        />

        {/* Header proses — 1 baris; teks panjang → ... (hover title = nama penuh) */}
        <div className="flex w-full min-w-0 shrink-0 items-center gap-1 overflow-hidden pr-5">
          <span className="inline-flex h-[1.15rem] w-[1.15rem] shrink-0 items-center justify-center rounded bg-gradient-to-b from-blue-600 to-blue-700 text-[0.58rem] font-black leading-none text-white">
            {node.no}
          </span>
          <h4
            className="m-0 block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(0.54rem,1.05vh,0.68rem)] font-extrabold leading-none text-blue-900"
            title={node.processName}
          >
            {node.processName}
          </h4>
        </div>

        {/* Isi: 50% kotak nama/qty, 50% SMV / AMV / Gap */}
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-[clamp(0.1rem,0.28vh,0.18rem)] overflow-hidden">
          <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_auto] items-stretch gap-[clamp(0.14rem,0.35vw,0.24rem)]">
            <div
              className={cn(
                'box-border flex h-full min-h-0 min-w-0 flex-col justify-center gap-[0.08rem] rounded-md border px-1.5 py-[clamp(0.08rem,0.22vh,0.16rem)]',
                cat.box
              )}
              title={`${node.operator} • NIK ${node.nik}`}
            >
              <span
                className={cn(
                  'block w-full truncate whitespace-nowrap text-[clamp(0.48rem,0.95vh,0.62rem)] font-extrabold leading-normal',
                  cat.name
                )}
              >
                {node.operator}
              </span>
              <span
                className={cn(
                  'block w-full truncate whitespace-nowrap text-[clamp(0.42rem,0.82vh,0.52rem)] font-bold leading-normal tabular-nums tracking-wide',
                  cat.nik
                )}
              >
                {node.nik}
              </span>
            </div>
            <div
              className={cn(
                'box-border flex h-full min-h-0 min-w-[clamp(2rem,4.5vw,2.65rem)] shrink-0 items-center justify-center rounded-md border px-1.5',
                cat.box
              )}
            >
              <strong className={cn('text-[clamp(0.85rem,1.15rem,1.25rem)] font-black leading-none', cat.qty)}>
                {node.qtyValue}
              </strong>
            </div>
          </div>

          <div className="grid h-full min-h-0 grid-cols-3 items-stretch gap-[clamp(0.1rem,0.22vh,0.16rem)]">
            <div className="flex h-full min-h-0 min-w-0 flex-col items-center justify-center gap-[clamp(0.1rem,0.22vh,0.2rem)] rounded border border-blue-100 bg-blue-50/80 px-1 py-[clamp(0.08rem,0.22vh,0.16rem)] text-center">
              <span className={METRIC_LABEL}>SMV</span>
              <b className={METRIC_VALUE}>{node.target.toFixed(2)}</b>
            </div>
            <div className="flex h-full min-h-0 min-w-0 flex-col items-center justify-center gap-[clamp(0.1rem,0.22vh,0.2rem)] rounded border border-blue-100 bg-blue-50/80 px-1 py-[clamp(0.08rem,0.22vh,0.16rem)] text-center">
              <span className={METRIC_LABEL}>AMV</span>
              <b className={cn(METRIC_VALUE, amvColor)}>{formatAmvMinutes(amvMinutes)}</b>
            </div>
            <div className="flex h-full min-h-0 min-w-0 flex-col items-center justify-center gap-[clamp(0.1rem,0.22vh,0.2rem)] rounded border border-blue-100 bg-blue-50/80 px-1 py-[clamp(0.08rem,0.22vh,0.16rem)] text-center">
              <span className={METRIC_LABEL}>Gap</span>
              <b className={cn(METRIC_VALUE, amvColor)}>
                {formatAmvGap(node.target, amvMinutes)}
              </b>
            </div>
          </div>
        </div>
      </article>
    );
  }
);

ProcessPanelCard.displayName = 'ProcessPanelCard';

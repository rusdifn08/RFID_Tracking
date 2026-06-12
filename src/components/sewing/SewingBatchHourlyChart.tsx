import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  buildBatchHourlyOutputSeries,
  normalizeHourlyBatchOutput,
  type BatchHourlyOutputPoint,
  type BatchHourlyOutputSeries,
} from '../../utils/sewingBatchHourlyOutput';
import { cn, FLUID } from './sewingBatchTw';

type SewingBatchHourlyChartProps = {
  data: BatchHourlyOutputPoint[];
  visibleBatchCount: number;
  className?: string;
  compact?: boolean;
};

const Y_DOMAIN: [number, number] = [12, 28];
const Y_TICKS = [12, 15, 18, 21, 24, 27];

const BatchToggleButton = memo(
  ({
    series,
    active,
    compact,
    onSelect,
  }: {
    series: BatchHourlyOutputSeries;
    active: boolean;
    compact: boolean;
    onSelect: (batch: number) => void;
  }) => (
    <button
      type="button"
      onClick={() => onSelect(series.batch)}
      aria-pressed={active}
      aria-label={
        active ? `Sembunyikan filter, tampilkan semua batch` : `Tampilkan ${series.label} saja`
      }
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-0.5 rounded border font-bold transition-all',
        compact
          ? 'px-[0.28rem] py-[0.1rem] text-[0.55rem]'
          : 'px-1.5 py-0.5 text-[0.65rem]',
        active
          ? 'border-current shadow-sm'
          : 'border-slate-200/90 bg-white/50 text-slate-400 opacity-55 hover:opacity-80'
      )}
      style={
        active
          ? {
              color: series.color,
              backgroundColor: `${series.color}18`,
              borderColor: `${series.color}55`,
            }
          : undefined
      }
    >
      <span
        className={cn('rounded-full', compact ? 'h-1.5 w-1.5' : 'h-2 w-2')}
        style={{ backgroundColor: active ? series.color : '#cbd5e1' }}
        aria-hidden
      />
      B{series.batch}
    </button>
  )
);

BatchToggleButton.displayName = 'BatchToggleButton';

const toggleBtnSizeClass = (compact: boolean) =>
  compact
    ? 'px-[0.28rem] py-[0.1rem] text-[0.55rem]'
    : 'px-1.5 py-0.5 text-[0.65rem]';

/** Ukur ruang header vs lebar 1 baris tombol — 4×2 hanya jika benar-benar overflow */
const useBatchToggleStacked = (
  batchCount: number,
  compact: boolean,
  headerRef: RefObject<HTMLDivElement | null>,
  measureRef: RefObject<HTMLDivElement | null>,
  slotRef: RefObject<HTMLDivElement | null>
): boolean => {
  const [stacked, setStacked] = useState(false);

  useLayoutEffect(() => {
    const header = headerRef.current;
    const measure = measureRef.current;
    const slot = slotRef.current;
    if (!header || !measure || !slot || batchCount < 5) {
      setStacked(false);
      return;
    }

    const evaluate = () => {
      const needed = measure.offsetWidth;
      const available = slot.clientWidth;
      setStacked(needed > available + 2);
    };

    const ro = new ResizeObserver(evaluate);
    ro.observe(header);
    ro.observe(slot);
    evaluate();
    return () => ro.disconnect();
  }, [batchCount, compact, headerRef, measureRef, slotRef]);

  return stacked;
};

const SewingBatchHourlyChart = memo(
  ({ data, visibleBatchCount, className, compact = false }: SewingBatchHourlyChartProps) => {
    const batchNos = useMemo(
      () => Array.from({ length: visibleBatchCount }, (_, i) => i + 1),
      [visibleBatchCount]
    );

    const series = useMemo(() => buildBatchHourlyOutputSeries(batchNos), [batchNos]);

    const chartData = useMemo(
      () => normalizeHourlyBatchOutput(data, batchNos),
      [data, batchNos]
    );

    const [focusedBatch, setFocusedBatch] = useState<number | null>(null);

    useEffect(() => {
      setFocusedBatch(null);
    }, [visibleBatchCount]);

    const selectBatch = useCallback((batchNo: number) => {
      setFocusedBatch((prev) => (prev === batchNo ? null : batchNo));
    }, []);

    const activeSeries = useMemo(
      () =>
        focusedBatch === null
          ? series
          : series.filter((s) => s.batch === focusedBatch),
      [series, focusedBatch]
    );

    const showDotLabels = activeSeries.length <= 3;

    const headerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const buttonsSlotRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLDivElement>(null);

    const stackedButtons = useBatchToggleStacked(
      series.length,
      compact,
      headerRef,
      measureRef,
      buttonsSlotRef
    );

    const stackedGridCols = series.length >= 7 ? 4 : 3;

    return (
      <section
        className={cn(
          'flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50/60 to-white shadow-sm',
          compact ? 'h-full p-[clamp(0.35rem,0.8vw,0.65rem)]' : 'min-h-[350px] p-6',
          className
        )}
        aria-label="Grafik trend output per jam per batch"
      >
        <div
          ref={headerRef}
          className={cn(
            'relative flex shrink-0 flex-nowrap items-start gap-x-2 min-w-0',
            compact ? 'mb-[clamp(0.2rem,0.45vh,0.35rem)]' : 'mb-4'
          )}
        >
          <div ref={titleRef} className="min-w-0 shrink-0">
            <h3
              className={cn(
                'm-0 font-bold text-blue-700',
                compact ? FLUID.heading : 'text-base'
              )}
            >
              Trend Output per Jam
            </h3>
          </div>

          {/* Pengukur lebar 1 baris — tidak terikat max-width slot */}
          <div
            ref={measureRef}
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 -z-10 flex flex-nowrap items-center gap-0.5 opacity-0"
          >
            {series.map((s) => (
              <span
                key={`measure-${s.batch}`}
                className={cn(
                  'inline-flex items-center gap-0.5 rounded border font-bold',
                  toggleBtnSizeClass(compact)
                )}
              >
                <span className={cn('rounded-full', compact ? 'h-1.5 w-1.5' : 'h-2 w-2')} />
                B{s.batch}
              </span>
            ))}
          </div>

          <div ref={buttonsSlotRef} className="min-w-0 flex-1">
            <div
              className={cn(
                stackedButtons && series.length >= 5
                  ? cn(
                      'grid justify-items-end gap-0.5',
                      stackedGridCols === 4 ? 'grid-cols-4 grid-rows-2' : 'grid-cols-3 grid-rows-2',
                      '[&_button]:w-full [&_button]:max-w-[2.65rem]'
                    )
                  : 'flex flex-nowrap items-center justify-end gap-0.5'
              )}
              role="group"
              aria-label="Pilih batch yang ditampilkan"
            >
              {series.map((s) => (
                <BatchToggleButton
                  key={s.batch}
                  series={s}
                  active={focusedBatch === null ? true : focusedBatch === s.batch}
                  compact={compact}
                  onSelect={selectBatch}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={
                compact
                  ? { top: showDotLabels ? 14 : 6, right: 6, left: 2, bottom: 0 }
                  : { top: showDotLabels ? 18 : 10, right: 12, left: 4, bottom: 0 }
              }
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: compact ? 9 : 11, fill: '#64748b', fontWeight: 600 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={{ stroke: '#cbd5e1' }}
                dy={compact ? 4 : 6}
                interval={0}
                angle={compact ? -35 : 0}
                textAnchor={compact ? 'end' : 'middle'}
                height={compact ? 36 : 30}
              />
              <YAxis
                domain={Y_DOMAIN}
                ticks={Y_TICKS}
                tick={{ fontSize: compact ? 9 : 11, fill: '#64748b', fontWeight: 600 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={{ stroke: '#cbd5e1' }}
                width={compact ? 26 : 32}
                tickFormatter={(v) => String(v)}
                label={
                  compact
                    ? undefined
                    : {
                        value: 'pcs',
                        angle: -90,
                        position: 'insideLeft',
                        style: { fill: '#94a3b8', fontSize: 10, fontWeight: 600 },
                      }
                }
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
                  fontSize: compact ? 10 : 12,
                  fontWeight: 600,
                }}
                labelStyle={{ color: '#0f172a', fontWeight: 700, marginBottom: 2 }}
                formatter={(value: number, name: string) => [`${value} pcs`, name]}
              />
              {activeSeries.map((s) => (
                <Line
                  key={s.batch}
                  type="monotone"
                  dataKey={s.dataKey}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={compact ? 2 : 2.5}
                  dot={{
                    r: compact ? 3 : 3.5,
                    fill: s.color,
                    stroke: '#fff',
                    strokeWidth: 1.5,
                  }}
                  activeDot={{
                    r: compact ? 4.5 : 5,
                    strokeWidth: 2,
                    stroke: '#fff',
                    fill: s.color,
                  }}
                  connectNulls
                  isAnimationActive={false}
                >
                  {showDotLabels ? (
                    <LabelList
                      dataKey={s.dataKey}
                      position="top"
                      offset={compact ? 6 : 8}
                      formatter={(v: any) => v}
                      style={{
                        fontSize: compact ? 8 : 9,
                        fontWeight: 700,
                        fill: s.color,
                      }}
                    />
                  ) : null}
                </Line>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    );
  }
);

SewingBatchHourlyChart.displayName = 'SewingBatchHourlyChart';

export default SewingBatchHourlyChart;

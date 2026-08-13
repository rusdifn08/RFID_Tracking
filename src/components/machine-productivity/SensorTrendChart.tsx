import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Brush,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Download, RefreshCw } from 'lucide-react';

export type TrendHours = 1 | 3 | 6 | 'today';

type Props = {
    machineId: string;
    apiBase: string;
    sensor: 'pzem' | 'adxl';
    /** Controlled filter (compare sync) */
    hours?: TrendHours | 'custom';
    fromLocal?: string;
    toLocal?: string;
    onRangeChange?: (next: {
        hours: TrendHours | 'custom';
        fromLocal: string;
        toLocal: string;
    }) => void;
    /** Sembunyikan kontrol filter (pakai shared bar di parent) */
    hideFilters?: boolean;
    compact?: boolean;
    /** Interval refresh data grafik (ms). Default 12 dtk. */
    refreshMs?: number;
    className?: string;
    /** Warna garis arus per status (off/idle/running) */
    colorByStatus?: boolean;
    currentThresholdA?: number;
    offCurrentA?: number;
    /** Callback titik arus (untuk KPI dari grafik) */
    onPointsChange?: (points: Array<{ ts: string; current_a?: number; value?: number }>) => void;
    /** Override titik (simulasi) — skip fetch API */
    pointsOverride?: Array<{
        ts: string;
        label: string;
        value: number;
        current_a?: number;
        power_w?: number;
        voltage_v?: number;
        current_off?: number | null;
        current_idle?: number | null;
        current_run?: number | null;
    }>;
};

type Point = {
    ts: string;
    label: string;
    value: number;
    current_a?: number;
    power_w?: number;
    voltage_v?: number;
    magnitude_g?: number;
    ax?: number;
    ay?: number;
    az?: number;
    current_off?: number | null;
    current_idle?: number | null;
    current_run?: number | null;
};

function pzemBand(a: number, offA: number, runA: number): 'off' | 'idle' | 'run' {
    if (a < offA) return 'off';
    if (a >= runA) return 'run';
    return 'idle';
}

/** Pecah arus jadi 3 series berwarna; bridge di batas status agar garis nyambung. */
function colorizeCurrent(
    rows: Point[],
    offA: number,
    runA: number,
): Point[] {
    const bands = rows.map((p) => pzemBand(Number(p.current_a ?? p.value ?? 0), offA, runA));
    return rows.map((p, i) => {
        const a = Number(p.current_a ?? p.value ?? 0);
        const st = bands[i];
        const out: Point = {
            ...p,
            current_off: null,
            current_idle: null,
            current_run: null,
        };
        const put = (b: 'off' | 'idle' | 'run', v: number) => {
            if (b === 'off') out.current_off = v;
            else if (b === 'idle') out.current_idle = v;
            else out.current_run = v;
        };
        put(st, a);
        if (i > 0 && bands[i - 1] !== st) put(bands[i - 1], a);
        return out;
    });
}

type MetricKey = string;

function pad2(n: number) {
    return String(n).padStart(2, '0');
}

/** datetime-local value dari Date */
function toLocalInput(d: Date) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function fmtAxis(iso: string) {
    try {
        const d = new Date(iso);
        return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    } catch {
        return iso;
    }
}

function fmtTip(iso: string) {
    try {
        return new Date(iso).toLocaleString('id-ID');
    } catch {
        return iso;
    }
}

function mapTelemetryRows(sensor: 'pzem' | 'adxl', data: any): Point[] {
    const src = sensor === 'pzem' ? (data?.pzem ?? []) : (data?.adxl ?? []);
    return src
        .map((p: Record<string, number | string>) => ({
            ...p,
            ts: String(p.ts),
            label: fmtAxis(String(p.ts)),
            value: Number(sensor === 'pzem' ? p.current_a ?? 0 : p.magnitude_g ?? 0),
        }))
        .sort((a: Point, b: Point) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
}

const PZEM_METRICS: Array<{ key: MetricKey; label: string; color: string; unit: string }> = [
    { key: 'current_a', label: 'Arus', color: '#0284c7', unit: 'A' },
    { key: 'power_w', label: 'Daya', color: '#ea580c', unit: 'W' },
    { key: 'voltage_v', label: 'Tegangan', color: '#7c3aed', unit: 'V' },
];

const ADXL_METRICS: Array<{ key: MetricKey; label: string; color: string; unit: string }> = [
    { key: 'magnitude_g', label: 'VIB', color: '#0d9488', unit: 'Δ' },
    { key: 'ax', label: 'Axis X', color: '#2563eb', unit: 'm/s²' },
    { key: 'ay', label: 'Axis Y', color: '#ca8a04', unit: 'm/s²' },
    { key: 'az', label: 'Axis Z', color: '#db2777', unit: 'm/s²' },
];

function exportSvgPng(svg: SVGSVGElement, filename: string) {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const bbox = svg.getBoundingClientRect();
    const w = Math.max(640, Math.ceil(bbox.width) || 640);
    const h = Math.max(280, Math.ceil(bbox.height) || 280);
    clone.setAttribute('width', String(w));
    clone.setAttribute('height', String(h));
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const xml = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            URL.revokeObjectURL(url);
            return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = filename;
        a.click();
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
}

export default function SensorTrendChart({
    machineId,
    apiBase,
    sensor,
    hours: hoursProp,
    fromLocal: fromProp,
    toLocal: toProp,
    onRangeChange,
    hideFilters = false,
    compact = false,
    refreshMs = 30_000,
    className = '',
    colorByStatus = false,
    currentThresholdA = 0.6,
    offCurrentA = 0.03,
    onPointsChange,
    pointsOverride,
}: Props) {
    const isPzem = sensor === 'pzem';
    const metrics = isPzem ? PZEM_METRICS : ADXL_METRICS;
    const primaryKey = isPzem ? 'current_a' : 'magnitude_g';

    const [hours, setHours] = useState<TrendHours | 'custom'>(hoursProp ?? 1);
    const [fromLocal, setFromLocal] = useState(fromProp ?? '');
    const [toLocal, setToLocal] = useState(toProp ?? '');
    const [points, setPoints] = useState<Point[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
        const init: Record<string, boolean> = {};
        metrics.forEach((m) => {
            init[m.key] = m.key === primaryKey;
        });
        return init;
    });
    const chartRef = useRef<HTMLDivElement>(null);

    // sync controlled props
    useEffect(() => {
        if (hoursProp != null) setHours(hoursProp);
    }, [hoursProp]);
    useEffect(() => {
        if (fromProp != null) setFromLocal(fromProp);
    }, [fromProp]);
    useEffect(() => {
        if (toProp != null) setToLocal(toProp);
    }, [toProp]);

    // Simulasi: pakai pointsOverride hanya jika ada titik; kosong → fetch telemetry real
    useEffect(() => {
        if (!pointsOverride || pointsOverride.length === 0) return;
        setPoints(
            pointsOverride.map((p) => ({
                ...p,
                ts: String(p.ts),
                label: p.label || fmtAxis(String(p.ts)),
                value: Number(p.current_a ?? p.value ?? 0),
            })),
        );
        setLoading(false);
        setErr(null);
    }, [pointsOverride]);

    const emitRange = useCallback(
        (nextHours: TrendHours | 'custom', nextFrom: string, nextTo: string) => {
            onRangeChange?.({ hours: nextHours, fromLocal: nextFrom, toLocal: nextTo });
        },
        [onRangeChange]
    );

    const applyPreset = (h: TrendHours) => {
        setHours(h);
        setFromLocal('');
        setToLocal('');
        emitRange(h, '', '');
    };

    const applyCustom = () => {
        if (!fromLocal || !toLocal) return;
        setHours('custom');
        emitRange('custom', fromLocal, toLocal);
    };

    const load = useCallback(async () => {
        setLoading(true);
        setErr(null);
        try {
            const params = new URLSearchParams({ sensor });
            if (hours === 'today') {
                const now = new Date();
                const start = new Date(now);
                start.setHours(0, 0, 0, 0);
                params.set('from_ts', start.toISOString());
                params.set('to_ts', now.toISOString());
            } else if (hours === 'custom' && fromLocal && toLocal) {
                params.set('from_ts', new Date(fromLocal).toISOString());
                params.set('to_ts', new Date(toLocal).toISOString());
            } else if (hours !== 'custom') {
                params.set('hours', String(hours));
            } else {
                params.set('hours', '1');
            }
            const res = await fetch(`${apiBase}/api/machines/${machineId}/telemetry-series?${params}`);
            if (res.ok) {
                const data = await res.json();
                const rows: Point[] = (data.points ?? []).map((p: Record<string, number | string>) => ({
                    ...p,
                    ts: String(p.ts),
                    label: fmtAxis(String(p.ts)),
                    value: Number(p.value ?? 0),
                }));
                if (rows.length > 0) {
                    setPoints(rows);
                    return;
                }
            } else if (res.status !== 404) {
                throw new Error(await res.text());
            }

            // Fallback untuk backend lama (tanpa endpoint telemetry-series): ambil telemetry terbaru.
            // ponytail: limit endpoint ini max 1000 dari backend, cukup untuk chart realtime saat ini.
            const fallback = await fetch(
                `${apiBase}/api/machines/${machineId}/telemetry?limit=${hours === 6 ? 1000 : hours === 3 ? 700 : 400}`
            );
            if (!fallback.ok) throw new Error(await fallback.text());
            const fallbackData = await fallback.json();
            const rows = mapTelemetryRows(sensor, fallbackData);
            setPoints(rows);
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'Gagal memuat grafik');
            setPoints([]);
        } finally {
            setLoading(false);
        }
    }, [apiBase, machineId, sensor, hours, fromLocal, toLocal]);

    useEffect(() => {
        onPointsChange?.(points);
    }, [points, onPointsChange]);

    useEffect(() => {
        if (pointsOverride && pointsOverride.length > 0) return;
        void load();
        const t = setInterval(() => void load(), refreshMs);
        return () => clearInterval(t);
    }, [load, refreshMs, pointsOverride]);

    const activeMetrics = useMemo(() => metrics.filter((m) => enabled[m.key]), [metrics, enabled]);

    const chartPoints = useMemo(() => {
        if (!isPzem || !colorByStatus || !enabled.current_a) return points;
        const offA = offCurrentA > 0 ? offCurrentA : 0.03;
        const runA = currentThresholdA > offA ? currentThresholdA : offA + 0.001;
        return colorizeCurrent(points, offA, runA);
    }, [points, isPzem, colorByStatus, enabled.current_a, offCurrentA, currentThresholdA]);

    const showStatusLines = isPzem && colorByStatus && !!enabled.current_a;

    const title = isPzem ? 'Fluktuasi arus (PZEM)' : 'Fluktuasi VIB (ADXL)';
    const accentBorder = isPzem ? 'border-sky-200' : 'border-teal-200';
    const accentBtn = isPzem
        ? 'bg-sky-600 text-white border-sky-600'
        : 'bg-teal-600 text-white border-teal-600';
    const accentIdle = 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50';

    const onExport = () => {
        const svg = chartRef.current?.querySelector('svg');
        if (!svg) return;
        const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
        exportSvgPng(svg, `${sensor}_trend_${stamp}.png`);
    };

    return (
        <section
            className={`rounded-2xl border ${accentBorder} bg-white shadow-sm overflow-hidden ${className}`}
        >
            <div className="px-3 md:px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h3 className="text-sm font-bold text-slate-800">{title}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                        Rata-rata per menit + titik saat ini · drag brush untuk zoom · {points.length} titik
                        {loading ? ' · memuat…' : ''}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => void load()}
                        className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden />
                    </button>
                    <button
                        type="button"
                        onClick={onExport}
                        disabled={points.length === 0}
                        className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        title="Export PNG"
                    >
                        <Download className="h-3.5 w-3.5" aria-hidden />
                        PNG
                    </button>
                </div>
            </div>

            {!hideFilters && (
                <div className="px-3 md:px-4 py-2.5 border-b border-slate-50 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                        {([1, 3, 6] as TrendHours[]).map((h) => (
                            <button
                                key={h}
                                type="button"
                                onClick={() => applyPreset(h)}
                                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border ${
                                    hours === h ? accentBtn : accentIdle
                                }`}
                            >
                                {h} jam
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => {
                                const now = new Date();
                                const from = new Date(now.getTime() - 60 * 60 * 1000);
                                const f = toLocalInput(from);
                                const t = toLocalInput(now);
                                setFromLocal(f);
                                setToLocal(t);
                                setHours('custom');
                                emitRange('custom', f, t);
                            }}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border ${
                                hours === 'custom' ? accentBtn : accentIdle
                            }`}
                        >
                            Custom
                        </button>
                    </div>
                    {hours === 'custom' && (
                        <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-end">
                            <label className="text-[10px] text-slate-500 flex-1 min-w-[140px]">
                                Dari
                                <input
                                    type="datetime-local"
                                    value={fromLocal}
                                    onChange={(e) => setFromLocal(e.target.value)}
                                    className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                                />
                            </label>
                            <label className="text-[10px] text-slate-500 flex-1 min-w-[140px]">
                                Sampai
                                <input
                                    type="datetime-local"
                                    value={toLocal}
                                    onChange={(e) => setToLocal(e.target.value)}
                                    className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={applyCustom}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${accentBtn}`}
                            >
                                Terapkan
                            </button>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-0.5">
                        {metrics.map((m) => (
                            <label
                                key={m.key}
                                className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer select-none"
                            >
                                <input
                                    type="checkbox"
                                    checked={!!enabled[m.key]}
                                    onChange={() =>
                                        setEnabled((prev) => {
                                            const next = { ...prev, [m.key]: !prev[m.key] };
                                            // minimal 1 metric
                                            if (!Object.values(next).some(Boolean)) return prev;
                                            return next;
                                        })
                                    }
                                    className="rounded border-slate-300"
                                />
                                <span className="font-semibold" style={{ color: m.color }}>
                                    {m.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {hideFilters && (
                <div className="px-3 md:px-4 py-2 border-b border-slate-50 flex flex-wrap gap-2">
                    {metrics.map((m) => (
                        <label
                            key={m.key}
                            className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer select-none"
                        >
                            <input
                                type="checkbox"
                                checked={!!enabled[m.key]}
                                onChange={() =>
                                    setEnabled((prev) => {
                                        const next = { ...prev, [m.key]: !prev[m.key] };
                                        if (!Object.values(next).some(Boolean)) return prev;
                                        return next;
                                    })
                                }
                                className="rounded border-slate-300"
                            />
                            <span className="font-semibold" style={{ color: m.color }}>
                                {m.label}
                            </span>
                        </label>
                    ))}
                </div>
            )}

            <div ref={chartRef} className={`w-full ${compact ? 'h-56' : 'h-72 md:h-80'} px-1 pb-1`}>
                {err ? (
                    <p className="p-4 text-sm text-rose-600">{err}</p>
                ) : points.length === 0 ? (
                    <p className="p-6 text-sm text-center text-slate-400">
                        Belum ada data di rentang ini. Pastikan sensor mengirim MQTT.
                    </p>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartPoints} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                minTickGap={28}
                            />
                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={44} />
                            <Tooltip
                                labelFormatter={(_, payload) => {
                                    const ts = payload?.[0]?.payload?.ts;
                                    return ts ? fmtTip(ts) : '';
                                }}
                                contentStyle={{
                                    fontSize: 12,
                                    borderRadius: 8,
                                    border: '1px solid #e2e8f0',
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            {showStatusLines && (
                                <>
                                    <Line
                                        type="monotone"
                                        dataKey="current_off"
                                        name="Mati (A)"
                                        stroke="#dc2626"
                                        strokeWidth={2.25}
                                        dot={false}
                                        isAnimationActive={false}
                                        connectNulls={false}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="current_idle"
                                        name="Idle (A)"
                                        stroke="#2563eb"
                                        strokeWidth={2.25}
                                        dot={false}
                                        isAnimationActive={false}
                                        connectNulls={false}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="current_run"
                                        name="Running (A)"
                                        stroke="#16a34a"
                                        strokeWidth={2.25}
                                        dot={false}
                                        isAnimationActive={false}
                                        connectNulls={false}
                                    />
                                </>
                            )}
                            {activeMetrics
                                .filter((m) => !(showStatusLines && m.key === 'current_a'))
                                .map((m) => (
                                <Line
                                    key={m.key}
                                    type="monotone"
                                    dataKey={m.key}
                                    name={`${m.label} (${m.unit})`}
                                    stroke={m.color}
                                    strokeWidth={m.key === primaryKey ? 2.25 : 1.5}
                                    dot={false}
                                    isAnimationActive={false}
                                    connectNulls
                                />
                            ))}
                            <Brush
                                dataKey="label"
                                height={22}
                                stroke={isPzem ? '#0284c7' : '#0d9488'}
                                travellerWidth={8}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </section>
    );
}

/** Shared filter bar untuk Compare (satu kontrol, chart PZEM) */
export function TrendRangeBar({
    hours,
    fromLocal,
    toLocal,
    onChange,
    onResetBoth,
    resetting = false,
    resetLabel = 'Reset PZEM',
    resetConfirm = 'Reset waktu PZEM hari ini?\nRekap disimpan ke database. Counter dashboard & ESP di-nolkan via MQTT.',
}: {
    hours: TrendHours | 'custom';
    fromLocal: string;
    toLocal: string;
    onChange: (next: { hours: TrendHours | 'custom'; fromLocal: string; toLocal: string }) => void;
    onResetBoth?: () => void | Promise<void>;
    resetting?: boolean;
    resetLabel?: string;
    resetConfirm?: string;
}) {
    return (
        <div className="rounded-2xl border border-violet-200 bg-white p-3 md:p-4 shadow-sm space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-700">Rentang grafik fluktuasi</p>
                {onResetBoth && (
                    <button
                        type="button"
                        disabled={resetting}
                        onClick={() => {
                            if (!confirm(resetConfirm)) {
                                return;
                            }
                            void onResetBoth();
                        }}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                        <svg
                            className={`h-3.5 w-3.5 ${resetting ? 'animate-spin' : ''}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden
                        >
                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                            <path d="M21 3v5h-5" />
                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                            <path d="M3 21v-5h5" />
                        </svg>
                        {resetting ? 'Reset…' : resetLabel}
                    </button>
                )}
            </div>
            <div className="flex flex-wrap gap-1.5">
                <button
                    type="button"
                    onClick={() => onChange({ hours: 'today', fromLocal: '', toLocal: '' })}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border ${
                        hours === 'today'
                            ? 'bg-violet-600 text-white border-violet-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    Hari ini
                </button>
                {([1, 3, 6] as const).map((h) => (
                    <button
                        key={h}
                        type="button"
                        onClick={() => onChange({ hours: h, fromLocal: '', toLocal: '' })}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border ${
                            hours === h
                                ? 'bg-violet-600 text-white border-violet-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        {h} jam
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => {
                        const now = new Date();
                        const from = new Date(now.getTime() - 60 * 60 * 1000);
                        onChange({
                            hours: 'custom',
                            fromLocal: toLocalInput(from),
                            toLocal: toLocalInput(now),
                        });
                    }}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border ${
                        hours === 'custom'
                            ? 'bg-violet-600 text-white border-violet-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    Custom
                </button>
            </div>
            {hours === 'custom' && (
                <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-end">
                    <label className="text-[10px] text-slate-500 flex-1 min-w-[140px]">
                        Dari
                        <input
                            type="datetime-local"
                            value={fromLocal}
                            onChange={(e) =>
                                onChange({ hours: 'custom', fromLocal: e.target.value, toLocal })
                            }
                            className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                        />
                    </label>
                    <label className="text-[10px] text-slate-500 flex-1 min-w-[140px]">
                        Sampai
                        <input
                            type="datetime-local"
                            value={toLocal}
                            onChange={(e) =>
                                onChange({ hours: 'custom', fromLocal, toLocal: e.target.value })
                            }
                            className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                        />
                    </label>
                </div>
            )}
        </div>
    );
}

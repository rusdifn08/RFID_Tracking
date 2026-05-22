import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarRange, ClipboardList, Layers, Loader2, MapPin, Truck } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ChartCard from '../components/dashboard/ChartCard';
import backgroundImage from '../assets/background.jpg';
import { getCuttingScanState, type CuttingScanHistoryEntry } from '../config/api';

const QUERY_SUPPLY_CUTTING = ['supply-sewing-cutting-dashboard'] as const;
const SHIFT_HOURS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

const SUPPLY_CHART = {
    gm1: '#7c3aed',
    gm2: '#a855f7',
    other: '#5b21b6',
} as const;

const SUPPLY_TYPO = {
    stationTitle: 'clamp(0.78rem, 4.2cqw, 1.28rem)',
    stationValue: 'clamp(2.1rem, 21cqw, 6.4rem)',
    tableHeader: '12px',
    tableBody: '11px',
    chartTick: 'clamp(9px, 6px + 0.55vmin, 13px)',
    chartTooltip: 'clamp(10px, 8px + 0.45vmin, 13px)',
} as const;

function ymdTodayLocal(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function formatYmdIdLabel(ymd: string): string {
    const [y, mo, da] = ymd.split('-').map((x) => Number(x));
    if (!y || !mo || !da) return ymd;
    const d = new Date(y, mo - 1, da);
    if (Number.isNaN(d.getTime())) return ymd;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ymdFromIso(iso: string | undefined): string | null {
    if (iso == null || String(iso).trim() === '') return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function inYmdRange(ymd: string, from: string, to: string): boolean {
    return ymd >= from && ymd <= to;
}

function safeNum(v: unknown): number {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
}

function getLocalHourLabel(iso: string): string | null {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const h = String(d.getHours()).padStart(2, '0');
    return `${h}:00`;
}

function formatIsoShort(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function normalizeGm(h: CuttingScanHistoryEntry): 'GM 1' | 'GM 2' | 'other' {
    const raw = String(h.gm ?? h.location ?? '').trim().toUpperCase();
    if (raw === 'GM 1' || raw.includes('GM1')) return 'GM 1';
    if (raw === 'GM 2' || raw.includes('GM2')) return 'GM 2';
    return 'other';
}

function StationStatusCard({
    title,
    value,
    valueClassName,
    icon,
    iconClassName,
    cardClassName,
    watermarkIcon,
}: {
    title: string;
    value: number;
    valueClassName: string;
    icon: React.ReactNode;
    iconClassName: string;
    cardClassName: string;
    watermarkIcon: React.ReactNode;
}) {
    return (
        <div
            className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm h-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${cardClassName}`}
            style={{ containerType: 'inline-size' }}
        >
            <div className="relative z-[2] flex items-start justify-between gap-2">
                <h3
                    className="font-extrabold tracking-[0.12em] text-slate-600 uppercase"
                    style={{ fontSize: SUPPLY_TYPO.stationTitle }}
                >
                    {title}
                </h3>
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm ${iconClassName}`}>
                    {icon}
                </div>
            </div>
            <div className="absolute inset-0 z-[2] flex items-center justify-center pt-4">
                <div
                    className={`font-extrabold tabular-nums leading-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.12)] ${valueClassName}`}
                    style={{ fontSize: SUPPLY_TYPO.stationValue }}
                >
                    {value}
                </div>
            </div>
            <div className="pointer-events-none absolute -bottom-1 -right-1 z-[1] opacity-10">{watermarkIcon}</div>
        </div>
    );
}

function BundleCard({ value }: { value: number }) {
    return (
        <div
            className="relative overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-b from-violet-50/70 to-fuchsia-50/50 p-4 shadow-sm h-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            style={{ containerType: 'inline-size' }}
        >
            <div className="relative z-[2] flex items-start justify-between gap-2">
                <h3
                    className="font-extrabold tracking-[0.12em] text-violet-700 uppercase"
                    style={{ fontSize: SUPPLY_TYPO.stationTitle }}
                >
                    Jumlah Bundle
                </h3>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-600 shadow-sm">
                    <Layers className="h-5 w-5" />
                </div>
            </div>
            <div className="absolute inset-0 z-[2] flex items-center justify-center pt-4">
                <div
                    className="font-extrabold tabular-nums leading-none text-violet-700 drop-shadow-[0_2px_3px_rgba(0,0,0,0.12)]"
                    style={{ fontSize: SUPPLY_TYPO.stationValue }}
                >
                    {value}
                </div>
            </div>
            <div className="pointer-events-none absolute -bottom-1 -right-1 z-[1] opacity-10">
                <Layers className="h-24 w-24 text-violet-400" />
            </div>
        </div>
    );
}

export default function DashboardSupplySewingCutting() {
    const [rangeFrom, setRangeFrom] = useState(ymdTodayLocal);
    const [rangeTo, setRangeTo] = useState(ymdTodayLocal);
    const [filterOpen, setFilterOpen] = useState(false);
    const [draftFrom, setDraftFrom] = useState(ymdTodayLocal);
    const [draftTo, setDraftTo] = useState(ymdTodayLocal);
    const filterPanelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!filterOpen) return;
        const onDoc = (e: MouseEvent) => {
            const el = filterPanelRef.current;
            if (el && !el.contains(e.target as Node)) setFilterOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [filterOpen]);

    const openFilterPanel = () => {
        setDraftFrom(rangeFrom);
        setDraftTo(rangeTo);
        setFilterOpen(true);
    };

    const applyDateFilter = () => {
        let a = draftFrom;
        let b = draftTo;
        if (a > b) [a, b] = [b, a];
        setRangeFrom(a);
        setRangeTo(b);
        setFilterOpen(false);
    };

    const resetDateFilterToday = () => {
        const t = ymdTodayLocal();
        setDraftFrom(t);
        setDraftTo(t);
        setRangeFrom(t);
        setRangeTo(t);
        setFilterOpen(false);
    };

    const filterSummaryLabel =
        rangeFrom === rangeTo
            ? formatYmdIdLabel(rangeFrom)
            : `${formatYmdIdLabel(rangeFrom)} – ${formatYmdIdLabel(rangeTo)}`;

    const scanQuery = useQuery({
        queryKey: QUERY_SUPPLY_CUTTING,
        queryFn: async () => {
            const r = await getCuttingScanState();
            if (!r.success || !r.data) throw new Error(r.error || 'Gagal memuat data Supply Sewing');
            return r.data;
        },
        refetchInterval: 12_000,
    });

    const supplyRows = useMemo(() => {
        const rows = scanQuery.data?.supply.history ?? [];
        const filtered = rows.filter((r) => {
            const ymd = ymdFromIso(r.at);
            return ymd != null && inYmdRange(ymd, rangeFrom, rangeTo);
        });
        return [...filtered].sort((a, b) => {
            const ta = new Date(a.at || '').getTime();
            const tb = new Date(b.at || '').getTime();
            return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
        });
    }, [scanQuery.data, rangeFrom, rangeTo]);

    const metrics = useMemo(() => {
        const bundleSet = new Set<string>();
        let gm1 = 0;
        let gm2 = 0;
        let other = 0;
        for (const r of supplyRows) {
            const rid = String(r.rfid_garment || '').trim();
            if (rid) bundleSet.add(rid);
            const g = normalizeGm(r);
            if (g === 'GM 1') gm1 += 1;
            else if (g === 'GM 2') gm2 += 1;
            else other += 1;
        }
        return {
            bundle: bundleSet.size,
            gm1,
            gm2,
            total: supplyRows.length,
            other,
        };
    }, [supplyRows]);

    const perHourRows = useMemo(() => {
        const empty = () => ({ gm1: 0, gm2: 0, other: 0 });
        const buckets: Record<string, { gm1: number; gm2: number; other: number }> = Object.fromEntries(
            SHIFT_HOURS.map((h) => [h, empty()])
        );
        for (const r of supplyRows) {
            const h = getLocalHourLabel(r.at || '');
            if (!h || buckets[h] == null) continue;
            const g = normalizeGm(r);
            if (g === 'GM 1') buckets[h].gm1 += 1;
            else if (g === 'GM 2') buckets[h].gm2 += 1;
            else buckets[h].other += 1;
        }
        return SHIFT_HOURS.map((jam) => ({ jam, ...buckets[jam] }));
    }, [supplyRows]);

    return (
        <div className="flex h-screen w-full font-sans text-slate-800 bg-slate-50 overflow-hidden selection:bg-violet-100 selection:text-violet-900">
            <div
                className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
                style={{ backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover' }}
            />

            <div className="fixed left-0 top-0 h-full z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300">
                <Sidebar />
            </div>

            <div
                className="flex flex-col h-full min-h-0 relative z-10 transition-all duration-300 ease-in-out"
                style={{ marginLeft: 'var(--layout-sidebar-offset)', width: 'var(--layout-sidebar-width)' }}
            >
                <Header />

                <main className="flex flex-col flex-1 min-h-0 w-full overflow-hidden bg-slate-50/50 px-2 md:px-3 pb-2 md:pb-3 pt-10 xs:pt-12 sm:pt-14 md:pt-[3.5rem] lg:pt-[4.5rem]">
                    <div
                        className="h-full min-h-0 flex flex-col md:grid md:grid-rows-[minmax(0,2fr)_minmax(0,3fr)]"
                        style={{ gap: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.625rem)' }}
                    >
                        <section className="min-h-0 h-full">
                            <div
                                className="grid h-full min-h-0 grid-cols-2 lg:grid-cols-4 gap-2"
                                style={{ gap: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.625rem)' }}
                            >
                                <BundleCard value={metrics.bundle} />
                                <StationStatusCard
                                    title="GM 1"
                                    value={metrics.gm1}
                                    valueClassName="text-violet-700"
                                    icon={<MapPin className="h-5 w-5" />}
                                    iconClassName="border-violet-200 bg-white text-violet-600"
                                    cardClassName="border-violet-200/80 bg-[#f5f3ff]"
                                    watermarkIcon={<MapPin className="h-24 w-24 text-violet-400" />}
                                />
                                <StationStatusCard
                                    title="GM 2"
                                    value={metrics.gm2}
                                    valueClassName="text-fuchsia-700"
                                    icon={<MapPin className="h-5 w-5" />}
                                    iconClassName="border-fuchsia-200 bg-white text-fuchsia-600"
                                    cardClassName="border-fuchsia-200/80 bg-[#fdf4ff]"
                                    watermarkIcon={<MapPin className="h-24 w-24 text-fuchsia-400" />}
                                />
                                <StationStatusCard
                                    title="Total Scan"
                                    value={metrics.total}
                                    valueClassName="text-indigo-700"
                                    icon={<Truck className="h-5 w-5" />}
                                    iconClassName="border-indigo-200 bg-white text-indigo-600"
                                    cardClassName="border-indigo-200/80 bg-[#eef2ff]"
                                    watermarkIcon={<Truck className="h-24 w-24 text-indigo-400" />}
                                />
                            </div>
                        </section>

                        <section className="min-h-0 h-full">
                            <div
                                className="grid grid-cols-1 lg:grid-cols-3 gap-2 h-full min-h-0"
                                style={{ gap: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.625rem)' }}
                            >
                                <ChartCard
                                    title="Data Per Jam"
                                    icon={Layers}
                                    iconColor="#5b21b6"
                                    iconBgColor="#ede9fe"
                                    className="min-h-0 h-full flex flex-col py-1.5 bg-gradient-to-b from-white via-white to-violet-50/30 shadow-[0_10px_22px_rgba(91,33,182,0.08)] hover:shadow-[0_14px_28px_rgba(91,33,182,0.14)] transition-all duration-300 border border-violet-100/70 lg:col-span-1"
                                >
                                    <div className="w-full flex-1 min-h-0 min-w-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={perHourRows} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis
                                                    dataKey="jam"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#64748b', fontSize: SUPPLY_TYPO.chartTick }}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#64748b', fontSize: SUPPLY_TYPO.chartTick }}
                                                    width={34}
                                                    domain={[0, 'auto']}
                                                />
                                                <Tooltip
                                                    formatter={(value: number, name: string) => [value, name]}
                                                    labelFormatter={(label) => `Jam ${label}`}
                                                    contentStyle={{
                                                        borderRadius: 10,
                                                        border: '1px solid #e2e8f0',
                                                        fontSize: SUPPLY_TYPO.chartTooltip,
                                                        boxShadow: '0 8px 18px rgba(15,23,42,0.08)',
                                                    }}
                                                />
                                                <Legend
                                                    wrapperStyle={{ fontSize: SUPPLY_TYPO.chartTick, paddingTop: 4 }}
                                                    formatter={(value) => <span className="text-slate-600">{value}</span>}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="gm1"
                                                    name="GM 1"
                                                    stroke={SUPPLY_CHART.gm1}
                                                    strokeWidth={2.25}
                                                    dot={{ r: 2, strokeWidth: 1, fill: SUPPLY_CHART.gm1 }}
                                                    activeDot={{ r: 4 }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="gm2"
                                                    name="GM 2"
                                                    stroke={SUPPLY_CHART.gm2}
                                                    strokeWidth={2.25}
                                                    dot={{ r: 2, strokeWidth: 1, fill: SUPPLY_CHART.gm2 }}
                                                    activeDot={{ r: 4 }}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="other"
                                                    name="Lainnya"
                                                    stroke={SUPPLY_CHART.other}
                                                    strokeWidth={2}
                                                    strokeDasharray="4 4"
                                                    dot={{ r: 2, strokeWidth: 1, fill: SUPPLY_CHART.other }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </ChartCard>

                                <ChartCard
                                    title="Tabel Supply Sewing"
                                    icon={ClipboardList}
                                    iconColor="#5b21b6"
                                    iconBgColor="#ede9fe"
                                    headerAction={
                                        <div className="flex items-center gap-2 flex-wrap justify-end">
                                            {scanQuery.isFetching ? (
                                                <Loader2 className="h-4 w-4 animate-spin text-violet-600" aria-hidden />
                                            ) : null}
                                            {scanQuery.error ? (
                                                <span
                                                    className="text-rose-600 text-xs font-medium max-w-[14rem] truncate"
                                                    title={(scanQuery.error as Error).message}
                                                >
                                                    {(scanQuery.error as Error).message}
                                                </span>
                                            ) : null}
                                            <div className="relative" ref={filterPanelRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => (filterOpen ? setFilterOpen(false) : openFilterPanel())}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-violet-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-violet-800 shadow-sm ring-1 ring-slate-900/5 transition hover:border-violet-400 hover:bg-violet-50/80 hover:text-violet-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
                                                >
                                                    <CalendarRange className="h-3.5 w-3.5 text-violet-600 shrink-0" aria-hidden />
                                                    <span className="whitespace-nowrap">{filterSummaryLabel}</span>
                                                </button>
                                                {filterOpen ? (
                                                    <div
                                                        className="absolute right-0 top-full z-[60] mt-1.5 w-[min(100vw-1.5rem,17.5rem)] rounded-xl border border-slate-200/90 bg-white p-3 shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5"
                                                        role="dialog"
                                                        aria-label="Filter tanggal Supply Sewing"
                                                    >
                                                        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                                            Rentang tanggal
                                                        </p>
                                                        <div className="space-y-2">
                                                            <label className="block">
                                                                <span className="text-[0.7rem] font-medium text-slate-600">Dari</span>
                                                                <input
                                                                    type="date"
                                                                    value={draftFrom}
                                                                    onChange={(e) => setDraftFrom(e.target.value)}
                                                                    className="mt-0.5 w-full rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                                                                />
                                                            </label>
                                                            <label className="block">
                                                                <span className="text-[0.7rem] font-medium text-slate-600">Sampai</span>
                                                                <input
                                                                    type="date"
                                                                    value={draftTo}
                                                                    onChange={(e) => setDraftTo(e.target.value)}
                                                                    className="mt-0.5 w-full rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                                                                />
                                                            </label>
                                                        </div>
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={applyDateFilter}
                                                                className="flex-1 min-w-[5rem] rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700"
                                                            >
                                                                Terapkan
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={resetDateFilterToday}
                                                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                                                            >
                                                                Hari ini
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    }
                                    className="min-h-0 h-full flex flex-col py-1.5 bg-gradient-to-b from-white via-white to-violet-50/20 shadow-[0_10px_22px_rgba(91,33,182,0.08)] hover:shadow-[0_14px_28px_rgba(91,33,182,0.15)] transition-all duration-300 border border-violet-100/70 lg:col-span-2"
                                >
                                    <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-slate-100 bg-white/70">
                                        <table className="w-max min-w-full table-auto border-separate border-spacing-0">
                                            <thead className="sticky top-0 z-10 bg-white border-b border-slate-100">
                                                <tr className="text-slate-600" style={{ fontSize: SUPPLY_TYPO.tableHeader }}>
                                                    <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">RFID Bundle</th>
                                                    <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">WO</th>
                                                    <th className="text-right font-bold px-3 py-2.5 whitespace-nowrap">QTY</th>
                                                    <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Line</th>
                                                    <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Location</th>
                                                    <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Waktu</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100" style={{ fontSize: SUPPLY_TYPO.tableBody }}>
                                                {supplyRows.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                                                            Belum ada data supply sewing pada periode ini.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    supplyRows.map((r, idx) => (
                                                        <tr
                                                            key={`${r.rfid_garment || 'x'}-${r.at || idx}-${idx}`}
                                                            className="hover:bg-violet-50/50 transition-colors"
                                                        >
                                                            <td className="px-3 py-2.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                                                                {r.rfid_garment || '—'}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-slate-800 whitespace-nowrap">
                                                                {r.wo?.trim() ? r.wo.trim() : '—'}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                                                                {safeNum(r.qty ?? 1)}
                                                            </td>
                                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                                {r.line?.trim() ? r.line.trim() : '—'}
                                                            </td>
                                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                                {r.gm?.trim() || r.location?.trim() || '—'}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                                                                {formatIsoShort(r.at || '')}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </ChartCard>
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}

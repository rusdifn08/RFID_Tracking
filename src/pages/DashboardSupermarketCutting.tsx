import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CalendarRange, CheckCircle2, ClipboardList, FileSpreadsheet, Layers, Loader2, Package, Truck } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ChartCard from '../components/dashboard/ChartCard';
import { COLORS } from '../components/dashboard/constants';
import backgroundImage from '../assets/background.jpg';
import { getCuttingScanState, getGccCuttingSmarketDashboardData, getGccCuttingSmarketOutReport } from '../config/api';
import type { GccSmarketDashboardItem } from '../config/api';
import { exportSmarketOutReportExcel } from '../utils/exportSmarketOutReportExcel';

const QUERY_SUPERMARKET_CUTTING = ['supermarket-cutting-dashboard'] as const;
const QUERY_SUPERMARKET_CUTTING_GCC_BASE = 'supermarket-cutting-dashboard-gcc' as const;

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
const SHIFT_HOURS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

const MARKET_CHART = {
    checkin: '#0284c7',
    checkout: '#e11d48',
    urgent: '#b45309',
} as const;

const MARKET_TYPO = {
    // Berbasis ukuran card (container query units) agar proporsional terhadap card.
    stationTitle: 'clamp(0.78rem, 4.2cqw, 1.28rem)',
    stationValue: 'clamp(2.1rem, 21cqw, 6.4rem)',
    tableHeader: '12px',
    tableBody: '11px',
    chartTick: 'clamp(9px, 6px + 0.55vmin, 13px)',
    chartTooltip: 'clamp(10px, 8px + 0.45vmin, 13px)',
} as const;

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

function lokasiFromLastStatus(last?: string | null): string {
    if (!last?.trim()) return '—';
    const u = last.trim().toUpperCase();
    if (u === 'IN_SMARKET') return 'supermarket';
    return last.replace(/_/g, ' ');
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
        <div className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm h-full ${cardClassName}`} style={{ containerType: 'inline-size' }}>
            <div className="relative z-[2] flex items-start justify-between gap-2">
                <h3 className="font-extrabold tracking-[0.12em] text-slate-600 uppercase" style={{ fontSize: MARKET_TYPO.stationTitle }}>
                    {title}
                </h3>
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm ${iconClassName}`}>{icon}</div>
            </div>
            <div className="absolute inset-0 z-[2] flex items-center justify-center pt-4">
                <div className={`font-extrabold tabular-nums leading-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.12)] ${valueClassName}`} style={{ fontSize: MARKET_TYPO.stationValue }}>
                    {value}
                </div>
            </div>
            <div className="pointer-events-none absolute -bottom-1 -right-1 z-[1] opacity-10">{watermarkIcon}</div>
        </div>
    );
}

function BundleCard({ value }: { value: number }) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-b from-violet-50/70 to-fuchsia-50/50 p-4 shadow-sm h-full" style={{ containerType: 'inline-size' }}>
            <div className="relative z-[2] flex items-start justify-between gap-2">
                <h3 className="font-extrabold tracking-[0.12em] text-violet-700 uppercase" style={{ fontSize: MARKET_TYPO.stationTitle }}>
                    Jumlah Bundle
                </h3>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-600 shadow-sm">
                    <Layers className="h-5 w-5" />
                </div>
            </div>
            <div className="absolute inset-0 z-[2] flex items-center justify-center pt-4">
                <div className="font-extrabold tabular-nums leading-none text-violet-700 drop-shadow-[0_2px_3px_rgba(0,0,0,0.12)]" style={{ fontSize: MARKET_TYPO.stationValue }}>
                    {value}
                </div>
            </div>
            <div className="pointer-events-none absolute -bottom-1 -right-1 z-[1] opacity-10">
                <Layers className="h-24 w-24 text-violet-400" />
            </div>
        </div>
    );
}

export default function DashboardSupermarketCutting() {
    const [smarketRangeFrom, setSmarketRangeFrom] = useState(ymdTodayLocal);
    const [smarketRangeTo, setSmarketRangeTo] = useState(ymdTodayLocal);
    const [filterOpen, setFilterOpen] = useState(false);
    const [exportingSmarketReport, setExportingSmarketReport] = useState(false);
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
        setDraftFrom(smarketRangeFrom);
        setDraftTo(smarketRangeTo);
        setFilterOpen(true);
    };

    const applySmarketDateFilter = () => {
        let a = draftFrom;
        let b = draftTo;
        if (a > b) [a, b] = [b, a];
        setSmarketRangeFrom(a);
        setSmarketRangeTo(b);
        setFilterOpen(false);
    };

    const resetSmarketDateFilterToday = () => {
        const t = ymdTodayLocal();
        setDraftFrom(t);
        setDraftTo(t);
        setSmarketRangeFrom(t);
        setSmarketRangeTo(t);
        setFilterOpen(false);
    };

    const smarketFilterSummaryLabel =
        smarketRangeFrom === smarketRangeTo
            ? formatYmdIdLabel(smarketRangeFrom)
            : `${formatYmdIdLabel(smarketRangeFrom)} – ${formatYmdIdLabel(smarketRangeTo)}`;

    const handleExportSmarketOutReport = async () => {
        setExportingSmarketReport(true);
        try {
            const res = await getGccCuttingSmarketOutReport({
                tanggalfrom: smarketRangeFrom,
                tanggalto: smarketRangeTo,
            });
            if (!res.success || !res.data) {
                throw new Error(res.error || 'Gagal mengambil data report SMarket OUT');
            }
            await exportSmarketOutReportExcel({
                payload: res.data,
                filterDateFrom: smarketRangeFrom,
                filterDateTo: smarketRangeTo,
            });
        } catch (e) {
            window.alert(e instanceof Error ? e.message : 'Gagal export report SMarket OUT');
        } finally {
            setExportingSmarketReport(false);
        }
    };

    const scanQuery = useQuery({
        queryKey: QUERY_SUPERMARKET_CUTTING,
        queryFn: async () => {
            const r = await getCuttingScanState();
            if (!r.success || !r.data) throw new Error(r.error || 'Gagal memuat data Supermarket Cutting');
            return r.data;
        },
        refetchInterval: 12_000,
    });

    const gccDashboardQuery = useQuery({
        queryKey: [QUERY_SUPERMARKET_CUTTING_GCC_BASE, smarketRangeFrom, smarketRangeTo] as const,
        queryFn: async () => {
            const r = await getGccCuttingSmarketDashboardData({
                tanggalfrom: smarketRangeFrom,
                tanggalto: smarketRangeTo,
            });
            if (!r.success || !r.data) throw new Error(r.error || 'Gagal memuat data dashboard Supermarket GCC');
            return r.data;
        },
        refetchInterval: 12_000,
        placeholderData: (prev) => prev,
        refetchOnWindowFocus: false,
    });

    const storeRows = useMemo(() => {
        const rows = scanQuery.data?.store.history ?? [];
        return [...rows].sort((a, b) => {
            const ta = new Date(a.at || '').getTime();
            const tb = new Date(b.at || '').getTime();
            return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
        });
    }, [scanQuery.data]);

    const metrics = useMemo(() => {
        let checkin = 0;
        let checkout = 0;
        let urgent = 0;
        const bundleSet = new Set<string>();
        for (const r of storeRows) {
            const rid = String(r.rfid_garment || '').trim();
            if (rid) bundleSet.add(rid);
            const loc = String(r.location || '').toLowerCase();
            const hasLine = String(r.line || '').trim() !== '';
            const isGm = r.location === 'GM 1' || r.location === 'GM 2';
            const isCheckout = (r as { checkout?: boolean }).checkout || loc.includes('check-out') || loc.includes('checkout');
            const isUrgent = !isCheckout && hasLine && isGm;
            if (isCheckout) {
                checkout += 1;
            } else if (isUrgent) {
                urgent += 1;
            } else {
                checkin += 1;
            }
        }
        return { bundle: bundleSet.size, checkin, checkout, urgent };
    }, [storeRows]);

    const gccPayload = gccDashboardQuery.data?.data;

    const metricsFromApi = useMemo(() => {
        const s = gccPayload?.summary;
        if (!s) return null;
        return {
            bundle: safeNum(s.jumlah_bundle),
            checkin: safeNum(s.check_in),
            checkout: safeNum(s.check_out),
            urgent: safeNum(s.supply_urgent),
        };
    }, [gccPayload]);

    const metricsDisplay = metricsFromApi ?? metrics;

    const useGccDashboard = gccDashboardQuery.isSuccess && gccPayload != null;

    const perHourRows = useMemo(() => {
        const empty = () => ({ checkin: 0, checkout: 0, urgent: 0 });
        const buckets: Record<string, { checkin: number; checkout: number; urgent: number }> = Object.fromEntries(
            SHIFT_HOURS.map((h) => [h, empty()])
        );
        for (const r of storeRows) {
            const h = getLocalHourLabel(r.at || '');
            if (!h || buckets[h] == null) continue;
            const loc = String(r.location || '').toLowerCase();
            const hasLine = String(r.line || '').trim() !== '';
            const isGm = r.location === 'GM 1' || r.location === 'GM 2';
            const isCheckout = (r as { checkout?: boolean }).checkout || loc.includes('check-out') || loc.includes('checkout');
            const isUrgent = !isCheckout && hasLine && isGm;
            if (isCheckout) buckets[h].checkout += 1;
            else if (isUrgent) buckets[h].urgent += 1;
            else buckets[h].checkin += 1;
        }
        return SHIFT_HOURS.map((jam) => ({ jam, ...buckets[jam] }));
    }, [storeRows]);

    const perHourFromApi = useMemo(() => {
        if (gccPayload == null || !Array.isArray(gccPayload.data_per_jam)) return null;
        const rows = gccPayload.data_per_jam;
        const byJam = new Map<string, { checkin: number; checkout: number; urgent: number }>();
        for (const r of rows) {
            const jam = String(r.jam || '').trim();
            if (!jam) continue;
            byJam.set(jam, {
                checkin: safeNum(r.check_in),
                checkout: safeNum(r.check_out),
                urgent: safeNum(r.supply_urgent),
            });
        }
        return SHIFT_HOURS.map((jam) => {
            const v = byJam.get(jam);
            return v ? { jam, ...v } : { jam, checkin: 0, checkout: 0, urgent: 0 };
        });
    }, [gccPayload]);

    const chartRows = perHourFromApi ?? perHourRows;

    const tableItemsFromApi: GccSmarketDashboardItem[] | null = useMemo(() => {
        if (!useGccDashboard) return null;
        return gccPayload?.items ?? [];
    }, [useGccDashboard, gccPayload]);

    return (
        <div className="flex h-screen w-full font-sans text-slate-800 bg-slate-50 overflow-hidden selection:bg-sky-100 selection:text-sky-900">
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
                    <div className="h-full min-h-0 flex flex-col md:grid md:grid-rows-[minmax(0,2fr)_minmax(0,3fr)]" style={{ gap: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.625rem)' }}>
                        <section className="min-h-0 h-full">
                            <div className="grid h-full min-h-0 grid-cols-2 lg:grid-cols-4 gap-2" style={{ gap: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.625rem)' }}>
                                <BundleCard value={metricsDisplay.bundle} />
                                <StationStatusCard
                                    title="Check In"
                                    value={metricsDisplay.checkin}
                                    valueClassName="text-sky-600"
                                    icon={<Package className="h-5 w-5" />}
                                    iconClassName="border-sky-200 bg-white text-sky-600"
                                    cardClassName="border-sky-200/80 bg-[#f1f7ff]"
                                    watermarkIcon={<Package className="h-24 w-24 text-sky-400" />}
                                />
                                <StationStatusCard
                                    title="Check Out"
                                    value={metricsDisplay.checkout}
                                    valueClassName="text-emerald-600"
                                    icon={<CheckCircle2 className="h-5 w-5" />}
                                    iconClassName="border-emerald-200 bg-white text-emerald-600"
                                    cardClassName="border-emerald-200/80 bg-[#effaf4]"
                                    watermarkIcon={<CheckCircle2 className="h-24 w-24 text-emerald-400" />}
                                />
                                <StationStatusCard
                                    title="Supply Urgent"
                                    value={metricsDisplay.urgent}
                                    valueClassName="text-orange-600"
                                    icon={<AlertTriangle className="h-5 w-5" />}
                                    iconClassName="border-orange-200 bg-white text-orange-600"
                                    cardClassName="border-orange-200/80 bg-[#fff7ef]"
                                    watermarkIcon={<Truck className="h-24 w-24 text-orange-400" />}
                                />
                            </div>
                        </section>

                        <section className="min-h-0 h-full">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 h-full min-h-0" style={{ gap: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.625rem)' }}>
                                <ChartCard
                                    title="Data Per Jam"
                                    icon={Layers}
                                    iconColor={COLORS.blue}
                                    iconBgColor={COLORS.blueSoft}
                                    className="min-h-0 h-full flex flex-col py-1.5 bg-gradient-to-b from-white via-white to-slate-50/30 shadow-[0_10px_22px_rgba(15,23,42,0.06)] hover:shadow-[0_14px_28px_rgba(15,23,42,0.1)] transition-all duration-300 border border-slate-200/80 lg:col-span-1"
                                >
                                    <div className="w-full flex-1 min-h-0 min-w-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartRows} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="jam" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: MARKET_TYPO.chartTick }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: MARKET_TYPO.chartTick }} width={34} domain={[0, 'auto']} />
                                                <Tooltip
                                                    formatter={(value: number, name: string) => [value, name]}
                                                    labelFormatter={(label) => `Jam ${label}`}
                                                    contentStyle={{
                                                        borderRadius: 10,
                                                        border: '1px solid #e2e8f0',
                                                        fontSize: MARKET_TYPO.chartTooltip,
                                                        boxShadow: '0 8px 18px rgba(15,23,42,0.08)',
                                                    }}
                                                />
                                                <Legend wrapperStyle={{ fontSize: MARKET_TYPO.chartTick, paddingTop: 4 }} formatter={(value) => <span className="text-slate-600">{value}</span>} />
                                                <Line type="monotone" dataKey="checkin" name="Check In" stroke={MARKET_CHART.checkin} strokeWidth={2.25} dot={{ r: 2, strokeWidth: 1, fill: MARKET_CHART.checkin }} activeDot={{ r: 4 }} />
                                                <Line type="monotone" dataKey="checkout" name="Check Out" stroke={MARKET_CHART.checkout} strokeWidth={2.25} dot={{ r: 2, strokeWidth: 1, fill: MARKET_CHART.checkout }} activeDot={{ r: 4 }} />
                                                <Line type="monotone" dataKey="urgent" name="Supply Urgent" stroke={MARKET_CHART.urgent} strokeWidth={2.25} dot={{ r: 2, strokeWidth: 1, fill: MARKET_CHART.urgent }} activeDot={{ r: 4 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </ChartCard>

                                <ChartCard
                                    title="Tabel Supermarket Cutting"
                                    icon={ClipboardList}
                                    iconColor={COLORS.blue}
                                    iconBgColor={COLORS.blueSoft}
                                    headerAction={
                                        <div className="flex items-center gap-2 flex-wrap justify-end">
                                            <button
                                                type="button"
                                                onClick={() => void handleExportSmarketOutReport()}
                                                disabled={exportingSmarketReport}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
                                                title="Export Excel report SMarket OUT (GET /api/gcc/cutting/report/smarket/out)"
                                            >
                                                {exportingSmarketReport ? (
                                                    <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                                                ) : (
                                                    <FileSpreadsheet className="h-4 w-4 shrink-0" aria-hidden />
                                                )}
                                                <span className="whitespace-nowrap">
                                                    {exportingSmarketReport ? 'Mengekspor…' : 'Export Excel'}
                                                </span>
                                            </button>
                                            {gccDashboardQuery.error ? (
                                                <span
                                                    className="text-rose-600 text-xs font-medium max-w-[10rem] sm:max-w-[14rem] truncate"
                                                    title={(gccDashboardQuery.error as Error).message}
                                                >
                                                    {(gccDashboardQuery.error as Error).message}
                                                </span>
                                            ) : scanQuery.error ? (
                                                <span
                                                    className="text-rose-600 text-xs font-medium max-w-[10rem] sm:max-w-[14rem] truncate"
                                                    title={(scanQuery.error as Error).message}
                                                >
                                                    {(scanQuery.error as Error).message}
                                                </span>
                                            ) : null}
                                            <div className="relative" ref={filterPanelRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => (filterOpen ? setFilterOpen(false) : openFilterPanel())}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-sky-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 shadow-sm ring-1 ring-slate-900/5 transition hover:border-sky-400 hover:bg-sky-50/80 hover:text-sky-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
                                                    title="Filter rentang tanggal (GET /api/gcc/cutting/smarket/data)"
                                                >
                                                    <CalendarRange className="h-3.5 w-3.5 text-sky-600 shrink-0" aria-hidden />
                                                    <span className="whitespace-nowrap">{smarketFilterSummaryLabel}</span>
                                                </button>
                                                {filterOpen ? (
                                                    <div
                                                        className="absolute right-0 top-full z-[60] mt-1.5 w-[min(100vw-1.5rem,17.5rem)] rounded-xl border border-slate-200/90 bg-white p-3 shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5"
                                                        role="dialog"
                                                        aria-label="Filter tanggal dashboard Supermarket"
                                                    >
                                                        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400 mb-2">Rentang tanggal</p>
                                                        <div className="space-y-2">
                                                            <label className="block">
                                                                <span className="text-[0.7rem] font-medium text-slate-600">Dari</span>
                                                                <input
                                                                    type="date"
                                                                    value={draftFrom}
                                                                    onChange={(e) => setDraftFrom(e.target.value)}
                                                                    className="mt-0.5 w-full rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1.5 text-sm text-slate-800 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                                                />
                                                            </label>
                                                            <label className="block">
                                                                <span className="text-[0.7rem] font-medium text-slate-600">Sampai</span>
                                                                <input
                                                                    type="date"
                                                                    value={draftTo}
                                                                    onChange={(e) => setDraftTo(e.target.value)}
                                                                    className="mt-0.5 w-full rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1.5 text-sm text-slate-800 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                                                />
                                                            </label>
                                                        </div>
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={applySmarketDateFilter}
                                                                className="flex-1 min-w-[5rem] rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                                                            >
                                                                Terapkan
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={resetSmarketDateFilterToday}
                                                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2"
                                                            >
                                                                Hari ini
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    }
                                    className="min-h-0 h-full flex flex-col py-1.5 bg-gradient-to-b from-white via-white to-sky-50/20 shadow-[0_10px_22px_rgba(2,132,199,0.08)] hover:shadow-[0_14px_28px_rgba(2,132,199,0.15)] transition-all duration-300 border border-sky-100/70 lg:col-span-2"
                                >
                                    <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-slate-100 bg-white/70">
                                        <table className="w-max min-w-full table-auto border-separate border-spacing-0">
                                            <thead className="sticky top-0 z-10 bg-white border-b border-slate-100">
                                                <tr className="text-slate-600" style={{ fontSize: MARKET_TYPO.tableHeader }}>
                                                    <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">RFID Bundle</th>
                                                    <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">WO</th>
                                                    <th className="text-right font-bold px-3 py-2.5 whitespace-nowrap">QTY</th>
                                                    <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Line</th>
                                                    <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Lokasi</th>
                                                    <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Waktu</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100" style={{ fontSize: MARKET_TYPO.tableBody }}>
                                                {tableItemsFromApi ? (
                                                    tableItemsFromApi.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                                                                Belum ada data supermarket (API).
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        tableItemsFromApi.map((it, idx) => (
                                                            <tr
                                                                key={`${it.rfid_bundles || 'x'}-${it.id_bundles ?? ''}-${idx}`}
                                                                className="hover:bg-sky-50/40"
                                                            >
                                                                <td className="px-3 py-2.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                                                                    {it.rfid_bundles?.trim() || '—'}
                                                                </td>
                                                                <td className="px-3 py-2.5 text-slate-800 whitespace-nowrap">{it.wo?.trim() ? it.wo.trim() : '—'}</td>
                                                                <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">{safeNum(it.qty)}</td>
                                                                <td className="px-3 py-2.5 whitespace-nowrap">{it.line != null && String(it.line).trim() !== '' ? String(it.line).trim() : '—'}</td>
                                                                <td className="px-3 py-2.5 whitespace-nowrap">{lokasiFromLastStatus(it.last_status)}</td>
                                                                <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                                                                    {formatIsoShort(it.smarket_time || it.tanggal || '')}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )
                                                ) : storeRows.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                                                            Belum ada data supermarket.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    storeRows.map((r, idx) => (
                                                        <tr key={`${r.rfid_garment || 'x'}-${r.at || idx}-${idx}`} className="hover:bg-sky-50/40">
                                                            <td className="px-3 py-2.5 font-mono font-semibold text-slate-900 whitespace-nowrap">{r.rfid_garment || '—'}</td>
                                                            <td className="px-3 py-2.5 text-slate-800 whitespace-nowrap">{r.wo?.trim() ? r.wo.trim() : '—'}</td>
                                                            <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">{safeNum(r.qty)}</td>
                                                            <td className="px-3 py-2.5 whitespace-nowrap">{r.line?.trim() ? r.line.trim() : '—'}</td>
                                                            <td className="px-3 py-2.5 whitespace-nowrap">{r.location?.trim() ? r.location.trim() : '—'}</td>
                                                            <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{formatIsoShort(r.at || '')}</td>
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


import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CalendarRange, CheckCircle2, CircleX, ClipboardCheck, Layers, Wrench } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ChartCard from '../components/dashboard/ChartCard';
import { COLORS } from '../components/dashboard/constants';
import backgroundImage from '../assets/background.jpg';
import { getCuttingScanState, getGccCuttingQcDashboardData, type CuttingScanHistoryEntry, type GccQcDashboardItem } from '../config/api';
import QcRepairScanModalHost from '../components/dashboard/cutting/QcRepairScanModalHost';

const QUERY_CUTTING_QC = ['cutting-qc-dashboard'] as const;
const QUERY_CUTTING_QC_GCC_BASE = 'cutting-qc-dashboard-gcc' as const;

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

const QC_CHART = {
  good: '#059669',
  repair: '#d97706',
  reject: COLORS.red,
} as const;

const QC_TYPO = {
  stationTitle: 'clamp(0.78rem, 4.2cqw, 1.28rem)',
  stationValue: 'clamp(2.1rem, 21cqw, 6.4rem)',
  table: 'clamp(0.7rem, 0.56rem + 0.42vmin, 1.02rem)',
  tableMeta: 'clamp(0.64rem, 0.52rem + 0.32vmin, 0.88rem)',
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

function uniqueBundleCount(rows: CuttingScanHistoryEntry[]): number {
  const s = new Set<string>();
  for (const r of rows) {
    const id = (r.rfid_garment || '').trim();
    if (id) s.add(id);
  }
  return s.size;
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
        <h3 className="font-extrabold tracking-[0.12em] text-slate-600 uppercase" style={{ fontSize: QC_TYPO.stationTitle }}>
          {title}
        </h3>
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm ${iconClassName}`}>{icon}</div>
      </div>
      <div className="absolute inset-0 z-[2] flex items-center justify-center pt-4">
        <div className={`font-extrabold tabular-nums leading-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.12)] ${valueClassName}`} style={{ fontSize: QC_TYPO.stationValue }}>
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
        <h3 className="font-extrabold tracking-[0.12em] text-violet-700 uppercase" style={{ fontSize: QC_TYPO.stationTitle }}>
          Jumlah Bundle
        </h3>
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-600 shadow-sm">
          <Layers className="h-5 w-5" />
        </div>
      </div>
      <div className="absolute inset-0 z-[2] flex items-center justify-center pt-4">
        <div className="font-extrabold tabular-nums leading-none text-violet-700 drop-shadow-[0_2px_3px_rgba(0,0,0,0.12)]" style={{ fontSize: QC_TYPO.stationValue }}>
          {value}
        </div>
      </div>
      <div className="pointer-events-none absolute -bottom-1 -right-1 z-[1] opacity-10">
        <Layers className="h-24 w-24 text-violet-400" />
      </div>
    </div>
  );
}

export default function DashboardQualityControlCutting() {
  const [qcRepairModalOpen, setQcRepairModalOpen] = useState(false);
  const [qcRangeFrom, setQcRangeFrom] = useState(ymdTodayLocal);
  const [qcRangeTo, setQcRangeTo] = useState(ymdTodayLocal);
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
    setDraftFrom(qcRangeFrom);
    setDraftTo(qcRangeTo);
    setFilterOpen(true);
  };

  const applyQcDateFilter = () => {
    let a = draftFrom;
    let b = draftTo;
    if (a > b) [a, b] = [b, a];
    setQcRangeFrom(a);
    setQcRangeTo(b);
    setFilterOpen(false);
  };

  const resetQcDateFilterToday = () => {
    const t = ymdTodayLocal();
    setDraftFrom(t);
    setDraftTo(t);
    setQcRangeFrom(t);
    setQcRangeTo(t);
    setFilterOpen(false);
  };

  const scanQuery = useQuery({
    queryKey: QUERY_CUTTING_QC,
    queryFn: async () => {
      const r = await getCuttingScanState();
      if (!r.success || !r.data) throw new Error(r.error || 'Gagal memuat data QC Cutting');
      return r.data;
    },
    refetchInterval: 12000,
  });

  const gccDashboardQuery = useQuery({
    queryKey: [QUERY_CUTTING_QC_GCC_BASE, qcRangeFrom, qcRangeTo] as const,
    queryFn: async () => {
      const r = await getGccCuttingQcDashboardData({
        tanggalfrom: qcRangeFrom,
        tanggalto: qcRangeTo,
      });
      if (!r.success || !r.data) throw new Error(r.error || 'Gagal memuat data dashboard QC GCC');
      return r.data;
    },
    refetchInterval: 12_000,
    /** Hindari UI “kedip” ke kosong saat refetch / error sementara — tetap tampilkan respons sukses terakhir. */
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });

  const qcFilterSummaryLabel =
    qcRangeFrom === qcRangeTo
      ? formatYmdIdLabel(qcRangeFrom)
      : `${formatYmdIdLabel(qcRangeFrom)} – ${formatYmdIdLabel(qcRangeTo)}`;

  const qcRows = useMemo(() => {
    const rows = scanQuery.data?.qc.history ?? [];
    return [...rows].sort((a, b) => {
      const ta = new Date(a.at).getTime();
      const tb = new Date(b.at).getTime();
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });
  }, [scanQuery.data]);

  const kpi = useMemo(() => {
    let good = 0;
    let repair = 0;
    let reject = 0;
    for (const r of qcRows) {
      good += safeNum(r.good);
      repair += safeNum(r.repair);
      reject += safeNum(r.reject);
    }
    return { good, repair, reject };
  }, [qcRows]);

  const bundleUnique = useMemo(() => uniqueBundleCount(qcRows), [qcRows]);

  const gccPayload = gccDashboardQuery.data?.data;

  const kpiFromApi = useMemo(() => {
    const s = gccPayload?.summary;
    if (!s) return null;
    return {
      bundle: safeNum(s.jumlah_bundle),
      good: safeNum(s.total_good),
      repair: safeNum(s.total_repair),
      reject: safeNum(s.total_reject),
    };
  }, [gccPayload]);

  const kpiDisplay = kpiFromApi ?? { bundle: bundleUnique, ...kpi };

  const useGccDashboard = gccDashboardQuery.isSuccess && gccPayload != null;

  /** Agregasi per jam lokal (shift 06–18): good, repair, reject dari riwayat QC. */
  const qcPerHour = useMemo(() => {
    const empty = () => ({ good: 0, repair: 0, reject: 0 });
    const buckets: Record<string, { good: number; repair: number; reject: number }> = Object.fromEntries(
      SHIFT_HOURS.map((h) => [h, empty()])
    );
    for (const r of qcRows) {
      const label = getLocalHourLabel(r.at);
      if (!label || buckets[label] == null) continue;
      const b = buckets[label];
      b.good += safeNum(r.good);
      b.repair += safeNum(r.repair);
      b.reject += safeNum(r.reject);
    }
    return SHIFT_HOURS.map((jam) => {
      const b = buckets[jam] || empty();
      return { jam, good: b.good, repair: b.repair, reject: b.reject };
    });
  }, [qcRows]);

  const qcPerHourFromApi = useMemo(() => {
    if (gccPayload == null || !Array.isArray(gccPayload.data_per_jam)) return null;
    const rows = gccPayload.data_per_jam;
    const byJam = new Map<string, { good: number; repair: number; reject: number }>();
    for (const r of rows) {
      const jam = String(r.jam || '').trim();
      if (!jam) continue;
      byJam.set(jam, {
        good: safeNum(r.good),
        repair: safeNum(r.repair),
        reject: safeNum(r.reject),
      });
    }
    return SHIFT_HOURS.map((jam) => {
      const v = byJam.get(jam);
      return v ? { jam, ...v } : { jam, good: 0, repair: 0, reject: 0 };
    });
  }, [gccPayload]);

  const chartRows = qcPerHourFromApi ?? qcPerHour;

  const tableItemsFromApi: GccQcDashboardItem[] | null = useMemo(() => {
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
                <BundleCard value={kpiDisplay.bundle} />
                <StationStatusCard
                  title="Total Good"
                  value={kpiDisplay.good}
                  valueClassName="text-emerald-600"
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  iconClassName="border-emerald-200 bg-white text-emerald-600"
                  cardClassName="border-emerald-200/80 bg-[#effaf4]"
                  watermarkIcon={<CheckCircle2 className="h-24 w-24 text-emerald-400" />}
                />
                <StationStatusCard
                  title="Total Repair"
                  value={kpiDisplay.repair}
                  valueClassName="text-amber-600"
                  icon={<Wrench className="h-5 w-5" />}
                  iconClassName="border-amber-200 bg-white text-amber-600"
                  cardClassName="border-amber-200/80 bg-[#fff7ef]"
                  watermarkIcon={<Wrench className="h-24 w-24 text-amber-400" />}
                />
                <StationStatusCard
                  title="Total Reject"
                  value={kpiDisplay.reject}
                  valueClassName="text-rose-600"
                  icon={<AlertTriangle className="h-5 w-5" />}
                  iconClassName="border-rose-200 bg-white text-rose-600"
                  cardClassName="border-rose-200/80 bg-[#fff1f2]"
                  watermarkIcon={<CircleX className="h-24 w-24 text-rose-400" />}
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
                        <XAxis dataKey="jam" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: QC_TYPO.chartTick }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: QC_TYPO.chartTick }} width={34} domain={[0, 'auto']} />
                        <Tooltip
                          formatter={(value: number, name: string) => [value, name]}
                          labelFormatter={(label) => `Jam ${label}`}
                          contentStyle={{
                            borderRadius: 10,
                            border: '1px solid #e2e8f0',
                            fontSize: QC_TYPO.chartTooltip,
                            boxShadow: '0 8px 18px rgba(15,23,42,0.08)',
                          }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: QC_TYPO.chartTick, paddingTop: 4 }}
                          formatter={(value) => <span className="text-slate-600">{value}</span>}
                        />
                        <Line
                          type="monotone"
                          dataKey="good"
                          name="Good"
                          stroke={QC_CHART.good}
                          strokeWidth={2.25}
                          dot={{ r: 2, strokeWidth: 1, fill: QC_CHART.good }}
                          activeDot={{ r: 4 }}
                          isAnimationActive
                          animationDuration={500}
                        />
                        <Line
                          type="monotone"
                          dataKey="repair"
                          name="Repair"
                          stroke={QC_CHART.repair}
                          strokeWidth={2.25}
                          dot={{ r: 2, strokeWidth: 1, fill: QC_CHART.repair }}
                          activeDot={{ r: 4 }}
                          isAnimationActive
                          animationDuration={500}
                        />
                        <Line
                          type="monotone"
                          dataKey="reject"
                          name="Reject"
                          stroke={QC_CHART.reject}
                          strokeWidth={2.25}
                          dot={{ r: 2, strokeWidth: 1, fill: QC_CHART.reject }}
                          activeDot={{ r: 4 }}
                          isAnimationActive
                          animationDuration={500}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                <ChartCard
                  title="Tabel Quality Control"
                  icon={ClipboardCheck}
                  iconColor={COLORS.blue}
                  iconBgColor={COLORS.blueSoft}
                  headerAction={
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={() => setQcRepairModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl border-2 border-orange-400 bg-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-orange-500/25 transition hover:bg-orange-600 hover:border-orange-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                        title="Buka modal scan QC Repair di halaman ini — qty awal dialokasikan ke Repair (bisa diubah sebelum simpan)"
                      >
                        <Wrench className="h-3.5 w-3.5 text-white shrink-0" aria-hidden />
                        <span className="whitespace-nowrap">Scan QC Repair</span>
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
                          title="Filter rentang tanggal (GET /api/gcc/cutting/qc/data)"
                        >
                          <CalendarRange className="h-3.5 w-3.5 text-sky-600 shrink-0" aria-hidden />
                          <span className="whitespace-nowrap">{qcFilterSummaryLabel}</span>
                        </button>
                        {filterOpen ? (
                          <div
                            className="absolute right-0 top-full z-[60] mt-1.5 w-[min(100vw-1.5rem,17.5rem)] rounded-xl border border-slate-200/90 bg-white p-3 shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5"
                            role="dialog"
                            aria-label="Filter tanggal dashboard QC"
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
                                onClick={applyQcDateFilter}
                                className="flex-1 min-w-[5rem] rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                              >
                                Terapkan
                              </button>
                              <button
                                type="button"
                                onClick={resetQcDateFilterToday}
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
                    <table className="min-w-full" style={{ fontSize: QC_TYPO.table }}>
                      <thead className="sticky top-0 bg-white border-b border-slate-100">
                        <tr className="text-slate-600">
                          <th className="text-left font-bold px-3 py-2">RFID Bundle</th>
                          <th className="text-left font-bold px-3 py-2">WO</th>
                          <th className="text-right font-bold px-3 py-2">QTY</th>
                          <th className="text-right font-bold px-3 py-2">Good</th>
                          <th className="text-right font-bold px-3 py-2">Repair</th>
                          <th className="text-right font-bold px-3 py-2">Reject</th>
                          <th className="text-left font-bold px-3 py-2">Waktu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tableItemsFromApi ? (
                          tableItemsFromApi.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                                Belum ada data scan QC (API).
                              </td>
                            </tr>
                          ) : (
                            tableItemsFromApi.map((it, idx) => (
                              <tr key={`${it.rfid_bundles || 'x'}-${it.id_bundles ?? ''}-${idx}`} className="hover:bg-sky-50/40">
                                <td className="px-3 py-2 font-mono font-semibold text-slate-900 whitespace-nowrap">
                                  {it.rfid_bundles?.trim() || '—'}
                                </td>
                                <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap max-w-[10rem] truncate" title={it.wo || undefined}>
                                  {it.wo?.trim() ? it.wo.trim() : '—'}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">{safeNum(it.qty_output)}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-emerald-700 font-semibold">{safeNum(it.qty_good)}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-amber-700 font-semibold">{safeNum(it.qty_repair)}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-rose-700 font-semibold">{safeNum(it.qty_reject)}</td>
                                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{formatIsoShort(it.tanggal || '')}</td>
                              </tr>
                            ))
                          )
                        ) : qcRows.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                              Belum ada data scan QC.
                            </td>
                          </tr>
                        ) : (
                          qcRows.map((r, idx) => (
                            <tr key={`${r.rfid_garment || 'x'}-${r.at}-${idx}`} className="hover:bg-sky-50/40">
                              <td className="px-3 py-2 font-mono font-semibold text-slate-900 whitespace-nowrap">{r.rfid_garment || '—'}</td>
                              <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap max-w-[10rem] truncate" title={r.wo || undefined}>
                                {r.wo?.trim() ? r.wo.trim() : '—'}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">{safeNum(r.qty)}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-emerald-700 font-semibold">{safeNum(r.good)}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-amber-700 font-semibold">{safeNum(r.repair)}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-rose-700 font-semibold">{safeNum(r.reject)}</td>
                              <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{formatIsoShort(r.at)}</td>
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
      <QcRepairScanModalHost isOpen={qcRepairModalOpen} onClose={() => setQcRepairModalOpen(false)} />
    </div>
  );
}

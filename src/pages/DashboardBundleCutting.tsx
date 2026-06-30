import { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarRange, PackagePlus, Layers, CheckCircle2, FileSpreadsheet, Loader2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ChartCard from '../components/dashboard/ChartCard';
import { COLORS } from '../components/dashboard/constants';
import backgroundImage from '../assets/background.jpg';
import { getGccCuttingOutputDashboardData } from '../config/api';
import { exportBundleCuttingDashboardExcel } from '../utils/exportCuttingDashboardExcel';

const QUERY_CUTTING_OUTPUT = ['cutting-output-dashboard'] as const;

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

const BUNDLE_CHART = {
  inBundle: '#059669', // Tailwind emerald-600
} as const;

const QC_TYPO = {
  stationTitle: 'clamp(0.78rem, 4.2cqw, 1.28rem)',
  stationValue: 'clamp(2.1rem, 21cqw, 6.4rem)',
  tableHeader: '12px',
  tableBody: '11px',
  tableMeta: 'clamp(0.64rem, 0.52rem + 0.32vmin, 0.88rem)',
  chartTick: 'clamp(9px, 6px + 0.55vmin, 13px)',
  chartTooltip: 'clamp(10px, 8px + 0.45vmin, 13px)',
} as const;

function formatIsoShort(iso: string): string {
  if (!iso) return '—';
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
  value: number | string;
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

export default function DashboardBundleCutting() {
  const [qcRangeFrom, setQcRangeFrom] = useState(ymdTodayLocal);
  const [qcRangeTo, setQcRangeTo] = useState(ymdTodayLocal);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(ymdTodayLocal);
  const [draftTo, setDraftTo] = useState(ymdTodayLocal);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const [exportingBundleReport, setExportingBundleReport] = useState(false);

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

  const handleExportBundleReport = async () => {
    setExportingBundleReport(true);
    try {
      const detailRows = tableItems.map((r: any) => ({
        rfid: r.rfidBundles || r.rfid_garment || r.rfid_bundles || r.rfid || '',
        barcode: r.barcode || '',
        wo: r.wo || r.work_order || r.workOrder || '',
        style: r.style || r.styleName || '',
        buyer: r.buyer || r.country || '',
        color: r.color || r.colorName || r.warna || '',
        size: r.size || '',
        no_ikat: r.no_ikat || '',
        no_urut: r.no_urut || '',
        meja: r.meja || '',
        season: r.season || '',
        country: r.country || '',
        placing: r.placing || '',
        batch: r.batch || '',
        operator: r.nama_user || '',
        nik: r.nik || '',
        qty_bdl: r.qty_bundles || '',
        qty_out: r.qty || r.qty_output || r.qtyBatch || 1,
        status: r.last_status || '',
        waktu: formatIsoShort(r.output_time || r.createdAt || r.created_at || r.tanggal || r.at),
      }));

      await exportBundleCuttingDashboardExcel({
        filterDateFrom: qcRangeFrom,
        filterDateTo: qcRangeTo,
        summary: {
          outputBundle: kpiDisplay.inBundle,
          totalQtyOutput: outputQuery.data?.summary?.total_qty_output,
          rowCount: tableItems.length,
        },
        hourlyRows: chartRows.map((r) => ({ jam: r.jam, output: r.inBundle })),
        detailRows,
      });
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Gagal export report Data Bundle');
    } finally {
      setExportingBundleReport(false);
    }
  };

  // Get OUTPUT BUNDLE dari API
  const outputQuery = useQuery({
    queryKey: [...QUERY_CUTTING_OUTPUT, qcRangeFrom, qcRangeTo],
    queryFn: async () => {
      const r = await getGccCuttingOutputDashboardData({
        tanggalfrom: qcRangeFrom,
        tanggalto: qcRangeTo,
      });
      if (!r.success || !r.data) throw new Error(r.error || 'Gagal memuat data Output Bundle');
      return r.data;
    },
    refetchInterval: 12000,
  });

  const qcFilterSummaryLabel =
    qcRangeFrom === qcRangeTo
      ? formatYmdIdLabel(qcRangeFrom)
      : `${formatYmdIdLabel(qcRangeFrom)} – ${formatYmdIdLabel(qcRangeTo)}`;

  const kpiDisplay = {
      inBundle: outputQuery.data?.summary?.jumlah_bundle ?? 0,
  };

  /** Agregasi per jam (shift 06–18): inBundle (dari API output) */
  const chartRows = useMemo(() => {
    const empty = () => ({ inBundle: 0 });
    const buckets: Record<string, { inBundle: number }> = Object.fromEntries(
      SHIFT_HOURS.map((h) => [h, empty()])
    );

    // Map output data per jam from backend
    if (outputQuery.data?.data_per_jam) {
        for (const item of outputQuery.data.data_per_jam) {
            const h = item.jam.substring(0, 5); // "08:00"
            if (buckets[h]) {
                buckets[h].inBundle = item.output;
            }
        }
    }

    return SHIFT_HOURS.map((jam) => {
      const b = buckets[jam] || empty();
      return { jam, inBundle: b.inBundle };
    });
  }, [outputQuery.data]);

  const tableItems = outputQuery.data?.items ?? [];

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
          <div className="h-full min-h-0 flex flex-col md:grid md:grid-rows-2" style={{ gap: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.625rem)' }}>
            
            {/* TOP ROW: KPI Card + Line Chart */}
            <section className="flex flex-col md:flex-row min-h-0 h-full" style={{ gap: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.625rem)' }}>
                {/* KPI Card */}
                <div className="w-full md:w-1/3 lg:w-1/4 xl:w-1/5 min-h-[10rem] md:min-h-0 flex-shrink-0 h-full">
                    <StationStatusCard
                        title="OUTPUT BUNDLE"
                        value={kpiDisplay.inBundle}
                        valueClassName="text-emerald-600"
                        icon={<CheckCircle2 className="h-5 w-5" />}
                        iconClassName="border-emerald-200 bg-white text-emerald-600"
                        cardClassName="border-emerald-200/80 bg-[#effaf4]"
                        watermarkIcon={<CheckCircle2 className="h-24 w-24 text-emerald-400" />}
                    />
                </div>

                {/* Line Chart */}
                <ChartCard
                  title="Data Per Jam"
                  icon={Layers}
                  iconColor={COLORS.blue}
                  iconBgColor={COLORS.blueSoft}
                  className="flex-1 min-h-0 flex flex-col py-1.5 bg-gradient-to-b from-white via-white to-slate-50/30 shadow-[0_10px_22px_rgba(15,23,42,0.06)] hover:shadow-[0_14px_28px_rgba(15,23,42,0.1)] transition-all duration-300 border border-slate-200/80"
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
                          dataKey="inBundle"
                          name="Output Bundle"
                          stroke={BUNDLE_CHART.inBundle}
                          strokeWidth={2.25}
                          dot={{ r: 2, strokeWidth: 1, fill: BUNDLE_CHART.inBundle }}
                          activeDot={{ r: 4 }}
                          isAnimationActive
                          animationDuration={500}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
            </section>

            {/* BOTTOM ROW: Data Table (Full Width) */}
            <section className="min-h-0 h-full min-w-0 w-full">
                <ChartCard
                  title="Tabel Data Bundle"
                  icon={PackagePlus}
                  iconColor={COLORS.blue}
                  iconBgColor={COLORS.blueSoft}
                  headerAction={
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <div className="relative" ref={filterPanelRef}>
                        <button
                          type="button"
                          onClick={() => (filterOpen ? setFilterOpen(false) : openFilterPanel())}
                          className="inline-flex items-center gap-2 rounded-xl border border-sky-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 shadow-sm ring-1 ring-slate-900/5 transition hover:border-sky-400 hover:bg-sky-50/80 hover:text-sky-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
                          title="Filter rentang tanggal"
                        >
                          <CalendarRange className="h-4 w-4 shrink-0 text-sky-600" aria-hidden />
                          <span className="whitespace-nowrap">{qcFilterSummaryLabel}</span>
                        </button>

                        {filterOpen ? (
                          <div className="absolute right-0 top-full mt-2 w-[16rem] rounded-xl border border-slate-200 bg-white p-3 shadow-xl ring-1 ring-slate-900/5 z-50 animate-in fade-in slide-in-from-top-2">
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

                      <button
                        type="button"
                        onClick={() => void handleExportBundleReport()}
                        disabled={exportingBundleReport || tableItems.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                        title="Export Excel report Bundle"
                      >
                        {exportingBundleReport ? (
                          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                        ) : (
                          <FileSpreadsheet className="h-4 w-4 shrink-0" aria-hidden />
                        )}
                        <span className="whitespace-nowrap">{exportingBundleReport ? 'Mengekspor…' : 'Export Excel'}</span>
                      </button>
                    </div>
                  }
                  className="h-full flex flex-col py-1.5 bg-gradient-to-b from-white via-white to-sky-50/20 shadow-[0_10px_22px_rgba(2,132,199,0.08)] hover:shadow-[0_14px_28px_rgba(2,132,199,0.15)] transition-all duration-300 border border-sky-100/70"
                >
                  <div className="flex-1 min-h-0 min-w-0 w-full overflow-auto rounded-xl border border-slate-100 bg-white/70">
                    <table className="w-max min-w-full table-auto border-separate border-spacing-0">
                      <thead className="sticky top-0 z-10 bg-white border-b border-slate-100">
                        <tr className="text-slate-600" style={{ fontSize: QC_TYPO.tableHeader }}>
                          <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">RFID Bundle</th>
                          <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Barcode</th>
                          <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">WO</th>
                          <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Style</th>
                          <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Warna</th>
                          <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Size</th>
                          <th className="text-center font-bold px-3 py-2.5 whitespace-nowrap">No Ikat</th>
                          <th className="text-center font-bold px-3 py-2.5 whitespace-nowrap">No Urut</th>
                          <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Meja</th>
                          <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Season</th>
                          <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Country</th>
                          <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Placing</th>
                          <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Batch</th>
                          <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Operator</th>
                          <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">NIK</th>
                          <th className="text-right font-bold px-3 py-2.5 whitespace-nowrap">QTY Bdl</th>
                          <th className="text-right font-bold px-3 py-2.5 whitespace-nowrap">QTY Out</th>
                          <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Status</th>
                          <th className="text-left font-bold px-3 py-2.5 whitespace-nowrap">Waktu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100" style={{ fontSize: QC_TYPO.tableBody }}>
                        {tableItems.length === 0 ? (
                          <tr>
                            <td colSpan={19} className="px-3 py-6 text-center text-slate-500">
                              Belum ada data Bundle.
                            </td>
                          </tr>
                        ) : (
                          tableItems.map((r: any, idx: number) => {
                            const rfid = r.rfidBundles || r.rfid_garment || r.rfid_bundles || r.rfid;
                            const barcode = r.barcode || '—';
                            const wo = r.wo || r.work_order || r.workOrder;
                            const style = r.style || r.styleName;
                            const color = r.color || r.colorName || r.warna;
                            const size = r.size || '—';
                            const noIkat = r.no_ikat || '—';
                            const noUrut = r.no_urut || '—';
                            const meja = r.meja || '—';
                            const season = r.season || '—';
                            const country = r.country || '—';
                            const placing = r.placing || '—';
                            const batch = r.batch || '—';
                            const operator = r.nama_user || '—';
                            const nik = r.nik || '—';
                            const status = r.last_status || '—';
                            
                            const qtyBdl = r.qty_bundles || '—';
                            const qty = r.qty || r.qty_output || r.qtyBatch || 1;
                            const at = r.output_time || r.createdAt || r.created_at || r.tanggal || r.at;
                            
                            return (
                                <tr key={`${rfid || 'x'}-${at}-${idx}`} className="hover:bg-sky-50/40">
                                  <td className="px-3 py-2.5 font-mono font-semibold text-slate-900 whitespace-nowrap">{rfid || '—'}</td>
                                  <td className="px-3 py-2.5 font-mono text-slate-800 whitespace-nowrap">{barcode}</td>
                                  <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">{wo?.trim() ? wo.trim() : '—'}</td>
                                  <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">{style?.trim() ? style.trim() : '—'}</td>
                                  <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">{color?.trim() ? color.trim() : '—'}</td>
                                  <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">{size}</td>
                                  <td className="px-3 py-2.5 text-center font-medium text-slate-800 whitespace-nowrap">{noIkat}</td>
                                  <td className="px-3 py-2.5 text-center font-medium text-slate-800 whitespace-nowrap">{noUrut}</td>
                                  <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">{meja}</td>
                                  <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">{season}</td>
                                  <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">{country}</td>
                                  <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">{placing}</td>
                                  <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">{batch}</td>
                                  <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">{operator}</td>
                                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{nik}</td>
                                  <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">{qtyBdl}</td>
                                  <td className="px-3 py-2.5 text-right font-bold text-sky-700 tabular-nums whitespace-nowrap">{qty}</td>
                                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap text-xs">
                                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">{status}</span>
                                  </td>
                                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{formatIsoShort(at)}</td>
                                </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </ChartCard>
            </section>
            
          </div>
        </main>
      </div>
    </div>
  );
}

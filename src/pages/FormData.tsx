import { useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Loader2,
  CalendarRange,
  Sparkles,
  Database,
  ArrowUpRight,
  Layers,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Breadcrumb from '../components/Breadcrumb';
import { useSidebar } from '../context/SidebarContext';
import backgroundImage from '../assets/background.jpg';
import { apiGet, getBackendEnvironment } from '../config/api';
import { exportGenericReportToExcel } from '../utils/exportGenericReportToExcel.ts';
import { exportDailyOutputExcel } from '../utils/exportDailyOutputExcel.ts';

type ReportCard = {
  id: string;
  title: string;
  subtitle: string;
  endpoint: string;
  paramsBuilder?: (from: string, to: string) => Record<string, string>;
  tone: {
    accent: string;
    chip: string;
    button: string;
    buttonHover: string;
    glow: string;
  };
};

type ReportMetric = {
  totalRows: number;
  fetchedAt: string;
};

const getTodayIso = (): string => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const extractRowsFromPayload = (payload: any): Record<string, unknown>[] => {
  if (Array.isArray(payload)) {
    return payload.map((row) => (row && typeof row === 'object' ? row : { value: row }));
  }

  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, any>;
    if (Array.isArray(p.raw_data)) return p.raw_data;
    if (Array.isArray(p.data)) return p.data;
    if (p.data && typeof p.data === 'object') {
      if (Array.isArray(p.data.raw_data)) return p.data.raw_data;
      if (Array.isArray(p.data.summary_per_jam)) return p.data.summary_per_jam;
      if (Array.isArray(p.data.rows)) return p.data.rows;
      return [p.data];
    }
    if (Array.isArray(p.summary_per_jam)) return p.summary_per_jam;
    if (Array.isArray(p.rows)) return p.rows;
    return [p];
  }

  return payload != null ? [{ value: payload }] : [];
};

const extractOutputPerJamRows = (payload: any): Record<string, unknown>[] => {
  if (Array.isArray(payload)) {
    return payload.map((row) => (row && typeof row === 'object' ? row : { value: row }));
  }
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, any>;
    if (Array.isArray(p.raw_data)) return p.raw_data;
    if (Array.isArray(p.summary_per_jam)) return p.summary_per_jam;
    if (p.data && typeof p.data === 'object') {
      if (Array.isArray(p.data.raw_data)) return p.data.raw_data;
      if (Array.isArray(p.data.summary_per_jam)) return p.data.summary_per_jam;
    }
  }
  return [];
};

const getDefaultLinesByEnvironment = (environment: string): string[] => {
  if (environment === 'MJL') return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '21'];
  if (environment === 'MJL2') return ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  if (environment === 'GCC') return Array.from({ length: 21 }, (_, i) => String(i + 1));
  return ['1', '2', '3', '4', '5']; // CLN default
};

const normalizeLineKeys = (targets: Record<string, unknown>): string[] =>
  Object.keys(targets)
    .filter((k) => /^\d+$/.test(k))
    .filter((k) => {
      const n = Number(k);
      return n > 0 && n < 100; // ignore 0 / 111 / 112 / 113
    })
    .sort((a, b) => Number(a) - Number(b));

const REPORT_CARDS: ReportCard[] = [
  {
    id: 'line-production-targets',
    title: 'Target Produksi per Line',
    subtitle: 'Target/hari, target/jam, SPV, NIK (master line)',
    endpoint: '/api/line-production-targets',
    tone: {
      accent: 'from-rose-500 via-pink-500 to-fuchsia-600',
      chip: 'bg-rose-50 text-rose-700 border-rose-200',
      button: 'from-rose-600 to-fuchsia-600',
      buttonHover: 'hover:from-rose-500 hover:to-fuchsia-500',
      glow: 'group-hover:shadow-rose-100/80',
    },
  },
  {
    id: 'wip-all-lines',
    title: 'WIP All Lines',
    subtitle: 'Rekap WIP semua line',
    endpoint: '/line',
    paramsBuilder: (from, to) => ({ ...(from ? { tanggal_from: from } : {}), ...(to ? { tanggal_to: to } : {}) }),
    tone: {
      accent: 'from-emerald-500 via-teal-500 to-cyan-500',
      chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      button: 'from-emerald-600 to-teal-600',
      buttonHover: 'hover:from-emerald-500 hover:to-teal-500',
      glow: 'group-hover:shadow-emerald-100/80',
    },
  },
  {
    id: 'daily-output-wo',
    title: 'Daily Output Per WO',
    subtitle: 'Output harian berdasarkan WO',
    endpoint: '/daily-output',
    paramsBuilder: (from, to) => ({ ...(from ? { tanggalfrom: from } : {}), ...(to ? { tanggalto: to } : {}) }),
    tone: {
      accent: 'from-sky-500 via-blue-500 to-indigo-600',
      chip: 'bg-sky-50 text-sky-700 border-sky-200',
      button: 'from-sky-600 to-indigo-600',
      buttonHover: 'hover:from-sky-500 hover:to-indigo-500',
      glow: 'group-hover:shadow-sky-100/80',
    },
  },
  {
    id: 'output-sewing',
    title: 'Data Output Sewing',
    subtitle: 'Data output sewing per tanggal',
    endpoint: '/wira/detail',
    paramsBuilder: (from, to) => ({
      status: 'output_sewing',
      line: 'all',
      ...(from ? { tanggal_from: from } : {}),
      ...(to ? { tanggal_to: to } : {}),
    }),
    tone: {
      accent: 'from-violet-500 via-purple-500 to-indigo-600',
      chip: 'bg-violet-50 text-violet-700 border-violet-200',
      button: 'from-violet-600 to-indigo-600',
      buttonHover: 'hover:from-violet-500 hover:to-indigo-500',
      glow: 'group-hover:shadow-violet-100/80',
    },
  },
  {
    id: 'output-per-jam',
    title: 'Output Per Jam',
    subtitle: 'Output semua line per jam (tanggal from-to, format jam_00 sampai jam_23)',
    endpoint: '/wira/detail',
    paramsBuilder: (from, to) => ({
      status: 'output_sewing',
      line: 'all',
      ...(from ? { tanggal_from: from } : {}),
      ...(to ? { tanggal_to: to } : {}),
    }),
    tone: {
      accent: 'from-indigo-500 via-violet-500 to-purple-600',
      chip: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      button: 'from-indigo-600 to-purple-600',
      buttonHover: 'hover:from-indigo-500 hover:to-purple-500',
      glow: 'group-hover:shadow-indigo-100/80',
    },
  },
  {
    id: 'finishing-summary',
    title: 'Finishing Summary',
    subtitle: 'Ringkasan Dryroom/Folding/Reject',
    endpoint: '/finishing',
    paramsBuilder: (from, to) => ({ ...(from ? { tanggalfrom: from } : {}), ...(to ? { tanggalto: to } : {}) }),
    tone: {
      accent: 'from-cyan-500 via-sky-500 to-blue-600',
      chip: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      button: 'from-cyan-600 to-blue-600',
      buttonHover: 'hover:from-cyan-500 hover:to-blue-500',
      glow: 'group-hover:shadow-cyan-100/80',
    },
  },
  {
    id: 'card-progress',
    title: 'Card Progress',
    subtitle: 'List card status progress',
    endpoint: '/card/progress',
    tone: {
      accent: 'from-amber-500 via-orange-500 to-rose-500',
      chip: 'bg-amber-50 text-amber-700 border-amber-200',
      button: 'from-amber-600 to-orange-600',
      buttonHover: 'hover:from-amber-500 hover:to-orange-500',
      glow: 'group-hover:shadow-amber-100/80',
    },
  },
  {
    id: 'card-done',
    title: 'Card Done',
    subtitle: 'List card status done',
    endpoint: '/card/done',
    tone: {
      accent: 'from-emerald-500 via-green-500 to-teal-600',
      chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      button: 'from-emerald-600 to-green-600',
      buttonHover: 'hover:from-emerald-500 hover:to-green-500',
      glow: 'group-hover:shadow-emerald-100/80',
    },
  },
  {
    id: 'card-waiting',
    title: 'Card Waiting',
    subtitle: 'List card status waiting',
    endpoint: '/card/waiting',
    tone: {
      accent: 'from-slate-500 via-gray-500 to-zinc-600',
      chip: 'bg-slate-100 text-slate-700 border-slate-200',
      button: 'from-slate-600 to-zinc-600',
      buttonHover: 'hover:from-slate-500 hover:to-zinc-500',
      glow: 'group-hover:shadow-slate-200/80',
    },
  },
  {
    id: 'tracking-join',
    title: 'Tracking Join',
    subtitle: 'Data tracking gabungan',
    endpoint: '/tracking/join',
    paramsBuilder: (from, to) => ({ ...(from ? { tanggal_from: from } : {}), ...(to ? { tanggal_to: to } : {}) }),
    tone: {
      accent: 'from-fuchsia-500 via-purple-500 to-indigo-600',
      chip: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
      button: 'from-fuchsia-600 to-purple-600',
      buttonHover: 'hover:from-fuchsia-500 hover:to-purple-500',
      glow: 'group-hover:shadow-fuchsia-100/80',
    },
  },
];

export default function FormData() {
  const { isOpen } = useSidebar();
  const [dateFrom, setDateFrom] = useState(getTodayIso());
  const [dateTo, setDateTo] = useState(getTodayIso());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [metrics, setMetrics] = useState<Record<string, ReportMetric>>({});

  const containerStyle = useMemo(
    () => ({
      marginLeft: isOpen ? '18%' : '5rem',
      width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)',
    }),
    [isOpen]
  );

  const handleExport = async (card: ReportCard) => {
    try {
      setLoadingId(card.id);
      setMessage(null);
      let rows: Record<string, unknown>[] = [];

      if (card.id === 'output-per-jam') {
        const environment =
          getBackendEnvironment() ||
          (typeof window !== 'undefined' ? localStorage.getItem('backend_environment') : null) ||
          'CLN';

        const targetRes = await apiGet<any>('/api/target-data', { environment });
        const targetPayload = (targetRes.data as any) || {};
        const targetMap = (targetPayload?.targets as Record<string, unknown>) || {};
        const lines = normalizeLineKeys(targetMap);
        const selectedLines = lines.length > 0 ? lines : getDefaultLinesByEnvironment(environment);

        const perLineRows = await Promise.all(
          selectedLines.map(async (line) => {
            const detailRes = await apiGet<any>('/wira/detail', {
              status: 'output_sewing',
              line,
              ...(dateFrom ? { tanggal_from: dateFrom } : {}),
              ...(dateTo ? { tanggal_to: dateTo } : {}),
            });
            if (!detailRes.success) return [] as Record<string, unknown>[];
            const raw = detailRes.data as any;
            let payload = raw?.data ?? raw;
            if (
              payload &&
              typeof payload === 'object' &&
              !Array.isArray(payload) &&
              (payload as any).data &&
              typeof (payload as any).data === 'object'
            ) {
              payload = (payload as any).data;
            }
            const extracted = extractOutputPerJamRows(payload);
            return extracted.map((row) => {
              const obj = row as Record<string, unknown>;
              return {
                ...obj,
                line: obj.line ?? line,
              };
            });
          })
        );
        rows = perLineRows.flat();
      } else {
        const params = card.paramsBuilder ? card.paramsBuilder(dateFrom, dateTo) : {};
        const result = await apiGet<any>(card.endpoint, params);
        if (!result.success) {
          throw new Error(result.error || 'Gagal mengambil data report');
        }
        const raw = result.data as any;
        let payload = raw?.data ?? raw;
        if (payload && typeof payload === 'object' && !Array.isArray(payload) && (payload as any).data && typeof (payload as any).data === 'object') {
          payload = (payload as any).data;
        }
        rows = extractRowsFromPayload(payload);
      }

      if (rows.length === 0) {
        throw new Error('Data report kosong untuk filter tanggal saat ini');
      }

      if (card.id === 'daily-output-wo') {
        await exportDailyOutputExcel({
          rows,
          filterDateFrom: dateFrom || undefined,
          filterDateTo: dateTo || undefined,
        });
      } else {
        await exportGenericReportToExcel({
          reportTitle: card.title,
          payload: rows,
          filePrefix: card.id,
          filterDateFrom: dateFrom || undefined,
          filterDateTo: dateTo || undefined,
        });
      }

      setMetrics((prev) => ({
        ...prev,
        [card.id]: {
          totalRows: rows.length,
          fetchedAt: new Date().toISOString(),
        },
      }));

      setMessage({ type: 'ok', text: `Export ${card.title} berhasil (${rows.length} baris).` });
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Terjadi kesalahan saat export';
      setMessage({ type: 'error', text });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div
      className="flex min-h-screen w-full h-screen fixed inset-0 m-0 p-0 font-poppins selection:bg-indigo-100 selection:text-indigo-900"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <Sidebar />
      <div className="flex flex-col w-full min-h-screen transition-all duration-300 ease-in-out relative" style={containerStyle}>
        <Header />
        <Breadcrumb />
        <main
          className="flex-1 w-full overflow-y-auto relative"
          style={{
            padding: 'clamp(0.5rem, 2vw, 2rem) clamp(0.5rem, 3vw, 1rem)',
            paddingTop: 'clamp(3.2rem, 7vh, 5rem)',
            paddingBottom: '5rem',
          }}
        >
          <div className="w-full max-w-7xl mx-auto space-y-4">
            <div className="relative overflow-hidden bg-white/95 border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.08),transparent_40%)]" />
              <div className="relative flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-lg md:text-xl font-bold text-slate-800">Form Report Export</h1>
                    <p className="text-xs text-slate-500">Generate report sesuai data API secara cepat</p>
                  </div>
                </div>
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border border-sky-200 bg-sky-50 text-sky-700 font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  Professional Report Hub
                </span>
              </div>
              <p className="relative text-sm text-slate-600 mb-3">
                Pilih report lalu export ke Excel sesuai format data API. Daftar report bisa ditambah terus sesuai kebutuhan.
              </p>
              <div className="relative grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1">
                    <CalendarRange className="w-3.5 h-3.5" />
                    Tanggal From
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1">
                    <CalendarRange className="w-3.5 h-3.5" />
                    Tanggal To
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      const today = getTodayIso();
                      setDateFrom(today);
                      setDateTo(today);
                      setMessage(null);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition shadow-sm"
                  >
                    Reset Filter
                  </button>
                </div>
              </div>
              {message && (
                <div
                  className={`mt-3 text-sm px-3 py-2 rounded-lg ${
                    message.type === 'ok'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {message.text}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
              {REPORT_CARDS.map((card) => {
                const isLoading = loadingId === card.id;
                const metric = metrics[card.id];
                return (
                  <div
                    key={card.id}
                    className={`group relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-xl ${card.tone.glow} hover:-translate-y-0.5 transition`}
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.tone.accent} opacity-90`} />
                    <div className="absolute -right-10 -top-10 w-28 h-28 rounded-full bg-sky-100/50 blur-2xl group-hover:bg-sky-200/60 transition pointer-events-none" />

                    <div className="relative flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm md:text-base font-bold text-slate-800 truncate">{card.title}</h3>
                          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-semibold ${card.tone.chip}`}>
                            <Database className="w-3 h-3" />
                            API
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{card.subtitle}</p>
                        <p className="text-[11px] text-slate-400 mt-1 font-mono">{card.endpoint}</p>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
                        <FileSpreadsheet className="w-4.5 h-4.5" />
                      </div>
                    </div>
                    <div className="relative mb-2 min-h-[18px]">
                      {metric ? (
                        <p className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {metric.totalRows} baris data siap di-export
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          Belum ada preview data untuk filter ini
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleExport(card)}
                      disabled={isLoading}
                      className={`relative mt-2 w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-white transition ${
                        isLoading
                          ? 'bg-slate-400 cursor-not-allowed'
                          : `bg-gradient-to-r ${card.tone.button} ${card.tone.buttonHover} shadow-md shadow-sky-500/20`
                      }`}
                    >
                      {isLoading ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <RefreshCw className="w-4 h-4" />
                          Memproses...
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          Export Excel
                          <ArrowUpRight className="w-4 h-4 opacity-80" />
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ElementType } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';
import backgroundImage from '../assets/background.jpg';
import { Loader2, Package, RefreshCw, X, Layers, Factory, Ruler, Tag, Hash, ImageIcon, Sparkles } from 'lucide-react';
import { getNeedleStock, type NeedleStockItem } from '../config/api';

const GRID_COLS = 6;
const GRID_ROWS = 4;
const GRID_SLOTS = GRID_COLS * GRID_ROWS;

const getMachineName = (row: NeedleStockItem): string => {
  const a = (row.name_machine || '').trim();
  const b = (row.nama_mesin || '').trim();
  if (a && b && a.toLowerCase() !== b.toLowerCase()) {
    return `${a} — ${b}`;
  }
  return a || b || '—';
};

const getStockRowKey = (row: NeedleStockItem): string =>
  [
    row.needle_parameter || '',
    row.nama_mesin || '',
    row.name_machine || '',
    row.producer || '',
    row.needle_type || '',
    row.needle_size || '',
    row.needle_style || '',
  ]
    .map((v) => String(v).trim().toLowerCase())
    .join('|');

const toStockMap = (rows: NeedleStockItem[]): Record<string, number> => {
  const out: Record<string, number> = {};
  rows.forEach((row) => {
    const key = getStockRowKey(row);
    out[key] = typeof row.stock === 'number' ? row.stock : 0;
  });
  return out;
};

const sameStockMap = (a: Record<string, number>, b: Record<string, number>): boolean => {
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i += 1) {
    const k = aKeys[i];
    if (a[k] !== b[k]) return false;
  }
  return true;
};

function stockTierFromValue(stock: number): 'empty' | 'low' | 'ok' {
  if (stock === 0) return 'empty';
  if (stock < 5) return 'low';
  return 'ok';
}

function MachineStockDetailModal({
  item,
  onClose,
}: {
  item: NeedleStockItem;
  onClose: () => void;
}) {
  const stock = typeof item.stock === 'number' ? item.stock : 0;
  const tier = stockTierFromValue(stock);
  const name = getMachineName(item);

  const tierStyles =
    tier === 'empty'
      ? {
          accent: 'from-rose-600 to-rose-800',
          badge: 'bg-rose-100 text-rose-800 ring-rose-200/80',
          bar: 'bg-rose-500/90',
        }
      : tier === 'low'
        ? {
            accent: 'from-orange-500 to-amber-600',
            badge: 'bg-orange-100 text-orange-800 ring-orange-200/80',
            bar: 'bg-orange-500/90',
          }
        : {
            accent: 'from-emerald-600 to-teal-700',
            badge: 'bg-emerald-100 text-emerald-800 ring-emerald-200/80',
            bar: 'bg-emerald-500/90',
          };

  const Row = ({ icon: Icon, label, value }: { icon: ElementType<{ className?: string }>; label: string; value: string }) => {
    const v = (value || '').trim();
    return (
      <div className="flex gap-3 rounded-xl border border-slate-100/80 bg-slate-50/50 px-3 py-2.5 transition hover:bg-slate-50/90">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200/60">
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p
            className={`mt-0.5 text-sm font-medium leading-snug [overflow-wrap:anywhere] ${v ? 'text-slate-800' : 'text-slate-400'}`}
          >
            {v || '—'}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mesin-kolam-detail-title"
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div
        className="relative z-10 flex max-h-[min(92dvh,900px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/15 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`relative h-1.5 w-full shrink-0 bg-gradient-to-r ${tierStyles.accent} bg-[length:200%_100%] animate-[gradient-pan_8s_ease_infinite] sm:rounded-t-2xl`}
          style={{ animation: 'none' }}
        />
        <div
          className={`flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-br from-slate-50/90 to-white px-4 py-3 sm:px-5 sm:py-4`}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-sky-600/90">Stock needle</p>
            <h2
              id="mesin-kolam-detail-title"
              className="mt-0.5 text-balance text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl"
            >
              {name}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div
              className={`inline-flex items-baseline gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold tabular-nums ring-1 ${tierStyles.badge}`}
            >
              <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">Stock</span>
              <span className="text-base">{stock}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200/80 bg-white p-2 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] sm:gap-5 sm:p-5">
            <div
              className="relative flex aspect-[4/3] max-h-[14rem] items-center justify-center overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-b from-slate-50 to-slate-100/50 sm:max-h-none"
            >
              {item.machine_picture_url ? (
                <img
                  src={item.machine_picture_url}
                  alt={name}
                  className="h-full w-full object-contain p-3"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Package className="h-16 w-16 text-slate-200" />
              )}
              <span
                className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-white ${tier === 'empty' ? 'bg-rose-600' : tier === 'low' ? 'bg-orange-500' : 'bg-emerald-600'}`}
              >
                {tier === 'empty' ? 'Habis' : tier === 'low' ? 'Kritis' : 'Aman'}
              </span>
            </div>

            <div className="flex min-w-0 flex-col gap-2.5 sm:pt-0">
              <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm ring-1 ring-slate-200/30">
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">Needle parameter</p>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-800 [overflow-wrap:anywhere]">
                  {item.needle_parameter || '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 border-t border-slate-100 bg-slate-50/30 px-4 py-4 sm:px-5 sm:pb-5">
            <p className="text-[0.7rem] font-bold uppercase tracking-wide text-slate-400">Spesifikasi</p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Row icon={Factory} label="Nama mesin" value={item.nama_mesin ?? ''} />
              <Row icon={Layers} label="Name / tipe" value={item.name_machine ?? ''} />
              <Row icon={Tag} label="Producer" value={item.producer ?? ''} />
              <Row icon={Hash} label="Needle type" value={item.needle_type ?? ''} />
              <Row icon={Ruler} label="Needle size" value={item.needle_size ?? ''} />
              <Row icon={Sparkles} label="Needle style" value={item.needle_style ?? ''} />
            </div>
            {(item.machine_picture_file || '').trim() ? (
              <div className="mt-1 flex items-start gap-2 rounded-xl border border-dashed border-slate-200/80 bg-white/60 px-3 py-2 text-xs text-slate-500">
                <ImageIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="[overflow-wrap:anywhere]">File: {item.machine_picture_file}</span>
              </div>
            ) : null}
          </div>
        </div>
        <div className={`h-0.5 w-full shrink-0 ${tierStyles.bar} opacity-80`} />
      </div>
    </div>
  );
}

type StockCardProps = {
  row: NeedleStockItem | null;
  stock: number;
  onOpenDetail: (row: NeedleStockItem, stock: number) => void;
};

const StockCard = memo(function StockCard({ row, stock, onOpenDetail }: StockCardProps) {
  if (!row) {
    return (
      <div
        className="h-full min-h-0 w-full min-w-0 rounded-xl border border-dashed border-slate-200/60 bg-slate-50/30 transition-shadow duration-300"
        aria-hidden
      />
    );
  }

  const name = getMachineName(row);
  /** 0 = merah lembut, 1–4 = oranye, ≥5 = hijau / aman */
  const tier: 'empty' | 'low' | 'ok' = stock === 0 ? 'empty' : stock < 5 ? 'low' : 'ok';

  const fsName = 'clamp(0.52rem, calc(0.34rem + 1.95cqi + 0.9cqb), 1.04rem)';
  const fsParam = 'clamp(0.48rem, calc(0.28rem + 1.52cqi + 0.7cqb), 0.92rem)';
  const fsLabel = 'clamp(0.48rem, calc(0.27rem + 1.02cqi + 0.52cqb), 0.88rem)';
  const fsNum = 'clamp(0.6rem, calc(0.35rem + 1.55cqi + 0.82cqb), 1.18rem)';

  const tierFrame =
    tier === 'empty'
      ? `
        border-rose-200/65 bg-gradient-to-b from-white via-rose-50/25 to-rose-50/40
        shadow-[0_1px_2px_rgba(190,18,60,0.05),0_4px_14px_rgba(190,18,60,0.08)]
        ring-1 ring-rose-200/25 hover:ring-rose-300/40
        hover:shadow-[0_2px_4px_rgba(190,18,60,0.06),0_8px_24px_rgba(190,18,60,0.1)]
      `
      : tier === 'low'
        ? `
        border-orange-200/70 bg-gradient-to-b from-white via-orange-50/20 to-amber-50/35
        shadow-[0_1px_2px_rgba(194,65,12,0.04),0_4px_14px_rgba(194,65,12,0.07)]
        ring-1 ring-orange-200/30 hover:ring-orange-300/45
        hover:shadow-[0_2px_4px_rgba(194,65,12,0.05),0_8px_24px_rgba(194,65,12,0.09)]
      `
        : `
        border-slate-200/60 bg-gradient-to-b from-white via-slate-50/30 to-emerald-50/25
        shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(5,150,105,0.05)]
        ring-1 ring-slate-200/20 hover:ring-emerald-200/45
        hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_8px_24px_rgba(5,150,105,0.08)]
      `;

  const tierImage =
    tier === 'empty'
      ? 'border-b border-rose-100/70 bg-gradient-to-b from-rose-50/70 to-rose-100/25'
      : tier === 'low'
        ? 'border-b border-orange-100/70 bg-gradient-to-b from-orange-50/60 to-amber-50/30'
        : 'border-b border-slate-100/80 bg-gradient-to-b from-slate-50/95 to-emerald-50/15';

  const tierFooter =
    tier === 'empty'
      ? 'border-t border-rose-200/50 bg-rose-50/55 backdrop-blur-[2px] group-hover:bg-rose-50/75'
      : tier === 'low'
        ? 'border-t border-orange-200/50 bg-gradient-to-r from-orange-50/50 to-amber-50/45 backdrop-blur-[2px] group-hover:from-orange-50/60 group-hover:to-amber-50/55'
        : 'border-t border-emerald-200/40 bg-gradient-to-r from-slate-50/60 to-emerald-50/40 backdrop-blur-[2px] group-hover:from-slate-50/75 group-hover:to-emerald-50/50';

  const labelCls =
    tier === 'empty'
      ? 'text-rose-500/90'
      : tier === 'low'
        ? 'text-orange-600/85'
        : 'text-emerald-800/45';

  const numCls = tier === 'empty' ? 'text-rose-600' : tier === 'low' ? 'text-orange-600' : 'text-emerald-600';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetail(row, stock)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail(row, stock);
        }
      }}
      className={`
        group flex h-full min-h-0 w-full min-w-0 cursor-pointer flex-col overflow-hidden
        rounded-xl border
        transition-all duration-300 ease-out
        hover:-translate-y-0.5
        hover:ring-1
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-400/80
        ${tierFrame}
      `}
    >
      <div
        className={`relative w-full flex-shrink-0 overflow-hidden p-[min(0.45rem,1.3cqi)] ${tierImage}`}
        style={{ height: 'min(50cqb, 11rem)', minHeight: '2.2rem' }}
      >
        {row.machine_picture_url ? (
          <img
            src={row.machine_picture_url}
            alt={name}
            className="pointer-events-none mx-auto h-full w-full max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full min-h-0 w-full items-center justify-center text-slate-200">
            <Package className="h-[30%] w-[30%] min-h-[0.8rem] max-h-8" />
          </div>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="flex min-h-0 flex-1 flex-col items-center justify-center text-center [overflow-wrap:anywhere]"
          style={{
            paddingLeft: 'min(0.45rem, 1.4cqi)',
            paddingRight: 'min(0.45rem, 1.4cqi)',
            paddingTop: 'min(0.4rem, 1.1cqb)',
            paddingBottom: 'min(0.35rem, 1cqb)',
            gap: 'min(0.35rem, 1.1cqb)',
          }}
        >
          <p
            className="line-clamp-2 w-full min-w-0 break-words text-center font-semibold leading-tight text-slate-800"
            style={{ fontSize: fsName }}
            title={name}
          >
            {name}
          </p>
          <p
            className="line-clamp-2 w-full min-w-0 break-words text-center text-slate-500"
            style={{ fontSize: fsParam }}
            title={row.needle_parameter || ''}
          >
            {row.needle_parameter || '—'}
          </p>
        </div>
        <div
          className={`shrink-0 transition-colors duration-300 ${tierFooter}`}
          style={{ padding: 'min(0.3rem,1.1cqb) min(0.35rem,1.2cqi)' }}
        >
          <div className="mx-auto flex max-w-full items-baseline justify-center gap-[min(0.3rem,1.2cqi)] rounded-md px-1.5">
            <span
              className={`font-medium uppercase tracking-[0.08em] ${labelCls}`}
              style={{ fontSize: fsLabel }}
            >
              Stock
            </span>
            <span className={`font-extrabold tabular-nums ${numCls}`} style={{ fontSize: fsNum }}>
              {stock}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}, (prev, next) => prev.row === next.row && prev.stock === next.stock);

export default function DashboardMesinKolam() {
  const { isOpen } = useSidebar();
  const [rows, setRows] = useState<NeedleStockItem[]>([]);
  const [stockByKey, setStockByKey] = useState<Record<string, number>>({});
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<NeedleStockItem | null>(null);
  const pollingInFlightRef = useRef(false);

  useEffect(() => {
    if (!detailItem) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailItem(null);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [detailItem]);

  const load = useCallback(async () => {
    setMessage(null);
    setLoading(true);
    try {
      const res = await getNeedleStock();
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Gagal memuat stock needle');
      }
      const nextRows = Array.isArray(res.data.data) ? res.data.data : [];
      setRows(nextRows);
      setStockByKey(toStockMap(nextRows));
      setCount(typeof res.data.count === 'number' ? res.data.count : 0);
    } catch (e) {
      setRows([]);
      setCount(0);
      setMessage(e instanceof Error ? e.message : 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshStocksOnly = useCallback(async () => {
    if (pollingInFlightRef.current) return;
    pollingInFlightRef.current = true;
    try {
      const res = await getNeedleStock();
      if (!res.success || !res.data || !Array.isArray(res.data.data)) {
        return;
      }
      const nextMap = toStockMap(res.data.data);
      setStockByKey((prev) => (sameStockMap(prev, nextMap) ? prev : nextMap));
      const nextCount = typeof res.data.count === 'number' ? res.data.count : 0;
      setCount((prev) => (prev === nextCount ? prev : nextCount));
    } finally {
      pollingInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshStocksOnly();
    }, 3000);
    return () => {
      window.clearInterval(timer);
    };
  }, [refreshStocksOnly]);

  const gridCells = useMemo(() => {
    const data = rows.slice(0, GRID_SLOTS);
    const out: Array<{ row: NeedleStockItem | null; stock: number }> = data.map((r) => ({
      row: r,
      stock: stockByKey[getStockRowKey(r)] ?? (typeof r.stock === 'number' ? r.stock : 0),
    }));
    while (out.length < GRID_SLOTS) {
      out.push({ row: null, stock: 0 });
    }
    return out;
  }, [rows, stockByKey]);

  return (
    <div
      className="flex h-screen max-h-[100dvh] w-full overflow-hidden font-poppins text-slate-800 selection:bg-sky-100"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <Sidebar />
      <div
        className="flex h-screen max-h-[100dvh] min-h-0 w-full flex-col overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          marginLeft: isOpen ? '18%' : '5rem',
          width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)',
        }}
      >
        <Header />
        <main className="relative z-0 flex w-full min-h-0 flex-1 flex-col overflow-hidden pt-14 sm:pt-16">
          <div className="box-border flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden px-1.5 pb-1.5 pt-1.5 sm:px-2 sm:pb-2 sm:pt-1">
            <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 shadow-sm">
              <div
                className="relative flex w-full flex-shrink-0 items-center border-b border-slate-100/90 bg-white/80"
                style={{
                  minHeight: 'clamp(2.5rem, 3.2vmin + 1.4rem, 3.2rem)',
                  padding: 'clamp(0.35rem, 0.2vmin + 0.3rem, 0.6rem) clamp(0.35rem, 0.3vmin + 0.3rem, 0.9rem)',
                }}
              >
                {message && (
                  <p
                    className="max-w-[min(42%,11rem)] shrink-0 truncate pr-1 text-left text-red-600 sm:max-w-[12rem] sm:pr-2"
                    style={{ fontSize: 'clamp(0.5rem, calc(0.22rem + 0.3vmin), 0.75rem)' }}
                  >
                    {message}
                  </p>
                )}
                <div
                  className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center text-center"
                  style={{
                    paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0px))',
                    paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0px))',
                  }}
                >
                  <p
                    className="font-semibold uppercase leading-none tracking-widest text-sky-600"
                    style={{ fontSize: 'clamp(0.55rem, calc(0.28rem + 0.35vmin), 0.78rem)' }}
                  >
                    Stock needle
                  </p>
                  <h1
                    className="mt-0.5 max-w-[min(72vw,22rem)] truncate text-balance font-extrabold text-slate-900"
                    style={{ fontSize: 'clamp(0.78rem, calc(0.4rem + 0.6vmin + 0.1vmax), 1.3rem)' }}
                  >
                    Dashboard Mesin Kolam
                  </h1>
                </div>
                <div className="z-10 ml-auto flex min-h-[2.25rem] flex-shrink-0 items-center justify-end gap-1.5 sm:gap-2 sm:pl-0">
                  <div
                    className="rounded-md border border-slate-200 bg-slate-50/95 text-right"
                    style={{ padding: 'clamp(0.2rem, 0.12vmin + 0.2rem, 0.4rem) clamp(0.4rem, 0.25vmin + 0.35rem, 0.75rem)' }}
                  >
                    <p
                      className="font-semibold uppercase leading-tight text-slate-500"
                      style={{ fontSize: 'clamp(0.48rem, calc(0.2rem + 0.2vmin), 0.7rem)' }}
                    >
                      Count
                    </p>
                    <p
                      className="font-extrabold leading-none text-slate-800 tabular-nums"
                      style={{ fontSize: 'clamp(0.72rem, calc(0.32rem + 0.5vmin + 0.1vmax), 1.2rem)' }}
                    >
                      {count > GRID_SLOTS ? `${GRID_SLOTS}/${count}` : count}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void load()}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                    style={{
                      fontSize: 'clamp(0.6rem, calc(0.3rem + 0.4vmin + 0.04vmax), 0.9rem)',
                      padding: 'clamp(0.18rem, 0.1vmin + 0.12rem, 0.4rem) clamp(0.4rem, 0.28vmin + 0.3rem, 0.8rem)',
                    }}
                    title="Muat ulang"
                  >
                    {loading ? <Loader2 className="h-[1em] w-[1em] min-h-[0.9rem] min-w-[0.9rem] shrink-0 animate-spin" /> : <RefreshCw className="h-[1em] w-[1em] min-h-[0.9rem] min-w-[0.9rem] shrink-0" />}
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden p-1 sm:p-1.5">
                {loading && rows.length === 0 ? (
                  <div
                    className="flex h-full w-full min-h-0 items-center justify-center gap-2 text-slate-500"
                    style={{ fontSize: 'clamp(0.75rem, calc(0.35rem + 0.45vmin), 1.02rem)' }}
                  >
                    <Loader2
                      className="shrink-0 animate-spin"
                      style={{
                        width: 'clamp(1rem, 0.8vmin + 0.6rem, 1.35rem)',
                        height: 'clamp(1rem, 0.8vmin + 0.6rem, 1.35rem)',
                      }}
                    />
                    <span>Memuat data…</span>
                  </div>
                ) : (
                  <div
                    className="grid h-full w-full min-h-0 [grid-template-columns:repeat(6,minmax(0,1fr))] [grid-template-rows:repeat(4,minmax(0,1fr))] gap-1 sm:gap-1.5"
                    style={{ minHeight: 0 }}
                  >
                    {gridCells.map((cell, i) => (
                      <div
                        key={i}
                        className="h-full min-h-0 w-full min-w-0 [container-type:size]"
                        style={{ minHeight: 0 }}
                      >
                        <StockCard
                          row={cell.row}
                          stock={cell.stock}
                          onOpenDetail={(row, stock) => setDetailItem({ ...row, stock })}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {detailItem && <MachineStockDetailModal item={detailItem} onClose={() => setDetailItem(null)} />}
    </div>
  );
}

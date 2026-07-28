import React, { memo, useMemo, useState } from 'react';
import { Search, FileSpreadsheet, X, ListTree, Sigma } from 'lucide-react';
import { cn, FLUID } from './sewingBatchTw';
import { OrderMetaField, OverviewLineCard } from './OverviewStatCard';

export type CommandCenterOrder = {
  wo: string;
  style: string;
  size: string;
  buyer: string;
  item: string;
  color: string;
};

export type SewingExportKind = 'kumulatif' | 'detail';

type CommandCenterHeaderProps = {
  line: string;
  order: CommandCenterOrder;
  orderOptions?: Record<keyof CommandCenterOrder, string[]>;
  fieldFilters?: Partial<CommandCenterOrder>;
  onFieldFilterChange?: (key: keyof CommandCenterOrder, value: string) => void;
  filterDateFrom: string;
  filterDateTo: string;
  onDateFromChange: (val: string) => void;
  onDateToChange: (val: string) => void;
  onSearchClick: () => void;
  onResetClick: () => void;
  onExportExcelClick: (kind: SewingExportKind) => void;
  exporting?: boolean;
};

const parseLineNo = (line: string): string => {
  const match = line.match(/\d+/);
  return match?.[0] ?? line;
};

const ORDER_ROW_TOP: { key: keyof CommandCenterOrder; label: string }[] = [
  { key: 'wo', label: 'WO' },
  { key: 'style', label: 'Style' },
  { key: 'size', label: 'Size' },
  { key: 'color', label: 'Color' },
];

const ORDER_ROW_BOTTOM: { key: keyof CommandCenterOrder; label: string }[] = [
  { key: 'buyer', label: 'Buyer' },
  { key: 'item', label: 'Item' },
];

const CommandCenterHeader: React.FC<CommandCenterHeaderProps> = memo(({
  line,
  order,
  orderOptions,
  fieldFilters,
  onFieldFilterChange,
  filterDateFrom,
  filterDateTo,
  onDateFromChange,
  onDateToChange,
  onSearchClick,
  onResetClick,
  onExportExcelClick,
  exporting = false,
}) => {
  const lineNo = useMemo(() => parseLineNo(line), [line]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const pickExport = (kind: SewingExportKind) => {
    setExportDialogOpen(false);
    onExportExcelClick(kind);
  };

  return (
    <header className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.05)]">
      <div className={cn(FLUID.metaShellPad, 'grid h-full min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,3.8fr)_minmax(0,1.8fr)]', FLUID.metaGap)}>
        <OverviewLineCard lineNo={lineNo} />

        {/* Order Details Metadata */}
        <div className={cn('grid h-full min-h-0 grid-rows-2 items-stretch', FLUID.metaGap)}>
          <div className={cn('grid h-full min-h-0 grid-cols-4 items-stretch', FLUID.metaGap)}>
            {ORDER_ROW_TOP.map(({ key, label }) => (
              <OrderMetaField 
                key={key} 
                label={label} 
                value={order[key]} 
                options={orderOptions?.[key]}
                filterValue={fieldFilters?.[key]}
                onFilterChange={(val) => onFieldFilterChange?.(key, val)}
              />
            ))}
          </div>
          <div className={cn('grid h-full min-h-0 grid-cols-2 items-stretch', FLUID.metaGap)}>
            {ORDER_ROW_BOTTOM.map(({ key, label }) => (
              <OrderMetaField 
                key={key} 
                label={label} 
                value={order[key]} 
                options={orderOptions?.[key]}
                filterValue={fieldFilters?.[key]}
                onFilterChange={(val) => onFieldFilterChange?.(key, val)}
              />
            ))}
          </div>
        </div>

        {/* Date Filter inputs */}
        <div className="flex flex-col justify-between border-l border-slate-100 pl-[clamp(0.25rem,0.5vw,0.75rem)] min-h-0 min-w-0 gap-[clamp(0.2rem,0.5vh,0.38rem)] py-0.5">
          <div className="flex flex-col flex-1 justify-center gap-[clamp(0.2rem,0.5vh,0.38rem)] min-w-0">
            <div className="flex items-center gap-[clamp(0.15rem,0.4vw,0.5rem)] min-w-0">
              <span className="w-[clamp(1.6rem,2.5vw,2.2rem)] shrink-0 text-[clamp(0.5rem,0.4vw+0.5vh,0.85rem)] font-bold text-slate-500 uppercase tracking-wider">From</span>
              <div className="relative flex-1 min-w-0">
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => onDateFromChange(e.target.value)}
                  className="w-full min-w-0 h-[clamp(1.4rem,1.2vw+1.2vh,2.2rem)] px-[clamp(0.15rem,0.3vw,0.5rem)] text-[clamp(0.55rem,0.4vw+0.6vh,0.9rem)] font-bold text-slate-700 bg-slate-50/80 border border-slate-200 hover:border-blue-300 rounded-md shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white focus:border-blue-500 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                />
              </div>
            </div>
            <div className="flex items-center gap-[clamp(0.15rem,0.4vw,0.5rem)] min-w-0">
              <span className="w-[clamp(1.6rem,2.5vw,2.2rem)] shrink-0 text-[clamp(0.5rem,0.4vw+0.5vh,0.85rem)] font-bold text-slate-500 uppercase tracking-wider">To</span>
              <div className="relative flex-1 min-w-0">
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => onDateToChange(e.target.value)}
                  className="w-full min-w-0 h-[clamp(1.4rem,1.2vw+1.2vh,2.2rem)] px-[clamp(0.15rem,0.3vw,0.5rem)] text-[clamp(0.55rem,0.4vw+0.6vh,0.9rem)] font-bold text-slate-700 bg-slate-50/80 border border-slate-200 hover:border-blue-300 rounded-md shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white focus:border-blue-500 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                />
              </div>
            </div>
          </div>

          {/* Cari, Reset & Export Buttons */}
          <div className="grid grid-cols-3 gap-1.5 mt-auto w-full">
            <button
              onClick={onSearchClick}
              className="w-full h-[clamp(1.5rem,1.3vw+1.3vh,2.4rem)] text-[clamp(0.62rem,0.5vw+0.6vh,1.1rem)] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition flex items-center justify-center gap-1 shadow-sm"
            >
              <Search className="h-[clamp(0.6rem,0.5vw+0.5vh,0.9rem)] w-[clamp(0.6rem,0.5vw+0.5vh,0.9rem)] shrink-0" strokeWidth={2.5} />
              CARI
            </button>
            <button
              onClick={onResetClick}
              className="w-full h-[clamp(1.5rem,1.3vw+1.3vh,2.4rem)] text-[clamp(0.62rem,0.5vw+0.6vh,1.1rem)] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition flex items-center justify-center"
              title="Reset Filters"
            >
              RESET
            </button>
            <button
              type="button"
              onClick={() => setExportDialogOpen(true)}
              disabled={exporting}
              className="w-full h-[clamp(1.5rem,1.3vw+1.3vh,2.4rem)] text-[clamp(0.62rem,0.5vw+0.6vh,1.1rem)] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded transition flex items-center justify-center shadow-sm"
              title="Export to Excel"
            >
              <FileSpreadsheet className="h-[clamp(0.7rem,0.6vw+0.6vh,1.1rem)] w-[clamp(0.7rem,0.6vw+0.6vh,1.1rem)] shrink-0" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {exportDialogOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4"
          onClick={() => !exporting && setExportDialogOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sewing-export-title"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="sewing-export-title" className="text-base font-bold text-slate-800">
                  Pilih jenis export
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Data diekspor sesuai filter tanggal From–To, lengkap No. Batch dan Nama Batch.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExportDialogOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-2.5">
              <button
                type="button"
                disabled={exporting}
                onClick={() => pickExport('kumulatif')}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-left transition hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-60"
              >
                <span className="mt-0.5 rounded-lg bg-emerald-600 p-2 text-white">
                  <Sigma className="h-4 w-4" strokeWidth={2.5} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-800">Kumulatif</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Akumulasi dari tanggal from ke to (API dashboard), 1 baris per batch.
                  </span>
                </span>
              </button>

              <button
                type="button"
                disabled={exporting}
                onClick={() => pickExport('detail')}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-left transition hover:border-blue-400 hover:bg-blue-50 disabled:opacity-60"
              >
                <span className="mt-0.5 rounded-lg bg-blue-600 p-2 text-white">
                  <ListTree className="h-4 w-4" strokeWidth={2.5} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-800">Detail</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Ringkasan per tanggal &amp; per batch (IN/OUT dari tap RFID).
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
});

CommandCenterHeader.displayName = 'CommandCenterHeader';

export default CommandCenterHeader;

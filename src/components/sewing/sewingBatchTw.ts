export type CategoryKind = 'helper' | 'sewing' | 'qc' | 'assembly';

export const cn = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(' ');

/**
 * Skala tipografi & spacing fluid dashboard sewing.
 *
 * Kalibrasi: 1920×1080 @100% ≈ densitas visual 1280×720 @175% zoom.
 * - `max` dinaikkan agar nilai vw+vh di FHD tidak mentok prematur (sumber whitespace).
 * - Koefisien vw/vh ~20–35% lebih agresif vs versi lama.
 *
 * Opsional: pasang class {@link SEWING_DASHBOARD_ROOT_SCALE_CLASS} di wrapper
 * + aturan CSS di index.css untuk skala global (satu knob).
 */
export const SEWING_DASHBOARD_ROOT_SCALE_CLASS = 'sewing-dashboard-fluid-root';

export const FLUID = {
  /** Label kecil (dt, badge) */
  label: 'text-[clamp(0.65rem,0.55vw+0.72vh,1.6rem)]',
  /** Subtitle / caption */
  caption: 'text-[clamp(0.6rem,0.5vw+0.65vh,1.45rem)]',
  /** Body teks */
  body: 'text-[clamp(0.72rem,0.65vw+0.85vh,1.8rem)]',
  /** Heading card */
  heading: 'text-[clamp(0.82rem,0.75vw+1.05vh,2.05rem)]',
  /** Angka KPI sedang */
  metricMd: 'text-[clamp(1.15rem,1.1vw+2vh,3.65rem)]',
  /** Angka KPI besar (summary) */
  metricLg: 'text-[clamp(1.35rem,1.35vw+2.65vh,4.7rem)]',
  /** Angka IN/OUT batch card — lebih besar */
  metricInOut: 'text-[clamp(1.2rem,1.1vw+2.15vh,4.05rem)]',
  /** Angka utama kartu KPI overview */
  metricKpi: 'text-[clamp(1.1rem,1.1vw+2vh,3.15rem)]',
  /** Angka mini card dalam batch (inline di samping label) */
  metricSm: 'text-[clamp(0.68rem,0.55vw+0.95vh,2.1rem)]',
  /** Label + angka satu baris (batch footer metrics) */
  metricInline: 'text-[clamp(0.58rem,0.45vw+0.72vh,1.6rem)]',
  /** Padding card responsif */
  pad: 'p-[clamp(0.45rem,1vw+0.55vh,1.55rem)]',
  gap: 'gap-[clamp(0.3rem,0.65vw+0.45vh,1.15rem)]',
  /** Padding horizontal kartu KPI / meta */
  cardPadX: 'px-[clamp(0.35rem,0.85vw+0.4vh,1.3rem)]',
  /** Padding vertikal kartu KPI / meta */
  cardPadY: 'py-[clamp(0.3rem,0.7vw+0.35vh,1.15rem)]',
  /** Kotak ikon kecil (KPI card) */
  iconBox:
    'h-[clamp(1.35rem,1.75vw+1.15vh,2.85rem)] w-[clamp(1.35rem,1.75vw+1.15vh,2.85rem)]',
  /** Glyph ikon di dalam kotak */
  iconGlyph: 'h-[clamp(0.72rem,0.9vw+0.9vh,1.7rem)] w-[clamp(0.72rem,0.9vw+0.9vh,1.7rem)]',
  /** Watermark ikon dekoratif */
  watermarkIcon:
    'h-[clamp(2.4rem,5.5vw+2.8vh,5.75rem)] w-[clamp(2.4rem,5.5vw+2.8vh,5.75rem)]',
  /**
   * WO / Style / Buyer — slot 2/5 chart.
   * Sweet spot: lebih besar di 1080p, max dibatasi agar tidak clip seperti body/label umum.
   */
  metaLabel: 'text-[clamp(0.55rem,0.42vw+0.55vh,1rem)]',
  metaValue: 'text-[clamp(0.65rem,0.5vw+0.68vh,1.2rem)]',
  metaPadX: 'px-[clamp(0.22rem,0.4vw+0.25vh,0.55rem)]',
  metaPadY: 'py-[clamp(0.12rem,0.28vw+0.18vh,0.38rem)]',
  metaShellPad: 'p-[clamp(0.2rem,0.5vw+0.3vh,0.5rem)]',
  metaGap: 'gap-[clamp(0.18rem,0.35vw+0.22vh,0.42rem)]',
  /** Kartu Line — badge label atas */
  lineLabel: 'text-[clamp(0.62rem,0.52vw+0.72vh,1.2rem)]',
  /** Kartu Line — angka hero (nomor line) */
  lineValue: 'text-[clamp(1.65rem,2.5vw+4.2vh,4.25rem)]',
} as const;
export const CAT_DOT: Record<CategoryKind, string> = {
  helper: 'bg-blue-600',
  sewing: 'bg-violet-500',
  qc: 'bg-amber-500',
  assembly: 'bg-green-500',
};

export const CAT_LEGEND: Record<CategoryKind, string> = {
  helper: 'text-blue-600',
  sewing: 'text-violet-700',
  qc: 'text-amber-700',
  assembly: 'text-green-700',
};

export const PANEL_CAT: Record<
  CategoryKind,
  { box: string; name: string; nik: string; qty: string }
> = {
  helper: {
    box: 'border-blue-500/35 bg-blue-600/[0.07]',
    name: 'text-blue-600',
    nik: 'text-blue-600/70',
    qty: 'text-blue-600',
  },
  sewing: {
    box: 'border-violet-500/35 bg-violet-500/[0.07]',
    name: 'text-violet-600',
    nik: 'text-violet-700/70',
    qty: 'text-violet-600',
  },
  qc: {
    box: 'border-amber-500/40 bg-amber-500/[0.08]',
    name: 'text-amber-600',
    nik: 'text-amber-700/70',
    qty: 'text-amber-600',
  },
  assembly: {
    box: 'border-green-500/35 bg-green-500/[0.07]',
    name: 'text-green-600',
    nik: 'text-green-700/70',
    qty: 'text-green-600',
  },
};

export const BATCH_BADGE: Record<string, string> = {
  sewing: 'bg-violet-500/15 text-violet-700',
  qc: 'bg-amber-500/15 text-amber-700',
  helper: 'bg-blue-600/10 text-blue-700',
  muted: 'bg-slate-400/20 text-slate-600',
};

export const MODAL_HERO_BG: Record<CategoryKind, string> = {
  helper: 'bg-gradient-to-br from-blue-900 via-blue-600 to-blue-400',
  sewing: 'bg-gradient-to-br from-violet-900 via-violet-600 to-violet-300',
  qc: 'bg-gradient-to-br from-amber-900 via-amber-600 to-amber-300',
  assembly: 'bg-gradient-to-br from-green-900 via-green-600 to-green-400',
};

export const MODAL_HOUR_BAR: Record<CategoryKind, string> = {
  helper: 'bg-gradient-to-r from-blue-600 to-blue-400',
  sewing: 'bg-gradient-to-r from-violet-600 to-violet-300',
  qc: 'bg-gradient-to-r from-amber-600 to-amber-300',
  assembly: 'bg-gradient-to-r from-green-600 to-green-400',
};

export const PROCESS_STATUS_CHIP: Record<string, string> = {
  done: 'bg-green-500/35 text-white border border-white/25',
  running: 'bg-white/20 text-white',
  waiting: 'bg-slate-900/20 text-white/90',
};

export const TABLE_STATUS: Record<string, string> = {
  done: 'bg-green-500/15 text-green-700',
  running: 'bg-blue-600/10 text-blue-700',
  waiting: 'bg-slate-400/20 text-slate-600',
};

/** Tinggi minimum baris kartu proses — cukup untuk nama operator + metrik tanpa terpotong */
export const PANEL_ROW_MIN = '5.15rem';

/** Chip / badge umum (report, flow, hub) */
export const CHIP: Record<string, string> = {
  blue: 'bg-blue-600/10 text-blue-800',
  green: 'bg-green-500/15 text-green-800',
  orange: 'bg-amber-500/15 text-amber-800',
  red: 'bg-red-500/15 text-red-700',
  purple: 'bg-violet-500/15 text-violet-800',
  cyan: 'bg-cyan-600/10 text-cyan-800',
};

export const REPORT_STATUS: Record<string, string> = {
  done: 'font-extrabold text-green-700',
  run: 'font-extrabold text-blue-800',
  wait: 'font-extrabold text-amber-800',
  hold: 'font-extrabold text-red-700',
};

export const FLOW_CAT_BORDER: Record<string, string> = {
  blue: 'border-l-4 border-l-blue-500',
  purple: 'border-l-4 border-l-violet-500',
  orange: 'border-l-4 border-l-amber-500',
  green: 'border-l-4 border-l-green-500',
  cyan: 'border-l-4 border-l-cyan-600',
};

export const ID_CHIP: Record<CategoryKind, string> = {
  helper: 'bg-blue-600/10 text-blue-800',
  sewing: 'bg-violet-500/15 text-violet-800',
  qc: 'bg-amber-500/15 text-amber-800',
  assembly: 'bg-green-500/15 text-green-800',
};

export const ID_LEGEND: Record<CategoryKind, string> = {
  helper: 'text-blue-600',
  sewing: 'text-violet-700',
  qc: 'text-amber-700',
  assembly: 'text-green-700',
};

import { memo, type ComponentType, type ReactNode } from 'react';
import { Layers, type LucideProps } from 'lucide-react';
import { cn, FLUID } from './sewingBatchTw';

const KPI_DESC_CLASS = cn(
  'font-medium leading-snug text-slate-500',
  'text-[clamp(0.5rem,0.38vw+0.45vh,0.68rem)]'
);

export type OverviewStatTheme = {
  shell: string;
  label: string;
  value: string;
  sub: string;
  icon: string;
  iconWrap: string;
  watermark: string;
};

export type OverviewStatCardProps = {
  label: string;
  value: ReactNode;
  sub?: string;
  description?: string;
  icon: ComponentType<LucideProps>;
  theme: OverviewStatTheme;
};

/**
 * Kartu KPI — gaya dashboard modern: pastel bg, border warna, ikon kotak putih,
 * angka besar, watermark ikon di kanan bawah.
 */
export const OverviewStatCard = memo(
  ({ label, value, sub, description, icon: Icon, theme }: OverviewStatCardProps) => (
    <article
      className={cn(
        '@container/kpi relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border-2',
        FLUID.cardPadX,
        FLUID.cardPadY,
        'shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_6px_18px_rgba(15,23,42,0.08)]',
        theme.shell
      )}
      aria-label={sub ? `${label}: ${value}, ${sub}` : `${label}: ${value}`}
    >
      <Icon
        className={cn(
          'pointer-events-none absolute -bottom-[0.15rem] -right-[0.15rem]',
          FLUID.watermarkIcon,
          theme.watermark
        )}
        strokeWidth={1.25}
        aria-hidden
      />

      <div className="relative z-[1] flex shrink-0 items-start justify-between gap-1">
        <p className={cn('m-0 min-w-0 truncate font-bold uppercase tracking-wide', FLUID.label, theme.label)}>
          {label}
        </p>
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg bg-white shadow-[0_2px_8px_rgba(15,23,42,0.08)]',
            FLUID.iconBox,
            theme.iconWrap
          )}
        >
          <Icon
            className={cn(FLUID.iconGlyph, theme.icon)}
            strokeWidth={2}
            aria-hidden
          />
        </div>
      </div>

      <div className="relative z-[2] isolate flex min-h-0 flex-1 flex-col justify-center overflow-hidden pt-[clamp(0.12rem,0.25vh,0.35rem)]">
        <p
          className={cn(
            'm-0 truncate font-black leading-none tabular-nums',
            FLUID.metricKpi,
            theme.value
          )}
        >
          {value}
        </p>
        {sub ? (
          <p className={cn('m-0 mt-[clamp(0.08rem,0.15vh,0.2rem)] truncate font-medium', FLUID.caption, theme.sub)}>
            {sub}
          </p>
        ) : null}
      </div>
      {description ? (
        <p className={cn('relative z-[1] m-0 mt-auto shrink-0 line-clamp-2', KPI_DESC_CLASS)}>
          {description}
        </p>
      ) : null}
    </article>
  )
);

OverviewStatCard.displayName = 'OverviewStatCard';

/** Field ringkas: label + nilai (Overview Data Batch — Line, WO, Style, Buyer) */
export const OverviewMetaField = memo(({ label, value }: { label: string; value: string }) => (
  <div
    role="group"
    aria-label={label}
    className={cn(
      'relative grid h-full min-h-0 grid-rows-[auto_auto] content-center overflow-hidden',
      'rounded-xl border border-blue-100/90 bg-gradient-to-b from-white via-white to-blue-50/40',
      FLUID.metaPadX,
      FLUID.metaPadY,
      'shadow-[0_1px_4px_rgba(37,99,235,0.07)] ring-1 ring-blue-900/[0.03]',
      'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:rounded-t-xl before:bg-gradient-to-r before:from-sky-300 before:to-blue-800'
    )}
  >
    <p
      className={cn(
        'm-0 w-full truncate text-center font-semibold uppercase leading-none tracking-wide text-slate-500',
        FLUID.metaLabel
      )}
    >
      {label}
    </p>
    <p
      className={cn(
        'm-0 mt-[clamp(0.06rem,0.12vh,0.14rem)] w-full min-h-0 truncate text-center font-extrabold leading-tight text-blue-700',
        FLUID.metaValue
      )}
      title={value}
    >
      {value}
    </p>
  </div>
));

OverviewMetaField.displayName = 'OverviewMetaField';

/** Kartu Line — 1/5 lebar header, hero nomor line (desain berbeda dari kartu order) */
export const OverviewLineCard = memo(({ lineNo }: { lineNo: string }) => (
  <div
    role="group"
    aria-label={`Sewing Line ${lineNo}`}
    className={cn(
      'relative flex h-full min-h-0 flex-col overflow-hidden',
      'rounded-xl border border-blue-800/50',
      'bg-gradient-to-br from-[#1e3a8a] via-blue-700 to-[#1d4ed8]',
      'px-[clamp(0.28rem,0.55vw,0.7rem)] py-[clamp(0.22rem,0.5vh,0.55rem)]',
      'shadow-[0_4px_18px_rgba(30,64,175,0.38)] ring-1 ring-inset ring-white/10'
    )}
  >
    <div
      className="pointer-events-none absolute inset-y-0 left-0 w-[clamp(0.18rem,0.28vw,0.3rem)] bg-gradient-to-b from-sky-300 via-white/70 to-amber-400"
      aria-hidden
    />
    <Layers
      className="pointer-events-none absolute -bottom-[0.35rem] -right-[0.35rem] text-white/[0.08]"
      style={{
        width: 'clamp(2.8rem, 5.5vw + 3vh, 5.25rem)',
        height: 'clamp(2.8rem, 5.5vw + 3vh, 5.25rem)',
      }}
      strokeWidth={1.15}
      aria-hidden
    />

    <span
      className={cn(
        'relative z-[1] mx-auto shrink-0 rounded-full border border-white/30 bg-white/12',
        'px-[clamp(0.35rem,0.65vw,0.7rem)] py-[clamp(0.06rem,0.12vh,0.12rem)]',
        'font-extrabold uppercase tracking-[0.2em] text-white/95',
        FLUID.lineLabel
      )}
    >
      Line
    </span>

    <div className="relative z-[1] flex min-h-0 flex-1 items-center justify-center">
      <p
        className={cn(
          'm-0 font-black leading-none tabular-nums text-white',
          'drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]',
          FLUID.lineValue
        )}
      >
        {lineNo}
      </p>
    </div>
  </div>
));

OverviewLineCard.displayName = 'OverviewLineCard';

/** Kartu data order — WO, Style, Size, Buyer, Item, Color */
export const OrderMetaField = memo(({ label, value }: { label: string; value: string }) => (
  <div
    role="group"
    aria-label={label}
    className={cn(
      'relative grid h-full min-h-0 grid-rows-[auto_auto] content-center overflow-hidden',
      'rounded-lg border border-blue-400/70 bg-white',
      FLUID.metaPadX,
      FLUID.metaPadY,
      'shadow-[0_1px_4px_rgba(37,99,235,0.06)]',
      'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:rounded-t-lg before:bg-gradient-to-r before:from-blue-600 before:via-blue-400 before:to-amber-400'
    )}
  >
    <p
      className={cn(
        'm-0 w-full truncate text-center font-bold leading-none text-slate-900',
        FLUID.metaLabel
      )}
    >
      {label}
    </p>
    <p
      className={cn(
        'm-0 mt-[clamp(0.06rem,0.12vh,0.14rem)] w-full min-h-0 truncate text-center font-semibold leading-tight text-blue-700',
        FLUID.metaValue
      )}
      title={value}
    >
      {value}
    </p>
  </div>
));

OrderMetaField.displayName = 'OrderMetaField';

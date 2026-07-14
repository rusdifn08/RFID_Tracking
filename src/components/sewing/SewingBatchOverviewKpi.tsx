import { memo } from 'react';
import { CircleCheck, Package, Percent, TriangleAlert } from 'lucide-react';
import { cn, FLUID } from './sewingBatchTw';
import { OverviewStatCard, type OverviewStatTheme } from './OverviewStatCard';
import type { LineOverviewKpi } from '../../utils/sewingBatchInOut';

const KPI_THEMES: Record<string, OverviewStatTheme> = {
  prosesBatch: {
    shell: 'border-blue-200/90 bg-gradient-to-br from-blue-50 via-sky-50/90 to-white',
    label: 'text-slate-600',
    value: 'text-blue-600',
    sub: 'text-blue-500/75',
    icon: 'text-blue-500',
    iconWrap: 'ring-1 ring-blue-100/80',
    watermark: 'hidden',
  },
  finishBatch: {
    shell: 'border-blue-200/90 bg-gradient-to-br from-blue-50 via-sky-50/90 to-white',
    label: 'text-slate-600',
    value: 'text-emerald-600',
    sub: 'text-blue-500/75',
    icon: 'text-blue-500',
    iconWrap: 'ring-1 ring-blue-100/80',
    watermark: 'hidden',
  },
  wip: {
    shell: 'border-blue-200/90 bg-gradient-to-br from-blue-50 via-sky-50/90 to-white',
    label: 'text-slate-600',
    value: 'text-orange-600',
    sub: 'text-blue-500/75',
    icon: 'text-blue-500',
    iconWrap: 'ring-1 ring-blue-100/80',
    watermark: 'hidden',
  },
  efficiencyPct: {
    shell: 'border-blue-200/90 bg-gradient-to-br from-blue-50 via-sky-50/90 to-white',
    label: 'text-slate-600',
    value: 'text-violet-600',
    sub: 'text-blue-500/75',
    icon: 'text-blue-500',
    iconWrap: 'ring-1 ring-blue-100/80',
    watermark: 'hidden',
  },
};

const KPI_ITEMS: {
  key: keyof LineOverviewKpi;
  label: string;
  description?: string;
  unit?: string;
  icon: typeof Package;
}[] = [
    {
      key: 'prosesBatch',
      label: 'Bundle Proses',
      description: 'Total bundle scan masuk.',
      unit: 'Bundle',
      icon: Package,
    },
    {
      key: 'finishBatch',
      label: 'Bundle Selesai',
      description: 'Total bundle scan selesai.',
      unit: 'Bundle',
      icon: CircleCheck,
    },
    {
      key: 'wip',
      label: 'WIP',
      description: 'Bundle yang masih di proses.',
      unit: 'Bundle',
      icon: TriangleAlert,
    },
    {
      key: 'efficiencyPct',
      label: 'Percentage',
      description: 'Persentase bundle selesai.',
      icon: Percent,
    },
  ];

const SewingBatchOverviewKpi = memo(({ data }: { data: LineOverviewKpi }) => (
  <section
    className={cn('grid h-full min-h-0 grid-cols-4', FLUID.gap)}
    aria-label="Ringkasan KPI batch line"
  >
    {KPI_ITEMS.map((item) => {
      const raw = data[item.key];
      const display =
        item.key === 'efficiencyPct'
          ? (
            <>
              {raw}
              <span className={cn('font-bold text-blue-600', FLUID.caption)}>%</span>
            </>
          )
          : item.unit
            ? (
              <>
                {raw}{' '}
                <span className={cn('font-bold text-blue-600', FLUID.caption)}>{item.unit}</span>
              </>
            )
            : String(raw);
      return (
        <OverviewStatCard
          key={item.key}
          label={item.label}
          value={display}
          description={item.description}
          icon={item.icon}
          theme={KPI_THEMES[item.key]}
        />
      );
    })}
  </section>
));

SewingBatchOverviewKpi.displayName = 'SewingBatchOverviewKpi';

export default SewingBatchOverviewKpi;

import { memo } from 'react';
import { AlertTriangle, Box, CheckCircle2, ArrowUpRight, ChevronDown } from 'lucide-react';

type MetricType = 'waiting' | 'checkin' | 'checkout';

interface MetricConfig {
  bg: string;
  text: string;
  border: string;
  icon: typeof AlertTriangle;
  shadow: string;
}

interface MetricCardProps {
  label: string;
  value: number;
  type: MetricType;
  active?: boolean;
  trend?: string;
  trendUp?: boolean;
  compact?: boolean; // Untuk ukuran lebih kecil di Dashboard All Finishing
  onClick?: () => void; // Handler untuk click event
}

const config: Record<MetricType, MetricConfig> = {
  waiting: { bg: 'bg-orange-50/50', text: 'text-orange-600', border: 'border-orange-100', icon: AlertTriangle, shadow: 'shadow-orange-100' },
  checkin: { bg: 'bg-sky-50/50', text: 'text-sky-600', border: 'border-sky-100', icon: Box, shadow: 'shadow-sky-100' },
  checkout: { bg: 'bg-emerald-50/50', text: 'text-emerald-600', border: 'border-emerald-100', icon: CheckCircle2, shadow: 'shadow-emerald-100' },
};

export const MetricCard = memo(({ label, value, type, active, trend, trendUp, compact = false, onClick }: MetricCardProps) => {
  const c = config[type];
  const Icon = c.icon;

  // Ukuran font value: lebih kecil jika compact
  const valueFontSize = compact
    ? 'clamp(1.25rem, 2vw, 2.5rem)' // Lebih kecil untuk Dashboard All Finishing
    : 'clamp(2rem, 5vw, 4.5rem)'; // Ukuran normal untuk Dryroom dan Folding

  // Ukuran font label: lebih kecil jika compact
  const labelFontSize = compact
    ? 'clamp(0.5rem, 1vw, 0.625rem)' // Lebih kecil untuk Dashboard All Finishing
    : 'clamp(0.625rem, 1.5vw, 0.875rem)'; // Ukuran normal untuk Dryroom dan Folding

  // Padding: lebih kecil jika compact
  const padding = compact ? 'p-2' : 'p-4';
  const topPadding = compact ? 'top-2 left-2 right-2' : 'top-3 left-3 right-3';

  return (
    <div
      className={`
      relative h-full w-full flex flex-col justify-center items-center ${padding} rounded-xl border transition-all duration-300 group
      ${c.bg} ${c.border}
      ${active ? `ring-2 ring-sky-400 ring-offset-2 shadow-xl ${c.shadow}` : 'hover:scale-[1.02] hover:shadow-lg hover:border-sky-200'}
      ${onClick ? 'cursor-pointer' : 'cursor-default'}
    `}
      onClick={onClick}
    >
      {/* Label di atas */}
      <div className={`absolute ${topPadding} flex justify-between items-start z-10`}>
        <span className="font-bold uppercase tracking-widest opacity-80 text-slate-600" style={{ fontSize: labelFontSize }}>{label}</span>
        <div className={`${compact ? 'p-1' : 'p-1.5'} rounded-lg bg-white/80 backdrop-blur-sm shadow-sm ${c.text}`}>
          <Icon className={compact ? 'w-3 h-3' : 'w-4 h-4 sm:w-5 sm:h-5'} style={{ width: compact ? 'clamp(0.75rem, 1.5vw, 1rem)' : 'clamp(1rem, 2vw, 1.25rem)', height: compact ? 'clamp(0.75rem, 1.5vw, 1rem)' : 'clamp(1rem, 2vw, 1.25rem)' }} />
        </div>
      </div>

      {/* Value di tengah */}
      <div className={`font-black ${c.text} tracking-tighter drop-shadow-sm text-center mt-2`} style={{ fontSize: valueFontSize }}>
        {value.toLocaleString()}
      </div>

      {trend && (
        <div className={`absolute bottom-3 left-3 right-3 inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full bg-white/60 text-[10px] font-bold ${trendUp ? 'text-green-600' : 'text-red-500'} border border-white/50 shadow-sm`}>
          {trendUp ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
          {trend}
        </div>
      )}

      <Icon className={`absolute -right-3 -bottom-3 w-24 h-24 opacity-[0.05] ${c.text} transform -rotate-12 group-hover:scale-110 transition-transform duration-700`} />
    </div>
  );
});

MetricCard.displayName = 'MetricCard';

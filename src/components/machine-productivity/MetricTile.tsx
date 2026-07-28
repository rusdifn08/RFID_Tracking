type Props = {
    label: string;
    value: string;
    unit?: string;
    hint?: string;
    accent?: 'amber' | 'teal' | 'violet' | 'slate' | 'sky';
};

const ACCENT: Record<NonNullable<Props['accent']>, string> = {
    amber: 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50',
    teal: 'border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50',
    violet: 'border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50',
    sky: 'border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50',
    slate: 'border-slate-200 bg-white',
};

export default function MetricTile({ label, value, unit, hint, accent = 'slate' }: Props) {
    return (
        <div className={`rounded-xl border p-3 md:p-4 ${ACCENT[accent]}`}>
            <p className="text-[10px] md:text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                {label}
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl md:text-2xl font-bold text-slate-900 tabular-nums">{value}</span>
                {unit && <span className="text-sm text-slate-500 font-medium">{unit}</span>}
            </div>
            {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
        </div>
    );
}

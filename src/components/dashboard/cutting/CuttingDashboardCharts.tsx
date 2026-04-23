import { memo, useId } from 'react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    AreaChart,
    Area,
} from 'recharts';
import { PackagePlus, TrendingUp, Activity } from 'lucide-react';
import ChartCard from '../ChartCard';
import { COLORS } from '../constants';

export interface CuttingDistributionItem {
    name: string;
    value: number;
    fill: string;
    [key: string]: string | number;
}

interface CuttingDashboardChartsProps {
    distributionData: CuttingDistributionItem[];
    trendData: { jam: string; output: number; target: number }[];
    activityData: { jam: string; scan: number }[];
    className?: string;
}

/**
 * Baris 3 kartu grafik Cutting — wireframe: donut + legenda vertikal, dua line/area.
 */
const CuttingDashboardCharts = memo(function CuttingDashboardCharts({
    distributionData,
    trendData,
    activityData,
    className = '',
}: CuttingDashboardChartsProps) {
    const uid = useId().replace(/:/g, '');

    return (
        <div
            className={`flex-1 min-h-0 h-full w-full grid grid-cols-1 sm:grid-cols-3 gap-1.5 md:gap-2 ${className}`}
            style={{ gap: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.625rem)' }}
        >
            <ChartCard
                title="Distribusi Data"
                icon={PackagePlus}
                iconColor={COLORS.blue}
                iconBgColor={COLORS.blueSoft}
                className="min-h-0 h-full flex flex-col py-1.5 bg-gradient-to-b from-white via-white to-sky-50/20 shadow-[0_10px_22px_rgba(2,132,199,0.08)] hover:shadow-[0_14px_28px_rgba(2,132,199,0.15)] transition-all duration-300"
            >
                <div className="w-full flex-1 min-h-0 flex flex-row items-stretch gap-1 rounded-xl">
                    <div className="flex-1 min-w-0 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                                <Pie
                                    data={distributionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="48%"
                                    outerRadius="78%"
                                    paddingAngle={2}
                                    dataKey="value"
                                    nameKey="name"
                                    stroke="white"
                                    strokeWidth={2}
                                    animationDuration={800}
                                    labelLine={false}
                                    label={false}
                                >
                                    {distributionData.map((entry, index) => (
                                        <Cell key={`cell-${entry.name}-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number, name: string) => [`${value}`, name]}
                                    contentStyle={{ borderRadius: 10, border: '1px solid #bae6fd', fontSize: 11, boxShadow: '0 8px 18px rgba(14,116,144,0.14)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <ul
                        className="shrink-0 flex flex-col justify-center gap-1 py-0.5 pr-0.5 pl-1 -ml-1.5 max-w-[38%] text-[9px] leading-tight bg-white/80 rounded-lg border border-sky-100/70"
                        aria-label="Legenda distribusi"
                    >
                        {distributionData.map((d) => (
                            <li key={d.name} className="flex items-center gap-1.5 min-w-0">
                                <span
                                    className="w-2 h-2 rounded-full shrink-0 border border-white/80 shadow-sm"
                                    style={{ backgroundColor: d.fill }}
                                />
                                <span className="text-slate-600 truncate" title={d.name}>
                                    {d.name}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </ChartCard>

            <ChartCard
                title="Trend Bundle Scanning"
                icon={TrendingUp}
                iconColor={COLORS.blue}
                iconBgColor={COLORS.blueSoft}
                className="min-h-0 h-full flex flex-col py-1.5 bg-gradient-to-b from-white via-white to-sky-50/20 shadow-[0_10px_22px_rgba(2,132,199,0.08)] hover:shadow-[0_14px_28px_rgba(2,132,199,0.15)] transition-all duration-300"
            >
                <div className="w-full flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                            <defs>
                                <linearGradient id={`lineBundle-${uid}`} x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor={COLORS.blue} />
                                    <stop offset="100%" stopColor="#1565c0" />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0f2fe" />
                            <XAxis dataKey="jam" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }} width={28} domain={[0, 'auto']} />
                            <Tooltip
                                formatter={(value: number) => [value, 'Bundle']}
                                labelFormatter={(label) => `Jam ${label}`}
                                contentStyle={{ borderRadius: 10, border: '1px solid #bae6fd', fontSize: 11, boxShadow: '0 8px 18px rgba(14,116,144,0.14)' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="output"
                                stroke={`url(#lineBundle-${uid})`}
                                strokeWidth={2}
                                dot={{ fill: COLORS.blue, r: 2, strokeWidth: 0 }}
                                name="output"
                                animationDuration={600}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </ChartCard>

            <ChartCard
                title="Aktifitas RFID Scanning"
                icon={Activity}
                iconColor={COLORS.green}
                iconBgColor={COLORS.greenSoft}
                className="min-h-0 h-full flex flex-col py-1.5 bg-gradient-to-b from-white via-white to-sky-50/20 shadow-[0_10px_22px_rgba(2,132,199,0.08)] hover:shadow-[0_14px_28px_rgba(2,132,199,0.15)] transition-all duration-300"
            >
                <div className="w-full flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={activityData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                            <defs>
                                <linearGradient id={`areaScan-${uid}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={COLORS.green} stopOpacity={0.45} />
                                    <stop offset="100%" stopColor={COLORS.green} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0f2fe" />
                            <XAxis dataKey="jam" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }} width={28} domain={[0, 'auto']} />
                            <Tooltip
                                formatter={(value: number) => [value, 'Scan']}
                                labelFormatter={(label) => `Jam ${label}`}
                                contentStyle={{ borderRadius: 10, border: '1px solid #bae6fd', fontSize: 11, boxShadow: '0 8px 18px rgba(14,116,144,0.14)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="scan"
                                stroke={COLORS.green}
                                strokeWidth={2}
                                fill={`url(#areaScan-${uid})`}
                                name="Scan"
                                animationDuration={600}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </ChartCard>
        </div>
    );
});

export default CuttingDashboardCharts;

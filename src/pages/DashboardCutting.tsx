import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    AreaChart,
    Area,
} from 'recharts';
import {
    PackagePlus,
    Radio,
    TrendingUp,
    BarChart3,
    Activity,
} from 'lucide-react';

import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import Footer from '../components/Footer';
import { useSidebar } from '../context/SidebarContext';
import CuttingDataHeaderCards, {
    type ProductionOrderInfo,
} from '../components/dashboard/CuttingDataHeaderCards';
import ChartCard from '../components/dashboard/ChartCard';
import BundleCard, { type BundleRow } from '../components/dashboard/cutting/BundleCard';
import QCCuttingCard from '../components/dashboard/cutting/QCCuttingCard';

/** Mock Production Order untuk tampilan */
const MOCK_PRODUCTION_ORDER: ProductionOrderInfo = {
    wo: '186808',
    style: '1128733',
    buyer: 'HEXAPOLE COMPANY LIMITED',
    item: "STORM CRUISER JACKET M'S",
    sizeColor: 'S / BL',
};

/** Indeks stage yang akan disimulasikan (Bundling = 6, Supply ke Sewing = 9) */
const BUNDLING_INDEX = 6;
const SUPPLY_INDEX = 9;

/** Data dummy profesional: jam kerja shift (06–18) */
const SHIFT_HOURS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

/** Basis data trend output per jam (bundle) — realistis untuk cutting */
const DUMMY_TREND_BASE = [2, 5, 8, 11, 14, 16, 18, 20, 22, 24, 26, 28, 30];

/** Basis data aktivitas scan RFID per jam */
const DUMMY_ACTIVITY_BASE = [8, 12, 18, 22, 25, 28, 32, 30, 35, 38, 40, 42, 45];

/** Dummy data tabel Bundle: WTY, WO, Tag RFID per bundle */
const MOCK_BUNDLE_TABLE: BundleRow[] = [
    { no: 1, wty: 24, wo: '186808', rfidTag: 'E2801160...A1B2' },
    { no: 2, wty: 24, wo: '186808', rfidTag: 'E2801160...B3C4' },
    { no: 3, wty: 24, wo: '186808', rfidTag: 'E2801160...C5D6' },
    { no: 4, wty: 24, wo: '186809', rfidTag: 'E2801160...D7E8' },
    { no: 5, wty: 24, wo: '186809', rfidTag: 'E2801160...E9F0' },
    { no: 6, wty: 12, wo: '186808', rfidTag: 'E2801160...F1A2' },
    { no: 7, wty: 24, wo: '186808', rfidTag: 'E2801160...A3B4' },
    { no: 8, wty: 24, wo: '186808', rfidTag: 'E2801160...B5C6' },
];

/**
 * Simulasi payload RFID: setiap beberapa detik menaikkan angka di Bundling atau Supply ke Sewing.
 */
function simulateRFIDScan(setValues: (fn: (prev: number[]) => number[]) => void): void {
    const stageIndex = Math.random() > 0.5 ? BUNDLING_INDEX : SUPPLY_INDEX;
    setValues((prev) => {
        const next = [...prev];
        next[stageIndex] = Math.min(999, next[stageIndex] + 1);
        return next;
    });
}

export default function DashboardCutting() {
    const { isOpen } = useSidebar();
    const navigate = useNavigate();

    /** Nilai per stage (10 tahap) */
    const [stageValues, setStageValues] = useState<number[]>([
        12, 10, 10, 8, 8, 7, 5, 4, 3, 2,
    ]);
    /** Koneksi RFID (untuk indikator di UI) */
    const [isCheckingRFID] = useState(true);
    /** Simulasi: indeks jam berjalan (untuk trend output) — maju perlahan */
    const [simulatedHourIndex, setSimulatedHourIndex] = useState(7);
    /** Simulasi: kumulatif output hari ini (untuk grafik trend naik) */
    const [simulatedOutputCumul, setSimulatedOutputCumul] = useState(0);
    /** Simulasi: aktivitas scan per jam (di-update berkala) */
    const [simulatedActivity, setSimulatedActivity] = useState<number[]>(() => DUMMY_ACTIVITY_BASE.map((v) => v + Math.floor(Math.random() * 5)));
    /** QC Cutting: Good vs Reject (bundle yang sudah dicek satu persatu) */
    const [qcCuttingGood, setQcCuttingGood] = useState(15);
    const [qcCuttingReject, setQcCuttingReject] = useState(2);

    /** Simulasi RFID: update stage values (untuk grafik) */
    useEffect(() => {
        const t = setInterval(() => {
            simulateRFIDScan(setStageValues);
        }, 3000 + Math.random() * 2000);
        return () => clearInterval(t);
    }, []);

    /** Simulasi grafik: trend output & aktivitas scan bergerak (setiap 4–6 detik) */
    useEffect(() => {
        const t = setInterval(() => {
            setSimulatedOutputCumul((c) => c + 1);
            setSimulatedHourIndex((i) => Math.min(SHIFT_HOURS.length - 1, i + (Math.random() > 0.6 ? 1 : 0)));
            setSimulatedActivity((prev) =>
                prev.map((v) => Math.max(5, v + (Math.random() > 0.7 ? 1 : 0) - (Math.random() > 0.9 ? 1 : 0)))
            );
        }, 4500);
        return () => clearInterval(t);
    }, []);

    /** Simulasi QC Cutting: sesekali bundle lolos (Good) atau reject */
    useEffect(() => {
        const t = setInterval(() => {
            if (Math.random() > 0.75) {
                setQcCuttingGood((g) => g + 1);
            } else if (Math.random() > 0.92) {
                setQcCuttingReject((r) => r + 1);
            }
        }, 5000);
        return () => clearInterval(t);
    }, []);

    /** Data untuk diagram Distribusi: Cutting vs Adding vs Supply (dummy fallback jika 0) */
    const distributionData = useMemo(() => {
        const inCutting = stageValues[BUNDLING_INDEX] + stageValues[5] + stageValues[4];
        const inAdding = stageValues[8];
        const supplied = stageValues[SUPPLY_INDEX];
        const total = inCutting + inAdding + supplied || 1;
        const raw = [
            { name: 'Area Cutting', value: inCutting, fill: '#3b82f6', percent: ((inCutting / total) * 100).toFixed(1) },
            { name: 'Adding Proses', value: inAdding, fill: '#8b5cf6', percent: ((inAdding / total) * 100).toFixed(1) },
            { name: 'Supply ke Sewing', value: supplied, fill: '#22c55e', percent: ((supplied / total) * 100).toFixed(1) },
        ];
        const filtered = raw.filter((d) => d.value > 0);
        if (filtered.length === 0) {
            return [
                { name: 'Area Cutting', value: 10, fill: '#3b82f6', percent: '50.0' },
                { name: 'Adding Proses', value: 5, fill: '#8b5cf6', percent: '25.0' },
                { name: 'Supply ke Sewing', value: 5, fill: '#22c55e', percent: '25.0' },
            ];
        }
        return filtered;
    }, [stageValues]);

    /** Data grafik trend output per jam: dummy profesional + simulasi (naik seiring waktu) */
    const trendData = useMemo(() => {
        const targetPerHour = 14;
        return SHIFT_HOURS.map((jam, i) => {
            const baseOutput = DUMMY_TREND_BASE[i] ?? 10;
            const simulated = i <= simulatedHourIndex ? simulatedOutputCumul % 4 : 0;
            const output = Math.min(35, baseOutput + simulated + (i <= simulatedHourIndex ? 1 : 0));
            return {
                jam: jam.slice(0, 5),
                output,
                target: targetPerHour,
            };
        });
    }, [simulatedHourIndex, simulatedOutputCumul]);

    /** Data bar chart: kuantitas per tahap (10 tahap) — dari state real + dummy */
    const stageChartData = useMemo(() => {
        const labels = [
            'Request', 'Receive', 'Barcode', 'Gelar', 'Cutter',
            'Number', 'Bundling', 'QC', 'Adding', 'Supply',
        ];
        return labels.map((label, i) => ({
            name: label,
            qty: stageValues[i] ?? 0,
            fill: i === BUNDLING_INDEX || i === SUPPLY_INDEX ? '#1e40af' : '#3b82f6',
        }));
    }, [stageValues]);

    /** Data aktivitas RFID scan per jam: dummy profesional + simulasi */
    const activityData = useMemo(() => {
        return SHIFT_HOURS.slice(0, 13).map((jam, i) => ({
            jam: jam.slice(0, 5),
            scan: simulatedActivity[i] ?? DUMMY_ACTIVITY_BASE[i] ?? 10,
        }));
    }, [simulatedActivity]);

    const layoutStyle = useMemo(
        () => ({
            marginLeft: isOpen ? '18%' : '5rem',
            width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)',
        }),
        [isOpen]
    );

    return (
        <div className="flex h-screen w-full font-sans text-slate-800 overflow-hidden bg-slate-50">
            <Sidebar />
            <div
                className="flex flex-col h-screen min-w-0 transition-all duration-300 ease-in-out flex-1"
                style={layoutStyle}
            >
                <Header />
                <Breadcrumb />

                <main
                    className="flex-1 min-h-0 overflow-hidden bg-slate-50 p-2 sm:p-3 grid gap-2"
                    style={{ gridTemplateRows: 'auto minmax(140px, 28vh) 1fr' }}
                >
                    {/* Baris atas: Production Order + indikator */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 min-h-0">
                        <section className="flex-1 min-w-0">
                            <p className="text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-widest mb-1.5">
                                Production Order
                            </p>
                            <CuttingDataHeaderCards data={MOCK_PRODUCTION_ORDER} />
                        </section>
                        <div className="flex items-center justify-end gap-2 flex-shrink-0">
                            <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                                    isCheckingRFID ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-600'
                                }`}
                            >
                                <Radio className={`w-3.5 h-3.5 ${isCheckingRFID ? 'animate-pulse text-blue-600' : 'text-gray-500'}`} />
                                {isCheckingRFID ? 'Checking RFID' : 'Disconnected'}
                            </span>
                            <button type="button" onClick={() => navigate('/cutting')} className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap">
                                ← Cutting Proses
                            </button>
                        </div>
                    </div>

                    {/* Baris grafik tracking: 4 card — tinggi responsif vh */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 min-h-0 h-full">
                        {/* 1. Distribusi Data (Donut) — dummy + simulasi dari stage */}
                        <ChartCard title="Distribusi Data" icon={PackagePlus} className="min-h-0 h-full flex flex-col">
                            <div className="w-full flex-1 min-h-0 flex flex-col">
                                <ResponsiveContainer width="100%" height="100%" minHeight={80}>
                                    <PieChart>
                                        <defs>
                                            <linearGradient id="distBlue" x1="0" y1="0" x2="1" y2="1">
                                                <stop offset="0%" stopColor="#3b82f6" />
                                                <stop offset="100%" stopColor="#1d4ed8" />
                                            </linearGradient>
                                            <linearGradient id="distGreen" x1="0" y1="0" x2="1" y2="1">
                                                <stop offset="0%" stopColor="#22c55e" />
                                                <stop offset="100%" stopColor="#15803d" />
                                            </linearGradient>
                                            <linearGradient id="distPurple" x1="0" y1="0" x2="1" y2="1">
                                                <stop offset="0%" stopColor="#8b5cf6" />
                                                <stop offset="100%" stopColor="#6d28d9" />
                                            </linearGradient>
                                        </defs>
                                        <Pie
                                            data={distributionData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius="48%"
                                            outerRadius="72%"
                                            paddingAngle={3}
                                            dataKey="value"
                                            nameKey="name"
                                            stroke="white"
                                            strokeWidth={2}
                                            animationDuration={800}
                                            animationBegin={0}
                                            label={(props: { name?: string; percent?: number }) =>
                                                `${props.name ?? ''} ${props.percent != null ? (props.percent * 100).toFixed(0) : 0}%`
                                            }
                                        >
                                            {distributionData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.name === 'Area Cutting' ? 'url(#distBlue)' : entry.name === 'Supply ke Sewing' ? 'url(#distGreen)' : 'url(#distPurple)'}
                                                    className="hover:opacity-90 transition-opacity"
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number, name: string) => [`${value} bundle`, name]} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>

                        {/* 2. Trend Output per Jam — dummy profesional + simulasi */}
                        <ChartCard title="Trend Output (Bundle/Jam)" icon={TrendingUp} className="min-h-0 h-full flex flex-col">
                            <div className="w-full flex-1 min-h-0 flex flex-col">
                                <ResponsiveContainer width="100%" height="100%" minHeight={80}>
                                    <LineChart data={trendData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="lineOutput" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#3b82f6" />
                                                <stop offset="100%" stopColor="#1d4ed8" />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="jam" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} width={32} domain={[0, 'auto']} />
                                        <Tooltip
                                            formatter={(value: number, n: string) => [value, n === 'output' ? 'Output (bundle)' : 'Target']}
                                            labelFormatter={(label) => `Jam ${label}`}
                                            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                                        />
                                        <Line type="monotone" dataKey="output" stroke="url(#lineOutput)" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }} name="output" animationDuration={600} />
                                        <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Target" animationDuration={600} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>

                        {/* 3. Kuantitas per Tahap (Bar) — dari state simulasi */}
                        <ChartCard title="Kuantitas per Tahap" icon={BarChart3} className="min-h-0 h-full flex flex-col">
                            <div className="w-full flex-1 min-h-0 flex flex-col">
                                <ResponsiveContainer width="100%" height="100%" minHeight={80}>
                                    <BarChart data={stageChartData} layout="vertical" margin={{ top: 4, right: 8, left: 36, bottom: 4 }}>
                                        <defs>
                                            <linearGradient id="barGradCut" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#3b82f6" />
                                                <stop offset="100%" stopColor="#1d4ed8" />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }} />
                                        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }} width={40} />
                                        <Tooltip formatter={(value: number) => [value, 'Qty (bundle)']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                                        <Bar dataKey="qty" fill="url(#barGradCut)" radius={[0, 4, 4, 0]} barSize={14} name="Qty" animationDuration={600} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>

                        {/* 4. Aktivitas RFID Scan — dummy + simulasi per jam */}
                        <ChartCard title="Aktivitas RFID Scan" icon={Activity} className="min-h-0 h-full flex flex-col">
                            <div className="w-full flex-1 min-h-0 flex flex-col">
                                <ResponsiveContainer width="100%" height="100%" minHeight={80}>
                                    <AreaChart data={activityData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.5} />
                                                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="jam" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} width={32} domain={[0, 'auto']} />
                                        <Tooltip formatter={(value: number) => [value, 'Scan']} labelFormatter={(label) => `Jam ${label}`} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                                        <Area type="monotone" dataKey="scan" stroke="#16a34a" strokeWidth={2} fill="url(#activityGrad)" name="Scan" animationDuration={600} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>
                    </div>

                    {/* Card terpisah: Bundle & QC Cutting — row 1fr mengisi semua sisa tinggi (responsif zoom) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 min-h-0 overflow-hidden">
                        <div className="min-h-0 flex flex-col overflow-hidden h-full">
                            <BundleCard data={MOCK_BUNDLE_TABLE} className="flex-1 min-h-0 overflow-hidden h-full" />
                        </div>
                        <div className="min-h-0 flex flex-col overflow-hidden h-full">
                            <QCCuttingCard good={qcCuttingGood} reject={qcCuttingReject} className="flex-1 min-h-0 overflow-hidden h-full" />
                        </div>
                    </div>
                </main>

                {/* Footer minimal agar one-page tetap penuh */}
                <Footer />
            </div>
        </div>
    );
}

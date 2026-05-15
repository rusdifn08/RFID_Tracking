import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import CuttingProcessSection from '../components/dashboard/cutting/CuttingProcessSection';
import CuttingDashboardCharts from '../components/dashboard/cutting/CuttingDashboardCharts';
import { COLORS } from '../components/dashboard/constants';
import backgroundImage from '../assets/background.jpg';
import { getCuttingScanState, filterCuttingScanStateToLocalToday, type CuttingScanStateDoc } from '../config/api';

const QUERY_CUTTING_SCAN = ['cutting-scan-state'] as const;

const SHIFT_HOURS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

/** Jam mulai shift di sumbu X (lokal), konsisten dengan SHIFT_HOURS. */
const SHIFT_START_HOUR = 6;

function sameLocalCalendarDay(d: Date, ref: Date): boolean {
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
}

function shiftHourFromLabel(jam: string): number {
    const n = parseInt(String(jam).split(':')[0], 10);
    return Number.isFinite(n) ? n : 0;
}

/**
 * Trend: kumulatif jumlah scan Bundle hari ini antara jam shift START..slot (inklusif slot).
 * Aktivitas: jumlah semua event scan (bundle + QC + supermarket + supply) per jam hari ini.
 */
function buildTrendAndActivityFromScanState(
    doc: CuttingScanStateDoc | undefined,
    shiftHours: readonly string[],
    refDay: Date,
): { trendData: { jam: string; output: number; target: number }[]; activityData: { jam: string; scan: number }[] } {
    const emptyTrend = shiftHours.map((jam) => ({ jam: jam.slice(0, 5), output: 0, target: 0 }));
    const emptyActivity = shiftHours.map((jam) => ({ jam: jam.slice(0, 5), scan: 0 }));
    if (!doc) {
        return { trendData: emptyTrend, activityData: emptyActivity };
    }

    const trendData = shiftHours.map((jam) => {
        const slotH = shiftHourFromLabel(jam);
        let c = 0;
        for (const h of doc.bundle.history ?? []) {
            const d = new Date(h.at);
            if (Number.isNaN(d.getTime()) || !sameLocalCalendarDay(d, refDay)) continue;
            const hh = d.getHours();
            if (hh >= SHIFT_START_HOUR && hh <= slotH) c += 1;
        }
        return { jam: jam.slice(0, 5), output: c, target: 0 };
    });

    const scanPerHour = new Map<number, number>();
    for (let h = SHIFT_START_HOUR; h <= 18; h++) scanPerHour.set(h, 0);

    const bump = (at?: string) => {
        if (at == null || String(at).trim() === '') return;
        const d = new Date(at);
        if (Number.isNaN(d.getTime()) || !sameLocalCalendarDay(d, refDay)) return;
        const hh = d.getHours();
        if (hh < SHIFT_START_HOUR || hh > 18) return;
        scanPerHour.set(hh, (scanPerHour.get(hh) ?? 0) + 1);
    };

    for (const h of doc.bundle.history ?? []) bump(h.at);
    for (const h of doc.qc.history ?? []) bump(h.at);
    for (const h of doc.store.history ?? []) bump(h.at);
    for (const h of doc.supply.history ?? []) bump(h.at);

    const activityData = shiftHours.map((jam) => {
        const H = shiftHourFromLabel(jam);
        return { jam: jam.slice(0, 5), scan: scanPerHour.get(H) ?? 0 };
    });

    return { trendData, activityData };
}

export default function DashboardCutting() {
    const [bundleMetric, setBundleMetric] = useState(0);
    const [homeCounts, setHomeCounts] = useState<{ bundle: number; qc: number; store: number } | null>(null);

    const scanQuery = useQuery({
        queryKey: QUERY_CUTTING_SCAN,
        queryFn: async () => {
            const r = await getCuttingScanState();
            if (!r.success || !r.data) throw new Error(r.error || 'Gagal state');
            return r.data;
        },
        refetchInterval: 12_000,
    });
    const scanDoc = scanQuery.data;
    const scanDocToday = useMemo(() => (scanDoc ? filterCuttingScanStateToLocalToday(scanDoc) : undefined), [scanDoc]);

    const { trendData, activityData } = useMemo(() => {
        const refDay = new Date();
        return buildTrendAndActivityFromScanState(scanDocToday, SHIFT_HOURS, refDay);
    }, [scanDocToday]);

    const distributionData = useMemo(() => {
        const bundle = homeCounts != null ? homeCounts.bundle : bundleMetric;
        const qc = homeCounts != null ? homeCounts.qc : (scanDocToday?.qc.history.length ?? 0);
        const store = homeCounts != null ? homeCounts.store : (scanDocToday?.store.count ?? 0);
        const supply = scanDocToday?.supply.count ?? 0;
        const raw = [
            { name: 'Bundle', value: bundle, fill: COLORS.blue },
            { name: 'Quality Control', value: qc, fill: COLORS.orange },
            { name: 'Supermarket', value: store, fill: COLORS.yellow },
            { name: 'Supply Sewing', value: supply, fill: COLORS.green },
        ];
        const sum = raw.reduce((a, b) => a + b.value, 0);
        if (sum === 0) {
            return [
                { name: 'Bundle', value: 1, fill: COLORS.blue },
                { name: 'Quality Control', value: 1, fill: COLORS.orange },
                { name: 'Supermarket', value: 1, fill: COLORS.yellow },
                { name: 'Supply Sewing', value: 1, fill: COLORS.green },
            ];
        }
        return raw;
    }, [bundleMetric, scanDocToday, homeCounts]);

    return (
        <div className="flex h-screen w-full font-sans text-slate-800 bg-slate-50 overflow-hidden selection:bg-sky-100 selection:text-sky-900">
            <div
                className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
                style={{ backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover' }}
            />

            <div className="fixed left-0 top-0 h-full z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300">
                <Sidebar />
            </div>

            <div
                className="flex flex-col h-full min-h-0 min-w-0 relative z-10 transition-all duration-300 ease-in-out"
                style={{
                    marginLeft: 'var(--layout-sidebar-offset)',
                    width: 'var(--layout-sidebar-width)',
                }}
            >
                <Header />

                {/*
                  Header fixed: h-12 / xs:h-14 / sm:h-16; logo di md+ lebih tinggi — beri ruang ekstra agar konten tidak tertutup.
                  Desktop: 3/5 scanning + 2/5 grafik (flex-[3] : flex-[2]), overflow terkunci di viewport.
                  Smartphone / tablet kecil: scroll vertikal di <main>; kartu tabel punya min-height agar baris data terlihat.
                */}
                <main className="flex flex-col flex-1 min-h-0 w-full bg-slate-50/50 px-2 md:px-3 pb-2 md:pb-3 pt-10 xs:pt-12 sm:pt-14 md:pt-[3.5rem] lg:pt-[4.5rem] gap-2 lg:overflow-hidden max-lg:overflow-y-auto max-lg:overscroll-contain max-lg:[-webkit-overflow-scrolling:touch] max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    <div className="flex-[3] min-h-0 min-w-0 flex flex-col border border-blue-100 rounded-xl bg-white/80 shadow-sm p-1 md:p-1.5 lg:overflow-hidden max-lg:flex-none max-lg:overflow-visible max-lg:min-h-0">
                        <CuttingProcessSection
                            onBundleMetrics={setBundleMetric}
                            filterTablesToToday
                            homeDashboardApi
                            onHomeDashboardCounts={setHomeCounts}
                        />
                    </div>

                    <div className="flex-[2] min-h-0 min-w-0 flex flex-col lg:overflow-hidden max-lg:flex-none max-lg:min-h-[min(280px,42svh)] max-lg:overflow-visible">
                        <CuttingDashboardCharts
                            distributionData={distributionData}
                            trendData={trendData}
                            activityData={activityData}
                            className="flex-1 min-h-0 h-full max-lg:min-h-[260px]"
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}

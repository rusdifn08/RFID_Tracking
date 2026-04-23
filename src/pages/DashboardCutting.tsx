import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';
import CuttingProcessSection from '../components/dashboard/cutting/CuttingProcessSection';
import CuttingDashboardCharts from '../components/dashboard/cutting/CuttingDashboardCharts';
import { COLORS } from '../components/dashboard/constants';
import backgroundImage from '../assets/background.jpg';
import { getCuttingScanState } from '../config/api';

const QUERY_CUTTING_SCAN = ['cutting-scan-state'] as const;

const SHIFT_HOURS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

const DUMMY_TREND_BASE = [2, 5, 8, 11, 14, 16, 18, 20, 22, 24, 26, 28, 30];

const DUMMY_ACTIVITY_BASE = [8, 12, 18, 22, 25, 28, 32, 30, 35, 38, 40, 42, 45];

export default function DashboardCutting() {
    const { isOpen } = useSidebar();
    const sidebarWidth = isOpen ? '18%' : '5rem';

    const [bundleMetric, setBundleMetric] = useState(0);
    const [simulatedHourIndex, setSimulatedHourIndex] = useState(7);
    const [simulatedOutputCumul, setSimulatedOutputCumul] = useState(0);
    const [simulatedActivity, setSimulatedActivity] = useState<number[]>(() =>
        DUMMY_ACTIVITY_BASE.map((v) => v + Math.floor(Math.random() * 5))
    );

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

    const distributionData = useMemo(() => {
        const bundle = bundleMetric;
        const qc = scanDoc?.qc.history.length ?? 0;
        const store = scanDoc?.store.count ?? 0;
        const supply = scanDoc?.supply.count ?? 0;
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
    }, [bundleMetric, scanDoc]);

    const trendData = useMemo(() => {
        return SHIFT_HOURS.map((jam, i) => {
            const baseOutput = DUMMY_TREND_BASE[i] ?? 10;
            const simulated = i <= simulatedHourIndex ? simulatedOutputCumul % 4 : 0;
            const output = Math.min(35, baseOutput + simulated + (i <= simulatedHourIndex ? 1 : 0));
            return {
                jam: jam.slice(0, 5),
                output,
                target: 14,
            };
        });
    }, [simulatedHourIndex, simulatedOutputCumul]);

    const activityData = useMemo(() => {
        return SHIFT_HOURS.slice(0, 13).map((jam, i) => ({
            jam: jam.slice(0, 5),
            scan: simulatedActivity[i] ?? DUMMY_ACTIVITY_BASE[i] ?? 10,
        }));
    }, [simulatedActivity]);

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
                className="flex flex-col h-full min-h-0 relative z-10 transition-all duration-300 ease-in-out"
                style={{
                    marginLeft: sidebarWidth,
                    width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)',
                }}
            >
                <Header />

                {/*
                  Header fixed: h-12 / xs:h-14 / sm:h-16; logo di md+ lebih tinggi — beri ruang ekstra agar konten tidak tertutup.
                  Area utama: 3/5 scanning + 2/5 grafik (flex-[3] : flex-[2]).
                */}
                <main className="flex flex-col flex-1 min-h-0 w-full overflow-hidden bg-slate-50/50 px-2 md:px-3 pb-2 md:pb-3 pt-10 xs:pt-12 sm:pt-14 md:pt-[3.5rem] lg:pt-[4.5rem] gap-2">
                    <div className="flex-[3] min-h-0 min-w-0 flex flex-col overflow-hidden border border-blue-100 rounded-xl bg-white/80 shadow-sm p-1 md:p-1.5">
                        <CuttingProcessSection onBundleMetrics={setBundleMetric} />
                    </div>

                    <div className="flex-[2] min-h-0 min-w-0 flex flex-col overflow-hidden">
                        <CuttingDashboardCharts
                            distributionData={distributionData}
                            trendData={trendData}
                            activityData={activityData}
                            className="flex-1 min-h-0 h-full"
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}

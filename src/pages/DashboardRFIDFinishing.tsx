/**
 * DASHBOARD RFID FINISHING - ULTIMATE PRO VERSION
 * * Key Features:
 * 1. iPad/Tablet Grid Fix (md:grid-cols-12)
 * 2. Zero-Scroll Architecture (Smart Flexbox Layout)
 * 3. High-End Micro-Interactions & Hover Effects
 * 4. Staggered Animations for Elements
 */

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip
} from 'recharts';
import {
    BarChart3, Droplet, Layers, Table as TableIcon,
    Filter, Download, TrendingUp, Scan, Calendar,
    RefreshCcw, Zap
} from 'lucide-react';

// --- IMPORTS (Sesuaikan path jika perlu) ---
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useSidebar } from '../context/SidebarContext';
import backgroundImage from '../assets/background.jpg';
import ExportModal from '../components/ExportModal';
import { exportFinishingAllToExcel } from '../utils/exportFinishingAllToExcel';
import { getFinishingData, getFinishingDataByLine, API_BASE_URL, getDefaultHeaders } from '../config/api';
import ScanningFinishingModal from '../components/ScanningFinishingModal';
import { productionLinesMJL } from '../data/production_line';
import { Card, MetricCard } from '../components/finishing';
import { FinishingDetailModal, type FinishingMetricType, type FinishingSection } from '../components/finishing/FinishingDetailModal';

// --- CONSTANTS & THEME ---
const COLORS = {
    primary: '#0ea5e9',   // Sky 500
    secondary: '#8b5cf6', // Violet 500
    success: '#10b981',   // Emerald 500
    warning: '#f59e0b',   // Amber 500
    danger: '#ef4444',    // Red 500
    slate: '#64748b',     // Slate 500
    chart1: '#06b6d4',    // Cyan
    chart2: '#14b8a6',    // Teal
};

export default function DashboardRFIDFinishing() {
    const { isOpen } = useSidebar();

    // --- STATE ---
    const [isLoaded, setIsLoaded] = useState(false); // For entrance animation
    const [filterDateFrom, setFilterDateFrom] = useState<string>('');
    const [filterDateTo, setFilterDateTo] = useState<string>('');
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [filterWo, setFilterWo] = useState<string>('');
    const [showWoFilterModal, setShowWoFilterModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showDryroomScanModal, setShowDryroomScanModal] = useState(false);
    const [showFoldingScanModal, setShowFoldingScanModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailModalType, setDetailModalType] = useState<FinishingMetricType>('waiting');
    const [detailModalSection, setDetailModalSection] = useState<FinishingSection>('all');
    const [detailSearchQuery, setDetailSearchQuery] = useState('');

    // Initial load animation trigger
    useEffect(() => {
        setIsLoaded(true);
    }, []);

    // --- DATA FETCHING ---
    const {
        data: finishingResponse,
        isLoading,
        refetch: refetchFinishingData,
        isRefetching
    } = useQuery({
        queryKey: ['finishing-data'],
        queryFn: async () => {
            const response = await getFinishingData();
            if (!response.success || !response.data) throw new Error(response.error || 'Fetch Error');
            return response.data;
        },
        refetchInterval: 30000,
        retry: 3,
    });

    // --- DATA PROCESSING ---
    const {
        dryroomCheckIn, dryroomCheckOut, dryroomWaiting,
        foldingCheckIn, foldingCheckOut, foldingWaiting,
        totalFinishing, pieData
    } = useMemo(() => {
        const d_in = finishingResponse?.dryroom?.checkin ?? 0;
        const d_out = finishingResponse?.dryroom?.checkout ?? 0;
        const d_wait = finishingResponse?.dryroom?.waiting ?? 0;
        const f_in = finishingResponse?.folding?.checkin ?? 0;
        const f_out = finishingResponse?.folding?.checkout ?? 0;
        const f_wait = finishingResponse?.folding?.waiting ?? 0;

        const t_dry = d_in + d_out + d_wait;
        const t_fold = f_in + f_out + f_wait;

        return {
            dryroomCheckIn: d_in, dryroomCheckOut: d_out, dryroomWaiting: d_wait,
            foldingCheckIn: f_in, foldingCheckOut: f_out, foldingWaiting: f_wait,
            totalFinishing: t_dry + t_fold,
            pieData: [
                { name: 'Dryroom', value: t_dry, color: COLORS.chart1 },
                { name: 'Folding', value: t_fold, color: COLORS.chart2 }
            ]
        };
    }, [finishingResponse]);

    // Dummy Chart Data
    const chartData = useMemo(() => {
        const baseHour = 8;
        return Array.from({ length: 8 }, (_, i) => {
            const hour = baseHour + i;
            const seed = Math.sin(hour * 0.5) * 50;
            return {
                hour: `${hour.toString().padStart(2, '0')}:00`,
                value: Math.floor(150 + seed + (Math.random() * 20)),
            };
        });
    }, []);

    // Fetch finishing data untuk semua line (1-15)
    const productionLines = productionLinesMJL.filter(line => line.id !== 111 && line.id <= 15);

    const { data: allLineFinishingData, isLoading: isLoadingTableData } = useQuery({
        queryKey: ['finishing-data-all-lines'],
        queryFn: async () => {
            const results: Record<string, any> = {};

            // Fetch data untuk setiap line
            const promises = productionLines.map(async (line) => {
                const lineNumber = line.line || line.id.toString();
                try {
                    // Fetch finishing data per line
                    const finishingResponse = await getFinishingDataByLine(lineNumber);
                    const finishingData = finishingResponse.success ? finishingResponse.data : null;

                    // Fetch WO data dari monitoring/line
                    const woResponse = await fetch(`${API_BASE_URL}/monitoring/line?line=${encodeURIComponent(lineNumber)}`, {
                        headers: getDefaultHeaders()
                    });
                    const woData = woResponse.ok ? await woResponse.json() : null;

                    // Extract WO data
                    let woInfo = null;
                    if (woData && woData.success && woData.data) {
                        const data = Array.isArray(woData.data) ? woData.data[0] : woData.data;
                        woInfo = {
                            wo: data?.WO || data?.wo || data?.wo_no || '-',
                            style: data?.Style || data?.style || '-',
                            buyer: data?.Buyer || data?.buyer || '-',
                            item: data?.Item || data?.item || '-',
                            color: data?.Color || data?.color || '-',
                            size: data?.Size || data?.size || '-',
                        };
                    }

                    results[lineNumber] = {
                        finishing: finishingData,
                        wo: woInfo
                    };
                } catch (error) {
                    console.error(`Error fetching data for line ${lineNumber}:`, error);
                    results[lineNumber] = {
                        finishing: null,
                        wo: null
                    };
                }
            });

            await Promise.all(promises);
            return results;
        },
        refetchInterval: 30000,
        retry: 2,
    });

    // Data Finishing Table dari API
    const tableData = useMemo(() => {
        if (!allLineFinishingData) return [];

        return productionLines.map((line) => {
            const lineNumber = line.line || line.id.toString();
            const lineData = allLineFinishingData[lineNumber];

            if (!lineData) {
                return {
                    line: `Line ${lineNumber}`,
                    wo: '-',
                    style: '-',
                    buyer: '-',
                    dryroomQty: 0,
                    foldingQty: 0,
                };
            }

            const finishing = lineData.finishing;
            const wo = lineData.wo;

            // Calculate dryroom dan folding qty
            const dryroomQty = finishing?.dryroom
                ? (finishing.dryroom.waiting || 0) + (finishing.dryroom.checkin || 0) + (finishing.dryroom.checkout || 0)
                : 0;
            const foldingQty = finishing?.folding
                ? (finishing.folding.waiting || 0) + (finishing.folding.checkin || 0) + (finishing.folding.checkout || 0)
                : 0;

            return {
                line: `Line ${lineNumber}`,
                wo: wo?.wo || '-',
                style: wo?.style || '-',
                buyer: wo?.buyer || '-',
                dryroomQty,
                foldingQty,
            };
        });
    }, [allLineFinishingData, productionLines]);

    const filteredTableData = useMemo(() => {
        // Filter: hanya tampilkan baris yang memiliki data (WO bukan "-" atau ada dryroomQty/foldingQty > 0)
        let filtered = tableData.filter((item) => {
            const hasData = item.wo !== '-' || item.dryroomQty > 0 || item.foldingQty > 0;
            return hasData;
        });

        // Filter berdasarkan WO jika ada filter
        if (filterWo) {
            filtered = filtered.filter((item) => item.wo.toLowerCase().includes(filterWo.toLowerCase()));
        }

        return filtered;
    }, [filterWo, tableData]);

    const sidebarWidth = isOpen ? '18%' : '5rem';

    // State untuk detect mobile device
    const [isMobile, setIsMobile] = useState(false);

    // Effect untuk detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            // Gunakan breakpoint md (768px) sebagai batas mobile/desktop
            // Di bawah 768px = mobile, di atas = desktop
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className="flex h-screen w-full font-sans text-slate-800 bg-slate-50 overflow-hidden selection:bg-sky-100 selection:text-sky-900">
            {/* Background Texture */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover' }} />

            {/* Sidebar */}
            <div className="fixed left-0 top-0 h-full z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300">
                <Sidebar />
            </div>

            {/* Main Wrapper */}
            <div
                className="flex flex-col h-full relative z-10 transition-all duration-300 ease-in-out"
                style={{
                    marginLeft: sidebarWidth,
                    width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)'
                }}
            >
                <Header />

                {/* Dashboard Content - Conditional: Mobile dengan scrolling, Desktop tetap one page */}
                <main className={`flex-1 w-full p-2 md:p-3 lg:p-4 flex flex-col min-h-0 bg-slate-50/50 ${isMobile ? 'overflow-y-auto dashboard-scrollable' : 'overflow-hidden'}`}
                    style={isMobile ? { WebkitOverflowScrolling: 'touch' } : {}}
                >
                    {isMobile ? (
                        /* MOBILE VERSION: Scrolling dengan layout portrait */
                        <div className={`pt-14 flex flex-col gap-3 lg:gap-4 transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0 translate-y-4'}`}>
                            {/* BAGIAN ATAS: OVERVIEW CARD - Full width di mobile */}
                            <div className="flex-none w-full min-h-[250px]">
                                <Card
                                    title="Overview Data Finishing"
                                    icon={BarChart3}
                                    className="w-full h-full min-h-[250px] border-t-4 border-t-sky-500"
                                    action={(
                                        <div className="flex items-center gap-2">
                                            <ActionButton onClick={() => setShowFilterModal(true)} icon={Calendar} label="Date" />
                                            <ActionButton onClick={() => setShowWoFilterModal(true)} icon={Filter} label="WO" active={!!filterWo} />
                                            <button onClick={() => refetchFinishingData()} className="p-1.5 hover:bg-slate-100 rounded-full transition-all hover:rotate-180 duration-500 text-slate-400 hover:text-sky-600">
                                                <RefreshCcw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
                                            </button>
                                        </div>
                                    )}
                                >
                                    {isLoading ? <Skeleton className="w-full h-full" /> : (
                                        <div className="flex items-center h-full px-2 group">
                                            {/* Donut Chart */}
                                            <div className="w-1/2 h-full relative min-h-[120px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={pieData}
                                                            cx="50%" cy="50%"
                                                            innerRadius="50%" outerRadius="80%"
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                            stroke="none"
                                                        >
                                                            {pieData.map((entry, index) => (
                                                                <Cell
                                                                    key={`cell-${index}`}
                                                                    fill={entry.color}
                                                                    className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                                                                    style={{ filter: 'drop-shadow(0px 4px 4px rgba(0,0,0,0.15))' }}
                                                                />
                                                            ))}
                                                        </Pie>
                                                        <RechartsTooltip
                                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                                            itemStyle={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>

                                            {/* Statistics */}
                                            <div className="w-1/2 flex flex-col items-center justify-center pl-2">
                                                <span className="font-bold text-slate-500 mb-1 text-[clamp(0.7rem,1vw,0.85rem)] uppercase tracking-wide">
                                                    Total Output
                                                </span>
                                                <span
                                                    className="font-black text-transparent bg-clip-text bg-gradient-to-br from-sky-500 to-indigo-600 tracking-tight leading-none drop-shadow-sm transition-all duration-300 hover:scale-105 cursor-default"
                                                    style={{ fontSize: 'clamp(2.5rem, 4vw, 4rem)' }}
                                                >
                                                    {totalFinishing.toLocaleString()}
                                                </span>
                                                <div className="mt-4 flex flex-wrap justify-center gap-2 text-[10px] font-bold text-slate-500">
                                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-full border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" /> Dryroom
                                                    </div>
                                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-full border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                                        <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" /> Folding
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            </div>

                            {/* BAGIAN TENGAH: DRYROOM CARD - Full width di mobile */}
                            <div className="flex-none w-full min-h-[180px]">
                                <Card
                                    title="Dryroom Station Finishing"
                                    icon={Droplet}
                                    className="w-full h-full min-h-[180px] border-l-4 border-l-cyan-400"
                                    iconColor="text-cyan-600"
                                    action={<ScanButton onClick={() => setShowDryroomScanModal(true)} color="cyan" />}
                                    compactBody
                                >
                                    <div className="grid grid-cols-3 gap-2 p-2 h-full items-stretch">
                                        <MetricCard
                                            label="Waiting"
                                            value={dryroomWaiting}
                                            type="waiting"
                                            compact
                                            onClick={() => {
                                                setDetailModalType('waiting');
                                                setDetailModalSection('dryroom');
                                                setShowDetailModal(true);
                                                setDetailSearchQuery('');
                                            }}
                                        />
                                        <MetricCard
                                            label="Check In"
                                            value={dryroomCheckIn}
                                            type="checkin"
                                            compact
                                            onClick={() => {
                                                setDetailModalType('checkin');
                                                setDetailModalSection('dryroom');
                                                setShowDetailModal(true);
                                                setDetailSearchQuery('');
                                            }}
                                        />
                                        <MetricCard
                                            label="Check Out"
                                            value={dryroomCheckOut}
                                            type="checkout"
                                            compact
                                            onClick={() => {
                                                setDetailModalType('checkout');
                                                setDetailModalSection('dryroom');
                                                setShowDetailModal(true);
                                                setDetailSearchQuery('');
                                            }}
                                        />
                                    </div>
                                </Card>
                            </div>

                            {/* BAGIAN TENGAH: FOLDING CARD - Full width di mobile */}
                            <div className="flex-none w-full min-h-[180px]">
                                <Card
                                    title="Folding Station Finishing"
                                    icon={Layers}
                                    className="w-full h-full min-h-[180px] border-l-4 border-l-teal-400"
                                    iconColor="text-teal-600"
                                    action={<ScanButton onClick={() => setShowFoldingScanModal(true)} color="teal" />}
                                    compactBody
                                >
                                    <div className="grid grid-cols-3 gap-2 p-2 h-full items-stretch">
                                        <MetricCard
                                            label="Waiting"
                                            value={foldingWaiting}
                                            type="waiting"
                                            compact
                                            onClick={() => {
                                                setDetailModalType('waiting');
                                                setDetailModalSection('folding');
                                                setShowDetailModal(true);
                                                setDetailSearchQuery('');
                                            }}
                                        />
                                        <MetricCard
                                            label="Check In"
                                            value={foldingCheckIn}
                                            type="checkin"
                                            compact
                                            onClick={() => {
                                                setDetailModalType('checkin');
                                                setDetailModalSection('folding');
                                                setShowDetailModal(true);
                                                setDetailSearchQuery('');
                                            }}
                                        />
                                        <MetricCard
                                            label="Shipment"
                                            value={foldingCheckOut}
                                            type="checkout"
                                            compact
                                            onClick={() => {
                                                setDetailModalType('checkout');
                                                setDetailModalSection('folding');
                                                setShowDetailModal(true);
                                                setDetailSearchQuery('');
                                            }}
                                        />
                                    </div>
                                </Card>
                            </div>

                            {/* BAGIAN TENGAH: DATA TABLE - Full width di mobile */}
                            <div className="flex-none w-full min-h-[300px]">
                                <Card
                                    title="Data Finishing Detail Finishing"
                                    icon={TableIcon}
                                    className="w-full h-full min-h-[300px] flex flex-col group/table"
                                    action={(
                                        <div className="flex items-center gap-2">
                                            <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                            <ActionButton onClick={() => setShowExportModal(true)} icon={Download} label="Export" variant="primary" />
                                        </div>
                                    )}
                                >
                                    <div className="flex-1 min-h-0 overflow-hidden relative bg-white rounded-b-2xl">
                                        <div className="h-full w-full overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400 transition-colors">
                                            <table className="w-full text-left border-collapse min-w-full">
                                                <thead className="bg-slate-50/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
                                                    <tr>
                                                        {['Line', 'WO', 'Style', 'Buyer', 'Dryroom', 'Folding', 'Total'].map((head, idx) => (
                                                            <th key={head} className={`px-4 py-3 font-bold text-slate-600 border-b border-slate-200 text-[clamp(10px,0.9vw,12px)] uppercase tracking-wider ${idx === 0 ? 'pl-5' : ''}`}>
                                                                {head}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {isLoadingTableData ? (
                                                        Array.from({ length: 5 }).map((_, i) => (
                                                            <tr key={i}><td colSpan={7} className="p-3"><Skeleton className="h-8 w-full rounded-lg" /></td></tr>
                                                        ))
                                                    ) : filteredTableData.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">
                                                                Tidak ada data
                                                            </td>
                                                        </tr>
                                                    ) : filteredTableData.map((item, index) => {
                                                        const total = item.dryroomQty + item.foldingQty;
                                                        return (
                                                            <tr key={index} className="hover:bg-sky-50/60 transition-colors group/row cursor-default">
                                                                <td className="px-4 py-3 pl-5 font-bold text-slate-600 text-[clamp(11px,1vw,13px)] border-l-2 border-transparent group-hover/row:border-sky-500">
                                                                    {item.line}
                                                                </td>
                                                                <td className="px-4 py-3 font-semibold text-sky-700 text-[clamp(11px,1vw,13px)]">
                                                                    {item.wo}
                                                                </td>
                                                                <td className="px-4 py-3 text-slate-700 font-medium text-[clamp(11px,1vw,13px)] truncate max-w-[150px]" title={item.style}>
                                                                    {item.style}
                                                                </td>
                                                                <td className="px-4 py-3 text-slate-600 font-medium text-[clamp(11px,1vw,13px)] truncate max-w-[180px]" title={item.buyer}>
                                                                    {item.buyer}
                                                                </td>
                                                                <td className="px-4 py-3 font-bold text-cyan-600 bg-cyan-50/50 text-[clamp(11px,1vw,13px)] tabular-nums">
                                                                    {item.dryroomQty.toLocaleString()}
                                                                </td>
                                                                <td className="px-4 py-3 font-bold text-teal-600 bg-teal-50/50 text-[clamp(11px,1vw,13px)] tabular-nums">
                                                                    {item.foldingQty.toLocaleString()}
                                                                </td>
                                                                <td className="px-4 py-3 font-bold text-blue-600 bg-blue-50/50 text-[clamp(11px,1vw,13px)] tabular-nums">
                                                                    {total.toLocaleString()}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* BAGIAN BAWAH: TREND CHART - Full width di mobile */}
                            <div className="flex-none w-full min-h-[250px]">
                                <Card
                                    title="Hourly Output Trend"
                                    icon={TrendingUp}
                                    className="w-full h-full min-h-[250px]"
                                    action={
                                        <div className="flex items-center gap-2 px-2 py-1 bg-slate-100/50 rounded-lg border border-slate-200/50">
                                            <Zap className="w-3 h-3 text-violet-500 fill-violet-500" />
                                            <span className="text-[10px] font-bold text-violet-700">Live Data</span>
                                        </div>
                                    }
                                >
                                    <div className="h-full w-full p-2 pb-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                                                <defs>
                                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                                <XAxis
                                                    dataKey="hour"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                                    dy={10}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                                />
                                                <RechartsTooltip
                                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                                                    labelStyle={{ color: '#64748b', marginBottom: '0.25rem', fontSize: '12px' }}
                                                    cursor={{ stroke: '#8b5cf6', strokeWidth: 1, strokeDasharray: '4 4' }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="value"
                                                    stroke="#8b5cf6"
                                                    strokeWidth={3}
                                                    fillOpacity={1}
                                                    fill="url(#colorValue)"
                                                    animationDuration={1500}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                            </div>

                            {/* Footer untuk mobile */}
                            <div className="flex-none w-full py-4">
                                <Footer />
                            </div>
                        </div>
                    ) : (
                        /* DESKTOP VERSION: One page, layout tetap sama seperti sebelumnya */
                        <div className={`pt-14 grid grid-cols-1 md:grid-cols-12 gap-3 lg:gap-4 h-full min-h-0 transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0 translate-y-4'}`}>

                            {/* === LEFT COLUMN (5/12) === */}
                            <div className="md:col-span-5 flex flex-col gap-3 lg:gap-4 h-full min-h-0">

                                {/* 1. OVERVIEW CARD */}
                                <Card
                                    title="Overview Data Finishing"
                                    icon={BarChart3}
                                    className="flex-[0.4] min-h-0 border-t-4 border-t-sky-500"
                                    action={(
                                        <div className="flex items-center gap-2">
                                            <ActionButton onClick={() => setShowFilterModal(true)} icon={Calendar} label="Date" />
                                            <ActionButton onClick={() => setShowWoFilterModal(true)} icon={Filter} label="WO" active={!!filterWo} />
                                            <button onClick={() => refetchFinishingData()} className="p-1.5 hover:bg-slate-100 rounded-full transition-all hover:rotate-180 duration-500 text-slate-400 hover:text-sky-600">
                                                <RefreshCcw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
                                            </button>
                                        </div>
                                    )}
                                >
                                    {isLoading ? <Skeleton className="w-full h-full" /> : (
                                        <div className="flex items-center h-full px-2 group">
                                            {/* Donut Chart */}
                                            <div className="w-1/2 h-full relative min-h-[120px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={pieData}
                                                            cx="50%" cy="50%"
                                                            innerRadius="50%" outerRadius="80%"
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                            stroke="none"
                                                        >
                                                            {pieData.map((entry, index) => (
                                                                <Cell
                                                                    key={`cell-${index}`}
                                                                    fill={entry.color}
                                                                    className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                                                                    style={{ filter: 'drop-shadow(0px 4px 4px rgba(0,0,0,0.15))' }}
                                                                />
                                                            ))}
                                                        </Pie>
                                                        <RechartsTooltip
                                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                                            itemStyle={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                {/* Center Label */}

                                            </div>

                                            {/* Statistics */}
                                            <div className="w-1/2 flex flex-col items-center justify-center pl-2">
                                                <span className="font-bold text-slate-500 mb-1 text-[clamp(0.7rem,1vw,0.85rem)] uppercase tracking-wide">
                                                    Total Output
                                                </span>
                                                <span
                                                    className="font-black text-transparent bg-clip-text bg-gradient-to-br from-sky-500 to-indigo-600 tracking-tight leading-none drop-shadow-sm transition-all duration-300 hover:scale-105 cursor-default"
                                                    style={{ fontSize: 'clamp(2.5rem, 4vw, 4rem)' }}
                                                >
                                                    {totalFinishing.toLocaleString()}
                                                </span>
                                                <div className="mt-4 flex flex-wrap justify-center gap-2 text-[10px] font-bold text-slate-500">
                                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-full border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" /> Dryroom
                                                    </div>
                                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-full border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                                        <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" /> Folding
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Card>

                                {/* 2. DRYROOM CARD */}
                                <Card
                                    title="Dryroom Station Finishing"
                                    icon={Droplet}
                                    className="flex-[0.3] min-h-0 border-l-4 border-l-cyan-400"
                                    iconColor="text-cyan-600"
                                    action={<ScanButton onClick={() => setShowDryroomScanModal(true)} color="cyan" />}
                                    compactBody
                                >
                                    <div className="grid grid-cols-3 gap-1.5 lg:gap-2 p-1 lg:p-2 h-full items-stretch">
                                        <MetricCard
                                            label="Waiting"
                                            value={dryroomWaiting}
                                            type="waiting"
                                            compact
                                            onClick={() => {
                                                setDetailModalType('waiting');
                                                setDetailModalSection('dryroom');
                                                setShowDetailModal(true);
                                                setDetailSearchQuery('');
                                            }}
                                        />
                                        <MetricCard
                                            label="Check In"
                                            value={dryroomCheckIn}
                                            type="checkin"
                                            compact
                                            onClick={() => {
                                                setDetailModalType('checkin');
                                                setDetailModalSection('dryroom');
                                                setShowDetailModal(true);
                                                setDetailSearchQuery('');
                                            }}
                                        />
                                        <MetricCard
                                            label="Check Out"
                                            value={dryroomCheckOut}
                                            type="checkout"
                                            compact
                                            onClick={() => {
                                                setDetailModalType('checkout');
                                                setDetailModalSection('dryroom');
                                                setShowDetailModal(true);
                                                setDetailSearchQuery('');
                                            }}
                                        />
                                    </div>
                                </Card>

                                {/* 3. FOLDING CARD */}
                                <Card
                                    title="Folding Station Finishing"
                                    icon={Layers}
                                    className="flex-[0.3] min-h-0 border-l-4 border-l-teal-400"
                                    iconColor="text-teal-600"
                                    action={<ScanButton onClick={() => setShowFoldingScanModal(true)} color="teal" />}
                                    compactBody
                                >
                                    <div className="grid grid-cols-3 gap-1.5 lg:gap-2 p-1 lg:p-2 h-full items-stretch">
                                        <MetricCard
                                            label="Waiting"
                                            value={foldingWaiting}
                                            type="waiting"
                                            compact
                                            onClick={() => {
                                                setDetailModalType('waiting');
                                                setDetailModalSection('folding');
                                                setShowDetailModal(true);
                                                setDetailSearchQuery('');
                                            }}
                                        />
                                        <MetricCard
                                            label="Check In"
                                            value={foldingCheckIn}
                                            type="checkin"
                                            compact
                                            onClick={() => {
                                                setDetailModalType('checkin');
                                                setDetailModalSection('folding');
                                                setShowDetailModal(true);
                                                setDetailSearchQuery('');
                                            }}
                                        />
                                        <MetricCard
                                            label="Shipment"
                                            value={foldingCheckOut}
                                            type="checkout"
                                            compact
                                            onClick={() => {
                                                setDetailModalType('checkout');
                                                setDetailModalSection('folding');
                                                setShowDetailModal(true);
                                                setDetailSearchQuery('');
                                            }}
                                        />
                                    </div>
                                </Card>

                            </div>

                            {/* === RIGHT COLUMN (7/12) === */}
                            <div className="md:col-span-7 flex flex-col gap-3 lg:gap-4 h-full min-h-0">

                                {/* 4. DATA TABLE */}
                                <Card
                                    title="Data Finishing Detail Finishing"
                                    icon={TableIcon}
                                    className="flex-[0.7] min-h-[300px] flex flex-col group/table"
                                    action={(
                                        <div className="flex items-center gap-2">
                                            <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                            <ActionButton onClick={() => setShowExportModal(true)} icon={Download} label="Export" variant="primary" />
                                        </div>
                                    )}
                                >
                                    <div className="flex-1 min-h-0 overflow-hidden relative bg-white rounded-b-2xl">
                                        <div className="h-full w-full overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400 transition-colors">
                                            <table className="w-full text-left border-collapse min-w-full">
                                                <thead className="bg-slate-50/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
                                                    <tr>
                                                        {['Line', 'WO', 'Style', 'Buyer', 'Dryroom', 'Folding', 'Total'].map((head, idx) => (
                                                            <th key={head} className={`px-4 py-3 font-bold text-slate-600 border-b border-slate-200 text-[clamp(10px,0.9vw,12px)] uppercase tracking-wider ${idx === 0 ? 'pl-5' : ''}`}>
                                                                {head}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {isLoadingTableData ? (
                                                        Array.from({ length: 5 }).map((_, i) => (
                                                            <tr key={i}><td colSpan={7} className="p-3"><Skeleton className="h-8 w-full rounded-lg" /></td></tr>
                                                        ))
                                                    ) : filteredTableData.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">
                                                                Tidak ada data
                                                            </td>
                                                        </tr>
                                                    ) : filteredTableData.map((item, index) => {
                                                        const total = item.dryroomQty + item.foldingQty;
                                                        return (
                                                            <tr key={index} className="hover:bg-sky-50/60 transition-colors group/row cursor-default">
                                                                <td className="px-4 py-3 pl-5 font-bold text-slate-600 text-[clamp(11px,1vw,13px)] border-l-2 border-transparent group-hover/row:border-sky-500">
                                                                    {item.line}
                                                                </td>
                                                                <td className="px-4 py-3 font-semibold text-sky-700 text-[clamp(11px,1vw,13px)]">
                                                                    {item.wo}
                                                                </td>
                                                                <td className="px-4 py-3 text-slate-700 font-medium text-[clamp(11px,1vw,13px)] truncate max-w-[150px]" title={item.style}>
                                                                    {item.style}
                                                                </td>
                                                                <td className="px-4 py-3 text-slate-600 font-medium text-[clamp(11px,1vw,13px)] truncate max-w-[180px]" title={item.buyer}>
                                                                    {item.buyer}
                                                                </td>
                                                                <td className="px-4 py-3 font-bold text-cyan-600 bg-cyan-50/50 text-[clamp(11px,1vw,13px)] tabular-nums">
                                                                    {item.dryroomQty.toLocaleString()}
                                                                </td>
                                                                <td className="px-4 py-3 font-bold text-teal-600 bg-teal-50/50 text-[clamp(11px,1vw,13px)] tabular-nums">
                                                                    {item.foldingQty.toLocaleString()}
                                                                </td>
                                                                <td className="px-4 py-3 font-bold text-blue-600 bg-blue-50/50 text-[clamp(11px,1vw,13px)] tabular-nums">
                                                                    {total.toLocaleString()}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </Card>

                                {/* 5. TREND CHART */}
                                <Card
                                    title="Hourly Output Trend"
                                    icon={TrendingUp}
                                    className="flex-[0.4] min-h-0"
                                    action={
                                        <div className="flex items-center gap-2 px-2 py-1 bg-slate-100/50 rounded-lg border border-slate-200/50">
                                            <Zap className="w-3 h-3 text-violet-500 fill-violet-500" />
                                            <span className="text-[10px] font-bold text-violet-700">Live Data</span>
                                        </div>
                                    }
                                >
                                    <div className="h-full w-full p-2 pb-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                                                <defs>
                                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                                <XAxis
                                                    dataKey="hour"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                                    dy={10}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                                />
                                                <RechartsTooltip
                                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                                                    labelStyle={{ color: '#64748b', marginBottom: '0.25rem', fontSize: '12px' }}
                                                    cursor={{ stroke: '#8b5cf6', strokeWidth: 1, strokeDasharray: '4 4' }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="value"
                                                    stroke="#8b5cf6"
                                                    strokeWidth={3}
                                                    fillOpacity={1}
                                                    fill="url(#colorValue)"
                                                    animationDuration={1500}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                            </div>
                        </div>
                    )}

                    {/* Footer untuk desktop - hanya tampil jika bukan mobile */}
                    {!isMobile && (
                        <div className="absolute bottom-2 right-4 z-0 pointer-events-none opacity-40 scale-90 origin-bottom-right transition-opacity hover:opacity-100">
                            <Footer />
                        </div>
                    )}

                </main>
            </div>

            {/* --- MODALS (Functional) --- */}
            <SimpleModal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} title="Filter Date Range">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">From</label><input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">To</label><input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                    </div>
                    <div className="flex justify-end pt-2"><button onClick={() => setShowFilterModal(false)} className="bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-sky-700">Apply</button></div>
                </div>
            </SimpleModal>

            <SimpleModal isOpen={showWoFilterModal} onClose={() => setShowWoFilterModal(false)} title="Search WO">
                <select value={filterWo} onChange={(e) => setFilterWo(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm bg-white"><option value="">All WO</option>{tableData.map(r => <option key={r.wo} value={r.wo}>{r.wo}</option>)}</select>
                <div className="flex justify-end pt-4"><button onClick={() => setShowWoFilterModal(false)} className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-violet-700">Search</button></div>
            </SimpleModal>

            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={async (fmt) => {
                    // Transform data untuk export finishing all
                    const exportData = filteredTableData.map((row) => {
                        const lineNumber = row.line.replace('Line ', '');
                        const lineData = allLineFinishingData?.[lineNumber];
                        const finishing = lineData?.finishing;

                        // Get dryroom data
                        const dryroomWaiting = finishing?.dryroom?.waiting || 0;
                        const dryroomCheckIn = finishing?.dryroom?.checkin || 0;
                        const dryroomCheckOut = finishing?.dryroom?.checkout || 0;

                        // Get folding data
                        const foldingWaiting = finishing?.folding?.waiting || 0;
                        const foldingCheckIn = finishing?.folding?.checkin || 0;
                        const foldingCheckOut = finishing?.folding?.checkout || 0;

                        // Calculate total finishing (sum of all quantities)
                        const totalFinishing = dryroomWaiting + dryroomCheckIn + dryroomCheckOut +
                            foldingWaiting + foldingCheckIn + foldingCheckOut;

                        // Calculate balance: (Waiting + Check In) - Check Out
                        // Balance = items still in process - items completed
                        const balance = (dryroomWaiting + dryroomCheckIn + foldingWaiting + foldingCheckIn) -
                            (dryroomCheckOut + foldingCheckOut);

                        // Get item from wo data
                        const item = lineData?.wo?.item || '-';

                        return {
                            line: row.line,
                            wo: row.wo,
                            style: row.style,
                            item: item,
                            buyer: row.buyer,
                            totalFinishing,
                            dryroomWaiting,
                            dryroomCheckIn,
                            dryroomCheckOut,
                            foldingWaiting,
                            foldingCheckIn,
                            foldingCheckOut,
                            balance
                        };
                    });

                    await exportFinishingAllToExcel(exportData, fmt, filterDateFrom, filterDateTo);
                }}
                lineId="FIN"
            />

            <ScanningFinishingModal isOpen={showDryroomScanModal} onClose={() => setShowDryroomScanModal(false)} type="dryroom" />
            <ScanningFinishingModal isOpen={showFoldingScanModal} onClose={() => setShowFoldingScanModal(false)} type="folding" />

            {/* Finishing Detail Modal */}
            <FinishingDetailModal
                isOpen={showDetailModal}
                onClose={() => {
                    setShowDetailModal(false);
                    setDetailSearchQuery('');
                }}
                type={detailModalType}
                section={detailModalSection}
                searchQuery={detailSearchQuery}
                onSearchChange={setDetailSearchQuery}
                totalData={0}
            />

            <style>{`.scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; } .scrollbar-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }`}</style>
        </div>
    );
}

// --- PRO COMPONENTS ---


const Skeleton = ({ className }: { className?: string }) => <div className={`animate-pulse bg-slate-100 rounded ${className}`} />;

function ScanButton({ onClick, color }: any) {
    const bg = color === 'cyan'
        ? 'from-cyan-500 to-sky-600 shadow-cyan-200/50 hover:shadow-cyan-300/60'
        : 'from-teal-500 to-emerald-600 shadow-teal-200/50 hover:shadow-teal-300/60';

    return (
        <button onClick={onClick} className={`
            group relative flex items-center gap-2 px-3 py-1.5 rounded-lg 
            text-[clamp(10px,0.9vw,12px)] font-bold text-white shadow-lg 
            bg-gradient-to-r ${bg} transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden ring-offset-2 focus:ring-2
        `}>
            <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-out" />
            <Scan className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:rotate-12 transition-transform" />
            <span className="tracking-wide">SCAN</span>
        </button>
    );
}

function ActionButton({ onClick, icon: Icon, label, variant = 'default', active }: any) {
    const baseClass = "relative flex items-center justify-center w-7 h-7 rounded-md transition-all duration-200 active:scale-95 select-none";
    const variants = {
        default: active
            ? "bg-violet-100 text-violet-600 shadow-sm ring-1 ring-violet-200"
            : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 shadow-sm",
        primary: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm hover:shadow",
    };
    return (
        <button onClick={onClick} className={`${baseClass} ${(variants as any)[variant]}`} title={label} aria-label={label}>
            <Icon className="w-3.5 h-3.5" />
            {active && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse" />}
        </button>
    );
}

function SimpleModal({ isOpen, onClose, title, children }: any) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[4px] flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden scale-100 animate-in zoom-in-95 duration-300 border border-white/20" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                    <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full p-1 transition-all">&times;</button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}
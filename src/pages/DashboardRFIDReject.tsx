import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useSidebar } from '../context/SidebarContext';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { BarChart3, Table, Filter, Download, Calendar, TrendingUp, AlertTriangle, XCircle } from 'lucide-react';
import ExportModal from '../components/ExportModal';
import { exportToExcel, type ExportType } from '../utils/exportToExcel';
import { getFinishingData } from '../config/api';
import { Card, MetricCard, FilterButton } from '../components/finishing';
import ScanningFinishingModal from '../components/ScanningFinishingModal';

interface LineRejectData {
    line: string;
    wo: string;
    checkIn: number;
    checkOut: number;
    mati: number;
    waiting: number;
}

export default function DashboardRFIDReject() {
    const { isOpen } = useSidebar();
    const queryClient = useQueryClient();
    const [isLoaded, setIsLoaded] = useState(false);

    // --- STATE UNTUK FILTER & EXPORT (DATA REJECT PER LINE) ---
    const [filterDateFrom, setFilterDateFrom] = useState<string>('');
    const [filterDateTo, setFilterDateTo] = useState<string>('');
    const [showFilterModal, setShowFilterModal] = useState(false);

    const [filterWo, setFilterWo] = useState<string>('');
    const [showWoFilterModal, setShowWoFilterModal] = useState(false);

    const [showExportModal, setShowExportModal] = useState(false);

    // --- STATE UNTUK SCANNING MODAL ---
    const [showRejectScanModal, setShowRejectScanModal] = useState(false);
    const [rejectScanAction, setRejectScanAction] = useState<'checkin' | 'checkout'>('checkin');
    const [rejectScanLabel, setRejectScanLabel] = useState<string>('Check In');

    // Effect untuk animation
    useEffect(() => {
        setIsLoaded(true);
    }, []);

    // Fetch data finishing dari API untuk mendapatkan data reject_room
    const { data: finishingResponse } = useQuery({
        queryKey: ['finishing-data-reject'],
        queryFn: async () => {
            const response = await getFinishingData();
            if (!response.success || !response.data) {
                throw new Error(response.error || 'Gagal mengambil data finishing');
            }
            return response.data;
        },
        refetchInterval: 30000, // Refetch setiap 30 detik
        retry: 3,
    });

    // Data reject dari API atau default values
    const rejectCheckIn = finishingResponse?.reject_room?.checkin ?? 0;
    const rejectCheckOut = finishingResponse?.reject_room?.checkout ?? 0;
    const rejectMati = finishingResponse?.reject_room?.reject_mati ?? 0;
    const waitingReject = finishingResponse?.reject_room?.waiting ?? 0;

    const totalReject = rejectCheckIn + rejectCheckOut + rejectMati;

    const pieStatusData = [
        { name: 'Check In', value: rejectCheckIn, color: '#0ea5e9' },
        { name: 'Check Out', value: rejectCheckOut, color: '#22c55e' },
        { name: 'Reject Mati', value: rejectMati, color: '#ef4444' },
        { name: 'Waiting Reject', value: waitingReject, color: '#f97316' },
    ];

    const lineRejectData = [
        { line: 'LINE 1', wo: 'WO-001', checkIn: 35, checkOut: 30, mati: 8, waiting: 5 },
        { line: 'LINE 2', wo: 'WO-002', checkIn: 28, checkOut: 24, mati: 6, waiting: 4 },
        { line: 'LINE 3', wo: 'WO-003', checkIn: 25, checkOut: 21, mati: 5, waiting: 4 },
        { line: 'LINE 4', wo: 'WO-004', checkIn: 22, checkOut: 19, mati: 5, waiting: 3 },
        { line: 'LINE 5', wo: 'WO-005', checkIn: 19, checkOut: 16, mati: 4, waiting: 3 },
        { line: 'LINE 6', wo: 'WO-006', checkIn: 18, checkOut: 15, mati: 4, waiting: 3 },
        { line: 'LINE 7', wo: 'WO-007', checkIn: 17, checkOut: 14, mati: 4, waiting: 3 },
        { line: 'LINE 8', wo: 'WO-008', checkIn: 16, checkOut: 13, mati: 3, waiting: 3 },
        { line: 'LINE 9', wo: 'WO-009', checkIn: 20, checkOut: 18, mati: 5, waiting: 2 },
    ];

    const filteredLineRejectData = useMemo(() => {
        if (!filterWo) return lineRejectData;
        return lineRejectData.filter((row) => row.wo === filterWo);
    }, [filterWo]);

    // Data untuk grafik Right first time Month (Jan-Dec)
    const rightFirstTimeData = useMemo(() => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        // Data sesuai gambar: mulai 97.0%, turun ke 90.65% di May, naik lagi
        const percentages = [97.0, 97.4, 96.98, 90.65, 96.55, 96.69,
            96.34, 97.19, 96.80, 96.82, 96.89, 96.85];
        return months.map((month, idx) => ({
            month: month.substring(0, 3), // Jan, Feb, Mar, etc
            monthFull: month,
            percentage: percentages[idx]
        }));
    }, []);

    // Data untuk grafik Data reject per jam (8 jam: 08:00 - 15:00) untuk LINE 1, LINE 2, LINE 3
    const rejectPerHourLineData = useMemo(() => {
        const hours = Array.from({ length: 8 }, (_, i) => i + 8); // 8 sampai 15 (08:00 - 15:00)
        const selectedLines = lineRejectData.slice(0, 3); // Hanya LINE 1, LINE 2, LINE 3

        // Fungsi untuk generate nilai konsisten berdasarkan seed
        const seededRandom = (seed: number) => {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        };

        return hours.map((hour) => {
            const data: { hour: string;[key: string]: string | number } = { hour: `${hour.toString().padStart(2, '0')}:00` };
            selectedLines.forEach((line, lineIdx) => {
                // Generate nilai konsisten berdasarkan hour dan lineIdx
                const seed = hour * 100 + lineIdx;
                const randomValue = seededRandom(seed);
                // Generate reject per jam (0-15) dengan pola yang konsisten
                const rejectCount = Math.floor(randomValue * 16);
                data[line.line] = rejectCount;
            });
            return data;
        });
    }, [lineRejectData]);

    // Data untuk tabel Detail Data Reject Garment
    const detailRejectGarmentData = useMemo(() => {
        return filteredLineRejectData.map((row, idx) => ({
            no: idx + 1,
            line: row.line,
            wo: row.wo,
            style: `STYLE-${idx + 1}`,
            qty: row.checkIn + row.checkOut + row.mati
        }));
    }, [filteredLineRejectData]);

    const sidebarWidth = isOpen ? '18%' : '5rem';

    return (
        <div className="flex h-screen w-screen bg-[#f8fafc] font-sans text-slate-800 overflow-hidden relative selection:bg-sky-200 selection:text-sky-900">
            {/* Background Pattern */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-40"
                style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }}
            />

            {/* SIDEBAR */}
            <aside className="fixed left-0 top-0 h-full z-[60] shadow-2xl shadow-slate-200/50 transition-all duration-300">
                <Sidebar />
            </aside>

            {/* MAIN WRAPPER */}
            <div
                className="flex flex-col h-full relative z-10 transition-all duration-300 ease-in-out"
                style={{
                    marginLeft: sidebarWidth,
                    width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)'
                }}
            >
                {/* HEADER */}
                <Header />

                {/* MAIN CONTENT */}
                <main className={`
                    flex-1 flex flex-col
                    transition-opacity duration-700 ease-out
                    ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                    overflow-y-auto md:overflow-hidden bg-[#f8fafc]
                `}
                    style={{
                        height: '100vh',
                        maxHeight: '100vh',
                        padding: 'clamp(0.5rem, 1vh, 1rem)',
                        paddingTop: 'clamp(4rem, 6vh, 5.5rem)',
                        gap: 'clamp(0.25rem, 1vh, 1rem)'
                    }}
                >
                    {/* UNIFIED RESPONSIVE LAYOUT - SQUISHABLE */}

                    {/* ROW 1: 3 Cards - Overview, RFT, Reject per Jam */}
                    {/* MD+ (Tablet/Desktop): 3 Columns, Flex-1 (Fit to screen height), min-h-0 to allow shrinking */}
                    <div className="grid grid-cols-1 md:grid-cols-3 flex-none md:flex-1 min-h-0"
                        style={{ gap: 'clamp(0.25rem, 1vh, 1rem)' }}>

                        {/* OVERVIEW DATA REJECT */}
                        <Card title="Overview Data Reject" icon={BarChart3} className="group hover:shadow-xl transition-all duration-300 flex flex-col h-[300px] md:h-full min-h-0">
                            <div className="flex items-center justify-between h-full min-h-0 px-2 md:px-3 gap-2">
                                {/* Pie Chart */}
                                <div className="flex-1 h-full min-h-0 relative animate-fade-in">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieStatusData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius="35%"
                                                outerRadius="65%"
                                                paddingAngle={4}
                                                dataKey="value"
                                                stroke="none"
                                                cornerRadius={6}
                                                animationBegin={0}
                                                animationDuration={800}
                                            >
                                                {pieStatusData.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={entry.color}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    fontSize: '11px',
                                                    borderRadius: '8px',
                                                    padding: '4px 8px'
                                                }}
                                                formatter={(value: number) => [value.toLocaleString(), '']}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                {/* TOTAL REJECT */}
                                <div className="flex flex-col items-center justify-center min-w-[30%] animate-slide-in-right shrink-0">
                                    <span className="font-semibold text-slate-600 mb-0 md:mb-1 uppercase tracking-wider text-center leading-tight whitespace-nowrap"
                                        style={{ fontSize: 'clamp(0.8rem, 1.5vh, 1.2rem)' }}>
                                        TOTAL REJECT
                                    </span>
                                    <span className="font-black tracking-tight text-red-600 leading-none"
                                        style={{ fontSize: 'clamp(3.5rem, 10vh, 6rem)' }}>
                                        {totalReject.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </Card>

                        {/* RIGHT FIRST TIME MONTH */}
                        <Card title="Right first time Month" icon={TrendingUp} className="group hover:shadow-xl transition-all duration-300 flex flex-col h-[300px] md:h-full min-h-0">
                            <div className="h-full min-h-0 p-1 md:p-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={rightFirstTimeData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                                        <XAxis
                                            dataKey="month"
                                            tick={{ fontSize: 10 }}
                                            interval={0}
                                            height={15}
                                        />
                                        <YAxis
                                            domain={[90, 98]}
                                            tick={{ fontSize: 10 }}
                                            width={35}
                                            label={{ value: 'RFT (%)', angle: -90, position: 'insideLeft', style: { fontSize: '10px' } }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                fontSize: '11px',
                                                borderRadius: '8px',
                                                padding: '4px 8px'
                                            }}
                                            formatter={(value: number) => [`${value.toFixed(2)}%`, 'RFT']}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="percentage"
                                            stroke="#22c55e"
                                            strokeWidth={2}
                                            dot={{ r: 2, fill: '#22c55e', strokeWidth: 2, stroke: '#fff' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        {/* DATA REJECT PER JAM */}
                        <Card title="Data Reject per Jam" icon={TrendingUp} className="group hover:shadow-xl transition-all duration-300 flex flex-col h-[300px] md:h-full min-h-0">
                            <div className="h-full min-h-0 p-1 md:p-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={rejectPerHourLineData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                                        <XAxis
                                            dataKey="hour"
                                            tick={{ fontSize: 10 }}
                                            interval={0}
                                            height={15}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 10 }}
                                            width={35}
                                            label={{ value: 'Qty', angle: -90, position: 'insideLeft', style: { fontSize: '10px' } }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                fontSize: '11px',
                                                borderRadius: '8px',
                                                padding: '4px 8px'
                                            }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '10px' }} iconSize={8} height={20} />
                                        {lineRejectData.slice(0, 3).map((line, idx) => {
                                            const colors = ['#0ea5e9', '#22c55e', '#ef4444'];
                                            return (
                                                <Line
                                                    key={line.line}
                                                    type="monotone"
                                                    dataKey={line.line}
                                                    stroke={colors[idx]}
                                                    strokeWidth={2}
                                                    dot={{ r: 2, fill: colors[idx], strokeWidth: 2, stroke: '#fff' }}
                                                />
                                            );
                                        })}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>

                    {/* ROW 2: Distribusi Status & Detail Table */}
                    {/* MD+ (Tablet/Desktop): 2 Columns, Flex-1 (Fit to screen height), min-h-0 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 flex-1 md:flex-1 min-h-0"
                        style={{ gap: 'clamp(0.25rem, 1vh, 1rem)' }}>

                        {/* DISTRIBUSI STATUS REJECT */}
                        <Card title="Distribusi Status Reject" icon={AlertTriangle} action={
                            <div className="flex items-center gap-1">
                                <FilterButton icon={Filter} label="WO" onClick={() => setShowWoFilterModal(true)} variant="wo" />
                                <FilterButton icon={Calendar} label="Date" onClick={() => setShowFilterModal(true)} variant="date" />
                            </div>
                        } className="group hover:shadow-xl transition-all duration-300 flex flex-col h-auto min-h-[350px] md:h-full md:min-h-0">
                            <div className="grid grid-cols-2 gap-2 p-2 h-full content-stretch min-h-0">
                                <div className="animate-fade-in w-full flex flex-col justify-center min-h-0">
                                    <MetricCard
                                        label="Waiting"
                                        value={waitingReject}
                                        type="waiting"
                                    />
                                </div>
                                <div className="animate-fade-in w-full flex flex-col justify-center min-h-0" style={{ animationDelay: '100ms' }}>
                                    <MetricCard
                                        label="Check In"
                                        value={rejectCheckIn}
                                        type="checkin"
                                        onClick={() => {
                                            setRejectScanAction('checkin');
                                            setRejectScanLabel('Check In');
                                            setShowRejectScanModal(true);
                                        }}
                                    />
                                </div>
                                <div className="animate-fade-in w-full flex flex-col justify-center min-h-0" style={{ animationDelay: '200ms' }}>
                                    <MetricCard
                                        label="Check Out"
                                        value={rejectCheckOut}
                                        type="checkout"
                                        onClick={() => {
                                            setRejectScanAction('checkout');
                                            setRejectScanLabel('Check Out');
                                            setShowRejectScanModal(true);
                                        }}
                                    />
                                </div>
                                <div className="animate-fade-in w-full flex flex-col justify-center min-h-0" style={{ animationDelay: '300ms' }}>
                                    <div
                                        className="relative w-full h-full flex flex-col justify-center items-center p-1 rounded-xl border transition-all duration-300 hover-card-reject bg-red-50/50 border-red-100 hover:scale-[1.02] hover:shadow-lg hover:border-red-200 overflow-hidden min-h-[60px] cursor-pointer"
                                        onClick={() => {
                                            setRejectScanAction('checkout');
                                            setRejectScanLabel('Reject Mati');
                                            setShowRejectScanModal(true);
                                        }}
                                    >
                                        <div className="absolute top-1 left-2 right-2 flex justify-between items-start z-10">
                                            <span className="font-bold uppercase tracking-widest opacity-80 text-slate-600"
                                                style={{ fontSize: 'clamp(0.625rem, 1.5vw, 0.875rem)' }}>
                                                Reject Mati
                                            </span>
                                            <div className="p-0.5 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm text-red-600">
                                                <XCircle className="w-3 h-3 md:w-4 md:h-4" />
                                            </div>
                                        </div>
                                        <div className="font-black text-red-600 tracking-tighter drop-shadow-sm text-center mt-2 leading-none"
                                            style={{ fontSize: 'clamp(2rem, 5vw, 4.5rem)' }}>
                                            {rejectMati.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* DETAIL DATA REJECT GARMENT TABLE */}
                        <Card title="Detail Data Reject Garment" icon={Table} action={
                            <div className="flex items-center gap-1 md:gap-2">
                                <button
                                    onClick={() => setShowFilterModal(true)}
                                    className="hidden xl:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all duration-200"
                                >
                                    <Filter className="w-3 h-3" />
                                    <span>Filter</span>
                                </button>
                                <button
                                    onClick={() => setShowExportModal(true)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 shadow-sm transition-all duration-200"
                                >
                                    <Download className="w-3 h-3" />
                                    <span>Export</span>
                                </button>
                            </div>
                        } className="group hover:shadow-xl transition-all duration-300 flex flex-col h-auto min-h-[350px] md:h-full md:min-h-0">
                            <div className="p-0 md:p-1 overflow-hidden h-full flex flex-col">
                                <div className="flex-1 overflow-auto custom-scrollbar min-h-0">
                                    <table className="w-full border-collapse sticky top-0" style={{ fontSize: 'clamp(0.6rem, 1vh, 0.875rem)' }}>
                                        <thead className="sticky top-0 z-10 bg-white shadow-sm">
                                            <tr>
                                                <th className="py-1.5 px-2 text-left font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">NO</th>
                                                <th className="py-1.5 px-2 text-left font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">Line</th>
                                                <th className="py-1.5 px-2 text-left font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">WO</th>
                                                <th className="py-1.5 px-2 text-left font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">STYLE</th>
                                                <th className="py-1.5 px-2 text-left font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">QTY</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detailRejectGarmentData.map((row, idx) => (
                                                <tr
                                                    key={idx}
                                                    className={`transition-all duration-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'} hover:bg-sky-50/70`}
                                                >
                                                    <BodyCell className="text-center">{row.no}</BodyCell>
                                                    <BodyCell className="font-semibold text-slate-700">{row.line}</BodyCell>
                                                    <BodyCell>{row.wo}</BodyCell>
                                                    <BodyCell>{row.style}</BodyCell>
                                                    <BodyCell className="font-semibold text-red-600">{row.qty.toLocaleString()}</BodyCell>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </Card>
                    </div>
                </main>

                {/* FILTER DATE MODAL */}
                {showFilterModal && (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowFilterModal(false)}>
                        <div
                            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-blue-50">
                                        <Filter className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-800">Filter Data Tanggal</h3>
                                        <p className="text-[11px] text-slate-500">Filter data reject room berdasarkan rentang tanggal</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowFilterModal(false)}
                                    className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="px-4 py-3 space-y-3">
                                <div>
                                    <label className="block text-[12px] font-medium text-slate-700 mb-1.5">
                                        Dari Tanggal
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={filterDateFrom}
                                            onChange={(e) => setFilterDateFrom(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500"
                                        />
                                        <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[12px] font-medium text-slate-700 mb-1.5">
                                        Sampai Tanggal
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={filterDateTo}
                                            onChange={(e) => setFilterDateTo(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500"
                                        />
                                        <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
                                <button
                                    onClick={() => {
                                        setFilterDateFrom('');
                                        setFilterDateTo('');
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={() => setShowFilterModal(false)}
                                    className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
                                >
                                    Terapkan
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* FILTER WO MODAL */}
                {showWoFilterModal && (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowWoFilterModal(false)}>
                        <div
                            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-purple-50">
                                        <Filter className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-800">Filter WO</h3>
                                        <p className="text-[11px] text-slate-500">Tampilkan data reject berdasarkan WO dummy</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowWoFilterModal(false)}
                                    className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="px-4 py-4 space-y-3">
                                <div>
                                    <label className="block text-[12px] font-medium text-slate-700 mb-1.5">
                                        Work Order (WO)
                                    </label>
                                    <select
                                        value={filterWo}
                                        onChange={(e) => setFilterWo(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-purple-500"
                                    >
                                        <option value="">Semua WO</option>
                                        {lineRejectData.map((row) => (
                                            <option key={row.wo} value={row.wo}>
                                                {row.wo}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
                                <button
                                    onClick={() => setFilterWo('')}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={() => setShowWoFilterModal(false)}
                                    className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-sm"
                                >
                                    Terapkan
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* Export Modal */}
                <ExportModal
                    isOpen={showExportModal}
                    onClose={() => setShowExportModal(false)}
                    onExport={async (format: 'excel' | 'csv', exportType: ExportType) => {
                        const tanggal = filterDateFrom || new Date().toISOString().split('T')[0];

                        const exportData = filteredLineRejectData.map((row: LineRejectData) => ({
                            tanggal,
                            line: row.line,
                            wo: row.wo || '-',
                            style: '-',
                            item: '-',
                            buyer: '-',
                            color: undefined,
                            size: undefined,
                            outputSewing: row.checkIn + row.checkOut,
                            qcRework: 0,
                            qcWira: 0,
                            qcReject: row.mati,
                            qcGood: row.checkOut,
                            pqcRework: 0,
                            pqcWira: 0,
                            pqcReject: 0,
                            pqcGood: row.checkOut,
                            goodSewing: row.checkOut,
                            balance: 0,
                        }));

                        await exportToExcel(exportData, 'REJECT', format, filterDateFrom, filterDateTo, exportType);
                    }}
                    lineId="REJECT"
                />

                {/* SCANNING MODAL FOR REJECT ROOM */}
                <ScanningFinishingModal
                    isOpen={showRejectScanModal}
                    onClose={() => {
                        setShowRejectScanModal(false);
                        // Refetch data setelah modal ditutup
                        queryClient.invalidateQueries({
                            queryKey: ['finishing-data-reject'],
                            refetchType: 'active'
                        });
                    }}
                    type="reject"
                    defaultAction={rejectScanAction}
                    autoSubmit={true}
                    customActionLabel={rejectScanLabel}
                    onSuccess={async () => {
                        // Refetch data segera setelah scan berhasil
                        queryClient.invalidateQueries({
                            queryKey: ['finishing-data-reject'],
                            refetchType: 'active'
                        });
                    }}
                />

                <Footer />
            </div>

            <style>{`
                /* Custom Scrollbar */
                .dashboard-scrollable::-webkit-scrollbar,
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .dashboard-scrollable::-webkit-scrollbar-track,
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 4px;
                }
                .dashboard-scrollable::-webkit-scrollbar-thumb,
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                    transition: background 0.2s ease;
                }
                .dashboard-scrollable::-webkit-scrollbar-thumb:hover,
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }

                /* Animations */
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes slide-in-right {
                    from {
                        opacity: 0;
                        transform: translateX(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                .animate-fade-in {
                    animation: fade-in 0.6s ease-out forwards;
                    opacity: 0;
                }

                .animate-slide-in-right {
                    animation: slide-in-right 0.6s ease-out forwards;
                    opacity: 0;
                }

                /* Hover effects untuk card reject mati */
                .hover-card-reject:hover {
                    transform: translateY(-2px);
                }
            `}</style>
        </div>
    );
}

interface CellProps {
    children: React.ReactNode;
    className?: string;
}

function BodyCell({ children, className }: CellProps) {
    return (
        <td
            className={`border px-1.5 xs:px-2 sm:px-2.5 py-1 xs:py-1.5 sm:py-2 text-slate-700 ${className || ''}`}
            style={{
                borderColor: '#e5e7eb',
                borderWidth: '1px',
            }}
        >
            {children}
        </td>
    );
}





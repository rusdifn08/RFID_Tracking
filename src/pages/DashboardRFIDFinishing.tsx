import { useState, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';
import backgroundImage from '../assets/background.jpg';
import ChartCard from '../components/dashboard/ChartCard';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { BarChart3, Droplet, Layers, Table, XCircle, Filter, Download, Calendar } from 'lucide-react';
import ExportModal from '../components/ExportModal';
import { exportToExcel, type ExportType } from '../utils/exportToExcel';

export default function DashboardRFIDFinishing() {
    const { isOpen } = useSidebar();

    // --- STATE UNTUK FILTER & EXPORT (DATA FINISHING DETAIL) ---
    const [filterDateFrom, setFilterDateFrom] = useState<string>('');
    const [filterDateTo, setFilterDateTo] = useState<string>('');
    const [showFilterModal, setShowFilterModal] = useState(false);

    const [filterWo, setFilterWo] = useState<string>('');
    const [showWoFilterModal, setShowWoFilterModal] = useState(false);

    const [showExportModal, setShowExportModal] = useState(false);
    
    // Mock Data dengan aturan:
    // 1. Data sekitar 1000an
    // 2. Check In >= Check Out untuk semua area
    // 3. Ada konsep "Waiting" di setiap area:
    //    - Waiting Dryroom : sisa PQC Good yang belum masuk ke proses Dryroom (Waiting + Check In = total PQC Good)
    //    - Waiting Folding : output Dryroom (Check Out) yang belum masuk ke Folding (Dryroom Check Out = Folding Check In + Waiting Folding)
    //    - Waiting Reject  : reject yang masih di area produksi dan belum masuk ke Reject Room (belum Check In Reject Room)

    // Dryroom: Check In >= Check Out
    const dryroomCheckIn = 1200;
    const dryroomCheckOut = 1150;
    // Waiting Dryroom: sisa PQC Good yang belum masuk ke proses Dryroom
    const dryroomWaiting = 100; // Contoh: total PQC Good ≈ 1300 => 1200 (Check In) + 100 (Waiting)
    
    // Folding: Check In >= Check Out
    // Waiting Folding: barang dari Dryroom (Check Out) yang belum masuk ke Folding
    const foldingCheckIn = 1100;
    const foldingWaiting = dryroomCheckOut - foldingCheckIn; // 50 => Dryroom Check Out (1150) = 1100 + 50
    const foldingCheckOut = 1040; // Data yang sudah siap dikirim
    
    // Reject Room: Check In >= Check Out >= Reject Mati, lebih sedikit dari area lain
    const rejectCheckIn = 85;
    const rejectCheckOut = 75; // rejectCheckOut <= rejectCheckIn
    const rejectMati = 45; // rejectMati <= rejectCheckOut
    const rejectWaiting = 30; // Reject yang masih di area produksi

    // Total per area (menghitung juga waiting)
    const totalDryroom = dryroomCheckIn + dryroomCheckOut + dryroomWaiting;
    const totalFolding = foldingCheckIn + foldingCheckOut + foldingWaiting;
    const totalReject = rejectCheckIn + rejectCheckOut + rejectMati + rejectWaiting;

    // Total Finishing (ringkasan seluruh area)
    const totalFinishing = totalDryroom + totalFolding + totalReject;

    // Data untuk pie chart - pembagian Dryroom, Folding, Reject Room
    const pieData = [
        { name: 'Dryroom', value: totalDryroom, color: '#06b6d4' },
        { name: 'Folding', value: totalFolding, color: '#14b8a6' },
        { name: 'Reject Room', value: totalReject, color: '#f59e0b' }
    ];

    // Mock Data untuk tabel - 9 baris dengan line 1-9, qty berbeda, total = totalFinishing (4805)
    const finishingData = [
        { wo: 'WO-001', line: '1', style: 'STYLE-A', qty: 535 },
        { wo: 'WO-002', line: '2', style: 'STYLE-B', qty: 540 },
        { wo: 'WO-003', line: '3', style: 'STYLE-C', qty: 530 },
        { wo: 'WO-004', line: '4', style: 'STYLE-A', qty: 545 },
        { wo: 'WO-005', line: '5', style: 'STYLE-B', qty: 535 },
        { wo: 'WO-006', line: '6', style: 'STYLE-C', qty: 540 },
        { wo: 'WO-007', line: '7', style: 'STYLE-A', qty: 530 },
        { wo: 'WO-008', line: '8', style: 'STYLE-B', qty: 535 },
        { wo: 'WO-009', line: '9', style: 'STYLE-C', qty: 515 }
    ];

    // Total qty dari tabel (hanya sebagai referensi)
    const totalQty = finishingData.reduce((sum, item) => sum + item.qty, 0);

    // Data yang sudah difilter berdasarkan WO (dummy filter sederhana)
    const filteredFinishingData = useMemo(() => {
        if (!filterWo) return finishingData;
        return finishingData.filter((item) => item.wo === filterWo);
    }, [filterWo]);

    const sidebarWidth = isOpen ? '18%' : '5rem';

    return (
        <div className="flex h-screen w-full font-sans text-gray-800 overflow-hidden fixed inset-0 m-0 p-0"
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed',
            }}
        >
            {/* Sidebar */}
            <div className="fixed left-0 top-0 h-full z-50 shadow-xl">
                <Sidebar />
            </div>

            {/* Main Content Area */}
            <div
                className="flex flex-col w-full h-screen transition-all duration-300 ease-in-out"
                style={{
                    marginLeft: sidebarWidth,
                    width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)'
                }}
            >
                {/* Header */}
                <div className="sticky top-0 z-40 shadow-md">
                    <Header />
                </div>

                {/* Main Content */}
                <main
                    className="flex-1 w-full overflow-hidden px-1.5 xs:px-2 sm:px-3 md:px-4 relative"
                    style={{
                        marginTop: 'clamp(4.5rem, 10vh, 5.5rem)',
                        paddingTop: 'clamp(0.5rem, 1vh, 1rem)',
                        paddingBottom: '0.5rem',
                        minHeight: 0,
                    }}
                >
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 h-full">
                        {/* LEFT COLUMN */}
                        <div className="lg:col-span-1 flex flex-col gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 h-full min-h-0">
                            {/* OVERVIEW DATA FINISHING */}
                            <ChartCard
                                title="Overview Data Finishing"
                                icon={BarChart3}
                                className="flex-[1] min-h-0"
                            >
                                <div className="grid grid-cols-2 gap-1.5 xs:gap-2 sm:gap-2.5 p-0.5 xs:p-0.5 sm:p-1 h-full min-h-0">
                                    {/* Grid 1: Pie Chart */}
                                    <div className="flex items-center justify-center min-h-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius="25%"
                                                    outerRadius="90%"
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    {/* Grid 2: Total Finishing */}
                                    <div className="flex flex-col items-center justify-center min-h-0">
                                        <span className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-medium text-gray-600 mb-0.5 xs:mb-1">
                                            Total Finishing
                                        </span>
                                        <span 
                                            className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold leading-none"
                                            style={{ color: '#0284C7' }}
                                        >
                                            {totalFinishing.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </ChartCard>

                            {/* DRYROOM */}
                            <ChartCard
                                title="Dryroom"
                                icon={Droplet}
                                className="flex-[1] min-h-0"
                                iconColor="#16a34a"
                                iconBgColor="#dcfce7"
                            >
                                <div className="grid grid-cols-3 gap-1.5 xs:gap-2 sm:gap-2.5 p-1 xs:p-1.5 sm:p-2 h-full min-h-0 overflow-hidden">
                                    {/* Waiting */}
                                    <div 
                                        className="rounded-lg xs:rounded-xl sm:rounded-2xl p-[2px] transition-all duration-300 hover:scale-105 group relative h-full min-h-0 flex"
                                        style={{
                                            background: 'linear-gradient(135deg, #7dd3fc 0%, #0284c7 50%, #fbbf24 100%)',
                                            boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
                                        }}
                                    >
                                        <div className="rounded-lg xs:rounded-xl sm:rounded-2xl bg-white w-full h-full flex flex-col items-center justify-center p-0.5 xs:p-1 sm:p-1.5 min-h-0">
                                            <span className="text-[10px] xs:text-xs sm:text-sm md:text-base font-semibold mb-0.5 xs:mb-1 text-gray-700">
                                                Waiting
                                            </span>
                                            <span className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold leading-none text-gray-800">
                                                {dryroomWaiting.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Check In */}
                                    <div 
                                        className="rounded-lg xs:rounded-xl sm:rounded-2xl p-[2px] transition-all duration-300 hover:scale-105 group relative h-full min-h-0 flex"
                                        style={{
                                            background: 'linear-gradient(135deg, #7dd3fc 0%, #0284c7 50%, #fbbf24 100%)',
                                            boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
                                        }}
                                    >
                                        <div className="rounded-lg xs:rounded-xl sm:rounded-2xl bg-white w-full h-full flex flex-col items-center justify-center p-0.5 xs:p-1 sm:p-1.5 min-h-0">
                                            <span className="text-[10px] xs:text-xs sm:text-sm md:text-base font-semibold mb-0.5 xs:mb-1 text-gray-700">
                                                Check In
                                            </span>
                                            <span className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold leading-none text-gray-800">
                                                {dryroomCheckIn.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Check Out */}
                                    <div 
                                        className="rounded-lg xs:rounded-xl sm:rounded-2xl p-[2px] transition-all duration-300 hover:scale-105 group relative h-full min-h-0 flex"
                                        style={{
                                            background: 'linear-gradient(135deg, #7dd3fc 0%, #0284c7 50%, #fbbf24 100%)',
                                            boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
                                        }}
                                    >
                                        <div className="rounded-lg xs:rounded-xl sm:rounded-2xl bg-white w-full h-full flex flex-col items-center justify-center p-0.5 xs:p-1 sm:p-1.5 min-h-0">
                                            <span className="text-[10px] xs:text-xs sm:text-sm md:text-base font-semibold mb-0.5 xs:mb-1 text-gray-700">
                                                Check Out
                                            </span>
                                            <span className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold leading-none text-gray-800">
                                                {dryroomCheckOut.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </ChartCard>

                            {/* FOLDING */}
                            <ChartCard
                                title="Folding"
                                icon={Layers}
                                className="flex-[1] min-h-0"
                                iconColor="#92400e"
                                iconBgColor="#fef3c7"
                            >
                                <div className="grid grid-cols-3 gap-1.5 xs:gap-2 sm:gap-2.5 p-1 xs:p-1.5 sm:p-2 h-full min-h-0 overflow-hidden">
                                    {/* Waiting */}
                                    <div 
                                        className="rounded-lg xs:rounded-xl sm:rounded-2xl p-[2px] transition-all duration-300 hover:scale-105 group relative h-full min-h-0 flex"
                                        style={{
                                            background: 'linear-gradient(135deg, #7dd3fc 0%, #0284c7 50%, #fbbf24 100%)',
                                            boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
                                        }}
                                    >
                                        <div className="rounded-lg xs:rounded-xl sm:rounded-2xl bg-white w-full h-full flex flex-col items-center justifycenter p-0.5 xs:p-1 sm:p-1.5 min-h-0">
                                            <span className="text-[10px] xs:text-xs sm:text-sm md:text-base font-semibold mb-0.5 xs:mb-1 text-gray-700">
                                                Waiting
                                            </span>
                                            <span className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold leading-none text-gray-800">
                                                {foldingWaiting.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Check In */}
                                    <div 
                                        className="rounded-lg xs:rounded-xl sm:rounded-2xl p-[2px] transition-all duration-300 hover:scale-105 group relative h-full min-h-0 flex"
                                        style={{
                                            background: 'linear-gradient(135deg, #7dd3fc 0%, #0284c7 50%, #fbbf24 100%)',
                                            boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
                                        }}
                                    >
                                        <div className="rounded-lg xs:rounded-xl sm:rounded-2xl bg-white w-full h-full flex flex-col items-center justifycenter p-0.5 xs:p-1 sm:p-1.5 min-h-0">
                                            <span className="text-[10px] xs:text-xs sm:text-sm md:text-base font-semibold mb-0.5 xs:mb-1 text-gray-700">
                                                Check In
                                            </span>
                                            <span className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold leading-none text-gray-800">
                                                {foldingCheckIn.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Shipment (Check Out) */}
                                    <div 
                                        className="rounded-lg xs:rounded-xl sm:rounded-2xl p-[2px] transition-all duration-300 hover:scale-105 group relative h-full min-h-0 flex"
                                        style={{
                                            background: 'linear-gradient(135deg, #7dd3fc 0%, #0284c7 50%, #fbbf24 100%)',
                                            boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
                                        }}
                                    >
                                        <div className="rounded-lg xs:rounded-xl sm:rounded-2xl bg-white w-full h-full flex flex-col items-center justifycenter p-0.5 xs:p-1 sm:p-1.5 min-h-0">
                                            <span className="text-[10px] xs:text-xs sm:text-sm md:text-base font-semibold mb-0.5 xs:mb-1 text-gray-700">
                                                Shipment
                                            </span>
                                            <span className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold leading-none text-gray-800">
                                                {foldingCheckOut.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </ChartCard>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="lg:col-span-2 flex flex-col gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 h-full min-h-0">
                            {/* DATA FINISHING DETAIL - Table */}
                            <ChartCard
                                title="Data Finishing Detail"
                                icon={Table}
                                className="flex-[2] min-h-0"
                                headerAction={(
                                    <div className="flex items-center gap-1.5 xs:gap-2">
                                        <button
                                            onClick={() => setShowFilterModal(true)}
                                            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 xs:px-3 py-1.5 rounded-lg text-[10px] xs:text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                                        >
                                            <Filter className="w-3.5 h-3.5 text-slate-500" />
                                            <span>Filter Data</span>
                                        </button>
                                        <button
                                            onClick={() => setShowWoFilterModal(true)}
                                            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 xs:px-3 py-1.5 rounded-lg text-[10px] xs:text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                                        >
                                            <Filter className="w-3.5 h-3.5 text-slate-500" />
                                            <span>Filter WO</span>
                                        </button>
                                        <button
                                            onClick={() => setShowExportModal(true)}
                                            className="inline-flex items-center gap-1.5 px-2.5 xs:px-3 py-1.5 rounded-lg text-[10px] xs:text-xs font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-sm hover:shadow-md transition-colors"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            <span>Export</span>
                                        </button>
                                    </div>
                                )}
                            >
                                <div className="p-1.5 xs:p-2 sm:p-2.5 overflow-auto h-full">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr>
                                                <th 
                                                    className="border px-1.5 xs:px-2 sm:px-2.5 py-1 xs:py-1.5 sm:py-2 text-left text-[9px] xs:text-[10px] sm:text-xs font-bold"
                                                    style={{ 
                                                        background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                                                        color: '#0284C7', 
                                                        borderColor: '#0284C7',
                                                        borderWidth: '1px'
                                                    }}
                                                >
                                                    WO
                                                </th>
                                                <th 
                                                    className="border px-1.5 xs:px-2 sm:px-2.5 py-1 xs:py-1.5 sm:py-2 text-left text-[9px] xs:text-[10px] sm:text-xs font-bold"
                                                    style={{ 
                                                        background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                                                        color: '#0284C7', 
                                                        borderColor: '#0284C7',
                                                        borderWidth: '1px'
                                                    }}
                                                >
                                                    Line
                                                </th>
                                                <th 
                                                    className="border px-1.5 xs:px-2 sm:px-2.5 py-1 xs:py-1.5 sm:py-2 text-left text-[9px] xs:text-[10px] sm:text-xs font-bold"
                                                    style={{ 
                                                        background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                                                        color: '#0284C7', 
                                                        borderColor: '#0284C7',
                                                        borderWidth: '1px'
                                                    }}
                                                >
                                                    Style
                                                </th>
                                                <th 
                                                    className="border px-1.5 xs:px-2 sm:px-2.5 py-1 xs:py-1.5 sm:py-2 text-left text-[9px] xs:text-[10px] sm:text-xs font-bold"
                                                    style={{ 
                                                        background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                                                        color: '#0284C7', 
                                                        borderColor: '#0284C7',
                                                        borderWidth: '1px'
                                                    }}
                                                >
                                                    Qty
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredFinishingData.length > 0 ? (
                                                filteredFinishingData.map((item, index) => (
                                                    <tr 
                                                        key={index}
                                                        className="transition-colors duration-200 hover:bg-cyan-50/50"
                                                    >
                                                        <td className="border px-1.5 xs:px-2 sm:px-2.5 py-1 xs:py-1.5 sm:py-2 text-[9px] xs:text-[10px] sm:text-xs text-gray-700 font-medium" style={{ borderColor: '#bae6fd', borderWidth: '1px' }}>
                                                            {item.wo || '-'}
                                                        </td>
                                                        <td className="border px-1.5 xs:px-2 sm:px-2.5 py-1 xs:py-1.5 sm:py-2 text-[9px] xs:text-[10px] sm:text-xs text-gray-700 font-medium" style={{ borderColor: '#bae6fd', borderWidth: '1px' }}>
                                                            {item.line || '-'}
                                                        </td>
                                                        <td className="border px-1.5 xs:px-2 sm:px-2.5 py-1 xs:py-1.5 sm:py-2 text-[9px] xs:text-[10px] sm:text-xs text-gray-700 font-medium" style={{ borderColor: '#bae6fd', borderWidth: '1px' }}>
                                                            {item.style || '-'}
                                                        </td>
                                                        <td className="border px-1.5 xs:px-2 sm:px-2.5 py-1 xs:py-1.5 sm:py-2 text-[9px] xs:text-[10px] sm:text-xs text-gray-700 font-medium" style={{ borderColor: '#bae6fd', borderWidth: '1px' }}>
                                                            {item.qty ? item.qty.toLocaleString() : '-'}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="border px-1.5 xs:px-2 sm:px-2.5 py-3 xs:py-4 text-center text-[9px] xs:text-[10px] sm:text-xs text-gray-400 italic" style={{ borderColor: '#bae6fd', borderWidth: '1px' }}>
                                                        No data available
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </ChartCard>

                            {/* REJECT ROOM */}
                            <ChartCard
                                title="Reject Room"
                                icon={XCircle}
                                className="flex-[1] min-h-0"
                                iconColor="#dc2626"
                                iconBgColor="#fee2e2"
                            >
                                <div className="grid grid-cols-4 gap-1.5 xs:gap-2 sm:gap-2.5 p-1 xs:p-1.5 sm:p-2 h-full min-h-0 overflow-hidden">
                                    {/* Waiting */}
                                    <div 
                                        className="rounded-lg xs:rounded-xl sm:rounded-2xl p-[2px] transition-all duration-300 hover:scale-105 group relative h-full min-h-0 flex"
                                        style={{
                                            background: 'linear-gradient(135deg, #7dd3fc 0%, #0284c7 50%, #fbbf24 100%)',
                                            boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
                                        }}
                                    >
                                        <div className="rounded-lg xs:rounded-xl sm:rounded-2xl bg-white w-full h-full flex flex-col items-center justify-center p-0.5 xs:p-1 sm:p-1.5 min-h-0">
                                            <span className="text-[10px] xs:text-xs sm:text-sm md:text-base font-semibold mb-0.5 xs:mb-1 text-center text-gray-700">
                                                Waiting
                                            </span>
                                            <span className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold leading-none text-gray-800">
                                                {rejectWaiting.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Check In */}
                                    <div 
                                        className="rounded-lg xs:rounded-xl sm:rounded-2xl p-[2px] transition-all duration-300 hover:scale-105 group relative h-full min-h-0 flex"
                                        style={{
                                            background: 'linear-gradient(135deg, #7dd3fc 0%, #0284c7 50%, #fbbf24 100%)',
                                            boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
                                        }}
                                    >
                                        <div className="rounded-lg xs:rounded-xl sm:rounded-2xl bg-white w-full h-full flex flex-col items-center justify-center p-0.5 xs:p-1 sm:p-1.5 min-h-0">
                                            <span className="text-[10px] xs:text-xs sm:text-sm md:text-base font-semibold mb-0.5 xs:mb-1 text-center text-gray-700">
                                                Check In
                                            </span>
                                            <span className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold leading-none text-gray-800">
                                                {rejectCheckIn.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Check Out */}
                                    <div 
                                        className="rounded-lg xs:rounded-xl sm:rounded-2xl p-[2px] transition-all duration-300 hover:scale-105 group relative h-full min-h-0 flex"
                                        style={{
                                            background: 'linear-gradient(135deg, #7dd3fc 0%, #0284c7 50%, #fbbf24 100%)',
                                            boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
                                        }}
                                    >
                                        <div className="rounded-lg xs:rounded-xl sm:rounded-2xl bg-white w-full h-full flex flex-col items-center justify-center p-0.5 xs:p-1 sm:p-1.5 min-h-0">
                                            <span className="text-[10px] xs:text-xs sm:text-sm md:text-base font-semibold mb-0.5 xs:mb-1 text-center text-gray-700">
                                                Check Out
                                            </span>
                                            <span className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold leading-none text-gray-800">
                                                {rejectCheckOut.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Reject Mati */}
                                    <div 
                                        className="rounded-lg xs:rounded-xl sm:rounded-2xl p-[2px] transition-all duration-300 hover:scale-105 group relative h-full min-h-0 flex"
                                        style={{
                                            background: 'linear-gradient(135deg, #7dd3fc 0%, #0284c7 50%, #fbbf24 100%)',
                                            boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
                                        }}
                                    >
                                        <div className="rounded-lg xs:rounded-xl sm:rounded-2xl bg-white w-full h-full flex flex-col items-center justify-center p-0.5 xs:p-1 sm:p-1.5 min-h-0">
                                            <span className="text-[10px] xs:text-xs sm:text-sm md:text-base font-semibold mb-0.5 xs:mb-1 text-center text-gray-700">
                                                Reject Mati
                                            </span>
                                            <span className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold leading-none text-gray-800">
                                                {rejectMati.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </ChartCard>
                        </div>
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
                                        <p className="text-[11px] text-slate-500">Filter data finishing berdasarkan rentang tanggal</p>
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
                                        <p className="text-[11px] text-slate-500">Tampilkan data finishing berdasarkan WO</p>
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
                                        {finishingData.map((row) => (
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

                        const exportData = filteredFinishingData.map((row) => ({
                            tanggal,
                            line: `LINE ${row.line}`,
                            wo: row.wo,
                            style: row.style,
                            item: '-',
                            buyer: '-',
                            color: undefined,
                            size: undefined,
                            outputSewing: row.qty,
                            qcRework: 0,
                            qcWira: 0,
                            qcReject: 0,
                            qcGood: row.qty,
                            pqcRework: 0,
                            pqcWira: 0,
                            pqcReject: 0,
                            pqcGood: row.qty,
                            goodSewing: row.qty,
                            balance: 0,
                        }));

                        await exportToExcel(exportData, 'FIN', format, filterDateFrom, filterDateTo, exportType);
                    }}
                    lineId="FIN"
                />

                {/* Footer */}
                <footer 
                    className="absolute bottom-0 left-0 right-0 py-4 border-t border-gray-200/50 pointer-events-none"
                    style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                        backdropFilter: 'blur(2px)',
                        zIndex: -1
                    }}
                >
                    <div className="text-center text-gray-600 text-sm pointer-events-auto" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
                        Gistex Garmen Indonesia Monitoring System (GMS) © 2025 Served by Supernova
                    </div>
                </footer>
            </div>

            <style>{`
                /* Custom Scrollbar */
                main::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                main::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 4px;
                }
                main::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                }
                main::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div>
    );
}


import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';
import backgroundImage from '../assets/background.jpg';
import ChartCard from '../components/dashboard/ChartCard';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { XCircle, Activity, BarChart3, Table, Filter, Download, Calendar } from 'lucide-react';
import ExportModal from '../components/ExportModal';
import { exportToExcel, type ExportType } from '../utils/exportToExcel';

export default function DashboardRFIDReject() {
    const { isOpen } = useSidebar();

    // --- STATE UNTUK FILTER & EXPORT (DATA REJECT PER LINE) ---
    const [filterDateFrom, setFilterDateFrom] = useState<string>('');
    const [filterDateTo, setFilterDateTo] = useState<string>('');
    const [showFilterModal, setShowFilterModal] = useState(false);

    const [filterWo, setFilterWo] = useState<string>('');
    const [showWoFilterModal, setShowWoFilterModal] = useState(false);

    const [showExportModal, setShowExportModal] = useState(false);

    // Mock data dashboard Reject Room
    // Aturan:
    // - Reject Check In >= Reject Check Out >= Reject Mati
    // - Waiting Reject = Check In - Check Out
    const rejectCheckIn = 180;
    const rejectCheckOut = 150;
    const rejectMati = 40;
    const waitingReject = rejectCheckIn - rejectCheckOut; // 30

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

    const sidebarWidth = isOpen ? '18%' : '5rem';

    return (
        <div
            className="flex h-screen w-full font-sans text-gray-800 overflow-hidden fixed inset-0 m-0 p-0"
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
                    width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)',
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 h-full">
                        {/* LEFT COLUMN */}
                        <div className="lg:col-span-1 flex flex-col gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 h-full min-h-0">
                            {/* TOTAL & OVERVIEW */}
                            <ChartCard
                                title="Overview Data Reject"
                                icon={BarChart3}
                                className="flex-[2] min-h-0"
                                iconColor="#dc2626"
                                iconBgColor="#fee2e2"
                            >
                                <div className="grid grid-cols-2 gap-1.5 xs:gap-2 sm:gap-2.5 p-1 xs:p-1.5 sm:p-2 h-full min-h-0">
                                    {/* Total Reject */}
                                    <div className="flex flex-col items-center justify-center border-r border-slate-100 pr-1 xs:pr-1.5 sm:pr-2">
                                        <span className="text-[10px] xs:text-xs sm:text-sm font-semibold text-slate-600 mb-1">
                                            Total Reject
                                        </span>
                                        <span className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-red-600">
                                            {totalReject.toLocaleString()}
                                        </span>
                                        <span className="text-[10px] xs:text-[11px] sm:text-xs text-slate-500 mt-0.5">
                                            Check In + Check Out + Reject Mati
                                        </span>
                                    </div>

                                    {/* Ringkasan Status */}
                                    <div className="grid grid-rows-4 gap-1 xs:gap-1.5">
                                        <StatusMiniCard
                                            label="Reject Check In"
                                            value={rejectCheckIn}
                                            color="from-sky-500 to-sky-600"
                                        />
                                        <StatusMiniCard
                                            label="Reject Check Out"
                                            value={rejectCheckOut}
                                            color="from-emerald-500 to-emerald-600"
                                        />
                                        <StatusMiniCard
                                            label="Reject Mati"
                                            value={rejectMati}
                                            color="from-rose-500 to-rose-600"
                                        />
                                        <StatusMiniCard
                                            label="Waiting Reject"
                                            value={waitingReject}
                                            color="from-amber-500 to-amber-600"
                                        />
                                    </div>
                                </div>
                            </ChartCard>

                            {/* DISTRIBUSI STATUS (PIE) */}
                            <ChartCard
                                title="Distribusi Status Reject"
                                icon={Activity}
                                className="flex-[1] min-h-0"
                                iconColor="#0369a1"
                                iconBgColor="#e0f2fe"
                            >
                                <div className="flex items-center justify-center h-full min-h-0 p-1 xs:p-1.5 sm:p-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieStatusData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius="35%"
                                                outerRadius="85%"
                                                paddingAngle={2}
                                                dataKey="value"
                                            >
                                                {pieStatusData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </ChartCard>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="lg:col-span-2 flex flex-col gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 h-full min-h-0">
                            {/* TABEL DATA REJECT PER LINE */}
                            <ChartCard
                                title="Data Reject per Line"
                                icon={Table}
                                className="flex-[2] min-h-0"
                                iconColor="#0ea5e9"
                                iconBgColor="#e0f2fe"
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
                                <div className="p-1.5 xs:p-2 sm:p-2.5 overflow-auto h-full min-h-0">
                                    <table className="w-full border-collapse text-[10px] xs:text-[11px] sm:text-xs md:text-sm">
                                        <thead>
                                            <tr>
                                                <HeaderCell>Line</HeaderCell>
                                                <HeaderCell>Reject Check In</HeaderCell>
                                                <HeaderCell>Reject Check Out</HeaderCell>
                                                <HeaderCell>Reject Mati</HeaderCell>
                                                <HeaderCell>Waiting Reject</HeaderCell>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredLineRejectData.map((row, idx) => (
                                                <tr
                                                    key={row.line}
                                                    className={`transition-colors duration-200 ${
                                                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                                                    } hover:bg-sky-50/70`}
                                                >
                                                    <BodyCell className="font-semibold text-slate-700">
                                                        {row.line}
                                                    </BodyCell>
                                                    <BodyCell className="text-sky-700 font-semibold">
                                                        {row.checkIn.toLocaleString()}
                                                    </BodyCell>
                                                    <BodyCell className="text-emerald-700 font-semibold">
                                                        {row.checkOut.toLocaleString()}
                                                    </BodyCell>
                                                    <BodyCell className="text-rose-700 font-semibold">
                                                        {row.mati.toLocaleString()}
                                                    </BodyCell>
                                                    <BodyCell className="text-amber-700 font-semibold">
                                                        {row.waiting.toLocaleString()}
                                                    </BodyCell>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </ChartCard>

                            {/* CARD INFO RINGKAS */}
                            <ChartCard
                                title="Highlight KPI Reject"
                                icon={XCircle}
                                className="flex-[1] min-h-0"
                                iconColor="#b91c1c"
                                iconBgColor="#fee2e2"
                            >
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 xs:gap-2 sm:gap-2.5 p-1 xs:p-1.5 sm:p-2">
                                    <KpiCard
                                        label="Persentase Reject Mati"
                                        value={`${((rejectMati / rejectCheckIn) * 100).toFixed(1)}%`}
                                        description="Dari total Reject Check In"
                                        color="#b91c1c"
                                    />
                                    <KpiCard
                                        label="Close Rate Reject"
                                        value={`${((rejectCheckOut / rejectCheckIn) * 100).toFixed(1)}%`}
                                        description="Reject yang sudah di proses keluar"
                                        color="#16a34a"
                                    />
                                    <KpiCard
                                        label="Waiting Ratio"
                                        value={`${((waitingReject / rejectCheckIn) * 100).toFixed(1)}%`}
                                        description="Masih menunggu tindakan"
                                        color="#f97316"
                                    />
                                    <KpiCard
                                        label="Average Reject / Line"
                                        value={(rejectCheckIn / lineRejectData.length).toFixed(1)}
                                        description="Rata-rata Check In per line"
                                        color="#0ea5e9"
                                    />
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

                        const exportData = filteredLineRejectData.map((row) => ({
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

                {/* Footer */}
                <footer
                    className="absolute bottom-0 left-0 right-0 py-4 border-t border-gray-200/50 pointer-events-none"
                    style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                        backdropFilter: 'blur(2px)',
                        zIndex: -1,
                    }}
                >
                    <div
                        className="text-center text-gray-600 text-sm pointer-events-auto"
                        style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
                    >
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

interface CellProps {
    children: React.ReactNode;
    className?: string;
}

function HeaderCell({ children }: CellProps) {
    return (
        <th
            className="border px-1.5 xs:px-2 sm:px-2.5 py-1 xs:py-1.5 sm:py-2 text-left font-bold"
            style={{
                background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                color: '#0f172a',
                borderColor: '#0284C7',
                borderWidth: '1px',
            }}
        >
            {children}
        </th>
    );
}

function BodyCell({ children, className }: CellProps) {
    return (
        <td
            className={`border px-1.5 xs:px-2 sm:px-2.5 py-1 xs:py-1.5 sm:py-2 text-[10px] xs:text-[11px] sm:text-xs text-gray-700 ${className || ''}`}
            style={{
                borderColor: '#e5e7eb',
                borderWidth: '1px',
            }}
        >
            {children}
        </td>
    );
}

interface StatusMiniCardProps {
    label: string;
    value: number;
    color: string; // Tailwind gradient classes
}

function StatusMiniCard({ label, value, color }: StatusMiniCardProps) {
    return (
        <div
            className={`rounded-lg xs:rounded-xl sm:rounded-2xl p-[2px] bg-gradient-to-r ${color} shadow-sm hover:shadow-md transition-all hover:scale-[1.02]`}
        >
            <div className="bg-white rounded-[0.5rem] xs:rounded-lg sm:rounded-xl h-full w-full flex items-center justify-between px-2 xs:px-2.5 sm:px-3 py-1">
                <div className="flex flex-col">
                    <span className="text-[9px] xs:text-[10px] sm:text-xs font-semibold text-slate-600">
                        {label}
                    </span>
                </div>
                <span className="text-xs xs:text-sm sm:text-base md:text-lg font-extrabold text-slate-800">
                    {value.toLocaleString()}
                </span>
            </div>
        </div>
    );
}

interface KpiCardProps {
    label: string;
    value: string;
    description: string;
    color: string;
}

function KpiCard({ label, value, description, color }: KpiCardProps) {
    return (
        <div className="rounded-xl border border-slate-100 bg-white/90 shadow-sm hover:shadow-md transition-all p-2 xs:p-2.5 sm:p-3 flex flex-col justify-between">
            <span className="text-[9px] xs:text-[10px] sm:text-xs font-semibold text-slate-500 mb-1">
                {label}
            </span>
            <span
                className="text-sm xs:text-base sm:text-lg md:text-xl font-black tracking-tight mb-0.5"
                style={{ color }}
            >
                {value}
            </span>
            <span className="text-[9px] xs:text-[10px] sm:text-xs text-slate-500">{description}</span>
        </div>
    );
}



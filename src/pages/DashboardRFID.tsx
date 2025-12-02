import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';
import { API_BASE_URL } from '../config/api';
import ExportModal from '../components/ExportModal';
import { exportToExcel } from '../utils/exportToExcel';
import { svgToPng } from '../utils/chartToImage';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import {
    CheckCircle, RefreshCcw, Settings, XCircle, AlertCircle,
    PieChart as PieIcon, Table as TableIcon, Crosshair, Download,
} from 'lucide-react';

// --- KONFIGURASI WARNA ---
const COLORS = {
    green: '#00e676',
    yellow: '#dbc900',
    orange: '#ff9100',
    red: '#ff1744',
    blue: '#2979ff',
};

// --- KOMPONEN HELPER ---
const CustomPieLegend = (props: any) => {
    const { totalCount } = props;
    return (
        <div className="flex flex-col justify-center h-full pl-2 sm:pl-3 md:pl-4 lg:pl-8">
            {/* OUTPUT Section */}
            <div className="flex flex-col gap-1 sm:gap-1.5 md:gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <Crosshair size={14} className="sm:w-[16px] sm:h-[16px] md:w-[18px] md:h-[18px] text-blue-600" strokeWidth={2.5} />
                    <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">OUTPUT</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-gray-800 leading-tight">{totalCount}</span>
                    <span className="text-xs sm:text-sm text-gray-500 font-semibold">Total Production Count</span>
                </div>
            </div>
        </div>
    );
};

const StatusCard = ({ type, count, label }: { type: 'GOOD' | 'REWORK' | 'HASPER' | 'REJECT' | 'WIRA', count: number, label?: string }) => {
    const config = {
        GOOD: { color: COLORS.green, label: 'GOOD', Icon: CheckCircle, gradient: 'from-green-50 via-green-50/30 to-white', shadow: 'hover:shadow-[0_20px_50px_-12px_rgba(0,230,118,0.5)] hover:border-green-400' },
        REWORK: { color: COLORS.yellow, label: 'REWORK', Icon: RefreshCcw, gradient: 'from-yellow-50 via-yellow-50/30 to-white', shadow: 'hover:shadow-[0_20px_50px_-12px_rgba(255,234,0,0.6)] hover:border-yellow-400' },
        HASPER: { color: COLORS.orange, label: 'HASPER', Icon: Settings, gradient: 'from-orange-50 via-orange-50/30 to-white', shadow: 'hover:shadow-[0_20px_50px_-12px_rgba(255,145,0,0.5)] hover:border-orange-400' },
        REJECT: { color: COLORS.red, label: 'REJECT', Icon: XCircle, gradient: 'from-red-50 via-red-50/30 to-white', shadow: 'hover:shadow-[0_20px_50px_-12px_rgba(255,23,68,0.5)] hover:border-red-400' },
        WIRA: { color: COLORS.blue, label: 'WIRA', Icon: AlertCircle, gradient: 'from-blue-50 via-blue-50/30 to-white', shadow: 'hover:shadow-[0_20px_50px_-12px_rgba(41,121,255,0.5)] hover:border-blue-400' },
    };
    const style = config[type];
    const IconComponent = style.Icon;
    const displayLabel = label || style.label;

    return (
        <div className={`relative flex flex-col items-center justify-between p-2 sm:p-3 h-full w-full bg-gradient-to-b ${style.gradient} rounded-xl sm:rounded-2xl transition-all duration-300 ease-out transform hover:-translate-y-1 shadow-sm border border-gray-100 hover:z-10 group cursor-pointer ${style.shadow}`}>
            <div className="absolute top-0 w-[40%] h-1 rounded-b-xl transition-all duration-300 group-hover:w-[60%]" style={{ backgroundColor: style.color }}></div>
            <div className="flex-1 flex items-center justify-center mt-1">
                <div className="p-1.5 sm:p-2 rounded-full bg-white shadow-md ring-1 ring-gray-50 group-hover:scale-110 transition-transform duration-300">
                    <IconComponent size={20} className="sm:w-[24px] sm:h-[24px] md:w-[28px] md:h-[28px] filter drop-shadow-sm" style={{ color: style.color }} strokeWidth={2.5} />
                </div>
            </div>
            <div className="flex flex-col items-center mb-1 flex-shrink-0">
                <h3 className="text-xs sm:text-sm md:text-base font-black tracking-widest uppercase opacity-80 group-hover:opacity-100 transition-opacity" style={{ color: style.color }}>{displayLabel}</h3>
                <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-gray-800 leading-tight mt-0.5 tracking-tighter drop-shadow-sm transition-all duration-500 ease-in-out transform scale-100 hover:scale-105">{count}</span>
            </div>
        </div>
    );
};

const ChartCard = ({ children, title, icon: Icon, headerAction, className }: any) => (
    <div className={`bg-white rounded-lg sm:rounded-xl md:rounded-2xl lg:rounded-[30px] p-2 sm:p-3 flex flex-col shadow-sm relative border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-blue-200 group h-full ${className || ''}`}>
        <div className="flex items-center justify-between mb-1 sm:mb-2 pb-1 sm:pb-2 border-b border-gray-50 flex-shrink-0"
            style={{
                paddingTop: '1%',
                paddingLeft: '2%',
                paddingRight: '2%',
            }}
        >
            <div className="flex items-center gap-2 sm:gap-3 flex-1">
                <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg sm:rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                    <Icon size={16} className="sm:w-[18px] sm:h-[18px] md:w-[20px] md:h-[20px] lg:w-[22px] lg:h-[22px]" />
                </div>
                {typeof title === 'string' ? (
                    <h2 className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-extrabold text-gray-700 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{title}</h2>
                ) : (
                    <div className="flex items-center justify-between w-full">{title}</div>
                )}
            </div>
            {headerAction}
        </div>
        <div className="flex-1 min-h-0 relative">{children}</div>
    </div>
);

// --- HALAMAN UTAMA ---

export default function DashboardRFID() {
    const { id } = useParams<{ id: string }>();
    const { isOpen } = useSidebar();
    const lineId = id || '1';
    const lineTitle = `LINE ${lineId}`;

    // State untuk tracking data (untuk logging/debugging jika diperlukan)
    const [, setTrackingData] = useState<any>(null);

    // Default values
    const [good, setGood] = useState<number>(0);
    const [rework, setRework] = useState<number>(0);
    const [reject, setReject] = useState<number>(0);
    const [wiraQc, setWiraQc] = useState<number>(0);
    const [pqcGood, setPqcGood] = useState<number>(0);
    const [pqcRework, setPqcRework] = useState<number>(0);
    const [pqcReject, setPqcReject] = useState<number>(0);
    const [wiraPqc, setWiraPqc] = useState<number>(0);
    const [outputLine, setOutputLine] = useState<number>(0);


    // Ref untuk menyimpan data sebelumnya untuk perbandingan (tidak menyebabkan re-render)
    const previousDataRef = useRef<{
        good: number;
        rework: number;
        reject: number;
        wiraQc: number;
        pqcGood: number;
        pqcRework: number;
        pqcReject: number;
        wiraPqc: number;
        outputLine: number;
    } | null>(null);

    // State untuk data WO/Production (dari API monitoring/line)
    const [woData, setWoData] = useState<any>(null);

    // State untuk export modal
    const [showExportModal, setShowExportModal] = useState(false);

    // Fungsi untuk membandingkan data lama dan baru
    const hasDataChanged = (
        oldData: { good: number; rework: number; reject: number; wiraQc: number; pqcGood: number; pqcRework: number; pqcReject: number; wiraPqc: number; outputLine: number } | null,
        newData: { good: number; rework: number; reject: number; wiraQc: number; pqcGood: number; pqcRework: number; pqcReject: number; wiraPqc: number; outputLine: number }
    ): boolean => {
        if (!oldData) return true; // Pertama kali, selalu update

        return (
            oldData.good !== newData.good ||
            oldData.rework !== newData.rework ||
            oldData.reject !== newData.reject ||
            oldData.wiraQc !== newData.wiraQc ||
            oldData.pqcGood !== newData.pqcGood ||
            oldData.pqcRework !== newData.pqcRework ||
            oldData.pqcReject !== newData.pqcReject ||
            oldData.wiraPqc !== newData.wiraPqc ||
            oldData.outputLine !== newData.outputLine
        );
    };

    // Fetch data dari server.js menggunakan useEffect dengan polling agresif
    useEffect(() => {
        let isMounted = true;
        let intervalId: ReturnType<typeof setInterval> | null = null;

        const fetchTrackingData = async () => {
            try {
                const url = `${API_BASE_URL}/tracking/line?line=${encodeURIComponent(lineId)}`;

                // Timeout controller
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000); // Timeout 3 detik

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    // Tambahkan cache: 'no-cache' untuk memastikan selalu fetch data terbaru
                    cache: 'no-cache',
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (!isMounted) return;

                // Parse data dari API
                // Struktur API: { success, line, data: { good, rework, reject, ... } }
                if (data && data.success && data.data && typeof data.data === 'object') {
                    const dataObj = data.data;

                    // Parse dengan Number() dan fallback ke 0
                    const newData = {
                        good: Number(dataObj.good) || 0,
                        rework: Number(dataObj.rework) || 0,
                        reject: Number(dataObj.reject) || 0,
                        wiraQc: Number(dataObj.wira_qc) || 0,
                        pqcGood: Number(dataObj.pqc_good) || 0,
                        pqcRework: Number(dataObj.pqc_rework) || 0,
                        pqcReject: Number(dataObj.pqc_reject) || 0,
                        wiraPqc: Number(dataObj.wira_pqc) || 0,
                        outputLine: Number(dataObj.output_line) || 0,
                    };

                    // Cek apakah ada perubahan data
                    if (hasDataChanged(previousDataRef.current, newData)) {
                        // Ada perubahan, update state
                        setTrackingData(data);
                        setGood(newData.good);
                        setRework(newData.rework);
                        setReject(newData.reject);
                        setWiraQc(newData.wiraQc);
                        setPqcGood(newData.pqcGood);
                        setPqcRework(newData.pqcRework);
                        setPqcReject(newData.pqcReject);
                        setWiraPqc(newData.wiraPqc);
                        setOutputLine(newData.outputLine);
                        // Update ref untuk perbandingan berikutnya
                        previousDataRef.current = newData;
                    }
                    // Jika tidak ada perubahan, tidak perlu update state (tidak ada re-render)
                }
            } catch (error) {
                throw error;
            }
        };

        const initialFetch = async () => {
            try {
                await fetchTrackingData();
            } catch (error) {
                // Error handling
            }
        };
        initialFetch();

        // Setup polling agresif: cek setiap 1 detik untuk deteksi perubahan yang cepat
        // Hanya update jika ada perubahan, jadi tidak akan ada re-render yang tidak perlu
        intervalId = setInterval(() => {
            if (isMounted) {
                fetchTrackingData();
            }
        }, 1000); // Polling setiap 1 detik untuk deteksi perubahan yang sangat cepat

        // Cleanup function
        return () => {
            isMounted = false;
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [lineId]); // Re-fetch jika lineId berubah

    // Fetch data WO/Production dari API monitoring/line
    useEffect(() => {
        let isMounted = true;
        let intervalId: ReturnType<typeof setInterval> | null = null;

        const fetchWoData = async () => {
            try {
                // Gunakan API monitoring/line dengan line parameter
                const url = `${API_BASE_URL}/monitoring/line?line=${encodeURIComponent(lineId)}`;

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (!isMounted) return;

                // Parse data dari API
                // Struktur API: { success: true, line: "1", data: { buyer, color, item, line, rfid_garment, size, style, wo } }
                if (data && data.success && data.data) {
                    setWoData(data.data);
                } else {
                    setWoData(null);
                }
            } catch (error) {
                // Jika error, set null
                if (isMounted) {
                    setWoData(null);
                }
            }
        };

        // Fetch data pertama kali
        fetchWoData();

        // Setup interval untuk refetch setiap 30 detik (lebih lama dari tracking data)
        intervalId = setInterval(() => {
            if (isMounted) {
                fetchWoData();
            }
        }, 30000);

        // Cleanup function
        return () => {
            isMounted = false;
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [lineId]); // Re-fetch jika lineId berubah

    // Hitung total untuk pieData dengan menggabungkan data biasa dan PQC
    // Balance: Output = Good + WIRA + Reject (tidak menghitung rework)
    const totalGood = good + pqcGood;
    const totalWira = wiraQc + wiraPqc;
    const totalReject = reject + pqcReject;

    // Buat pieData dinamis berdasarkan data API
    // Menggabungkan: good + pqc_good, wira_qc + wira_pqc, reject + pqc_reject
    const pieDataRaw = [
        {
            name: 'Good',
            value: totalGood,
            display: `Good ( ${totalGood} )`,
            color: COLORS.green
        },
        {
            name: 'WIRA',
            value: totalWira,
            display: `WIRA ( ${totalWira} )`,
            color: COLORS.blue
        },
        {
            name: 'Reject',
            value: totalReject,
            display: `Reject ( ${totalReject} )`,
            color: COLORS.red
        },
    ];

    // Filter hanya item yang value > 0, tapi jika semua 0, tetap tampilkan semua
    const pieData = pieDataRaw.filter(item => item.value > 0).length > 0
        ? pieDataRaw.filter(item => item.value > 0)
        : pieDataRaw; // Jika semua 0, tampilkan semua untuk menghindari pie chart kosong

    // --- DATA UNTUK EXPORT CHARTS ---
    const qcData = [
        { name: 'Good', value: good, color: COLORS.green },
        { name: 'WIRA', value: wiraQc, color: COLORS.blue },
        { name: 'Reject', value: reject, color: COLORS.red },
    ].filter(d => d.value > 0);

    const pqcData = [
        { name: 'Good', value: pqcGood, color: COLORS.green },
        { name: 'WIRA', value: wiraPqc, color: COLORS.blue },
        { name: 'Reject', value: pqcReject, color: COLORS.red },
    ].filter(d => d.value > 0);

    // Fungsi untuk handle export
    const handleExport = async (format: 'excel' | 'csv') => {
        const now = new Date();
        const tanggal = now.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

        // Ambil data WO jika ada
        const firstWo = woData || null;

        // Capture charts
        let qcChartImage = undefined;
        let pqcChartImage = undefined;

        try {
            const qcChartEl = document.querySelector('#qc-chart-export .recharts-surface') as SVGSVGElement;
            const pqcChartEl = document.querySelector('#pqc-chart-export .recharts-surface') as SVGSVGElement;

            if (qcChartEl) {
                qcChartImage = await svgToPng(qcChartEl, 400, 300);
            }
            if (pqcChartEl) {
                pqcChartImage = await svgToPng(pqcChartEl, 400, 300);
            }
        } catch (e) {
        }

        // Siapkan data untuk export
        const exportData = [{
            tanggal: tanggal,
            line: `LINE ${lineId}`,
            wo: firstWo?.wo || '-',
            style: firstWo?.style || '-',
            item: firstWo?.item || '-',
            buyer: firstWo?.buyer || '-',
            color: firstWo?.color || '-',
            size: firstWo?.breakdown_sizes || '-',
            outputSewing: outputLine,
            qcRework: rework,
            qcWira: wiraQc,
            qcReject: reject,
            qcGood: good,
            pqcRework: pqcRework,
            pqcWira: wiraPqc,
            pqcReject: pqcReject,
            pqcGood: pqcGood,
            goodSewing: good, // Good sewing sama dengan good QC untuk sementara
            balance: outputLine - (good + wiraQc + reject), // Balance calculation
            qcChartImage,
            pqcChartImage
        }];

        await exportToExcel(exportData, lineId, format);
    };

    // LOGIKA SIZE SIDEBAR (PENTING UNTUK MENGHINDARI TABRAKAN)
    // 16rem = 256px (Width Sidebar Expanded default tailwind w-64)
    // 5rem  = 80px  (Width Sidebar Collapsed default tailwind w-20)
    const sidebarWidth = isOpen ? '15%' : '3%';

    return (
        <div className="flex h-screen w-full bg-[#f4f6f8] font-sans text-gray-800 overflow-hidden"
            style={{ paddingLeft: '-1%' }}>

            {/* 1. SIDEBAR (FIXED) */}
            <div className="fixed left-0 top-0 h-full z-50 shadow-xl">
                <Sidebar />
            </div>

            {/* 2. WRAPPER KONTEN KANAN */}
            <div
                className="flex flex-col w-full h-full transition-all duration-300 ease-in-out"
                style={{
                    // PERBAIKAN UTAMA: Menggunakan Fixed Units (rem), bukan %
                    marginLeft: sidebarWidth,
                    width: `calc(100% - ${sidebarWidth})`
                }}>

                {/* 3. HEADER (STICKY) */}
                <div className="sticky top-0 z-40 shadow-md">
                    <Header />
                </div>

                {/* 4. MAIN CONTENT */}
                <main
                    className="flex-1 flex flex-col bg-[#f4f6f8] overflow-hidden"

                >
                    {/* PAGE TITLE */}
                    <div className="flex-shrink-0 text-center py-2">
                        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-gray-700 uppercase tracking-wide drop-shadow-sm">
                            <span className="text-blue-600">Dashboard</span> Monitoring RFID {lineTitle}
                        </h1>
                    </div>

                    {/* GRID CONTAINER */}
                    <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden px-2 sm:px-3 md:px-4 pb-2">

                        {/* ROW 1: CHARTS */}
                        <div className="flex-none grid grid-cols-1 lg:grid-cols-3 gap-2" style={{ height: '38%', maxHeight: '38%', minHeight: '38%' }}>
                            <ChartCard title="Overview Data RFID" icon={PieIcon} className="lg:col-span-1">
                                <div className="flex flex-col lg:flex-row items-center h-full"
                                    style={{
                                        padding: '0.5%',
                                    }}>
                                    <div className="w-full lg:w-[55%] h-full relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={0} outerRadius="90%" dataKey="value" stroke="white" strokeWidth={3}>
                                                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="w-full lg:w-[45%] font-size-10 flex items-center justify-center lg:justify-start pb-2 sm:pb-3 md:pb-4 lg:pb-0"
                                    >
                                        <CustomPieLegend
                                            payload={pieData.map(d => ({ color: d.color, payload: d }))}
                                            totalCount={outputLine ?? pieData.reduce((sum, item) => sum + item.value, 0)}
                                        />
                                    </div>
                                </div>
                            </ChartCard>

                            <ChartCard
                                title={
                                    <>
                                        <h2 className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-extrabold text-gray-700 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{`Data ${lineTitle}`}</h2>
                                        <div className="flex items-center gap-2 ml-auto">
                                            <span className="
                                                bg-blue-100 text-blue-700 text-[10px] sm:text-xs font-bold 
                                                px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-blue-200
                                                flex items-center justify-center text-center
                                                shadow-sm"
                                            >{new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                            <button
                                                onClick={() => setShowExportModal(true)}
                                                className="p-1.5 sm:p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 group relative"
                                                title="Export Excel"
                                            >
                                                <Download className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </>
                                }
                                icon={TableIcon}
                                className="lg:col-span-2"
                            >
                                <div className="w-full h-full overflow-y-auto custom-scrollbar p-2 sm:p-3 flex items-center justify-center">
                                    {woData ? (
                                        <div className="w-full h-full flex flex-col justify-center gap-2">
                                            {/* Row 1: WO, Style, Size */}
                                            <div className="grid grid-cols-3 gap-2">
                                                {[
                                                    { label: 'WO', value: woData.wo },
                                                    { label: 'Style', value: woData.style },
                                                    { label: 'Size', value: woData.size }
                                                ].map((item, idx) => (
                                                    <div key={idx} className="group relative overflow-hidden bg-white rounded-lg border border-slate-100 p-1.5 sm:p-2 flex flex-col items-center justify-center gap-0.5 transition-all duration-300 hover:border-blue-400 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1">
                                                        {/* Blue & Gold Accent Line */}
                                                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 via-blue-400 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                                        <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-blue-600 transition-colors delay-75">{item.label}</span>
                                                        <div className="w-full text-center px-1">
                                                            <span className="text-sm sm:text-base md:text-lg font-black text-slate-700 group-hover:text-slate-900 truncate block transition-colors" title={item.value || '-'}>
                                                                {item.value || '-'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Row 2: Buyer, Item, Color */}
                                            <div className="grid grid-cols-3 gap-2">
                                                {[
                                                    { label: 'Buyer', value: woData.buyer },
                                                    { label: 'Item', value: woData.item },
                                                    { label: 'Color', value: woData.color }
                                                ].map((item, idx) => (
                                                    <div key={idx} className="group relative overflow-hidden bg-white rounded-lg border border-slate-100 p-1.5 sm:p-2 flex flex-col items-center justify-center gap-0.5 transition-all duration-300 hover:border-blue-400 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1">
                                                        {/* Blue & Gold Accent Line */}
                                                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 via-blue-400 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                                        <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-blue-600 transition-colors delay-75">{item.label}</span>
                                                        <div className="w-full text-center px-1">
                                                            <span className="text-sm sm:text-base md:text-lg font-black text-slate-700 group-hover:text-slate-900 truncate block transition-colors" title={item.value || '-'}>
                                                                {item.value || '-'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 animate-pulse">
                                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                                                <TableIcon size={24} className="opacity-50" />
                                            </div>
                                            <span className="text-xs sm:text-sm font-medium">Menunggu Data...</span>
                                        </div>
                                    )}
                                </div>
                            </ChartCard>
                        </div>

                        {/* ROW 2 & 3: STATUS CARDS */}
                        <div className="flex-1 flex flex-col gap-2 min-h-0" style={{ height: '62%', maxHeight: '62%', minHeight: '62%' }}>
                            {/* Row 2: Data QC - reject, rework, wira, good */}
                            <div className="flex-1 grid grid-cols-4 gap-2 min-h-0">
                                <StatusCard type="REJECT" count={reject} label="REJECT QC" />
                                <StatusCard type="REWORK" count={rework} label="REWORK QC" />
                                <StatusCard type="WIRA" count={wiraQc} label="WIRA QC" />
                                <StatusCard type="GOOD" count={good} label="GOOD QC" />
                            </div>
                            {/* Row 3: Data PQC - reject, rework, wira, good */}
                            <div className="flex-1 grid grid-cols-4 gap-2 min-h-0">
                                <StatusCard type="REJECT" count={pqcReject} label="REJECT PQC" />
                                <StatusCard type="REWORK" count={pqcRework} label="REWORK PQC" />
                                <StatusCard type="WIRA" count={wiraPqc} label="WIRA PQC" />
                                <StatusCard type="GOOD" count={pqcGood} label="GOOD PQC" />
                            </div>
                        </div>

                    </div>
                </main>
            </div>

            {/* Export Modal */}
            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={handleExport}
                lineId={lineId}
            />

            {/* HIDDEN CHARTS FOR EXPORT */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                <div id="qc-chart-export" style={{ width: 400, height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={qcData} cx="50%" cy="50%" innerRadius={50} outerRadius={100} dataKey="value" stroke="white" strokeWidth={2}>
                                {qcData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div id="pqc-chart-export" style={{ width: 400, height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={pqcData} cx="50%" cy="50%" innerRadius={50} outerRadius={100} dataKey="value" stroke="white" strokeWidth={2}>
                                {pqcData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Custom Scrollbar Styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #F1F5F9;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #93C5FD;
                    border-radius: 4px;
                    border: 2px solid #F1F5F9;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #60A5FA;
                }
            `}</style>
        </div>
    );
}

import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';
import { API_BASE_URL } from '../config/api';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import {
    CheckCircle, RefreshCcw, Settings, XCircle,
    PieChart as PieIcon, Table as TableIcon, Crosshair,
} from 'lucide-react';

// --- KONFIGURASI WARNA ---
const COLORS = {
    green: '#00e676',
    yellow: '#dbc900',
    orange: '#ff9100',
    red: '#ff1744',
    blue: '#2979ff',
};

// --- DATA MOCKUP ---
// pieData sekarang dinamis berdasarkan data API (lihat di dalam component)

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
                    <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-gray-800 leading-tight">{totalCount}</span>
                    <span className="text-[10px] sm:text-xs text-gray-500 font-semibold">Total Production Count</span>
                </div>
            </div>
        </div>
    );
};

const StatusCard = ({ type, count, label }: { type: 'GOOD' | 'REWORK' | 'HASPER' | 'REJECT', count: number, label?: string }) => {
    const config = {
        GOOD: { color: COLORS.green, label: 'GOOD', Icon: CheckCircle, gradient: 'from-green-50 via-green-50/30 to-white', shadow: 'hover:shadow-[0_20px_50px_-12px_rgba(0,230,118,0.5)] hover:border-green-400' },
        REWORK: { color: COLORS.yellow, label: 'REWORK', Icon: RefreshCcw, gradient: 'from-yellow-50 via-yellow-50/30 to-white', shadow: 'hover:shadow-[0_20px_50px_-12px_rgba(255,234,0,0.6)] hover:border-yellow-400' },
        HASPER: { color: COLORS.orange, label: 'HASPER', Icon: Settings, gradient: 'from-orange-50 via-orange-50/30 to-white', shadow: 'hover:shadow-[0_20px_50px_-12px_rgba(255,145,0,0.5)] hover:border-orange-400' },
        REJECT: { color: COLORS.red, label: 'REJECT', Icon: XCircle, gradient: 'from-red-50 via-red-50/30 to-white', shadow: 'hover:shadow-[0_20px_50px_-12px_rgba(255,23,68,0.5)] hover:border-red-400' },
    };
    const style = config[type];
    const IconComponent = style.Icon;
    const displayLabel = label || style.label;

    return (
        <div className={`relative flex flex-col items-center justify-between p-2 sm:p-3 md:p-4 lg:p-5 h-full w-full min-h-[80px] sm:min-h-[90px] md:min-h-[100px] lg:min-h-[110px] xl:min-h-[120px] bg-gradient-to-b ${style.gradient} rounded-xl sm:rounded-2xl md:rounded-[30px] transition-all duration-300 ease-out transform hover:-translate-y-1 sm:hover:-translate-y-2 shadow-sm border border-gray-100 hover:z-10 group cursor-pointer ${style.shadow}`}>
            <div className="absolute top-0 w-[40%] h-1 sm:h-1.5 rounded-b-xl transition-all duration-300 group-hover:w-[60%]" style={{ backgroundColor: style.color }}></div>
            <div className="flex-1 flex items-center justify-center mt-1 sm:mt-2 md:mt-3">
                <div className="p-1.5 sm:p-2 md:p-2.5 rounded-full bg-white shadow-md ring-1 ring-gray-50 group-hover:scale-110 transition-transform duration-300">
                    <IconComponent size={24} className="sm:w-[28px] sm:h-[28px] md:w-[32px] md:h-[32px] lg:w-[36px] lg:h-[36px] xl:w-[40px] xl:h-[40px] filter drop-shadow-sm" style={{ color: style.color }} strokeWidth={2.5} />
                </div>
            </div>
            <div className="flex flex-col items-center mb-1">
                <h3 className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-black tracking-widest uppercase opacity-80 group-hover:opacity-100 transition-opacity" style={{ color: style.color }}>{displayLabel}</h3>
                <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-gray-800 leading-tight mt-0.5 tracking-tighter drop-shadow-sm transition-all duration-500 ease-in-out transform scale-100 hover:scale-105">{count}</span>
            </div>
        </div>
    );
};

const ChartCard = ({ children, title, icon: Icon, headerAction, className }: any) => (
    <div className={`bg-white rounded-lg sm:rounded-xl md:rounded-2xl lg:rounded-[30px] p-2 sm:p-3 md:p-4 lg:p-6 flex flex-col shadow-sm relative border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-blue-200 group h-full min-h-[180px] sm:min-h-[200px] md:min-h-[220px] lg:min-h-0 ${className || ''}`}>
        <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4 pb-2 sm:pb-2.5 md:pb-3 border-b border-gray-50"
            style={{
                paddingTop: '2%',
                paddingLeft: '3%',
            }}
        >
            <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg sm:rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                    <Icon size={16} className="sm:w-[18px] sm:h-[18px] md:w-[20px] md:h-[20px] lg:w-[22px] lg:h-[22px]" />
                </div>
                <h2 className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-extrabold text-gray-700 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{title}</h2>
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
    const [pqcGood, setPqcGood] = useState<number>(0);
    const [pqcRework, setPqcRework] = useState<number>(0);
    const [pqcReject, setPqcReject] = useState<number>(0);
    const [outputLine, setOutputLine] = useState<number>(0);
    
    // Ref untuk menyimpan data sebelumnya untuk perbandingan (tidak menyebabkan re-render)
    const previousDataRef = useRef<{
        good: number;
        rework: number;
        reject: number;
        pqcGood: number;
        pqcRework: number;
        pqcReject: number;
        outputLine: number;
    } | null>(null);
    
    // State untuk data WO/Production
    const [woData, setWoData] = useState<any[]>([]);
    
    // Fungsi untuk membandingkan data lama dan baru
    const hasDataChanged = (
        oldData: { good: number; rework: number; reject: number; pqcGood: number; pqcRework: number; pqcReject: number; outputLine: number } | null,
        newData: { good: number; rework: number; reject: number; pqcGood: number; pqcRework: number; pqcReject: number; outputLine: number }
    ): boolean => {
        if (!oldData) return true; // Pertama kali, selalu update
        
        return (
            oldData.good !== newData.good ||
            oldData.rework !== newData.rework ||
            oldData.reject !== newData.reject ||
            oldData.pqcGood !== newData.pqcGood ||
            oldData.pqcRework !== newData.pqcRework ||
            oldData.pqcReject !== newData.pqcReject ||
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
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    // Tambahkan cache: 'no-cache' untuk memastikan selalu fetch data terbaru
                    cache: 'no-cache',
                });
                
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
                        pqcGood: Number(dataObj.pqc_good) || 0,
                        pqcRework: Number(dataObj.pqc_rework) || 0,
                        pqcReject: Number(dataObj.pqc_reject) || 0,
                        outputLine: Number(dataObj.output_line) || 0,
                    };
                    
                    // Cek apakah ada perubahan data
                    if (hasDataChanged(previousDataRef.current, newData)) {
                        // Ada perubahan, update state
                        setTrackingData(data);
                        setGood(newData.good);
                        setRework(newData.rework);
                        setReject(newData.reject);
                        setPqcGood(newData.pqcGood);
                        setPqcRework(newData.pqcRework);
                        setPqcReject(newData.pqcReject);
                        setOutputLine(newData.outputLine);
                        // Update ref untuk perbandingan berikutnya
                        previousDataRef.current = newData;
                    }
                    // Jika tidak ada perubahan, tidak perlu update state (tidak ada re-render)
                } else {
                    console.warn('⚠️ [DashboardRFID] Data structure tidak valid:', data);
                }
            } catch (error) {
                // Hanya log error jika terjadi, tidak perlu update state
                // Data akan tetap menggunakan nilai sebelumnya untuk menghindari flicker
                console.error('❌ [DashboardRFID] Error fetching tracking data:', error);
            }
        };
        
        // Fetch data pertama kali
        fetchTrackingData();
        
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

    // Fetch data WO/Production dari API
    useEffect(() => {
        let isMounted = true;
        let intervalId: ReturnType<typeof setInterval> | null = null;
        
        const fetchWoData = async () => {
            try {
                // Convert lineId ke format L1, L2, dll
                const lineFormat = `L${lineId}`;
                // Gunakan server.js sebagai proxy untuk menghindari CORS
                const url = `${API_BASE_URL}/wo/production_branch?production_branch=MJ1&line=${encodeURIComponent(lineFormat)}`;
                console.log('🔍 [DashboardRFID] Fetching WO data from:', url);
                
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
                console.log('✅ [DashboardRFID] WO API Response:', data);
                console.log('✅ [DashboardRFID] Response status:', response.status);
                console.log('✅ [DashboardRFID] Response OK:', response.ok);
                
                if (!isMounted) return;
                
                // Parse data dari API
                // Struktur API: { success, data: [...], count, line, production_branch }
                if (data && data.success && Array.isArray(data.data)) {
                    console.log('📊 [DashboardRFID] WO Data array length:', data.data.length);
                    console.log('📊 [DashboardRFID] WO Data items:', data.data);
                    setWoData(data.data);
                } else {
                    console.warn('⚠️ [DashboardRFID] WO Data structure tidak valid:', data);
                    console.warn('⚠️ [DashboardRFID] Data keys:', data ? Object.keys(data) : 'null');
                    console.warn('⚠️ [DashboardRFID] Data.success:', data?.success);
                    console.warn('⚠️ [DashboardRFID] Data.data is array:', Array.isArray(data?.data));
                    setWoData([]);
                }
            } catch (error) {
                console.error('❌ [DashboardRFID] Error fetching WO data:', error);
                console.error('❌ [DashboardRFID] Error type:', error instanceof Error ? error.constructor.name : typeof error);
                console.error('❌ [DashboardRFID] Error message:', error instanceof Error ? error.message : String(error));
                // Jika error, set empty array
                if (isMounted) {
                    setWoData([]);
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
    const totalGood = good + pqcGood;
    const totalRework = rework + pqcRework;
    const totalReject = reject + pqcReject;
    
    // Buat pieData dinamis berdasarkan data API
    // Menggabungkan: good + pqc_good, rework + pqc_rework, reject + pqc_reject
    const pieDataRaw = [
        { 
            name: 'Good', 
            value: totalGood, 
            display: `Good ( ${totalGood} )`, 
            color: COLORS.green 
        },
        { 
            name: 'Rework', 
            value: totalRework, 
            display: `Rework ( ${totalRework} )`, 
            color: COLORS.yellow 
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

    // LOGIKA SIZE SIDEBAR (PENTING UNTUK MENGHINDARI TABRAKAN)
    // 16rem = 256px (Width Sidebar Expanded default tailwind w-64)
    // 5rem  = 80px  (Width Sidebar Collapsed default tailwind w-20)
    const sidebarWidth = isOpen ? '15%' : '3%';

    return (
        <div className="flex min-h-screen w-full bg-[#f4f6f8] font-sans text-gray-800 overflow-x-hidden"
            style={{ paddingLeft: '-1%' }}>

            {/* 1. SIDEBAR (FIXED) */}
            <div className="fixed left-0 top-0 h-full z-50 shadow-xl">
                <Sidebar />
            </div>

            {/* 2. WRAPPER KONTEN KANAN */}
            <div
                className="flex flex-col w-full transition-all duration-300 ease-in-out"
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
                    className={`
                flex-1 flex flex-col p-2 sm:p-3 md:p-4 lg:p-6 gap-2 sm:gap-3 md:gap-4 lg:gap-6 bg-[#f4f6f8]
                /* Mobile: Scroll Aktif. Desktop: Locked/Fit Screen */
                overflow-hidden
                h-[calc(100vh-4rem)]
                max-h-[calc(100vh-4rem)]
            `}>
                    {/* PAGE TITLE */}
                    <div className="flex-none text-center"
                        style={{
                            marginTop: '1rem',
                        }} >
                        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-black text-gray-700 uppercase tracking-wide drop-shadow-sm">
                            <span className="text-blue-600">Dashboard</span> Monitoring RFID {lineTitle}
                        </h1>
                    </div>

                    {/* GRID CONTAINER */}
                    <div className="flex-1 flex flex-col gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6 min-h-0 overflow-y-auto"
                        style={{
                            paddingRight: '1%',
                            paddingLeft: '2%',
                            
                        }}>

                        {/* ROW 1: CHARTS */}
                        <div className="flex-none h-auto lg:h-[40%] grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6">
                            <ChartCard title="Overview Data RFID" icon={PieIcon} className="lg:col-span-1">
                                <div className="flex flex-col lg:flex-row items-center h-full"
                                    style={{
                                        padding: '0.5%',
                                    }}>
                                    <div className="w-full lg:w-[55%] h-[120px] sm:h-[140px] md:h-[160px] lg:h-full relative">
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

                            <ChartCard title={`Data ${lineTitle}`} icon={TableIcon} className="lg:col-span-2">
                                <div className="flex flex-row items-center justify-end h-6 sm:h-7 md:h-8 lg:h-10 pr-2 sm:pr-4 md:pr-6 lg:pr-10"
                                    style={{
                                        paddingRight: '0.5%',
                                    }}>
                                    <span className="
                                    bg-blue-100 w-1/4 sm:w-1/5 text-blue-700 text-[10px] sm:text-xs font-bold 
                                    px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-blue-200
                                    content-center items-center justify-center text-center
                                    shadow-sm"
                                        style={{
                                            padding: '0.5%',
                                        }}
                                    >Nov 2025  </span>
                                </div>
                                <div className="h-[80px] sm:h-[100px] md:h-[120px] lg:h-full w-full border border-gray-200 rounded-lg sm:rounded-xl overflow-hidden flex flex-col shadow-inner"
                                    style={{
                                        height: '60%',
                                    }}
                                >
                                    <div className="grid grid-cols-7 bg-blue-50 h-1/5 content-center font-bold text-center py-1.5 sm:py-2 md:py-2.5 lg:py-3 border-b border-blue-100 text-gray-700 text-[10px] sm:text-xs md:text-sm uppercase tracking-wide">
                                        <div className="border-r border-blue-100">WO</div>
                                        <div className="border-r border-blue-100">Item</div>
                                        <div className="border-r border-blue-100">Style</div>
                                        <div className="border-r border-blue-100">Buyer</div>
                                        <div className="border-r border-blue-100">Color</div>
                                        <div className="border-r border-blue-100">Size</div>
                                        <div>Qty</div>
                                    </div>
                                    <div className="flex-1 bg-white overflow-y-auto">
                                        {woData.length > 0 ? (
                                            <div className="w-full">
                                                {woData.map((item, index) => (
                                                    <div 
                                                        key={item.wo_id || index}
                                                        className="grid grid-cols-7 border-b border-dashed border-gray-100 py-2 text-xs sm:text-sm hover:bg-gray-50 transition-colors"
                                                    >
                                                        <div className="flex items-center justify-center text-center px-1 border-r border-dashed border-gray-100">
                                                            {item.wo_no || '-'}
                                                        </div>
                                                        <div className="flex items-center justify-center text-center px-1 border-r border-dashed border-gray-100">
                                                            {item.product_name || '-'}
                                                        </div>
                                                        <div className="flex items-center justify-center text-center px-1 border-r border-dashed border-gray-100">
                                                            {item.style || '-'}
                                                        </div>
                                                        <div className="flex items-center justify-center text-center px-1 border-r border-dashed border-gray-100">
                                                            {item.buyer || '-'}
                                                        </div>
                                                        <div className="flex items-center justify-center text-center px-1 border-r border-dashed border-gray-100">
                                                            {item.colors || '-'}
                                                        </div>
                                                        <div className="flex items-center justify-center text-center px-1 border-r border-dashed border-gray-100">
                                                            {item.breakdown_sizes || '-'}
                                                        </div>
                                                        <div className="flex items-center justify-center text-center px-1">
                                                            {item.total_qty_order || '-'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-400 text-xs sm:text-sm">
                                                Tidak ada data
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </ChartCard>
                        </div>

                        {/* ROW 2 & 3: STATUS CARDS */}
                        <div className="flex-1 flex flex-col gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 min-h-0"
                        
                        >
                            {/* Row 2: Data QC - reject, rework, good */}
                            <div className=" flex-1 grid grid-cols-3 gap-1.5 sm:gap-2 md:gap-3 lg:gap-4"
                           >
                                <StatusCard type="REJECT" count={reject} label="REJECT QC" />
                                <StatusCard type="REWORK" count={rework} label="REWORK QC" />
                                <StatusCard type="GOOD" count={good} label="GOOD QC" />
                            </div>
                            {/* Row 3: Data PQC - reject, rework, good */}
                            <div className="flex-1 grid grid-cols-3 gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 pb-2 sm:pb-3 md:pb-4 lg:pb-6"
                            >
                                <StatusCard type="REJECT" count={pqcReject} label="REJECT PQC" />
                                <StatusCard type="REWORK" count={pqcRework} label="REWORK PQC" />
                                <StatusCard type="GOOD" count={pqcGood} label="GOOD PQC" />
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </div >
    );
}
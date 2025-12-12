import { useParams } from 'react-router-dom';
import { useMemo, useCallback, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';
import { API_BASE_URL } from '../config/api';
import ExportModal from '../components/ExportModal';
import type { ExportType } from '../components/ExportModal';
import { exportToExcel } from '../utils/exportToExcel';
import { useDashboardRFID } from '../hooks/useDashboardRFID';
import { formatDateForAPI } from '../utils/dateUtils';
import OverviewChart from '../components/dashboard/OverviewChart';
import DataLineCard from '../components/dashboard/DataLineCard';
import StatusCardsGrid from '../components/dashboard/StatusCardsGrid';
import { COLORS } from '../components/dashboard/constants';
import { Filter, XCircle, CheckCircle, RefreshCcw, AlertCircle } from 'lucide-react';
import backgroundImage from '../assets/background.jpg';

// --- HALAMAN UTAMA ---

export default function DashboardRFID() {
    const { id } = useParams<{ id: string }>();
    const { isOpen } = useSidebar();
    const lineId = id || '1';
    const lineTitle = `LINE ${lineId}`;

    // Custom hook untuk semua state dan logic
    const {
        good,
        rework,
        reject,
        wiraQc,
        pqcGood,
        pqcRework,
        pqcReject,
        wiraPqc,
        outputLine,
        woData,
        showExportModal,
        setShowExportModal,
        showDateFilterModal,
        setShowDateFilterModal,
        filterDateFrom,
        setFilterDateFrom,
        filterDateTo,
        setFilterDateTo,
    } = useDashboardRFID(lineId);

    // State untuk WO filter
    const [showWoFilterModal, setShowWoFilterModal] = useState(false);
    const [filterWo, setFilterWo] = useState('');

    // State untuk detail modal
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailData, setDetailData] = useState<any[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailTitle, setDetailTitle] = useState('');
    const [detailType, setDetailType] = useState<'GOOD' | 'REWORK' | 'REJECT' | 'WIRA' | null>(null);

    // Fungsi untuk fetch detail data berdasarkan status
    const fetchDetailData = useCallback(async (type: 'GOOD' | 'REWORK' | 'REJECT' | 'WIRA', section: 'QC' | 'PQC') => {
        try {
            setDetailLoading(true);
            setDetailTitle(`${type} ${section}`);
            setDetailType(type);

            // Get today's date (UTC untuk konsistensi dengan API)
            // Gunakan UTC untuk menghindari masalah timezone
            const now = new Date();
            const todayYear = now.getUTCFullYear();
            const todayMonth = now.getUTCMonth();
            const todayDay = now.getUTCDate();
            
            // Buat string tanggal untuk perbandingan: YYYY-MM-DD
            const todayDateStr = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;
            
            console.log('🔵 [Detail Modal] Filter tanggal hari ini (UTC):', todayDateStr);

            // Fetch data dari API
            const url = `${API_BASE_URL}/tracking/rfid_garment?line=${encodeURIComponent(lineId)}`;
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

            const result = await response.json();
            let allData = result.data || [];

            // Filter berdasarkan hari ini terlebih dahulu (menggunakan UTC untuk konsistensi)
            const todayData = allData.filter((item: any) => {
                if (!item.timestamp) {
                    return false;
                }
                
                try {
                    // Parse timestamp dari format API: "Fri, 12 Dec 2025 13:59:05 GMT"
                    const itemDate = new Date(item.timestamp);
                    
                    // Validasi bahwa parsing berhasil
                    if (isNaN(itemDate.getTime())) {
                        console.warn('Invalid timestamp:', item.timestamp);
                        return false;
                    }
                    
                    // Bandingkan tahun, bulan, dan hari dalam UTC
                    const itemYear = itemDate.getUTCFullYear();
                    const itemMonth = itemDate.getUTCMonth();
                    const itemDay = itemDate.getUTCDate();
                    
                    // Buat string tanggal untuk perbandingan: YYYY-MM-DD
                    const itemDateStr = `${itemYear}-${String(itemMonth + 1).padStart(2, '0')}-${String(itemDay).padStart(2, '0')}`;
                    
                    // Hanya ambil data yang tanggalnya sama dengan hari ini
                    const isToday = itemDateStr === todayDateStr;
                    
                    if (!isToday) {
                        console.log('🔵 [Detail Modal] Data di-filter (bukan hari ini):', {
                            rfid: item.rfid_garment,
                            timestamp: item.timestamp,
                            itemDate: itemDateStr,
                            today: todayDateStr
                        });
                    }
                    
                    return isToday;
                } catch (e) {
                    console.error('Error parsing timestamp:', item.timestamp, e);
                    return false;
                }
            });
            
            console.log('🔵 [Detail Modal] Total data hari ini:', todayData.length, 'dari', allData.length, 'total data');

            let filteredData: any[] = [];

            if (section === 'QC') {
                switch (type) {
                    case 'GOOD':
                        // GOOD QC: bagian = 'QC' dan last_status = 'GOOD'
                        filteredData = todayData.filter((item: any) => {
                            const bagian = (item.bagian || '').trim().toUpperCase();
                            return bagian === 'QC' && item.last_status === 'GOOD';
                        });
                        break;
                    case 'REWORK':
                        // REWORK QC: bagian = 'QC' dan last_status = 'REWORK'
                        filteredData = todayData.filter((item: any) => {
                            const bagian = (item.bagian || '').trim().toUpperCase();
                            return bagian === 'QC' && item.last_status === 'REWORK';
                        });
                        break;
                    case 'REJECT':
                        // REJECT QC: bagian = 'QC' dan last_status = 'REJECT' DAN ada data WO dan lainnya (bukan kosong)
                        filteredData = todayData.filter((item: any) => {
                            const bagian = (item.bagian || '').trim().toUpperCase();
                            const hasData = item.wo && item.wo.trim() !== '' && 
                                          item.style && item.style.trim() !== '' &&
                                          item.buyer && item.buyer.trim() !== '';
                            return bagian === 'QC' && item.last_status === 'REJECT' && hasData;
                        });
                        break;
                    case 'WIRA':
                        // WIRA QC: rework yang ada di QC, TAPI belum pernah GOOD QC
                        // Ambil semua data untuk cek history
                        const reworkQcData = todayData.filter((item: any) => {
                            const bagian = (item.bagian || '').trim().toUpperCase();
                            return bagian === 'QC' && item.last_status === 'REWORK';
                        });

                        // Cek untuk setiap RFID, apakah pernah GOOD QC
                        const rfidSet = new Set(reworkQcData.map((item: any) => item.rfid_garment));
                        const rfidWithGoodHistory = new Set<string>();

                        // Cek history semua data (tidak hanya hari ini) untuk melihat apakah pernah GOOD
                        allData.forEach((item: any) => {
                            const bagian = (item.bagian || '').trim().toUpperCase();
                            if (bagian === 'QC' && item.last_status === 'GOOD' && rfidSet.has(item.rfid_garment)) {
                                rfidWithGoodHistory.add(item.rfid_garment);
                            }
                        });

                        // Filter: REWORK QC yang belum pernah GOOD
                        filteredData = reworkQcData.filter((item: any) => {
                            return !rfidWithGoodHistory.has(item.rfid_garment);
                        });
                        break;
                }
            } else {
                // PQC Section
                switch (type) {
                    case 'GOOD':
                        filteredData = todayData.filter((item: any) => {
                            const bagian = (item.bagian || '').trim().toUpperCase();
                            return bagian === 'PQC' && item.last_status === 'PQC_GOOD';
                        });
                        break;
                    case 'REWORK':
                        filteredData = todayData.filter((item: any) => {
                            const bagian = (item.bagian || '').trim().toUpperCase();
                            return bagian === 'PQC' && item.last_status === 'PQC_REWORK';
                        });
                        break;
                    case 'REJECT':
                        // REJECT PQC: bagian = 'PQC' dan last_status = 'PQC_REJECT' DAN ada data WO dan lainnya
                        filteredData = todayData.filter((item: any) => {
                            const bagian = (item.bagian || '').trim().toUpperCase();
                            const hasData = item.wo && item.wo.trim() !== '' && 
                                          item.style && item.style.trim() !== '' &&
                                          item.buyer && item.buyer.trim() !== '';
                            return bagian === 'PQC' && item.last_status === 'PQC_REJECT' && hasData;
                        });
                        break;
                    case 'WIRA':
                        // WIRA PQC: rework yang ada di PQC, TAPI belum pernah PQC_GOOD
                        const reworkPqcData = todayData.filter((item: any) => {
                            const bagian = (item.bagian || '').trim().toUpperCase();
                            return bagian === 'PQC' && item.last_status === 'PQC_REWORK';
                        });

                        const rfidPqcSet = new Set(reworkPqcData.map((item: any) => item.rfid_garment));
                        const rfidPqcWithGoodHistory = new Set<string>();

                        allData.forEach((item: any) => {
                            const bagian = (item.bagian || '').trim().toUpperCase();
                            if (bagian === 'PQC' && item.last_status === 'PQC_GOOD' && rfidPqcSet.has(item.rfid_garment)) {
                                rfidPqcWithGoodHistory.add(item.rfid_garment);
                            }
                        });

                        filteredData = reworkPqcData.filter((item: any) => {
                            return !rfidPqcWithGoodHistory.has(item.rfid_garment);
                        });
                        break;
                }
            }

            // Sort berdasarkan timestamp terbaru
            filteredData.sort((a: any, b: any) => {
                const dateA = new Date(a.timestamp).getTime();
                const dateB = new Date(b.timestamp).getTime();
                return dateB - dateA; // Terbaru di atas
            });

            setDetailData(filteredData);
            setShowDetailModal(true);
        } catch (error) {
            console.error('Error fetching detail data:', error);
            setDetailData([]);
            setShowDetailModal(true);
        } finally {
            setDetailLoading(false);
        }
    }, [lineId]);

    // Data fetching sudah ditangani oleh custom hook useDashboardRFID

    // Hitung total untuk pieData dengan menggabungkan data biasa dan PQC
    // Balance: Output = Good + WIRA + Reject (tidak menghitung rework)
    const pieData = useMemo(() => {
        const totalGood = good + pqcGood;
        const totalWira = wiraQc + wiraPqc;
        const totalReject = reject + pqcReject;

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
        return pieDataRaw.filter(item => item.value > 0).length > 0
            ? pieDataRaw.filter(item => item.value > 0)
            : pieDataRaw;
    }, [good, pqcGood, wiraQc, wiraPqc, reject, pqcReject]);

    // Data untuk status cards
    const qcData = useMemo(() => ({
        reject,
        rework,
        wira: wiraQc,
        good,
    }), [reject, rework, wiraQc, good]);

    const pqcData = useMemo(() => ({
        reject: pqcReject,
        rework: pqcRework,
        wira: wiraPqc,
        good: pqcGood,
    }), [pqcReject, pqcRework, wiraPqc, pqcGood]);

    // --- DATA UNTUK EXPORT CHARTS ---
    const qcDataForExport = useMemo(() => [
        { name: 'Good', value: good, color: COLORS.green },
        { name: 'WIRA', value: wiraQc, color: COLORS.blue },
        { name: 'Reject', value: reject, color: COLORS.red },
    ].filter(d => d.value > 0), [good, wiraQc, reject]);

    const pqcDataForExport = useMemo(() => [
        { name: 'Good', value: pqcGood, color: COLORS.green },
        { name: 'WIRA', value: wiraPqc, color: COLORS.blue },
        { name: 'Reject', value: pqcReject, color: COLORS.red },
    ].filter(d => d.value > 0), [pqcGood, wiraPqc, pqcReject]);

    // Fungsi untuk fetch data per hari
    const fetchDailyData = async (): Promise<any[]> => {
        try {
            // Tentukan range tanggal
            const startDate = filterDateFrom ? new Date(filterDateFrom) : new Date();
            const endDate = filterDateTo ? new Date(filterDateTo) : new Date();
            
            // Jika tidak ada filter, gunakan hari ini saja
            if (!filterDateFrom && !filterDateTo) {
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
            }

            const dailyData: any[] = [];
            const currentDate = new Date(startDate);
            
            // Loop setiap hari dalam range
            while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const formattedDate = formatDateForAPI(dateStr);
                
                // Fetch data untuk hari ini
                const url = `${API_BASE_URL}/wira?line=${encodeURIComponent(lineId)}&tanggalfrom=${encodeURIComponent(formattedDate)}&tanggalto=${encodeURIComponent(formattedDate)}`;
                
                try {
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                        cache: 'no-cache',
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data && data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
                            const lineData = data.data.find((item: any) => {
                                // Cek field Line (kapital) atau line (huruf kecil)
                                const itemLine = String(item.Line || item.line || item.LINE || '').trim();
                                const targetLine = String(lineId || '').trim();
                                // Match exact atau match sebagai number
                                const itemLineNum = parseInt(itemLine, 10);
                                const targetLineNum = parseInt(targetLine, 10);
                                return itemLine === targetLine || 
                                       (!isNaN(itemLineNum) && !isNaN(targetLineNum) && itemLineNum === targetLineNum);
                            });
                            
                            if (lineData) {
                                const parseNumber = (value: any): number => {
                                    if (value === null || value === undefined || value === '') return 0;
                                    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
                                    return isNaN(num) ? 0 : num;
                                };

                                dailyData.push({
                                    tanggal: dateStr,
                                    line: `LINE ${lineId}`,
                                    wo: woData?.wo || '-',
                                    style: woData?.style || '-',
                                    item: woData?.item || '-',
                                    buyer: woData?.buyer || '-',
                                    color: woData?.color || '-',
                                    size: woData?.breakdown_sizes || '-',
                                    outputSewing: parseNumber(lineData['Output Sewing'] || lineData['output_sewing'] || lineData.outputSewing || 0),
                                    qcRework: parseNumber(lineData.Rework || lineData.rework || 0),
                                    qcWira: parseNumber(lineData.WIRA || lineData.wira || 0),
                                    qcReject: parseNumber(lineData.Reject || lineData.reject || 0),
                                    qcGood: parseNumber(lineData.Good || lineData.good || 0),
                                    pqcRework: parseNumber(lineData['PQC Rework'] || lineData['PQC Rework'] || lineData['pqc_rework'] || lineData.pqcRework || 0),
                                    pqcWira: parseNumber(lineData['PQC WIRA'] || lineData['PQC WIRA'] || lineData['pqc_wira'] || lineData.pqcWira || 0),
                                    pqcReject: parseNumber(lineData['PQC Reject'] || lineData['PQC Reject'] || lineData['pqc_reject'] || lineData.pqcReject || 0),
                                    pqcGood: parseNumber(lineData['PQC Good'] || lineData['PQC Good'] || lineData['pqc_good'] || lineData.pqcGood || 0),
                                    goodSewing: parseNumber(lineData['PQC Good'] || lineData['PQC Good'] || lineData['pqc_good'] || lineData.pqcGood || 0),
                                    balance: parseNumber(lineData['Output Sewing'] || lineData['output_sewing'] || lineData.outputSewing || 0) - parseNumber(lineData['PQC Good'] || lineData['PQC Good'] || lineData['pqc_good'] || lineData.pqcGood || 0),
                                });
                            } else {
                                // Jika tidak ada data, tetap tambahkan baris dengan nilai 0
                                dailyData.push({
                                    tanggal: dateStr,
                                    line: `LINE ${lineId}`,
                                    wo: woData?.wo || '-',
                                    style: woData?.style || '-',
                                    item: woData?.item || '-',
                                    buyer: woData?.buyer || '-',
                                    color: woData?.color || '-',
                                    size: woData?.breakdown_sizes || '-',
                                    outputSewing: 0,
                                    qcRework: 0,
                                    qcWira: 0,
                                    qcReject: 0,
                                    qcGood: 0,
                                    pqcRework: 0,
                                    pqcWira: 0,
                                    pqcReject: 0,
                                    pqcGood: 0,
                                    goodSewing: 0,
                                    balance: 0,
                                });
                            }
                        } else {
                            // Jika tidak ada data, tetap tambahkan baris dengan nilai 0
                            dailyData.push({
                                tanggal: dateStr,
                                line: `LINE ${lineId}`,
                                wo: woData?.wo || '-',
                                style: woData?.style || '-',
                                item: woData?.item || '-',
                                buyer: woData?.buyer || '-',
                                color: woData?.color || '-',
                                size: woData?.breakdown_sizes || '-',
                                outputSewing: 0,
                                qcRework: 0,
                                qcWira: 0,
                                qcReject: 0,
                                qcGood: 0,
                                pqcRework: 0,
                                pqcWira: 0,
                                pqcReject: 0,
                                pqcGood: 0,
                                goodSewing: 0,
                                balance: 0,
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Error fetching data for ${dateStr}:`, error);
                    // Tetap tambahkan baris dengan nilai 0 jika error
                    dailyData.push({
                        tanggal: dateStr,
                        line: `LINE ${lineId}`,
                        wo: woData?.wo || '-',
                        style: woData?.style || '-',
                        item: woData?.item || '-',
                        buyer: woData?.buyer || '-',
                        color: woData?.color || '-',
                        size: woData?.breakdown_sizes || '-',
                        outputSewing: 0,
                        qcRework: 0,
                        qcWira: 0,
                        qcReject: 0,
                        qcGood: 0,
                        pqcRework: 0,
                        pqcWira: 0,
                        pqcReject: 0,
                        pqcGood: 0,
                        goodSewing: 0,
                        balance: 0,
                    });
                }
                
                // Pindah ke hari berikutnya
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            return dailyData;
        } catch (error) {
            console.error('Error fetching daily data:', error);
            return [];
        }
    };

    // Fungsi untuk handle export dengan useCallback untuk optimasi
    const handleExport = useCallback(async (format: 'excel' | 'csv', exportType: ExportType) => {
        // Ambil data WO jika ada
        const firstWo = woData || null;

        let exportData: any[] = [];

        if (exportType === 'daily') {
            // Fetch data per hari
            exportData = await fetchDailyData();
        } else if (exportType === 'all') {
            // Data yang ditampilkan di dashboard (default)
            exportData = [{
                tanggal: '', // Akan diisi di exportToExcel berdasarkan filter
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
                goodSewing: pqcGood, // Good sewing sama dengan Good PQC
                balance: outputLine - pqcGood, // Balance = output sewing - good pqc
                qcChartImage: undefined,
                pqcChartImage: undefined
            }];
        }

        await exportToExcel(exportData, lineId, format, filterDateFrom, filterDateTo, exportType);
    }, [lineId, woData, outputLine, rework, wiraQc, reject, good, pqcRework, wiraPqc, pqcReject, pqcGood, filterDateFrom, filterDateTo]);

    // LOGIKA SIZE SIDEBAR (PENTING UNTUK MENGHINDARI TABRAKAN)
    // 18% = Width Sidebar Expanded
    // 5rem = 80px (Width Sidebar Collapsed default tailwind w-20)
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

            {/* 1. SIDEBAR (FIXED) */}
            <div className="fixed left-0 top-0 h-full z-50 shadow-xl">
                <Sidebar />
            </div>

            {/* 2. WRAPPER KONTEN KANAN */}
            <div
                className="flex flex-col w-full h-full transition-all duration-300 ease-in-out"
                style={{
                    marginLeft: sidebarWidth,
                    width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)'
                }}>

                {/* 3. HEADER (STICKY) */}
                <div className="sticky top-0 z-40 shadow-md">
                    <Header />
                </div>

                {/* 4. MAIN CONTENT */}
                <main
                    className="flex-1 flex flex-col overflow-hidden pt-2 sm:pt-3 md:pt-4"
                >
                    {/* PAGE TITLE */}
                    <div className="flex-shrink-0 text-center py-2">
                        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-gray-700 uppercase tracking-wide drop-shadow-sm">
                            <span className="text-blue-600">Dashboard</span> Monitoring RFID {lineTitle}
                        </h1>
                    </div>

                    {/* GRID CONTAINER */}
                    <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden px-2 sm:px-3 md:px-4 pb-4 sm:pb-6">

                        {/* ROW 1: CHARTS - Tetap 1 baris di semua ukuran, proporsi 1/3 dan 2/3 */}
                        <div className="flex-none flex flex-row gap-1 xs:gap-1.5 sm:gap-2 overflow-hidden" style={{ height: '38%', maxHeight: '38%', minHeight: '38%' }}>
                            <div className="flex-[1] min-w-0 overflow-hidden" style={{ flex: '1 1 33.333%', maxWidth: '33.333%' }}>
                                <OverviewChart pieData={pieData} outputLine={outputLine} />
                            </div>
                            <div className="flex-[2] min-w-0 overflow-hidden" style={{ flex: '2 1 66.666%', maxWidth: '66.666%' }}>
                                <DataLineCard
                                    lineTitle={lineTitle}
                                    woData={woData}
                                    onDateFilterClick={() => setShowDateFilterModal(true)}
                                    onExportClick={() => setShowExportModal(true)}
                                    onWoFilterClick={() => setShowWoFilterModal(true)}
                                />
                            </div>
                        </div>

                        {/* ROW 2 & 3: STATUS CARDS */}
                        <StatusCardsGrid qcData={qcData} pqcData={pqcData} onCardClick={fetchDetailData} />

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

            {/* WO Filter Modal */}
            {showWoFilterModal && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-md transform transition-all border border-white/20">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <Filter className="w-5 h-5 text-purple-600" strokeWidth={2.5} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Filter WO</h3>
                            </div>
                            <button
                                onClick={() => setShowWoFilterModal(false)}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                            >
                                <XCircle className="w-5 h-5 text-gray-500 hover:text-gray-700" strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 sm:p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Work Order (WO)
                                </label>
                                <input
                                    type="text"
                                    value={filterWo}
                                    onChange={(e) => setFilterWo(e.target.value)}
                                    placeholder="Masukkan nomor WO"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200">
                            <button
                                onClick={() => {
                                    setFilterWo('');
                                }}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200 font-medium"
                            >
                                Reset
                            </button>
                            <button
                                onClick={() => {
                                    setShowWoFilterModal(false);
                                    // TODO: Implement WO filter logic
                                }}
                                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200 font-semibold shadow-sm hover:shadow-md"
                            >
                                Terapkan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Date Filter Modal */}
            {showDateFilterModal && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-md transform transition-all border border-white/20">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Filter className="w-5 h-5 text-blue-600" strokeWidth={2.5} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Filter Tanggal</h3>
                            </div>
                            <button
                                onClick={() => setShowDateFilterModal(false)}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                            >
                                <XCircle className="w-5 h-5 text-gray-500 hover:text-gray-700" strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 sm:p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Dari Tanggal
                                </label>
                                <input
                                    type="date"
                                    value={filterDateFrom}
                                    onChange={(e) => setFilterDateFrom(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Sampai Tanggal
                                </label>
                                <input
                                    type="date"
                                    value={filterDateTo}
                                    onChange={(e) => setFilterDateTo(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200">
                            <button
                                onClick={() => {
                                    setFilterDateFrom('');
                                    setFilterDateTo('');
                                }}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200 font-medium"
                            >
                                Reset
                            </button>
                            <button
                                onClick={() => {
                                    setShowDateFilterModal(false);
                                    // Data akan otomatis di-fetch ulang karena dependency filterDateFrom dan filterDateTo berubah
                                }}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-semibold shadow-sm hover:shadow-md"
                            >
                                Terapkan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* HIDDEN CHARTS FOR EXPORT */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                <div id="qc-chart-export" style={{ width: 400, height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={qcDataForExport} cx="50%" cy="50%" innerRadius={50} outerRadius={100} dataKey="value" stroke="white" strokeWidth={2}>
                                {qcDataForExport.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div id="pqc-chart-export" style={{ width: 400, height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={pqcDataForExport} cx="50%" cy="50%" innerRadius={50} outerRadius={100} dataKey="value" stroke="white" strokeWidth={2}>
                                {pqcDataForExport.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detail Modal */}
            {showDetailModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDetailModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] sm:h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 p-4 sm:p-6 flex-shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                        {detailType === 'GOOD' && <CheckCircle className="text-white" size={24} strokeWidth={2.5} />}
                                        {detailType === 'REWORK' && <RefreshCcw className="text-white" size={24} strokeWidth={2.5} />}
                                        {detailType === 'REJECT' && <XCircle className="text-white" size={24} strokeWidth={2.5} />}
                                        {detailType === 'WIRA' && <AlertCircle className="text-white" size={24} strokeWidth={2.5} />}
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                                        Detail {detailTitle}
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white hover:bg-white/30"
                                >
                                    <XCircle size={20} />
                                </button>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl px-4 py-2.5 shadow-lg">
                                    <div className="text-xs font-semibold text-white/90 mb-0.5">Total Data</div>
                                    <div className="text-2xl font-bold text-white">{detailData.length}</div>
                                </div>
                                <div className="text-sm text-white/90" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                    Data hari ini ({new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })})
                                </div>
                            </div>
                        </div>

                        {/* Table Content */}
                        <div className="flex-1 overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-blue-50/30 min-h-0 flex flex-col">
                            {detailLoading ? (
                                <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <p className="text-slate-600 font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>Memuat data...</p>
                                </div>
                            ) : detailData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-slate-400 h-full min-h-[400px]">
                                    <div className="p-4 bg-blue-100 rounded-full mb-4">
                                        <XCircle size={48} className="text-blue-500 opacity-50" />
                                    </div>
                                    <p className="text-lg font-bold text-slate-600 mb-1" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>Tidak ada data</p>
                                    <p className="text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>Tidak ada data {detailTitle} untuk hari ini</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden h-full flex flex-col">
                                    <div className="overflow-y-auto flex-1 min-h-0">
                                        <table className="w-full">
                                            <thead className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border-b-2 border-slate-600 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500 text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>RFID ID</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500 text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>WO</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500 text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>Style</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500 text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>Buyer</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500 text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>Item</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500 text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>Color</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500 text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>Size</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500 text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>Line</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500 text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>Timestamp</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-100">
                                                {detailData.map((item, index) => (
                                                    <tr key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/50 transition-colors`}>
                                                        <td className="px-4 py-3 text-sm font-mono font-bold text-blue-600" style={{ fontFamily: 'Poppins, sans-serif' }}>{item.rfid_garment || '-'}</td>
                                                        <td className="px-4 py-3 text-sm text-slate-700" style={{ fontFamily: 'Poppins, sans-serif' }}>{item.wo || '-'}</td>
                                                        <td className="px-4 py-3 text-sm text-slate-700" style={{ fontFamily: 'Poppins, sans-serif' }}>{item.style || '-'}</td>
                                                        <td className="px-4 py-3 text-sm text-slate-700" style={{ fontFamily: 'Poppins, sans-serif' }}>{item.buyer || '-'}</td>
                                                        <td className="px-4 py-3 text-sm text-slate-700" style={{ fontFamily: 'Poppins, sans-serif' }}>{item.item || '-'}</td>
                                                        <td className="px-4 py-3 text-sm text-slate-700" style={{ fontFamily: 'Poppins, sans-serif' }}>{item.color || '-'}</td>
                                                        <td className="px-4 py-3 text-sm text-slate-700 font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>{item.size || '-'}</td>
                                                        <td className="px-4 py-3 text-sm text-slate-700" style={{ fontFamily: 'Poppins, sans-serif' }}>{item.line || '-'}</td>
                                                        <td className="px-4 py-3 text-sm text-slate-600 font-mono" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                                            {item.timestamp ? (() => {
                                                                try {
                                                                    // Parse timestamp dari format API: "Fri, 12 Dec 2025 13:59:05 GMT"
                                                                    const date = new Date(item.timestamp);
                                                                    // Format: DD MMM YYYY, HH.MM.SS
                                                                    const day = String(date.getUTCDate()).padStart(2, '0');
                                                                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                                                                    const month = monthNames[date.getUTCMonth()];
                                                                    const year = date.getUTCFullYear();
                                                                    const hours = String(date.getUTCHours()).padStart(2, '0');
                                                                    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
                                                                    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
                                                                    return `${day} ${month} ${year}, ${hours}.${minutes}.${seconds}`;
                                                                } catch (e) {
                                                                    return item.timestamp;
                                                                }
                                                            })() : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
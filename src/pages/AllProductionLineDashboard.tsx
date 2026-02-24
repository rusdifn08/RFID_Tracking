import { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';
import backgroundImage from '../assets/background.jpg';
import { API_BASE_URL, getDefaultHeaders, setBackendEnvironment } from '../config/api';
import { productionLinesCLN, productionLinesMJL, productionLinesMJL2 } from '../data/production_line';
import { Clock } from 'lucide-react';

// Helper function untuk convert 24-hour format ke 12-hour format dengan AM/PM
const formatTime12Hour = (time24: string): { time: string; period: string } => {
    if (!time24 || !time24.includes(':')) {
        return { time: '07:30', period: 'AM' };
    }
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return {
        time: `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
        period: period
    };
};

interface LineData {
    line: string;
    supervisor: string;
    startTime?: string; // Jam masuk (format: HH:mm)
    good: number;
    rework: number;
    reject: number;
    wira: number;
}

const getEnvironment = async (): Promise<'CLN' | 'MJL' | 'MJL2'> => {
    // Deteksi environment berdasarkan port sebagai fallback
    const currentPort = window.location.port;
    let fallbackEnv: 'CLN' | 'MJL' | 'MJL2' = 'CLN';

    if (currentPort === '5174') {
        fallbackEnv = 'MJL2';
    } else if (currentPort === '5173') {
        fallbackEnv = 'MJL';
    } else {
        fallbackEnv = 'CLN';
    }

    try {
        // Fetch dari API untuk memastikan environment yang benar
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${API_BASE_URL}/api/config/environment`, {
            headers: getDefaultHeaders(),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            const env = data.environment === 'MJL2' ? 'MJL2' : data.environment === 'MJL' ? 'MJL' : 'CLN';
            setBackendEnvironment(env);
            return env;
        }
    } catch (error) {
        console.error('Error fetching environment config:', error);
        // Jika error, gunakan fallback berdasarkan port
        console.log(`⚠️ [ENV] Using fallback environment based on port ${currentPort}: ${fallbackEnv}`);
        setBackendEnvironment(fallbackEnv);
        return fallbackEnv;
    }
    // Default berdasarkan port jika tidak ada response
    console.log(`⚠️ [ENV] No response from API, using fallback environment based on port ${currentPort}: ${fallbackEnv}`);
    setBackendEnvironment(fallbackEnv);
    return fallbackEnv;
};

export default function AllProductionLineDashboard() {
    const { isOpen } = useSidebar();
    const [lineData, setLineData] = useState<Record<string, LineData>>({});
    const [supervisorData, setSupervisorData] = useState<{ supervisors: Record<string, string>, startTimes: Record<string, string> } | null>(null);
    const [error, setError] = useState<string | null>(null);
    // Initialize environment dari localStorage terlebih dahulu untuk menghindari flash CLN
    // Jika localStorage belum ada, default ke MJL (karena user biasanya menggunakan dev:all:mjl)
    const [environment, setEnvironment] = useState<'CLN' | 'MJL' | 'MJL2'>(() => {
        const storedEnv = localStorage.getItem('backend_environment') as 'CLN' | 'MJL' | 'MJL2' | null;
        // Prioritaskan MJL jika storedEnv ada, jika tidak ada default ke MJL (bukan CLN)
        if (storedEnv === 'MJL') return 'MJL';
        if (storedEnv === 'MJL2') return 'MJL2';
        if (storedEnv === 'CLN') return 'CLN';
        // Default ke MJL karena biasanya user menggunakan dev:all:mjl
        return 'MJL';
    });
    const [envLoading, setEnvLoading] = useState(true);

    const filteredProductionLinesCLN = useMemo(() =>
        productionLinesCLN.filter(line => line.id !== 0).map(line => ({
            id: line.id,
            title: line.title,
            supervisor: line.supervisor
        })),
        []
    );

    const filteredProductionLinesMJL = useMemo(() =>
        productionLinesMJL
            .filter(line => line.id !== 111) // Filter All Production Line
            .map(line => ({
                id: line.id,
                title: line.title,
                supervisor: line.supervisor
            })),
        []
    );

    const filteredProductionLinesMJL2 = useMemo(() =>
        productionLinesMJL2
            .filter(line => line.id !== 112) // Filter All Production Line
            .map(line => ({
                id: line.id,
                title: line.title,
                supervisor: line.supervisor
            })),
        []
    );

    const productionLines = useMemo(() => {
        if (environment === 'MJL2') {
            return filteredProductionLinesMJL2;
        } else if (environment === 'MJL') {
            return filteredProductionLinesMJL;
        } else {
            return filteredProductionLinesCLN;
        }
    }, [environment, filteredProductionLinesCLN, filteredProductionLinesMJL, filteredProductionLinesMJL2]);

    // Fetch environment dan set state - PRIORITAS TINGGI (harus selesai sebelum fetch data)
    useEffect(() => {
        let isMounted = true;

        const fetchEnvironment = async () => {
            if (!isMounted) return;
            setEnvLoading(true);
            const env = await getEnvironment();
            if (isMounted) {
                setEnvironment(env);
                setEnvLoading(false);
            }
        };

        // Fetch environment segera saat mount - WAIT untuk selesai
        fetchEnvironment();

        // Re-check environment setiap 5 detik untuk memastikan konsistensi
        const envInterval = setInterval(fetchEnvironment, 5000);

        return () => {
            isMounted = false;
            clearInterval(envInterval);
        };
    }, []);

    // Fetch supervisor data dan startTimes
    useEffect(() => {
        const fetchSupervisorData = async () => {
            if (envLoading) return;
            try {
                const response = await fetch(`${API_BASE_URL}/api/supervisor-data?environment=${environment}`, {
                    headers: getDefaultHeaders()
                });
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                        setSupervisorData({
                            supervisors: result.data.supervisors || {},
                            startTimes: result.data.startTimes || {}
                        });
                    }
                }
            } catch (error) {
                console.error('Error fetching supervisor data:', error);
            }
        };
        fetchSupervisorData();
        // Refresh setiap 30 detik
        const interval = setInterval(fetchSupervisorData, 30000);
        return () => clearInterval(interval);
    }, [environment, envLoading]);

    // Polling API /wira (sama seperti Dashboard RFID Line 1) — tanpa WebSocket
    const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (envLoading || productionLines.length === 0 || !supervisorData) return;

        const processWiraApiResult = (result: { success?: boolean; data?: any[] }) => {
            const dataMap: Record<string, LineData> = {};

            productionLines.forEach((line) => {
                const lineNumber = line.title.match(/\d+/)?.[0] || line.id.toString();
                dataMap[line.id.toString()] = {
                    line: lineNumber,
                    supervisor: supervisorData?.supervisors[lineNumber] || line.supervisor,
                    startTime: supervisorData?.startTimes[lineNumber] || '07:30',
                    good: 0,
                    rework: 0,
                    reject: 0,
                    wira: 0,
                };
            });

            if (result?.success && Array.isArray(result.data)) {
                result.data.forEach((item: any) => {
                    const itemLineNumber = String(item.line || item.Line || item.LINE || '').trim();
                    if (!itemLineNumber) return;

                    const matchingLine = productionLines.find((line) => {
                        const lineNumber = line.title.match(/\d+/)?.[0] || line.id.toString();
                        return lineNumber === itemLineNumber || String(line.id) === itemLineNumber;
                    });

                    if (matchingLine) {
                        dataMap[matchingLine.id.toString()] = {
                            line: itemLineNumber,
                            supervisor: supervisorData?.supervisors[itemLineNumber] || matchingLine.supervisor,
                            startTime: supervisorData?.startTimes[itemLineNumber] || '07:30',
                            good: Number(item['PQC Good'] ?? item?.pqc_good ?? item?.pqcGood ?? 0),
                            rework: Number(item['PQC Rework'] ?? item?.pqc_rework ?? item?.pqcRework ?? 0),
                            reject: Number(item['PQC Reject'] ?? item?.pqc_reject ?? item?.pqcReject ?? 0),
                            wira: Number(item['PQC WIRA'] ?? item?.pqc_wira ?? item?.pqcWira ?? 0),
                        };
                    }
                });
            }

            setLineData(prev => {
                const hasChanges = Object.keys(dataMap).some(key => {
                    const newData = dataMap[key];
                    const oldData = prev[key];
                    return !oldData ||
                        oldData.good !== newData.good ||
                        oldData.rework !== newData.rework ||
                        oldData.reject !== newData.reject ||
                        oldData.wira !== newData.wira ||
                        oldData.supervisor !== newData.supervisor ||
                        oldData.startTime !== newData.startTime;
                });
                if (!hasChanges && Object.keys(prev).length > 0) return prev;
                return { ...prev, ...dataMap };
            });
        };

        const fetchWira = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/wira`, {
                    method: 'GET',
                    headers: getDefaultHeaders(),
                });
                if (!response.ok) return;
                const data = await response.json();
                processWiraApiResult(data);
                setError(null);
            } catch (err) {
                console.error('Error fetching WIRA API:', err);
                setError(prev => (prev === null ? 'Gagal memuat data production line' : prev));
            }
        };

        fetchWira();
        pollingIntervalRef.current = setInterval(fetchWira, 1000);

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, [envLoading, productionLines, supervisorData, environment]);

    return (
        /* Container Utama: h-screen dan overflow-hidden MENCEGAH SCROLL HALAMAN */
        <div className="flex h-screen w-full fixed inset-0 m-0 p-0 overflow-hidden font-poppins"
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        >
            <Sidebar />

            <div
                className="flex flex-col h-full transition-all duration-300 ease-in-out relative"
                style={{ marginLeft: isOpen ? '18%' : '5rem', width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)' }}
            >
                {/* Header mengambil tinggi fix, sisanya untuk konten */}
                <div className="flex-none">
                    <Header />
                </div>

                {/* Main Area: Flex-1 agar mengisi sisa ruang vertical. Padding dikurangi agar muat. */}
                <main className="flex-1 w-full p-2 pt-20 min-h-0 flex flex-col">
                    {error && Object.keys(lineData).length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-red-600 font-medium">{error}</p>
                        </div>
                    ) : (
                        /* GRID LAYOUT: One Page Logic 
                           - Grid cols 5 untuk semua device (5x4 grid = 5 kolom x 4 baris).
                           - h-full agar grid memenuhi sisa layar.
                           - gap-2 (kecil) agar hemat tempat.
                           - Data update real-time tanpa loading screen
                        */
                        <div className="grid grid-cols-5 gap-2 h-full">
                            {productionLines.map((line) => {
                                const data = lineData[line.id.toString()] || {
                                    line: line.title.match(/\d+/)?.[0] || line.id.toString(),
                                    supervisor: line.supervisor,
                                    startTime: '07:30',
                                    good: 0, rework: 0, reject: 0, wira: 0,
                                };

                                let displayLineNumber = data.line;
                                if (line.title.includes('&')) {
                                    const match = line.title.match(/(\d+\s*&\s*\d+)/);
                                    if (match) displayLineNumber = match[1];
                                }

                                return (
                                    /* KARTU: Flex column agar isinya mengisi penuh tinggi kartu */
                                    <div
                                        key={line.id}
                                        className="bg-white rounded-lg border border-blue-200 shadow-sm flex flex-col overflow-hidden"
                                    >
                                        {/* Header Kartu: Compact dengan Supervisor dan Jam Masuk */}
                                        <div className="px-2 py-1.5 bg-gradient-to-r from-blue-50 to-white border-b border-blue-100 flex items-center justify-between flex-none">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <p className="text-xs font-bold text-blue-900 uppercase truncate">
                                                    LINE {displayLineNumber}
                                                </p>
                                                {/* Supervisor Name */}
                                                <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded truncate">
                                                    {data.supervisor || '-'}
                                                </span>
                                            </div>
                                            {/* Start Time dengan design profesional - di sebelah kanan */}
                                            {data.startTime && (() => {
                                                const { time, period } = formatTime12Hour(data.startTime);
                                                return (
                                                    <div className="flex items-center gap-1.5 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-300/60 rounded-md px-2 py-1 shadow-sm flex-shrink-0">
                                                        <Clock size={11} className="text-emerald-600 flex-shrink-0" strokeWidth={2.5} />
                                                        <div className="flex flex-col items-start leading-tight">
                                                            <span className="text-[10px] font-bold text-emerald-800 tracking-tight">
                                                                {time}
                                                            </span>
                                                            <span className="text-[8px] font-semibold text-emerald-600 uppercase tracking-wider">
                                                                {period}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Isi Kartu: Grid 2x2 yang mengisi sisa tinggi (flex-1) */}
                                        <div className="p-1 grid grid-cols-2 gap-1 flex-1 min-h-0">

                                            {/* GOOD */}
                                            <div className="bg-green-50/60 border border-green-100 rounded flex flex-col items-center justify-center">
                                                <div className="text-[9px] font-bold text-green-600 uppercase">GOOD</div>
                                                <div className="text-lg font-bold text-blue-600 leading-none mt-0.5">{data.good}</div>
                                            </div>

                                            {/* REWORK */}
                                            <div className="bg-yellow-50/60 border border-yellow-100 rounded flex flex-col items-center justify-center">
                                                <div className="text-[9px] font-bold text-yellow-600 uppercase">REWORK</div>
                                                <div className="text-lg font-bold text-blue-600 leading-none mt-0.5">{data.rework}</div>
                                            </div>

                                            {/* REJECT */}
                                            <div className="bg-red-50/60 border border-red-100 rounded flex flex-col items-center justify-center">
                                                <div className="text-[9px] font-bold text-red-600 uppercase">REJECT</div>
                                                <div className="text-lg font-bold text-blue-600 leading-none mt-0.5">{data.reject}</div>
                                            </div>

                                            {/* WIRA */}
                                            <div className="bg-orange-50/60 border border-orange-100 rounded flex flex-col items-center justify-center">
                                                <div className="text-[9px] font-bold text-orange-600 uppercase">WIRA</div>
                                                <div className="text-lg font-bold text-blue-600 leading-none mt-0.5">{data.wira}</div>
                                            </div>

                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>

            <style>{`
                .font-poppins {
                    font-family: 'Poppins', sans-serif;
                }
            `}</style>
        </div>
    );
}
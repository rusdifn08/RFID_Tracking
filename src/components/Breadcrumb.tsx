import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Settings, X, Target } from 'lucide-react';
import { useState, useEffect } from 'react';
import { API_BASE_URL, getDefaultHeaders, setBackendEnvironment } from '../config/api';
import { productionLinesCLN, productionLinesMJL, productionLinesMJL2 } from '../data/production_line';

// Fungsi untuk mendapatkan environment dari API atau berdasarkan port
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
        const response = await fetch(`${API_BASE_URL}/api/config/environment`, {
            headers: getDefaultHeaders()
        });
        if (response.ok) {
            const data = await response.json();
            const env = data.environment === 'MJL2' ? 'MJL2' : data.environment === 'MJL' ? 'MJL' : 'CLN';
            // Cache environment untuk digunakan oleh getDefaultHeaders()
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

interface BreadcrumbItem {
    label: string;
    path?: string;
    isActive?: boolean;
}

export default function Breadcrumb() {
    const location = useLocation();
    const navigate = useNavigate();
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [supervisorData, setSupervisorData] = useState<Record<string, string>>({});
    const [startTimesData, setStartTimesData] = useState<Record<string, string>>({});
    const [targetsData, setTargetsData] = useState<Record<string, number>>({});
    const [editingLine, setEditingLine] = useState<number | null>(null);
    const [editingSupervisor, setEditingSupervisor] = useState<string>('');
    const [editingStartTime, setEditingStartTime] = useState<string>('07:30');
    const [editingTarget, setEditingTarget] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const [environment, setEnvironment] = useState<'CLN' | 'MJL' | 'MJL2'>('CLN');

    // Fetch environment saat component mount
    useEffect(() => {
        getEnvironment().then(env => {
            setEnvironment(env);
        });
    }, []);

    // Mapping route ke breadcrumb
    const getBreadcrumbs = (): BreadcrumbItem[] => {
        const path = location.pathname;
        const breadcrumbs: BreadcrumbItem[] = [];

        // Selalu mulai dengan Home
        breadcrumbs.push({
            label: 'Home',
            path: '/home',
        });

        // Mapping untuk berbagai route
        if (path.startsWith('/rfid-tracking')) {
            breadcrumbs.push({
                label: 'RFID Tracking',
                isActive: true,
            });
        } else if (path.startsWith('/monitoring-rfid')) {
            breadcrumbs.push({
                label: 'RFID Tracking',
                path: '/rfid-tracking',
            });
            breadcrumbs.push({
                label: 'Production Lines',
                isActive: true,
            });
        } else if (path.startsWith('/line/')) {
            // Decode URL untuk menangani format "LINE%203" atau "LINE 3"
            const decodedPath = decodeURIComponent(path);
            // Cek format angka saja atau format "LINE X"
            const lineIdMatch = decodedPath.match(/\/line\/(\d+)/) || decodedPath.match(/\/line\/LINE[% ]*(\d+)/i);
            const lineId = lineIdMatch?.[1];
            const lineTitles: { [key: string]: string } = {
                '1': 'Production Line 1',
                '2': 'Production Line 2',
                '3': 'Production Line 3',
                '4': 'Production Line 4',
                '5': 'Production Line 5',
                '6': 'Production Line 6',
                '7': 'Pruduction Line 7',
                '8': 'Production Line 8',
                '9': 'Production Line 9',
            };
            breadcrumbs.push({
                label: 'RFID Tracking',
                path: '/rfid-tracking',
            });
            breadcrumbs.push({
                label: 'Production Lines',
                path: '/monitoring-rfid',
            });
            breadcrumbs.push({
                label: lineTitles[lineId || '1'] || `Line ${lineId}`,
                isActive: true,
            });
        } else if (path.startsWith('/dashboard-rfid/')) {
            // Decode URL untuk menangani format "LINE%203" atau "LINE 3"
            const decodedPath = decodeURIComponent(path);
            // Cek format angka saja atau format "LINE X"
            const lineIdMatch = decodedPath.match(/\/dashboard-rfid\/(\d+)/) || decodedPath.match(/\/dashboard-rfid\/LINE[% ]*(\d+)/i);
            const lineId = lineIdMatch?.[1];
            const lineTitles: { [key: string]: string } = {
                '1': 'Production Line 1',
                '2': 'Production Line 2',
                '3': 'Production Line 3',
                '4': 'Production Line 4',
                '5': 'Production Line 5',
                '6': 'Production Line 6',
                '7': 'Cutting Gm1',
                '8': 'Production Line 8',
                '9': 'Production Line 9',
            };
            breadcrumbs.push({
                label: 'RFID Tracking',
                path: '/rfid-tracking',
            });
            breadcrumbs.push({
                label: 'Production Lines',
                path: '/monitoring-rfid',
            });
            breadcrumbs.push({
                label: lineTitles[lineId || '1'] || `Line ${lineId}`,
                isActive: true,
            });
        } else if (path.startsWith('/checking-rfid')) {
            breadcrumbs.push({
                label: 'Checking RFID',
                isActive: true,
            });
        } else if (path.startsWith('/status-rfid')) {
            breadcrumbs.push({
                label: 'Status RFID',
                isActive: true,
            });
        } else if (path.startsWith('/daftar-rfid')) {
            breadcrumbs.push({
                label: 'Daftar RFID',
                isActive: true,
            });
        } else if (path.startsWith('/list-rfid')) {
            breadcrumbs.push({
                label: 'List RFID',
                isActive: true,
            });
        } else if (path.startsWith('/data-rfid')) {
            breadcrumbs.push({
                label: 'Data RFID',
                isActive: true,
            });
        } else if (path.startsWith('/dashboard')) {
            breadcrumbs.push({
                label: 'Dashboard',
                isActive: true,
            });
        } else if (path.startsWith('/about-us')) {
            breadcrumbs.push({
                label: 'About Us',
                isActive: true,
            });
        } else if (path.startsWith('/finishing')) {
            breadcrumbs.push({
                label: 'RFID Tracking',
                path: '/rfid-tracking',
            });
            breadcrumbs.push({
                label: 'Finishing',
                isActive: true,
            });
        } else if (path.startsWith('/dashboard-rfid-finishing')) {
            breadcrumbs.push({
                label: 'RFID Tracking',
                path: '/rfid-tracking',
            });
            breadcrumbs.push({
                label: 'Finishing',
                path: '/finishing',
            });
            breadcrumbs.push({
                label: 'Dashboard RFID Finishing',
                isActive: true,
            });
        }

        return breadcrumbs;
    };

    const breadcrumbs = getBreadcrumbs();
    
    // Cek apakah di halaman Production Lines (/monitoring-rfid)
    const isProductionLinesPage = location.pathname.startsWith('/monitoring-rfid');

    // Load supervisor data
    const loadSupervisorData = async () => {
        try {
            setIsLoading(true);
            // Pastikan environment sudah ter-load, jika belum tunggu sebentar
            let currentEnv = environment;
            if (!currentEnv || currentEnv === 'CLN') {
                // Coba fetch environment lagi jika belum ter-load
                currentEnv = await getEnvironment();
                setEnvironment(currentEnv);
            }
            
            // Pass environment sebagai query parameter
            const url = `${API_BASE_URL}/api/supervisor-data?environment=${currentEnv}`;
            
            const response = await fetch(url, {
                headers: getDefaultHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    setSupervisorData(data.data.supervisors || {});
                    setStartTimesData(data.data.startTimes || {});
                    const targets: Record<string, number> = {};
                    if (data.data.targets && typeof data.data.targets === 'object') {
                        Object.keys(data.data.targets).forEach(key => {
                            const v = data.data.targets[key];
                            targets[key] = typeof v === 'number' && v >= 0 ? v : 0;
                        });
                    }
                    setTargetsData(targets);
                }
            }
        } catch (error) {
            // Silent error handling
        } finally {
            setIsLoading(false);
        }
    };

    // Save supervisor, startTime, dan target
    const saveSupervisor = async (lineId: number, supervisor: string, startTime?: string, target?: number) => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/supervisor-data`, {
                method: 'POST',
                headers: {
                    ...getDefaultHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    lineId: lineId,
                    supervisor: supervisor,
                    startTime: startTime,
                    target: typeof target === 'number' && target >= 0 ? target : undefined,
                    environment: environment
                })
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setSupervisorData(prev => ({ ...prev, [lineId.toString()]: supervisor }));
                    if (startTime) {
                        setStartTimesData(prev => ({ ...prev, [lineId.toString()]: startTime }));
                    }
                    if (typeof target === 'number' && target >= 0) {
                        setTargetsData(prev => ({ ...prev, [lineId.toString()]: target }));
                    }
                    setEditingLine(null);
                    setEditingSupervisor('');
                    setEditingStartTime('07:30');
                    setEditingTarget(0);
                    // Reload data agar tampilan di modal ini juga fresh
                    await loadSupervisorData();
                    
                    // Dispatch custom event agar RFIDLineContent & device lain refetch (real-time)
                    window.dispatchEvent(new CustomEvent('supervisorUpdated', {
                        detail: { lineId, supervisor, environment }
                    }));
                    window.dispatchEvent(new CustomEvent('targetUpdated', {
                        detail: { lineId, target: typeof target === 'number' ? target : 0, environment }
                    }));
                }
            }
        } catch (error) {
            // Silent error handling
        } finally {
            setIsLoading(false);
        }
    };

    // Get production lines data berdasarkan environment (filter out "All Production Line")
    const getProductionLines = () => {
        let lines;
        if (environment === 'MJL2') {
            lines = productionLinesMJL2;
        } else if (environment === 'MJL') {
            lines = productionLinesMJL;
        } else {
            lines = productionLinesCLN;
        }
        // Filter out "All Production Line" (id 0 untuk CLN, id 111 untuk MJL, id 112 untuk MJL2)
        return lines.filter(line => line.id !== 0 && line.id !== 111 && line.id !== 112);
    };

    // Jangan tampilkan breadcrumb di Home dan Dashboard RFID
    if (location.pathname === '/home' || location.pathname === '/' || location.pathname.startsWith('/dashboard-rfid/')) {
        return null;
    }

    return (
        <div className="mx-2 xs:mx-3 sm:mx-4" style={{ marginTop: '4.5rem', marginBottom: '0.25rem' }}>
            <div
                className="bg-white rounded-lg xs:rounded-xl border border-gray-200 shadow-sm px-2 xs:px-3 sm:px-4 md:px-5 lg:px-6 py-0 flex items-center gap-2 xs:gap-2.5 sm:gap-3 sticky z-20 overflow-x-auto"
                style={{
                    left: 'inherit',
                    width: '100%',
                    top: '4.5rem',
                    minHeight: '2.5rem xs:3rem sm:3.5rem'
                }}
            >
                {breadcrumbs.map((item, index) => (
                    <div key={index} className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 h-full flex-shrink-0">
                        {index === 0 ? (
                            <button
                                onClick={() => item.path && navigate(item.path)}
                                className="group flex items-center gap-0.5 xs:gap-1 text-blue-600 hover:text-blue-700 transition-all duration-300"
                            >
                                <Home
                                    className="w-4 xs:w-5 sm:w-6 h-4 xs:h-5 sm:h-6 transition-all duration-300 group-hover:fill-blue-600 group-hover:scale-110"
                                    strokeWidth={2.5}
                                    fill="none"
                                />
                            </button>
                        ) : (
                            <>
                                {index < breadcrumbs.length - 1 && (
                                    <span className="text-gray-400 text-xs xs:text-sm sm:text-base font-medium">/</span>
                                )}
                                {item.isActive ? (
                                    <span
                                        className="relative px-2 xs:px-3 sm:px-4 md:px-5 py-0 bg-blue-600 text-white font-bold text-[10px] xs:text-xs sm:text-sm md:text-base flex items-center tracking-wide rounded-r-md"
                                        style={{
                                            clipPath: 'polygon(20px 0, 100% 0, 100% 100%, 0 100%, 0 100%)',
                                            marginTop: '0',
                                            marginBottom: '0',
                                            paddingTop: '0.5rem',
                                            paddingBottom: '0.5rem',
                                            height: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            fontFamily: 'Poppins, sans-serif',
                                            fontWeight: 700,
                                            textTransform: 'capitalize'
                                        }}
                                    >
                                        {item.label}
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => item.path && navigate(item.path)}
                                        className="text-gray-800 hover:text-blue-600 transition-colors text-[10px] xs:text-xs sm:text-sm md:text-base font-medium"
                                        style={{ textTransform: 'capitalize' }}
                                    >
                                        {item.label}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                ))}
                
                {/* Tombol Pengaturan di ujung breadcrumb untuk Production Lines */}
                {isProductionLinesPage && (
                    <>
                        <div className="flex-1"></div>
                        <button
                            onClick={async () => {
                                setIsSettingsModalOpen(true);
                                // Pastikan environment sudah ter-load sebelum load supervisor data
                                if (environment) {
                                    await loadSupervisorData();
                                } else {
                                    // Jika environment belum ter-load, tunggu sebentar
                                    const env = await getEnvironment();
                                    setEnvironment(env);
                                    await loadSupervisorData();
                                }
                            }}
                            className="group flex items-center justify-center px-2 xs:px-3 py-1.5 xs:py-2 rounded-md bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-all duration-300 border border-gray-200 hover:border-blue-300"
                            title="Pengaturan Supervisor"
                        >
                            <Settings
                                className="w-4 xs:w-5 sm:w-5 h-4 xs:h-5 sm:h-5 transition-all duration-300 group-hover:rotate-90"
                                strokeWidth={2}
                            />
                        </button>
                    </>
                )}
            </div>

            {/* Modal Pengaturan Supervisor */}
            {isSettingsModalOpen && (
                <div 
                    className="fixed inset-0 flex items-center justify-center z-50 p-4"
                    style={{
                        background: 'rgba(0, 0, 0, 0.3)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)'
                    }}
                    onClick={() => setIsSettingsModalOpen(false)}
                >
                    <div 
                        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-100"
                        style={{
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header dengan gradient */}
                        <div className="relative bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 px-6 py-5 border-b border-blue-400">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">Pengaturan Supervisor</h2>
                                    <p className="text-blue-100 text-sm">Kelola data supervisor, jam masuk, dan target untuk setiap production line. Perubahan tersimpan di server dan ter-update real-time di semua device.</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsSettingsModalOpen(false);
                                        setEditingLine(null);
                                        setEditingSupervisor('');
                                        setEditingStartTime('07:30');
                                        setEditingTarget(0);
                                    }}
                                    className="p-2 hover:bg-white/20 rounded-full transition-all duration-200 group"
                                >
                                    <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-200" />
                                </button>
                            </div>
                        </div>

                        {/* Content dengan scroll */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            {isLoading && Object.keys(supervisorData).length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
                                    <p className="mt-4 text-gray-600 font-medium">Memuat data supervisor...</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {getProductionLines().map((line) => {
                                        const lineIdStr = line.id.toString();
                                        const currentSupervisor = supervisorData[lineIdStr] || '-';
                                        const currentStartTime = startTimesData[lineIdStr] || '07:30';
                                        const currentTarget = typeof targetsData[lineIdStr] === 'number' ? targetsData[lineIdStr] : 0;
                                        const isEditing = editingLine === line.id;

                                        return (
                                            <div 
                                                key={line.id} 
                                                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden"
                                            >
                                                <div className="flex items-center gap-4 p-5">
                                                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                                        <span className="text-white font-bold text-lg">{line.id}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-gray-900 text-base mb-1">{line.title}</p>
                                                        {isEditing ? (
                                                            <div className="space-y-3 mt-3">
                                                                <div className="flex items-center gap-3">
                                                                    <label className="text-sm font-medium text-gray-700 min-w-[100px]">Supervisor:</label>
                                                                    <input
                                                                        type="text"
                                                                        value={editingSupervisor}
                                                                        onChange={(e) => setEditingSupervisor(e.target.value)}
                                                                        className="flex-1 px-4 py-2.5 border-2 border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                                        placeholder="Masukkan nama supervisor"
                                                                        autoFocus
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <label className="text-sm font-medium text-gray-700 min-w-[100px]">Jam Masuk:</label>
                                                                    <input
                                                                        type="time"
                                                                        value={editingStartTime}
                                                                        onChange={(e) => setEditingStartTime(e.target.value)}
                                                                        className="flex-1 px-4 py-2.5 border-2 border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                                        placeholder="07:30"
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <label className="text-sm font-medium text-gray-700 min-w-[100px] flex items-center gap-1"><Target size={14} className="text-blue-600" /> Target:</label>
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        value={editingTarget}
                                                                        onChange={(e) => {
                                                                            const v = parseInt(e.target.value, 10);
                                                                            setEditingTarget(Number.isNaN(v) || v < 0 ? 0 : v);
                                                                        }}
                                                                        className="flex-1 px-4 py-2.5 border-2 border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-24"
                                                                        placeholder="0"
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-3 pt-2">
                                                                    <button
                                                                        onClick={() => saveSupervisor(line.id, editingSupervisor, editingStartTime, editingTarget)}
                                                                        disabled={isLoading || !editingSupervisor.trim()}
                                                                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                                                                    >
                                                                        Simpan
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingLine(null);
                                                                            setEditingSupervisor('');
                                                                            setEditingStartTime('07:30');
                                                                            setEditingTarget(0);
                                                                        }}
                                                                        className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-all duration-200"
                                                                    >
                                                                        Batal
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-gray-500 text-sm">Supervisor:</span>
                                                                    <span className="font-semibold text-gray-900 text-sm bg-blue-50 px-3 py-1 rounded-md">
                                                                        {currentSupervisor === '-' ? 'Belum ditetapkan' : currentSupervisor}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-gray-500 text-sm">Jam Masuk:</span>
                                                                    <span className="font-semibold text-gray-900 text-sm bg-green-50 px-3 py-1 rounded-md">
                                                                        {currentStartTime}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-gray-500 text-sm flex items-center gap-1"><Target size={12} className="text-amber-600" /> Target:</span>
                                                                    <span className="font-semibold text-gray-900 text-sm bg-amber-50 px-3 py-1 rounded-md border border-amber-200">
                                                                        {currentTarget > 0 ? currentTarget : '-'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {!isEditing && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingLine(line.id);
                                                                const supervisorFromJson = supervisorData[lineIdStr];
                                                                const startTimeFromJson = startTimesData[lineIdStr];
                                                                const targetFromJson = targetsData[lineIdStr];
                                                                setEditingSupervisor(supervisorFromJson && supervisorFromJson !== '-' ? supervisorFromJson : '');
                                                                setEditingStartTime(startTimeFromJson || '07:30');
                                                                setEditingTarget(typeof targetFromJson === 'number' && targetFromJson >= 0 ? targetFromJson : 0);
                                                            }}
                                                            className="px-5 py-2.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100 hover:text-blue-700 transition-all duration-200 border border-blue-200 hover:border-blue-300"
                                                        >
                                                            Edit
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


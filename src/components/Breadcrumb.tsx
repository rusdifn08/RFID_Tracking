import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Settings, X, Target, Tag, User, Clock, Save, Trash2, AlertTriangle, Frown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { API_BASE_URL, getDefaultHeaders, getInitialEnvironment, getEnvironmentFromAPI, getSupervisorDataFromAPI, invalidateSupervisorDataCache, type BackendEnvironment } from '../config/api';
import { productionLinesCLN, productionLinesMJL, productionLinesMJL2, productionLinesGCC } from '../data/production_line';
import { resolveLineDisplayTitle } from '../utils/lineDisplayTitle';
import { filterVisibleProductionLines } from '../config/hide';

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
    const [displayTitlesData, setDisplayTitlesData] = useState<Record<string, string>>({});
    const [editingLine, setEditingLine] = useState<number | null>(null);
    const [editingSupervisor, setEditingSupervisor] = useState<string>('');
    const [editingStartTime, setEditingStartTime] = useState<string>('07:30');
    const [editingTarget, setEditingTarget] = useState<number>(0);
    const [editingDisplayTitle, setEditingDisplayTitle] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [environment, setEnvironment] = useState<BackendEnvironment>(getInitialEnvironment);

    // --- DELETE MODAL STATE ---
    const [deleteModalStep, setDeleteModalStep] = useState<0 | 1 | 2 | 3>(0);
    const [lineToDelete, setLineToDelete] = useState<{ id: number, title: string } | null>(null);

    // Fetch environment (1x shared request)
    useEffect(() => {
        getEnvironmentFromAPI().then(env => setEnvironment(env));
    }, []);

    // Muat displayTitles untuk breadcrumb & modal (real-time via supervisorUpdated)
    useEffect(() => {
        if (!environment) return;
        const loadDisplayTitles = async () => {
            try {
                const data = await getSupervisorDataFromAPI(environment);
                if (data?.displayTitles) {
                    setDisplayTitlesData(data.displayTitles);
                }
            } catch {
                // silent
            }
        };
        loadDisplayTitles();
        const onSupervisorUpdated = () => {
            invalidateSupervisorDataCache(environment);
            loadDisplayTitles();
        };
        window.addEventListener('supervisorUpdated', onSupervisorUpdated);
        return () => window.removeEventListener('supervisorUpdated', onSupervisorUpdated);
    }, [environment]);

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
        if (path === '/needle-manager' || path === '/needle-manager/') {
            breadcrumbs.push({
                label: 'Needle Manager',
                isActive: true,
            });
        } else if (path.startsWith('/needle-manager/monitoring')) {
            breadcrumbs.push({
                label: 'Needle Manager',
                path: '/needle-manager',
            });
            breadcrumbs.push({
                label: 'Monitoring needle',
                isActive: true,
            });
        } else if (path.startsWith('/needle-manager/mesin-kolam')) {
            breadcrumbs.push({
                label: 'Needle Manager',
                path: '/needle-manager',
            });
            breadcrumbs.push({
                label: 'Dashboard Mesin Kolam',
                isActive: true,
            });
        } else if (path.startsWith('/rfid-tracking')) {
            breadcrumbs.push({
                label: 'RFID Tracking',
                isActive: true,
            });
        } else if (path === '/batch-system' || path === '/batch-system/') {
            breadcrumbs.push({
                label: 'RFID Tracking',
                path: '/rfid-tracking',
            });
            breadcrumbs.push({
                label: 'Batch System',
                isActive: true,
            });
        } else if (path.startsWith('/batch-system/')) {
            const batchModuleTitles: Record<string, string> = {
                '/batch-system/daftar-layout': 'Daftar Layout',
                '/batch-system/dashboard': 'Dashboard',
                '/batch-system/preparation': 'Preparation',
                '/batch-system/assembly': 'Assembly',
                '/batch-system/hybrid': 'Hybrid',
            };
            breadcrumbs.push({
                label: 'RFID Tracking',
                path: '/rfid-tracking',
            });
            breadcrumbs.push({
                label: 'Batch System',
                path: '/batch-system',
            });
            breadcrumbs.push({
                label: batchModuleTitles[path] ?? 'Modul Batch System',
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
        } else if (path.startsWith('/cutting') && !path.startsWith('/dashboard-cutting')) {
            breadcrumbs.push({
                label: 'RFID Tracking',
                path: '/rfid-tracking',
            });
            breadcrumbs.push({
                label: 'Cutting Proses',
                isActive: true,
            });
        } else if (path.startsWith('/dashboard-supply-sewing-cutting')) {
            breadcrumbs.push({
                label: 'RFID Tracking',
                path: '/rfid-tracking',
            });
            breadcrumbs.push({
                label: 'Cutting Proses',
                path: '/cutting',
            });
            breadcrumbs.push({
                label: 'Dashboard Supply Sewing',
                isActive: true,
            });
        } else if (path.startsWith('/dashboard-cutting')) {
            breadcrumbs.push({
                label: 'RFID Tracking',
                path: '/rfid-tracking',
            });
            breadcrumbs.push({
                label: 'Dashboard Cutting Proses',
                isActive: true,
            });
        } else if (path.startsWith('/sewing/line/')) {
            const decodedPath = decodeURIComponent(path);
            const lineIdMatch = decodedPath.match(/\/sewing\/line\/(\d+)/) || decodedPath.match(/\/sewing\/line\/LINE[% ]*(\d+)/i);
            const lineId = lineIdMatch?.[1];
            const lineTitles: { [key: string]: string } = {
                '1': 'Sewing Line 1', '2': 'Sewing Line 2', '3': 'Sewing Line 3', '4': 'Sewing Line 4',
                '5': 'Sewing Line 5', '6': 'Sewing Line 6', '7': 'Sewing Line 7', '8': 'Sewing Line 8', '9': 'Sewing Line 9',
            };
            breadcrumbs.push({
                label: 'RFID Tracking',
                path: '/rfid-tracking',
            });
            breadcrumbs.push({
                label: 'Sewing Proses',
                path: '/sewing',
            });
            breadcrumbs.push({
                label: 'Sewing Lines',
                path: '/sewing',
            });
            const defaultSewingLabel = lineTitles[lineId || '1'] || `Sewing Line ${lineId}`;
            breadcrumbs.push({
                label: resolveLineDisplayTitle(Number(lineId || '1'), defaultSewingLabel, displayTitlesData),
                isActive: true,
            });
        } else if (path.startsWith('/sewing/all')) {
            breadcrumbs.push({
                label: 'RFID Tracking',
                path: '/rfid-tracking',
            });
            breadcrumbs.push({
                label: 'Sewing Proses',
                path: '/sewing',
            });
            breadcrumbs.push({
                label: 'Sewing Lines',
                path: '/sewing',
            });
            breadcrumbs.push({
                label: 'All Sewing Line',
                isActive: true,
            });
        } else if (path.startsWith('/sewing')) {
            breadcrumbs.push({
                label: 'RFID Tracking',
                path: '/rfid-tracking',
            });
            breadcrumbs.push({
                label: 'Sewing Proses',
                path: '/sewing',
            });
            breadcrumbs.push({
                label: 'Sewing Lines',
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
            const defaultLineLabel = lineTitles[lineId || '1'] || `Line ${lineId}`;
            breadcrumbs.push({
                label: resolveLineDisplayTitle(Number(lineId || '1'), defaultLineLabel, displayTitlesData),
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
            const defaultDashLabel = lineTitles[lineId || '1'] || `Line ${lineId}`;
            breadcrumbs.push({
                label: resolveLineDisplayTitle(Number(lineId || '1'), defaultDashLabel, displayTitlesData),
                isActive: true,
            });
        } else if (path.startsWith('/checking-rfid-cutting')) {
            breadcrumbs.push({
                label: 'RFID Tracking',
                path: '/rfid-tracking',
            });
            breadcrumbs.push({
                label: 'Cutting Proses',
                path: '/cutting',
            });
            breadcrumbs.push({
                label: 'Checking RFID Cutting',
                isActive: true,
            });
        } else if (path.startsWith('/checking-rfid')) {
            breadcrumbs.push({
                label: 'RFID Tracking',
                path: '/rfid-tracking',
            });
            breadcrumbs.push({
                label: 'Production Lines',
                path: '/monitoring-rfid',
            });
            breadcrumbs.push({
                label: 'Checking RFID',
                isActive: true,
            });
        } else if (path.startsWith('/status-rfid')) {
            breadcrumbs.push({
                label: 'Status RFID',
                isActive: true,
            });
        } else if (path.startsWith('/daftar-rfid-cutting')) {
            breadcrumbs.push({
                label: 'RFID Tracking',
                path: '/rfid-tracking',
            });
            breadcrumbs.push({
                label: 'Cutting Proses',
                path: '/cutting',
            });
            breadcrumbs.push({
                label: 'Daftar RFID Cutting',
                isActive: true,
            });
        } else if (path.startsWith('/sewing/rfid-identity')) {
            breadcrumbs.push({
                label: 'RFID Tracking',
                path: '/rfid-tracking',
            });
            breadcrumbs.push({
                label: 'Sewing Proses',
                path: '/sewing',
            });
            breadcrumbs.push({
                label: 'RFID Identity Model',
                isActive: true,
            });
        } else if (path.startsWith('/dashboard-sewing-line')) {
            const dashboardLineMatch = path.match(/\/dashboard-sewing-line\/(\d+)/);
            const dashboardLineId = dashboardLineMatch?.[1] ?? '1';
            breadcrumbs.push({
                label: 'RFID Tracking',
                path: '/rfid-tracking',
            });
            breadcrumbs.push({
                label: 'Sewing Proses',
                path: '/sewing',
            });
            breadcrumbs.push({
                label: 'Sewing Lines',
                path: '/sewing',
            });
            breadcrumbs.push({
                label: `Sewing Line ${dashboardLineId}`,
                path: `/sewing/line/${dashboardLineId}`,
            });
            breadcrumbs.push({
                label: 'RFID Sewing Batch Dashboard',
                isActive: true,
            });
        } else if (path.startsWith('/sewing/report/')) {
            breadcrumbs.push({
                label: 'RFID Tracking',
                path: '/rfid-tracking',
            });
            breadcrumbs.push({
                label: 'Sewing Proses',
                path: '/sewing',
            });
            breadcrumbs.push({
                label: 'Report Data RFID',
                isActive: true,
            });
        } else if (path.startsWith('/sewing/layout/')) {
            const layoutLineMatch = path.match(/\/sewing\/layout\/(\d+)/);
            const layoutLineId = layoutLineMatch?.[1] ?? '1';
            breadcrumbs.push({
                label: 'RFID Tracking',
                path: '/rfid-tracking',
            });
            breadcrumbs.push({
                label: 'Sewing Proses',
                path: '/sewing',
            });
            breadcrumbs.push({
                label: 'Sewing Lines',
                path: '/sewing',
            });
            breadcrumbs.push({
                label: `Sewing Line ${layoutLineId}`,
                path: `/sewing/line/${layoutLineId}`,
            });
            breadcrumbs.push({
                label: 'Daftar Layout',
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
        } else if (path.startsWith('/reject-room')) {
            breadcrumbs.push({
                label: 'RFID Tracking',
                path: '/rfid-tracking',
            });
            breadcrumbs.push({
                label: 'Reject Room',
                isActive: true,
            });
        } else if (path.startsWith('/dashboard-rfid-reject')) {
            breadcrumbs.push({
                label: 'RFID Tracking',
                path: '/rfid-tracking',
            });
            breadcrumbs.push({
                label: 'Reject Room',
                path: '/reject-room',
            });
            breadcrumbs.push({
                label: 'Dashboard RFID Reject',
                isActive: true,
            });
        } else if (path.startsWith('/list-rfid-reject')) {
            breadcrumbs.push({
                label: 'RFID Tracking',
                path: '/rfid-tracking',
            });
            breadcrumbs.push({
                label: 'Reject Room',
                path: '/reject-room',
            });
            breadcrumbs.push({
                label: 'List RFID Reject',
                isActive: true,
            });
        }

        return breadcrumbs;
    };

    const breadcrumbs = getBreadcrumbs();
    
    // Cek apakah di halaman Production Lines (/monitoring-rfid)
    const isProductionLinesPage = location.pathname.startsWith('/monitoring-rfid');

    // Load supervisor data (pakai cache shared, 1x request per env)
    const loadSupervisorData = async () => {
        try {
            setIsLoading(true);
            const currentEnv = environment || await getEnvironmentFromAPI();
            if (currentEnv !== environment) setEnvironment(currentEnv);
            const data = await getSupervisorDataFromAPI(currentEnv);
            if (data) {
                setSupervisorData(data.supervisors || {});
                setStartTimesData(data.startTimes || {});
                setTargetsData(data.targets || {});
                setDisplayTitlesData(data.displayTitles || {});
            }
        } catch {
            // silent
        } finally {
            setIsLoading(false);
        }
    };

    // Save supervisor, startTime, dan target
    const saveSupervisor = async (
        lineId: number,
        supervisor: string,
        startTime?: string,
        target?: number,
        displayTitle?: string
    ) => {
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
                    displayTitle: displayTitle !== undefined ? displayTitle.trim() : undefined,
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
                    setEditingDisplayTitle('');
                    invalidateSupervisorDataCache(environment);
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

    const handleDeleteConfirmed = () => {
        if (!lineToDelete || !environment) return;
        const currentEnv = environment;
        const targetId = lineToDelete.id;

        // Stage 3: Bye Bye Animation
        setDeleteModalStep(3);
        
        setTimeout(() => {
            // Lakukan penghapusan secara logika
            let customLines: any[] = [];
            try { customLines = JSON.parse(localStorage.getItem(`rfid_custom_lines_${currentEnv}`) || '[]'); } catch {}
            
            const isCustom = customLines.some(l => l.id === targetId);
            if (isCustom) {
                const updated = customLines.filter(l => l.id !== targetId);
                localStorage.setItem(`rfid_custom_lines_${currentEnv}`, JSON.stringify(updated));
            } else {
                const hidden = JSON.parse(localStorage.getItem(`rfid_hidden_lines_${currentEnv}`) || '[]');
                if (!hidden.includes(targetId)) {
                    hidden.push(targetId);
                    localStorage.setItem(`rfid_hidden_lines_${currentEnv}`, JSON.stringify(hidden));
                }
            }
            
            // Tutup modal delete dan refresh data
            setDeleteModalStep(0);
            setLineToDelete(null);
            
            // Dispatch event to RFIDLineContent so it refreshes its UI
            window.dispatchEvent(new Event('lineDeleted'));
            
        }, 2500); // Tahan animasi bye bye selama 2.5 detik
    };

    // Get production lines data berdasarkan environment (filter out "All Production Line") dan urutkan sesuai konfigurasi puzzle
    const getProductionLines = () => {
        let lines;
        const currentEnv = environment || 'MJL'; // Fallback aman
        if (currentEnv === 'MJL2') {
            lines = productionLinesMJL2;
        } else if (currentEnv === 'MJL') {
            lines = productionLinesMJL;
        } else if (currentEnv === 'GCC') {
            lines = productionLinesGCC;
        } else {
            lines = productionLinesCLN;
        }
        let customLines: any[] = [];
        const savedCustom = localStorage.getItem(`rfid_custom_lines_${currentEnv}`);
        if (savedCustom) {
            try { customLines = JSON.parse(savedCustom); } catch { /* ignore */ }
        }

        const allLines = [...lines, ...customLines];
        
        // Filter out "All Production Line" + line tersembunyi (hide.ts)
        const visibleLines = filterVisibleProductionLines(
            allLines.filter(line => line.id !== 0 && line.id !== 111 && line.id !== 112 && line.id !== 113),
            currentEnv
        );

        // Baca urutan dari localStorage layaknya fitur drag-and-drop di dashboard
        const savedOrderStr = localStorage.getItem(`rfid_line_order_${currentEnv}`);
        if (savedOrderStr) {
            try {
                const cardOrder = JSON.parse(savedOrderStr);
                if (Array.isArray(cardOrder) && cardOrder.length > 0) {
                    const orderMap = new Map(cardOrder.map((id, idx) => [id, idx]));
                    return visibleLines.sort((a, b) => {
                        const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999;
                        const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999;
                        return indexA - indexB;
                    });
                }
            } catch {
                // Abaikan jika gagal parsing JSON
            }
        }

        return visibleLines;
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
                                const env = environment || await getEnvironmentFromAPI();
                                if (env !== environment) setEnvironment(env);
                                await loadSupervisorData();
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
                                    <p className="text-blue-100 text-sm">Kelola nama tampilan line, supervisor, jam masuk, dan target. Nama tampilan tidak mengubah query data (line ID tetap).</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsSettingsModalOpen(false);
                                        setEditingLine(null);
                                        setEditingSupervisor('');
                                        setEditingStartTime('07:30');
                                        setEditingTarget(0);
                                        setEditingDisplayTitle('');
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
                                        const currentDisplayTitle = displayTitlesData[lineIdStr] || '';
                                        const shownTitle = resolveLineDisplayTitle(line.id, line.title, displayTitlesData);
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
                                                        <p className="font-semibold text-gray-900 text-base mb-0.5">{shownTitle}</p>
                                                        <p className="text-xs text-gray-500 mb-1">Query data: Line {line.id} · Default: {line.title}</p>
                                                        {isEditing ? (() => {
                                                            const titlePrefix = line.title.replace(/[\d]+$/, '').trim(); 
                                                            const currentNumberOnly = editingDisplayTitle ? editingDisplayTitle.replace(titlePrefix, '').trim() : '';

                                                            return (
                                                                <div className="mt-5 p-5 bg-gradient-to-br from-blue-50/60 to-indigo-50/60 rounded-xl border border-blue-100 shadow-[inset_0_2px_15px_rgba(59,130,246,0.06)] relative overflow-hidden transition-all duration-300">
                                                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 to-indigo-600"></div>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 ml-2">
                                                                        
                                                                        {/* Nama Tampilan */}
                                                                        <div className="space-y-1.5">
                                                                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                                                                <Tag size={14} className="text-blue-500" /> Nama Tampilan
                                                                            </label>
                                                                            <div className="flex shadow-sm rounded-lg overflow-hidden border border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all bg-white group">
                                                                                <span className="px-3.5 py-2.5 bg-gray-50 border-r border-gray-200 text-gray-500 text-sm font-semibold whitespace-nowrap select-none">
                                                                                    {titlePrefix}
                                                                                </span>
                                                                                <input
                                                                                    type="text"
                                                                                    value={currentNumberOnly}
                                                                                    onChange={(e) => setEditingDisplayTitle(`${titlePrefix} ${e.target.value}`)}
                                                                                    className="flex-1 w-full px-3 py-2.5 text-sm font-bold text-gray-900 focus:outline-none bg-transparent placeholder-gray-300"
                                                                                    placeholder="Contoh: 1A"
                                                                                    autoFocus
                                                                                />
                                                                            </div>
                                                                        </div>

                                                                        {/* Supervisor */}
                                                                        <div className="space-y-1.5">
                                                                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                                                                <User size={14} className="text-indigo-500" /> Supervisor
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={editingSupervisor}
                                                                                onChange={(e) => setEditingSupervisor(e.target.value)}
                                                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all shadow-sm placeholder-gray-300"
                                                                                placeholder="NAMA SUPERVISOR"
                                                                            />
                                                                        </div>

                                                                        {/* Jam Masuk */}
                                                                        <div className="space-y-1.5">
                                                                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                                                                <Clock size={14} className="text-emerald-500" /> Jam Masuk
                                                                            </label>
                                                                            <input
                                                                                type="time"
                                                                                value={editingStartTime}
                                                                                onChange={(e) => setEditingStartTime(e.target.value)}
                                                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 transition-all shadow-sm"
                                                                            />
                                                                        </div>

                                                                        {/* Target */}
                                                                        <div className="space-y-1.5">
                                                                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                                                                <Target size={14} className="text-amber-500" /> Target / Jam
                                                                            </label>
                                                                            <div className="relative">
                                                                                <input
                                                                                    type="number"
                                                                                    min={0}
                                                                                    value={editingTarget || ''}
                                                                                    onChange={(e) => {
                                                                                        const v = parseInt(e.target.value, 10);
                                                                                        setEditingTarget(Number.isNaN(v) || v < 0 ? 0 : v);
                                                                                    }}
                                                                                    className="w-full pl-4 pr-12 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-500 transition-all shadow-sm placeholder-gray-300"
                                                                                    placeholder="0"
                                                                                />
                                                                                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none bg-white pl-1">PCS</span>
                                                                            </div>
                                                                        </div>

                                                                    </div>
                                                                    
                                                                    <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-blue-200/50 ml-2">
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingLine(null);
                                                                                setEditingSupervisor('');
                                                                                setEditingStartTime('07:30');
                                                                                setEditingTarget(0);
                                                                                setEditingDisplayTitle('');
                                                                            }}
                                                                            className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 transition-all shadow-sm"
                                                                        >
                                                                            Batalkan
                                                                        </button>
                                                                        <button
                                                                            onClick={() => saveSupervisor(line.id, editingSupervisor, editingStartTime, editingTarget, editingDisplayTitle)}
                                                                            disabled={isLoading || !editingSupervisor.trim()}
                                                                            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-500/20 active:scale-[0.98]"
                                                                        >
                                                                            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={16} />} 
                                                                            Simpan Perubahan
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })() : (
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
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingLine(line.id);
                                                                    const supervisorFromJson = supervisorData[lineIdStr];
                                                                    const startTimeFromJson = startTimesData[lineIdStr];
                                                                    const targetFromJson = targetsData[lineIdStr];
                                                                    setEditingSupervisor(supervisorFromJson && supervisorFromJson !== '-' ? supervisorFromJson : '');
                                                                    setEditingStartTime(startTimeFromJson || '07:30');
                                                                    setEditingTarget(typeof targetFromJson === 'number' && targetFromJson >= 0 ? targetFromJson : 0);
                                                                    setEditingDisplayTitle(currentDisplayTitle);
                                                                }}
                                                                className="px-5 py-2.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100 hover:text-blue-700 transition-all duration-200 border border-blue-200 hover:border-blue-300"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setLineToDelete({ id: line.id, title: shownTitle });
                                                                    setDeleteModalStep(1);
                                                                }}
                                                                className="p-2.5 text-red-500 bg-red-50 hover:bg-red-100 hover:text-red-600 rounded-lg transition-all border border-red-100 hover:border-red-300 shadow-sm"
                                                                title="Hapus / Sembunyikan Line"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
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

            {/* --- MULTI-STEP DELETE MODAL --- */}
            {deleteModalStep > 0 && lineToDelete && (
                <div className="fixed inset-0 flex items-center justify-center z-[200] p-4" style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full flex flex-col border border-gray-100 animate-in zoom-in duration-200 overflow-hidden relative">
                        
                        {deleteModalStep === 1 && (
                            <div className="p-6 text-center">
                                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                    <AlertTriangle size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Yakin Dihapus?</h3>
                                <p className="text-gray-600 text-sm font-medium leading-relaxed mb-6">
                                    Apakah Anda Yakin <strong>{lineToDelete.title}</strong> akan di hapus? <br/>
                                    <span className="text-red-500">Nanti Penghasilan Gistex Berkurang Loh 🥺</span>
                                </p>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => { setDeleteModalStep(0); setLineToDelete(null); }}
                                        className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Gak Jadi
                                    </button>
                                    <button 
                                        onClick={() => setDeleteModalStep(2)}
                                        className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors shadow-md shadow-red-500/30"
                                    >
                                        Yakin
                                    </button>
                                </div>
                            </div>
                        )}

                        {deleteModalStep === 2 && (
                            <div className="p-6 text-center animate-in slide-in-from-right duration-300">
                                <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 scale-110 transition-transform">
                                    <Frown size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Beneran Nih?</h3>
                                <p className="text-gray-600 text-sm font-medium leading-relaxed mb-6">
                                    Yauda deh kalau yakin click Delete saja 😔
                                </p>
                                <div className="flex gap-3 flex-col sm:flex-row">
                                    <button 
                                        onClick={() => { setDeleteModalStep(0); setLineToDelete(null); }}
                                        className="w-full sm:flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        onClick={handleDeleteConfirmed}
                                        className="w-full sm:flex-1 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold rounded-lg hover:from-red-700 hover:to-rose-700 transition-all shadow-lg shadow-red-500/40 active:scale-95"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        )}

                        {deleteModalStep === 3 && (
                            <div className="p-10 text-center animate-in fade-in zoom-in duration-500">
                                <div className="text-6xl mb-4 animate-bounce">😭</div>
                                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-purple-600 mb-2">
                                    Bye Bye
                                </h3>
                                <p className="text-gray-500 font-bold text-lg">{lineToDelete.title}</p>
                            </div>
                        )}
                        
                    </div>
                </div>
            )}
        </div>
    );
}


import { memo, useMemo, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import { Home, LogOut, Activity, Scissors, Cpu, CheckCircle, List, MapPin, Target, LayoutDashboard, Briefcase, Server, PackageOpen, Shirt, Zap, ScanLine, Settings, Radio } from 'lucide-react';
import headerIcon from '../assets/header.svg';
import rfidIcon from '../assets/rfid.webp';
import needleIcon from '../assets/needle.webp';
import batchIcon from '../assets/batch.webp';
import machineIcon from '../assets/machine.webp';
import shipmentIcon from '../assets/shipment.webp';
import prendiIcon from '../assets/report_detail.webp';
import { logoutUser } from '../config/api';
import { preloadLineDetail } from '../utils/preload';
import { isMachineProductivityCardHidden } from '../config/hide';
import { useAuth } from '../hooks/useAuth';
import { canAccessMachineProductivity } from '../utils/machineProductivityAccess';

const Sidebar = memo(() => {
    const location = useLocation();
    const navigate = useNavigate();
    const { isOpen, closeSidebar } = useSidebar();
    const { user } = useAuth();

    // Data production lines - dipindahkan ke useMemo untuk optimasi
    const productionLines = useMemo(() => [
        { id: 1, title: 'SEWING LINE 1' },
        { id: 2, title: 'SEWING LINE 2' },
        { id: 3, title: 'SEWING LINE 3' },
        { id: 4, title: 'SEWING LINE 4' },
        { id: 5, title: 'SEWING LINE 5' },
        { id: 6, title: 'SEWING LINE 6' },
        { id: 7, title: 'CUTTING GM1' },
        { id: 8, title: 'SEWING LINE 8' },
        { id: 9, title: 'SEWING LINE 9' },
    ], []);

    // Deteksi line ID dari route - dioptimasi dengan useMemo
    const currentLineId = useMemo(() => {
        // Decode URL untuk menangani format "LINE%203" atau "LINE 3"
        const decodedPath = decodeURIComponent(location.pathname);
        
        // Cek format /line/:id (angka saja)
        const lineMatch = decodedPath.match(/\/line\/(\d+)/);
        if (lineMatch) return lineMatch[1];

        // Cek format /dashboard-rfid/:id (angka saja)
        const dashboardMatch = decodedPath.match(/\/dashboard-rfid\/(\d+)/);
        if (dashboardMatch) return dashboardMatch[1];

        // Cek format /dashboard-rfid/LINE X atau /dashboard-rfid/LINE%20X (format lama)
        const dashboardLineMatch = decodedPath.match(/\/dashboard-rfid\/LINE[% ]*(\d+)/i);
        if (dashboardLineMatch) return dashboardLineMatch[1];

        // Cek format /list-rfid/:id (angka saja)
        const listRfidMatch = decodedPath.match(/\/list-rfid\/(\d+)/);
        if (listRfidMatch) return listRfidMatch[1];

        // Default ke line 1 untuk daftar-rfid, data-rfid, dan list-rfid (bukan /daftar-rfid-cutting)
        const isDaftarRfidRegistrasi =
            decodedPath.startsWith('/daftar-rfid') && !decodedPath.startsWith('/daftar-rfid-cutting');
        if (isDaftarRfidRegistrasi || decodedPath.startsWith('/data-rfid') || decodedPath.startsWith('/list-rfid')) {
            return '1';
        }

        return null;
    }, [location.pathname]);

    // Deteksi halaman aktif - dioptimasi dengan useMemo
    // Deteksi halaman aktif - dioptimasi dengan useMemo
    const isRFIDPage = useMemo(() => {
        const p = location.pathname;
        return p.startsWith('/rfid-tracking') ||
               p.startsWith('/monitoring-rfid') ||
               p.startsWith('/line/') ||
               p.startsWith('/dashboard-rfid/') ||
               p.startsWith('/daftar-rfid') ||
               p.startsWith('/data-rfid') ||
               p.startsWith('/list-rfid') ||
               p.startsWith('/cutting') ||
               p.startsWith('/dashboard-cutting') ||
               p.startsWith('/dashboard-supply-sewing-cutting') ||
               p.startsWith('/dashboard-bundle-cutting') ||
               p.startsWith('/finishing') ||
               p.startsWith('/dashboard-rfid-finishing') ||
               p.startsWith('/dashboard-detail-finishing') ||
               p.startsWith('/reject-room') ||
               p.startsWith('/dashboard-rfid-reject') ||
               p.startsWith('/list-rfid-reject') ||
               p.startsWith('/dashboard-dryroom') ||
               p.startsWith('/dashboard-folding') ||
               p.startsWith('/batch-system') ||
               p.startsWith('/all-production-line-dashboard') ||
               p.startsWith('/production-tracking-time') ||
               p.startsWith('/form-data');
    }, [location.pathname]);

    const isLinePage = useMemo(() => currentLineId !== null, [currentLineId]);
    const isRFIDTrackingPage = useMemo(() => location.pathname === '/rfid-tracking', [location.pathname]);
    const isProductionLinesPage = useMemo(() => location.pathname === '/monitoring-rfid', [location.pathname]);

    const isSewingPage = useMemo(() => {
        const p = location.pathname;
        return p.startsWith('/sewing') ||
               p.startsWith('/dashboard-sewing-line');
    }, [location.pathname]);

    const sidebarSubNav = useMemo(() => {
        const p = location.pathname;
        const items = [];
        if (!isRFIDPage || p === '/rfid-tracking') return items;

        if (p.startsWith('/cutting') || p.startsWith('/dashboard-cutting') || p.startsWith('/dashboard-supply-sewing-cutting') || p.startsWith('/dashboard-bundle-cutting')) {
            items.push({ label: 'Cutting Proses', to: '/cutting', icon: <Scissors size={15} /> });
        } else if (p.startsWith('/finishing') || p.startsWith('/dashboard-rfid-finishing') || p.startsWith('/dashboard-detail-finishing')) {
            items.push({ label: 'Finishing Proses', to: '/finishing', icon: <CheckCircle size={15} /> });
        } else if (p.startsWith('/reject-room') || p.startsWith('/dashboard-rfid-reject') || p.startsWith('/list-rfid-reject')) {
            items.push({ label: 'Reject Proses', to: '/reject-room', icon: <Target size={15} /> });
        } else if (p.startsWith('/batch-system')) {
            items.push({ label: 'Batch System', to: '/batch-system', icon: <Server size={15} /> });
        } else if (p.startsWith('/form-data')) {
            items.push({ label: 'Form Report', to: '/form-data', icon: <Briefcase size={15} /> });
        } else if (p.startsWith('/production-tracking-time')) {
            items.push({ label: 'Tracking Time', to: '/production-tracking-time', icon: <Activity size={15} /> });
        } else if (p.startsWith('/monitoring-rfid') || p.startsWith('/line/') || p.startsWith('/dashboard-rfid/') || p.startsWith('/daftar-rfid') || p.startsWith('/data-rfid') || p.startsWith('/list-rfid')) {
            items.push({ label: 'Production Lines', to: '/monitoring-rfid', icon: <LayoutDashboard size={15} /> });
            if (currentLineId) {
                items.push({ label: `Line ${currentLineId}`, to: `/line/${currentLineId}`, icon: <MapPin size={15} /> });
                if (p.startsWith('/dashboard-rfid/')) {
                    items.push({ label: 'Dashboard RFID', to: p, icon: <LayoutDashboard size={14} /> });
                } else if (p.startsWith('/daftar-rfid')) {
                    items.push({ label: 'Daftar RFID', to: p, icon: <PackageOpen size={14} /> });
                } else if (p.startsWith('/list-rfid')) {
                    items.push({ label: 'List RFID', to: p, icon: <List size={14} /> });
                }
            }
        }
        
        return items;
    }, [location.pathname, isRFIDPage, currentLineId]);

    const sewingSubNav = useMemo(() => {
        const p = location.pathname;
        const items = [];
        if (!isSewingPage) return items;
        if (p.startsWith('/sewing') || p.startsWith('/dashboard-sewing-line')) {
            if (p.match(/\/dashboard-sewing-line\/(\d+)/)) {
                const m = p.match(/\/dashboard-sewing-line\/(\d+)/);
                if (m) {
                    items.push({ label: `Sewing Line ${m[1]}`, to: `/sewing/line/${m[1]}`, icon: <MapPin size={15} /> });
                    items.push({ label: `Dashboard`, to: p, icon: <LayoutDashboard size={14} /> });
                }
            } else if (p.match(/\/sewing\/line\/(\d+)/)) {
                const m = p.match(/\/sewing\/line\/(\d+)/);
                if (m) items.push({ label: `Sewing Line ${m[1]}`, to: p, icon: <MapPin size={15} /> });
            } else if (p.startsWith('/sewing/all')) {
                items.push({ label: 'All Sewing Line', to: '/sewing/all', icon: <List size={15} /> });
            }
        }
        return items;
    }, [location.pathname, isSewingPage]);

    const showNeedleManager = useMemo(() => location.pathname.startsWith('/needle-manager'), [location.pathname]);

    const needleSubNav = useMemo(() => {
        const p = location.pathname;
        const items = [];
        if (!showNeedleManager) return items;

        if (p === '/needle-manager/monitoring') {
            items.push({ label: 'Monitoring Needle', to: '/needle-manager/monitoring', icon: <Activity size={15} /> });
        } else if (p === '/needle-manager/mesin-kolam') {
            items.push({ label: 'Dashboard Mesin Kolam', to: '/needle-manager/mesin-kolam', icon: <LayoutDashboard size={15} /> });
        }
        return items;
    }, [location.pathname, showNeedleManager]);

    const showShipment = useMemo(() => location.pathname.startsWith('/monitoring-shipment'), [location.pathname]);
    
    const shipmentSubNav = useMemo(() => {
        const p = location.pathname;
        const items = [];
        if (!showShipment) return items;

        if (p.startsWith('/monitoring-shipment/gm1')) {
            items.push({ label: 'Monitoring Shipment GM 1', to: '/monitoring-shipment/gm1', icon: <Activity size={15} /> });
        } else if (p.startsWith('/monitoring-shipment/gm2')) {
            items.push({ label: 'Monitoring Shipment GM 2', to: '/monitoring-shipment/gm2', icon: <Activity size={15} /> });
        }
        return items;
    }, [location.pathname, showShipment]);

    const showMachine = useMemo(() => location.pathname.startsWith('/monitoring-machine'), [location.pathname]);
    
    const machineSubNav = useMemo(() => {
        if (!showMachine) return [];
        return [
            { label: 'Machine Template', to: '/monitoring-machine/template', icon: <Cpu size={14} /> },
            { label: 'Machine AutoCutter', to: '/monitoring-machine/bullmer', icon: <Scissors size={14} /> },
            { label: 'Machine Template JUKI', to: '/monitoring-machine/juki', icon: <Server size={14} /> },
        ];
    }, [showMachine]);

    const showMachineProductivity = useMemo(
        () => canAccessMachineProductivity(user) && location.pathname.startsWith('/machine-productivity'),
        [user, location.pathname]
    );

    const machineProductivitySubNav = useMemo(() => {
        if (!showMachineProductivity) return [];
        const items = [];
        if (!isMachineProductivityCardHidden('zigbee')) {
            items.push({ label: 'Monitor Zigbee Nodes', to: '/machine-productivity/zigbee', icon: <Radio size={14} /> });
        }
        if (!isMachineProductivityCardHidden('control')) {
            items.push({ label: 'Control Machine', to: '/machine-productivity/control', icon: <Settings size={14} /> });
        }
        if (!isMachineProductivityCardHidden('login')) {
            items.push({ label: 'Login Mesin', to: '/machine-productivity/login', icon: <ScanLine size={14} /> });
        }
        if (!isMachineProductivityCardHidden('detail')) {
            items.push({ label: 'Detail Data', to: '/machine-productivity/detail', icon: <List size={14} /> });
        }
        if (!isMachineProductivityCardHidden('resume')) {
            items.push({ label: 'Resume Mesin', to: '/machine-productivity/resume', icon: <Server size={14} /> });
        }
        if (!isMachineProductivityCardHidden('compare')) {
            items.push({ label: 'Compare Data', to: '/machine-productivity/compare', icon: <Activity size={14} /> });
        }
        if (!isMachineProductivityCardHidden('pzem')) {
            items.push({ label: 'PZEM-004T Data', to: '/machine-productivity/pzem', icon: <Zap size={14} /> });
        }
        if (!isMachineProductivityCardHidden('adxl')) {
            items.push({ label: 'ADXL345 Data', to: '/machine-productivity/adxl', icon: <Activity size={14} /> });
        }
        return items;
    }, [showMachineProductivity]);

    const showVibePrendi = useMemo(() => location.pathname.startsWith('/vibe-prendi'), [location.pathname]);

    // Dapatkan data line berdasarkan ID - dioptimasi dengan useMemo
    const currentLineData = useMemo(() => 
        currentLineId ? productionLines.find(line => line.id === Number(currentLineId)) : null,
        [currentLineId, productionLines]
    );

    const handleLogout = useCallback(async () => {
        try {
            // Ambil data user dari localStorage untuk mendapatkan NIK
            const userDataStr = localStorage.getItem('user');
            if (userDataStr) {
                try {
                    const userData = JSON.parse(userDataStr);
                    const nik = userData?.nik;
                    let line = userData?.line;
                    
                    // Jika line tidak ada, coba extract dari nama (contoh: "TABLE 5" -> 5, "MEJA 4" -> 4)
                    if (!line && userData?.name) {
                        const match = userData.name.match(/\d+/);
                        if (match) {
                            line = match[0];
                        }
                    }
                    
                    // Panggil API logout untuk menghapus dari active sessions
                    if (nik || line) {
                        await logoutUser(nik, line);
                    }
                } catch (e) {
                    // Ignore error parsing user data
                }
            }
        } catch (error) {
            // Ignore error, tetap lanjutkan logout
            console.warn('Error calling logout API:', error);
        }

        // Clear semua data login (termasuk session valid until)
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('sessionValidUntil');
        navigate('/login', { replace: true });
    }, [navigate]);

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`bg-gradient-to-b from-[#0073EE] to-[#0073EE] h-screen fixed left-0 top-0 flex flex-col shadow-2xl z-50 transition-all duration-300 ease-in-out backdrop-blur-sm ${
                    isOpen ? 'w-[18%] max-lg:w-52 max-lg:min-w-0' : 'w-20 px-2 max-lg:w-14 max-lg:px-1'
                }`}
            >
                {/* --- LOGO AREA - DI PALING ATAS --- */}
                <div className={`flex flex-col items-center justify-center pt-4 pb-3 relative flex-shrink-0 ${isOpen ? 'px-2' : 'px-0'}`}>
                    {/* Decorative gradient overlay dengan animasi */}
                    <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/10 via-yellow-400/5 to-transparent pointer-events-none animate-pulse"></div>

                    {/* Animated background glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-transparent to-blue-400/5 pointer-events-none"></div>

                    {/* Logo SVG - Header icon dari header */}
                    <div className="relative mb-2 group">
                        {/* Glow effect saat hover */}
                        <div className="absolute inset-0 bg-yellow-400/30 rounded-2xl blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-0 group-hover:opacity-100 -z-10"></div>
                        <div className="relative transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-2 group-hover:drop-shadow-2xl">
                            <img
                                src={headerIcon}
                                alt="GISTEX Logo"
                                className={`${isOpen ? 'w-24 h-18' : 'w-10 h-10'} object-contain drop-shadow-2xl filter brightness-110 transition-all duration-300`}
                            />
                        </div>
                    </div>

                    <div className={`text-center space-y-0.5 transform transition-all duration-300 ${!isOpen ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                        
                    </div>
                </div>

                {/* Divider Line dengan gradient dan animasi */}
                <div className="px-2 py-1 flex-shrink-0">
                    <div className="h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent w-full shadow-lg shadow-white/20"></div>
                </div>

                {/* --- MENU ITEMS - FLEXIBLE AREA --- */}
                <nav className={`flex-1 py-2 space-y-1.5 overflow-y-auto custom-scrollbar min-h-0 ${isOpen ? 'px-2' : 'px-0'}`}
                    
                >
                    {/* HOME */}
                    <Link
                        to="/home"
                        className={`group relative flex items-center ${isOpen ? 'justify-start gap-2 px-3' : 'justify-center px-0'} py-2.5 rounded-lg transition-all duration-300 font-medium text-sm overflow-hidden min-h-[44px] ${location.pathname === '/home' || location.pathname === '/'
                            ? 'bg-white/25 shadow-xl shadow-white/20 border-l-4 border-yellow-400'
                            : 'hover:bg-white/15 hover:shadow-lg hover:shadow-white/10 border-l-4 border-transparent hover:border-yellow-400/50'
                            }`}
                        style={{ 
                            color: (location.pathname === '/home' || location.pathname === '/') ? '#f7f9fa' : '#e6f2ff' 
                        }}
                    >
                        {/* Active indicator dengan glow */}
                        {(location.pathname === '/home' || location.pathname === '/') && isOpen && (
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-yellow-400 rounded-r-full shadow-lg shadow-yellow-400/70 animate-pulse"></div>
                        )}

                        {/* Hover effect background dengan gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>

                        {/* Shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>

                        {/* Container untuk icon dan text - icon di kiri */}
                        <div className={`relative z-10 flex items-center ${isOpen ? 'gap-2 flex-1' : 'justify-center'}`}>
                            {/* Icon dengan glow effect - di kiri */}
                            <div className={`transform transition-all duration-500 ease-in-out flex-shrink-0 ${!isOpen
                                ? 'scale-110'
                                : ''
                                } ${location.pathname === '/home' || location.pathname === '/'
                                    ? 'scale-125'
                                    : 'group-hover:scale-125 group-hover:rotate-6'
                                }`}>
                                <Home
                                    size={18}
                                    className={`transition-all duration-500 ease-in-out drop-shadow-lg ${location.pathname === '/home' || location.pathname === '/'
                                        ? 'text-yellow-400 drop-shadow-yellow-400/50'
                                        : 'group-hover:text-yellow-400 group-hover:drop-shadow-yellow-400/50'
                                        }`}
                                    style={{ color: (location.pathname === '/home' || location.pathname === '/') ? '#f7f9fa' : '#e6f2ff' }}
                                    strokeWidth={2.5}
                                />
                            </div>

                            {/* Text dengan efek - lebih kecil */}
                            {isOpen && (
                                <span className="transition-all duration-300 font-semibold tracking-wide flex-1 text-sm">{'HOME'}</span>
                            )}
                        </div>
                    </Link>

                    {/* SEWING - dengan breadcrumb navigation */}
                    {isSewingPage && (
                        <div className="space-y-1">
                            {/* SEWING Parent Menu - Link biasa */}
                        <Link
                            to="/sewing"
                            className={`group relative flex items-center ${isOpen ? 'justify-start gap-2 px-3' : 'justify-center px-0'} py-2.5 rounded-lg transition-all duration-300 font-medium text-sm overflow-hidden min-h-[44px] ${isSewingPage
                                ? 'bg-white/25 shadow-xl shadow-white/20 border-l-4 border-yellow-400'
                                : 'hover:bg-white/15 hover:shadow-lg hover:shadow-white/10 border-l-4 border-transparent hover:border-yellow-400/50'
                                }`}
                            style={{ 
                                color: isSewingPage ? '#f7f9fa' : '#e6f2ff' 
                            }}
                        >
                            {/* Active indicator dengan glow */}
                            {isSewingPage && isOpen && (
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-yellow-400 rounded-r-full shadow-lg shadow-yellow-400/70 animate-pulse"></div>
                            )}

                            {/* Hover effect background dengan gradient */}
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>

                            {/* Container untuk icon dan text - icon di kiri */}
                            <div className={`relative z-10 flex items-center ${isOpen ? 'gap-2 flex-1' : 'justify-center'}`}>
                                {/* Icon dengan glow effect - di kiri */}
                                <div className={`transform transition-all duration-500 ease-in-out flex-shrink-0 flex items-center justify-center ${!isOpen ? 'scale-110' : ''}`}>
                                    <div 
                                        className="w-[18px] h-[18px] transition-all duration-500 ease-in-out drop-shadow-lg"
                                        style={{
                                            maskImage: `url(${batchIcon})`,
                                            WebkitMaskImage: `url(${batchIcon})`,
                                            maskSize: 'contain',
                                            WebkitMaskSize: 'contain',
                                            maskRepeat: 'no-repeat',
                                            WebkitMaskRepeat: 'no-repeat',
                                            maskPosition: 'center',
                                            WebkitMaskPosition: 'center',
                                            background: isSewingPage ? '#f7f9fa' : '#e6f2ff',
                                        }}
                                    />
                                </div>

                                {/* Text - lebih kecil */}
                                {isOpen && (
                                    <span className="transition-all duration-300 font-semibold tracking-wide flex-1 text-left text-sm">{'SEWING'}</span>
                                )}
                            </div>
                        </Link>

                        {/* Breadcrumb Navigation - Muncul berdasarkan halaman aktif */}
                        {isSewingPage && sewingSubNav.length > 0 && (
                            <div className={`mt-2 flex flex-col gap-1 ${isOpen ? 'ml-3' : 'items-center'}`}>

                                {sewingSubNav.map((item, idx) => {
                                    const isSubActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                                    return (
                                        <Link
                                            key={idx}
                                            to={item.to}
                                            className={`group relative flex items-center ${isOpen ? 'justify-start gap-2 px-3' : 'justify-center w-10'} py-1.5 rounded-md transition-all duration-300 font-medium text-[10px] overflow-hidden min-h-[32px] ${isSubActive
                                                ? 'bg-white/20 shadow-lg shadow-white/10 border-l-2 border-yellow-400/70'
                                                : 'hover:bg-white/10 border-l-2 border-transparent hover:border-yellow-400/50'
                                                }`}
                                            style={{ color: isSubActive ? '#f7f9fa' : '#e6f2ff' }}
                                            title={item.label}
                                        >
                                            <div className={`flex-shrink-0 ${isSubActive ? 'opacity-100 text-yellow-400' : 'opacity-70 group-hover:opacity-100'}`}>
                                                {item.icon}
                                            </div>
                                            {isOpen && (
                                                <span className="font-medium tracking-wide text-left">{item.label}</span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    )}

                    {/* RFID - dengan breadcrumb navigation */}
                    {isRFIDPage && (
                        <div className="space-y-1">
                            {/* RFID Parent Menu - Link biasa */}
                        <Link
                            to="/rfid-tracking"
                            className={`group relative flex items-center ${isOpen ? 'justify-start gap-2 px-3' : 'justify-center px-0'} py-2.5 rounded-lg transition-all duration-300 font-medium text-sm overflow-hidden min-h-[44px] ${isRFIDPage
                                ? 'bg-white/25 shadow-xl shadow-white/20 border-l-4 border-yellow-400'
                                : 'hover:bg-white/15 hover:shadow-lg hover:shadow-white/10 border-l-4 border-transparent hover:border-yellow-400/50'
                                }`}
                            style={{ 
                                color: isRFIDPage ? '#f7f9fa' : '#e6f2ff' 
                            }}
                        >
                            {/* Active indicator dengan glow */}
                            {isRFIDPage && isOpen && (
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-yellow-400 rounded-r-full shadow-lg shadow-yellow-400/70 animate-pulse"></div>
                            )}

                            {/* Hover effect background dengan gradient */}
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>

                            {/* Container untuk icon dan text - icon di kiri */}
                            <div className={`relative z-10 flex items-center ${isOpen ? 'gap-2 flex-1' : 'justify-center'}`}>
                                {/* Icon dengan glow effect - di kiri */}
                                <div className={`transform transition-all duration-500 ease-in-out flex-shrink-0 flex items-center justify-center ${!isOpen ? 'scale-110' : ''}`}>
                                    <div 
                                        className="w-[18px] h-[18px] transition-all duration-500 ease-in-out drop-shadow-lg"
                                        style={{
                                            maskImage: `url(${rfidIcon})`,
                                            WebkitMaskImage: `url(${rfidIcon})`,
                                            maskSize: 'contain',
                                            WebkitMaskSize: 'contain',
                                            maskRepeat: 'no-repeat',
                                            WebkitMaskRepeat: 'no-repeat',
                                            maskPosition: 'center',
                                            WebkitMaskPosition: 'center',
                                            background: isRFIDPage ? '#f7f9fa' : '#e6f2ff',
                                        }}
                                    />
                                </div>

                                {/* Text - lebih kecil */}
                                {isOpen && (
                                    <span className="transition-all duration-300 font-semibold tracking-wide flex-1 text-left text-sm">{'RFID'}</span>
                                )}
                            </div>
                        </Link>

                        {/* Breadcrumb Navigation - Muncul berdasarkan halaman aktif (BISA DILIHAT SAAT COLLAPSED) */}
                        {isRFIDPage && sidebarSubNav.length > 0 && (
                            <div className={`mt-2 flex flex-col gap-1 ${isOpen ? 'ml-3' : 'items-center'}`}>

                                {sidebarSubNav.map((item, idx) => {
                                    const isSubActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                                    return (
                                        <Link
                                            key={idx}
                                            to={item.to}
                                            className={`group relative flex items-center ${isOpen ? 'justify-start gap-2 px-3' : 'justify-center w-10'} py-1.5 rounded-md transition-all duration-300 font-medium text-[10px] overflow-hidden min-h-[32px] ${isSubActive
                                                ? 'bg-white/20 shadow-lg shadow-white/10 border-l-2 border-yellow-400/70'
                                                : 'hover:bg-white/10 border-l-2 border-transparent hover:border-yellow-400/50'
                                                }`}
                                            style={{ color: isSubActive ? '#f7f9fa' : '#e6f2ff' }}
                                            title={item.label}
                                        >
                                            <div className={`flex-shrink-0 ${isSubActive ? 'opacity-100 text-yellow-400' : 'opacity-70 group-hover:opacity-100'}`}>
                                                {item.icon}
                                            </div>
                                            {isOpen && (
                                                <span className="font-medium tracking-wide text-left">{item.label}</span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    )}

                    {/* NEEDLE MANAGER - dengan breadcrumb navigation */}
                    {showNeedleManager && (
                        <div className="space-y-1">
                            {/* Needle Manager Parent Menu */}
                            <Link
                                to="/needle-manager"
                                className={`group relative flex items-center ${isOpen ? 'justify-start gap-2 px-3' : 'justify-center px-0'} py-2.5 rounded-lg transition-all duration-300 font-medium text-sm overflow-hidden min-h-[44px] ${showNeedleManager
                                    ? 'bg-white/25 shadow-xl shadow-white/20 border-l-4 border-yellow-400'
                                    : 'hover:bg-white/15 hover:shadow-lg hover:shadow-white/10 border-l-4 border-transparent hover:border-yellow-400/50'
                                    }`}
                                style={{ 
                                    color: showNeedleManager ? '#f7f9fa' : '#e6f2ff' 
                                }}
                            >
                                {/* Active indicator dengan glow */}
                                {showNeedleManager && isOpen && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-yellow-400 rounded-r-full shadow-lg shadow-yellow-400/70 animate-pulse"></div>
                                )}

                                {/* Hover effect background dengan gradient */}
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>

                                {/* Container untuk icon dan text - icon di kiri */}
                                <div className={`relative z-10 flex items-center ${isOpen ? 'gap-2 flex-1' : 'justify-center'}`}>
                                    {/* Icon dengan glow effect - di kiri */}
                                    <div className={`transform transition-all duration-500 ease-in-out flex-shrink-0 flex items-center justify-center ${!isOpen ? 'scale-110' : ''}`}>
                                        <div 
                                            className="w-[18px] h-[18px] transition-all duration-500 ease-in-out drop-shadow-lg"
                                            style={{
                                                maskImage: `url(${needleIcon})`,
                                                WebkitMaskImage: `url(${needleIcon})`,
                                                maskSize: 'contain',
                                                WebkitMaskSize: 'contain',
                                                maskRepeat: 'no-repeat',
                                                WebkitMaskRepeat: 'no-repeat',
                                                maskPosition: 'center',
                                                WebkitMaskPosition: 'center',
                                                background: showNeedleManager ? '#f7f9fa' : '#e6f2ff',
                                            }}
                                        />
                                    </div>

                                    {/* Text */}
                                    {isOpen && (
                                        <span className="transition-all duration-300 font-semibold tracking-wide flex-1 text-left text-sm">NEEDLE</span>
                                    )}
                                </div>
                            </Link>

                            {/* Breadcrumb Navigation - Muncul berdasarkan halaman aktif */}
                            {showNeedleManager && needleSubNav.length > 0 && (
                                <div className={`mt-2 flex flex-col gap-1 ${isOpen ? 'ml-3' : 'items-center'}`}>
                                    {needleSubNav.map((item, idx) => {
                                        const isSubActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                                        return (
                                            <Link
                                                key={idx}
                                                to={item.to}
                                                className={`group relative flex items-center ${isOpen ? 'justify-start gap-2 px-3' : 'justify-center w-10'} py-1.5 rounded-md transition-all duration-300 font-medium text-[10px] overflow-hidden min-h-[32px] ${isSubActive
                                                    ? 'bg-white/20 shadow-lg shadow-white/10 border-l-2 border-yellow-400/70'
                                                    : 'hover:bg-white/10 border-l-2 border-transparent hover:border-yellow-400/50'
                                                    }`}
                                                style={{ color: isSubActive ? '#f7f9fa' : '#e6f2ff' }}
                                                title={item.label}
                                            >
                                                <div className={`flex-shrink-0 ${isSubActive ? 'opacity-100 text-yellow-400' : 'opacity-70 group-hover:opacity-100'}`}>
                                                    {item.icon}
                                                </div>
                                                {isOpen && (
                                                    <span className="font-medium tracking-wide text-left">{item.label}</span>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* SHIPMENT */}
                    {showShipment && (
                        <div className="space-y-1">
                            <Link
                                to="/monitoring-shipment"
                                className={`group relative flex items-center ${isOpen ? 'justify-start gap-2 px-3' : 'justify-center px-0'} py-2.5 rounded-lg transition-all duration-300 font-medium text-sm overflow-hidden min-h-[44px] ${location.pathname.startsWith('/monitoring-shipment')
                                    ? 'bg-white/25 shadow-xl shadow-white/20 border-l-4 border-yellow-400'
                                    : 'hover:bg-white/15 hover:shadow-lg hover:shadow-white/10 border-l-4 border-transparent hover:border-yellow-400/50'
                                    }`}
                                style={{ 
                                    color: location.pathname.startsWith('/monitoring-shipment') ? '#f7f9fa' : '#e6f2ff' 
                                }}
                            >
                                {(location.pathname.startsWith('/monitoring-shipment')) && isOpen && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-yellow-400 rounded-r-full shadow-lg shadow-yellow-400/70 animate-pulse"></div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                                <div className={`relative z-10 flex items-center ${isOpen ? 'gap-2 flex-1' : 'justify-center'}`}>
                                    <div className={`transform transition-all duration-500 ease-in-out flex-shrink-0 flex items-center justify-center ${!isOpen ? 'scale-110' : ''}`}>
                                        <div 
                                            className="w-[18px] h-[18px] transition-all duration-500 ease-in-out drop-shadow-lg"
                                            style={{
                                                maskImage: `url(${shipmentIcon})`,
                                                WebkitMaskImage: `url(${shipmentIcon})`,
                                                maskSize: 'contain',
                                                WebkitMaskSize: 'contain',
                                                maskRepeat: 'no-repeat',
                                                WebkitMaskRepeat: 'no-repeat',
                                                maskPosition: 'center',
                                                WebkitMaskPosition: 'center',
                                                background: location.pathname.startsWith('/monitoring-shipment') ? '#f7f9fa' : '#e6f2ff',
                                            }}
                                        />
                                    </div>
                                    {isOpen && (
                                        <span className="transition-all duration-300 font-semibold tracking-wide flex-1 text-left text-sm">{'SHIPMENT'}</span>
                                    )}
                                </div>
                            </Link>

                            {/* Breadcrumb Navigation - Muncul berdasarkan halaman aktif */}
                            {showShipment && shipmentSubNav.length > 0 && (
                                <div className={`mt-2 flex flex-col gap-1 ${isOpen ? 'ml-3' : 'items-center'}`}>
                                    {shipmentSubNav.map((item, idx) => {
                                        const isSubActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                                        return (
                                            <Link
                                                key={idx}
                                                to={item.to}
                                                className={`group relative flex items-center ${isOpen ? 'justify-start gap-2 px-3' : 'justify-center w-10'} py-1.5 rounded-md transition-all duration-300 font-medium text-[10px] overflow-hidden min-h-[32px] ${isSubActive
                                                    ? 'bg-white/20 shadow-lg shadow-white/10 border-l-2 border-yellow-400/70'
                                                    : 'hover:bg-white/10 border-l-2 border-transparent hover:border-yellow-400/50'
                                                    }`}
                                                style={{ color: isSubActive ? '#f7f9fa' : '#e6f2ff' }}
                                                title={item.label}
                                            >
                                                <div className={`flex-shrink-0 ${isSubActive ? 'opacity-100 text-yellow-400' : 'opacity-70 group-hover:opacity-100'}`}>
                                                    {item.icon}
                                                </div>
                                                {isOpen && (
                                                    <span className="font-medium tracking-wide text-left">{item.label}</span>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* MACHINE */}
                    {showMachine && (
                        <div className="space-y-1">
                            <Link
                                to="/monitoring-machine"
                                className={`group relative flex items-center ${isOpen ? 'justify-start gap-2 px-3' : 'justify-center px-0'} py-2.5 rounded-lg transition-all duration-300 font-medium text-sm overflow-hidden min-h-[44px] ${location.pathname.startsWith('/monitoring-machine')
                                    ? 'bg-white/25 shadow-xl shadow-white/20 border-l-4 border-yellow-400'
                                    : 'hover:bg-white/15 hover:shadow-lg hover:shadow-white/10 border-l-4 border-transparent hover:border-yellow-400/50'
                                    }`}
                                style={{ 
                                    color: location.pathname.startsWith('/monitoring-machine') ? '#f7f9fa' : '#e6f2ff' 
                                }}
                            >
                                {(location.pathname.startsWith('/monitoring-machine')) && isOpen && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-yellow-400 rounded-r-full shadow-lg shadow-yellow-400/70 animate-pulse"></div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                                <div className={`relative z-10 flex items-center ${isOpen ? 'gap-2 flex-1' : 'justify-center'}`}>
                                    <div className={`transform transition-all duration-500 ease-in-out flex-shrink-0 flex items-center justify-center ${!isOpen ? 'scale-110' : ''}`}>
                                        <div 
                                            className="w-[18px] h-[18px] transition-all duration-500 ease-in-out drop-shadow-lg"
                                            style={{
                                                maskImage: `url(${machineIcon})`,
                                                WebkitMaskImage: `url(${machineIcon})`,
                                                maskSize: 'contain',
                                                WebkitMaskSize: 'contain',
                                                maskRepeat: 'no-repeat',
                                                WebkitMaskRepeat: 'no-repeat',
                                                maskPosition: 'center',
                                                WebkitMaskPosition: 'center',
                                                background: location.pathname.startsWith('/monitoring-machine') ? '#f7f9fa' : '#e6f2ff',
                                            }}
                                        />
                                    </div>
                                    {isOpen && (
                                        <span className="transition-all duration-300 font-semibold tracking-wide flex-1 text-left text-sm">{'MACHINE'}</span>
                                    )}
                                </div>
                            </Link>

                            {showMachine && machineSubNav.length > 0 && (
                                <div className={`mt-2 flex flex-col gap-1 ${isOpen ? 'ml-3' : 'items-center'}`}>
                                    {machineSubNav.map((item, idx) => {
                                        const isSubActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                                        return (
                                            <Link
                                                key={idx}
                                                to={item.to}
                                                className={`group relative flex items-center ${isOpen ? 'justify-start gap-2 px-3' : 'justify-center w-10'} py-1.5 rounded-md transition-all duration-300 font-medium text-[10px] overflow-hidden min-h-[32px] ${isSubActive
                                                    ? 'bg-white/20 shadow-lg shadow-white/10 border-l-2 border-yellow-400/70'
                                                    : 'hover:bg-white/10 border-l-2 border-transparent hover:border-yellow-400/50'
                                                    }`}
                                                style={{ color: isSubActive ? '#f7f9fa' : '#e6f2ff' }}
                                            >
                                                <div className="flex-shrink-0">{item.icon}</div>
                                                {isOpen && <span className="truncate">{item.label}</span>}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* MACHINE PRODUCTIVITY */}
                    {showMachineProductivity && (
                        <div className="space-y-1">
                            <Link
                                to="/machine-productivity"
                                className={`group relative flex items-center ${isOpen ? 'justify-start gap-2 px-3' : 'justify-center px-0'} py-2.5 rounded-lg transition-all duration-300 font-medium text-sm overflow-hidden min-h-[44px] ${location.pathname.startsWith('/machine-productivity')
                                    ? 'bg-white/25 shadow-xl shadow-white/20 border-l-4 border-yellow-400'
                                    : 'hover:bg-white/15 hover:shadow-lg hover:shadow-white/10 border-l-4 border-transparent hover:border-yellow-400/50'
                                    }`}
                                style={{ 
                                    color: location.pathname.startsWith('/machine-productivity') ? '#f7f9fa' : '#e6f2ff' 
                                }}
                            >
                                {(location.pathname.startsWith('/machine-productivity')) && isOpen && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-yellow-400 rounded-r-full shadow-lg shadow-yellow-400/70 animate-pulse"></div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                                <div className={`relative z-10 flex items-center ${isOpen ? 'gap-2 flex-1' : 'justify-center'}`}>
                                    <div className={`transform transition-all duration-500 ease-in-out flex-shrink-0 flex items-center justify-center ${!isOpen ? 'scale-110' : ''}`}>
                                        <div 
                                            className="w-[18px] h-[18px] transition-all duration-500 ease-in-out drop-shadow-lg"
                                            style={{
                                                maskImage: `url(${machineIcon})`,
                                                WebkitMaskImage: `url(${machineIcon})`,
                                                maskSize: 'contain',
                                                WebkitMaskSize: 'contain',
                                                maskRepeat: 'no-repeat',
                                                WebkitMaskRepeat: 'no-repeat',
                                                maskPosition: 'center',
                                                WebkitMaskPosition: 'center',
                                                background: location.pathname.startsWith('/machine-productivity') ? '#f7f9fa' : '#e6f2ff',
                                            }}
                                        />
                                    </div>
                                    {isOpen && (
                                        <span className="transition-all duration-300 font-semibold tracking-wide flex-1 text-left text-sm">{'MACHINE PRODUCTIVITY'}</span>
                                    )}
                                </div>
                            </Link>

                            {showMachineProductivity && machineProductivitySubNav.length > 0 && (
                                <div className={`mt-2 flex flex-col gap-1 ${isOpen ? 'ml-3' : 'items-center'}`}>
                                    {machineProductivitySubNav.map((item, idx) => {
                                        const isSubActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                                        return (
                                            <Link
                                                key={idx}
                                                to={item.to}
                                                className={`group relative flex items-center ${isOpen ? 'justify-start gap-2 px-3' : 'justify-center w-10'} py-1.5 rounded-md transition-all duration-300 font-medium text-[10px] overflow-hidden min-h-[32px] ${isSubActive
                                                    ? 'bg-white/20 shadow-lg shadow-white/10 border-l-2 border-yellow-400/70'
                                                    : 'hover:bg-white/10 border-l-2 border-transparent hover:border-yellow-400/50'
                                                    }`}
                                                style={{ color: isSubActive ? '#f7f9fa' : '#e6f2ff' }}
                                            >
                                                <div className="flex-shrink-0">{item.icon}</div>
                                                {isOpen && <span className="truncate">{item.label}</span>}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* VIBE PRENDI */}
                    {showVibePrendi && (
                        <div className="space-y-1">
                            <Link
                                to="/vibe-prendi"
                                className={`group relative flex items-center ${isOpen ? 'justify-start gap-2 px-3' : 'justify-center px-0'} py-2.5 rounded-lg transition-all duration-300 font-medium text-sm overflow-hidden min-h-[44px] ${location.pathname.startsWith('/vibe-prendi')
                                    ? 'bg-white/25 shadow-xl shadow-white/20 border-l-4 border-yellow-400'
                                    : 'hover:bg-white/15 hover:shadow-lg hover:shadow-white/10 border-l-4 border-transparent hover:border-yellow-400/50'
                                    }`}
                                style={{ 
                                    color: location.pathname.startsWith('/vibe-prendi') ? '#f7f9fa' : '#e6f2ff' 
                                }}
                            >
                                {(location.pathname.startsWith('/vibe-prendi')) && isOpen && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-yellow-400 rounded-r-full shadow-lg shadow-yellow-400/70 animate-pulse"></div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                                <div className={`relative z-10 flex items-center ${isOpen ? 'gap-2 flex-1' : 'justify-center'}`}>
                                    <div className={`transform transition-all duration-500 ease-in-out flex-shrink-0 flex items-center justify-center ${!isOpen ? 'scale-110' : ''}`}>
                                        <div 
                                            className="w-[18px] h-[18px] transition-all duration-500 ease-in-out drop-shadow-lg"
                                            style={{
                                                maskImage: `url(${prendiIcon})`,
                                                WebkitMaskImage: `url(${prendiIcon})`,
                                                maskSize: 'contain',
                                                WebkitMaskSize: 'contain',
                                                maskRepeat: 'no-repeat',
                                                WebkitMaskRepeat: 'no-repeat',
                                                maskPosition: 'center',
                                                WebkitMaskPosition: 'center',
                                                background: location.pathname.startsWith('/vibe-prendi') ? '#f7f9fa' : '#e6f2ff',
                                            }}
                                        />
                                    </div>
                                    {isOpen && (
                                        <span className="transition-all duration-300 font-semibold tracking-wide flex-1 text-left text-sm">{'REPORT DETAIL'}</span>
                                    )}
                                </div>
                            </Link>
                        </div>
                    )}
                </nav>

                {/* Divider Line dengan efek */}
                <div className={`px-2 py-1 flex-shrink-0 transition-all duration-300 ${!isOpen ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent w-full shadow-lg shadow-white/20"></div>
                </div>

                {/* --- LOGOUT BUTTON - DI PALING BAWAH --- */}
                <div className={`flex-shrink-0 ${isOpen ? 'px-2 pb-3' : 'px-0'}`}>
                    <button
                        onClick={handleLogout}
                        className={`bg-blue-500 mb-2 group relative w-full flex items-center ${isOpen ? 'justify-start gap-2 px-3' : 'justify-center px-0'} py-2.5 rounded-lg transition-all duration-300 overflow-hidden min-h-[44px] bg-[#0073EE] hover:bg-[#0066D6] text-white shadow-sm`}
                    >
                        {/* Icon */}
                        <div className={`ml-2 relative z-10 flex-shrink-0 ${!isOpen ? 'scale-110' : ''}`}>
                            <LogOut
                                size={18}
                                className="text-white"
                                strokeWidth={4}
                            />
                        </div>

                        {/* Text */}
                        {isOpen && (
                            <span className="ml-2 relative z-10 flex-1 text-left text-md text-white font-normal tracking-normal">{'Logout'}</span>
                        )}
                    </button>
                </div>
            </aside>
        </>
    );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
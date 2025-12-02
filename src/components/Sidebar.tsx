import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../hooks/useAuth';
import { Home, Rss, Info, LogOut } from 'lucide-react';
import logo from '../assets/logo.svg';

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { isOpen, closeSidebar } = useSidebar();
    const { user } = useAuth();

    // Deteksi halaman aktif untuk breadcrumb navigation
    const isRFIDPage = location.pathname.startsWith('/monitoring-rfid') ||
        location.pathname.startsWith('/line/') ||
        location.pathname.startsWith('/dashboard-rfid/') ||
        location.pathname.startsWith('/daftar-rfid') ||
        location.pathname.startsWith('/data-rfid') ||
        location.pathname.startsWith('/list-rfid');

    // Data production lines (sama dengan RFIDLineContent.tsx dan LineDetail.tsx)
    const productionLines = [
        { id: 1, title: 'SEWING LINE 1' },
        { id: 2, title: 'SEWING LINE 2' },
        { id: 3, title: 'SEWING LINE 3' },
        { id: 4, title: 'SEWING LINE 4' },
        { id: 5, title: 'SEWING LINE 5' },
        { id: 6, title: 'SEWING LINE 6' },
        { id: 7, title: 'CUTTING GM1' },
        { id: 8, title: 'SEWING LINE 8' },
        { id: 9, title: 'SEWING LINE 9' },
    ];

    // Deteksi line ID dari route
    const getLineId = (): string | null => {
        const lineMatch = location.pathname.match(/\/line\/(\d+)/);
        if (lineMatch) return lineMatch[1];

        const dashboardMatch = location.pathname.match(/\/dashboard-rfid\/(\d+)/);
        if (dashboardMatch) return dashboardMatch[1];

        // Default ke line 1 untuk daftar-rfid, data-rfid, dan list-rfid
        if (location.pathname.startsWith('/daftar-rfid') || location.pathname.startsWith('/data-rfid') || location.pathname.startsWith('/list-rfid')) {
            return '1';
        }

        return null;
    };

    const currentLineId = getLineId();
    const isLinePage = currentLineId !== null;
    const isProductionLinesPage = location.pathname === '/monitoring-rfid';

    // Dapatkan data line berdasarkan ID
    const currentLineData = currentLineId
        ? productionLines.find(line => line.id === Number(currentLineId))
        : null;

    const handleLogout = () => {
        // Clear semua data login
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        navigate('/login', { replace: true });
    };

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
                className={`bg-gradient-to-b from-[#0073EE] to-[#0073EE] h-screen fixed left-0 top-0 flex flex-col shadow-2xl z-50 transition-all duration-300 ease-in-out backdrop-blur-sm ${isOpen ? 'w-[15%] px-4' : 'w-20 px-2'
                    }`}
            >
                {/* --- LOGO AREA - DI PALING ATAS --- */}
                <div className={`flex flex-col items-center justify-center pt-4 pb-3 relative flex-shrink-0 ${isOpen ? 'px-2' : 'px-0'}`}>
                    {/* Decorative gradient overlay dengan animasi */}
                    <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/10 via-yellow-400/5 to-transparent pointer-events-none animate-pulse"></div>

                    {/* Animated background glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-transparent to-blue-400/5 pointer-events-none"></div>

                    {/* Logo SVG - Diperkecil */}
                    <div className="relative mb-2 group">
                        {/* Glow effect saat hover */}
                        <div className="absolute inset-0 bg-yellow-400/30 rounded-2xl blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-0 group-hover:opacity-100 -z-10"></div>
                        <div className="relative transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-2 group-hover:drop-shadow-2xl">
                            <img
                                src={logo}
                                alt="GISTEX Logo"
                                className={`${isOpen ? 'w-24 h-18' : 'w-10 h-10'} object-contain drop-shadow-2xl filter brightness-110 transition-all duration-300`}
                            />
                        </div>
                    </div>

                    <div className={`text-center space-y-0.5 transform transition-all duration-300 ${!isOpen ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                        <h2 className="text-yellow-400 font-bold text-xs tracking-wider drop-shadow-lg hover:text-yellow-300 transition-colors">
                            PT GISTEX
                        </h2>
                        <h2 className="text-yellow-400/90 font-bold text-[10px] tracking-widest drop-shadow-md hover:text-yellow-300/90 transition-colors">
                            GARMENT INDONESIA
                        </h2>
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
                            ? 'text-white bg-white/25 shadow-xl shadow-white/20 border-l-4 border-yellow-400'
                            : 'text-white/80 hover:text-white hover:bg-white/15 hover:shadow-lg hover:shadow-white/10 border-l-4 border-transparent hover:border-yellow-400/50'
                            }`}
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
                                        : 'text-white/70 group-hover:text-yellow-400 group-hover:drop-shadow-yellow-400/50'
                                        }`}
                                    strokeWidth={2.5}
                                />
                            </div>

                            {/* Text dengan efek - lebih kecil */}
                            {isOpen && (
                                <span className="transition-all duration-300 font-semibold tracking-wide flex-1 text-sm">{'HOME'}</span>
                            )}
                        </div>
                    </Link>

                    {/* RFID - dengan breadcrumb navigation */}
                    <div className="space-y-1">
                        {/* RFID Parent Menu - Link biasa */}
                        <Link
                            to="/monitoring-rfid"
                            className={`group relative flex items-center ${isOpen ? 'justify-start gap-2 px-3' : 'justify-center px-0'} py-2.5 rounded-lg transition-all duration-300 font-medium text-sm overflow-hidden min-h-[44px] ${isRFIDPage
                                ? 'text-white bg-white/25 shadow-xl shadow-white/20 border-l-4 border-yellow-400'
                                : 'text-white/80 hover:text-white hover:bg-white/15 hover:shadow-lg hover:shadow-white/10 border-l-4 border-transparent hover:border-yellow-400/50'
                                }`}
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
                                <div className={`transform transition-all duration-500 ease-in-out flex-shrink-0 ${!isOpen
                                    ? 'scale-110'
                                    : ''
                                    }`}>
                                    <Rss
                                        size={18}
                                        className={`transition-all duration-500 ease-in-out drop-shadow-lg ${isRFIDPage
                                            ? 'text-yellow-400 drop-shadow-yellow-400/50'
                                            : 'text-white/70 group-hover:text-yellow-400 group-hover:drop-shadow-yellow-400/50'
                                            }`}
                                        strokeWidth={2.5}
                                    />
                                </div>

                                {/* Text - lebih kecil */}
                                {isOpen && (
                                    <span className="transition-all duration-300 font-semibold tracking-wide flex-1 text-left text-sm">{'RFID'}</span>
                                )}
                            </div>
                        </Link>

                        {/* Breadcrumb Navigation - Muncul berdasarkan halaman aktif */}
                        {isOpen && isRFIDPage && (
                            <div className="ml-3 space-y-0.5">
                                {/* Production Lines - Muncul jika di halaman monitoring-rfid atau lebih dalam */}
                                {isProductionLinesPage && (
                                    <div className="px-3 py-1.5 text-white/80 font-medium text-xs border-l-2 border-white/30"
                                       
                                    >
                                        Production Lines
                                    </div>
                                )}

                                {/* Line Detail - Muncul jika di halaman line atau lebih dalam (untuk semua line) */}
                                {isLinePage && currentLineData && (
                                    <div className="ml-3 space-y-0.5"
                                        
                                    >
                                        {/* Link ke Production Lines jika belum di halaman tersebut */}
                                        {!isProductionLinesPage && (
                                            <Link
                                                to="/monitoring-rfid"
                                                className="group relative flex items-center justify-start gap-2 px-3 py-1.5 rounded-md transition-all duration-300 font-medium text-[10px] overflow-hidden min-h-[32px] w-full text-white/60 hover:text-white hover:bg-white/8 border-l-2 border-transparent hover:border-yellow-400/40"
                                            >
                                                <span className="font-medium tracking-wide text-left">Production Lines</span>
                                            </Link>
                                        )}

                                        {/* Current Line */}
                                        <Link
                                            to={`/line/${currentLineId}`}
                                            className={`group relative flex items-center justify-start gap-2 px-3 py-1.5 rounded-md transition-all duration-300 font-medium text-[10px] overflow-hidden min-h-[32px] w-full ${location.pathname === `/line/${currentLineId}`
                                                ? 'text-white bg-white/20 shadow-lg shadow-white/10 border-l-2 border-yellow-400/70'
                                                : 'text-white/70 hover:text-white hover:bg-white/10 border-l-2 border-transparent hover:border-yellow-400/50'
                                                }`}
                                        >
                                            <span className="font-semibold tracking-wide text-left">{currentLineData.title}</span>
                                        </Link>

                                        {/* Submenu - Muncul jika di halaman detail line atau dashboard/daftar/list */}
                                        {(location.pathname === `/line/${currentLineId}` ||
                                            location.pathname === `/dashboard-rfid/${currentLineId}` ||
                                            (location.pathname === '/daftar-rfid' && currentLineId === '1') ||
                                            (location.pathname === '/data-rfid' && currentLineId === '1') ||
                                            (location.pathname === '/list-rfid' && currentLineId === '1')) && (
                                                <div className="ml-3 space-y-0.5">
                                                    {/* DAFTAR RFID - hanya untuk line 1 */}
                                                    {currentLineId === '1' && (
                                                        <Link
                                                            to="/daftar-rfid"
                                                            className={`group relative flex items-center justify-start gap-2 px-3 py-1.5 rounded-md transition-all duration-300 font-medium text-[10px] overflow-hidden min-h-[32px] w-full ${location.pathname === '/daftar-rfid'
                                                                ? 'text-white bg-white/15 shadow-md border-l-2 border-purple-400'
                                                                : 'text-white/60 hover:text-white hover:bg-white/8 border-l-2 border-transparent hover:border-purple-400/40'
                                                                }`}
                                                        >
                                                            <span className="font-medium tracking-wide text-left">DAFTAR RFID</span>
                                                        </Link>
                                                    )}

                                                    {/* DASHBOARD RFID - untuk semua line */}
                                                    <Link
                                                        to={`/dashboard-rfid/${currentLineId}`}
                                                        className={`group relative flex items-center justify-start gap-2 px-3 py-1.5 rounded-md transition-all duration-300 font-medium text-[10px] overflow-hidden min-h-[32px] w-full ${location.pathname === `/dashboard-rfid/${currentLineId}`
                                                            ? 'text-white bg-white/15 shadow-md border-l-2 border-pink-400'
                                                            : 'text-white/60 hover:text-white hover:bg-white/8 border-l-2 border-transparent hover:border-pink-400/40'
                                                            }`}
                                                    >
                                                        <span className="font-medium tracking-wide text-left">DASHBOARD RFID</span>
                                                    </Link>

                                                    {/* LIST RFID - untuk semua line */}
                                                    <Link
                                                        to={`/list-rfid/${currentLineId}`}
                                                        className={`group relative flex items-center justify-start gap-2 px-3 py-1.5 rounded-md transition-all duration-300 font-medium text-[10px] overflow-hidden min-h-[32px] w-full ${location.pathname === `/list-rfid/${currentLineId}` || location.pathname.startsWith('/list-rfid')
                                                            ? 'text-white bg-white/15 shadow-md border-l-2 border-orange-400'
                                                            : 'text-white/60 hover:text-white hover:bg-white/8 border-l-2 border-transparent hover:border-orange-400/40'
                                                            }`}
                                                    >
                                                        <span className="font-medium tracking-wide text-left">LIST RFID</span>
                                                    </Link>
                                                </div>
                                            )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ABOUT US */}
                    <Link
                        to="/about-us"
                        className={`group relative flex items-center ${isOpen ? 'justify-start gap-2 px-3' : 'justify-center px-0'} py-2.5 rounded-lg transition-all duration-300 font-medium text-sm overflow-hidden min-h-[44px] ${location.pathname === '/about-us'
                            ? 'text-white bg-white/25 shadow-xl shadow-white/20 border-l-4 border-yellow-400'
                            : 'text-white/80 hover:text-white hover:bg-white/15 hover:shadow-lg hover:shadow-white/10 border-l-4 border-transparent hover:border-yellow-400/50'
                            }`}
                    >
                        {/* Active indicator dengan glow */}
                        {location.pathname === '/about-us' && isOpen && (
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
                                } ${location.pathname === '/about-us'
                                    ? 'scale-125'
                                    : 'group-hover:scale-125 group-hover:rotate-6'
                                }`}>
                                <Info
                                    size={18}
                                    className={`transition-all duration-500 ease-in-out drop-shadow-lg ${location.pathname === '/about-us'
                                        ? 'text-yellow-400 drop-shadow-yellow-400/50'
                                        : 'text-white/70 group-hover:text-yellow-400 group-hover:drop-shadow-yellow-400/50'
                                        }`}
                                    strokeWidth={2.5}
                                />
                            </div>

                            {/* Text dengan efek - lebih kecil */}
                            {isOpen && (
                                <span className="transition-all duration-300 font-semibold tracking-wide flex-1 text-left text-sm">{'ABOUT US'}</span>
                            )}
                        </div>
                    </Link>
                </nav>

                {/* Divider Line dengan efek */}
                <div className={`px-2 py-1 flex-shrink-0 transition-all duration-300 ${!isOpen ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent w-full shadow-lg shadow-white/20"></div>
                </div>

                {/* --- TEAMS SECTION - DI PALING BAWAH --- */}
                {isOpen && (
                    <div className="px-2 py-2 flex-shrink-0">
                        {/* TEAMS Title - Di tengah */}
                        <div className="text-white/70 font-semibold uppercase tracking-widest mb-2 px-2 flex items-center justify-center">
                            <span className="text-xs text-center">TEAMS</span>
                        </div>
                        <div className="space-y-1.5">
                            {/* Bagian dari API */}
                            <div className="group relative flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-300 cursor-pointer border border-transparent hover:border-blue-400/30 hover:shadow-lg hover:shadow-blue-400/20">
                                <div className="relative">
                                    <div className="w-2 h-2 rounded-full bg-blue-400 shadow-lg shadow-blue-400/70 flex-shrink-0 group-hover:scale-125 group-hover:shadow-blue-400 transition-all duration-300 animate-pulse"></div>
                                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-blue-400/30 blur-md group-hover:blur-lg transition-all duration-300"></div>
                                </div>
                                <span className="text-white/90 text-xs font-medium group-hover:text-white transition-colors tracking-wide text-center">
                                    {user?.bagian || user?.jabatan || 'GUEST'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Divider Line dengan efek */}
                <div className={`px-2 py-1 flex-shrink-0 transition-all duration-300 ${!isOpen ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent w-full shadow-lg shadow-white/20"></div>
                </div>

                {/* --- LOGOUT BUTTON - DI PALING BAWAH --- */}
                <div className={`flex-shrink-0 ${isOpen ? 'p-2 pb-3' : 'p-2'}`}>
                    <button
                        onClick={handleLogout}
                        className={`group relative w-full flex items-center ${isOpen ? 'justify-start gap-2 px-3' : 'justify-center px-0'} py-2.5 rounded-lg transition-all duration-300 font-semibold overflow-hidden min-h-[44px] text-white/90 hover:text-white hover:bg-red-500/25 border-2 border-red-500/40 hover:border-red-500/70 hover:shadow-xl hover:shadow-red-500/30`}
                    >
                        {/* Hover effect background dengan gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/15 to-red-500/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>

                        {/* Shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-400/30 to-transparent -skew-x-12 transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>

                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-red-500/20 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>

                        {/* Icon dengan glow effect */}
                        <div className={`relative z-10 transform transition-all duration-500 ease-in-out flex-shrink-0 ${!isOpen
                            ? 'scale-110'
                            : ''
                            } group-hover:scale-125 group-hover:rotate-6`}>
                            <LogOut
                                size={18}
                                className="text-white/80 group-hover:text-red-300 transition-all duration-500 ease-in-out drop-shadow-lg group-hover:drop-shadow-red-400/50"
                                strokeWidth={2.5}
                            />
                        </div>

                        {/* Text dengan efek - lebih kecil */}
                        {isOpen && (
                            <span className="relative z-10 flex-1 text-left transition-all duration-300 font-semibold tracking-wider text-sm">{'LOGOUT'}</span>
                        )}
                    </button>
                </div>
            </aside>
        </>
    );
}
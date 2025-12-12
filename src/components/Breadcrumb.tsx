import { useLocation, useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

interface BreadcrumbItem {
    label: string;
    path?: string;
    isActive?: boolean;
}

export default function Breadcrumb() {
    const location = useLocation();
    const navigate = useNavigate();

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
        if (path.startsWith('/monitoring-rfid')) {
            breadcrumbs.push({
                label: 'RFID Tracking',
                isActive: true,
            });
        } else if (path.startsWith('/line/')) {
            const lineId = path.match(/\/line\/(\d+)/)?.[1];
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
                path: '/monitoring-rfid',
            });
            breadcrumbs.push({
                label: lineTitles[lineId || '1'] || `Line ${lineId}`,
                isActive: true,
            });
        } else if (path.startsWith('/dashboard-rfid/')) {
            const lineId = path.match(/\/dashboard-rfid\/(\d+)/)?.[1];
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
        }

        return breadcrumbs;
    };

    const breadcrumbs = getBreadcrumbs();

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
            </div>
        </div>
    );
}


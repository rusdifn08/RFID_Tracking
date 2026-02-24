import { memo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../hooks/useAuth';
import { Menu, Bell, Radio, X, Maximize2, Minimize2 } from 'lucide-react';
import logo from '../assets/logo.svg';
import handIcon from '../assets/hand.svg';
import NotificationModal from './notification/NotificationModal';
import NotificationDetailModal from './notification/NotificationDetailModal';
import { useNotifications } from '../hooks/useNotifications';

const Header = memo(() => {
    const { isOpen, toggleSidebar } = useSidebar();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Notification hooks
    const {
        notifications,
        unreadCount,
        showModal: showNotificationModal,
        showDetailModal,
        selectedNotification,
        setShowModal: setShowNotificationModal,
        handleNotificationClick,
        handleMarkAllAsRead,
        handleCloseDetailModal,
    } = useNotifications();

    // Check fullscreen state on mount and when it changes
    useEffect(() => {
        const checkFullscreen = () => {
            const isCurrentlyFullscreen = !!(
                document.fullscreenElement ||
                (document as any).webkitFullscreenElement ||
                (document as any).mozFullScreenElement ||
                (document as any).msFullscreenElement
            );
            setIsFullscreen(isCurrentlyFullscreen);
        };

        // Check initial state
        checkFullscreen();

        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', checkFullscreen);
        document.addEventListener('webkitfullscreenchange', checkFullscreen);
        document.addEventListener('mozfullscreenchange', checkFullscreen);
        document.addEventListener('MSFullscreenChange', checkFullscreen);

        return () => {
            document.removeEventListener('fullscreenchange', checkFullscreen);
            document.removeEventListener('webkitfullscreenchange', checkFullscreen);
            document.removeEventListener('mozfullscreenchange', checkFullscreen);
            document.removeEventListener('MSFullscreenChange', checkFullscreen);
        };
    }, []);

    // Toggle fullscreen function - dioptimasi dengan useCallback
    const toggleFullscreen = useCallback(async () => {
        try {
            if (!isFullscreen) {
                // Enter fullscreen
                const element = document.documentElement;
                if (element.requestFullscreen) {
                    await element.requestFullscreen();
                } else if ((element as any).webkitRequestFullscreen) {
                    await (element as any).webkitRequestFullscreen();
                } else if ((element as any).mozRequestFullScreen) {
                    await (element as any).mozRequestFullScreen();
                } else if ((element as any).msRequestFullscreen) {
                    await (element as any).msRequestFullscreen();
                }
            } else {
                // Exit fullscreen
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if ((document as any).webkitExitFullscreen) {
                    await (document as any).webkitExitFullscreen();
                } else if ((document as any).mozCancelFullScreen) {
                    await (document as any).mozCancelFullScreen();
                } else if ((document as any).msExitFullscreen) {
                    await (document as any).msExitFullscreen();
                }
            }
        } catch (error) {
            console.error('Error toggling fullscreen:', error);
        }
    }, [isFullscreen]);

    return (
        <header
            className="bg-white h-12 xs:h-14 sm:h-16 flex items-center justify-between px-1.5 xs:px-2 sm:px-3 md:px-4 fixed top-0 right-0 z-30 transition-all duration-300 ease-in-out shadow-md border-b border-gray-200"
            style={{ left: isOpen ? '18%' : '5rem', width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)' }}
        >
            {/* --- LEFT SECTION: Hamburger & Title --- */}
            <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-1.5 md:gap-2">
                {/* Hamburger Menu - Lebih mepet ke sidebar */}
                <button
                    onClick={toggleSidebar}
                    className="p-1 xs:p-1.5 hover:bg-gray-100 rounded transition-colors"
                    aria-label="Toggle sidebar"
                >
                    {isOpen ? (
                        <X className="w-4 xs:w-5 sm:w-6 h-4 xs:h-5 sm:h-6 text-gray-700" strokeWidth={2.5} />
                    ) : (
                        <Menu className="w-4 xs:w-5 sm:w-6 h-4 xs:h-5 sm:h-6 text-gray-700" strokeWidth={2.5} />
                    )}
                </button>

                {/* Header Icon - Logo dari sidebar */}
                <img src={logo} alt="Gistex Logo" className="w-11 xs:w-13 sm:w-15 md:w-18 lg:w-20 xl:w-25 h-12 xs:h-14 sm:h-16 md:h-20 lg:h-24 xl:h-28 object-contain mr-2" />

                {/* System Title */}
                <h1 className="text-lg tracking-normal text-zinc-500" style={{ textTransform: 'capitalize', fontFamily: 'Poppins, sans-serif' }}>
                    <span className="hidden sm:inline">
                        <span style={{ fontWeight: 600 }}>  Gistex Command Center</span>
                    </span>
                    <span className="sm:hidden" style={{ fontWeight: 600 }}>Gistex</span>
                </h1>
            </div>

            {/* --- RIGHT SECTION: Checking RFID Button, User, Notification --- */}
            <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 lg:gap-4">

                {/* Checking RFID Button - Professional & Elegant */}
                <button
                    onClick={() => navigate('/checking-rfid')}
                    className="flex items-center gap-2 xs:gap-2.5 sm:gap-3 px-4 xs:px-4.5 sm:px-5 md:px-6 py-1.5 xs:py-2 sm:py-2.5 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 text-blue-700 hover:from-blue-100 hover:to-blue-200 hover:border-blue-300 hover:text-blue-800 font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-300 ease-in-out group text-xs sm:text-sm relative overflow-hidden"
                    style={{
                        fontFamily: 'Poppins, sans-serif'
                    }}
                >
                    {/* Shine effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>

                    <Radio className="w-4 xs:w-4.5 sm:w-5 h-4 xs:h-4.5 sm:h-5 text-blue-600 group-hover:text-blue-700 transition-all duration-300 group-hover:scale-110 relative z-10" strokeWidth={2.5} />
                    <span className="tracking-wide hidden sm:inline relative z-10">CHECKING RFID</span>
                    <span className="tracking-wide sm:hidden relative z-10">CHECK</span>
                </button>

                {/* Fullscreen Toggle Button - Kotak di samping Checking RFID */}
                <button
                    onClick={toggleFullscreen}
                    className="p-1.5 xs:p-2 sm:p-2.5 bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center"
                    aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                    title={isFullscreen ? 'Keluar Fullscreen' : 'Masuk Fullscreen'}
                >
                    {isFullscreen ? (
                        <Minimize2 className="w-4 xs:w-4.5 sm:w-5 h-4 xs:h-4.5 sm:h-5 text-gray-700 hover:text-blue-600 transition-colors" strokeWidth={2.5} />
                    ) : (
                        <Maximize2 className="w-4 xs:w-4.5 sm:w-5 h-4 xs:h-4.5 sm:h-5 text-gray-700 hover:text-blue-600 transition-colors" strokeWidth={2.5} />
                    )}
                </button>

                {/* Hand Icon */}
                <img src={handIcon} alt="Hand" className="w-5 xs:w-6 sm:w-7 h-5 xs:h-6 sm:h-7 object-contain" />

                {/* User Info - Hidden di mobile/portrait */}
                <div className="hidden md:flex flex-col items-center leading-tight">
                    <span className="text-[10px] md:text-xs lg:text-sm uppercase text-zinc-500" style={{ fontWeight: 600 }}>
                        {user ? `HI, ${(user.name || '').toUpperCase()}` : 'HI, GUEST'}
                    </span>
                    <span className="text-[9px] md:text-[10px] lg:text-xs text-center text-zinc-500" style={{ fontWeight: 500 }}>
                        {user?.bagian || user?.jabatan || 'Guest'}
                    </span>
                </div>

                {/* Notification Bell */}
                <button
                    onClick={() => setShowNotificationModal(true)}
                    className="relative p-0.5 xs:p-1 hover:bg-gray-100 rounded transition-colors"
                    aria-label="Notifications"
                >
                    <Bell className="w-4 xs:w-5 sm:w-6 h-4 xs:h-5 sm:h-6 text-gray-700" />
                    {/* Red Dot - Only show if there are unread notifications */}
                    {unreadCount > 0 && (
                        <span className="absolute top-0.5 xs:top-1 right-0.5 xs:right-1 w-2 xs:w-2.5 h-2 xs:h-2.5 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
                    )}
                </button>
            </div>

            {/* Notification Modal */}
            <NotificationModal
                isOpen={showNotificationModal}
                notifications={notifications}
                onClose={() => setShowNotificationModal(false)}
                onNotificationClick={handleNotificationClick}
                onMarkAllAsRead={handleMarkAllAsRead}
            />

            {/* Notification Detail Modal */}
            <NotificationDetailModal
                isOpen={showDetailModal}
                notification={selectedNotification}
                onClose={handleCloseDetailModal}
            />
        </header>
    );
});

Header.displayName = 'Header';

export default Header;
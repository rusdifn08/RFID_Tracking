import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../hooks/useAuth';
import { Menu, Bell } from 'lucide-react';

export default function Header() {
    const { isOpen, toggleSidebar } = useSidebar();
    const { user } = useAuth();

    return (
        <header
            className="bg-[#FBC02D] h-16 flex items-center justify-between px-6 fixed top-0 right-0 z-30 transition-all duration-300 ease-in-out shadow-sm"
            style={{ left: isOpen ? '15%' : '5rem', width: isOpen ? 'calc(100% - 15%)' : 'calc(100% - 5rem)' }}
        >
            {/* --- LEFT SECTION: Hamburger & Title --- */}
            <div className="flex items-center gap-4">
                {/* Hamburger Menu */}
                <button
                    onClick={toggleSidebar}
                    className="p-1 hover:bg-black/10 rounded transition-colors"
                    aria-label="Toggle sidebar"
                >
                    <Menu className="w-8 h-8 text-white md:text-blue-900" strokeWidth={2.5} />
                </button>

                {/* System Title */}
                <h1 className="text-white md:text-white font-bold text-lg md:text-xl tracking-wide drop-shadow-sm hidden sm:block">
                    Gistex Monitoring System
                </h1>
            </div>

            {/* --- RIGHT SECTION: MQTT, User, Notification --- */}
            <div className="flex items-center gap-4 md:gap-6">

                {/* MQTT Badge */}
                <div className="hidden md:flex bg-white px-3 py-1 rounded border border-gray-200 shadow-sm">
                    <span className="font-black text-gray-800 tracking-widest text-sm font-mono">
                        MQTT
                    </span>
                </div>

                {/* User Info */}
                <div className="flex flex-col items-end text-white leading-tight">
                    <span className="font-bold text-xs md:text-sm uppercase">
                        {user ? `HI, ${(user.name || '').toUpperCase()}` : 'HI, GUEST'}
                    </span>
                    <span className="text-[10px] md:text-xs font-light opacity-90">
                        {user?.bagian || user?.jabatan || 'Guest'}
                    </span>
                </div>

                {/* Notification Bell */}
                <button className="relative p-1">
                    <Bell className="w-6 h-6 text-white" />
                    {/* Red Dot */}
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-[#FBC02D] rounded-full"></span>
                </button>
            </div>
        </header>
    );
}
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../hooks/useAuth';
import { Menu, Bell, Radio } from 'lucide-react';

export default function Header() {
    const { isOpen, toggleSidebar } = useSidebar();
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <header
            className="bg-[#F9B935] h-16 flex items-center justify-between px-6 fixed top-0 right-0 z-30 transition-all duration-300 ease-in-out shadow-sm"
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

            {/* --- RIGHT SECTION: Checking RFID Button, MQTT, User, Notification --- */}
            <div className="flex items-center gap-3 md:gap-4">

                {/* Checking RFID Button - Futuristic Design */}
                <button
                    onClick={() => navigate('/checking-rfid')}
                    className="relative px-4 py-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-400 text-white font-bold rounded-lg shadow-lg shadow-cyan-500/50 hover:shadow-cyan-400/50 transition-all duration-300 transform hover:scale-105 active:scale-95 overflow-hidden group"
                >
                    {/* Animated background glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
                    
                    {/* Grid pattern overlay */}
                    <div className="absolute inset-0 opacity-20" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 10 0 L 0 0 0 10' fill='none' stroke='%23ffffff' stroke-width='0.5' opacity='0.3'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")`
                    }}></div>
                    
                    {/* Content */}
                    <div className="relative flex items-center gap-2">
                        <Radio className="w-4 h-4 md:w-5 md:h-5 group-hover:rotate-180 transition-transform duration-300" />
                        <span className="text-xs md:text-sm font-black uppercase tracking-wider">
                            Checking RFID
                        </span>
                    </div>
                    
                    {/* Shine effect */}
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                </button>

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
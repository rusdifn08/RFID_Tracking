import { useNavigate } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../hooks/useAuth';
import { Menu, Bell, Radio } from 'lucide-react';
import ReactLogo from '../assets/react.svg';
import TailwindLogo from '../assets/tailwind.svg';
import MqttLogo from '../assets/mqtt.svg';

export default function Header() {
    const { isOpen, toggleSidebar } = useSidebar();
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <header
            className="bg-[#F9B935] h-16 flex items-center justify-between px-2 sm:px-6 fixed top-0 right-0 z-30 transition-all duration-300 ease-in-out shadow-sm"
            style={{ left: isOpen ? '15%' : '5rem', width: isOpen ? 'calc(100% - 15%)' : 'calc(100% - 5rem)' }}
        >
            {/* --- LEFT SECTION: Hamburger & Title --- */}
            <div className="flex items-center gap-2 sm:gap-4">
                {/* Hamburger Menu - Lebih mepet di mobile */}
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

            {/* --- RIGHT SECTION: Logo Icons, Checking RFID Button, User, Notification --- */}
            <div className="flex items-center gap-3 md:gap-4">

                {/* Logo Icons */}
                <div className="flex items-center gap-2">
                    <img src={ReactLogo} alt="React" className="h-4 w-auto md:h-5 opacity-90 hover:opacity-100 transition-opacity" />
                    <img src={TailwindLogo} alt="Tailwind" className="h-4 w-auto md:h-5 opacity-90 hover:opacity-100 transition-opacity" />
                    <img src={MqttLogo} alt="MQTT" className="h-4 w-auto md:h-5 opacity-90 hover:opacity-100 transition-opacity" />
                </div>

                {/* Checking RFID Button - Minimalist & Professional */}
                <button
                    onClick={() => navigate('/checking-rfid')}
                    className="flex items-center gap-2 px-3 sm:px-5 py-2 bg-white text-[#F9B935] hover:bg-gray-50 font-bold rounded-full shadow-sm hover:shadow-md transition-all duration-300 group"
                >
                    <Radio className="w-4 h-4 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                    <span className="text-sm tracking-wide hidden sm:inline">CHECKING RFID</span>
                    <span className="text-sm tracking-wide sm:hidden">CHECK</span>
                </button>

                {/* User Info - Hidden di mobile/portrait */}
                <div className="hidden md:flex flex-col items-end text-white leading-tight">
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

            {/* Export Modal - Akan di-handle oleh parent component */}
        </header>
    );
}
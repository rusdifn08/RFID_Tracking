import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../hooks/useAuth';
import { Menu, Bell, Radio, X, Activity, CheckCircle2 } from 'lucide-react';
import ReactLogo from '../assets/react.svg';
import TailwindLogo from '../assets/tailwind.svg';
import MqttLogo from '../assets/mqtt.svg';
import BunLogo from '../assets/Bun.svg';
import FlaskLogo from '../assets/Flask.svg';

export default function Header() {
    const { isOpen, toggleSidebar } = useSidebar();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [showCheckRfidModal, setShowCheckRfidModal] = useState(false);

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
                    <img src={BunLogo} alt="Bun" className="h-4 w-auto md:h-5 opacity-90 hover:opacity-100 transition-opacity" />
                    <img src={FlaskLogo} alt="Flask" className="h-4 w-auto md:h-5 opacity-90 hover:opacity-100 transition-opacity" />
                </div>

                {/* Checking RFID Button - Minimalist & Professional */}
                <button
                    onClick={() => setShowCheckRfidModal(true)}
                    className="flex items-center gap-2 px-3 sm:px-5 py-2 bg-white text-[#F9B935] hover:bg-gray-50 font-bold rounded-full shadow-sm hover:shadow-md transition-all duration-300 group"
                >
                    <Radio className="w-4 h-4 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                    <span className="text-sm tracking-wide hidden sm:inline">CHECKING RFID</span>
                    <span className="text-sm tracking-wide sm:hidden">CHECK</span>
                </button>

                {/* User Info - Hidden di mobile/portrait */}
                <div className="hidden md:flex flex-col items-center text-white leading-tight">
                    <span className="font-bold text-xs md:text-sm uppercase">
                        {user ? `HI, ${(user.name || '').toUpperCase()}` : 'HI, GUEST'}
                    </span>
                    <span className="text-[10px] md:text-xs font-bold opacity-90 text-center">
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

            {/* Check RFID Modal */}
            {showCheckRfidModal && (
                <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white bg-opacity-95 backdrop-blur-md rounded-xl shadow-2xl w-full max-w-2xl flex flex-col border border-white border-opacity-20">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#F9B935] rounded-lg">
                                    <Radio className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">Pilih Tipe Checking RFID</h3>
                                    <p className="text-sm text-gray-600 mt-1">Pilih opsi yang ingin Anda gunakan</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCheckRfidModal(false)}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                            >
                                <X className="w-5 h-5 text-gray-500 hover:text-gray-700" strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-4 sm:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* RFID Tracking Garment */}
                                <button
                                    onClick={() => {
                                        setShowCheckRfidModal(false);
                                        navigate('/checking-rfid');
                                    }}
                                    className="group relative p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-500 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all duration-300 hover:shadow-lg hover:scale-105"
                                >
                                    <div className="flex flex-col items-center text-center gap-4">
                                        <div className="p-4 bg-white rounded-full shadow-md group-hover:scale-110 transition-transform">
                                            <Activity className="w-8 h-8 text-blue-600" strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-gray-800 mb-2">RFID Tracking Garment</h4>
                                            <p className="text-sm text-gray-600">Lacak perjalanan RFID melalui berbagai tahap produksi</p>
                                        </div>
                                    </div>
                                </button>

                                {/* RFID Status Garment */}
                                <button
                                    onClick={() => {
                                        setShowCheckRfidModal(false);
                                        navigate('/status-rfid');
                                    }}
                                    className="group relative p-6 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-500 rounded-xl hover:from-green-100 hover:to-green-200 transition-all duration-300 hover:shadow-lg hover:scale-105"
                                >
                                    <div className="flex flex-col items-center text-center gap-4">
                                        <div className="p-4 bg-white rounded-full shadow-md group-hover:scale-110 transition-transform">
                                            <CheckCircle2 className="w-8 h-8 text-green-600" strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-gray-800 mb-2">RFID Status Garment</h4>
                                            <p className="text-sm text-gray-600">Cek status dan informasi detail RFID garment</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end p-4 sm:p-6 border-t border-gray-200 flex-shrink-0">
                            <button
                                onClick={() => setShowCheckRfidModal(false)}
                                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors duration-200 font-semibold"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
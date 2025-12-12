import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../hooks/useAuth';
import { Menu, Bell, Radio, X, Activity, CheckCircle2 } from 'lucide-react';
import headerIcon from '../assets/header.svg';
import handIcon from '../assets/hand.svg';

export default function Header() {
    const { isOpen, toggleSidebar } = useSidebar();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [showCheckRfidModal, setShowCheckRfidModal] = useState(false);

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

                {/* Header Icon */}
                <img src={headerIcon} alt="Header" className="w-6 xs:w-7 sm:w-8 md:w-10 h-6 xs:h-7 sm:h-8 md:h-10" />

                {/* System Title */}
                <h1 className="font-bold text-xs xs:text-xs sm:text-sm md:text-md lg:text-lg xl:text-xl tracking-wide" style={{ color: '#414345', textTransform: 'capitalize', fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                    <span className="hidden sm:inline">Gistex Monitoring System</span>
                    <span className="sm:hidden">Gistex</span>
                </h1>
            </div>

            {/* --- RIGHT SECTION: Checking RFID Button, User, Notification --- */}
            <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 lg:gap-4">

                {/* Checking RFID Button - Minimalist & Professional */}
                <button
                    onClick={() => setShowCheckRfidModal(true)}
                    className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 px-2 xs:px-2.5 sm:px-3 md:px-4 lg:px-5 py-1.5 xs:py-2 bg-blue-600 text-white hover:bg-blue-700 font-bold rounded-full shadow-sm hover:shadow-md transition-all duration-300 group text-[10px] xs:text-xs sm:text-sm"
                >
                    <Radio className="w-3 xs:w-3.5 sm:w-4 h-3 xs:h-3.5 sm:h-4 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                    <span className="tracking-wide hidden sm:inline">CHECKING RFID</span>
                    <span className="tracking-wide sm:hidden">CHECK</span>
                </button>

                {/* Hand Icon */}
                <img src={handIcon} alt="Hand" className="w-5 xs:w-6 sm:w-7 h-5 xs:h-6 sm:h-7 object-contain" />

                {/* User Info - Hidden di mobile/portrait */}
                <div className="hidden md:flex flex-col items-center leading-tight">
                    <span className="font-bold text-[10px] md:text-xs lg:text-sm uppercase" style={{ color: '#42464a' }}>
                        {user ? `HI, ${(user.name || '').toUpperCase()}` : 'HI, GUEST'}
                    </span>
                    <span className="text-[9px] md:text-[10px] lg:text-xs font-bold text-center" style={{ color: '#54585c' }}>
                        {user?.bagian || user?.jabatan || 'Guest'}
                    </span>
                </div>

                {/* Notification Bell */}
                <button className="relative p-0.5 xs:p-1 hover:bg-gray-100 rounded transition-colors">
                    <Bell className="w-4 xs:w-5 sm:w-6 h-4 xs:h-5 sm:h-6 text-gray-700" />
                    {/* Red Dot */}
                    <span className="absolute top-0.5 xs:top-1 right-0.5 xs:right-1 w-2 xs:w-2.5 h-2 xs:h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                </button>
            </div>

            {/* Check RFID Modal */}
            {showCheckRfidModal && (
                <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center z-50 p-2 xs:p-3 sm:p-4">
                    <div className="bg-white bg-opacity-95 backdrop-blur-md rounded-lg xs:rounded-xl shadow-2xl w-full max-w-2xl flex flex-col border border-white border-opacity-20">
                        {/* Header */}
                        <div className="flex items-center justify-between p-2 xs:p-3 sm:p-4 md:p-6 border-b border-gray-200 flex-shrink-0">
                            <div className="flex items-center gap-2 xs:gap-2.5 sm:gap-3 flex-1 min-w-0">
                                <div className="p-1.5 xs:p-2 bg-[#F9B935] rounded-lg flex-shrink-0">
                                    <Radio className="w-4 xs:w-4.5 sm:w-5 h-4 xs:h-4.5 sm:h-5 text-white" strokeWidth={2.5} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm xs:text-base sm:text-lg font-bold text-gray-800">Pilih Tipe Checking RFID</h3>
                                    <p className="text-[10px] xs:text-xs sm:text-sm text-gray-600 mt-0.5 xs:mt-1">Pilih opsi yang ingin Anda gunakan</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCheckRfidModal(false)}
                                className="p-1 xs:p-1.5 hover:bg-gray-100 rounded-lg transition-colors duration-200 flex-shrink-0"
                            >
                                <X className="w-4 xs:w-4.5 sm:w-5 h-4 xs:h-4.5 sm:h-5 text-gray-500 hover:text-gray-700" strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-2 xs:p-3 sm:p-4 md:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 xs:gap-3 sm:gap-4">
                                {/* RFID Tracking Garment */}
                                <button
                                    onClick={() => {
                                        setShowCheckRfidModal(false);
                                        navigate('/checking-rfid');
                                    }}
                                    className="group relative p-3 xs:p-4 sm:p-5 md:p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-500 rounded-lg xs:rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all duration-300 hover:shadow-lg hover:scale-105"
                                >
                                    <div className="flex flex-col items-center text-center gap-2 xs:gap-3 sm:gap-4">
                                        <div className="p-2 xs:p-3 sm:p-4 bg-white rounded-full shadow-md group-hover:scale-110 transition-transform">
                                            <Activity className="w-6 xs:w-7 sm:w-8 h-6 xs:h-7 sm:h-8 text-blue-600" strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm xs:text-base sm:text-lg font-bold text-gray-800 mb-1 xs:mb-2">RFID Tracking Garment</h4>
                                            <p className="text-[10px] xs:text-xs sm:text-sm text-gray-600">Lacak perjalanan RFID melalui berbagai tahap produksi</p>
                                        </div>
                                    </div>
                                </button>

                                {/* RFID Status Garment */}
                                <button
                                    onClick={() => {
                                        setShowCheckRfidModal(false);
                                        navigate('/status-rfid');
                                    }}
                                    className="group relative p-3 xs:p-4 sm:p-5 md:p-6 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-500 rounded-lg xs:rounded-xl hover:from-green-100 hover:to-green-200 transition-all duration-300 hover:shadow-lg hover:scale-105"
                                >
                                    <div className="flex flex-col items-center text-center gap-2 xs:gap-3 sm:gap-4">
                                        <div className="p-2 xs:p-3 sm:p-4 bg-white rounded-full shadow-md group-hover:scale-110 transition-transform">
                                            <CheckCircle2 className="w-6 xs:w-7 sm:w-8 h-6 xs:h-7 sm:h-8 text-green-600" strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm xs:text-base sm:text-lg font-bold text-gray-800 mb-1 xs:mb-2">RFID Status Garment</h4>
                                            <p className="text-[10px] xs:text-xs sm:text-sm text-gray-600">Cek status dan informasi detail RFID garment</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end p-2 xs:p-3 sm:p-4 md:p-6 border-t border-gray-200 flex-shrink-0">
                            <button
                                onClick={() => setShowCheckRfidModal(false)}
                                className="px-4 xs:px-5 sm:px-6 py-1.5 xs:py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors duration-200 font-semibold text-[10px] xs:text-xs sm:text-sm"
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
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import { useSidebar } from '../context/SidebarContext';
import backgroundImage from '../assets/background.jpg';

// Material-UI Imports
import { Paper } from '@mui/material';
import {
    Dashboard as DashboardIcon,
    EventNote as ListRfidIcon,
} from '@mui/icons-material';

export default function RejectRoom() {
    const navigate = useNavigate();
    const { isOpen } = useSidebar();
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

    const cards = [
        {
            id: 1,
            title: 'Dashboard RFID Reject',
            subtitle: 'Monitoring Real-time Reject Room',
            icon: DashboardIcon,
            path: '/dashboard-rfid-reject',
        },
        {
            id: 2,
            title: 'List RFID Reject',
            subtitle: 'Database & Log Reject',
            icon: ListRfidIcon,
            path: '/list-rfid-reject',
        },
    ];

    return (
        <div
            className="flex min-h-screen w-full h-screen font-sans text-slate-800 overflow-hidden fixed inset-0 m-0 p-0"
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed',
            }}
        >
            {/* Sidebar */}
            <div className="fixed left-0 top-0 h-full z-50 shadow-xl">
                <Sidebar />
            </div>

            {/* Main Content Area */}
            <div
                className="flex flex-col w-full h-screen transition-all duration-300 ease-in-out relative"
                style={{
                    marginLeft: isOpen ? '18%' : '5rem',
                    width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)',
                }}
            >
                {/* Header */}
                <div className="sticky top-0 z-40 shadow-md">
                    <Header />
                </div>

                {/* Breadcrumb */}
                <Breadcrumb />

                {/* Main Content */}
                <main
                    className="flex-1 w-full overflow-y-auto px-2 xs:px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 relative"
                    style={{
                        paddingTop: 'clamp(0.5rem, 1vh, 1rem)',
                        paddingBottom: 'clamp(4rem, 8vh, 5rem)',
                        minHeight: 0,
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#cbd5e1 #f1f5f9',
                    }}
                >
                    {/* --- CARDS GRID --- */}
                    <div
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4 sm:gap-5 md:gap-6 max-w-6xl mx-auto mt-3"
                        onMouseLeave={() => setHoveredCard(null)}
                    >
                        {cards.map((card, index) => {
                            const isHovered = hoveredCard === card.id;
                            const isDimmed = hoveredCard !== null && hoveredCard !== card.id;

                            return (
                                <div
                                    key={card.id}
                                    onClick={() => navigate(card.path)}
                                    onMouseEnter={() => setHoveredCard(card.id)}
                                    className="relative group cursor-pointer transition-all duration-300"
                                    style={{
                                        animation: `fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards ${index * 150}ms`,
                                        opacity: 0,
                                        zIndex: isHovered ? 10 : 1,
                                    }}
                                >
                                    <Paper
                                        elevation={0}
                                        className="relative flex flex-col p-4 xs:p-5 sm:p-6 bg-white transition-all duration-300"
                                        style={{
                                            borderRadius: '16px',
                                            boxShadow: isHovered
                                                ? '0 10px 40px -10px rgba(239, 68, 68, 0.3)'
                                                : '0 4px 20px -5px rgba(0,0,0,0.1)',
                                            transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                                            filter: isDimmed ? 'grayscale(100%)' : 'none',
                                            opacity: isDimmed ? 0.5 : 1,
                                            border: '1px solid rgba(248, 113, 113, 0.4)',
                                        }}
                                    >
                                        {/* Icon - Nuansa biru merah untuk reject */}
                                        <div className="mb-3 xs:mb-4 flex items-center justify-start">
                                            <div className="flex items-center justify-center">
                                                <card.icon
                                                    sx={{
                                                        fontSize: 'clamp(32px, 4vw, 48px)',
                                                        background: isDimmed
                                                            ? 'linear-gradient(135deg, #9CA3AF, #6B7280)'
                                                            : 'linear-gradient(135deg, #0ea5e9, #ef4444)',
                                                        WebkitBackgroundClip: 'text',
                                                        color: 'transparent',
                                                        transition: 'all 0.3s ease',
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Text Content */}
                                        <div className="flex-1">
                                            <h3
                                                className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold leading-tight mb-1 xs:mb-1.5 sm:mb-2 transition-colors duration-300"
                                                style={{
                                                    color: isDimmed
                                                        ? '#9CA3AF'
                                                        : isHovered
                                                        ? '#b91c1c'
                                                        : '#dc2626',
                                                    textTransform: 'capitalize',
                                                }}
                                            >
                                                {card.title}
                                            </h3>
                                            <p
                                                className="text-xs xs:text-sm sm:text-base font-medium leading-relaxed transition-colors duration-300"
                                                style={{
                                                    color: isHovered
                                                        ? '#0f172a'
                                                        : isDimmed
                                                        ? '#9CA3AF'
                                                        : '#6B7280',
                                                    textTransform: 'capitalize',
                                                }}
                                            >
                                                {card.subtitle}
                                            </p>
                                        </div>
                                    </Paper>
                                </div>
                            );
                        })}
                    </div>
                </main>

                {/* Footer - Transparan di belakang konten */}
                <footer
                    className="absolute bottom-0 left-0 right-0 py-4 border-t border-gray-200/50 pointer-events-none"
                    style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                        backdropFilter: 'blur(2px)',
                        zIndex: -1,
                    }}
                >
                    <div
                        className="text-center text-gray-600 text-sm pointer-events-auto"
                        style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}
                    >
                        Gistex Garmen Indonesia Monitoring System (GMS) © 2025 Served by Supernova
                    </div>
                </footer>
            </div>

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(40px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                /* Custom Scrollbar */
                main::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                main::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 4px;
                }
                main::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                }
                main::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div>
    );
}




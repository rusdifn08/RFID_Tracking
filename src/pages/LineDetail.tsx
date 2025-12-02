import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useState } from 'react';
import { useSidebar } from '../context/SidebarContext';

// Material-UI Imports
import { Paper } from '@mui/material';
import {
    Dns as DaftarRfidIcon,
    Dashboard as DashboardIcon,
    EventNote as ListRfidIcon,
    ArrowForward as ArrowRightIcon,
    Person as UserIcon,
    Factory as FactoryIcon
} from '@mui/icons-material';

export default function LineDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isOpen } = useSidebar();
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

    // --- DATA & CONFIG ---
    // Data lengkap untuk semua production lines (sama dengan RFIDLineContent.tsx)
    const productionLines = [
        {
            id: 1,
            title: 'SEWING LINE 1',
            supervisor: 'Risman ',
        },
        {
            id: 2,
            title: 'SEWING LINE 2',
            supervisor: 'Asep Supriadi',
        },
        {
            id: 3,
            title: 'SEWING LINE 3',
            supervisor: '-',
        },
        {
            id: 4,
            title: 'SEWING LINE 4',
            supervisor: 'Agus Bencoy',
        },
        {
            id: 5,
            title: 'SEWING LINE 5',
            supervisor: 'Euis Sutisna',
        },
        {
            id: 6,
            title: 'SEWING LINE 6',
            supervisor: 'Tatang Beratang',
        },
        {
            id: 7,
            title: 'CUTTING GM1',
            supervisor: 'Agus Bencoy',
        },
        {
            id: 8,
            title: 'SEWING LINE 8',
            supervisor: 'Euis Sutisna',
        },
        {
            id: 9,
            title: 'SEWING LINE 9',
            supervisor: 'Tatang Beratang',
        },
    ];

    const lineId = Number(id);
    const currentLine = productionLines.find(line => line.id === lineId) || {
        title: 'Line Production',
        supervisor: '-'
    };

    const cards = [
        {
            id: 1,
            title: 'DAFTAR RFID',
            subtitle: 'Registrasi Tag Baru',
            icon: DaftarRfidIcon,
            path: '/daftar-rfid',
            color: { main: '#8B5CF6', light: '#F3E8FF', shadow: 'rgba(139, 92, 246, 0.5)' }
        },
        {
            id: 2,
            title: 'DASHBOARD RFID',
            subtitle: 'Monitoring Real-time',
            icon: DashboardIcon,
            path: `/dashboard-rfid/${id}`,
            color: { main: '#EC4899', light: '#FCE7F3', shadow: 'rgba(236, 72, 153, 0.5)' }
        },
        {
            id: 3,
            title: 'LIST RFID',
            subtitle: 'Database & Log',
            icon: ListRfidIcon,
            path: `/list-rfid/${id}`,
            color: { main: '#F59E0B', light: '#FEF3C7', shadow: 'rgba(245, 158, 11, 0.5)' }
        },
    ];

    return (
        <div className="flex min-h-screen bg-[#F8F9FA] font-sans text-slate-800 overflow-hidden">
            {/* Sidebar */}
            <div className="fixed left-0 top-0 h-full z-50 shadow-xl">
                <Sidebar />
            </div>

            {/* Main Content Area */}
            <div
                className="flex flex-col w-full h-screen transition-all duration-300 ease-in-out"
                style={{
                    marginLeft: isOpen ? '15%' : '5rem',
                    width: isOpen ? 'calc(100% - 15%)' : 'calc(100% - 5rem)'
                }}
            >
                {/* Header */}
                <div className="sticky top-0 z-40 shadow-md">
                    <Header />
                </div>

                {/* Main Content */}
                <main
                    className="flex-1 w-full overflow-y-auto bg-[#F8F9FA] pt-8 pb-8 px-6 md:px-8 lg:px-10 h-full"
                    style={{
                        marginTop: '1rem'
                    }}
                >

                    {/* --- TITLE SECTION --- */}
                    <div className="flex flex-col items-center justify-center animate-fade-in-down text-center">
                        <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
                            <FactoryIcon sx={{ fontSize: 42, color: '#334155' }} />
                        </div>

                        <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                            {currentLine.title}
                        </h1>

                        <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-white rounded-full shadow-sm border border-slate-100">
                            <div className="p-1.5 bg-slate-100 rounded-full">
                                <UserIcon sx={{ fontSize: 18, color: '#64748B' }} />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Supervisor</span>
                                <span className="text-sm font-black text-slate-800 uppercase">
                                    {currentLine.supervisor && currentLine.supervisor.trim() !== '-' ? currentLine.supervisor : 'Not Assigned'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* --- CARDS GRID --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 lg:gap-8 max-w-7xl mx-auto">
                        {cards.map((card, index) => {
                            const isHovered = hoveredCard === card.id;
                            const isDimmed = hoveredCard !== null && hoveredCard !== card.id;

                            return (
                                <div
                                    key={card.id}
                                    onClick={() => navigate(card.path)}
                                    onMouseEnter={() => setHoveredCard(card.id)}
                                    onMouseLeave={() => setHoveredCard(null)}
                                    className={`
                                            gap-10
                                            relative h-full group cursor-pointer
                                            transition-all duration-500 ease-out
                                            ${isDimmed ? 'grayscale blur-[1px] opacity-60 scale-95' : 'opacity-100 scale-100'}
                                            ${isHovered ? 'z-20' : 'z-0'}
                                        `}
                                    style={{
                                        animation: `fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards ${index * 150}ms`,
                                        opacity: 0
                                    }}
                                >
                                    <Paper
                                        elevation={0}
                                        className="relative flex items-center p-4 sm:p-5 md:p-6 lg:p-8 min-h-[140px] sm:min-h-[160px] md:min-h-[170px] lg:min-h-[180px] bg-white border-2 transition-all duration-500"
                                        style={{
                                            borderRadius: '35px',
                                            overflow: 'visible',
                                            borderColor: isHovered ? card.color.main : '#ECF5FF',
                                            boxShadow: isHovered
                                                ? `0 30px 60px -15px ${card.color.shadow}`
                                                : '0 10px 30px -10px rgba(0,0,0,0.05)',
                                            transform: isHovered ? 'translateY(-10px)' : 'translateY(0)'
                                        }}
                                    >
                                        {/* Icon Container */}
                                        <div
                                            className="w-[60px] h-[60px] sm:w-[70px] sm:h-[70px] md:w-[80px] md:h-[80px] lg:w-[88px] lg:h-[88px] rounded-[16px] sm:rounded-[18px] md:rounded-[20px] flex items-center justify-center shrink-0 transition-transform duration-500"
                                            style={{
                                                backgroundColor: card.color.light,
                                                color: card.color.main,
                                                transform: isHovered ? 'scale(1.1) rotate(-5deg)' : 'scale(1)',
                                                marginLeft: '-30px',
                                                marginRight: '8%',
                                            }}
                                        >
                                            <card.icon sx={{ fontSize: 'clamp(28px, 4vw, 40px)' }} />
                                        </div>

                                        {/* Text Content */}
                                        <div className="flex-1 pr-6 sm:pr-8 overflow-hidden">
                                            <h3
                                                className="text-base sm:text-sm md:text-md lg:text-lg font-black leading-tight mb-1 sm:mb-1.5 transition-colors duration-300 truncate"
                                                style={{ color: isHovered ? card.color.main : '#0073EE' }}
                                            >
                                                {card.title}
                                            </h3>
                                            <p className="text-xs sm:text-sm md:text-base font-semibold text-slate-400 tracking-wide truncate">
                                                {card.subtitle}
                                            </p>
                                        </div>

                                        {/* Floating Arrow Button */}
                                        <div
                                            className="absolute top-1/2 right-0 flex items-center justify-center shadow-lg transition-all duration-500"
                                            style={{
                                                width: 'clamp(50px, 6vw, 60px)',
                                                height: 'clamp(50px, 6vw, 60px)',
                                                borderRadius: '50%',
                                                transform: 'translate(50%, -50%) scale(1)',
                                                backgroundColor: isHovered ? card.color.main : '#F1F5F9',
                                                color: isHovered ? '#fff' : '#94A3B8',
                                                boxShadow: isHovered ? `0 10px 25px -5px ${card.color.shadow}` : 'none'
                                            }}
                                        >
                                            <ArrowRightIcon
                                                sx={{
                                                    fontSize: 'clamp(22px, 3vw, 28px)',
                                                    transition: 'transform 0.3s',
                                                    transform: isHovered ? 'translateX(4px)' : 'translateX(0)'
                                                }}
                                            />
                                        </div>
                                    </Paper>
                                </div>
                            );
                        })}
                    </div>
                </main>
            </div>

            <style>{`
                    @keyframes fadeInUp {
                        from { opacity: 0; transform: translateY(40px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes fadeInDown {
                        from { opacity: 0; transform: translateY(-40px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .animate-fade-in-down {
                        animation: fadeInDown 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    }
                `}</style>
        </div >
    );
}
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';
import { useState } from 'react';

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
    const { isOpen } = useSidebar(); // Mengambil state sidebar terbuka/tutup
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
            path: '/list-rfid',
            color: { main: '#F59E0B', light: '#FEF3C7', shadow: 'rgba(245, 158, 11, 0.5)' }
        },
    ];

    // --- DEFINISI UKURAN SIDEBAR (Agar Sinkron) ---
    // Pastikan nilai ini SAMA dengan w-[...] di component Sidebar.tsx Anda
    const sidebarWidthOpen = '19%';
    const sidebarWidthClosed = '8%';

    return (
        <div className=" flex min-h-screen bg-[#F8F9FA] font-sans text-slate-800 overflow-x-hidden p-20 m-10">

            {/* 1. SIDEBAR (Fixed Position) */}
            {/* Sidebar berdiri sendiri di layer paling atas (z-50) sebelah kiri */}
            <Sidebar />

            {/* 2. CONTENT WRAPPER (Header + Main Page) */}
            {/* Wrapper ini yang kita dorong ke kanan menggunakan Margin Left */}
            <div
                className="flex-1 flex flex-col min-h-screen transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]"
                style={{
                    // PENTING: Menggunakan inline style untuk memaksa layout bergeser
                    marginTop: '4rem',
                    marginLeft: isOpen ? sidebarWidthOpen : sidebarWidthClosed,
                    width: `calc(100% - ${isOpen ? sidebarWidthOpen : sidebarWidthClosed})`
                }}
            >
                {/* 3. HEADER (Sticky) */}
                {/* Sticky membuat header menempel di atas wrapper ini, bukan di layar viewport */}
                <div className="bg-green-500 sticky top-0 z-40 w-full">
                    <Header />
                </div>

                {/* 4. MAIN CONTENT */}
                {/* Padding top disesuaikan agar tidak terlalu mepet header */}
                <main className="flex-1 p-6 md:p-10 pt-12 w-full max-w-[1920px] mx-auto gap-10 h-100">

                    {/* --- TITLE SECTION --- */}
                    <div className="h-50 md:h-40 mb-20 flex flex-col items-center justify-center  animate-fade-in-down text-center"
                        style={{

                        }}
                    >
                        <div className="w-25 h-25 md:w-25 md:h-25 bg-white rounded-[25px] shadow-sm border border-slate-100 flex items-center justify-center mb-5">
                            <FactoryIcon sx={{ fontSize: 42, color: '#334155' }} />
                        </div>

                        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                            {currentLine.title}
                        </h1>

                        <div className="inline-flex h-10 items-center gap-3 px-6 py-2.5 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100">
                            <div className="p-1.5 bg-slate-100 rounded-full">
                                <UserIcon sx={{ fontSize: 18, color: '#64748B' }} />
                            </div>
                            <div className="text-left flex flex-col md:flex-row md:items-center md:gap-2 h-10 w-full content-center justify-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider content-left items-left text-left">Supervisor</span>
                                <span className="text-sm font-black text-slate-800 uppercase">
                                    {currentLine.supervisor && currentLine.supervisor.trim() !== '-' ? currentLine.supervisor : 'Not Assigned'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* --- CARDS GRID --- */}
                    <div className="h-10"></div>
                    <div className="md-h-50 h-fit gap-10 item-center content-center 
                                    justify-center grid grid-cols-1 md:grid-cols-3 
                                    xl:grid-cols-3 2xl:grid-cols-3 gap-x10 gap-y-10
                                    md:gap-x-20 2xl:gap-x-20 md:gap-y-30 2xl:gap-y-40 pt-20 pr-10"
                        style={{

                            paddingRight: '3%',

                        }}
                    >
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
                                        className="relative flex items-center p-6 min-h-[170px] bg-white border transition-all duration-500"
                                        style={{
                                            borderRadius: '35px',
                                            overflow: 'visible',
                                            borderColor: isHovered ? card.color.main : 'transparent',
                                            boxShadow: isHovered
                                                ? `0 30px 60px -15px ${card.color.shadow}`
                                                : '0 10px 30px -10px rgba(0,0,0,0.05)',
                                            transform: isHovered ? 'translateY(-10px)' : 'translateY(0)'
                                        }}
                                    >
                                        {/* Icon Container */}
                                        <div
                                            className="w-[80px] h-[80px] md:w-[88px] md:h-[88px] rounded-[20px] flex items-center justify-center mr-5 shrink-0 transition-transform duration-500"
                                            style={{
                                                backgroundColor: card.color.light,
                                                color: card.color.main,
                                                transform: isHovered ? 'scale(1.1) rotate(-5deg)' : 'scale(1)',
                                                marginLeft: '-40px',
                                                marginRight: '10%',
                                            }}
                                        >
                                            <card.icon sx={{ fontSize: 40 }} />
                                        </div>

                                        {/* Text Content */}
                                        <div className="flex-1 pr-8 overflow-hidden">
                                            <h3
                                                className="text-lg md:text-xl font-black text-slate-800 leading-tight mb-1.5 transition-colors duration-300 truncate"
                                                style={{ color: isHovered ? card.color.main : '#1e293b' }}
                                            >
                                                {card.title}
                                            </h3>
                                            <p className="text-xs md:text-sm font-semibold text-slate-400 tracking-wide truncate">
                                                {card.subtitle}
                                            </p>
                                        </div>

                                        {/* Floating Arrow Button */}
                                        <div
                                            className="absolute top-1/2 right-0 flex items-center justify-center shadow-lg transition-all duration-500"
                                            style={{
                                                width: '60px',
                                                height: '60px',
                                                borderRadius: '50%',
                                                transform: 'translate(50%, -50%) scale(1)',
                                                backgroundColor: isHovered ? card.color.main : '#F1F5F9',
                                                color: isHovered ? '#fff' : '#94A3B8',
                                                boxShadow: isHovered ? `0 10px 25px -5px ${card.color.shadow}` : 'none'
                                            }}
                                        >
                                            <ArrowRightIcon
                                                sx={{
                                                    fontSize: 28,
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
            </div >

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
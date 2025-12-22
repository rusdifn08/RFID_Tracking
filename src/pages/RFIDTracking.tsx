import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import { useSidebar } from '../context/SidebarContext';
import backgroundImage from '../assets/background.jpg';
import { Factory, Package, XCircle } from 'lucide-react';

export default function RFIDTracking() {
    const { isOpen } = useSidebar();
    const navigate = useNavigate();
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);

    const cards = [
        {
            id: 'production-line',
            title: 'Production Line',
            subtitle: 'Real-time Tracking of Production Lines',
            icon: Factory,
            bgStart: 'from-blue-400',
            bgEnd: 'to-blue-700',
            shadow: 'shadow-blue-200',
            onClick: () => navigate('/monitoring-rfid')
        },
        {
            id: 'finishing',
            title: 'Finishing',
            subtitle: 'Monitor dan kelola finishing process',
            icon: Package,
            bgStart: 'from-cyan-400',
            bgEnd: 'to-cyan-600',
            shadow: 'shadow-cyan-200',
            onClick: () => navigate('/finishing')
        },
        {
            id: 'reject-room',
            title: 'Reject Room',
            subtitle: 'Dashboard & list data reject finishing',
            icon: XCircle,
            bgStart: 'from-blue-500',
            bgEnd: 'to-red-500',
            shadow: 'shadow-red-200',
            onClick: () => navigate('/reject-room')
        }
    ];

    return (
        <div className="flex min-h-screen w-full h-screen fixed inset-0 m-0 p-0"
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed',
            }}
        >
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div
                className="flex flex-col w-full min-h-screen transition-all duration-300 ease-in-out relative"
                style={{ marginLeft: isOpen ? '18%' : '5rem', width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)' }}
            >
                {/* Header */}
                <Header />

                {/* Breadcrumb */}
                <Breadcrumb />

                {/* Content */}
                <main
                    className="flex-1 w-full overflow-y-auto relative"
                    style={{
                        padding: 'clamp(0.5rem, 2vw, 2rem) clamp(0.5rem, 3vw, 1rem)',
                        paddingBottom: '5rem',
                        marginTop: '0',
                        overflow: 'hidden',
                    }}
                >
                    {/* Grid Container */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-2 xs:gap-2.5 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6 2xl:gap-8 w-full max-w-7xl mx-auto px-2 xs:px-3 sm:px-4"
                    >
                        {cards.map((card, index) => {
                            const IconComponent = card.icon;
                            const isHovered = hoveredCard === card.id;

                            return (
                                <div
                                    key={card.id}
                                    onClick={card.onClick}
                                    onMouseEnter={() => setHoveredCard(card.id)}
                                    onMouseLeave={() => setHoveredCard(null)}
                                    className={`
                                        group relative bg-white rounded-md xs:rounded-xl sm:rounded-[1rem] md:rounded-[2rem] 
                                        border border-slate-100
                                        shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)]
                                        cursor-pointer
                                        flex flex-col 
                                        transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)
                                        hover:-translate-y-2 xs:hover:-translate-y-3 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]
                                        animate-fade-in-up
                                        overflow-hidden
                                    `}
                                    style={{
                                        animationDelay: `${index * 150}ms`,
                                        zIndex: 1,
                                        aspectRatio: '5/3',
                                        minHeight: 'clamp(100px, 25vh, 280px)',
                                        padding: 'clamp(0.5rem, 1.5vw, 1rem)'
                                    }}
                                >
                                    {/* Hover Effect: Gradient Stroke at Top */}
                                    <div className={`absolute top-0 left-0 w-full h-1 xs:h-1.5 sm:h-2 bg-gradient-to-r ${card.bgStart} ${card.bgEnd} transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}></div>

                                    {/* Hover Effect: Background Glow */}
                                    <div className={`absolute inset-0 rounded-2xl xs:rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-br ${card.bgStart} ${card.bgEnd} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500 pointer-events-none`}></div>

                                    {/* Content Bagian Atas (Icon & Text) */}
                                    <div className="flex flex-col items-center justify-center w-full flex-1" style={{
                                        paddingTop: 'clamp(0.25rem, 1.5vh, 0.75rem)',
                                    }}>
                                        {/* Icon (Centered & Big) - Tanpa lingkaran, hanya icon dengan gradasi */}
                                        <div className="relative mb-1 xs:mb-1.5 sm:mb-2 md:mb-2.5 lg:mb-3 flex items-center justify-center transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 flex-shrink-0">
                                            <div className="relative" style={{
                                                width: 'clamp(2rem, 5vw, 4rem)',
                                                height: 'clamp(2rem, 5vw, 4rem)'
                                            }}>
                                                <svg width="0" height="0" style={{ position: 'absolute' }}>
                                                    <defs>
                                                        <linearGradient id={`iconGradient-${card.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                                            {card.id === 'production-line' && (
                                                                <>
                                                                    <stop offset="0%" stopColor="#38bdf8" />
                                                                    <stop offset="100%" stopColor="#1e40af" />
                                                                </>
                                                            )}
                                                            {card.id === 'finishing' && (
                                                                <>
                                                                    <stop offset="0%" stopColor="#22d3ee" />
                                                                    <stop offset="100%" stopColor="#0284c7" />
                                                                </>
                                                            )}
                                                            {card.id === 'reject-room' && (
                                                                <>
                                                                    <stop offset="0%" stopColor="#0ea5e9" />
                                                                    <stop offset="100%" stopColor="#ef4444" />
                                                                </>
                                                            )}
                                                        </linearGradient>
                                                    </defs>
                                                </svg>
                                                <IconComponent
                                                    className="w-full h-full"
                                                    strokeWidth={2.5}
                                                    style={{
                                                        stroke: `url(#iconGradient-${card.id})`,
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Text (Centered) */}
                                        <h3 className="font-bold mb-0.5 xs:mb-0.75 sm:mb-1 md:mb-1.5 text-center transition-colors duration-300 flex-shrink-0 w-full"
                                            style={{
                                                fontSize: 'clamp(0.875rem, 2.2vw, 1.875rem)',
                                                color: isHovered ? (card.id === 'production-line' ? '#0073EE' : '#0284C7') : (card.id === 'production-line' ? '#0073EE' : '#0284C7'),
                                                lineHeight: '1.3',
                                                fontFamily: 'Poppins, sans-serif',
                                                fontWeight: 700
                                            }}
                                        >
                                            {card.title}
                                        </h3>
                                        <p className="text-slate-400 font-medium tracking-wider text-center flex-shrink-0 w-full"
                                            style={{
                                                fontSize: 'clamp(0.4rem, 1vw, 0.6rem)',
                                                lineHeight: '1.4',
                                                wordBreak: 'break-word',
                                                overflowWrap: 'break-word',
                                                fontFamily: 'Poppins, sans-serif',
                                                fontWeight: 400
                                            }}
                                        >
                                            {card.subtitle}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </main>

                {/* Footer */}
                <footer
                    className="absolute bottom-0 left-0 right-0 py-4 border-t border-gray-200/50 pointer-events-none"
                    style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                        backdropFilter: 'blur(2px)',
                        zIndex: -1
                    }}
                >
                    <div className="text-center text-gray-600 text-sm pointer-events-auto" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
                        Gistex Garmen Indonesia Monitoring System (GMS) © 2025 Served by Supernova
                    </div>
                </footer>
            </div>

            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(40px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
}


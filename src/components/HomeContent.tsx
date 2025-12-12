import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rss, ArrowRight, MapPin } from 'lucide-react';

export default function HomeContent() {
    const navigate = useNavigate();
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

    const modules = [
        {
            id: 1,
            title: 'RFID Tracking',
            subtitle: 'Real-time Tracking of Garment Data',
            location: '9 Locations',
            icon: Rss,
            color: 'text-[#0073EE]',
            bgStart: 'from-sky-400',
            bgEnd: 'to-blue-800',
            shadow: 'shadow-blue-200',
            lightBg: 'bg-blue-50'
        },
    ];

    const handleModuleClick = (moduleId: number) => {
        if (moduleId === 1) navigate('/monitoring-rfid');
    };

    return (
        // CONTAINER UTAMA:
        // md:pl-80: Memberi jarak aman dari Sidebar kiri (sekitar 320px)
        // pt-32: Memberi jarak aman dari Header atas
        // pr-8: Memberi jarak kanan agar seimbang
        <div className="w-full h-full transition-all duration-300 relative flex items-center justify-center"
            style={{
                padding: '2rem 1rem',
                overflow: 'hidden',
            }}
        >
            {/* --- GRID CONTAINER --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-7 2xl:gap-8 w-full max-w-7xl mx-auto"
                >
                {modules.map((module, index) => {
                    const IconComponent = module.icon;
                    const isHovered = hoveredCard === module.id;

                    return (
                        <div
                            key={module.id}
                            onClick={() => handleModuleClick(module.id)}
                            onMouseEnter={() => setHoveredCard(module.id)}
                            onMouseLeave={() => setHoveredCard(null)}
                            style={{ 
                                animationDelay: `${index * 150}ms`,
                                zIndex: 1
                            }}
                            // CARD STYLING:Select a monitoring module below to view detailed analytics and real-time status reports.i
                            // Flex-col & items-center: Kunci agar isi berada di tengah (center alignment)
                            // h-[380px]: Tinggi yang proporsional untuk menampung layout vertikal
                            className={`
                                group relative aspect-[3/2] bg-white rounded-2xl xs:rounded-[2rem] sm:rounded-[2.5rem] p-1
                                border border-slate-100
                                shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)]
                                cursor-pointer
                                flex flex-col items-center justify-between
                                transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)
                                hover:-translate-y-3 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]
                                animate-fade-in-up
                                overflow-hidden
                            `}
                        >
                            {/* Hover Effect: Gradient Stroke at Top */}
                            <div className={`absolute top-0 left-0 w-full h-1 xs:h-1.5 sm:h-2 bg-gradient-to-r ${module.bgStart} ${module.bgEnd} transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}></div>

                            {/* Hover Effect: Background Glow */}
                            <div className={`absolute inset-0 rounded-2xl xs:rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-br ${module.bgStart} ${module.bgEnd} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500 pointer-events-none`}></div>

                            {/* --- CONTENT BAGIAN ATAS (ICON & TEXT) --- */}
                            <div className="flex flex-col items-center justify-center w-full flex-1" style={{ 
                                paddingTop: 'clamp(0.25rem, 1.5vh, 0.75rem)',
                                paddingLeft: '0.5rem',
                                paddingRight: '0.5rem',
                                paddingBottom: '0.25rem'
                            }}>
                                {/* ICON (Centered & Big) - Tanpa lingkaran, hanya icon dengan gradasi */}
                                <div className="relative mb-1 xs:mb-1.5 sm:mb-2 md:mb-2.5 lg:mb-3 flex items-center justify-center transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 flex-shrink-0">
                                    <div className="relative" style={{ 
                                        width: 'clamp(2.5rem, 7vw, 5rem)',
                                        height: 'clamp(2.5rem, 7vw, 5rem)'
                                    }}>
                                        <svg width="0" height="0" style={{ position: 'absolute' }}>
                                            <defs>
                                                <linearGradient id={`iconGradient-${module.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#38bdf8" />
                                                    <stop offset="100%" stopColor="#1e40af" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <IconComponent 
                                            className="w-full h-full" 
                                            strokeWidth={2.5}
                                            style={{
                                                stroke: `url(#iconGradient-${module.id})`,
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* TEXT (Centered) */}
                                <h3 className="font-bold mb-0.5 xs:mb-0.75 sm:mb-1 md:mb-1.5 text-center transition-colors duration-300 flex-shrink-0 w-full"
                                    style={{
                                        fontSize: 'clamp(0.875rem, 2.2vw, 1.875rem)',
                                        color: isHovered ? '#0073EE' : '#0073EE',
                                        lineHeight: '1.3',
                                        fontFamily: 'Poppins, sans-serif',
                                        fontWeight: 700
                                    }}
                                >
                                    {module.title}
                                </h3>
                                <p className="text-slate-400 font-medium tracking-wider text-center flex-shrink-0 w-full"
                                    style={{
                                        fontSize: 'clamp(0.55rem, 1.3vw, 0.9rem)',
                                        lineHeight: '1.4',
                                        wordBreak: 'break-word',
                                        overflowWrap: 'break-word',
                                        fontFamily: 'Poppins, sans-serif',
                                        fontWeight: 500
                                    }}
                                >
                                    {module.subtitle}
                                </p>
                            </div>

                            {/* --- CONTENT BAGIAN BAWAH (FOOTER) --- */}
                            <div className="-mt-5 w-full flex items-center justify-between pt-1.5 xs:pt-2 sm:pt-2.5 md:pt-3 lg:pt-3.5 border-t border-slate-50 flex-shrink-0"
                               
                            >
                                {/* Location Tag */}

                               
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* CSS Animation Styles */}
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(40px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fade-in-down {
                    from { opacity: 0; transform: translateY(-30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .animate-fade-in-down {
                    animation: fade-in-down 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
}
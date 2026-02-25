import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import rfidIcon from '../assets/rfid.webp';

export default function HomeContent() {
    const navigate = useNavigate();
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

    const modules = [
        {
            id: 1,
            title: 'RFID Tracking',
            subtitle: 'Real-time Tracking of Garment Data',
            location: '9 Locations',
            icon: rfidIcon,
            color: 'text-[#0073EE]',
            bgStart: 'from-sky-400',
            bgEnd: 'to-blue-800',
            shadow: 'shadow-blue-200',
            lightBg: 'bg-blue-50'
        },
       
    ];

    const handleModuleClick = (moduleId: number) => {
        if (moduleId === 1) navigate('/rfid-tracking');
    };

    return (
        // CONTAINER UTAMA:
        // md:pl-80: Memberi jarak aman dari Sidebar kiri (sekitar 320px)
        // pt-32: Memberi jarak aman dari Header atas
        // pr-8: Memberi jarak kanan agar seimbang
        <div className="w-full h-full transition-all duration-300 relative"
        >
            {/* --- GRID CONTAINER --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-2 xs:gap-2.5 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6 2xl:gap-8 w-full max-w-7xl mx-auto px-2 xs:px-3 sm:px-4 pt-2 xs:pt-3 sm:pt-4"
                >
                {modules.map((module, index) => {
                    const isHovered = hoveredCard === module.id;

                    return (
                        <div
                            key={module.id}
                            onClick={() => handleModuleClick(module.id)}
                            onMouseEnter={() => setHoveredCard(module.id)}
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
                            <div className={`absolute top-0 left-0 w-full h-1 xs:h-1.5 sm:h-2 bg-gradient-to-r ${module.bgStart} ${module.bgEnd} transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}></div>

                            {/* Hover Effect: Background Glow */}
                            <div className={`absolute inset-0 rounded-2xl xs:rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-br ${module.bgStart} ${module.bgEnd} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500 pointer-events-none`}></div>

                            {/* --- CONTENT BAGIAN ATAS (ICON & TEXT) --- */}
                            <div className="flex flex-col items-center justify-center w-full flex-1" style={{ 
                                paddingTop: 'clamp(0.25rem, 1.5vh, 0.75rem)',
                            
                            }}>
                                {/* ICON (Centered & Big) - target.webp warna asli file */}
                                <div className="relative mb-1 xs:mb-1.5 sm:mb-2 md:mb-2.5 lg:mb-3 flex items-center justify-center transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 flex-shrink-0">
                                    <div className="relative" style={{ 
                                        width: 'clamp(2.5rem, 6vw, 5rem)',
                                        height: 'clamp(2.5rem, 6vw, 5rem)'
                                    }}>
                                        <div 
                                            className="w-full h-full"
                                            style={{
                                                maskImage: `url(${module.icon})`,
                                                WebkitMaskImage: `url(${module.icon})`,
                                                maskSize: 'contain',
                                                WebkitMaskSize: 'contain',
                                                maskRepeat: 'no-repeat',
                                                WebkitMaskRepeat: 'no-repeat',
                                                maskPosition: 'center',
                                                WebkitMaskPosition: 'center',
                                                background: `linear-gradient(135deg, #38bdf8 0%, #1e40af 100%)`,
                                                filter: 'drop-shadow(0 0 2px rgba(30, 64, 175, 0.3)) drop-shadow(0 0 4px rgba(56, 189, 248, 0.2))',
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
                                        fontSize: 'clamp(0.4rem, 1vw, 0.6rem)',
                                        lineHeight: '1.4',
                                        wordBreak: 'break-word',
                                        overflowWrap: 'break-word',
                                        fontFamily: 'Poppins, sans-serif',
                                        fontWeight: 400
                                    }}
                                >
                                    {module.subtitle}
                                </p>
                            </div>

                            {/* --- CONTENT BAGIAN BAWAH (FOOTER) --- */}
                           
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
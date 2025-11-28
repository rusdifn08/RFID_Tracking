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
            subtitle: 'Real-time Garment Data',
            location: '6 Locations',
            icon: Rss,
            color: 'text-emerald-500',
            bgStart: 'from-emerald-400',
            bgEnd: 'to-teal-500',
            shadow: 'shadow-emerald-200',
            lightBg: 'bg-emerald-50'
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
        <div className="w-full min-h-screen bg-[#F8F9FA] md:pl-80 pt-32 pr-8 pb-12 transition-all duration-300"
            style={{
                padding: '1%',
                overflow: 'hidden',
            }}
        >

            {/* --- HEADER SECTION (CENTERED) --- */}
            <div className=" w-full content-center items-center justify-center mx-auto text-center mb-4 animate-fade-in-down h-1/5 flex flex-col"
                >
                <h1 className="text-4xl">🛰️</h1>
                <h1 className=" text-4xl font-extrabold font-serif text-slate-10 tracking-tight mb-3"

                    style={{
                        marginTop: '1%',
                    }}
                >
                    MONITORING SYSTEM ROBOTICS TEAMS
                </h1>
                <p className="w-full text-slate-500 text-lg font-medium mx-auto"
                    style={{
                        height: '100%',
                    }}
                >
                    Select a monitoring module below to view detailed analytics and real-time status reports.
                </p>
                {/* Decorative small line under title */}
                <div className=" w-full content-center items-center justify-center w-24 h-1.5 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full mx-auto
                 mt-6 opacity-80"

                ></div>
            </div>

            {/* --- GRID CONTAINER --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 w-full mx-auto"
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
                            style={{ animationDelay: `${index * 150}ms` }}
                            // CARD STYLING:Select a monitoring module below to view detailed analytics and real-time status reports.i
                            // Flex-col & items-center: Kunci agar isi berada di tengah (center alignment)
                            // h-[380px]: Tinggi yang proporsional untuk menampung layout vertikal
                            className={`
                                group relative h-[300px] bg-white rounded-[2.5rem] p-8
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
                            <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${module.bgStart} ${module.bgEnd} transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}></div>

                            {/* Hover Effect: Background Glow */}
                            <div className={`absolute inset-0 rounded-[2.5rem] bg-gradient-to-br ${module.bgStart} ${module.bgEnd} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500 pointer-events-none`}></div>

                            {/* --- CONTENT BAGIAN ATAS (ICON & TEXT) --- */}
                            <div className="h-200 flex flex-col items-center justify-center w-full mt-4 flex-grow">
                                {/* ICON CIRCLE (Centered & Big) */}
                                <div className={`
                                    relative w-32 h-32 rounded-full mb-6
                                    bg-gradient-to-br ${module.bgStart} ${module.bgEnd}
                                    shadow-lg ${module.shadow}
                                    flex items-center justify-center
                                    transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6
                                `}>
                                    <IconComponent className="w-15 h-15 text-white" strokeWidth={2} />

                                    {/* Ring Animation Pulse */}
                                    <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping opacity-20"></div>
                                </div>

                                {/* TEXT (Centered) */}
                                <h3 className="text-4xl font-bold text-slate-800 mb-2 text-center group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-slate-800 group-hover:to-slate-600 "
                                    style={{
                                        paddingTop: '2%',
                                    }}
                                >
                                    {module.title}
                                </h3>
                                <p className="text-2xl text-slate-400 font-medium text-sm tracking-wider uppercase text-center">
                                    {module.subtitle}
                                </p>
                            </div>

                            {/* --- CONTENT BAGIAN BAWAH (FOOTER) --- */}
                            <div className=" w-full flex items-center justify-between pt-6 border-t border-slate-50 mt-auto"

                                style={{
                                    paddingRight: '2%',
                                    paddingLeft: '5%',
                                }}
                            >
                                {/* Location Tag */}
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${module.lightBg} transition-colors duration-300`}>
                                    <MapPin className={`w-4 h-4 ${module.color}`} />
                                    <span className={`text-sm font-semibold ${module.color}`}>
                                        {module.location}
                                    </span>
                                </div>

                                {/* Action Arrow Button */}
                                <div className={`
                                    w-12 h-12 rounded-full flex items-center justify-center
                                    transition-all duration-300 
                                    ${isHovered ? `bg-gradient-to-r ${module.bgStart} ${module.bgEnd} text-white shadow-md scale-110` : 'bg-slate-50 text-slate-300'}
                                `}>
                                    <ArrowRight className={`w-5 h-5 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
                                </div>
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
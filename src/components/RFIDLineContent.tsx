import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, User } from 'lucide-react';
import adidasLogo from '../assets/adidas.svg';
import redWingsLogo from '../assets/red_wings.svg';
import bergansLogo from '../assets/bergans.svg';
import montbellLogo from '../assets/montbell.svg';

// Tipe data
interface ProductionLine {
    id: number;
    title: string;
    supervisor: string;
    brand: string;
    logoColor: string;
    borderColor: string;
    accentColor: string;
    brandTextColor?: string;
}

export default function ProductionLine() {
    const navigate = useNavigate();
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

    // Mapping warna background untuk setiap brand (solid color, no gradient)
    const getBrandLogoColor = (brand: string): { backgroundColor: string; svgFilter?: string } => {
        const brandColors: { [key: string]: { backgroundColor: string; svgFilter?: string } } = {
            'mont-bell': { backgroundColor: '#00384A', svgFilter: 'brightness(0) invert(1)' }, // Background #00384A, SVG putih
            'RedWings': { backgroundColor: '#DC2626', svgFilter: 'none' }, // Merah untuk RedWings, SVG asli tanpa perubahan
            'adidas': { backgroundColor: '#FFBD0B', svgFilter: 'none' }, // Kuning untuk adidas, SVG tetap hitam
            'Bergans': { backgroundColor: '#059669', svgFilter: 'brightness(0) invert(1)' }, // Hijau untuk Bergans, SVG putih
        };
        return brandColors[brand] || { backgroundColor: '#6B7280', svgFilter: 'brightness(0) invert(1)' };
    };

    const productionLines: ProductionLine[] = [
        {
            id: 1,
            title: 'Production Line 1',
            supervisor: 'Risman',
            brand: 'mont-bell',
            logoColor: '', // Akan diisi dengan inline style
            borderColor: 'border-purple-500',
            accentColor: 'text-purple-600',
            brandTextColor: 'text-white'
        },
        {
            id: 2,
            title: 'Production Line 2',
            supervisor: 'Asep Supriadi',
            brand: 'mont-bell',
            logoColor: '',
            borderColor: 'border-pink-500',
            accentColor: 'text-pink-600',
            brandTextColor: 'text-white'
        },
        {
            id: 3,
            title: 'Production Line 3',
            supervisor: '-',
            brand: 'RedWings',
            logoColor: '',
            borderColor: 'border-yellow-400',
            accentColor: 'text-yellow-600',
            brandTextColor: 'text-white'
        },
        {
            id: 4,
            title: 'Production Line 4',
            supervisor: 'Agus Bencoy',
            brand: 'mont-bell',
            logoColor: '',
            borderColor: 'border-purple-500',
            accentColor: 'text-purple-600',
            brandTextColor: 'text-white'
        },
        {
            id: 5,
            title: 'Production Line 5',
            supervisor: 'Euis Sutisna',
            brand: 'mont-bell',
            logoColor: '',
            borderColor: 'border-emerald-500',
            accentColor: 'text-emerald-600',
            brandTextColor: 'text-white'
        },
        {
            id: 6,
            title: 'Production Line 6',
            supervisor: 'Tatang Beratang',
            brand: 'RedWings',
            logoColor: '',
            borderColor: 'border-teal-400',
            accentColor: 'text-teal-600',
            brandTextColor: 'text-white'
        },
        {
            id: 7,
            title: 'Production Line 7',
            supervisor: 'Agus Bencoy',
            brand: 'mont-bell',
            logoColor: '',
            borderColor: 'border-purple-500',
            accentColor: 'text-purple-600',
            brandTextColor: 'text-white'
        },
        {
            id: 8,
            title: 'Production Line 8',
            supervisor: 'Euis Sutisna',
            brand: 'adidas',
            logoColor: '',
            borderColor: 'border-emerald-500',
            accentColor: 'text-emerald-600',
            brandTextColor: 'text-black'
        },
        {
            id: 9,
            title: 'Production Line 9',
            supervisor: 'Tatang Beratang',
            brand: 'Bergans',
            logoColor: '',
            borderColor: 'border-blue-400',
            accentColor: 'text-blue-600',
            brandTextColor: 'text-white'
        },
    ];

    // Helper Render Logo - Menggunakan file SVG dari assets
    const renderLogo = (brand: string) => {
        const logoMap: { [key: string]: string } = {
            'adidas': adidasLogo,
            'RedWings': redWingsLogo,
            'Bergans': bergansLogo,
            'mont-bell': montbellLogo,
        };

        const logoPath = logoMap[brand];
        const brandColorConfig = getBrandLogoColor(brand);

        if (logoPath) {
            return (
                <img
                    src={logoPath}
                    alt={brand}
                    className="w-full h-full object-contain p-2"
                    style={{ 
                        maxWidth: '100%', 
                        maxHeight: '100%',
                        filter: brandColorConfig.svgFilter || 'none'
                    }}
                />
            );
        }

        // Fallback jika brand tidak ditemukan
        return <span className="font-semibold text-white text-[10px] uppercase tracking-wider">{brand}</span>;
    };

    return (
        <div className="w-full h-full font-sans"
        >
            {/* Grid System */}
            <div className="w-full max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 xs:gap-4 sm:gap-5 md:gap-6 px-2 xs:px-3 sm:px-4 pt-4 xs:pt-5 sm:pt-6 pb-3 xs:pb-4">
                {productionLines.map((line, index) => {
                    const isHovered = hoveredCard === line.id;

                    return (
                        <div
                            key={line.id}
                            onClick={() => navigate(`/line/${line.id}`)}
                            onMouseEnter={() => setHoveredCard(line.id)}
                            onMouseLeave={() => setHoveredCard(null)}
                            style={{ 
                                animationDelay: `${index * 100}ms`,
                                backgroundColor: isHovered ? '#0073ee' : 'white',
                                transition: 'background-color 0.3s ease-out, transform 0.3s ease-out, box-shadow 0.3s ease-out',
                                zIndex: 1
                            }}
                            className={`
                                group relative 
                                rounded-lg xs:rounded-xl sm:rounded-2xl 
                                shadow-sm
                                border border-gray-300
                                hover:shadow-md
                                hover:-translate-y-1
                                cursor-pointer
                                flex flex-col
                                overflow-visible
                                animate-fade-in-up
                                p-1.5 xs:p-2 sm:p-2.5 md:p-3
                                aspect-[2/1]
                            `}
                        >
                            {/* --- FLOATING BOX (Brand Logo) --- */}
                            <div 
                                className="absolute -top-2.5 xs:-top-3 sm:-top-3.5 left-3.5 xs:left-4 sm:left-5 w-9 xs:w-11 sm:w-13 h-7 xs:h-9 sm:h-11 rounded-lg shadow-md flex items-center justify-center z-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 border-2 border-white overflow-hidden"
                                style={{ backgroundColor: getBrandLogoColor(line.brand).backgroundColor }}
                            >
                                {renderLogo(line.brand)}
                            </div>

                            {/* --- CARD CONTENT --- */}
                            <div className="flex flex-col justify-between h-full flex-1" style={{ paddingTop: '1.5rem' }}>

                                {/* Title Section - Centered, di tengah antara logo brand dan garis putih */}
                                <div className="flex items-center justify-center flex-1" style={{ minHeight: 0 }}>
                                    <h3 className={`text-[10px] xs:text-xs sm:text-sm md:text-base lg:text-lg tracking-tight text-center truncate w-full transition-colors duration-300 ${
                                        isHovered ? 'text-white' : 'text-[#0073ee]'
                                    }`} style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 550, textTransform: 'capitalize' }}>
                                        {line.title}
                                    </h3>
                                </div>

                                {/* Footer Info (Supervisor & Arrow) */}
                                <div className="flex items-center justify-between pt-1.5 xs:pt-2 border-t border-slate-200">

                                    {/* Supervisor Info */}
                                    <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 flex-1 min-w-0">
                                        <div className={`p-1 xs:p-1.5 rounded-full bg-slate-50 flex-shrink-0`}>
                                            <User size={10} className="xs:w-[12px] xs:h-[12px] sm:w-[14px] sm:h-[14px]" strokeWidth={2.5} style={{ color: line.accentColor.replace('text-', '') }} />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[7px] xs:text-[8px] sm:text-[9px] text-slate-400 font-bold tracking-wider leading-tight" style={{ textTransform: 'capitalize' }}>
                                                Supervisor
                                            </span>
                                            <span className={`text-[10px] xs:text-xs sm:text-sm font-semibold leading-tight transition-colors duration-300 truncate ${
                                                isHovered ? 'text-white' : 'text-slate-800'
                                            }`} style={{ textTransform: 'capitalize' }}>
                                                {line.supervisor && line.supervisor.trim() !== '-' && line.supervisor.trim() !== '' ? line.supervisor : 'Not Assigned'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Arrow Button */}
                                    <div className={`
                                        w-5 xs:w-6 sm:w-7 h-5 xs:h-6 sm:h-7 rounded-full flex items-center justify-center flex-shrink-0
                                        transition-all duration-300
                                        ${isHovered ? 'bg-slate-800 text-white translate-x-1 shadow-md' : 'bg-slate-50 text-slate-400'}
                                    `}>
                                        <ArrowRight size={10} className="xs:w-[12px] xs:h-[12px] sm:w-[14px] sm:h-[14px]" strokeWidth={2.5} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fade-in-down {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.6s ease-out forwards;
                }
                .animate-fade-in-down {
                    animation: fade-in-down 0.8s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
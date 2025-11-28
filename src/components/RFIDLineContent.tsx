import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, User } from 'lucide-react';
import adidasLogo from '../assets/adidas.svg';
import redWingsLogo from '../assets/red_wings.svg';
import bergansLogo from '../assets/bergans.svg';
import montbellLogo from '../assets/montbell.svg';
import tnfLogo from '../assets/tnf.svg';

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

    // Mapping warna background untuk setiap brand
    const getBrandLogoColor = (brand: string): string => {
        const brandColors: { [key: string]: string } = {
            'mont-bell': 'bg-gradient-to-br from-blue-500 to-cyan-400', // Biru-cyan untuk mont-bell
            'RedWings': 'bg-gradient-to-br from-red-600 to-amber-700', // Merah-coklat untuk RedWings
            'The North Face': 'bg-gradient-to-br from-slate-800 to-black', // Hitam gelap untuk TNF
            'adidas': 'bg-white border-2 border-gray-300', // Putih dengan border untuk adidas
            'Bergans': 'bg-gradient-to-br from-green-600 to-emerald-500', // Hijau untuk Bergans
        };
        return brandColors[brand] || 'bg-gradient-to-br from-gray-400 to-gray-600';
    };

    const productionLines: ProductionLine[] = [
        {
            id: 1,
            title: 'SEWING LINE 1',
            supervisor: 'Risman',
            brand: 'mont-bell',
            logoColor: getBrandLogoColor('mont-bell'),
            borderColor: 'border-purple-500',
            accentColor: 'text-purple-600',
            brandTextColor: 'text-white'
        },
        {
            id: 2,
            title: 'SEWING LINE 2',
            supervisor: 'Asep Supriadi',
            brand: 'mont-bell',
            logoColor: getBrandLogoColor('mont-bell'),
            borderColor: 'border-pink-500',
            accentColor: 'text-pink-600',
            brandTextColor: 'text-white'
        },
        {
            id: 3,
            title: 'SEWING LINE 3',
            supervisor: '-',
            brand: 'RedWings',
            logoColor: getBrandLogoColor('RedWings'),
            borderColor: 'border-yellow-400',
            accentColor: 'text-yellow-600',
            brandTextColor: 'text-white'
        },
        {
            id: 4,
            title: 'SEWING LINE 4',
            supervisor: 'Agus Bencoy',
            brand: 'mont-bell',
            logoColor: getBrandLogoColor('mont-bell'),
            borderColor: 'border-purple-500',
            accentColor: 'text-purple-600',
            brandTextColor: 'text-white'
        },
        {
            id: 5,
            title: 'SEWING LINE 5',
            supervisor: 'Euis Sutisna',
            brand: 'mont-bell',
            logoColor: getBrandLogoColor('mont-bell'),
            borderColor: 'border-emerald-500',
            accentColor: 'text-emerald-600',
            brandTextColor: 'text-white'
        },
        {
            id: 6,
            title: 'SEWING LINE 6',
            supervisor: 'Tatang Beratang',
            brand: 'RedWings',
            logoColor: getBrandLogoColor('RedWings'),
            borderColor: 'border-teal-400',
            accentColor: 'text-teal-600',
            brandTextColor: 'text-white'
        },
        {
            id: 7,
            title: 'CUTTING GM1',
            supervisor: 'Agus Bencoy',
            brand: 'The North Face',
            logoColor: getBrandLogoColor('The North Face'),
            borderColor: 'border-purple-500',
            accentColor: 'text-purple-600',
            brandTextColor: 'text-white'
        },
        {
            id: 8,
            title: 'SEWING LINE 8',
            supervisor: 'Euis Sutisna',
            brand: 'adidas',
            logoColor: getBrandLogoColor('adidas'),
            borderColor: 'border-emerald-500',
            accentColor: 'text-emerald-600',
            brandTextColor: 'text-black'
        },
        {
            id: 9,
            title: 'SEWING LINE 9',
            supervisor: 'Tatang Beratang',
            brand: 'Bergans',
            logoColor: getBrandLogoColor('Bergans'),
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
            'The North Face': tnfLogo,
        };

        const logoPath = logoMap[brand];

        if (logoPath) {
            return (
                <img
                    src={logoPath}
                    alt={brand}
                    className="w-full h-full object-contain p-2"
                    style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
            );
        }

        // Fallback jika brand tidak ditemukan
        return <span className="font-semibold text-white text-[10px] uppercase tracking-wider">{brand}</span>;
    };

    return (
        <div className="w-full min-h-screen bg-[#F8F9FA]  font-sans">
            {/* Header Page */}
            <div className="w-full max-w-7xl mx-auto text-center mb-10 animate-fade-in-down">
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-2">
                    Production Lines
                </h1>
                <p className="text-base md:text-lg text-slate-500 font-medium mb-4">
                    Real-time monitoring of sewing and cutting lines.
                </p>
                {/* Decorative line under title */}
                <div className="w-24 h-1.5 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full mx-auto opacity-80"></div>
            </div>

            {/* Grid System */}
            <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4">
                {productionLines.map((line, index) => {
                    const isHovered = hoveredCard === line.id;

                    return (
                        <div
                            key={line.id}
                            onClick={() => navigate(`/line/${line.id}`)}
                            onMouseEnter={() => setHoveredCard(line.id)}
                            onMouseLeave={() => setHoveredCard(null)}
                            style={{ animationDelay: `${index * 100}ms` }}
                            className={`
                                group relative 
                                bg-white 
                                rounded-2xl 
                                shadow-sm
                                border-2
                                hover:shadow-xl
                                hover:-translate-y-1
                                transition-all duration-300 ease-out
                                cursor-pointer
                                min-h-[200px]
                                flex flex-col
                                overflow-visible
                                animate-fade-in-up
                                p-6
                                ${line.borderColor}
                            `}
                        >
                            {/* --- FLOATING BOX (Brand Logo) --- */}
                            <div className={`
                                absolute -top-4 left-6
                                w-14 h-12
                                rounded-lg
                                shadow-md
                                flex items-center justify-center
                                z-10
                                transition-transform duration-300 
                                group-hover:scale-110 group-hover:rotate-3
                                border-2 border-white
                                ${line.logoColor}
                                overflow-hidden
                            `}>
                                {renderLogo(line.brand)}
                            </div>

                            {/* --- CARD CONTENT --- */}
                            <div className="flex flex-col justify-between h-full pt-8 flex-1">

                                {/* Title Section - Centered */}
                                <div className="flex-1 flex items-center justify-center mb-6">
                                    <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight text-center">
                                        {line.title}
                                    </h3>
                                </div>

                                {/* Footer Info (Supervisor & Arrow) */}
                                <div className="flex items-center justify-between pt-4 border-t border-slate-200">

                                    {/* Supervisor Info */}
                                    <div className="flex items-center gap-2.5 flex-1">
                                        <div className={`p-1.5 rounded-full bg-slate-50`}>
                                            <User size={14} strokeWidth={2.5} className={line.accentColor} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider leading-tight">
                                                Supervisor
                                            </span>
                                            <span className="text-sm font-semibold text-slate-800 leading-tight">
                                                {line.supervisor && line.supervisor.trim() !== '-' && line.supervisor.trim() !== '' ? line.supervisor : 'Not Assigned'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Arrow Button */}
                                    <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                                        transition-all duration-300
                                        ${isHovered ? 'bg-slate-800 text-white translate-x-1 shadow-md' : 'bg-slate-50 text-slate-400'}
                                    `}>
                                        <ArrowRight size={16} strokeWidth={2.5} />
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
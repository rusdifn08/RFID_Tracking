import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, User, Activity } from 'lucide-react';
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
        // PERBAIKAN 1: 
        // pt-36: Jarak atas diperbesar agar Header Page tidak tertutup Header Kuning
        // md:pl-72: Jarak kiri agar tidak tertutup Sidebar
        <div className="w-full -mt-10 min-h-screen  bg-[#F8F9FA] md:pl-72 font-sans"
            style={{
                marginTop: '-3%',
            }}>

            {/* Header Page */}

            <div className="w-full mx-auto text-center mb-16 animate-fade-in-down h-1/5 flex flex-col items-center justify-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                    <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-5xl font-extrabold text-slate-800 tracking-tight">Production Lines</h1>
                    <p className="text-slate-500 text-xl mt-1">Real-time monitoring of sewing and cutting lines.</p>
                </div>
                {/* Decorative small line under title */}
                <div className="w-full content-center items-center justify-center w-24 h-1.5 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full mx-auto mt-6 opacity-80"></div>
            </div>

            <div className="h-10">


            </div>
            {/* Grid System */}
            {/* PERBAIKAN 2: gap-y-20 agar jarak vertikal antar kartu SANGAT AMAN dan tidak tumpang tindih */}
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-10">
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
                                shadow-[0_4px_20px_rgba(0,0,0,0.03)] 
                                border border-gray-100
                                hover:shadow-[0_15px_40px_rgba(0,0,0,0.1)] 
                                hover:-translate-y-2
                                transition-all duration-300 ease-out
                                cursor-pointer
                                min-h-[220px]
                                flex flex-col
                                overflow-visible
                                animate-fade-in-up
                                border-b-[6px]
                                text-center
                                items-center
                                justify-center
                                content-center
                                p-8 
                                ${line.borderColor}
                            `}
                        // PERBAIKAN 3: p-8 di atas memberikan padding dalam yang lega agar teks tidak menyentuh garis
                        >
                            {/* --- FLOATING BOX (Brand Logo) --- */}
                            <div className={`
                                absolute -top-6 left-8
                                w-16 h-14
                                rounded-xl
                                shadow-lg
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
                            {/* PERBAIKAN 4: mt-8 PENTING! Ini memaksa konten teks turun ke bawah */}
                            {/* agar tidak berada di belakang kotak logo */}
                            <div className="flex flex-col justify-between h-full mt-8   justify-center items-center content-center">

                                {/* Title Section */}
                                <div className="mb-6 justify-center items-center content-center">
                                    <h3 className="text-4xl font-bold text-slate-800 tracking-tight group-hover:text-slate-900 transition-colors">
                                        {line.title}
                                    </h3>
                                    {/* Garis dekoratif */}
                                    <div className="w-12 h-1 bg-gray-100 mt-3 rounded-full group-hover:w-full group-hover:bg-gray-50 transition-all duration-500"></div>
                                </div>

                                {/* Footer Info (Supervisor & Arrow) */}
                                <div className="flex items-end justify-between mt-auto">

                                    {/* Supervisor Info */}
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                                            Supervisor
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-full bg-gray-50 ${line.accentColor}`}>
                                                <User size={14} strokeWidth={2.5} />
                                            </div>
                                            <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-800">
                                                {line.supervisor && line.supervisor.trim() !== '' ? line.supervisor : 'Not Assigned'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Arrow Button */}
                                    <div className={`
                                        w-10 h-10 rounded-full flex items-center justify-center
                                        transition-all duration-300
                                        ${isHovered ? 'bg-slate-800 text-white translate-x-2' : 'bg-gray-50 text-gray-300'}
                                    `}>
                                        <ArrowRight size={18} strokeWidth={2.5} />
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
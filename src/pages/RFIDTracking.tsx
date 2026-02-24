import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import Footer from '../components/Footer';
import { useSidebar } from '../context/SidebarContext';
import backgroundImage from '../assets/background.jpg';
// Import icons from assets folder
// File-file ini ada di folder assets/ di root project
// Untuk menggunakan import statement, file harus dipindahkan ke src/assets/
// Atau gunakan path string yang mencari di public/assets/
// Saat ini menggunakan path string yang akan mencari di public/assets/
// Pastikan file sudah dipindahkan ke public/assets/ atau src/assets/

// Path string - akan mencari di public/assets/ saat runtime
const productionIcon = '/assets/production.webp';
const rejectIcon = '/assets/reject.webp';
const timeIcon = '/assets/time.webp';
const finishingIcon = '/assets/finishing.webp';

export default function RFIDTracking() {
    const { isOpen } = useSidebar();
    const navigate = useNavigate();

    const cards = [
        {
            id: 'production-line',
            title: 'Production Line',
            subtitle: 'Real-time Tracking of Production Lines',
            icon: null,
            iconImage: productionIcon,
            bgStart: 'from-blue-400',
            bgEnd: 'to-blue-700',
            shadow: 'shadow-blue-200',
            onClick: () => navigate('/monitoring-rfid')
        },
        {
            id: 'finishing',
            title: 'Finishing',
            subtitle: 'Monitor dan kelola finishing process',
            icon: null,
            iconImage: finishingIcon,
            bgStart: 'from-cyan-400',
            bgEnd: 'to-cyan-600',
            shadow: 'shadow-cyan-200',
            onClick: () => navigate('/finishing')
        },
        {
            id: 'reject-room',
            title: 'Reject Room',
            subtitle: 'Dashboard & list data reject finishing',
            icon: null,
            iconImage: rejectIcon,
            bgStart: 'from-blue-500',
            bgEnd: 'to-red-500',
            shadow: 'shadow-red-200',
            onClick: () => navigate('/reject-room')
        },
        {
            id: 'production-tracking-time',
            title: 'Tracking Time',
            subtitle: 'Analisa durasi dan flow produksi',
            icon: null,
            iconImage: timeIcon,
            bgStart: 'from-indigo-500',
            bgEnd: 'to-indigo-700',
            shadow: 'shadow-indigo-200',
            onClick: () => navigate('/production-tracking-time')
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
                        {cards.map((card) => (
                                <div
                                    key={card.id}
                                    onClick={card.onClick}
                                    className={`
                                        group relative bg-white rounded-md xs:rounded-xl sm:rounded-[1rem] md:rounded-[2rem] 
                                        border border-slate-100
                                        shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)]
                                        cursor-pointer
                                        flex flex-col 
                                        transition-all duration-300 ease-in-out
                                        hover:-translate-y-1 hover:shadow-lg
                                        overflow-hidden
                                    `}
                                    style={{
                                        zIndex: 1,
                                        aspectRatio: '5/3',
                                        minHeight: 'clamp(100px, 25vh, 280px)',
                                        padding: 'clamp(0.5rem, 1.5vw, 1rem)'
                                    }}
                                >
                                    {/* Hover Effect: Gradient Stroke at Top */}
                                    <div className={`absolute top-0 left-0 w-full h-1 xs:h-1.5 sm:h-2 bg-gradient-to-r ${card.bgStart} ${card.bgEnd} transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}></div>

                                    {/* Hover Effect: Background Glow */}
                                    <div className={`absolute inset-0 rounded-2xl xs:rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-br ${card.bgStart} ${card.bgEnd} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300 pointer-events-none`}></div>

                                    {/* Content Bagian Atas (Icon & Text) */}
                                    <div className="flex flex-col items-center justify-center w-full flex-1" style={{
                                        paddingTop: 'clamp(0.25rem, 1.5vh, 0.75rem)',
                                    }}>
                                        {/* Icon (Centered & Big) - Menggunakan gambar */}
                                        <div className="relative mb-1 xs:mb-1.5 sm:mb-2 md:mb-2.5 lg:mb-3 flex items-center justify-center transform transition-transform duration-300 group-hover:scale-105 flex-shrink-0">
                                            <div className="relative" style={{
                                                width: 'clamp(3rem, 7vw, 6rem)',
                                                height: 'clamp(3rem, 7vw, 6rem)'
                                            }}>
                                                {card.iconImage && (
                                                    <img 
                                                        src={card.iconImage} 
                                                        alt={card.title}
                                                        className="w-full h-full object-contain"
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Text (Centered) dengan Gradient - Semua card sama gradasinya */}
                                        <h3 className="font-bold mb-0.5 xs:mb-0.75 sm:mb-1 md:mb-1.5 text-center transition-colors duration-300 flex-shrink-0 w-full"
                                            style={{
                                                fontSize: 'clamp(0.875rem, 2.2vw, 1.875rem)',
                                                lineHeight: '1.3',
                                                fontFamily: 'Poppins, sans-serif',
                                                fontWeight: 700,
                                                background: 'linear-gradient(to right, #012d75, #1ebae3)',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                backgroundClip: 'text',
                                            }}
                                        >
                                            {card.title}
                                        </h3>
                                        <p className="font-medium tracking-wider text-center flex-shrink-0 w-full"
                                            style={{
                                                fontSize: 'clamp(0.4rem, 1vw, 0.6rem)',
                                                lineHeight: '1.4',
                                                wordBreak: 'break-word',
                                                overflowWrap: 'break-word',
                                                fontFamily: 'Poppins, sans-serif',
                                                fontWeight: 400,
                                                color: '#374151' // Abu-abu gelap (gray-700)
                                            }}
                                        >
                                            {card.subtitle}
                                        </p>
                                    </div>
                                </div>
                        ))}
                    </div>
                </main>

                <Footer />
            </div>
        </div>
    );
}


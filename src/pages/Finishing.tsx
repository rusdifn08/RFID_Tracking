import { memo, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import { useSidebar } from '../context/SidebarContext';
import backgroundImage from '../assets/background.jpg';
import LineDetailCardsGrid from '../components/line/LineDetailCardsGrid';

// Import icons from assets folder
import allIcon from '../assets/all.webp';
import dryroomIcon from '../assets/dryroom.webp';
import foldingIcon from '../assets/folding.webp';
import listIcon from '../assets/list.webp';

const Finishing = memo(() => {
    const { isOpen } = useSidebar();

    const cards = useMemo(() => [
        {
            id: 1,
            title: 'Dashboard RFID All',
            subtitle: 'Monitoring Real-time Finishing All',
            icon: null,
            iconImage: allIcon,
            path: '/dashboard-rfid-finishing',
        },
        {
            id: 2,
            title: 'Dashboard Dryroom',
            subtitle: 'Monitoring Real-time Dryroom',
            icon: null,
            iconImage: dryroomIcon,
            path: '/dashboard-dryroom',
        },
        {
            id: 3,
            title: 'Dashboard Folding',
            subtitle: 'Monitoring Real-time Folding',
            icon: null,
            iconImage: foldingIcon,
            path: '/dashboard-folding',
        },
        {
            id: 4,
            title: 'List RFID Finishing',
            subtitle: 'Database & Log Finishing',
            icon: null,
            iconImage: listIcon,
            path: '/list-rfid-finishing',
        },
    ], []);

    return (
        <div className="flex min-h-screen w-full h-screen font-sans text-slate-800 overflow-hidden fixed inset-0 m-0 p-0"
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed',
            }}
        >
            {/* Sidebar */}
            <div className="fixed left-0 top-0 h-full z-50 shadow-xl">
                <Sidebar />
            </div>

            {/* Main Content Area */}
            <div
                className="flex flex-col w-full h-screen transition-all duration-300 ease-in-out relative"
                style={{
                    marginLeft: isOpen ? '18%' : '5rem',
                    width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)'
                }}
            >
                {/* Header */}
                <div className="sticky top-0 z-40 shadow-md">
                    <Header />
                </div>

                {/* Breadcrumb */}
                <Breadcrumb />

                {/* Main Content */}
                <main
                    className="flex-1 w-full overflow-y-auto px-2 xs:px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 relative"
                    style={{
                        paddingTop: 'clamp(0.5rem, 1vh, 1rem)',
                        paddingBottom: 'clamp(4rem, 8vh, 5rem)',
                        minHeight: 0,
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#cbd5e1 #f1f5f9'
                    }}
                >
                    {/* --- CARDS GRID --- */}
                    <div className="max-w-6xl mx-auto mt-3">
                        <LineDetailCardsGrid cards={cards} />
                    </div>
                </main>

                {/* Footer - Transparan di belakang konten */}
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
                /* Custom Scrollbar */
                /* Custom Scrollbar */
                main::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                main::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 4px;
                }
                main::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                }
                main::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div>
    );
});

Finishing.displayName = 'Finishing';

export default Finishing;


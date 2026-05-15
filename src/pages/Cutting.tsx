import { memo } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import Footer from '../components/Footer';
import backgroundImage from '../assets/background.jpg';
import LineDetailCardsGrid from '../components/line/LineDetailCardsGrid';
import dashboardRfidIcon from '../assets/dashboardrfid.webp';
import listRfidIcon from '../assets/listrfid.webp';

const cards = [
    {
        id: 1,
        title: 'Daftar RFID Cutting',
        subtitle: 'Data cutting & scan barcode kamera',
        icon: null,
        iconImage: listRfidIcon,
        path: '/daftar-rfid-cutting',
    },
    {
        id: 2,
        title: 'Dashboard Cutting Proses',
        subtitle: 'Monitoring Real-time Cutting',
        icon: null,
        iconImage: dashboardRfidIcon,
        path: '/dashboard-cutting',
    },
    {
        id: 3,
        title: 'List RFID',
        subtitle: 'Database & Log RFID',
        icon: null,
        iconImage: listRfidIcon,
        path: '/list-rfid',
    },
];

const Cutting = memo(() => {

    return (
        <div
            className="flex min-h-screen w-full h-screen font-sans text-slate-800 overflow-hidden fixed inset-0 m-0 p-0"
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed',
            }}
        >
            <div className="fixed left-0 top-0 h-full z-50 shadow-xl">
                <Sidebar />
            </div>

            <div
                className="flex flex-col w-full h-screen transition-all duration-300 ease-in-out relative"
                style={{
                    marginLeft: 'var(--layout-sidebar-offset)',
                    width: 'var(--layout-sidebar-width)',
                }}
            >
                <div className="sticky top-0 z-40 shadow-md">
                    <Header />
                </div>

                <Breadcrumb />

                <main
                    className="flex-1 w-full overflow-y-auto px-2 xs:px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 relative"
                    style={{
                        paddingTop: 'clamp(0.5rem, 1vh, 1rem)',
                        paddingBottom: 'clamp(4rem, 8vh, 5rem)',
                        minHeight: 0,
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#cbd5e1 #f1f5f9',
                    }}
                >
                    <LineDetailCardsGrid cards={cards} gridColsClass="md:grid-cols-2 xl:grid-cols-3" />
                </main>

                <Footer />
            </div>

            <style>{`
                main::-webkit-scrollbar { width: 8px; height: 8px; }
                main::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
                main::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                main::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </div>
    );
});

Cutting.displayName = 'Cutting';

export default Cutting;

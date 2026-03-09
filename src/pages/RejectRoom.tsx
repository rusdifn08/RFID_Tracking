import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import Footer from '../components/Footer';
import { useSidebar } from '../context/SidebarContext';
import backgroundImage from '../assets/background.jpg';
import LineDetailCardsGrid from '../components/line/LineDetailCardsGrid';
import {
    Dashboard as DashboardIcon,
    EventNote as ListRfidIcon,
} from '@mui/icons-material';

const cards = [
    {
        id: 1,
        title: 'Dashboard RFID Reject',
        subtitle: 'Monitoring Real-time Reject Room',
        icon: DashboardIcon,
        path: '/dashboard-rfid-reject',
    },
    {
        id: 2,
        title: 'List RFID Reject',
        subtitle: 'Database & Log Reject',
        icon: ListRfidIcon,
        path: '/list-rfid-reject',
    },
];

export default function RejectRoom() {
    const { isOpen } = useSidebar();

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
            {/* Sidebar */}
            <div className="fixed left-0 top-0 h-full z-50 shadow-xl">
                <Sidebar />
            </div>

            {/* Main Content Area */}
            <div
                className="flex flex-col w-full h-screen transition-all duration-300 ease-in-out relative"
                style={{
                    marginLeft: isOpen ? '18%' : '5rem',
                    width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)',
                }}
            >
                {/* Header */}
                <div className="sticky top-0 z-40 shadow-md">
                    <Header />
                </div>

                {/* Breadcrumb */}
                <Breadcrumb />

                {/* Main Content - card design sama dengan Finishing (satu tema biru) */}
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
                    <LineDetailCardsGrid cards={cards} gridColsClass="md:grid-cols-2" />
                </main>

                <Footer />
            </div>

            <style>{`
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
}




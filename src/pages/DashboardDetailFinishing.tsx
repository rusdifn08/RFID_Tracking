import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useSidebar } from '../context/SidebarContext';
import backgroundImage from '../assets/background.jpg';

export default function DashboardDetailFinishing() {
    const { isOpen } = useSidebar();

    return (
        <div
            className="flex min-h-screen w-full h-screen font-sans text-slate-800 overflow-hidden fixed inset-0 m-0 p-0"
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
            }}
        >
            <Sidebar />
            <div
                className={`flex flex-col flex-1 min-h-0 transition-all duration-300 ${isOpen ? 'ml-0' : 'ml-[72px]'}`}
            >
                <Header />
                <main className="flex-1 flex flex-col min-h-0 overflow-auto">
                    <div className="flex-1 flex items-center justify-center p-6">
                        <h1 className="text-xl font-semibold text-slate-700">
                            Dashboard Detail Finishing
                        </h1>
                    </div>
                </main>
                <Footer />
            </div>
        </div>
    );
}

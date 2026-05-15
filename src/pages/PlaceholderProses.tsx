import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import Footer from '../components/Footer';
import backgroundImage from '../assets/background.jpg';

const titleByPath: Record<string, string> = {
    '/cutting': 'Cutting Proses',
    '/sewing': 'Sewing Proses',
};

export default function PlaceholderProses() {
    const navigate = useNavigate();
    const location = useLocation();
    const title = titleByPath[location.pathname] ?? 'Proses';

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
            <Sidebar />
            <div
                className="flex flex-col w-full min-h-screen transition-all duration-300 ease-in-out relative"
                style={{ marginLeft: 'var(--layout-sidebar-offset)', width: 'var(--layout-sidebar-width)' }}
            >
                <Header />
                <Breadcrumb />
                <main className="flex-1 flex items-center justify-center p-6">
                    <div className="bg-white/95 rounded-2xl shadow-xl p-8 max-w-md text-center">
                        <h2 className="text-xl font-bold text-slate-800 mb-2">{title}</h2>
                        <p className="text-slate-600 mb-6">Halaman dalam pengembangan.</p>
                        <button
                            onClick={() => navigate('/rfid-tracking')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Kembali ke RFID Tracking
                        </button>
                    </div>
                </main>
                <Footer />
            </div>
        </div>
    );
}

import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import Footer from '../components/Footer';
import backgroundImage from '../assets/background.jpg';
import { Construction, ArrowLeft } from 'lucide-react';

const titleByPath: Record<string, string> = {
    '/batch-system/daftar-layout': 'Daftar Layout',
    '/batch-system/dashboard': 'Dashboard',
    '/batch-system/preparation': 'Preparation',
    '/batch-system/assembly': 'Assembly',
    '/batch-system/hybrid': 'Hybrid',
};

export default function BatchSystemModule() {
    const navigate = useNavigate();
    const location = useLocation();
    const title = titleByPath[location.pathname] ?? 'Batch System';

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
                <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
                    <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-blue-100 bg-white/95 shadow-[0_24px_60px_rgba(37,99,235,0.12)]">
                        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700" />
                        <div
                            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-100/60 blur-3xl"
                            aria-hidden
                        />
                        <div
                            className="pointer-events-none absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-sky-100/50 blur-3xl"
                            aria-hidden
                        />

                        <div className="relative px-6 py-10 sm:px-10 sm:py-12 text-center">
                            <div className="mx-auto mb-6 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
                                <Construction className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={2.2} />
                            </div>

                            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 mb-3">
                                {title}
                            </p>

                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-4">
                                Masih dalam pengembangan
                            </h1>

                            <p className="text-base sm:text-lg md:text-xl font-semibold text-blue-700/90 leading-relaxed max-w-lg mx-auto mb-8">
                                Sabar ya — ini bukan File HTML 3000 baris code.
                            </p>

                            <div className="mx-auto mb-8 h-px max-w-xs bg-gradient-to-r from-transparent via-blue-200 to-transparent" />

                            <button
                                type="button"
                                onClick={() => navigate('/batch-system')}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm sm:text-base font-semibold text-white shadow-md shadow-blue-500/25 transition hover:from-blue-700 hover:to-blue-800 hover:shadow-lg"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Kembali ke Batch System
                            </button>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        </div>
    );
}

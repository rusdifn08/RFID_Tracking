import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import Footer from '../components/Footer';
import { useSidebar } from '../context/SidebarContext';
import backgroundImage from '../assets/background.jpg';
import ChartCard from '../components/dashboard/ChartCard';
import { LayoutGrid, UserCircle2, ActivitySquare } from 'lucide-react';

export default function DashboardSewingLine() {
    const { isOpen } = useSidebar();

    const [operatorName, setOperatorName] = useState<string>('-');
    const [operatorNik, setOperatorNik] = useState<string>('-');
    const [operatorLine, setOperatorLine] = useState<string>('-');
    const [operatorTable, setOperatorTable] = useState<string>('-');

    useEffect(() => {
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) return;
            const userData = JSON.parse(userStr);
            setOperatorName(userData?.name || '-');
            setOperatorNik(userData?.nik || '-');

            let line: string | undefined = userData?.line;
            if (!line && userData?.name) {
                const match = String(userData.name).match(/\d+/);
                if (match) {
                    line = match[0];
                }
            }
            setOperatorLine(line ? String(line) : '-');

            // Jika ada informasi meja/table di user, ambil. Kalau tidak, biarkan '-'
            const table = userData?.table || userData?.meja || userData?.station;
            setOperatorTable(table ? String(table) : '-');
        } catch {
            // abaikan error parsing, biarkan nilai default '-'
        }
    }, []);

    return (
        <div
            className="flex min-h-screen w-full h-screen fixed inset-0 m-0 p-0"
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
                className="flex flex-col w-full min-h-screen relative"
                style={{ marginLeft: isOpen ? '18%' : '5rem', width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)' }}
            >
                {/* Header */}
                <Header />

                {/* Breadcrumb */}
                <Breadcrumb />

                {/* Content - full-page, tanpa margin kanan/kiri/bawah */}
                <main
                    className="flex-1 w-full overflow-y-auto relative"
                    style={{
                        paddingTop: 'clamp(0.75rem, 1.5vw, 1.25rem)',
                        paddingBottom: 'clamp(0.75rem, 1.5vw, 1.25rem)',
                        paddingLeft: 'clamp(0.75rem, 1.2vw, 1.25rem)',
                        paddingRight: 'clamp(0.75rem, 1.2vw, 1.25rem)',
                        marginTop: 0,
                    }}
                >
                    <div className="w-full h-full flex flex-col lg:flex-row gap-3 lg:gap-4 items-stretch">
                        {/* Kiri: Biodata Operator + Detail Proses */}
                        <section className="w-full lg:w-1/3 flex flex-col gap-4">
                            {/* Biodata Operator */}
                            <ChartCard
                                title="Operator Biodata"
                                icon={UserCircle2}
                                className="w-full h-full"
                            >
                                <div className="flex flex-col gap-3 text-xs sm:text-sm">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <span className="w-16 sm:w-20 text-slate-500 font-semibold">NIK :</span>
                                        <div className="flex-1 h-8 sm:h-9 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center px-2 text-slate-900 font-semibold tracking-wide truncate">
                                            {operatorNik}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <span className="w-16 sm:w-20 text-slate-500 font-semibold">NAMA :</span>
                                        <div className="flex-1 h-8 sm:h-9 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center px-2 text-slate-800 font-medium truncate">
                                            {operatorName}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <span className="w-16 sm:w-20 text-slate-500 font-semibold">LINE :</span>
                                        <div className="flex-1 h-8 sm:h-9 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center px-2 text-slate-800 font-medium truncate">
                                            {operatorLine}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <span className="w-16 sm:w-20 text-slate-500 font-semibold">TABLE :</span>
                                        <div className="flex-1 h-8 sm:h-9 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center px-2 text-slate-800 font-medium truncate">
                                            {operatorTable}
                                        </div>
                                    </div>
                                </div>
                            </ChartCard>

                            {/* Detail Proses */}
                            <ChartCard
                                title="Process Detail Status"
                                icon={ActivitySquare}
                                className="w-full h-full"
                            >
                                <div className="grid grid-cols-2 gap-3">
                                    {['Output', 'Proses', 'Finish', 'Done'].map((label, idx) => {
                                        const gradient =
                                            idx === 0
                                                ? 'from-amber-400 to-orange-500'
                                                : idx === 1
                                                    ? 'from-sky-400 to-cyan-500'
                                                    : idx === 2
                                                        ? 'from-emerald-400 to-teal-500'
                                                        : 'from-indigo-400 to-sky-600';
                                        return (
                                            <button
                                                key={label}
                                                type="button"
                                                className={`group relative flex items-center justify-center h-full w-full min-h-[64px] sm:min-h-[80px] bg-white rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300`}
                                                style={{ padding: 'clamp(0.4rem, 0.6vw, 0.75rem)' }}
                                            >
                                                <div
                                                    className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${gradient}`}
                                                />
                                                <span
                                                    className="relative z-10 font-semibold tracking-wide text-slate-700 group-hover:text-white text-xs sm:text-sm md:text-base"
                                                    style={{ fontFamily: 'Poppins, sans-serif' }}
                                                >
                                                    {label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </ChartCard>
                        </section>

                        {/* Kanan: Grid Sewing Line - gunakan desain card ala \"Distribusi Data\" (ChartCard) */}
                        <section className="w-full lg:w-2/3 flex">
                            <ChartCard
                                title="Sewing Process Layout"
                                icon={LayoutGrid}
                                className="w-full h-full"
                            >
                                <div className="grid grid-cols-5 lg:grid-cols-8 gap-2 sm:gap-3 md:gap-4 auto-rows-fr h-full">
                                    {Array.from({ length: 40 }).map((_, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 via-cyan-500 to-sky-500 text-white shadow-md text-center hover:shadow-xl hover:-translate-y-0.5 transition-transform transition-shadow duration-300"
                                            style={{ padding: 'clamp(0.25rem, 0.4vw, 0.5rem)' }}
                                        >
                                            <span
                                                className="font-semibold tracking-wide"
                                                style={{
                                                    fontSize: 'clamp(0.55rem, 0.7vw, 0.8rem)',
                                                    fontFamily: 'Poppins, sans-serif',
                                                }}
                                            >
                                                Proses {idx + 1}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </ChartCard>
                        </section>
                    </div>
                </main>

                <Footer />
            </div>
        </div>
    );
}


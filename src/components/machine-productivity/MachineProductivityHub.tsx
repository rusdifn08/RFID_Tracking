import { useNavigate } from 'react-router-dom';
import { DASHBOARD_CARDS } from './types';

export default function MachineProductivityHub() {
    const navigate = useNavigate();

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            <div className="text-center max-w-2xl mx-auto pt-2 pb-2">
                <h1
                    className="text-2xl md:text-3xl font-bold text-slate-800"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                    Machine Productivity
                </h1>
                <p className="text-sm md:text-base text-slate-500 mt-2">
                    Pilih dashboard sensor atau buka resume semua mesin (Power On / Running / Loss / Produktivitas).
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {DASHBOARD_CARDS.map((card, i) => (
                    <button
                        key={card.id}
                        type="button"
                        onClick={() => navigate(card.path)}
                        className="group relative text-left rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                        style={{ animationDelay: `${i * 120}ms` }}
                    >
                        <div className={`h-1.5 w-full bg-gradient-to-r ${card.accent}`} />
                        <div className="p-5 md:p-6">
                            <div
                                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.accent} text-white flex items-center justify-center text-2xl mb-4 shadow-md`}
                            >
                                {card.icon}
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 group-hover:text-sky-700 transition-colors">
                                {card.title}
                            </h2>
                            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{card.subtitle}</p>
                            <p className="text-xs font-semibold text-sky-600 mt-4 uppercase tracking-wide">
                                Buka →
                            </p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

import MachineStatusBadge, { derivePzemStatus } from './MachineStatusBadge';
import type { DashboardView, MachineRow } from './types';

type Props = {
    view: DashboardView;
    machines: MachineRow[];
    selectedId: string | null;
    loading: boolean;
    onSelect: (id: string) => void;
    /** Arus live per mesin (untuk badge PZEM akurat) */
    liveCurrentById?: Record<string, number>;
};

function listStatus(
    view: DashboardView,
    m: MachineRow,
    liveCurrentById?: Record<string, number>,
) {
    if (view === 'pzem' || view === 'detail-pzem') {
        const a = liveCurrentById?.[m.id];
        return (
            derivePzemStatus(
                a,
                m.current_threshold_a,
                0,
                m.power_threshold_w,
                m.off_current_a ?? 0.01,
            ) ?? m.status_pzem
        );
    }
    if (view === 'adxl' || view === 'detail-adxl') return m.status_adxl;
    if (view === 'compare') return m.status;
    return m.status;
}

export default function MachineListSidebar({
    view,
    machines,
    selectedId,
    loading,
    onSelect,
    liveCurrentById,
}: Props) {
    return (
        <section className="rounded-2xl border border-sky-200/80 bg-white/90 shadow-sm p-3 md:p-4">
            <h2 className="text-sm font-bold text-sky-950 mb-3">Mesin</h2>
            {loading ? (
                <p className="text-sm text-slate-400">Memuat...</p>
            ) : machines.length === 0 ? (
                <p className="text-sm text-slate-400">Belum ada mesin terdaftar.</p>
            ) : (
                <ul className="space-y-2 max-h-[32rem] overflow-y-auto">
                    {machines.map((m) => (
                        <li key={m.id}>
                            <button
                                type="button"
                                onClick={() => onSelect(m.id)}
                                className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${
                                    selectedId === m.id
                                        ? 'border-sky-400 bg-sky-50 shadow-sm'
                                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/80'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-slate-800 text-sm">{m.code}</span>
                                    <MachineStatusBadge status={listStatus(view, m, liveCurrentById)} />
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5 truncate">{m.name}</p>
                                {view === 'compare' && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-100">
                                            PZEM {m.status_pzem}
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-100">
                                            ADXL {m.status_adxl}
                                        </span>
                                    </div>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

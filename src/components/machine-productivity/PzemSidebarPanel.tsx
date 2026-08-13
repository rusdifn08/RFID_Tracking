import type { ReactNode } from 'react';
import { Info, Pause, Play, Power, PowerOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import MachineCalibrationPanel from './MachineCalibrationPanel';
import type { MachineLive, MachineRow } from './types';

type Props = {
    machine: MachineRow;
    live?: MachineLive;
    onSaveCalibration: (patch: {
        g_force_threshold: number;
        filter_aktif_ms: number;
        filter_diam_ms: number;
        power_threshold_w: number;
        current_threshold_a: number;
        off_current_a?: number;
    }) => Promise<void>;
};

const panelClass =
    'rounded-2xl border border-sky-200/80 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-300';

export default function PzemSidebarPanel({ machine, live, onSaveCalibration }: Props) {
    const p = live?.pzem;
    const overCurrent = p != null && p.current_a >= machine.current_threshold_a;
    const powerFallbackOn = machine.power_threshold_w > 0;
    const overPower =
        powerFallbackOn && p != null && p.power_w >= machine.power_threshold_w;
    const isOff = p != null && p.current_a < (machine.off_current_a ?? 0.03);
    const isIdle = p != null && !overCurrent && !overPower && !isOff;

    return (
        <div className="space-y-3">
            <section className={`${panelClass} p-3 md:p-4`}>
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                        <Info className="h-3.5 w-3.5" aria-hidden />
                    </div>
                    <h3 className="text-sm font-bold text-sky-950">Logika deteksi PZEM</h3>
                </div>
                <ul className="space-y-2 text-xs text-sky-800/90">
                    <LogicItem
                        icon={Play}
                        ok={overCurrent}
                        text={
                            <>
                                <strong className="text-sky-900">Running</strong> jika arus ≥{' '}
                                {machine.current_threshold_a} A selama filter aktif {machine.filter_aktif_ms} ms
                            </>
                        }
                    />
                    <LogicItem
                        icon={Power}
                        ok={overPower}
                        text={
                            powerFallbackOn ? (
                                <>
                                    Atau daya ≥ {machine.power_threshold_w} W sebagai fallback (harus di atas
                                    daya standby)
                                </>
                            ) : (
                                <>Power fallback <strong>nonaktif</strong> (nilai 0) — deteksi hanya dari arus</>
                            )
                        }
                    />
                    <LogicItem
                        icon={Pause}
                        ok={isIdle}
                        text={
                            <>
                                <strong className="text-sky-900">Idle</strong> di bawah threshold arus selama
                                filter diam {machine.filter_diam_ms} ms
                            </>
                        }
                    />
                    <LogicItem
                        icon={PowerOff}
                        ok={isOff}
                        text={
                            <>
                                <strong className="text-sky-900">Mati</strong> jika arus &lt;{' '}
                                {machine.off_current_a ?? 0.03} A
                                (mesin dianggap mati / standby sangat rendah)
                            </>
                        }
                    />
                </ul>
                {!p && (
                    <p className="text-[11px] text-sky-800 mt-3 bg-sky-50 rounded-lg px-2.5 py-2 border border-sky-200/80">
                        Belum ada data PZEM dari sensor.
                    </p>
                )}
            </section>

            <MachineCalibrationPanel machine={machine} onSave={onSaveCalibration} showPzem compact />
        </div>
    );
}

function LogicItem({ icon: Icon, ok, text }: { icon: LucideIcon; ok?: boolean; text: ReactNode }) {
    return (
        <li className="flex gap-2 rounded-lg border border-sky-100 bg-sky-50/40 px-2.5 py-2 transition-colors hover:bg-sky-50 hover:border-sky-200">
            <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${ok ? 'text-emerald-500' : 'text-sky-400'}`} aria-hidden />
            <span className="leading-snug">
                {text}
                {ok != null && (
                    <span className={`ml-1 font-semibold ${ok ? 'text-emerald-600' : 'text-sky-400'}`}>
                        {ok ? '✓' : '○'}
                    </span>
                )}
            </span>
        </li>
    );
}

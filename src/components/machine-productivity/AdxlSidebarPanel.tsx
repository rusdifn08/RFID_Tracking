import type { ReactNode } from 'react';
import { Activity, Info, Pause, Play, PowerOff, Waves } from 'lucide-react';
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
    }) => Promise<void>;
};

const panelClass =
    'rounded-2xl border border-teal-200/80 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-300';

export default function AdxlSidebarPanel({ machine, live, onSaveCalibration }: Props) {
    const a = live?.adxl;
    const vib = a?.magnitude_g ?? 0;
    const overG = a != null && vib >= machine.g_force_threshold;
    const isOff = a != null && vib < 0.02;
    const isIdle = a != null && !overG && !isOff;

    return (
        <div className="space-y-3">
            <section className={`${panelClass} p-3 md:p-4`}>
                <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                        <Info className="h-3.5 w-3.5" aria-hidden />
                    </div>
                    <h3 className="text-sm font-bold text-teal-950">Logika deteksi ADXL345</h3>
                </div>
                <ul className="space-y-2 text-xs text-teal-800/90">
                    <LogicItem
                        icon={Play}
                        ok={overG}
                        text={
                            <>
                                <strong className="text-teal-900">Running</strong> jika getaran (delta) ≥{' '}
                                {machine.g_force_threshold} selama filter aktif {machine.filter_aktif_ms} ms
                            </>
                        }
                    />
                    <LogicItem
                        icon={Waves}
                        ok={overG}
                        text={
                            <>Getaran = |Δx| + |Δy| + |Δz| tiap ~50ms (sama firmware HTML lama), kirim peak 1s</>
                        }
                    />
                    <LogicItem
                        icon={Pause}
                        ok={isIdle}
                        text={
                            <>
                                <strong className="text-teal-900">Idle</strong> getaran di bawah threshold selama
                                filter diam {machine.filter_diam_ms} ms
                            </>
                        }
                    />
                    <LogicItem
                        icon={PowerOff}
                        ok={isOff}
                        text={
                            <>
                                <strong className="text-teal-900">Mati</strong> jika getaran ≈ 0 (diam total).
                                Listrik AC off → pakai dashboard PZEM.
                            </>
                        }
                    />
                </ul>
                {!a && (
                    <p className="text-[11px] text-teal-800 mt-3 bg-teal-50 rounded-lg px-2.5 py-2 border border-teal-200/80">
                        Belum ada data ADXL dari sensor. Flash ulang firmware MQTT (delta vibration).
                    </p>
                )}
                {a && (
                    <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-teal-700">
                        <Activity className="h-3.5 w-3.5" aria-hidden />
                        Getaran live: {vib.toFixed(3)}
                    </p>
                )}
                <p className="text-[10px] text-teal-500/90 mt-2 leading-snug">
                    Flash <code className="text-[10px]">esp32_adxl_mqtt.ino</code> (TELEMETRY 200ms) agar live
                    cepat.
                </p>
            </section>

            <MachineCalibrationPanel machine={machine} onSave={onSaveCalibration} showAdxl compact />
        </div>
    );
}

function LogicItem({ icon: Icon, ok, text }: { icon: LucideIcon; ok?: boolean; text: ReactNode }) {
    return (
        <li className="flex gap-2 rounded-lg border border-teal-100 bg-teal-50/40 px-2.5 py-2 transition-colors hover:bg-teal-50 hover:border-teal-200">
            <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${ok ? 'text-emerald-500' : 'text-teal-400'}`} aria-hidden />
            <span className="leading-snug">
                {text}
                {ok != null && (
                    <span className={`ml-1 font-semibold ${ok ? 'text-emerald-600' : 'text-teal-400'}`}>
                        {ok ? '✓' : '○'}
                    </span>
                )}
            </span>
        </li>
    );
}

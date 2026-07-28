import {
    Activity,
    Axis3D,
    Clock,
    RotateCcw,
    Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import MachineStatusBadge from './MachineStatusBadge';
import OperationKpiStrip from './OperationKpiStrip';
import OperationPeriodsPanel from './OperationPeriodsPanel';
import SensorLinkBadges from './SensorLinkBadges';
import StatusTransitionsPanel from './StatusTransitionsPanel';
import { fmtNum } from './useMachineIoT';
import type { MachineLive, MachineRow, PzemDailyStats } from './types';
import { useEffect, useState } from 'react';
import SensorTrendChart from './SensorTrendChart';

type Props = {
    machine: MachineRow;
    live?: MachineLive;
    stats?: PzemDailyStats;
    apiBase: string;
    onResetStats: () => Promise<{ archived?: boolean } | void>;
    onToggleForceOff: (enabled: boolean) => Promise<void>;
};

const cardBase =
    'rounded-2xl border border-teal-200/80 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-300 ease-out hover:shadow-md hover:shadow-teal-100/60 hover:-translate-y-0.5';

const STALE_MS = 15_000;

export default function AdxlDashboard({ machine, live, stats, apiBase, onResetStats, onToggleForceOff }: Props) {
    const a = live?.adxl;
    const vib = a?.magnitude_g;
    const forceOff = !!machine.adxl_force_off;
    const [periodKey, setPeriodKey] = useState(0);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 2000);
        return () => clearInterval(t);
    }, []);

    const lastTs = a?.ts ? new Date(a.ts).getTime() : 0;
    const ageMs = lastTs > 0 ? now - lastTs : Number.POSITIVE_INFINITY;
    const linkAlive = Number.isFinite(ageMs) && ageMs < STALE_MS;
    const statusOffline = machine.status_adxl === 'offline' && !linkAlive;

    const runningSec = stats?.running_sec ?? 0;
    const idleSec = stats?.idle_sec ?? 0;
    const offSec = stats?.off_sec ?? 0;

    return (
        <div className="space-y-4 md:space-y-5 animate-in fade-in duration-500">
            <header
                className={`${cardBase} relative overflow-hidden border-teal-300/60 bg-gradient-to-br from-teal-50 via-cyan-50 to-sky-50 p-4 md:p-6`}
            >
                <div
                    className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-teal-200/30 blur-2xl"
                    aria-hidden
                />
                <div className="relative flex flex-wrap items-start justify-between gap-3">
                    <div className="flex gap-3 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-md shadow-teal-200/50 text-teal-600">
                            <Waves className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600">
                                ADXL345
                            </p>
                            <h2
                                className="text-lg md:text-xl font-bold text-teal-950 mt-0.5 truncate"
                                style={{ fontFamily: 'Poppins, sans-serif' }}
                            >
                                {machine.name}
                            </h2>
                            <p className="text-xs text-teal-700/80 mt-0.5">
                                Deteksi operasi via getaran (delta |dx|+|dy|+|dz|)
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 max-w-md justify-end">
                        <label className="inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-teal-200 bg-white text-teal-800 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                className="rounded border-teal-300 text-teal-600 focus:ring-teal-500"
                                checked={forceOff}
                                onChange={(e) => void onToggleForceOff(e.target.checked)}
                            />
                            Paksa Mati
                        </label>
                        <MachineStatusBadge status={machine.status_adxl} />
                        <SensorLinkBadges
                            linkAlive={linkAlive}
                            ageMs={ageMs}
                            hasTelemetry={!!a}
                            statusOffline={statusOffline}
                            sensorLabel="ADXL"
                            health={live?.adxlHealth}
                            telemetrySensorOk={a?.sensor_ok}
                        />
                    </div>
                </div>
            </header>

            <section className={`${cardBase} p-4 md:p-5`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                            <Clock className="h-4 w-4" aria-hidden />
                        </div>
                        <h3 className="text-sm font-bold text-teal-950">Waktu operasi hari ini (ADXL)</h3>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            if (
                                !confirm(
                                    'Reset waktu ADXL hari ini?\nData Running/Idle/Mati akan disimpan ke database (rekap periode) sebelum di-nolkan.'
                                )
                            ) {
                                return;
                            }
                            void onResetStats().then((r) => {
                                setPeriodKey((k) => k + 1);
                                if (r && 'archived' in r && r.archived) {
                                    alert('Rekap tersimpan ke database. Counter di-reset.');
                                }
                            });
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 hover:border-teal-300 active:scale-95 transition-all duration-200"
                    >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                        Reset hari ini
                    </button>
                </div>

                <OperationKpiStrip
                    runningSec={runningSec}
                    idleSec={idleSec}
                    offSec={offSec}
                    tone="teal"
                />

                <OperationPeriodsPanel
                    machineId={machine.id}
                    sensor="adxl"
                    apiBase={apiBase}
                    refreshKey={periodKey}
                />
            </section>

            <SensorTrendChart machineId={machine.id} apiBase={apiBase} sensor="adxl" />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <MetricCard
                    icon={Activity}
                    label="Getaran"
                    value={fmtNum(vib, 3)}
                    unit="Δ"
                    hint={`Threshold ≥ ${machine.g_force_threshold} (delta |dx|+|dy|+|dz|)`}
                />
                <MetricCard icon={Axis3D} label="Axis X" value={fmtNum(a?.ax, 3)} unit="m/s²" />
                <MetricCard icon={Axis3D} label="Axis Y" value={fmtNum(a?.ay, 3)} unit="m/s²" />
                <MetricCard icon={Axis3D} label="Axis Z" value={fmtNum(a?.az, 3)} unit="m/s²" />
            </div>

            <StatusTransitionsPanel
                machineId={machine.id}
                sensor="adxl"
                apiBase={apiBase}
                refreshKey={periodKey}
            />
        </div>
    );
}

function MetricCard({
    icon: Icon,
    label,
    value,
    unit,
    hint,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    unit?: string;
    hint?: string;
}) {
    return (
        <article
            className={`group ${cardBase} p-3 md:p-4 border-teal-100 hover:border-teal-300/80 bg-gradient-to-br from-white to-teal-50/40`}
        >
            <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] md:text-[11px] uppercase tracking-wider text-teal-600 font-bold">{label}</p>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-600 transition-colors duration-300 group-hover:bg-teal-600 group-hover:text-white">
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                </div>
            </div>
            <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-xl md:text-2xl font-bold text-teal-950 tabular-nums">{value}</span>
                {unit && <span className="text-sm font-semibold text-teal-500">{unit}</span>}
            </div>
            {hint && <p className="text-[10px] text-teal-500/90 mt-1.5 font-medium">{hint}</p>}
        </article>
    );
}

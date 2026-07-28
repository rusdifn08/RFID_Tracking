import {
    Activity,
    BatteryCharging,
    Clock,
    Gauge,
    RotateCcw,
    Zap,
    Waves,
    Percent,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import MachineStatusBadge, { derivePzemStatus } from './MachineStatusBadge';
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
};

const cardBase =
    'rounded-2xl border border-sky-200/80 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-300 ease-out hover:shadow-md hover:shadow-sky-100/60 hover:-translate-y-0.5';

/** Tanpa telemetry >15 dtk → anggap ESP32 / link putus */
const STALE_MS = 15_000;

export default function PzemDashboard({ machine, live, stats, apiBase, onResetStats }: Props) {
    const p = live?.pzem;
    const [periodKey, setPeriodKey] = useState(0);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 2000);
        return () => clearInterval(t);
    }, []);

    const lastTs = p?.ts ? new Date(p.ts).getTime() : 0;
    const ageMs = lastTs > 0 ? now - lastTs : Number.POSITIVE_INFINITY;
    const linkAlive = Number.isFinite(ageMs) && ageMs < STALE_MS;
    const statusOffline = machine.status_pzem === 'offline' && !linkAlive;

    const runningSec = stats?.running_sec ?? 0;
    const idleSec = stats?.idle_sec ?? 0;
    const offSec = stats?.off_sec ?? 0;
    const liveStatus =
        derivePzemStatus(
            p?.current_a,
            machine.current_threshold_a,
            p?.power_w ?? 0,
            machine.power_threshold_w,
        ) ?? machine.status_pzem;

    return (
        <div className="space-y-4 md:space-y-5 animate-in fade-in duration-500">
            <header
                className={`${cardBase} relative overflow-hidden border-sky-300/60 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-4 md:p-6`}
            >
                <div
                    className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-200/30 blur-2xl"
                    aria-hidden
                />
                <div className="relative flex flex-wrap items-start justify-between gap-3">
                    <div className="flex gap-3 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-md shadow-sky-200/50 text-sky-600 transition-transform duration-300 group-hover:scale-105">
                            <Zap className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600">
                                PZEM-004T v4
                            </p>
                            <h2
                                className="text-lg md:text-xl font-bold text-sky-950 mt-0.5 truncate"
                                style={{ fontFamily: 'Poppins, sans-serif' }}
                            >
                                {machine.name}
                            </h2>
                            <p className="text-xs text-sky-700/80 mt-0.5">
                                Deteksi operasi via kenaikan arus &amp; daya
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 max-w-md justify-end">
                        <MachineStatusBadge status={liveStatus} />
                        <SensorLinkBadges
                            linkAlive={linkAlive}
                            ageMs={ageMs}
                            hasTelemetry={!!p}
                            statusOffline={statusOffline}
                            sensorLabel="PZEM"
                            health={live?.pzemHealth}
                            telemetrySensorOk={p?.sensor_ok}
                        />
                    </div>
                </div>
            </header>

            <section className={`${cardBase} p-4 md:p-5`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                            <Clock className="h-4 w-4" aria-hidden />
                        </div>
                        <h3 className="text-sm font-bold text-sky-950">Waktu operasi hari ini (PZEM)</h3>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            if (
                                !confirm(
                                    'Reset waktu PZEM hari ini?\nData Running/Idle/Mati akan disimpan ke database (rekap periode) sebelum di-nolkan.'
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
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:border-sky-300 hover:text-sky-900 active:scale-95 transition-all duration-200"
                    >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                        Reset hari ini
                    </button>
                </div>

                <OperationKpiStrip
                    runningSec={runningSec}
                    idleSec={idleSec}
                    offSec={offSec}
                    tone="sky"
                />

                <OperationPeriodsPanel
                    machineId={machine.id}
                    sensor="pzem"
                    apiBase={apiBase}
                    refreshKey={periodKey}
                />
            </section>

            <SensorTrendChart machineId={machine.id} apiBase={apiBase} sensor="pzem" />

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                <MetricCard icon={Zap} label="Tegangan" value={fmtNum(p?.voltage_v, 1)} unit="V" />
                <MetricCard
                    icon={Activity}
                    label="Arus"
                    value={fmtNum(p?.current_a, 3)}
                    unit="A"
                    hint={`Threshold ≥ ${machine.current_threshold_a} A`}
                />
                <MetricCard
                    icon={Gauge}
                    label="Daya Aktif"
                    value={fmtNum(p?.power_w, 1)}
                    unit="W"
                    hint={
                        machine.power_threshold_w > 0
                            ? `Fallback ≥ ${machine.power_threshold_w} W`
                            : 'Fallback nonaktif'
                    }
                />
                <MetricCard icon={BatteryCharging} label="Energi Total" value={fmtNum(p?.energy_kwh, 3)} unit="kWh" />
                <MetricCard icon={Waves} label="Frekuensi" value={fmtNum(p?.frequency_hz, 1)} unit="Hz" />
                <MetricCard icon={Percent} label="Power Factor" value={fmtNum(p?.power_factor, 2)} unit="PF" />
            </div>

            <StatusTransitionsPanel
                machineId={machine.id}
                sensor="pzem"
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
            className={`group ${cardBase} p-3 md:p-4 border-sky-100 hover:border-sky-300/80 bg-gradient-to-br from-white to-sky-50/40`}
        >
            <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] md:text-[11px] uppercase tracking-wider text-sky-600 font-bold">{label}</p>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 transition-colors duration-300 group-hover:bg-sky-600 group-hover:text-white">
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                </div>
            </div>
            <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-xl md:text-2xl font-bold text-sky-950 tabular-nums transition-colors duration-300 group-hover:text-sky-800">
                    {value}
                </span>
                {unit && <span className="text-sm font-semibold text-sky-500">{unit}</span>}
            </div>
            {hint && <p className="text-[10px] text-sky-500/90 mt-1.5 font-medium">{hint}</p>}
        </article>
    );
}

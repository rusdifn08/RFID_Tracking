/** Strip KPI ala Rexy — Power On / Running / Loss / Produktivitas */

function formatDuration(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}j ${m}m`;
    if (m > 0) return `${m}m ${s}dtk`;
    return `${s}dtk`;
}

type Props = {
    runningSec: number;
    idleSec: number;
    offSec?: number;
    /** sky = PZEM, teal = ADXL */
    tone?: 'sky' | 'teal';
};

export default function OperationKpiStrip({ runningSec, idleSec, offSec = 0, tone = 'sky' }: Props) {
    // Power on = mesin ON (running + idle), bukan mati
    const powerOnSec = runningSec + idleSec;
    const lossSec = Math.max(0, powerOnSec - runningSec); // = idle
    const produktivitas = powerOnSec > 0 ? (runningSec / powerOnSec) * 100 : 0;

    const bar =
        tone === 'teal'
            ? 'from-teal-600 to-cyan-700'
            : 'from-sky-600 to-blue-700';

    return (
        <div className="space-y-2">
            <div
                className={`rounded-xl bg-gradient-to-b ${bar} text-white shadow-md overflow-hidden`}
            >
                <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/25">
                    <Kpi
                        label="Power on Duration"
                        hint="Mesin ON (running + idle)"
                        value={formatDuration(powerOnSec)}
                    />
                    <Kpi
                        label="Running Time"
                        hint="Mesin bekerja"
                        value={formatDuration(runningSec)}
                    />
                    <Kpi
                        label="Loss Time"
                        hint="Power on − Running"
                        value={formatDuration(lossSec)}
                    />
                    <Kpi
                        label="Produktivitas"
                        hint="Running ÷ Power on"
                        value={`${produktivitas.toFixed(1)}%`}
                    />
                </div>
            </div>
            {offSec > 0 && (
                <p className="text-[11px] text-slate-500 px-1">
                    Waktu mati (OFF): <span className="font-semibold tabular-nums">{formatDuration(offSec)}</span>
                    <span className="text-slate-400"> · tidak masuk Power on Duration</span>
                </p>
            )}
        </div>
    );
}

function Kpi({ label, hint, value }: { label: string; hint: string; value: string }) {
    return (
        <div className="px-3 py-3.5 md:px-4 md:py-4 text-center">
            <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-white/90 leading-tight">
                {label}
            </p>
            <p className="mt-1.5 text-lg md:text-2xl font-bold tabular-nums tracking-tight">{value}</p>
            <p className="mt-1 text-[9px] md:text-[10px] text-white/70 leading-snug">{hint}</p>
        </div>
    );
}

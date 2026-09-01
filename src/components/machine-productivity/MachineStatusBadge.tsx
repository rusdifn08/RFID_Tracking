const STYLES: Record<string, string> = {
    running: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    idle: 'bg-amber-100 text-amber-900 border-amber-200',
    off: 'bg-zinc-200 text-zinc-800 border-zinc-300',
    offline: 'bg-rose-100 text-rose-800 border-rose-200',
    error: 'bg-amber-100 text-amber-900 border-amber-200',
};

const LABELS: Record<string, string> = {
    running: 'RUNNING',
    idle: 'IDLE',
    off: 'MATI',
    offline: 'OFFLINE',
    error: 'ERROR',
};

export default function MachineStatusBadge({ status }: { status: string }) {
    const key = (status || 'idle').toLowerCase();
    const cls = STYLES[key] ?? STYLES.idle;
    const label = LABELS[key] ?? status.toUpperCase();
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border uppercase ${cls}`}
        >
            {label}
        </span>
    );
}

/** Status live dari arus: <offA → off, <thr → idle, ≥thr → running */
export function derivePzemStatus(
    currentA: number | undefined | null,
    thresholdA: number,
    powerW = 0,
    powerThresholdW = 0,
    offCurrentA = 0.01,
): 'running' | 'idle' | 'off' | null {
    if (currentA == null || Number.isNaN(currentA)) return null;
    const offA = offCurrentA > 0 ? offCurrentA : 0.01;
    // Status murni dari arus (abaikan power fallback)
    if (currentA < offA) return 'off';
    if (currentA >= thresholdA) return 'running';
    return 'idle';
}

import { kpiFromCurrentSeries } from './pzemKpi';

/** KPI dari deret arus: Off tidak masuk Power On / Loss. Loss = Idle saja. */
export { kpiFromCurrentSeries } from './pzemKpi';

// ponytail: self-check status bands + KPI off ≠ loss
if (import.meta.env.DEV) {
    console.assert(derivePzemStatus(0, 0.6, 0, 0, 0.01) === 'off');
    console.assert(derivePzemStatus(0.02, 0.6, 0, 0, 0.01) === 'idle');
    console.assert(derivePzemStatus(0.7, 0.6, 0, 0, 0.01) === 'running');
    const demo = kpiFromCurrentSeries(
        [
            { ts: '2026-07-30T00:00:00Z', current_a: 0 },
            { ts: '2026-07-30T00:01:00Z', current_a: 0 },
            { ts: '2026-07-30T00:02:00Z', current_a: 0.02 },
            { ts: '2026-07-30T00:03:00Z', current_a: 0.7 },
        ],
        0.01,
        0.6,
    );
    console.assert(demo.off === 60 && demo.idle === 60 && demo.running === 60 && demo.loss === 60);
}

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

/** Status live dari arus: <0.03A → off, <thr → idle, ≥thr → running */
export function derivePzemStatus(
    currentA: number | undefined | null,
    thresholdA: number,
    powerW = 0,
    powerThresholdW = 0,
): 'running' | 'idle' | 'off' | null {
    if (currentA == null || Number.isNaN(currentA)) return null;
    if (currentA < 0.03) return 'off';
    if (currentA >= thresholdA || (powerThresholdW > 0 && powerW >= powerThresholdW)) {
        return 'running';
    }
    return 'idle';
}

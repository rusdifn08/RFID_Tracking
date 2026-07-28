import { useCallback, useEffect, useMemo, useState } from 'react';
import MachineStatusBadge from './MachineStatusBadge';

type EventRow = {
    id: number;
    from_status: string | null;
    to_status: string;
    ts: string;
    phase_status: string;
    phase_start: string | null;
    phase_end: string;
    duration_sec: number;
    magnitude_g?: number | null;
    current_a?: number | null;
};

type StatusFilter = 'all' | 'running' | 'idle' | 'off';

/** Abaikan noise/glitch singkat */
const MIN_DURATION_SEC = 6;

function fmtDur(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}j ${m}m`;
    if (m > 0) return `${m}m ${s}d`;
    return `${s}d`;
}

function fmtTs(iso: string | null) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('id-ID');
    } catch {
        return iso;
    }
}

type Props = {
    machineId: string;
    sensor: 'pzem' | 'adxl';
    apiBase: string;
    refreshKey?: number;
    compact?: boolean;
    /** Sinkron dari halaman detail parent */
    dateFrom?: string;
    dateTo?: string;
};

export default function StatusTransitionsPanel({
    machineId,
    sensor,
    apiBase,
    refreshKey = 0,
    compact = false,
    dateFrom = '',
    dateTo = '',
}: Props) {
    const [events, setEvents] = useState<EventRow[]>([]);
    const [from, setFrom] = useState(dateFrom);
    const [to, setTo] = useState(dateTo);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    useEffect(() => {
        setFrom(dateFrom);
        setTo(dateTo);
    }, [dateFrom, dateTo]);

    const load = useCallback(async () => {
        try {
            const params = new URLSearchParams({ sensor, limit: compact ? '40' : '200' });
            if (from) params.set('from_ts', new Date(`${from}T00:00:00`).toISOString());
            if (to) params.set('to_ts', new Date(`${to}T23:59:59`).toISOString());
            const res = await fetch(
                `${apiBase}/api/machines/${machineId}/status-transitions?${params}`
            );
            if (!res.ok) return;
            const data = await res.json();
            setEvents(data.events ?? []);
        } catch {
            /* ignore */
        }
    }, [apiBase, machineId, sensor, from, to, compact]);

    useEffect(() => {
        void load();
    }, [load, refreshKey]);

    const filtered = useMemo(() => {
        return events.filter((e) => {
            // Hilangkan durasi 1–5 detik (dan 0)
            if (e.duration_sec < MIN_DURATION_SEC) return false;
            if (statusFilter === 'all') return true;
            // Filter running = hanya fase running (running → idle/off)
            return e.phase_status === statusFilter;
        });
    }, [events, statusFilter]);

    const filterHint =
        statusFilter === 'running'
            ? 'Menampilkan fase Running (dari Running sampai ganti ke Idle/Off)'
            : statusFilter === 'idle'
              ? 'Menampilkan fase Idle (dari Idle sampai ganti status)'
              : statusFilter === 'off'
                ? 'Menampilkan fase Mati/Off'
                : 'Semua fase (durasi ≥ 6 detik)';

    return (
        <div
            className={`rounded-2xl border overflow-hidden shadow-sm ${compact ? 'border-teal-200 mt-4' : 'border-slate-200'}`}
        >
            <div
                className={`px-3 md:px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${
                    compact ? 'bg-teal-50 border-teal-100' : 'bg-slate-50/80 border-slate-100'
                }`}
            >
                <div className="min-w-0">
                    <p className={`text-sm font-bold ${compact ? 'text-teal-900' : 'text-slate-800'}`}>
                        Log perpindahan status ({sensor.toUpperCase()})
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{filterHint}</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-white"
                        title="Filter fase status"
                    >
                        <option value="all">Semua status</option>
                        <option value="running">Running saja</option>
                        <option value="idle">Idle saja</option>
                        <option value="off">Mati saja</option>
                    </select>
                    {!compact && (
                        <>
                            <input
                                type="date"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px]"
                            />
                            <span className="text-slate-400 text-[11px] hidden sm:inline">s/d</span>
                            <input
                                type="date"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px]"
                            />
                            <button
                                type="button"
                                onClick={() => void load()}
                                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-sky-600 text-white"
                            >
                                Filter
                            </button>
                        </>
                    )}
                </div>
            </div>

            {filtered.length === 0 ? (
                <p className="p-4 md:p-6 text-sm text-center text-slate-400">
                    Tidak ada data untuk filter ini (durasi &lt; 6 dtk disembunyikan).
                </p>
            ) : (
                <>
                    {/* Mobile */}
                    <div className={`md:hidden divide-y divide-slate-100 ${compact ? 'max-h-52' : 'max-h-[28rem]'} overflow-y-auto`}>
                        {filtered.map((e) => (
                            <div key={e.id} className="px-4 py-3 flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1.5">
                                    <div className="flex flex-wrap gap-1.5 items-center">
                                        <MachineStatusBadge status={e.phase_status} />
                                        <span className="text-[10px] text-slate-400">→</span>
                                        <MachineStatusBadge status={e.to_status} />
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-snug">
                                        {fmtTs(e.phase_start)} → {fmtTs(e.phase_end)}
                                    </p>
                                </div>
                                <p className="text-sm font-bold tabular-nums text-slate-800 shrink-0">
                                    {fmtDur(e.duration_sec)}
                                </p>
                            </div>
                        ))}
                    </div>
                    {/* Desktop */}
                    <div className={`hidden md:block overflow-x-auto ${compact ? 'max-h-52' : 'max-h-[28rem]'} overflow-y-auto`}>
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-left text-slate-500 border-b sticky top-0 bg-white">
                                    <th className="px-4 py-2">Mulai → Selesai</th>
                                    <th className="px-4 py-2">Status fase</th>
                                    <th className="px-4 py-2">Lanjut ke</th>
                                    <th className="px-4 py-2">Durasi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((e) => (
                                    <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/70">
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            <div>{fmtTs(e.phase_start)}</div>
                                            <div className="text-slate-400">→ {fmtTs(e.phase_end)}</div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <MachineStatusBadge status={e.phase_status} />
                                        </td>
                                        <td className="px-4 py-2">
                                            <MachineStatusBadge status={e.to_status} />
                                        </td>
                                        <td className="px-4 py-2 font-semibold tabular-nums text-slate-800">
                                            {fmtDur(e.duration_sec)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

import { useCallback, useEffect, useState } from 'react';

type Period = {
    id: string;
    sensor: string;
    work_date: string;
    period_start: string;
    period_end: string;
    machine_name: string;
    operator_nik: string | null;
    operator_name: string | null;
    running_sec: number;
    idle_sec: number;
    off_sec: number;
};

function fmtDur(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}j ${m}m`;
    return `${m}m ${sec % 60}d`;
}

function fmtTs(iso: string) {
    try {
        return new Date(iso).toLocaleString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

type Props = {
    machineId: string;
    sensor: 'pzem' | 'adxl';
    apiBase: string;
    refreshKey?: number;
};

export default function OperationPeriodsPanel({ machineId, sensor, apiBase, refreshKey = 0 }: Props) {
    const [periods, setPeriods] = useState<Period[]>([]);

    const load = useCallback(async () => {
        try {
            const res = await fetch(
                `${apiBase}/api/machines/${machineId}/operation-periods?sensor=${sensor}&limit=10`
            );
            if (!res.ok) return;
            const data = await res.json();
            setPeriods(data.periods ?? []);
        } catch {
            /* ignore */
        }
    }, [apiBase, machineId, sensor]);

    useEffect(() => {
        void load();
    }, [load, refreshKey]);

    if (periods.length === 0) {
        return (
            <p className="text-[11px] text-slate-400 mt-3">
                Belum ada rekap tersimpan. Klik Reset untuk mengarsipkan waktu operasi ke database.
            </p>
        );
    }

    return (
        <div className="mt-4 rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                <p className="text-xs font-bold text-slate-700">Riwayat rekap (setelah reset)</p>
            </div>
            <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-[11px]">
                    <thead>
                        <tr className="text-left text-slate-500 border-b">
                            <th className="px-2 py-1.5">Periode</th>
                            <th className="px-2 py-1.5">Operator</th>
                            <th className="px-2 py-1.5">R</th>
                            <th className="px-2 py-1.5">I</th>
                            <th className="px-2 py-1.5">M</th>
                        </tr>
                    </thead>
                    <tbody>
                        {periods.map((p) => (
                            <tr key={p.id} className="border-b border-slate-50">
                                <td className="px-2 py-1.5 whitespace-nowrap">
                                    <div>{fmtTs(p.period_start)}</div>
                                    <div className="text-slate-400">→ {fmtTs(p.period_end)}</div>
                                </td>
                                <td className="px-2 py-1.5">
                                    {p.operator_name ? (
                                        <>
                                            {p.operator_name}
                                            <div className="text-slate-400">{p.operator_nik}</div>
                                        </>
                                    ) : (
                                        '—'
                                    )}
                                </td>
                                <td className="px-2 py-1.5 tabular-nums text-emerald-700">
                                    {fmtDur(p.running_sec)}
                                </td>
                                <td className="px-2 py-1.5 tabular-nums text-amber-700">{fmtDur(p.idle_sec)}</td>
                                <td className="px-2 py-1.5 tabular-nums text-slate-600">{fmtDur(p.off_sec)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

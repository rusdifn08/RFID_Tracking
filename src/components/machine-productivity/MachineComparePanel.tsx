import { useEffect, useState } from 'react';
import type { CompareStats, DisputeRow, MachineRow } from './types';
import MachineStatusBadge from './MachineStatusBadge';

type Props = {
    machine: MachineRow;
    liveMag: number | null;
    liveCurrent: number | null;
    livePower: number | null;
    apiBase: string;
};

export default function MachineComparePanel({ machine, liveMag, liveCurrent, livePower, apiBase }: Props) {
    const [stats, setStats] = useState<CompareStats | null>(null);
    const [disputes, setDisputes] = useState<DisputeRow[]>([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [sRes, dRes] = await Promise.all([
                    fetch(`${apiBase}/api/machines/${machine.id}/compare`),
                    fetch(`${apiBase}/api/machines/${machine.id}/disputes?limit=15`),
                ]);
                if (!sRes.ok) return;
                const sJson: CompareStats = await sRes.json();
                const dJson = dRes.ok ? await dRes.json() : [];
                if (!cancelled) {
                    setStats(sJson);
                    setDisputes(dJson);
                }
            } catch {
                /* offline */
            }
        })();
        const t = setInterval(() => {
            void fetch(`${apiBase}/api/machines/${machine.id}/compare`)
                .then((r) => (r.ok ? r.json() : null))
                .then((j) => j && setStats(j));
        }, 5000);
        return () => {
            cancelled = true;
            clearInterval(t);
        };
    }, [machine.id, machine.status_adxl, machine.status_pzem, apiBase]);

    const agree = stats?.agreement_pct ?? 0;
    const pzemScore = stats?.pzem?.score_pct ?? 0;
    const adxlScore = stats?.adxl?.score_pct ?? 0;
    const winner =
        stats && stats.total_samples >= 30
            ? pzemScore > adxlScore + 5
                ? 'PZEM lebih konsisten deteksi arus'
                : adxlScore > pzemScore + 5
                  ? 'ADXL lebih konsisten deteksi getaran'
                  : 'Keduanya setara — lihat dispute'
            : 'Kumpulkan data dulu';

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-3 md:p-4">
                <h3 className="text-sm font-semibold text-violet-900 mb-1">Perbandingan sensor (mesin sama)</h3>
                <p className="text-xs text-violet-700/80 mb-3">
                    Agreement = kedua sensor sama-sama running atau idle. Dispute = satu running, satu idle.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <SensorColumn
                        label="PZEM — Arus"
                        status={machine.status_pzem}
                        live={`${liveCurrent != null ? liveCurrent.toFixed(3) : '—'} A`}
                        threshold={`≥ ${machine.current_threshold_a} A`}
                        runningSec={stats?.pzem_running_sec ?? 0}
                        onlyActive={stats?.pzem_only_active ?? 0}
                        score={pzemScore}
                    />
                    <SensorColumn
                        label="ADXL345 — Getaran"
                        status={machine.status_adxl}
                        live={`${liveMag != null ? liveMag.toFixed(3) : '—'} G`}
                        threshold={`≥ ${machine.g_force_threshold} G`}
                        runningSec={stats?.adxl_running_sec ?? 0}
                        onlyActive={stats?.adxl_only_active ?? 0}
                        score={adxlScore}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MiniKpi label="Agreement hari ini" value={`${agree.toFixed(1)}%`} />
                <MiniKpi label="Sampel" value={String(stats?.total_samples ?? 0)} />
                <MiniKpi label="Both running" value={String(stats?.both_running ?? 0)} />
                <MiniKpi label="Dispute" value={String((stats?.pzem_only_active ?? 0) + (stats?.adxl_only_active ?? 0))} />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4">
                <p className="text-sm font-semibold text-slate-800">Kesimpulan sementara</p>
                <p className="text-xs text-slate-500 mt-1">{stats?.recommendation ?? 'Menunggu data...'}</p>
                <p className="text-xs font-medium text-sky-700 mt-2">{winner}</p>
                {livePower != null && (
                    <p className="text-[11px] text-slate-400 mt-2">Power live: {livePower.toFixed(1)} W</p>
                )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Riwayat dispute</h4>
                {disputes.length === 0 ? (
                    <p className="text-sm text-slate-400">Belum ada perbedaan status PZEM vs ADXL.</p>
                ) : (
                    <div className="overflow-x-auto max-h-48 overflow-y-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-left text-slate-500 border-b">
                                    <th className="py-1.5 pr-2">Waktu</th>
                                    <th className="py-1.5 pr-2">ADXL</th>
                                    <th className="py-1.5 pr-2">PZEM</th>
                                    <th className="py-1.5 pr-2">G</th>
                                    <th className="py-1.5">A</th>
                                </tr>
                            </thead>
                            <tbody>
                                {disputes.map((d, i) => (
                                    <tr key={`${d.ts}-${i}`} className="border-b border-slate-50">
                                        <td className="py-1.5 pr-2 whitespace-nowrap">
                                            {new Date(d.ts).toLocaleTimeString()}
                                        </td>
                                        <td className="py-1.5 pr-2">
                                            <MachineStatusBadge status={d.status_adxl} />
                                        </td>
                                        <td className="py-1.5 pr-2">
                                            <MachineStatusBadge status={d.status_pzem} />
                                        </td>
                                        <td className="py-1.5 pr-2">{d.magnitude_g?.toFixed(3) ?? '—'}</td>
                                        <td className="py-1.5">{d.current_a?.toFixed(3) ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function SensorColumn({
    label,
    status,
    live,
    threshold,
    runningSec,
    onlyActive,
    score,
}: {
    label: string;
    status: string;
    live: string;
    threshold: string;
    runningSec: number;
    onlyActive: number;
    score: number;
}) {
    return (
        <div className="rounded-lg border border-white/80 bg-white/90 p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                <MachineStatusBadge status={status} />
            </div>
            <p className="text-lg font-bold text-slate-900">{live}</p>
            <p className="text-[11px] text-slate-500 mt-1">{threshold}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                <span>Running ~{runningSec}s</span>
                <span>Only-active: {onlyActive}</span>
                <span className="col-span-2">Skor: {score.toFixed(1)}%</span>
            </div>
        </div>
    );
}

function MiniKpi({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
            <p className="text-[10px] uppercase text-slate-400">{label}</p>
            <p className="text-base font-semibold text-slate-800">{value}</p>
        </div>
    );
}

import { useEffect, useState } from 'react';
import DetectionModeCards from './DetectionModeCards';
import MachineComparePanel from './MachineComparePanel';
import MachineSensorFocusPanel from './MachineSensorFocusPanel';
import MachineStatusBadge from './MachineStatusBadge';
import MachineCalibrationPanel from './MachineCalibrationPanel';
import { iotApiBase } from './iotApi';
import type { DetectionMode, MachineRow } from './types';

type Props = {
    mode: DetectionMode;
    onModeChange: (mode: DetectionMode) => void;
    machines: MachineRow[];
    selected: MachineRow | null;
    loading: boolean;
    error: string | null;
    liveMag: number | null;
    liveCurrent: number | null;
    livePower: number | null;
    onSelect: (id: string) => void;
    onRefresh: () => void;
    onSaveCalibration: (patch:         {
            g_force_threshold: number;
            filter_aktif_ms: number;
            filter_diam_ms: number;
            power_threshold_w: number;
            current_threshold_a: number;
            off_current_a?: number;
        }) => Promise<void>;
};

function formatDuration(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}j ${m}m`;
}

function displayStatus(mode: DetectionMode, m: MachineRow) {
    if (mode === 'pzem') return m.status_pzem;
    if (mode === 'adxl') return m.status_adxl;
    return m.status;
}

export default function MachineProductivityContent({
    mode,
    onModeChange,
    machines,
    selected,
    loading,
    error,
    liveMag,
    liveCurrent,
    livePower,
    onSelect,
    onRefresh,
    onSaveCalibration,
}: Props) {
    const [sessions, setSessions] = useState<
        Array<{ id: string; started_at: string; ended_at: string | null; duration_sec: number | null; energy_kwh: number | null }>
    >([]);
    const [productivity, setProductivity] = useState<
        Array<{ work_date: string; running_sec: number; energy_kwh: number; utilization_pct: number }>
    >([]);

    const apiBase = iotApiBase();

    useEffect(() => {
        if (!selected) {
            setSessions([]);
            setProductivity([]);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const [sRes, pRes] = await Promise.all([
                    fetch(`${apiBase}/api/machines/${selected.id}/sessions?limit=20`),
                    fetch(`${apiBase}/api/machines/${selected.id}/productivity`),
                ]);
                if (!sRes.ok || !pRes.ok) return;
                const sJson = await sRes.json();
                const pJson = await pRes.json();
                if (!cancelled) {
                    setSessions(sJson);
                    setProductivity(pJson);
                }
            } catch {
                /* backend offline */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [selected, apiBase, selected?.status, selected?.status_adxl, selected?.status_pzem]);

    const runningToday = productivity[0]?.running_sec ?? 0;
    const utilToday = productivity[0]?.utilization_pct ?? 0;
    const energyToday = productivity[0]?.energy_kwh ?? 0;
    const runningCount = machines.filter((m) => displayStatus(mode, m) === 'running').length;

    return (
        <div className="w-full max-w-7xl mx-auto space-y-4 md:space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1
                        className="text-xl md:text-2xl font-bold text-slate-800"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                        Machine Productivity
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Bandingkan deteksi PZEM (arus) vs ADXL345 (getaran) — 1 Hz
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onRefresh}
                    className="px-3 py-2 text-sm rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition"
                >
                    Refresh
                </button>
            </div>

            <DetectionModeCards mode={mode} onChange={onModeChange} />

            {error && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-sm">
                    Backend belum siap: {error}. Pastikan Mosquitto + <code>cargo run</code> di{' '}
                    <code>backend-rust</code>.
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Kpi label="Mesin" value={String(machines.length)} />
                <Kpi label="Running (mode ini)" value={String(runningCount)} />
                <Kpi label="Utilisasi hari ini" value={`${utilToday.toFixed(1)}%`} />
                <Kpi label="Energi hari ini" value={`${energyToday.toFixed(2)} kWh`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <section className="lg:col-span-1 rounded-xl border border-slate-200 bg-white p-3 md:p-4">
                    <h2 className="text-sm font-semibold text-slate-700 mb-3">Daftar Mesin</h2>
                    {loading ? (
                        <p className="text-sm text-slate-400">Memuat...</p>
                    ) : machines.length === 0 ? (
                        <p className="text-sm text-slate-400">Belum ada mesin.</p>
                    ) : (
                        <ul className="space-y-2 max-h-[28rem] overflow-y-auto">
                            {machines.map((m) => (
                                <li key={m.id}>
                                    <button
                                        type="button"
                                        onClick={() => onSelect(m.id)}
                                        className={`w-full text-left rounded-lg border px-3 py-2.5 transition ${
                                            selected?.id === m.id
                                                ? 'border-sky-400 bg-sky-50'
                                                : 'border-slate-100 hover:border-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-semibold text-slate-800 text-sm">{m.code}</span>
                                            <MachineStatusBadge status={displayStatus(mode, m)} />
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5 truncate">{m.name}</p>
                                        {mode === 'compare' && (
                                            <div className="flex gap-1 mt-1.5">
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800">
                                                    PZEM {m.status_pzem}
                                                </span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-800">
                                                    ADXL {m.status_adxl}
                                                </span>
                                            </div>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="lg:col-span-2 space-y-4">
                    {selected ? (
                        <>
                            <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                    <div>
                                        <h2 className="font-semibold text-slate-800">{selected.name}</h2>
                                        <p className="text-xs text-slate-500">{selected.code}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {mode === 'compare' || mode === 'combined' ? (
                                            <>
                                                <MachineStatusBadge status={selected.status_pzem} />
                                                <MachineStatusBadge status={selected.status_adxl} />
                                                {mode === 'combined' && (
                                                    <MachineStatusBadge status={selected.status} />
                                                )}
                                            </>
                                        ) : (
                                            <MachineStatusBadge status={displayStatus(mode, selected)} />
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <Kpi label="G-Force live" value={liveMag != null ? liveMag.toFixed(3) : '—'} />
                                    <Kpi label="Arus live" value={liveCurrent != null ? `${liveCurrent.toFixed(3)} A` : '—'} />
                                    <Kpi label="Power live" value={livePower != null ? `${livePower.toFixed(1)} W` : '—'} />
                                    <Kpi label="Running hari ini" value={formatDuration(runningToday)} />
                                </div>
                            </div>

                            {mode === 'compare' && (
                                <MachineComparePanel
                                    machine={selected}
                                    liveMag={liveMag}
                                    liveCurrent={liveCurrent}
                                    livePower={livePower}
                                />
                            )}

                            {(mode === 'pzem' || mode === 'adxl') && (
                                <MachineSensorFocusPanel
                                    mode={mode}
                                    machine={selected}
                                    liveMag={liveMag}
                                    liveCurrent={liveCurrent}
                                    livePower={livePower}
                                />
                            )}

                            {mode === 'combined' && (
                                <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 md:p-4 text-sm text-slate-700">
                                    <p className="font-semibold text-sky-900">Combined OR</p>
                                    <p className="text-xs mt-1">
                                        Status gabungan = <strong>running</strong> jika PZEM ({selected.status_pzem}){' '}
                                        <em>atau</em> ADXL ({selected.status_adxl}) mendeteksi aktivitas.
                                    </p>
                                    <p className="text-xs mt-2 text-slate-500">
                                        Work session & produktivitas mengikuti status combined ini.
                                    </p>
                                </div>
                            )}

                            <MachineCalibrationPanel machine={selected} onSave={onSaveCalibration} />

                            {mode !== 'compare' && (
                                <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Work sessions</h3>
                                    {sessions.length === 0 ? (
                                        <p className="text-sm text-slate-400">Belum ada session.</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-slate-500 border-b">
                                                        <th className="py-2 pr-2">Mulai</th>
                                                        <th className="py-2 pr-2">Selesai</th>
                                                        <th className="py-2 pr-2">Durasi</th>
                                                        <th className="py-2">kWh</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sessions.map((s) => (
                                                        <tr key={s.id} className="border-b border-slate-50">
                                                            <td className="py-2 pr-2 whitespace-nowrap">
                                                                {new Date(s.started_at).toLocaleString()}
                                                            </td>
                                                            <td className="py-2 pr-2 whitespace-nowrap">
                                                                {s.ended_at
                                                                    ? new Date(s.ended_at).toLocaleString()
                                                                    : 'berjalan'}
                                                            </td>
                                                            <td className="py-2 pr-2">
                                                                {s.duration_sec != null
                                                                    ? formatDuration(s.duration_sec)
                                                                    : '—'}
                                                            </td>
                                                            <td className="py-2">
                                                                {s.energy_kwh != null
                                                                    ? s.energy_kwh.toFixed(3)
                                                                    : '—'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400 text-sm">
                            Pilih mesin di daftar kiri.
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

function Kpi({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
            <p className="text-lg font-semibold text-slate-800 mt-0.5">{value}</p>
        </div>
    );
}

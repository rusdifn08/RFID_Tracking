import { useEffect, useState } from 'react';
import { MapPin, Save, UserRound } from 'lucide-react';
import type { MachineRow } from './types';

type Props = {
    machine: MachineRow;
    apiBase: string;
    onMachineUpdated: (m: MachineRow) => void;
};

function formatDuration(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}j ${m}m`;
    if (m > 0) return `${m}m ${s}d`;
    return `${s}d`;
}

type DayUsage = {
    work_date: string;
    running_sec: number;
    idle_sec: number;
    off_sec: number;
    running_pct: number;
    idle_pct: number;
    off_pct: number;
    operator_nik: string | null;
    operator_name: string | null;
    energy_kwh: number;
};

export default function MachineShiftPanels({ machine, apiBase, onMachineUpdated }: Props) {
    const [brand, setBrand] = useState(machine.brand || 'JUKI');
    const [processName, setProcessName] = useState(machine.process_name || 'Zigzag Plaket');
    const [location, setLocation] = useState(machine.location_note ?? '');
    const [nik, setNik] = useState('');
    const [opName, setOpName] = useState('');
    const [msg, setMsg] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [days, setDays] = useState<DayUsage[]>([]);

    const displayName = `${brand.trim()} ${processName.trim()}`.trim();

    useEffect(() => {
        setBrand(machine.brand || machine.name.split(/\s+/)[0] || 'JUKI');
        setProcessName(
            machine.process_name ||
                machine.name.split(/\s+/).slice(1).join(' ') ||
                'Zigzag Plaket',
        );
        setLocation(machine.location_note ?? '');
        setMsg(null);
    }, [machine.id, machine.name, machine.brand, machine.process_name, machine.location_note]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [shiftRes, usageRes] = await Promise.all([
                    fetch(`${apiBase}/api/machines/${machine.id}/shift`),
                    fetch(`${apiBase}/api/machines/${machine.id}/daily-usage?limit=14`),
                ]);
                if (shiftRes.ok) {
                    const s = await shiftRes.json();
                    if (!cancelled) {
                        setNik(s.operator_nik ?? '');
                        setOpName(s.operator_name ?? '');
                    }
                }
                if (usageRes.ok) {
                    const u = await usageRes.json();
                    if (!cancelled) setDays(u.days ?? []);
                }
            } catch {
                /* ignore */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [apiBase, machine.id, machine.status_pzem]);

    const saveMachine = async () => {
        setSaving(true);
        setMsg(null);
        try {
            const res = await fetch(`${apiBase}/api/machines/${machine.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brand: brand.trim(),
                    process_name: processName.trim(),
                    location_note: location.trim() || null,
                }),
            });
            if (!res.ok) throw new Error(`Gagal simpan mesin (${res.status})`);
            const updated: MachineRow = await res.json();
            onMachineUpdated(updated);
            setMsg('Data mesin tersimpan.');
        } catch (e) {
            setMsg(e instanceof Error ? e.message : 'Gagal');
        } finally {
            setSaving(false);
        }
    };

    const saveShift = async () => {
        setSaving(true);
        setMsg(null);
        try {
            const res = await fetch(`${apiBase}/api/machines/${machine.id}/shift`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nik: nik.trim(), name: opName.trim() }),
            });
            if (!res.ok) {
                const t = await res.text();
                throw new Error(t || `Gagal simpan operator (${res.status})`);
            }
            setMsg('Operator shift hari ini tersimpan.');
            const usageRes = await fetch(`${apiBase}/api/machines/${machine.id}/daily-usage?limit=14`);
            if (usageRes.ok) {
                const u = await usageRes.json();
                setDays(u.days ?? []);
            }
        } catch (e) {
            setMsg(e instanceof Error ? e.message : 'Gagal');
        } finally {
            setSaving(false);
        }
    };

    const panel =
        'rounded-2xl border border-sky-200/80 bg-white/90 p-3 md:p-4 shadow-sm space-y-3';

    return (
        <div className="space-y-3">
            <section className={panel}>
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                        <MapPin className="h-3.5 w-3.5" aria-hidden />
                    </div>
                    <h3 className="text-sm font-bold text-sky-950">Data mesin</h3>
                </div>
                <label className="block text-xs font-medium text-sky-600">
                    No. Mesin
                    <input
                        value={machine.code}
                        readOnly
                        disabled
                        className="mt-1 w-full rounded-lg border border-sky-100 bg-sky-50 px-2 py-1.5 text-sm text-sky-800 cursor-not-allowed"
                    />
                </label>
                <label className="block text-xs font-medium text-sky-600">
                    Brand
                    <input
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="JUKI"
                        className="mt-1 w-full rounded-lg border border-sky-200 px-2 py-1.5 text-sm text-sky-950"
                    />
                </label>
                <label className="block text-xs font-medium text-sky-600">
                    Nama proses
                    <input
                        value={processName}
                        onChange={(e) => setProcessName(e.target.value)}
                        placeholder="Zigzag Plaket"
                        className="mt-1 w-full rounded-lg border border-sky-200 px-2 py-1.5 text-sm text-sky-950"
                    />
                </label>
                <p className="text-[11px] text-sky-700 font-semibold">
                    Nama tampilan: <span className="text-sky-950">{displayName || '—'}</span>
                </p>
                <label className="block text-xs font-medium text-sky-600">
                    Lokasi / Line
                    <input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Contoh: Line 3"
                        className="mt-1 w-full rounded-lg border border-sky-200 px-2 py-1.5 text-sm text-sky-950"
                    />
                </label>
                <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveMachine()}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                >
                    <Save className="h-3.5 w-3.5" aria-hidden />
                    Simpan data mesin
                </button>
            </section>

            <section className={panel}>
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                        <UserRound className="h-3.5 w-3.5" aria-hidden />
                    </div>
                    <h3 className="text-sm font-bold text-sky-950">Operator shift hari ini</h3>
                </div>
                <p className="text-[11px] text-sky-600/90">
                    Isi manual NIK &amp; nama. Satu shift penuh per hari — terikat ke rekap Running/Idle/Mati
                    (PZEM).
                </p>
                <label className="block text-xs font-medium text-sky-600">
                    NIK
                    <input
                        value={nik}
                        onChange={(e) => setNik(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-sky-200 px-2 py-1.5 text-sm text-sky-950"
                    />
                </label>
                <label className="block text-xs font-medium text-sky-600">
                    Nama operator
                    <input
                        value={opName}
                        onChange={(e) => setOpName(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-sky-200 px-2 py-1.5 text-sm text-sky-950"
                    />
                </label>
                <button
                    type="button"
                    disabled={saving || !nik.trim() || !opName.trim()}
                    onClick={() => void saveShift()}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                >
                    <Save className="h-3.5 w-3.5" aria-hidden />
                    Simpan operator hari ini
                </button>
            </section>

            <section className={panel}>
                <h3 className="text-sm font-bold text-sky-950 mb-1">Rekap harian PZEM</h3>
                <p className="text-[11px] text-sky-500 mb-2">14 hari terakhir (tersimpan otomatis)</p>
                {days.length === 0 ? (
                    <p className="text-xs text-sky-400">Belum ada data rekap.</p>
                ) : (
                    <div className="overflow-x-auto -mx-1">
                        <table className="w-full text-[11px] text-left">
                            <thead>
                                <tr className="text-sky-500 border-b border-sky-100">
                                    <th className="py-1.5 pr-2 font-semibold">Tanggal</th>
                                    <th className="py-1.5 pr-2 font-semibold">Operator</th>
                                    <th className="py-1.5 pr-2 font-semibold">Run</th>
                                    <th className="py-1.5 pr-2 font-semibold">Idle</th>
                                    <th className="py-1.5 font-semibold">Mati</th>
                                </tr>
                            </thead>
                            <tbody>
                                {days.map((d) => (
                                    <tr key={d.work_date} className="border-b border-sky-50 text-sky-900">
                                        <td className="py-1.5 pr-2 whitespace-nowrap">{d.work_date}</td>
                                        <td className="py-1.5 pr-2 max-w-[6rem] truncate" title={d.operator_name ?? ''}>
                                            {d.operator_name ? (
                                                <>
                                                    <span className="font-medium">{d.operator_name}</span>
                                                    <span className="block text-sky-400">{d.operator_nik}</span>
                                                </>
                                            ) : (
                                                <span className="text-sky-300">—</span>
                                            )}
                                        </td>
                                        <td className="py-1.5 pr-2 tabular-nums text-emerald-700">
                                            {formatDuration(d.running_sec)}
                                        </td>
                                        <td className="py-1.5 pr-2 tabular-nums">{formatDuration(d.idle_sec)}</td>
                                        <td className="py-1.5 tabular-nums text-slate-500">
                                            {formatDuration(d.off_sec)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {msg && <p className="text-xs text-sky-700 bg-sky-50 border border-sky-100 rounded-lg px-2.5 py-2">{msg}</p>}
        </div>
    );
}

import { useEffect, useState } from 'react';
import { RefreshCw, MonitorSmartphone } from 'lucide-react';
import type { MachineRow } from './types';

type Props = {
    machine: MachineRow;
    apiBase: string;
    onMachineUpdated: (m: MachineRow) => void;
};

export default function EspSyncPanel({ machine, apiBase, onMachineUpdated }: Props) {
    const [kpiSource, setKpiSource] = useState(machine.kpi_source === 'telemetry' ? 'telemetry' : 'esp');
    const [lcdAutoMs, setLcdAutoMs] = useState(machine.lcd_auto_ms ?? 4000);
    const [filterAktif, setFilterAktif] = useState(machine.filter_aktif_ms ?? 1500);
    const [filterDiam, setFilterDiam] = useState(machine.filter_diam_ms ?? 1500);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    useEffect(() => {
        setKpiSource(machine.kpi_source === 'telemetry' ? 'telemetry' : 'esp');
        setLcdAutoMs(machine.lcd_auto_ms ?? 4000);
        setFilterAktif(machine.filter_aktif_ms ?? 1500);
        setFilterDiam(machine.filter_diam_ms ?? 1500);
        setMsg(null);
    }, [machine.id, machine.kpi_source, machine.lcd_auto_ms, machine.filter_aktif_ms, machine.filter_diam_ms]);

    const save = async () => {
        setSaving(true);
        setMsg(null);
        try {
            const res = await fetch(`${apiBase}/api/machines/${machine.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    kpi_source: kpiSource,
                    lcd_auto_ms: lcdAutoMs,
                    filter_aktif_ms: filterAktif,
                    filter_diam_ms: filterDiam,
                }),
            });
            if (!res.ok) throw new Error(`Gagal simpan (${res.status})`);
            const updated: MachineRow = await res.json();
            onMachineUpdated(updated);
            setMsg('Tersimpan & dikirim ke ESP via MQTT.');
        } catch (e) {
            setMsg(e instanceof Error ? e.message : 'Gagal');
        } finally {
            setSaving(false);
        }
    };

    const syncNow = async () => {
        setSyncing(true);
        setMsg(null);
        try {
            const res = await fetch(`${apiBase}/api/machines/${machine.id}/sync-esp`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error(`Sync gagal (${res.status})`);
            setMsg('Sync ESP: kalibrasi + display + KPI dikirim.');
        } catch (e) {
            setMsg(e instanceof Error ? e.message : 'Gagal sync');
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-semibold text-slate-800 text-sm">
                    <MonitorSmartphone className="w-4 h-4 text-emerald-600" />
                    Kontrol ESP / LCD
                </div>
                <button
                    type="button"
                    disabled={syncing}
                    onClick={() => void syncNow()}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    Sync sekarang
                </button>
            </div>

            <label className="block text-xs text-slate-500">
                Sumber KPI (dashboard ↔ LCD)
                <select
                    value={kpiSource}
                    onChange={(e) => setKpiSource(e.target.value as 'esp' | 'telemetry')}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-800"
                >
                    <option value="esp">ESP master — LCD = sumber, dashboard ikut ESP</option>
                    <option value="telemetry">Backend master — dashboard dari telemetry, LCD di-sync</option>
                </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs text-slate-500">
                    Filter aktif (ms)
                    <input
                        type="number"
                        min={50}
                        max={60000}
                        value={filterAktif}
                        onChange={(e) => setFilterAktif(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
                    />
                </label>
                <label className="block text-xs text-slate-500">
                    Filter diam (ms)
                    <input
                        type="number"
                        min={50}
                        max={60000}
                        value={filterDiam}
                        onChange={(e) => setFilterDiam(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
                    />
                </label>
            </div>

            <label className="block text-xs text-slate-500">
                Auto-rotate LCD (ms)
                <input
                    type="number"
                    min={1000}
                    max={60000}
                    step={500}
                    value={lcdAutoMs}
                    onChange={(e) => setLcdAutoMs(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
                />
            </label>

            <p className="text-[11px] text-slate-400 leading-relaxed">
                Nama mesin & proses dikirim ke LCD dari data mesin. Threshold arus dari panel Compare.
            </p>

            <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="w-full py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
                {saving ? 'Menyimpan…' : 'Simpan & kirim ke ESP'}
            </button>

            {msg && (
                <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2">
                    {msg}
                </p>
            )}
        </div>
    );
}

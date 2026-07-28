import { useEffect, useState } from 'react';
import type { MachineRow } from './types';

type Props = {
    machine: MachineRow;
    onSave: (patch: {
        g_force_threshold: number;
        filter_aktif_ms: number;
        filter_diam_ms: number;
        power_threshold_w: number;
        current_threshold_a: number;
    }) => Promise<void>;
    showPzem?: boolean;
    showAdxl?: boolean;
    compact?: boolean;
};

export default function MachineCalibrationPanel({ machine, onSave, showPzem, showAdxl, compact }: Props) {
    const [gForce, setGForce] = useState(machine.g_force_threshold);
    const [aktifMs, setAktifMs] = useState(machine.filter_aktif_ms);
    const [diamMs, setDiamMs] = useState(machine.filter_diam_ms);
    const [powerW, setPowerW] = useState(machine.power_threshold_w);
    const [currentA, setCurrentA] = useState(machine.current_threshold_a);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    useEffect(() => {
        setGForce(machine.g_force_threshold);
        setAktifMs(machine.filter_aktif_ms);
        setDiamMs(machine.filter_diam_ms);
        setPowerW(machine.power_threshold_w);
        setCurrentA(machine.current_threshold_a);
        setMsg(null);
    }, [
        machine.id,
        machine.g_force_threshold,
        machine.filter_aktif_ms,
        machine.filter_diam_ms,
        machine.power_threshold_w,
        machine.current_threshold_a,
    ]);

    const handleSave = async () => {
        setSaving(true);
        setMsg(null);
        try {
            await onSave({
                g_force_threshold: gForce,
                filter_aktif_ms: aktifMs,
                filter_diam_ms: diamMs,
                power_threshold_w: powerW,
                current_threshold_a: currentA,
            });
            setMsg('Kalibrasi tersimpan & dikirim ke ESP via MQTT.');
        } catch (e) {
            setMsg(e instanceof Error ? e.message : 'Gagal menyimpan');
        } finally {
            setSaving(false);
        }
    };

    const title = showPzem ? 'Kalibrasi PZEM' : showAdxl ? 'Kalibrasi ADXL345' : 'Remote Calibration';

    return (
        <div
            className={
                compact
                    ? 'rounded-2xl border border-sky-200/80 bg-white/90 p-3 md:p-4 shadow-sm'
                    : 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'
            }
        >
            <h3 className={`text-sm font-bold mb-1 ${compact ? 'text-sky-950' : 'text-slate-800'}`}>{title}</h3>
            <p className={`text-xs mb-3 ${compact ? 'text-sky-600/80' : 'text-slate-400'}`}>
                Parameter disinkronkan ke backend &amp; ESP32 via MQTT command
            </p>
            <div className={compact ? 'grid grid-cols-1 gap-2.5' : 'grid grid-cols-2 md:grid-cols-5 gap-3'}>
                {(showAdxl || (!showPzem && !showAdxl)) && (
                    <Field label="Threshold G-Force" value={gForce} onChange={setGForce} step={0.05} compact={compact} />
                )}
                {(showPzem || (!showPzem && !showAdxl)) && (
                    <>
                        <Field label="Threshold arus (A)" value={currentA} onChange={setCurrentA} step={0.01} compact={compact} />
                        <Field
                            label="Power fallback (W) — 0 = off"
                            value={powerW}
                            onChange={setPowerW}
                            step={1}
                            compact={compact}
                        />
                    </>
                )}
                <Field label="Filter Aktif (ms)" value={aktifMs} onChange={setAktifMs} step={50} compact={compact} />
                <Field label="Filter Diam (ms)" value={diamMs} onChange={setDiamMs} step={100} compact={compact} />
            </div>
            <div className={`mt-3 flex ${compact ? 'flex-col items-stretch' : 'items-center'} gap-2`}>
                <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSave()}
                    className={
                        compact
                            ? 'w-full px-3 py-2 text-sm rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 transition-colors'
                            : 'px-4 py-2 text-sm rounded-lg bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50'
                    }
                >
                    {saving ? 'Menyimpan...' : 'Simpan kalibrasi'}
                </button>
                {msg && <span className={`text-xs ${compact ? 'text-sky-600' : 'text-slate-500'}`}>{msg}</span>}
            </div>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    step,
    compact,
}: {
    label: string;
    value: number;
    onChange: (n: number) => void;
    step: number;
    compact?: boolean;
}) {
    return (
        <label className={`block text-xs ${compact ? 'text-sky-600 font-medium' : 'text-slate-500'}`}>
            {label}
            <input
                type="number"
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className={`mt-1 w-full rounded-lg border px-2 py-1.5 text-sm ${
                    compact
                        ? 'border-sky-200 text-sky-950 focus:border-sky-400 focus:ring-1 focus:ring-sky-200'
                        : 'border-slate-200 text-slate-800'
                }`}
            />
        </label>
    );
}

import MachineStatusBadge from './MachineStatusBadge';
import type { DetectionMode, MachineRow } from './types';

type Props = {
    mode: DetectionMode;
    machine: MachineRow;
    liveMag: number | null;
    liveCurrent: number | null;
    livePower: number | null;
};

export default function MachineSensorFocusPanel({ mode, machine, liveMag, liveCurrent, livePower }: Props) {
    const isPzem = mode === 'pzem';
    const status = isPzem ? machine.status_pzem : machine.status_adxl;
    const title = isPzem ? 'Deteksi PZEM-004T (Arus)' : 'Deteksi ADXL345 (Getaran)';

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
                <MachineStatusBadge status={status} />
            </div>
            {isPzem ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Val label="Arus live" value={liveCurrent != null ? `${liveCurrent.toFixed(3)} A` : '—'} />
                    <Val label="Threshold arus" value={`≥ ${machine.current_threshold_a} A`} />
                    <Val label="Daya live" value={livePower != null ? `${livePower.toFixed(1)} W` : '—'} />
                    <Val label="Threshold daya (fallback)" value={`≥ ${machine.power_threshold_w} W`} />
                    <Val label="Filter aktif" value={`${machine.filter_aktif_ms} ms`} />
                    <Val label="Filter diam" value={`${machine.filter_diam_ms} ms`} />
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Val label="G-force live" value={liveMag != null ? `${liveMag.toFixed(3)} G` : '—'} />
                    <Val label="Threshold G" value={`≥ ${machine.g_force_threshold} G`} />
                    <Val label="Filter aktif" value={`${machine.filter_aktif_ms} ms`} />
                    <Val label="Filter diam" value={`${machine.filter_diam_ms} ms`} />
                </div>
            )}
            <p className="text-xs text-slate-400 mt-3">
                {isPzem
                    ? 'Mesin dianggap running jika arus ≥ threshold (atau daya ≥ fallback) selama filter aktif.'
                    : 'Mesin dianggap running jika magnitude G ≥ threshold selama filter aktif.'}
            </p>
        </div>
    );
}

function Val({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg bg-slate-50 px-2.5 py-2">
            <p className="text-[10px] uppercase text-slate-400">{label}</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
        </div>
    );
}

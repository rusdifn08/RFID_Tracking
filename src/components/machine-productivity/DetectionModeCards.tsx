import type { DetectionMode } from './types';

type Props = {
    mode: DetectionMode;
    onChange: (mode: DetectionMode) => void;
};

export default function DetectionModeCards({ mode, onChange }: Props) {
    const cards: Array<{
        id: DetectionMode;
        title: string;
        subtitle: string;
        accent: string;
    }> = [
        {
            id: 'compare',
            title: 'Compare Accuracy',
            subtitle: 'Bandingkan PZEM vs ADXL',
            accent: 'border-violet-400 bg-violet-50',
        },
        {
            id: 'pzem',
            title: 'PZEM Arus',
            subtitle: 'Deteksi via arus (A)',
            accent: 'border-amber-400 bg-amber-50',
        },
        {
            id: 'adxl',
            title: 'ADXL Getaran',
            subtitle: 'Deteksi via G-force',
            accent: 'border-teal-400 bg-teal-50',
        },
        {
            id: 'combined',
            title: 'Combined OR',
            subtitle: 'Salah satu aktif = running',
            accent: 'border-sky-400 bg-sky-50',
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
            {cards.map((c) => {
                const active = mode === c.id;
                return (
                    <button
                        key={c.id}
                        type="button"
                        onClick={() => onChange(c.id)}
                        className={`text-left rounded-xl border px-3 py-2.5 transition ${
                            active ? c.accent : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                    >
                        <p className="text-sm font-semibold text-slate-800">{c.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{c.subtitle}</p>
                    </button>
                );
            })}
        </div>
    );
}

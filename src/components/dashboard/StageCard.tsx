import { memo, type ReactNode } from 'react';

export type StageStatus = 'idle' | 'active_rfid_scan' | 'completed';

export interface StageCardProps {
    title: string;
    value: number;
    icon: ReactNode;
    status?: StageStatus;
    /** Opsional: sublabel di bawah value (mis. "Tag Encoded") */
    subLabel?: string;
    className?: string;
}

/**
 * Kartu stage pipeline Cutting: judul di atas, ikon di atas judul, nilai besar di bawah.
 * status === 'active_rfid_scan' → border glowing biru/hijau.
 */
const StageCard = memo(function StageCard({
    title,
    value,
    icon,
    status = 'idle',
    subLabel,
    className = '',
}: StageCardProps) {
    const isActiveScan = status === 'active_rfid_scan';
    const borderGlow = isActiveScan
        ? 'ring-2 ring-blue-400 ring-offset-2 animate-pulse shadow-lg shadow-blue-200/50'
        : '';

    return (
        <div
            className={`
                relative flex flex-col items-center justify-center
                bg-white rounded-lg border border-gray-200/80 shadow-sm
                min-h-[100px] sm:min-h-[110px] md:min-h-[120px] p-2 sm:p-3 transition-all duration-300
                ${borderGlow}
                ${className}
            `}
        >
            {/* Ikon di atas judul */}
            <div className="flex-shrink-0 mb-1 text-gray-400 [&_svg]:w-6 [&_svg]:h-6 sm:[&_svg]:w-7 sm:[&_svg]:h-7">
                {icon}
            </div>
            {/* Judul kartu */}
            <h3 className="text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1 line-clamp-2">
                {title}
            </h3>
            {/* Nilai besar */}
            <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-blue-600 tabular-nums leading-tight">
                {value}
            </p>
            {subLabel && (
                <p className="text-xs text-gray-500 mt-1">{subLabel}</p>
            )}
            {/* Titik indikator status (opsional, untuk konsistensi dengan referensi) */}
            {isActiveScan && (
                <span
                    className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 animate-pulse"
                    aria-hidden
                />
            )}
        </div>
    );
});

export default StageCard;

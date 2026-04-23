import { memo } from 'react';

export interface ProductionOrderInfo {
    wo: string;
    style: string;
    buyer: string;
    item: string;
    sizeColor: string;
}

interface CuttingDataHeaderCardsProps {
    data: ProductionOrderInfo;
    className?: string;
    /** Mode rapat untuk dashboard satu layar */
    compact?: boolean;
}

const FIELDS: { key: keyof ProductionOrderInfo; label: string }[] = [
    { key: 'wo', label: 'WO (Work Order)' },
    { key: 'style', label: 'Style' },
    { key: 'buyer', label: 'Buyer' },
    { key: 'item', label: 'Item' },
    { key: 'sizeColor', label: 'Size & Color' },
];

/**
 * Grid kartu konteks Production Order untuk Dashboard Cutting.
 * Label di atas, value tebal biru di bawah, border tipis rounded-lg.
 */
const CuttingDataHeaderCards = memo(function CuttingDataHeaderCards({
    data,
    className = '',
    compact = false,
}: CuttingDataHeaderCardsProps) {
    return (
        <div
            className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 ${compact ? 'gap-1' : 'gap-2'} ${className}`}
        >
            {FIELDS.map(({ key, label }) => (
                <div
                    key={key}
                    className={`bg-white rounded-lg border border-gray-200/80 shadow-sm ${compact ? 'px-1.5 py-1' : 'px-2.5 py-2'}`}
                >
                    <p
                        className={`font-medium text-slate-400 uppercase tracking-wider mb-0.5 ${compact ? 'text-[8px] leading-tight' : 'text-[10px] sm:text-xs'}`}
                    >
                        {label}
                    </p>
                    <p
                        className={`font-bold text-blue-600 truncate ${compact ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'}`}
                        title={data[key]}
                    >
                        {data[key] || '–'}
                    </p>
                </div>
            ))}
        </div>
    );
});

export default CuttingDataHeaderCards;

import { memo } from 'react';
import type { RFIDCheckItem } from '../../hooks/useCheckingRFIDQuery';

function DetailCell({ label, value }: { label: string; value?: string | number | null }) {
    const s = value == null || value === '' ? null : String(value);
    if (!s) return null;
    return (
        <div>
            <p className="text-[10px] xs:text-xs text-gray-500 mb-0.5 xs:mb-1 font-medium">{label}</p>
            <p className="text-xs xs:text-sm font-bold text-gray-800 break-words" title={s}>
                {s}
            </p>
        </div>
    );
}

/** Grid detail bundle Cutting — semua field dari API `/api/gcc/cutting/check`. */
const CuttingCheckDetailGrid = memo(({ item }: { item: RFIDCheckItem }) => {
    const hasAny =
        item.wo ||
        item.style ||
        item.meja ||
        item.line ||
        item.color ||
        item.size ||
        item.noIkat != null ||
        item.noUrut ||
        item.season ||
        item.country;

    if (!hasAny) return null;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 xs:gap-2.5 sm:gap-3 mt-2 xs:mt-2.5 sm:mt-3 pt-2 xs:pt-2.5 sm:pt-3 border-t border-emerald-100">
            <DetailCell label="WO" value={item.wo} />
            <DetailCell label="Style" value={item.style} />
            <DetailCell label="Meja" value={item.meja || item.line} />
            <DetailCell label="Warna" value={item.color} />
            <DetailCell label="Size" value={item.size} />
            <DetailCell label="No. Ikat" value={item.noIkat} />
            <DetailCell label="No. Urut" value={item.noUrut} />
            <DetailCell label="Season" value={item.season} />
            <DetailCell label="Country" value={item.country} />
        </div>
    );
});

CuttingCheckDetailGrid.displayName = 'CuttingCheckDetailGrid';

export default CuttingCheckDetailGrid;

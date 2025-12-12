import { memo } from 'react';
import StatusCard from './StatusCard';

interface StatusCardsGridProps {
    qcData: {
        reject: number;
        rework: number;
        wira: number;
        good: number;
    };
    pqcData: {
        reject: number;
        rework: number;
        wira: number;
        good: number;
    };
    onCardClick?: (type: 'GOOD' | 'REWORK' | 'REJECT' | 'WIRA', section: 'QC' | 'PQC') => void;
}

const StatusCardsGrid = memo(({ qcData, pqcData, onCardClick }: StatusCardsGridProps) => {
    return (
        <div className="flex-1 flex flex-col gap-1 xs:gap-1.5 sm:gap-2 md:gap-2.5 lg:gap-3 min-h-0" style={{ height: '62%', maxHeight: '62%', minHeight: '62%' }}>
            <div className="flex-1 grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-4 gap-1 xs:gap-1.5 sm:gap-2 md:gap-2.5 lg:gap-3 min-h-0">
                <StatusCard type="REJECT" count={qcData.reject} label="REJECT QC" onClick={() => onCardClick?.('REJECT', 'QC')} />
                <StatusCard type="REWORK" count={qcData.rework} label="REWORK QC" onClick={() => onCardClick?.('REWORK', 'QC')} />
                <StatusCard type="WIRA" count={qcData.wira} label="WIRA QC" onClick={() => onCardClick?.('WIRA', 'QC')} />
                <StatusCard type="GOOD" count={qcData.good} label="GOOD QC" onClick={() => onCardClick?.('GOOD', 'QC')} />
            </div>
            <div className="flex-1 grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-4 gap-1 xs:gap-1.5 sm:gap-2 md:gap-2.5 lg:gap-3 min-h-0">
                <StatusCard type="REJECT" count={pqcData.reject} label="REJECT PQC" onClick={() => onCardClick?.('REJECT', 'PQC')} />
                <StatusCard type="REWORK" count={pqcData.rework} label="REWORK PQC" onClick={() => onCardClick?.('REWORK', 'PQC')} />
                <StatusCard type="WIRA" count={pqcData.wira} label="WIRA PQC" onClick={() => onCardClick?.('WIRA', 'PQC')} />
                <StatusCard type="GOOD" count={pqcData.good} label="GOOD PQC" onClick={() => onCardClick?.('GOOD', 'PQC')} />
            </div>
        </div>
    );
});

StatusCardsGrid.displayName = 'StatusCardsGrid';

export default StatusCardsGrid;


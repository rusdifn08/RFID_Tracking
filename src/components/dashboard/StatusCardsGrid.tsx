import { memo } from 'react';
import StatusCard from './StatusCard';
import ChartCard from './ChartCard';
import { BarChart3, Droplets, Package, XCircle } from 'lucide-react';
import { DEFAULT_ROOM_STATUS_ENABLED } from './constants';

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
    const showRoomStatus = DEFAULT_ROOM_STATUS_ENABLED;
    
    return (
        <div className="flex-1 flex flex-row gap-1 xs:gap-1.5 sm:gap-2 md:gap-2.5 lg:gap-3 min-h-0" style={{ height: '62%', maxHeight: '62%', minHeight: '62%' }}>
            {/* Bagian kiri: 2 row status cards - 2/3 width jika Room Status aktif, 100% jika tidak aktif */}
            <div className="flex-1 flex flex-col gap-1 xs:gap-1.5 sm:gap-2 md:gap-2.5 lg:gap-3 min-h-0" style={{ 
                width: showRoomStatus ? '66.666%' : '100%', 
                maxWidth: showRoomStatus ? '66.666%' : '100%', 
                flex: showRoomStatus ? '2 1 66.666%' : '1 1 100%' 
            }}>
                {/* ROW 1: QC Cards */}
                <div className="flex-1 grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-4 gap-1 xs:gap-1.5 sm:gap-2 md:gap-2.5 lg:gap-3 min-h-0">
                    <StatusCard type="REJECT" count={qcData.reject} label="REJECT QC" onClick={() => onCardClick?.('REJECT', 'QC')} />
                    <StatusCard type="REWORK" count={qcData.rework} label="REWORK QC" onClick={() => onCardClick?.('REWORK', 'QC')} />
                    <StatusCard type="WIRA" count={qcData.wira} label="WIRA QC" onClick={() => onCardClick?.('WIRA', 'QC')} />
                    <StatusCard type="GOOD" count={qcData.good} label="GOOD QC" onClick={() => onCardClick?.('GOOD', 'QC')} />
                </div>
                {/* ROW 2: PQC Cards */}
                <div className="flex-1 grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-4 gap-1 xs:gap-1.5 sm:gap-2 md:gap-2.5 lg:gap-3 min-h-0">
                    <StatusCard type="REJECT" count={pqcData.reject} label="REJECT PQC" onClick={() => onCardClick?.('REJECT', 'PQC')} />
                    <StatusCard type="REWORK" count={pqcData.rework} label="REWORK PQC" onClick={() => onCardClick?.('REWORK', 'PQC')} />
                    <StatusCard type="WIRA" count={pqcData.wira} label="WIRA PQC" onClick={() => onCardClick?.('WIRA', 'PQC')} />
                    <StatusCard type="GOOD" count={pqcData.good} label="GOOD PQC" onClick={() => onCardClick?.('GOOD', 'PQC')} />
                </div>
            </div>
            {/* Card baru di sebelah kanan - 1/3 width, tinggi 2 row (hanya tampil jika showRoomStatus = true) */}
            {showRoomStatus && (
                <div className="flex-shrink-0 min-h-0 h-full" style={{ width: '33.333%', maxWidth: '33.333%', flex: '1 1 33.333%' }}>
                    <ChartCard
                        title="Room Status"
                        icon={BarChart3}
                        className="h-full"
                    >
                        <div className="flex flex-col gap-1 xs:gap-1.5 sm:gap-2 h-full p-1 xs:p-1.5 sm:p-2">
                            {/* Row 1: 2 card di atas - Dryroom dan Folding */}
                            <div className="flex-1 grid grid-cols-2 gap-1 xs:gap-1.5 sm:gap-2 min-h-0">
                                {/* Dryroom Card */}
                                <div className="relative flex flex-col p-1 xs:p-1.5 sm:p-2 bg-white rounded-lg xs:rounded-xl border border-blue-500 hover:shadow-md transition-all duration-300 cursor-pointer group">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        <Droplets size={10} className="xs:w-[10px] xs:h-[10px] sm:w-[12px] sm:h-[12px] md:w-[14px] md:h-[14px] text-blue-600" strokeWidth={2.5} />
                                        <h3 className="text-[6px] xs:text-[7px] sm:text-[8px] md:text-[9px] font-extrabold tracking-widest text-blue-600" style={{ textTransform: 'uppercase' }}>Dryroom</h3>
                                    </div>
                                    <div className="flex flex-col gap-0.5 xs:gap-1 flex-1 w-full min-h-0">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[8px] xs:text-[9px] sm:text-[11px] font-semibold text-gray-600">check In</span>
                                            <span className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-blue-900">0</span>
                                        </div>
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[8px] xs:text-[9px] sm:text-[11px] font-semibold text-gray-600">Check Out</span>
                                            <span className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-blue-900">0</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Folding Card */}
                                <div className="relative flex flex-col p-1 xs:p-1.5 sm:p-2 bg-white rounded-lg xs:rounded-xl border border-blue-500 hover:shadow-md transition-all duration-300 cursor-pointer group">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        <Package size={10} className="xs:w-[10px] xs:h-[10px] sm:w-[12px] sm:h-[12px] md:w-[14px] md:h-[14px] text-blue-600" strokeWidth={2.5} />
                                        <h3 className="text-[6px] xs:text-[7px] sm:text-[8px] md:text-[9px] font-extrabold tracking-widest text-blue-600" style={{ textTransform: 'uppercase' }}>Folding</h3>
                                    </div>
                                    <div className="flex flex-col gap-0.5 xs:gap-1 flex-1 w-full min-h-0">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[8px] xs:text-[9px] sm:text-[11px] font-semibold text-gray-600">Check In</span>
                                            <span className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-blue-900">0</span>
                                        </div>
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[8px] xs:text-[9px] sm:text-[11px] font-semibold text-gray-600">Check Out</span>
                                            <span className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-blue-900">0</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Row 2: 1 card besar Reject Room berisi 3 card kecil */}
                            <div className="flex-1 min-h-0">
                                <div className="relative flex flex-col p-1 xs:p-1.5 sm:p-2 h-full bg-white rounded-lg xs:rounded-xl border-2 border-red-500 hover:shadow-md transition-all duration-300 group">
                                    {/* Header Reject Room */}
                                    <div className="flex items-center justify-center gap-1 mb-1 xs:mb-1.5 sm:mb-2 flex-shrink-0">
                                        <XCircle size={12} className="xs:w-[12px] xs:h-[12px] sm:w-[14px] sm:h-[14px] md:w-[16px] md:h-[16px] text-red-600" strokeWidth={2.5} />
                                        <h3 className="text-[7px] xs:text-[8px] sm:text-[9px] md:text-[10px] font-extrabold tracking-widest text-red-600" style={{ textTransform: 'uppercase' }}>Reject Room</h3>
                                    </div>
                                    {/* 3 card kecil di dalam Reject Room */}
                                    <div className="flex-1 grid grid-cols-3 gap-1 xs:gap-1.5 sm:gap-2 min-h-0">
                                        {/* Cekin Card */}
                                        <div className="relative flex flex-col items-center justify-center p-0.5 xs:p-1 sm:p-1.5 bg-red-50 rounded-lg xs:rounded-xl border border-red-300 hover:bg-red-100 transition-all duration-300 cursor-pointer">
                                            <h4 className="text-[6px] xs:text-[7px] sm:text-[8px] md:text-[9px] font-extrabold tracking-widest mb-0.5 text-red-600" style={{ textTransform: 'uppercase' }}>Check In</h4>
                                            <span className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold leading-none text-red-900">0</span>
                                        </div>
                                        {/* Cekout Card */}
                                        <div className="relative flex flex-col items-center justify-center p-0.5 xs:p-1 sm:p-1.5 bg-red-50 rounded-lg xs:rounded-xl border border-red-300 hover:bg-red-100 transition-all duration-300 cursor-pointer">
                                            <h4 className="text-[6px] xs:text-[7px] sm:text-[8px] md:text-[9px] font-extrabold tracking-widest mb-0.5 text-red-600" style={{ textTransform: 'uppercase' }}>Check Out</h4>
                                            <span className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold leading-none text-red-900">0</span>
                                        </div>
                                        {/* Reject Mati Card */}
                                        <div className="relative flex flex-col items-center justify-center p-0.5 xs:p-1 sm:p-1.5 bg-red-50 rounded-lg xs:rounded-xl border border-red-300 hover:bg-red-100 transition-all duration-300 cursor-pointer">
                                            <h4 className="text-[6px] xs:text-[7px] sm:text-[8px] md:text-[9px] font-extrabold tracking-widest mb-0.5 text-red-600" style={{ textTransform: 'uppercase' }}>Reject Mati</h4>
                                            <span className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold leading-none text-red-900">0</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ChartCard>
                </div>
            )}
        </div>
    );
});

StatusCardsGrid.displayName = 'StatusCardsGrid';

export default StatusCardsGrid;


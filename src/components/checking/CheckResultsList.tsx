import { memo } from 'react';
import { Radio, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { RFIDCheckItem } from '../../hooks/useCheckingRFID';
import { formatTimestampSpace } from '../../utils/checkingUtils';

interface CheckResultsListProps {
    filteredItems: RFIDCheckItem[];
    checkItems: RFIDCheckItem[];
    onItemClick: (rfid: string) => void;
}

const CheckResultsList = memo(({ filteredItems, checkItems, onItemClick }: CheckResultsListProps) => {
    return (
        <div className="bg-white border-2 border-blue-500 rounded-lg p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 xs:gap-3 mb-3 xs:mb-4 sm:mb-5 md:mb-6">
                <h2 className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 tracking-wide" style={{ textTransform: 'capitalize' }}>
                    Check Results
                </h2>
                <span className="text-gray-600 font-mono text-[10px] xs:text-xs sm:text-sm md:text-base">
                    {filteredItems.length} of {checkItems.length} items
                </span>
            </div>

            <div className="space-y-2 xs:space-y-2.5 sm:space-y-3 max-h-[300px] xs:max-h-[400px] sm:max-h-[450px] md:max-h-[500px] lg:max-h-[600px] overflow-y-auto custom-scrollbar">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-8 xs:py-12 sm:py-16 text-gray-400">
                        <Radio className="w-12 xs:w-16 sm:w-20 md:w-24 h-12 xs:h-16 sm:h-20 md:h-24 mx-auto mb-2 xs:mb-3 sm:mb-4 opacity-30" />
                        <p className="text-sm xs:text-base sm:text-lg md:text-xl font-medium">Belum ada data checking</p>
                        <p className="text-[10px] xs:text-xs sm:text-sm md:text-base mt-1 xs:mt-2">Scan atau ketik RFID untuk memulai checking</p>
                    </div>
                ) : (
                    filteredItems.map((item, index) => (
                        <div
                            key={`${item.rfid}-${index}`}
                            onClick={() => item.status === 'found' && onItemClick(item.rfid)}
                            className={`relative p-2 xs:p-3 sm:p-4 md:p-5 rounded-lg border-2 border-blue-500 bg-white hover:shadow-lg hover:border-blue-600 transition-all duration-300 ${
                                item.status === 'found' ? 'cursor-pointer' : 'cursor-default'
                            }`}
                        >
                            <div className="flex items-start gap-2 xs:gap-3 sm:gap-4">
                                <div className="p-1.5 xs:p-2 sm:p-2.5 md:p-3 rounded-lg bg-blue-50 border border-blue-500 flex-shrink-0">
                                    {item.status === 'found' ? (
                                        <CheckCircle2 className="w-4 xs:w-5 sm:w-6 md:w-7 h-4 xs:h-5 sm:h-6 md:h-7 text-green-500" />
                                    ) : item.status === 'not_found' ? (
                                        <XCircle className="w-4 xs:w-5 sm:w-6 md:w-7 h-4 xs:h-5 sm:h-6 md:h-7 text-red-500" />
                                    ) : (
                                        <AlertCircle className="w-4 xs:w-5 sm:w-6 md:w-7 h-4 xs:h-5 sm:h-6 md:h-7 text-yellow-500 animate-pulse" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-1 xs:gap-2 mb-2 xs:mb-2.5 sm:mb-3">
                                        <span className="font-mono text-sm xs:text-base sm:text-lg md:text-xl font-bold text-gray-800 break-all">
                                            {item.rfid}
                                        </span>
                                        <span className="text-[10px] xs:text-xs sm:text-sm text-gray-600 bg-gray-100 px-2 xs:px-2.5 sm:px-3 py-0.5 xs:py-1 rounded-lg whitespace-nowrap">
                                            {item.timestamp.toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 xs:gap-2.5 sm:gap-3 md:gap-4 mb-1.5 xs:mb-2 flex-wrap">
                                        <span className={`text-[10px] xs:text-xs sm:text-sm font-bold px-2 xs:px-2.5 sm:px-3 py-0.5 xs:py-1 rounded-lg ${
                                            item.status === 'found'
                                                ? 'bg-green-100 text-green-700'
                                                : item.status === 'not_found'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {item.status === 'found' ? '✓ Found' : item.status === 'not_found' ? '✗ Not Found' : '⏳ Checking...'}
                                        </span>
                                        {item.location && (
                                            <span className="text-[10px] xs:text-xs text-gray-600 bg-gray-100 px-2 xs:px-2.5 sm:px-3 py-0.5 xs:py-1 rounded-lg">
                                                📍 {item.location}
                                            </span>
                                        )}
                                        {item.lastScanned && (
                                            <span className="text-[10px] xs:text-xs text-gray-600 bg-gray-100 px-2 xs:px-2.5 sm:px-3 py-0.5 xs:py-1 rounded-lg">
                                                🕒 Last Scanned: {formatTimestampSpace(item.lastScanned)}
                                            </span>
                                        )}
                                        {item.lokasi && (
                                            <span className="text-[10px] xs:text-xs text-gray-600 bg-gray-100 px-2 xs:px-2.5 sm:px-3 py-0.5 xs:py-1 rounded-lg">
                                                📦 Lokasi: {item.lokasi}
                                            </span>
                                        )}
                                        {item.statusData && (
                                            <span className={`text-[10px] xs:text-xs font-bold px-2 xs:px-2.5 sm:px-3 py-0.5 xs:py-1 rounded-lg ${
                                                item.statusData === 'Good' || item.statusData === 'OUTPUT'
                                                    ? 'bg-green-100 text-green-700'
                                                    : item.statusData === 'Rework'
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : item.statusData === 'Reject'
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-gray-100 text-gray-700'
                                            }`}>
                                                📊 Status: {item.statusData}
                                            </span>
                                        )}
                                    </div>
                                    {item.details && (
                                        <p className="text-[10px] xs:text-xs sm:text-sm text-gray-600 mb-1.5 xs:mb-2">
                                            {item.details}
                                        </p>
                                    )}
                                    {(item.wo || item.style || item.buyer || item.item || item.color || item.size) && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 xs:gap-2.5 sm:gap-3 mt-2 xs:mt-2.5 sm:mt-3 pt-2 xs:pt-2.5 sm:pt-3 border-t border-gray-200">
                                            {item.wo && (
                                                <div>
                                                    <p className="text-[10px] xs:text-xs text-gray-500 mb-0.5 xs:mb-1 font-medium">WO</p>
                                                    <p className="text-xs xs:text-sm font-bold text-gray-800">{item.wo}</p>
                                                </div>
                                            )}
                                            {item.style && (
                                                <div>
                                                    <p className="text-[10px] xs:text-xs text-gray-500 mb-0.5 xs:mb-1 font-medium">Style</p>
                                                    <p className="text-xs xs:text-sm font-bold text-gray-800">{item.style}</p>
                                                </div>
                                            )}
                                            {item.buyer && (
                                                <div className="sm:col-span-1 col-span-2">
                                                    <p className="text-[10px] xs:text-xs text-gray-500 mb-0.5 xs:mb-1 font-medium">Buyer</p>
                                                    <p className="text-xs xs:text-sm font-bold text-gray-800 truncate" title={item.buyer}>{item.buyer}</p>
                                                </div>
                                            )}
                                            {item.item && (
                                                <div className="sm:col-span-1 col-span-2">
                                                    <p className="text-[10px] xs:text-xs text-gray-500 mb-0.5 xs:mb-1 font-medium">Item</p>
                                                    <p className="text-xs xs:text-sm font-bold text-gray-800 truncate" title={item.item}>{item.item}</p>
                                                </div>
                                            )}
                                            {item.color && (
                                                <div>
                                                    <p className="text-[10px] xs:text-xs text-gray-500 mb-0.5 xs:mb-1 font-medium">Color</p>
                                                    <p className="text-xs xs:text-sm font-bold text-gray-800">{item.color}</p>
                                                </div>
                                            )}
                                            {item.size && (
                                                <div>
                                                    <p className="text-[10px] xs:text-xs text-gray-500 mb-0.5 xs:mb-1 font-medium">Size</p>
                                                    <p className="text-xs xs:text-sm font-bold text-gray-800">{item.size}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
});

CheckResultsList.displayName = 'CheckResultsList';

export default CheckResultsList;


import { memo } from 'react';
import { Activity, XCircle, Clock, MapPin, User } from 'lucide-react';
import { parseTimestamp, getStatusColor, formatLokasi } from '../../utils/checkingUtils';

interface TrackingModalProps {
    isOpen: boolean;
    selectedRfid: string;
    trackingData: any[];
    loadingTracking: boolean;
    onClose: () => void;
}

const TrackingModal = memo(({ 
    isOpen, 
    selectedRfid, 
    trackingData, 
    loadingTracking, 
    onClose 
}: TrackingModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center z-50 p-2 xs:p-3 sm:p-4">
            <div className="bg-white bg-opacity-95 backdrop-blur-md rounded-lg xs:rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-white border-opacity-20">
                {/* Header */}
                <div className="flex items-center justify-between p-2 xs:p-3 sm:p-4 md:p-6 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-2 xs:gap-2.5 sm:gap-3 flex-1 min-w-0">
                        <div className="p-1.5 xs:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                            <Activity className="w-4 xs:w-4.5 sm:w-5 md:w-6 h-4 xs:h-4.5 sm:h-5 md:h-6 text-blue-600" strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-gray-800 truncate">Tracking Data RFID</h3>
                            <p className="text-[10px] xs:text-xs sm:text-sm text-gray-600 font-mono mt-0.5 xs:mt-1 truncate">{selectedRfid}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 xs:p-1.5 hover:bg-gray-100 rounded-lg transition-colors duration-200 flex-shrink-0"
                    >
                        <XCircle className="w-4 xs:w-4.5 sm:w-5 h-4 xs:h-4.5 sm:h-5 text-gray-500 hover:text-gray-700" strokeWidth={2.5} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-2 xs:p-3 sm:p-4 md:p-6">
                    {loadingTracking ? (
                        <div className="flex items-center justify-center py-8 xs:py-12 sm:py-16">
                            <Activity className="w-6 xs:w-7 sm:w-8 h-6 xs:h-7 sm:h-8 text-blue-500 animate-spin" strokeWidth={2.5} />
                            <span className="ml-2 xs:ml-3 text-[10px] xs:text-xs sm:text-sm text-gray-600">Memuat data tracking...</span>
                        </div>
                    ) : trackingData.length === 0 ? (
                        <div className="text-center py-8 xs:py-12 sm:py-16 text-gray-400">
                            <Activity className="w-12 xs:w-16 sm:w-20 h-12 xs:h-16 sm:h-20 mx-auto mb-2 xs:mb-3 sm:mb-4 opacity-30" />
                            <p className="text-sm xs:text-base sm:text-lg md:text-xl font-medium">Tidak ada data tracking</p>
                            <p className="text-[10px] xs:text-xs sm:text-sm mt-1 xs:mt-2">Data tracking untuk RFID ini belum tersedia</p>
                        </div>
                    ) : (
                        <div className="space-y-2 xs:space-y-2.5 sm:space-y-3">
                            {trackingData.map((track, index) => (
                                <div
                                    key={`${track.id || index}`}
                                    className="relative p-2 xs:p-3 sm:p-4 rounded-lg border border-gray-200 bg-gradient-to-r from-white to-gray-50 hover:from-blue-50 hover:to-blue-100 transition-all duration-300"
                                >
                                    <div className="flex items-start gap-2 xs:gap-3 sm:gap-4">
                                        {/* Timeline indicator */}
                                        <div className="flex flex-col items-center flex-shrink-0">
                                            <div className={`w-2 xs:w-2.5 sm:w-3 h-2 xs:h-2.5 sm:h-3 rounded-full ${
                                                index === 0 ? 'bg-blue-500' : 
                                                index === trackingData.length - 1 ? 'bg-green-500' : 
                                                'bg-gray-400'
                                            }`}></div>
                                            {index < trackingData.length - 1 && (
                                                <div className="w-0.5 h-full bg-gray-300 mt-0.5 xs:mt-1"></div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 xs:gap-3 sm:gap-4 mb-1.5 xs:mb-2 flex-wrap">
                                                <div className="flex items-center gap-1.5 xs:gap-2 flex-wrap">
                                                    <span className={`text-[10px] xs:text-xs font-bold px-1.5 xs:px-2 py-0.5 xs:py-1 rounded border ${getStatusColor(track.last_status)}`}>
                                                        {track.last_status || 'Unknown'}
                                                    </span>
                                                    {track.bagian && (
                                                        <span className="text-[10px] xs:text-xs text-gray-600 bg-gray-100 px-1.5 xs:px-2 py-0.5 xs:py-1 rounded flex items-center gap-1">
                                                            <MapPin className="w-2.5 xs:w-3 h-2.5 xs:h-3" />
                                                            {formatLokasi(track.bagian)}
                                                        </span>
                                                    )}
                                                    {track.line && (
                                                        <span className="text-[10px] xs:text-xs text-blue-600 bg-blue-50 px-1.5 xs:px-2 py-0.5 xs:py-1 rounded">
                                                            Line {track.line}
                                                        </span>
                                                    )}
                                                </div>
                                                {track.timestamp && (
                                                    <span className="text-[10px] xs:text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap">
                                                        <Clock className="w-2.5 xs:w-3 h-2.5 xs:h-3" />
                                                        {parseTimestamp(track.timestamp)}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {track.nama && (
                                                <div className="flex items-center gap-1.5 xs:gap-2 text-[10px] xs:text-xs sm:text-sm text-gray-600 mb-1">
                                                    <User className="w-3 xs:w-3.5 sm:w-4 h-3 xs:h-3.5 sm:h-4" />
                                                    <span className="font-medium">{track.nama}</span>
                                                </div>
                                            )}

                                            {(track.wo || track.style || track.buyer || track.item || track.color || track.size) && (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 xs:gap-2 mt-2 xs:mt-2.5 sm:mt-3 pt-2 xs:pt-2.5 sm:pt-3 border-t border-gray-200 text-[10px] xs:text-xs">
                                                    {track.wo && (
                                                        <div>
                                                            <span className="text-gray-500 font-medium">WO:</span>
                                                            <span className="ml-1 font-semibold text-gray-700">{track.wo}</span>
                                                        </div>
                                                    )}
                                                    {track.style && (
                                                        <div>
                                                            <span className="text-gray-500 font-medium">Style:</span>
                                                            <span className="ml-1 font-semibold text-gray-700">{track.style}</span>
                                                        </div>
                                                    )}
                                                    {track.buyer && (
                                                        <div className="sm:col-span-1 col-span-2">
                                                            <span className="text-gray-500 font-medium">Buyer:</span>
                                                            <span className="ml-1 font-semibold text-gray-700 truncate block" title={track.buyer}>{track.buyer}</span>
                                                        </div>
                                                    )}
                                                    {track.item && (
                                                        <div className="sm:col-span-1 col-span-2">
                                                            <span className="text-gray-500 font-medium">Item:</span>
                                                            <span className="ml-1 font-semibold text-gray-700 truncate block" title={track.item}>{track.item}</span>
                                                        </div>
                                                    )}
                                                    {track.color && (
                                                        <div>
                                                            <span className="text-gray-500 font-medium">Color:</span>
                                                            <span className="ml-1 font-semibold text-gray-700">{track.color}</span>
                                                        </div>
                                                    )}
                                                    {track.size && (
                                                        <div>
                                                            <span className="text-gray-500 font-medium">Size:</span>
                                                            <span className="ml-1 font-semibold text-gray-700">{track.size}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {trackingData.length > 0 && (
                    <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2 xs:gap-3 p-2 xs:p-3 sm:p-4 md:p-6 border-t border-gray-200 flex-shrink-0">
                        <span className="text-[10px] xs:text-xs sm:text-sm text-gray-600 text-center xs:text-left">
                            Total: <span className="font-semibold">{trackingData.length}</span> tracking records
                        </span>
                        <button
                            onClick={onClose}
                            className="px-4 xs:px-5 sm:px-6 py-1.5 xs:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-semibold shadow-sm hover:shadow-md text-[10px] xs:text-xs sm:text-sm"
                        >
                            Tutup
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

TrackingModal.displayName = 'TrackingModal';

export default TrackingModal;


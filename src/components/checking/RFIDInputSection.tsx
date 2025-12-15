import { memo, useMemo } from 'react';
import { Search, Activity, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import type { RFIDCheckItem } from '../../hooks/useCheckingRFID';

interface RFIDInputSectionProps {
    rfidInput: string;
    setRfidInput: (value: string) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    isChecking: boolean;
    onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onCheck: () => void;
    checkItems: RFIDCheckItem[];
}

const RFIDInputSection = memo(({ 
    rfidInput, 
    setRfidInput, 
    inputRef, 
    isChecking, 
    onKeyPress, 
    onCheck,
    checkItems
}: RFIDInputSectionProps) => {
    // Hitung statistik
    const stats = useMemo(() => {
        const total = checkItems.length;
        const found = checkItems.filter(i => i.status === 'found').length;
        const notFound = checkItems.filter(i => i.status === 'not_found').length;
        return { total, found, notFound };
    }, [checkItems]);

    return (
        <div className="bg-white border-2 border-blue-500 rounded-lg p-3 xs:p-4 sm:p-5 md:p-6 hover:shadow-lg hover:border-blue-600 transition-all duration-300">
            <label className="block text-gray-700 font-bold text-[10px] xs:text-xs sm:text-sm mb-3 xs:mb-3.5 sm:mb-4 tracking-wide" style={{ textTransform: 'capitalize' }}>
                Scan Atau Ketik RFID
            </label>
            
            <div className="flex flex-col lg:flex-row gap-3 xs:gap-4 sm:gap-5">
                {/* Form Input Section - Diperkecil width */}
                <div className="flex-1 lg:flex-none lg:w-2/3 xl:w-3/5">
                    <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 xs:gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-2 xs:left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 xs:w-4.5 sm:w-5 h-4 xs:h-4.5 sm:h-5 text-blue-500" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={rfidInput}
                                onChange={(e) => setRfidInput(e.target.value)}
                                onKeyPress={onKeyPress}
                                placeholder="Scan atau ketik RFID untuk checking..."
                                disabled={isChecking}
                                className="w-full pl-8 xs:pl-10 sm:pl-12 pr-3 xs:pr-4 py-2 xs:py-2.5 sm:py-3 bg-white border-2 border-blue-500 rounded-lg text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 font-mono text-sm xs:text-base hover:bg-blue-50"
                            />
                        </div>
                        <button
                            onClick={onCheck}
                            disabled={isChecking || !rfidInput.trim()}
                            className="px-4 xs:px-5 sm:px-6 py-2 xs:py-2.5 sm:py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 xs:gap-2 justify-center text-sm xs:text-base whitespace-nowrap"
                        >
                            {isChecking ? (
                                <>
                                    <Activity className="w-4 xs:w-4.5 sm:w-5 h-4 xs:h-4.5 sm:h-5 animate-spin" />
                                    <span className="hidden xs:inline">Checking...</span>
                                    <span className="xs:hidden">...</span>
                                </>
                            ) : (
                                <>
                                    <Search className="w-4 xs:w-4.5 sm:w-5 h-4 xs:h-4.5 sm:h-5" />
                                    <span className="hidden xs:inline">Check RFID</span>
                                    <span className="xs:hidden">Check</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Statistics Section - Compact */}
                <div className="flex-1 lg:flex-none lg:w-1/3 xl:w-2/5">
                    <div className="grid grid-cols-3 gap-2 xs:gap-2.5 sm:gap-3 h-full">
                        {/* Total Checks */}
                        <div className="bg-blue-50 border border-blue-300 rounded-lg p-2 xs:p-2.5 sm:p-3 flex flex-col items-center justify-center">
                            <BarChart3 className="w-4 xs:w-5 sm:w-6 h-4 xs:h-5 sm:h-6 text-blue-500 mb-1 xs:mb-1.5" />
                            <p className="text-[8px] xs:text-[9px] sm:text-[10px] text-gray-600 font-medium mb-0.5 xs:mb-1 text-center" style={{ textTransform: 'capitalize' }}>
                                Total
                            </p>
                            <p className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold text-blue-600 leading-none">
                                {stats.total}
                            </p>
                        </div>

                        {/* Found */}
                        <div className="bg-green-50 border border-green-300 rounded-lg p-2 xs:p-2.5 sm:p-3 flex flex-col items-center justify-center">
                            <TrendingUp className="w-4 xs:w-5 sm:w-6 h-4 xs:h-5 sm:h-6 text-green-500 mb-1 xs:mb-1.5" />
                            <p className="text-[8px] xs:text-[9px] sm:text-[10px] text-gray-600 font-medium mb-0.5 xs:mb-1 text-center" style={{ textTransform: 'capitalize' }}>
                                Found
                            </p>
                            <p className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold text-green-600 leading-none">
                                {stats.found}
                            </p>
                        </div>

                        {/* Not Found */}
                        <div className="bg-red-50 border border-red-300 rounded-lg p-2 xs:p-2.5 sm:p-3 flex flex-col items-center justify-center">
                            <TrendingDown className="w-4 xs:w-5 sm:w-6 h-4 xs:h-5 sm:h-6 text-red-500 mb-1 xs:mb-1.5" />
                            <p className="text-[8px] xs:text-[9px] sm:text-[10px] text-gray-600 font-medium mb-0.5 xs:mb-1 text-center" style={{ textTransform: 'capitalize' }}>
                                Not Found
                            </p>
                            <p className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold text-red-600 leading-none">
                                {stats.notFound}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

RFIDInputSection.displayName = 'RFIDInputSection';

export default RFIDInputSection;


import { memo } from 'react';
import { Search, Activity } from 'lucide-react';

interface StatusInputSectionProps {
    rfidInput: string;
    onRfidInputChange: (value: string) => void;
    isChecking: boolean;
    onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onCheck: (rfid: string) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
}

const StatusInputSection = memo(({
    rfidInput,
    onRfidInputChange,
    isChecking,
    onKeyPress,
    onCheck,
    inputRef,
}: StatusInputSectionProps) => {
    return (
        <div className="w-full">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-5 sm:w-6 h-5 sm:h-6 text-green-500 z-10" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={rfidInput}
                        onChange={(e) => onRfidInputChange(e.target.value)}
                        onKeyPress={onKeyPress}
                        placeholder="Scan atau ketik RFID untuk checking status..."
                        disabled={isChecking}
                        className="w-full pl-12 sm:pl-14 pr-4 sm:pr-5 py-3 sm:py-4 md:py-5 bg-white border-2 border-green-500 rounded-lg text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 font-mono text-base sm:text-lg md:text-xl hover:bg-green-50 shadow-sm"
                    />
                </div>
                <button
                    onClick={() => onCheck(rfidInput)}
                    disabled={(isChecking || !rfidInput.trim())}
                    className="px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-200 flex items-center gap-2 sm:gap-3 justify-center text-base sm:text-lg md:text-xl whitespace-nowrap shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                >
                    {isChecking ? (
                        <>
                            <Activity className="w-5 sm:w-6 h-5 sm:h-6 animate-spin" />
                            <span>Checking...</span>
                        </>
                    ) : (
                        <>
                            <Search className="w-5 sm:w-6 h-5 sm:h-6" />
                            <span>Q Check</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
});

StatusInputSection.displayName = 'StatusInputSection';

export default StatusInputSection;


import { memo } from 'react';
import { Filter, Search, Download, RefreshCw } from 'lucide-react';
import type { RFIDCheckItem } from '../../hooks/useCheckingRFID';

interface FiltersAndActionsProps {
    filterStatus: 'all' | 'found' | 'not_found';
    setFilterStatus: (value: 'all' | 'found' | 'not_found') => void;
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    checkItems: RFIDCheckItem[];
    setCheckItems: React.Dispatch<React.SetStateAction<RFIDCheckItem[]>>;
    setRfidInput: (value: string) => void;
}

const FiltersAndActions = memo(({ 
    filterStatus, 
    setFilterStatus, 
    searchQuery, 
    setSearchQuery,
    checkItems,
    setCheckItems,
    setRfidInput
}: FiltersAndActionsProps) => {
    const handleClearAll = () => {
        setCheckItems([]);
        setRfidInput('');
    };

    const handleExport = () => {
        const dataStr = JSON.stringify(checkItems, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `rfid-check-${new Date().toISOString()}.json`;
        link.click();
    };

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 xs:gap-3 sm:gap-4">
            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 xs:gap-3 sm:gap-4 w-full sm:w-auto">
                <div className="flex items-center gap-1.5 xs:gap-2 bg-white border-2 border-blue-500 rounded-lg p-1.5 xs:p-2 sm:p-2 hover:shadow-md hover:border-blue-600 transition-all duration-300">
                    <Filter className="w-4 xs:w-4.5 sm:w-5 h-4 xs:h-4.5 sm:h-5 text-blue-500" />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as 'all' | 'found' | 'not_found')}
                        className="bg-transparent text-gray-700 border-none outline-none cursor-pointer text-[10px] xs:text-xs sm:text-sm"
                    >
                        <option value="all">All Status</option>
                        <option value="found">Found Only</option>
                        <option value="not_found">Not Found Only</option>
                    </select>
                </div>
                <div className="flex items-center gap-1.5 xs:gap-2 bg-white border-2 border-blue-500 rounded-lg p-1.5 xs:p-2 sm:p-2 flex-1 sm:max-w-xs hover:shadow-md hover:border-blue-600 transition-all duration-300">
                    <Search className="w-4 xs:w-4.5 sm:w-5 h-4 xs:h-4.5 sm:h-5 text-blue-500 flex-shrink-0" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search RFID..."
                        className="bg-transparent text-gray-700 border-none outline-none flex-1 placeholder:text-gray-400 text-[10px] xs:text-xs sm:text-sm"
                    />
                </div>
            </div>
            <div className="flex items-center gap-2 xs:gap-2.5 sm:gap-3 w-full sm:w-auto">
                <button
                    onClick={handleClearAll}
                    className="px-2 xs:px-3 sm:px-4 py-1.5 xs:py-2 bg-white border-2 border-blue-500 rounded-lg text-blue-500 font-medium hover:bg-blue-500 hover:text-white transition-all duration-200 flex items-center gap-1.5 xs:gap-2 justify-center flex-1 sm:flex-initial text-[10px] xs:text-xs sm:text-sm"
                >
                    <RefreshCw className="w-3.5 xs:w-4 h-3.5 xs:h-4" />
                    <span className="hidden xs:inline">Clear All</span>
                    <span className="xs:hidden">Clear</span>
                </button>
                <button
                    onClick={handleExport}
                    disabled={checkItems.length === 0}
                    className="px-2 xs:px-3 sm:px-4 py-1.5 xs:py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5 xs:gap-2 justify-center flex-1 sm:flex-initial text-[10px] xs:text-xs sm:text-sm"
                >
                    <Download className="w-3.5 xs:w-4 h-3.5 xs:h-4" />
                    Export
                </button>
            </div>
        </div>
    );
});

FiltersAndActions.displayName = 'FiltersAndActions';

export default FiltersAndActions;


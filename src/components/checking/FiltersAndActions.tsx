import { memo } from 'react';
import { Filter, Search, RefreshCw } from 'lucide-react';
import type { RFIDCheckItem } from '../../hooks/useCheckingRFID';
import excelIcon from '../../../assets/excel.png';
import { CHECKING_THEME, type CheckingTheme } from '../../utils/checkingTheme';

interface FiltersAndActionsProps {
    theme?: CheckingTheme;
    filterStatus: 'all' | 'found' | 'not_found';
    setFilterStatus: (value: 'all' | 'found' | 'not_found') => void;
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    checkItems: RFIDCheckItem[];
    setCheckItems: React.Dispatch<React.SetStateAction<RFIDCheckItem[]>>;
    setRfidInput: (value: string) => void;
}

const FiltersAndActions = memo(({ 
    theme = 'default',
    filterStatus, 
    setFilterStatus, 
    searchQuery, 
    setSearchQuery,
    checkItems,
    setCheckItems,
    setRfidInput
}: FiltersAndActionsProps) => {
    const t = CHECKING_THEME[theme];
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 bg-white border-2 ${t.filterBorder} rounded-lg p-2 ${t.filterHover} hover:text-white transition-all duration-300`}>
                    <Filter className={`w-5 h-5 ${t.filterIcon} hover:text-white`} />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as 'all' | 'found' | 'not_found')}
                        className="bg-transparent text-gray-700 border-none outline-none cursor-pointer hover:text-white"
                    >
                        <option value="all">All Status</option>
                        <option value="found">Found Only</option>
                        <option value="not_found">Not Found Only</option>
                    </select>
                </div>
                <div className={`flex items-center gap-2 bg-white border-2 ${t.filterBorder} rounded-lg p-2 flex-1 max-w-xs ${t.filterHover} hover:text-white transition-all duration-300`}>
                    <Search className={`w-5 h-5 ${t.filterIcon} hover:text-white`} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search RFID..."
                        className="bg-transparent text-gray-700 border-none outline-none flex-1 placeholder:text-gray-400 hover:text-white"
                    />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={handleClearAll}
                    className={`px-4 py-2 bg-white border-2 ${t.filterBorder} rounded-lg ${t.filterIcon} font-medium ${t.filterHover} hover:text-white transition-all duration-200 flex items-center gap-2`}
                >
                    <RefreshCw className="w-4 h-4" />
                    Clear All
                </button>
                <button
                    onClick={handleExport}
                    disabled={checkItems.length === 0}
                    className="px-3 py-2 bg-emerald-100 hover:bg-emerald-200 disabled:bg-gray-200 disabled:cursor-not-allowed text-emerald-800 disabled:text-gray-500 font-medium rounded-lg border border-emerald-200 hover:border-emerald-300 transition-all duration-200 flex items-center gap-2"
                >
                    <img 
                        src={excelIcon} 
                        alt="Export Excel" 
                        className="w-4 h-4 object-contain flex-shrink-0"
                    />
                    Export
                </button>
            </div>
        </div>
    );
});

FiltersAndActions.displayName = 'FiltersAndActions';

export default FiltersAndActions;


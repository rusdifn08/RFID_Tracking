import { memo } from 'react';
import { Filter, Search, RefreshCw } from 'lucide-react';
import excelIcon from '../../../assets/excel.png';

interface StatusFiltersAndActionsProps {
    filterStatus: 'all' | 'found' | 'not_found';
    onFilterStatusChange: (value: 'all' | 'found' | 'not_found') => void;
    searchQuery: string;
    onSearchQueryChange: (value: string) => void;
    onClearAll: () => void;
    onExport: () => void;
    hasItems: boolean;
}

const StatusFiltersAndActions = memo(({
    filterStatus,
    onFilterStatusChange,
    searchQuery,
    onSearchQueryChange,
    onClearAll,
    onExport,
    hasItems,
}: StatusFiltersAndActionsProps) => {
    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white border-2 border-green-500 rounded-lg p-2 hover:bg-green-500 hover:text-white transition-all duration-300">
                    <Filter className="w-5 h-5 text-green-500 hover:text-white" />
                    <select
                        value={filterStatus}
                        onChange={(e) => onFilterStatusChange(e.target.value as 'all' | 'found' | 'not_found')}
                        className="bg-transparent text-gray-700 border-none outline-none cursor-pointer hover:text-white"
                    >
                        <option value="all">All Status</option>
                        <option value="found">Found Only</option>
                        <option value="not_found">Not Found Only</option>
                    </select>
                </div>
                <div className="flex items-center gap-2 bg-white border-2 border-green-500 rounded-lg p-2 flex-1 max-w-xs hover:bg-green-500 hover:text-white transition-all duration-300">
                    <Search className="w-5 h-5 text-green-500 hover:text-white" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchQueryChange(e.target.value)}
                        placeholder="Search RFID..."
                        className="bg-transparent text-gray-700 border-none outline-none flex-1 placeholder:text-gray-400 hover:text-white"
                    />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={onClearAll}
                    className="px-4 py-2 bg-white border-2 border-green-500 rounded-lg text-green-500 font-medium hover:bg-green-500 hover:text-white transition-all duration-200 flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Clear All
                </button>
                <button
                    onClick={onExport}
                    disabled={!hasItems}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2"
                >
                    <img 
                        src={excelIcon} 
                        alt="Export Excel" 
                        className="w-4 h-4 object-contain"
                    />
                    Export
                </button>
            </div>
        </div>
    );
});

StatusFiltersAndActions.displayName = 'StatusFiltersAndActions';

export default StatusFiltersAndActions;


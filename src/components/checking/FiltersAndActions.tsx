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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white border-2 border-blue-500 rounded-lg p-2 hover:bg-blue-500 hover:text-white transition-all duration-300">
                    <Filter className="w-5 h-5 text-blue-500 hover:text-white" />
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
                <div className="flex items-center gap-2 bg-white border-2 border-blue-500 rounded-lg p-2 flex-1 max-w-xs hover:bg-blue-500 hover:text-white transition-all duration-300">
                    <Search className="w-5 h-5 text-blue-500 hover:text-white" />
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
                    className="px-4 py-2 bg-white border-2 border-blue-500 rounded-lg text-blue-500 font-medium hover:bg-blue-500 hover:text-white transition-all duration-200 flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Clear All
                </button>
                <button
                    onClick={handleExport}
                    disabled={checkItems.length === 0}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2"
                >
                    <Download className="w-4 h-4" />
                    Export
                </button>
            </div>
        </div>
    );
});

FiltersAndActions.displayName = 'FiltersAndActions';

export default FiltersAndActions;


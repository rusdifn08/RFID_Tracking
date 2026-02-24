import { memo } from 'react';
import { FileText, Filter, RefreshCw } from 'lucide-react';
import excelIcon from '../../../assets/excel.png';

interface ListRFIDHeaderProps {
    totalData: number;
    onFilterClick: () => void;
    onExportClick: () => void;
    onRefresh: () => void;
}

const ListRFIDHeader = memo(({
    totalData,
    onFilterClick,
    onExportClick,
    onRefresh,
}: ListRFIDHeaderProps) => {
    return (
        <div
            className="flex flex-col md:flex-row items-center justify-between gap-4 shrink-0"
            style={{ marginBottom: '0.75rem', marginTop: '0.5rem' }}
        >
            <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg shadow-blue-500/30 text-white">
                    <FileText size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">List Data RFID</h1>
                    <p className="text-slate-500 text-sm">Daftar lengkap semua RFID ID dari database</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={onFilterClick}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all flex items-center gap-2 font-medium text-sm"
                    title="Filter Data"
                >
                    <Filter size={18} />
                    <span>Filter Data</span>
                </button>
                <button
                    onClick={onExportClick}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg shadow-sm transition-all flex items-center gap-2 font-medium text-sm"
                    title="Export Excel"
                >
                    <img 
                        src={excelIcon} 
                        alt="Export Excel" 
                        className="w-4 h-4 object-contain"
                    />
                    <span>Export</span>
                </button>
                <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                    <span className="text-slate-500 text-sm font-semibold">Total ID:</span>
                    <span className="text-blue-600 text-xl font-bold">{totalData}</span>
                </div>
                <button
                    onClick={onRefresh}
                    className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-all text-slate-600 hover:text-blue-600"
                    title="Refresh Data"
                >
                    <RefreshCw size={20} />
                </button>
            </div>
        </div>
    );
});

ListRFIDHeader.displayName = 'ListRFIDHeader';

export default ListRFIDHeader;


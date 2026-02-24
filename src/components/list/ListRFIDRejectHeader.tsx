import { memo } from 'react';
import { XCircle, Filter, RefreshCw } from 'lucide-react';
import excelIcon from '../../../assets/excel.png';

interface ListRFIDRejectHeaderProps {
    totalReject: number;
    onFilterClick: () => void;
    onExportClick: () => void;
    onRefresh: () => void;
}

const ListRFIDRejectHeader = memo(({
    totalReject,
    onFilterClick,
    onExportClick,
    onRefresh,
}: ListRFIDRejectHeaderProps) => {
    return (
        <div
            className="flex flex-col md:flex-row items-center justify-between gap-4 shrink-0"
            style={{ marginBottom: '0.75rem', marginTop: '0.5rem' }}
        >
            <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-red-500 via-rose-500 to-blue-600 rounded-xl shadow-lg shadow-red-500/30 text-white">
                    <XCircle size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">List RFID Reject</h1>
                    <p className="text-slate-500 text-sm">
                        Daftar khusus RFID dengan status <span className="font-semibold text-red-600">REJECT</span>
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={onFilterClick}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition-all flex items-center gap-2 font-medium text-sm"
                    title="Filter Data Reject"
                >
                    <Filter size={18} />
                    <span>Filter Data</span>
                </button>
                <button
                    onClick={onExportClick}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-red-500 hover:from-blue-600 hover:to-red-600 text-white rounded-lg shadow-sm transition-all flex items-center gap-2 font-medium text-sm"
                    title="Export Excel Reject"
                >
                    <img 
                        src={excelIcon} 
                        alt="Export Excel" 
                        className="w-4 h-4 object-contain"
                    />
                    <span>Export Reject</span>
                </button>
                <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                    <span className="text-slate-500 text-sm font-semibold">Total Reject:</span>
                    <span className="text-red-600 text-xl font-bold">{totalReject}</span>
                </div>
                <button
                    onClick={onRefresh}
                    className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-all text-slate-600 hover:text-red-600"
                    title="Refresh Data"
                >
                    <RefreshCw size={20} />
                </button>
            </div>
        </div>
    );
});

ListRFIDRejectHeader.displayName = 'ListRFIDRejectHeader';

export default ListRFIDRejectHeader;


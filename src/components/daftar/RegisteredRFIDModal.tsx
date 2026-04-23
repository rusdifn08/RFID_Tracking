import { memo, useMemo } from 'react';
import { X, ListChecks, Search } from 'lucide-react';

interface RegisteredRFIDModalProps {
    isOpen: boolean;
    data: any[];
    loading: boolean;
    searchTerm: string;
    filterStatus: string;
    filterColor: string;
    filterSize: string;
    uniqueColors: string[];     
    uniqueSizes: string[];
    onClose: () => void;
    onSearchChange: (value: string) => void;
    onFilterStatusChange: (value: string) => void;
    onFilterColorChange: (value: string) => void;
    onFilterSizeChange: (value: string) => void;
    getItemStatus: (item: any) => string;
}

const RegisteredRFIDModal = memo(({
    isOpen,
    data,
    loading,
    searchTerm,
    filterStatus,
    filterColor,
    filterSize,
    uniqueColors,
    uniqueSizes,
    onClose,
    onSearchChange,
    onFilterStatusChange,
    onFilterColorChange,
    onFilterSizeChange,
    getItemStatus,
}: RegisteredRFIDModalProps) => {
    const filteredData = useMemo(() => {
        return data.filter(item => {
            if (filterStatus !== 'Semua') {
                const itemStatus = getItemStatus(item);
                if (itemStatus !== filterStatus) return false;
            }

            if (filterColor !== 'Semua' && item.color !== filterColor) return false;
            if (filterSize !== 'Semua' && item.size !== filterSize) return false;

            if (searchTerm.trim()) {
                const searchLower = searchTerm.toLowerCase();
                return (
                    (item.rfid_garment?.toLowerCase() || '').includes(searchLower) ||
                    (item.wo?.toLowerCase() || '').includes(searchLower) ||
                    (item.style?.toLowerCase() || '').includes(searchLower) ||
                    (item.buyer?.toLowerCase() || '').includes(searchLower) ||
                    (item.item?.toLowerCase() || '').includes(searchLower) ||
                    (item.color?.toLowerCase() || '').includes(searchLower) ||
                    (item.size?.toLowerCase() || '').includes(searchLower)
                );
            }

            return true;
        });
    }, [data, filterStatus, filterColor, filterSize, searchTerm, getItemStatus]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] sm:h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 p-6 flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <ListChecks className="text-white" size={24} />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Registered RFID</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white hover:bg-white/30"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex items-end gap-3 flex-wrap">
                        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                            <label className="block text-xs font-semibold text-white/90 mb-1.5">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/80" size={16} />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    placeholder="Search RFID, WO, Style..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-white/95 backdrop-blur-sm border-2 border-white/30 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all shadow-lg"
                                />
                            </div>
                        </div>

                        <div className="relative">
                            <label className="block text-xs font-semibold text-white/90 mb-1.5">Filter Status</label>
                            <div className="relative">
                                <select
                                    value={filterStatus}
                                    onChange={(e) => onFilterStatusChange(e.target.value)}
                                    className="pl-4 pr-10 py-2.5 bg-white/95 backdrop-blur-sm border-2 border-white/30 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all appearance-none cursor-pointer shadow-lg min-w-[160px]"
                                >
                                    <option value="Semua">Semua</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Waiting">Waiting</option>
                                    <option value="isDone">isDone</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <label className="block text-xs font-semibold text-white/90 mb-1.5">Filter Color</label>
                            <div className="relative">
                                <select
                                    value={filterColor}
                                    onChange={(e) => onFilterColorChange(e.target.value)}
                                    className="pl-4 pr-10 py-2.5 bg-white/95 backdrop-blur-sm border-2 border-white/30 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all appearance-none cursor-pointer shadow-lg min-w-[140px]"
                                >
                                    <option value="Semua">Semua</option>
                                    {uniqueColors.map((color) => (
                                        <option key={color} value={color}>{color}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <label className="block text-xs font-semibold text-white/90 mb-1.5">Filter Size</label>
                            <div className="relative">
                                <select
                                    value={filterSize}
                                    onChange={(e) => onFilterSizeChange(e.target.value)}
                                    className="pl-4 pr-10 py-2.5 bg-white/95 backdrop-blur-sm border-2 border-white/30 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all appearance-none cursor-pointer shadow-lg min-w-[120px]"
                                >
                                    <option value="Semua">Semua</option>
                                    {uniqueSizes.map((size) => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="ml-auto">
                            <div className="bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl px-4 py-2.5 shadow-lg">
                                <div className="text-xs font-semibold text-white/90 mb-0.5">Total</div>
                                <div className="text-2xl font-bold text-white">{filteredData.length}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden p-6 bg-gradient-to-br from-slate-50 to-blue-50/30 min-h-0 flex flex-col">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-600 font-medium">Memuat data...</p>
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-slate-400 h-full min-h-[400px]">
                            <div className="p-4 bg-blue-100 rounded-full mb-4">
                                <ListChecks size={48} className="text-blue-500 opacity-50" />
                            </div>
                            <p className="text-lg font-bold text-slate-600 mb-1">Tidak ada data</p>
                            <p className="text-sm">Tidak ada RFID yang terdaftar dengan filter yang dipilih</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden h-full flex flex-col">
                            <style>{`
                                .registered-rfid-table::-webkit-scrollbar {
                                    width: 8px;
                                    height: 8px;
                                }
                                .registered-rfid-table::-webkit-scrollbar-track {
                                    background: #f1f5f9;
                                    border-radius: 4px;
                                }
                                .registered-rfid-table::-webkit-scrollbar-thumb {
                                    background: #cbd5e1;
                                    border-radius: 4px;
                                }
                                .registered-rfid-table::-webkit-scrollbar-thumb:hover {
                                    background: #94a3b8;
                                }
                            `}</style>
                            <div className="registered-rfid-table overflow-y-auto overflow-x-auto flex-1 min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 text-white">
                                            <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">RFID ID</th>
                                            <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">WO</th>
                                            <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">Style</th>
                                            <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">Buyer</th>
                                            <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">Item</th>
                                            <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">Color</th>
                                            <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">Size</th>
                                            <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {filteredData.map((item, index) => {
                                            const status = getItemStatus(item);
                                            const statusColor = status === 'In Progress'
                                                ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-300'
                                                : status === 'Waiting'
                                                    ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-300'
                                                    : 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-300';

                                            return (
                                                <tr
                                                    key={item.id || index}
                                                    className={`hover:bg-blue-50/50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                                                >
                                                    <td className="px-4 py-3.5">
                                                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-mono font-bold bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200 shadow-sm">
                                                            {item.rfid_garment || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-sm font-semibold text-slate-700">{item.wo || '-'}</td>
                                                    <td className="px-4 py-3.5 text-sm font-medium text-slate-700">{item.style || '-'}</td>
                                                    <td className="px-4 py-3.5 text-sm text-slate-700">
                                                        <span className="truncate block max-w-[200px]" title={item.buyer || '-'}>
                                                            {item.buyer || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-sm text-slate-700">
                                                        <span className="truncate block max-w-[250px]" title={item.item || '-'}>
                                                            {item.item || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-sm font-semibold">
                                                            <span
                                                                className="w-4 h-4 rounded-full border-2 border-slate-300 shadow-sm"
                                                                style={{ backgroundColor: item.color?.toLowerCase() || '#ccc' }}
                                                            ></span>
                                                            <span className="text-slate-700">{item.color || '-'}</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-sm font-bold text-blue-700 min-w-[50px]">
                                                            {item.size || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border-2 shadow-sm ${statusColor}`}>
                                                            {status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

RegisteredRFIDModal.displayName = 'RegisteredRFIDModal';

export default RegisteredRFIDModal;


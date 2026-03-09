import { memo } from 'react';
import { Search, Filter, FileText, Activity, MapPin } from 'lucide-react';

interface ListRFIDFiltersProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    searchWO: string;
    onSearchWOChange: (value: string) => void;
    filterWO: string;
    onFilterWOChange: (value: string) => void;
    filterBuyer: string;
    onFilterBuyerChange: (value: string) => void;
    filterStatus: string;
    onFilterStatusChange: (value: string) => void;
    filterLocation: string;
    onFilterLocationChange: (value: string) => void;
    uniqueWO: string[];
    uniqueBuyers: string[];
    uniqueStatuses: string[];
    uniqueLocations: string[];
}

const ListRFIDFilters = memo(({
    searchTerm,
    onSearchChange,
    searchWO,
    onSearchWOChange,
    filterWO,
    onFilterWOChange,
    filterBuyer,
    onFilterBuyerChange,
    filterStatus,
    onFilterStatusChange,
    filterLocation,
    onFilterLocationChange,
    uniqueWO,
    uniqueBuyers,
    uniqueStatuses,
    uniqueLocations,
}: ListRFIDFiltersProps) => {
    return (
        <div
            className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4 shrink-0"
            style={{ marginBottom: '20px', padding: '20px' }}
        >
            <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by RFID, WO, Style, Buyer, Item, Color, Size, Status, Location, Line..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1 md:pb-0">
                    {/* Search WO - filter by nomor WO (partial match) */}
                    <div className="relative min-w-[160px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search WO..."
                            value={searchWO}
                            onChange={(e) => onSearchWOChange(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>
                    {/* All WO Filter (dropdown exact) */}
                    <div className="relative min-w-[140px]">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            value={filterWO}
                            onChange={(e) => onFilterWOChange(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                            <option value="">All WO</option>
                            {uniqueWO.map((wo: string) => (
                                <option key={wo} value={wo}>{wo}</option>
                            ))}
                        </select>
                    </div>

                    {/* All Buyers Filter */}
                    <div className="relative min-w-[140px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            value={filterBuyer}
                            onChange={(e) => onFilterBuyerChange(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                            <option value="">All Buyers</option>
                            {uniqueBuyers.map((buyer: string) => (
                                <option key={buyer} value={buyer}>{buyer}</option>
                            ))}
                        </select>
                    </div>

                    {/* All Status Filter */}
                    <div className="relative min-w-[140px]">
                        <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            value={filterStatus}
                            onChange={(e) => onFilterStatusChange(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                            <option value="">All Status</option>
                            {uniqueStatuses.map((status: string) => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>

                    {/* All Locations Filter */}
                    <div className="relative min-w-[140px]">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            value={filterLocation}
                            onChange={(e) => onFilterLocationChange(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                            <option value="">All Locations</option>
                            {uniqueLocations.map((location: string) => (
                                <option key={location} value={location}>{location}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
});

ListRFIDFilters.displayName = 'ListRFIDFilters';

export default ListRFIDFilters;


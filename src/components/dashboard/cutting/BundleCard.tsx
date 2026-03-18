import { memo } from 'react';
import { PackagePlus } from 'lucide-react';

export interface BundleRow {
    no: number;
    bundleId?: string;
    wty: number;
    wo: string;
    rfidTag: string;
}

interface BundleCardProps {
    data: BundleRow[];
    className?: string;
}

/**
 * Card tabel tracking Bundle: per bundle ada WTY, WO, dan Tag RFID.
 */
const BundleCard = memo(function BundleCard({ data, className = '' }: BundleCardProps) {
    return (
        <div
            className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col ${className}`}
        >
            <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 flex-shrink-0">
                <div className="rounded-md bg-blue-50 p-1.5 text-blue-600">
                    <PackagePlus className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">
                    Bundle
                </h3>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0">
                        <tr>
                            <th className="px-2 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-200">
                                No
                            </th>
                            <th className="px-2 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-200">
                                WTY
                            </th>
                            <th className="px-2 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-200">
                                WO
                            </th>
                            <th className="px-2 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-200">
                                Tag RFID
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-2 py-4 text-center text-gray-400 text-xs">
                                    Belum ada data bundle
                                </td>
                            </tr>
                        ) : (
                            data.map((row) => (
                                <tr key={row.no} className="border-b border-gray-100 hover:bg-slate-50/50">
                                    <td className="px-2 py-1.5 text-xs text-slate-700">{row.no}</td>
                                    <td className="px-2 py-1.5 text-xs font-medium text-blue-600">{row.wty}</td>
                                    <td className="px-2 py-1.5 text-xs text-slate-700 truncate max-w-[80px]" title={row.wo}>
                                        {row.wo}
                                    </td>
                                    <td className="px-2 py-1.5 text-xs font-mono text-slate-600 truncate max-w-[100px]" title={row.rfidTag}>
                                        {row.rfidTag}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

export default BundleCard;

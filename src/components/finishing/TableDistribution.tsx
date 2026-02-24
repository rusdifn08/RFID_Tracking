import { memo } from 'react';
import { Table as TableIcon } from 'lucide-react';
import { Card } from './Card';
import { ExportButton } from './ExportButton';

interface TableDistributionData {
 line: string;
 wo: string;
 item: string;
 waiting: number;
 checkIn: number;
 checkOut: number;
 style?: string;
 buyer?: string;
 operatorNIK?: string;
 operatorName?: string;
}

interface TableDistributionProps {
 data: TableDistributionData[];
 themeColor?: 'sky' | 'teal';
 onExport?: () => void;
 title?: string;
}

export const TableDistribution = memo(({ data, themeColor = 'sky', onExport, title = 'Tabel Distribution' }: TableDistributionProps) => {
 const hoverColor = themeColor === 'teal' ? 'hover:bg-teal-50/60' : 'hover:bg-sky-50/60';
 const borderColor = themeColor === 'teal' ? 'group-hover:border-teal-500' : 'group-hover:border-sky-500';
 const textColor = themeColor === 'teal' ? 'text-teal-600' : 'text-sky-600';
 return (
  <Card title={title} icon={TableIcon} action={onExport ? <ExportButton onClick={onExport} /> : undefined}>
   <div className="flex-1 min-h-0 overflow-hidden relative rounded-xl border border-slate-200 mt-1 bg-white">
    <div className="absolute inset-0 overflow-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
     <table className="w-full text-left border-collapse">
      <thead className="bg-slate-50/90 backdrop-blur sticky top-0 z-10 shadow-sm">
       <tr>
        {['Line', 'WO', 'Item', 'Waiting', 'Check In', 'Shipment'].map((h, i) => (
         <th key={i} className="px-1.5 sm:px-2 py-1.5 font-bold text-slate-600 uppercase tracking-wider text-center" style={{ fontSize: 'clamp(8px, 1.1vw, 13px)' }}>
          {h === 'Check In' ? (
           <>
            <span className="hidden lg:inline whitespace-nowrap">Check In</span>
            <div className="lg:hidden flex flex-col items-center justify-center">
             <span className="leading-tight">Check</span>
             <span className="leading-tight">In</span>
            </div>
           </>
          ) : h === 'Shipment' ? (
           <>
            <span className="hidden lg:inline whitespace-nowrap">Shipment</span>
            <div className="lg:hidden flex flex-col items-center justify-center">
             <span className="leading-tight">Ship</span>
             <span className="leading-tight">ment</span>
            </div>
           </>
          ) : (
           <span className="whitespace-nowrap">{h}</span>
          )}
         </th>
        ))}
       </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
       {data.map((row, idx) => (
        <tr key={idx} className={`group ${hoverColor} transition-colors duration-150 cursor-default`}>
         <td className={`px-1.5 sm:px-2 py-1.5 font-bold text-slate-600 border-l-2 border-transparent ${borderColor} text-center`} style={{ fontSize: 'clamp(8px, 1.1vw, 13px)' }}>{row.line}</td>
         <td className={`px-1.5 sm:px-2 py-1.5 ${textColor} font-bold text-center`} style={{ fontSize: 'clamp(8px, 1.1vw, 13px)' }}>{row.wo}</td>
         <td className="px-1.5 sm:px-2 py-1.5 text-slate-600 font-medium truncate max-w-[80px] sm:max-w-[100px] text-center" title={row.item} style={{ fontSize: 'clamp(8px, 1.1vw, 13px)' }}>{row.item}</td>
         <td className="px-1.5 sm:px-2 py-1.5 font-mono font-bold text-orange-600 bg-orange-50/50 text-center" style={{ fontSize: 'clamp(8px, 1.1vw, 13px)' }}>{row.waiting}</td>
         <td className="px-1.5 sm:px-2 py-1.5 font-mono font-bold text-sky-600 bg-sky-50/50 text-center" style={{ fontSize: 'clamp(8px, 1.1vw, 13px)' }}>{row.checkIn}</td>
         <td className="px-1.5 sm:px-2 py-1.5 font-mono font-bold text-emerald-600 bg-emerald-50/50 text-center" style={{ fontSize: 'clamp(8px, 1.1vw, 13px)' }}>{row.checkOut}</td>
        </tr>
       ))}
      </tbody>
     </table>
    </div>
   </div>
  </Card>
 );
});

TableDistribution.displayName = 'TableDistribution';

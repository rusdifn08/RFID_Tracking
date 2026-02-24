import { memo, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { BarChart3 as BarChartIcon } from 'lucide-react';
import ChartCard from './ChartCard';
import type { WiraDashboardData } from '../../hooks/useWiraDashboardWebSocket';

interface OverviewRFIDChartProps {
 wiraData: WiraDashboardData[] | undefined;
 lineId: string;
}

const parseNumber = (value: any): number => {
 if (typeof value === 'number') return value;
 if (typeof value === 'string') {
  const num = parseFloat(value.replace(/[^\d.-]/g, ''));
  return isNaN(num) ? 0 : num;
 }
 return 0;
};

const OverviewRFIDChart = memo(({ wiraData, lineId }: OverviewRFIDChartProps) => {
 // Extract dan aggregate data dari wira dashboard untuk line tertentu
 const chartData = useMemo(() => {
  if (!wiraData || !Array.isArray(wiraData) || wiraData.length === 0) {
   return {
    pieData: [
     { name: 'Good', value: 0, color: '#10b981' },
     { name: 'Rework', value: 0, color: '#f59e0b' },
     { name: 'Reject', value: 0, color: '#ef4444' },
     { name: 'WIRA', value: 0, color: '#eab308' },
    ],
    total: 0,
   };
  }

  // Normalisasi lineId untuk matching
  const normalizedLineId = /^\d+$/.test(lineId) ? lineId : lineId.replace(/[^\d]/g, '') || '1';
  const targetLineNum = parseInt(normalizedLineId, 10);

  // Filter data berdasarkan lineId
  const filteredData = wiraData.filter((item) => {
   const itemLine = String(item.line || '').trim();
   const itemLineMatch = itemLine.match(/(\d+)/);
   const itemLineNum = itemLineMatch ? parseInt(itemLineMatch[1], 10) : parseInt(itemLine, 10);

   const lineMatch = itemLine === normalizedLineId ||
    (!isNaN(itemLineNum) && !isNaN(targetLineNum) && itemLineNum === targetLineNum);

   return lineMatch;
  });

  // Aggregate data dari semua item yang match
  const aggregated = filteredData.reduce((acc, item) => {
   return {
    good: acc.good + parseNumber(item.Good || 0),
    rework: acc.rework + parseNumber(item.Rework || 0),
    reject: acc.reject + parseNumber(item.Reject || 0),
    wira: acc.wira + parseNumber(item.WIRA || 0),
   };
  }, {
   good: 0,
   rework: 0,
   reject: 0,
   wira: 0,
  });

  const total = aggregated.good + aggregated.rework + aggregated.reject + aggregated.wira;

  return {
   pieData: [
    { name: 'Good', value: aggregated.good, color: '#10b981' },
    { name: 'Rework', value: aggregated.rework, color: '#f59e0b' },
    { name: 'Reject', value: aggregated.reject, color: '#ef4444' },
    { name: 'WIRA', value: aggregated.wira, color: '#eab308' },
   ],
   total,
  };
 }, [wiraData, lineId]);

 return (
  <ChartCard
   title="Overview RFID"
   icon={BarChartIcon}
   className="h-full w-full"
  >
   <div className="flex flex-col md:flex-row items-center h-full" style={{ padding: '0.5%' }}>
    {/* Chart */}
    <div className="w-full md:w-[55%] h-full relative" style={{ minHeight: '100px' }}>
     <ResponsiveContainer width="100%" height="100%">
      <PieChart>
       <Pie
        data={chartData.pieData}
        cx="50%"
        cy="50%"
        innerRadius={0}
        outerRadius="90%"
        dataKey="value"
        stroke="white"
        strokeWidth={2}
        className="xs:stroke-[2px] sm:stroke-[2.5px] md:stroke-[3px]"
       >
        {chartData.pieData.map((entry, index) => (
         <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
       </Pie>
      </PieChart>
     </ResponsiveContainer>
    </div>
    {/* Legend */}
    <div className="w-full md:w-[45%] flex flex-col justify-center h-full gap-1 xs:gap-1.5 sm:gap-2" style={{ paddingBottom: '0.5rem', paddingLeft: '0.5rem' }}>
     {chartData.pieData.map((item, index) => (
      <div key={index} className="flex items-center gap-2">
       <div
        className="w-3 h-3 xs:w-4 xs:h-4 sm:w-5 sm:h-5 rounded-sm flex-shrink-0"
        style={{ backgroundColor: item.color }}
       />
       <span className="text-[8px] xs:text-[9px] sm:text-xs md:text-sm font-semibold text-gray-700">
        {item.name}: <span className="font-bold">{item.value}</span>
       </span>
      </div>
     ))}
     <div className="mt-1 xs:mt-1.5 sm:mt-2 pt-1 xs:pt-1.5 sm:pt-2 border-t border-gray-200">
      <span className="text-[8px] xs:text-[9px] sm:text-xs md:text-sm font-bold text-gray-800">
       Total: {chartData.total}
      </span>
     </div>
    </div>
   </div>
  </ChartCard>
 );
});

OverviewRFIDChart.displayName = 'OverviewRFIDChart';

export default OverviewRFIDChart;

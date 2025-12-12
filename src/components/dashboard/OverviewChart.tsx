import { memo, useMemo, useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import ChartCard from './ChartCard';
import CustomPieLegend from './CustomPieLegend';

interface OverviewChartProps {
    pieData: Array<{ name: string; value: number; display: string; color: string }>;
    outputLine: number;
}

const OverviewChart = memo(({ pieData, outputLine }: OverviewChartProps) => {
    const totalCount = useMemo(() => {
        return outputLine ?? pieData.reduce((sum, item) => sum + item.value, 0);
    }, [outputLine, pieData]);

    const cardRef = useRef<HTMLDivElement>(null);
    const [showChart, setShowChart] = useState(true);

    useEffect(() => {
        const checkWidth = () => {
            if (cardRef.current) {
                const width = cardRef.current.offsetWidth;
                // Hide chart jika width card kurang dari 250px
                setShowChart(width >= 250);
            }
        };

        checkWidth();
        window.addEventListener('resize', checkWidth);
        
        // Use ResizeObserver untuk detect perubahan width card
        const resizeObserver = new ResizeObserver(checkWidth);
        if (cardRef.current) {
            resizeObserver.observe(cardRef.current);
        }

        return () => {
            window.removeEventListener('resize', checkWidth);
            resizeObserver.disconnect();
        };
    }, []);

    return (
        <ChartCard 
            ref={cardRef}
            title="Overview Data RFID" 
            icon={PieIcon} 
            className="h-full w-full"
        >
            <div className="-ml-10 flex flex-col md:flex-row items-center h-full" style={{ padding: '0.5%' }}>
                {/* Chart - Hidden otomatis ketika width card terlalu kecil */}
                {showChart && (
                    <div className="w-full md:w-[55%] h-full relative" style={{ minHeight: '100px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={pieData} 
                                    cx="70%" 
                                    cy="50%" 
                                    innerRadius={0} 
                                    outerRadius="90%" 
                                    dataKey="value" 
                                    stroke="white" 
                                    strokeWidth={2}
                                    className="xs:stroke-[2px] sm:stroke-[2.5px] md:stroke-[3px]"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}
                {/* Legend - Selalu tampil, Output Sewing dan nilainya */}
                <div className={`${showChart ? 'w-full md:w-[45%]' : 'w-full'} flex items-center justify-center h-full`} style={{ paddingBottom: '0.5rem' }}>
                    <CustomPieLegend totalCount={totalCount} />
                </div>
            </div>
        </ChartCard>
    );
});

OverviewChart.displayName = 'OverviewChart';

export default OverviewChart;


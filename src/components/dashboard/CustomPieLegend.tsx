import { memo } from 'react';
import { Crosshair } from 'lucide-react';

interface CustomPieLegendProps {
    totalCount: number;
}

const CustomPieLegend = memo(({ totalCount }: CustomPieLegendProps) => {
    return (
        <div className="flex flex-col justify-center h-full w-full">
            <div className="flex flex-col items-center gap-1 xs:gap-1.5 sm:gap-2 md:gap-2.5">
                <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2">
                    <Crosshair size={12} className="xs:w-[12px] xs:h-[12px] sm:w-[14px] sm:h-[14px] md:w-[16px] md:h-[16px] lg:w-[18px] lg:h-[18px] xl:w-[20px] xl:h-[20px] text-blue-600 flex-shrink-0" strokeWidth={2.5} />
                    <span className="text-[8px] xs:text-[9px] sm:text-xs md:text-sm lg:text-base font-bold text-gray-500 tracking-wider whitespace-nowrap" style={{ textTransform: 'capitalize' }}>Output Sewing</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold text-gray-800 leading-tight">{totalCount}</span>
                </div>
            </div>
        </div>
    );
});

CustomPieLegend.displayName = 'CustomPieLegend';

export default CustomPieLegend;


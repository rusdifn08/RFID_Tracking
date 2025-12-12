import { memo, forwardRef, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface ChartCardProps {
    children: ReactNode;
    title: string | ReactNode;
    icon: LucideIcon;
    headerAction?: ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

const ChartCard = memo(forwardRef<HTMLDivElement, ChartCardProps>(({ children, title, icon: Icon, headerAction, className, style }, ref) => (
    <div ref={ref} className={`bg-white rounded-lg sm:rounded-xl md:rounded-2xl lg:rounded-[30px] p-1.5 xs:p-2  pt-1 flex flex-col shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-lg group h-full border border-blue-500 ${className || ''}`} style={style}>
        <div className="flex items-center justify-between mb-0.5 xs:mb-0.5 sm:mb-1 md:mb-1.5 pb-0.5 xs:pb-0.5 sm:pb-1 md:pb-1.5 border-b border-gray-50 flex-shrink-0"
            style={{
                paddingTop: '0.25%',
                paddingLeft: '1%',
                paddingRight: '1%',
                minHeight: 'auto',
            }}
        >
            <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 md:gap-2.5 lg:gap-3 xl:gap-4 flex-1">
                <div className="p-1 xs:p-1.5 sm:p-1.5 md:p-2 lg:p-2.5 xl:p-3 bg-blue-50 rounded-lg sm:rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                    <Icon size={14} className="xs:w-[14px] xs:h-[14px] sm:w-[16px] sm:h-[16px] md:w-[18px] md:h-[18px] lg:w-[20px] lg:h-[20px] xl:w-[22px] xl:h-[22px]" />
                </div>
                {typeof title === 'string' ? (
                    <h2 className="text-[10px] xs:text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl font-extrabold text-gray-700 tracking-tight group-hover:text-blue-600 transition-colors" style={{ textTransform: 'capitalize' }}>{title}</h2>
                ) : (
                    <div className="flex items-center justify-between w-full">{title}</div>
                )}
            </div>
            {headerAction}
        </div>
        <div className="flex-1 min-h-0 relative">{children}</div>
    </div>
)));

ChartCard.displayName = 'ChartCard';

export default ChartCard;


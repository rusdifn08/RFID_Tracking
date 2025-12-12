import { memo } from 'react';
import { CheckCircle, RefreshCcw, Settings, XCircle, AlertCircle } from 'lucide-react';

interface StatusCardProps {
    type: 'GOOD' | 'REWORK' | 'HASPER' | 'REJECT' | 'WIRA';
    count: number;
    label?: string;
    onClick?: () => void;
}

const StatusCard = memo(({ type, count, label, onClick }: StatusCardProps) => {
    const config = {
        GOOD: { label: 'GOOD', Icon: CheckCircle, iconColor: '#00e676', textColor: '#003975' },
        REWORK: { label: 'REWORK', Icon: RefreshCcw, iconColor: '#ff9100', textColor: '#003975' },
        HASPER: { label: 'HASPER', Icon: Settings, iconColor: '#2979ff', textColor: '#003975' },
        REJECT: { label: 'REJECT', Icon: XCircle, iconColor: '#ff1744', textColor: '#003975' },
        WIRA: { label: 'WIRA', Icon: AlertCircle, iconColor: '#dbc900', textColor: '#003975' },
    };
    
    const style = config[type];
    const IconComponent = style.Icon;
    const displayLabel = label || style.label;
    const labelColor = '#2979ff';
    const countColor = style.textColor;
    const iconColor = style.iconColor;

    return (
        <div 
            onClick={onClick}
            className="relative flex flex-col items-center justify-between p-1 xs:p-1.5 sm:p-2 md:p-2.5 lg:p-3 xl:p-4 h-full w-full bg-white rounded-lg xs:rounded-xl sm:rounded-xl md:rounded-2xl transition-all duration-300 ease-out transform hover:-translate-y-1 shadow-sm border border-blue-500 hover:shadow-md hover:border-blue-600 group cursor-pointer"
        >
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/5 h-0.5 xs:h-1 sm:h-1 md:h-1.5 lg:h-2 rounded-full -mt-0.5 xs:-mt-1" style={{ backgroundColor: iconColor }}></div>
            <div className="flex-shrink-0 flex items-center justify-center">
                <IconComponent size={14} className="xs:w-[14px] xs:h-[14px] sm:w-[16px] sm:h-[16px] md:w-[20px] md:h-[20px] lg:w-[24px] lg:h-[24px] xl:w-[28px] xl:h-[28px] 2xl:w-[32px] 2xl:h-[32px] group-hover:scale-110 transition-transform duration-300" style={{ color: iconColor }} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col items-center justify-center flex-1 w-full min-h-0">
                <h3 className="text-[8px] xs:text-[9px] sm:text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl font-black tracking-widest transition-colors mb-0.5 xs:mb-1" style={{ color: labelColor, textTransform: 'capitalize' }}>{displayLabel}</h3>
                <span className="text-7xl xs:text-2xl sm:text-3xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-7xl 3xl:text-8xl 4xl:text-9xl font-black leading-none tracking-tighter transition-all duration-500 ease-in-out transform scale-100 hover:scale-105" style={{ color: countColor }}>{count}</span>
            </div>
        </div>
    );
});

StatusCard.displayName = 'StatusCard';

export default StatusCard;


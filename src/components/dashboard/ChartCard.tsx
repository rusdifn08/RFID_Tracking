import { memo, forwardRef, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface ChartCardProps {
    children: ReactNode;
    title: string | ReactNode;
    icon: LucideIcon;
    headerAction?: ReactNode;
    className?: string;
    style?: React.CSSProperties;
    iconColor?: string;
    iconBgColor?: string;
}

const ChartCard = memo(forwardRef<HTMLDivElement, ChartCardProps>(({ children, title, icon: Icon, headerAction, className, style, iconColor = '#0284C7', iconBgColor = '#e0f2fe' }, ref) => (
    <div
        ref={ref}
        className={`bg-white rounded-md sm:rounded-lg md:rounded-xl lg:rounded-2xl flex flex-col shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-lg group border border-blue-500 h-full ${className || ''}`}
        style={{
            ...style,
            padding: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.75rem)'
        }}
    >
        <div
            className="flex items-center justify-between border-b border-gray-50 flex-shrink-0"
            style={{
                paddingTop: 'clamp(0.125rem, 0.4vw + 0.1rem, 0.375rem)',
                paddingLeft: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.5rem)',
                paddingRight: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.5rem)',
                paddingBottom: 'clamp(0.125rem, 0.4vw + 0.1rem, 0.375rem)',
                marginBottom: 'clamp(0.125rem, 0.4vw + 0.1rem, 0.375rem)',
                minHeight: 'auto',
            }}
        >
            <div
                className="flex items-center flex-1 min-w-0"
                style={{
                    gap: 'clamp(0.375rem, 0.8vw + 0.2rem, 0.75rem)'
                }}
            >
                <div
                    className="rounded-md sm:rounded-lg transition-all duration-300 shadow-sm group-hover:shadow-md flex-shrink-0 flex items-center justify-center"
                    style={{
                        backgroundColor: iconBgColor,
                        color: iconColor,
                        padding: 'clamp(0.375rem, 0.8vh, 0.625rem)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = iconColor;
                        e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = iconBgColor;
                        e.currentTarget.style.color = iconColor;
                    }}
                >
                    <Icon style={{ width: 'clamp(12px, 1.5vh, 18px)', height: 'clamp(12px, 1.5vh, 18px)' }} strokeWidth={2.5} />
                </div>
                {typeof title === 'string' ? (
                    <h2 className="font-semibold text-gray-700 tracking-tight group-hover:text-blue-600 transition-colors flex-1 min-w-0" style={{ textTransform: 'capitalize', fontSize: 'clamp(0.875rem, 1.2vw + 0.5rem, 1.125rem)', fontWeight: 600 }}>{title}</h2>
                ) : (
                    <div className="flex items-center justify-between w-full flex-1 min-w-0">{title}</div>
                )}
            </div>
            {headerAction && (
                <div
                    className="flex items-center justify-end flex-shrink-0"
                    style={{
                        marginLeft: 'clamp(0.375rem, 0.8vw + 0.2rem, 0.75rem)'
                    }}
                >
                    {headerAction}
                </div>
            )}
        </div>
        <div className="flex-1 min-h-0 relative overflow-visible">{children}</div>
    </div>
)));

ChartCard.displayName = 'ChartCard';

export default ChartCard;


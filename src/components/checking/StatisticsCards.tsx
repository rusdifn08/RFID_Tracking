import { memo, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import type { RFIDCheckItem } from '../../hooks/useCheckingRFID';

interface StatisticsCardsProps {
    checkItems: RFIDCheckItem[];
}

const StatisticsCards = memo(({ checkItems }: StatisticsCardsProps) => {
    const stats = useMemo(() => {
        const total = checkItems.length;
        const found = checkItems.filter(i => i.status === 'found').length;
        const notFound = checkItems.filter(i => i.status === 'not_found').length;
        const successRate = total > 0 ? Math.round((found / total) * 100) : 0;
        
        return { total, found, notFound, successRate };
    }, [checkItems]);

    const cards = [
        { label: 'Total Checks', value: stats.total, icon: BarChart3 },
        { label: 'Found', value: stats.found, icon: TrendingUp },
        { label: 'Not Found', value: stats.notFound, icon: TrendingDown },
        { label: 'Success Rate', value: `${stats.successRate}%`, icon: Activity },
    ];

    return (
        <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-4 gap-2 xs:gap-2.5 sm:gap-3 md:gap-4 mb-4 xs:mb-5 sm:mb-6">
            {cards.map((card, index) => {
                const IconComponent = card.icon;
                return (
                    <div 
                        key={index}
                        className="bg-white border-2 border-blue-500 rounded-lg p-2 xs:p-2.5 sm:p-3 md:p-4 hover:shadow-lg hover:border-blue-600 transition-all duration-300 cursor-pointer"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-[10px] xs:text-xs sm:text-sm font-medium" style={{ textTransform: 'capitalize' }}>{card.label}</p>
                                <p className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mt-1 xs:mt-1.5 sm:mt-2">{card.value}</p>
                            </div>
                            <IconComponent className="w-6 xs:w-7 sm:w-8 md:w-10 h-6 xs:h-7 sm:h-8 md:h-10 text-blue-500 flex-shrink-0" />
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

StatisticsCards.displayName = 'StatisticsCards';

export default StatisticsCards;


import { memo } from 'react';
import { BarChart3, CheckCircle2, XCircle } from 'lucide-react';

interface StatusStatisticsProps {
    total: number;
    found: number;
    notFound: number;
}

const StatusStatistics = memo(({ total, found, notFound }: StatusStatisticsProps) => {
    return (
        <div className="w-full lg:w-auto lg:flex-shrink-0 lg:self-end">
            <div className="flex flex-row gap-3 sm:gap-4 lg:gap-5 justify-end">
                {/* Total Checks */}
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3 sm:p-4 md:p-5 flex flex-col items-center justify-center min-w-[80px] sm:min-w-[100px] md:min-w-[120px] shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
                    <BarChart3 className="w-5 sm:w-6 md:w-7 h-5 sm:h-6 md:h-7 text-green-500 mb-1.5 sm:mb-2" />
                    <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 font-semibold mb-1 sm:mb-1.5 text-center uppercase tracking-wide">
                        Total
                    </p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600 leading-none">
                        {total}
                    </p>
                </div>

                {/* Found */}
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-lg p-3 sm:p-4 md:p-5 flex flex-col items-center justify-center min-w-[80px] sm:min-w-[100px] md:min-w-[120px] shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
                    <CheckCircle2 className="w-5 sm:w-6 md:w-7 h-5 sm:h-6 md:h-7 text-emerald-500 mb-1.5 sm:mb-2" />
                    <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 font-semibold mb-1 sm:mb-1.5 text-center uppercase tracking-wide">
                        Found
                    </p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-600 leading-none">
                        {found}
                    </p>
                </div>

                {/* Not Found */}
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 sm:p-4 md:p-5 flex flex-col items-center justify-center min-w-[80px] sm:min-w-[100px] md:min-w-[120px] shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
                    <XCircle className="w-5 sm:w-6 md:w-7 h-5 sm:h-6 md:h-7 text-red-500 mb-1.5 sm:mb-2" />
                    <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 font-semibold mb-1 sm:mb-1.5 text-center uppercase tracking-wide">
                        Not Found
                    </p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600 leading-none">
                        {notFound}
                    </p>
                </div>
            </div>
        </div>
    );
});

StatusStatistics.displayName = 'StatusStatistics';

export default StatusStatistics;


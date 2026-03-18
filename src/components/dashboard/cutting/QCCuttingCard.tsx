import { memo } from 'react';
import { ClipboardCheck, CheckCircle, XCircle } from 'lucide-react';

export interface QCCuttingStats {
    good: number;
    reject: number;
}

interface QCCuttingCardProps {
    good: number;
    reject: number;
    className?: string;
}

/**
 * Card dashboard QC Cutting: setiap bundle dicek satu persatu — tampilkan Good vs Reject.
 */
const QCCuttingCard = memo(function QCCuttingCard({ good, reject, className = '' }: QCCuttingCardProps) {
    const total = good + reject || 1;
    const goodPercent = total ? ((good / total) * 100).toFixed(1) : '0';
    const rejectPercent = total ? ((reject / total) * 100).toFixed(1) : '0';

    return (
        <div
            className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col ${className}`}
        >
            <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 flex-shrink-0">
                <div className="rounded-md bg-blue-50 p-1.5 text-blue-600">
                    <ClipboardCheck className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">
                        QC Cutting
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                        Setiap bundle dicek satu persatu (potongan reject / tidak)
                    </p>
                </div>
            </div>
            <div className="flex-1 min-h-0 p-3 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3 flex-1 min-h-0 auto-rows-fr">
                    {/* Good */}
                    <div className="rounded-lg border border-green-200 bg-green-50/50 p-3 flex flex-col items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-green-600 mb-1" strokeWidth={2} />
                        <span className="text-2xl font-bold text-green-700 tabular-nums">{good}</span>
                        <span className="text-[10px] font-medium text-green-600 uppercase tracking-wide">
                            Good
                        </span>
                        <span className="text-[10px] text-green-500 mt-0.5">{goodPercent}%</span>
                    </div>
                    {/* Reject */}
                    <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 flex flex-col items-center justify-center">
                        <XCircle className="w-8 h-8 text-red-600 mb-1" strokeWidth={2} />
                        <span className="text-2xl font-bold text-red-700 tabular-nums">{reject}</span>
                        <span className="text-[10px] font-medium text-red-600 uppercase tracking-wide">
                            Reject
                        </span>
                        <span className="text-[10px] text-red-500 mt-0.5">{rejectPercent}%</span>
                    </div>
                </div>
                <div className="text-center pt-1 border-t border-gray-100">
                    <span className="text-xs text-slate-500">Total dicek: {total} bundle</span>
                </div>
            </div>
        </div>
    );
});

export default QCCuttingCard;

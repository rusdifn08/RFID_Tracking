import { memo, type MouseEvent } from 'react';
import { ScanLine } from 'lucide-react';

export type ScanButtonStatus = 'REJECT' | 'REWORK' | 'GOOD';

interface DashboardScanButtonProps {
    onClick: (e: MouseEvent<HTMLButtonElement>) => void;
    status: ScanButtonStatus;
    className?: string;
}

const STATUS_STYLES: Record<ScanButtonStatus, string> = {
    REJECT:
        'border-rose-200/90 bg-rose-50 text-rose-800 hover:bg-rose-100 hover:border-rose-300 active:bg-rose-100/90',
    REWORK:
        'border-amber-200/90 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-300 active:bg-amber-100/90',
    GOOD:
        'border-emerald-200/90 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 active:bg-emerald-100/90',
};

const DashboardScanButton = memo(({ onClick, status, className = '' }: DashboardScanButtonProps) => (
    <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center justify-center gap-1.5 font-semibold tracking-wide px-4 py-2 rounded-lg border shadow-sm shrink-0 transition-all duration-200 hover:-translate-y-px hover:shadow-md min-w-[4.5rem] ${STATUS_STYLES[status]} ${className}`}
        style={{ fontSize: 'clamp(0.7rem, 0.95vw + 0.32rem, 0.9rem)' }}
    >
        <ScanLine
            className="shrink-0"
            style={{ width: 'clamp(14px, 1.1vw + 10px, 18px)', height: 'clamp(14px, 1.1vw + 10px, 18px)' }}
            strokeWidth={2.4}
            aria-hidden
        />
        <span>Scan</span>
    </button>
));

DashboardScanButton.displayName = 'DashboardScanButton';

export default DashboardScanButton;

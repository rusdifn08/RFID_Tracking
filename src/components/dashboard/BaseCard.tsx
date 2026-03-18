import type { ReactNode } from 'react';

interface BaseCardProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
}

/**
 * Base card dashboard: mengikuti gaya kartu di Dashboard RFID (StatusCard),
 * supaya semua card dashboard punya bahasa visual yang konsisten.
 */
export default function BaseCard({ children, className = '', onClick }: BaseCardProps) {
    return (
        <div
            onClick={onClick}
            className={`relative flex flex-col bg-white rounded-lg xs:rounded-xl sm:rounded-xl md:rounded-2xl border border-blue-100 shadow-sm hover:shadow-md hover:border-blue-400 transition-all duration-300 ease-out overflow-hidden ${className}`}
            style={{ padding: 'clamp(0.75rem, 1.2vw, 1.25rem)' }}
        >
            {children}
        </div>
    );
}


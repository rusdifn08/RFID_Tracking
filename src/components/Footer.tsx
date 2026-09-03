import { memo } from 'react';

interface FooterProps {
    variant?: 'transparent' | 'solid';
    className?: string;
}

const Footer = memo(({ variant = 'transparent', className = '' }: FooterProps) => {
    const footerText = 'Gistex Monitoring System (GMS) © 2025 Served by Supernova Labs Studio';

    if (variant === 'solid') {
        return (
            <footer className={`bg-white border-t border-gray-200 py-4 px-6 text-center w-full ${className}`}>
                <p className="text-sm text-gray-600" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
                    {footerText}
                </p>
            </footer>
        );
    }

    // Default: transparent variant
    return (
        <footer
            className={`absolute bottom-0 left-0 right-0 py-4 border-t border-gray-200/50 pointer-events-none ${className}`}
            style={{
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(2px)',
                zIndex: -1
            }}
        >
            <div className="text-center text-gray-600 text-sm pointer-events-auto" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
                {footerText}
            </div>
        </footer>
    );
});

Footer.displayName = 'Footer';

export default Footer;


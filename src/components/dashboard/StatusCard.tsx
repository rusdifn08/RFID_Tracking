import { memo } from 'react';
import { Settings } from 'lucide-react';
import goodIcon from '../../../assets/good.png';
import reworkIcon from '../../../assets/rework.png';
import rejectIcon from '../../../assets/reject.png';
import wiraIcon from '../../../assets/wira.png';

export type LoginLedStatus = 'success' | 'unsuccess' | 'login';

interface StatusCardProps {
    type: 'GOOD' | 'REWORK' | 'HASPER' | 'REJECT' | 'WIRA';
    count: number;
    label?: string;
    onClick?: () => void;
    /** Indikator LED: success = hijau, unsuccess = merah, login = abu gelap (alat baru nyala), null = abu (standby) */
    loginLed?: LoginLedStatus | null;
}

const StatusCard = memo(({ type, count, label, onClick, loginLed }: StatusCardProps) => {
    const config = {
        GOOD: { label: 'GOOD', iconSrc: goodIcon, Icon: null, iconColor: '#00e676', textColor: '#2563eb' },
        REWORK: { label: 'REWORK', iconSrc: reworkIcon, Icon: null, iconColor: '#ff9100', textColor: '#2563eb' },
        HASPER: { label: 'HASPER', iconSrc: null, Icon: Settings, iconColor: '#2979ff', textColor: '#2563eb' },
        REJECT: { label: 'REJECT', iconSrc: rejectIcon, Icon: null, iconColor: '#ff1744', textColor: '#2563eb' },
        WIRA: { label: 'WIRA', iconSrc: wiraIcon, Icon: null, iconColor: '#dbc900', textColor: '#2563eb' },
    };

    const style = config[type];
    const displayLabel = label || style.label;
    const labelColor = '#111827'; /* gray-900: hitam untuk label (konsisten dengan Data Line) */
    const countColor = style.textColor; /* biru untuk nilai angka */
    const iconColor = style.iconColor;

    return (
        <div
            onClick={onClick}
            className="relative flex flex-col items-center justify-center h-full w-full min-h-0 bg-white rounded-lg xs:rounded-xl sm:rounded-xl md:rounded-2xl transition-all duration-300 ease-out transform hover:-translate-y-1 shadow-sm border border-blue-500 hover:shadow-md hover:border-blue-600 group cursor-pointer overflow-hidden"
            style={{
                padding: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.75rem)'
            }}
        >
            {/* LED: success = hijau, unsuccess = merah, login = abu gelap (alat baru nyala), null = standby */}
            {loginLed !== undefined && (
                <div
                    className={`absolute top-2 right-2 z-10 w-3 h-3 rounded-full border-2 border-white shadow-md transition-colors duration-300 ${loginLed === 'success' || loginLed === 'unsuccess' ? 'animate-pulse' : ''}`}
                    style={{
                        backgroundColor: loginLed === 'success' ? '#22c55e' : loginLed === 'unsuccess' ? '#ef4444' : loginLed === 'login' ? '#6b7280' : '#9ca3af',
                        boxShadow: loginLed === 'success'
                            ? '0 0 8px rgba(34,197,94,0.9)'
                            : loginLed === 'unsuccess'
                                ? '0 0 8px rgba(239,68,68,0.9)'
                                : loginLed === 'login'
                                    ? '0 0 2px rgba(107,114,128,0.4)'
                                    : '0 0 4px rgba(156,163,175,0.5)',
                    }}
                    title={loginLed === 'success' ? 'Login berhasil' : loginLed === 'unsuccess' ? 'Login gagal' : loginLed === 'login' ? 'Alat baru menyala' : 'Menunggu login'}
                    aria-label={loginLed === 'success' ? 'Indikator login berhasil' : loginLed === 'unsuccess' ? 'Indikator login gagal' : loginLed === 'login' ? 'Alat baru menyala' : 'Indikator standby'}
                />
            )}
            {/* Gap: kecil di bawah HD, semakin besar device semakin besar gap (icon–teks–data) */}
            <div
                className="flex flex-col items-center justify-center flex-1 w-full min-h-0"
                style={{ gap: 'clamp(0.12rem, 0.035vw + 0.1rem, 0.65rem)' }}
            >
                <div className="flex items-center justify-center flex-shrink-0">
                    {style.iconSrc ? (
                        <img
                            src={style.iconSrc}
                            alt={displayLabel}
                            style={{
                                width: 'clamp(20px, 3vw + 10px, 56px)',
                                height: 'clamp(20px, 3vw + 10px, 56px)'
                            }}
                            className="group-hover:scale-110 transition-transform duration-300 object-contain"
                        />
                    ) : style.Icon ? (
                        (() => {
                            const IconComponent = style.Icon;
                            return <IconComponent 
                                style={{
                                    width: 'clamp(14px, 1.8vw + 6px, 32px)',
                                    height: 'clamp(14px, 1.8vw + 6px, 32px)',
                                    color: iconColor
                                }}
                                className="group-hover:scale-110 transition-transform duration-300" 
                                strokeWidth={2.5} 
                            />;
                        })()
                    ) : null}
                </div>
                <h3 
                    className="font-semibold tracking-widest transition-colors text-center flex-shrink-0" 
                    style={{ 
                        color: labelColor, 
                        textTransform: 'uppercase',
                        fontSize: 'clamp(0.5rem, 0.9vw + 0.25rem, 1.25rem)',
                        fontWeight: 600
                    }}
                >
                    {displayLabel}
                </h3>
                <span 
                    className="font-bold leading-none tracking-tighter transition-all duration-500 ease-in-out transform scale-100 hover:scale-105 text-center flex-shrink-0" 
                    style={{ 
                        color: countColor,
                        fontSize: 'clamp(1.75rem, 4.5vw + 0.5rem, 5rem)',
                        fontWeight: 700
                    }}
                >
                    {count}
                </span>
            </div>
        </div>
    );
});

StatusCard.displayName = 'StatusCard';

export default StatusCard;


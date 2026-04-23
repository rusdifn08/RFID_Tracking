import { useEffect, useRef, type ReactNode } from 'react';
import { X, Package, CheckCircle2 } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export type CuttingScanAccent = 'emerald' | 'sky' | 'amber' | 'violet';

export interface CuttingScanSessionRow {
    id: string;
    rfid: string;
    time: Date;
    ok: boolean;
    message?: string;
}

export interface CuttingStationTheme {
    name: string;
    primaryColor: string;
    primaryGradient: string;
    headerGradient: string;
    bgGradient: string;
    borderColor: string;
}

export function getCuttingStationTheme(accent: CuttingScanAccent): CuttingStationTheme {
    if (accent === 'emerald') {
        return {
            name: 'Bundle',
            primaryColor: '#10b981',
            primaryGradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            headerGradient: 'linear-gradient(135deg, #047857 0%, #059669 100%)',
            bgGradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            borderColor: '#10b981',
        };
    }
    if (accent === 'sky') {
        return {
            name: 'Quality Control',
            primaryColor: '#0ea5e9',
            primaryGradient: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)',
            headerGradient: 'linear-gradient(135deg, #1e40af 0%, #0ea5e9 100%)',
            bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            borderColor: '#0ea5e9',
        };
    }
    if (accent === 'amber') {
        return {
            name: 'Supermarket',
            primaryColor: '#f59e0b',
            primaryGradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
            headerGradient: 'linear-gradient(135deg, #92400e 0%, #f59e0b 100%)',
            bgGradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            borderColor: '#f59e0b',
        };
    }
    return {
        name: 'Supply Sewing',
        primaryColor: '#8b5cf6',
        primaryGradient: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
        headerGradient: 'linear-gradient(135deg, #5b21b6 0%, #8b5cf6 100%)',
        bgGradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
        borderColor: '#8b5cf6',
    };
}

interface CuttingScanStationModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle: string;
    accent: CuttingScanAccent;
    stageBadge: string;
    busy?: boolean;
    leftColumn: ReactNode;
    formSection?: ReactNode;
    rfidValue: string;
    onRfidChange: (v: string) => void;
    onRfidSubmit: () => void;
    sessionItems: CuttingScanSessionRow[];
}

/**
 * Layout mengikuti ScanningFinishingModal (Dryroom dashboard): kiri operator + ringkasan + detail, kanan form + area scan + daftar sesi.
 */
export default function CuttingScanStationModal({
    isOpen,
    onClose,
    title,
    subtitle,
    accent,
    stageBadge,
    busy = false,
    leftColumn,
    formSection,
    rfidValue,
    onRfidChange,
    onRfidSubmit,
    sessionItems,
}: CuttingScanStationModalProps) {
    const theme = getCuttingStationTheme(accent);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const t = window.setTimeout(() => inputRef.current?.focus(), 120);
        return () => window.clearTimeout(t);
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && rfidValue.trim() && !busy) {
            e.preventDefault();
            onRfidSubmit();
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-3"
                style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(8px)',
                    animation: 'fadeIn 0.3s ease',
                }}
                onMouseDown={(e) => {
                    if (e.target === e.currentTarget && !busy) onClose();
                }}
            >
                <div
                    className="bg-white rounded-xl xs:rounded-2xl sm:rounded-3xl shadow-2xl w-[95%] max-h-[95vh] flex flex-col min-h-0 max-w-[min(96vw,1120px)]"
                    style={{
                        background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
                        boxShadow:
                            '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(148, 163, 184, 0.1), 0 8px 16px -8px rgba(59, 130, 246, 0.1)',
                        animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        border: `1px solid ${theme.borderColor}40`,
                        padding: '0.75rem',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-2 flex-shrink-0 gap-2">
                        <div className="text-center flex-1 min-w-0">
                            <h2
                                className="text-base xs:text-lg sm:text-xl font-extrabold mb-0.5 xs:mb-1"
                                style={{
                                    background: theme.headerGradient,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    letterSpacing: '-0.5px',
                                }}
                            >
                                {title}
                            </h2>
                            <p className="text-xs xs:text-sm font-medium" style={{ color: '#475569' }}>
                                {subtitle}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => !busy && onClose()}
                            disabled={busy}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 shrink-0 disabled:opacity-50"
                            aria-label="Tutup"
                        >
                            <X className="w-5 h-5" strokeWidth={2} />
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 flex-1 min-h-0 overflow-hidden">
                        <div className="flex flex-col gap-3 w-full md:w-[min(40%,380px)] shrink-0 min-h-0 md:max-h-full overflow-y-auto pr-0.5">
                            {leftColumn}
                        </div>

                        <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
                            {formSection ? <div className="mb-2 shrink-0 max-h-[38vh] overflow-y-auto">{formSection}</div> : null}

                            <div
                                className={`mb-2 relative shrink-0 ${busy ? 'cursor-not-allowed' : 'cursor-text'}`}
                                onClick={() => {
                                    if (inputRef.current && !busy) inputRef.current.focus();
                                }}
                                style={{
                                    background: theme.bgGradient,
                                    borderRadius: '6px',
                                    padding: '0.4rem',
                                    minHeight: '130px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: `2px solid ${theme.borderColor}40`,
                                    boxShadow: `0 8px 16px -4px ${theme.primaryColor}15, inset 0 2px 8px rgba(255, 255, 255, 0.5)`,
                                }}
                            >
                                <div className="relative" style={{ filter: `drop-shadow(0 6px 12px ${theme.primaryColor}25)` }}>
                                    <div
                                        className="relative"
                                        style={{
                                            width: '160px',
                                            height: '88px',
                                            background: theme.primaryGradient,
                                            borderRadius: '8px',
                                            boxShadow: `0 8px 16px ${theme.primaryColor}40, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
                                            animation: 'cardFloat 3s ease-in-out infinite',
                                            border: `1px solid ${theme.borderColor}30`,
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <div
                                            className="absolute"
                                            style={{
                                                top: '50px',
                                                left: '30px',
                                                width: '50px',
                                                height: '40px',
                                                background: 'linear-gradient(135deg, #FCD34D, #F59E0B)',
                                                borderRadius: '6px',
                                                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
                                            }}
                                        >
                                            <div className="absolute inset-2 border border-black/10 rounded" />
                                        </div>
                                        <div className="absolute bottom-2.5 left-4 text-white">
                                            <div className="text-base font-bold mb-0.5 tracking-wider">RFID</div>
                                            <div className="text-xs tracking-wider opacity-90">●●●● ●●●● ●●●●</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute bottom-4 left-0 right-0 text-center px-2">
                                    {rfidValue.length > 0 ? (
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: theme.primaryColor }}>
                                                📝 Sedang membaca...
                                            </p>
                                            <p
                                                className="font-extrabold text-sm sm:text-lg font-mono tracking-wide px-2 py-1.5 rounded-md inline-block max-w-full truncate"
                                                style={{
                                                    color: '#0F172A',
                                                    background: theme.bgGradient,
                                                    border: `2px solid ${theme.primaryColor}`,
                                                    boxShadow: `0 0 20px ${theme.primaryColor}30`,
                                                    animation: 'pulseGlow 1s ease-in-out infinite',
                                                }}
                                                title={rfidValue}
                                            >
                                                {rfidValue}
                                            </p>
                                        </div>
                                    ) : (
                                        <p
                                            className="font-bold text-xs sm:text-sm"
                                            style={{
                                                color: theme.primaryColor,
                                                animation: 'blink 1.5s ease-in-out infinite',
                                                textShadow: `0 2px 4px ${theme.primaryColor}10`,
                                                letterSpacing: '0.25px',
                                            }}
                                        >
                                            🔍 Siap Scan - Dekatkan kartu RFID
                                        </p>
                                    )}
                                </div>
                            </div>

                            <input
                                ref={inputRef}
                                type="text"
                                value={rfidValue}
                                onChange={(e) => onRfidChange(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={busy}
                                className="sr-only"
                                autoComplete="off"
                                inputMode="text"
                                tabIndex={0}
                                aria-label={`Scan RFID — ${stageBadge}`}
                                style={{
                                    position: 'absolute',
                                    opacity: 0,
                                    width: '1px',
                                    height: '1px',
                                    left: '-9999px',
                                }}
                            />

                            <div
                                className="mb-0 flex flex-col flex-1 min-h-0"
                                style={{
                                    border: `2px solid ${theme.borderColor}40`,
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                    background: 'white',
                                    boxShadow: `0 4px 6px -1px ${theme.primaryColor}05`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    flex: 1,
                                    minHeight: 0,
                                }}
                            >
                                <div
                                    className="px-3 py-2 flex justify-between items-center border-b-2 border-gray-200 flex-shrink-0"
                                    style={{ background: theme.bgGradient }}
                                >
                                    <h3 className="text-sm font-bold" style={{ color: '#0F172A', letterSpacing: '-0.25px' }}>
                                        📋 RFID yang Sudah di-Scan
                                    </h3>
                                    <span
                                        className="px-3 py-1.5 rounded-full font-extrabold text-sm text-white text-center min-w-[35px]"
                                        style={{
                                            background: theme.primaryGradient,
                                            boxShadow: `0 2px 8px ${theme.primaryColor}30`,
                                        }}
                                    >
                                        {sessionItems.length}
                                    </span>
                                </div>

                                {sessionItems.length === 0 ? (
                                    <div
                                        className="py-10 text-center flex-1 flex items-center justify-center px-2"
                                        style={{ color: '#94A3B8', fontSize: '0.95rem', fontWeight: 500 }}
                                    >
                                        Belum ada RFID yang di-scan
                                    </div>
                                ) : (
                                    <div
                                        className="overflow-y-auto p-1.5 flex-1 min-h-0"
                                        style={{
                                            background: '#FAFBFC',
                                            scrollbarWidth: 'thin',
                                            scrollbarColor: `${theme.primaryColor} #F1F5F9`,
                                        }}
                                    >
                                        {sessionItems.map((item) => {
                                            const isError = !item.ok;
                                            return (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center gap-2 p-2 mb-1.5 rounded-md relative overflow-hidden transition-all"
                                                    style={{
                                                        background: item.ok ? 'white' : 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
                                                        border: `2px solid ${item.ok ? theme.borderColor + '40' : '#EF4444'}`,
                                                        animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                                    }}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div
                                                            className="font-semibold font-mono text-xs sm:text-sm tracking-wide truncate"
                                                            style={{ color: isError ? '#DC2626' : '#0F172A' }}
                                                        >
                                                            {item.rfid}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                            <span
                                                                className="text-[10px] font-medium px-2 py-0.5 rounded-md inline-block"
                                                                style={{
                                                                    color: isError ? '#DC2626' : theme.primaryColor,
                                                                    background: isError ? '#FEE2E2' : theme.bgGradient,
                                                                }}
                                                            >
                                                                {item.ok ? 'Berhasil' : 'Gagal'}
                                                            </span>
                                                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md inline-block text-slate-600 bg-slate-100">
                                                                {item.time.toLocaleTimeString('id-ID')}
                                                            </span>
                                                        </div>
                                                        {item.message ? (
                                                            <div className={`text-[10px] font-medium mt-0.5 ${isError ? 'text-red-700' : 'text-slate-600'}`}>
                                                                {item.message}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                    {item.ok ? (
                                                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: theme.primaryColor }} />
                                                    ) : (
                                                        <X className="w-5 h-5 flex-shrink-0 text-red-600" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 xs:gap-3 mt-3 flex-shrink-0 pt-1 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={busy}
                            className="flex-1 min-w-[120px] py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all"
                            style={{
                                background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                                color: '#dc2626',
                                border: '2px solid #E2E8F0',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                                opacity: busy ? 0.6 : 1,
                            }}
                        >
                            ❌ Batal
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={busy}
                            className="flex-1 min-w-[120px] py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white transition-all inline-flex items-center justify-center gap-2"
                            style={{
                                background: theme.primaryGradient,
                                boxShadow: `0 4px 12px ${theme.primaryColor}35`,
                                opacity: busy ? 0.6 : 1,
                            }}
                        >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                            Selesai ({sessionItems.length})
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(50px) scale(0.9); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes cardFloat {
                    0%, 100% { transform: translateY(0) rotateX(0deg); }
                    50% { transform: translateY(-10px) rotateX(5deg); }
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(0.98); }
                }
                @keyframes pulseGlow {
                    0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
                    50% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.6); }
                }
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(-30px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </>
    );
}

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { X, Loader2, ScanLine, User, Hash, CheckCircle2, AlertCircle, Radio } from 'lucide-react';
import { postPqcCheck, postQcCheck } from '../../config/api';

const successSoundPath = '/assets/succes.mp3';
const errorSoundPath = '/assets/error.mp3';

export type RfidScanStatusType = 'GOOD' | 'REWORK' | 'REJECT';
export type RfidScanStage = 'QC' | 'PQC';

type ScanPhase = 'ready' | 'processing';

export interface RfidScanCompletePayload {
    ok: boolean;
    message: string;
    rfid: string;
    titleLabel: string;
}

interface RfidQcPqcScanModalProps {
    isOpen: boolean;
    onClose: () => void;
    stage: RfidScanStage;
    statusType: RfidScanStatusType;
    titleLabel: string;
    lineTitle?: string;
    onSuccess?: () => void;
    onScanComplete?: (payload: RfidScanCompletePayload) => void;
}

function toPqcStatus(status: RfidScanStatusType): 'PQC_GOOD' | 'PQC_REWORK' | 'PQC_REJECT' {
    const map: Record<RfidScanStatusType, 'PQC_GOOD' | 'PQC_REWORK' | 'PQC_REJECT'> = {
        GOOD: 'PQC_GOOD',
        REWORK: 'PQC_REWORK',
        REJECT: 'PQC_REJECT',
    };
    return map[status];
}

function themeForStatus(status: RfidScanStatusType) {
    if (status === 'GOOD') {
        return {
            accent: '#10b981',
            accentSoft: 'rgba(16, 185, 129, 0.15)',
            gradient: 'from-emerald-500 via-green-500 to-teal-600',
            headerBg: 'from-emerald-950/90 via-green-900/85 to-teal-900/80',
            ring: 'ring-emerald-400/40',
            badge: 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30',
            glow: 'shadow-[0_0_60px_rgba(16,185,129,0.35)]',
            pulse: 'bg-emerald-400',
            icon: CheckCircle2,
        };
    }
    if (status === 'REWORK') {
        return {
            accent: '#f59e0b',
            accentSoft: 'rgba(245, 158, 11, 0.15)',
            gradient: 'from-amber-500 via-orange-500 to-amber-600',
            headerBg: 'from-amber-950/90 via-orange-900/85 to-amber-900/80',
            ring: 'ring-amber-400/40',
            badge: 'bg-amber-500/20 text-amber-100 border-amber-400/30',
            glow: 'shadow-[0_0_60px_rgba(245,158,11,0.35)]',
            pulse: 'bg-amber-400',
            icon: ScanLine,
        };
    }
    return {
        accent: '#ef4444',
        accentSoft: 'rgba(239, 68, 68, 0.15)',
        gradient: 'from-red-500 via-rose-500 to-red-600',
        headerBg: 'from-red-950/90 via-rose-900/85 to-red-900/80',
        ring: 'ring-red-400/40',
        badge: 'bg-red-500/20 text-red-100 border-red-400/30',
        glow: 'shadow-[0_0_60px_rgba(239,68,68,0.35)]',
        pulse: 'bg-red-400',
        icon: AlertCircle,
    };
}

function readSessionUser(): { name: string; nik: string; rfid_user: string; bagian: string } {
    try {
        const raw = localStorage.getItem('user');
        if (!raw) return { name: '—', nik: '—', rfid_user: '', bagian: '' };
        const u = JSON.parse(raw) as Record<string, unknown>;
        return {
            name: String(u?.name || u?.nama || '—'),
            nik: String(u?.nik || u?.NIK || '—'),
            rfid_user: String(u?.rfid_user || '').trim(),
            bagian: String(u?.bagian || u?.jabatan || '').trim(),
        };
    } catch {
        return { name: '—', nik: '—', rfid_user: '', bagian: '' };
    }
}

const RfidQcPqcScanModal = memo(({
    isOpen,
    onClose,
    stage,
    statusType,
    titleLabel,
    lineTitle,
    onSuccess,
    onScanComplete,
}: RfidQcPqcScanModalProps) => {
    const [phase, setPhase] = useState<ScanPhase>('ready');
    const [lastRfid, setLastRfid] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const rfidBufferRef = useRef('');
    const isSubmittingRef = useRef(false);
    const successAudioRef = useRef<HTMLAudioElement | null>(null);
    const errorAudioRef = useRef<HTMLAudioElement | null>(null);

    const theme = themeForStatus(statusType);
    const sessionUser = readSessionUser();
    const apiStatusLabel = stage === 'QC' ? statusType : toPqcStatus(statusType);

    const focusHiddenInput = useCallback(() => {
        const el = inputRef.current;
        if (!el || phase === 'processing' || isSubmittingRef.current) return;
        try {
            el.focus({ preventScroll: true });
        } catch {
            el.focus();
        }
    }, [phase]);

    useEffect(() => {
        if (!isOpen) return undefined;
        setPhase('ready');
        setLastRfid('');
        isSubmittingRef.current = false;
        rfidBufferRef.current = '';
        if (inputRef.current) inputRef.current.value = '';

        document.body.style.overflow = 'hidden';
        const t1 = window.setTimeout(focusHiddenInput, 80);
        const interval = window.setInterval(focusHiddenInput, 1200);

        return () => {
            document.body.style.overflow = '';
            window.clearTimeout(t1);
            window.clearInterval(interval);
            isSubmittingRef.current = false;
        };
    }, [isOpen, stage, statusType, focusHiddenInput]);

    const playSound = useCallback((ok: boolean) => {
        const audio = ok ? successAudioRef.current : errorAudioRef.current;
        if (!audio) return;
        audio.currentTime = 0;
        void audio.play().catch(() => undefined);
    }, []);

    const finishAndClose = useCallback(
        (ok: boolean, message: string, rfid: string) => {
            playSound(ok);
            if (ok) onSuccess?.();
            isSubmittingRef.current = false;
            onClose();
            window.setTimeout(() => {
                onScanComplete?.({ ok, message, rfid, titleLabel });
            }, 80);
        },
        [playSound, onSuccess, onClose, onScanComplete, titleLabel],
    );

    const submitScan = useCallback(
        async (rfidRaw: string) => {
            const rfid = rfidRaw.trim();
            if (!rfid || isSubmittingRef.current) return;

            if (!sessionUser.rfid_user) {
                finishAndClose(
                    false,
                    'RFID user tidak ditemukan. Login ulang dengan akun yang memiliki rfid_user.',
                    rfid,
                );
                return;
            }

            isSubmittingRef.current = true;
            setPhase('processing');
            setLastRfid(rfid);

            try {
                const res =
                    stage === 'QC'
                        ? await postQcCheck({
                              rfid_garment: rfid,
                              status_qc: statusType,
                              rfid_user: sessionUser.rfid_user,
                          })
                        : await postPqcCheck({
                              rfid_garment: rfid,
                              status_pqc: toPqcStatus(statusType),
                              rfid_user: sessionUser.rfid_user,
                          });

                if (!res.success) {
                    finishAndClose(false, res.error || 'Gagal menyimpan scan', rfid);
                    return;
                }

                const msg =
                    (res.data as { message?: string })?.message || `Berhasil — ${titleLabel}`;
                finishAndClose(true, msg, rfid);
            } catch (e) {
                const msg = e instanceof Error ? e.message : 'Terjadi kesalahan saat scan';
                finishAndClose(false, msg, rfid);
            }
        },
        [sessionUser.rfid_user, stage, statusType, titleLabel, finishAndClose],
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        rfidBufferRef.current = e.target.value;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = (e.currentTarget.value || rfidBufferRef.current).trim();
            if (val) void submitScan(val);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <style>{`
                @keyframes rfid-scan-fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes rfid-scan-slide-up {
                    from { opacity: 0; transform: translateY(24px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes rfid-scan-pulse-ring {
                    0% { transform: scale(0.85); opacity: 0.7; }
                    70% { transform: scale(1.35); opacity: 0; }
                    100% { transform: scale(1.35); opacity: 0; }
                }
                @keyframes rfid-scan-radar {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes rfid-scan-shake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-6px); }
                    40% { transform: translateX(6px); }
                    60% { transform: translateX(-4px); }
                    80% { transform: translateX(4px); }
                }
                @keyframes rfid-scan-success-pop {
                    0% { transform: scale(0.5); opacity: 0; }
                    60% { transform: scale(1.08); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .rfid-scan-backdrop { animation: rfid-scan-fade-in 0.25s ease-out; }
                .rfid-scan-card { animation: rfid-scan-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
                .rfid-scan-pulse-ring { animation: rfid-scan-pulse-ring 2s ease-out infinite; }
                .rfid-scan-radar { animation: rfid-scan-radar 3s linear infinite; }
                .rfid-scan-shake { animation: rfid-scan-shake 0.45s ease-in-out; }
                .rfid-scan-success-pop { animation: rfid-scan-success-pop 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
            `}</style>

            <div
                className="rfid-scan-backdrop fixed inset-0 z-[1000] flex items-center justify-center p-4"
                style={{
                    background:
                        'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.75) 0%, rgba(2, 6, 23, 0.92) 100%)',
                    backdropFilter: 'blur(10px)',
                }}
                onClick={(e) => {
                    if (e.target === e.currentTarget && phase !== 'processing') onClose();
                }}
            >
                <audio ref={successAudioRef} src={successSoundPath} preload="auto" />
                <audio ref={errorAudioRef} src={errorSoundPath} preload="auto" />

                {/* Hidden input — scanner hardware; tidak tampak & tidak memicu keyboard mobile */}
                <input
                    ref={inputRef}
                    type="text"
                    defaultValue=""
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    disabled={phase === 'processing'}
                    className="sr-only"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    inputMode="none"
                    enterKeyHint="done"
                    tabIndex={-1}
                    aria-hidden
                    style={{
                        position: 'fixed',
                        opacity: 0,
                        width: 1,
                        height: 1,
                        left: -9999,
                        top: 0,
                        pointerEvents: 'none',
                    }}
                />

                <div
                    className={`rfid-scan-card relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900/95 ${theme.glow}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        focusHiddenInput();
                    }}
                >
                    {/* Header */}
                    <div className={`relative bg-gradient-to-br ${theme.headerBg} px-5 py-4`}>
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYtMkgyNHYyaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
                        <div className="relative flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                                    {stage} Station
                                </p>
                                <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-white">
                                    {titleLabel}
                                </h2>
                                {lineTitle && (
                                    <p className="mt-1 text-xs text-white/60">{lineTitle}</p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (phase !== 'processing') onClose();
                                }}
                                className="group rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 transition-all duration-300 hover:border-white/25 hover:bg-white/15 hover:text-white hover:scale-105"
                                aria-label="Tutup"
                            >
                                <X className="h-5 w-5 transition-transform group-hover:rotate-90" />
                            </button>
                        </div>
                        <div className="relative mt-3 flex flex-wrap gap-2">
                            <span
                                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${theme.badge}`}
                            >
                                {apiStatusLabel}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-white/70">
                                {sessionUser.bagian || stage}
                            </span>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="relative px-5 py-6">
                        {/* Scan zone */}
                        <div
                            className={`group relative mx-auto flex h-44 w-44 cursor-default flex-col items-center justify-center rounded-full border-2 border-dashed transition-all duration-500 hover:scale-[1.02] ${theme.ring} ring-4`}
                            style={{ background: theme.accentSoft }}
                            onClick={(e) => {
                                e.stopPropagation();
                                focusHiddenInput();
                            }}
                        >
                            {phase === 'ready' && (
                                <>
                                    <span className={`rfid-scan-pulse-ring absolute inset-2 rounded-full ${theme.pulse} opacity-30`} />
                                    <span
                                        className="rfid-scan-radar absolute inset-4 rounded-full opacity-20"
                                        style={{
                                            background: `conic-gradient(from 0deg, transparent, ${theme.accent})`,
                                        }}
                                    />
                                    <div
                                        className={`relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${theme.gradient} shadow-lg transition-transform duration-300 group-hover:scale-110`}
                                    >
                                        <Radio className="h-8 w-8 text-white" strokeWidth={2} />
                                    </div>
                                    <p className="relative mt-3 text-center text-xs font-bold uppercase tracking-widest text-slate-300">
                                        Siap Scan
                                    </p>
                                    <p className="relative mt-0.5 px-4 text-center text-[10px] text-slate-500">
                                        Dekatkan RFID ke scanner
                                    </p>
                                </>
                            )}

                            {phase === 'processing' && (
                                <div className="flex flex-col items-center gap-2">
                                    <Loader2
                                        className="h-12 w-12 animate-spin"
                                        style={{ color: theme.accent }}
                                    />
                                    <p className="text-xs font-semibold text-slate-300">Memproses...</p>
                                    {lastRfid && (
                                        <p className="font-mono text-[10px] text-slate-500">{lastRfid}</p>
                                    )}
                                </div>
                            )}

                        </div>

                        {/* Info cards */}
                        <div className="mt-5 grid grid-cols-2 gap-2">
                            <div className="group rounded-xl border border-slate-700/80 bg-slate-800/60 px-3 py-2.5 transition-all duration-300 hover:border-slate-500 hover:bg-slate-800 hover:shadow-md hover:-translate-y-0.5">
                                <div className="flex items-center gap-2">
                                    <User className="h-3.5 w-3.5 text-slate-500 transition-colors group-hover:text-slate-300" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-slate-500">Operator</p>
                                        <p className="truncate text-xs font-semibold text-slate-200">
                                            {sessionUser.name}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="group rounded-xl border border-slate-700/80 bg-slate-800/60 px-3 py-2.5 transition-all duration-300 hover:border-slate-500 hover:bg-slate-800 hover:shadow-md hover:-translate-y-0.5">
                                <div className="flex items-center gap-2">
                                    <Hash className="h-3.5 w-3.5 text-slate-500 transition-colors group-hover:text-slate-300" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-slate-500">RFID User</p>
                                        <p className="truncate font-mono text-xs font-semibold text-slate-200">
                                            {sessionUser.rfid_user || '—'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="mt-4 text-center text-[10px] text-slate-500">
                            Scanner RFID aktif — scan langsung tanpa ketuk layar
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
});

RfidQcPqcScanModal.displayName = 'RfidQcPqcScanModal';

export default RfidQcPqcScanModal;

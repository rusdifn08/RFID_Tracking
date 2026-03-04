import { useEffect, useState } from 'react';
import { useMqttLoginSuccessStore } from '../stores/mqttLoginSuccessStore';
import { XCircle } from 'lucide-react';

const DISPLAY_DURATION_MS = 1000;
const EXIT_ANIMATION_MS = 180;

interface LoginFailAnimationProps {
    currentLineId: string | null;
}

export default function LoginFailAnimation({ currentLineId }: LoginFailAnimationProps) {
    const eventFail = useMqttLoginSuccessStore((s) => s.eventFail);
    const clearEventFail = useMqttLoginSuccessStore((s) => s.clearEventFail);
    const [visible, setVisible] = useState(false);
    const [exiting, setExiting] = useState(false);
    const [key, setKey] = useState(0);

    useEffect(() => {
        if (!eventFail) {
            setVisible(false);
            setExiting(false);
            return;
        }
        if (currentLineId != null && eventFail.line !== currentLineId) return;
        setKey(eventFail.at);
        setExiting(false);
        setVisible(true);
        if (typeof console !== 'undefined' && console.log) {
            console.log('[MQTT Login] Animasi ditampilkan:', eventFail.role === 'qc' ? 'QC' : 'PQC', 'Login Gagal, LINE', eventFail.line);
        }
        const exitStart = setTimeout(() => setExiting(true), DISPLAY_DURATION_MS);
        const t = setTimeout(() => {
            setVisible(false);
            clearEventFail();
        }, DISPLAY_DURATION_MS + EXIT_ANIMATION_MS);
        return () => {
            clearTimeout(exitStart);
            clearTimeout(t);
        };
    }, [eventFail, currentLineId, clearEventFail]);

    if (!visible || !eventFail) return null;
    if (currentLineId != null && eventFail.line !== currentLineId) return null;

    const label = eventFail.role === 'qc' ? 'QC Login Gagal' : 'PQC Login Gagal';

    return (
        <div
            key={key}
            className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none p-4"
            aria-live="polite"
        >
            {/* Backdrop: flash merah lemah lalu fade */}
            <div
                className="absolute inset-0 bg-red-950/20 backdrop-blur-[1px]"
                style={{
                    animation: exiting
                        ? `failOverlayOut ${EXIT_ANIMATION_MS}ms ease-out forwards`
                        : `failOverlayIn 0.25s ease-out forwards`,
                }}
            />
            {/* Kartu: jatuh dari atas + getar singkat */}
            <div
                className="relative rounded-xl bg-white shadow-xl border-2 border-red-300 px-6 py-4 text-center min-w-[260px] max-w-[90vw] fail-card"
                style={{
                    animation: exiting
                        ? `failCardOut ${EXIT_ANIMATION_MS}ms ease-in forwards`
                        : 'failCardIn 0.28s cubic-bezier(0.34, 1.1, 0.64, 1) forwards',
                }}
            >
                <div className="flex justify-center mb-2">
                    <div
                        className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 border-2 border-red-300 fail-icon-wrap"
                        style={{ animation: 'failIconIn 0.22s 0.06s ease-out forwards', opacity: 0 }}
                    >
                        <XCircle
                            className="w-7 h-7 text-red-600"
                            strokeWidth={2.5}
                            style={{ animation: 'failXIn 0.2s 0.12s ease-out forwards', opacity: 0 }}
                        />
                    </div>
                </div>
                <p className="text-base font-bold text-red-800 tracking-tight fail-title" style={{ animation: 'failTextIn 0.2s 0.18s ease-out forwards', opacity: 0 }}>
                    {label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 fail-sub" style={{ animation: 'failTextIn 0.2s 0.22s ease-out forwards', opacity: 0 }}>
                    Authentication failed · LINE {eventFail.line}
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl bg-red-100 overflow-hidden">
                    <div
                        className="h-full bg-red-500 rounded-b-xl"
                        style={{ animation: `failProgressShrink ${DISPLAY_DURATION_MS}ms linear forwards` }}
                    />
                </div>
            </div>
            <style>{`
                .fail-card { box-shadow: 0 4px 24px rgba(220, 38, 38, 0.15); }
                @keyframes failOverlayIn {
                    0% { opacity: 0; background-color: rgba(0,0,0,0); }
                    40% { opacity: 1; background-color: rgba(127, 29, 29, 0.12); }
                    100% { opacity: 1; background-color: rgba(127, 29, 29, 0.08); }
                }
                @keyframes failOverlayOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                @keyframes failCardIn {
                    0% { opacity: 0; transform: translateY(-24px) scale(0.92); }
                    55% { opacity: 1; transform: translateY(2px) scale(1.02); }
                    70% { transform: translateY(-1px) scale(1); }
                    85% { transform: translateY(1px) scale(1); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes failCardOut {
                    from { opacity: 1; transform: translateY(0) scale(1); }
                    to { opacity: 0; transform: translateY(8px) scale(0.97); }
                }
                @keyframes failIconIn {
                    0% { opacity: 0; transform: scale(0.4); }
                    70% { transform: scale(1.06); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes failXIn {
                    from { opacity: 0; transform: scale(0.6) rotate(-12deg); }
                    to { opacity: 1; transform: scale(1) rotate(0deg); }
                }
                @keyframes failTextIn {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes failProgressShrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </div>
    );
}

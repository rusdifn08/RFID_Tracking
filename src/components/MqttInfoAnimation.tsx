import { useEffect, useState } from 'react';
import { useMqttInfoStore, getMqttInfoMessage } from '../stores/mqttInfoStore';
import { Info } from 'lucide-react';

const DISPLAY_DURATION_MS = 2500;
const EXIT_ANIMATION_MS = 280;

interface MqttInfoAnimationProps {
    currentLineId: string | null;
}

export default function MqttInfoAnimation({ currentLineId }: MqttInfoAnimationProps) {
    const event = useMqttInfoStore((s) => s.event);
    const clearEvent = useMqttInfoStore((s) => s.clearEvent);
    const [visible, setVisible] = useState(false);
    const [exiting, setExiting] = useState(false);
    const [key, setKey] = useState(0);

    useEffect(() => {
        if (!event) {
            setVisible(false);
            setExiting(false);
            return;
        }
        if (currentLineId != null && event.line !== currentLineId) return;
        setKey(event.at);
        setExiting(false);
        setVisible(true);
        const exitStart = setTimeout(() => setExiting(true), DISPLAY_DURATION_MS);
        const t = setTimeout(() => {
            setVisible(false);
            clearEvent();
        }, DISPLAY_DURATION_MS + EXIT_ANIMATION_MS);
        return () => {
            clearTimeout(exitStart);
            clearTimeout(t);
        };
    }, [event, currentLineId, clearEvent]);

    if (!visible || !event) return null;
    if (currentLineId != null && event.line !== currentLineId) return null;

    const message = getMqttInfoMessage(event.payload);
    const roleLabel = event.role === 'qc' ? 'QC' : 'PQC';

    return (
        <div
            key={key}
            className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none p-4"
            aria-live="polite"
        >
            <div
                className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]"
                style={{
                    animation: exiting
                        ? `infoOverlayOut ${EXIT_ANIMATION_MS}ms ease-in forwards`
                        : 'infoOverlayIn 0.25s ease-out forwards',
                }}
            />
            <div
                className="relative rounded-xl bg-white shadow-xl border border-slate-200 px-6 py-5 text-center min-w-[300px] max-w-[90vw]"
                style={{
                    animation: exiting
                        ? `infoCardOut ${EXIT_ANIMATION_MS}ms ease-in forwards`
                        : 'infoCardIn 0.35s cubic-bezier(0.34, 1.2, 0.64, 1) forwards',
                }}
            >
                <div className="flex justify-center mb-3">
                    <div
                        className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 border border-amber-100"
                        style={{ animation: 'infoIconIn 0.4s 0.1s cubic-bezier(0.34, 1.2, 0.64, 1) forwards', opacity: 0 }}
                    >
                        <Info className="w-8 h-8 text-amber-600" strokeWidth={2} style={{ animation: 'infoIconIn 0.3s 0.25s ease-out forwards', opacity: 0 }} />
                    </div>
                </div>
                <p className="text-base font-semibold text-slate-800 tracking-tight" style={{ animation: 'infoTextIn 0.3s 0.2s ease-out forwards', opacity: 0 }}>
                    Informasi Garment
                </p>
                <p className="text-lg font-medium text-slate-700 mt-1" style={{ animation: 'infoTextIn 0.3s 0.3s ease-out forwards', opacity: 0 }}>
                    {message}
                </p>
                <p className="text-xs text-slate-400 mt-2" style={{ animation: 'infoTextIn 0.3s 0.4s ease-out forwards', opacity: 0 }}>
                    LINE {event.line} · {roleLabel}
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl bg-slate-100 overflow-hidden">
                    <div
                        className="h-full bg-amber-500 rounded-b-xl"
                        style={{ animation: `infoProgressShrink ${DISPLAY_DURATION_MS}ms linear forwards` }}
                    />
                </div>
            </div>
            <style>{`
                @keyframes infoOverlayIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes infoOverlayOut { from { opacity: 1; } to { opacity: 0; } }
                @keyframes infoCardIn {
                    0% { opacity: 0; transform: scale(0.92); }
                    70% { transform: scale(1.02); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes infoCardOut {
                    from { opacity: 1; transform: scale(1); }
                    to { opacity: 0; transform: scale(0.96); }
                }
                @keyframes infoIconIn {
                    0% { opacity: 0; transform: scale(0.3); }
                    70% { transform: scale(1.08); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes infoTextIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes infoProgressShrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </div>
    );
}

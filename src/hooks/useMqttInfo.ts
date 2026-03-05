/**
 * Event info MQTT (topic info/line{N}/qc|pqc/{env}) untuk animasi info di dashboard.
 * Server subscribe MQTT; frontend dapat event lewat polling GET /api/mqtt-info.
 */

import { useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { useMqttInfoStore } from '../stores/mqttInfoStore';

function log(msg: string, ...args: unknown[]) {
    if (typeof console !== 'undefined' && console.log) {
        console.log('[MQTT Info] ' + msg, ...args);
    }
}

export function useMqttInfoPolling(currentLineId: string | null): void {
    const setEvent = useMqttInfoStore((s) => s.setEvent);

    useEffect(() => {
        if (!currentLineId) return;

        const poll = async () => {
            try {
                const url = API_BASE_URL + '/api/mqtt-info?line=' + encodeURIComponent(currentLineId);
                const res = await fetch(url, { method: 'GET' });
                const data = await res.json().catch(() => ({}));
                if (!data?.success || !data?.event) return;
                const ev = data.event;
                if (ev.line === currentLineId) {
                    setEvent({
                        line: ev.line,
                        role: ev.role,
                        payload: ev.payload,
                        at: ev.at ?? Date.now(),
                    });
                    log('Event info dari server (MQTT) → animasi', ev.payload, ev);
                }
            } catch (_) {
                // ignore
            }
        };

        poll();
        const interval = setInterval(poll, 1500);
        return () => clearInterval(interval);
    }, [currentLineId, setEvent]);
}

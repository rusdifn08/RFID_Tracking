/**
 * Event login success (QC/PQC) untuk animasi di dashboard.
 *
 * Arsitektur:
 * - MQTT hanya di server (server.js): konek ke broker mqtt://10.5.0.106:1883 (TCP),
 *   subscribe & terima pesan, simpan event terakhir.
 * - Browser tidak bisa konek langsung ke MQTT port 1883 (browser hanya HTTP/WebSocket).
 * - Dashboard dapat event lewat polling: GET /api/mqtt-login-success ke server (proxy).
 */

import { useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { useMqttLoginSuccessStore } from '../stores/mqttLoginSuccessStore';

const log = (msg: string, ...args: unknown[]) => {
    if (typeof console !== 'undefined' && console.log) {
        console.log(`[MQTT Login] ${msg}`, ...args);
    }
};

/** Polling event login dari server. Server dapat event dari MQTT (port 1883), frontend ambil lewat API. */
export function useMqttLoginSuccessPolling(currentLineId: string | null): void {
    const setEvent = useMqttLoginSuccessStore((s) => s.setEvent);
    const setEventFail = useMqttLoginSuccessStore((s) => s.setEventFail);
    const setLedStatus = useMqttLoginSuccessStore((s) => s.setLedStatus);

    useEffect(() => {
        if (!currentLineId) return;

        log('Polling aktif untuk LINE', currentLineId, '→', `${API_BASE_URL}/api/mqtt-login-success`);

        const poll = async () => {
            try {
                const url = `${API_BASE_URL}/api/mqtt-login-success?line=${encodeURIComponent(currentLineId)}`;
                const res = await fetch(url, { method: 'GET' });
                const data = await res.json().catch(() => ({}));
                if (!data?.success) return;
                if (data?.ledStatus && typeof data.ledStatus === 'object') {
                    setLedStatus({
                        qc: data.ledStatus.qc ?? null,
                        pqc: data.ledStatus.pqc ?? null,
                    });
                }
                if (data?.eventFail && data.eventFail.line === currentLineId) {
                    const currentFail = useMqttLoginSuccessStore.getState().eventFail;
                    const at = data.eventFail.at ?? Date.now();
                    if (!currentFail || currentFail.at !== at) {
                        setEventFail({
                            line: data.eventFail.line,
                            role: data.eventFail.role,
                            at,
                        });
                        log('Event fail dari server (MQTT) → animasi login gagal (1x)', data.eventFail);
                    }
                    const cur = useMqttLoginSuccessStore.getState().ledStatus;
                    setLedStatus({
                        ...cur,
                        [data.eventFail.role]: { status: 'unsuccess' as const, at },
                    });
                }
                if (data?.event && data.event.line === currentLineId) {
                    setEvent({
                        line: data.event.line,
                        role: data.event.role,
                        at: data.event.at ?? Date.now(),
                    });
                    log('Event dari server (MQTT) → animasi', data.event);
                    const cur = useMqttLoginSuccessStore.getState().ledStatus;
                    setLedStatus({
                        ...cur,
                        [data.event.role]: { status: 'success' as const, at: data.event.at ?? Date.now() },
                    });
                }
            } catch (_) {}
        };

        poll();
        const interval = setInterval(poll, 1500);
        return () => clearInterval(interval);
    }, [currentLineId, setEvent, setEventFail, setLedStatus]);
}

/** Tidak dipakai: MQTT hanya jalan di server. Tetap export agar pemanggil tidak error. */
export function useMqttLoginSuccess(): void {
    // No-op: browser tidak konek ke MQTT; server.js yang subscribe ke broker (port 1883).
}

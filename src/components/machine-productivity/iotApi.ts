/** Same-origin lewat Vite proxy (ngrok HTTPS / dev HTTPS) — hindari mixed content ke :8088 */
function iotUseSameOriginProxy(): boolean {
    return (
        typeof window !== 'undefined' &&
        import.meta.env.DEV &&
        window.location.protocol === 'https:'
    );
}

/** Backend IoT Rust — dev LAN: hostname:8088; ngrok/HTTPS: relative /api/... via Vite proxy */
export function iotApiBase(): string {
    const fromEnv = import.meta.env.VITE_IOT_API_URL as string | undefined;
    if (fromEnv?.trim()) return fromEnv.replace(/\/$/, '');
    if (iotUseSameOriginProxy()) return '';
    if (typeof window !== 'undefined') return `http://${window.location.hostname}:8088`;
    return 'http://127.0.0.1:8088';
}

export function iotWsUrl(): string {
    const fromEnv = import.meta.env.VITE_IOT_WS_URL as string | undefined;
    if (fromEnv?.trim()) return fromEnv;
    if (typeof window !== 'undefined') {
        if (iotUseSameOriginProxy()) {
            const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
            return `${proto}://${window.location.host}/ws`;
        }
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
        return `${proto}://${window.location.hostname}:8088/ws`;
    }
    return 'ws://127.0.0.1:8088/ws';
}

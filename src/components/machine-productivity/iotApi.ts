/** Backend IoT — pakai hostname browser agar jalan dari 10.5.0.2:5173 */
export function iotApiBase(): string {
    if (import.meta.env.VITE_IOT_API_URL) return import.meta.env.VITE_IOT_API_URL;
    if (typeof window !== 'undefined') return `http://${window.location.hostname}:8088`;
    return 'http://127.0.0.1:8088';
}

export function iotWsUrl(): string {
    if (import.meta.env.VITE_IOT_WS_URL) return import.meta.env.VITE_IOT_WS_URL;
    if (typeof window !== 'undefined') {
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
        return `${proto}://${window.location.hostname}:8088/ws`;
    }
    return 'ws://127.0.0.1:8088/ws';
}

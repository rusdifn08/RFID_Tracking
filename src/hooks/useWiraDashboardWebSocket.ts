import { useEffect, useRef, useState, useCallback } from 'react';
import { getWiraDashboardWSUrl } from '../config/api';

// Export interface untuk digunakan di file lain
export interface WiraDashboardData {
    line: string;
    WO: string;
    Style: string;
    Item: string;
    Buyer: string;
    'Output Sewing': string;
    Good: string;
    'PQC Good': string;
    Rework: string;
    'PQC Rework': string;
    Reject: number;
    WIRA: number;
    'PQC Reject': number;
    'PQC WIRA': number;
    Balance: string;
}

export interface WiraDashboardResponse {
    success: boolean;
    data: WiraDashboardData[];
    filters?: Record<string, any>;
}

interface UseWiraDashboardWebSocketOptions {
    enabled?: boolean;
    onData?: (data: WiraDashboardResponse) => void;
    onError?: (error: Error) => void;
    reconnectInterval?: number;
}

export const useWiraDashboardWebSocket = (
    options: UseWiraDashboardWebSocketOptions = {}
) => {
    const {
        enabled = true,
        onData,
        onError,
        reconnectInterval = 3000,
    } = options;

    const [data, setData] = useState<WiraDashboardResponse | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 10;
    const baseReconnectInterval = reconnectInterval;
    
    // Simpan callback di ref agar tidak menyebabkan re-render
    const onDataRef = useRef(onData);
    const onErrorRef = useRef(onError);
    const enabledRef = useRef(enabled);
    const reconnectIntervalRef = useRef(reconnectInterval);
    
    // Cache untuk mencegah update data yang sama
    const lastDataHashRef = useRef<string>('');

    // Update refs saat props berubah
    useEffect(() => {
        onDataRef.current = onData;
        onErrorRef.current = onError;
        enabledRef.current = enabled;
        reconnectIntervalRef.current = reconnectInterval;
    }, [onData, onError, enabled, reconnectInterval]);

    // Helper untuk generate hash dari data
    const generateDataHash = (response: WiraDashboardResponse): string => {
        if (!response.data || !Array.isArray(response.data)) return '';
        return JSON.stringify(response.data.map(item => ({
            line: item.line,
            Good: item.Good,
            Reject: item.Reject,
            WIRA: item.WIRA,
            'Output Sewing': item['Output Sewing']
        })));
    };

    const connect = useCallback(() => {
        // Cek apakah sudah ada connection yang aktif
        if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
            return;
        }

        if (!enabledRef.current) {
            return;
        }

        // Reset reconnect attempts jika berhasil connect
        if (reconnectAttemptsRef.current > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
            reconnectAttemptsRef.current = 0;
        }

        // Cek max reconnect attempts
        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            console.warn('⚠️ [WIRA WS] Max reconnect attempts reached, stopping...');
            return;
        }

        try {
            const wsUrl = getWiraDashboardWSUrl();
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                reconnectAttemptsRef.current = 0; // Reset attempts on successful connection
                setIsConnected(true);
                setError(null);
            };

            ws.onmessage = (event) => {
                try {
                    const response: WiraDashboardResponse = JSON.parse(event.data);
                    
                    if (response.success && Array.isArray(response.data)) {
                        // Check jika data sama dengan sebelumnya
                        const dataHash = generateDataHash(response);
                        if (dataHash === lastDataHashRef.current && lastDataHashRef.current !== '') {
                            // Data sama, skip update untuk mencegah re-render
                            return;
                        }
                        
                        lastDataHashRef.current = dataHash;
                        setData(response);
                        
                        // Gunakan ref untuk callback
                        if (onDataRef.current) {
                            onDataRef.current(response);
                        }
                    }
                } catch (parseError) {
                    const err = new Error(`Failed to parse WebSocket message: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
                    setError(err);
                    if (onErrorRef.current) {
                        onErrorRef.current(err);
                    }
                }
            };

            ws.onerror = (event) => {
                const err = new Error('WebSocket connection error');
                setError(err);
                setIsConnected(false);
                if (onErrorRef.current) {
                    onErrorRef.current(err);
                }
            };

            ws.onclose = (event) => {
                setIsConnected(false);
                wsRef.current = null;

                // Auto-reconnect dengan exponential backoff
                if (enabledRef.current && isMountedRef.current && event.code !== 1000) {
                    reconnectAttemptsRef.current += 1;
                    
                    // Exponential backoff: 3s, 6s, 12s, 24s, max 30s
                    const backoffDelay = Math.min(
                        baseReconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1),
                        30000
                    );
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        if (isMountedRef.current && enabledRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
                            connect();
                        }
                    }, backoffDelay);
                }
            };

            wsRef.current = ws;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to create WebSocket');
            setError(error);
            setIsConnected(false);
            if (onErrorRef.current) {
                onErrorRef.current(error);
            }
        }
    }, [baseReconnectInterval, maxReconnectAttempts]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            // Hanya close jika belum dalam proses closing
            if (wsRef.current.readyState !== WebSocket.CLOSING && wsRef.current.readyState !== WebSocket.CLOSED) {
                wsRef.current.close(1000, 'Manual disconnect');
            }
            wsRef.current = null;
        }

        setIsConnected(false);
        reconnectAttemptsRef.current = 0; // Reset attempts on manual disconnect
    }, []);

    useEffect(() => {
        isMountedRef.current = true;

        if (enabled) {
            connect();
        } else {
            // Jika disabled, disconnect
            disconnect();
        }

        return () => {
            isMountedRef.current = false;
            disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]); // Hanya depend pada enabled, connect dan disconnect stabil

    return {
        data,
        isConnected,
        error,
        reconnect: connect,
        disconnect,
    };
};

import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { useMqttLoginSuccessPolling } from '../hooks/useMqttLoginSuccess';
import LoginSuccessAnimation from './LoginSuccessAnimation';
import LoginFailAnimation from './LoginFailAnimation';

/**
 * Animasi login success & login gagal: event dari MQTT via server.
 * Server (server.js) subscribe MQTT; dashboard dapat event lewat polling API.
 */
export default function MqttLoginSuccessOverlay() {
    const location = useLocation();

    const currentLineId = useMemo(() => {
        const path = decodeURIComponent(location.pathname);
        const match =
            path.match(/\/dashboard-rfid\/(\d+)/i) ||
            path.match(/\/dashboard-rfid\/LINE[% ]*(\d+)/i) ||
            path.match(/\/line\/(\d+)/);
        return match ? match[1] : null;
    }, [location.pathname]);

    useMqttLoginSuccessPolling(currentLineId);

    return (
        <>
            <LoginSuccessAnimation currentLineId={currentLineId} />
            <LoginFailAnimation currentLineId={currentLineId} />
        </>
    );
}

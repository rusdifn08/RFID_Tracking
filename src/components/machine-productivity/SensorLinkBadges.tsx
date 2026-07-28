import { AlertTriangle, Cable, Wifi, WifiOff } from 'lucide-react';
import type { DeviceHealth } from './types';

type Props = {
    linkAlive: boolean;
    ageMs: number;
    hasTelemetry: boolean;
    statusOffline: boolean;
    sensorLabel: string;
    health?: DeviceHealth;
    /** dari field sensor_ok di telemetry */
    telemetrySensorOk?: boolean;
};

/**
 * Indikator link ESP + kesehatan modul sensor (dari MQTT status/telemetry).
 */
export default function SensorLinkBadges({
    linkAlive,
    ageMs,
    hasTelemetry,
    statusOffline,
    sensorLabel,
    health,
    telemetrySensorOk,
}: Props) {
    const moduleOk = health?.sensor_ok ?? telemetrySensorOk ?? true;
    const espAlive = linkAlive || (health?.online === true && health.state !== 'mqtt_lost');

    let linkBadge: { cls: string; icon: typeof Wifi; text: string };
    if (espAlive && moduleOk) {
        linkBadge = {
            cls: 'bg-emerald-100 text-emerald-800 border-emerald-200 animate-pulse',
            icon: Wifi,
            text: 'ESP + sensor OK',
        };
    } else if (espAlive && !moduleOk) {
        linkBadge = {
            cls: 'bg-amber-100 text-amber-900 border-amber-300',
            icon: Cable,
            text: `${sensorLabel} gagal baca`,
        };
    } else {
        linkBadge = {
            cls: 'bg-rose-100 text-rose-800 border-rose-300',
            icon: WifiOff,
            text: statusOffline
                ? `ESP32 / ${sensorLabel} offline`
                : !hasTelemetry
                  ? 'Menunggu MQTT…'
                  : `Link putus (${Math.max(0, Math.floor(ageMs / 1000))}d)`,
        };
    }

    const Icon = linkBadge.icon;
    const state = health?.state;
    const showWarn = espAlive && !moduleOk;

    return (
        <>
            <span
                className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${linkBadge.cls}`}
            >
                <Icon className="h-3 w-3" aria-hidden />
                {linkBadge.text}
            </span>
            {state && state !== 'ok' && state !== 'sensor_ok' && state !== 'mqtt_ok' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    <AlertTriangle className="h-3 w-3 text-amber-600" aria-hidden />
                    {state}
                </span>
            )}
            {showWarn && (
                <p className="basis-full relative mt-1 text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    ESP online, tetapi modul {sensorLabel} tidak terbaca.
                    {health?.detail ? (
                        <>
                            {' '}
                            <span className="font-medium">{health.detail}</span>
                        </>
                    ) : (
                        <> Cek kabel sensor / L-N AC (PZEM) / I2C (ADXL).</>
                    )}
                    {health?.fail_count != null && health.fail_count > 0 && (
                        <span className="ml-1 opacity-70">(fail #{health.fail_count})</span>
                    )}
                </p>
            )}
            {!espAlive && (
                <p className="basis-full relative mt-1 text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                    {health?.state === 'mqtt_lost'
                        ? 'MQTT LWT: koneksi ESP putus mendadak.'
                        : `Belum ada paket < 15 detik. Cek WiFi/MQTT ESP dan topik …/telemetry/${sensorLabel.toLowerCase()}.`}
                    {health?.detail ? ` ${health.detail}` : ''}
                </p>
            )}
        </>
    );
}

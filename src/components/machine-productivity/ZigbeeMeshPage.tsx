import { useCallback, useEffect, useState } from 'react';
import { Loader2, Radio, RefreshCw, Wifi } from 'lucide-react';
import { iotApiBase } from './iotApi';

type ZigbeeNode = {
    id: string;
    code: string;
    name: string;
    display_name: string;
    device_uid: string | null;
    online: boolean;
    last_seen_at: string | null;
    mqtt_ok: boolean | null;
    wifi_ok: boolean | null;
    lqi: number | null;
    signal: string;
    voltage_v: number;
    current_a: number;
    power_w: number;
    op_status: string;
    telemetry_at: string | null;
};

type MeshResponse = {
    coordinator: {
        mqtt_host: string;
        mqtt_port: number;
        topic_prefix: string;
        online: boolean;
        wifi_ok?: boolean;
        mqtt_ok?: boolean;
        detail: string;
    };
    summary: {
        nodes_total: number;
        nodes_online: number;
        nodes_offline: number;
    };
    nodes: ZigbeeNode[];
    polled_at: string;
    source?: 'coordinator' | 'db';
    coordinator_at?: string;
};

function statusLabel(st: string) {
    if (st === 'running') return 'Running';
    if (st === 'idle') return 'Idle';
    if (st === 'off') return 'Off';
    if (st === 'offline') return 'Offline';
    return st || '—';
}

function statusDot(st: string, online: boolean) {
    if (!online) return 'bg-rose-500';
    if (st === 'running') return 'bg-emerald-500';
    if (st === 'idle') return 'bg-amber-400';
    if (st === 'off') return 'bg-slate-400';
    return 'bg-sky-500';
}

function signalClass(q: string) {
    if (q === 'excellent' || q === 'good') return 'bg-emerald-100 text-emerald-800';
    if (q === 'fair') return 'bg-amber-100 text-amber-800';
    if (q === 'weak' || q === 'poor') return 'bg-rose-100 text-rose-800';
    return 'bg-slate-100 text-slate-500';
}

function formatSeen(iso: string | null) {
    if (!iso) return '—';
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return '—';
    const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (sec < 5) return 'baru saja';
    if (sec < 60) return `${sec}s lalu`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m lalu`;
    return `${Math.floor(sec / 3600)}j lalu`;
}

export default function ZigbeeMeshPage() {
    const apiBase = iotApiBase();
    const [data, setData] = useState<MeshResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const load = useCallback(async () => {
        setErr(null);
        try {
            const res = await fetch(`${apiBase}/api/zigbee/mesh`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = (await res.json()) as MeshResponse;
            setData(json);
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'Gagal load');
        } finally {
            setLoading(false);
        }
    }, [apiBase]);

    useEffect(() => {
        void load();
        const id = window.setInterval(() => void load(), 2000);
        return () => window.clearInterval(id);
    }, [load]);

    return (
        <div className="w-full max-w-6xl mx-auto space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-lg font-semibold text-slate-800">Monitor Zigbee Nodes</h1>
                    <p className="text-sm text-slate-500">
                        {data?.source === 'coordinator'
                            ? 'Live dari Coordinator (MQTT mesh) — sinkron dengan LCD NODES'
                            : 'Menunggu snapshot Coordinator — data DB sementara'}
                        {data?.coordinator_at && (
                            <span className="block text-xs text-slate-400 mt-0.5">
                                Coordinator: {formatSeen(data.coordinator_at)}
                            </span>
                        )}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setLoading(true);
                        void load();
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-sky-600 text-white hover:bg-sky-700"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {err && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-sm">
                    {err}. Pastikan backend Rust jalan (restart setelah update).
                </div>
            )}

            {data && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wide">
                            <Wifi size={14} /> Coordinator
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                            <span
                                className={`h-2.5 w-2.5 rounded-full ${data.coordinator.online ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            />
                            <span className="text-sm font-medium text-slate-800">
                                {data.coordinator.online ? 'MQTT bridge online' : 'Offline'}
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            {data.coordinator.mqtt_host}:{data.coordinator.mqtt_port} ·{' '}
                            {data.coordinator.topic_prefix}
                        </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="text-slate-500 text-xs uppercase tracking-wide">Nodes online</div>
                        <div className="mt-2 text-2xl font-semibold text-emerald-600">
                            {data.summary.nodes_online}
                            <span className="text-sm font-normal text-slate-400">
                                {' '}
                                / {data.summary.nodes_total}
                            </span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="text-slate-500 text-xs uppercase tracking-wide">Nodes offline</div>
                        <div className="mt-2 text-2xl font-semibold text-rose-500">
                            {data.summary.nodes_offline}
                        </div>
                    </div>
                </div>
            )}

            {loading && !data ? (
                <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-sm">
                    <Loader2 className="animate-spin" size={18} /> Memuat mesh…
                </div>
            ) : !data?.nodes.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-400 text-sm space-y-1">
                    <p>Belum ada node Zigbee terdaftar.</p>
                    <p className="text-xs">
                        Hanya UID Zigbee format baru (<code className="text-slate-500">0001</code>,{' '}
                        <code className="text-slate-500">0002</code>, …) dari Coordinator. UID lama{' '}
                        <code className="text-slate-500">001</code>–<code className="text-slate-500">008</code>{' '}
                        (Wi‑Fi) tidak ditampilkan.
                    </p>
                </div>
            ) : (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-left text-xs uppercase tracking-wide">
                            <tr>
                                <th className="px-4 py-3 font-medium">Node</th>
                                <th className="px-4 py-3 font-medium">Link</th>
                                <th className="px-4 py-3 font-medium">Signal (LQI)</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">V / A</th>
                                <th className="px-4 py-3 font-medium">Last seen</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data!.nodes.map((n) => (
                                <tr key={n.id} className="hover:bg-slate-50/80">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-slate-800">{n.display_name || n.name}</div>
                                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                                            <Radio size={12} />
                                            UID {n.device_uid || '—'} · {n.code}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                                                n.online
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-rose-50 text-rose-700'
                                            }`}
                                        >
                                            <span
                                                className={`h-1.5 w-1.5 rounded-full ${n.online ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                            />
                                            {n.online ? 'Online' : 'Offline'}
                                        </span>
                                        <div className="text-[11px] text-slate-400 mt-1">Zigbee → MQTT</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-block rounded px-2 py-0.5 text-xs ${signalClass(n.signal)}`}
                                        >
                                            {n.signal}
                                            {n.lqi != null ? ` · ${n.lqi}` : ''}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center gap-1.5 text-slate-700">
                                            <span
                                                className={`h-2 w-2 rounded-full ${statusDot(n.op_status, n.online)}`}
                                            />
                                            {n.online ? statusLabel(n.op_status) : 'Offline'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 tabular-nums text-slate-700">
                                        {n.voltage_v.toFixed(0)} V · {n.current_a.toFixed(2)} A
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">{formatSeen(n.last_seen_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

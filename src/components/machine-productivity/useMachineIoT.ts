import { useCallback, useEffect, useState } from 'react';
import { iotApiBase, iotWsUrl } from './iotApi';
import type { AdxlLive, MachineLive, MachineRow, PzemDailyStats, PzemLive } from './types';

export function useMachineIoT() {
    const [machines, setMachines] = useState<MachineRow[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [liveByMachine, setLiveByMachine] = useState<Record<string, MachineLive>>({});
    const [pzemStatsByMachine, setPzemStatsByMachine] = useState<Record<string, PzemDailyStats>>({});
    const [adxlStatsByMachine, setAdxlStatsByMachine] = useState<Record<string, PzemDailyStats>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const apiBase = iotApiBase();

    const patchMachine = useCallback((id: string, patch: Partial<MachineRow>) => {
        setMachines((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    }, []);

    const patchLive = useCallback((machineId: string, patch: Partial<MachineLive>) => {
        setLiveByMachine((prev) => ({
            ...prev,
            [machineId]: { ...prev[machineId], ...patch },
        }));
    }, []);

    const loadMachines = useCallback(async () => {
        try {
            setError(null);
            const res = await fetch(`${apiBase}/api/machines`);
            if (!res.ok) throw new Error(`API ${res.status}`);
            const data: MachineRow[] = await res.json();
            const normalized = data.map((m) => ({
                ...m,
                status_adxl: m.status_adxl ?? 'offline',
                status_pzem: m.status_pzem ?? 'offline',
                current_threshold_a: m.current_threshold_a ?? 0.6,
                off_current_a: m.off_current_a ?? 0.03,
                brand: m.brand ?? '',
                process_name: m.process_name ?? '',
            }));
            setMachines(normalized);
            setSelectedId((prev) => prev ?? normalized[0]?.id ?? null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Gagal memuat mesin');
        } finally {
            setLoading(false);
        }
    }, [apiBase]);

    const fetchTelemetry = useCallback(
        async (machineId: string) => {
            try {
                const res = await fetch(`${apiBase}/api/machines/${machineId}/telemetry?limit=1`);
                if (!res.ok) return;
                const data = (await res.json()) as {
                    adxl?: Array<{ ts: string; ax: number; ay: number; az: number; magnitude_g: number }>;
                    pzem?: Array<{
                        ts: string;
                        voltage_v: number;
                        current_a: number;
                        power_w: number;
                        energy_kwh: number;
                        frequency_hz?: number;
                        power_factor?: number;
                    }>;
                };
                const adxl = data.adxl?.[0];
                const pzem = data.pzem?.[0];
                const patch: Partial<MachineLive> = {};
                if (adxl) {
                    patch.adxl = {
                        ax: adxl.ax,
                        ay: adxl.ay,
                        az: adxl.az,
                        magnitude_g: adxl.magnitude_g,
                        ts: adxl.ts,
                    };
                }
                if (pzem) {
                    patch.pzem = {
                        voltage_v: pzem.voltage_v,
                        current_a: pzem.current_a,
                        power_w: pzem.power_w,
                        energy_kwh: pzem.energy_kwh,
                        frequency_hz: pzem.frequency_hz ?? 0,
                        power_factor: pzem.power_factor ?? 0,
                        ts: pzem.ts,
                    };
                }
                if (Object.keys(patch).length) patchLive(machineId, patch);
            } catch {
                /* ignore */
            }
        },
        [apiBase, patchLive]
    );

    const fetchPzemStats = useCallback(
        async (machineId: string) => {
            try {
                const res = await fetch(`${apiBase}/api/machines/${machineId}/pzem-stats`);
                if (!res.ok) return;
                const data: PzemDailyStats = await res.json();
                setPzemStatsByMachine((prev) => ({ ...prev, [machineId]: data }));
            } catch {
                /* ignore */
            }
        },
        [apiBase]
    );

    const resetPzemStats = useCallback(
        async (machineId: string) => {
            const res = await fetch(`${apiBase}/api/machines/${machineId}/pzem-stats`, { method: 'POST' });
            if (!res.ok) throw new Error(`Reset gagal (${res.status})`);
            const data = await res.json();
            setPzemStatsByMachine((prev) => ({
                ...prev,
                [machineId]: {
                    work_date: data.work_date,
                    running_sec: 0,
                    idle_sec: 0,
                    off_sec: 0,
                    running_pct: 0,
                    idle_pct: 0,
                    off_pct: 0,
                },
            }));
            return data as { archived?: boolean; period_id?: string };
        },
        [apiBase]
    );

    const fetchAdxlStats = useCallback(
        async (machineId: string) => {
            try {
                const res = await fetch(`${apiBase}/api/machines/${machineId}/adxl-stats`);
                if (!res.ok) return;
                const data: PzemDailyStats = await res.json();
                setAdxlStatsByMachine((prev) => ({ ...prev, [machineId]: data }));
            } catch {
                /* ignore */
            }
        },
        [apiBase]
    );

    const resetAdxlStats = useCallback(
        async (machineId: string) => {
            const res = await fetch(`${apiBase}/api/machines/${machineId}/adxl-stats`, { method: 'POST' });
            if (!res.ok) throw new Error(`Reset gagal (${res.status})`);
            const data = await res.json();
            setAdxlStatsByMachine((prev) => ({
                ...prev,
                [machineId]: {
                    work_date: data.work_date,
                    running_sec: 0,
                    idle_sec: 0,
                    off_sec: 0,
                    running_pct: 0,
                    idle_pct: 0,
                    off_pct: 0,
                },
            }));
            return data as { archived?: boolean; period_id?: string };
        },
        [apiBase]
    );

    useEffect(() => {
        void loadMachines();
    }, [loadMachines]);

    useEffect(() => {
        if (!selectedId) return;
        // ponytail: bootstrap sekali; live update lewat WebSocket
        void fetchTelemetry(selectedId);
        void fetchPzemStats(selectedId);
        void fetchAdxlStats(selectedId);
    }, [selectedId, fetchTelemetry, fetchPzemStats, fetchAdxlStats]);

    useEffect(() => {
        let ws: WebSocket | null = null;
        let closed = false;
        let retry: ReturnType<typeof setTimeout> | undefined;

        const connect = () => {
            if (closed) return;
            ws = new WebSocket(iotWsUrl());
            ws.onmessage = (ev) => {
                try {
                    const msg = JSON.parse(ev.data as string) as {
                        type: string;
                        machine_id?: string;
                        status?: string;
                        status_adxl?: string;
                        status_pzem?: string;
                        magnitude_g?: number;
                        ax?: number;
                        ay?: number;
                        az?: number;
                        current_a?: number;
                        power_w?: number;
                        voltage_v?: number;
                        energy_kwh?: number;
                        frequency_hz?: number;
                        power_factor?: number;
                        running_sec?: number;
                        idle_sec?: number;
                        off_sec?: number;
                        running_pct?: number;
                        idle_pct?: number;
                        off_pct?: number;
                        ts?: string;
                    };
                    const id = msg.machine_id;
                    if (!id) return;

                    if (msg.type === 'machine_status') {
                        patchMachine(id, {
                            status: msg.status,
                            status_adxl: msg.status_adxl,
                            status_pzem: msg.status_pzem,
                        });
                        setLiveByMachine((prev) => {
                            const cur = prev[id] ?? {};
                            const next: MachineLive = { ...cur };
                            if (msg.magnitude_g != null) {
                                next.adxl = {
                                    ax: cur.adxl?.ax ?? 0,
                                    ay: cur.adxl?.ay ?? 0,
                                    az: cur.adxl?.az ?? 0,
                                    magnitude_g: msg.magnitude_g,
                                    ts: cur.adxl?.ts,
                                };
                            }
                            if (msg.current_a != null || msg.power_w != null) {
                                next.pzem = {
                                    voltage_v: cur.pzem?.voltage_v ?? 0,
                                    current_a: msg.current_a ?? cur.pzem?.current_a ?? 0,
                                    power_w: msg.power_w ?? cur.pzem?.power_w ?? 0,
                                    energy_kwh: cur.pzem?.energy_kwh ?? 0,
                                    frequency_hz: cur.pzem?.frequency_hz ?? 0,
                                    power_factor: cur.pzem?.power_factor ?? 0,
                                    ts: cur.pzem?.ts,
                                };
                            }
                            return { ...prev, [id]: next };
                        });
                    }
                    if (msg.type === 'device_health') {
                        const health = {
                            sensor: String(msg.sensor ?? ''),
                            state: String(msg.state ?? ''),
                            online: !!msg.online,
                            wifi_ok: !!msg.wifi_ok,
                            mqtt_ok: !!msg.mqtt_ok,
                            sensor_ok: !!msg.sensor_ok,
                            detail: String(msg.detail ?? ''),
                            rssi: msg.rssi as number | null | undefined,
                            fail_count: msg.fail_count as number | null | undefined,
                            ts: msg.ts as string | undefined,
                        };
                        const sens = health.sensor.toLowerCase();
                        if (sens === 'pzem') {
                            patchLive(id, { pzemHealth: health });
                        } else if (sens === 'adxl') {
                            patchLive(id, { adxlHealth: health });
                        }
                        // LWT mqtt_lost → jangan paksa offline DB di sini; stale checker yang handle
                    }
                    if (msg.type === 'telemetry_adxl') {
                        const adxl: AdxlLive = {
                            ax: msg.ax ?? 0,
                            ay: msg.ay ?? 0,
                            az: msg.az ?? 0,
                            magnitude_g: msg.magnitude_g ?? 0,
                            sensor_ok: msg.sensor_ok as boolean | undefined,
                            ts: msg.ts,
                        };
                        patchLive(id, { adxl });
                        // Hanya clear offline — jangan timpa running/idle yang valid
                        setMachines((prev) =>
                            prev.map((m) =>
                                m.id === id && m.status_adxl === 'offline'
                                    ? { ...m, status_adxl: 'idle', status: m.status === 'offline' ? 'idle' : m.status }
                                    : m
                            )
                        );
                        if (msg.running_sec != null && msg.idle_sec != null) {
                            setAdxlStatsByMachine((prev) => ({
                                ...prev,
                                [id]: {
                                    work_date: new Date().toISOString().slice(0, 10),
                                    running_sec: msg.running_sec!,
                                    idle_sec: msg.idle_sec!,
                                    off_sec: msg.off_sec ?? 0,
                                    running_pct: msg.running_pct ?? 0,
                                    idle_pct: msg.idle_pct ?? 0,
                                    off_pct: msg.off_pct ?? 0,
                                },
                            }));
                        }
                    }
                    if (msg.type === 'telemetry_pzem') {
                        setLiveByMachine((prev) => {
                            const cur = prev[id]?.pzem;
                            const pzem: PzemLive = {
                                voltage_v: msg.voltage_v ?? cur?.voltage_v ?? 0,
                                current_a: msg.current_a ?? 0,
                                power_w: msg.power_w ?? 0,
                                energy_kwh: msg.energy_kwh ?? cur?.energy_kwh ?? 0,
                                frequency_hz: msg.frequency_hz ?? cur?.frequency_hz ?? 0,
                                power_factor: msg.power_factor ?? cur?.power_factor ?? 0,
                                sensor_ok: msg.sensor_ok as boolean | undefined,
                                ts: msg.ts ?? cur?.ts,
                            };
                            return { ...prev, [id]: { ...prev[id], pzem } };
                        });
                        setMachines((prev) =>
                            prev.map((m) => {
                                if (m.id !== id) return m;
                                const a = msg.current_a ?? 0;
                                const thr = m.current_threshold_a;
                                const pw = msg.power_w ?? 0;
                                let status_pzem = m.status_pzem;
                                if (m.status_pzem === 'offline') {
                                    status_pzem = 'idle';
                                } else if (a < (m.off_current_a ?? 0.03)) {
                                    status_pzem = 'off';
                                } else if (
                                    a >= thr ||
                                    (m.power_threshold_w > 0 && pw >= m.power_threshold_w)
                                ) {
                                    status_pzem = 'running';
                                } else {
                                    status_pzem = 'idle';
                                }
                                return {
                                    ...m,
                                    status_pzem,
                                    status:
                                        m.status === 'offline' && status_pzem !== 'offline'
                                            ? status_pzem
                                            : m.status,
                                };
                            })
                        );
                        // KPI harian dari /pzem-stats (telemetry), bukan counter ESP di WS
                    }
                } catch {
                    /* ignore */
                }
            };
            ws.onclose = () => {
                retry = setTimeout(connect, 3000);
            };
        };
        connect();
        return () => {
            closed = true;
            if (retry) clearTimeout(retry);
            ws?.close();
        };
    }, [patchMachine, patchLive]);

    // Poll KPI telemetry agar Compare = Resume
    useEffect(() => {
        if (!selectedId) return;
        void fetchPzemStats(selectedId);
        const t = setInterval(() => void fetchPzemStats(selectedId), 15_000);
        return () => clearInterval(t);
    }, [selectedId, fetchPzemStats]);

    const saveCalibration = async (
        machineId: string,
        patch: {
            g_force_threshold: number;
            filter_aktif_ms: number;
            filter_diam_ms: number;
            power_threshold_w: number;
            current_threshold_a: number;
            off_current_a?: number;
        }
    ) => {
        const res = await fetch(`${apiBase}/api/machines/${machineId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error(`Simpan gagal (${res.status})`);
        const updated: MachineRow = await res.json();
        setMachines((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    };

    const setAdxlForceOff = async (machineId: string, enabled: boolean) => {
        const res = await fetch(`${apiBase}/api/machines/${machineId}/adxl-force-off`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled }),
        });
        if (!res.ok) throw new Error(`Gagal set mati (${res.status})`);
        const updated: MachineRow = await res.json();
        setMachines((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    };

    const selected = machines.find((m) => m.id === selectedId) ?? null;
    const selectedLive = selectedId ? liveByMachine[selectedId] : undefined;
    const selectedPzemStats = selectedId ? pzemStatsByMachine[selectedId] : undefined;
    const selectedAdxlStats = selectedId ? adxlStatsByMachine[selectedId] : undefined;

    return {
        apiBase,
        machines,
        liveByMachine,
        selected,
        selectedId,
        selectedLive,
        selectedPzemStats,
        selectedAdxlStats,
        loading,
        error,
        setSelectedId,
        loadMachines,
        saveCalibration,
        setAdxlForceOff,
        resetPzemStats,
        resetAdxlStats,
        patchMachine,
    };
}

export function fmtNum(v: number | undefined | null, digits = 2) {
    if (v == null || Number.isNaN(v)) return '—';
    return v.toFixed(digits);
}

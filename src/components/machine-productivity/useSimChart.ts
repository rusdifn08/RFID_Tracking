import { useEffect, useState } from 'react';

type ChartPt = {
    ts: string;
    label: string;
    value: number;
    current_a: number;
    power_w: number;
    voltage_v: number;
};

function pad2(n: number) {
    return String(n).padStart(2, '0');
}

function fmtAxis(iso: string) {
    try {
        const d = new Date(iso);
        return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
    } catch {
        return iso;
    }
}

/** Poll grafik simulasi dari DB (1 detik). */
export function useSimChart(
    enabled: boolean,
    apiBase: string,
    machineId: string | null,
    workDate: string,
) {
    const [points, setPoints] = useState<ChartPt[]>([]);

    useEffect(() => {
        if (!enabled || !machineId) {
            setPoints([]);
            return;
        }
        let cancelled = false;
        const load = async () => {
            try {
                const q = workDate ? `?date=${encodeURIComponent(workDate)}` : '';
                const res = await fetch(`${apiBase}/api/machines/${machineId}/sim-chart${q}`);
                if (!res.ok) return;
                const data = await res.json();
                if (cancelled) return;
                const list = Array.isArray(data.points) ? data.points : [];
                setPoints(
                    list.map((p: Record<string, unknown>) => {
                        const ts = String(p.ts ?? '');
                        const a = Number(p.current_a ?? p.value ?? 0);
                        return {
                            ts,
                            label: fmtAxis(ts),
                            value: a,
                            current_a: a,
                            power_w: Number(p.power_w ?? 0),
                            voltage_v: Number(p.voltage_v ?? 220),
                        };
                    }),
                );
            } catch {
                /* ignore */
            }
        };
        void load();
        const t = setInterval(() => void load(), 30_000);
        return () => {
            cancelled = true;
            clearInterval(t);
        };
    }, [enabled, apiBase, machineId, workDate]);

    return points;
}

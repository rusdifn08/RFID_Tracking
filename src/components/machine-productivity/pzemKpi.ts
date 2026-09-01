/** Band arus PZEM — selaras ESP, grafik, backend (tanpa power W). */
export function pzemBand(a: number, offA: number, runA: number): 'off' | 'idle' | 'run' {
    if (a < offA) return 'off';
    if (a >= runA) return 'run';
    return 'idle';
}

export type PzemPoint = { ts: string; current_a?: number; value?: number };

const MINUTE_MS = 60_000;

function floorMinute(ms: number) {
    return Math.floor(ms / MINUTE_MS) * MINUTE_MS;
}

/** Forward-fill per menit — identik SensorTrendChart.colorizeCurrent (untuk KPI). */
export function colorizePointsForKpi(
    rows: PzemPoint[],
    offA: number,
    runA: number,
    rangeEndMs: number,
): PzemPoint[] {
    if (!rows.length) return [];

    const sorted = [...rows].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
    const start = floorMinute(new Date(sorted[0].ts).getTime());
    const lastSample = floorMinute(new Date(sorted[sorted.length - 1].ts).getTime());
    const now = Date.now();
    const cap = Math.min(rangeEndMs, now);
    const end = floorMinute(cap < now - MINUTE_MS ? lastSample : cap);
    const endSafe = Math.max(start, end);

    const byMin = new Map<number, PzemPoint>();
    for (const p of sorted) {
        const m = floorMinute(new Date(p.ts).getTime());
        if (Number.isFinite(m)) byMin.set(m, p);
    }

    const minutes: PzemPoint[] = [];
    let last = sorted[0];
    for (let m = start; m <= endSafe; m += MINUTE_MS) {
        const sample = byMin.get(m);
        if (sample) last = sample;
        minutes.push({ ...last, ts: new Date(m).toISOString() });
    }

    const out: PzemPoint[] = [];
    for (let i = 0; i < minutes.length; i++) {
        const p = minutes[i];
        const t = new Date(p.ts).getTime();
        out.push(p);
        const nextT =
            i + 1 < minutes.length
                ? new Date(minutes[i + 1].ts).getTime()
                : Math.min(t + MINUTE_MS, Date.now());
        if (nextT > t) out.push({ ...p, ts: new Date(nextT).toISOString() });
    }
    return out;
}

/** KPI dari deret arus: Off tidak masuk Power On / Loss. */
export function kpiFromCurrentSeries(
    points: PzemPoint[],
    offCurrentA: number,
    runThresholdA: number,
) {
    const offA = offCurrentA > 0 ? offCurrentA : 0.01;
    const runA = runThresholdA > offA ? runThresholdA : offA + 0.001;
    let running = 0;
    let idle = 0;
    let off = 0;
    for (let i = 1; i < points.length; i++) {
        const t0 = new Date(points[i - 1].ts).getTime();
        const t1 = new Date(points[i].ts).getTime();
        if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) continue;
        const dt = Math.min(300, Math.round((t1 - t0) / 1000));
        const a = Number(points[i].current_a ?? points[i].value ?? 0);
        if (a < offA) off += dt;
        else if (a >= runA) running += dt;
        else idle += dt;
    }
    const powerOn = running + idle;
    const loss = idle;
    const prod = powerOn > 0 ? (running / powerOn) * 100 : 0;
    return { running, idle, off, powerOn, loss, prod };
}

/** KPI harian — pipeline identik modal detail grafik. */
export function computeDetailKpi(
    points: PzemPoint[],
    offCurrentA: number,
    runThresholdA: number,
    rangeEndMs: number,
) {
    const offA = offCurrentA > 0 ? offCurrentA : 0.03;
    const runA = runThresholdA > offA ? runThresholdA : offA + 0.001;
    const colored = colorizePointsForKpi(points, offA, runA, rangeEndMs);
    return kpiFromCurrentSeries(colored, offA, runA);
}

/** @deprecated use computeDetailKpi */
export function kpiFromDayTelemetry(
    points: PzemPoint[],
    offCurrentA: number,
    runThresholdA: number,
    dayEndMs: number,
) {
    return computeDetailKpi(points, offCurrentA, runThresholdA, dayEndMs);
}

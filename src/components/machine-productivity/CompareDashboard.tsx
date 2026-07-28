import { useMemo, useState } from 'react';
import type { MachineLive, MachineRow, PzemDailyStats } from './types';
import MachineStatusBadge, { derivePzemStatus } from './MachineStatusBadge';
import OperationKpiStrip from './OperationKpiStrip';
import SensorTrendChart, { TrendRangeBar, type TrendHours } from './SensorTrendChart';

type Props = {
    machine: MachineRow;
    live?: MachineLive;
    pzemStats?: PzemDailyStats;
    adxlStats?: PzemDailyStats;
    apiBase: string;
    onResetBoth?: () => Promise<{ archived?: boolean } | void>;
};

function formatDuration(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}j ${m}m`;
    if (m > 0) return `${m}m ${s}dtk`;
    return `${s}dtk`;
}

function formatPct(pct: number) {
    return `${pct.toFixed(1)}%`;
}

function kpisFromStats(stats: PzemDailyStats | undefined) {
    const running = stats?.running_sec ?? 0;
    const idle = stats?.idle_sec ?? 0;
    const powerOn = running + idle;
    const loss = idle;
    const prod = powerOn > 0 ? (running / powerOn) * 100 : 0;
    const off = stats?.off_sec ?? 0;
    return { running, idle, powerOn, loss, prod, off };
}

function deltaClass(n: number): string {
    if (n > 0) return 'text-emerald-700 bg-emerald-50';
    if (n < 0) return 'text-rose-700 bg-rose-50';
    return 'text-slate-600 bg-slate-50';
}

function signedDur(sec: number) {
    const sign = sec > 0 ? '+' : sec < 0 ? '−' : '';
    return `${sign}${formatDuration(Math.abs(sec))}`;
}

function signedPct(pct: number) {
    const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
    return `${sign}${formatPct(Math.abs(pct))}`;
}

export default function CompareDashboard({
    machine,
    live,
    pzemStats,
    adxlStats,
    apiBase,
    onResetBoth,
}: Props) {
    const [hours, setHours] = useState<TrendHours | 'custom'>('today');
    const [fromLocal, setFromLocal] = useState('');
    const [toLocal, setToLocal] = useState('');
    const [resetting, setResetting] = useState(false);

    const pKpi = useMemo(() => kpisFromStats(pzemStats), [pzemStats]);
    const aKpi = useMemo(() => kpisFromStats(adxlStats), [adxlStats]);

    const delta = useMemo(
        () => ({
            powerOn: aKpi.powerOn - pKpi.powerOn,
            running: aKpi.running - pKpi.running,
            loss: aKpi.loss - pKpi.loss,
            prod: aKpi.prod - pKpi.prod,
        }),
        [aKpi, pKpi],
    );

    const refreshMs = hours === 'today' ? 5_000 : 12_000;
    const rangeLabel =
        hours === 'today'
            ? 'Hari ini (00:00 → sekarang)'
            : hours === 'custom'
              ? 'Rentang kustom'
              : `${hours} jam terakhir`;

    const pzemLiveStatus =
        derivePzemStatus(
            live?.pzem?.current_a,
            machine.current_threshold_a,
            live?.pzem?.power_w ?? 0,
            machine.power_threshold_w,
        ) ?? machine.status_pzem;

    return (
        <div className="space-y-3">
            {/* Header + selisih ringkas */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100">
                    <div>
                        <h2 className="text-base font-bold text-slate-800">
                            {machine.code} · {machine.name}
                        </h2>
                        <p className="text-xs text-slate-500">
                            ADXL (kiri) vs PZEM (kanan) · live WebSocket · grafik {rangeLabel}
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live
                    </span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200">
                    {[
                        { label: 'Δ Power On', value: signedDur(delta.powerOn), n: delta.powerOn },
                        { label: 'Δ Running', value: signedDur(delta.running), n: delta.running },
                        { label: 'Δ Loss', value: signedDur(delta.loss), n: delta.loss },
                        { label: 'Δ Produktivitas', value: signedPct(delta.prod), n: delta.prod },
                    ].map((d) => (
                        <div key={d.label} className="bg-white px-3 py-2.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                {d.label}
                            </p>
                            <p
                                className={`mt-0.5 text-base font-bold tabular-nums inline-block px-1.5 py-0.5 rounded ${deltaClass(d.n)}`}
                            >
                                {d.value}
                            </p>
                            <p className="text-[10px] text-slate-400">ADXL − PZEM</p>
                        </div>
                    ))}
                </div>
            </section>

            <TrendRangeBar
                hours={hours}
                fromLocal={fromLocal}
                toLocal={toLocal}
                onChange={({ hours: h, fromLocal: f, toLocal: t }) => {
                    setHours(h);
                    setFromLocal(f);
                    setToLocal(t);
                }}
                onResetBoth={
                    onResetBoth
                        ? async () => {
                              setResetting(true);
                              try {
                                  const r = await onResetBoth();
                                  if (r && 'archived' in r && r.archived) {
                                      alert('Rekap tersimpan. PZEM + ADXL di-reset (dashboard & ESP).');
                                  }
                              } catch (e) {
                                  alert(e instanceof Error ? e.message : 'Reset gagal');
                              } finally {
                                  setResetting(false);
                              }
                          }
                        : undefined
                }
                resetting={resetting}
            />

            {/* Kiri ADXL · Kanan PZEM */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ADXL — kiri */}
                <section className="rounded-2xl border border-teal-200 bg-white shadow-sm overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-teal-100 bg-gradient-to-r from-teal-50 to-white flex items-center justify-between gap-2">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600">
                                ADXL345 · Getaran
                            </p>
                            <h3 className="text-sm font-bold text-teal-950">Data & Grafik ADXL</h3>
                        </div>
                        <MachineStatusBadge status={machine.status_adxl} />
                    </div>
                    <div className="p-3 space-y-3 flex-1">
                        <OperationKpiStrip
                            runningSec={aKpi.running}
                            idleSec={aKpi.idle}
                            offSec={aKpi.off}
                            tone="teal"
                        />
                        <SensorTrendChart
                            apiBase={apiBase}
                            machineId={machine.id}
                            sensor="adxl"
                            hours={hours}
                            fromLocal={fromLocal}
                            toLocal={toLocal}
                            hideFilters
                            compact
                            refreshMs={refreshMs}
                        />
                    </div>
                </section>

                {/* PZEM — kanan */}
                <section className="rounded-2xl border border-sky-200 bg-white shadow-sm overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 to-white flex items-center justify-between gap-2">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600">
                                PZEM-004T · Listrik
                            </p>
                            <h3 className="text-sm font-bold text-sky-950">Data & Grafik PZEM</h3>
                        </div>
                        <MachineStatusBadge status={pzemLiveStatus} />
                    </div>
                    <div className="p-3 space-y-3 flex-1">
                        <OperationKpiStrip
                            runningSec={pKpi.running}
                            idleSec={pKpi.idle}
                            offSec={pKpi.off}
                            tone="sky"
                        />
                        <SensorTrendChart
                            apiBase={apiBase}
                            machineId={machine.id}
                            sensor="pzem"
                            hours={hours}
                            fromLocal={fromLocal}
                            toLocal={toLocal}
                            hideFilters
                            compact
                            refreshMs={refreshMs}
                        />
                    </div>
                </section>
            </div>
        </div>
    );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MachineLive, MachineRow, PzemDailyStats } from './types';
import MachineStatusBadge, { derivePzemStatus, kpiFromCurrentSeries } from './MachineStatusBadge';
import OperationKpiStrip from './OperationKpiStrip';
import SensorTrendChart, { TrendRangeBar, type TrendHours } from './SensorTrendChart';
import EspSyncPanel from './EspSyncPanel';

type Props = {
    machine: MachineRow;
    live?: MachineLive;
    pzemStats?: PzemDailyStats;
    apiBase: string;
    machines?: MachineRow[];
    selectedId?: string | null;
    onSelectId?: (id: string) => void;
    onRefresh?: () => void;
    onResetPzem?: () => Promise<{ archived?: boolean } | void>;
    onMachineUpdated?: (m: MachineRow) => void;
    onSaveThresholds?: (patch: {
        current_threshold_a: number;
        off_current_a: number;
        power_threshold_w: number;
        g_force_threshold: number;
        filter_aktif_ms: number;
        filter_diam_ms: number;
    }) => Promise<void>;
};

function formatDuration(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}j ${m}m`;
    if (m > 0) return `${m}m ${s}dtk`;
    return `${s}dtk`;
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

export default function CompareDashboard({
    machine,
    live,
    pzemStats,
    apiBase,
    machines,
    selectedId,
    onSelectId,
    onRefresh,
    onResetPzem,
    onSaveThresholds,
    onMachineUpdated,
}: Props) {
    const [hours, setHours] = useState<TrendHours>('today');
    const [fromLocal, setFromLocal] = useState('');
    const [toLocal, setToLocal] = useState('');
    const [resetting, setResetting] = useState(false);
    const [runThr, setRunThr] = useState(machine.current_threshold_a ?? 0.6);
    const [offThr, setOffThr] = useState(machine.off_current_a ?? 0.03);
    const [savingThr, setSavingThr] = useState(false);
    const [thrMsg, setThrMsg] = useState<string | null>(null);
    const [seriesPoints, setSeriesPoints] = useState<
        Array<{ ts: string; current_a?: number; value?: number }>
    >([]);

    const espKpi = useMemo(() => kpisFromStats(pzemStats), [pzemStats]);

    // Hari ini: KPI dari API telemetry (sama Resume). Rentang lain: dari titik grafik.
    const pKpi = useMemo(() => {
        if (hours === 'today' && pzemStats) {
            return espKpi;
        }
        if (seriesPoints.length >= 2) {
            return kpiFromCurrentSeries(seriesPoints, offThr, runThr);
        }
        return espKpi;
    }, [hours, pzemStats, espKpi, seriesPoints, offThr, runThr]);

    const onPointsChange = useCallback(
        (pts: Array<{ ts: string; current_a?: number; value?: number }>) => {
            setSeriesPoints(pts);
        },
        [],
    );

    useEffect(() => {
        setRunThr(machine.current_threshold_a ?? 0.6);
        setOffThr(machine.off_current_a ?? 0.03);
        setThrMsg(null);
    }, [machine.id, machine.current_threshold_a, machine.off_current_a]);

    const refreshMs = hours === 'today' ? 5_000 : 12_000;
    const rangeLabel =
        hours === 'today'
            ? 'Hari ini'
            : hours === 'custom'
              ? 'Rentang kustom'
              : `${hours} jam terakhir`;

    const pzemLiveStatus =
        derivePzemStatus(
            live?.pzem?.current_a,
            runThr,
            live?.pzem?.power_w ?? 0,
            machine.power_threshold_w,
            offThr,
        ) ?? machine.status_pzem;

    const saveThresholds = async () => {
        if (!onSaveThresholds) return;
        if (!(offThr >= 0 && runThr > offThr)) {
            setThrMsg('Off harus ≥ 0 dan Running harus > Off.');
            return;
        }
        setSavingThr(true);
        setThrMsg(null);
        try {
            await onSaveThresholds({
                current_threshold_a: runThr,
                off_current_a: offThr,
                power_threshold_w: machine.power_threshold_w,
                g_force_threshold: machine.g_force_threshold,
                filter_aktif_ms: machine.filter_aktif_ms,
                filter_diam_ms: machine.filter_diam_ms,
            });
            setThrMsg('Threshold tersimpan & dikirim ke ESP.');
        } catch (e) {
            setThrMsg(e instanceof Error ? e.message : 'Gagal simpan');
        } finally {
            setSavingThr(false);
        }
    };

    return (
        <div className="space-y-3">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
                    <div>
                        <h2 className="text-base font-bold text-slate-800">
                            {machine.code} · {machine.name}
                        </h2>
                        <p className="text-xs text-slate-500">
                            Monitor PZEM · KPI dari arus grafik · {rangeLabel}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {machines && machines.length > 0 && onSelectId && (
                            <label className="flex items-center gap-2 text-xs text-slate-600">
                                <span className="font-semibold">Mesin</span>
                                <select
                                    value={selectedId ?? ''}
                                    onChange={(e) => onSelectId(e.target.value)}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                                >
                                    {machines.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.code} — {m.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}

                        {onRefresh && (
                            <button
                                type="button"
                                onClick={onRefresh}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 shadow-sm transition-all"
                            >
                                Refresh
                            </button>
                        )}

                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                        </span>
                    </div>
                </div>

                <div className="px-4 py-3 flex flex-wrap items-end gap-3 bg-slate-50/80 border-b border-slate-100">
                    <label className="text-xs text-slate-600 font-medium">
                        Running ≥ (A)
                        <input
                            type="number"
                            step={0.01}
                            min={0.01}
                            value={runThr}
                            onChange={(e) => setRunThr(Number(e.target.value))}
                            className="mt-1 block w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
                        />
                    </label>
                    <label className="text-xs text-slate-600 font-medium">
                        Mati {'<'} (A)
                        <input
                            type="number"
                            step={0.01}
                            min={0}
                            value={offThr}
                            onChange={(e) => setOffThr(Number(e.target.value))}
                            className="mt-1 block w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
                        />
                    </label>
                    <button
                        type="button"
                        disabled={savingThr || !onSaveThresholds}
                        onClick={() => void saveThresholds()}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                        {savingThr ? 'Menyimpan…' : 'Simpan threshold'}
                    </button>
                    <p className="text-[11px] text-slate-500 self-center">
                        Loss = Idle saja · waktu mati tidak dihitung
                        {thrMsg ? ` · ${thrMsg}` : ''}
                    </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-slate-200">
                    {[
                        { label: 'Power On', value: formatDuration(pKpi.powerOn), danger: false },
                        { label: 'Running', value: formatDuration(pKpi.running), danger: false },
                        { label: 'Loss (Idle)', value: formatDuration(pKpi.loss), danger: false },
                        { label: 'Produktivitas', value: `${pKpi.prod.toFixed(1)}%`, danger: false },
                        { label: 'Machine Off', value: formatDuration(pKpi.off), danger: true },
                    ].map((d) => (
                        <div key={d.label} className={`px-3 py-2.5 ${d.danger ? 'bg-red-50' : 'bg-white'}`}>
                            <p
                                className={`text-[10px] font-semibold uppercase tracking-wider ${
                                    d.danger ? 'text-red-600' : 'text-slate-500'
                                }`}
                            >
                                {d.label}
                            </p>
                            <p
                                className={`mt-0.5 text-base font-bold tabular-nums ${
                                    d.danger ? 'text-red-700' : 'text-slate-800'
                                }`}
                            >
                                {d.value}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            <EspSyncPanel
                machine={machine}
                apiBase={apiBase}
                onMachineUpdated={(m) => {
                    onMachineUpdated?.(m);
                    onRefresh?.();
                }}
            />

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
                    onResetPzem
                        ? async () => {
                              setResetting(true);
                              try {
                                  const r = await onResetPzem();
                                  if (r && 'archived' in r && r.archived) {
                                      alert('Rekap tersimpan. PZEM di-reset (dashboard & ESP).');
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
                resetLabel="Reset PZEM"
                resetConfirm="Reset waktu PZEM hari ini?\nRekap disimpan ke database. Counter dashboard & ESP di-nolkan via MQTT."
            />

            <section className="rounded-2xl border border-sky-200 bg-white shadow-sm overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 to-white flex items-center justify-between gap-2">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600">
                            No.{machine.code} · PZEM
                        </p>
                        <h3 className="text-sm font-bold text-sky-950">{machine.name}</h3>
                        <p className="text-[11px] text-sky-600/80">Data & Grafik PZEM</p>
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
                        currentThresholdA={runThr}
                        offCurrentA={offThr}
                        colorByStatus
                        onPointsChange={onPointsChange}
                    />
                </div>
            </section>
        </div>
    );
}

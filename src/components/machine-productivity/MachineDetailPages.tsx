import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Calendar,
    Clock,
    Download,
    MapPin,
    Pause,
    Play,
    PowerOff,
    TrendingUp,
    UserRound,
    Zap,
    Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { iotApiBase } from './iotApi';
import MachineStatusBadge from './MachineStatusBadge';
import StatusTransitionsPanel from './StatusTransitionsPanel';
import type { MachineRow, PzemDailyStats } from './types';

type PeriodRow = {
    id: string;
    work_date: string;
    period_start: string;
    period_end: string;
    operator_name: string | null;
    operator_nik: string | null;
    location_note: string | null;
    machine_name?: string;
    running_sec: number;
    idle_sec: number;
    off_sec: number;
};

type TransitionEvent = {
    id: number;
    phase_status: string;
    phase_start: string | null;
    phase_end: string;
    duration_sec: number;
    to_status: string;
};

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(n: number) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
}

function fmtDur(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}j ${m}m`;
    if (m > 0) return `${m}m ${s}d`;
    return `${s}d`;
}

function fmtLocal(iso: string) {
    try {
        return new Date(iso).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
}

function pct(part: number, total: number) {
    if (total <= 0) return 0;
    return (part / total) * 100;
}

/** Level 1: daftar mesin */
export function DetailMachinesPage() {
    const navigate = useNavigate();
    const apiBase = iotApiBase();
    const [machines, setMachines] = useState<MachineRow[]>([]);

    useEffect(() => {
        void fetch(`${apiBase}/api/machines`)
            .then((r) => (r.ok ? r.json() : []))
            .then((d) => setMachines(Array.isArray(d) ? d : []))
            .catch(() => setMachines([]));
    }, [apiBase]);

    return (
        <div className="w-full max-w-5xl mx-auto space-y-5 px-1">
            <HeaderBack title="Detail Data" subtitle="Pilih mesin untuk melihat rekap & insight operasi" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {machines.length === 0 ? (
                    <p className="text-sm text-slate-400 col-span-full text-center py-10">Belum ada mesin.</p>
                ) : (
                    machines.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => navigate(`/machine-productivity/detail/${m.id}`)}
                            className="text-left rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-lg hover:border-sky-300 hover:-translate-y-0.5 transition-all"
                        >
                            <p className="text-lg font-bold text-slate-800 leading-snug">{m.name}</p>
                            <p className="text-xs font-mono text-slate-400 mt-1">{m.code}</p>
                            <p className="text-sm text-slate-500 mt-3 flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-sky-400 shrink-0" aria-hidden />
                                {m.location_note || '—'}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-1.5">
                                <MachineStatusBadge status={m.status_pzem} />
                                <MachineStatusBadge status={m.status_adxl} />
                            </div>
                            <p className="text-xs font-semibold text-sky-600 mt-4">Pilih sensor →</p>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}

/** Level 2: pilih PZEM / ADXL */
export function DetailSensorPickPage() {
    const navigate = useNavigate();
    const { machineId } = useParams<{ machineId: string }>();
    const apiBase = iotApiBase();
    const [machine, setMachine] = useState<MachineRow | null>(null);

    useEffect(() => {
        if (!machineId) return;
        void fetch(`${apiBase}/api/machines/${machineId}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => setMachine(d))
            .catch(() => setMachine(null));
    }, [apiBase, machineId]);

    return (
        <div className="w-full max-w-4xl mx-auto space-y-5 px-1">
            <HeaderBack
                title={machine?.name ?? 'Mesin'}
                subtitle={`${machine?.code ?? ''} · ${machine?.location_note || '—'} · pilih sumber data`}
                backTo="/machine-productivity/detail"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <SensorCard
                    icon={<Zap className="h-6 w-6" aria-hidden />}
                    title="PZEM-004T"
                    subtitle="Listrik — rekap Running/Idle/Mati, log status, produktivitas"
                    accent="from-amber-500 to-orange-600"
                    onClick={() => navigate(`/machine-productivity/detail/${machineId}/pzem`)}
                />
                <SensorCard
                    icon={<Waves className="h-6 w-6" aria-hidden />}
                    title="ADXL345"
                    subtitle="Getaran — rekap Running/Idle/Mati, log status, produktivitas"
                    accent="from-teal-500 to-cyan-600"
                    onClick={() => navigate(`/machine-productivity/detail/${machineId}/adxl`)}
                />
            </div>
        </div>
    );
}

/** Level 3: halaman detail sensor (owner-friendly) */
export function DetailSensorDataPage({ sensor }: { sensor: 'pzem' | 'adxl' }) {
    const navigate = useNavigate();
    const { machineId } = useParams<{ machineId: string }>();
    const apiBase = iotApiBase();
    const isPzem = sensor === 'pzem';

    const [machine, setMachine] = useState<MachineRow | null>(null);
    const [shift, setShift] = useState<{ operator_nik: string; operator_name: string } | null>(null);
    const [liveToday, setLiveToday] = useState<PzemDailyStats | null>(null);
    const [from, setFrom] = useState(daysAgoIso(6));
    const [to, setTo] = useState(todayIso());
    const [periods, setPeriods] = useState<PeriodRow[]>([]);
    const [transitions, setTransitions] = useState<TransitionEvent[]>([]);
    const [refresh, setRefresh] = useState(0);
    const [loading, setLoading] = useState(false);

    const title = isPzem ? 'PZEM-004T' : 'ADXL345';
    const statusLive = isPzem ? machine?.status_pzem : machine?.status_adxl;

    const loadAll = useCallback(async () => {
        if (!machineId) return;
        setLoading(true);
        try {
            const [mRes, sRes, stRes, pRes, tRes] = await Promise.all([
                fetch(`${apiBase}/api/machines/${machineId}`),
                fetch(`${apiBase}/api/machines/${machineId}/shift`),
                fetch(`${apiBase}/api/machines/${machineId}/${sensor}-stats`),
                fetch(
                    `${apiBase}/api/machines/${machineId}/operation-periods?${new URLSearchParams({
                        sensor,
                        limit: '100',
                        ...(from ? { from } : {}),
                        ...(to ? { to } : {}),
                    })}`
                ),
                fetch(
                    `${apiBase}/api/machines/${machineId}/status-transitions?${new URLSearchParams({
                        sensor,
                        limit: '200',
                        ...(from ? { from_ts: new Date(`${from}T00:00:00`).toISOString() } : {}),
                        ...(to ? { to_ts: new Date(`${to}T23:59:59`).toISOString() } : {}),
                    })}`
                ),
            ]);
            if (mRes.ok) setMachine(await mRes.json());
            if (sRes.ok) {
                const s = await sRes.json();
                setShift(s?.operator_nik ? { operator_nik: s.operator_nik, operator_name: s.operator_name } : null);
            }
            if (stRes.ok) setLiveToday(await stRes.json());
            if (pRes.ok) {
                const d = await pRes.json();
                setPeriods(d.periods ?? []);
            }
            if (tRes.ok) {
                const d = await tRes.json();
                setTransitions((d.events ?? []).filter((e: TransitionEvent) => e.duration_sec >= 6));
            }
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
        }
    }, [apiBase, machineId, sensor, from, to]);

    useEffect(() => {
        void loadAll();
    }, [loadAll, refresh]);

    const totals = useMemo(() => {
        const fromPeriods = periods.reduce(
            (a, p) => ({
                run: a.run + p.running_sec,
                idle: a.idle + p.idle_sec,
                off: a.off + p.off_sec,
            }),
            { run: 0, idle: 0, off: 0 }
        );
        // jika belum ada rekap reset, pakai live hari ini
        if (fromPeriods.run + fromPeriods.idle + fromPeriods.off === 0 && liveToday) {
            return {
                run: liveToday.running_sec,
                idle: liveToday.idle_sec,
                off: liveToday.off_sec,
                source: 'live' as const,
            };
        }
        return { ...fromPeriods, source: 'archive' as const };
    }, [periods, liveToday]);

    const totalSec = totals.run + totals.idle + totals.off;
    const prodPct = pct(totals.run, totals.run + totals.idle);

    const longestRun = useMemo(() => {
        const runs = transitions.filter((e) => e.phase_status === 'running');
        if (runs.length === 0) return null;
        return runs.reduce((best, e) => (e.duration_sec > best.duration_sec ? e : best), runs[0]);
    }, [transitions]);

    const runCount = transitions.filter((e) => e.phase_status === 'running').length;
    const avgRun =
        runCount > 0
            ? Math.round(
                  transitions.filter((e) => e.phase_status === 'running').reduce((s, e) => s + e.duration_sec, 0) /
                      runCount
              )
            : 0;

    const applyPreset = (preset: 'today' | '7d' | '30d' | 'all') => {
        if (preset === 'today') {
            setFrom(todayIso());
            setTo(todayIso());
        } else if (preset === '7d') {
            setFrom(daysAgoIso(6));
            setTo(todayIso());
        } else if (preset === '30d') {
            setFrom(daysAgoIso(29));
            setTo(todayIso());
        } else {
            setFrom('');
            setTo('');
        }
        setRefresh((k) => k + 1);
    };

    const exportCsv = () => {
        const header = 'work_date,period_start,period_end,operator,line,running_sec,idle_sec,off_sec\n';
        const body = periods
            .map(
                (p) =>
                    `${p.work_date},${p.period_start},${p.period_end},"${p.operator_name ?? ''} (${p.operator_nik ?? ''})","${p.location_note ?? ''}",${p.running_sec},${p.idle_sec},${p.off_sec}`
            )
            .join('\n');
        const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sensor}_${machine?.code ?? 'machine'}_rekap.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const tone = {
        border: isPzem ? 'border-amber-200' : 'border-teal-200',
        bg: isPzem ? 'from-amber-50 via-orange-50 to-white' : 'from-teal-50 via-cyan-50 to-white',
        chip: isPzem ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800',
        btn: isPzem ? 'bg-amber-600 hover:bg-amber-700' : 'bg-teal-600 hover:bg-teal-700',
        barRun: isPzem ? 'bg-emerald-500' : 'bg-emerald-500',
        barIdle: isPzem ? 'bg-amber-400' : 'bg-teal-400',
        barOff: 'bg-slate-300',
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-4 md:space-y-5 px-1 pb-6">
            {/* Hero */}
            <header
                className={`relative overflow-hidden rounded-2xl border ${tone.border} bg-gradient-to-br ${tone.bg} p-4 md:p-6`}
            >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="min-w-0">
                        <button
                            type="button"
                            onClick={() => navigate(`/machine-productivity/detail/${machineId}`)}
                            className="text-sm text-sky-700 hover:text-sky-900 font-medium"
                        >
                            ← Pilih sensor
                        </button>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${tone.chip}`}>
                                {title}
                            </span>
                            {statusLive && <MachineStatusBadge status={statusLive} />}
                        </div>
                        <h1
                            className="text-xl md:text-2xl font-bold text-slate-900 mt-2 truncate"
                            style={{ fontFamily: 'Poppins, sans-serif' }}
                        >
                            {machine?.name ?? '…'}
                        </h1>
                        <p className="text-xs md:text-sm text-slate-500 mt-1 font-mono">{machine?.code}</p>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs md:text-sm text-slate-600">
                            <span className="inline-flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                                {machine?.location_note || '—'}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <UserRound className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                                {shift
                                    ? `${shift.operator_name} (${shift.operator_nik})`
                                    : 'Belum ada operator hari ini'}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => navigate(`/machine-productivity/${sensor}`)}
                            className={`px-3 py-2 text-sm font-semibold rounded-lg text-white ${tone.btn}`}
                        >
                            Buka live dashboard
                        </button>
                        <button
                            type="button"
                            onClick={exportCsv}
                            disabled={periods.length === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40"
                        >
                            <Download className="h-4 w-4" aria-hidden />
                            Export CSV
                        </button>
                    </div>
                </div>
            </header>

            {/* Filter */}
            <section className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-slate-400" aria-hidden />
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Periode laporan</p>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                    {(
                        [
                            ['today', 'Hari ini'],
                            ['7d', '7 hari'],
                            ['30d', '30 hari'],
                            ['all', 'Semua'],
                        ] as const
                    ).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => applyPreset(key)}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end">
                    <label className="text-[11px] text-slate-500 flex-1 min-w-[140px]">
                        Dari
                        <input
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="text-[11px] text-slate-500 flex-1 min-w-[140px]">
                        Sampai
                        <input
                            type="date"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={() => setRefresh((k) => k + 1)}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg text-white ${tone.btn}`}
                    >
                        {loading ? 'Memuat…' : 'Terapkan'}
                    </button>
                </div>
            </section>

            {/* KPI */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Kpi
                    icon={Play}
                    label="Total Running"
                    value={fmtDur(totals.run)}
                    sub={`${pct(totals.run, totalSec).toFixed(0)}% dari waktu`}
                    color="text-emerald-700"
                    bg="bg-emerald-50"
                />
                <Kpi
                    icon={Pause}
                    label="Total Idle"
                    value={fmtDur(totals.idle)}
                    sub={`${pct(totals.idle, totalSec).toFixed(0)}% dari waktu`}
                    color="text-amber-700"
                    bg="bg-amber-50"
                />
                <Kpi
                    icon={PowerOff}
                    label="Total Mati"
                    value={fmtDur(totals.off)}
                    sub={`${pct(totals.off, totalSec).toFixed(0)}% dari waktu`}
                    color="text-slate-600"
                    bg="bg-slate-100"
                />
                <Kpi
                    icon={TrendingUp}
                    label="Produktivitas"
                    value={`${prodPct.toFixed(1)}%`}
                    sub="Running ÷ (Running+Idle)"
                    color="text-sky-700"
                    bg="bg-sky-50"
                />
            </section>

            {/* Composition + insights */}
            <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-800 mb-1">Komposisi waktu</h2>
                    <p className="text-[11px] text-slate-400 mb-4">
                        Sumber: {totals.source === 'live' ? 'live hari ini (belum ada arsip reset)' : 'rekap periode tersimpan'}
                    </p>
                    <div className="h-4 rounded-full overflow-hidden flex bg-slate-100 mb-3">
                        <div className={tone.barRun} style={{ width: `${pct(totals.run, totalSec)}%` }} />
                        <div className={tone.barIdle} style={{ width: `${pct(totals.idle, totalSec)}%` }} />
                        <div className={tone.barOff} style={{ width: `${pct(totals.off, totalSec)}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                        <LegendDot className="bg-emerald-500" label="Running" />
                        <LegendDot className={isPzem ? 'bg-amber-400' : 'bg-teal-400'} label="Idle" />
                        <LegendDot className="bg-slate-300" label="Mati" />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <MiniStat label="Arsip reset" value={String(periods.length)} />
                        <MiniStat label="Sesi running" value={String(runCount)} />
                        <MiniStat label="Rata-rata run" value={avgRun ? fmtDur(avgRun) : '—'} />
                    </div>
                </div>

                <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
                    <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" aria-hidden />
                        Highlight owner
                    </h2>
                    <ul className="space-y-3 text-sm text-slate-700">
                        <li className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                            <p className="text-[10px] uppercase font-semibold text-slate-400">Running terpanjang</p>
                            {longestRun ? (
                                <>
                                    <p className="font-bold text-emerald-700 text-lg tabular-nums mt-0.5">
                                        {fmtDur(longestRun.duration_sec)}
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-1">
                                        {fmtLocal(longestRun.phase_start || longestRun.phase_end)} →{' '}
                                        {fmtLocal(longestRun.phase_end)}
                                    </p>
                                </>
                            ) : (
                                <p className="text-slate-400 text-xs mt-1">Belum ada sesi ≥ 6 detik</p>
                            )}
                        </li>
                        <li className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                            <p className="text-[10px] uppercase font-semibold text-slate-400">Status live</p>
                            <p className="mt-1">
                                {statusLive ? <MachineStatusBadge status={statusLive} /> : '—'}
                            </p>
                        </li>
                        <li className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-xs text-slate-500 leading-relaxed">
                            Produktivitas tinggi = mesin lebih banyak Running dibanding Idle. Target owner biasanya
                            &gt; 70% pada shift aktif.
                        </li>
                    </ul>
                </div>
            </section>

            {/* Periods table — responsive */}
            <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/80">
                    <h2 className="text-sm font-bold text-slate-800">Rekap periode (hasil reset)</h2>
                    <span className="text-[11px] text-slate-400">{periods.length} baris</span>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-slate-100">
                    {periods.length === 0 ? (
                        <p className="p-6 text-center text-sm text-slate-400">
                            Belum ada arsip. Reset di live dashboard untuk menyimpan rekap.
                        </p>
                    ) : (
                        periods.map((p) => (
                            <div key={p.id} className="p-4 space-y-2">
                                <div className="flex justify-between gap-2">
                                    <p className="font-semibold text-slate-800 text-sm">{p.work_date}</p>
                                    <p className="text-[11px] text-slate-400 text-right">
                                        {fmtLocal(p.period_start)}
                                        <br />→ {fmtLocal(p.period_end)}
                                    </p>
                                </div>
                                <p className="text-xs text-slate-500">
                                    {p.operator_name ? `${p.operator_name} · ${p.operator_nik}` : 'Tanpa operator'} ·{' '}
                                    {p.location_note || '—'}
                                </p>
                                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                                    <div className="rounded-lg bg-emerald-50 py-2">
                                        <p className="text-emerald-600 font-bold tabular-nums">{fmtDur(p.running_sec)}</p>
                                        <p className="text-emerald-700/70">Run</p>
                                    </div>
                                    <div className="rounded-lg bg-amber-50 py-2">
                                        <p className="text-amber-700 font-bold tabular-nums">{fmtDur(p.idle_sec)}</p>
                                        <p className="text-amber-700/70">Idle</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-100 py-2">
                                        <p className="text-slate-700 font-bold tabular-nums">{fmtDur(p.off_sec)}</p>
                                        <p className="text-slate-500">Mati</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b bg-white">
                                <th className="px-4 py-2.5">Tanggal</th>
                                <th className="px-4 py-2.5">Mulai → Selesai</th>
                                <th className="px-4 py-2.5">Operator</th>
                                <th className="px-4 py-2.5">Line</th>
                                <th className="px-4 py-2.5">Running</th>
                                <th className="px-4 py-2.5">Idle</th>
                                <th className="px-4 py-2.5">Mati</th>
                                <th className="px-4 py-2.5">Prod.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {periods.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400 text-sm">
                                        Belum ada arsip. Reset di live dashboard untuk menyimpan rekap.
                                    </td>
                                </tr>
                            ) : (
                                periods.map((p) => {
                                    const pr = pct(p.running_sec, p.running_sec + p.idle_sec);
                                    return (
                                        <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/70">
                                            <td className="px-4 py-2.5 font-medium text-slate-800">{p.work_date}</td>
                                            <td className="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                                                {fmtLocal(p.period_start)}
                                                <br />
                                                <span className="text-slate-400">→ {fmtLocal(p.period_end)}</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-xs">
                                                {p.operator_name ? (
                                                    <>
                                                        <span className="font-medium text-slate-800">{p.operator_name}</span>
                                                        <div className="text-slate-400">{p.operator_nik}</div>
                                                    </>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-slate-600">{p.location_note || '—'}</td>
                                            <td className="px-4 py-2.5 text-emerald-700 font-semibold tabular-nums">
                                                {fmtDur(p.running_sec)}
                                            </td>
                                            <td className="px-4 py-2.5 text-amber-700 font-semibold tabular-nums">
                                                {fmtDur(p.idle_sec)}
                                            </td>
                                            <td className="px-4 py-2.5 text-slate-600 font-semibold tabular-nums">
                                                {fmtDur(p.off_sec)}
                                            </td>
                                            <td className="px-4 py-2.5 tabular-nums font-semibold text-sky-700">
                                                {pr.toFixed(0)}%
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {machineId && (
                <StatusTransitionsPanel
                    machineId={machineId}
                    sensor={sensor}
                    apiBase={apiBase}
                    refreshKey={refresh}
                    dateFrom={from}
                    dateTo={to}
                />
            )}
        </div>
    );
}

function HeaderBack({
    title,
    subtitle,
    backTo = '/machine-productivity',
}: {
    title: string;
    subtitle: string;
    backTo?: string;
}) {
    const navigate = useNavigate();
    return (
        <div className="flex items-start gap-3">
            <button
                type="button"
                onClick={() => navigate(backTo)}
                className="text-sm text-sky-600 hover:text-sky-800 font-medium mt-1 shrink-0"
            >
                ← Kembali
            </button>
            <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-slate-800 truncate">{title}</h1>
                <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
        </div>
    );
}

function SensorCard({
    title,
    subtitle,
    accent,
    onClick,
    icon,
}: {
    title: string;
    subtitle: string;
    accent: string;
    onClick: () => void;
    icon: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="text-left rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
            <div className={`h-1.5 bg-gradient-to-r ${accent}`} />
            <div className="p-5 md:p-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accent} text-white flex items-center justify-center mb-4 shadow`}>
                    {icon}
                </div>
                <h2 className="text-lg font-bold text-slate-800">{title}</h2>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">{subtitle}</p>
                <p className="text-xs font-semibold text-sky-600 mt-4">Buka data →</p>
            </div>
        </button>
    );
}

function Kpi({
    icon: Icon,
    label,
    value,
    sub,
    color,
    bg,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    sub: string;
    color: string;
    bg: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4 shadow-sm">
            <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${bg} ${color}`}>
                <Icon className="h-4 w-4" aria-hidden />
            </div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mt-2">{label}</p>
            <p className={`text-lg md:text-xl font-bold tabular-nums mt-0.5 ${color}`}>{value}</p>
            <p className="text-[10px] text-slate-400 mt-1 leading-snug">{sub}</p>
        </div>
    );
}

function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-2">
            <p className="text-[10px] text-slate-400 uppercase">{label}</p>
            <p className="text-sm font-bold text-slate-800 tabular-nums mt-0.5">{value}</p>
        </div>
    );
}

function LegendDot({ className, label }: { className: string; label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
            {label}
        </span>
    );
}

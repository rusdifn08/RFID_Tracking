import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { iotApiBase } from './iotApi';

type SensorTimes = {
    running_sec: number;
    idle_sec: number;
    off_sec: number;
    running_pct: number;
    idle_pct: number;
    off_pct: number;
};

type ResumeRow = {
    id: string;
    code: string;
    name: string;
    location_note: string | null;
    status_pzem: string;
    status_adxl: string;
    adxl_force_off: boolean;
    work_date: string;
    pzem: SensorTimes;
    adxl: SensorTimes;
    operator_nik: string | null;
    operator_name: string | null;
    operator_note: string | null;
};

type ProdCat = 'GOOD' | 'NORMAL' | 'BAD';

type Enriched = ResumeRow & {
    powerOn: number;
    running: number;
    loss: number;
    off: number;
    prod: number;
    cat: ProdCat;
};

function emptyTimes(): SensorTimes {
    return {
        running_sec: 0,
        idle_sec: 0,
        off_sec: 0,
        running_pct: 0,
        idle_pct: 0,
        off_pct: 0,
    };
}

function asTimes(v: Partial<SensorTimes> | undefined | null): SensorTimes {
    return {
        running_sec: v?.running_sec ?? 0,
        idle_sec: v?.idle_sec ?? 0,
        off_sec: v?.off_sec ?? 0,
        running_pct: v?.running_pct ?? 0,
        idle_pct: v?.idle_pct ?? 0,
        off_pct: v?.off_pct ?? 0,
    };
}

function normalizeResumeRow(raw: Record<string, unknown>): ResumeRow {
    const nestedPzem = raw.pzem as Partial<SensorTimes> | undefined;
    const nestedAdxl = raw.adxl as Partial<SensorTimes> | undefined;
    const flatFallback: Partial<SensorTimes> = {
        running_sec: Number(raw.running_sec ?? 0),
        idle_sec: Number(raw.idle_sec ?? 0),
        off_sec: Number(raw.off_sec ?? 0),
        running_pct: Number(raw.running_pct ?? 0),
        idle_pct: Number(raw.idle_pct ?? 0),
        off_pct: Number(raw.off_pct ?? 0),
    };
    return {
        id: String(raw.id ?? ''),
        code: String(raw.code ?? ''),
        name: String(raw.name ?? ''),
        location_note: (raw.location_note as string | null) ?? null,
        status_pzem: String(raw.status_pzem ?? 'idle'),
        status_adxl: String(raw.status_adxl ?? 'idle'),
        adxl_force_off: Boolean(raw.adxl_force_off),
        work_date: String(raw.work_date ?? ''),
        pzem: asTimes(nestedPzem ?? flatFallback),
        adxl: asTimes(nestedAdxl ?? emptyTimes()),
        operator_nik: (raw.operator_nik as string | null) ?? null,
        operator_name: (raw.operator_name as string | null) ?? null,
        operator_note: (raw.operator_note as string | null) ?? (raw.notes as string | null) ?? null,
    };
}

function formatDuration(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
}

/** Tanggal lokal (WIB di browser ID) YYYY-MM-DD */
function todayIso() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function daysAgoIso(n: number) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function rexyOf(t: SensorTimes) {
    const powerOn = t.running_sec + t.idle_sec;
    const running = t.running_sec;
    const loss = Math.max(0, powerOn - running);
    const prod = powerOn > 0 ? (running / powerOn) * 100 : 0;
    return { powerOn, running, loss, prod };
}

function prodCat(pct: number): ProdCat {
    if (pct >= 90) return 'GOOD';
    if (pct >= 80) return 'NORMAL';
    return 'BAD';
}

function catBadge(cat: ProdCat) {
    if (cat === 'GOOD') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (cat === 'NORMAL') return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-rose-100 text-rose-800 border-rose-300';
}

function enrichRows(rows: ResumeRow[], sensor: 'pzem' | 'adxl'): Enriched[] {
    return rows.map((m) => {
        const t = sensor === 'pzem' ? m.pzem : m.adxl;
        const r = rexyOf(t);
        return { ...m, ...r, off: t.off_sec, cat: prodCat(r.prod) };
    });
}

function filterRows(list: Enriched[], q: string) {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
        (m) =>
            m.name.toLowerCase().includes(s) ||
            m.code.toLowerCase().includes(s) ||
            m.work_date.includes(s) ||
            (m.location_note ?? '').toLowerCase().includes(s) ||
            (m.operator_name ?? '').toLowerCase().includes(s) ||
            (m.operator_nik ?? '').toLowerCase().includes(s) ||
            (m.operator_note ?? '').toLowerCase().includes(s) ||
            m.cat.toLowerCase().includes(s)
    );
}

function summarize(list: Enriched[]) {
    const n = list.length;
    const good = list.filter((m) => m.cat === 'GOOD').length;
    const normal = list.filter((m) => m.cat === 'NORMAL').length;
    const bad = list.filter((m) => m.cat === 'BAD').length;
    const avg = n === 0 ? 0 : list.reduce((a, m) => a + m.prod, 0) / n;
    const best = list.reduce<Enriched | null>((b, m) => (!b || m.prod > b.prod ? m : b), null);
    const worst = list.reduce<Enriched | null>((b, m) => (!b || m.prod < b.prod ? m : b), null);
    return { n, good, normal, bad, avg, best, worst };
}

function toSheetRows(list: Enriched[], sensor: string) {
    return list.map((m, i) => ({
        NO: i + 1,
        DATE: m.work_date,
        SENSOR: sensor,
        'MACHINE NAME': m.name,
        CODE: m.code,
        LOCATION: m.location_note || '',
        OPERATOR: m.operator_name ? `${m.operator_nik ?? ''} - ${m.operator_name}` : 'Not logged in',
        'OPERATOR NOTE': m.operator_note || '-',
        'POWER ON DURATION': formatDuration(m.powerOn),
        'RUNNING TIME': formatDuration(m.running),
        'LOSS TIME': formatDuration(m.loss),
        'MACHINE OFF': formatDuration(m.off),
        PRODUKTIVITAS: `${m.prod.toFixed(2)}%`,
        STATUS: m.cat,
    }));
}

export default function MachineResumePage() {
    const navigate = useNavigate();
    const apiBase = iotApiBase();
    const [rows, setRows] = useState<ResumeRow[]>([]);
    const [workDate, setWorkDate] = useState(todayIso());
    const [startDate, setStartDate] = useState(daysAgoIso(13));
    const [endDate, setEndDate] = useState(todayIso());
    const [q, setQ] = useState('');

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const from = startDate || daysAgoIso(13);
                const to = endDate || todayIso();
                const res = await fetch(
                    `${apiBase}/api/machines/resume?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
                );
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled) {
                    const list = Array.isArray(data.machines) ? data.machines : [];
                    setRows(list.map((m: Record<string, unknown>) => normalizeResumeRow(m)));
                    setWorkDate(data.work_date ?? to);
                }
            } catch {
                /* ignore */
            }
        };
        void load();
        const t = setInterval(() => void load(), 12_000);
        return () => {
            cancelled = true;
            clearInterval(t);
        };
    }, [apiBase, startDate, endDate]);

    const pzemList = useMemo(() => filterRows(enrichRows(rows, 'pzem'), q), [rows, q]);
    const adxlList = useMemo(() => filterRows(enrichRows(rows, 'adxl'), q), [rows, q]);
    const sumPzem = useMemo(() => summarize(pzemList), [pzemList]);
    const sumAdxl = useMemo(() => summarize(adxlList), [adxlList]);
    const dayCount = useMemo(
        () => new Set(rows.map((r) => r.work_date).filter(Boolean)).size,
        [rows]
    );

    const exportExcel = () => {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toSheetRows(pzemList, 'PZEM')), 'PZEM');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toSheetRows(adxlList, 'ADXL')), 'ADXL');
        XLSX.writeFile(wb, `machine_productivity_${startDate}_${endDate}.xlsx`);
    };

    return (
        <div className="w-full max-w-[1400px] mx-auto space-y-4 pb-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <button
                        type="button"
                        onClick={() => navigate('/machine-productivity')}
                        className="text-sm text-sky-600 hover:text-sky-800 font-medium mt-1 shrink-0"
                    >
                        ← Dashboard
                    </button>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600">
                            Monitoring Machine
                        </p>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">
                            Monitoring Productivity Machine
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            History harian · {startDate} → {endDate} · {dayCount} hari · hari kerja WIB
                            {workDate ? ` · hari ini ${workDate}` : ''}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate('/machine-productivity/pzem')}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700"
                    >
                        LIVE DASHBOARD
                    </button>
                    <button
                        type="button"
                        onClick={exportExcel}
                        disabled={rows.length === 0}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
                    >
                        Export Excel
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
                        Kategori Produktivitas
                    </p>
                    <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full bg-emerald-500" />
                            <span className="font-semibold text-emerald-700">GOOD</span>
                            <span className="text-slate-500">≥ 90%</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full bg-amber-400" />
                            <span className="font-semibold text-amber-700">NORMAL</span>
                            <span className="text-slate-500">80% – &lt; 90%</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full bg-rose-500" />
                            <span className="font-semibold text-rose-700">BAD</span>
                            <span className="text-slate-500">&lt; 80%</span>
                        </li>
                    </ul>
                </div>

                <SummaryCard title="Kesimpulan PZEM" sum={sumPzem} tone="sky" />
                <SummaryCard title="Kesimpulan ADXL" sum={sumAdxl} tone="teal" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <StatCard label="Baris data" value={String(rows.length)} sub="Mesin × hari" />
                <StatCard label="Jumlah hari" value={String(dayCount)} sub="Dalam rentang filter" />
                <StatCard label="Avg PZEM" value={`${sumPzem.avg.toFixed(2)}%`} sub="Rata-rata listrik" />
                <StatCard label="Avg ADXL" value={`${sumAdxl.avg.toFixed(2)}%`} sub="Rata-rata getaran" />
                <StatCard label="PZEM Good" value={String(sumPzem.good)} sub="≥ 90%" tone="good" />
                <StatCard
                    label="Bad (PZEM/ADXL)"
                    value={`${sumPzem.bad}/${sumAdxl.bad}`}
                    sub="&lt; 80%"
                    tone="bad"
                />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex flex-wrap gap-3 items-end shadow-sm">
                <label className="text-[10px] uppercase font-semibold text-slate-500">
                    Start Date
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 block rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
                    />
                </label>
                <label className="text-[10px] uppercase font-semibold text-slate-500">
                    End Date
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1 block rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
                    />
                </label>
                <button
                    type="button"
                    onClick={() => {
                        setStartDate(daysAgoIso(13));
                        setEndDate(todayIso());
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                    14 hari
                </button>
                <button
                    type="button"
                    onClick={() => {
                        const t = todayIso();
                        setStartDate(t);
                        setEndDate(t);
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                    Hari ini
                </button>
                <label className="text-[10px] uppercase font-semibold text-slate-500 flex-1 min-w-[200px]">
                    Search
                    <input
                        type="search"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Cari mesin, tanggal, operator, status..."
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
                    />
                </label>
            </div>

            <SensorTable
                title="Machine Productivity History — PZEM"
                subtitle="Satu baris = satu mesin per hari · Power On = Running + Idle · Machine Off = arus &lt; 0.03 A"
                accent="sky"
                rows={pzemList}
                total={rows.length}
                showMachineOff
            />

            <SensorTable
                title="Machine Productivity History — ADXL"
                subtitle="Satu baris = satu mesin per hari · Power On = Running + Idle · Machine Off = diam"
                accent="teal"
                rows={adxlList}
                total={rows.length}
                showMachineOff
            />
        </div>
    );
}

function SummaryCard({
    title,
    sum,
    tone,
}: {
    title: string;
    sum: ReturnType<typeof summarize>;
    tone: 'sky' | 'teal';
}) {
    const box =
        tone === 'sky'
            ? 'border-sky-200 from-sky-50 to-white text-sky-700'
            : 'border-teal-200 from-teal-50 to-white text-teal-700';
    return (
        <div className={`rounded-xl border bg-gradient-to-br p-4 shadow-sm ${box}`}>
            <p className="text-xs font-bold uppercase tracking-wide mb-2">{title}</p>
            <p className="text-sm text-slate-800 leading-relaxed">
                <span className="font-bold text-emerald-700">{sum.good} GOOD</span>,{' '}
                <span className="font-bold text-amber-700">{sum.normal} NORMAL</span>,{' '}
                <span className="font-bold text-rose-700">{sum.bad} BAD</span> · rata-rata{' '}
                <span className="font-bold">{sum.avg.toFixed(2)}%</span>
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white/80 border border-slate-100 px-2.5 py-2">
                    <p className="text-[10px] uppercase text-emerald-600 font-semibold">Terbaik</p>
                    <p className="font-bold text-slate-800 truncate">{sum.best?.name ?? '—'}</p>
                    <p className="tabular-nums text-emerald-700 font-semibold">
                        {sum.best ? `${sum.best.prod.toFixed(2)}%` : '—'}
                    </p>
                </div>
                <div className="rounded-lg bg-white/80 border border-slate-100 px-2.5 py-2">
                    <p className="text-[10px] uppercase text-rose-600 font-semibold">Terendah</p>
                    <p className="font-bold text-slate-800 truncate">{sum.worst?.name ?? '—'}</p>
                    <p className="tabular-nums text-rose-700 font-semibold">
                        {sum.worst ? `${sum.worst.prod.toFixed(2)}%` : '—'}
                    </p>
                </div>
            </div>
        </div>
    );
}

function SensorTable({
    title,
    subtitle,
    accent,
    rows,
    total,
    showMachineOff = false,
}: {
    title: string;
    subtitle: string;
    accent: 'sky' | 'teal';
    rows: Enriched[];
    total: number;
    showMachineOff?: boolean;
}) {
    const head = accent === 'sky' ? 'bg-sky-800' : 'bg-teal-800';
    const badge =
        accent === 'sky'
            ? 'bg-sky-100 text-sky-700 border-sky-200'
            : 'bg-teal-100 text-teal-700 border-teal-200';
    const cols = showMachineOff ? 12 : 11;

    return (
        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="text-base font-bold text-slate-800">{title}</h2>
                    <p className="text-[11px] text-slate-500">{subtitle}</p>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badge}`}>
                    {rows.length} baris
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1180px]">
                    <thead>
                        <tr className={`${head} text-white text-left text-[10px] uppercase tracking-wide`}>
                            <th className="px-3 py-2.5">No</th>
                            <th className="px-3 py-2.5">Tanggal</th>
                            <th className="px-3 py-2.5">Machine Name</th>
                            <th className="px-3 py-2.5">Location</th>
                            <th className="px-3 py-2.5">Operator</th>
                            <th className="px-3 py-2.5">Operator Note</th>
                            <th className="px-3 py-2.5">Power On Duration</th>
                            <th className="px-3 py-2.5">Running Time</th>
                            <th className="px-3 py-2.5">Loss Time</th>
                            {showMachineOff && (
                                <th className="px-3 py-2.5">Machine Off</th>
                            )}
                            <th className="px-3 py-2.5">Produktivitas</th>
                            <th className="px-3 py-2.5">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={cols} className="px-3 py-8 text-center text-slate-400">
                                    Belum ada data di rentang tanggal ini.
                                </td>
                            </tr>
                        ) : (
                            rows.map((m, i) => (
                                <tr
                                    key={`${accent}-${m.id}-${m.work_date}`}
                                    className="border-t border-slate-100 hover:bg-slate-50/70"
                                >
                                    <td className="px-3 py-2.5 text-slate-500">{i + 1}</td>
                                    <td className="px-3 py-2.5 tabular-nums font-semibold text-slate-700 whitespace-nowrap">
                                        {m.work_date || '—'}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <p className="font-semibold text-slate-800">{m.name}</p>
                                        <p className="text-[11px] font-mono text-slate-400">{m.code}</p>
                                    </td>
                                    <td className="px-3 py-2.5 text-slate-600">{m.location_note || '—'}</td>
                                    <td className="px-3 py-2.5">
                                        {m.operator_name ? (
                                            <p className="font-medium text-slate-800">
                                                {m.operator_nik} - {m.operator_name}
                                            </p>
                                        ) : (
                                            <span className="text-slate-400 italic">Not logged in</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2.5 text-slate-500">{m.operator_note || '—'}</td>
                                    <td className="px-3 py-2.5 tabular-nums font-semibold text-slate-800">
                                        {formatDuration(m.powerOn)}
                                    </td>
                                    <td className="px-3 py-2.5 tabular-nums font-semibold text-emerald-700">
                                        {formatDuration(m.running)}
                                    </td>
                                    <td className="px-3 py-2.5 tabular-nums font-semibold text-amber-700">
                                        {formatDuration(m.loss)}
                                    </td>
                                    {showMachineOff && (
                                        <td className="px-3 py-2.5 tabular-nums font-semibold text-zinc-700">
                                            {formatDuration(m.off)}
                                        </td>
                                    )}
                                    <td className="px-3 py-2.5 tabular-nums font-bold text-sky-800">
                                        {m.prod.toFixed(2)}%
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <span
                                            className={`inline-flex text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border ${catBadge(m.cat)}`}
                                        >
                                            {m.cat}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-500">
                Menampilkan {rows.length} dari {total} baris
            </div>
        </section>
    );
}

function StatCard({
    label,
    value,
    sub,
    tone,
}: {
    label: string;
    value: string;
    sub: string;
    tone?: 'good' | 'normal' | 'bad';
}) {
    const bg =
        tone === 'good'
            ? 'from-emerald-700 to-emerald-800'
            : tone === 'normal'
              ? 'from-amber-600 to-amber-700'
              : tone === 'bad'
                ? 'from-rose-700 to-rose-800'
                : 'from-sky-700 to-blue-900';
    return (
        <div className={`rounded-xl bg-gradient-to-b ${bg} text-white p-3 shadow-sm`}>
            <p className="text-[9px] font-bold uppercase tracking-wider text-white/80">{label}</p>
            <p className="text-xl md:text-2xl font-bold tabular-nums mt-1 leading-none">{value}</p>
            <p className="text-[10px] text-white/70 mt-1.5 leading-snug">{sub}</p>
        </div>
    );
}

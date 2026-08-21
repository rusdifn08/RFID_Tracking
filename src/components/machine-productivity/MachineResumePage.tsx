import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Calendar, Download, Search, X } from 'lucide-react';
import { iotApiBase, iotWsUrl } from './iotApi';
import { formatMachineCodeLabel } from './machineLoginUrl';
import OperationKpiStrip from './OperationKpiStrip';
import SensorTrendChart from './SensorTrendChart';
import { useSimChart } from './useSimChart';

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
    brand: string;
    process_name: string;
    display_name: string;
    device_uid: string | null;
    location_note: string | null;
    branch: string;
    line_name: string;
    status_pzem: string;
    status_adxl: string;
    /** ESP WiFi/MQTT live */
    is_online?: boolean;
    work_date: string;
    pzem: SensorTimes;
    adxl: SensorTimes;
    operator_nik: string | null;
    operator_name: string | null;
    operator_note: string | null;
    shift_status: string;
    /** ISO waktu login (updated_at daily_shifts); null = default / belum scan */
    logged_at?: string | null;
    garment_style: string | null;
    wo: string | null;
    size_label: string | null;
    buyer: string | null;
    item_name: string | null;
    color_name: string | null;
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
    const brand = String(raw.brand ?? '');
    const processName = String(raw.process_name ?? '');
    const displayName =
        String(raw.display_name ?? '').trim() ||
        [brand, processName].filter((x) => x.trim()).join(' ') ||
        String(raw.name ?? '');
    return {
        id: String(raw.id ?? ''),
        code: String(raw.code ?? ''),
        name: String(raw.name ?? ''),
        brand,
        process_name: processName,
        display_name: displayName,
        device_uid: (raw.device_uid as string | null) ?? null,
        location_note: (raw.location_note as string | null) ?? null,
        branch: String(raw.branch ?? ''),
        line_name: String(raw.line_name ?? ''),
        status_pzem: String(raw.status_pzem ?? 'idle'),
        status_adxl: String(raw.status_adxl ?? 'idle'),
        is_online: raw.is_online == null ? undefined : Boolean(raw.is_online),
        work_date: String(raw.work_date ?? ''),
        pzem: asTimes(nestedPzem ?? flatFallback),
        adxl: asTimes(nestedAdxl ?? emptyTimes()),
        operator_nik: (raw.operator_nik as string | null) ?? null,
        operator_name: (raw.operator_name as string | null) ?? null,
        operator_note: (raw.operator_note as string | null) ?? (raw.notes as string | null) ?? null,
        shift_status: String(raw.shift_status ?? 'work'),
        logged_at: (raw.logged_at as string | null) ?? null,
        garment_style: (raw.garment_style as string | null) ?? null,
        wo: (raw.wo as string | null) ?? null,
        size_label: (raw.size_label as string | null) ?? null,
        buyer: (raw.buyer as string | null) ?? null,
        item_name: (raw.item_name as string | null) ?? null,
        color_name: (raw.color_name as string | null) ?? null,
    };
}

function formatDuration(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
}

/** Tanggal kerja WIB (UTC+7) YYYY-MM-DD — selaras backend */
function todayIso() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

function workDateOnly(wd: string) {
    const s = String(wd || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : todayIso();
}

/** Tampil 04/08/2026 */
function formatWorkDate(wd: string) {
    const s = workDateOnly(wd);
    const [y, m, d] = s.split('-');
    if (!y || !m || !d) return s;
    return `${d}/${m}/${y}`;
}

/** Jam login WIB dari ISO, contoh 08:32 */
function formatLoginTime(iso: string | null | undefined) {
    if (!iso) return null;
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return null;
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(new Date(t));
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
    if (cat === 'GOOD') return 'bg-emerald-100 text-emerald-800';
    if (cat === 'NORMAL') return 'bg-amber-100 text-amber-700';
    return 'bg-rose-100 text-rose-700';
}

function enrichRows(rows: ResumeRow[]): Enriched[] {
    return rows.map((m) => {
        const r = rexyOf(m.pzem);
        return { ...m, ...r, off: m.pzem.off_sec, cat: prodCat(r.prod) };
    });
}

function filterRows(list: Enriched[], q: string, area: string) {
    /** UID 001–003 baru mulai 4 Agu 2026 — jangan tampilkan tanggal sebelumnya */
    const NEW_UID_START = '2026-08-04';
    let out = list.filter((m) => {
        const uid = (m.device_uid ?? '').trim();
        const code = (m.code ?? '').trim().toUpperCase();
        const isNewUid =
            uid === '001' ||
            uid === '002' ||
            uid === '003' ||
            code === 'JUKI001' ||
            code === 'JUKI002' ||
            code === 'JUKI003';
        if (uid === '0001' || uid === '0002' || code === 'JUKI0001' || code === 'JUKI0002') {
            return false;
        }
        if (!isNewUid) return true;
        return workDateOnly(m.work_date) >= NEW_UID_START;
    });
    if (area && area !== 'all') {
        const a = area.toLowerCase();
        out = out.filter(
            (m) =>
                (m.branch ?? '').toLowerCase() === a ||
                (m.branch ?? '').toLowerCase().includes(a) ||
                (m.location_note ?? '').toLowerCase().includes(a),
        );
    }
    const s = q.trim().toLowerCase();
    if (!s) return out;
    return out.filter(
        (m) =>
            m.display_name.toLowerCase().includes(s) ||
            m.brand.toLowerCase().includes(s) ||
            m.process_name.toLowerCase().includes(s) ||
            m.name.toLowerCase().includes(s) ||
            m.code.toLowerCase().includes(s) ||
            m.work_date.includes(s) ||
            (m.branch ?? '').toLowerCase().includes(s) ||
            (m.line_name ?? '').toLowerCase().includes(s) ||
            (m.location_note ?? '').toLowerCase().includes(s) ||
            (m.garment_style ?? '').toLowerCase().includes(s) ||
            (m.wo ?? '').toLowerCase().includes(s) ||
            (m.operator_name ?? '').toLowerCase().includes(s) ||
            (m.operator_nik ?? '').toLowerCase().includes(s) ||
            (m.operator_note ?? '').toLowerCase().includes(s) ||
            m.shift_status.toLowerCase().includes(s) ||
            m.cat.toLowerCase().includes(s) ||
            m.status_pzem.toLowerCase().includes(s) ||
            (m.device_uid ?? '').toLowerCase().includes(s),
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

function toSheetRows(list: Enriched[]) {
    return list.map((m, i) => ({
        NO: i + 1,
        DATE: m.work_date,
        'MACHINE PROSES': m.display_name,
        'MACHINE CODE': formatMachineCodeLabel(m.code),
        STYLE: m.garment_style || '',
        WO: m.wo || '',
        SIZE: m.size_label || '',
        BUYER: m.buyer || '',
        ITEM: m.item_name || '',
        COLOR: m.color_name || '',
        BRANCH: m.branch || '',
        LINE: m.line_name || '',
        LOCATION: [m.branch, m.line_name].filter(Boolean).join(' · ') || m.location_note || '',
        OPERATOR: (() => {
            if (!m.operator_name) return 'Not logged in';
            const jam = formatLoginTime(m.logged_at);
            return jam
                ? `${m.operator_nik ?? ''} - ${m.operator_name} (${jam})`
                : `${m.operator_nik ?? ''} - ${m.operator_name}`;
        })(),
        STATUS_SHIFT: m.shift_status,
        'OPERATOR NOTE': m.operator_note || '-',
        'POWER ON DURATION': formatDuration(m.powerOn),
        'RUNNING TIME': formatDuration(m.running),
        'LOSS TIME': formatDuration(m.loss),
        'MACHINE OFF': formatDuration(m.off),
        PRODUKTIVITAS: `${m.prod.toFixed(2)}%`,
        STATUS: m.cat,
        // balik layar
        CODE: m.code,
        'MACHINE UUID': m.id,
    }));
}

function shiftStatusLabel(s: string) {
    if (s === 'broken') return 'Rusak';
    if (s === 'maintenance') return 'Maintenance';
    return 'Kerja';
}

function barColor(cat: ProdCat) {
    if (cat === 'GOOD') return 'bg-emerald-500';
    if (cat === 'NORMAL') return 'bg-amber-400';
    return 'bg-rose-500';
}

/** Titik status live: Merah offline · Orange off · Biru idle · Hijau running */
type LiveDot = 'offline' | 'off' | 'idle' | 'running';

function liveDotKind(m: Pick<ResumeRow, 'is_online' | 'status_pzem'>): LiveDot {
    const st = (m.status_pzem || '').toLowerCase();
    // Merah = ESP tidak terhubung WiFi/MQTT (is_online), bukan status mesin
    if (m.is_online === false) return 'offline';
    if (m.is_online == null && (st === 'offline' || st === 'error')) return 'offline';
    if (st === 'off') return 'off';
    if (st === 'running') return 'running';
    if (st === 'idle') return 'idle';
    // status_pzem stale "offline" tapi device online → anggap mesin off
    if (st === 'offline' || st === 'error') return 'off';
    if (m.is_online === true) return 'idle';
    return 'offline';
}

function liveDotClass(kind: LiveDot) {
    if (kind === 'offline') return 'bg-red-500';
    if (kind === 'off') return 'bg-orange-500';
    if (kind === 'running') return 'bg-emerald-500';
    return 'bg-sky-500'; // idle biru
}

function liveDotLabel(kind: LiveDot) {
    if (kind === 'offline') return 'ESP offline (WiFi/MQTT)';
    if (kind === 'off') return 'Mesin mati';
    if (kind === 'running') return 'Running';
    return 'Idle (menyala)';
}

function LiveStatusDot({ m }: { m: Pick<ResumeRow, 'is_online' | 'status_pzem'> }) {
    const kind = liveDotKind(m);
    return (
        <span
            className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${liveDotClass(kind)}`}
            title={liveDotLabel(kind)}
            aria-label={liveDotLabel(kind)}
        />
    );
}

export default function MachineResumePage({ enableSim = false }: { enableSim?: boolean }) {
    const apiBase = iotApiBase();
    const today = todayIso();
    const [rows, setRows] = useState<ResumeRow[]>([]);
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [rankDate, setRankDate] = useState(today);
    const [q, setQ] = useState('');
    const [area, setArea] = useState('all');
    const [detail, setDetail] = useState<Enriched | null>(null);
    const [thr, setThr] = useState({ run: 0.6, off: 0.03 });
    const [loading, setLoading] = useState(true);
    const [sleepPeriods, setSleepPeriods] = useState<
        { sleep_from: string; sleep_to: string | null; duration_sec: number | null }[]
    >([]);

    const detailLive = useMemo(() => {
        if (!detail) return null;
        if (!enableSim) return detail;
        const fresh = enrichRows(rows).find(
            (m) => m.id === detail.id && workDateOnly(m.work_date) === workDateOnly(detail.work_date),
        );
        return fresh ?? detail;
    }, [detail, enableSim, rows]);

    const simChartPoints = useSimChart(
        enableSim,
        apiBase,
        detailLive?.id ?? null,
        detailLive ? workDateOnly(detailLive.work_date) : today,
    );

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                let from = startDate || todayIso();
                let to = endDate || todayIso();
                if (from > to) {
                    const tmp = from;
                    from = to;
                    to = tmp;
                }
                const simQ = enableSim ? '&sim=1' : '';
                const res = await fetch(
                    `${apiBase}/api/machines/resume?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${simQ}`,
                );
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled) {
                    const list = Array.isArray(data.machines) ? data.machines : [];
                    // unik per mesin + tanggal (hindari dobel)
                    const seen = new Set<string>();
                    const mapped: ResumeRow[] = [];
                    for (const raw of list) {
                        const row = normalizeResumeRow(raw as Record<string, unknown>);
                        const key = `${row.id}|${workDateOnly(row.work_date)}`;
                        if (seen.has(key)) continue;
                        seen.add(key);
                        mapped.push(row);
                    }
                    setRows(mapped);
                }
            } catch {
                /* ignore */
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        void load();
        const t = setInterval(() => void load(), 30_000);
        return () => {
            cancelled = true;
            clearInterval(t);
        };
    }, [apiBase, startDate, endDate, enableSim]);

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
                        type?: string;
                        machine_id?: string;
                        work_date?: string;
                        operator_nik?: string | null;
                        operator_name?: string | null;
                        garment_style?: string | null;
                        branch?: string;
                        line_name?: string;
                        location_note?: string | null;
                        logged_at?: string | null;
                    };
                    if (msg.type !== 'machine_meta' || !msg.machine_id) return;
                    const day = String(msg.work_date ?? '').slice(0, 10);
                    setRows((prev) =>
                        prev.map((r) => {
                            if (r.id !== msg.machine_id) return r;
                            const loc = {
                                ...r,
                                branch: msg.branch ?? r.branch,
                                line_name: msg.line_name ?? r.line_name,
                                location_note:
                                    msg.location_note !== undefined ? msg.location_note : r.location_note,
                            };
                            if (day && workDateOnly(r.work_date) !== day) return loc;
                            return {
                                ...loc,
                                operator_nik: msg.operator_nik ?? null,
                                operator_name: msg.operator_name ?? null,
                                garment_style: msg.garment_style ?? null,
                                logged_at:
                                    msg.logged_at !== undefined ? msg.logged_at : r.logged_at,
                            };
                        }),
                    );
                } catch {
                    /* ignore */
                }
            };
            ws.onclose = () => {
                if (!closed) retry = setTimeout(connect, 2000);
            };
        };
        connect();
        return () => {
            closed = true;
            if (retry) clearTimeout(retry);
            ws?.close();
        };
    }, []);

    useEffect(() => {
        if (enableSim) {
            setThr({ run: 0.6, off: 0.03 });
            return;
        }
        if (!detailLive || detailLive.id.startsWith('sim-')) return;
        let cancelled = false;
        void fetch(`${apiBase}/api/machines/${detailLive.id}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((m) => {
                if (cancelled || !m) return;
                setThr({
                    run: Number(m.current_threshold_a ?? 0.6),
                    off: Number(m.off_current_a ?? 0.03),
                });
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [apiBase, detailLive?.id, enableSim]);

    useEffect(() => {
        if (!detailLive || detailLive.id.startsWith('sim-')) {
            setSleepPeriods([]);
            return;
        }
        const day = workDateOnly(detailLive.work_date);
        let cancelled = false;
        void fetch(`${apiBase}/api/machines/${detailLive.id}/deep-sleep?date=${encodeURIComponent(day)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (cancelled || !d) return;
                setSleepPeriods(Array.isArray(d.periods) ? d.periods : []);
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [apiBase, detailLive?.id, detailLive?.work_date]);

    const areas = useMemo(() => {
        const set = new Set<string>();
        for (const r of rows) {
            const b = (r.branch ?? '').trim();
            if (b) set.add(b);
        }
        return Array.from(set).sort();
    }, [rows]);

    const filtered = useMemo(() => filterRows(enrichRows(rows), q, area), [rows, q, area]);
    const sum = useMemo(() => summarize(filtered), [filtered]);

    // Rank/KPI hari ini vs filter Start/End: rankDate di luar rentang fetch → list kosong
    useEffect(() => {
        let from = startDate || todayIso();
        let to = endDate || todayIso();
        if (from > to) {
            const tmp = from;
            from = to;
            to = tmp;
        }
        if (rankDate < from || rankDate > to) setRankDate(from === to ? from : to);
    }, [startDate, endDate, rankDate]);

    const rankList = useMemo(() => {
        const day = rankDate || todayIso();
        return filtered
            .filter((m) => workDateOnly(m.work_date) === day)
            .sort((a, b) => b.prod - a.prod);
    }, [filtered, rankDate]);

    const attentionList = useMemo(
        () => rankList.filter((m) => m.cat === 'BAD').slice(0, 12),
        [rankList],
    );

    const exportExcel = () => {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toSheetRows(filtered)), 'PZEM');
        XLSX.writeFile(wb, `machine_productivity_${startDate}_${endDate}.xlsx`);
    };

    const detailDay = detailLive ? workDateOnly(detailLive.work_date) : '';
    const detailFrom = detailDay ? `${detailDay}T00:00` : '';
    const detailTo = detailDay ? `${detailDay}T23:59` : '';

    return (
        <div className="w-full max-w-[1400px] mx-auto space-y-5 pb-8">
            {/* ===== Header overview (gambar 1) ===== */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <h1
                    className="text-2xl md:text-3xl font-extrabold text-[#1e3a8a] tracking-tight"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                    Monitoring Productivity Machine
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2563eb] text-white text-xs font-semibold px-3 py-1.5 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                        LIVE DASHBOARD Production View
                    </span>
                    <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1 shadow-sm">
                        <LegendDot label="GOOD" sub="≥ 90%" tone="good" />
                        <LegendDot label="NORMAL" sub="80–90%" tone="normal" />
                        <LegendDot label="BAD" sub="< 80%" tone="bad" />
                    </div>
                </div>
            </div>

            {/* Kesimpulan + terbaik + terendah */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#2563eb] mb-2">
                        {startDate === endDate && startDate === today
                            ? 'Kesimpulan Hari Ini'
                            : 'Kesimpulan Filter'}
                    </p>
                    <h2 className="text-lg font-bold text-slate-800">Ringkasan performa produksi mesin</h2>
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                        {sum.good} mesin GOOD, {sum.normal} NORMAL, dan {sum.bad} BAD dari total {sum.n}{' '}
                        mesin. Rata-rata produktivitas {sum.avg.toFixed(2)}%.
                    </p>
                </div>
                <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#2563eb] mb-2">
                        Mesin Terbaik
                    </p>
                    <p className="text-sm font-semibold text-slate-800 line-clamp-2 min-h-[2.5rem]">
                        {sum.best?.display_name ?? '—'}
                    </p>
                    <p className="text-3xl font-extrabold text-[#2563eb] mt-2 tabular-nums">
                        {sum.best ? `${sum.best.prod.toFixed(2)}%` : '—'}
                    </p>
                </div>
                <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 mb-2">
                        Terendah
                    </p>
                    <p className="text-sm font-semibold text-slate-800 line-clamp-2 min-h-[2.5rem]">
                        {sum.worst?.display_name ?? '—'}
                    </p>
                    <p className="text-3xl font-extrabold text-rose-600 mt-2 tabular-nums">
                        {sum.worst ? `${sum.worst.prod.toFixed(2)}%` : '—'}
                    </p>
                </div>
            </div>

            {/* 6 metric cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                <MetricCard label="Total Mesin" value={String(sum.n)} sub="Mesin terdaftar" />
                <MetricCard
                    label="Avg Produktivitas"
                    value={`${sum.avg.toFixed(2)}%`}
                    sub="Rata-rata seluruh mesin"
                />
                <MetricCard label="Good" value={String(sum.good)} sub="≥ 90%" />
                <MetricCard label="Normal" value={String(sum.normal)} sub="80% sampai < 90%" />
                <MetricCard label="Bad" value={String(sum.bad)} sub="< 80%" />
                <MetricCard
                    label="Power On"
                    value={formatDuration(filtered.reduce((a, m) => a + m.powerOn, 0))}
                    sub={
                        startDate === endDate && startDate === today
                            ? 'Total Power On hari ini'
                            : 'Total Power On pada filter'
                    }
                />
            </div>

            {/* Rank + Attention */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-base font-bold text-slate-800">Rank Produktivitas Mesin</h3>
                        <label className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                            <Calendar className="w-3.5 h-3.5 text-[#2563eb]" />
                            <input
                                type="date"
                                value={rankDate}
                                onChange={(e) => setRankDate(e.target.value)}
                                className="bg-transparent border-0 outline-none text-xs font-semibold text-slate-700"
                            />
                        </label>
                    </div>
                    <ul className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
                        {rankList.length === 0 ? (
                            <li className="px-4 py-8 text-center text-sm text-slate-400">
                                {loading ? 'Memuat…' : 'Belum ada mesin untuk tanggal ini.'}
                            </li>
                        ) : (
                            rankList.slice(0, 20).map((m, i) => (
                                <li
                                    key={`rank-${m.id}`}
                                    className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 cursor-pointer"
                                    onClick={() => setDetail(m)}
                                >
                                    <span className="w-7 h-7 shrink-0 rounded-full bg-[#2563eb] text-white text-xs font-bold flex items-center justify-center">
                                        {i + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-800 truncate flex items-center gap-2">
                                            <LiveStatusDot m={m} />
                                            <span className="truncate">{m.display_name}</span>
                                        </p>
                                        <p className="text-[11px] truncate">
                                            <span className="text-[#2563eb]">
                                                {m.device_uid ? `UID ${m.device_uid}` : 'UID —'}
                                            </span>
                                            <span className="text-slate-400">
                                                {m.branch ? ` · ${m.branch}` : ''}
                                                {m.line_name ? ` · ${m.line_name}` : !m.branch && m.location_note ? ` · ${m.location_note}` : ''}
                                            </span>
                                        </p>
                                        <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${barColor(m.cat)}`}
                                                style={{ width: `${Math.min(100, Math.max(2, m.prod))}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold tabular-nums text-slate-700 shrink-0">
                                        {m.prod.toFixed(2)}%
                                    </span>
                                </li>
                            ))
                        )}
                    </ul>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                        <h3 className="text-base font-bold text-slate-800">Mesin Perlu Perhatian</h3>
                    </div>
                    <ul className="p-3 space-y-2 max-h-[360px] overflow-y-auto">
                        {attentionList.length === 0 ? (
                            <li className="px-2 py-8 text-center text-sm text-slate-400">
                                Tidak ada mesin BAD pada tanggal ini.
                            </li>
                        ) : (
                            attentionList.map((m, i) => (
                                <li
                                    key={`att-${m.id}`}
                                    className="rounded-xl bg-rose-50 border border-rose-100 px-3 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-rose-100/80"
                                    onClick={() => setDetail(m)}
                                >
                                    <span className="w-7 h-7 shrink-0 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center">
                                        {i + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-800 truncate flex items-center gap-2">
                                            <LiveStatusDot m={m} />
                                            <span className="truncate">{m.display_name}</span>
                                        </p>
                                        <p className="text-[11px] truncate">
                                            <span className="text-[#2563eb]">
                                                {m.device_uid ? `UID ${m.device_uid}` : 'UID —'}
                                            </span>
                                            <span className="text-rose-600/80">
                                                {m.branch ? ` · ${m.branch}` : ''}
                                                {m.line_name ? ` · ${m.line_name}` : !m.branch && m.location_note ? ` · ${m.location_note}` : ''} · Output{' '}
                                                {formatDuration(m.running)}
                                            </span>
                                        </p>
                                    </div>
                                    <span className="text-sm font-bold tabular-nums text-rose-600 shrink-0">
                                        {m.prod.toFixed(2)}%
                                    </span>
                                </li>
                            ))
                        )}
                    </ul>
                </section>
            </div>

            {/* ===== Details table (gambar 2) ===== */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-4 pt-4 pb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-slate-800">Machine Productivity Details</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {startDate === endDate
                                ? `Tanggal ${formatWorkDate(startDate)}`
                                : `${formatWorkDate(startDate)} – ${formatWorkDate(endDate)}`}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-100 text-sky-700">
                            {filtered.length} data
                        </span>
                    </div>
                </div>

                <div className="px-4 pb-4 flex flex-wrap gap-2 items-end">
                    <label className="text-[10px] uppercase font-semibold text-slate-500">
                        Start Date
                        <div className="mt-1 relative">
                            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="pl-7 block rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm min-w-[140px]"
                            />
                        </div>
                    </label>
                    <label className="text-[10px] uppercase font-semibold text-slate-500">
                        End Date
                        <div className="mt-1 relative">
                            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="pl-7 block rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm min-w-[140px]"
                            />
                        </div>
                    </label>
                    <label className="text-[10px] uppercase font-semibold text-slate-500">
                        Area
                        <select
                            value={area}
                            onChange={(e) => setArea(e.target.value)}
                            className="mt-1 block rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm min-w-[120px]"
                        >
                            <option value="all">All GM</option>
                            {areas.map((a) => (
                                <option key={a} value={a}>
                                    {a}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="text-[10px] uppercase font-semibold text-slate-500 flex-1 min-w-[200px]">
                        Search
                        <div className="mt-1 relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="search"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Search machines, status, area, location, operator logged in, operator note..."
                                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm"
                            />
                        </div>
                    </label>
                    <button
                        type="button"
                        onClick={() => {
                            const t = todayIso();
                            setStartDate(t);
                            setEndDate(t);
                            setRankDate(t);
                        }}
                        className="text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                        Hari ini
                    </button>
                    <button
                        type="button"
                        onClick={exportExcel}
                        disabled={filtered.length === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-40"
                    >
                        <Download className="w-4 h-4" />
                        Export Excel
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[1200px]">
                        <thead>
                            <tr className="bg-[#2563eb] text-white text-left text-[10px] uppercase tracking-wide">
                                <th className="px-3 py-3">No</th>
                                <th className="px-3 py-3">Tanggal</th>
                                <th className="px-3 py-3">Machine Proses</th>
                                <th className="px-3 py-3">Style</th>
                                <th className="px-3 py-3">Location</th>
                                <th className="px-3 py-3">Operator</th>
                                <th className="px-3 py-3">Operator Note</th>
                                <th className="px-3 py-3">Power On Duration</th>
                                <th className="px-3 py-3">Running Time</th>
                                <th className="px-3 py-3">Loss Time</th>
                                <th className="px-3 py-3 text-red-100">Machine Off</th>
                                <th className="px-3 py-3">Produktivitas</th>
                                <th className="px-3 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={13} className="px-3 py-10 text-center text-slate-400">
                                        {loading
                                            ? 'Memuat data…'
                                            : 'Belum ada mesin MQTT. Nyalakan ESP agar otomatis terdaftar.'}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((m, i) => (
                                    <tr
                                        key={`${m.id}-${m.work_date}`}
                                        className="border-t border-slate-100 hover:bg-sky-50/70 cursor-pointer"
                                        onClick={() => setDetail(m)}
                                    >
                                        <td className="px-3 py-3 text-slate-500">{i + 1}</td>
                                        <td className="px-3 py-3">
                                            <p className="font-semibold text-[#2563eb] tabular-nums whitespace-nowrap">
                                                {formatWorkDate(m.work_date)}
                                            </p>
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <LiveStatusDot m={m} />
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-800">{m.display_name}</p>
                                                    {m.device_uid ? (
                                                        <p className="text-[11px] text-slate-400 font-medium font-mono mt-0.5">
                                                            UID {m.device_uid}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3">
                                            {m.garment_style ? (
                                                <>
                                                    <p className="font-mono font-semibold text-[#2563eb]">
                                                        {m.garment_style}
                                                    </p>
                                                    {m.wo && (
                                                        <p className="text-[11px] text-[#2563eb]">WO {m.wo}</p>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-slate-400 italic text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-slate-600">
                                            {m.branch || m.line_name ? (
                                                <>
                                                    <p className="font-semibold text-slate-800">
                                                        {m.branch || '—'}
                                                    </p>
                                                    <p className="text-[11px] text-[#2563eb] font-medium">
                                                        {m.line_name || '—'}
                                                    </p>
                                                </>
                                            ) : (
                                                <span className="text-slate-400">{m.location_note || '—'}</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            {m.operator_name ? (
                                                <>
                                                    <p className="font-semibold text-slate-800">
                                                        {m.operator_nik} - {m.operator_name}
                                                    </p>
                                                    <p className="text-[11px] text-[#2563eb]">
                                                        {(() => {
                                                            const jam = formatLoginTime(m.logged_at);
                                                            return jam
                                                                ? `${shiftStatusLabel(m.shift_status)} · ${formatWorkDate(m.work_date)} · ${jam}`
                                                                : `${shiftStatusLabel(m.shift_status)} · ${formatWorkDate(m.work_date)}`;
                                                        })()}
                                                    </p>
                                                </>
                                            ) : (
                                                <span className="text-slate-400 italic">Not logged in</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-slate-600 text-xs max-w-[160px]">
                                            {m.operator_note || '-'}
                                        </td>
                                        <td className="px-3 py-3 tabular-nums font-semibold text-slate-800">
                                            {formatDuration(m.powerOn)}
                                        </td>
                                        <td className="px-3 py-3 tabular-nums font-semibold text-slate-800">
                                            {formatDuration(m.running)}
                                        </td>
                                        <td className="px-3 py-3 tabular-nums font-semibold text-slate-800">
                                            {formatDuration(m.loss)}
                                        </td>
                                        <td className="px-3 py-3 tabular-nums font-semibold text-red-600">
                                            {formatDuration(m.off)}
                                        </td>
                                        <td className="px-3 py-3 tabular-nums font-bold text-slate-800">
                                            {m.prod.toFixed(2)}%
                                        </td>
                                        <td className="px-3 py-3">
                                            <span
                                                className={`inline-flex text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${catBadge(m.cat)}`}
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
            </section>

            {detailLive && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-3 sm:p-6"
                    role="dialog"
                    aria-modal
                    aria-label="Detail grafik harian"
                    onClick={() => setDetail(null)}
                >
                    <div
                        className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-xl border border-slate-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-white/95 backdrop-blur">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#2563eb]">
                                    Detail grafik · {detailDay}
                                </p>
                                <h3 className="text-base font-bold text-slate-800">
                                    {detailLive.display_name}
                                </h3>
                                <p className="text-[11px] text-[#2563eb] font-medium font-mono mt-0.5">
                                    {detailLive.device_uid ? `UID ${detailLive.device_uid}` : 'UID —'}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    {detailLive.garment_style ? `Style: ${detailLive.garment_style}` : 'Style —'}
                                    {detailLive.wo ? ` · WO ${detailLive.wo}` : ''}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    {detailLive.branch || detailLive.line_name
                                        ? [detailLive.branch, detailLive.line_name].filter(Boolean).join(' · ')
                                        : detailLive.location_note || '—'}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                                    Code {detailLive.code} · ID {detailLive.id.slice(0, 8)}…
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Produktivitas {detailLive.prod.toFixed(2)}% · status {detailLive.cat}
                                    {detailLive.operator_note ? ` · Note: ${detailLive.operator_note}` : ''}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDetail(null)}
                                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                                aria-label="Tutup"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-3 sm:p-4 space-y-3">
                            <OperationKpiStrip
                                runningSec={detailLive.running}
                                idleSec={detailLive.loss}
                                offSec={detailLive.off}
                                tone="sky"
                            />
                            <SensorTrendChart
                                apiBase={apiBase}
                                machineId={detailLive.id}
                                sensor="pzem"
                                hours="custom"
                                fromLocal={detailFrom}
                                toLocal={detailTo}
                                hideFilters
                                compact={false}
                                refreshMs={30_000}
                                colorByStatus
                                currentThresholdA={thr.run}
                                offCurrentA={thr.off}
                                pointsOverride={
                                    enableSim && simChartPoints.length > 0
                                        ? simChartPoints
                                        : undefined
                                }
                            />
                            {sleepPeriods.length > 0 && (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                                    <p className="font-semibold text-slate-700 mb-1">Deep sleep (mesin OFF)</p>
                                    {sleepPeriods.map((p, i) => (
                                        <p key={`${p.sleep_from}-${i}`} className="tabular-nums">
                                            {new Date(p.sleep_from).toLocaleTimeString('id-ID', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                            {' → '}
                                            {p.sleep_to
                                                ? new Date(p.sleep_to).toLocaleTimeString('id-ID', {
                                                      hour: '2-digit',
                                                      minute: '2-digit',
                                                  })
                                                : 'masih tidur'}
                                            {p.duration_sec != null
                                                ? ` · ${Math.round(p.duration_sec / 60)} mnt`
                                                : ''}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function LegendDot({
    label,
    sub,
    tone,
}: {
    label: string;
    sub: string;
    tone: 'good' | 'normal' | 'bad';
}) {
    const wrap =
        tone === 'good'
            ? 'bg-emerald-50 text-emerald-700'
            : tone === 'normal'
              ? 'bg-amber-50 text-amber-700'
              : 'bg-rose-50 text-rose-700';
    const dot =
        tone === 'good' ? 'bg-emerald-500' : tone === 'normal' ? 'bg-amber-400' : 'bg-rose-500';
    return (
        <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${wrap}`}>
            <span className={`w-2 h-2 rounded-full ${dot}`} />
            {label}
            <span className="font-medium opacity-80">{sub}</span>
        </span>
    );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
    return (
        <div className="relative rounded-2xl bg-[#1e3a8a] text-white p-4 shadow-md overflow-hidden min-h-[110px]">
            <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-white/30" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/75">{label}</p>
            <p className="text-2xl md:text-3xl font-extrabold tabular-nums mt-2 leading-none">{value}</p>
            <p className="text-[11px] text-white/65 mt-2 leading-snug">{sub}</p>
        </div>
    );
}

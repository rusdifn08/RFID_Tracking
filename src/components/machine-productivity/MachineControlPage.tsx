import { useCallback, useEffect, useMemo, useState } from 'react';
import { Cpu, Loader2, Radio, Save, Wifi, WifiOff } from 'lucide-react';
import { iotApiBase } from './iotApi';
import { buildMachineGateUrl } from './machineLoginUrl';

type ControlMachine = {
    id: string;
    code: string;
    name: string;
    brand: string;
    process_name: string;
    barcode: string | null;
    location_note: string | null;
    branch: string;
    line_name: string;
    status_pzem: string;
    status_adxl: string;
    status: string;
    current_threshold_a: number;
    off_current_a: number;
    power_threshold_w: number;
    kpi_source: string;
    lcd_auto_ms: number;
    login_required: boolean;
    default_operator_nik: string;
    default_operator_name: string;
    device_uid: string;
    last_seen_at: string | null;
    is_online: boolean;
    has_device?: boolean;
    rssi?: number | null;
    wifi_ok?: boolean | null;
    mqtt_ok?: boolean | null;
    ip_addr?: string | null;
    wifi_ssid?: string | null;
    link_age_sec?: number;
    signal_quality?: string;
    mqtt_topic: string;
    mqtt_cmd_topic: string;
};

type FormState = {
    code: string;
    device_uid: string;
    name: string;
    brand: string;
    process_name: string;
    barcode: string;
    location_note: string;
    branch: string;
    line_name: string;
    current_threshold_a: number;
    off_current_a: number;
    kpi_source: string;
    login_required: boolean;
    default_operator_nik: string;
    default_operator_name: string;
};

function statusColor(st: string) {
    if (st === 'running') return 'bg-emerald-500';
    if (st === 'idle') return 'bg-amber-400';
    if (st === 'off') return 'bg-slate-400';
    return 'bg-rose-500';
}

function statusLabel(st: string) {
    if (st === 'running') return 'Running';
    if (st === 'idle') return 'Idle';
    if (st === 'off') return 'Off';
    return st || 'offline';
}

function signalLabel(q?: string) {
    if (q === 'excellent') return 'Sangat bagus';
    if (q === 'good') return 'Bagus';
    if (q === 'fair') return 'Cukup';
    if (q === 'weak') return 'Lemah';
    if (q === 'poor') return 'Buruk';
    return '—';
}

function signalClass(q?: string) {
    if (q === 'excellent' || q === 'good') return 'bg-emerald-100 text-emerald-800';
    if (q === 'fair') return 'bg-amber-100 text-amber-800';
    if (q === 'weak' || q === 'poor') return 'bg-rose-100 text-rose-800';
    return 'bg-slate-100 text-slate-500';
}

function formatAge(sec?: number) {
    if (sec == null || sec >= 9999) return '—';
    if (sec < 5) return 'baru saja';
    if (sec < 60) return `${sec}s lalu`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m lalu`;
    return `${Math.floor(sec / 3600)}j lalu`;
}

export default function MachineControlPage() {
    const apiBase = iotApiBase();
    const [machines, setMachines] = useState<ControlMachine[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [form, setForm] = useState<FormState | null>(null);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const load = useCallback(async () => {
        setErr(null);
        try {
            let res = await fetch(`${apiBase}/api/machines/control`);
            if (!res.ok) {
                // fallback jika backend belum di-restart
                res = await fetch(`${apiBase}/api/machines`);
                if (!res.ok) throw new Error(`Gagal load (${res.status}). Restart backend Rust.`);
                const raw = await res.json();
                const mapped: ControlMachine[] = (Array.isArray(raw) ? raw : []).map(
                    (m: Record<string, unknown>) => ({
                        id: String(m.id),
                        code: String(m.code ?? ''),
                        name: String(m.name ?? ''),
                        brand: String(m.brand ?? ''),
                        process_name: String(m.process_name ?? ''),
                        barcode: (m.barcode as string | null) ?? null,
                        location_note: (m.location_note as string | null) ?? null,
                        branch: String(m.branch ?? ''),
                        line_name: String(m.line_name ?? ''),
                        status_pzem: String(m.status_pzem ?? 'offline'),
                        status_adxl: String(m.status_adxl ?? 'offline'),
                        status: String(m.status ?? 'offline'),
                        current_threshold_a: Number(m.current_threshold_a ?? 0.6),
                        off_current_a: Number(m.off_current_a ?? 0.03),
                        power_threshold_w: Number(m.power_threshold_w ?? 0),
                        kpi_source: String(m.kpi_source ?? 'esp'),
                        lcd_auto_ms: Number(m.lcd_auto_ms ?? 4000),
                        login_required: m.login_required !== false,
                        default_operator_nik: String(
                            (m as { default_operator_nik?: string }).default_operator_nik ?? '',
                        ),
                        default_operator_name: String(
                            (m as { default_operator_name?: string }).default_operator_name ?? '',
                        ),
                        device_uid: '',
                        last_seen_at: null,
                        is_online: false,
                        has_device: false,
                        mqtt_topic: `iot/gistex/${m.code}/telemetry/pzem`,
                        mqtt_cmd_topic: `iot/gistex/${m.code}/cmd`,
                    }),
                );
                setMachines(mapped);
                setSelectedId((prev) => {
                    if (prev && mapped.some((m) => m.id === prev)) return prev;
                    return mapped[0]?.id ?? null;
                });
                return;
            }
            const data = await res.json();
            const mapped: ControlMachine[] = (Array.isArray(data) ? data : []).map(
                (m: ControlMachine) => ({
                    ...m,
                    login_required: m.login_required !== false,
                    default_operator_nik: m.default_operator_nik ?? '',
                    default_operator_name: m.default_operator_name ?? '',
                }),
            );
            setMachines(mapped);
            setSelectedId((prev) => {
                if (prev && mapped.some((m) => m.id === prev)) return prev;
                return mapped[0]?.id ?? null;
            });
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'Gagal memuat');
            setMachines([]);
        } finally {
            setLoading(false);
        }
    }, [apiBase]);

    useEffect(() => {
        void load();
        const t = setInterval(() => void load(), 5_000);
        return () => clearInterval(t);
    }, [load]);

    const selected = machines.find((m) => m.id === selectedId) ?? null;

    useEffect(() => {
        if (!selected) {
            setForm(null);
            return;
        }
        setForm({
            code: selected.code,
            device_uid: selected.device_uid || '',
            name: selected.name,
            brand: selected.brand || '',
            process_name: selected.process_name || '',
            barcode: selected.barcode || '',
            location_note: selected.location_note || '',
            branch: selected.branch || '',
            line_name: selected.line_name || '',
            current_threshold_a: selected.current_threshold_a ?? 0.6,
            off_current_a: selected.off_current_a ?? 0.03,
            kpi_source: selected.kpi_source === 'telemetry' ? 'telemetry' : 'esp',
            login_required: selected.login_required !== false,
            default_operator_nik: selected.default_operator_nik || '',
            default_operator_name: selected.default_operator_name || '',
        });
        setMsg(null);
        setErr(null);
    }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const gateQrUrl = useMemo(() => {
        if (!form?.device_uid?.trim() || !form.code?.trim()) return '';
        return buildMachineGateUrl(form.device_uid.trim());
    }, [form?.device_uid]);

    const save = async () => {
        if (!selected || !form) return;
        setSaving(true);
        setMsg(null);
        setErr(null);
        try {
            const res = await fetch(`${apiBase}/api/machines/${selected.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: form.code.trim().toUpperCase(),
                    device_uid: form.device_uid.trim(),
                    name: form.name.trim(),
                    brand: form.brand.trim(),
                    process_name: form.process_name.trim(),
                    barcode: form.barcode.trim().toUpperCase() || null,
                    location_note: form.location_note.trim() || null,
                    branch: form.branch.trim(),
                    line_name: form.line_name.trim(),
                    current_threshold_a: form.current_threshold_a,
                    off_current_a: form.off_current_a,
                    kpi_source: form.kpi_source,
                    login_required: form.login_required,
                    default_operator_nik: form.default_operator_nik.trim(),
                    default_operator_name: form.default_operator_name.trim(),
                }),
            });
            if (!res.ok) {
                const t = await res.text();
                throw new Error(t || `Gagal simpan (${res.status})`);
            }
            setMsg(
                form.login_required
                    ? 'Tersimpan. System Login ON → ESP wajib login.'
                    : 'Tersimpan. System Login OFF → ESP jalan tanpa login.',
            );
            await load();
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'Gagal simpan');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="w-full max-w-[1400px] mx-auto space-y-5 pb-8">
            <div>
                <h1
                    className="text-2xl font-bold text-slate-800 flex items-center gap-2"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                    <Cpu className="w-7 h-7 text-indigo-600" />
                    Control Machine
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Mesin aktif (pernah kirim MQTT), termasuk status Off. Klik kartu untuk ubah topic,
                    UID, nama, style/proses, dan parameter.
                </p>
            </div>

            {loading && (
                <div className="flex items-center gap-2 text-slate-500 py-8 justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Memuat mesin…
                </div>
            )}

            {!loading && machines.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center space-y-2">
                    <p className="text-slate-400 text-sm">
                        Belum ada mesin di database.
                    </p>
                    {err && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 inline-block">
                            {err}
                        </p>
                    )}
                    <p className="text-xs text-slate-400">
                        Pastikan backend Rust jalan di port 8088, lalu nyalakan ESP (auto-daftar MQTT).
                    </p>
                </div>
            )}

            {err && machines.length > 0 && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    {err}
                </p>
            )}

            {machines.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-5 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Mesin aktif ({machines.length})
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 max-h-[70vh] overflow-y-auto pr-1">
                            {machines.map((m) => {
                                const active = m.id === selectedId;
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setSelectedId(m.id)}
                                        className={`text-left rounded-xl border p-3 transition-all ${
                                            active
                                                ? 'border-indigo-400 bg-indigo-50 shadow-sm ring-1 ring-indigo-200'
                                                : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-800 truncate">{m.name}</p>
                                                <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                                                    {m.code}
                                                    {m.device_uid ? ` · UID ${m.device_uid}` : ' · belum ada UID'}
                                                </p>
                                            </div>
                                            <span
                                                className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white ${statusColor(m.status_pzem)}`}
                                            >
                                                {statusLabel(m.status_pzem)}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                                            {m.is_online ? (
                                                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                                            ) : (
                                                <WifiOff className="w-3.5 h-3.5 text-slate-400" />
                                            )}
                                            <span
                                                className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${signalClass(m.signal_quality)}`}
                                            >
                                                {m.rssi != null ? `${m.rssi} dBm` : 'RSSI —'}
                                            </span>
                                            <span className="truncate text-slate-400">
                                                {signalLabel(m.signal_quality)}
                                            </span>
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                                            <span
                                                className={`px-1.5 py-0.5 rounded font-semibold ${
                                                    m.wifi_ok
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}
                                            >
                                                WiFi {m.wifi_ok ? 'OK' : '—'}
                                            </span>
                                            <span
                                                className={`px-1.5 py-0.5 rounded font-semibold ${
                                                    m.mqtt_ok
                                                        ? 'bg-sky-50 text-sky-700'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}
                                            >
                                                MQTT {m.mqtt_ok ? 'OK' : '—'}
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-500">
                                                {formatAge(m.link_age_sec)}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="lg:col-span-7">
                        {selected && form ? (
                            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                                            Edit mesin
                                        </p>
                                        <h2 className="text-lg font-bold text-slate-800">{selected.name}</h2>
                                    </div>
                                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                                        <Radio className="w-3.5 h-3.5" />
                                        Status PZEM: {statusLabel(selected.status_pzem)}
                                    </span>
                                </div>

                                <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-[11px] text-slate-600 space-y-1.5">
                                    <p>
                                        <span className="font-semibold">Topic telemetry:</span>{' '}
                                        <span className="font-mono">{selected.mqtt_topic}</span>
                                    </p>
                                    <p>
                                        <span className="font-semibold">Topic cmd:</span>{' '}
                                        <span className="font-mono">{selected.mqtt_cmd_topic}</span>
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200/80">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400">Sinyal</p>
                                            <p className={`inline-flex mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${signalClass(selected.signal_quality)}`}>
                                                {selected.rssi != null ? `${selected.rssi} dBm` : '—'} ·{' '}
                                                {signalLabel(selected.signal_quality)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400">WiFi / MQTT</p>
                                            <p className="mt-0.5 font-semibold text-slate-700">
                                                {selected.wifi_ok ? 'WiFi OK' : 'WiFi —'} ·{' '}
                                                {selected.mqtt_ok ? 'MQTT OK' : 'MQTT —'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400">IP ESP</p>
                                            <p className="mt-0.5 font-mono font-semibold text-slate-700">
                                                {selected.ip_addr || '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400">Last ping</p>
                                            <p className="mt-0.5 font-semibold text-slate-700">
                                                {formatAge(selected.link_age_sec)}
                                            </p>
                                        </div>
                                    </div>
                                    {selected.wifi_ssid ? (
                                        <p className="text-slate-500">
                                            SSID: <span className="font-mono">{selected.wifi_ssid}</span>
                                        </p>
                                    ) : null}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <Field label="Machine Code (MQTT topic)">
                                        <input
                                            value={form.code}
                                            onChange={(e) =>
                                                setForm({ ...form, code: e.target.value.toUpperCase() })
                                            }
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                            placeholder="JUKI002"
                                        />
                                    </Field>
                                    <Field label="Device UID">
                                        <input
                                            value={form.device_uid}
                                            onChange={(e) =>
                                                setForm({ ...form, device_uid: e.target.value })
                                            }
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                            placeholder="001"
                                        />
                                    </Field>
                                    <Field label="Machine Name">
                                        <input
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        />
                                    </Field>
                                    <Field label="Brand">
                                        <input
                                            value={form.brand}
                                            onChange={(e) => setForm({ ...form, brand: e.target.value })}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                            placeholder="JUKI"
                                        />
                                    </Field>
                                    <Field label="Proses">
                                        <input
                                            value={form.process_name}
                                            onChange={(e) =>
                                                setForm({ ...form, process_name: e.target.value })
                                            }
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                            placeholder="Zigzag Plaket"
                                        />
                                    </Field>
                                    <Field label="Barcode (MESIN00x)">
                                        <input
                                            value={form.barcode}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    barcode: e.target.value.toUpperCase(),
                                                })
                                            }
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                            placeholder="MESIN002"
                                        />
                                    </Field>
                                    {gateQrUrl ? (
                                        <div className="sm:col-span-2 text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 break-all">
                                            <span className="font-semibold text-slate-700">Link QR cetak: </span>
                                            <span className="font-mono">{gateQrUrl}</span>
                                        </div>
                                    ) : null}
                                    <Field label="Branch">
                                        <input
                                            value={form.branch}
                                            onChange={(e) =>
                                                setForm({ ...form, branch: e.target.value.toUpperCase() })
                                            }
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                            placeholder="GM1"
                                        />
                                    </Field>
                                    <Field label="Line">
                                        <input
                                            value={form.line_name}
                                            onChange={(e) =>
                                                setForm({ ...form, line_name: e.target.value })
                                            }
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                            placeholder="Line 1"
                                        />
                                    </Field>
                                    <Field label="Location (opsional / legacy)">
                                        <input
                                            value={form.location_note}
                                            onChange={(e) =>
                                                setForm({ ...form, location_note: e.target.value })
                                            }
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                            placeholder="otomatis dari Branch · Line"
                                        />
                                    </Field>
                                    <Field label="KPI source">
                                        <select
                                            value={form.kpi_source}
                                            onChange={(e) =>
                                                setForm({ ...form, kpi_source: e.target.value })
                                            }
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        >
                                            <option value="esp">ESP master</option>
                                            <option value="telemetry">Backend / telemetry</option>
                                        </select>
                                    </Field>
                                    <Field label="Running ≥ (A)">
                                        <input
                                            type="number"
                                            step={0.01}
                                            value={form.current_threshold_a}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    current_threshold_a: Number(e.target.value),
                                                })
                                            }
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        />
                                    </Field>
                                    <Field label="Off < (A)">
                                        <input
                                            type="number"
                                            step={0.01}
                                            value={form.off_current_a}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    off_current_a: Number(e.target.value),
                                                })
                                            }
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        />
                                    </Field>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-3">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">Operator Default</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            NIK & nama tampil di Resume jika belum login harian (seperti kolom
                                            Operator di laporan).
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <Field label="NIK Operator">
                                            <input
                                                value={form.default_operator_nik}
                                                onChange={(e) =>
                                                    setForm({
                                                        ...form,
                                                        default_operator_nik: e.target.value,
                                                    })
                                                }
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                                placeholder="92501329"
                                            />
                                        </Field>
                                        <Field label="Nama Operator">
                                            <input
                                                value={form.default_operator_name}
                                                onChange={(e) =>
                                                    setForm({
                                                        ...form,
                                                        default_operator_name: e.target.value,
                                                    })
                                                }
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                                placeholder="AGUS FIRMANSYAH"
                                            />
                                        </Field>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">System Login</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                ON = operator wajib login harian. OFF = mesin langsung jalan (LCD
                                                running text 5 dtk).
                                            </p>
                                        </div>
                                        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                                            <button
                                                type="button"
                                                onClick={() => setForm({ ...form, login_required: true })}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                                                    form.login_required
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                            >
                                                On
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setForm({ ...form, login_required: false })}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                                                    !form.login_required
                                                        ? 'bg-slate-600 text-white'
                                                        : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                            >
                                                Off
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[11px] font-medium text-slate-600">
                                        Status:{" "}
                                        {form.login_required
                                            ? 'System Login Di Aktifkan'
                                            : 'System Login Non-Aktifkan'}
                                    </p>
                                </div>

                                <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                                    Ubah <strong>Machine Code</strong> / <strong>UID</strong> di sini → backend kirim
                                    MQTT <code className="font-mono">set_identity</code> ke ESP. Firmware dinamis
                                    menyimpan ke NVS dan ganti topic tanpa flash ulang (flash sekali dulu agar
                                    fitur ini aktif). Channel cadangan:{" "}
                                    <code className="font-mono">iot/gistex/dev/&#123;UID&#125;/cmd</code>.
                                </p>

                                {msg && (
                                    <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                                        {msg}
                                    </p>
                                )}
                                {err && (
                                    <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                        {err}
                                    </p>
                                )}

                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => void save()}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    Simpan & sync ESP
                                </button>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-400 text-sm">
                                Pilih mesin di kiri.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block text-xs font-semibold text-slate-500">
            {label}
            <div className="mt-1">{children}</div>
        </label>
    );
}

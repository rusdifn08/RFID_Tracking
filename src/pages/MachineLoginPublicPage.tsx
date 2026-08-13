import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Factory, Loader2, LogIn, UserRound, Wrench, AlertTriangle } from 'lucide-react';
import backgroundImage from '../assets/aksen.svg';
import {
    assignMachineShift,
    buildMachineLoginUrlFromMachine,
    fetchMachineByBarcode,
    fetchMachineByGate,
    normalizeMachineBarcode,
    type AssignShiftPayload,
} from '../components/machine-productivity/machineLoginUrl';
import type { MachineRow } from '../components/machine-productivity/types';
import { useAuth } from '../hooks/useAuth';

type ShiftMode = 'work' | 'broken' | 'maintenance';

type LoginResult = {
    machine: MachineRow;
    label: string;
    operatorNik: string;
    operatorName: string;
    shiftStatus: ShiftMode;
    garmentStyle: string;
    notes: string;
    at: string;
};

type SavedLoginDraft = {
    nik?: string;
    name?: string;
    garment_style?: string;
    notes?: string;
};

const inputBase =
    'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40';

/** Kosong = abu muda + teks suggestion; terisi = abu gelap + teks gelap */
function fieldClass(filled: boolean, extra = '') {
    if (filled) {
        return `${inputBase} border-slate-500 bg-slate-400 text-slate-900 placeholder:text-slate-600 ${extra}`;
    }
    return `${inputBase} border-slate-300 bg-slate-100 text-slate-500 placeholder:text-slate-400 ${extra}`;
}

function draftKey(machineId: string) {
    return `machine-login-draft:${machineId}`;
}

function loadDraft(machineId: string): SavedLoginDraft | null {
    try {
        const raw = localStorage.getItem(draftKey(machineId));
        if (!raw) return null;
        return JSON.parse(raw) as SavedLoginDraft;
    } catch {
        return null;
    }
}

function saveDraft(machineId: string, draft: SavedLoginDraft) {
    try {
        localStorage.setItem(draftKey(machineId), JSON.stringify(draft));
    } catch {
        /* ignore quota */
    }
}

export default function MachineLoginPublicPage() {
    const { barcode: barcodeParam, uid, slug } = useParams<{
        barcode?: string;
        uid?: string;
        slug?: string;
    }>();
    const barcode = barcodeParam ? normalizeMachineBarcode(barcodeParam) : null;
    const gateUid = uid?.trim() || null;
    const gateSlug = slug?.trim().toLowerCase() || null;
    const { user } = useAuth();

    const [machine, setMachine] = useState<MachineRow | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loadingMachine, setLoadingMachine] = useState(true);

    const [mode, setMode] = useState<ShiftMode>('work');
    const [nik, setNik] = useState('');
    const [opName, setOpName] = useState('');
    const [garmentStyle, setGarmentStyle] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [result, setResult] = useState<LoginResult | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoadingMachine(true);
        setLoadError(null);

        const load = async () => {
            if (gateUid) {
                return fetchMachineByGate(gateUid, gateSlug || undefined);
            }
            if (barcode) {
                return fetchMachineByBarcode(barcode);
            }
            throw new Error(
                'Link tidak valid. Scan QR /ops/ml/{UID} atau legacy /m/MESIN001.',
            );
        };

        void load()
            .then((m) => {
                if (cancelled) return;
                setMachine(m);
                const draft = loadDraft(m.id);
                setNik(
                    draft?.nik?.trim() ||
                        (m.default_operator_nik ?? '').trim() ||
                        user?.nik ||
                        '',
                );
                setOpName(
                    draft?.name?.trim() ||
                        (m.default_operator_name ?? '').trim() ||
                        user?.name ||
                        '',
                );
                setGarmentStyle(draft?.garment_style?.trim() || '');
                setNotes(draft?.notes?.trim() || '');
            })
            .catch((e) => {
                if (!cancelled) {
                    setMachine(null);
                    setLoadError(e instanceof Error ? e.message : 'Gagal memuat mesin');
                }
            })
            .finally(() => {
                if (!cancelled) setLoadingMachine(false);
            });

        return () => {
            cancelled = true;
        };
    }, [barcode, gateUid, gateSlug, user?.nik, user?.name]);

    const displayLabel =
        machine?.barcode ||
        (gateUid ? gateUid : barcode) ||
        machine?.code ||
        '—';

    const brandProses =
        [machine?.brand, machine?.process_name].filter((x) => (x ?? '').trim()).join(' ') ||
        machine?.name ||
        '—';

    const submitLogin = useCallback(async () => {
        if (!machine) return;
        const n = nik.trim();
        const nm = opName.trim();
        if (!n || !nm) {
            setSubmitError('NIK dan nama operator wajib diisi.');
            return;
        }
        if (mode === 'work' && !garmentStyle.trim()) {
            setSubmitError('Style garment wajib (contoh 1101494).');
            return;
        }
        if (mode !== 'work' && !notes.trim()) {
            setSubmitError('Catatan wajib untuk laporan rusak / maintenance.');
            return;
        }

        const payload: AssignShiftPayload = {
            nik: n,
            name: nm,
            shift_status: mode,
            notes: notes.trim() || undefined,
            garment_style: garmentStyle.trim() || undefined,
        };

        setSubmitting(true);
        setSubmitError(null);
        try {
            await assignMachineShift(machine.id, payload);
            // Simpan draft per mesin untuk login berikutnya
            saveDraft(machine.id, {
                nik: n,
                name: nm,
                garment_style: garmentStyle.trim(),
                notes: notes.trim(),
            });
            setResult({
                machine,
                label: displayLabel,
                operatorNik: n,
                operatorName: nm,
                shiftStatus: mode,
                garmentStyle: garmentStyle.trim(),
                notes: notes.trim(),
                at: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
            });
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : 'Gagal login mesin');
        } finally {
            setSubmitting(false);
        }
    }, [displayLabel, garmentStyle, machine, mode, nik, notes, opName]);

    const qrUrl = machine ? buildMachineLoginUrlFromMachine(machine) : '';

    return (
        <div
            className="min-h-[100dvh] max-h-[100dvh] overflow-y-auto overscroll-contain p-4 relative"
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <div className="fixed inset-0 bg-slate-900/40 pointer-events-none" />
            <div className="relative z-10 w-full max-w-md mx-auto py-4 pb-10">
                <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-white/60 p-6 space-y-4">
                    <div className="text-center space-y-1">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mb-1">
                            <Factory className="w-6 h-6" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-800" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            Login Mesin Harian
                        </h1>
                        <p className="text-xs text-slate-500">
                            Scan QR → isi operator + style garment, atau lapor rusak/maintenance.
                        </p>
                    </div>

                    {loadingMachine && (
                        <div className="flex items-center justify-center gap-2 text-slate-500 py-8">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Memuat data mesin…
                        </div>
                    )}

                    {loadError && !loadingMachine && (
                        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                            {loadError}
                        </p>
                    )}

                    {!loadingMachine && machine && !result && (
                        <>
                            <dl className="grid grid-cols-2 gap-2 text-sm bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <div className="col-span-2">
                                    <dt className="text-[11px] text-slate-400 uppercase tracking-wide">
                                        Brand + Proses
                                    </dt>
                                    <dd className="font-bold text-slate-800">{brandProses}</dd>
                                </div>
                                <div>
                                    <dt className="text-[11px] text-slate-400 uppercase tracking-wide">Location</dt>
                                    <dd className="font-semibold text-slate-700">
                                        {machine.branch || machine.line_name ? (
                                            <>
                                                <span>{machine.branch || '—'}</span>
                                                {machine.line_name ? (
                                                    <span className="block text-xs text-[#2563eb]">
                                                        {machine.line_name}
                                                    </span>
                                                ) : null}
                                            </>
                                        ) : (
                                            machine.location_note || '—'
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[11px] text-slate-400 uppercase tracking-wide">Label</dt>
                                    <dd className="font-mono text-xs text-slate-600 break-all">{displayLabel}</dd>
                                </div>
                            </dl>

                            <div className="grid grid-cols-3 gap-1.5">
                                {(
                                    [
                                        { id: 'work' as const, label: 'Login kerja', icon: LogIn },
                                        { id: 'broken' as const, label: 'Rusak', icon: AlertTriangle },
                                        { id: 'maintenance' as const, label: 'Maint.', icon: Wrench },
                                    ] as const
                                ).map(({ id, label, icon: Icon }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setMode(id)}
                                        className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-semibold ${
                                            mode === id
                                                ? id === 'work'
                                                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                                                    : id === 'broken'
                                                      ? 'border-rose-400 bg-rose-50 text-rose-800'
                                                      : 'border-amber-400 bg-amber-50 text-amber-800'
                                                : 'border-slate-200 text-slate-500'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-2.5">
                                <label className="block space-y-1">
                                    <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                                        <UserRound className="w-3.5 h-3.5" /> NIK
                                    </span>
                                    <input
                                        type="text"
                                        value={nik}
                                        onChange={(e) => setNik(e.target.value)}
                                        className={fieldClass(!!nik.trim())}
                                        autoComplete="username"
                                    />
                                </label>
                                <label className="block space-y-1">
                                    <span className="text-xs font-medium text-slate-600">Nama operator</span>
                                    <input
                                        type="text"
                                        value={opName}
                                        onChange={(e) => setOpName(e.target.value)}
                                        className={fieldClass(!!opName.trim())}
                                        autoComplete="name"
                                    />
                                </label>

                                {mode === 'work' && (
                                    <label className="block space-y-1">
                                        <span className="text-xs font-medium text-slate-600">
                                            Style garment *
                                        </span>
                                        <input
                                            type="text"
                                            value={garmentStyle}
                                            onChange={(e) => setGarmentStyle(e.target.value)}
                                            placeholder="1101494"
                                            className={fieldClass(!!garmentStyle.trim(), 'font-mono')}
                                        />
                                    </label>
                                )}

                                <label className="block space-y-1">
                                    <span className="text-xs font-medium text-slate-600">
                                        Catatan{mode !== 'work' ? ' *' : ' (opsional)'}
                                    </span>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={2}
                                        placeholder={
                                            mode === 'work'
                                                ? 'Masalah kecil, spare part, dll.'
                                                : 'Jelaskan kerusakan / pekerjaan maintenance'
                                        }
                                        className={fieldClass(!!notes.trim(), 'resize-none')}
                                    />
                                </label>
                            </div>

                            {qrUrl && (
                                <p className="text-[10px] text-slate-400 break-all">Link QR: {qrUrl}</p>
                            )}

                            {submitError && (
                                <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                    {submitError}
                                </p>
                            )}

                            <button
                                type="button"
                                disabled={submitting}
                                onClick={() => void submitLogin()}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan…
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="w-4 h-4" />
                                        {mode === 'work'
                                            ? 'Konfirmasi login kerja'
                                            : mode === 'broken'
                                              ? 'Kirim laporan rusak'
                                              : 'Kirim laporan maintenance'}
                                    </>
                                )}
                            </button>
                        </>
                    )}

                    {result && (
                        <div className="text-center space-y-3 py-2">
                            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
                            <h2 className="text-lg font-bold text-slate-800">Tersimpan</h2>
                            <p className="text-sm text-slate-500">
                                Data tersimpan di HP untuk mesin ini. Login berikutnya otomatis terisi.
                            </p>
                            <dl className="text-left text-sm bg-emerald-50/80 rounded-xl p-3 border border-emerald-100 space-y-1">
                                <div className="flex justify-between gap-2">
                                    <dt className="text-slate-500">Mesin</dt>
                                    <dd className="font-bold text-right">
                                        {[result.machine.brand, result.machine.process_name]
                                            .filter(Boolean)
                                            .join(' ') || result.machine.name}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-2">
                                    <dt className="text-slate-500">Mode</dt>
                                    <dd className="font-semibold capitalize">{result.shiftStatus}</dd>
                                </div>
                                {result.garmentStyle && (
                                    <div className="flex justify-between gap-2">
                                        <dt className="text-slate-500">Style</dt>
                                        <dd className="font-mono font-bold">{result.garmentStyle}</dd>
                                    </div>
                                )}
                                <div className="flex justify-between gap-2">
                                    <dt className="text-slate-500">Operator</dt>
                                    <dd className="font-semibold">
                                        {result.operatorName} ({result.operatorNik})
                                    </dd>
                                </div>
                                {result.notes && (
                                    <div className="flex justify-between gap-2">
                                        <dt className="text-slate-500">Catatan</dt>
                                        <dd className="text-right">{result.notes}</dd>
                                    </div>
                                )}
                                <div className="flex justify-between gap-2">
                                    <dt className="text-slate-500">Waktu</dt>
                                    <dd>{result.at}</dd>
                                </div>
                            </dl>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

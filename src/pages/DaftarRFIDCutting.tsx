import React, { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import backgroundImage from '../assets/background.jpg';
import {
    fetchGccCuttingListByBarcode,
    fetchGccCuttingBundlesList,
    extractGccCuttingBundlesData,
    filterGccBundlesByCreatedLocalDate,
    postGccCuttingBundleRegister,
    mapGccCuttingBundleRowToForm,
    mapGccCuttingPayloadToForm,
    type GccCuttingBundleRow,
    type GccCuttingFormFields,
} from '../config/api';
import { Camera, ChevronDown, PenLine, RefreshCw, Search } from 'lucide-react';

const CuttingLabelScanModal = lazy(() => import('../components/cutting/CuttingLabelScanModal'));

const emptyCuttingForm = (barcode = ''): GccCuttingFormFields => ({
    barcode,
    workOrder: '',
    style: '',
    buyer: '',
    item: '',
    color: '',
    size: '',
    bagian: '',
    noIkat: '',
    placing: '',
    season: '',
    country: '',
});

const ReadField = memo(({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
    <div className="flex flex-col transition-all duration-300">
        <label className="block text-[10px] xs:text-xs sm:text-sm font-semibold text-gray-700 mb-0.5 xs:mb-1">
            {label}
        </label>
        <div className="w-full min-h-[2rem] xs:min-h-[2.25rem] sm:min-h-[2.5rem] px-2 xs:px-2.5 sm:px-3 py-1.5 flex items-center text-[10px] xs:text-xs sm:text-sm md:text-base border-2 rounded-lg border-gray-200 bg-slate-50 text-gray-800 font-medium">
            <span className={`truncate ${mono ? 'font-mono' : ''}`} title={value || undefined}>
                {value || '—'}
            </span>
        </div>
    </div>
));

ReadField.displayName = 'ReadField';

const ModalFallback = memo(() => (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50" aria-busy="true">
        <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </div>
));

ModalFallback.displayName = 'ModalFallback';

function bundleOptionLabel(b: GccCuttingBundleRow): string {
    const bc = (b.barcode || '').trim();
    const wo = (b.wo || '').trim();
    const w = (b.warna || '').trim();
    const sz = (b.size || '').trim();
    const rf = (b.rfidBundles || '').trim();
    const tail = [w, sz].filter(Boolean).join('/');
    const parts = [bc, wo ? `WO ${wo}` : '', tail, rf ? `RFID ${rf}` : ''].filter(Boolean);
    return parts.join(' · ') || '—';
}

const DaftarRFIDCutting: React.FC = memo(() => {
    const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const [manualBarcode, setManualBarcode] = useState('');
    const [scanModalOpen, setScanModalOpen] = useState(false);
    const [cuttingForm, setCuttingForm] = useState<GccCuttingFormFields>(() => emptyCuttingForm());
    const [manualFetchError, setManualFetchError] = useState<string | null>(null);
    /** RFID garment — isi manual (biasanya kosong di bundle hingga didaftarkan). */
    const [manualRfid, setManualRfid] = useState('');
    const [registerBusy, setRegisterBusy] = useState(false);
    const [registerMessage, setRegisterMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [bundlesToday, setBundlesToday] = useState<GccCuttingBundleRow[]>([]);
    const [bundlesLoading, setBundlesLoading] = useState(false);
    const [bundlesError, setBundlesError] = useState<string | null>(null);
    const [bundleFilterDate, setBundleFilterDate] = useState(todayIso);
    const [bundleMenuOpen, setBundleMenuOpen] = useState(false);
    const [bundleSearch, setBundleSearch] = useState('');
    const [lastBundlePickLabel, setLastBundlePickLabel] = useState<string | null>(null);
    const bundlePickerRef = useRef<HTMLDivElement>(null);

    const loadBundlesByDate = useCallback(async (dateIso: string) => {
        setBundlesLoading(true);
        setBundlesError(null);
        try {
            const raw = await fetchGccCuttingBundlesList();
            const all = extractGccCuttingBundlesData(raw);
            const filterDate = dateIso ? new Date(`${dateIso}T00:00:00`) : new Date();
            setBundlesToday(filterGccBundlesByCreatedLocalDate(all, filterDate));
        } catch (e) {
            setBundlesToday([]);
            setBundlesError(e instanceof Error ? e.message : String(e));
        } finally {
            setBundlesLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadBundlesByDate(bundleFilterDate);
    }, [bundleFilterDate, loadBundlesByDate]);

    useEffect(() => {
        if (!bundleMenuOpen) return;
        const onDoc = (ev: MouseEvent) => {
            const el = bundlePickerRef.current;
            if (el && !el.contains(ev.target as Node)) {
                setBundleMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [bundleMenuOpen]);

    const filteredBundles = useMemo(() => {
        const q = bundleSearch.trim().toLowerCase();
        if (!q) return bundlesToday;
        return bundlesToday.filter((b) => {
            const hay = [
                b.barcode,
                b.wo,
                b.rfidBundles,
                b.warna,
                b.size,
                b.placing,
                b.style,
                b.country,
            ]
                .map((x) => (x != null ? String(x).toLowerCase() : ''))
                .join(' ');
            return hay.includes(q);
        });
    }, [bundlesToday, bundleSearch]);

    /** Isi seluruh form dari baris bundle API. */
    const onSelectBundle = useCallback((row: GccCuttingBundleRow) => {
        const rec = row as Record<string, unknown>;
        setCuttingForm(mapGccCuttingBundleRowToForm(rec));
        const bc = row.barcode != null ? String(row.barcode).trim() : '';
        setManualBarcode(bc);
        const rfExisting = row.rfidBundles != null ? String(row.rfidBundles).trim() : '';
        setManualRfid(rfExisting);
        setLastBundlePickLabel(bundleOptionLabel(row));
        setManualFetchError(null);
        setRegisterMessage(null);
        setBundleMenuOpen(false);
        setBundleSearch('');
    }, []);

    const loadByBarcode = useCallback(async (barcode: string) => {
        const trimmed = barcode.trim();
        if (!trimmed) {
            throw new Error('Barcode tidak boleh kosong');
        }
        setManualFetchError(null);
        const json = await fetchGccCuttingListByBarcode(trimmed);
        setCuttingForm(mapGccCuttingPayloadToForm(trimmed, json));
        setManualBarcode(trimmed);
        setLastBundlePickLabel(null);
        setManualRfid('');
        setRegisterMessage(null);
    }, []);

    const handleBarcodeFromScan = useCallback(
        async (barcode: string) => {
            await loadByBarcode(barcode);
        },
        [loadByBarcode]
    );

    const handleManualSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            try {
                await loadByBarcode(manualBarcode);
            } catch (err) {
                setManualFetchError(err instanceof Error ? err.message : String(err));
            }
        },
        [loadByBarcode, manualBarcode]
    );

    const handleInputRegister = useCallback(async () => {
        const rfid = manualRfid.trim();
        if (!rfid) {
            setRegisterMessage({ type: 'error', text: 'Isi RFID garment terlebih dahulu.' });
            return;
        }
        if (!cuttingForm.barcode.trim()) {
            setRegisterMessage({
                type: 'error',
                text: 'Data label belum lengkap. Ambil data barcode atau pilih bundle.',
            });
            return;
        }
        if (!cuttingForm.workOrder.trim()) {
            setRegisterMessage({ type: 'error', text: 'Work Order kosong — lengkapi data label terlebih dahulu.' });
            return;
        }
        setRegisterBusy(true);
        setRegisterMessage(null);
        try {
            const res = await postGccCuttingBundleRegister({
                rfid_garment: rfid,
                rfid_bundles: rfid,
                barcode: cuttingForm.barcode.trim(),
                wo: cuttingForm.workOrder.trim(),
                style: cuttingForm.style.trim() || '-',
                buyer: cuttingForm.buyer.trim() || '-',
                item: cuttingForm.item.trim() || cuttingForm.placing.trim() || '-',
                color: cuttingForm.color.trim() || '-',
                size: cuttingForm.size.trim() || '-',
                qty: 1,
            });
            if (res.success) {
                setRegisterMessage({ type: 'success', text: 'Input register RFID berhasil.' });
                setManualRfid('');
            } else {
                setRegisterMessage({
                    type: 'error',
                    text: (res as { error?: string }).error || 'Gagal input register.',
                });
            }
        } catch (err) {
            setRegisterMessage({
                type: 'error',
                text: err instanceof Error ? err.message : 'Gagal input register.',
            });
        } finally {
            setRegisterBusy(false);
        }
    }, [manualRfid, cuttingForm]);

    return (
        <div
            className="flex min-h-screen w-full h-screen font-sans text-gray-800 overflow-hidden fixed inset-0 m-0 p-0"
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        >
            <div className="fixed left-0 top-0 h-full z-50 shadow-xl">
                <Sidebar />
            </div>

            <div
                className="flex flex-col w-full min-h-screen transition-[margin,width] duration-300 ease-in-out"
                style={{
                    marginLeft: 'var(--layout-sidebar-offset)',
                    width: 'var(--layout-sidebar-width)',
                }}
            >
                <Header />
                <Breadcrumb />

                <main
                    className="flex-1 overflow-y-auto flex flex-col min-h-0"
                    style={{
                        padding: '1rem',
                        paddingTop: '0.5rem',
                        paddingBottom: '1.5rem',
                    }}
                >
                    <div className="w-full max-w-4xl mx-auto flex-1 min-h-0 flex flex-col">
                        <div className="rounded-2xl sm:rounded-3xl shadow-[0_18px_45px_rgba(15,23,42,0.12)] p-3 sm:p-5 md:p-6 relative overflow-visible w-full bg-white/95 backdrop-blur-sm border border-slate-200/70 flex flex-col gap-4 sm:gap-5">
                            <div
                                className="absolute inset-0 bg-gradient-to-br from-blue-500/8 via-cyan-500/5 to-transparent pointer-events-none opacity-70"
                                aria-hidden
                            />

                            <div className="relative flex items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-5 min-h-[44px]">
                                <div className="flex items-center gap-1.5 shrink-0 z-10">
                                    <label className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 shadow-sm w-fit">
                                        <input
                                            type="date"
                                            value={bundleFilterDate}
                                            onChange={(e) => setBundleFilterDate(e.target.value)}
                                            className="h-7 px-2 text-[10px] sm:text-xs border border-blue-300 rounded-md bg-white text-slate-700 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                                        />
                                    </label>
                                </div>
                                <h1 className="absolute left-1/2 -translate-x-1/2 text-center text-lg sm:text-2xl md:text-3xl font-extrabold text-slate-800 z-10 px-8 tracking-tight">
                                    Daftar RFID Cutting
                                </h1>
                                <button
                                    type="button"
                                    onClick={() => setScanModalOpen(true)}
                                    className="shrink-0 z-10 p-2.5 sm:p-3.5 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)] hover:shadow-[0_10px_24px_rgba(37,99,235,0.42)] transition-all duration-200 border border-blue-400/40 hover:-translate-y-[1px]"
                                    title="Scan label dengan kamera"
                                    aria-label="Buka kamera scan label"
                                >
                                    <Camera size={22} className="sm:w-6 sm:h-6" />
                                </button>
                            </div>

                            <p className="relative text-center text-[11px] sm:text-sm text-slate-500 mb-3 sm:mb-5 px-2">
                                Scan QR, ketik barcode lalu <strong>Ambil data</strong>, atau pilih bundle di kolom{' '}
                                <strong>Barcode label</strong> (sesuai tanggal filter — form terisi otomatis).
                            </p>

                            <form onSubmit={handleManualSubmit} className="relative space-y-3 shrink-0">
                                {manualFetchError && (
                                    <p className="text-xs sm:text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                                        {manualFetchError}
                                    </p>
                                )}
                                <div className="flex flex-col sm:flex-row gap-2.5">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            value={manualBarcode}
                                            onChange={(e) => setManualBarcode(e.target.value)}
                                            placeholder="Ketik barcode (mis. BD20260504-566275) lalu Enter"
                                            className="w-full pl-10 pr-3 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none bg-white shadow-sm"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 sm:py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold shrink-0 shadow-sm"
                                    >
                                        Ambil data
                                    </button>
                                </div>
                            </form>

                            <div className="relative rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3 sm:p-4 md:p-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div className="flex flex-col transition-all duration-300 min-w-0 sm:col-span-1">
                                        <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                                        Barcode label
                                        </label>
                                        <div ref={bundlePickerRef} className="relative overflow-visible">
                                            <div className="flex gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setBundleMenuOpen((o) => !o)}
                                                    className="flex-1 min-w-0 flex items-center gap-2 justify-between w-full min-h-[2.5rem] px-3 py-1.5 text-left text-[10px] xs:text-xs sm:text-sm border-2 border-gray-200 rounded-lg bg-slate-50 text-gray-800 font-medium hover:border-blue-400 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                                                >
                                                    <span
                                                        className={`truncate ${lastBundlePickLabel ? 'text-slate-900' : 'text-slate-400'}`}
                                                    >
                                                        {lastBundlePickLabel || 'Pilih bundle…'}
                                                    </span>
                                                    <ChevronDown
                                                        width={16}
                                                        height={16}
                                                        className={`shrink-0 text-slate-500 transition-transform ${bundleMenuOpen ? 'rotate-180' : ''}`}
                                                    />
                                                </button>
                                                <button
                                                    type="button"
                                                    title="Muat ulang daftar bundle sesuai tanggal filter"
                                                    onClick={() => void loadBundlesByDate(bundleFilterDate)}
                                                    disabled={bundlesLoading}
                                                    className="shrink-0 min-h-[2.5rem] px-2.5 rounded-lg border-2 border-gray-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:border-blue-300 disabled:opacity-50"
                                                >
                                                    <RefreshCw
                                                        width={16}
                                                        height={16}
                                                        className={bundlesLoading ? 'animate-spin' : ''}
                                                    />
                                                </button>
                                            </div>
                                            {bundlesError && (
                                                <p className="mt-1.5 text-[10px] sm:text-[11px] text-red-700">{bundlesError}</p>
                                            )}
                                            {bundleMenuOpen && (
                                                    <div className="absolute z-40 left-0 right-0 top-full mt-1 rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[min(280px,50vh)]">
                                                        <div className="p-2 border-b border-slate-100 shrink-0">
                                                            <div className="relative">
                                                                <Search
                                                                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                                                                    size={14}
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={bundleSearch}
                                                                    onChange={(e) => setBundleSearch(e.target.value)}
                                                                    placeholder="Cari barcode, WO, RFID…"
                                                                    className="w-full pl-8 pr-2 py-2 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none"
                                                                    autoFocus
                                                                />
                                                            </div>
                                                            <p className="mt-1 text-[10px] text-slate-500">
                                                                {filteredBundles.length} / {bundlesToday.length} bundle
                                                            </p>
                                                        </div>
                                                        <ul className="overflow-y-auto text-xs divide-y divide-slate-100">
                                                            {filteredBundles.length === 0 ? (
                                                                <li className="px-3 py-3 text-center text-slate-500">
                                                                    {bundlesToday.length === 0
                                                                        ? 'Tidak ada bundle pada tanggal ini.'
                                                                        : 'Tidak ada yang cocok.'}
                                                                </li>
                                                            ) : (
                                                                filteredBundles.map((b, idx) => (
                                                                    <li
                                                                        key={`${b.idBundles ?? 'x'}-${b.cuttingOrderBreakdownBundleId ?? 'x'}-${b.barcode ?? idx}`}
                                                                    >
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => onSelectBundle(b)}
                                                                            className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                                                                        >
                                                                            <span className="font-mono text-[11px] sm:text-xs text-slate-900 block truncate">
                                                                                {bundleOptionLabel(b)}
                                                                            </span>
                                                                        </button>
                                                                    </li>
                                                                ))
                                                            )}
                                                        </ul>
                                                    </div>
                                            )}
                                        </div>
                                    </div>

                                    <ReadField label="Work Order" value={cuttingForm.workOrder} />
                                    <ReadField label="No. Ikat" value={cuttingForm.noIkat} />
                                    <ReadField label="Placing / Meja" value={cuttingForm.placing} />

                                    <div className="flex flex-col transition-all duration-300 sm:col-span-2">
                                        <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                                            RFID garment
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete="off"
                                            value={manualRfid}
                                            onChange={(e) => {
                                                setManualRfid(e.target.value);
                                                setRegisterMessage(null);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    void handleInputRegister();
                                                }
                                            }}
                                            placeholder="Nomor RFID — kosongkan jika belum ada, lalu ketik sebelum Input Register"
                                            className="w-full min-h-[2.5rem] sm:min-h-[2.75rem] px-3 py-2 text-sm border rounded-xl border-amber-200 bg-amber-50/60 text-gray-900 font-mono focus:ring-4 focus:ring-amber-100 focus:border-amber-500 outline-none placeholder:text-slate-400 placeholder:font-sans shadow-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {registerMessage && (
                                <p
                                    className={`relative text-xs sm:text-sm rounded-xl px-3 py-2.5 mb-3 ${
                                        registerMessage.type === 'success'
                                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                                            : 'bg-red-50 text-red-800 border border-red-100'
                                    }`}
                                >
                                    {registerMessage.text}
                                </p>
                            )}

                            <div className="pt-1 sm:pt-2">
                            <button
                                type="button"
                                onClick={() => void handleInputRegister()}
                                disabled={registerBusy}
                                className="relative w-full py-3 sm:py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 disabled:pointer-events-none text-white font-extrabold rounded-xl shadow-[0_10px_24px_rgba(5,150,105,0.26)] hover:shadow-[0_14px_28px_rgba(5,150,105,0.30)] transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base tracking-wide"
                            >
                                <PenLine size={18} className="sm:w-5 sm:h-5 shrink-0" />
                                <span>{registerBusy ? 'Memproses…' : 'INPUT REGISTER'}</span>
                            </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {scanModalOpen && (
                <Suspense fallback={<ModalFallback />}>
                    <CuttingLabelScanModal
                        open={scanModalOpen}
                        onClose={() => setScanModalOpen(false)}
                        onBarcodeScanned={handleBarcodeFromScan}
                    />
                </Suspense>
            )}
        </div>
    );
});

DaftarRFIDCutting.displayName = 'DaftarRFIDCutting';

export default DaftarRFIDCutting;

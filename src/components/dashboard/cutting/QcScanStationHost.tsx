import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { ClipboardCheck, ClipboardList, Hash, Tag, User, Wrench } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import CuttingScanStationModal, { type CuttingScanAccent, type CuttingScanSessionRow } from './CuttingScanStationModal';
import {
    extractGccCuttingQcQty,
    getGccCuttingQcQty,
    getGccCuttingQcQtyRepair,
    postCuttingQcScan,
    postGccCuttingQcRepairGood,
    postGccCuttingQcRepairReject,
    type GccCuttingQcRepairActionData,
} from '../../../config/api';

export type QcScanMode = 'qc' | 'repair';

export interface QcLastScanDetail {
    rfid: string;
    wo?: string;
    good: string;
    repair: string;
    reject: string;
    qtyRepair?: number;
    actionLabel?: string;
}

function newCuttingScanRowId(): string {
    return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `qc-scan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readCuttingOperator(): { name: string; nik: string } {
    try {
        const raw = localStorage.getItem('user');
        if (!raw) return { name: '—', nik: '—' };
        const u = JSON.parse(raw) as { name?: string; nama?: string; nik?: string; NIK?: string };
        return { name: u.name ?? u.nama ?? '—', nik: String(u.nik ?? u.NIK ?? '—') };
    } catch {
        return { name: '—', nik: '—' };
    }
}

function LeftDetailRow({ icon: Icon, label, value, iconClass }: { icon: LucideIcon; label: string; value: string; iconClass: string }) {
    return (
        <div className="flex items-start gap-2 py-1.5 border-b border-slate-100/90 last:border-0">
            <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${iconClass}`} strokeWidth={2.2} />
            <div className="min-w-0 flex-1">
                <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">{label}</div>
                <div className="text-[11px] font-bold text-slate-800 truncate" title={value}>
                    {value}
                </div>
            </div>
        </div>
    );
}

type QcCountersPrompt = { open: boolean; rfid: string; qty: number; good: string; repair: string; reject: string };
type RepairDispatchPrompt = { open: boolean; rfid: string; qtyRepair: number };

const emptyCounters: QcCountersPrompt = { open: false, rfid: '', qty: 0, good: '0', repair: '0', reject: '0' };
const emptyRepair: RepairDispatchPrompt = { open: false, rfid: '', qtyRepair: 0 };

function detailFromRepairAction(rfid: string, qtyRepair: number, d: GccCuttingQcRepairActionData | undefined, actionLabel: string): QcLastScanDetail {
    return {
        rfid,
        wo: '—',
        good: d?.qty_good_after != null ? String(d.qty_good_after) : '—',
        repair: d?.qty_repair_after != null ? String(d.qty_repair_after) : '—',
        reject: d?.qty_reject != null ? String(d.qty_reject) : '—',
        qtyRepair,
        actionLabel,
    };
}

export interface QcScanStationHostProps {
    isOpen: boolean;
    onClose: () => void;
    accent?: CuttingScanAccent;
    /** Kunci mode (tanpa toggle) — untuk modal Scan QC Repair di dashboard QC */
    lockMode?: QcScanMode;
    /** Mode awal saat modal dibuka (jika tidak dikunci) */
    defaultMode?: QcScanMode;
    title?: string;
    subtitle?: string;
    stageBadge?: string;
    ringkasanLabel?: string;
    lastScanTitle?: string;
    /** Total scan di server (opsional, untuk ringkasan dashboard cutting) */
    serverScanTotal?: number;
}

export default function QcScanStationHost({
    isOpen,
    onClose,
    accent = 'sky',
    lockMode,
    defaultMode = 'qc',
    title,
    subtitle,
    stageBadge,
    ringkasanLabel,
    lastScanTitle = 'Detail Data Terakhir',
    serverScanTotal,
}: QcScanStationHostProps) {
    const queryClient = useQueryClient();
    const operator = useMemo(() => readCuttingOperator(), []);
    const isRepairAccent = accent === 'amber';

    const [scanMode, setScanMode] = useState<QcScanMode>(lockMode ?? defaultMode);
    const [modalRfid, setModalRfid] = useState('');
    const [sessionLog, setSessionLog] = useState<CuttingScanSessionRow[]>([]);
    const [busy, setBusy] = useState(false);
    const [lastDetail, setLastDetail] = useState<QcLastScanDetail | null>(null);
    const [qcPrompt, setQcPrompt] = useState<QcCountersPrompt>(emptyCounters);
    const [repairPrompt, setRepairPrompt] = useState<RepairDispatchPrompt>(emptyRepair);

    const effectiveMode = lockMode ?? scanMode;

    useEffect(() => {
        if (!isOpen) return;
        setScanMode(lockMode ?? defaultMode);
        setModalRfid('');
        setSessionLog([]);
        setQcPrompt(emptyCounters);
        setRepairPrompt(emptyRepair);
        setLastDetail(null);
        setBusy(false);
    }, [isOpen, lockMode, defaultMode]);

    const invalidateQueries = useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: ['cutting-scan-state'] });
        void queryClient.invalidateQueries({ queryKey: ['cutting-qc-dashboard'] });
        void queryClient.invalidateQueries({ queryKey: ['cutting-qc-dashboard-gcc'] });
    }, [queryClient]);

    const theme = isRepairAccent
        ? {
              border: 'border-orange-200',
              badge: 'bg-orange-500',
              badgeText: 'QC Repair',
              icon: 'text-orange-500',
              header: 'from-orange-600 to-amber-500',
              ring: 'border-orange-200',
              ringText: 'text-orange-700',
              ringBg: 'from-orange-50/90',
              form: 'border-orange-200 bg-orange-50/80 text-orange-900',
              btnActive: 'bg-orange-600 text-white border-orange-600',
              btnIdle: 'bg-white text-orange-800 border-orange-300 hover:bg-orange-50',
              popup: 'border-orange-200',
              popupTitle: 'text-orange-800',
              popupBtn: 'bg-orange-600 hover:bg-orange-700',
          }
        : {
              border: 'border-sky-200',
              badge: 'bg-sky-500',
              badgeText: 'QC',
              icon: 'text-sky-500',
              header: 'from-sky-600 to-sky-500',
              ring: 'border-sky-200',
              ringText: 'text-sky-600',
              ringBg: 'from-sky-50/90',
              form: 'border-sky-100 bg-sky-50/50 text-slate-600',
              btnActive: 'bg-sky-600 text-white border-sky-600',
              btnIdle: 'bg-white text-sky-800 border-sky-300 hover:bg-sky-50',
              popup: 'border-sky-200',
              popupTitle: 'text-sky-700',
              popupBtn: 'bg-sky-600 hover:bg-sky-700',
          };

    const setQcPromptByCounters = useCallback((repairNum: number, rejectNum: number) => {
        setQcPrompt((prev) => {
            const qty = Math.max(1, prev.qty || 1);
            const repairSafe = Math.max(0, Math.min(qty, repairNum));
            const rejectSafe = Math.max(0, Math.min(qty - repairSafe, rejectNum));
            const goodSafe = Math.max(0, qty - repairSafe - rejectSafe);
            return { ...prev, good: String(goodSafe), repair: String(repairSafe), reject: String(rejectSafe) };
        });
    }, []);

    const adjustQcPrompt = useCallback((field: 'repair' | 'reject', delta: number) => {
        setQcPrompt((prev) => {
            const qty = Math.max(1, prev.qty || 1);
            let repair = Math.max(0, parseInt(String(prev.repair).replace(/\D/g, ''), 10) || 0);
            let reject = Math.max(0, parseInt(String(prev.reject).replace(/\D/g, ''), 10) || 0);
            if (field === 'repair') repair += delta;
            else reject += delta;
            repair = Math.max(0, Math.min(qty, repair));
            reject = Math.max(0, Math.min(qty, reject));
            if (repair + reject > qty) {
                if (field === 'repair') reject = Math.max(0, qty - repair);
                else repair = Math.max(0, qty - reject);
            }
            const good = Math.max(0, qty - repair - reject);
            return { ...prev, good: String(good), repair: String(repair), reject: String(reject) };
        });
    }, []);

    const runScan = useCallback(async () => {
        const v = modalRfid.trim();
        if (!v) {
            window.alert('Scan atau ketik RFID lalu tekan Enter.');
            return;
        }
        setBusy(true);
        try {
            if (effectiveMode === 'repair') {
                const res = await getGccCuttingQcQtyRepair(v);
                if (!res.success) {
                    setSessionLog((prev) => [
                        { id: newCuttingScanRowId(), rfid: v, time: new Date(), ok: false, message: res.error || 'Gagal ambil qty repair' },
                        ...prev,
                    ]);
                    return;
                }
                const qtyRepair = Math.max(0, Number(res.data?.data?.qty_repair ?? 0));
                if (qtyRepair <= 0) {
                    setSessionLog((prev) => [
                        {
                            id: newCuttingScanRowId(),
                            rfid: v,
                            time: new Date(),
                            ok: false,
                            message: res.data?.message || 'Tidak ada qty repair untuk bundle ini',
                        },
                        ...prev,
                    ]);
                    return;
                }
                setRepairPrompt({ open: true, rfid: v, qtyRepair });
                return;
            }

            const qtyRes = await getGccCuttingQcQty(v);
            if (!qtyRes.success) {
                setSessionLog((prev) => [
                    { id: newCuttingScanRowId(), rfid: v, time: new Date(), ok: false, message: qtyRes.error || 'Gagal ambil qty QC' },
                    ...prev,
                ]);
                return;
            }
            const qty = extractGccCuttingQcQty(qtyRes.data);
            setQcPrompt({ open: true, rfid: v, qty, good: String(qty), repair: '0', reject: '0' });
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Gagal scan';
            setSessionLog((prev) => [{ id: newCuttingScanRowId(), rfid: v, time: new Date(), ok: false, message: msg }, ...prev]);
        } finally {
            setModalRfid('');
            setBusy(false);
        }
    }, [modalRfid, effectiveMode]);

    const confirmQcCounters = useCallback(async () => {
        const rid = qcPrompt.rfid;
        const qty = qcPrompt.qty;
        const good = Math.max(0, parseInt(String(qcPrompt.good).replace(/\D/g, ''), 10) || 0);
        const repair = Math.max(0, parseInt(String(qcPrompt.repair).replace(/\D/g, ''), 10) || 0);
        const reject = Math.max(0, parseInt(String(qcPrompt.reject).replace(/\D/g, ''), 10) || 0);
        if (good + repair + reject !== qty) {
            window.alert(`Total Good + Repair + Reject harus sama dengan Qty (${qty}).`);
            return;
        }
        setBusy(true);
        try {
            const nikOperator = operator.nik && operator.nik !== '—' ? operator.nik : '';
            const res = await postCuttingQcScan({ rfid_garment: rid, good, repair, reject, nik: nikOperator });
            if (!res.success) {
                setSessionLog((prev) => [
                    { id: newCuttingScanRowId(), rfid: rid, time: new Date(), ok: false, message: res.error || 'Gagal simpan QC' },
                    ...prev,
                ]);
                return;
            }
            invalidateQueries();
            setLastDetail({ rfid: rid, good: String(good), repair: String(repair), reject: String(reject), actionLabel: 'QC' });
            setSessionLog((prev) => [
                {
                    id: newCuttingScanRowId(),
                    rfid: rid,
                    time: new Date(),
                    ok: true,
                    message: `Good ${good} · Repair ${repair} · Reject ${reject}`,
                },
                ...prev,
            ]);
            setQcPrompt(emptyCounters);
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Gagal simpan QC';
            setSessionLog((prev) => [{ id: newCuttingScanRowId(), rfid: rid, time: new Date(), ok: false, message: msg }, ...prev]);
        } finally {
            setBusy(false);
        }
    }, [qcPrompt, operator.nik, invalidateQueries]);

    const submitRepairAction = useCallback(
        async (target: 'good' | 'reject') => {
            const { rfid, qtyRepair } = repairPrompt;
            if (!rfid || qtyRepair <= 0) return;
            setBusy(true);
            try {
                const nikOperator = operator.nik && operator.nik !== '—' ? operator.nik : '';
                const res =
                    target === 'good'
                        ? await postGccCuttingQcRepairGood({ rfid_bundles: rfid, qty: qtyRepair, nik: nikOperator })
                        : await postGccCuttingQcRepairReject({ rfid_bundles: rfid, qty: qtyRepair, nik: nikOperator });
                if (!res.success) {
                    setSessionLog((prev) => [
                        {
                            id: newCuttingScanRowId(),
                            rfid,
                            time: new Date(),
                            ok: false,
                            message: res.error || `Gagal Send To ${target === 'good' ? 'Good' : 'Reject'}`,
                        },
                        ...prev,
                    ]);
                    return;
                }
                const d = res.data?.data;
                const label = target === 'good' ? 'Send To Good' : 'Send To Reject';
                setLastDetail(detailFromRepairAction(rfid, qtyRepair, d, label));
                invalidateQueries();
                setSessionLog((prev) => [
                    {
                        id: newCuttingScanRowId(),
                        rfid,
                        time: new Date(),
                        ok: true,
                        message: `${label} · qty ${qtyRepair} · Good ${d?.qty_good_after ?? '—'} · Repair ${d?.qty_repair_after ?? '—'}`,
                    },
                    ...prev,
                ]);
                setRepairPrompt(emptyRepair);
            } catch (e) {
                const msg = e instanceof Error ? e.message : 'Gagal proses repair';
                setSessionLog((prev) => [{ id: newCuttingScanRowId(), rfid, time: new Date(), ok: false, message: msg }, ...prev]);
            } finally {
                setBusy(false);
            }
        },
        [repairPrompt, operator.nik, invalidateQueries]
    );

    const sessionSuccessCount = useMemo(() => sessionLog.filter((s) => s.ok).length, [sessionLog]);

    const displayDetail = useMemo((): QcLastScanDetail => {
        if (lastDetail) return lastDetail;
        const lastOk = sessionLog.find((s) => s.ok);
        const parsed = lastOk?.message?.match(/Good\s+(\d+)\s*·\s*Repair\s+(\d+)/);
        return {
            rfid: lastOk?.rfid ?? '—',
            wo: '—',
            good: parsed ? parsed[1] : '—',
            repair: parsed ? parsed[2] : '—',
            reject: '—',
        };
    }, [lastDetail, sessionLog]);

    const t = sessionLog.find((s) => s.ok)?.time ?? sessionLog[0]?.time;
    const timeStr = t
        ? t.toLocaleString('id-ID', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
          })
        : '—';

    const ringkasanValue = serverScanTotal != null ? serverScanTotal : sessionSuccessCount;
    const ringkasanSub =
        serverScanTotal != null
            ? `Total ${ringkasanValue} scan QC (server)`
            : `${ringkasanValue} bundle tersimpan (sesi ini)`;

    const modalTitle =
        title ?? (isRepairAccent ? 'Station QC Repair' : 'Station Quality Control');
    const modalSubtitle =
        subtitle ?? (isRepairAccent ? 'Scan RFID · Send To Good / Reject' : 'Scan RFID');
    const badge = stageBadge ?? (isRepairAccent ? 'QC Repair' : 'Quality Control');

    const formSection = (
        <div className="space-y-2">
            {!lockMode ? (
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setScanMode('qc')}
                        className={`flex-1 min-w-[7rem] rounded-lg border-2 px-3 py-2 text-xs font-bold transition ${
                            effectiveMode === 'qc' ? theme.btnActive : theme.btnIdle
                        }`}
                    >
                        SCAN QC
                    </button>
                    <button
                        type="button"
                        onClick={() => setScanMode('repair')}
                        className={`flex-1 min-w-[7rem] rounded-lg border-2 px-3 py-2 text-xs font-bold transition ${
                            effectiveMode === 'repair'
                                ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                                : 'bg-white text-orange-800 border-orange-300 hover:bg-orange-50'
                        }`}
                    >
                        SCAN Repair
                    </button>
                </div>
            ) : null}
            <div className={`text-[10px] rounded-lg border px-2.5 py-2 ${theme.form}`}>
                {effectiveMode === 'repair' ? (
                    <>
                        Mode <span className="font-bold">SCAN Repair</span>: setelah scan valid, qty repair dari API ditampilkan.
                        Pilih <span className="font-bold">Send To Good</span> atau <span className="font-bold">Send To Reject</span>.
                    </>
                ) : (
                    <>
                        Mode <span className="font-bold">SCAN QC</span>: scan RFID bundle lalu atur Good / Repair / Reject (total = qty bundle).
                    </>
                )}
            </div>
        </div>
    );

    const leftColumn = (
        <>
            <div className={`rounded-xl border-2 ${theme.border}/90 bg-white p-3 shadow-sm`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className={`flex items-center gap-1.5 ${isRepairAccent ? 'text-orange-800' : 'text-sky-700'}`}>
                        <User className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Operator</span>
                    </div>
                    <span className={`text-[9px] font-bold text-white ${theme.badge} px-2 py-0.5 rounded-full shrink-0`}>{theme.badgeText}</span>
                </div>
                <div className="text-sm font-bold text-slate-900 leading-tight break-words">{operator.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">NIK: {operator.nik}</div>
            </div>

            <div className={`rounded-xl border-2 ${theme.ring} bg-gradient-to-br ${theme.ringBg} to-white p-3 shadow-sm`}>
                <div className={`text-[10px] font-bold uppercase tracking-wider ${theme.ringText} mb-1`}>
                    {ringkasanLabel ?? 'Ringkasan'}
                </div>
                <div className="text-2xl font-extrabold text-slate-900 leading-none tabular-nums">{ringkasanValue}</div>
                <div className="text-[10px] text-slate-500 mt-1">{ringkasanSub}</div>
            </div>

            <div className={`rounded-xl border ${theme.ring} overflow-hidden bg-white shadow-sm`}>
                <div className={`flex items-center justify-between gap-2 px-2.5 py-2 bg-gradient-to-r ${theme.header} text-white`}>
                    <div className="flex items-center gap-1.5 min-w-0">
                        <ClipboardList className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                        <span className="text-[10px] font-bold truncate">{lastScanTitle}</span>
                    </div>
                    <span className="text-[9px] font-mono shrink-0 opacity-95">{timeStr}</span>
                </div>
                <div className="p-2.5">
                    <LeftDetailRow icon={Hash} label="# RFID" value={displayDetail.rfid} iconClass={theme.icon} />
                    <LeftDetailRow icon={Tag} label="WO" value={displayDetail.wo ?? '—'} iconClass={theme.icon} />
                    {displayDetail.qtyRepair != null && displayDetail.qtyRepair > 0 ? (
                        <LeftDetailRow icon={Wrench} label="QTY REPAIR" value={String(displayDetail.qtyRepair)} iconClass={theme.icon} />
                    ) : null}
                    <LeftDetailRow icon={ClipboardCheck} label="GOOD" value={displayDetail.good} iconClass={theme.icon} />
                    <LeftDetailRow icon={Wrench} label="REPAIR" value={displayDetail.repair} iconClass={theme.icon} />
                    <LeftDetailRow icon={ClipboardCheck} label="REJECT" value={displayDetail.reject} iconClass={theme.icon} />
                    {displayDetail.actionLabel ? (
                        <LeftDetailRow icon={ClipboardList} label="AKSI" value={displayDetail.actionLabel} iconClass={theme.icon} />
                    ) : null}
                </div>
            </div>
        </>
    );

    const handleClose = () => {
        if (busy) return;
        setQcPrompt(emptyCounters);
        setRepairPrompt(emptyRepair);
        onClose();
    };

    return (
        <>
            <CuttingScanStationModal
                isOpen={isOpen}
                onClose={handleClose}
                title={modalTitle}
                subtitle={modalSubtitle}
                accent={accent}
                stageBadge={badge}
                busy={busy}
                leftColumn={leftColumn}
                formSection={formSection}
                rfidValue={modalRfid}
                onRfidChange={setModalRfid}
                onRfidSubmit={() => void runScan()}
                sessionItems={sessionLog}
            />

            {isOpen && qcPrompt.open && typeof document !== 'undefined'
                ? createPortal(
                <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-slate-900/45 backdrop-blur-[1px] p-3">
                    <div className={`w-full max-w-md rounded-2xl border ${theme.popup} bg-white shadow-2xl p-4`}>
                        <h3 className={`text-sm font-extrabold ${theme.popupTitle}`}>Input Hasil Quality Control</h3>
                        <p className="mt-1 text-[11px] text-slate-600">
                            RFID <span className="font-mono font-bold text-slate-800">{qcPrompt.rfid}</span> · Qty Bundle{' '}
                            <span className="font-bold">{qcPrompt.qty}</span>
                        </p>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Good</label>
                                <div className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-slate-50 text-slate-800 font-bold tabular-nums">
                                    {qcPrompt.good}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Repair</label>
                                <div className="flex items-center gap-1">
                                    <button type="button" onClick={() => adjustQcPrompt('repair', -1)} className="h-7 w-7 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">-</button>
                                    <input
                                        type="number"
                                        min={0}
                                        value={qcPrompt.repair}
                                        onChange={(e) => {
                                            const nextRepair = Math.max(0, parseInt(String(e.target.value).replace(/\D/g, ''), 10) || 0);
                                            const keepReject = Math.max(0, parseInt(String(qcPrompt.reject).replace(/\D/g, ''), 10) || 0);
                                            setQcPromptByCounters(nextRepair, keepReject);
                                        }}
                                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-center tabular-nums"
                                    />
                                    <button type="button" onClick={() => adjustQcPrompt('repair', 1)} className="h-7 w-7 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">+</button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Reject</label>
                                <div className="flex items-center gap-1">
                                    <button type="button" onClick={() => adjustQcPrompt('reject', -1)} className="h-7 w-7 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">-</button>
                                    <input
                                        type="number"
                                        min={0}
                                        value={qcPrompt.reject}
                                        onChange={(e) => {
                                            const keepRepair = Math.max(0, parseInt(String(qcPrompt.repair).replace(/\D/g, ''), 10) || 0);
                                            const nextReject = Math.max(0, parseInt(String(e.target.value).replace(/\D/g, ''), 10) || 0);
                                            setQcPromptByCounters(keepRepair, nextReject);
                                        }}
                                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-center tabular-nums"
                                    />
                                    <button type="button" onClick={() => adjustQcPrompt('reject', 1)} className="h-7 w-7 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">+</button>
                                </div>
                            </div>
                        </div>
                        <p className="mt-2 text-[10px] text-slate-500">Total Good + Repair + Reject harus sama dengan Qty Bundle.</p>
                        <div className="mt-3 flex items-center justify-end gap-2">
                            <button type="button" onClick={() => setQcPrompt(emptyCounters)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" disabled={busy}>
                                Batal
                            </button>
                            <button type="button" onClick={() => void confirmQcCounters()} className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 ${theme.popupBtn}`} disabled={busy}>
                                OK
                            </button>
                        </div>
                    </div>
                </div>,
                  document.body,
              )
                : null}

            {isOpen && repairPrompt.open && typeof document !== 'undefined'
                ? createPortal(
                <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-slate-900/45 backdrop-blur-[1px] p-3">
                    <div className={`w-full max-w-md rounded-2xl border ${theme.popup} bg-white shadow-2xl p-4`}>
                        <h3 className={`text-sm font-extrabold ${theme.popupTitle}`}>Qty Repair</h3>
                        <p className="mt-1 text-[11px] text-slate-600">
                            RFID <span className="font-mono font-bold text-slate-800">{repairPrompt.rfid}</span>
                        </p>
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                            <div className="text-[10px] font-semibold uppercase text-slate-500">Qty Repair</div>
                            <div className="text-3xl font-extrabold text-slate-900 tabular-nums">{repairPrompt.qtyRepair}</div>
                        </div>
                        <p className="mt-2 text-[10px] text-slate-500 text-center">Pilih tujuan untuk qty repair ini.</p>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => void submitRepairAction('good')}
                                disabled={busy}
                                className="rounded-xl border-2 border-emerald-400 bg-emerald-500 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-60"
                            >
                                Send To Good
                            </button>
                            <button
                                type="button"
                                onClick={() => void submitRepairAction('reject')}
                                disabled={busy}
                                className="rounded-xl border-2 border-rose-400 bg-rose-500 px-4 py-3 text-sm font-bold text-white hover:bg-rose-600 disabled:opacity-60"
                            >
                                Send To Reject
                            </button>
                        </div>
                        <div className="mt-3 flex justify-end">
                            <button type="button" onClick={() => setRepairPrompt(emptyRepair)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" disabled={busy}>
                                Batal
                            </button>
                        </div>
                    </div>
                </div>,
                document.body,
            )
                : null}
        </>
    );
}

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
    PackagePlus,
    ClipboardCheck,
    Warehouse,
    Truck,
    ScanLine,
    User,
    ClipboardList,
    Hash,
    Tag,
    Box,
    Users,
    Palette,
    Ruler,
    Minus,
    Plus,
} from 'lucide-react';
import {
    inputRfidCuttingBundle,
    getCuttingScanState,
    filterCuttingScanStateToLocalToday,
    postCuttingStoreScan,
    postCuttingSupplySewingScan,
    getHomeDashboard,
    type HomeDashboardItem,
} from '../../../config/api';
import { SUPPLY_SEWING_ENABLED } from '../../../config/comingsoon';
import ChartCard from '../ChartCard';
import CuttingScanStationModal, { type CuttingScanSessionRow } from './CuttingScanStationModal';
import QcScanStationHost from './QcScanStationHost';

const QUERY_SCAN = ['cutting-scan-state'] as const;
const QUERY_HOME_DASH = ['cutting-home-dashboard'] as const;

/** Normalisasi `last_status` dari GET `/api/homedashboard` untuk perbandingan. */
function normCuttingLastStatus(s: unknown): string {
    return String(s ?? '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '_');
}

/** Urutan "kemajuan" status untuk fallback jika tidak ada petunjuk di baris klik. */
const HOME_STATUS_RANK: Record<string, number> = {
    OUTPUT_BUNDLE: 10,
    GOOD: 20,
    REPAIR: 20,
    REJECT: 20,
    IN_SMARKET: 30,
    OUT_SMARKET: 40,
    IN_SUPERMARKET: 30,
    OUT_SUPERMARKET: 40,
};

function pickLatestHomeDashboardItem(items: HomeDashboardItem[]): HomeDashboardItem {
    return items.reduce((best, cur) => {
        const sb = HOME_STATUS_RANK[normCuttingLastStatus(best.last_status)] ?? 0;
        const sc = HOME_STATUS_RANK[normCuttingLastStatus(cur.last_status)] ?? 0;
        return sc >= sb ? cur : best;
    });
}

/**
 * API bisa mengembalikan banyak baris untuk RFID yang sama (riwayat status).
 * Jangan pakai Map(rfid) — ambil objek yang sama dengan baris tabel (last_status / barcode / id_bundles).
 */
function findHomeDashboardItemForDetail(
    items: HomeDashboardItem[] | undefined,
    row: CuttingTableRow,
): HomeDashboardItem | undefined {
    if (!items?.length) return undefined;
    const rfid = String(row.rfid ?? '').trim();
    if (!rfid) return undefined;

    const same = items.filter((it) => String(it.rfid_bundles ?? '').trim() === rfid);
    if (same.length === 0) return undefined;
    if (same.length === 1) return same[0];

    const rowStatus = normCuttingLastStatus(row.last_status);
    const rowBarcode = String(row.barcode ?? '').trim();
    const rowIdRaw = row.id_bundles;
    const rowIdNum =
        rowIdRaw != null && rowIdRaw !== '' && !Number.isNaN(Number(rowIdRaw)) ? Number(rowIdRaw) : NaN;

    if (rowStatus) {
        const bySt = same.filter((it) => normCuttingLastStatus(it.last_status) === rowStatus);
        if (bySt.length === 1) return bySt[0];
        if (bySt.length > 1) {
            if (rowBarcode) {
                const byBc = bySt.filter((it) => String(it.barcode ?? '').trim() === rowBarcode);
                if (byBc.length >= 1) return byBc[0];
            }
            if (Number.isFinite(rowIdNum)) {
                const byId = bySt.filter((it) => Number(it.id_bundles) === rowIdNum);
                if (byId.length >= 1) return byId[0];
            }
            return bySt[0];
        }
    }

    return pickLatestHomeDashboardItem(same);
}

function mapHomeItemToBundleRow(item: HomeDashboardItem) {
    const qty = Math.max(1, Number(item.qty_batch ?? 1));
    return {
        rfid: item.rfid_bundles ?? '—',
        wo: item.wo ?? '—',
        qty,
        style: item.style ?? '—',
        buyer: '—',
        item: '—',
        color: item.warna ?? '—',
        size: item.size ?? '—',
        location: 'bundle',
        timestamp: item.barcode ?? '—',
        last_status: item.last_status,
        id_bundles: item.id_bundles,
        barcode: item.barcode,
    };
}

function mapHomeItemToQcRow(item: HomeDashboardItem) {
    const qty = Math.max(1, Number(item.qty_batch ?? 1));
    const st = normCuttingLastStatus(item.last_status);
    let good = 0;
    let repair = 0;
    let reject = 0;
    if (st === 'GOOD') good = qty;
    else if (st === 'REPAIR') repair = qty;
    else if (st === 'REJECT') reject = qty;
    return {
        rfid: item.rfid_bundles ?? '—',
        qty,
        good,
        repair,
        reject,
        wo: item.wo ?? '—',
        style: item.style ?? '—',
        buyer: '—',
        item: '—',
        color: item.warna ?? '—',
        size: item.size ?? '—',
        location: 'quality_control',
        timestamp: item.barcode ?? '—',
        last_status: item.last_status,
        id_bundles: item.id_bundles,
        barcode: item.barcode,
    };
}

function mapHomeItemToStoreRow(item: HomeDashboardItem) {
    const qty = Math.max(1, Number(item.qty_batch ?? 1));
    const st = normCuttingLastStatus(item.last_status);
    const lokasi =
        st === 'IN_SMARKET' || st === 'IN_SUPERMARKET'
            ? 'Masuk Supermarket'
            : st === 'OUT_SMARKET' || st === 'OUT_SUPERMARKET'
              ? 'Keluar Supermarket'
              : String(item.lokasi ?? item.last_status ?? '—');
    const lineStr =
        item.line != null && String(item.line).trim() !== '' ? String(item.line) : '—';
    return {
        rfid: item.rfid_bundles ?? '—',
        wo: item.wo ?? '—',
        qty,
        line: lineStr,
        lokasi,
        style: item.style ?? '—',
        buyer: '—',
        item: '—',
        color: item.warna ?? '—',
        size: item.size ?? '—',
        location: 'supermarket',
        timestamp: item.barcode ?? '—',
        last_status: item.last_status,
        id_bundles: item.id_bundles,
        barcode: item.barcode,
    };
}

/** Field detail modal dari satu baris respons GET `/api/homedashboard`. */
function homeDashboardItemToFields(
    item: HomeDashboardItem,
    fmt: (v: unknown) => string
): { label: string; value: string }[] {
    const order: { key: string; label: string }[] = [
        { key: 'rfid_bundles', label: 'RFID Bundle' },
        { key: 'id_bundles', label: 'ID Bundles' },
        { key: 'barcode', label: 'Barcode' },
        { key: 'last_status', label: 'Last Status' },
        { key: 'wo', label: 'WO' },
        { key: 'style', label: 'Style' },
        { key: 'warna', label: 'Warna' },
        { key: 'size', label: 'Size' },
        { key: 'qty_batch', label: 'Qty Batch' },
        { key: 'line', label: 'Line' },
        { key: 'lokasi', label: 'Lokasi' },
    ];
    const shown = new Set<string>();
    const out: { label: string; value: string }[] = [];
    for (const { key, label } of order) {
        shown.add(key);
        const v = (item as Record<string, unknown>)[key];
        const s = fmt(v);
        if (s !== '—') out.push({ label, value: s });
    }
    for (const [k, v] of Object.entries(item)) {
        if (shown.has(k)) continue;
        if (typeof v === 'object' && v !== null) continue;
        const s = fmt(v);
        if (s === '—') continue;
        const pretty = k
            .split('_')
            .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : ''))
            .join(' ');
        out.push({ label: pretty || k, value: s });
    }
    return out;
}

const STORE_FORM_FS = 'clamp(0.65rem, 0.52rem + 0.38vmin, 0.82rem)' as const;
const STORE_FORM_LABEL_FS = 'clamp(0.58rem, 0.48rem + 0.28vmin, 0.72rem)' as const;

const successSoundPath = '/assets/succes.mp3';
const errorSoundPath = '/assets/error.mp3';

function newCuttingScanRowId(): string {
    return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `cut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readCuttingOperator(): { name: string; nik: string } {
    try {
        const raw = localStorage.getItem('user');
        if (!raw) return { name: '—', nik: '—' };
        const u = JSON.parse(raw) as { name?: string; nama?: string; nik?: string; NIK?: string };
        const name = u.name ?? u.nama ?? '—';
        const nik = String(u.nik ?? u.NIK ?? '—');
        return { name, nik };
    } catch {
        return { name: '—', nik: '—' };
    }
}

/** Judul kartu ala ChartCard — tanpa capitalize otomatis agar singkatan (mis. QC Cutting) tetap benar. */
function CuttingStageTitle({ children }: { children: string }) {
    return (
        <h2
            className="font-semibold text-gray-900 tracking-tight group-hover:text-blue-700 transition-colors flex-1 min-w-0 truncate"
            style={{ fontSize: 'clamp(0.875rem, 1.2vw + 0.5rem, 1.125rem)', fontWeight: 600 }}
        >
            {children}
        </h2>
    );
}

function CuttingStageHeader({ title, action }: { title: string; action: ReactNode }) {
    return (
        <div className="flex w-full min-w-0 items-center justify-between gap-2">
            <CuttingStageTitle>{title}</CuttingStageTitle>
            <div className="flex shrink-0 items-center self-center">{action}</div>
        </div>
    );
}

const CUTTING_STAGE_CHART_CARD_CLASS =
    'min-h-0 h-full flex flex-col py-1.5 bg-gradient-to-b from-white via-white to-sky-50/20 shadow-[0_10px_22px_rgba(2,132,199,0.08)] hover:shadow-[0_14px_28px_rgba(2,132,199,0.15)] transition-all duration-300 max-lg:h-auto max-lg:min-h-[12.5rem] max-lg:flex-none';

type ScanningModalId = 'bundle' | 'qc' | 'store' | 'supply';

function ScanningButton({
    accent,
    onClick,
}: {
    accent: 'emerald' | 'sky' | 'amber' | 'violet';
    onClick: () => void;
}) {
    const cls =
        accent === 'emerald'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200/90 hover:bg-emerald-100'
            : accent === 'sky'
              ? 'bg-sky-50 text-sky-800 border-sky-200/90 hover:bg-sky-100'
              : accent === 'amber'
                ? 'bg-amber-50 text-amber-900 border-amber-200/90 hover:bg-amber-100'
                : 'bg-violet-50 text-violet-900 border-violet-200/90 hover:bg-violet-100';
    return (
        <button
            type="button"
            onClick={(e) => {
                // Mencegah klik tombol Scan memicu onClick kartu parent (navigasi dashboard QC).
                e.stopPropagation();
                onClick();
            }}
            className={`inline-flex items-center gap-1.5 font-semibold tracking-wide px-2.5 py-1 rounded-md border shadow-[0_1px_3px_rgba(2,6,23,0.08)] shrink-0 transition-all duration-300 hover:-translate-y-[1px] ${cls}`}
            style={{
                fontFamily: 'Poppins, sans-serif',
                fontSize: 'clamp(0.64rem, 0.82vw + 0.34rem, 0.79rem)',
            }}
        >
            <ScanLine className="w-3.5 h-3.5" strokeWidth={2.4} />
            <span>Scan</span>
        </button>
    );
}

type CuttingTableRow = Record<string, string | number | null | undefined>;

function parseTableRowTime(ts: unknown): number {
    if (ts == null || ts === '' || ts === '—') return 0;
    const d = new Date(String(ts));
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

/** Data terbaru di atas: urut timestamp `at` / kolom timestamp, lalu id_bundles. */
function sortTableRowsNewestFirst(rows: CuttingTableRow[]): CuttingTableRow[] {
    return [...rows].sort((a, b) => {
        const tb = parseTableRowTime(b.timestamp);
        const ta = parseTableRowTime(a.timestamp);
        if (tb !== ta) return tb - ta;
        const idB = Number(b.id_bundles) || 0;
        const idA = Number(a.id_bundles) || 0;
        return idB - idA;
    });
}

function WireTable({
    columns,
    rows,
    emptyText,
    onRowClick,
    showRowNo = true,
}: {
    columns: { key: string; label: string; className?: string }[];
    rows: CuttingTableRow[];
    emptyText: string;
    onRowClick?: (row: CuttingTableRow) => void;
    showRowNo?: boolean;
}) {
    const colSpan = columns.length + (showRowNo ? 1 : 0);
    return (
        <div
            className="flex-1 min-h-0 max-lg:min-h-[9rem] overflow-auto rounded-b-xl touch-pan-y"
            onClick={(e) => {
                /* Bubble phase: jangan pakai onClickCapture + stopPropagation — itu memblokir event sampai ke <tr>.
                   Hentikan bubble ke ChartCard (navigasi QC/Supermarket) setelah target menangani klik. */
                const target = e.target as HTMLElement | null;
                if (target?.closest('table, thead, tbody, tr, th, td')) {
                    e.stopPropagation();
                }
            }}
        >
            <table className="w-full text-left border-collapse text-[10px] bg-white">
                <thead className="bg-gradient-to-r from-sky-50/70 to-white sticky top-0 z-[1] backdrop-blur-sm">
                    <tr className="border-b border-sky-100">
                        {showRowNo && (
                            <th className="px-1 py-1 w-8 min-w-[2rem] font-semibold text-slate-500 uppercase tracking-wide text-center">
                                No
                            </th>
                        )}
                        {columns.map((c) => (
                            <th
                                key={c.key}
                                className={`px-1.5 py-1 font-semibold text-slate-500 uppercase tracking-wide ${c.className ?? ''}`}
                            >
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={colSpan} className="px-2 py-4 text-center text-slate-400 italic">
                                {emptyText}
                            </td>
                        </tr>
                    ) : (
                        rows.map((row, i) => (
                            <tr
                                key={i}
                                className={`border-b border-slate-100/80 hover:bg-sky-50/60 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                                onClick={
                                    onRowClick
                                        ? (e) => {
                                              e.stopPropagation();
                                              onRowClick(row);
                                          }
                                        : undefined
                                }
                                title={onRowClick ? 'Klik untuk lihat detail data' : undefined}
                            >
                                {showRowNo && (
                                    <td className="px-1 py-1 text-center text-slate-600 font-bold tabular-nums text-[10px] w-8 min-w-[2rem]">
                                        {rows.length - i}
                                    </td>
                                )}
                                {columns.map((c) => (
                                    <td key={c.key} className={`px-1.5 py-1 text-slate-700 truncate max-w-0 ${c.className ?? ''}`} title={String(row[c.key] ?? '')}>
                                        {row[c.key] ?? '—'}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

function LeftDetailRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
    return (
        <div className="flex items-start gap-2 py-1.5 border-b border-slate-100/90 last:border-0">
            <Icon className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" strokeWidth={2.2} />
            <div className="min-w-0 flex-1">
                <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">{label}</div>
                <div className="text-[11px] font-bold text-slate-800 truncate" title={value}>
                    {value}
                </div>
            </div>
        </div>
    );
}

const CuttingProcessSection = memo(function CuttingProcessSection({
    onBundleMetrics,
    filterTablesToToday = false,
    homeDashboardApi = false,
    onHomeDashboardCounts,
}: {
    /** Untuk grafik distribusi: jumlah baris bundle tersimpan */
    onBundleMetrics?: (bundleTableRows: number) => void;
    /** Jika true (dashboard cutting), tabel hanya menampilkan entri yang `at`-nya hari ini (lokal) — diabaikan jika `homeDashboardApi`. */
    filterTablesToToday?: boolean;
    /** Data tabel dari GET `/api/homedashboard` (command center cutting). */
    homeDashboardApi?: boolean;
    /** Untuk donut chart induk: hitungan bundle / QC / supermarket dari API yang sama. */
    onHomeDashboardCounts?: (c: { bundle: number; qc: number; store: number }) => void;
}) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const successAudioRef = useRef<HTMLAudioElement | null>(null);
    const errorAudioRef = useRef<HTMLAudioElement | null>(null);
    const scanQuery = useQuery({
        queryKey: QUERY_SCAN,
        queryFn: async () => {
            const r = await getCuttingScanState();
            if (!r.success || !r.data) throw new Error(r.error || 'Gagal state');
            return r.data;
        },
        refetchInterval: 12_000,
    });
    const homeDashQuery = useQuery({
        queryKey: QUERY_HOME_DASH,
        queryFn: async () => {
            const r = await getHomeDashboard();
            if (!r.success || !r.data) throw new Error(r.error || 'Gagal memuat home dashboard');
            return r.data;
        },
        enabled: homeDashboardApi,
        refetchInterval: 12_000,
    });
    const doc = scanQuery.data;
    const displayDoc = useMemo(() => {
        if (!doc) return undefined;
        if (!filterTablesToToday || homeDashboardApi) return doc;
        return filterCuttingScanStateToLocalToday(doc);
    }, [doc, filterTablesToToday, homeDashboardApi]);

    useEffect(() => {
        if (!homeDashboardApi || !onHomeDashboardCounts || !homeDashQuery.data) return;
        const items = homeDashQuery.data;
        const qcStatuses = new Set(['GOOD', 'REPAIR', 'REJECT']);
        const storeStatuses = new Set(['IN_SMARKET', 'OUT_SMARKET', 'IN_SUPERMARKET', 'OUT_SUPERMARKET']);
        let bundle = 0;
        let qc = 0;
        let store = 0;
        for (const it of items) {
            const s = normCuttingLastStatus(it.last_status);
            if (s === 'OUTPUT_BUNDLE') bundle += 1;
            else if (qcStatuses.has(s)) qc += 1;
            else if (storeStatuses.has(s)) store += 1;
        }
        onHomeDashboardCounts({ bundle, qc, store });
    }, [homeDashboardApi, homeDashQuery.data, onHomeDashboardCounts]);

    useEffect(() => {
        successAudioRef.current = new Audio(successSoundPath);
        errorAudioRef.current = new Audio(errorSoundPath);
        if (successAudioRef.current) successAudioRef.current.volume = 0.7;
        if (errorAudioRef.current) errorAudioRef.current.volume = 0.7;
        return () => {
            if (successAudioRef.current) {
                successAudioRef.current.pause();
                successAudioRef.current = null;
            }
            if (errorAudioRef.current) {
                errorAudioRef.current.pause();
                errorAudioRef.current = null;
            }
        };
    }, []);

    const playSound = useCallback((type: 'success' | 'error') => {
        try {
            if (type === 'success' && successAudioRef.current) {
                successAudioRef.current.currentTime = 0;
                void successAudioRef.current.play().catch(() => undefined);
            } else if (type === 'error' && errorAudioRef.current) {
                errorAudioRef.current.currentTime = 0;
                void errorAudioRef.current.play().catch(() => undefined);
            }
        } catch {
            // no-op: audio blocked by browser policy
        }
    }, []);

    const [form] = useState({
        workOrder: '',
        style: '',
        buyer: '',
        item: '',
        color: '',
        size: '',
    });
    const [qtyNext] = useState<string>('1');
    const [busyB, setBusyB] = useState(false);

    const [scanningModal, setScanningModal] = useState<ScanningModalId | null>(null);
    const [modalBundleRfid, setModalBundleRfid] = useState('');
    const [modalBundleScanningQty, setModalBundleScanningQty] = useState('1');
    const [modalStoreRfid, setModalStoreRfid] = useState('');
    const [modalStoreMode, setModalStoreMode] = useState<'checkin' | 'checkout' | 'urgent'>('checkin');
    const [modalStoreUrgentLine, setModalStoreUrgentLine] = useState(1);
    const [modalStoreUrgentLocation, setModalStoreUrgentLocation] = useState<'GM 1' | 'GM 2'>('GM 1');
    const [modalSupplyRfid, setModalSupplyRfid] = useState('');
    const [modalSupplyLineNum, setModalSupplyLineNum] = useState(1);
    const [modalSupplyLocation, setModalSupplyLocation] = useState<'GM 1' | 'GM 2'>('GM 1');
    const [tableDetail, setTableDetail] = useState<{
        open: boolean;
        title: string;
        subtitle?: string;
        fields: { label: string; value: string }[];
    }>({
        open: false,
        title: '',
        fields: [],
    });

    const operator = useMemo(() => readCuttingOperator(), []);
    const [bundleSessionLog, setBundleSessionLog] = useState<CuttingScanSessionRow[]>([]);
    const [storeSessionLog, setStoreSessionLog] = useState<CuttingScanSessionRow[]>([]);
    const [supplySessionLog, setSupplySessionLog] = useState<CuttingScanSessionRow[]>([]);

    const formatFieldValue = useCallback((v: unknown): string => {
        if (v == null) return '—';
        if (typeof v === 'number' && Number.isFinite(v)) return String(v);
        const s = String(v).trim();
        return s === '' ? '—' : s;
    }, []);

    const openDetailFromRow = useCallback(
        (stage: string, row: CuttingTableRow) => {
            const rfidKey = String(row.rfid ?? '').trim();
            if (homeDashboardApi && rfidKey) {
                const homeItem = findHomeDashboardItemForDetail(homeDashQuery.data, row);
                if (homeItem) {
                    const fields = homeDashboardItemToFields(homeItem, formatFieldValue);
                    setTableDetail({
                        open: true,
                        title: `Detail Data — ${stage}`,
                        subtitle: 'Data dari API Home Dashboard (/api/homedashboard)',
                        fields,
                    });
                    return;
                }
            }
            const rawTimestamp = formatFieldValue(row.timestamp);
            const timestampDisplay =
                rawTimestamp !== '—' && !Number.isNaN(Date.parse(rawTimestamp))
                    ? new Date(rawTimestamp).toLocaleString('id-ID')
                    : rawTimestamp;
            const fields: { label: string; value: string }[] = [
                { label: 'RFID', value: formatFieldValue(row.rfid) },
                { label: 'WO', value: formatFieldValue(row.wo) },
                { label: 'Style', value: formatFieldValue(row.style) },
                { label: 'Buyer', value: formatFieldValue(row.buyer) },
                { label: 'Item', value: formatFieldValue(row.item) },
                { label: 'Color', value: formatFieldValue(row.color) },
                { label: 'Size', value: formatFieldValue(row.size) },
                { label: 'Qty', value: formatFieldValue(row.qty) },
                { label: 'Good', value: formatFieldValue(row.good) },
                { label: 'Repair', value: formatFieldValue(row.repair) },
                { label: 'Reject', value: formatFieldValue(row.reject) },
                { label: 'Line', value: formatFieldValue(row.line) },
                { label: 'Location (GM)', value: formatFieldValue(row.gm) },
                { label: 'Lokasi', value: formatFieldValue(row.location) },
                { label: 'Scanning At', value: timestampDisplay },
            ].filter((f) => f.value !== '—');
            setTableDetail({
                open: true,
                title: `Detail Data — ${stage}`,
                subtitle: undefined,
                fields,
            });
        },
        [formatFieldValue, homeDashboardApi, homeDashQuery.data]
    );

    useEffect(() => {
        if (scanningModal === 'bundle') setBundleSessionLog([]);
        else if (scanningModal === 'store') {
            setStoreSessionLog([]);
            setModalStoreUrgentLine(1);
            setModalStoreUrgentLocation('GM 1');
            setModalStoreMode('checkin');
        } else if (scanningModal === 'supply') {
            setSupplySessionLog([]);
            setModalSupplyLineNum(1);
            setModalSupplyLocation('GM 1');
        }
    }, [scanningModal]);

    const submitBundle = useCallback(
        async (
            rfid: string,
            qtyArg?: number
        ): Promise<{ ok: true; qty: number; wo: string } | { ok: false; error: string }> => {
            const q =
                qtyArg != null
                    ? Math.max(1, qtyArg)
                    : Math.max(1, parseInt(String(qtyNext).replace(/\D/g, ''), 10) || 1);
            setBusyB(true);
            try {
                const nikOperator = operator.nik && operator.nik !== '—' ? operator.nik : '';
                const res = await inputRfidCuttingBundle({
                    rfid_garment: rfid,
                    rfid_bundles: rfid,
                    nik: nikOperator,
                    wo: form.workOrder || '-',
                    style: form.style || '-',
                    buyer: form.buyer || '-',
                    item: form.item || '-',
                    color: form.color || '-',
                    size: form.size || '-',
                    qty: q,
                });
                if (res.success) {
                    const outputData = (res.data as { data?: Record<string, unknown> } | undefined)?.data;
                    const qtyFromOutputRaw = outputData?.qty_bundles ?? outputData?.qty_output;
                    const qtyFromOutput =
                        qtyFromOutputRaw != null && !Number.isNaN(Number(qtyFromOutputRaw))
                            ? Number(qtyFromOutputRaw)
                            : q;
                    const woFromOutput =
                        outputData?.wo != null && String(outputData.wo).trim() !== ''
                            ? String(outputData.wo).trim()
                            : form.workOrder || '-';
                    void queryClient.invalidateQueries({ queryKey: QUERY_SCAN });
                    return { ok: true, qty: qtyFromOutput, wo: woFromOutput };
                }
                return { ok: false, error: (res as { error?: string }).error || 'Gagal' };
            } catch (e) {
                return { ok: false, error: e instanceof Error ? e.message : 'Gagal' };
            } finally {
                setBusyB(false);
            }
        },
        [form, qtyNext, queryClient, operator.nik]
    );

    const runBundleSubmit = useCallback(async () => {
        const rfid = modalBundleRfid.trim();
        if (!rfid) {
            alert('Scan atau ketik RFID bundle lalu tekan Enter.');
            return;
        }
        const q = Math.max(1, parseInt(String(modalBundleScanningQty).replace(/\D/g, ''), 10) || 1);
        const res = await submitBundle(rfid, q);
        const id = newCuttingScanRowId();
        if (res.ok) {
            playSound('success');
            setBundleSessionLog((prev) => [
                {
                    id,
                    rfid,
                    time: new Date(),
                    ok: true,
                    message: `Qty ${res.qty} Â· WO ${res.wo}`,
                },
                ...prev,
            ]);
        } else {
            playSound('error');
            setBundleSessionLog((prev) => [
                {
                    id,
                    rfid,
                    time: new Date(),
                    ok: false,
                    message: res.error,
                },
                ...prev,
            ]);
        }
        setModalBundleRfid('');
    }, [modalBundleRfid, modalBundleScanningQty, submitBundle, playSound]);

    const [busySt, setBusySt] = useState(false);
    const submitStore = useCallback(
        async (
            rfid: string,
            mode: 'checkin' | 'checkout' | 'urgent',
            meta?: { line: number; location: 'GM 1' | 'GM 2' }
        ): Promise<{ ok: true } | { ok: false; error: string }> => {
            setBusySt(true);
            try {
                const body: Parameters<typeof postCuttingStoreScan>[0] = { rfid_garment: rfid, mode };
                if ((mode === 'urgent' || mode === 'checkout') && meta) {
                    body.line = meta.line;
                    body.location = meta.location;
                }
                const res = await postCuttingStoreScan(body);
                if (!res.success) return { ok: false, error: res.error || 'Gagal' };
                void queryClient.invalidateQueries({ queryKey: QUERY_SCAN });
                return { ok: true };
            } catch (e) {
                return { ok: false, error: e instanceof Error ? e.message : 'Gagal' };
            } finally {
                setBusySt(false);
            }
        },
        [queryClient]
    );

    const runStoreSubmit = useCallback(async () => {
        const v = modalStoreRfid.trim();
        if (!v) {
            alert('Scan atau ketik RFID lalu tekan Enter.');
            return;
        }
        let res: { ok: true } | { ok: false; error: string };
        let modeLabel: string;
        if (modalStoreMode === 'urgent' || modalStoreMode === 'checkout') {
            const loc = modalStoreUrgentLocation;
            if (loc !== 'GM 1' && loc !== 'GM 2') {
                alert('Pilih Location GM 1 atau GM 2.');
                return;
            }
            const lineNum = Math.max(1, Math.min(999, Math.floor(Number(modalStoreUrgentLine))));
            if (!Number.isFinite(lineNum) || lineNum < 1) {
                alert('Line minimal 1.');
                return;
            }
            const meta = { line: lineNum, location: loc };
            if (modalStoreMode === 'urgent') {
                modeLabel = `Supply Urgent Â· Line ${lineNum} Â· ${loc}`;
                res = await submitStore(v, 'urgent', meta);
            } else {
                modeLabel = `Check Out Â· Line ${lineNum} Â· ${loc}`;
                res = await submitStore(v, 'checkout', meta);
            }
        } else {
            modeLabel = 'Check In';
            res = await submitStore(v, 'checkin');
        }
        const id = newCuttingScanRowId();
        if (res.ok) {
            playSound('success');
            setStoreSessionLog((prev) => [{ id, rfid: v, time: new Date(), ok: true, message: modeLabel }, ...prev]);
        } else {
            playSound('error');
            setStoreSessionLog((prev) => [
                {
                    id,
                    rfid: v,
                    time: new Date(),
                    ok: false,
                    message: res.error,
                },
                ...prev,
            ]);
        }
        setModalStoreRfid('');
    }, [modalStoreRfid, modalStoreMode, modalStoreUrgentLine, modalStoreUrgentLocation, submitStore, playSound]);

    const [busySu, setBusySu] = useState(false);
    const submitSupply = useCallback(
        async (
            rfid: string,
            line: string,
            location: 'GM 1' | 'GM 2'
        ): Promise<{ ok: true } | { ok: false; error: string }> => {
            setBusySu(true);
            try {
                const res = await postCuttingSupplySewingScan({ rfid_garment: rfid, line, location });
                if (!res.success) return { ok: false, error: res.error || 'Gagal' };
                void queryClient.invalidateQueries({ queryKey: QUERY_SCAN });
                return { ok: true };
            } catch (e) {
                return { ok: false, error: e instanceof Error ? e.message : 'Gagal' };
            } finally {
                setBusySu(false);
            }
        },
        [queryClient]
    );

    const runSupplySubmit = useCallback(async () => {
        const v = modalSupplyRfid.trim();
        if (!v) {
            alert('Scan atau ketik RFID lalu tekan Enter.');
            return;
        }
        const loc = modalSupplyLocation;
        if (loc !== 'GM 1' && loc !== 'GM 2') {
            alert('Pilih Location GM 1 atau GM 2.');
            return;
        }
        const lineNum = Math.max(1, Math.min(999, Math.floor(Number(modalSupplyLineNum))));
        if (!Number.isFinite(lineNum) || lineNum < 1) {
            alert('Line minimal 1.');
            return;
        }
        const lineStr = String(lineNum);
        const res = await submitSupply(v, lineStr, loc);
        const id = newCuttingScanRowId();
        if (res.ok) {
            playSound('success');
            setSupplySessionLog((prev) => [
                {
                    id,
                    rfid: v,
                    time: new Date(),
                    ok: true,
                    message: `Line ${lineStr} Â· ${loc}`,
                },
                ...prev,
            ]);
        } else {
            playSound('error');
            setSupplySessionLog((prev) => [
                {
                    id,
                    rfid: v,
                    time: new Date(),
                    ok: false,
                    message: res.error,
                },
                ...prev,
            ]);
        }
        setModalSupplyRfid('');
    }, [modalSupplyRfid, modalSupplyLineNum, modalSupplyLocation, submitSupply, playSound]);

    const qcRows = useMemo(() => {
        if (homeDashboardApi) {
            const items = homeDashQuery.data;
            if (!items?.length) return [];
            const qcStatuses = new Set(['GOOD', 'REPAIR', 'REJECT']);
            return items
                .filter((it) => qcStatuses.has(normCuttingLastStatus(it.last_status)))
                .slice(0, 24)
                .map(mapHomeItemToQcRow);
        }
        return (displayDoc?.qc.history ?? []).slice(0, 24).map((h) => ({
            rfid: h.rfid_garment,
            qty: (h.good ?? 0) + (h.repair ?? 0) + (h.reject ?? 0),
            good: h.good ?? 0,
            repair: h.repair ?? 0,
            reject: h.reject ?? 0,
            wo: h.wo ?? '—',
            style: h.style ?? '—',
            buyer: h.buyer ?? '—',
            item: h.item ?? '—',
            color: h.color ?? '—',
            size: h.size ?? '—',
            location: h.location ?? 'quality_control',
            timestamp: h.at ?? '—',
        }));
    }, [homeDashboardApi, homeDashQuery.data, displayDoc]);

    const totalQcServerCount = useMemo(
        () => (homeDashboardApi ? qcRows.length : (displayDoc?.qc.history?.length ?? qcRows.length)),
        [homeDashboardApi, qcRows.length, displayDoc?.qc.history?.length]
    );

    const bundleRows = useMemo(() => {
        if (homeDashboardApi) {
            const items = homeDashQuery.data;
            if (!items?.length) return [];
            return items
                .filter((it) => normCuttingLastStatus(it.last_status) === 'OUTPUT_BUNDLE')
                .slice(0, 50)
                .map(mapHomeItemToBundleRow);
        }
        return (displayDoc?.bundle?.history ?? []).slice(0, 50).map((h) => ({
            rfid: h.rfid_garment,
            wo: h.wo ?? '—',
            qty: Math.max(1, Number(h.qty ?? 1)),
            style: h.style ?? '—',
            buyer: h.buyer ?? '—',
            item: h.item ?? '—',
            color: h.color ?? '—',
            size: h.size ?? '—',
            location: h.location ?? 'bundle',
            timestamp: h.at ?? '—',
        }));
    }, [homeDashboardApi, homeDashQuery.data, displayDoc]);

    useEffect(() => {
        onBundleMetrics?.(bundleRows.length);
    }, [bundleRows.length, onBundleMetrics]);

    const storeRows = useMemo(() => {
        if (homeDashboardApi) {
            const items = homeDashQuery.data;
            if (!items?.length) return [];
            const storeStatuses = new Set(['IN_SMARKET', 'OUT_SMARKET', 'IN_SUPERMARKET', 'OUT_SUPERMARKET']);
            return items
                .filter((it) => storeStatuses.has(normCuttingLastStatus(it.last_status)))
                .slice(0, 24)
                .map(mapHomeItemToStoreRow);
        }
        return (displayDoc?.store.history ?? []).slice(0, 24).map((h) => {
            const locRaw = (h.location ?? '').trim();
            const isCheckout = h.checkout === true || locRaw === 'checkout';
            const lokasi = isCheckout
                ? locRaw === 'checkout' || !locRaw
                    ? 'Check-out'
                    : `Check-out Â· ${locRaw}`
                : locRaw === 'supermarket' || locRaw === ''
                  ? 'Supermarket'
                  : locRaw;
            const lineStr = h.line != null && String(h.line).trim() !== '' ? String(h.line) : '—';
            return {
                rfid: h.rfid_garment,
                wo: h.wo ?? '—',
                qty: Math.max(1, Number(h.qty ?? 1)),
                line: lineStr,
                lokasi,
                style: h.style ?? '—',
                buyer: h.buyer ?? '—',
                item: h.item ?? '—',
                color: h.color ?? '—',
                size: h.size ?? '—',
                location: h.location ?? 'supermarket',
                timestamp: h.at ?? '—',
            };
        });
    }, [homeDashboardApi, homeDashQuery.data, displayDoc]);

    const supplyRows = useMemo(() => {
        return (displayDoc?.supply.history ?? []).slice(0, 24).map((h) => ({
            rfid: h.rfid_garment,
            wo: h.wo ?? '—',
            line: h.line ?? '—',
            gm: h.gm ?? '—',
            qty: Math.max(1, Number(h.qty ?? 1)),
            style: h.style ?? '—',
            buyer: h.buyer ?? '—',
            item: h.item ?? '—',
            color: h.color ?? '—',
            size: h.size ?? '—',
            location: h.location ?? 'supply_sewing',
            timestamp: h.at ?? '—',
        }));
    }, [displayDoc]);

    const invalidate = useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: QUERY_SCAN });
        if (homeDashboardApi) void queryClient.invalidateQueries({ queryKey: QUERY_HOME_DASH });
    }, [queryClient, homeDashboardApi]);

    const bundleLeftColumn = useMemo(() => {
        const lastOk = bundleSessionLog.find((s) => s.ok);
        const latestBundleRow = bundleRows[0];
        const rfidShow = lastOk?.rfid ?? bundleRows[0]?.rfid ?? '—';
        const ridB = lastOk?.rfid ?? bundleRows[0]?.rfid ?? '';
        const bundleRowForWo = bundleRows.find((r) => r.rfid === ridB) ?? bundleRows[0];
        const woShow =
            bundleRowForWo?.wo != null && String(bundleRowForWo.wo).trim() !== '' ? String(bundleRowForWo.wo) : '—';
        const styleShow = latestBundleRow?.style ?? '—';
        const itemShow = latestBundleRow?.item ?? '—';
        const buyerShow = latestBundleRow?.buyer ?? '—';
        const colorShow = latestBundleRow?.color ?? '—';
        const sizeShow = latestBundleRow?.size ?? '—';
        const rowTimestamp =
            latestBundleRow?.timestamp && !Number.isNaN(Date.parse(String(latestBundleRow.timestamp)))
                ? new Date(String(latestBundleRow.timestamp))
                : null;
        const t = bundleSessionLog.find((s) => s.ok)?.time ?? bundleSessionLog[0]?.time ?? rowTimestamp;
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
        return (
            <>
                <div className="rounded-xl border-2 border-emerald-200/90 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 text-emerald-700">
                            <User className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Operator</span>
                        </div>
                        <span className="text-[9px] font-bold text-white bg-emerald-500 px-2 py-0.5 rounded-full shrink-0">
                            Check In
                        </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 leading-tight break-words">{operator.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">NIK: {operator.nik}</div>
                </div>

                <div className="rounded-xl border-2 border-sky-200 bg-gradient-to-br from-sky-50/90 to-white p-3 shadow-sm">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600 mb-1">Ringkasan</div>
                    <div className="text-2xl font-extrabold text-slate-900 leading-none tabular-nums">{bundleRows.length}</div>
                    <div className="text-[10px] text-slate-500 mt-1">Total {bundleRows.length} bundle tersimpan</div>
                    <div className="text-[11px] font-bold text-sky-700 mt-2 truncate" title={woShow || undefined}>
                        WO: {woShow}
                    </div>
                </div>

                <div className="rounded-xl border border-sky-200 overflow-hidden bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-2 px-2.5 py-2 bg-gradient-to-r from-sky-600 to-sky-500 text-white">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <ClipboardList className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                            <span className="text-[10px] font-bold truncate">Detail Data Terakhir</span>
                        </div>
                        <span className="text-[9px] font-mono shrink-0 opacity-95">{timeStr}</span>
                    </div>
                    <div className="p-2.5">
                        <LeftDetailRow icon={Hash} label="# RFID" value={rfidShow} />
                        <LeftDetailRow icon={Tag} label="WO" value={woShow} />
                        <LeftDetailRow icon={Box} label="STYLE" value={styleShow} />
                        <LeftDetailRow icon={PackagePlus} label="ITEM" value={itemShow} />
                        <LeftDetailRow icon={Users} label="BUYER" value={buyerShow} />
                        <LeftDetailRow icon={Palette} label="COLOR" value={colorShow} />
                        <LeftDetailRow icon={Ruler} label="SIZE" value={sizeShow} />
                    </div>
                </div>
            </>
        );
    }, [operator, bundleRows, bundleSessionLog]);

    const storeLeftColumn = useMemo(() => {
        const lastOk = storeSessionLog.find((s) => s.ok);
        const rfidShow = lastOk?.rfid ?? storeRows[0]?.rfid ?? '—';
        const ridSt = lastOk?.rfid ?? storeRows[0]?.rfid ?? '';
        const storeRowForDetail = storeRows.find((r) => r.rfid === ridSt) ?? storeRows[0];
        const woShowSt =
            storeRowForDetail?.wo != null && String(storeRowForDetail.wo).trim() !== '' ? String(storeRowForDetail.wo) : '—';
        const t = storeSessionLog.find((s) => s.ok)?.time ?? storeSessionLog[0]?.time;
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
        const totalSt = homeDashboardApi ? storeRows.length : (displayDoc?.store.history?.length ?? storeRows.length);
        return (
            <>
                <div className="rounded-xl border-2 border-amber-200/90 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 text-amber-800">
                            <User className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Operator</span>
                        </div>
                        <span className="text-[9px] font-bold text-white bg-amber-500 px-2 py-0.5 rounded-full shrink-0">Supermarket</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 leading-tight break-words">{operator.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">NIK: {operator.nik}</div>
                </div>

                <div className="rounded-xl border-2 border-sky-200 bg-gradient-to-br from-sky-50/90 to-white p-3 shadow-sm">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600 mb-1">Ringkasan</div>
                    <div className="text-2xl font-extrabold text-slate-900 leading-none tabular-nums">{totalSt}</div>
                    <div className="text-[10px] text-slate-500 mt-1">Total {totalSt} scan supermarket (server)</div>
                </div>

                <div className="rounded-xl border border-sky-200 overflow-hidden bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-2 px-2.5 py-2 bg-gradient-to-r from-sky-600 to-sky-500 text-white">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <ClipboardList className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                            <span className="text-[10px] font-bold truncate">Detail Data Terakhir</span>
                        </div>
                        <span className="text-[9px] font-mono shrink-0 opacity-95">{timeStr}</span>
                    </div>
                    <div className="p-2.5">
                        <LeftDetailRow icon={Hash} label="# RFID" value={rfidShow} />
                        <LeftDetailRow icon={Tag} label="WO" value={woShowSt} />
                        <LeftDetailRow icon={Warehouse} label="STATUS" value="Check-in Supermarket" />
                    </div>
                </div>
            </>
        );
    }, [operator, storeSessionLog, storeRows, displayDoc?.store.history?.length, homeDashboardApi]);

    const supplyLeftColumn = useMemo(() => {
        const lastOk = supplySessionLog.find((s) => s.ok);
        const rfidShow = lastOk?.rfid ?? supplyRows[0]?.rfid ?? '—';
        const ridSu = lastOk?.rfid ?? supplyRows[0]?.rfid ?? '';
        const supplyRowForDetail = supplyRows.find((r) => r.rfid === ridSu) ?? supplyRows[0];
        const woShowSu =
            supplyRowForDetail?.wo != null && String(supplyRowForDetail.wo).trim() !== ''
                ? String(supplyRowForDetail.wo)
                : '—';
        const lineShow =
            supplyRowForDetail?.line != null && String(supplyRowForDetail.line).trim() !== ''
                ? String(supplyRowForDetail.line)
                : '—';
        const gmShow =
            supplyRowForDetail?.gm != null && String(supplyRowForDetail.gm).trim() !== '' ? String(supplyRowForDetail.gm) : '—';
        const t = supplySessionLog.find((s) => s.ok)?.time ?? supplySessionLog[0]?.time;
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
        const totalSu = displayDoc?.supply.history?.length ?? supplyRows.length;
        return (
            <>
                <div className="rounded-xl border-2 border-violet-200/90 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 text-violet-800">
                            <User className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Operator</span>
                        </div>
                        <span className="text-[9px] font-bold text-white bg-violet-500 px-2 py-0.5 rounded-full shrink-0">Supply Sewing</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 leading-tight break-words">{operator.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">NIK: {operator.nik}</div>
                </div>

                <div className="rounded-xl border-2 border-sky-200 bg-gradient-to-br from-sky-50/90 to-white p-3 shadow-sm">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600 mb-1">Ringkasan</div>
                    <div className="text-2xl font-extrabold text-slate-900 leading-none tabular-nums">{totalSu}</div>
                    <div className="text-[10px] text-slate-500 mt-1">Total {totalSu} scan supply sewing (server)</div>
                </div>

                <div className="rounded-xl border border-sky-200 overflow-hidden bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-2 px-2.5 py-2 bg-gradient-to-r from-sky-600 to-sky-500 text-white">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <ClipboardList className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                            <span className="text-[10px] font-bold truncate">Detail Data Terakhir</span>
                        </div>
                        <span className="text-[9px] font-mono shrink-0 opacity-95">{timeStr}</span>
                    </div>
                    <div className="p-2.5">
                        <LeftDetailRow icon={Hash} label="# RFID" value={rfidShow} />
                        <LeftDetailRow icon={Tag} label="WO" value={woShowSu} />
                        <LeftDetailRow icon={Truck} label="LINE (REF)" value={lineShow} />
                        <LeftDetailRow icon={Warehouse} label="LOCATION" value={gmShow} />
                    </div>
                </div>
            </>
        );
    }, [operator, supplySessionLog, supplyRows, displayDoc?.supply.history?.length]);

    // Form metadata Bundle disembunyikan sesuai permintaan UI.


    const supplyFormSection = (
        <div
            className="rounded-lg border border-violet-200 bg-violet-50/60 px-2.5 py-2 space-y-2.5 min-w-0"
            style={{ fontSize: STORE_FORM_FS }}
        >
            <div className="font-semibold text-violet-900" style={{ fontSize: STORE_FORM_LABEL_FS }}>
                Supply Sewing — isi sebelum scan
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                <div className="min-w-0">
                    <span className="block font-semibold text-slate-700 mb-1" style={{ fontSize: STORE_FORM_LABEL_FS }}>
                        Location
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                        {(['GM 1', 'GM 2'] as const).map((opt) => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => setModalSupplyLocation(opt)}
                                className={`flex-1 min-w-[5.5rem] rounded-lg border px-2 py-1.5 font-semibold transition-colors ${
                                    modalSupplyLocation === opt
                                        ? 'border-violet-500 bg-violet-200 text-violet-950'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="min-w-0">
                    <span className="block font-semibold text-slate-700 mb-1" style={{ fontSize: STORE_FORM_LABEL_FS }}>
                        Line
                    </span>
                    <div className="flex items-center justify-center gap-1.5 max-w-[14rem]">
                        <button
                            type="button"
                            aria-label="Kurangi line"
                            onClick={() => setModalSupplyLineNum((n) => Math.max(1, n - 1))}
                            className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border-2 border-violet-300 bg-white text-violet-900 hover:bg-violet-100 disabled:opacity-50"
                            disabled={modalSupplyLineNum <= 1}
                        >
                            <Minus className="h-4 w-4" strokeWidth={2.5} />
                        </button>
                        <div
                            className="min-w-[3rem] flex-1 text-center tabular-nums font-extrabold text-slate-900 rounded-lg border border-violet-200 bg-white py-1.5 px-2"
                            style={{ fontSize: 'clamp(1rem, 0.85rem + 0.55vmin, 1.35rem)' }}
                        >
                            {modalSupplyLineNum}
                        </div>
                        <button
                            type="button"
                            aria-label="Tambah line"
                            onClick={() => setModalSupplyLineNum((n) => Math.min(999, n + 1))}
                            className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border-2 border-violet-300 bg-white text-violet-900 hover:bg-violet-100 disabled:opacity-50"
                            disabled={modalSupplyLineNum >= 999}
                        >
                            <Plus className="h-4 w-4" strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const storeFormSection = (
        <div className="space-y-2 min-w-0" style={{ fontSize: STORE_FORM_FS }}>
            <div className="grid grid-cols-1 min-[400px]:grid-cols-3 gap-1.5 min-w-0">
                <button
                    type="button"
                    onClick={() => setModalStoreMode('checkin')}
                    className={`rounded-lg border px-2 py-1.5 font-semibold transition-colors min-w-0 ${
                        modalStoreMode === 'checkin'
                            ? 'border-amber-400 bg-amber-100 text-amber-900'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    Check In
                </button>
                <button
                    type="button"
                    onClick={() => setModalStoreMode('checkout')}
                    className={`rounded-lg border px-2 py-1.5 font-semibold transition-colors min-w-0 ${
                        modalStoreMode === 'checkout'
                            ? 'border-amber-400 bg-amber-100 text-amber-900'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    Check Out
                </button>
                <button
                    type="button"
                    onClick={() => setModalStoreMode('urgent')}
                    className={`rounded-lg border px-2 py-1.5 font-semibold transition-colors min-w-0 ${
                        modalStoreMode === 'urgent'
                            ? 'border-amber-400 bg-amber-100 text-amber-900'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    Supply Urgent
                </button>
            </div>

            {modalStoreMode === 'urgent' || modalStoreMode === 'checkout' ? (
                <div
                    className="rounded-lg border border-amber-200 bg-amber-50/60 px-2.5 py-2 space-y-2.5 min-w-0"
                    style={{ fontSize: STORE_FORM_FS }}
                >
                    <div className="font-semibold text-amber-900" style={{ fontSize: STORE_FORM_LABEL_FS }}>
                        {modalStoreMode === 'checkout' ? 'Check Out — isi sebelum scan' : 'Supply Urgent — isi sebelum scan'}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                        <div className="min-w-0">
                            <span className="block font-semibold text-slate-700 mb-1" style={{ fontSize: STORE_FORM_LABEL_FS }}>
                                Location
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {(['GM 1', 'GM 2'] as const).map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setModalStoreUrgentLocation(opt)}
                                        className={`flex-1 min-w-[5.5rem] rounded-lg border px-2 py-1.5 font-semibold transition-colors ${
                                            modalStoreUrgentLocation === opt
                                                ? 'border-amber-500 bg-amber-200 text-amber-950'
                                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="min-w-0">
                            <span className="block font-semibold text-slate-700 mb-1" style={{ fontSize: STORE_FORM_LABEL_FS }}>
                                Line
                            </span>
                            <div className="flex items-center justify-center gap-1.5 max-w-[14rem]">
                                <button
                                    type="button"
                                    aria-label="Kurangi line"
                                    onClick={() => setModalStoreUrgentLine((n) => Math.max(1, n - 1))}
                                    className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border-2 border-amber-300 bg-white text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                                    disabled={modalStoreUrgentLine <= 1}
                                >
                                    <Minus className="h-4 w-4" strokeWidth={2.5} />
                                </button>
                                <div
                                    className="min-w-[3rem] flex-1 text-center tabular-nums font-extrabold text-slate-900 rounded-lg border border-amber-200 bg-white py-1.5 px-2"
                                    style={{ fontSize: 'clamp(1rem, 0.85rem + 0.55vmin, 1.35rem)' }}
                                >
                                    {modalStoreUrgentLine}
                                </div>
                                <button
                                    type="button"
                                    aria-label="Tambah line"
                                    onClick={() => setModalStoreUrgentLine((n) => Math.min(999, n + 1))}
                                    className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border-2 border-amber-300 bg-white text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                                    disabled={modalStoreUrgentLine >= 999}
                                >
                                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );

    return (
        <div
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 flex-1 min-h-0 min-w-0 max-lg:flex-none max-lg:min-h-0 max-lg:auto-rows-min"
            style={{ gap: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.625rem)' }}
        >
            {/* Bundle — pengisian WO / style / color hanya lewat popup Scanning; kartu = ChartCard ala Distribusi Data */}
            <ChartCard
                title={
                    <CuttingStageHeader
                        title="Bundle"
                        action={
                            <ScanningButton
                                accent="emerald"
                                onClick={() => {
                                    setModalBundleScanningQty(qtyNext);
                                    setScanningModal('bundle');
                                }}
                            />
                        }
                    />
                }
                icon={PackagePlus}
                iconColor="#047857"
                iconBgColor="#d1fae5"
                className={CUTTING_STAGE_CHART_CARD_CLASS}
            >
                <WireTable
                    columns={[
                        { key: 'rfid', label: 'RFID Bundle' },
                        { key: 'wo', label: 'Work Order' },
                        { key: 'qty', label: 'QTY' },
                    ]}
                    rows={sortTableRowsNewestFirst(bundleRows.map((r) => ({ ...r, qty: String(r.qty) })))}
                    emptyText="Belum ada data"
                    onRowClick={(row) => openDetailFromRow('Bundle', row)}
                />
            </ChartCard>

            <ChartCard
                title={<CuttingStageHeader title="Quality Control" action={<ScanningButton accent="sky" onClick={() => setScanningModal('qc')} />} />}
                icon={ClipboardCheck}
                iconColor="#0369a1"
                iconBgColor="#e0f2fe"
                onClick={() => navigate('/dashboard-qc-cutting')}
                className={CUTTING_STAGE_CHART_CARD_CLASS}
            >
                <WireTable
                    columns={[
                        { key: 'rfid', label: 'RFID Bundle' },
                        { key: 'qty', label: 'QTY' },
                        { key: 'good', label: 'Good' },
                        { key: 'repair', label: 'Repair' },
                        { key: 'reject', label: 'Reject' },
                    ]}
                    rows={sortTableRowsNewestFirst(
                        qcRows.map((r) => ({
                            rfid: r.rfid,
                            qty: String(r.qty),
                            good: String(r.good),
                            repair: String(r.repair),
                            reject: String(r.reject),
                            wo: r.wo,
                            style: r.style,
                            buyer: r.buyer,
                            item: r.item,
                            color: r.color,
                            size: r.size,
                            location: r.location,
                            timestamp: r.timestamp,
                            id_bundles: r.id_bundles,
                            last_status: r.last_status,
                            barcode: r.barcode,
                        })),
                    )}
                    emptyText="Belum ada data"
                    onRowClick={(row) => openDetailFromRow('Quality Control', row)}
                />
            </ChartCard>

            <ChartCard
                title={<CuttingStageHeader title="Supermarket" action={<ScanningButton accent="amber" onClick={() => setScanningModal('store')} />} />}
                icon={Warehouse}
                iconColor="#b45309"
                iconBgColor="#fef3c7"
                onClick={() => navigate('/dashboard-supermarket-cutting')}
                className={CUTTING_STAGE_CHART_CARD_CLASS}
            >
                <WireTable
                    columns={[
                        { key: 'rfid', label: 'RFID Bundle' },
                        { key: 'wo', label: 'Work Order' },
                        { key: 'qty', label: 'QTY' },
                        { key: 'line', label: 'Line' },
                        { key: 'lokasi', label: 'Lokasi' },
                    ]}
                    rows={sortTableRowsNewestFirst(storeRows.map((r) => ({ ...r, qty: String(r.qty) })))}
                    emptyText="Belum ada data"
                    onRowClick={(row) => openDetailFromRow('Supermarket', row)}
                />
            </ChartCard>

            <ChartCard
                title={
                    <CuttingStageHeader
                        title="Supply Sewing"
                        action={
                            SUPPLY_SEWING_ENABLED ? (
                                <ScanningButton accent="violet" onClick={() => setScanningModal('supply')} />
                            ) : (
                                <span className="text-[9px] px-2 py-1 rounded-md border border-slate-300 text-slate-500 bg-slate-100/90 font-semibold">
                                    Soon
                                </span>
                            )
                        }
                    />
                }
                icon={Truck}
                iconColor="#5b21b6"
                iconBgColor="#ede9fe"
                onClick={SUPPLY_SEWING_ENABLED ? () => navigate('/dashboard-supply-sewing-cutting') : undefined}
                className={`${CUTTING_STAGE_CHART_CARD_CLASS} relative group ${SUPPLY_SEWING_ENABLED ? '' : 'grayscale saturate-0 !border-slate-300 !from-slate-100 !via-slate-100 !to-slate-200/60 shadow-[0_8px_18px_rgba(15,23,42,0.06)]'}`}
            >
                <WireTable
                    columns={[
                        { key: 'rfid', label: 'RFID Bundle' },
                        { key: 'wo', label: 'Work Order' },
                        { key: 'line', label: 'Line' },
                        { key: 'gm', label: 'Location' },
                    ]}
                    rows={sortTableRowsNewestFirst(supplyRows)}
                    emptyText="Belum ada data"
                    onRowClick={SUPPLY_SEWING_ENABLED ? (row) => openDetailFromRow('Supply Sewing', row) : undefined}
                />
                <div className="px-1.5 py-0.5 border-t border-gray-50 shrink-0 flex justify-end bg-white/90">
                    <button
                        type="button"
                        onClick={() => {
                            void scanQuery.refetch();
                            invalidate();
                        }}
                        className="text-[9px] text-slate-500 hover:text-violet-700 shrink-0 px-1.5 py-0.5 rounded-md hover:bg-violet-50 transition-colors"
                        title="Refresh data"
                    >
                        ↻ Refresh
                    </button>
                </div>
            </ChartCard>

            {tableDetail.open ? (
                <div className="fixed inset-0 z-[1250] flex items-center justify-center bg-slate-900/45 backdrop-blur-[1px] p-3">
                    <div className="w-full max-w-2xl rounded-2xl border border-sky-200/80 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.28)] overflow-hidden">
                        <div className="bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-3 flex items-center justify-between gap-2">
                            <div>
                                <h3 className="text-sm sm:text-base font-extrabold text-white">{tableDetail.title}</h3>
                                <p className="text-[10px] sm:text-xs text-cyan-50/90">
                                    {tableDetail.subtitle ?? 'Informasi tracking hasil scan'}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="rounded-md border border-white/35 bg-white/10 px-2.5 py-1 text-xs text-white hover:bg-white/20"
                                onClick={() => setTableDetail({ open: false, title: '', fields: [], subtitle: undefined })}
                            >
                                Tutup
                            </button>
                        </div>
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[62vh] overflow-y-auto">
                            {tableDetail.fields.map((f) => (
                                <div key={f.label} className="rounded-lg border border-sky-100 bg-gradient-to-b from-white to-slate-50 px-2.5 py-2 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
                                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{f.label}</div>
                                    <div className="text-[11px] sm:text-xs font-bold text-slate-800 break-words mt-0.5">{f.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}


            <CuttingScanStationModal
                isOpen={scanningModal === 'bundle'}
                onClose={() => setScanningModal(null)}
                title="Station Bundle"
                subtitle="Scan RFID"
                accent="emerald"
                stageBadge="Bundle"
                busy={busyB}
                leftColumn={bundleLeftColumn}
                rfidValue={modalBundleRfid}
                onRfidChange={setModalBundleRfid}
                onRfidSubmit={() => void runBundleSubmit()}
                sessionItems={bundleSessionLog}
            />

            <QcScanStationHost
                isOpen={scanningModal === 'qc'}
                onClose={() => setScanningModal(null)}
                accent="sky"
                serverScanTotal={totalQcServerCount}
            />

            <CuttingScanStationModal
                isOpen={scanningModal === 'store'}
                onClose={() => setScanningModal(null)}
                title="Scanning Station Supermarket"
                subtitle="Scan RFID untuk Supermarket (Cutting)"
                accent="amber"
                stageBadge="Supermarket"
                busy={busySt}
                leftColumn={storeLeftColumn}
                formSection={storeFormSection}
                rfidValue={modalStoreRfid}
                onRfidChange={setModalStoreRfid}
                onRfidSubmit={() => void runStoreSubmit()}
                sessionItems={storeSessionLog}
            />

            <CuttingScanStationModal
                isOpen={scanningModal === 'supply'}
                onClose={() => setScanningModal(null)}
                title="Station Supply Sewing"
                subtitle="Scan RFID"
                accent="violet"
                stageBadge="Supply Sewing"
                busy={busySu}
                leftColumn={supplyLeftColumn}
                formSection={supplyFormSection}
                rfidValue={modalSupplyRfid}
                onRfidChange={setModalSupplyRfid}
                onRfidSubmit={() => void runSupplySubmit()}
                sessionItems={supplySessionLog}
            />
        </div>
    );
});

export default CuttingProcessSection;

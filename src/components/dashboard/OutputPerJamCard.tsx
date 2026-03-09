import { memo, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL, getWiraDetail, getDefaultHeaders, getBackendEnvironment } from '../../config/api';

const JAM_KEYS = ['07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'];
/** Target harian dibagi 8 jam kerja untuk target per jam */
const WORKING_HOURS = 8;
/** Hanya tampilkan 9 jam (sesuai data awal, seperti Output Detail) */
const HOUR_WINDOW = 9;

export type OutputTab = 'output_sewing' | 'qc_good' | 'pqc_good';

export const TAB_CONFIG: { key: OutputTab; label: string; apiStatus: string }[] = [
    { key: 'output_sewing', label: 'Sewing', apiStatus: 'output_sewing' },
    { key: 'qc_good', label: 'QC Good', apiStatus: 'GOOD' },
    { key: 'pqc_good', label: 'PQC Good', apiStatus: 'PQC_GOOD' },
];

interface OutputPerJamCardProps {
    lineId: string;
    tanggalFrom?: string;
    tanggalTo?: string;
    className?: string;
    /** Kontrol dari parent (RoomStatusCard) agar tab di header */
    activeTab?: OutputTab;
    onTabChange?: (tab: OutputTab) => void;
}

interface HourlyRow {
    jam: string;
    jamStart: number;
    output: number;
    target: number;
    gap: number | null;
}

function formatDate(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

const OutputPerJamCard = memo(({ lineId, tanggalFrom, tanggalTo, className = '', activeTab: controlledTab, onTabChange }: OutputPerJamCardProps) => {
    const [internalTab, setInternalTab] = useState<OutputTab>('output_sewing');
    const activeTab = controlledTab ?? internalTab;
    const setActiveTab = onTabChange ?? setInternalTab;
    const today = useMemo(() => formatDate(new Date()), []);
    const from = tanggalFrom || today;
    const to = tanggalTo || today;

    const apiStatus = TAB_CONFIG.find((t) => t.key === activeTab)?.apiStatus ?? 'output_sewing';

    const { data: wiraData, isLoading: loadingWira } = useQuery({
        queryKey: ['wira-detail-hourly', lineId, apiStatus, from, to],
        queryFn: async () => {
            const res = await getWiraDetail(apiStatus, lineId, { tanggal_from: from, tanggal_to: to });
            if (!res.success) throw new Error(res.error || 'Gagal mengambil data');
            return res.data;
        },
        enabled: !!lineId,
        staleTime: 60000,
    });

    const { data: targetsData } = useQuery({
        queryKey: ['target-data-hourly'],
        queryFn: async () => {
            const env = getBackendEnvironment() || (typeof window !== 'undefined' && (localStorage.getItem('backend_environment') as string)) || 'CLN';
            const res = await fetch(`${API_BASE_URL}/api/target-data?environment=${encodeURIComponent(env)}`, {
                headers: getDefaultHeaders(),
            });
            if (!res.ok) throw new Error('Gagal mengambil target');
            const json = await res.json();
            return json?.data?.targets ?? {};
        },
        staleTime: 60000,
    });

    const targetPerLine = useMemo(() => {
        if (!targetsData || !lineId) return 20;
        const t = targetsData[lineId];
        return typeof t === 'number' && t >= 0 ? t : 20;
    }, [targetsData, lineId]);

    /** Target per jam = target harian / 8 jam kerja */
    const targetPerJam = useMemo(() => Math.round(targetPerLine / WORKING_HOURS), [targetPerLine]);

    const tableRows = useMemo((): HourlyRow[] => {
        const summary = wiraData?.summary_per_jam;
        if (!summary || !Array.isArray(summary) || summary.length === 0) {
            return JAM_KEYS.map((h) => ({
                jam: `${h}-${String(parseInt(h, 10) + 1).padStart(2, '0')}`,
                jamStart: parseInt(h, 10),
                output: 0,
                target: targetPerJam,
                gap: null,
            }));
        }
        const row = summary[0] as Record<string, number>;
        return JAM_KEYS.map((h) => {
            const key = `jam_${h}`;
            const output = typeof row[key] === 'number' ? row[key] : 0;
            const target = targetPerJam;
            const gap = output > 0 || target > 0 ? output - target : null;
            return {
                jam: `${h}-${String(parseInt(h, 10) + 1).padStart(2, '0')}`,
                jamStart: parseInt(h, 10),
                output,
                target,
                gap,
            };
        });
    }, [wiraData?.summary_per_jam, targetPerJam]);

    /** Hanya tampilkan 9 jam, mulai dari jam pertama yang ada data (seperti Output Detail) */
    const displayedRows = useMemo(() => {
        const firstWithData = tableRows.findIndex((r) => r.output > 0);
        const startIndex = firstWithData >= 0 ? firstWithData : 0;
        return tableRows.slice(startIndex, startIndex + HOUR_WINDOW);
    }, [tableRows]);

    const currentHour = new Date().getHours();
    const activeRowIndex = displayedRows.findIndex((r) => r.jamStart === currentHour);

    return (
        <div className={`flex flex-col h-full min-h-0 overflow-hidden ${className}`}>
            {/* Tab tombol dipindah ke header di RoomStatusCard; di sini hanya tabel */}
            {/* Table */}
            <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-left border-collapse" style={{ fontSize: 'clamp(0.65rem, 1vw + 0.25rem, 0.8rem)' }}>
                    <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="py-1.5 px-2 font-semibold text-gray-500 uppercase tracking-wide">Jam</th>
                            <th className="py-1.5 px-2 font-semibold text-gray-500 uppercase tracking-wide">Output</th>
                            <th className="py-1.5 px-2 font-semibold text-gray-500 uppercase tracking-wide">Target</th>
                            <th className="py-1.5 px-2 font-semibold text-gray-500 uppercase tracking-wide">Gap</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingWira ? (
                            <tr>
                                <td colSpan={4} className="py-4 text-center text-gray-500">
                                    Memuat data...
                                </td>
                            </tr>
                        ) : (
                            displayedRows.map((row, index) => {
                                const isCurrentHour = index === activeRowIndex;
                                return (
                                    <tr
                                        key={row.jam}
                                        className={`border-b border-gray-100 ${
                                            isCurrentHour ? 'bg-blue-50' : 'hover:bg-gray-50'
                                        }`}
                                    >
                                        <td className="py-1 px-2 font-medium text-gray-800">
                                            <span className="inline-flex items-center gap-0.5">
                                                {row.jam}
                                                {isCurrentHour && (
                                                    <span className="text-blue-600" aria-hidden>→</span>
                                                )}
                                            </span>
                                        </td>
                                        <td className="py-1 px-2 font-semibold text-blue-600">
                                            {row.output > 0 ? row.output : '-'}
                                        </td>
                                        <td className="py-1 px-2 text-gray-700">{row.target}</td>
                                        <td className="py-1 px-2 font-semibold">
                                            {row.gap !== null ? (
                                                <span className={row.gap < 0 ? 'text-red-600' : 'text-green-600'}>
                                                    {row.gap > 0 ? '+' : ''}{row.gap}
                                                </span>
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

OutputPerJamCard.displayName = 'OutputPerJamCard';
export default OutputPerJamCard;

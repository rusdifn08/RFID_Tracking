import { useParams } from 'react-router-dom';
import { Suspense, lazy, useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';
import { API_BASE_URL, getDefaultHeaders } from '../config/api';
import ExportModal from '../components/ExportModal';
import type { ExportType } from '../components/ExportModal';
import { exportToExcel } from '../utils/exportToExcel';
import { useDashboardRFIDQuery } from '../hooks/useDashboardRFIDQuery';
import { useDashboardStore } from '../stores/dashboardStore';
import { formatDateForAPI } from '../utils/dateUtils';
import { useWiraDashboardWebSocket } from '../hooks/useWiraDashboardWebSocket';
/* Lazy Load Heavy Components */
const OverviewChart = lazy(() => import('../components/dashboard/OverviewChart'));
const OutputSewingCard = lazy(() => import('../components/dashboard/OutputSewingCard'));
const DataLineCard = lazy(() => import('../components/dashboard/DataLineCard'));
const RoomStatusCard = lazy(() => import('../components/dashboard/RoomStatusCard'));
import StatusCard from '../components/dashboard/StatusCard';

import { COLORS, DEFAULT_REWORK_POPUP_ENABLED } from '../components/dashboard/constants';
import { XCircle, CheckCircle, Wrench, Clock, Search, Crosshair, AlertCircle } from 'lucide-react';
import backgroundImage from '../assets/background.jpg';

// --- HALAMAN UTAMA ---

// Loading Skeleton Component
const ChartSkeleton = () => (
    <div className="animate-pulse bg-gray-200 rounded-lg h-full w-full min-h-[200px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
);

export default function DashboardRFID() {
    const { id } = useParams<{ id: string }>();
    const { isOpen } = useSidebar();

    // Normalisasi lineId - ekstrak angka dari format "LINE 3" atau "LINE%203"
    const normalizedLineId = useMemo(() => {
        if (!id) return '1';
        // Decode URL untuk menangani format "LINE%203"
        const decodedId = decodeURIComponent(id);
        // Cek apakah format "LINE X" atau "LINE%20X"
        const lineMatch = decodedId.match(/LINE[% ]*(\d+)/i);
        if (lineMatch) {
            return lineMatch[1];
        }
        // Jika sudah angka, gunakan langsung
        if (/^\d+$/.test(decodedId)) {
            return decodedId;
        }
        // Default ke 1 jika tidak valid
        return '1';
    }, [id]);

    // Gunakan normalizedLineId untuk fetch data (selalu angka)
    const lineId = normalizedLineId;
    const lineTitle = `LINE ${lineId}`;

    // State untuk WO filter
    const [availableWOList, setAvailableWOList] = useState<string[]>([]);

    // Custom hook dengan TanStack Query dan Zustand
    const {
        good,
        rework,
        reject,
        wiraQc,
        pqcGood,
        pqcRework,
        pqcReject,
        wiraPqc,
        outputLine,
        woData,
        showExportModal,
        filterDateFrom,
        filterDateTo,
        filterWo: appliedFilterWo,
    } = useDashboardRFIDQuery(lineId);

    // Zustand store actions
    const setShowExportModal = useDashboardStore((state) => state.setShowExportModal);
    const setFilterDateFromStore = useDashboardStore((state) => state.setFilterDateFrom);
    const setFilterDateToStore = useDashboardStore((state) => state.setFilterDateTo);
    const setDashboardFilterWo = useDashboardStore((state) => state.setFilterWo);
    const setIsDateFilterActive = useDashboardStore((state) => state.setIsDateFilterActive);

    // Reset filter aktif saat tanggal diubah (user harus klik search lagi)
    const handleDateFromChange = (date: string) => {
        setFilterDateFromStore(date);
        setIsDateFilterActive(false); // Reset filter aktif saat tanggal diubah
    };

    const handleDateToChange = (date: string) => {
        setFilterDateToStore(date);
        setIsDateFilterActive(false); // Reset filter aktif saat tanggal diubah
    };

    // State untuk detail modal
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailData, setDetailData] = useState<any[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailTitle, setDetailTitle] = useState('');
    const [detailType, setDetailType] = useState<'GOOD' | 'REWORK' | 'REJECT' | 'WIRA' | 'OUTPUT' | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // State untuk tracking perubahan rework dan popup notifikasi
    const previousReworkRef = useRef<number>(0);
    const previousPqcReworkRef = useRef<number>(0);
    const [showReworkNotification, setShowReworkNotification] = useState(false);
    const [reworkNotificationData, setReworkNotificationData] = useState<any>(null);
    const [reworkNotificationLoading, setReworkNotificationLoading] = useState(false);
    const [reworkNotificationType, setReworkNotificationType] = useState<'QC' | 'PQC' | null>(null);
    const [selectedReworkType, setSelectedReworkType] = useState<string>('');
    const [selectedOperator, setSelectedOperator] = useState<string>('');
    const [showOperators, setShowOperators] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const enableReworkPopup = DEFAULT_REWORK_POPUP_ENABLED; // Menggunakan variable global

    // Daftar jenis rework
    const reworkTypes = [
        'Skipped Stitch',
        'Broken Stitch',
        'Open Seam',
        'Puckering',
        'Run Off Stitch',
        'Uneven Stitch Density',
        'Needle Mark/Hole',
        'Dirty Stain',
        'Iron Mark'
    ];

    // Daftar nama operator (20 nama, dominan wanita Indonesia)
    const operators = [
        'Siti Nurhaliza',
        'Dewi Sartika',
        'Rina Wati',
        'Maya Sari',
        'Indah Permata',
        'Lina Marlina',
        'Ratna Dewi',
        'Sari Indah',
        'Yuni Astuti',
        'Diana Putri',
        'Ayu Lestari',
        'Fitri Handayani',
        'Nurul Hikmah',
        'Sinta Rahayu',
        'Kartika Sari',
        'Budi Santoso',
        'Ahmad Fauzi',
        'Rina Kartika',
        'Eka Wijaya',
        'Putri Maharani'
    ];

    // State untuk detail modal query
    const [detailQueryParams, setDetailQueryParams] = useState<{
        type: 'GOOD' | 'REWORK' | 'REJECT' | 'WIRA' | 'OUTPUT' | null;
        section: 'QC' | 'PQC' | null;
    }>({ type: null, section: null });

    // Query untuk fetch detail data berdasarkan status
    // Gunakan woData?.wo juga dalam query key untuk memastikan query ter-trigger saat WO berubah
    const currentWo = appliedFilterWo || (woData?.wo ? String(woData.wo) : '');

    // Log untuk debugging
    useEffect(() => {
        if (showDetailModal && (detailQueryParams.type === 'REWORK' || detailQueryParams.type === 'WIRA')) {
            console.log('🔵 [Detail Modal] WO Status Check:', {
                appliedFilterWo,
                woDataWo: woData?.wo,
                currentWo,
                hasWo: !!currentWo,
                enabled: showDetailModal && !!detailQueryParams.type && !!detailQueryParams.section && !!currentWo
            });
        }
    }, [showDetailModal, detailQueryParams.type, detailQueryParams.section, currentWo, appliedFilterWo, woData]);

    const detailDataQuery = useQuery({
        queryKey: ['detail-data', lineId, detailQueryParams.type, detailQueryParams.section],
        queryFn: async () => {
            if (!detailQueryParams.type || !detailQueryParams.section) {
                return [];
            }

            const { type, section } = detailQueryParams;

            // Mapping type dan section ke status parameter (API: /wira/detail?status=xxx&line=xx)
            let status: string;
            if (type === 'OUTPUT') {
                // Output Sewing: API wira/detail?status=output_sewing&line=1
                status = 'output_sewing';
            } else if (section === 'QC') {
                // QC: GOOD, REWORK, REJECT, WIRA
                status = type; // GOOD, REWORK, REJECT, atau WIRA
            } else {
                // PQC: PQC_GOOD, PQC_REWORK, PQC_REJECT, PQC_WIRA
                status = `PQC_${type}`; // PQC_GOOD, PQC_REWORK, PQC_REJECT, atau PQC_WIRA
            }

            // API baru menggunakan format: wira/detail?status=xxx&line=xx
            const url = `${API_BASE_URL}/wira/detail?status=${encodeURIComponent(status)}&line=${encodeURIComponent(lineId)}`;

            console.log('🔵 [Detail Modal] Fetching data dari API baru:', url);
            console.log('🔵 [Detail Modal] Parameters:', { status, line: lineId, type, section });

            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        ...getDefaultHeaders(),
                    },
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ [Detail Modal] API Error:', response.status, response.statusText, errorText);
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                console.log('🔵 [Detail Modal] API Response:', result);
                console.log('🔵 [Detail Modal] API Response keys:', Object.keys(result));
                console.log('🔵 [Detail Modal] result.status:', result.status);
                console.log('🔵 [Detail Modal] result.data:', result.data);
                console.log('🔵 [Detail Modal] result.data isArray:', Array.isArray(result.data));
                console.log('🔵 [Detail Modal] result.data length:', result.data?.length);

                // Handle response format baru (status: "success", data: [...])
                if (result.status === 'success' && result.data && Array.isArray(result.data)) {
                    // Sort berdasarkan timestamp terbaru
                    const sortedData = [...result.data].sort((a: any, b: any) => {
                        const dateA = new Date(a.timestamp || 0).getTime();
                        const dateB = new Date(b.timestamp || 0).getTime();
                        return dateB - dateA; // Terbaru di atas
                    });

                    console.log(`✅ [Detail Modal] Data dari API baru: ${sortedData.length} items`);
                    console.log('✅ [Detail Modal] First item sample:', sortedData[0]);
                    return sortedData;
                }

                // Fallback untuk format lama (success: true, data: [...])
                if (result.success && result.data && Array.isArray(result.data)) {
                    const sortedData = [...result.data].sort((a: any, b: any) => {
                        const dateA = new Date(a.timestamp || 0).getTime();
                        const dateB = new Date(b.timestamp || 0).getTime();
                        return dateB - dateA;
                    });
                    console.log(`✅ [Detail Modal] Data dari API (format lama): ${sortedData.length} items`);
                    return sortedData;
                }

                console.warn('⚠️ [Detail Modal] API response tidak valid atau data kosong:', result);
                console.warn('⚠️ [Detail Modal] Response structure:', {
                    hasStatus: 'status' in result,
                    statusValue: result.status,
                    hasSuccess: 'success' in result,
                    successValue: result.success,
                    hasData: 'data' in result,
                    dataType: typeof result.data,
                    isArray: Array.isArray(result.data),
                    dataValue: result.data
                });
                return [];
            } catch (error) {
                console.error('❌ [Detail Modal] Error fetching data:', error);
                throw error;
            }
        },
        enabled: showDetailModal && !!detailQueryParams.type && !!detailQueryParams.section,
        staleTime: 30000, // 30 detik
        retry: 1,
    });

    // Update detail data dan state saat query berhasil
    useEffect(() => {
        console.log('🔵 [Detail Modal] Query state update:', {
            hasData: !!detailDataQuery.data,
            dataLength: detailDataQuery.data?.length || 0,
            isError: detailDataQuery.isError,
            isLoading: detailDataQuery.isLoading,
            type: detailQueryParams.type,
            section: detailQueryParams.section,
            currentWo,
            enabled: showDetailModal && !!detailQueryParams.type && !!detailQueryParams.section
        });

        if (detailDataQuery.data) {
            console.log('✅ [Detail Modal] Setting detail data:', detailDataQuery.data.length, 'items');
            setDetailData(detailDataQuery.data);
        } else if (detailDataQuery.isError) {
            console.error('❌ [Detail Modal] Query error:', detailDataQuery.error);
            setDetailData([]);
            // Error handling untuk detail data
        } else if (!detailDataQuery.isLoading && !detailDataQuery.data && showDetailModal) {
            // Jika query tidak loading dan tidak ada data, reset detail data
            console.log('⚠️ [Detail Modal] No data and not loading, resetting detail data');
            setDetailData([]);
        }
    }, [detailDataQuery.data, detailDataQuery.isError, detailDataQuery.isLoading, detailDataQuery.error, detailQueryParams.type, detailQueryParams.section, currentWo, showDetailModal]);

    useEffect(() => {
        setDetailLoading(detailDataQuery.isLoading);
    }, [detailDataQuery.isLoading]);

    // Update title dan type saat query params berubah
    useEffect(() => {
        if (detailQueryParams.type && detailQueryParams.section) {
            if (detailQueryParams.type === 'OUTPUT') {
                setDetailTitle('Output Sewing');
            } else {
                setDetailTitle(`${detailQueryParams.type} ${detailQueryParams.section}`);
            }
            setDetailType(detailQueryParams.type);
        }
    }, [detailQueryParams]);

    // Fungsi untuk trigger fetch detail data
    const fetchDetailData = useCallback((type: 'GOOD' | 'REWORK' | 'REJECT' | 'WIRA' | 'OUTPUT', section: 'QC' | 'PQC') => {
        const wo = appliedFilterWo || (woData?.wo ? String(woData.wo) : '');
        console.log('🔵 [Detail Modal] Opening detail modal:', {
            type,
            section,
            currentWo,
            appliedFilterWo,
            woDataWo: woData?.wo,
            calculatedWo: wo
        });
        setDetailQueryParams({ type, section });
        setShowDetailModal(true);
        // Reset detail data saat membuka modal baru
        setDetailData([]);
    }, [currentWo, appliedFilterWo, woData]);

    // Fungsi untuk menampilkan detail output (semua data output)
    const fetchOutputDetail = useCallback(() => {
        console.log('🔵 [Output Detail] Opening output detail modal');
        // Gunakan type 'OUTPUT' dan section 'QC' untuk API wira/detail?status=OUTPUT&line=xx
        setDetailQueryParams({ type: 'OUTPUT', section: 'QC' });
        setShowDetailModal(true);
        setDetailData([]);
    }, []);

    // Refetch query saat modal dibuka dan WO tersedia untuk REWORK/WIRA
    useEffect(() => {
        if (showDetailModal && detailQueryParams.type && detailQueryParams.section) {
            const wo = appliedFilterWo || (woData?.wo ? String(woData.wo) : '');
            const needsWo = detailQueryParams.type === 'REWORK' || detailQueryParams.type === 'WIRA';

            if (detailQueryParams.type === 'OUTPUT') {
                console.log('🔵 [Detail Modal] Triggering refetch for OUTPUT');
                // Query akan otomatis refetch karena enabled condition terpenuhi
            } else if (needsWo && wo) {
                console.log('🔵 [Detail Modal] Triggering refetch for REWORK/WIRA with WO:', wo);
                // Query akan otomatis refetch karena enabled condition terpenuhi
            } else if (!needsWo) {
                console.log('🔵 [Detail Modal] Triggering refetch for GOOD/REJECT');
                // Query akan otomatis refetch karena enabled condition terpenuhi
            } else {
                console.warn('⚠️ [Detail Modal] Cannot refetch - WO not available for REWORK/WIRA');
            }
        }
    }, [showDetailModal, detailQueryParams.type, detailQueryParams.section, appliedFilterWo, woData]);

    // Query untuk fetch WO List dari API tracking/rfid_garment - selalu enabled untuk dropdown
    const woListQuery = useQuery({
        queryKey: ['wo-list', lineId],
        queryFn: async () => {
            const response = await fetch(`${API_BASE_URL}/tracking/rfid_garment?line=${encodeURIComponent(lineId)}`, {
                method: 'GET',
                headers: {
                    ...getDefaultHeaders(),
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Extract unique WO numbers from the data
            const woSet = new Set<string>();
            if (data.data && Array.isArray(data.data)) {
                data.data.forEach((item: any) => {
                    if (item.wo) {
                        woSet.add(item.wo);
                    }
                });
            } else if (Array.isArray(data)) {
                data.forEach((item: any) => {
                    if (item.wo) {
                        woSet.add(item.wo);
                    }
                });
            }

            return Array.from(woSet).sort();
        },
        enabled: true, // Selalu enabled untuk dropdown
        staleTime: 60000, // 1 menit
        retry: 1,
    });

    // Update availableWOList dan loading state
    useEffect(() => {
        if (woListQuery.data) {
            setAvailableWOList(woListQuery.data);
        } else if (woListQuery.isError) {
            setAvailableWOList([]);
        }
    }, [woListQuery.data, woListQuery.isError]);


    // WebSocket untuk WIRA dashboard data
    const { data: wiraWebSocketData } = useWiraDashboardWebSocket({
        enabled: true,
    });


    // Fungsi untuk fetch data rework terbaru dari List RFID API
    const fetchLatestReworkData = useCallback(async (type: 'QC' | 'PQC', maxWaitSeconds: number = 10): Promise<any | null> => {
        const startTime = Date.now();
        const maxWaitTime = maxWaitSeconds * 1000; // Convert to milliseconds
        const pollInterval = 1000; // Poll setiap 1 detik

        return new Promise((resolve) => {
            const poll = async () => {
                try {
                    const url = `${API_BASE_URL}/tracking/rfid_garment?line=${encodeURIComponent(lineId)}`;
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            ...getDefaultHeaders(),
                        },
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();
                    let allData = data.data || [];

                    if (Array.isArray(data)) {
                        allData = data;
                    }

                    // Filter data berdasarkan status rework
                    const reworkData = allData.filter((item: any) => {
                        if (!item.timestamp) return false;

                        const bagian = (item.bagian || '').trim().toUpperCase();
                        const lastStatus = (item.last_status || '').trim().toUpperCase();

                        if (type === 'QC') {
                            return bagian === 'QC' && lastStatus === 'REWORK';
                        } else {
                            return bagian === 'PQC' && lastStatus === 'PQC_REWORK';
                        }
                    });

                    // Sort berdasarkan timestamp terbaru
                    reworkData.sort((a: any, b: any) => {
                        const dateA = new Date(a.timestamp).getTime();
                        const dateB = new Date(b.timestamp).getTime();
                        return dateB - dateA; // Terbaru di atas
                    });

                    // Ambil data terbaru
                    if (reworkData.length > 0) {
                        const latestRework = reworkData[0];

                        // Cek apakah timestamp dalam rentang waktu yang wajar (dalam 10 detik terakhir)
                        const itemTime = new Date(latestRework.timestamp).getTime();
                        const now = Date.now();
                        const timeDiff = now - itemTime;

                        // Jika data dalam 10 detik terakhir, anggap valid
                        if (timeDiff <= 10000) {
                            resolve(latestRework);
                            return;
                        }
                    }

                    // Cek apakah sudah melewati waktu maksimal
                    const elapsed = Date.now() - startTime;
                    if (elapsed >= maxWaitTime) {
                        resolve(null);
                        return;
                    }

                    // Lanjutkan polling
                    setTimeout(poll, pollInterval);
                } catch (error) {
                    console.error('Error fetching latest rework data:', error);

                    // Cek apakah sudah melewati waktu maksimal
                    const elapsed = Date.now() - startTime;
                    if (elapsed >= maxWaitTime) {
                        resolve(null);
                        return;
                    }

                    // Lanjutkan polling meskipun error
                    setTimeout(poll, pollInterval);
                }
            };

            // Mulai polling
            poll();
        });
    }, [lineId]);

    // Initialize previous values saat pertama kali load
    useEffect(() => {
        if (previousReworkRef.current === 0 && rework > 0) {
            previousReworkRef.current = rework;
        }
        if (previousPqcReworkRef.current === 0 && pqcRework > 0) {
            previousPqcReworkRef.current = pqcRework;
        }
    }, [rework, pqcRework]);

    // Detect perubahan rework dan tampilkan popup (hanya jika enableReworkPopup aktif)
    useEffect(() => {
        // Hanya detect jika popup rework diaktifkan
        if (!enableReworkPopup) {
            // Tetap update previous value meskipun popup tidak aktif
            if (rework !== previousReworkRef.current) {
                previousReworkRef.current = rework;
            }
            if (pqcRework !== previousPqcReworkRef.current) {
                previousPqcReworkRef.current = pqcRework;
            }
            return;
        }

        // Detect perubahan QC Rework
        if (rework > previousReworkRef.current && previousReworkRef.current > 0) {
            const increase = rework - previousReworkRef.current;
            if (increase === 1) {
                // Rework bertambah 1, fetch data terbaru
                setReworkNotificationLoading(true);
                setReworkNotificationType('QC');
                setShowReworkNotification(true);

                fetchLatestReworkData('QC', 10).then((data) => {
                    setReworkNotificationData(data);
                    setReworkNotificationLoading(false);
                });
            }
        }
        // Update previous value hanya jika ada perubahan yang valid
        if (rework !== previousReworkRef.current) {
            previousReworkRef.current = rework;
        }

        // Detect perubahan PQC Rework
        if (pqcRework > previousPqcReworkRef.current && previousPqcReworkRef.current > 0) {
            const increase = pqcRework - previousPqcReworkRef.current;
            if (increase === 1) {
                // PQC Rework bertambah 1, fetch data terbaru
                setReworkNotificationLoading(true);
                setReworkNotificationType('PQC');
                setShowReworkNotification(true);

                fetchLatestReworkData('PQC', 10).then((data) => {
                    setReworkNotificationData(data);
                    setReworkNotificationLoading(false);
                });
            }
        }
        // Update previous value hanya jika ada perubahan yang valid
        if (pqcRework !== previousPqcReworkRef.current) {
            previousPqcReworkRef.current = pqcRework;
        }
    }, [rework, pqcRework, fetchLatestReworkData, enableReworkPopup]);

    // Data fetching sudah ditangani oleh custom hook useDashboardRFID

    // Cari data dari WebSocket wira-dashboard berdasarkan lineId
    const wiraDashboardData = useMemo(() => {
        if (!wiraWebSocketData?.data || !lineId) {
            console.log('🔴 [wiraDashboardData] No data:', { hasData: !!wiraWebSocketData?.data, lineId });
            return null;
        }

        const normalizedLineId = /^\d+$/.test(lineId) ? lineId : lineId.replace(/[^\d]/g, '') || '1';
        const targetLineNum = parseInt(normalizedLineId, 10);

        // Cari data yang match dengan lineId
        const matchedData = wiraWebSocketData.data.find((item: any) => {
            const itemLine = String(item.line || item.Line || item.LINE || '').trim();
            const itemLineMatch = itemLine.match(/(\d+)/);
            const itemLineNum = itemLineMatch ? parseInt(itemLineMatch[1], 10) : parseInt(itemLine, 10);

            return itemLine === normalizedLineId ||
                (!isNaN(itemLineNum) && !isNaN(targetLineNum) && itemLineNum === targetLineNum);
        });

        return matchedData || null;
    }, [wiraWebSocketData?.data, lineId]);

    // Hitung pieData menggunakan data dari WebSocket wira-dashboard (hanya QC)
    // Wira (Orange), Reject (Merah), Good (Hijau), Sisa Output = Output - (Wira + Reject + Good)
    const pieData = useMemo(() => {
        // Jika ada data dari WebSocket, gunakan data tersebut (hanya QC)
        if (wiraDashboardData) {
            // Coba berbagai format property name (menggunakan any untuk fleksibilitas)
            const data = wiraDashboardData as any;
            const outputSewingValue = data['Output Sewing'] || data['OutputSewing'] || data.Output || outputLine || 0;
            const goodQcValue = data.Good || data.good || 0;
            const rejectQcValue = data.Reject || data.reject || 0;
            const wiraQcValue = data.WIRA || data.Wira || data.wira || 0;

            const outputSewingStr = String(outputSewingValue);
            const goodQcStr = String(goodQcValue);
            const rejectQcStr = String(rejectQcValue);
            const wiraQcStr = String(wiraQcValue);

            const outputSewing = parseInt(outputSewingStr, 10);
            const goodQc = parseInt(goodQcStr, 10);
            const rejectQc = parseInt(rejectQcStr, 10);
            const wiraQc = parseInt(wiraQcStr, 10);


            // Hitung Sisa Output
            const sisaOutput = Math.max(0, outputSewing - (wiraQc + rejectQc + goodQc));

            const pieDataRaw: Array<{ name: string; value: number; display: string; color: string }> = [
                {
                    name: 'Good',
                    value: goodQc,
                    display: `Good ( ${goodQc} )`,
                    color: COLORS.greenSoft
                },
                {
                    name: 'WIRA',
                    value: wiraQc,
                    display: `WIRA ( ${wiraQc} )`,
                    color: COLORS.orangeSoft
                },
                {
                    name: 'Reject',
                    value: rejectQc,
                    display: `Reject ( ${rejectQc} )`,
                    color: COLORS.redSoft
                },
            ];

            // Tambahkan Sisa Output jika ada
            if (sisaOutput > 0) {
                pieDataRaw.push({
                    name: 'Sisa Output',
                    value: sisaOutput,
                    display: `Sisa Output ( ${sisaOutput} )`,
                    color: COLORS.blueGray // Abu ke biruan untuk Sisa Output
                });
            }

            const result = pieDataRaw.filter(item => item.value > 0).length > 0
                ? pieDataRaw.filter(item => item.value > 0)
                : pieDataRaw;

            return result;
        }

        // Fallback: gunakan data dari hook (hanya QC, bukan PQC)
        const pieDataRaw: Array<{ name: string; value: number; display: string; color: string }> = [
            {
                name: 'Good',
                value: good,
                display: `Good ( ${good} )`,
                color: COLORS.greenSoft
            },
            {
                name: 'WIRA',
                value: wiraQc,
                display: `WIRA ( ${wiraQc} )`,
                color: COLORS.orangeSoft
            },
            {
                name: 'Reject',
                value: reject,
                display: `Reject ( ${reject} )`,
                color: COLORS.redSoft
            },
        ];

        // Hitung Sisa Output dari outputLine
        const sisaOutput = Math.max(0, (outputLine || 0) - (wiraQc + reject + good));
        if (sisaOutput > 0) {
            pieDataRaw.push({
                name: 'Sisa Output',
                value: sisaOutput,
                display: `Sisa Output ( ${sisaOutput} )`,
                color: COLORS.blueGray // Abu ke biruan untuk Sisa Output
            });
        }

        // Filter hanya item yang value > 0, tapi jika semua 0, tetap tampilkan semua
        return pieDataRaw.filter(item => item.value > 0).length > 0
            ? pieDataRaw.filter(item => item.value > 0)
            : pieDataRaw;
    }, [wiraDashboardData, good, wiraQc, reject, outputLine]);

    // Data untuk status cards
    const qcData = useMemo(() => ({
        reject,
        rework,
        wira: wiraQc,
        good,
    }), [reject, rework, wiraQc, good]);

    const pqcData = useMemo(() => ({
        reject: pqcReject,
        rework: pqcRework,
        wira: wiraPqc,
        good: pqcGood,
    }), [pqcReject, pqcRework, wiraPqc, pqcGood]);

    // --- DATA UNTUK EXPORT CHARTS ---
    const qcDataForExport = useMemo(() => [
        { name: 'Good', value: good, color: COLORS.green },
        { name: 'WIRA', value: wiraQc, color: COLORS.blue },
        { name: 'Reject', value: reject, color: COLORS.red },
    ].filter(d => d.value > 0), [good, wiraQc, reject]);

    const pqcDataForExport = useMemo(() => [
        { name: 'Good', value: pqcGood, color: COLORS.green },
        { name: 'WIRA', value: wiraPqc, color: COLORS.blue },
        { name: 'Reject', value: pqcReject, color: COLORS.red },
    ].filter(d => d.value > 0), [pqcGood, wiraPqc, pqcReject]);

    // Filter data berdasarkan search query
    const filteredDetailData = useMemo(() => {
        if (!searchQuery.trim()) {
            return detailData;
        }

        const query = searchQuery.toLowerCase().trim();
        return detailData.filter((item) => {
            const rfid = (item.rfid_garment || '').toLowerCase();
            const wo = (item.wo || '').toLowerCase();
            const style = (item.style || '').toLowerCase();
            const buyer = (item.buyer || '').toLowerCase();
            const itemName = (item.item || '').toLowerCase();
            const color = (item.color || '').toLowerCase();
            const size = (item.size || '').toLowerCase();
            const line = (item.line || '').toLowerCase();

            return rfid.includes(query) ||
                wo.includes(query) ||
                style.includes(query) ||
                buyer.includes(query) ||
                itemName.includes(query) ||
                color.includes(query) ||
                size.includes(query) ||
                line.includes(query);
        });
    }, [detailData, searchQuery]);

    // Fungsi untuk fetch data per hari
    const fetchDailyData = async (): Promise<any[]> => {
        try {
            // Tentukan range tanggal
            const startDate = filterDateFrom ? new Date(filterDateFrom) : new Date();
            const endDate = filterDateTo ? new Date(filterDateTo) : new Date();

            // Jika tidak ada filter, gunakan hari ini saja
            if (!filterDateFrom && !filterDateTo) {
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
            }

            const dailyData: any[] = [];
            const currentDate = new Date(startDate);

            // Loop setiap hari dalam range
            while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const formattedDate = formatDateForAPI(dateStr);

                // Fetch data untuk hari ini - API backend mengharapkan parameter LINE (kapital) bukan line
                const url = `${API_BASE_URL}/wira?LINE=${encodeURIComponent(lineId)}&tanggalfrom=${encodeURIComponent(formattedDate)}&tanggalto=${encodeURIComponent(formattedDate)}`;

                try {
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            ...getDefaultHeaders(),
                        },
                        cache: 'no-cache',
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data && data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
                            const lineData = data.data.find((item: any) => {
                                // Cek field Line (kapital) atau line (huruf kecil)
                                const itemLine = String(item.Line || item.line || item.LINE || '').trim();
                                const targetLine = String(lineId || '').trim();
                                // Match exact atau match sebagai number
                                const itemLineNum = parseInt(itemLine, 10);
                                const targetLineNum = parseInt(targetLine, 10);
                                return itemLine === targetLine ||
                                    (!isNaN(itemLineNum) && !isNaN(targetLineNum) && itemLineNum === targetLineNum);
                            });

                            if (lineData) {
                                const parseNumber = (value: any): number => {
                                    if (value === null || value === undefined || value === '') return 0;
                                    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
                                    return isNaN(num) ? 0 : num;
                                };

                                dailyData.push({
                                    tanggal: dateStr,
                                    line: `LINE ${lineId}`,
                                    wo: woData?.wo || '-',
                                    style: woData?.style || '-',
                                    item: woData?.item || '-',
                                    buyer: woData?.buyer || '-',
                                    color: woData?.color || '-',
                                    size: woData?.size || '-',
                                    outputSewing: parseNumber(lineData['Output Sewing'] || lineData['output_sewing'] || lineData.outputSewing || 0),
                                    qcRework: parseNumber(lineData.Rework || lineData.rework || 0),
                                    qcWira: parseNumber(lineData.WIRA || lineData.wira || 0),
                                    qcReject: parseNumber(lineData.Reject || lineData.reject || 0),
                                    qcGood: parseNumber(lineData.Good || lineData.good || 0),
                                    pqcRework: parseNumber(lineData['PQC Rework'] || lineData['PQC Rework'] || lineData['pqc_rework'] || lineData.pqcRework || 0),
                                    pqcWira: parseNumber(lineData['PQC WIRA'] || lineData['PQC WIRA'] || lineData['pqc_wira'] || lineData.pqcWira || 0),
                                    pqcReject: parseNumber(lineData['PQC Reject'] || lineData['PQC Reject'] || lineData['pqc_reject'] || lineData.pqcReject || 0),
                                    pqcGood: parseNumber(lineData['PQC Good'] || lineData['PQC Good'] || lineData['pqc_good'] || lineData.pqcGood || 0),
                                    goodSewing: parseNumber(lineData['PQC Good'] || lineData['PQC Good'] || lineData['pqc_good'] || lineData.pqcGood || 0),
                                    balance: parseNumber(lineData['Output Sewing'] || lineData['output_sewing'] || lineData.outputSewing || 0) - parseNumber(lineData['PQC Good'] || lineData['PQC Good'] || lineData['pqc_good'] || lineData.pqcGood || 0),
                                });
                            } else {
                                // Jika tidak ada data, tetap tambahkan baris dengan nilai 0
                                dailyData.push({
                                    tanggal: dateStr,
                                    line: `LINE ${lineId}`,
                                    wo: woData?.wo || '-',
                                    style: woData?.style || '-',
                                    item: woData?.item || '-',
                                    buyer: woData?.buyer || '-',
                                    color: woData?.color || '-',
                                    size: woData?.size || '-',
                                    outputSewing: 0,
                                    qcRework: 0,
                                    qcWira: 0,
                                    qcReject: 0,
                                    qcGood: 0,
                                    pqcRework: 0,
                                    pqcWira: 0,
                                    pqcReject: 0,
                                    pqcGood: 0,
                                    goodSewing: 0,
                                    balance: 0,
                                });
                            }
                        } else {
                            // Jika tidak ada data, tetap tambahkan baris dengan nilai 0
                            dailyData.push({
                                tanggal: dateStr,
                                line: `LINE ${lineId}`,
                                wo: woData?.wo || '-',
                                style: woData?.style || '-',
                                item: woData?.item || '-',
                                buyer: woData?.buyer || '-',
                                color: woData?.color || '-',
                                size: woData?.size || '-',
                                outputSewing: 0,
                                qcRework: 0,
                                qcWira: 0,
                                qcReject: 0,
                                qcGood: 0,
                                pqcRework: 0,
                                pqcWira: 0,
                                pqcReject: 0,
                                pqcGood: 0,
                                goodSewing: 0,
                                balance: 0,
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Error fetching data for ${dateStr}:`, error);
                    // Tetap tambahkan baris dengan nilai 0 jika error
                    dailyData.push({
                        tanggal: dateStr,
                        line: `LINE ${lineId}`,
                        wo: woData?.wo || '-',
                        style: woData?.style || '-',
                        item: woData?.item || '-',
                        buyer: woData?.buyer || '-',
                        color: woData?.color || '-',
                        size: woData?.size || '-',
                        outputSewing: 0,
                        qcRework: 0,
                        qcWira: 0,
                        qcReject: 0,
                        qcGood: 0,
                        pqcRework: 0,
                        pqcWira: 0,
                        pqcReject: 0,
                        pqcGood: 0,
                        goodSewing: 0,
                        balance: 0,
                    });
                }

                // Pindah ke hari berikutnya
                currentDate.setDate(currentDate.getDate() + 1);
            }

            return dailyData;
        } catch (error) {
            console.error('Error fetching daily data:', error);
            return [];
        }
    };

    // Fungsi untuk handle export dengan useCallback untuk optimasi
    const handleExport = useCallback(async (format: 'excel' | 'csv', exportType: ExportType) => {
        // Ambil data WO jika ada
        const firstWo = woData || null;

        let exportData: any[] = [];

        if (exportType === 'daily') {
            // Fetch data per hari
            exportData = await fetchDailyData();
        } else if (exportType === 'all') {
            // Data yang ditampilkan di dashboard (default)
            exportData = [{
                tanggal: '', // Akan diisi di exportToExcel berdasarkan filter
                line: `LINE ${lineId}`,
                wo: firstWo?.wo || '-',
                style: firstWo?.style || '-',
                item: firstWo?.item || '-',
                buyer: firstWo?.buyer || '-',
                color: firstWo?.color || '-',
                size: firstWo?.size || '-',
                outputSewing: outputLine,
                qcRework: rework,
                qcWira: wiraQc,
                qcReject: reject,
                qcGood: good,
                pqcRework: pqcRework,
                pqcWira: wiraPqc,
                pqcReject: pqcReject,
                pqcGood: pqcGood,
                goodSewing: pqcGood, // Good sewing sama dengan Good PQC
                balance: outputLine - pqcGood, // Balance = output sewing - good pqc
                qcChartImage: undefined,
                pqcChartImage: undefined
            }];
        }

        await exportToExcel(exportData, lineId, format, filterDateFrom, filterDateTo, exportType);
    }, [lineId, woData, outputLine, rework, wiraQc, reject, good, pqcRework, wiraPqc, pqcReject, pqcGood, filterDateFrom, filterDateTo]);

    // LOGIKA SIZE SIDEBAR (PENTING UNTUK MENGHINDARI TABRAKAN)
    // 18% = Width Sidebar Expanded
    // 5rem = 80px (Width Sidebar Collapsed default tailwind w-20)
    const sidebarWidth = isOpen ? '18%' : '5rem';

    // State untuk detect mobile device (termasuk tablet portrait)
    const [isMobile, setIsMobile] = useState(false);

    // Effect untuk detect mobile device dan tablet portrait
    useEffect(() => {
        const checkMobile = () => {
            // Gunakan breakpoint lg (1024px) sebagai batas mobile/tablet portrait vs desktop
            // Di bawah 1024px = mobile/tablet portrait (layout seperti mobile), di atas = desktop
            setIsMobile(window.innerWidth < 1024);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className="flex h-screen w-full font-sans text-gray-800 overflow-hidden fixed inset-0 m-0 p-0"
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed',
            }}
        >

            {/* 1. SIDEBAR (FIXED) */}
            <div className="fixed left-0 top-0 h-full z-50 shadow-xl">
                <Sidebar />
            </div>

            {/* 2. WRAPPER KONTEN KANAN */}
            <div
                className="flex flex-col w-full h-full transition-all duration-300 ease-in-out"
                style={{
                    marginLeft: sidebarWidth,
                    width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)'
                }}>

                {/* 3. HEADER (STICKY) */}
                <div className="sticky top-0 z-40 shadow-md">
                    <Header />
                </div>

                {/* 4. MAIN CONTENT */}
                <main
                    className="flex-1 flex flex-col overflow-hidden"
                    style={{
                        WebkitOverflowScrolling: 'touch', // Smooth scrolling untuk iOS
                        paddingTop: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)'
                    }}
                >
                    {/* PAGE TITLE */}
                    <div
                        className="flex-shrink-0 text-center"
                        style={{
                            paddingTop: 'clamp(0.25rem, 0.5vw + 0.1rem, 0.5rem)',
                            paddingBottom: 'clamp(0.25rem, 0.5vw + 0.1rem, 0.5rem)'
                        }}
                    >
                        <h1
                            className="font-black text-gray-700 uppercase tracking-wide drop-shadow-sm"
                            style={{
                                fontFamily: 'Poppins, sans-serif',
                                fontWeight: 700,
                                fontSize: 'clamp(0.875rem, 1.5vw + 0.5rem, 1.875rem)'
                            }}
                        >
                            <span className="text-blue-600 invisible">Dashboard</span>
                            <span className="invisible"> Monitoring RFID {lineTitle}</span>
                        </h1>
                    </div>

                    {/* GRID CONTAINER - Conditional: Mobile dengan scrolling, Desktop tetap one page */}
                    {isMobile ? (
                        /* MOBILE VERSION: Scrolling dengan layout portrait */
                        <div className="flex-1 flex flex-col gap-2 sm:gap-3 md:gap-4 min-h-0 overflow-y-auto dashboard-scrollable px-2 sm:px-3 md:px-4 pb-4 sm:pb-6"
                            style={{
                                WebkitOverflowScrolling: 'touch' // Smooth scrolling untuk iOS
                            }}
                        >
                            {/* BAGIAN ATAS: Baris 1 - Distribusi Data dan Data Output */}
                            <div className="flex-none w-full">
                                <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                                    {/* Grid 1: Overview Data RFID - Chart distribusi data saja */}
                                    <div className="w-full min-h-[200px] sm:min-h-[250px]">
                                        <Suspense fallback={<ChartSkeleton />}>
                                            <OverviewChart pieData={pieData} outputLine={outputLine} />
                                        </Suspense>
                                    </div>
                                    {/* Grid 2: Data Output Sewing - Output sewing saja */}
                                    <div className="w-full min-h-[200px] sm:min-h-[250px]">
                                        <Suspense fallback={<ChartSkeleton />}>
                                            <OutputSewingCard outputLine={outputLine} onClick={fetchOutputDetail} />
                                        </Suspense>
                                    </div>
                                </div>
                            </div>
                            {/* BAGIAN KEDUA: Baris 2 - Data Line Card */}
                            <div className="flex-none w-full">
                                <div className="w-full min-h-[120px] sm:min-h-[150px] md:min-h-[180px]">
                                    <Suspense fallback={<ChartSkeleton />}>
                                        <DataLineCard
                                            lineTitle={lineTitle}
                                            woData={woData}
                                            filterDateFrom={filterDateFrom}
                                            filterDateTo={filterDateTo}
                                            filterWo={appliedFilterWo}
                                            availableWOList={availableWOList}
                                            onDateFromChange={handleDateFromChange}
                                            onDateToChange={handleDateToChange}
                                            onWoChange={setDashboardFilterWo}
                                            onSearchClick={() => setIsDateFilterActive(true)}
                                            onExportClick={() => setShowExportModal(true)}
                                        />
                                    </Suspense>
                                </div>
                            </div>

                            {/* BAGIAN TENGAH: QC CARDS - 2x2 Grid */}
                            <div className="flex-none w-full">
                                <h2 className="text-sm sm:text-base font-bold text-gray-700 uppercase tracking-wide mb-2 sm:mb-3 px-1">QC Status</h2>
                                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                                    <StatusCard type="REJECT" count={qcData.reject} label="REJECT QC" onClick={() => fetchDetailData('REJECT', 'QC')} />
                                    <StatusCard type="REWORK" count={qcData.rework} label="REWORK QC" onClick={() => fetchDetailData('REWORK', 'QC')} />
                                    <StatusCard type="WIRA" count={qcData.wira} label="WIRA QC" onClick={() => fetchDetailData('WIRA', 'QC')} />
                                    <StatusCard type="GOOD" count={qcData.good} label="GOOD QC" onClick={() => fetchDetailData('GOOD', 'QC')} />
                                </div>
                            </div>

                            {/* BAGIAN TENGAH: PQC CARDS - 2x2 Grid */}
                            <div className="flex-none w-full">
                                <h2 className="text-sm sm:text-base font-bold text-gray-700 uppercase tracking-wide mb-2 sm:mb-3 px-1">PQC Status</h2>
                                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                                    <StatusCard type="REJECT" count={pqcData.reject} label="REJECT PQC" onClick={() => fetchDetailData('REJECT', 'PQC')} />
                                    <StatusCard type="REWORK" count={pqcData.rework} label="REWORK PQC" onClick={() => fetchDetailData('REWORK', 'PQC')} />
                                    <StatusCard type="WIRA" count={pqcData.wira} label="WIRA PQC" onClick={() => fetchDetailData('WIRA', 'PQC')} />
                                    <StatusCard type="GOOD" count={pqcData.good} label="GOOD PQC" onClick={() => fetchDetailData('GOOD', 'PQC')} />
                                </div>
                            </div>

                            {/* BAGIAN BAWAH: ROOM STATUS */}
                            <div className="flex-none w-full" style={{ minHeight: '300px' }}>
                                <Suspense fallback={<ChartSkeleton />}>
                                    <RoomStatusCard lineId={lineId} />
                                </Suspense>
                            </div>
                        </div>
                    ) : (
                        /* DESKTOP VERSION: One page, gap seragam (sama kiri-kanan & atas-bawah) */
                        <div
                            className="flex-1 flex flex-col min-h-0 overflow-hidden"
                            style={{
                                gap: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.625rem)',
                                paddingLeft: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.75rem)',
                                paddingRight: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.75rem)',
                                paddingBottom: 'clamp(0.375rem, 1vw + 0.25rem, 1rem)'
                            }}
                        >
                            {/* ROW 1: 2 square cards kiri + 1 wide card kanan */}
                            <div
                                className="flex-none flex flex-row overflow-hidden"
                                style={{
                                    height: '38%',
                                    maxHeight: '38%',
                                    minHeight: '38%',
                                    gap: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.625rem)'
                                }}
                            >
                                {/* Bagian Kiri: 2 square cards */}
                                <div
                                    className="flex-[2] min-w-0 flex flex-row overflow-hidden"
                                    style={{
                                        flex: '2 1 40%',
                                        maxWidth: '40%',
                                        gap: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.625rem)'
                                    }}
                                >
                                    {/* Grid 1: Overview Data RFID - Chart distribusi data saja */}
                                    <div className="flex-[1] min-w-0 overflow-hidden" style={{ flex: '1 1 50%', maxWidth: '50%' }}>
                                        <Suspense fallback={<ChartSkeleton />}>
                                            <OverviewChart pieData={pieData} outputLine={outputLine} />
                                        </Suspense>
                                    </div>
                                    {/* Grid 2: Data Output Sewing - Output sewing saja */}
                                    <div className="flex-[1] min-w-0 overflow-hidden" style={{ flex: '1 1 50%', maxWidth: '50%' }}>
                                        <Suspense fallback={<ChartSkeleton />}>
                                            <OutputSewingCard outputLine={outputLine} onClick={fetchOutputDetail} />
                                        </Suspense>
                                    </div>
                                </div>
                                {/* Bagian Kanan: 1 wide card (Data Line) */}
                                <div className="flex-[3] min-w-0 overflow-hidden" style={{ flex: '3 1 60%', maxWidth: '60%' }}>
                                    <Suspense fallback={<ChartSkeleton />}>
                                        <DataLineCard
                                            lineTitle={lineTitle}
                                            woData={woData}
                                            filterDateFrom={filterDateFrom}
                                            filterDateTo={filterDateTo}
                                            filterWo={appliedFilterWo}
                                            availableWOList={availableWOList}
                                            onDateFromChange={handleDateFromChange}
                                            onDateToChange={handleDateToChange}
                                            onWoChange={setDashboardFilterWo}
                                            onSearchClick={() => setIsDateFilterActive(true)}
                                            onExportClick={() => setShowExportModal(true)}
                                        />
                                    </Suspense>
                                </div>
                            </div>

                            {/* ROW 2 & 3: QC + PQC (sama tinggi, responsive) + Room Status */}
                            <div
                                className="flex-1 flex flex-row min-h-0 overflow-hidden"
                                style={{
                                    flex: '1 1 0%',
                                    minHeight: 'clamp(18rem, 54vh, 38rem)',
                                    gap: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.625rem)'
                                }}
                            >
                                {/* Bagian Kiri: QC dan PQC sama tinggi, tiap baris punya min-height agar tidak terpotong */}
                                <div
                                    className="flex-[2] min-w-0 flex flex-col overflow-hidden"
                                    style={{
                                        flex: '2 1 66.666%',
                                        maxWidth: '66.666%',
                                        gap: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.625rem)'
                                    }}
                                >
                                    {/* ROW 2: QC Cards - min-height responsive per baris */}
                                    <div
                                        className="grid grid-cols-4 overflow-hidden"
                                        style={{
                                            flex: '1 1 0%',
                                            minHeight: 'clamp(7rem, 22vh, 14rem)',
                                            gap: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.625rem)'
                                        }}
                                    >
                                        <StatusCard type="REJECT" count={qcData.reject} label="REJECT QC" onClick={() => fetchDetailData('REJECT', 'QC')} />
                                        <StatusCard type="REWORK" count={qcData.rework} label="REWORK QC" onClick={() => fetchDetailData('REWORK', 'QC')} />
                                        <StatusCard type="WIRA" count={qcData.wira} label="WIRA QC" onClick={() => fetchDetailData('WIRA', 'QC')} />
                                        <StatusCard type="GOOD" count={qcData.good} label="GOOD QC" onClick={() => fetchDetailData('GOOD', 'QC')} />
                                    </div>
                                    {/* ROW 3: PQC Cards - min-height sama dengan QC */}
                                    <div
                                        className="grid grid-cols-4 overflow-hidden"
                                        style={{
                                            flex: '1 1 0%',
                                            minHeight: 'clamp(7rem, 22vh, 14rem)',
                                            gap: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.625rem)'
                                        }}
                                    >
                                        <StatusCard type="REJECT" count={pqcData.reject} label="REJECT PQC" onClick={() => fetchDetailData('REJECT', 'PQC')} />
                                        <StatusCard type="REWORK" count={pqcData.rework} label="REWORK PQC" onClick={() => fetchDetailData('REWORK', 'PQC')} />
                                        <StatusCard type="WIRA" count={pqcData.wira} label="WIRA PQC" onClick={() => fetchDetailData('WIRA', 'PQC')} />
                                        <StatusCard type="GOOD" count={pqcData.good} label="GOOD PQC" onClick={() => fetchDetailData('GOOD', 'PQC')} />
                                    </div>
                                </div>
                                {/* Bagian Kanan: 1 tall card (Room Status) - span 2 rows */}
                                <div className="flex-[1] min-w-0 h-full overflow-hidden" style={{ flex: '1 1 33.333%', maxWidth: '33.333%' }}>
                                    <Suspense fallback={<ChartSkeleton />}>
                                        <RoomStatusCard lineId={lineId} />
                                    </Suspense>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Export Modal */}
            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={handleExport}
                lineId={lineId}
            />

            {/* Rework Notification Popup */}
            {showReworkNotification && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl transform transition-all border border-yellow-200 animate-in fade-in zoom-in duration-300">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-4 rounded-t-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                    <Wrench className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">
                                        Data Rework {reworkNotificationType} Baru
                                    </h3>
                                    <p className="text-xs text-yellow-100 mt-0.5">
                                        RFID baru di-scan ke Rework
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            {reworkNotificationLoading ? (
                                <div className="flex flex-col items-center justify-center py-8">
                                    <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <p className="text-sm text-gray-600 font-medium">
                                        Mencari data rework terbaru...
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Memeriksa data dari List RFID
                                    </p>
                                </div>
                            ) : reworkNotificationData ? (
                                <div className="space-y-4">
                                    {/* Info Data RFID - Kecil sebagai informasi */}
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <div className="grid grid-cols-4 gap-2 text-xs">
                                            <div>
                                                <span className="text-gray-500">RFID:</span>
                                                <span className="ml-1 font-mono font-semibold text-gray-700">{reworkNotificationData.rfid_garment || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">WO:</span>
                                                <span className="ml-1 font-semibold text-gray-700">{reworkNotificationData.wo || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Buyer:</span>
                                                <span className="ml-1 font-semibold text-gray-700 truncate block" title={reworkNotificationData.buyer || '-'}>{reworkNotificationData.buyer || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Size/Color:</span>
                                                <span className="ml-1 font-semibold text-gray-700">{reworkNotificationData.size || '-'} / {reworkNotificationData.color || '-'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Jenis Rework */}
                                    {!showOperators && !showSuccessMessage && (
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-700 mb-3">Pilih Jenis Rework:</h4>
                                            <div className="grid grid-cols-3 gap-3">
                                                {reworkTypes.map((type, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => {
                                                            setSelectedReworkType(type);
                                                            setShowOperators(true);
                                                        }}
                                                        className="bg-gradient-to-br from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 border-2 border-yellow-300 hover:border-yellow-400 rounded-lg p-4 text-left transition-all duration-200 hover:shadow-md hover:scale-105"
                                                    >
                                                        <div className="text-sm font-bold text-yellow-800">{type}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Card Operator */}
                                    {showOperators && !showSuccessMessage && (
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-700 mb-3">Pilih Operator:</h4>
                                            <div className="grid grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                                                {operators.map((operator, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => {
                                                            // Simulasi POST (belum benar-benar POST)
                                                            setSelectedOperator(operator);
                                                            setShowSuccessMessage(true);

                                                            // Auto close setelah 3 detik dengan animasi fade
                                                            setTimeout(() => {
                                                                setShowReworkNotification(false);
                                                                setReworkNotificationData(null);
                                                                setReworkNotificationType(null);
                                                                setShowOperators(false);
                                                                setSelectedReworkType('');
                                                                setSelectedOperator('');
                                                                setShowSuccessMessage(false);
                                                            }, 3000);
                                                        }}
                                                        className="bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-2 border-blue-300 hover:border-blue-400 rounded-lg p-3 text-center transition-all duration-200 hover:shadow-md hover:scale-105"
                                                    >
                                                        <div className="text-xs font-semibold text-blue-800">{operator}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Success Message - Di dalam kotak kuning yang sama */}
                                    {showSuccessMessage && selectedReworkType && selectedOperator && (
                                        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-6 animate-in fade-in duration-300">
                                            <div className="flex flex-col items-center text-center space-y-4">
                                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                                    <CheckCircle className="w-10 h-10 text-green-600" strokeWidth={2.5} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-800 mb-3">
                                                        Data Rework Berhasil Di Input
                                                    </h3>
                                                    <p className="text-sm text-gray-700">
                                                        Rework <span className="font-semibold text-yellow-800">{selectedReworkType}</span> sudah diberitahu kepada <span className="font-semibold text-yellow-800">{selectedOperator}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8">
                                    <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
                                    <p className="text-sm text-gray-600 font-medium text-center">
                                        Data rework tidak ditemukan
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1 text-center">
                                        Data mungkin belum tersedia di List RFID
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


            {/* HIDDEN CHARTS FOR EXPORT */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                <div id="qc-chart-export" style={{ width: 400, height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={qcDataForExport} cx="50%" cy="50%" innerRadius={50} outerRadius={100} dataKey="value" stroke="white" strokeWidth={2}>
                                {qcDataForExport.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div id="pqc-chart-export" style={{ width: 400, height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={pqcDataForExport} cx="50%" cy="50%" innerRadius={50} outerRadius={100} dataKey="value" stroke="white" strokeWidth={2}>
                                {pqcDataForExport.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detail Modal */}
            {showDetailModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => {
                    setShowDetailModal(false);
                    setSearchQuery('');
                }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] sm:h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 p-4 sm:p-6 flex-shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                        {detailType === 'GOOD' && <CheckCircle className="text-white" size={24} strokeWidth={2.5} />}
                                        {detailType === 'REWORK' && <Wrench className="text-white" size={24} strokeWidth={2.5} />}
                                        {detailType === 'REJECT' && <XCircle className="text-white" size={24} strokeWidth={2.5} />}
                                        {detailType === 'WIRA' && <Clock className="text-white" size={24} strokeWidth={2.5} />}
                                        {detailType === 'OUTPUT' && <Crosshair className="text-white" size={24} strokeWidth={2.5} />}
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                                        Detail {detailTitle}
                                    </h2>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowDetailModal(false);
                                        setSearchQuery('');
                                    }}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white hover:bg-white/30"
                                >
                                    <XCircle size={20} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                {/* Search Form - Sebelah Kiri */}
                                <div className="flex-1 max-w-md">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Cari RFID ID, WO, Style, Buyer, Item..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all"
                                            style={{ fontFamily: 'Poppins, sans-serif' }}
                                        />
                                    </div>
                                </div>
                                {/* Total Data dan Tanggal - Sebelah Kanan */}
                                <div className="flex items-center gap-4">
                                    <div className="text-sm text-white/90 hidden sm:block" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                        Data hari ini ({new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })})
                                    </div>
                                    <div className="bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl px-4 py-2.5 shadow-lg">
                                        <div className="text-xs font-semibold text-white/90 mb-0.5">Total Data</div>
                                        <div className="text-2xl font-bold text-white">
                                            {searchQuery.trim() ? filteredDetailData.length : detailData.length}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Table Content */}
                        <div className="flex-1 overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-blue-50/30 min-h-0 flex flex-col">
                            {detailLoading ? (
                                <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <p className="text-slate-600 font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>Memuat data...</p>
                                </div>
                            ) : detailData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-slate-400 h-full min-h-[400px]">
                                    <div className="p-4 bg-blue-100 rounded-full mb-4">
                                        <XCircle size={48} className="text-blue-500 opacity-50" />
                                    </div>
                                    <p className="text-lg font-bold text-slate-600 mb-1" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>Tidak ada data</p>
                                    <p className="text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>Tidak ada data {detailTitle}</p>
                                </div>
                            ) : filteredDetailData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-slate-400 h-full min-h-[400px]">
                                    <div className="p-4 bg-blue-100 rounded-full mb-4">
                                        <Search size={48} className="text-blue-500 opacity-50" />
                                    </div>
                                    <p className="text-lg font-bold text-slate-600 mb-1" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>Tidak ada hasil pencarian</p>
                                    <p className="text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>Tidak ada data yang cocok dengan "{searchQuery}"</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden h-full flex flex-col">
                                    <div className="overflow-y-auto flex-1 min-h-0">
                                        <table className="w-full">
                                            <thead className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 border-b-2 border-blue-500 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-400 text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>No</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-400 text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>RFID ID</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-400 text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>WO</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-400 text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>Style</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-400 text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>Buyer</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-400 text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>Item</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-400 text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>Color</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-400 text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>Size</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-400 text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                                                        {(detailQueryParams.type === 'REWORK' || detailQueryParams.type === 'WIRA') ? 'Count' : 'Line'}
                                                    </th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-400 text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>Timestamp</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-100">
                                                {filteredDetailData.map((item, index) => (
                                                    <tr key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/50 transition-colors`}>
                                                        <td className="px-4 py-3 text-sm font-semibold text-slate-600 text-center" style={{ fontFamily: 'Poppins, sans-serif' }}>{index + 1}</td>
                                                        <td className="px-4 py-3 text-sm font-mono font-bold text-blue-600" style={{ fontFamily: 'Poppins, sans-serif' }}>{item.rfid_garment || '-'}</td>
                                                        <td className="px-4 py-3 text-sm text-slate-700" style={{ fontFamily: 'Poppins, sans-serif' }}>{item.wo || '-'}</td>
                                                        <td className="px-4 py-3 text-sm text-slate-700" style={{ fontFamily: 'Poppins, sans-serif' }}>{item.style || '-'}</td>
                                                        <td className="px-4 py-3 text-sm text-slate-700" style={{ fontFamily: 'Poppins, sans-serif' }}>{item.buyer || '-'}</td>
                                                        <td className="px-4 py-3 text-sm text-slate-700" style={{ fontFamily: 'Poppins, sans-serif' }}>{item.item || '-'}</td>
                                                        <td className="px-4 py-3 text-sm text-slate-700" style={{ fontFamily: 'Poppins, sans-serif' }}>{item.color || '-'}</td>
                                                        <td className="px-4 py-3 text-sm text-slate-700 font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>{item.size || '-'}</td>
                                                        <td className="px-4 py-3 text-sm text-slate-700" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                                            {(detailQueryParams.type === 'REWORK' || detailQueryParams.type === 'WIRA')
                                                                ? (item.reworkCount !== undefined && item.reworkCount !== null ? item.reworkCount : '-')
                                                                : (item.line || '-')}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-slate-600 font-mono" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                                            {item.timestamp ? (() => {
                                                                try {
                                                                    let date: Date;
                                                                    const timestamp = item.timestamp;

                                                                    // Cek apakah timestamp memiliki timezone indicator
                                                                    const hasTimezone = timestamp.includes('Z') || timestamp.match(/[+-]\d{2}:\d{2}$/);

                                                                    if (!hasTimezone) {
                                                                        // Timestamp tanpa timezone, parse manual untuk menghindari konversi timezone
                                                                        // Format: "2026-01-14T10:47:25" atau "2026-01-14T10:47:25.123"
                                                                        const parts = timestamp.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?/);
                                                                        if (parts) {
                                                                            const [, year, month, day, hour, minute, second] = parts;
                                                                            // Buat Date object dengan waktu lokal (tidak ada konversi timezone)
                                                                            date = new Date(
                                                                                parseInt(year),
                                                                                parseInt(month) - 1, // Month is 0-indexed
                                                                                parseInt(day),
                                                                                parseInt(hour),
                                                                                parseInt(minute),
                                                                                parseInt(second)
                                                                            );
                                                                        } else {
                                                                            // Fallback ke parsing normal
                                                                            date = new Date(timestamp);
                                                                        }
                                                                    } else {
                                                                        // Timestamp dengan timezone, parse normal
                                                                        date = new Date(timestamp);
                                                                    }

                                                                    if (isNaN(date.getTime())) {
                                                                        return item.timestamp;
                                                                    }

                                                                    // Format: DD MMM YYYY, HH.MM.SS (menggunakan waktu lokal, bukan UTC)
                                                                    const day = String(date.getDate()).padStart(2, '0');
                                                                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                                                                    const month = monthNames[date.getMonth()];
                                                                    const year = date.getFullYear();
                                                                    const hours = String(date.getHours()).padStart(2, '0');
                                                                    const minutes = String(date.getMinutes()).padStart(2, '0');
                                                                    const seconds = String(date.getSeconds()).padStart(2, '0');
                                                                    return `${day} ${month} ${year}, ${hours}.${minutes}.${seconds}`;
                                                                } catch (e) {
                                                                    return item.timestamp;
                                                                }
                                                            })() : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Scrollbar Styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #F1F5F9;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #93C5FD;
                    border-radius: 4px;
                    border: 2px solid #F1F5F9;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #60A5FA;
                }
            `}</style>
        </div>
    );
}
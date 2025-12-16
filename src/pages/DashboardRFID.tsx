import { useParams } from 'react-router-dom';
import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';
import { API_BASE_URL } from '../config/api';
import ExportModal from '../components/ExportModal';
import type { ExportType } from '../components/ExportModal';
import { exportToExcel } from '../utils/exportToExcel';
import { useDashboardRFIDQuery } from '../hooks/useDashboardRFIDQuery';
import { useDashboardStore } from '../stores/dashboardStore';
import { formatDateForAPI } from '../utils/dateUtils';
import OverviewChart from '../components/dashboard/OverviewChart';
import DataLineCard from '../components/dashboard/DataLineCard';
import StatusCardsGrid from '../components/dashboard/StatusCardsGrid';
import { COLORS, DEFAULT_REWORK_POPUP_ENABLED } from '../components/dashboard/constants';
import { Filter, XCircle, CheckCircle, RefreshCcw, AlertCircle, Search } from 'lucide-react';
import backgroundImage from '../assets/background.jpg';

// --- HALAMAN UTAMA ---

export default function DashboardRFID() {
    const { id } = useParams<{ id: string }>();
    const { isOpen } = useSidebar();
    const lineId = id || '1';
    const lineTitle = `LINE ${lineId}`;

    // State untuk WO filter - harus dideklarasikan sebelum hook
    const [showWoFilterModal, setShowWoFilterModal] = useState(false);
    const [filterWo, setFilterWo] = useState(''); // Local state untuk modal input
    const [availableWOList, setAvailableWOList] = useState<string[]>([]);
    const [loadingWOList, setLoadingWOList] = useState(false);
    const [wiraData, setWiraData] = useState<any>(null);
    const [loadingWira, setLoadingWira] = useState(false);
    const [showPreview, setShowPreview] = useState(false); // Untuk menampilkan preview data

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
        showDateFilterModal,
        filterDateFrom,
        filterDateTo,
        filterWo: appliedFilterWo,
    } = useDashboardRFIDQuery(lineId);

    // Zustand store actions
    const setShowExportModal = useDashboardStore((state) => state.setShowExportModal);
    const setShowDateFilterModal = useDashboardStore((state) => state.setShowDateFilterModal);
    const setFilterDateFrom = useDashboardStore((state) => state.setFilterDateFrom);
    const setFilterDateTo = useDashboardStore((state) => state.setFilterDateTo);
    const setDashboardFilterWo = useDashboardStore((state) => state.setFilterWo);

    // State untuk detail modal
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailData, setDetailData] = useState<any[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailTitle, setDetailTitle] = useState('');
    const [detailType, setDetailType] = useState<'GOOD' | 'REWORK' | 'REJECT' | 'WIRA' | null>(null);
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
        type: 'GOOD' | 'REWORK' | 'REJECT' | 'WIRA' | null;
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
        queryKey: ['detail-data', lineId, detailQueryParams.type, detailQueryParams.section, currentWo],
        queryFn: async () => {
            if (!detailQueryParams.type || !detailQueryParams.section) {
                return [];
            }

            const { type, section } = detailQueryParams;
            
            // Untuk REWORK dan WIRA, gunakan API baru /wira/detail
            if (type === 'REWORK' || type === 'WIRA') {
                // Perlu WO untuk API baru
                const wo = currentWo;
                
                if (!wo) {
                    console.warn('⚠️ [Detail Modal] WO tidak tersedia untuk fetch REWORK/WIRA data');
                    console.warn('⚠️ [Detail Modal] appliedFilterWo:', appliedFilterWo);
                    console.warn('⚠️ [Detail Modal] woData?.wo:', woData?.wo);
                    return [];
                }

                // Mapping tipe dan kategori
                const tipe = section.toLowerCase(); // 'qc' atau 'pqc'
                const kategori = type.toLowerCase(); // 'rework' atau 'wira'

                const url = `${API_BASE_URL}/wira/detail?line=${encodeURIComponent(lineId)}&wo=${encodeURIComponent(wo)}&tipe=${encodeURIComponent(tipe)}&kategori=${encodeURIComponent(kategori)}`;
                
                console.log('🔵 [Detail Modal] Fetching REWORK/WIRA data dari API baru:', url);
                console.log('🔵 [Detail Modal] Parameters:', { line: lineId, wo, tipe, kategori });

                try {
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
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
                    console.log('🔵 [Detail Modal] result.success:', result.success);
                    console.log('🔵 [Detail Modal] result.data:', result.data);
                    console.log('🔵 [Detail Modal] result.data isArray:', Array.isArray(result.data));
                    console.log('🔵 [Detail Modal] result.data length:', result.data?.length);
                    
                    if (result.success && result.data && Array.isArray(result.data)) {
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
                    
                    console.warn('⚠️ [Detail Modal] API response tidak valid atau data kosong:', result);
                    console.warn('⚠️ [Detail Modal] Response structure:', {
                        hasSuccess: 'success' in result,
                        successValue: result.success,
                        hasData: 'data' in result,
                        dataType: typeof result.data,
                        isArray: Array.isArray(result.data),
                        dataValue: result.data
                    });
                    return [];
                } catch (error) {
                    console.error('❌ [Detail Modal] Error fetching REWORK/WIRA data:', error);
                    throw error;
                }
            }

            // Untuk GOOD dan REJECT, gunakan API lama dengan filtering manual
            // Get today's date (UTC untuk konsistensi dengan API)
            const now = new Date();
            const todayYear = now.getUTCFullYear();
            const todayMonth = now.getUTCMonth();
            const todayDay = now.getUTCDate();
            const todayDateStr = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;
            
            console.log('🔵 [Detail Modal] Filter tanggal hari ini (UTC):', todayDateStr);

            // Fetch data dari API lama
            const url = `${API_BASE_URL}/tracking/rfid_garment?line=${encodeURIComponent(lineId)}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            let allData = result.data || [];

            // Filter berdasarkan hari ini terlebih dahulu (menggunakan UTC untuk konsistensi)
            const todayData = allData.filter((item: any) => {
                if (!item.timestamp) {
                    return false;
                }
                
                try {
                    const itemDate = new Date(item.timestamp);
                    if (isNaN(itemDate.getTime())) {
                        console.warn('Invalid timestamp:', item.timestamp);
                        return false;
                    }
                    
                    const itemYear = itemDate.getUTCFullYear();
                    const itemMonth = itemDate.getUTCMonth();
                    const itemDay = itemDate.getUTCDate();
                    const itemDateStr = `${itemYear}-${String(itemMonth + 1).padStart(2, '0')}-${String(itemDay).padStart(2, '0')}`;
                    
                    return itemDateStr === todayDateStr;
                } catch (e) {
                    console.error('Error parsing timestamp:', item.timestamp, e);
                    return false;
                }
            });
            
            console.log('🔵 [Detail Modal] Total data hari ini:', todayData.length, 'dari', allData.length, 'total data');

            let filteredData: any[] = [];
            // type dan section sudah dideklarasikan di awal queryFn

            // Hanya GOOD dan REJECT yang menggunakan API lama dengan filtering manual
            // REWORK dan WIRA sudah di-handle di atas dengan API baru
            if (section === 'QC') {
                switch (type) {
                    case 'GOOD':
                        filteredData = todayData.filter((item: any) => {
                            const bagian = (item.bagian || '').trim().toUpperCase();
                            return bagian === 'QC' && item.last_status === 'GOOD';
                        });
                        break;
                    case 'REJECT':
                        filteredData = todayData.filter((item: any) => {
                            const bagian = (item.bagian || '').trim().toUpperCase();
                            const hasData = item.wo && item.wo.trim() !== '' && 
                                          item.style && item.style.trim() !== '' &&
                                          item.buyer && item.buyer.trim() !== '';
                            return bagian === 'QC' && item.last_status === 'REJECT' && hasData;
                        });
                        break;
                    // REWORK dan WIRA sudah di-handle dengan API baru di atas
                }
            } else if (section === 'PQC') {
                switch (type) {
                    case 'GOOD':
                        filteredData = todayData.filter((item: any) => {
                            const bagian = (item.bagian || '').trim().toUpperCase();
                            return bagian === 'PQC' && item.last_status === 'PQC_GOOD';
                        });
                        break;
                    case 'REJECT':
                        filteredData = todayData.filter((item: any) => {
                            const bagian = (item.bagian || '').trim().toUpperCase();
                            const hasData = item.wo && item.wo.trim() !== '' && 
                                          item.style && item.style.trim() !== '' &&
                                          item.buyer && item.buyer.trim() !== '';
                            return bagian === 'PQC' && item.last_status === 'PQC_REJECT' && hasData;
                        });
                        break;
                    // REWORK dan WIRA sudah di-handle dengan API baru di atas
                }
            }

            // Sort berdasarkan timestamp terbaru
            filteredData.sort((a: any, b: any) => {
                const dateA = new Date(a.timestamp).getTime();
                const dateB = new Date(b.timestamp).getTime();
                return dateB - dateA; // Terbaru di atas
            });

            return filteredData;
        },
        enabled: showDetailModal && !!detailQueryParams.type && !!detailQueryParams.section && 
                 // Untuk REWORK dan WIRA, pastikan WO tersedia
                 ((detailQueryParams.type === 'REWORK' || detailQueryParams.type === 'WIRA') 
                    ? !!currentWo
                    : true),
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
            enabled: showDetailModal && !!detailQueryParams.type && !!detailQueryParams.section && 
                     ((detailQueryParams.type === 'REWORK' || detailQueryParams.type === 'WIRA') 
                        ? !!currentWo
                        : true)
        });
        
        if (detailDataQuery.data) {
            console.log('✅ [Detail Modal] Setting detail data:', detailDataQuery.data.length, 'items');
            setDetailData(detailDataQuery.data);
        } else if (detailDataQuery.isError) {
            console.error('❌ [Detail Modal] Query error:', detailDataQuery.error);
            setDetailData([]);
            // Jika error karena WO tidak tersedia untuk REWORK/WIRA
            if ((detailQueryParams.type === 'REWORK' || detailQueryParams.type === 'WIRA') && !currentWo) {
                console.warn('⚠️ [Detail Modal] WO tidak tersedia untuk fetch REWORK/WIRA data');
            }
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
            setDetailTitle(`${detailQueryParams.type} ${detailQueryParams.section}`);
            setDetailType(detailQueryParams.type);
        }
    }, [detailQueryParams]);

    // Fungsi untuk trigger fetch detail data
    const fetchDetailData = useCallback((type: 'GOOD' | 'REWORK' | 'REJECT' | 'WIRA', section: 'QC' | 'PQC') => {
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
    
    // Refetch query saat modal dibuka dan WO tersedia untuk REWORK/WIRA
    useEffect(() => {
        if (showDetailModal && detailQueryParams.type && detailQueryParams.section) {
            const wo = appliedFilterWo || (woData?.wo ? String(woData.wo) : '');
            const needsWo = detailQueryParams.type === 'REWORK' || detailQueryParams.type === 'WIRA';
            
            if (needsWo && wo) {
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

    // Query untuk fetch WO List dari API tracking/rfid_garment
    const woListQuery = useQuery({
        queryKey: ['wo-list'],
        queryFn: async () => {
            const response = await fetch(`${API_BASE_URL}/tracking/rfid_garment`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
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
        enabled: showWoFilterModal,
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

    useEffect(() => {
        setLoadingWOList(woListQuery.isLoading);
    }, [woListQuery.isLoading]);

    // Query untuk fetch WIRA data berdasarkan WO dan Line
    const wiraDataQuery = useQuery({
        queryKey: ['wira-data', filterWo, lineId],
        queryFn: async () => {
            if (!filterWo || !lineId) {
                return null;
            }

            const url = `${API_BASE_URL}/wira?line=${encodeURIComponent(lineId)}&wo=${encodeURIComponent(filterWo)}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.data && data.data.length > 0) {
                return data.data[0];
            }
            return null;
        },
        enabled: showWoFilterModal && !!filterWo && !!lineId,
        staleTime: 30000, // 30 detik
        retry: 1,
    });

    // Update wiraData dan loading state
    useEffect(() => {
        if (wiraDataQuery.data !== undefined) {
            setWiraData(wiraDataQuery.data);
        } else if (wiraDataQuery.isError) {
            setWiraData(null);
        }
    }, [wiraDataQuery.data, wiraDataQuery.isError]);

    useEffect(() => {
        setLoadingWira(wiraDataQuery.isLoading);
    }, [wiraDataQuery.isLoading]);

    // Reset wiraData saat filterWo kosong
    useEffect(() => {
        if (showWoFilterModal && !filterWo) {
            setWiraData(null);
        }
    }, [filterWo, showWoFilterModal]);

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
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
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

    // Hitung total untuk pieData dengan menggabungkan data biasa dan PQC
    // Balance: Output = Good + WIRA + Reject (tidak menghitung rework)
    const pieData = useMemo(() => {
        const totalGood = good + pqcGood;
        const totalWira = wiraQc + wiraPqc;
        const totalReject = reject + pqcReject;

        const pieDataRaw = [
            {
                name: 'Good',
                value: totalGood,
                display: `Good ( ${totalGood} )`,
                color: COLORS.green
            },
            {
                name: 'WIRA',
                value: totalWira,
                display: `WIRA ( ${totalWira} )`,
                color: COLORS.blue
            },
            {
                name: 'Reject',
                value: totalReject,
                display: `Reject ( ${totalReject} )`,
                color: COLORS.red
            },
        ];

        // Filter hanya item yang value > 0, tapi jika semua 0, tetap tampilkan semua
        return pieDataRaw.filter(item => item.value > 0).length > 0
            ? pieDataRaw.filter(item => item.value > 0)
            : pieDataRaw;
    }, [good, pqcGood, wiraQc, wiraPqc, reject, pqcReject]);

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
                
                // Fetch data untuk hari ini
                const url = `${API_BASE_URL}/wira?line=${encodeURIComponent(lineId)}&tanggalfrom=${encodeURIComponent(formattedDate)}&tanggalto=${encodeURIComponent(formattedDate)}`;
                
                try {
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
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
                                    size: woData?.breakdown_sizes || '-',
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
                                    size: woData?.breakdown_sizes || '-',
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
                                size: woData?.breakdown_sizes || '-',
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
                        size: woData?.breakdown_sizes || '-',
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
                size: firstWo?.breakdown_sizes || '-',
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
                    className="flex-1 flex flex-col overflow-hidden pt-2 sm:pt-3 md:pt-4"
                >
                    {/* PAGE TITLE */}
                    <div className="flex-shrink-0 text-center py-1 xs:py-1.5 sm:py-2">
                        <h1 className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-gray-700 uppercase tracking-wide drop-shadow-sm" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                            <span className="text-blue-600">Dashboard</span> Monitoring RFID {lineTitle}
                        </h1>
                    </div>

                    {/* GRID CONTAINER */}
                    <div className="flex-1 flex flex-col gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 min-h-0 overflow-hidden px-1.5 xs:px-2 sm:px-3 md:px-4 pb-2 xs:pb-3 sm:pb-4 md:pb-6">

                        {/* ROW 1: CHARTS - Tetap 1 baris di semua ukuran, proporsi 1/3 dan 2/3 */}
                        <div className="flex-none flex flex-row gap-1 xs:gap-1.5 sm:gap-2 overflow-hidden" style={{ height: '38%', maxHeight: '38%', minHeight: '38%' }}>
                            <div className="flex-[1] min-w-0 overflow-hidden" style={{ flex: '1 1 33.333%', maxWidth: '33.333%' }}>
                                <OverviewChart pieData={pieData} outputLine={outputLine} />
                            </div>
                            <div className="flex-[2] min-w-0 overflow-hidden" style={{ flex: '2 1 66.666%', maxWidth: '66.666%' }}>
                                <DataLineCard
                                    lineTitle={lineTitle}
                                    woData={woData}
                                    onDateFilterClick={() => setShowDateFilterModal(true)}
                                    onExportClick={() => setShowExportModal(true)}
                                    onWoFilterClick={() => setShowWoFilterModal(true)}
                                />
                            </div>
                        </div>

                        {/* ROW 2 & 3: STATUS CARDS */}
                        <StatusCardsGrid qcData={qcData} pqcData={pqcData} onCardClick={fetchDetailData} />

                    </div>
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
                                    <RefreshCcw className="w-5 h-5 text-white" strokeWidth={2.5} />
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

            {/* WO Filter Modal */}
            {showWoFilterModal && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-4xl my-8 transform transition-all border border-white/20">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <Filter className="w-5 h-5 text-purple-600" strokeWidth={2.5} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Filter WO</h3>
                            </div>
                            <button
                                onClick={() => {
                                    setShowWoFilterModal(false);
                                    setFilterWo('');
                                    setWiraData(null);
                                    setShowPreview(false);
                                }}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                            >
                                <XCircle className="w-5 h-5 text-gray-500 hover:text-gray-700" strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 sm:p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Work Order (WO)
                                </label>
                                {loadingWOList ? (
                                    <div className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                                        <span className="text-sm text-gray-500">Memuat daftar WO...</span>
                                    </div>
                                ) : (
                                    <select
                                        value={filterWo}
                                        onChange={(e) => {
                                            setFilterWo(e.target.value);
                                            setWiraData(null);
                                            setShowPreview(false);
                                        }}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white"
                                    >
                                        <option value="">Pilih Work Order</option>
                                        {availableWOList.map((wo) => (
                                            <option key={wo} value={wo}>{wo}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Info Filter Aktif */}
                            {appliedFilterWo && (
                                <div className="w-full p-3 border border-purple-300 rounded-lg bg-purple-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-purple-600" />
                                        <span className="text-sm font-medium text-purple-800">
                                            Filter WO aktif: <strong>{appliedFilterWo}</strong>
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setDashboardFilterWo('');
                                            setFilterWo(''); // Local state untuk modal
                                            setWiraData(null);
                                        }}
                                        className="px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 rounded transition-colors"
                                    >
                                        Hapus Filter
                                    </button>
                                </div>
                            )}

                            {/* Tombol Tampilkan Langsung */}
                            {filterWo && !wiraData && !loadingWira && (
                                <div className="flex justify-center">
                                    <button
                                        onClick={async () => {
                                            if (filterWo && lineId) {
                                                // Data sudah di-fetch oleh wiraDataQuery
                                                setShowPreview(true);
                                            }
                                        }}
                                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-semibold shadow-sm hover:shadow-md flex items-center gap-2"
                                    >
                                        <Filter className="w-4 h-4" />
                                        Tampilkan Langsung
                                    </button>
                                </div>
                            )}

                            {/* Data WIRA Preview */}
                            {loadingWira && (
                                <div className="w-full p-6 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-sm text-gray-600">Memuat data WIRA...</span>
                                    </div>
                                </div>
                            )}

                            {!loadingWira && wiraData && showPreview && (
                                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                                    {/* Header */}
                                    <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-4">
                                        <h4 className="text-xl font-bold text-white">Data WIRA</h4>
                                        <p className="text-sm text-purple-100 mt-1">WO: {wiraData.WO} | Line: {wiraData.line}</p>
                                    </div>

                                    {/* Info Produk */}
                                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Buyer</div>
                                                <div className="text-sm font-semibold text-gray-800">{wiraData.Buyer}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Style</div>
                                                <div className="text-sm font-semibold text-gray-800">{wiraData.Style}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Item</div>
                                                <div className="text-sm font-semibold text-gray-800">{wiraData.Item}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Data Metrics - Urutan sesuai alur dashboard */}
                                    <div className="p-6 space-y-6">
                                        {/* Output Sewing - Paling Awal */}
                                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl border-2 border-purple-200 shadow-sm">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Output Sewing</div>
                                                <div className="text-3xl font-bold text-purple-900">{wiraData['Output Sewing']}</div>
                                            </div>
                                        </div>

                                        {/* QC Section */}
                                        <div className="space-y-4">
                                            <h5 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">QC</h5>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200 shadow-sm">
                                                    <div className="text-xs font-semibold text-red-600 uppercase mb-1">Reject QC</div>
                                                    <div className="text-2xl font-bold text-red-900">{wiraData.Reject}</div>
                                                </div>
                                                <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200 shadow-sm">
                                                    <div className="text-xs font-semibold text-yellow-600 uppercase mb-1">Rework QC</div>
                                                    <div className="text-2xl font-bold text-yellow-900">{wiraData.Rework}</div>
                                                </div>
                                                <div className="bg-indigo-50 p-4 rounded-lg border-2 border-indigo-200 shadow-sm">
                                                    <div className="text-xs font-semibold text-indigo-600 uppercase mb-1">WIRA QC</div>
                                                    <div className="text-2xl font-bold text-indigo-900">{wiraData.WIRA}</div>
                                                </div>
                                                <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200 shadow-sm">
                                                    <div className="text-xs font-semibold text-green-600 uppercase mb-1">Good QC</div>
                                                    <div className="text-2xl font-bold text-green-900">{wiraData.Good}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* PQC Section */}
                                        <div className="space-y-4">
                                            <h5 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">PQC</h5>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                <div className="bg-rose-50 p-4 rounded-lg border-2 border-rose-200 shadow-sm">
                                                    <div className="text-xs font-semibold text-rose-600 uppercase mb-1">PQC Reject</div>
                                                    <div className="text-2xl font-bold text-rose-900">{wiraData['PQC Reject']}</div>
                                                </div>
                                                <div className="bg-amber-50 p-4 rounded-lg border-2 border-amber-200 shadow-sm">
                                                    <div className="text-xs font-semibold text-amber-600 uppercase mb-1">PQC Rework</div>
                                                    <div className="text-2xl font-bold text-amber-900">{wiraData['PQC Rework']}</div>
                                                </div>
                                                <div className="bg-cyan-50 p-4 rounded-lg border-2 border-cyan-200 shadow-sm">
                                                    <div className="text-xs font-semibold text-cyan-600 uppercase mb-1">PQC WIRA</div>
                                                    <div className="text-2xl font-bold text-cyan-900">{wiraData['PQC WIRA']}</div>
                                                </div>
                                                <div className="bg-emerald-50 p-4 rounded-lg border-2 border-emerald-200 shadow-sm">
                                                    <div className="text-xs font-semibold text-emerald-600 uppercase mb-1">PQC Good</div>
                                                    <div className="text-2xl font-bold text-emerald-900">{wiraData['PQC Good']}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Balance - Paling Akhir */}
                                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border-2 border-blue-200 shadow-sm">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Balance</div>
                                                <div className={`text-3xl font-bold ${parseInt(wiraData.Balance) < 0 ? 'text-red-600' : 'text-blue-900'}`}>
                                                    {wiraData.Balance}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!loadingWira && !wiraData && filterWo && !showPreview && (
                                <div className="w-full p-6 border border-gray-200 rounded-lg bg-yellow-50 flex items-center justify-center">
                                    <div className="flex items-center gap-3">
                                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                                        <span className="text-sm text-yellow-800">Pilih WO dan klik "Tampilkan Langsung" untuk melihat data</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => {
                                    setFilterWo('');
                                    setWiraData(null);
                                    setShowPreview(false);
                                    setDashboardFilterWo('');
                                }}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors duration-200 font-medium"
                            >
                                Reset
                            </button>
                            <div className="flex items-center gap-3">
                                {wiraData && (
                                    <button
                                        onClick={() => {
                                            setDashboardFilterWo(filterWo);
                                            setShowWoFilterModal(false);
                                        }}
                                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 font-semibold shadow-sm hover:shadow-md flex items-center gap-2"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Terapkan ke Dashboard
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setShowWoFilterModal(false);
                                        setFilterWo('');
                                        setWiraData(null);
                                        setShowPreview(false);
                                    }}
                                    className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200 font-semibold shadow-sm hover:shadow-md"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Date Filter Modal */}
            {showDateFilterModal && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-md transform transition-all border border-white/20">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Filter className="w-5 h-5 text-blue-600" strokeWidth={2.5} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Filter Tanggal</h3>
                            </div>
                            <button
                                onClick={() => setShowDateFilterModal(false)}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                            >
                                <XCircle className="w-5 h-5 text-gray-500 hover:text-gray-700" strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 sm:p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Dari Tanggal
                                </label>
                                <input
                                    type="date"
                                    value={filterDateFrom}
                                    onChange={(e) => setFilterDateFrom(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Sampai Tanggal
                                </label>
                                <input
                                    type="date"
                                    value={filterDateTo}
                                    onChange={(e) => setFilterDateTo(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200">
                            <button
                                onClick={() => {
                                    setFilterDateFrom('');
                                    setFilterDateTo('');
                                }}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200 font-medium"
                            >
                                Reset
                            </button>
                            <button
                                onClick={() => {
                                    setShowDateFilterModal(false);
                                    // Data akan otomatis di-fetch ulang karena dependency filterDateFrom dan filterDateTo berubah
                                }}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-semibold shadow-sm hover:shadow-md"
                            >
                                Terapkan
                            </button>
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
                                        {detailType === 'REWORK' && <RefreshCcw className="text-white" size={24} strokeWidth={2.5} />}
                                        {detailType === 'REJECT' && <XCircle className="text-white" size={24} strokeWidth={2.5} />}
                                        {detailType === 'WIRA' && <AlertCircle className="text-white" size={24} strokeWidth={2.5} />}
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
                                    {(detailQueryParams.type === 'REWORK' || detailQueryParams.type === 'WIRA') && !currentWo ? (
                                        <div className="text-center">
                                            <p className="text-sm mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                                WO (Work Order) tidak tersedia untuk menampilkan data {detailTitle}
                                            </p>
                                            <p className="text-xs text-slate-500" style={{ fontFamily: 'Poppins, sans-serif' }}>
                                                Silakan pilih atau filter WO terlebih dahulu
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>Tidak ada data {detailTitle} untuk hari ini</p>
                                    )}
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
                                                                    // Parse timestamp dari format API: "Fri, 12 Dec 2025 13:59:05 GMT"
                                                                    const date = new Date(item.timestamp);
                                                                    // Format: DD MMM YYYY, HH.MM.SS
                                                                    const day = String(date.getUTCDate()).padStart(2, '0');
                                                                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                                                                    const month = monthNames[date.getUTCMonth()];
                                                                    const year = date.getUTCFullYear();
                                                                    const hours = String(date.getUTCHours()).padStart(2, '0');
                                                                    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
                                                                    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
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
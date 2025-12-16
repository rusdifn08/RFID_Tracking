import { useQuery } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';
import { API_BASE_URL } from '../config/api';
import { useDashboardStore } from '../stores/dashboardStore';

// Helper function untuk format tanggal
const formatDateForAPI = (dateString: string): string => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
        const year = parts[0];
        const month = String(parseInt(parts[1], 10));
        const day = String(parseInt(parts[2], 10));
        return `${year}-${month}-${day}`;
    }
    return dateString;
};

// Helper function untuk parse number
const parseNumber = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(num) ? 0 : num;
};

// Fetch function untuk tracking data
const fetchTrackingData = async (lineId: string, filterWo: string, filterDateFrom: string, filterDateTo: string) => {
    let url = `${API_BASE_URL}/wira?line=${encodeURIComponent(lineId)}`;
    
    if (filterWo) {
        url += `&wo=${encodeURIComponent(filterWo)}`;
    }
    
    if (filterDateFrom) {
        const formattedFrom = formatDateForAPI(filterDateFrom);
        url += `&tanggalfrom=${encodeURIComponent(formattedFrom)}`;
    }
    if (filterDateTo) {
        const formattedTo = formatDateForAPI(filterDateTo);
        url += `&tanggalto=${encodeURIComponent(formattedTo)}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            cache: 'no-cache',
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data && data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
            const lineData = data.data.find((item: any) => {
                const itemLine = String(item.Line || item.line || item.LINE || '').trim();
                const targetLine = String(lineId || '').trim();
                const itemLineNum = parseInt(itemLine, 10);
                const targetLineNum = parseInt(targetLine, 10);
                return itemLine === targetLine || 
                       (!isNaN(itemLineNum) && !isNaN(targetLineNum) && itemLineNum === targetLineNum);
            });
            
            if (lineData) {
                return {
                    good: parseNumber(lineData.Good || lineData.good || 0),
                    rework: parseNumber(lineData.Rework || lineData.rework || 0),
                    reject: parseNumber(lineData.Reject || lineData.reject || 0),
                    wiraQc: parseNumber(lineData.WIRA || lineData.wira || 0),
                    pqcGood: parseNumber(lineData['PQC Good'] || lineData['pqc_good'] || lineData.pqcGood || 0),
                    pqcRework: parseNumber(lineData['PQC Rework'] || lineData['pqc_rework'] || lineData.pqcRework || 0),
                    pqcReject: parseNumber(lineData['PQC Reject'] || lineData['pqc_reject'] || lineData.pqcReject || 0),
                    wiraPqc: parseNumber(lineData['PQC WIRA'] || lineData['pqc_wira'] || lineData.pqcWira || 0),
                    outputLine: parseNumber(lineData['Output Sewing'] || lineData['output_sewing'] || lineData.outputSewing || 0),
                };
            }
        }
        
        // Return empty data jika tidak ada data
        return {
            good: 0,
            rework: 0,
            reject: 0,
            wiraQc: 0,
            pqcGood: 0,
            pqcRework: 0,
            pqcReject: 0,
            wiraPqc: 0,
            outputLine: 0,
        };
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('[useDashboardRFIDQuery] Error fetching tracking data:', error);
        throw error;
    }
};

// Fetch function untuk WO data
const fetchWoData = async (lineId: string, filterWo: string) => {
    let url = `${API_BASE_URL}/monitoring/line?line=${encodeURIComponent(lineId)}`;
    
    if (filterWo) {
        url = `${API_BASE_URL}/wira?wo=${encodeURIComponent(filterWo)}`;
    }

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

    const data = await response.json();

    if (filterWo && data && data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
        const wiraData = data.data[0];
        return {
            wo: wiraData.WO || wiraData.wo || '-',
            style: wiraData.Style || wiraData.style || '-',
            buyer: wiraData.Buyer || wiraData.buyer || '-',
            item: wiraData.Item || wiraData.item || '-',
            color: '-',
            size: '-',
            balance: wiraData.Balance,
            good: wiraData.Good,
            reject: wiraData.Reject,
            rework: wiraData.Rework,
            wira: wiraData.WIRA,
            outputSewing: wiraData['Output Sewing'],
            pqcGood: wiraData['PQC Good'],
            pqcReject: wiraData['PQC Reject'],
            pqcRework: wiraData['PQC Rework'],
            pqcWira: wiraData['PQC WIRA'],
            line: wiraData.line || lineId
        };
    } else if (!filterWo && data && data.success && data.data) {
        return data.data;
    }
    
    return null;
};

export const useDashboardRFIDQuery = (lineId: string) => {
    // Get filter dan modal states dari store dengan useShallow untuk mencegah re-render
    const { filterWo, filterDateFrom, filterDateTo, showExportModal, showDateFilterModal } = useDashboardStore(
        useShallow((state) => ({
            filterWo: state.filterWo,
            filterDateFrom: state.filterDateFrom,
            filterDateTo: state.filterDateTo,
            showExportModal: state.showExportModal,
            showDateFilterModal: state.showDateFilterModal,
        }))
    );
    
    // Stabilkan query key dengan menggunakan nilai primitif
    const trackingQueryKey = ['dashboard-tracking', lineId, filterWo || '', filterDateFrom || '', filterDateTo || ''] as const;
    const woDataQueryKey = ['dashboard-wo', lineId, filterWo || ''] as const;
    
    // Query untuk tracking data dengan polling setiap 1 detik
    // Query key stabil - hanya berubah jika filter berubah
    const trackingQuery = useQuery({
        queryKey: trackingQueryKey,
        queryFn: () => fetchTrackingData(lineId, filterWo || '', filterDateFrom || '', filterDateTo || ''),
        refetchInterval: (query) => {
            // Hanya refetch jika query tidak dalam state loading/error
            if (query.state.status === 'error') return false;
            return 1000; // Polling setiap 1 detik
        },
        staleTime: 0, // Data selalu dianggap stale untuk real-time
        gcTime: 10000, // Cache dihapus setelah 10 detik
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnMount: true, // Refetch saat mount
        refetchOnReconnect: true, // Refetch saat reconnect
    });

    // Query untuk WO data dengan polling setiap 5 detik
    const woDataQuery = useQuery({
        queryKey: woDataQueryKey,
        queryFn: () => fetchWoData(lineId, filterWo || ''),
        refetchInterval: (query) => {
            // Hanya refetch jika query tidak dalam state loading/error
            if (query.state.status === 'error') return false;
            return 5000; // Polling setiap 5 detik
        },
        staleTime: 0, // Data selalu dianggap stale untuk real-time
        gcTime: 30000, // Cache dihapus setelah 30 detik
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnMount: true, // Refetch saat mount
        refetchOnReconnect: true, // Refetch saat reconnect
    });

    // Return data langsung dari query (tidak perlu sync ke store untuk data real-time)
    // Ini mencegah infinite loop karena tidak ada circular dependency
    // Tidak menggunakan useMemo untuk menghindari dependency issues
    return {
        // Data langsung dari query (real-time)
        good: trackingQuery.data?.good ?? 0,
        rework: trackingQuery.data?.rework ?? 0,
        reject: trackingQuery.data?.reject ?? 0,
        wiraQc: trackingQuery.data?.wiraQc ?? 0,
        pqcGood: trackingQuery.data?.pqcGood ?? 0,
        pqcRework: trackingQuery.data?.pqcRework ?? 0,
        pqcReject: trackingQuery.data?.pqcReject ?? 0,
        wiraPqc: trackingQuery.data?.wiraPqc ?? 0,
        outputLine: trackingQuery.data?.outputLine ?? 0,
        woData: woDataQuery.data ?? null,
        
        // Modal states dari store
        showExportModal,
        showDateFilterModal,
        
        // Filter states dari store
        filterDateFrom,
        filterDateTo,
        filterWo,
        
        // Query states untuk loading/error handling
        isLoading: trackingQuery.isLoading || woDataQuery.isLoading,
        isError: trackingQuery.isError || woDataQuery.isError,
        error: trackingQuery.error || woDataQuery.error,
    };
};


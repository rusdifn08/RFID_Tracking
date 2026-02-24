import { useQuery } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';
import { useEffect, useState, useMemo } from 'react';
import { API_BASE_URL, getDefaultHeaders } from '../config/api';
import { useDashboardStore } from '../stores/dashboardStore';
// NOTE: useWiraDashboardWebSocket tetap di-import untuk digunakan kembali nanti
// import { useWiraDashboardWebSocket } from './useWiraDashboardWebSocket';
// import type { WiraDashboardData } from './useWiraDashboardWebSocket';

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

// NOTE: Fungsi extractLineDataFromWebSocket di-comment karena saat ini menggunakan API polling
// Fungsi ini akan digunakan kembali saat WebSocket diaktifkan kembali
/*
// Helper function untuk extract line data dari WebSocket data
const extractLineDataFromWebSocket = (
    wiraData: WiraDashboardData[] | undefined,
    lineId: string,
    filterWo?: string
): {
    good: number;
    rework: number;
    reject: number;
    wiraQc: number;
    pqcGood: number;
    pqcRework: number;
    pqcReject: number;
    wiraPqc: number;
    outputLine: number;
} => {
    if (!wiraData || !Array.isArray(wiraData) || wiraData.length === 0) {
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
    }

    // Normalisasi lineId untuk matching
    const normalizedLineId = /^\d+$/.test(lineId) ? lineId : lineId.replace(/[^\d]/g, '') || '1';
    const targetLineNum = parseInt(normalizedLineId, 10);

    // Filter data berdasarkan lineId dan filterWo (jika ada)
    const filteredData = wiraData.filter((item) => {
        const itemLine = String(item.line || item.Line || item.LINE || '').trim();
        const itemLineMatch = itemLine.match(/(\d+)/);
        const itemLineNum = itemLineMatch ? parseInt(itemLineMatch[1], 10) : parseInt(itemLine, 10);
        
        const lineMatch = itemLine === normalizedLineId || 
                         (!isNaN(itemLineNum) && !isNaN(targetLineNum) && itemLineNum === targetLineNum);
        
        // Jika ada filter WO, juga filter berdasarkan WO
        if (filterWo) {
            const itemWo = String(item.WO || item.wo || '').trim();
            const woMatch = itemWo.includes(filterWo) || filterWo.includes(itemWo);
            return lineMatch && woMatch;
        }
        
        return lineMatch;
    });

    // Ambil data pertama yang match (atau aggregate jika multiple)
    if (filteredData.length > 0) {
        // Jika ada multiple data, aggregate (untuk kasus multiple WO di line yang sama)
        const aggregated = filteredData.reduce((acc, item) => {
            return {
                good: acc.good + parseNumber(item.Good || item.good || 0),
                rework: acc.rework + parseNumber(item.Rework || item.rework || 0),
                reject: acc.reject + parseNumber(item.Reject || item.reject || 0),
                wiraQc: acc.wiraQc + parseNumber(item.WIRA || item.wira || 0),
                pqcGood: acc.pqcGood + parseNumber(item['PQC Good'] || item['pqc_good'] || item.pqcGood || 0),
                pqcRework: acc.pqcRework + parseNumber(item['PQC Rework'] || item['pqc_rework'] || item.pqcRework || 0),
                pqcReject: acc.pqcReject + parseNumber(item['PQC Reject'] || item['pqc_reject'] || item.pqcReject || 0),
                wiraPqc: acc.wiraPqc + parseNumber(item['PQC WIRA'] || item['pqc_wira'] || item.pqcWira || 0),
                outputLine: acc.outputLine + parseNumber(item['Output Sewing'] || item['output_sewing'] || item.outputSewing || 0),
            };
        }, {
            good: 0,
            rework: 0,
            reject: 0,
            wiraQc: 0,
            pqcGood: 0,
            pqcRework: 0,
            pqcReject: 0,
            wiraPqc: 0,
            outputLine: 0,
        });

        return aggregated;
    }

    // Return empty data jika tidak ada data yang match
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
};
*/

// Fetch function untuk tracking data dari API /wira (default - tanpa filter tanggal)
// API: /wira (tanpa parameter, mengembalikan data hari ini untuk semua line)
// Filter berdasarkan line dilakukan di client-side setelah data diterima
const fetchTrackingDataFromAPI = async (
    lineId: string,
    filterWo?: string,
    filterDateFrom?: string,
    filterDateTo?: string
): Promise<{
    good: number;
    rework: number;
    reject: number;
    wiraQc: number;
    pqcGood: number;
    pqcRework: number;
    pqcReject: number;
    wiraPqc: number;
    outputLine: number;
}> => {
    const normalizedLineId = /^\d+$/.test(lineId) ? lineId : lineId.replace(/[^\d]/g, '') || '1';
    
    // Build URL dengan parameter filter
    // Jika ada filter tanggal, gunakan parameter tanggal
    // Jika tidak ada filter tanggal, gunakan API /wira tanpa parameter (default today)
    const urlParams = new URLSearchParams();
    
    // Tambahkan parameter tanggal jika ada filter tanggal
    // Pastikan kedua parameter dikirim jika salah satu ada (untuk konsistensi API)
    if (filterDateFrom) {
        const formattedFrom = formatDateForAPI(filterDateFrom);
        urlParams.append('tanggalfrom', formattedFrom);
    }
    
    if (filterDateTo) {
        const formattedTo = formatDateForAPI(filterDateTo);
        urlParams.append('tanggalto', formattedTo);
    }
    
    // Jika hanya ada satu tanggal, set yang lain sama dengan yang ada (untuk konsistensi)
    if (filterDateFrom && !filterDateTo) {
        const formattedFrom = formatDateForAPI(filterDateFrom);
        urlParams.append('tanggalto', formattedFrom);
    }
    
    if (filterDateTo && !filterDateFrom) {
        const formattedTo = formatDateForAPI(filterDateTo);
        urlParams.append('tanggalfrom', formattedTo);
    }
    
    // Tambahkan filter WO jika ada
    if (filterWo) {
        urlParams.append('wo', filterWo);
    }
    
    const url = urlParams.toString() 
        ? `${API_BASE_URL}/wira?${urlParams.toString()}`
        : `${API_BASE_URL}/wira`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                ...getDefaultHeaders(),
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data && data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
            // Filter data berdasarkan lineId yang dituju
            // API mengembalikan data dari semua line, jadi kita perlu filter
            const targetLineNum = parseInt(normalizedLineId, 10);
            
            const filteredData = data.data.filter((item: any) => {
                // Normalisasi line dari item (bisa string atau number)
                const itemLine = String(item.line || item.Line || item.LINE || '').trim();
                const itemLineMatch = itemLine.match(/(\d+)/);
                const itemLineNum = itemLineMatch ? parseInt(itemLineMatch[1], 10) : parseInt(itemLine, 10);
                
                // Match jika line sama dengan line yang dituju
                const lineMatch = !isNaN(itemLineNum) && !isNaN(targetLineNum) && itemLineNum === targetLineNum;
                
                // Jika ada filter WO, juga filter berdasarkan WO
                if (filterWo && lineMatch) {
                    const itemWo = String(item.WO || item.wo || '').trim();
                    // WO bisa berupa string dengan multiple WO (comma-separated)
                    const woList = itemWo.split(',').map((w: string) => w.trim());
                    const woMatch = woList.some((w: string) => 
                        w.includes(filterWo) || filterWo.includes(w)
                    );
                    return lineMatch && woMatch;
                }
                
                return lineMatch;
            });

            // Jika tidak ada data yang match dengan line yang dituju, return empty
            if (filteredData.length === 0) {
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
            }

            // Aggregate data HANYA dari item yang match dengan line yang dituju
            // Format data dari API: Good, Rework, Reject, WIRA, PQC Good, PQC Rework, PQC Reject, PQC WIRA, Output Sewing (semua number)
            const aggregated = filteredData.reduce((acc: any, item: any) => {
                return {
                    good: acc.good + parseNumber(item.Good || 0),
                    rework: acc.rework + parseNumber(item.Rework || 0),
                    reject: acc.reject + parseNumber(item.Reject || 0),
                    wiraQc: acc.wiraQc + parseNumber(item.WIRA || 0),
                    pqcGood: acc.pqcGood + parseNumber(item['PQC Good'] || 0),
                    pqcRework: acc.pqcRework + parseNumber(item['PQC Rework'] || 0),
                    pqcReject: acc.pqcReject + parseNumber(item['PQC Reject'] || 0),
                    wiraPqc: acc.wiraPqc + parseNumber(item['PQC WIRA'] || 0),
                    outputLine: acc.outputLine + parseNumber(item['Output Sewing'] || 0),
                };
            }, {
                good: 0,
                rework: 0,
                reject: 0,
                wiraQc: 0,
                pqcGood: 0,
                pqcRework: 0,
                pqcReject: 0,
                wiraPqc: 0,
                outputLine: 0,
            });

            return aggregated;
        }
    } catch (error) {
        console.error('Error fetching tracking data from API:', error);
    }

    // Return empty data jika error atau tidak ada data
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
};

// Fetch function untuk WO data
const fetchWoData = async (lineId: string, filterWo: string, filterDateFrom?: string, filterDateTo?: string) => {
    // Normalisasi lineId untuk API call
    const normalizedLineId = /^\d+$/.test(lineId) ? lineId : lineId.replace(/[^\d]/g, '') || '1';

    // API backend mengharapkan parameter line (huruf kecil) untuk endpoint /monitoring/line
    let url = `${API_BASE_URL}/monitoring/line?line=${encodeURIComponent(normalizedLineId)}`;

    if (filterWo) {
        url = `${API_BASE_URL}/wira?wo=${encodeURIComponent(filterWo)}`;
    }
    
    // Tambahkan filter tanggal jika ada
    // Pastikan kedua parameter dikirim jika salah satu ada (untuk konsistensi API)
    if (filterDateFrom) {
        const formattedFrom = formatDateForAPI(filterDateFrom);
        url += `&tanggalfrom=${encodeURIComponent(formattedFrom)}`;
    }
    
    if (filterDateTo) {
        const formattedTo = formatDateForAPI(filterDateTo);
        url += `&tanggalto=${encodeURIComponent(formattedTo)}`;
    }
    
    // Jika hanya ada satu tanggal, set yang lain sama dengan yang ada (untuk konsistensi)
    if (filterDateFrom && !filterDateTo) {
        const formattedFrom = formatDateForAPI(filterDateFrom);
        url += `&tanggalto=${encodeURIComponent(formattedFrom)}`;
    }
    
    if (filterDateTo && !filterDateFrom) {
        const formattedTo = formatDateForAPI(filterDateTo);
        url += `&tanggalfrom=${encodeURIComponent(formattedTo)}`;
    }

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            ...getDefaultHeaders(),
        },
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Debug log removed to avoid TypeScript error

    if (filterWo && data && data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
        const wiraData = data.data[0];
        return {
            wo: wiraData.WO || wiraData.wo || '-',
            style: wiraData.Style || wiraData.style || '-',
            buyer: wiraData.Buyer || wiraData.buyer || '-',
            item: wiraData.Item || wiraData.item || '-',
            color: wiraData.Color || wiraData.color || '-',
            size: wiraData.Size || wiraData.size || '-',
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
            line: wiraData.line || normalizedLineId
        };
    } else if (!filterWo && data && data.success) {
        // Handle berbagai format response dari /monitoring/line
        let woData = null;

        // Format 1: data.data adalah object langsung
        if (data.data && !Array.isArray(data.data) && typeof data.data === 'object') {
            woData = data.data;
        }
        // Format 2: data.data adalah array, ambil yang pertama atau filter berdasarkan line
        else if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            // Cari data yang sesuai dengan lineId
            const targetLineNum = parseInt(normalizedLineId, 10);
            woData = data.data.find((item: any) => {
                const itemLine = String(item.Line || item.line || item.LINE || '').trim();
                const itemLineMatch = itemLine.match(/(\d+)/);
                const itemLineNum = itemLineMatch ? parseInt(itemLineMatch[1], 10) : parseInt(itemLine, 10);
                return !isNaN(itemLineNum) && !isNaN(targetLineNum) && itemLineNum === targetLineNum;
            }) || data.data[0]; // Fallback ke item pertama jika tidak ditemukan
        }
        // Format 3: data langsung (bukan dalam data.data)
        else if (data.wo || data.WO) {
            woData = data;
        }

        // Transform ke format yang diharapkan
        if (woData) {
            return {
                wo: woData.WO || woData.wo || woData.wo_no || '-',
                style: woData.Style || woData.style || '-',
                buyer: woData.Buyer || woData.buyer || '-',
                item: woData.Item || woData.item || '-',
                color: woData.Color || woData.color || '-',
                size: woData.Size || woData.size || '-',
                balance: woData.Balance || woData.balance,
                good: woData.Good || woData.good,
                reject: woData.Reject || woData.reject,
                rework: woData.Rework || woData.rework,
                wira: woData.WIRA || woData.wira,
                outputSewing: woData['Output Sewing'] || woData.output_sewing || woData.outputSewing,
                pqcGood: woData['PQC Good'] || woData.pqc_good || woData.pqcGood,
                pqcReject: woData['PQC Reject'] || woData.pqc_reject || woData.pqcReject,
                pqcRework: woData['PQC Rework'] || woData.pqc_rework || woData.pqcRework,
                pqcWira: woData['PQC WIRA'] || woData.pqc_wira || woData.pqcWira,
                line: woData.Line || woData.line || woData.LINE || normalizedLineId
            };
        }
    }

    // Debug log removed to avoid TypeScript error

    return null;
};

export const useDashboardRFIDQuery = (lineId: string) => {
    // Get filter dan modal states dari store dengan useShallow untuk mencegah re-render
    const { filterWo, filterDateFrom, filterDateTo, isDateFilterActive, showExportModal, showDateFilterModal } = useDashboardStore(
        useShallow((state) => ({
            filterWo: state.filterWo,
            filterDateFrom: state.filterDateFrom,
            filterDateTo: state.filterDateTo,
            isDateFilterActive: state.isDateFilterActive,
            showExportModal: state.showExportModal,
            showDateFilterModal: state.showDateFilterModal,
        }))
    );

    // ============================================
    // LOGIKA: API POLLING (DEFAULT) vs FILTER TANGGAL
    // ============================================
    // DEFAULT: Gunakan API /wira dengan polling setiap 1 detik (tanpa filter tanggal)
    // FILTER AKTIF: Gunakan API /wira?tanggalfrom={from}&tanggalto={to} (setelah klik search)
    // ============================================
    // NOTE: WebSocket hook tetap ada di file useWiraDashboardWebSocket.ts untuk digunakan kembali nanti
    
    // Filter tanggal aktif hanya jika:
    // 1. User sudah klik search (isDateFilterActive = true)
    // 2. Dan ada minimal satu tanggal yang diisi
    const hasDateFilter = isDateFilterActive && !!(filterDateFrom?.trim() || filterDateTo?.trim());

    // ============================================
    // DEFAULT: API /wira dengan polling setiap 1 detik
    // ============================================
    // API: /wira (tanpa parameter, mengembalikan data hari ini untuk semua line)
    // Filter berdasarkan line dilakukan di client-side setelah data diterima
    // Query key hanya include tanggal jika filter aktif (untuk mencegah refetch saat user hanya mengubah tanggal tanpa klik search)
    const trackingDataQueryKey = ['dashboard-tracking', lineId, filterWo || '', isDateFilterActive, isDateFilterActive ? (filterDateFrom || '') : '', isDateFilterActive ? (filterDateTo || '') : ''] as const;
    
    const trackingDataQuery = useQuery({
        queryKey: trackingDataQueryKey,
        queryFn: () => {
            // Hanya kirim parameter tanggal jika filter aktif (setelah klik search)
            const dateFrom = isDateFilterActive ? (filterDateFrom || undefined) : undefined;
            const dateTo = isDateFilterActive ? (filterDateTo || undefined) : undefined;
            
            // Panggil API /wira dengan atau tanpa parameter filter tanggal
            // Format: /wira (default) atau /wira?tanggalfrom={from}&tanggalto={to}
            return fetchTrackingDataFromAPI(
                lineId, 
                filterWo || undefined, 
                dateFrom, 
                dateTo
            );
        },
        enabled: true, // Selalu aktif (baik dengan atau tanpa filter tanggal)
        refetchInterval: (query) => {
            if (query.state.status === 'error') {
                return 10000; // Retry setelah 10 detik jika error
            }
            return 1000; // Polling setiap 1 detik (default dan filter aktif)
        },
        staleTime: 0, // Data selalu dianggap stale untuk real-time
        gcTime: 30000, // Cache dihapus setelah 30 detik
        retry: (failureCount) => {
            if (failureCount < 3) return true;
            return false;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        networkMode: 'online',
    });

    // State untuk tracking data: Selalu dari API (dengan atau tanpa filter tanggal)
    const trackingState = useMemo(() => {
        return trackingDataQuery.data || {
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
    }, [trackingDataQuery.data]);

    // Query key untuk WO data - include filter tanggal
    // Query key untuk WO data - hanya include tanggal jika filter aktif (untuk mencegah refetch saat user hanya mengubah tanggal tanpa klik search)
    const woDataQueryKey = ['dashboard-wo', lineId, filterWo || '', isDateFilterActive, isDateFilterActive ? (filterDateFrom || '') : '', isDateFilterActive ? (filterDateTo || '') : ''] as const;

    // Query untuk WO data dengan polling setiap 5 detik
    const woDataQuery = useQuery({
        queryKey: woDataQueryKey,
        queryFn: () => {
            // Hanya kirim parameter tanggal jika filter aktif (setelah klik search)
            const dateFrom = isDateFilterActive ? (filterDateFrom || undefined) : undefined;
            const dateTo = isDateFilterActive ? (filterDateTo || undefined) : undefined;
            return fetchWoData(lineId, filterWo || '', dateFrom, dateTo);
        },
        refetchInterval: (query) => {
            // Hanya refetch jika query tidak dalam state loading/error
            // Fix: Pastikan refetch terus berjalan meskipun ada error sementara
            if (query.state.status === 'error') {
                // Retry setelah 10 detik jika error
                return 10000;
            }
            return 5000; // Polling setiap 5 detik
        },
        staleTime: 0, // Data selalu dianggap stale untuk real-time
        gcTime: 30000, // Cache dihapus setelah 30 detik
        retry: (failureCount) => {
            // Retry lebih agresif untuk memastikan real-time
            if (failureCount < 3) return true;
            return false;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: true, // Refetch saat window focus untuk memastikan data terbaru
        refetchOnMount: true, // Refetch saat mount
        refetchOnReconnect: true, // Refetch saat reconnect
        networkMode: 'online', // Hanya fetch saat online
    });

    // Determine loading state
    // Loading jika API query loading atau WO data loading
    const isLoading = trackingDataQuery.isLoading || woDataQuery.isLoading;

    // Return data dari API polling (dengan atau tanpa filter tanggal)
    return {
        // Data dari API /wira dengan polling setiap 1 detik
        good: trackingState.good,
        rework: trackingState.rework,
        reject: trackingState.reject,
        wiraQc: trackingState.wiraQc,
        pqcGood: trackingState.pqcGood,
        pqcRework: trackingState.pqcRework,
        pqcReject: trackingState.pqcReject,
        wiraPqc: trackingState.wiraPqc,
        outputLine: trackingState.outputLine,
        woData: woDataQuery.data ?? null,

        // Modal states dari store
        showExportModal,
        showDateFilterModal,

        // Filter states dari store
        filterDateFrom,
        filterDateTo,
        filterWo,

        // Query states untuk loading/error handling
        isLoading,
        isError: trackingDataQuery.isError || woDataQuery.isError,
        error: trackingDataQuery.error || woDataQuery.error,
    };
};


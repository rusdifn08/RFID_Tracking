/**
 * React Query Hooks untuk List RFID
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useParams } from 'react-router-dom';
import { useMemo, useCallback, useState } from 'react';
import { API_BASE_URL } from '../config/api';
import { exportListRFIDToExcel } from '../utils/exportToExcel';
import type { RFIDItem } from './useListRFID';

interface TrackingRFIDGarmentResponse {
    count: number;
    data: Array<{
        bagian: string;
        buyer: string;
        color: string;
        id: number;
        id_garment: number;
        item: string;
        last_status: string;
        line: string;
        nama: string;
        rejectCount: number;
        reworkCount: number;
        rfid_garment: string;
        rfid_user: string;
        size: string;
        style: string;
        timestamp: string;
        wo: string;
    }>;
}

// Fetch function untuk RFID data
const fetchRFIDData = async (): Promise<TrackingRFIDGarmentResponse> => {
    const apiUrl = `${API_BASE_URL}/tracking/rfid_garment`;
    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const rawResult = await response.json();
    
    if (rawResult.data && Array.isArray(rawResult.data)) {
        return rawResult as TrackingRFIDGarmentResponse;
    } else if (Array.isArray(rawResult)) {
        return {
            count: rawResult.length,
            data: rawResult
        };
    } else {
        return {
            count: rawResult.count || 0,
            data: rawResult.data || rawResult.items || rawResult.results || []
        };
    }
};

// Helper function untuk parse timestamp
const parseTimestamp = (timestamp: string): Date | null => {
    if (!timestamp) return null;
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return null;
        return date;
    } catch (e) {
        return null;
    }
};

// Helper function untuk map data
const mapRFIDData = (data: TrackingRFIDGarmentResponse['data'], currentLine: string): RFIDItem[] => {
    const mappedData: RFIDItem[] = data.map((item) => {
        let status = 'Unknown';
        if (item.last_status) {
            const upperStatus = item.last_status.toUpperCase().trim();
            if (upperStatus === 'GOOD') {
                status = 'Good';
            } else if (upperStatus === 'REWORK') {
                status = 'Rework';
            } else if (upperStatus === 'REJECT') {
                status = 'Reject';
            } else if (upperStatus === 'OUTPUT_SEWING' || upperStatus.includes('OUTPUT_SEWING')) {
                status = 'OUTPUT';
            } else {
                status = item.last_status;
            }
        }
        
        const itemLine = item.line?.toString() || '1';
        const bagian = (item.bagian || '').trim().toUpperCase();
        const lokasi = (bagian === 'IRON' || bagian === 'OPERATOR') ? 'SEWING' : (item.bagian || '').trim();
        
        return {
            id: item.id,
            rfid: item.rfid_garment,
            style: item.style,
            buyer: item.buyer,
            nomor_wo: item.wo,
            item: item.item,
            color: item.color,
            size: item.size,
            status: status,
            lokasi: lokasi,
            line: `Line ${itemLine}`,
            lineNumber: itemLine,
            timestamp: item.timestamp || '',
        };
    });
    
    // Filter by line
    let filteredByLine = mappedData;
    if (currentLine && currentLine !== 'all') {
        filteredByLine = mappedData.filter(item => {
            const itemLineNumber = item.lineNumber || '1';
            return String(itemLineNumber).trim() === String(currentLine).trim();
        });
    }
    
    // Remove duplicates by RFID, keep latest timestamp
    const uniqueRFIDData = filteredByLine.reduce((acc, current) => {
        const existingIndex = acc.findIndex(item => item.rfid === current.rfid);
        
        if (existingIndex === -1) {
            acc.push(current);
        } else {
            const existingTimestamp = parseTimestamp(acc[existingIndex].timestamp || '');
            const currentTimestamp = parseTimestamp(current.timestamp || '');
            
            if (currentTimestamp && existingTimestamp) {
                if (currentTimestamp > existingTimestamp) {
                    acc[existingIndex] = current;
                }
            } else if (currentTimestamp && !existingTimestamp) {
                acc[existingIndex] = current;
            }
        }
        
        return acc;
    }, [] as RFIDItem[]);
    
    return uniqueRFIDData;
};

export const useListRFIDQuery = () => {
    const location = useLocation();
    const { id } = useParams<{ id: string }>();
    const queryClient = useQueryClient();
    
    // Get line from URL
    const currentLine = useMemo(() => {
        if (id) return id;
        const urlParams = new URLSearchParams(location.search);
        const lineParam = urlParams.get('line');
        if (lineParam) return lineParam;
        const lineMatch = location.pathname.match(/\/list-rfid\/(\d+)/);
        if (lineMatch && lineMatch[1]) return lineMatch[1];
        return '1';
    }, [id, location]);
    
    // State untuk filters dan modals
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filterWO, setFilterWO] = useState<string>('');
    const [filterBuyer, setFilterBuyer] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterLocation, setFilterLocation] = useState<string>('');
    const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
    const [filterDateFrom, setFilterDateFrom] = useState<string>('');
    const [filterDateTo, setFilterDateTo] = useState<string>('');
    const [filterStatusModal, setFilterStatusModal] = useState<string>('Semua');
    const [filterSize, setFilterSize] = useState<string>('Semua');
    const [filterColor, setFilterColor] = useState<string>('Semua');
    const [selectedScan, setSelectedScan] = useState<RFIDItem | null>(null);
    const [showModal, setShowModal] = useState<boolean>(false);
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
    const [itemToDelete, setItemToDelete] = useState<RFIDItem | null>(null);
    const [showExportModal, setShowExportModal] = useState<boolean>(false);
    
    // Query untuk fetch RFID data
    const { data: queryData, isLoading, error, refetch } = useQuery({
        queryKey: ['list-rfid', currentLine],
        queryFn: fetchRFIDData,
        staleTime: 30000, // 30 detik
        refetchInterval: 60000, // Refetch setiap 1 menit
        retry: 1,
        refetchOnWindowFocus: false,
    });
    
    // Map data berdasarkan currentLine
    const rfidData = useMemo(() => {
        if (!queryData?.data) return [];
        return mapRFIDData(queryData.data, currentLine);
    }, [queryData, currentLine]);
    
    // Filter data
    const filteredData = useMemo(() => {
        return rfidData.filter(item => {
            const searchTrimmed = searchTerm.trim();
            const searchLower = searchTrimmed.toLowerCase();
            const matchSearch = !searchTrimmed || 
                (item.rfid?.toLowerCase() || '').includes(searchLower) ||
                (item.nomor_wo?.toLowerCase() || '').includes(searchLower) ||
                (item.style?.toLowerCase() || '').includes(searchLower) ||
                (item.buyer?.toLowerCase() || '').includes(searchLower) ||
                (item.item?.toLowerCase() || '').includes(searchLower) ||
                (item.color?.toLowerCase() || '').includes(searchLower) ||
                (item.size?.toLowerCase() || '').includes(searchLower) ||
                (item.status?.toLowerCase() || '').includes(searchLower) ||
                (item.lokasi?.toLowerCase() || '').includes(searchLower) ||
                (item.line?.toLowerCase() || '').includes(searchLower);

            const matchWO = !filterWO || item.nomor_wo === filterWO;
            const matchBuyer = !filterBuyer || item.buyer === filterBuyer;
            const matchStatus = !filterStatus || item.status === filterStatus;
            const matchLocation = !filterLocation || item.lokasi === filterLocation;

            let matchDate = true;
            if (filterDateFrom || filterDateTo) {
                const itemDate = parseTimestamp(item.timestamp || '');
                if (itemDate) {
                    if (filterDateFrom) {
                        const fromDate = new Date(filterDateFrom);
                        fromDate.setHours(0, 0, 0, 0);
                        if (itemDate < fromDate) {
                            matchDate = false;
                        }
                    }
                    if (filterDateTo) {
                        const toDate = new Date(filterDateTo);
                        toDate.setHours(23, 59, 59, 999);
                        if (itemDate > toDate) {
                            matchDate = false;
                        }
                    }
                } else {
                    matchDate = false;
                }
            }

            const matchStatusModal = filterStatusModal === 'Semua' || item.status === filterStatusModal;
            const matchSize = filterSize === 'Semua' || item.size === filterSize;
            const matchColor = filterColor === 'Semua' || item.color === filterColor;

            return matchSearch && matchWO && matchBuyer && matchStatus && matchLocation && 
                   matchDate && matchStatusModal && matchSize && matchColor;
        });
    }, [rfidData, searchTerm, filterWO, filterBuyer, filterStatus, filterLocation, 
        filterDateFrom, filterDateTo, filterStatusModal, filterSize, filterColor]);
    
    // Get unique values for filters
    const uniqueWO = useMemo(() => 
        [...new Set(rfidData.map(item => item.nomor_wo).filter(Boolean))].sort(),
        [rfidData]
    );
    const uniqueBuyers = useMemo(() => 
        [...new Set(rfidData.map(item => item.buyer).filter(Boolean))].sort(),
        [rfidData]
    );
    const uniqueStatuses = useMemo(() => 
        [...new Set(rfidData.map(item => item.status).filter(Boolean))].sort(),
        [rfidData]
    );
    const uniqueLocations = useMemo(() => 
        [...new Set(rfidData.map(item => item.lokasi).filter(Boolean))].sort(),
        [rfidData]
    );
    const uniqueSizes = useMemo(() => 
        [...new Set(rfidData.map(item => item.size).filter(Boolean))].sort(),
        [rfidData]
    );
    const uniqueColors = useMemo(() => 
        [...new Set(rfidData.map(item => item.color).filter(Boolean))].sort(),
        [rfidData]
    );
    
    // Mutation untuk delete (jika diperlukan di masa depan)
    const deleteMutation = useMutation({
        mutationFn: async (_itemId: string | number) => {
            // Implementasi delete jika diperlukan
            return Promise.resolve();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['list-rfid'] });
        },
    });
    
    // Reset filter modal
    const handleResetFilter = useCallback(() => {
        setFilterDateFrom('');
        setFilterDateTo('');
        setFilterStatusModal('Semua');
        setFilterSize('Semua');
        setFilterColor('Semua');
    }, []);
    
    // Filter data handler
    const handleFilterData = useCallback(() => {
        setShowFilterModal(false);
    }, []);
    
    // Handle view details
    const handleView = useCallback((item: RFIDItem) => {
        setSelectedScan(item);
        setShowModal(true);
    }, []);
    
    // Handle close modal
    const handleCloseModal = useCallback(() => {
        setShowModal(false);
        setSelectedScan(null);
    }, []);
    
    // Handle delete
    const handleDelete = useCallback((item: RFIDItem) => {
        setItemToDelete(item);
        setShowDeleteModal(true);
    }, []);
    
    // Confirm delete
    const confirmDelete = useCallback(async () => {
        if (!itemToDelete) return;
        // Untuk sekarang hanya remove dari local state
        // Di masa depan bisa menggunakan deleteMutation
        setShowDeleteModal(false);
        setItemToDelete(null);
        // Invalidate query untuk refresh data
        queryClient.invalidateQueries({ queryKey: ['list-rfid'] });
    }, [itemToDelete, queryClient]);
    
    // Cancel delete
    const cancelDelete = useCallback(() => {
        setShowDeleteModal(false);
        setItemToDelete(null);
    }, []);
    
    // Handle refresh
    const handleRefresh = useCallback(() => {
        refetch();
    }, [refetch]);
    
    // Handle export
    const handleExport = useCallback(async (format: 'excel' | 'csv') => {
        const statusCounts = {
            Good: filteredData.filter(item => item.status === 'Good').length,
            Rework: filteredData.filter(item => item.status === 'Rework').length,
            Reject: filteredData.filter(item => item.status === 'Reject').length,
            OUTPUT: filteredData.filter(item => item.status === 'OUTPUT').length,
            Unknown: filteredData.filter(item => !['Good', 'Rework', 'Reject', 'OUTPUT'].includes(item.status)).length
        };

        const lokasiCounts: Record<string, number> = {};
        filteredData.forEach(item => {
            const lokasi = item.lokasi || 'Unknown';
            lokasiCounts[lokasi] = (lokasiCounts[lokasi] || 0) + 1;
        });

        const lineId = currentLine || '1';
        const summary = {
            totalData: filteredData.length,
            statusCounts,
            lokasiCounts,
            line: `Line ${lineId}`,
            exportDate: new Date().toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            })
        };

        await exportListRFIDToExcel(filteredData, lineId, format, summary);
    }, [filteredData, currentLine]);
    
    return {
        // Data
        rfidData,
        filteredData,
        loading: isLoading,
        error: error instanceof Error ? error.message : null,
        currentLine,
        
        // Search
        searchTerm,
        setSearchTerm,
        
        // Filters
        filterWO,
        setFilterWO,
        filterBuyer,
        setFilterBuyer,
        filterStatus,
        setFilterStatus,
        filterLocation,
        setFilterLocation,
        
        // Modal filters
        showFilterModal,
        setShowFilterModal,
        filterDateFrom,
        setFilterDateFrom,
        filterDateTo,
        setFilterDateTo,
        filterStatusModal,
        setFilterStatusModal,
        filterSize,
        setFilterSize,
        filterColor,
        setFilterColor,
        
        // Modals
        selectedScan,
        setSelectedScan,
        showModal,
        setShowModal,
        showDeleteModal,
        setShowDeleteModal,
        itemToDelete,
        setItemToDelete,
        isDeleting: deleteMutation.isPending,
        setIsDeleting: () => {},
        showExportModal,
        setShowExportModal,
        
        // Unique values
        uniqueWO,
        uniqueBuyers,
        uniqueStatuses,
        uniqueLocations,
        uniqueSizes,
        uniqueColors,
        
        // Functions
        fetchRFIDData: handleRefresh,
        parseTimestamp,
        handleResetFilter,
        handleFilterData,
        handleView,
        handleCloseModal,
        handleDelete,
        confirmDelete,
        cancelDelete,
        handleRefresh,
        handleExport,
    };
};


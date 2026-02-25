/**
 * React Query Hooks untuk Checking RFID
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { API_BASE_URL, getDefaultHeaders } from '../config/api';

export interface RFIDCheckItem {
    rfid: string;
    timestamp: Date;
    status: 'found' | 'not_found' | 'checking';
    location?: string;
    details?: string;
    wo?: string;
    style?: string;
    buyer?: string;
    item?: string;
    color?: string;
    size?: string;
    line?: string;
    lastScanned?: string;
    lokasi?: string;
    statusData?: string;
}

interface UseCheckingRFIDReturn {
    // Input state
    rfidInput: string;
    setRfidInput: (value: string) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    
    // Check items state
    checkItems: RFIDCheckItem[];
    setCheckItems: React.Dispatch<React.SetStateAction<RFIDCheckItem[]>>;
    
    // Loading state
    isChecking: boolean;
    setIsChecking: (value: boolean) => void;
    
    // Filter states
    filterStatus: 'all' | 'found' | 'not_found';
    setFilterStatus: (value: 'all' | 'found' | 'not_found') => void;
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    
    // Modal states
    showTrackingModal: boolean;
    setShowTrackingModal: (value: boolean) => void;
    trackingData: any[];
    setTrackingData: React.Dispatch<React.SetStateAction<any[]>>;
    loadingTracking: boolean;
    setLoadingTracking: (value: boolean) => void;
    selectedRfid: string;
    setSelectedRfid: (value: string) => void;
    
    // Handler functions
    handleRfidCheck: (rfid: string) => Promise<void>;
    handleKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    filteredItems: RFIDCheckItem[];
}

// Satu API: GET /tracking?rfid_garment=XXX
// Response: { success, message, garment_detail, tracking_count, tracking_history }
const fetchTrackingByRfid = async (rfid: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/tracking?rfid_garment=${encodeURIComponent(rfid)}`, {
        method: 'GET',
        headers: {
            ...getDefaultHeaders(),
        },
    });

    if (!response.ok) {
        throw new Error('RFID tidak ditemukan di database');
    }

    return await response.json();
};

export const useCheckingRFIDQuery = (): UseCheckingRFIDReturn => {
    const [rfidInput, setRfidInput] = useState('');
    const [checkItems, setCheckItems] = useState<RFIDCheckItem[]>([]);
    const [isChecking, setIsChecking] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'all' | 'found' | 'not_found'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const [showTrackingModal, setShowTrackingModal] = useState<boolean>(false);
    const [trackingData, setTrackingData] = useState<any[]>([]);
    const [loadingTracking, setLoadingTracking] = useState<boolean>(false);
    const [selectedRfid, setSelectedRfid] = useState<string>('');

    // Auto focus input saat halaman dimuat
    useEffect(() => {
        if (inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, []);

    // Helper: map last_status ke statusData
    const mapStatusData = (lastStatus: string | undefined): string => {
        if (!lastStatus) return 'Unknown';
        const upper = lastStatus.toUpperCase().trim();
        if (upper === 'GOOD') return 'Good';
        if (upper === 'REWORK') return 'Rework';
        if (upper === 'REJECT') return 'Reject';
        if (upper === 'OUTPUT_SEWING' || upper.includes('OUTPUT_SEWING')) return 'OUTPUT';
        return lastStatus;
    };

    // Helper: map bagian ke lokasi
    const mapLokasi = (bagian: string | undefined): string => {
        if (!bagian) return '';
        const b = bagian.trim().toUpperCase();
        if (b === 'IRON' || b === 'OPERATOR') return 'SEWING';
        if (b === 'CUTTING') return 'CUTTING';
        return bagian;
    };

    // Mutation untuk check RFID (satu API /tracking?rfid_garment=)
    const checkRFIDMutation = useMutation({
        mutationFn: fetchTrackingByRfid,
        onSuccess: (data, rfid) => {
            const timestamp = new Date();
            let newItem: RFIDCheckItem;

            if (data.success && data.garment_detail) {
                const g = data.garment_detail;
                const history = Array.isArray(data.tracking_history) ? data.tracking_history : [];
                const latest = history[0]; // terbaru pertama

                const statusData = latest ? mapStatusData(latest.last_status) : 'Unknown';
                const lokasi = latest ? mapLokasi(latest.bagian) : '';

                newItem = {
                    rfid: rfid.trim(),
                    timestamp,
                    status: 'found',
                    wo: g.wo || latest?.wo || '',
                    style: g.style || latest?.style || '',
                    buyer: g.buyer || latest?.buyer || '',
                    item: g.item || latest?.item || '',
                    color: g.color || latest?.color || '',
                    size: g.size || latest?.size || '',
                    line: latest?.line || '',
                    lastScanned: latest?.timestamp || g.timestamp || '',
                    lokasi,
                    statusData,
                    details: data.message || `Found in ${lokasi || 'Unknown'} - Status: ${statusData}`,
                };
            } else {
                newItem = {
                    rfid: rfid.trim(),
                    timestamp,
                    status: 'not_found',
                    details: data.message || 'RFID tidak ditemukan di database',
                };
            }

            setCheckItems(prev => [newItem, ...prev]);
            setRfidInput('');
            setIsChecking(false);

            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        },
        onError: (error, rfid) => {
            const timestamp = new Date();
            const newItem: RFIDCheckItem = {
                rfid: rfid.trim(),
                timestamp,
                status: 'not_found',
                details: error instanceof Error ? error.message : 'Error saat checking RFID',
            };
            setCheckItems(prev => [newItem, ...prev]);
            setRfidInput('');
            setIsChecking(false);

            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        },
    });

    // Query untuk tracking history (modal) - sama API, return tracking_history
    const { data: trackingQueryData, isLoading: isLoadingTracking } = useQuery({
        queryKey: ['tracking-rfid', selectedRfid],
        queryFn: async () => {
            const res = await fetchTrackingByRfid(selectedRfid);
            if (res.success && Array.isArray(res.tracking_history)) return res.tracking_history;
            return [];
        },
        enabled: showTrackingModal && !!selectedRfid,
        staleTime: 30000,
        retry: 1,
    });

    // Reset tracking data saat pilihan RFID berubah (hindari tampil data lama saat buka modal)
    useEffect(() => {
        setTrackingData([]);
    }, [selectedRfid]);

    // Update tracking data saat query data berubah
    useEffect(() => {
        if (trackingQueryData) {
            setTrackingData(trackingQueryData);
            setLoadingTracking(false);
        }
    }, [trackingQueryData]);

    // Update loading state
    useEffect(() => {
        setLoadingTracking(isLoadingTracking);
    }, [isLoadingTracking]);

    // Handle RFID check dengan mutation
    const handleRfidCheck = useCallback(async (rfid: string) => {
        if (!rfid.trim()) return;

        const trimmedRfid = rfid.trim();
        setIsChecking(true);

        // Delay untuk UX
        setTimeout(() => {
            checkRFIDMutation.mutate(trimmedRfid);
        }, 500);
    }, [checkRFIDMutation]);

    // Handle Enter key
    const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !isChecking) {
            handleRfidCheck(rfidInput);
        }
    }, [isChecking, rfidInput, handleRfidCheck]);

    // Filter items berdasarkan status dan search query
    const filteredItems = useMemo(() => {
        return checkItems.filter(item => {
            const matchStatus = filterStatus === 'all' || item.status === filterStatus;
            const matchSearch = !searchQuery.trim() || 
                item.rfid.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.wo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.style?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.buyer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.item?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.color?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.size?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.line?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.lokasi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.statusData?.toLowerCase().includes(searchQuery.toLowerCase());
            
            return matchStatus && matchSearch;
        });
    }, [checkItems, filterStatus, searchQuery]);

    return {
        rfidInput,
        setRfidInput,
        inputRef,
        checkItems,
        setCheckItems,
        isChecking: isChecking || checkRFIDMutation.isPending,
        setIsChecking,
        filterStatus,
        setFilterStatus,
        searchQuery,
        setSearchQuery,
        showTrackingModal,
        setShowTrackingModal,
        trackingData,
        setTrackingData,
        loadingTracking,
        setLoadingTracking,
        selectedRfid,
        setSelectedRfid,
        handleRfidCheck,
        handleKeyPress,
        filteredItems,
    };
};


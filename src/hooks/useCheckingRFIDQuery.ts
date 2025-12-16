/**
 * React Query Hooks untuk Checking RFID
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

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

// Fetch function untuk check RFID
const checkRFID = async (rfid: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/tracking/rfid_garment?rfid_garment=${encodeURIComponent(rfid)}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('RFID tidak ditemukan di database');
    }

    const data = await response.json();
    return data;
};

// Fetch function untuk tracking data
const fetchTrackingData = async (rfid: string): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/tracking/rfid_garment?rfid_garment=${encodeURIComponent(rfid)}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Gagal memuat tracking data');
    }

    const data = await response.json();
    if (data.success && data.data && Array.isArray(data.data)) {
        return data.data;
    }
    return [];
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

    // Mutation untuk check RFID
    const checkRFIDMutation = useMutation({
        mutationFn: checkRFID,
        onSuccess: (data, rfid) => {
            const timestamp = new Date();
            let newItem: RFIDCheckItem;

            if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
                const latestData = data.data[0];
                
                let statusData = 'Unknown';
                if (latestData.last_status) {
                    const upperStatus = latestData.last_status.toUpperCase().trim();
                    if (upperStatus === 'GOOD') {
                        statusData = 'Good';
                    } else if (upperStatus === 'REWORK') {
                        statusData = 'Rework';
                    } else if (upperStatus === 'REJECT') {
                        statusData = 'Reject';
                    } else if (upperStatus === 'OUTPUT_SEWING' || upperStatus.includes('OUTPUT_SEWING')) {
                        statusData = 'OUTPUT';
                    } else {
                        statusData = latestData.last_status;
                    }
                }
                
                let lokasi = '';
                if (latestData.bagian) {
                    const bagian = latestData.bagian.trim().toUpperCase();
                    if (bagian === 'IRON' || bagian === 'OPERATOR') {
                        lokasi = 'SEWING';
                    } else if (bagian === 'CUTTING') {
                        lokasi = 'CUTTING';
                    } else {
                        lokasi = bagian;
                    }
                }

                newItem = {
                    rfid: rfid.trim(),
                    timestamp,
                    status: 'found',
                    wo: latestData.wo || '',
                    style: latestData.style || '',
                    buyer: latestData.buyer || '',
                    item: latestData.item || '',
                    color: latestData.color || '',
                    size: latestData.size || '',
                    line: latestData.line || '',
                    lastScanned: latestData.timestamp || '',
                    lokasi: lokasi,
                    statusData: statusData,
                    details: `Found in ${lokasi || 'Unknown'} - Status: ${statusData}`,
                };
            } else {
                newItem = {
                    rfid: rfid.trim(),
                    timestamp,
                    status: 'not_found',
                    details: 'RFID tidak ditemukan di database',
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

    // Query untuk tracking data (hanya fetch saat modal dibuka)
    const { data: trackingQueryData, isLoading: isLoadingTracking } = useQuery({
        queryKey: ['tracking-rfid', selectedRfid],
        queryFn: () => fetchTrackingData(selectedRfid),
        enabled: showTrackingModal && !!selectedRfid,
        staleTime: 30000,
        retry: 1,
    });

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


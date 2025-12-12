import { useState, useEffect, useRef } from 'react';
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

export const useCheckingRFID = (): UseCheckingRFIDReturn => {
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

    // Handle RFID check dengan API
    const handleRfidCheck = async (rfid: string) => {
        if (!rfid.trim()) return;

        const trimmedRfid = rfid.trim();
        setIsChecking(true);

        setTimeout(async () => {
            try {
                const trackingResponse = await fetch(`${API_BASE_URL}/tracking/rfid_garment?rfid_garment=${encodeURIComponent(trimmedRfid)}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                });

                const timestamp = new Date();
                let newItem: RFIDCheckItem;

                if (trackingResponse.ok) {
                    const trackingData = await trackingResponse.json();
                    if (trackingData.success && trackingData.data && Array.isArray(trackingData.data) && trackingData.data.length > 0) {
                        const latestData = trackingData.data[0];
                        
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
                            rfid: trimmedRfid,
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
                            rfid: trimmedRfid,
                            timestamp,
                            status: 'not_found',
                            details: 'RFID tidak ditemukan di database',
                        };
                    }
                } else {
                    newItem = {
                        rfid: trimmedRfid,
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
            } catch (error) {
                const timestamp = new Date();
                const newItem: RFIDCheckItem = {
                    rfid: trimmedRfid,
                    timestamp,
                    status: 'not_found',
                    details: 'Error saat checking RFID',
                };
                setCheckItems(prev => [newItem, ...prev]);
                setRfidInput('');
                setIsChecking(false);

                setTimeout(() => {
                    inputRef.current?.focus();
                }, 100);
            }
        }, 500);
    };

    // Handle Enter key
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !isChecking) {
            handleRfidCheck(rfidInput);
        }
    };

    // Filter items berdasarkan status dan search query
    const filteredItems = checkItems.filter(item => {
        const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
        const matchesSearch = searchQuery === '' || 
            item.rfid.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.wo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.style?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.buyer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.item?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.color?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.size?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return {
        rfidInput,
        setRfidInput,
        inputRef,
        checkItems,
        setCheckItems,
        isChecking,
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


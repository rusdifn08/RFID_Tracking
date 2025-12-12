import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL, getWOBreakdown } from '../config/api';
import type { WOBreakdownData } from '../config/api';

interface WorkOrderData {
    workOrder: string;
    styles: string[];
    buyers: string[];
    items: string[];
    colors: string[];
    sizes: string[];
}

interface UseDaftarRFIDReturn {
    // Date filter states
    dateFrom: string;
    setDateFrom: (date: string) => void;
    dateTo: string;
    setDateTo: (date: string) => void;
    showDateFilterModal: boolean;
    setShowDateFilterModal: (show: boolean) => void;
    
    // Modal states
    showRegisteredModal: boolean;
    setShowRegisteredModal: (show: boolean) => void;
    showScanRejectModal: boolean;
    setShowScanRejectModal: (show: boolean) => void;
    isModalOpen: boolean;
    setIsModalOpen: (open: boolean) => void;
    
    // Reject scan states
    rejectRfidInput: string;
    setRejectRfidInput: (value: string) => void;
    rejectScannedItems: Array<{ rfid: string; timestamp: Date; status: 'success' | 'error'; message?: string }>;
    setRejectScannedItems: React.Dispatch<React.SetStateAction<Array<{ rfid: string; timestamp: Date; status: 'success' | 'error'; message?: string }>>>;
    isProcessingReject: boolean;
    setIsProcessingReject: (value: boolean) => void;
    rejectInputRef: React.RefObject<HTMLInputElement | null>;
    
    // Registered RFID states
    registeredRFIDData: any[];
    setRegisteredRFIDData: React.Dispatch<React.SetStateAction<any[]>>;
    loadingRegistered: boolean;
    setLoadingRegistered: (value: boolean) => void;
    
    // Filter states
    filterStatus: string;
    setFilterStatus: (value: string) => void;
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    filterColor: string;
    setFilterColor: (value: string) => void;
    filterSize: string;
    setFilterSize: (value: string) => void;
    
    // Work order data
    workOrderData: Record<string, WorkOrderData>;
    setWorkOrderData: React.Dispatch<React.SetStateAction<Record<string, WorkOrderData>>>;
    loading: boolean;
    setLoading: (value: boolean) => void;
    
    // Form data
    formData: {
        workOrder: string;
        style: string;
        buyer: string;
        item: string;
        color: string;
        size: string;
    };
    setFormData: React.Dispatch<React.SetStateAction<{
        workOrder: string;
        style: string;
        buyer: string;
        item: string;
        color: string;
        size: string;
    }>>;
    focusedInput: string | null;
    setFocusedInput: (value: string | null) => void;
    hoveredCard: boolean;
    setHoveredCard: (value: boolean) => void;
    
    // Helper functions
    fetchProductionBranchData: () => Promise<void>;
    fetchRegisteredRFID: () => Promise<void>;
    handleRejectRfidSubmit: (rfid: string) => Promise<void>;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    handleSubmit: (e: React.FormEvent) => boolean;
    getItemStatus: (item: any) => string;
    filteredRegisteredData: any[];
    uniqueColors: string[];
    uniqueSizes: string[];
    selectedWOData: WorkOrderData | null;
    availableStyles: string[];
    availableBuyers: string[];
    availableItems: string[];
    availableColors: string[];
    availableSizes: string[];
    modalOpenRef: React.MutableRefObject<boolean>;
}

export const useDaftarRFID = (): UseDaftarRFIDReturn => {
    // Date range state - default hari ini
    const getTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    const [dateFrom, setDateFrom] = useState<string>(getTodayDate());
    const [dateTo, setDateTo] = useState<string>(getTodayDate());
    const [showDateFilterModal, setShowDateFilterModal] = useState<boolean>(false);
    const [showRegisteredModal, setShowRegisteredModal] = useState<boolean>(false);
    const [showScanRejectModal, setShowScanRejectModal] = useState<boolean>(false);
    const [rejectRfidInput, setRejectRfidInput] = useState<string>('');
    const [rejectScannedItems, setRejectScannedItems] = useState<Array<{ rfid: string; timestamp: Date; status: 'success' | 'error'; message?: string }>>([]);
    const [isProcessingReject, setIsProcessingReject] = useState<boolean>(false);
    const rejectInputRef = useRef<HTMLInputElement>(null);
    const [registeredRFIDData, setRegisteredRFIDData] = useState<any[]>([]);
    const [loadingRegistered, setLoadingRegistered] = useState<boolean>(false);
    const [filterStatus, setFilterStatus] = useState<string>('Semua');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filterColor, setFilterColor] = useState<string>('Semua');
    const [filterSize, setFilterSize] = useState<string>('Semua');
    const [workOrderData, setWorkOrderData] = useState<Record<string, WorkOrderData>>({});
    const [loading, setLoading] = useState<boolean>(false);
    
    const [formData, setFormData] = useState({
        workOrder: '',
        style: '',
        buyer: '',
        item: '',
        color: '',
        size: ''
    });
    const [focusedInput, setFocusedInput] = useState<string | null>(null);
    const [hoveredCard, setHoveredCard] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const modalOpenRef = useRef(false);

    // Get available options based on selected Work Order
    const selectedWOData = formData.workOrder ? workOrderData[formData.workOrder] : null;
    const availableStyles = selectedWOData?.styles || [];
    const availableBuyers = selectedWOData?.buyers || [];
    const availableItems = selectedWOData?.items || [];
    const availableColors = selectedWOData?.colors || [];
    const availableSizes = selectedWOData?.sizes || [];

    // Function ini sekarang dipindahkan ke useCallback di atas untuk mencegah re-creation
    // fetchProductionBranchData sekarang adalah fetchProductionBranchDataMemo

    // Fetch data registered RFID dari 3 endpoint
    const fetchRegisteredRFID = async () => {
        try {
            setLoadingRegistered(true);
            
            const [progressResponse, doneResponse, waitingResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/card/progress`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                }),
                fetch(`${API_BASE_URL}/card/done`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                }),
                fetch(`${API_BASE_URL}/card/waiting`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                }),
            ]);

            let progressData = { data: [] };
            let doneData = { data: [] };
            let waitingData = { data: [] };

            if (progressResponse.ok) {
                try {
                    progressData = await progressResponse.json();
                } catch (e) {
                    console.error('Error parsing progress response:', e);
                }
            }

            if (doneResponse.ok) {
                try {
                    doneData = await doneResponse.json();
                } catch (e) {
                    console.error('Error parsing done response:', e);
                }
            }

            if (waitingResponse.ok) {
                try {
                    waitingData = await waitingResponse.json();
                } catch (e) {
                    console.error('Error parsing waiting response:', e);
                }
            }

            const allData = [
                ...(progressData.data || []).map((item: any) => ({ ...item, _source: 'progress' })),
                ...(doneData.data || []).map((item: any) => ({ ...item, _source: 'done' })),
                ...(waitingData.data || []).map((item: any) => ({ ...item, _source: 'waiting', isDone: 'waiting' })),
            ];

            setRegisteredRFIDData(Array.isArray(allData) ? allData : []);
        } catch (error) {
            console.error('Error fetching registered RFID:', error);
            setRegisteredRFIDData([]);
        } finally {
            setLoadingRegistered(false);
        }
    };

    // Helper function untuk mendapatkan status dari item
    const getItemStatus = (item: any): string => {
        if (!item) {
            return 'In Progress';
        }
        
        const isDone = item.isDone;
        
        if (!isDone || 
            isDone === '' || 
            isDone === null || 
            isDone === undefined || 
            isDone === 0 || 
            isDone === false ||
            String(isDone).trim().toLowerCase() === '0' ||
            String(isDone).trim().toLowerCase() === 'false' ||
            String(isDone).trim().toLowerCase() === 'null' ||
            String(isDone).trim().toLowerCase() === 'undefined') {
            return 'In Progress';
        }
        
        const isDoneStr = String(isDone).trim().toLowerCase();
        
        if (isDoneStr === '') {
            return 'In Progress';
        }
        
        if (isDoneStr === 'waiting') {
            return 'Waiting';
        }
        
        return 'isDone';
    };

    // Get unique values untuk filter
    const uniqueColors = [...new Set(registeredRFIDData.map(item => item.color).filter(Boolean))].sort();
    const uniqueSizes = [...new Set(registeredRFIDData.map(item => item.size).filter(Boolean))].sort();

    // Filter data
    const filteredRegisteredData = registeredRFIDData.filter(item => {
        if (filterStatus !== 'Semua') {
            const itemStatus = getItemStatus(item);
            if (itemStatus !== filterStatus) return false;
        }
        
        if (filterColor !== 'Semua' && item.color !== filterColor) return false;
        
        if (filterSize !== 'Semua' && item.size !== filterSize) return false;
        
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            return (
                (item.rfid_garment?.toLowerCase() || '').includes(searchLower) ||
                (item.wo?.toLowerCase() || '').includes(searchLower) ||
                (item.style?.toLowerCase() || '').includes(searchLower) ||
                (item.buyer?.toLowerCase() || '').includes(searchLower) ||
                (item.item?.toLowerCase() || '').includes(searchLower) ||
                (item.color?.toLowerCase() || '').includes(searchLower) ||
                (item.size?.toLowerCase() || '').includes(searchLower)
            );
        }
        
        return true;
    });

    // Handle Reject RFID Submit
    const handleRejectRfidSubmit = async (rfid: string) => {
        if (!rfid.trim() || isProcessingReject) return;

        setIsProcessingReject(true);
        const timestamp = new Date();

        try {
            const response = await fetch(`${API_BASE_URL}/scrap`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    rfid_garment: rfid
                })
            });

            const responseData = await response.json();

            if (response.ok && responseData.success) {
                setRejectScannedItems(prev => [{
                    rfid: rfid,
                    timestamp: timestamp,
                    status: 'success' as const,
                    message: responseData.message || 'Berhasil diset ke SCRAP'
                }, ...prev]);
                setRejectRfidInput('');
                setTimeout(() => {
                    rejectInputRef.current?.focus();
                }, 100);
            } else {
                throw new Error(responseData.message || 'Gagal menyimpan data');
            }
        } catch (error) {
            setRejectScannedItems(prev => [{
                rfid: rfid,
                timestamp: timestamp,
                status: 'error' as const,
                message: error instanceof Error ? error.message : 'Gagal menyimpan data'
            }, ...prev]);
            setRejectRfidInput('');
            setTimeout(() => {
                rejectInputRef.current?.focus();
            }, 100);
        } finally {
            setIsProcessingReject(false);
        }
    };

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        if (name === 'workOrder') {
            // Get data untuk WO yang dipilih
            const woData = workOrderData[value];
            
            // Auto-fill STYLE, BUYER, dan ITEM jika hanya ada 1 opsi
            const autoStyle = woData?.styles?.length === 1 ? woData.styles[0] : '';
            const autoBuyer = woData?.buyers?.length === 1 ? woData.buyers[0] : '';
            const autoItem = woData?.items?.length === 1 ? woData.items[0] : '';
            
            setFormData({
                workOrder: value,
                style: autoStyle,
                buyer: autoBuyer,
                item: autoItem,
                color: '',
                size: ''
            });
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    // Handle form submit
    const handleSubmit = (e: React.FormEvent): boolean => {
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        
        if (!formData.workOrder || !formData.style || !formData.buyer || !formData.item || !formData.color || !formData.size) {
            alert('Mohon lengkapi semua field sebelum melanjutkan.');
            return false;
        }
        
        modalOpenRef.current = true;
        setIsModalOpen(prev => {
            if (prev === true) {
                return prev;
            }
            return true;
        });
        
        return false;
    };

    // Fetch data saat modal dibuka
    useEffect(() => {
        if (showRegisteredModal) {
            fetchRegisteredRFID();
        }
    }, [showRegisteredModal]);

    // Reset reject modal saat dibuka/ditutup
    useEffect(() => {
        if (showScanRejectModal) {
            setRejectRfidInput('');
            setRejectScannedItems([]);
            setIsProcessingReject(false);
            setTimeout(() => {
                rejectInputRef.current?.focus();
            }, 100);
        }
    }, [showScanRejectModal]);

    // Debounce timer ref untuk mencegah terlalu banyak request
    const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isFetchingRef = useRef<boolean>(false);
    const lastFetchParamsRef = useRef<string>('');

    // Wrap fetchProductionBranchData dengan useCallback untuk mencegah re-creation
    const fetchProductionBranchDataMemo = useCallback(async () => {
        // Prevent multiple simultaneous requests
        if (isFetchingRef.current) {
            console.log('⏳ [useDaftarRFID] Already fetching, skipping duplicate request');
            return;
        }

        // Check if parameters have changed
        const currentParams = `${dateFrom}-${dateTo}`;
        if (lastFetchParamsRef.current === currentParams && isFetchingRef.current === false) {
            console.log('⏳ [useDaftarRFID] Parameters unchanged, skipping fetch');
            return;
        }

        try {
            console.log('🟡 [useDaftarRFID] Starting fetchProductionBranchData...');
            isFetchingRef.current = true;
            lastFetchParamsRef.current = currentParams;
            setLoading(true);
            
            const formatDateForAPI = (dateStr: string) => {
                const [year, month, day] = dateStr.split('-');
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            };
            
            const startDateFrom = dateFrom ? formatDateForAPI(dateFrom) : undefined;
            const startDateTo = dateTo ? formatDateForAPI(dateTo) : undefined;
            
            console.log('🟡 [useDaftarRFID] Calling getWOBreakdown with:', {
                branch: 'CJL',
                line: 'L1',
                startDateFrom,
                startDateTo
            });
            
            const response = await getWOBreakdown(
                'CJL',
                'L1',
                startDateFrom,
                startDateTo
            );

            console.log('🟡 [useDaftarRFID] Response received:', response);

            if (!response.success || !response.data) {
                const errorMsg = response.error || 'Gagal mengambil data WO';
                console.error('❌ [useDaftarRFID] API Error:', errorMsg);
                throw new Error(errorMsg);
            }

            const result = response.data;
            const processedData: Record<string, WorkOrderData> = {};
            
            if (result.data && Array.isArray(result.data)) {
                console.log('🟡 [useDaftarRFID] Processing', result.data.length, 'items');
                result.data.forEach((item: WOBreakdownData) => {
                    const woNo = item.wo_no;
                    
                    if (!processedData[woNo]) {
                        processedData[woNo] = {
                            workOrder: woNo,
                            styles: [],
                            buyers: [],
                            items: [],
                            colors: [],
                            sizes: []
                        };
                    }
                    
                    if (item.style && !processedData[woNo].styles.includes(item.style)) {
                        processedData[woNo].styles.push(item.style);
                    }
                    
                    if (item.buyer && !processedData[woNo].buyers.includes(item.buyer)) {
                        processedData[woNo].buyers.push(item.buyer);
                    }
                    
                    if (item.product_name && !processedData[woNo].items.includes(item.product_name)) {
                        processedData[woNo].items.push(item.product_name);
                    }
                    
                    if (item.color && !processedData[woNo].colors.includes(item.color)) {
                        processedData[woNo].colors.push(item.color);
                    }
                    
                    if (item.size && !processedData[woNo].sizes.includes(item.size)) {
                        processedData[woNo].sizes.push(item.size);
                    }
                });
            }
            
            console.log('✅ [useDaftarRFID] Processed data:', Object.keys(processedData).length, 'work orders');
            setWorkOrderData(processedData);
            
            // Reset form jika workOrder yang dipilih tidak ada lagi di data
            setFormData(prevFormData => {
                if (prevFormData.workOrder && !processedData[prevFormData.workOrder]) {
                    return {
                        workOrder: '',
                        style: '',
                        buyer: '',
                        item: '',
                        color: '',
                        size: ''
                    };
                }
                return prevFormData;
            });
            
            setLoading(false);
            isFetchingRef.current = false;
            console.log('✅ [useDaftarRFID] fetchProductionBranchData completed successfully');
        } catch (error) {
            console.error('❌ [useDaftarRFID] Error fetching WO breakdown:', error);
            setWorkOrderData({});
            setLoading(false);
            isFetchingRef.current = false;
            lastFetchParamsRef.current = ''; // Reset on error
            console.log('✅ [useDaftarRFID] Loading state reset after error');
        }
    }, [dateFrom, dateTo]);

    // Fetch data saat component mount dan saat date berubah dengan debouncing yang lebih lama
    useEffect(() => {
        // Clear timeout sebelumnya jika ada
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
            fetchTimeoutRef.current = null;
        }

        // Jika sedang fetching, tunggu sampai selesai
        if (isFetchingRef.current) {
            console.log('⏳ [useDaftarRFID] Previous fetch still in progress, scheduling after completion...');
            // Schedule fetch setelah selesai
            const checkInterval = setInterval(() => {
                if (!isFetchingRef.current) {
                    clearInterval(checkInterval);
                    fetchProductionBranchDataMemo();
                }
            }, 100);
            return () => clearInterval(checkInterval);
        }

        // Debounce: tunggu 1500ms (1.5 detik) sebelum fetch untuk mengurangi request
        fetchTimeoutRef.current = setTimeout(() => {
            console.log('🟡 [useDaftarRFID] Debounced fetch triggered after 1.5s');
            fetchProductionBranchDataMemo();
            fetchTimeoutRef.current = null;
        }, 1500);

        // Cleanup function
        return () => {
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
                fetchTimeoutRef.current = null;
            }
        };
    }, [dateFrom, dateTo, fetchProductionBranchDataMemo]);
    
    // Sync ref dengan state
    useEffect(() => {
        modalOpenRef.current = isModalOpen;
    }, [isModalOpen]);

    return {
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        showDateFilterModal,
        setShowDateFilterModal,
        showRegisteredModal,
        setShowRegisteredModal,
        showScanRejectModal,
        setShowScanRejectModal,
        isModalOpen,
        setIsModalOpen,
        rejectRfidInput,
        setRejectRfidInput,
        rejectScannedItems,
        setRejectScannedItems,
        isProcessingReject,
        setIsProcessingReject,
        rejectInputRef,
        registeredRFIDData,
        setRegisteredRFIDData,
        loadingRegistered,
        setLoadingRegistered,
        filterStatus,
        setFilterStatus,
        searchTerm,
        setSearchTerm,
        filterColor,
        setFilterColor,
        filterSize,
        setFilterSize,
        workOrderData,
        setWorkOrderData,
        loading,
        setLoading,
        formData,
        setFormData,
        focusedInput,
        setFocusedInput,
        hoveredCard,
        setHoveredCard,
        fetchProductionBranchData: fetchProductionBranchDataMemo,
        fetchRegisteredRFID,
        handleRejectRfidSubmit,
        handleInputChange,
        handleSubmit,
        getItemStatus,
        filteredRegisteredData,
        uniqueColors,
        uniqueSizes,
        selectedWOData,
        availableStyles,
        availableBuyers,
        availableItems,
        availableColors,
        availableSizes,
        modalOpenRef,
    };
};


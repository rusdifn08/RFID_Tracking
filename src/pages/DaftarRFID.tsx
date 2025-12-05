import { useState, useRef, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';
import { QrCode, Calendar, X, ListChecks, XCircle, Search } from 'lucide-react';
import ScanningRFIDNew from '../components/ScanningRFIDNew';
import { API_BASE_URL } from '../config/api';

// Interface untuk data dari API /wo/branch
interface BranchData {
    branch: string;
    buyer: string;
    color: string;
    finish_date: string;
    id: number;
    line: string;
    product_name: string;
    qty: string;
    size: string;
    start_date: string;
    style: string;
    wo_no: string;
}

interface BranchResponse {
    branch: string;
    count: number;
    data: BranchData[];
    date_from: string | null;
    date_to: string | null;
    line: string;
    success: boolean;
    wo_list: string[];
}

// Interface untuk Work Order Data yang sudah diproses
interface WorkOrderData {
    workOrder: string;
    styles: string[];
    buyers: string[];
    items: string[];
    colors: string[];
    sizes: string[];
}

export default function DaftarRFID() {
    const { isOpen } = useSidebar();
    
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
    const modalOpenRef = useRef(false); // Ref untuk tracking modal state
    
    // Get available options based on selected Work Order
    const selectedWOData = formData.workOrder ? workOrderData[formData.workOrder] : null;
    const availableStyles = selectedWOData?.styles || [];
    const availableBuyers = selectedWOData?.buyers || [];
    const availableItems = selectedWOData?.items || [];
    const availableColors = selectedWOData?.colors || [];
    const availableSizes = selectedWOData?.sizes || [];
    
    // Fetch data dari API /wo/branch
    const fetchProductionBranchData = async () => {
        try {
            setLoading(true);
            // Format date untuk API: YYYY-M-D (tanpa leading zero di bulan dan hari jika < 10)
            const formatDateForAPI = (dateStr: string) => {
                const [year, month, day] = dateStr.split('-');
                return `${year}-${parseInt(month)}-${parseInt(day)}`;
            };
            
            // Build URL dengan parameter
            let apiUrl = `${API_BASE_URL}/wo/branch?branch=cjl&line=L1`;
            
            // Tambahkan start_date_from jika ada
            if (dateFrom) {
                apiUrl += `&start_date_from=${formatDateForAPI(dateFrom)}`;
            }
            
            // Tambahkan start_date_to jika ada
            if (dateTo) {
                apiUrl += `&start_date_to=${formatDateForAPI(dateTo)}`;
            }
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: BranchResponse = await response.json();
            
            // Process data dari API
            const processedData: Record<string, WorkOrderData> = {};
            
            if (result.data && Array.isArray(result.data)) {
                result.data.forEach((item) => {
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
                    
                    // Process style - langsung dari field style (tidak perlu split)
                    if (item.style && !processedData[woNo].styles.includes(item.style)) {
                        processedData[woNo].styles.push(item.style);
                    }
                    
                    // Process buyer
                    if (item.buyer && !processedData[woNo].buyers.includes(item.buyer)) {
                        processedData[woNo].buyers.push(item.buyer);
                    }
                    
                    // Process item (product_name)
                    if (item.product_name && !processedData[woNo].items.includes(item.product_name)) {
                        processedData[woNo].items.push(item.product_name);
                    }
                    
                    // Process color - langsung dari field color (tidak perlu split)
                    if (item.color && !processedData[woNo].colors.includes(item.color)) {
                        processedData[woNo].colors.push(item.color);
                    }
                    
                    // Process size - langsung dari field size (tidak perlu split)
                    if (item.size && !processedData[woNo].sizes.includes(item.size)) {
                        processedData[woNo].sizes.push(item.size);
                    }
                });
            }
            
            setWorkOrderData(processedData);
            
            // Reset form jika work order yang dipilih tidak ada lagi
            if (formData.workOrder && !processedData[formData.workOrder]) {
                setFormData({
                    workOrder: '',
                    style: '',
                    buyer: '',
                    item: '',
                    color: '',
                    size: ''
                });
            }
            
            setLoading(false);
        } catch (error) {
            setWorkOrderData({});
            setLoading(false);
        }
    };
    
    // Fetch data registered RFID
    const fetchRegisteredRFID = async () => {
        try {
            setLoadingRegistered(true);
            const response = await fetch(`${API_BASE_URL}/garment`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            // Handle berbagai format response
            const data = result.data || result || [];
            setRegisteredRFIDData(Array.isArray(data) ? data : []);
        } catch (error) {
            setRegisteredRFIDData([]);
        } finally {
            setLoadingRegistered(false);
        }
    };

    // Fetch data saat modal dibuka
    useEffect(() => {
        if (showRegisteredModal) {
            fetchRegisteredRFID();
        }
    }, [showRegisteredModal]);

    // Helper function untuk mendapatkan status dari item - KONSISTEN
    // Fungsi ini digunakan baik untuk filtering maupun display
    // Memastikan filter dan display menggunakan logika yang sama
    const getItemStatus = (item: any): string => {
        // Handle jika item tidak ada
        if (!item) {
            return 'In Progress';
        }
        
        const isDone = item.isDone;
        
        // Jika isDone adalah falsy atau empty -> In Progress
        // Cek untuk: null, undefined, '', 0, false, '0', 'false', 'null', 'undefined'
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
        
        // Convert ke string dan normalize (lowercase, trim)
        const isDoneStr = String(isDone).trim().toLowerCase();
        
        // Jika setelah trim menjadi empty string -> In Progress
        if (isDoneStr === '') {
            return 'In Progress';
        }
        
        // Jika isDone adalah 'waiting' (case insensitive) -> Waiting
        if (isDoneStr === 'waiting') {
            return 'Waiting';
        }
        
        // Jika isDone memiliki nilai truthy selain 'waiting' -> isDone
        // Ini mencakup: 'done', '1', 'true', 'yes', true, 1, atau nilai truthy lainnya
        // Karena jika ada nilai berarti sudah selesai/done
        return 'isDone';
    };

    // Get unique values untuk filter
    const uniqueColors = [...new Set(registeredRFIDData.map(item => item.color).filter(Boolean))].sort();
    const uniqueSizes = [...new Set(registeredRFIDData.map(item => item.size).filter(Boolean))].sort();

    // Filter data
    const filteredRegisteredData = registeredRFIDData.filter(item => {
        // Filter berdasarkan status - menggunakan helper function yang konsisten
        if (filterStatus !== 'Semua') {
            const itemStatus = getItemStatus(item);
            if (itemStatus !== filterStatus) return false;
        }
        
        // Filter berdasarkan color
        if (filterColor !== 'Semua' && item.color !== filterColor) return false;
        
        // Filter berdasarkan size
        if (filterSize !== 'Semua' && item.size !== filterSize) return false;
        
        // Filter berdasarkan search term
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

    // Fetch data saat component mount dan saat date berubah
    useEffect(() => {
        fetchProductionBranchData();
    }, [dateFrom, dateTo]);
    
    // Sync ref dengan state
    useEffect(() => {
        modalOpenRef.current = isModalOpen;
    }, [isModalOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        // Jika Work Order berubah, reset semua field lainnya
        if (name === 'workOrder') {
            setFormData({
                workOrder: value,
                style: '',
                buyer: '',
                item: '',
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation(); // Stop all event propagation
        
        // Validasi form
        if (!formData.workOrder || !formData.style || !formData.buyer || !formData.item || !formData.color || !formData.size) {
            alert('Mohon lengkapi semua field sebelum melanjutkan.');
            return false; // Prevent default behavior
        }
        
        // Buka modal scanning - langsung set tanpa setTimeout
        
        // Set ref terlebih dahulu
        modalOpenRef.current = true;
        
        // Gunakan functional update untuk memastikan state update
        setIsModalOpen(prev => {
            if (prev === true) {
                return prev;
            }
            return true;
        });
        
        // Return false untuk mencegah form submission
        return false;
    };

    return (
        <div className="flex min-h-screen bg-gray-50"

        >
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div
                className="flex flex-col w-full min-h-screen transition-all duration-300 ease-in-out"
                style={{ marginLeft: isOpen ? '15%' : '5rem', width: isOpen ? 'calc(100% - 15%)' : 'calc(100% - 5rem)' }}
            >
                {/* Header */}
                <Header />

                {/* Content */}
                <main
                    className="flex-1 w-full bg-gray-50 flex items-center justify-center"
                    style={{
                        marginTop: '4rem',
                        height: 'calc(100vh - 4rem)',
                        minHeight: 'calc(100vh - 4rem)',
                        maxHeight: 'calc(100vh - 4rem)',
                        overflow: 'hidden'
                    }}
                >
                    {/* Register RFID Card */}
                    <div className="w-full max-w-4xl h-full flex items-center justify-center px-3 py-2 sm:px-6 sm:py-6">
                        <div
                            className="rounded-xl sm:rounded-2xl shadow-[0_4px_20px_rgba(59,130,246,0.15)] p-3 sm:p-5 md:p-6 relative overflow-hidden transition-all duration-500 w-full bg-white flex flex-col max-h-full"
                            onMouseEnter={() => setHoveredCard(true)}
                            onMouseLeave={() => setHoveredCard(false)}
                            style={{
                                boxShadow: hoveredCard
                                    ? '0_8px_30px_rgba(59,130,246,0.25)'
                                    : '0_4px_20px_rgba(59,130,246,0.15)',
                                transform: hoveredCard ? 'translateY(-4px)' : 'translateY(0)'
                            }}
                        >
                            {/* Blue glow effect dengan animasi */}
                            <div className={`absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none transition-opacity duration-500 ${hoveredCard ? 'opacity-100' : 'opacity-50'}`}></div>

                            {/* Header Section - Compact untuk Mobile */}
                            <div className="flex-shrink-0 mb-2 sm:mb-4 relative">
                                {/* Date Range Picker dan Icon RFID */}
                                <div className="flex items-center justify-between mb-1.5 sm:mb-3 gap-2">
                                    {/* Date Range Picker - Tombol untuk membuka modal */}
                                    <div className="flex items-center gap-2 flex-1">
                                        <button
                                            onClick={() => setShowDateFilterModal(true)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all flex items-center gap-2 font-medium text-sm"
                                            title="Filter Tanggal"
                                        >
                                            <Calendar size={18} />
                                            <span className="text-xs sm:text-sm font-medium">
                                                {dateFrom === dateTo 
                                                    ? new Date(dateFrom).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                                                    : `${new Date(dateFrom).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} - ${new Date(dateTo).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`
                                                }
                                            </span>
                                        </button>
                                    </div>
                                    
                                    {/* Icon RFID di tengah - Absolute center */}
                                    <div className="absolute left-1/2 transform -translate-x-1/2 flex-shrink-0 z-10">
                                        <div
                                            className={`w-10 h-10 sm:w-14 sm:h-14 bg-blue-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg transition-all duration-500 ${hoveredCard ? 'scale-110 rotate-3 shadow-blue-500/50' : 'scale-100 rotate-0'}`}
                                        >
                                            <QrCode
                                                className={`w-6 h-6 sm:w-8 sm:h-8 text-white transition-all duration-500 ${hoveredCard ? 'scale-110' : 'scale-100'}`}
                                                strokeWidth={2.5}
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Spacer untuk balance */}
                                    <div className="flex-1"></div>
                                    
                                    {/* Registered RFID Button - Paling Kanan */}
                                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => setShowRegisteredModal(true)}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-all flex items-center gap-2 font-medium text-sm"
                                            title="Registered RFID"
                                        >
                                            <ListChecks size={18} />
                                            <span className="text-xs sm:text-sm font-medium">REGISTERED RFID</span>
                                        </button>
                                        <button
                                            onClick={() => setShowScanRejectModal(true)}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition-all flex items-center gap-2 font-medium text-sm"
                                            title="Scan Reject"
                                        >
                                            <XCircle size={18} />
                                            <span className="text-xs sm:text-sm font-medium">SCAN REJECT</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Title */}
                                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-800 text-center mb-1 sm:mb-2 transition-colors duration-300">
                                    REGISTER RFID
                                </h1>

                                {/* Instruction */}
                                <p className="text-gray-600 text-center mb-2 sm:mb-4 text-[11px] sm:text-sm leading-tight">
                                    Input informasi Work Order, Style, Buyer, Item, Color, dan Size untuk scanning RFID
                                </p>
                            </div>

                            {/* Form - Compact layout dengan flex untuk fit content */}
                            <form 
                                onSubmit={handleSubmit} 
                                className="flex flex-col flex-1 min-h-0 overflow-y-auto"
                                noValidate
                            >
                                {/* Form Fields Container - Gap lebih kecil untuk mobile */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                                    {/* Work Order - Dropdown */}
                                    <div className="transition-all duration-300 flex flex-col">
                                        <label
                                            htmlFor="workOrder"
                                            className={`block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-1.5 transition-colors duration-300 ${focusedInput === 'workOrder' ? 'text-blue-600' : ''}`}
                                        >
                                            Work Order
                                        </label>
                                        <select
                                            id="workOrder"
                                            name="workOrder"
                                            value={formData.workOrder}
                                            onChange={handleInputChange}
                                            onFocus={() => setFocusedInput('workOrder')}
                                            onBlur={() => setFocusedInput(null)}
                                            disabled={loading}
                                            className="w-full h-9 sm:h-10 px-2.5 sm:px-3 text-xs sm:text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all duration-300 hover:border-blue-400 bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                                        >
                                            <option value="">
                                                {loading ? 'Loading...' : Object.keys(workOrderData).length === 0 ? 'Tidak ada data' : 'Pilih Work Order'}
                                            </option>
                                            {Object.keys(workOrderData).map(wo => (
                                                <option key={wo} value={wo}>{wo}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Style - Dropdown */}
                                    <div className="transition-all duration-300 flex flex-col">
                                        <label
                                            htmlFor="style"
                                            className={`block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-1.5 transition-colors duration-300 ${focusedInput === 'style' ? 'text-blue-600' : ''}`}
                                        >
                                            Style
                                        </label>
                                        <select
                                            id="style"
                                            name="style"
                                            value={formData.style}
                                            onChange={handleInputChange}
                                            onFocus={() => setFocusedInput('style')}
                                            onBlur={() => setFocusedInput(null)}
                                            disabled={!formData.workOrder}
                                            className="w-full h-9 sm:h-10 px-2.5 sm:px-3 text-xs sm:text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all duration-300 hover:border-blue-400 bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                                        >
                                            <option value="">{formData.workOrder ? 'Pilih Style' : 'Pilih Work Order dulu'}</option>
                                            {availableStyles.map(style => (
                                                <option key={style} value={style}>{style}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Buyer - Dropdown */}
                                    <div className="transition-all duration-300 flex flex-col">
                                        <label
                                            htmlFor="buyer"
                                            className={`block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-1.5 transition-colors duration-300 ${focusedInput === 'buyer' ? 'text-blue-600' : ''}`}
                                        >
                                            Buyer
                                        </label>
                                        <select
                                            id="buyer"
                                            name="buyer"
                                            value={formData.buyer}
                                            onChange={handleInputChange}
                                            onFocus={() => setFocusedInput('buyer')}
                                            onBlur={() => setFocusedInput(null)}
                                            disabled={!formData.workOrder}
                                            className="w-full h-9 sm:h-10 px-2.5 sm:px-3 text-xs sm:text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all duration-300 hover:border-blue-400 bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                                        >
                                            <option value="">{formData.workOrder ? 'Pilih Buyer' : 'Pilih Work Order dulu'}</option>
                                            {availableBuyers.map(buyer => (
                                                <option key={buyer} value={buyer}>{buyer}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Item - Dropdown */}
                                    <div className="transition-all duration-300 flex flex-col">
                                        <label
                                            htmlFor="item"
                                            className={`block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-1.5 transition-colors duration-300 ${focusedInput === 'item' ? 'text-blue-600' : ''}`}
                                        >
                                            Item
                                        </label>
                                        <select
                                            id="item"
                                            name="item"
                                            value={formData.item}
                                            onChange={handleInputChange}
                                            onFocus={() => setFocusedInput('item')}
                                            onBlur={() => setFocusedInput(null)}
                                            disabled={!formData.workOrder}
                                            className="w-full h-9 sm:h-10 px-2.5 sm:px-3 text-xs sm:text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all duration-300 hover:border-blue-400 bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                                        >
                                            <option value="">{formData.workOrder ? 'Pilih Item' : 'Pilih Work Order dulu'}</option>
                                            {availableItems.map(item => (
                                                <option key={item} value={item}>{item}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Color - Dropdown */}
                                    <div className="transition-all duration-300 flex flex-col">
                                        <label
                                            htmlFor="color"
                                            className={`block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-1.5 transition-colors duration-300 ${focusedInput === 'color' ? 'text-blue-600' : ''}`}
                                        >
                                            Color
                                        </label>
                                        <select
                                            id="color"
                                            name="color"
                                            value={formData.color}
                                            onChange={handleInputChange}
                                            onFocus={() => setFocusedInput('color')}
                                            onBlur={() => setFocusedInput(null)}
                                            disabled={!formData.workOrder}
                                            className="w-full h-9 sm:h-10 px-2.5 sm:px-3 text-xs sm:text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all duration-300 hover:border-blue-400 bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                                        >
                                            <option value="">{formData.workOrder ? 'Pilih Color' : 'Pilih Work Order dulu'}</option>
                                            {availableColors.map(color => (
                                                <option key={color} value={color}>{color}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Size - Dropdown */}
                                    <div className="transition-all duration-300 flex flex-col">
                                        <label
                                            htmlFor="size"
                                            className={`block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-1.5 transition-colors duration-300 ${focusedInput === 'size' ? 'text-blue-600' : ''}`}
                                        >
                                            Size
                                        </label>
                                        <select
                                            id="size"
                                            name="size"
                                            value={formData.size}
                                            onChange={handleInputChange}
                                            onFocus={() => setFocusedInput('size')}
                                            onBlur={() => setFocusedInput(null)}
                                            disabled={!formData.workOrder}
                                            className="w-full h-9 sm:h-10 px-2.5 sm:px-3 text-xs sm:text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all duration-300 hover:border-blue-400 bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                                        >
                                            <option value="">{formData.workOrder ? 'Pilih Size' : 'Pilih Work Order dulu'}</option>
                                            {availableSizes.map(size => (
                                                <option key={size} value={size}>{size}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Submit Button - Fixed di bawah, lebih compact untuk mobile */}
                                <div className="flex-shrink-0 mt-2 sm:mt-4">
                                    <button
                                        type="submit"
                                        className="w-full h-10 sm:h-11 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold text-sm sm:text-base px-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/50 transform hover:-translate-y-1 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-300 flex items-center justify-center"
                                    >
                                        REGISTER
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </main>
            </div>

            {/* Scanning RFID Modal - Design Baru */}
            {/* Date Filter Modal */}
            {showDateFilterModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDateFilterModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-slate-800">Filter Tanggal</h2>
                                <button
                                    onClick={() => setShowDateFilterModal(false)}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Filter Form */}
                            <div className="space-y-4">
                                {/* Date From */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Date From</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) => setDateFrom(e.target.value)}
                                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                    </div>
                                </div>

                                {/* Date To */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Date To</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) => setDateTo(e.target.value)}
                                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                    </div>
                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => {
                                        const today = getTodayDate();
                                        setDateFrom(today);
                                        setDateTo(today);
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDateFilterModal(false);
                                        // Data akan otomatis di-fetch karena useEffect yang watch dateFrom dan dateTo
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                                >
                                    Terapkan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Registered RFID Modal */}
            {showRegisteredModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => {
                    setShowRegisteredModal(false);
                    setSearchTerm('');
                    setFilterColor('Semua');
                    setFilterSize('Semua');
                }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] sm:h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
                        {/* Header dengan gradient biru */}
                        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 p-6 flex-shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                        <ListChecks className="text-white" size={24} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white">Registered RFID</h2>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowRegisteredModal(false);
                                        setSearchTerm('');
                                        setFilterColor('Semua');
                                        setFilterSize('Semua');
                                    }}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white hover:bg-white/30"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Search, Filter, dan Total - Sejajar Horizontal */}
                            <div className="flex items-end gap-3 flex-wrap">
                                {/* Search Form - Diperkecil */}
                                <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                                    <label className="block text-xs font-semibold text-white/90 mb-1.5">Search</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/80" size={16} />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search RFID, WO, Style..."
                                            className="w-full pl-10 pr-4 py-2.5 bg-white/95 backdrop-blur-sm border-2 border-white/30 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all shadow-lg"
                                        />
                                    </div>
                                </div>

                                {/* Filter Status - Design Elegan */}
                                <div className="relative">
                                    <label className="block text-xs font-semibold text-white/90 mb-1.5">Filter Status</label>
                                    <div className="relative">
                                        <select
                                            value={filterStatus}
                                            onChange={(e) => setFilterStatus(e.target.value)}
                                            className="pl-4 pr-10 py-2.5 bg-white/95 backdrop-blur-sm border-2 border-white/30 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all appearance-none cursor-pointer shadow-lg min-w-[160px]"
                                        >
                                            <option value="Semua">Semua</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Waiting">Waiting</option>
                                            <option value="isDone">isDone</option>
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Filter By Color */}
                                <div className="relative">
                                    <label className="block text-xs font-semibold text-white/90 mb-1.5">Filter Color</label>
                                    <div className="relative">
                                        <select
                                            value={filterColor}
                                            onChange={(e) => setFilterColor(e.target.value)}
                                            className="pl-4 pr-10 py-2.5 bg-white/95 backdrop-blur-sm border-2 border-white/30 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all appearance-none cursor-pointer shadow-lg min-w-[140px]"
                                        >
                                            <option value="Semua">Semua</option>
                                            {uniqueColors.map((color) => (
                                                <option key={color} value={color}>{color}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Filter By Size */}
                                <div className="relative">
                                    <label className="block text-xs font-semibold text-white/90 mb-1.5">Filter Size</label>
                                    <div className="relative">
                                        <select
                                            value={filterSize}
                                            onChange={(e) => setFilterSize(e.target.value)}
                                            className="pl-4 pr-10 py-2.5 bg-white/95 backdrop-blur-sm border-2 border-white/30 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all appearance-none cursor-pointer shadow-lg min-w-[120px]"
                                        >
                                            <option value="Semua">Semua</option>
                                            {uniqueSizes.map((size) => (
                                                <option key={size} value={size}>{size}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Total Count - Paling Kanan */}
                                <div className="ml-auto">
                                    <div className="bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl px-4 py-2.5 shadow-lg">
                                        <div className="text-xs font-semibold text-white/90 mb-0.5">Total</div>
                                        <div className="text-2xl font-bold text-white">{filteredRegisteredData.length}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Table Content - Fixed Height dengan Scroll */}
                        <div className="flex-1 overflow-hidden p-6 bg-gradient-to-br from-slate-50 to-blue-50/30 min-h-0 flex flex-col">
                            {loadingRegistered ? (
                                <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <p className="text-slate-600 font-medium">Memuat data...</p>
                                </div>
                            ) : filteredRegisteredData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-slate-400 h-full min-h-[400px]">
                                    <div className="p-4 bg-blue-100 rounded-full mb-4">
                                        <ListChecks size={48} className="text-blue-500 opacity-50" />
                                    </div>
                                    <p className="text-lg font-bold text-slate-600 mb-1">Tidak ada data</p>
                                    <p className="text-sm">Tidak ada RFID yang terdaftar dengan filter yang dipilih</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden h-full flex flex-col">
                                    <style>{`
                                        .registered-rfid-table::-webkit-scrollbar {
                                            width: 8px;
                                            height: 8px;
                                        }
                                        .registered-rfid-table::-webkit-scrollbar-track {
                                            background: #f1f5f9;
                                            border-radius: 4px;
                                        }
                                        .registered-rfid-table::-webkit-scrollbar-thumb {
                                            background: #cbd5e1;
                                            border-radius: 4px;
                                        }
                                        .registered-rfid-table::-webkit-scrollbar-thumb:hover {
                                            background: #94a3b8;
                                        }
                                    `}</style>
                                    <div className="registered-rfid-table overflow-y-auto overflow-x-auto flex-1 min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 text-white">
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">RFID ID</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">WO</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">Style</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">Buyer</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">Item</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">Color</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">Size</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-100">
                                                {filteredRegisteredData.map((item, index) => {
                                                    // Gunakan helper function yang sama untuk konsistensi
                                                    const status = getItemStatus(item);
                                                    const statusColor = status === 'In Progress' 
                                                        ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-300' 
                                                        : status === 'Waiting' 
                                                        ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-300'
                                                        : 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-300';
                                                    
                                                    return (
                                                        <tr 
                                                            key={item.id || index} 
                                                            className={`hover:bg-blue-50/50 transition-all duration-200 ${
                                                                index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                                                            }`}
                                                        >
                                                            <td className="px-4 py-3.5">
                                                                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-mono font-bold bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200 shadow-sm">
                                                                    {item.rfid_garment || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3.5 text-sm font-semibold text-slate-700">{item.wo || '-'}</td>
                                                            <td className="px-4 py-3.5 text-sm font-medium text-slate-700">{item.style || '-'}</td>
                                                            <td className="px-4 py-3.5 text-sm text-slate-700">
                                                                <span className="truncate block max-w-[200px]" title={item.buyer || '-'}>
                                                                    {item.buyer || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3.5 text-sm text-slate-700">
                                                                <span className="truncate block max-w-[250px]" title={item.item || '-'}>
                                                                    {item.item || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3.5">
                                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-sm font-semibold">
                                                                    <span 
                                                                        className="w-4 h-4 rounded-full border-2 border-slate-300 shadow-sm" 
                                                                        style={{ backgroundColor: item.color?.toLowerCase() || '#ccc' }}
                                                                    ></span>
                                                                    <span className="text-slate-700">{item.color || '-'}</span>
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3.5">
                                                                <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-sm font-bold text-blue-700 min-w-[50px]">
                                                                    {item.size || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3.5">
                                                                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border-2 shadow-sm ${statusColor}`}>
                                                                    {status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Scan Reject Modal - Tema Merah */}
            {showScanRejectModal && (
                <div 
                    className="fixed inset-0 z-[1000] flex items-center justify-center"
                    style={{
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(8px)',
                        animation: 'fadeIn 0.3s ease'
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowScanRejectModal(false);
                        }
                    }}
                >
                    <div 
                        className="bg-white rounded-3xl shadow-2xl w-[95%] max-w-[900px] max-h-[95vh] flex flex-col"
                        style={{
                            background: 'linear-gradient(135deg, #FFFFFF 0%, #FEF2F2 100%)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(220, 38, 38, 0.1), 0 8px 16px -8px rgba(239, 68, 68, 0.1)',
                            animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                            border: '1px solid rgba(254, 226, 226, 0.8)',
                            padding: '1.5rem',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header - Tema Merah */}
                        <div 
                            className="text-center mb-2"
                            style={{
                                background: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 50%, #FCA5A5 100%)',
                                borderRadius: '6px',
                                padding: '0.25rem 0.5rem',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)'
                            }}
                        >
                            <h2 
                                className="text-xl font-extrabold mb-1"
                                style={{
                                    background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    letterSpacing: '-0.5px'
                                }}
                            >
                                🚫 Scan Reject Mati
                            </h2>
                            <p className="text-sm font-medium" style={{ color: '#7F1D1D' }}>
                                Scan RFID untuk produk garment yang dinyatakan reject mati
                            </p>
                        </div>

                        {/* Input Section - Tema Merah */}
                        <div className="mb-4">
                            <div 
                                className="relative"
                                style={{
                                    background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
                                    borderRadius: '12px',
                                    padding: '1rem',
                                    border: '2px solid #FCA5A5',
                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)'
                                }}
                            >
                                <label 
                                    className="block text-sm font-bold mb-2"
                                    style={{ color: '#991B1B' }}
                                >
                                    Scan RFID Reject:
                                </label>
                                <input
                                    ref={rejectInputRef}
                                    type="text"
                                    value={rejectRfidInput}
                                    onChange={(e) => setRejectRfidInput(e.target.value)}
                                    onKeyDown={async (e) => {
                                        if (e.key === 'Enter' && rejectRfidInput.trim() && !isProcessingReject) {
                                            await handleRejectRfidSubmit(rejectRfidInput.trim());
                                        }
                                    }}
                                    placeholder="Tempatkan RFID di scanner atau ketik manual..."
                                    className="w-full px-4 py-3 rounded-lg border-2 border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none text-lg font-mono"
                                    style={{
                                        background: '#FFFFFF',
                                        color: '#1F2937'
                                    }}
                                    autoFocus
                                    disabled={isProcessingReject}
                                />
                            </div>
                        </div>

                        {/* Scanned Items List - Tema Merah */}
                        <div 
                            className="flex-1 overflow-y-auto mb-4"
                            style={{
                                background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
                                borderRadius: '12px',
                                padding: '1rem',
                                border: '1px solid #FCA5A5',
                                minHeight: '200px',
                                maxHeight: '300px'
                            }}
                        >
                            {rejectScannedItems.length === 0 ? (
                                <div className="text-center text-slate-500 text-sm py-8">
                                    Belum ada RFID yang di-scan
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {rejectScannedItems.map((item, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 rounded-lg"
                                            style={{
                                                background: item.status === 'success' ? '#FEE2E2' : '#FEF2F2',
                                                border: `2px solid ${item.status === 'success' ? '#FCA5A5' : '#FECACA'}`
                                            }}
                                        >
                                            <div className="flex-1">
                                                <div className="font-mono font-bold text-sm" style={{ color: '#7F1D1D' }}>
                                                    {item.rfid}
                                                </div>
                                                <div className="text-xs" style={{ color: item.status === 'success' ? '#059669' : '#DC2626' }}>
                                                    {item.message || (item.status === 'success' ? 'Berhasil' : 'Gagal')}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {item.timestamp.toLocaleTimeString('id-ID')}
                                                </div>
                                            </div>
                                            {item.status === 'success' ? (
                                                <div className="text-green-600">✓</div>
                                            ) : (
                                                <div className="text-red-600">✗</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer Buttons - Tema Merah */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowScanRejectModal(false)}
                                className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold text-sm transition-all"
                            >
                                Tutup
                            </button>
                            <button
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition-all shadow-lg"
                            >
                                Simpan Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ScanningRFIDNew
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    // Form data tidak di-reset, tetap tersimpan untuk registrasi berikutnya
                }}
                workOrderData={formData}
            />
        </div>
    );
}


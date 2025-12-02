import React, { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';
import ExportModal from '../components/ExportModal';
import { exportListRFIDToExcel } from '../utils/exportToExcel';
import { API_BASE_URL } from '../config/api';
import {
    Search,
    Filter,
    RefreshCw,
    Trash2,
    Eye,
    X,
    AlertTriangle,
    MapPin,
    Box,
    FileText,
    Activity,
    Calendar,
    Download
} from 'lucide-react';

interface RFIDItem {
    id: string | number;
    rfid: string;
    style?: string;
    buyer?: string;
    nomor_wo?: string;
    item?: string;
    color?: string;
    size?: string;
    status: string;
    lokasi?: string;
    line?: string;
    lineNumber?: string; // Line number asli dari API (untuk filtering)
    timestamp?: string;
}

// Interface untuk response dari API tracking/rfid_garment
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

const ListRFID: React.FC = () => {
    const { isOpen } = useSidebar();
    const location = useLocation();
    const { id } = useParams<{ id: string }>();
    const [rfidData, setRfidData] = useState<RFIDItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    
    // Deteksi line dari URL parameter atau default ke line 1
    const getLineFromUrl = (): string => {
        // Prioritas 1: Path parameter /list-rfid/:id
        if (id) {
            return id;
        }
        
        // Prioritas 2: Query parameter ?line=1
        const urlParams = new URLSearchParams(location.search);
        const lineParam = urlParams.get('line');
        if (lineParam) {
            return lineParam;
        }
        
        // Prioritas 3: Path parameter dari pathname
        const lineMatch = location.pathname.match(/\/list-rfid\/(\d+)/);
        if (lineMatch && lineMatch[1]) {
            return lineMatch[1];
        }
        
        // Default ke line 1 untuk /list-rfid
        return '1';
    };
    
    const currentLine = getLineFromUrl();

    // Filters
    const [filterWO, setFilterWO] = useState<string>('');
    const [filterBuyer, setFilterBuyer] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterLocation, setFilterLocation] = useState<string>('');
    
    // New filters for modal
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
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [showExportModal, setShowExportModal] = useState<boolean>(false);

    // Fetch data dari API tracking/rfid_garment
    const fetchRFIDData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Panggil API: http://10.8.0.104:7000/tracking/rfid_garment
            // API ini akan dipanggil melalui proxy server (server.js)
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
            
            // Handle berbagai format response
            let result: TrackingRFIDGarmentResponse;
            if (rawResult.data && Array.isArray(rawResult.data)) {
                // Format: { count, data: [...] }
                result = rawResult as TrackingRFIDGarmentResponse;
            } else if (Array.isArray(rawResult)) {
                // Format: [...] (langsung array)
                result = {
                    count: rawResult.length,
                    data: rawResult
                };
            } else {
                // Format lain, coba ambil data dari berbagai kemungkinan key
                result = {
                    count: rawResult.count || 0,
                    data: rawResult.data || rawResult.items || rawResult.results || []
                };
            }
            
            
            // Pastikan result.data adalah array
            if (!result.data || !Array.isArray(result.data)) {
                setRfidData([]);
                setLoading(false);
                return;
            }
            
            // Mapping data dari API ke format RFIDItem
            const mappedData: RFIDItem[] = result.data.map((item) => {
                // Convert last_status ke format yang sesuai (Good, Rework, Reject, OUTPUT)
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
                    lokasi: (() => {
                        // Jika bagian adalah "IRON" atau "OPERATOR", tampilkan "SEWING"
                        const bagian = (item.bagian || '').trim().toUpperCase();
                        if (bagian === 'IRON' || bagian === 'OPERATOR') {
                            return 'SEWING';
                        }
                        return (item.bagian || '').trim(); // bagian -> lokasi, trim untuk menghilangkan whitespace
                    })(),
                    line: `Line ${itemLine}`,
                    lineNumber: itemLine, // Simpan line number asli untuk filtering
                    timestamp: item.timestamp || '',
                };
            });
            
            
            // Filter berdasarkan line jika currentLine ada
            let filteredByLine = mappedData;
            
            if (currentLine && currentLine !== 'all') {
                filteredByLine = mappedData.filter(item => {
                    // Gunakan lineNumber yang sudah disimpan dari API
                    const itemLineNumber = item.lineNumber || '1';
                    // Normalize comparison - pastikan kedua nilai adalah string
                    const matches = String(itemLineNumber).trim() === String(currentLine).trim();
                    return matches;
                });
            }
            
            setRfidData(filteredByLine);
            setLoading(false);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Gagal memuat data RFID');
            setRfidData([]);
            setLoading(false);
        }
    };

    // Load data saat component mount dan saat line berubah
    useEffect(() => {
        fetchRFIDData();
    }, [currentLine, id]);

    // Helper function to parse timestamp
    const parseTimestamp = (timestamp: string): Date | null => {
        if (!timestamp) return null;
        try {
            // Format: "Mon, 01 Dec 2025 11:08:06 GMT" atau format ISO
            const date = new Date(timestamp);
            // Validasi apakah date valid
            if (isNaN(date.getTime())) {
                return null;
            }
            return date;
        } catch (e) {
            return null;
        }
    };

    // Filter data
    const filteredData = rfidData.filter(item => {
        // Search di semua kolom - trim untuk menghilangkan whitespace
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

        // Filter dari modal: Date range
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
                matchDate = false; // Jika tidak ada timestamp, exclude jika filter date aktif
            }
        }

        // Filter dari modal: Status
        const matchStatusModal = filterStatusModal === 'Semua' || item.status === filterStatusModal;

        // Filter dari modal: Size
        const matchSize = filterSize === 'Semua' || item.size === filterSize;

        // Filter dari modal: Color
        const matchColor = filterColor === 'Semua' || item.color === filterColor;

        return matchSearch && matchWO && matchBuyer && matchStatus && matchLocation && 
               matchDate && matchStatusModal && matchSize && matchColor;
    });

    // Get unique values for filters
    const uniqueWOs = [...new Set(rfidData.map(item => item.nomor_wo).filter(Boolean))].sort();
    const uniqueBuyers = [...new Set(rfidData.map(item => item.buyer).filter(Boolean))].sort();
    const uniqueStatuses = [...new Set(rfidData.map(item => item.status).filter(Boolean))].sort();
    const uniqueLocations = [...new Set(rfidData.map(item => item.lokasi).filter(Boolean))].sort();
    const uniqueSizes = [...new Set(rfidData.map(item => item.size).filter(Boolean))].sort();
    const uniqueColors = [...new Set(rfidData.map(item => item.color).filter(Boolean))].sort();

    // Handle filter modal
    const handleFilterData = () => {
        setShowFilterModal(false);
        // Filter sudah diterapkan melalui filteredData
    };

    const handleResetFilter = () => {
        setFilterDateFrom('');
        setFilterDateTo('');
        setFilterStatusModal('Semua');
        setFilterSize('Semua');
        setFilterColor('Semua');
    };

    // Handle view details
    const handleView = (item: RFIDItem) => {
        setSelectedScan(item);
        setShowModal(true);
    };

    // Handle close modal
    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedScan(null);
    };

    // Fungsi untuk handle export
    const handleExport = async (format: 'excel' | 'csv') => {
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
    };

    // Handle refresh data
    const handleRefresh = () => {
        fetchRFIDData();
    };

    // Handle delete data - show modal
    const handleDelete = (item: RFIDItem) => {
        setItemToDelete(item);
        setShowDeleteModal(true);
    };

    // Confirm delete data
    const confirmDelete = async () => {
        if (!itemToDelete) return;

        setIsDeleting(true);
        setTimeout(() => {
            setRfidData(prev => prev.filter(item => item.id !== itemToDelete.id));
            showNotification(`✅ Data RFID "${itemToDelete.rfid}" berhasil dihapus!`);
            setShowDeleteModal(false);
            setItemToDelete(null);
            setIsDeleting(false);
        }, 500);
    };

    // Cancel delete
    const cancelDelete = () => {
        setShowDeleteModal(false);
        setItemToDelete(null);
        setIsDeleting(false);
    };

    // Show notification
    const showNotification = (message: string) => {
        const notification = document.createElement('div');
        notification.className = 'fixed top-5 right-5 bg-gradient-to-br from-emerald-500 to-green-600 text-white px-5 py-3 rounded-lg shadow-lg z-[1000] transform transition-transform duration-300 translate-x-full font-semibold text-sm';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    };

    // Sidebar width logic matching Header.tsx
    // Header uses: isOpen ? '15%' : '5rem'
    const sidebarWidth = isOpen ? '15%' : '5rem';

    return (
        <div className="flex min-h-screen w-full bg-[#f4f6f8] font-sans text-gray-800 overflow-hidden">
            {/* Sidebar */}
            <div className="fixed left-0 top-0 h-full z-50 shadow-xl">
                <Sidebar />
            </div>

            {/* Main Content Wrapper */}
            <div
                className="flex flex-col w-full min-h-screen transition-all duration-300 ease-in-out"
                style={{
                    marginLeft: sidebarWidth,
                    width: `calc(100% - ${sidebarWidth})`
                }}
            >
                {/* Header - Fixed Position handled in Header component */}
                <Header />

                {/* Page Content */}
                <main
                    className="flex-1 overflow-hidden flex flex-col min-h-0"
                    style={{
                        marginTop: '80px', // Jarak dari atas agar tidak tertutup header
                        padding: '20px',   // Padding konten
                        height: 'calc(100vh - 80px)', // Sesuaikan tinggi agar tidak double scroll
                        maxHeight: 'calc(100vh - 80px)'
                    }}
                >
                    {/* Page Header */}
                    <div
                        className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4 shrink-0"
                        style={{ marginBottom: '20px' }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg shadow-blue-500/30 text-white">
                                <FileText size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">List Data RFID</h1>
                                <p className="text-slate-500 text-sm">Daftar lengkap semua RFID ID dari database</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowFilterModal(true)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all flex items-center gap-2 font-medium text-sm"
                                title="Filter Data"
                            >
                                <Filter size={18} />
                                <span>Filter Data</span>
                            </button>
                            <button
                                onClick={() => setShowExportModal(true)}
                                className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg shadow-sm transition-all flex items-center gap-2 font-medium text-sm"
                                title="Export Excel"
                            >
                                <Download className="w-4 h-4" strokeWidth={2.5} />
                                <span>Export</span>
                            </button>
                            <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                                <span className="text-slate-500 text-sm font-semibold">Total ID:</span>
                                <span className="text-blue-600 text-xl font-bold">{filteredData.length}</span>
                            </div>
                            <button
                                onClick={handleRefresh}
                                className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-all text-slate-600 hover:text-blue-600"
                                title="Refresh Data"
                            >
                                <RefreshCw size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Filter Section */}
                    <div
                        className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4 shrink-0"
                        style={{ marginBottom: '20px', padding: '20px' }}
                    >
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by RFID, WO, Style, Buyer, Item, Color, Size, Status, Location, Line..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-1 md:pb-0">
                                {/* All WO Filter */}
                                <div className="relative min-w-[140px]">
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select
                                        value={filterWO}
                                        onChange={(e) => setFilterWO(e.target.value)}
                                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    >
                                        <option value="">All WO</option>
                                        {uniqueWOs.map((wo: any) => (
                                            <option key={wo} value={wo}>{wo}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* All Buyers Filter */}
                                <div className="relative min-w-[140px]">
                                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select
                                        value={filterBuyer}
                                        onChange={(e) => setFilterBuyer(e.target.value)}
                                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    >
                                        <option value="">All Buyers</option>
                                        {uniqueBuyers.map((buyer: any) => (
                                            <option key={buyer} value={buyer}>{buyer}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* All Status Filter */}
                                <div className="relative min-w-[140px]">
                                    <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    >
                                        <option value="">All Status</option>
                                        {uniqueStatuses.map((status: any) => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* All Locations Filter */}
                                <div className="relative min-w-[140px]">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select
                                        value={filterLocation}
                                        onChange={(e) => setFilterLocation(e.target.value)}
                                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    >
                                        <option value="">All Locations</option>
                                        {uniqueLocations.map((location: any) => (
                                            <option key={location} value={location}>{location}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div
                        className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden flex flex-col flex-1 min-h-0"
                    >
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                                <p className="text-base font-medium">Loading RFID data...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center h-full text-red-500">
                                <AlertTriangle size={48} className="mb-4 opacity-50" />
                                <h3 className="text-lg font-bold">Error Loading Data</h3>
                                <p className="text-sm mb-4">{error}</p>
                                <button
                                    onClick={handleRefresh}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-md"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : filteredData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Box size={48} className="mb-4 opacity-30" />
                                <h3 className="text-lg font-bold text-slate-600">Tidak ada data</h3>
                                <p className="text-sm">Belum ada data RFID atau tidak ditemukan dengan filter yang dipilih</p>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full overflow-x-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
                                {/* Wrapper untuk header dan body dengan scroll horizontal bersama */}
                                <div className="min-w-max flex flex-col h-full">
                                    {/* Table Header - Sticky dengan gradient yang menarik */}
                                    <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border-b-2 border-slate-600 shrink-0 sticky top-0 z-10 shadow-md">
                                        <div className="flex items-center px-3 h-14 text-xs font-extrabold text-white uppercase tracking-wider gap-2">
                                            <div className="w-[130px] shrink-0 text-center font-semibold">RFID ID</div>
                                            <div className="w-[75px] shrink-0 text-center font-semibold">WO</div>
                                            <div className="w-[85px] shrink-0 text-center font-semibold">Style</div>
                                            <div className="w-[140px] shrink-0 text-center font-semibold">Buyer</div>
                                            <div className="w-[180px] shrink-0 text-center font-semibold">Item</div>
                                            <div className="w-[80px] shrink-0 text-center font-semibold">Color</div>
                                            <div className="w-[55px] shrink-0 text-center font-semibold">Size</div>
                                            <div className="w-[85px] shrink-0 text-center font-semibold">Status</div>
                                            <div className="w-[85px] shrink-0 text-center font-semibold">Lokasi</div>
                                            <div className="w-[75px] shrink-0 text-center font-semibold">Line</div>
                                            <div className="w-20 shrink-0 text-center font-semibold">Actions</div>
                                        </div>
                                    </div>

                                    {/* Table Body - Scrollable dengan custom scrollbar */}
                                    <div 
                                        className="flex-1 overflow-y-auto min-h-0"
                                        style={{
                                            scrollbarWidth: 'thin',
                                            scrollbarColor: '#cbd5e1 #f1f5f9',
                                            WebkitOverflowScrolling: 'touch' // Smooth scrolling untuk mobile/tablet
                                        }}
                                    >
                                    <style>{`
                                        div[class*="overflow-y-auto"]::-webkit-scrollbar {
                                            width: 8px;
                                            height: 8px;
                                        }
                                        div[class*="overflow-y-auto"]::-webkit-scrollbar-track {
                                            background: #f1f5f9;
                                            border-radius: 4px;
                                        }
                                        div[class*="overflow-y-auto"]::-webkit-scrollbar-thumb {
                                            background: #cbd5e1;
                                            border-radius: 4px;
                                        }
                                        div[class*="overflow-y-auto"]::-webkit-scrollbar-thumb:hover {
                                            background: #94a3b8;
                                        }
                                    `}</style>
                                    {filteredData.map((item, index) => (
                                        <div
                                            key={item.id}
                                            className={`flex items-center px-3 py-3.5 border-b border-slate-100 transition-all duration-200 text-sm font-medium group gap-2 min-w-max ${
                                                index % 2 === 0 
                                                    ? 'bg-white hover:bg-blue-50/50' 
                                                    : 'bg-slate-50/50 hover:bg-blue-50/50'
                                            }`}
                                        >
                                            <div className="w-[130px] shrink-0 text-center">
                                                <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-extrabold bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200 font-mono shadow-sm group-hover:shadow-md transition-shadow">
                                                    {item.rfid}
                                                </span>
                                            </div>
                                            <div className="w-[75px] shrink-0 text-center text-slate-700 font-semibold text-sm">
                                                {item.nomor_wo || '-'}
                                            </div>
                                            <div className="w-[85px] shrink-0 text-center text-slate-700 text-sm">
                                                {item.style || '-'}
                                            </div>
                                            <div className="w-[140px] shrink-0 text-center text-slate-700 text-sm">
                                                <span className="truncate block" title={item.buyer || '-'}>
                                                    {item.buyer || '-'}
                                                </span>
                                            </div>
                                            <div className="w-[180px] shrink-0 text-center text-slate-700 text-sm">
                                                <span className="truncate block" title={item.item || '-'}>
                                                    {item.item || '-'}
                                                </span>
                                            </div>
                                            <div className="w-[80px] shrink-0 text-center">
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold">
                                                    <span className="w-3 h-3 rounded-full border-2 border-slate-300 shadow-sm" style={{ backgroundColor: item.color?.toLowerCase() || '#ccc' }}></span>
                                                    <span className="text-slate-700 truncate">{item.color || '-'}</span>
                                                </span>
                                            </div>
                                            <div className="w-[55px] shrink-0 text-center font-bold text-slate-700 text-sm">
                                                {item.size || '-'}
                                            </div>
                                            <div className="w-[85px] shrink-0 text-center">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold shadow-sm transition-all ${
                                                    item.status === 'Good' 
                                                        ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200' 
                                                        : item.status === 'Reject' 
                                                        ? 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200'
                                                        : item.status === 'OUTPUT'
                                                        ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200'
                                                        : 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-200'
                                                }`}>
                                                    {(item.status || 'Unknown').toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="w-[85px] shrink-0 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold shadow-sm ${
                                                    item.lokasi === 'Dryroom' 
                                                        ? 'bg-gradient-to-r from-purple-50 to-violet-50 text-purple-700 border border-purple-200'
                                                        : 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 border border-slate-200'
                                                }`}>
                                                    <MapPin size={11} />
                                                    {(() => {
                                                        const lokasiUpper = item.lokasi?.toUpperCase().trim() || '';
                                                        const isOutputSewing = lokasiUpper === 'OUTPUT_SEWING' || lokasiUpper.includes('OUTPUT_SEWING');
                                                        
                                                        return isOutputSewing ? (
                                                            <span className="truncate">OUTPUT</span>
                                                        ) : (
                                                            <span className="truncate">{item.lokasi || '-'}</span>
                                                        );
                                                    })()}
                                                </span>
                                            </div>
                                            <div className="w-[75px] shrink-0 text-center">
                                                <span className="inline-flex items-center px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200 shadow-sm">
                                                    {item.line || '-'}
                                                </span>
                                            </div>
                                            <div className="w-20 shrink-0 flex justify-center gap-1.5">
                                                <button
                                                    onClick={() => handleView(item)}
                                                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item)}
                                                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                                                    title="Delete Data"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Detail Modal */}
            {showModal && selectedScan && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={handleCloseModal}>
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between text-white flex-shrink-0">
                            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                                <FileText size={18} className="sm:w-5 sm:h-5" />
                                <span>Detail RFID Data</span>
                            </h2>
                            <button onClick={handleCloseModal} className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg">
                                <X size={20} className="sm:w-6 sm:h-6" />
                            </button>
                        </div>
                        <div className="p-4 sm:p-6 space-y-2 sm:space-y-2.5 overflow-y-auto flex-1">
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-slate-100 hover:bg-slate-50/50 transition-colors rounded px-1 -mx-1">
                                <span className="text-slate-500 font-medium text-xs sm:text-sm flex-shrink-0">RFID ID</span>
                                <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-xs sm:text-sm ml-2 text-right break-all">{selectedScan.rfid}</span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-slate-100 hover:bg-slate-50/50 transition-colors rounded px-1 -mx-1">
                                <span className="text-slate-500 font-medium text-xs sm:text-sm flex-shrink-0">Nomor WO</span>
                                <span className="text-slate-800 font-medium text-xs sm:text-sm ml-2 text-right break-all">{selectedScan.nomor_wo || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-slate-100 hover:bg-slate-50/50 transition-colors rounded px-1 -mx-1">
                                <span className="text-slate-500 font-medium text-xs sm:text-sm flex-shrink-0">Style</span>
                                <span className="text-slate-800 font-medium text-xs sm:text-sm ml-2 text-right break-all">{selectedScan.style || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-slate-100 hover:bg-slate-50/50 transition-colors rounded px-1 -mx-1">
                                <span className="text-slate-500 font-medium text-xs sm:text-sm flex-shrink-0">Buyer</span>
                                <span className="text-slate-800 font-medium text-xs sm:text-sm ml-2 text-right break-all max-w-[60%] truncate" title={selectedScan.buyer}>{selectedScan.buyer || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-slate-100 hover:bg-slate-50/50 transition-colors rounded px-1 -mx-1">
                                <span className="text-slate-500 font-medium text-xs sm:text-sm flex-shrink-0">Item</span>
                                <span className="text-slate-800 font-medium text-xs sm:text-sm ml-2 text-right break-all max-w-[60%] truncate" title={selectedScan.item}>{selectedScan.item || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-slate-100 hover:bg-slate-50/50 transition-colors rounded px-1 -mx-1">
                                <span className="text-slate-500 font-medium text-xs sm:text-sm flex-shrink-0">Color</span>
                                <span className="text-slate-800 font-medium text-xs sm:text-sm flex items-center gap-1.5 ml-2">
                                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-slate-200 flex-shrink-0" style={{ backgroundColor: selectedScan.color?.toLowerCase() }}></span>
                                    <span className="text-right">{selectedScan.color || '-'}</span>
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-slate-100 hover:bg-slate-50/50 transition-colors rounded px-1 -mx-1">
                                <span className="text-slate-500 font-medium text-xs sm:text-sm flex-shrink-0">Size</span>
                                <span className="text-slate-800 font-medium text-xs sm:text-sm ml-2 text-right">{selectedScan.size || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-slate-100 hover:bg-slate-50/50 transition-colors rounded px-1 -mx-1">
                                <span className="text-slate-500 font-medium text-xs sm:text-sm flex-shrink-0">Status</span>
                                <span className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ml-2 flex-shrink-0 ${selectedScan.status === 'Good' ? 'bg-green-100 text-green-700' :
                                        selectedScan.status === 'Reject' ? 'bg-red-100 text-red-700' :
                                        selectedScan.status === 'OUTPUT' ? 'bg-blue-100 text-blue-700' :
                                            'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    {(selectedScan.status || 'Unknown').toUpperCase()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-slate-100 hover:bg-slate-50/50 transition-colors rounded px-1 -mx-1">
                                <span className="text-slate-500 font-medium text-xs sm:text-sm flex-shrink-0">Lokasi</span>
                                <span className="flex items-center gap-1 text-slate-800 font-medium text-xs sm:text-sm ml-2">
                                    <MapPin size={12} className="sm:w-3.5 sm:h-3.5 text-slate-400 flex-shrink-0" />
                                    {(() => {
                                        const lokasiUpper = selectedScan.lokasi?.toUpperCase().trim() || '';
                                        const isOutputSewing = lokasiUpper === 'OUTPUT_SEWING' || lokasiUpper.includes('OUTPUT_SEWING');
                                        
                                        return isOutputSewing ? (
                                            <span className="text-right">OUTPUT</span>
                                        ) : (
                                            <span className="text-right">{selectedScan.lokasi || '-'}</span>
                                        );
                                    })()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-slate-100 hover:bg-slate-50/50 transition-colors rounded px-1 -mx-1">
                                <span className="text-slate-500 font-medium text-xs sm:text-sm flex-shrink-0">Line</span>
                                <span className="text-slate-800 font-medium text-xs sm:text-sm ml-2 text-right">{selectedScan.line || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 hover:bg-slate-50/50 transition-colors rounded px-1 -mx-1">
                                <span className="text-slate-500 font-medium text-xs sm:text-sm flex-shrink-0">Timestamp</span>
                                <span className="text-slate-800 font-medium text-[10px] sm:text-xs font-mono ml-2 text-right break-all">
                                    {selectedScan.timestamp ? (() => {
                                        try {
                                            const date = new Date(selectedScan.timestamp);
                                            return date.toLocaleString('id-ID', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                second: '2-digit'
                                            });
                                        } catch (e) {
                                            return selectedScan.timestamp;
                                        }
                                    })() : '-'}
                                </span>
                            </div>
                        </div>
                        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 sm:px-6 py-3 sm:py-4 flex justify-end border-t border-slate-200 flex-shrink-0">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 sm:px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md text-sm sm:text-base"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && itemToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={cancelDelete}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} className="text-red-600" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Hapus Data RFID?</h2>
                            <p className="text-slate-500 mb-6">
                                Apakah Anda yakin ingin menghapus data RFID <span className="font-mono font-bold text-slate-700">{itemToDelete.rfid}</span>?
                                Tindakan ini tidak dapat dibatalkan.
                            </p>

                            <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-6 text-left flex gap-3">
                                <AlertTriangle className="text-red-500 shrink-0" size={20} />
                                <p className="text-xs text-red-700">
                                    Data yang dihapus akan hilang permanen dari database dan tidak dapat dipulihkan kembali.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={cancelDelete}
                                    disabled={isDeleting}
                                    className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Menghapus...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 size={18} />
                                            Hapus
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Modal */}
            {showFilterModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowFilterModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-slate-800">Filter Data</h2>
                                <button
                                    onClick={() => setShowFilterModal(false)}
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
                                            value={filterDateFrom}
                                            onChange={(e) => setFilterDateFrom(e.target.value)}
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
                                            value={filterDateTo}
                                            onChange={(e) => setFilterDateTo(e.target.value)}
                                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                    </div>
                                </div>

                                {/* Status Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                                    <div className="relative">
                                        <select
                                            value={filterStatusModal}
                                            onChange={(e) => setFilterStatusModal(e.target.value)}
                                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                                        >
                                            <option value="Semua">Semua</option>
                                            {uniqueStatuses.map((status) => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Size Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Size</label>
                                    <div className="relative">
                                        <select
                                            value={filterSize}
                                            onChange={(e) => setFilterSize(e.target.value)}
                                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                                        >
                                            <option value="Semua">Semua</option>
                                            {uniqueSizes.map((size) => (
                                                <option key={size} value={size}>{size}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Color Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
                                    <div className="relative">
                                        <select
                                            value={filterColor}
                                            onChange={(e) => setFilterColor(e.target.value)}
                                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                                        >
                                            <option value="Semua">Semua</option>
                                            {uniqueColors.map((color) => (
                                                <option key={color} value={color}>{color}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={handleResetFilter}
                                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={handleFilterData}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                                >
                                    Filter Data
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Export Modal */}
            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={handleExport}
                lineId="1"
            />
        </div>
    );
};

export default ListRFID;

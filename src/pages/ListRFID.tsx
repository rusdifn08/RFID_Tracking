import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../config/api';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';
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
    Layers,
    Palette,
    Ruler
} from 'lucide-react';

interface RFIDItem {
    id: string | number;
    rfid: string;
    // timestamp removed
    style?: string;
    buyer?: string;
    nomor_wo?: string;
    item?: string;
    color?: string;
    size?: string;
    status: string;
    lokasi?: string;
    line?: string;
}

const ListRFID: React.FC = () => {
    const navigate = useNavigate();
    const { isOpen } = useSidebar();
    const [rfidData, setRfidData] = useState<RFIDItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');

    // Filters
    const [filterWO, setFilterWO] = useState<string>('');
    const [filterBuyer, setFilterBuyer] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterLocation, setFilterLocation] = useState<string>('');

    const [selectedScan, setSelectedScan] = useState<RFIDItem | null>(null);
    const [showModal, setShowModal] = useState<boolean>(false);
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
    const [itemToDelete, setItemToDelete] = useState<RFIDItem | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    // Generate 100 Mock Data Items
    const generateMockData = (): RFIDItem[] => {
        const buyers = ['Montbell', 'Redwings', 'HEXAPOLE COMPANY LIMITED', 'Bergans'];
        const styles = ['ST-001', 'ST-002', 'ST-003', 'ST-004', 'ST-005', 'JKT-001', 'PNT-002', 'SRT-003'];
        const items = ['SHIRT', 'PANTS', 'JACKET', 'SHORTS', 'SKIRT', 'DRESS', 'HOODIE', 'SWEATER'];
        const colors = ['RED', 'BLUE', 'GREEN', 'BLACK', 'WHITE', 'NAVY', 'GREY', 'YELLOW'];
        const sizes = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];
        const statuses = ['Reject', 'Rework', 'Good'];
        const lines = Array.from({ length: 9 }, (_, i) => `Line ${i + 1}`);

        return Array.from({ length: 100 }, (_, index) => {
            const id = index + 1;
            const randomBuyer = buyers[Math.floor(Math.random() * buyers.length)];
            const randomStyle = styles[Math.floor(Math.random() * styles.length)];
            const randomItem = items[Math.floor(Math.random() * items.length)];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            const randomSize = sizes[Math.floor(Math.random() * sizes.length)];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            const randomLine = lines[Math.floor(Math.random() * lines.length)];

            // Location logic based on status
            let possibleLocations = ['QC', 'PQC'];
            if (randomStatus === 'Good') {
                possibleLocations.push('Dryroom');
            }
            const randomLocation = possibleLocations[Math.floor(Math.random() * possibleLocations.length)];

            return {
                id: `MOCK-${id}`,
                rfid: `E200${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
                style: randomStyle,
                buyer: randomBuyer,
                nomor_wo: `WO-${2024000 + id}`,
                item: randomItem,
                color: randomColor,
                size: randomSize,
                status: randomStatus,
                lokasi: randomLocation,
                line: randomLine
            };
        });
    };

    // Fetch data dari database
    const fetchRFIDData = async () => {
        try {
            setLoading(true);
            // Simulasi API call atau gunakan mock data jika API gagal/kosong
            // Uncomment baris di bawah ini jika ingin mencoba fetch API asli dulu
            /*
            const response = await fetch(getApiUrl('/api/line1'));
            const result = await response.json();

            if (result.success && result.data.length > 0) {
                setRfidData(result.data);
                setError(null);
            } else {
                // Fallback ke mock data jika API kosong
                setRfidData(generateMockData());
            }
            */

            // Langsung gunakan mock data sesuai request user
            setTimeout(() => {
                setRfidData(generateMockData());
                setLoading(false);
            }, 500); // Simulasi delay loading

        } catch (error) {
            console.error('Error fetching RFID data:', error);
            // Fallback ke mock data saat error
            setRfidData(generateMockData());
            setLoading(false);
        }
    };

    // Load data saat component mount
    useEffect(() => {
        fetchRFIDData();
    }, []);

    // Filter data
    const filteredData = rfidData.filter(item => {
        const matchSearch = (item.rfid?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (item.nomor_wo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (item.style?.toLowerCase() || '').includes(searchTerm.toLowerCase());

        const matchWO = !filterWO || item.nomor_wo === filterWO;
        const matchBuyer = !filterBuyer || item.buyer === filterBuyer;
        const matchStatus = !filterStatus || item.status === filterStatus;
        const matchLocation = !filterLocation || item.lokasi === filterLocation;

        return matchSearch && matchWO && matchBuyer && matchStatus && matchLocation;
    });

    // Get unique values for filters
    const uniqueWOs = [...new Set(rfidData.map(item => item.nomor_wo).filter(Boolean))].sort();
    const uniqueBuyers = [...new Set(rfidData.map(item => item.buyer).filter(Boolean))].sort();
    const uniqueStatuses = [...new Set(rfidData.map(item => item.status).filter(Boolean))].sort();
    const uniqueLocations = [...new Set(rfidData.map(item => item.lokasi).filter(Boolean))].sort();

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
        // Simulasi delete untuk mock data
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
                    className="flex-1 overflow-hidden flex flex-col h-screen"
                    style={{
                        marginTop: '80px', // Jarak dari atas agar tidak tertutup header
                        padding: '20px',   // Padding konten
                        height: 'calc(100vh - 80px)' // Sesuaikan tinggi agar tidak double scroll
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
                            <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                                <span className="text-slate-500 text-sm font-semibold">Total ID:</span>
                                <span className="text-blue-600 text-xl font-bold">{rfidData.length}</span>
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
                                    placeholder="Search by RFID ID, Work Order, or Style..."
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
                        className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col min-h-0 mb-4"
                        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                    >
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                                <p>Loading RFID data...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center h-full text-red-500">
                                <AlertTriangle size={48} className="mb-4 opacity-50" />
                                <h3 className="text-lg font-bold">Error Loading Data</h3>
                                <p className="text-sm mb-4">{error}</p>
                                <button
                                    onClick={handleRefresh}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
                            <div className="flex flex-col h-full">
                                {/* Table Header - Sticky, Taller, Bolder, High Contrast */}
                                <div className="bg-slate-800 border-b border-slate-700 shrink-0">
                                    <div className="flex items-center px-4 h-16 text-sm font-extrabold text-white uppercase tracking-wider">
                                        <div className="w-12 shrink-0 text-center" style={{ textAlign: 'center' }}>No</div>
                                        <div className="flex-1 min-w-[150px] text-center" style={{ textAlign: 'center' }}>RFID ID</div>
                                        <div className="flex-1 min-w-[100px] text-center" style={{ textAlign: 'center' }}>WO</div>
                                        <div className="flex-1 min-w-[100px] text-center" style={{ textAlign: 'center' }}>Style</div>
                                        <div className="flex-1 min-w-[100px] text-center" style={{ textAlign: 'center' }}>Buyer</div>
                                        <div className="flex-1 min-w-[100px] text-center" style={{ textAlign: 'center' }}>Item</div>
                                        <div className="flex-1 min-w-[80px] text-center" style={{ textAlign: 'center' }}>Color</div>
                                        <div className="flex-1 min-w-[60px] text-center" style={{ textAlign: 'center' }}>Size</div>
                                        <div className="flex-1 min-w-[100px] text-center" style={{ textAlign: 'center' }}>Status</div>
                                        <div className="flex-1 min-w-[100px] text-center" style={{ textAlign: 'center' }}>Lokasi</div>
                                        <div className="flex-1 min-w-[100px] text-center" style={{ textAlign: 'center' }}>Line</div>
                                        <div className="w-24 shrink-0 text-center" style={{ textAlign: 'center' }}>Actions</div>
                                    </div>
                                </div>

                                {/* Table Body - Scrollable */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    {filteredData.map((item, index) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center px-4 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors text-sm text-slate-700 font-medium"
                                        >
                                            <div className="w-12 shrink-0 font-bold text-slate-500 text-center" style={{ textAlign: 'center' }}>{index + 1}</div>
                                            <div className="flex-1 min-w-[150px] text-center" style={{ textAlign: 'center' }}>
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 font-mono">
                                                    {item.rfid}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-[100px] text-center" style={{ textAlign: 'center' }}>{item.nomor_wo}</div>
                                            <div className="flex-1 min-w-[100px] text-center" style={{ textAlign: 'center' }}>{item.style}</div>
                                            <div className="flex-1 min-w-[100px] text-center" style={{ textAlign: 'center' }}>{item.buyer}</div>
                                            <div className="flex-1 min-w-[100px] text-center" style={{ textAlign: 'center' }}>{item.item}</div>
                                            <div className="flex-1 min-w-[80px] text-center" style={{ textAlign: 'center' }}>
                                                <span className="inline-flex items-center gap-1">
                                                    <span className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: item.color?.toLowerCase() }}></span>
                                                    {item.color}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-[60px] text-center font-bold" style={{ textAlign: 'center' }}>{item.size}</div>
                                            <div className="flex-1 min-w-[100px] text-center" style={{ textAlign: 'center' }}>
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${item.status === 'Good' ? 'bg-green-100 text-green-800' :
                                                        item.status === 'Reject' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-[100px] text-center" style={{ textAlign: 'center' }}>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${item.lokasi === 'Dryroom' ? 'bg-purple-50 text-purple-700' :
                                                        'bg-slate-100 text-slate-700'
                                                    }`}>
                                                    {item.lokasi || '-'}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-[100px] text-center" style={{ textAlign: 'center' }}>
                                                <span className="text-slate-600 font-semibold">{item.line}</span>
                                            </div>
                                            <div className="w-24 shrink-0 flex justify-center gap-2" style={{ textAlign: 'center' }}>
                                                <button
                                                    onClick={() => handleView(item)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete Data"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Detail Modal */}
            {showModal && selectedScan && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={handleCloseModal}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <FileText size={20} />
                                Detail RFID Data
                            </h2>
                            <button onClick={handleCloseModal} className="text-white/80 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500 font-medium text-sm">RFID ID</span>
                                <span className="font-mono font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg text-sm">{selectedScan.rfid}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500 font-medium text-sm">Nomor WO</span>
                                <span className="text-slate-800 font-medium text-sm">{selectedScan.nomor_wo}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500 font-medium text-sm">Style</span>
                                <span className="text-slate-800 font-medium text-sm">{selectedScan.style}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500 font-medium text-sm">Buyer</span>
                                <span className="text-slate-800 font-medium text-sm">{selectedScan.buyer}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500 font-medium text-sm">Item</span>
                                <span className="text-slate-800 font-medium text-sm">{selectedScan.item}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500 font-medium text-sm">Color</span>
                                <span className="text-slate-800 font-medium text-sm flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: selectedScan.color?.toLowerCase() }}></span>
                                    {selectedScan.color}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500 font-medium text-sm">Size</span>
                                <span className="text-slate-800 font-medium text-sm">{selectedScan.size}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500 font-medium text-sm">Status</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${selectedScan.status === 'Good' ? 'bg-green-100 text-green-700' :
                                        selectedScan.status === 'Reject' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    {selectedScan.status}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500 font-medium text-sm">Lokasi</span>
                                <span className="flex items-center gap-1 text-slate-800 font-medium text-sm">
                                    <MapPin size={14} className="text-slate-400" />
                                    {selectedScan.lokasi || '-'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-slate-500 font-medium text-sm">Line</span>
                                <span className="text-slate-800 font-medium text-sm">{selectedScan.line}</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-6 py-4 flex justify-end">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
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
        </div>
    );
};

export default ListRFID;

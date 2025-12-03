import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';
import { Radio, Search, CheckCircle2, XCircle, AlertCircle, Activity, Filter, Download, RefreshCw, TrendingUp, TrendingDown, BarChart3, Clock, MapPin, User } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

interface RFIDCheckItem {
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
    lastScanned?: string; // Timestamp dari API
    lokasi?: string; // Lokasi dari API (bagian)
    statusData?: string; // Status dari API (last_status)
}

export default function CheckingRFID() {
    const { isOpen } = useSidebar();
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

        // Simulasi checking dengan delay (bisa diganti dengan API call)
        setTimeout(async () => {
            try {
                // Cek di database melalui API tracking/rfid_garment untuk data lengkap
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
                        // Ambil data terbaru (index 0 atau yang terakhir)
                        const latestData = trackingData.data[0];
                        
                        // Convert last_status ke format yang sesuai
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
                        
                        // Parse lokasi dari bagian
                        let lokasi = '';
                        if (latestData.bagian) {
                            const bagian = latestData.bagian.trim().toUpperCase();
                            if (bagian === 'IRON' || bagian === 'OPERATOR') {
                                lokasi = 'SEWING';
                            } else {
                                lokasi = latestData.bagian.trim();
                            }
                        }
                        
                        // Parse line
                        const itemLine = latestData.line?.toString() || '1';
                        const lineDisplay = itemLine ? `Line ${itemLine}` : 'N/A';
                        
                        // Parse timestamp
                        let lastScanned = '';
                        if (latestData.timestamp) {
                            try {
                                const date = new Date(latestData.timestamp);
                                if (!isNaN(date.getTime())) {
                                    lastScanned = date.toLocaleString('id-ID', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                        timeZone: 'UTC'
                                    });
                                }
                            } catch (e) {
                                // Ignore error parsing timestamp
                            }
                        }
                        
                        // RFID ditemukan
                        newItem = {
                            rfid: trimmedRfid,
                            timestamp,
                            status: 'found',
                            location: lineDisplay,
                            details: 'RFID ditemukan di database',
                            wo: latestData.wo || '',
                            style: latestData.style || '',
                            buyer: latestData.buyer || '',
                            item: latestData.item || '',
                            color: latestData.color || '',
                            size: latestData.size || '',
                            line: itemLine,
                            lastScanned: lastScanned,
                            lokasi: lokasi,
                            statusData: statusData,
                        };
                    } else {
                        // Coba API garment sebagai fallback
                        const garmentResponse = await fetch(`${API_BASE_URL}/garment?rfid_garment=${encodeURIComponent(trimmedRfid)}`, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                            },
                        });
                        
                        if (garmentResponse.ok) {
                            const garmentData = await garmentResponse.json();
                            if (garmentData.success && garmentData.data) {
                                const itemLine = garmentData.data.line?.toString() || '1';
                                const lineDisplay = itemLine ? `Line ${itemLine}` : 'N/A';
                                
                                newItem = {
                                    rfid: trimmedRfid,
                                    timestamp,
                                    status: 'found',
                                    location: lineDisplay,
                                    details: 'RFID ditemukan di database',
                                    wo: garmentData.data.wo || '',
                                    style: garmentData.data.style || '',
                                    buyer: garmentData.data.buyer || '',
                                    item: garmentData.data.item || '',
                                    color: garmentData.data.color || '',
                                    size: garmentData.data.size || '',
                                    line: itemLine,
                                };
                            } else {
                                // RFID tidak ditemukan
                                newItem = {
                                    rfid: trimmedRfid,
                                    timestamp,
                                    status: 'not_found',
                                    details: 'RFID tidak ditemukan di database',
                                };
                            }
                        } else {
                            // RFID tidak ditemukan
                            newItem = {
                                rfid: trimmedRfid,
                                timestamp,
                                status: 'not_found',
                                details: 'RFID tidak ditemukan di database',
                            };
                        }
                    }
                } else {
                    // Coba API garment sebagai fallback
                    const garmentResponse = await fetch(`${API_BASE_URL}/garment?rfid_garment=${encodeURIComponent(trimmedRfid)}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                    });
                    
                    if (garmentResponse.ok) {
                        const garmentData = await garmentResponse.json();
                        if (garmentData.success && garmentData.data) {
                            const itemLine = garmentData.data.line?.toString() || '1';
                            const lineDisplay = itemLine ? `Line ${itemLine}` : 'N/A';
                            
                            newItem = {
                                rfid: trimmedRfid,
                                timestamp,
                                status: 'found',
                                location: lineDisplay,
                                details: 'RFID ditemukan di database',
                                wo: garmentData.data.wo || '',
                                style: garmentData.data.style || '',
                                buyer: garmentData.data.buyer || '',
                                item: garmentData.data.item || '',
                                color: garmentData.data.color || '',
                                size: garmentData.data.size || '',
                                line: itemLine,
                            };
                        } else {
                            // RFID tidak ditemukan
                            newItem = {
                                rfid: trimmedRfid,
                                timestamp,
                                status: 'not_found',
                                details: 'RFID tidak ditemukan di database',
                            };
                        }
                    } else {
                        // Error atau tidak ditemukan
                        newItem = {
                            rfid: trimmedRfid,
                            timestamp,
                            status: 'not_found',
                            details: 'RFID tidak ditemukan di database',
                        };
                    }
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

    // Filter items berdasarkan status
    const filteredItems = checkItems.filter(item => {
        if (filterStatus !== 'all' && item.status !== filterStatus) return false;
        if (searchQuery && !item.rfid.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    // Handle click pada item untuk menampilkan tracking data
    const handleItemClick = async (rfid: string) => {
        if (!rfid) return;
        
        setSelectedRfid(rfid);
        setShowTrackingModal(true);
        setLoadingTracking(true);
        setTrackingData([]);

        try {
            const response = await fetch(`${API_BASE_URL}/tracking/rfid_garment?rfid_garment=${encodeURIComponent(rfid)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data && Array.isArray(data.data)) {
                    // Sort berdasarkan timestamp dari paling lama ke paling baru
                    const sortedData = [...data.data].sort((a, b) => {
                        const dateA = new Date(a.timestamp || 0).getTime();
                        const dateB = new Date(b.timestamp || 0).getTime();
                        return dateA - dateB; // Ascending (lama ke baru)
                    });
                    setTrackingData(sortedData);
                } else {
                    setTrackingData([]);
                }
            } else {
                setTrackingData([]);
            }
        } catch (error) {
            setTrackingData([]);
        } finally {
            setLoadingTracking(false);
        }
    };

    // Helper function to parse timestamp
    const parseTimestamp = (timestamp: string): string => {
        if (!timestamp) return '-';
        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZone: 'UTC'
            });
        } catch (e) {
            return '-';
        }
    };

    // Helper function to get status color
    const getStatusColor = (status: string): string => {
        const upperStatus = (status || '').toUpperCase().trim();
        if (upperStatus === 'GOOD' || upperStatus === 'OUTPUT' || upperStatus.includes('OUTPUT')) {
            return 'bg-green-100 text-green-700 border-green-300';
        } else if (upperStatus === 'REWORK') {
            return 'bg-yellow-100 text-yellow-700 border-yellow-300';
        } else if (upperStatus === 'REJECT') {
            return 'bg-red-100 text-red-700 border-red-300';
        }
        return 'bg-gray-100 text-gray-700 border-gray-300';
    };

    // Helper function to format lokasi
    const formatLokasi = (bagian: string): string => {
        if (!bagian) return '-';
        const bagianUpper = bagian.trim().toUpperCase();
        if (bagianUpper === 'IRON' || bagianUpper === 'OPERATOR') {
            return 'SEWING';
        }
        return bagian.trim();
    };

    // Statistics
    const stats = {
        total: checkItems.length,
        found: checkItems.filter(i => i.status === 'found').length,
        notFound: checkItems.filter(i => i.status === 'not_found').length,
    };

    // Sidebar width
    const sidebarWidth = isOpen ? '15%' : '3%';

    return (
        <div className="flex min-h-screen w-full bg-gray-100 font-sans overflow-x-hidden">
            {/* Sidebar */}
            <div className="fixed left-0 top-0 h-full z-50 shadow-xl">
                <Sidebar />
            </div>

            {/* Main Content */}
            <div
                className="flex flex-col w-full h-screen transition-all duration-300 ease-in-out"
                style={{
                    marginLeft: sidebarWidth,
                    width: `calc(100% - ${sidebarWidth})`
                }}
            >
                {/* Header */}
                <div className="sticky top-0 z-40 shadow-md">
                    <Header />
                </div>

                {/* Page Content */}
                <main className="flex-1 p-6 space-y-6 pt-16 overflow-y-auto h-full">
                    {/* Page Title */}
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center gap-4 mb-4">
                            <div className="p-3 bg-white border-2 border-blue-500 rounded-xl">
                                <Radio className="w-8 h-8 text-blue-500" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800 uppercase tracking-wider">
                                    Checking RFID
                                </h1>
                                <p className="text-gray-600 font-medium mt-2">
                                    Real-time RFID Tracking & Verification System
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white border-2 border-blue-500 rounded-lg p-4 hover:bg-blue-500 hover:text-white transition-all duration-300 cursor-pointer">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium hover:text-white">Total Checks</p>
                                    <p className="text-3xl font-bold text-gray-800 mt-2 hover:text-white">{stats.total}</p>
                                </div>
                                <BarChart3 className="w-10 h-10 text-blue-500 hover:text-white" />
                            </div>
                        </div>
                        <div className="bg-white border-2 border-blue-500 rounded-lg p-4 hover:bg-blue-500 hover:text-white transition-all duration-300 cursor-pointer">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium hover:text-white">Found</p>
                                    <p className="text-3xl font-bold text-gray-800 mt-2 hover:text-white">{stats.found}</p>
                                </div>
                                <TrendingUp className="w-10 h-10 text-blue-500 hover:text-white" />
                            </div>
                        </div>
                        <div className="bg-white border-2 border-blue-500 rounded-lg p-4 hover:bg-blue-500 hover:text-white transition-all duration-300 cursor-pointer">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium hover:text-white">Not Found</p>
                                    <p className="text-3xl font-bold text-gray-800 mt-2 hover:text-white">{stats.notFound}</p>
                                </div>
                                <TrendingDown className="w-10 h-10 text-blue-500 hover:text-white" />
                            </div>
                        </div>
                        <div className="bg-white border-2 border-blue-500 rounded-lg p-4 hover:bg-blue-500 hover:text-white transition-all duration-300 cursor-pointer">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium hover:text-white">Success Rate</p>
                                    <p className="text-3xl font-bold text-gray-800 mt-2 hover:text-white">
                                        {stats.total > 0 ? Math.round((stats.found / stats.total) * 100) : 0}%
                                    </p>
                                </div>
                                <Activity className="w-10 h-10 text-blue-500 hover:text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Input Section */}
                    <div className="bg-white border-2 border-blue-500 rounded-lg p-6 hover:bg-blue-500 hover:text-white transition-all duration-300">
                        <div className="relative">
                            <label className="block text-gray-700 font-bold text-sm mb-3 uppercase tracking-wide hover:text-white">
                                Scan atau Ketik RFID
                            </label>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 hover:text-white" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={rfidInput}
                                        onChange={(e) => setRfidInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Scan atau ketik RFID untuk checking..."
                                        disabled={isChecking}
                                        className="w-full pl-12 pr-4 py-3 bg-white border-2 border-blue-500 rounded-lg text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 font-mono text-base hover:bg-blue-50"
                                    />
                                </div>
                                <button
                                    onClick={() => handleRfidCheck(rfidInput)}
                                    disabled={isChecking || !rfidInput.trim()}
                                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-200 flex items-center gap-2"
                                >
                                    {isChecking ? (
                                        <>
                                            <Activity className="w-5 h-5 animate-spin" />
                                            Checking...
                                        </>
                                    ) : (
                                        <>
                                            <Search className="w-5 h-5" />
                                            Check RFID
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Filters and Actions */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-white border-2 border-blue-500 rounded-lg p-2 hover:bg-blue-500 hover:text-white transition-all duration-300">
                                <Filter className="w-5 h-5 text-blue-500 hover:text-white" />
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value as 'all' | 'found' | 'not_found')}
                                    className="bg-transparent text-gray-700 border-none outline-none cursor-pointer hover:text-white"
                                >
                                    <option value="all">All Status</option>
                                    <option value="found">Found Only</option>
                                    <option value="not_found">Not Found Only</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 bg-white border-2 border-blue-500 rounded-lg p-2 flex-1 max-w-xs hover:bg-blue-500 hover:text-white transition-all duration-300">
                                <Search className="w-5 h-5 text-blue-500 hover:text-white" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search RFID..."
                                    className="bg-transparent text-gray-700 border-none outline-none flex-1 placeholder:text-gray-400 hover:text-white"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    setCheckItems([]);
                                    setRfidInput('');
                                }}
                                className="px-4 py-2 bg-white border-2 border-blue-500 rounded-lg text-blue-500 font-medium hover:bg-blue-500 hover:text-white transition-all duration-200 flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Clear All
                            </button>
                            <button
                                onClick={() => {
                                    const dataStr = JSON.stringify(checkItems, null, 2);
                                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                                    const url = URL.createObjectURL(dataBlob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `rfid-check-${new Date().toISOString()}.json`;
                                    link.click();
                                }}
                                disabled={checkItems.length === 0}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Export
                            </button>
                        </div>
                    </div>

                    {/* Results Section */}
                    <div className="bg-white border-2 border-blue-500 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">
                                Check Results
                            </h2>
                            <span className="text-gray-600 font-mono text-sm">
                                {filteredItems.length} of {checkItems.length} items
                            </span>
                        </div>

                        <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                            {filteredItems.length === 0 ? (
                                <div className="text-center py-16 text-gray-400">
                                    <Radio className="w-20 h-20 mx-auto mb-4 opacity-30" />
                                    <p className="text-xl font-medium">Belum ada data checking</p>
                                    <p className="text-sm mt-2">Scan atau ketik RFID untuk memulai checking</p>
                                </div>
                            ) : (
                                filteredItems.map((item, index) => (
                                    <div
                                        key={`${item.rfid}-${index}`}
                                        onClick={() => item.status === 'found' && handleItemClick(item.rfid)}
                                        className={`relative p-5 rounded-lg border-2 border-blue-500 bg-white hover:bg-blue-500 hover:text-white transition-all duration-300 ${
                                            item.status === 'found' ? 'cursor-pointer' : 'cursor-default'
                                        }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 rounded-lg bg-blue-50 border border-blue-500 hover:bg-white">
                                                {item.status === 'found' ? (
                                                    <CheckCircle2 className="w-7 h-7 text-green-500 hover:text-white" />
                                                ) : item.status === 'not_found' ? (
                                                    <XCircle className="w-7 h-7 text-red-500 hover:text-white" />
                                                ) : (
                                                    <AlertCircle className="w-7 h-7 text-yellow-500 animate-pulse hover:text-white" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="font-mono text-xl font-bold text-gray-800 hover:text-white">
                                                        {item.rfid}
                                                    </span>
                                                    <span className="text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-lg hover:bg-white hover:text-white">
                                                        {item.timestamp.toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 mb-2 flex-wrap">
                                                    <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
                                                        item.status === 'found'
                                                            ? 'bg-green-100 text-green-700 hover:bg-white hover:text-white'
                                                            : item.status === 'not_found'
                                                                ? 'bg-red-100 text-red-700 hover:bg-white hover:text-white'
                                                                : 'bg-yellow-100 text-yellow-700 hover:bg-white hover:text-white'
                                                    }`}>
                                                        {item.status === 'found' ? '✓ Found' : item.status === 'not_found' ? '✗ Not Found' : '⏳ Checking...'}
                                                    </span>
                                                    {item.location && (
                                                        <span className="text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-lg hover:bg-white hover:text-white">
                                                            📍 {item.location}
                                                        </span>
                                                    )}
                                                    {item.lastScanned && (
                                                        <span className="text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-lg hover:bg-white hover:text-white">
                                                            🕒 Last Scanned: {item.lastScanned}
                                                        </span>
                                                    )}
                                                    {item.lokasi && (
                                                        <span className="text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-lg hover:bg-white hover:text-white">
                                                            📦 Lokasi: {item.lokasi}
                                                        </span>
                                                    )}
                                                    {item.statusData && (
                                                        <span className={`text-xs font-bold px-3 py-1 rounded-lg ${
                                                            item.statusData === 'Good' || item.statusData === 'OUTPUT'
                                                                ? 'bg-green-100 text-green-700 hover:bg-white hover:text-white'
                                                                : item.statusData === 'Rework'
                                                                    ? 'bg-yellow-100 text-yellow-700 hover:bg-white hover:text-white'
                                                                    : item.statusData === 'Reject'
                                                                        ? 'bg-red-100 text-red-700 hover:bg-white hover:text-white'
                                                                        : 'bg-gray-100 text-gray-700 hover:bg-white hover:text-white'
                                                        }`}>
                                                            📊 Status: {item.statusData}
                                                        </span>
                                                    )}
                                                </div>
                                                {item.details && (
                                                    <p className="text-sm text-gray-600 mb-2 hover:text-white">
                                                        {item.details}
                                                    </p>
                                                )}
                                                {(item.wo || item.style || item.buyer || item.item || item.color || item.size) && (
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-200">
                                                        {item.wo && (
                                                            <div>
                                                                <p className="text-xs text-gray-500 mb-1 hover:text-white font-medium">WO</p>
                                                                <p className="text-sm font-bold text-gray-800 hover:text-white">{item.wo}</p>
                                                            </div>
                                                        )}
                                                        {item.style && (
                                                            <div>
                                                                <p className="text-xs text-gray-500 mb-1 hover:text-white font-medium">Style</p>
                                                                <p className="text-sm font-bold text-gray-800 hover:text-white">{item.style}</p>
                                                            </div>
                                                        )}
                                                        {item.buyer && (
                                                            <div className="sm:col-span-1 col-span-2">
                                                                <p className="text-xs text-gray-500 mb-1 hover:text-white font-medium">Buyer</p>
                                                                <p className="text-sm font-bold text-gray-800 hover:text-white truncate" title={item.buyer}>{item.buyer}</p>
                                                            </div>
                                                        )}
                                                        {item.item && (
                                                            <div className="sm:col-span-1 col-span-2">
                                                                <p className="text-xs text-gray-500 mb-1 hover:text-white font-medium">Item</p>
                                                                <p className="text-sm font-bold text-gray-800 hover:text-white truncate" title={item.item}>{item.item}</p>
                                                            </div>
                                                        )}
                                                        {item.color && (
                                                            <div>
                                                                <p className="text-xs text-gray-500 mb-1 hover:text-white font-medium">Color</p>
                                                                <p className="text-sm font-bold text-gray-800 hover:text-white">{item.color}</p>
                                                            </div>
                                                        )}
                                                        {item.size && (
                                                            <div>
                                                                <p className="text-xs text-gray-500 mb-1 hover:text-white font-medium">Size</p>
                                                                <p className="text-sm font-bold text-gray-800 hover:text-white">{item.size}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* Tracking Modal */}
            {showTrackingModal && (
                <div className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white bg-opacity-95 backdrop-blur-md rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-white border-opacity-20">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Activity className="w-5 h-5 text-blue-600" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">Tracking Data RFID</h3>
                                    <p className="text-sm text-gray-600 font-mono mt-1">{selectedRfid}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowTrackingModal(false);
                                    setTrackingData([]);
                                    setSelectedRfid('');
                                }}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                            >
                                <XCircle className="w-5 h-5 text-gray-500 hover:text-gray-700" strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                            {loadingTracking ? (
                                <div className="flex items-center justify-center py-16">
                                    <Activity className="w-8 h-8 text-blue-500 animate-spin" strokeWidth={2.5} />
                                    <span className="ml-3 text-gray-600">Memuat data tracking...</span>
                                </div>
                            ) : trackingData.length === 0 ? (
                                <div className="text-center py-16 text-gray-400">
                                    <Activity className="w-20 h-20 mx-auto mb-4 opacity-30" />
                                    <p className="text-xl font-medium">Tidak ada data tracking</p>
                                    <p className="text-sm mt-2">Data tracking untuk RFID ini belum tersedia</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {trackingData.map((track, index) => (
                                        <div
                                            key={`${track.id || index}`}
                                            className="relative p-4 rounded-lg border border-gray-200 bg-gradient-to-r from-white to-gray-50 hover:from-blue-50 hover:to-blue-100 transition-all duration-300"
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Timeline indicator */}
                                                <div className="flex flex-col items-center flex-shrink-0">
                                                    <div className={`w-3 h-3 rounded-full ${
                                                        index === 0 ? 'bg-blue-500' : 
                                                        index === trackingData.length - 1 ? 'bg-green-500' : 
                                                        'bg-gray-400'
                                                    }`}></div>
                                                    {index < trackingData.length - 1 && (
                                                        <div className="w-0.5 h-full bg-gray-300 mt-1"></div>
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className={`text-xs font-bold px-2 py-1 rounded border ${getStatusColor(track.last_status)}`}>
                                                                {track.last_status || 'Unknown'}
                                                            </span>
                                                            {track.bagian && (
                                                                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
                                                                    <MapPin className="w-3 h-3" />
                                                                    {formatLokasi(track.bagian)}
                                                                </span>
                                                            )}
                                                            {track.line && (
                                                                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                                    Line {track.line}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {track.timestamp && (
                                                            <span className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap">
                                                                <Clock className="w-3 h-3" />
                                                                {parseTimestamp(track.timestamp)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    {track.nama && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                                            <User className="w-4 h-4" />
                                                            <span className="font-medium">{track.nama}</span>
                                                        </div>
                                                    )}

                                                    {(track.wo || track.style || track.buyer || track.item || track.color || track.size) && (
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-200 text-xs">
                                                            {track.wo && (
                                                                <div>
                                                                    <span className="text-gray-500 font-medium">WO:</span>
                                                                    <span className="ml-1 font-semibold text-gray-700">{track.wo}</span>
                                                                </div>
                                                            )}
                                                            {track.style && (
                                                                <div>
                                                                    <span className="text-gray-500 font-medium">Style:</span>
                                                                    <span className="ml-1 font-semibold text-gray-700">{track.style}</span>
                                                                </div>
                                                            )}
                                                            {track.buyer && (
                                                                <div className="sm:col-span-1 col-span-2">
                                                                    <span className="text-gray-500 font-medium">Buyer:</span>
                                                                    <span className="ml-1 font-semibold text-gray-700 truncate block" title={track.buyer}>{track.buyer}</span>
                                                                </div>
                                                            )}
                                                            {track.item && (
                                                                <div className="sm:col-span-1 col-span-2">
                                                                    <span className="text-gray-500 font-medium">Item:</span>
                                                                    <span className="ml-1 font-semibold text-gray-700 truncate block" title={track.item}>{track.item}</span>
                                                                </div>
                                                            )}
                                                            {track.color && (
                                                                <div>
                                                                    <span className="text-gray-500 font-medium">Color:</span>
                                                                    <span className="ml-1 font-semibold text-gray-700">{track.color}</span>
                                                                </div>
                                                            )}
                                                            {track.size && (
                                                                <div>
                                                                    <span className="text-gray-500 font-medium">Size:</span>
                                                                    <span className="ml-1 font-semibold text-gray-700">{track.size}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {trackingData.length > 0 && (
                            <div className="flex items-center justify-between p-4 sm:p-6 border-t border-gray-200 flex-shrink-0">
                                <span className="text-sm text-gray-600">
                                    Total: <span className="font-semibold">{trackingData.length}</span> tracking records
                                </span>
                                <button
                                    onClick={() => {
                                        setShowTrackingModal(false);
                                        setTrackingData([]);
                                        setSelectedRfid('');
                                    }}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-semibold shadow-sm hover:shadow-md"
                                >
                                    Tutup
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import { useSidebar } from '../context/SidebarContext';
import { Search, CheckCircle2, XCircle, AlertCircle, Activity, Filter, Download, RefreshCw, TrendingUp, TrendingDown, BarChart3, Clock, Package } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import backgroundImage from '../assets/background.jpg';

interface GarmentData {
    buyer: string;
    color: string;
    id_garment: number;
    isDone: string;
    isMove: string;
    item: string;
    rfid_garment: string;
    size: string;
    style: string;
    timestamp: string;
    updated: string;
    wo: string;
}

interface RFIDStatusItem {
    rfid: string;
    timestamp: Date;
    status: 'found' | 'not_found' | 'checking';
    details?: string;
    garment?: GarmentData;
    message?: string;
}

export default function StatusRFID() {
    const { isOpen } = useSidebar();
    const [rfidInput, setRfidInput] = useState('');
    const [statusItems, setStatusItems] = useState<RFIDStatusItem[]>([]);
    const [isChecking, setIsChecking] = useState(false);
    const checkRFIDMutation = useMutation({
        mutationFn: async (rfid: string) => {
            const response = await fetch(`${API_BASE_URL}/tracking/check?rfid_garment=${encodeURIComponent(rfid.trim())}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'RFID tidak ditemukan di database');
            }

            return await response.json();
        },
        onSuccess: (data, rfid) => {
            const timestamp = new Date();
            let newItem: RFIDStatusItem;

            if (data.success && data.garment) {
                newItem = {
                    rfid: rfid.trim(),
                    timestamp,
                    status: 'found',
                    details: data.message || 'Data ditemukan',
                    garment: data.garment,
                    message: data.message,
                };
            } else {
                newItem = {
                    rfid: rfid.trim(),
                    timestamp,
                    status: 'not_found',
                    details: data.message || 'RFID tidak ditemukan di database',
                    message: data.message,
                };
            }

            setStatusItems(prev => [newItem, ...prev]);
            setRfidInput('');
            setIsChecking(false);

            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        },
        onError: (error: Error, rfid) => {
            const timestamp = new Date();
            const newItem: RFIDStatusItem = {
                rfid: rfid.trim(),
                timestamp,
                status: 'not_found',
                details: error.message || 'Error saat checking RFID',
            };
            setStatusItems(prev => [newItem, ...prev]);
            setRfidInput('');
            setIsChecking(false);

            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        },
    });
    const [filterStatus, setFilterStatus] = useState<'all' | 'found' | 'not_found'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto focus input saat halaman dimuat
    useEffect(() => {
        if (inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, []);

    // Handle RFID check dengan mutation
    const handleRfidCheck = async (rfid: string) => {
        if (!rfid.trim()) return;

        const trimmedRfid = rfid.trim();
        setIsChecking(true);

        // Simulasi checking dengan delay
        setTimeout(() => {
            checkRFIDMutation.mutate(trimmedRfid);
        }, 500);
    };

    // Update isChecking state berdasarkan mutation
    useEffect(() => {
        if (checkRFIDMutation.isPending) {
            setIsChecking(true);
        }
    }, [checkRFIDMutation.isPending]);

    // Handle Enter key
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !isChecking) {
            handleRfidCheck(rfidInput);
        }
    };

    // Filter items berdasarkan status
    const filteredItems = statusItems.filter(item => {
        if (filterStatus !== 'all' && item.status !== filterStatus) return false;
        if (searchQuery && !item.rfid.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

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

    // Statistics
    const stats = {
        total: statusItems.length,
        found: statusItems.filter(i => i.status === 'found').length,
        notFound: statusItems.filter(i => i.status === 'not_found').length,
    };

    // Sidebar width - sama dengan CheckingRFID
    const sidebarWidth = isOpen ? '18%' : '5rem';

    return (
        <div className="flex min-h-screen w-full h-screen font-sans overflow-x-hidden fixed inset-0 m-0 p-0"
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed',
            }}
        >
            {/* Sidebar */}
            <div className="fixed left-0 top-0 h-full z-50 shadow-xl">
                <Sidebar />
            </div>

            {/* Main Content */}
            <div
                className="flex flex-col w-full h-screen transition-all duration-300 ease-in-out"
                style={{
                    marginLeft: sidebarWidth,
                    width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)'
                }}
            >
                {/* Header */}
                <div className="sticky top-0 z-40 shadow-md">
                    <Header />
                </div>

                {/* Breadcrumb */}
                <Breadcrumb />

                {/* Page Content */}
                <main 
                    className="flex-1 p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6 space-y-3 xs:space-y-4 sm:space-y-5 md:space-y-6 pt-2 xs:pt-3 sm:pt-4 overflow-y-auto min-h-0"
                    style={{
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#cbd5e1 #f1f5f9',
                        paddingBottom: 'clamp(2rem, 4vh, 4rem)'
                    }}
                >
                    {/* Page Title */}
                    <div className="text-center mb-4 xs:mb-5 sm:mb-6 md:mb-8">
                        <div className="flex items-center justify-center gap-3 xs:gap-3.5 sm:gap-4 mb-3 xs:mb-3.5 sm:mb-4">
                            <div className="p-2 xs:p-2.5 sm:p-3 bg-white border-2 border-green-500 rounded-lg xs:rounded-xl">
                                <CheckCircle2 className="w-6 xs:w-7 sm:w-8 md:w-9 lg:w-10 h-6 xs:h-7 sm:h-8 md:h-9 lg:h-10 text-green-500" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h1 className="text-2xl xs:text-2xl sm:text-3xl md:text-3xl lg:text-3xl font-bold text-gray-800 uppercase tracking-wider" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                                    RFID Status Garment
                                </h1>
                                <p className="text-sm xs:text-sm sm:text-base md:text-base lg:text-base text-gray-600 font-medium mt-2" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 500 }}>
                                    Cek Status & Informasi Detail RFID Garment
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Input Section with Statistics */}
                    <div className="bg-white border-2 border-green-500 rounded-lg p-3 xs:p-4 sm:p-5 md:p-6 hover:shadow-lg hover:border-green-600 transition-all duration-300">
                        <label className="block text-gray-700 font-bold text-[10px] xs:text-xs sm:text-sm mb-3 xs:mb-3.5 sm:mb-4 tracking-wide uppercase" style={{ textTransform: 'capitalize' }}>
                            Scan atau Ketik RFID Garment
                        </label>
                        
                        <div className="flex flex-col lg:flex-row gap-3 xs:gap-4 sm:gap-5">
                            {/* Form Input Section - Diperkecil width */}
                            <div className="flex-1 lg:flex-none lg:w-2/3 xl:w-3/5">
                                <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 xs:gap-3">
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-2 xs:left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 xs:w-4.5 sm:w-5 h-4 xs:h-4.5 sm:h-5 text-green-500" />
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={rfidInput}
                                            onChange={(e) => setRfidInput(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder="Scan atau ketik RFID untuk checking status..."
                                            disabled={isChecking}
                                            className="w-full pl-8 xs:pl-10 sm:pl-12 pr-3 xs:pr-4 py-2 xs:py-2.5 sm:py-3 bg-white border-2 border-green-500 rounded-lg text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 font-mono text-sm xs:text-base hover:bg-green-50"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleRfidCheck(rfidInput)}
                                        disabled={(isChecking || checkRFIDMutation.isPending) || !rfidInput.trim()}
                                        className="px-4 xs:px-5 sm:px-6 py-2 xs:py-2.5 sm:py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 xs:gap-2 justify-center text-sm xs:text-base whitespace-nowrap"
                                    >
                                        {(isChecking || checkRFIDMutation.isPending) ? (
                                            <>
                                                <Activity className="w-4 xs:w-4.5 sm:w-5 h-4 xs:h-4.5 sm:h-5 animate-spin" />
                                                <span className="hidden xs:inline">Checking...</span>
                                                <span className="xs:hidden">...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Search className="w-4 xs:w-4.5 sm:w-5 h-4 xs:h-4.5 sm:h-5" />
                                                <span className="hidden xs:inline">Check Status</span>
                                                <span className="xs:hidden">Check</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Statistics Section - Compact */}
                            <div className="flex-1 lg:flex-none lg:w-1/3 xl:w-2/5">
                                <div className="grid grid-cols-3 gap-2 xs:gap-2.5 sm:gap-3 h-full">
                                    {/* Total Checks */}
                                    <div className="bg-green-50 border border-green-300 rounded-lg p-2 xs:p-2.5 sm:p-3 flex flex-col items-center justify-center">
                                        <BarChart3 className="w-4 xs:w-5 sm:w-6 h-4 xs:h-5 sm:h-6 text-green-500 mb-1 xs:mb-1.5" />
                                        <p className="text-[8px] xs:text-[9px] sm:text-[10px] text-gray-600 font-medium mb-0.5 xs:mb-1 text-center" style={{ textTransform: 'capitalize' }}>
                                            Total
                                        </p>
                                        <p className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold text-green-600 leading-none">
                                            {stats.total}
                                        </p>
                                    </div>

                                    {/* Found */}
                                    <div className="bg-green-50 border border-green-300 rounded-lg p-2 xs:p-2.5 sm:p-3 flex flex-col items-center justify-center">
                                        <TrendingUp className="w-4 xs:w-5 sm:w-6 h-4 xs:h-5 sm:h-6 text-green-500 mb-1 xs:mb-1.5" />
                                        <p className="text-[8px] xs:text-[9px] sm:text-[10px] text-gray-600 font-medium mb-0.5 xs:mb-1 text-center" style={{ textTransform: 'capitalize' }}>
                                            Found
                                        </p>
                                        <p className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold text-green-600 leading-none">
                                            {stats.found}
                                        </p>
                                    </div>

                                    {/* Not Found */}
                                    <div className="bg-red-50 border border-red-300 rounded-lg p-2 xs:p-2.5 sm:p-3 flex flex-col items-center justify-center">
                                        <TrendingDown className="w-4 xs:w-5 sm:w-6 h-4 xs:h-5 sm:h-6 text-red-500 mb-1 xs:mb-1.5" />
                                        <p className="text-[8px] xs:text-[9px] sm:text-[10px] text-gray-600 font-medium mb-0.5 xs:mb-1 text-center" style={{ textTransform: 'capitalize' }}>
                                            Not Found
                                        </p>
                                        <p className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold text-red-600 leading-none">
                                            {stats.notFound}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters and Actions */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-white border-2 border-green-500 rounded-lg p-2 hover:bg-green-500 hover:text-white transition-all duration-300">
                                <Filter className="w-5 h-5 text-green-500 hover:text-white" />
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
                            <div className="flex items-center gap-2 bg-white border-2 border-green-500 rounded-lg p-2 flex-1 max-w-xs hover:bg-green-500 hover:text-white transition-all duration-300">
                                <Search className="w-5 h-5 text-green-500 hover:text-white" />
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
                                    setStatusItems([]);
                                    setRfidInput('');
                                }}
                                className="px-4 py-2 bg-white border-2 border-green-500 rounded-lg text-green-500 font-medium hover:bg-green-500 hover:text-white transition-all duration-200 flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Clear All
                            </button>
                            <button
                                onClick={() => {
                                    const dataStr = JSON.stringify(statusItems, null, 2);
                                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                                    const url = URL.createObjectURL(dataBlob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `rfid-status-${new Date().toISOString()}.json`;
                                    link.click();
                                }}
                                disabled={statusItems.length === 0}
                                className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Export
                            </button>
                        </div>
                    </div>

                    {/* Results Section */}
                    <div className="bg-white border-2 border-green-500 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">
                                Status Results
                            </h2>
                            <span className="text-gray-600 font-mono text-sm">
                                {filteredItems.length} of {statusItems.length} items
                            </span>
                        </div>

                        <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                            {filteredItems.length === 0 ? (
                                <div className="text-center py-16 text-gray-400">
                                    <CheckCircle2 className="w-20 h-20 mx-auto mb-4 opacity-30" />
                                    <p className="text-xl font-medium">Belum ada data checking</p>
                                    <p className="text-sm mt-2">Scan atau ketik RFID untuk memulai checking status</p>
                                </div>
                            ) : (
                                filteredItems.map((item, index) => (
                                    <div
                                        key={`${item.rfid}-${index}`}
                                        className={`relative p-5 rounded-lg border-2 border-green-500 bg-white hover:bg-green-500 hover:text-white transition-all duration-300`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 rounded-lg bg-green-50 border border-green-500 hover:bg-white">
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
                                                    {item.message && (
                                                        <span className="text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-lg hover:bg-white hover:text-white">
                                                            💬 {item.message}
                                                        </span>
                                                    )}
                                                </div>
                                                {item.details && (
                                                    <p className="text-sm text-gray-600 mb-2 hover:text-white">
                                                        {item.details}
                                                    </p>
                                                )}
                                                {item.garment && (
                                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <Package className="w-5 h-5 text-green-500 hover:text-white" />
                                                            <h3 className="text-lg font-bold text-gray-800 hover:text-white">Informasi Garment</h3>
                                                        </div>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                            {item.garment.wo && (
                                                                <div>
                                                                    <p className="text-xs text-gray-500 mb-1 hover:text-white font-medium">WO</p>
                                                                    <p className="text-sm font-bold text-gray-800 hover:text-white">{item.garment.wo}</p>
                                                                </div>
                                                            )}
                                                            {item.garment.style && (
                                                                <div>
                                                                    <p className="text-xs text-gray-500 mb-1 hover:text-white font-medium">Style</p>
                                                                    <p className="text-sm font-bold text-gray-800 hover:text-white">{item.garment.style}</p>
                                                                </div>
                                                            )}
                                                            {item.garment.buyer && (
                                                                <div className="sm:col-span-1 col-span-2">
                                                                    <p className="text-xs text-gray-500 mb-1 hover:text-white font-medium">Buyer</p>
                                                                    <p className="text-sm font-bold text-gray-800 hover:text-white truncate" title={item.garment.buyer}>{item.garment.buyer}</p>
                                                                </div>
                                                            )}
                                                            {item.garment.item && (
                                                                <div className="sm:col-span-1 col-span-2">
                                                                    <p className="text-xs text-gray-500 mb-1 hover:text-white font-medium">Item</p>
                                                                    <p className="text-sm font-bold text-gray-800 hover:text-white truncate" title={item.garment.item}>{item.garment.item}</p>
                                                                </div>
                                                            )}
                                                            {item.garment.color && (
                                                                <div>
                                                                    <p className="text-xs text-gray-500 mb-1 hover:text-white font-medium">Color</p>
                                                                    <p className="text-sm font-bold text-gray-800 hover:text-white">{item.garment.color}</p>
                                                                </div>
                                                            )}
                                                            {item.garment.size && (
                                                                <div>
                                                                    <p className="text-xs text-gray-500 mb-1 hover:text-white font-medium">Size</p>
                                                                    <p className="text-sm font-bold text-gray-800 hover:text-white">{item.garment.size}</p>
                                                                </div>
                                                            )}
                                                            {item.garment.id_garment && (
                                                                <div>
                                                                    <p className="text-xs text-gray-500 mb-1 hover:text-white font-medium">ID Garment</p>
                                                                    <p className="text-sm font-bold text-gray-800 hover:text-white">{item.garment.id_garment}</p>
                                                                </div>
                                                            )}
                                                            {item.garment.timestamp && (
                                                                <div className="sm:col-span-1 col-span-2">
                                                                    <p className="text-xs text-gray-500 mb-1 hover:text-white font-medium flex items-center gap-1">
                                                                        <Clock className="w-3 h-3" />
                                                                        Timestamp
                                                                    </p>
                                                                    <p className="text-sm font-bold text-gray-800 hover:text-white">{parseTimestamp(item.garment.timestamp)}</p>
                                                                </div>
                                                            )}
                                                            {item.garment.updated && (
                                                                <div className="sm:col-span-1 col-span-2">
                                                                    <p className="text-xs text-gray-500 mb-1 hover:text-white font-medium flex items-center gap-1">
                                                                        <Clock className="w-3 h-3" />
                                                                        Updated
                                                                    </p>
                                                                    <p className="text-sm font-bold text-gray-800 hover:text-white">{parseTimestamp(item.garment.updated)}</p>
                                                                </div>
                                                            )}
                                                        </div>
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
        </div>
    );
}

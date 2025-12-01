import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';
import { Radio, Search, CheckCircle2, XCircle, AlertCircle, Activity, Filter, Download, RefreshCw, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
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
}

export default function CheckingRFID() {
    const { isOpen } = useSidebar();
    const [rfidInput, setRfidInput] = useState('');
    const [checkItems, setCheckItems] = useState<RFIDCheckItem[]>([]);
    const [isChecking, setIsChecking] = useState(false);
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

    // Handle RFID check dengan API
    const handleRfidCheck = async (rfid: string) => {
        if (!rfid.trim()) return;

        const trimmedRfid = rfid.trim();
        setIsChecking(true);

        // Simulasi checking dengan delay (bisa diganti dengan API call)
        setTimeout(async () => {
            try {
                // Cek di database melalui API
                const response = await fetch(`${API_BASE_URL}/garment?rfid_garment=${encodeURIComponent(trimmedRfid)}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                });

                const timestamp = new Date();
                let newItem: RFIDCheckItem;

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        // RFID ditemukan
                        newItem = {
                            rfid: trimmedRfid,
                            timestamp,
                            status: 'found',
                            location: `Line ${data.data.line || 'N/A'}`,
                            details: 'RFID ditemukan di database',
                            wo: data.data.wo || 'N/A',
                            style: data.data.style || 'N/A',
                            buyer: data.data.buyer || 'N/A',
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

                setCheckItems(prev => [newItem, ...prev]);
                setRfidInput('');
                setIsChecking(false);

                setTimeout(() => {
                    inputRef.current?.focus();
                }, 100);
            } catch (error) {
                console.error('Error checking RFID:', error);
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
                className="flex flex-col w-full transition-all duration-300 ease-in-out"
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
                <main className="flex-1 p-6 space-y-6">
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
                                        className="relative p-5 rounded-lg border-2 border-blue-500 bg-white hover:bg-blue-500 hover:text-white transition-all duration-300"
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
                                                <div className="flex items-center gap-4 mb-2">
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
                                                </div>
                                                {item.details && (
                                                    <p className="text-sm text-gray-600 mb-2 hover:text-white">
                                                        {item.details}
                                                    </p>
                                                )}
                                                {(item.wo || item.style || item.buyer) && (
                                                    <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-200">
                                                        {item.wo && (
                                                            <div>
                                                                <p className="text-xs text-gray-500 mb-1 hover:text-white">WO</p>
                                                                <p className="text-sm font-bold text-gray-800 hover:text-white">{item.wo}</p>
                                                            </div>
                                                        )}
                                                        {item.style && (
                                                            <div>
                                                                <p className="text-xs text-gray-500 mb-1 hover:text-white">Style</p>
                                                                <p className="text-sm font-bold text-gray-800 hover:text-white">{item.style}</p>
                                                            </div>
                                                        )}
                                                        {item.buyer && (
                                                            <div>
                                                                <p className="text-xs text-gray-500 mb-1 hover:text-white">Buyer</p>
                                                                <p className="text-sm font-bold text-gray-800 hover:text-white">{item.buyer}</p>
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
        </div>
    );
}

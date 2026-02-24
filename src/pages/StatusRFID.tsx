import { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import { useSidebar } from '../context/SidebarContext';
import { API_BASE_URL, getDefaultHeaders } from '../config/api';
import backgroundImage from '../assets/background.jpg';
import StatusPageHeader from '../components/status/StatusPageHeader';
import StatusInputSection from '../components/status/StatusInputSection';
import StatusStatistics from '../components/status/StatusStatistics';
import StatusFiltersAndActions from '../components/status/StatusFiltersAndActions';
import StatusResultsList from '../components/status/StatusResultsList';

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

const StatusRFID = memo(() => {
    const { isOpen } = useSidebar();
    const [rfidInput, setRfidInput] = useState('');
    const [statusItems, setStatusItems] = useState<RFIDStatusItem[]>([]);
    const [isChecking, setIsChecking] = useState(false);
    const checkRFIDMutation = useMutation({
        mutationFn: async (rfid: string) => {
            const response = await fetch(`${API_BASE_URL}/tracking/check?rfid_garment=${encodeURIComponent(rfid.trim())}`, {
                method: 'GET',
                headers: {
                    ...getDefaultHeaders(),
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

    // Filter items berdasarkan status - dioptimasi dengan useMemo
    const filteredItems = useMemo(() => {
        return statusItems.filter(item => {
            if (filterStatus !== 'all' && item.status !== filterStatus) return false;
            if (searchQuery && !item.rfid.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
    }, [statusItems, filterStatus, searchQuery]);

    // Statistics - dioptimasi dengan useMemo
    const stats = useMemo(() => ({
        total: statusItems.length,
        found: statusItems.filter(i => i.status === 'found').length,
        notFound: statusItems.filter(i => i.status === 'not_found').length,
    }), [statusItems]);

    // Sidebar width - dioptimasi dengan useMemo
    const sidebarWidth = useMemo(() => isOpen ? '18%' : '5rem', [isOpen]);

    // Handle clear all - dioptimasi dengan useCallback
    const handleClearAll = useCallback(() => {
        setStatusItems([]);
        setRfidInput('');
    }, []);

    // Handle export - dioptimasi dengan useCallback
    const handleExport = useCallback(() => {
        const dataStr = JSON.stringify(statusItems, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `rfid-status-${new Date().toISOString()}.json`;
        link.click();
    }, [statusItems]);

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
                    <StatusPageHeader />

                    {/* Input Section with Statistics */}
                    <div className="bg-white border-2 border-green-500 rounded-lg p-4 sm:p-5 md:p-6 lg:p-7 hover:shadow-lg hover:border-green-600 transition-all duration-300">
                        <label className="block text-gray-700 font-bold text-xs sm:text-sm md:text-base mb-4 sm:mb-5 tracking-wide uppercase">
                            Scan atau Ketik RFID Garment
                        </label>

                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-5 lg:gap-6">
                            {/* Input Section - Full width di kiri, mengambil space maksimal */}
                            <div className="flex-1 w-full lg:min-w-0 lg:max-w-none">
                                <StatusInputSection
                                    rfidInput={rfidInput}
                                    onRfidInputChange={setRfidInput}
                                    isChecking={isChecking || checkRFIDMutation.isPending}
                                    onKeyPress={handleKeyPress}
                                    onCheck={handleRfidCheck}
                                    inputRef={inputRef}
                                />
                            </div>

                            {/* Statistics - Di pojok kanan, berjajar, tidak shrink */}
                            <div className="w-full lg:w-auto lg:flex-shrink-0 lg:ml-6">
                                <StatusStatistics
                                    total={stats.total}
                                    found={stats.found}
                                    notFound={stats.notFound}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Filters and Actions */}
                    <StatusFiltersAndActions
                        filterStatus={filterStatus}
                        onFilterStatusChange={setFilterStatus}
                        searchQuery={searchQuery}
                        onSearchQueryChange={setSearchQuery}
                        onClearAll={handleClearAll}
                        onExport={handleExport}
                        hasItems={statusItems.length > 0}
                    />

                    {/* Results Section */}
                    <StatusResultsList
                        filteredItems={filteredItems}
                        totalItems={statusItems.length}
                    />
                </main>
            </div>
        </div>
    );
});

StatusRFID.displayName = 'StatusRFID';

export default StatusRFID;

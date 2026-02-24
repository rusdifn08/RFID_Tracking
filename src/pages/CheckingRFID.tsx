import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import { useSidebar } from '../context/SidebarContext';
import backgroundImage from '../assets/background.jpg';
import { useCheckingRFIDQuery as useCheckingRFID } from '../hooks/useCheckingRFIDQuery';
import { useMutation } from '@tanstack/react-query';
import { API_BASE_URL, getDefaultHeaders } from '../config/api';
import PageHeader from '../components/checking/PageHeader';
import RFIDInputSection from '../components/checking/RFIDInputSection';
import FiltersAndActions from '../components/checking/FiltersAndActions';
import CheckResultsList from '../components/checking/CheckResultsList';
import TrackingModal from '../components/checking/TrackingModal';
import StatusPageHeader from '../components/status/StatusPageHeader';
import StatusInputSection from '../components/status/StatusInputSection';
import StatusStatistics from '../components/status/StatusStatistics';
import StatusFiltersAndActions from '../components/status/StatusFiltersAndActions';
import StatusResultsList from '../components/status/StatusResultsList';
import { Activity, CheckCircle2 } from 'lucide-react';

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

type TabType = 'tracking' | 'status';

export default function CheckingRFID() {
    const { isOpen } = useSidebar();
    const [activeTab, setActiveTab] = useState<TabType>('tracking');
    
    // Tracking Tab State & Logic
    const {
        rfidInput: trackingRfidInput,
        setRfidInput: setTrackingRfidInput,
        inputRef: trackingInputRef,
        checkItems,
        setCheckItems,
        isChecking: isTrackingChecking,
        filterStatus: trackingFilterStatus,
        setFilterStatus: setTrackingFilterStatus,
        searchQuery: trackingSearchQuery,
        setSearchQuery: setTrackingSearchQuery,
        showTrackingModal,
        setShowTrackingModal,
        trackingData,
        setTrackingData,
        loadingTracking,
        selectedRfid,
        setSelectedRfid,
        handleRfidCheck: handleTrackingRfidCheck,
        handleKeyPress: handleTrackingKeyPress,
        filteredItems: trackingFilteredItems,
    } = useCheckingRFID();

    // Status Tab State & Logic
    const [statusRfidInput, setStatusRfidInput] = useState('');
    const [statusItems, setStatusItems] = useState<RFIDStatusItem[]>([]);
    const [isStatusChecking, setIsStatusChecking] = useState(false);
    const statusInputRef = useRef<HTMLInputElement>(null);
    
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
            setStatusRfidInput('');
            setIsStatusChecking(false);

            setTimeout(() => {
                if (statusInputRef.current) {
                    statusInputRef.current.focus();
                }
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
            setStatusRfidInput('');
            setIsStatusChecking(false);

            setTimeout(() => {
                if (statusInputRef.current) {
                    statusInputRef.current.focus();
                }
            }, 100);
        },
    });

    const [statusFilterStatus, setStatusFilterStatus] = useState<'all' | 'found' | 'not_found'>('all');
    const [statusSearchQuery, setStatusSearchQuery] = useState('');

    // Handle Status RFID check
    const handleStatusRfidCheck = useCallback(async (rfid: string) => {
        if (!rfid.trim()) return;
        const trimmedRfid = rfid.trim();
        setIsStatusChecking(true);
        setTimeout(() => {
            checkRFIDMutation.mutate(trimmedRfid);
        }, 500);
    }, [checkRFIDMutation]);

    // Handle Status Enter key
    const handleStatusKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !isStatusChecking) {
            handleStatusRfidCheck(statusRfidInput);
        }
    }, [isStatusChecking, statusRfidInput, handleStatusRfidCheck]);

    // Filter status items
    const statusFilteredItems = useMemo(() => {
        return statusItems.filter(item => {
            if (statusFilterStatus !== 'all' && item.status !== statusFilterStatus) return false;
            if (statusSearchQuery && !item.rfid.toLowerCase().includes(statusSearchQuery.toLowerCase())) return false;
            return true;
        });
    }, [statusItems, statusFilterStatus, statusSearchQuery]);

    // Status Statistics
    const statusStats = useMemo(() => ({
        total: statusItems.length,
        found: statusItems.filter(i => i.status === 'found').length,
        notFound: statusItems.filter(i => i.status === 'not_found').length,
    }), [statusItems]);

    // Handle click pada item untuk menampilkan tracking data
    const handleItemClick = useCallback((rfid: string) => {
        if (!rfid) return;
        setSelectedRfid(rfid);
        setShowTrackingModal(true);
    }, [setSelectedRfid, setShowTrackingModal]);

    const handleCloseTrackingModal = useCallback(() => {
        setShowTrackingModal(false);
        setTrackingData([]);
        setSelectedRfid('');
    }, [setShowTrackingModal, setTrackingData, setSelectedRfid]);

    const handleTrackingCheckRFID = useCallback(() => {
        handleTrackingRfidCheck(trackingRfidInput);
    }, [handleTrackingRfidCheck, trackingRfidInput]);

    // Handle clear all status
    const handleStatusClearAll = useCallback(() => {
        setStatusItems([]);
        setStatusRfidInput('');
    }, []);

    // Handle export status
    const handleStatusExport = useCallback(() => {
        const dataStr = JSON.stringify(statusItems, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `rfid-status-${new Date().toISOString()}.json`;
        link.click();
    }, [statusItems]);

    // Sidebar width
    const sidebarWidth = useMemo(() => isOpen ? '18%' : '5rem', [isOpen]);

    // Auto focus input saat tab berubah
    useEffect(() => {
        if (activeTab === 'tracking' && trackingInputRef.current) {
            setTimeout(() => {
                trackingInputRef.current?.focus();
            }, 100);
        } else if (activeTab === 'status' && statusInputRef.current) {
            setTimeout(() => {
                statusInputRef.current?.focus();
            }, 100);
        }
    }, [activeTab]);

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
                    {/* Tab Selector */}
                    <div className="bg-white rounded-lg border-2 border-blue-500 p-2 sm:p-3 md:p-4">
                        <div className="flex gap-2 sm:gap-3 md:gap-4">
                            <button
                                onClick={() => setActiveTab('tracking')}
                                className={`flex-1 flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm md:text-base transition-all duration-300 ${
                                    activeTab === 'tracking'
                                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <Activity className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={2.5} />
                                <span className="hidden sm:inline">RFID Tracking Garment</span>
                                <span className="sm:hidden">Tracking</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('status')}
                                className={`flex-1 flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm md:text-base transition-all duration-300 ${
                                    activeTab === 'status'
                                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <CheckCircle2 className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={2.5} />
                                <span className="hidden sm:inline">RFID Status Garment</span>
                                <span className="sm:hidden">Status</span>
                            </button>
                        </div>
                    </div>

                    {/* Tracking Tab Content */}
                    {activeTab === 'tracking' && (
                        <>
                            <PageHeader />
                            <RFIDInputSection
                                rfidInput={trackingRfidInput}
                                setRfidInput={setTrackingRfidInput}
                                inputRef={trackingInputRef}
                                isChecking={isTrackingChecking}
                                onKeyPress={handleTrackingKeyPress}
                                onCheck={handleTrackingCheckRFID}
                                checkItems={checkItems}
                            />
                            <FiltersAndActions
                                filterStatus={trackingFilterStatus}
                                setFilterStatus={setTrackingFilterStatus}
                                searchQuery={trackingSearchQuery}
                                setSearchQuery={setTrackingSearchQuery}
                                checkItems={checkItems}
                                setCheckItems={setCheckItems}
                                setRfidInput={setTrackingRfidInput}
                            />
                            <CheckResultsList
                                filteredItems={trackingFilteredItems}
                                checkItems={checkItems}
                                onItemClick={handleItemClick}
                            />
                        </>
                    )}

                    {/* Status Tab Content */}
                    {activeTab === 'status' && (
                        <>
                            <StatusPageHeader />
                            <div className="bg-white border-2 border-green-500 rounded-lg p-4 sm:p-5 md:p-6 lg:p-7 hover:shadow-lg hover:border-green-600 transition-all duration-300">
                                <label className="block text-gray-700 font-bold text-xs sm:text-sm md:text-base mb-4 sm:mb-5 tracking-wide uppercase">
                                    Scan atau Ketik RFID Garment
                                </label>

                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-5 lg:gap-6">
                                    <div className="flex-1 w-full lg:min-w-0 lg:max-w-none">
                                        <StatusInputSection
                                            rfidInput={statusRfidInput}
                                            onRfidInputChange={setStatusRfidInput}
                                            isChecking={isStatusChecking || checkRFIDMutation.isPending}
                                            onKeyPress={handleStatusKeyPress}
                                            onCheck={handleStatusRfidCheck}
                                            inputRef={statusInputRef}
                                        />
                                    </div>

                                    <div className="w-full lg:w-auto lg:flex-shrink-0 lg:ml-6">
                                        <StatusStatistics
                                            total={statusStats.total}
                                            found={statusStats.found}
                                            notFound={statusStats.notFound}
                                        />
                                    </div>
                                </div>
                            </div>

                            <StatusFiltersAndActions
                                filterStatus={statusFilterStatus}
                                onFilterStatusChange={setStatusFilterStatus}
                                searchQuery={statusSearchQuery}
                                onSearchQueryChange={setStatusSearchQuery}
                                onClearAll={handleStatusClearAll}
                                onExport={handleStatusExport}
                                hasItems={statusItems.length > 0}
                            />

                            <StatusResultsList
                                filteredItems={statusFilteredItems}
                                totalItems={statusItems.length}
                            />
                        </>
                    )}
                </main>
            </div>

            {/* Tracking Modal */}
            <TrackingModal
                isOpen={showTrackingModal}
                selectedRfid={selectedRfid}
                trackingData={trackingData}
                loadingTracking={loadingTracking}
                onClose={handleCloseTrackingModal}
            />
        </div>
    );
}

import { useMemo, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import { useSidebar } from '../context/SidebarContext';
import { API_BASE_URL } from '../config/api';
import backgroundImage from '../assets/background.jpg';
import { useCheckingRFID } from '../hooks/useCheckingRFID';
import PageHeader from '../components/checking/PageHeader';
import StatisticsCards from '../components/checking/StatisticsCards';
import RFIDInputSection from '../components/checking/RFIDInputSection';
import FiltersAndActions from '../components/checking/FiltersAndActions';
import CheckResultsList from '../components/checking/CheckResultsList';
import TrackingModal from '../components/checking/TrackingModal';

export default function CheckingRFID() {
    const { isOpen } = useSidebar();
    
    // Custom hook untuk semua state dan logic
    const {
        rfidInput,
        setRfidInput,
        inputRef,
        checkItems,
        setCheckItems,
        isChecking,
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
    } = useCheckingRFID();

    // Handle click pada item untuk menampilkan tracking data
    const handleItemClick = useCallback(async (rfid: string) => {
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
                    const sortedData = [...data.data].sort((a, b) => {
                        const dateA = new Date(a.timestamp || 0).getTime();
                        const dateB = new Date(b.timestamp || 0).getTime();
                        return dateA - dateB;
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
    }, [setSelectedRfid, setShowTrackingModal, setLoadingTracking, setTrackingData]);

    const handleCloseTrackingModal = useCallback(() => {
        setShowTrackingModal(false);
        setTrackingData([]);
        setSelectedRfid('');
    }, [setShowTrackingModal, setTrackingData, setSelectedRfid]);

    const handleCheckRFID = useCallback(() => {
        handleRfidCheck(rfidInput);
    }, [handleRfidCheck, rfidInput]);

    // Sidebar width
    const sidebarWidth = useMemo(() => isOpen ? '18%' : '5rem', [isOpen]);

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
                <main className="flex-1 p-4 sm:p-6 space-y-6 pt-4 overflow-y-auto h-full">
                    <PageHeader />
                    <StatisticsCards checkItems={checkItems} />
                    <RFIDInputSection
                        rfidInput={rfidInput}
                        setRfidInput={setRfidInput}
                        inputRef={inputRef}
                        isChecking={isChecking}
                        onKeyPress={handleKeyPress}
                        onCheck={handleCheckRFID}
                    />
                    <FiltersAndActions
                        filterStatus={filterStatus}
                        setFilterStatus={setFilterStatus}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        checkItems={checkItems}
                        setCheckItems={setCheckItems}
                        setRfidInput={setRfidInput}
                    />
                    <CheckResultsList
                        filteredItems={filteredItems}
                        checkItems={checkItems}
                        onItemClick={handleItemClick}
                    />
                </main>
            </div>

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

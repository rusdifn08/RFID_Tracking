import { useMemo, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import { useSidebar } from '../context/SidebarContext';
import backgroundImage from '../assets/background.jpg';
import { useCheckingRFIDQuery as useCheckingRFID } from '../hooks/useCheckingRFIDQuery';
import PageHeader from '../components/checking/PageHeader';
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
        selectedRfid,
        setSelectedRfid,
        handleRfidCheck,
        handleKeyPress,
        filteredItems,
    } = useCheckingRFID();

    // Handle click pada item untuk menampilkan tracking data
    // Menggunakan query yang sudah ada di useCheckingRFIDQuery
    const handleItemClick = useCallback((rfid: string) => {
        if (!rfid) return;
        
        setSelectedRfid(rfid);
        setShowTrackingModal(true);
        // Data akan otomatis di-fetch oleh useQuery di useCheckingRFIDQuery
    }, [setSelectedRfid, setShowTrackingModal]);

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
                <main 
                    className="flex-1 p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6 space-y-3 xs:space-y-4 sm:space-y-5 md:space-y-6 pt-2 xs:pt-3 sm:pt-4 overflow-y-auto min-h-0"
                    style={{
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#cbd5e1 #f1f5f9',
                        paddingBottom: 'clamp(2rem, 4vh, 4rem)'
                    }}
                >
                    <PageHeader />
                    <RFIDInputSection
                        rfidInput={rfidInput}
                        setRfidInput={setRfidInput}
                        inputRef={inputRef}
                        isChecking={isChecking}
                        onKeyPress={handleKeyPress}
                        onCheck={handleCheckRFID}
                        checkItems={checkItems}
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

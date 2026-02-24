import React, { useMemo, useCallback, memo } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import { useSidebar } from '../context/SidebarContext';
import ExportModal from '../components/ExportModal';
import backgroundImage from '../assets/background.jpg';
import { useListRFIDQuery as useListRFID } from '../hooks/useListRFIDQuery';
import ListRFIDHeader from '../components/list/ListRFIDHeader';
import ListRFIDFilters from '../components/list/ListRFIDFilters';
import RFIDTable from '../components/list/RFIDTable';
import { FileText, X, MapPin, Trash2, AlertTriangle, Calendar } from 'lucide-react';

const ListRFID: React.FC = memo(() => {
    const { isOpen } = useSidebar();

    // Custom hook untuk semua state dan logic
    const {
        filteredData,
        loading,
        error,
        searchTerm,
        setSearchTerm,
        filterWO,
        setFilterWO,
        filterBuyer,
        setFilterBuyer,
        filterStatus,
        setFilterStatus,
        filterLocation,
        setFilterLocation,
        showFilterModal,
        setShowFilterModal,
        filterDateFrom,
        setFilterDateFrom,
        filterDateTo,
        setFilterDateTo,
        filterStatusModal,
        setFilterStatusModal,
        filterSize,
        setFilterSize,
        filterColor,
        setFilterColor,
        selectedScan,
        showModal,
        showDeleteModal,
        itemToDelete,
        isDeleting,
        showExportModal,
        setShowExportModal,
        uniqueWO,
        uniqueBuyers,
        uniqueStatuses,
        uniqueLocations,
        uniqueSizes,
        uniqueColors,
        handleView,
        handleCloseModal,
        handleDelete,
        confirmDelete,
        cancelDelete,
        handleRefresh,
        handleExport,
        handleResetFilter,
        handleFilterData,
    } = useListRFID();

    // Show notification helper
    const showNotification = useCallback((message: string) => {
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
    }, []);

    // Enhanced confirm delete with notification
    const handleConfirmDelete = useCallback(async () => {
        if (!itemToDelete) return;
        await confirmDelete();
        showNotification(`✅ Data RFID "${itemToDelete.rfid}" berhasil dihapus!`);
    }, [itemToDelete, confirmDelete, showNotification]);

    // Sidebar width
    const sidebarWidth = useMemo(() => isOpen ? '18%' : '5rem', [isOpen]);

    return (
        <div className="flex min-h-screen w-full h-screen font-sans text-gray-800 overflow-hidden fixed inset-0 m-0 p-0"
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

                {/* Breadcrumb */}
                <Breadcrumb />

                {/* Page Content */}
                <main
                    className="flex-1 overflow-hidden flex flex-col min-h-0"
                    style={{
                        padding: '1rem', // Padding konten
                        paddingTop: '0.5rem', // Mengurangi padding top agar lebih dekat dengan breadcrumb
                        height: 'calc(100vh - 80px)', // Sesuaikan tinggi agar tidak double scroll
                        maxHeight: 'calc(100vh - 80px)'
                    }}
                >
                    {/* Page Header */}
                    <ListRFIDHeader
                        totalData={filteredData.length}
                        onFilterClick={() => setShowFilterModal(true)}
                        onExportClick={() => setShowExportModal(true)}
                        onRefresh={handleRefresh}
                    />

                    {/* Filter Section */}
                    <ListRFIDFilters
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        filterWO={filterWO}
                        onFilterWOChange={setFilterWO}
                        filterBuyer={filterBuyer}
                        onFilterBuyerChange={setFilterBuyer}
                        filterStatus={filterStatus}
                        onFilterStatusChange={setFilterStatus}
                        filterLocation={filterLocation}
                        onFilterLocationChange={setFilterLocation}
                        uniqueWO={uniqueWO.filter((wo): wo is string => wo !== undefined && wo !== null)}
                        uniqueBuyers={uniqueBuyers.filter((buyer): buyer is string => buyer !== undefined && buyer !== null)}
                        uniqueStatuses={uniqueStatuses.filter((status): status is string => status !== undefined && status !== null)}
                        uniqueLocations={uniqueLocations.filter((location): location is string => location !== undefined && location !== null)}
                    />

                    {/* Table Section */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden flex flex-col flex-1 min-h-0">
                        <RFIDTable
                            loading={loading}
                            error={error}
                            filteredData={filteredData}
                            onView={handleView}
                            onDelete={handleDelete}
                            onRefresh={handleRefresh}
                        />
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
                                            let date: Date;
                                            const timestamp = selectedScan.timestamp;
                                            
                                            // Cek apakah timestamp memiliki timezone indicator
                                            const hasTimezone = timestamp.includes('Z') || timestamp.match(/[+-]\d{2}:\d{2}$/);
                                            
                                            if (!hasTimezone) {
                                                // Timestamp tanpa timezone, parse manual untuk menghindari konversi timezone
                                                // Format: "2026-01-14T10:47:25" atau "2026-01-14T10:47:25.123"
                                                const parts = timestamp.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?/);
                                                if (parts) {
                                                    const [, year, month, day, hour, minute, second] = parts;
                                                    // Buat Date object dengan waktu lokal (tidak ada konversi timezone)
                                                    date = new Date(
                                                        parseInt(year),
                                                        parseInt(month) - 1, // Month is 0-indexed
                                                        parseInt(day),
                                                        parseInt(hour),
                                                        parseInt(minute),
                                                        parseInt(second)
                                                    );
                                                } else {
                                                    // Fallback ke parsing normal
                                                    date = new Date(timestamp);
                                                }
                                            } else {
                                                // Timestamp dengan timezone, parse normal
                                                date = new Date(timestamp);
                                            }
                                            
                                            if (isNaN(date.getTime())) {
                                                return selectedScan.timestamp;
                                            }
                                            
                                            // Format: DD MMM YYYY, HH.MM.SS (menggunakan waktu lokal, bukan UTC)
                                            // Sama seperti di DashboardRFID.tsx yang sudah benar
                                            const day = String(date.getDate()).padStart(2, '0');
                                            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                                            const month = monthNames[date.getMonth()];
                                            const year = date.getFullYear();
                                            const hours = String(date.getHours()).padStart(2, '0');
                                            const minutes = String(date.getMinutes()).padStart(2, '0');
                                            const seconds = String(date.getSeconds()).padStart(2, '0');
                                            return `${day} ${month} ${year}, ${hours}.${minutes}.${seconds}`;
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
                                    onClick={handleConfirmDelete}
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
});

ListRFID.displayName = 'ListRFID';

export default ListRFID;

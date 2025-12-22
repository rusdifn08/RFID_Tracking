import React, { useMemo, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import { useSidebar } from '../context/SidebarContext';
import ExportModal from '../components/ExportModal';
import backgroundImage from '../assets/background.jpg';
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
    Download,
    XCircle,
} from 'lucide-react';
import { useListRFIDQuery as useListRFID } from '../hooks/useListRFIDQuery';
import { exportListRFIDToExcel } from '../utils/exportToExcel';

const ListRFIDReject: React.FC = () => {
    const { isOpen } = useSidebar();

    // Custom hook untuk semua state dan logic
    const {
        filteredData,
        loading,
        error,
        currentLine,
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
        handleResetFilter,
        handleFilterData,
    } = useListRFID();

    // Data khusus Reject saja
    const rejectData = useMemo(
        () => filteredData.filter((item) => item.status === 'Reject'),
        [filteredData],
    );

    // Show notification helper
    const showNotification = useCallback((message: string) => {
        const notification = document.createElement('div');
        notification.className =
            'fixed top-5 right-5 bg-gradient-to-br from-red-500 to-rose-600 text-white px-5 py-3 rounded-lg shadow-lg z-[1000] transform transition-transform duration-300 translate-x-full font-semibold text-sm';
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
        showNotification(`✅ Data RFID "${itemToDelete.rfid}" berhasil dihapus dari daftar reject!`);
    }, [itemToDelete, confirmDelete, showNotification]);

    // Export khusus data reject
    const handleExportReject = useCallback(
        async (format: 'excel' | 'csv') => {
            const lokasiCounts: Record<string, number> = {};
            rejectData.forEach((item) => {
                const lokasi = item.lokasi || 'Unknown';
                lokasiCounts[lokasi] = (lokasiCounts[lokasi] || 0) + 1;
            });

            const lineId = currentLine || '1';
            const summary = {
                totalData: rejectData.length,
                statusCounts: {
                    Good: 0,
                    Rework: 0,
                    Reject: rejectData.length,
                    OUTPUT: 0,
                    Unknown: 0,
                },
                lokasiCounts,
                line: `Line ${lineId}`,
                exportDate: new Date().toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                }),
            };

            await exportListRFIDToExcel(rejectData as any, lineId, format, summary);
        },
        [rejectData, currentLine],
    );

    // Sidebar width
    const sidebarWidth = useMemo(() => (isOpen ? '18%' : '5rem'), [isOpen]);

    return (
        <div
            className="flex min-h-screen w-full h-screen font-sans text-gray-800 overflow-hidden fixed inset-0 m-0 p-0"
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
                    width: `calc(100% - ${sidebarWidth})`,
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
                        padding: '1rem',
                        paddingTop: '0.5rem',
                        height: 'calc(100vh - 80px)',
                        maxHeight: 'calc(100vh - 80px)',
                    }}
                >
                    {/* Page Header */}
                    <div
                        className="flex flex-col md:flex-row items-center justify-between gap-4 shrink-0"
                        style={{ marginBottom: '0.75rem', marginTop: '0.5rem' }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-red-500 via-rose-500 to-blue-600 rounded-xl shadow-lg shadow-red-500/30 text-white">
                                <XCircle size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">List RFID Reject</h1>
                                <p className="text-slate-500 text-sm">
                                    Daftar khusus RFID dengan status <span className="font-semibold text-red-600">REJECT</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowFilterModal(true)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition-all flex items-center gap-2 font-medium text-sm"
                                title="Filter Data Reject"
                            >
                                <Filter size={18} />
                                <span>Filter Data</span>
                            </button>
                            <button
                                onClick={() => setShowExportModal(true)}
                                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-red-500 hover:from-blue-600 hover:to-red-600 text-white rounded-lg shadow-sm transition-all flex items-center gap-2 font-medium text-sm"
                                title="Export Excel Reject"
                            >
                                <Download className="w-4 h-4" strokeWidth={2.5} />
                                <span>Export Reject</span>
                            </button>
                            <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                                <span className="text-slate-500 text-sm font-semibold">Total Reject:</span>
                                <span className="text-red-600 text-xl font-bold">{rejectData.length}</span>
                            </div>
                            <button
                                onClick={handleRefresh}
                                className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-all text-slate-600 hover:text-red-600"
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
                                <Search
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                    size={18}
                                />
                                <input
                                    type="text"
                                    placeholder="Search reject by RFID, WO, Style, Buyer, Item, Color, Size, Location, Line..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                                />
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-1 md:pb-0">
                                {/* All WO Filter */}
                                <div className="relative min-w-[140px]">
                                    <FileText
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                        size={16}
                                    />
                                    <select
                                        value={filterWO}
                                        onChange={(e) => setFilterWO(e.target.value)}
                                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                    >
                                        <option value="">All WO</option>
                                        {uniqueWO.map((wo: any) => (
                                            <option key={wo} value={wo}>
                                                {wo}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* All Buyers Filter */}
                                <div className="relative min-w-[140px]">
                                    <Filter
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                        size={16}
                                    />
                                    <select
                                        value={filterBuyer}
                                        onChange={(e) => setFilterBuyer(e.target.value)}
                                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                    >
                                        <option value="">All Buyers</option>
                                        {uniqueBuyers.map((buyer: any) => (
                                            <option key={buyer} value={buyer}>
                                                {buyer}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Status Filter - lock ke Reject tapi tetap bisa pilih lain jika diperlukan */}
                                <div className="relative min-w-[140px]">
                                    <Activity
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                        size={16}
                                    />
                                    <select
                                        value={filterStatus || 'Reject'}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                    >
                                        <option value="Reject">Reject Only</option>
                                        <option value="">All Status</option>
                                        {uniqueStatuses.map((status: any) => (
                                            <option key={status} value={status}>
                                                {status}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* All Locations Filter */}
                                <div className="relative min-w-[140px]">
                                    <MapPin
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                        size={16}
                                    />
                                    <select
                                        value={filterLocation}
                                        onChange={(e) => setFilterLocation(e.target.value)}
                                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                    >
                                        <option value="">All Locations</option>
                                        {uniqueLocations.map((location: any) => (
                                            <option key={location} value={location}>
                                                {location}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden flex flex-col flex-1 min-h-0">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <div className="w-12 h-12 border-4 border-slate-200 border-t-red-500 rounded-full animate-spin mb-4"></div>
                                <p className="text-base font-medium">Loading data RFID Reject...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center h-full text-red-500">
                                <AlertTriangle size={48} className="mb-4 opacity-50" />
                                <h3 className="text-lg font-bold">Error Loading Data Reject</h3>
                                <p className="text-sm mb-4">{error}</p>
                                <button
                                    onClick={handleRefresh}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-md"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : rejectData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Box size={48} className="mb-4 opacity-30" />
                                <h3 className="text-lg font-bold text-slate-600">Tidak ada data reject</h3>
                                <p className="text-sm">
                                    Belum ada data RFID dengan status REJECT atau tidak ditemukan dengan filter yang
                                    dipilih.
                                </p>
                            </div>
                        ) : (
                            <div
                                className="flex flex-col h-full overflow-x-auto"
                                style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}
                            >
                                {/* Wrapper untuk header dan body dengan scroll horizontal bersama */}
                                <div className="min-w-max flex flex-col h-full">
                                    {/* Table Header - Sticky dengan gradient yang menarik */}
                                    <div className="bg-gradient-to-r from-red-600 via-red-700 to-blue-600 border-b-2 border-red-800 shrink-0 sticky top-0 z-10 shadow-md">
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
                                            WebkitOverflowScrolling: 'touch',
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
                                        {rejectData.map((item, index) => (
                                            <div
                                                key={item.id}
                                                className={`flex items-center px-3 py-3.5 border-b border-slate-100 transition-all duration-200 text-sm font-medium group gap-2 min-w-max ${
                                                    index % 2 === 0
                                                        ? 'bg-white hover:bg-red-50/60'
                                                        : 'bg-slate-50/60 hover:bg-red-50/60'
                                                }`}
                                            >
                                                <div className="w-[130px] shrink-0 text-center">
                                                    <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-extrabold bg-gradient-to-r from-red-50 to-red-100 text-red-700 border border-red-200 font-mono shadow-sm group-hover:shadow-md transition-shadow">
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
                                                        <span
                                                            className="w-3 h-3 rounded-full border-2 border-slate-300 shadow-sm"
                                                            style={{
                                                                backgroundColor: item.color?.toLowerCase() || '#ccc',
                                                            }}
                                                        ></span>
                                                        <span className="text-slate-700 truncate">
                                                            {item.color || '-'}
                                                        </span>
                                                    </span>
                                                </div>
                                                <div className="w-[55px] shrink-0 text-center font-bold text-slate-700 text-sm">
                                                    {item.size || '-'}
                                                </div>
                                                <div className="w-[85px] shrink-0 text-center">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold shadow-sm bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200">
                                                        {(item.status || 'Unknown').toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="w-[85px] shrink-0 text-center">
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold shadow-sm bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 border border-slate-200">
                                                        <MapPin size={11} />
                                                        {(() => {
                                                            const lokasiUpper =
                                                                item.lokasi?.toUpperCase().trim() || '';
                                                            const isOutputSewing =
                                                                lokasiUpper === 'OUTPUT_SEWING' ||
                                                                lokasiUpper.includes('OUTPUT_SEWING');

                                                            return isOutputSewing ? (
                                                                <span className="truncate">OUTPUT</span>
                                                            ) : (
                                                                <span className="truncate">
                                                                    {item.lokasi || '-'}
                                                                </span>
                                                            );
                                                        })()}
                                                    </span>
                                                </div>
                                                <div className="w-[75px] shrink-0 text-center">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-lg bg-red-50 text-red-700 font-bold text-xs border border-red-200 shadow-sm">
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
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm"
                    onClick={handleCloseModal}
                >
                    <div
                        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-red-600 to-blue-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between text-white flex-shrink-0">
                            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                                <FileText size={18} className="sm:w-5 sm:h-5" />
                                <span>Detail RFID Reject</span>
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                            >
                                <X size={20} className="sm:w-6 sm:h-6" />
                            </button>
                        </div>
                        <div className="p-4 sm:p-6 space-y-2 sm:space-y-2.5 overflow-y-auto flex-1">
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-slate-100 hover:bg-slate-50/50 transition-colors rounded px-1 -mx-1">
                                <span className="text-slate-500 font-medium text-xs sm:text-sm flex-shrink-0">
                                    RFID ID
                                </span>
                                <span className="font-mono font-bold text-red-600 bg-red-50 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-xs sm:text-sm ml-2 text-right break-all">
                                    {selectedScan.rfid}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-slate-100 hover:bg-slate-50/50 transition-colors rounded px-1 -mx-1">
                                <span className="text-slate-500 font-medium text-xs sm:text-sm flex-shrink-0">
                                    Nomor WO
                                </span>
                                <span className="text-slate-800 font-medium text-xs sm:text-sm ml-2 text-right break-all">
                                    {selectedScan.nomor_wo || '-'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-slate-100 hover:bg-slate-50/50 transition-colors rounded px-1 -mx-1">
                                <span className="text-slate-500 font-medium text-xs sm:text-sm flex-shrink-0">
                                    Style
                                </span>
                                <span className="text-slate-800 font-medium text-xs sm:text-sm ml-2 text-right break-all">
                                    {selectedScan.style || '-'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-slate-100 hover:bg-slate-50/50 transition-colors rounded px-1 -mx-1">
                                <span className="text-slate-500 font-medium text-xs sm:text-sm flex-shrink-0">
                                    Buyer
                                </span>
                                <span
                                    className="text-slate-800 font-medium text-xs sm:text-sm ml-2 text-right break-all max-w-[60%] truncate"
                                    title={selectedScan.buyer}
                                >
                                    {selectedScan.buyer || '-'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-slate-100 hover:bg-slate-50/50 transition-colors rounded px-1 -mx-1">
                                <span className="text-slate-500 font-medium text-xs sm:text-sm flex-shrink-0">
                                    Item
                                </span>
                                <span
                                    className="text-slate-800 font-medium text-xs sm:text-sm ml-2 text-right break-all max-w-[60%] truncate"
                                    title={selectedScan.item}
                                >
                                    {selectedScan.item || '-'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-slate-100 hover:bg-slate-50/50 transition-colors rounded px-1 -mx-1">
                                <span className="text-slate-500 font-medium text-xs sm:text-sm flex-shrink-0">
                                    Color
                                </span>
                                <span className="text-slate-800 font-medium text-xs sm:text-sm flex items-center gap-1.5 ml-2">
                                    <span
                                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-slate-200 flex-shrink-0"
                                        style={{ backgroundColor: selectedScan.color?.toLowerCase() }}
                                    ></span>
                                    <span className="text-right">{selectedScan.color || '-'}</span>
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-slate-100 hover:bg-slate-50/50 transition-colors rounded px-1 -mx-1">
                                <span className="text-slate-500 font-medium text-xs sm:text-sm flex-shrink-0">
                                    Size
                                </span>
                                <span className="text-slate-800 font-medium text-xs sm:text-sm ml-2 text-right">
                                    {selectedScan.size || '-'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-slate-100 hover:bg-slate-50/50 transition-colors rounded px-1 -mx-1">
                                <span className="text-slate-500 font-medium text-xs sm:text-sm flex-shrink-0">
                                    Status
                                </span>
                                <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ml-2 flex-shrink-0 bg-red-100 text-red-700">
                                    {(selectedScan.status || 'Unknown').toUpperCase()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-slate-100 hover:bg-slate-50/50 transition-colors rounded px-1 -mx-1">
                                <span className="text-slate-500 font-medium text-xs sm:text-sm flex-shrink-0">
                                    Lokasi
                                </span>
                                <span className="flex items-center gap-1 text-slate-800 font-medium text-xs sm:text-sm ml-2">
                                    <MapPin
                                        size={12}
                                        className="sm:w-3.5 sm:h-3.5 text-slate-400 flex-shrink-0"
                                    />
                                    {(() => {
                                        const lokasiUpper = selectedScan.lokasi?.toUpperCase().trim() || '';
                                        const isOutputSewing =
                                            lokasiUpper === 'OUTPUT_SEWING' || lokasiUpper.includes('OUTPUT_SEWING');

                                        return isOutputSewing ? (
                                            <span className="text-right">OUTPUT</span>
                                        ) : (
                                            <span className="text-right">{selectedScan.lokasi || '-'}</span>
                                        );
                                    })()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-slate-100 hover:bg-slate-50/50 transition-colors rounded px-1 -mx-1">
                                <span className="text-slate-500 font-medium text-xs sm:text-sm flex-shrink-0">
                                    Line
                                </span>
                                <span className="text-slate-800 font-medium text-xs sm:text-sm ml-2 text-right">
                                    {selectedScan.line || '-'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 sm:py-2 hover:bg-slate-50/50 transition-colors rounded px-1 -mx-1">
                                <span className="text-slate-500 font-medium text-xs sm:text-sm flex-shrink-0">
                                    Timestamp
                                </span>
                                <span className="text-slate-800 font-medium text-[10px] sm:text-xs font-mono ml-2 text-right break-all">
                                    {selectedScan.timestamp
                                        ? (() => {
                                              try {
                                                  const date = new Date(selectedScan.timestamp);
                                                  const day = String(date.getUTCDate()).padStart(2, '0');
                                                  const monthNames = [
                                                      'Jan',
                                                      'Feb',
                                                      'Mar',
                                                      'Apr',
                                                      'Mei',
                                                      'Jun',
                                                      'Jul',
                                                      'Agu',
                                                      'Sep',
                                                      'Okt',
                                                      'Nov',
                                                      'Des',
                                                  ];
                                                  const month = monthNames[date.getUTCMonth()];
                                                  const year = date.getUTCFullYear();
                                                  const hours = String(date.getUTCHours()).padStart(2, '0');
                                                  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
                                                  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
                                                  return `${day} ${month} ${year}, ${hours}.${minutes}.${seconds}`;
                                              } catch (e) {
                                                  return selectedScan.timestamp;
                                              }
                                          })()
                                        : '-'}
                                </span>
                            </div>
                        </div>
                        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 sm:px-6 py-3 sm:py-4 flex justify-end border-t border-slate-200 flex-shrink-0">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 sm:px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md text-sm sm:text-base"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && itemToDelete && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={cancelDelete}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} className="text-red-600" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Hapus Data RFID Reject?</h2>
                            <p className="text-slate-500 mb-6">
                                Apakah Anda yakin ingin menghapus data RFID{' '}
                                <span className="font-mono font-bold text-slate-700">{itemToDelete.rfid}</span> dari
                                daftar reject? Tindakan ini tidak dapat dibatalkan.
                            </p>

                            <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-6 text-left flex gap-3">
                                <AlertTriangle className="text-red-500 shrink-0" size={20} />
                                <p className="text-xs text-red-700">
                                    Data yang dihapus akan hilang permanen dari database dan tidak dapat dipulihkan
                                    kembali.
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
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowFilterModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-slate-800">Filter Data Reject</h2>
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
                                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                                        />
                                        <Calendar
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                            size={18}
                                        />
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
                                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                                        />
                                        <Calendar
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                            size={18}
                                        />
                                    </div>
                                </div>

                                {/* Status Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                                    <div className="relative">
                                        <select
                                            value={filterStatusModal || 'Reject'}
                                            onChange={(e) => setFilterStatusModal(e.target.value)}
                                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all appearance-none"
                                        >
                                            <option value="Reject">Reject Only</option>
                                            <option value="Semua">Semua</option>
                                            {uniqueStatuses.map((status) => (
                                                <option key={status} value={status}>
                                                    {status}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg
                                                className="w-5 h-5 text-slate-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M19 9l-7 7-7-7"
                                                />
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
                                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all appearance-none"
                                        >
                                            <option value="Semua">Semua</option>
                                            {uniqueSizes.map((size) => (
                                                <option key={size} value={size}>
                                                    {size}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg
                                                className="w-5 h-5 text-slate-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M19 9l-7 7-7-7"
                                                />
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
                                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all appearance-none"
                                        >
                                            <option value="Semua">Semua</option>
                                            {uniqueColors.map((color) => (
                                                <option key={color} value={color}>
                                                    {color}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg
                                                className="w-5 h-5 text-slate-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M19 9l-7 7-7-7"
                                                />
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
                                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors"
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
                onExport={handleExportReject as any}
                lineId={currentLine || '1'}
            />
        </div>
    );
};

export default ListRFIDReject;




import { useCallback, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import { useSidebar } from '../context/SidebarContext';
import { X, ListChecks, Search, Calendar } from 'lucide-react';
import ScanningRFIDNew from '../components/ScanningRFIDNew';
import backgroundImage from '../assets/background.jpg';
import { useDaftarRFID } from '../hooks/useDaftarRFID';
import RegistrationForm from '../components/daftar/RegistrationForm';

export default function DaftarRFID() {
    const { isOpen } = useSidebar();
    
    // Custom hook untuk semua state dan logic
    const {
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        showDateFilterModal,
        setShowDateFilterModal,
        showRegisteredModal,
        setShowRegisteredModal,
        showScanRejectModal,
        setShowScanRejectModal,
        rejectRfidInput,
        setRejectRfidInput,
        rejectScannedItems,
        isProcessingReject,
        rejectInputRef,
        loadingRegistered,
        filterStatus,
        setFilterStatus,
        searchTerm,
        setSearchTerm,
        filterColor,
        setFilterColor,
        filterSize,
        setFilterSize,
        workOrderData,
        loading,
        formData,
        focusedInput,
        setFocusedInput,
        hoveredCard,
        setHoveredCard,
        isModalOpen,
        setIsModalOpen,
        fetchProductionBranchData,
        handleRejectRfidSubmit,
        handleInputChange,
        handleSubmit,
        getItemStatus,
        filteredRegisteredData,
        uniqueColors,
        uniqueSizes,
    } = useDaftarRFID();

    const getTodayDate = useCallback(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

    // Fetch data saat component mount dan saat date berubah
    useEffect(() => {
        fetchProductionBranchData();
    }, [dateFrom, dateTo, fetchProductionBranchData]);

    return (
        <div className="flex min-h-screen w-full h-screen fixed inset-0 m-0 p-0"
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed',
            }}
        >

        
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div
                className="flex flex-col w-full min-h-screen transition-all duration-300 ease-in-out"
                style={{ marginLeft: isOpen ? '18%' : '5rem', width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)' }}
            >
                {/* Header */}
                <Header />

                {/* Breadcrumb */}
                <Breadcrumb />

                {/* Content */}
                <main
                    className="flex-1 w-full flex items-center justify-center"
                    style={{
                        marginTop: '0',
                        height: 'calc(100vh - 4rem - 3rem)',
                        minHeight: 'calc(100vh - 4rem - 3rem)',
                        maxHeight: 'calc(100vh - 4rem)',
                        overflow: 'hidden'
                    }}
                >
                    <RegistrationForm
                        formData={formData}
                        workOrderData={workOrderData}
                        loading={loading}
                        focusedInput={focusedInput}
                        hoveredCard={hoveredCard}
                        dateFrom={dateFrom}
                        dateTo={dateTo}
                        onInputChange={handleInputChange}
                        onFocus={setFocusedInput}
                        onBlur={() => setFocusedInput(null)}
                        onMouseEnter={() => setHoveredCard(true)}
                        onMouseLeave={() => setHoveredCard(false)}
                        onDateFilterClick={() => setShowDateFilterModal(true)}
                        onRegisteredClick={() => setShowRegisteredModal(true)}
                        onRejectClick={() => setShowScanRejectModal(true)}
                        onSubmit={handleSubmit}
                    />
                </main>
            </div>

            {/* Scanning RFID Modal - Design Baru */}
            {/* Date Filter Modal */}
            {showDateFilterModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDateFilterModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-slate-800">Filter Tanggal</h2>
                                <button
                                    onClick={() => setShowDateFilterModal(false)}
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
                                            value={dateFrom}
                                            onChange={(e) => setDateFrom(e.target.value)}
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
                                            value={dateTo}
                                            onChange={(e) => setDateTo(e.target.value)}
                                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                    </div>
                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => {
                                        const today = getTodayDate();
                                        setDateFrom(today);
                                        setDateTo(today);
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition-colors"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDateFilterModal(false);
                                        // Data akan otomatis di-fetch karena useEffect yang watch dateFrom dan dateTo
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                                >
                                    Terapkan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Registered RFID Modal */}
            {showRegisteredModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => {
                    setShowRegisteredModal(false);
                    setSearchTerm('');
                    setFilterColor('Semua');
                    setFilterSize('Semua');
                }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] sm:h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
                        {/* Header dengan gradient biru */}
                        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 p-6 flex-shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                        <ListChecks className="text-white" size={24} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white">Registered RFID</h2>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowRegisteredModal(false);
                                        setSearchTerm('');
                                        setFilterColor('Semua');
                                        setFilterSize('Semua');
                                    }}
                                    className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white hover:bg-white/30"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Search, Filter, dan Total - Sejajar Horizontal */}
                            <div className="flex items-end gap-3 flex-wrap">
                                {/* Search Form - Diperkecil */}
                                <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                                    <label className="block text-xs font-semibold text-white/90 mb-1.5">Search</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/80" size={16} />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search RFID, WO, Style..."
                                            className="w-full pl-10 pr-4 py-2.5 bg-white/95 backdrop-blur-sm border-2 border-white/30 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all shadow-lg"
                                        />
                                    </div>
                                </div>

                                {/* Filter Status - Design Elegan */}
                                <div className="relative">
                                    <label className="block text-xs font-semibold text-white/90 mb-1.5">Filter Status</label>
                                    <div className="relative">
                                        <select
                                            value={filterStatus}
                                            onChange={(e) => setFilterStatus(e.target.value)}
                                            className="pl-4 pr-10 py-2.5 bg-white/95 backdrop-blur-sm border-2 border-white/30 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all appearance-none cursor-pointer shadow-lg min-w-[160px]"
                                        >
                                            <option value="Semua">Semua</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Waiting">Waiting</option>
                                            <option value="isDone">isDone</option>
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Filter By Color */}
                                <div className="relative">
                                    <label className="block text-xs font-semibold text-white/90 mb-1.5">Filter Color</label>
                                    <div className="relative">
                                        <select
                                            value={filterColor}
                                            onChange={(e) => setFilterColor(e.target.value)}
                                            className="pl-4 pr-10 py-2.5 bg-white/95 backdrop-blur-sm border-2 border-white/30 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all appearance-none cursor-pointer shadow-lg min-w-[140px]"
                                        >
                                            <option value="Semua">Semua</option>
                                            {uniqueColors.map((color) => (
                                                <option key={color} value={color}>{color}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Filter By Size */}
                                <div className="relative">
                                    <label className="block text-xs font-semibold text-white/90 mb-1.5">Filter Size</label>
                                    <div className="relative">
                                        <select
                                            value={filterSize}
                                            onChange={(e) => setFilterSize(e.target.value)}
                                            className="pl-4 pr-10 py-2.5 bg-white/95 backdrop-blur-sm border-2 border-white/30 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all appearance-none cursor-pointer shadow-lg min-w-[120px]"
                                        >
                                            <option value="Semua">Semua</option>
                                            {uniqueSizes.map((size) => (
                                                <option key={size} value={size}>{size}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Total Count - Paling Kanan */}
                                <div className="ml-auto">
                                    <div className="bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl px-4 py-2.5 shadow-lg">
                                        <div className="text-xs font-semibold text-white/90 mb-0.5">Total</div>
                                        <div className="text-2xl font-bold text-white">{filteredRegisteredData.length}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Table Content - Fixed Height dengan Scroll */}
                        <div className="flex-1 overflow-hidden p-6 bg-gradient-to-br from-slate-50 to-blue-50/30 min-h-0 flex flex-col">
                            {loadingRegistered ? (
                                <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <p className="text-slate-600 font-medium">Memuat data...</p>
                                </div>
                            ) : filteredRegisteredData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-slate-400 h-full min-h-[400px]">
                                    <div className="p-4 bg-blue-100 rounded-full mb-4">
                                        <ListChecks size={48} className="text-blue-500 opacity-50" />
                                    </div>
                                    <p className="text-lg font-bold text-slate-600 mb-1">Tidak ada data</p>
                                    <p className="text-sm">Tidak ada RFID yang terdaftar dengan filter yang dipilih</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden h-full flex flex-col">
                                    <style>{`
                                        .registered-rfid-table::-webkit-scrollbar {
                                            width: 8px;
                                            height: 8px;
                                        }
                                        .registered-rfid-table::-webkit-scrollbar-track {
                                            background: #f1f5f9;
                                            border-radius: 4px;
                                        }
                                        .registered-rfid-table::-webkit-scrollbar-thumb {
                                            background: #cbd5e1;
                                            border-radius: 4px;
                                        }
                                        .registered-rfid-table::-webkit-scrollbar-thumb:hover {
                                            background: #94a3b8;
                                        }
                                    `}</style>
                                    <div className="registered-rfid-table overflow-y-auto overflow-x-auto flex-1 min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 text-white">
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">RFID ID</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">WO</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">Style</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">Buyer</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">Item</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">Color</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">Size</th>
                                                    <th className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wider border-b-2 border-blue-500">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-100">
                                                {filteredRegisteredData.map((item, index) => {
                                                    // Gunakan helper function yang sama untuk konsistensi
                                                    const status = getItemStatus(item);
                                                    const statusColor = status === 'In Progress' 
                                                        ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border-yellow-300' 
                                                        : status === 'Waiting' 
                                                        ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-300'
                                                        : 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-300';
                                                    
                                                    return (
                                                        <tr 
                                                            key={item.id || index} 
                                                            className={`hover:bg-blue-50/50 transition-all duration-200 ${
                                                                index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                                                            }`}
                                                        >
                                                            <td className="px-4 py-3.5">
                                                                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-mono font-bold bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200 shadow-sm">
                                                                    {item.rfid_garment || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3.5 text-sm font-semibold text-slate-700">{item.wo || '-'}</td>
                                                            <td className="px-4 py-3.5 text-sm font-medium text-slate-700">{item.style || '-'}</td>
                                                            <td className="px-4 py-3.5 text-sm text-slate-700">
                                                                <span className="truncate block max-w-[200px]" title={item.buyer || '-'}>
                                                                    {item.buyer || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3.5 text-sm text-slate-700">
                                                                <span className="truncate block max-w-[250px]" title={item.item || '-'}>
                                                                    {item.item || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3.5">
                                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-sm font-semibold">
                                                                    <span 
                                                                        className="w-4 h-4 rounded-full border-2 border-slate-300 shadow-sm" 
                                                                        style={{ backgroundColor: item.color?.toLowerCase() || '#ccc' }}
                                                                    ></span>
                                                                    <span className="text-slate-700">{item.color || '-'}</span>
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3.5">
                                                                <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-sm font-bold text-blue-700 min-w-[50px]">
                                                                    {item.size || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3.5">
                                                                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border-2 shadow-sm ${statusColor}`}>
                                                                    {status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Scan Reject Modal - Tema Merah */}
            {showScanRejectModal && (
                <div 
                    className="fixed inset-0 z-[1000] flex items-center justify-center"
                    style={{
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(8px)',
                        animation: 'fadeIn 0.3s ease'
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowScanRejectModal(false);
                        }
                    }}
                >
                    <div 
                        className="bg-white rounded-3xl shadow-2xl w-[95%] max-w-[900px] max-h-[95vh] flex flex-col"
                        style={{
                            background: 'linear-gradient(135deg, #FFFFFF 0%, #FEF2F2 100%)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(220, 38, 38, 0.1), 0 8px 16px -8px rgba(239, 68, 68, 0.1)',
                            animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                            border: '1px solid rgba(254, 226, 226, 0.8)',
                            padding: '1.5rem',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header - Tema Merah */}
                        <div 
                            className="text-center mb-2"
                            style={{
                                background: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 50%, #FCA5A5 100%)',
                                borderRadius: '6px',
                                padding: '0.25rem 0.5rem',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)'
                            }}
                        >
                            <h2 
                                className="text-xl font-extrabold mb-1"
                                style={{
                                    background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    letterSpacing: '-0.5px'
                                }}
                            >
                                🚫 Scan Reject Mati
                            </h2>
                            <p className="text-sm font-medium" style={{ color: '#7F1D1D' }}>
                                Scan RFID untuk produk garment yang dinyatakan reject mati
                            </p>
                        </div>

                        {/* Input Section - Tema Merah */}
                        <div className="mb-4">
                            <div 
                                className="relative"
                                style={{
                                    background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
                                    borderRadius: '12px',
                                    padding: '1rem',
                                    border: '2px solid #FCA5A5',
                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)'
                                }}
                            >
                                <label 
                                    className="block text-sm font-bold mb-2"
                                    style={{ color: '#991B1B' }}
                                >
                                    Scan RFID Reject:
                                </label>
                                <input
                                    ref={rejectInputRef}
                                    type="text"
                                    value={rejectRfidInput}
                                    onChange={(e) => setRejectRfidInput(e.target.value)}
                                    onKeyDown={async (e) => {
                                        if (e.key === 'Enter' && rejectRfidInput.trim() && !isProcessingReject) {
                                            await handleRejectRfidSubmit(rejectRfidInput.trim());
                                        }
                                    }}
                                    placeholder="Tempatkan RFID di scanner atau ketik manual..."
                                    className="w-full px-4 py-3 rounded-lg border-2 border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none text-lg font-mono"
                                    style={{
                                        background: '#FFFFFF',
                                        color: '#1F2937'
                                    }}
                                    autoFocus
                                    disabled={isProcessingReject}
                                />
                            </div>
                        </div>

                        {/* Scanned Items List - Tema Merah */}
                        <div 
                            className="flex-1 overflow-y-auto mb-4"
                            style={{
                                background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
                                borderRadius: '12px',
                                padding: '1rem',
                                border: '1px solid #FCA5A5',
                                minHeight: '200px',
                                maxHeight: '300px'
                            }}
                        >
                            {rejectScannedItems.length === 0 ? (
                                <div className="text-center text-slate-500 text-sm py-8">
                                    Belum ada RFID yang di-scan
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {rejectScannedItems.map((item, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 rounded-lg"
                                            style={{
                                                background: item.status === 'success' ? '#FEE2E2' : '#FEF2F2',
                                                border: `2px solid ${item.status === 'success' ? '#FCA5A5' : '#FECACA'}`
                                            }}
                                        >
                                            <div className="flex-1">
                                                <div className="font-mono font-bold text-sm" style={{ color: '#7F1D1D' }}>
                                                    {item.rfid}
                                                </div>
                                                <div className="text-xs" style={{ color: item.status === 'success' ? '#059669' : '#DC2626' }}>
                                                    {item.message || (item.status === 'success' ? 'Berhasil' : 'Gagal')}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {item.timestamp.toLocaleTimeString('id-ID')}
                                                </div>
                                            </div>
                                            {item.status === 'success' ? (
                                                <div className="text-green-600">✓</div>
                                            ) : (
                                                <div className="text-red-600">✗</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer Buttons - Tema Merah */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowScanRejectModal(false)}
                                className="flex-1 px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold text-sm transition-all"
                            >
                                Tutup
                            </button>
                            <button
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition-all shadow-lg"
                            >
                                Simpan Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ScanningRFIDNew
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    // Form data tidak di-reset, tetap tersimpan untuk registrasi berikutnya
                }}
                workOrderData={formData}
            />
        </div>
    );
}


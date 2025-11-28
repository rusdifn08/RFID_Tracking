import { useState, useRef, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';
import { QrCode } from 'lucide-react';
import ScanningRFIDNew from '../components/ScanningRFIDNew';

// Data dummy untuk Work Order
interface WorkOrderData {
    workOrder: string;
    styles: string[];
    buyers: string[];
    items: string[];
    colors: string[];
    sizes: string[];
}

const workOrderData: Record<string, WorkOrderData> = {
    '186401': {
        workOrder: '186401',
        styles: ['1128733', '1128734'],
        buyers: ['HEXAPOLE COMPANY LIMITED'],
        items: ['STORM CRUISER JACKET M\'S (M-R)'],
        colors: ['Black', 'Blue', 'Red', 'Yellow', 'Pink'],
        sizes: ['S', 'M', 'L', 'XL', 'XXL']
    },
    '186402': {
        workOrder: '186402',
        styles: ['193385', '199987'],
        buyers: ['Montbell'],
        items: ['Jacket Storm '],
        colors: ['Pink', 'Blue', 'Green'],
        sizes: ['L', 'XL', 'XXL']
    }
};

export default function DaftarRFID() {
    const { isOpen } = useSidebar();
    const [formData, setFormData] = useState({
        workOrder: '',
        style: '',
        buyer: '',
        item: '',
        color: '',
        size: ''
    });
    const [focusedInput, setFocusedInput] = useState<string | null>(null);
    const [hoveredCard, setHoveredCard] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const modalOpenRef = useRef(false); // Ref untuk tracking modal state
    
    // Get available options based on selected Work Order
    const selectedWOData = formData.workOrder ? workOrderData[formData.workOrder] : null;
    const availableStyles = selectedWOData?.styles || [];
    const availableBuyers = selectedWOData?.buyers || [];
    const availableItems = selectedWOData?.items || [];
    const availableColors = selectedWOData?.colors || [];
    const availableSizes = selectedWOData?.sizes || [];
    
    // Sync ref dengan state
    useEffect(() => {
        modalOpenRef.current = isModalOpen;
        console.log('[DaftarRFID] Modal state updated:', isModalOpen);
    }, [isModalOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        // Jika Work Order berubah, reset semua field lainnya
        if (name === 'workOrder') {
            setFormData({
                workOrder: value,
                style: '',
                buyer: '',
                item: '',
                color: '',
                size: ''
            });
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation(); // Stop all event propagation
        
        // Validasi form
        if (!formData.workOrder || !formData.style || !formData.buyer || !formData.item || !formData.color || !formData.size) {
            alert('Mohon lengkapi semua field sebelum melanjutkan.');
            return false; // Prevent default behavior
        }
        
        // Buka modal scanning - langsung set tanpa setTimeout
        console.log('[DaftarRFID] Opening modal, form data:', formData);
        console.log('[DaftarRFID] Current isModalOpen state:', isModalOpen);
        console.log('[DaftarRFID] Current modalOpenRef:', modalOpenRef.current);
        
        // Set ref terlebih dahulu
        modalOpenRef.current = true;
        
        // Gunakan functional update untuk memastikan state update
        setIsModalOpen(prev => {
            if (prev === true) {
                console.warn('[DaftarRFID] Modal already open, skipping');
                return prev;
            }
            console.log('[DaftarRFID] Setting modal to true, previous state:', prev);
            return true;
        });
        
        // Return false untuk mencegah form submission
        return false;
    };

    return (
        <div className="flex min-h-screen bg-gray-50"

        >
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div
                className="flex flex-col w-full min-h-screen transition-all duration-300 ease-in-out"
                style={{ marginLeft: isOpen ? '15%' : '5rem', width: isOpen ? 'calc(100% - 15%)' : 'calc(100% - 5rem)' }}
            >
                {/* Header */}
                <Header />

                {/* Content */}
                <main
                    className="flex-1 w-full bg-gray-50 flex items-center justify-center"
                    style={{
                        marginTop: '4rem',
                        height: 'calc(100vh - 4rem)',
                        minHeight: 'calc(100vh - 4rem)',
                        maxHeight: 'calc(100vh - 4rem)',
                        overflow: 'hidden'
                    }}
                >
                    {/* Register RFID Card */}
                    <div className="w-full max-w-4xl h-full flex items-center justify-center px-3 py-2 sm:px-6 sm:py-6">
                        <div
                            className="rounded-xl sm:rounded-2xl shadow-[0_4px_20px_rgba(59,130,246,0.15)] p-3 sm:p-5 md:p-6 relative overflow-hidden transition-all duration-500 w-full bg-white flex flex-col max-h-full"
                            onMouseEnter={() => setHoveredCard(true)}
                            onMouseLeave={() => setHoveredCard(false)}
                            style={{
                                boxShadow: hoveredCard
                                    ? '0_8px_30px_rgba(59,130,246,0.25)'
                                    : '0_4px_20px_rgba(59,130,246,0.15)',
                                transform: hoveredCard ? 'translateY(-4px)' : 'translateY(0)'
                            }}
                        >
                            {/* Blue glow effect dengan animasi */}
                            <div className={`absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none transition-opacity duration-500 ${hoveredCard ? 'opacity-100' : 'opacity-50'}`}></div>

                            {/* Header Section - Compact untuk Mobile */}
                            <div className="flex-shrink-0 mb-2 sm:mb-4">
                                {/* Icon RFID di atas dengan animasi */}
                                <div className="flex justify-center items-center mb-1.5 sm:mb-3">
                                    <div
                                        className={`w-10 h-10 sm:w-14 sm:h-14 bg-blue-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg transition-all duration-500 ${hoveredCard ? 'scale-110 rotate-3 shadow-blue-500/50' : 'scale-100 rotate-0'}`}
                                    >
                                        <QrCode
                                            className={`w-6 h-6 sm:w-8 sm:h-8 text-white transition-all duration-500 ${hoveredCard ? 'scale-110' : 'scale-100'}`}
                                            strokeWidth={2.5}
                                        />
                                    </div>
                                </div>

                                {/* Title */}
                                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-800 text-center mb-1 sm:mb-2 transition-colors duration-300">
                                    REGISTER RFID
                                </h1>

                                {/* Instruction */}
                                <p className="text-gray-600 text-center mb-2 sm:mb-4 text-[11px] sm:text-sm leading-tight">
                                    Input informasi Work Order, Style, Buyer, Item, Color, dan Size untuk scanning RFID
                                </p>
                            </div>

                            {/* Form - Compact layout dengan flex untuk fit content */}
                            <form 
                                onSubmit={handleSubmit} 
                                className="flex flex-col flex-1 min-h-0 overflow-y-auto"
                                noValidate
                            >
                                {/* Form Fields Container - Gap lebih kecil untuk mobile */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                                    {/* Work Order - Dropdown */}
                                    <div className="transition-all duration-300 flex flex-col">
                                        <label
                                            htmlFor="workOrder"
                                            className={`block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-1.5 transition-colors duration-300 ${focusedInput === 'workOrder' ? 'text-blue-600' : ''}`}
                                        >
                                            Work Order
                                        </label>
                                        <select
                                            id="workOrder"
                                            name="workOrder"
                                            value={formData.workOrder}
                                            onChange={handleInputChange}
                                            onFocus={() => setFocusedInput('workOrder')}
                                            onBlur={() => setFocusedInput(null)}
                                            className="w-full h-9 sm:h-10 px-2.5 sm:px-3 text-xs sm:text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all duration-300 hover:border-blue-400 bg-white cursor-pointer"
                                        >
                                            <option value="">Pilih Work Order</option>
                                            {Object.keys(workOrderData).map(wo => (
                                                <option key={wo} value={wo}>{wo}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Style - Dropdown */}
                                    <div className="transition-all duration-300 flex flex-col">
                                        <label
                                            htmlFor="style"
                                            className={`block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-1.5 transition-colors duration-300 ${focusedInput === 'style' ? 'text-blue-600' : ''}`}
                                        >
                                            Style
                                        </label>
                                        <select
                                            id="style"
                                            name="style"
                                            value={formData.style}
                                            onChange={handleInputChange}
                                            onFocus={() => setFocusedInput('style')}
                                            onBlur={() => setFocusedInput(null)}
                                            disabled={!formData.workOrder}
                                            className="w-full h-9 sm:h-10 px-2.5 sm:px-3 text-xs sm:text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all duration-300 hover:border-blue-400 bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                                        >
                                            <option value="">{formData.workOrder ? 'Pilih Style' : 'Pilih Work Order dulu'}</option>
                                            {availableStyles.map(style => (
                                                <option key={style} value={style}>{style}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Buyer - Dropdown */}
                                    <div className="transition-all duration-300 flex flex-col">
                                        <label
                                            htmlFor="buyer"
                                            className={`block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-1.5 transition-colors duration-300 ${focusedInput === 'buyer' ? 'text-blue-600' : ''}`}
                                        >
                                            Buyer
                                        </label>
                                        <select
                                            id="buyer"
                                            name="buyer"
                                            value={formData.buyer}
                                            onChange={handleInputChange}
                                            onFocus={() => setFocusedInput('buyer')}
                                            onBlur={() => setFocusedInput(null)}
                                            disabled={!formData.workOrder}
                                            className="w-full h-9 sm:h-10 px-2.5 sm:px-3 text-xs sm:text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all duration-300 hover:border-blue-400 bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                                        >
                                            <option value="">{formData.workOrder ? 'Pilih Buyer' : 'Pilih Work Order dulu'}</option>
                                            {availableBuyers.map(buyer => (
                                                <option key={buyer} value={buyer}>{buyer}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Item - Dropdown */}
                                    <div className="transition-all duration-300 flex flex-col">
                                        <label
                                            htmlFor="item"
                                            className={`block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-1.5 transition-colors duration-300 ${focusedInput === 'item' ? 'text-blue-600' : ''}`}
                                        >
                                            Item
                                        </label>
                                        <select
                                            id="item"
                                            name="item"
                                            value={formData.item}
                                            onChange={handleInputChange}
                                            onFocus={() => setFocusedInput('item')}
                                            onBlur={() => setFocusedInput(null)}
                                            disabled={!formData.workOrder}
                                            className="w-full h-9 sm:h-10 px-2.5 sm:px-3 text-xs sm:text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all duration-300 hover:border-blue-400 bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                                        >
                                            <option value="">{formData.workOrder ? 'Pilih Item' : 'Pilih Work Order dulu'}</option>
                                            {availableItems.map(item => (
                                                <option key={item} value={item}>{item}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Color - Dropdown */}
                                    <div className="transition-all duration-300 flex flex-col">
                                        <label
                                            htmlFor="color"
                                            className={`block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-1.5 transition-colors duration-300 ${focusedInput === 'color' ? 'text-blue-600' : ''}`}
                                        >
                                            Color
                                        </label>
                                        <select
                                            id="color"
                                            name="color"
                                            value={formData.color}
                                            onChange={handleInputChange}
                                            onFocus={() => setFocusedInput('color')}
                                            onBlur={() => setFocusedInput(null)}
                                            disabled={!formData.workOrder}
                                            className="w-full h-9 sm:h-10 px-2.5 sm:px-3 text-xs sm:text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all duration-300 hover:border-blue-400 bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                                        >
                                            <option value="">{formData.workOrder ? 'Pilih Color' : 'Pilih Work Order dulu'}</option>
                                            {availableColors.map(color => (
                                                <option key={color} value={color}>{color}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Size - Dropdown */}
                                    <div className="transition-all duration-300 flex flex-col">
                                        <label
                                            htmlFor="size"
                                            className={`block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-1.5 transition-colors duration-300 ${focusedInput === 'size' ? 'text-blue-600' : ''}`}
                                        >
                                            Size
                                        </label>
                                        <select
                                            id="size"
                                            name="size"
                                            value={formData.size}
                                            onChange={handleInputChange}
                                            onFocus={() => setFocusedInput('size')}
                                            onBlur={() => setFocusedInput(null)}
                                            disabled={!formData.workOrder}
                                            className="w-full h-9 sm:h-10 px-2.5 sm:px-3 text-xs sm:text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all duration-300 hover:border-blue-400 bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                                        >
                                            <option value="">{formData.workOrder ? 'Pilih Size' : 'Pilih Work Order dulu'}</option>
                                            {availableSizes.map(size => (
                                                <option key={size} value={size}>{size}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Submit Button - Fixed di bawah, lebih compact untuk mobile */}
                                <div className="flex-shrink-0 mt-2 sm:mt-4">
                                    <button
                                        type="submit"
                                        className="w-full h-10 sm:h-11 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold text-sm sm:text-base px-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/50 transform hover:-translate-y-1 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-300 flex items-center justify-center"
                                    >
                                        REGISTER
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </main>
            </div>

            {/* Scanning RFID Modal - Design Baru */}
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


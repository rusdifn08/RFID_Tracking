import { memo, useMemo } from 'react';
import { QrCode, Calendar, ListChecks, XCircle } from 'lucide-react';

interface WorkOrderData {
    workOrder: string;
    styles: string[];
    buyers: string[];
    items: string[];
    colors: string[];
    sizes: string[];
}

interface RegistrationFormProps {
    formData: {
        workOrder: string;
        style: string;
        buyer: string;
        item: string;
        color: string;
        size: string;
    };
    workOrderData: Record<string, WorkOrderData>;
    loading: boolean;
    focusedInput: string | null;
    hoveredCard: boolean;
    dateFrom: string;
    dateTo: string;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onFocus: (name: string) => void;
    onBlur: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onDateFilterClick: () => void;
    onRegisteredClick: () => void;
    onRejectClick: () => void;
    onSubmit: (e: React.FormEvent) => void;
}

const RegistrationForm = memo(({
    formData,
    workOrderData,
    loading,
    focusedInput,
    hoveredCard,
    dateFrom,
    dateTo,
    onInputChange,
    onFocus,
    onBlur,
    onMouseEnter,
    onMouseLeave,
    onDateFilterClick,
    onRegisteredClick,
    onRejectClick,
    onSubmit,
}: RegistrationFormProps) => {
    const selectedWOData = useMemo(() => 
        formData.workOrder ? workOrderData[formData.workOrder] : null,
        [formData.workOrder, workOrderData]
    );

    const availableStyles = selectedWOData?.styles || [];
    const availableBuyers = selectedWOData?.buyers || [];
    const availableItems = selectedWOData?.items || [];
    const availableColors = selectedWOData?.colors || [];
    const availableSizes = selectedWOData?.sizes || [];

    const dateDisplay = useMemo(() => {
        if (dateFrom === dateTo) {
            return new Date(dateFrom).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        return `${new Date(dateFrom).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} - ${new Date(dateTo).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    }, [dateFrom, dateTo]);

    const formFields = [
        { name: 'workOrder', label: 'Work Order', type: 'select', options: Object.keys(workOrderData), disabled: loading },
        { name: 'style', label: 'Style', type: 'select', options: availableStyles, disabled: !formData.workOrder },
        { name: 'buyer', label: 'Buyer', type: 'select', options: availableBuyers, disabled: !formData.workOrder },
        { name: 'item', label: 'Item', type: 'select', options: availableItems, disabled: !formData.workOrder },
        { name: 'color', label: 'Color', type: 'select', options: availableColors, disabled: !formData.workOrder },
        { name: 'size', label: 'Size', type: 'select', options: availableSizes, disabled: !formData.workOrder },
    ];

    return (
        <div className="w-full max-w-4xl h-full flex items-center justify-center px-2 xs:px-3 sm:px-4 md:px-6 py-2 xs:py-3 sm:py-4 md:py-6">
            <div
                className="rounded-lg xs:rounded-xl sm:rounded-2xl shadow-[0_4px_20px_rgba(59,130,246,0.15)] p-2 xs:p-3 sm:p-4 md:p-5 lg:p-6 relative overflow-hidden transition-all duration-500 w-full bg-white flex flex-col max-h-full"
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                style={{
                    boxShadow: hoveredCard
                        ? '0_8px_30px_rgba(59,130,246,0.25)'
                        : '0_4px_20px_rgba(59,130,246,0.15)',
                    transform: hoveredCard ? 'translateY(-4px)' : 'translateY(0)'
                }}
            >
                <div className={`absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none transition-opacity duration-500 ${hoveredCard ? 'opacity-100' : 'opacity-50'}`}></div>

                {/* Header Section */}
                <div className="flex-shrink-0 mb-2 xs:mb-2.5 sm:mb-3 md:mb-4 relative">
                    <div className="flex items-center justify-between mb-1.5 xs:mb-2 sm:mb-2.5 md:mb-3 gap-2">
                        {/* Filter Data Button - Kiri */}
                        <button
                            onClick={onDateFilterClick}
                            className="px-1.5 xs:px-2 sm:px-2.5 py-1 xs:py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 font-medium text-[9px] xs:text-[10px] sm:text-xs"
                            title="Filter Tanggal"
                        >
                            <Calendar size={12} className="xs:w-[14px] xs:h-[14px] sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="font-semibold">{dateDisplay}</span>
                        </button>
                        
                        {/* QR Code Icon - Tengah (Absolute) */}
                        <div className="absolute left-1/2 transform -translate-x-1/2 flex-shrink-0 z-10">
                            <div
                                className={`w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-blue-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg transition-all duration-500 ${hoveredCard ? 'scale-110 rotate-3 shadow-blue-500/50' : 'scale-100 rotate-0'}`}
                            >
                                <QrCode
                                    className={`w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white transition-all duration-500 ${hoveredCard ? 'scale-110' : 'scale-100'}`}
                                    strokeWidth={2.5}
                                />
                            </div>
                        </div>
                        
                        {/* Registered RFID & Scan Reject Buttons - Kanan (Vertikal) */}
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <button
                                onClick={onRegisteredClick}
                                className="px-1.5 xs:px-2 sm:px-2.5 py-1 xs:py-1.5 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 font-medium text-[9px] xs:text-[10px] sm:text-xs"
                                title="Registered RFID"
                            >
                                <ListChecks size={12} className="xs:w-[14px] xs:h-[14px] sm:w-4 sm:h-4 flex-shrink-0" />
                                <span className="font-semibold hidden sm:inline">REGISTERED RFID</span>
                                <span className="font-semibold sm:hidden">REGISTERED</span>
                            </button>
                            <button
                                onClick={onRejectClick}
                                className="px-1.5 xs:px-2 sm:px-2.5 py-1 xs:py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 font-medium text-[9px] xs:text-[10px] sm:text-xs"
                                title="Scan Reject"
                            >
                                <XCircle size={12} className="xs:w-[14px] xs:h-[14px] sm:w-4 sm:h-4 flex-shrink-0" />
                                <span className="font-semibold hidden sm:inline">SCAN REJECT</span>
                                <span className="font-semibold sm:hidden">REJECT</span>
                            </button>
                        </div>
                    </div>

                    <h1 className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 text-center mb-1 xs:mb-1.5 sm:mb-2 transition-colors duration-300" style={{ textTransform: 'capitalize' }}>
                        Register RFID
                    </h1>

                    <p className="text-gray-600 text-center mb-2 xs:mb-2.5 sm:mb-3 md:mb-4 text-[10px] xs:text-[11px] sm:text-xs md:text-sm leading-tight px-2">
                        Input informasi Work Order, Style, Buyer, Item, Color, dan Size untuk scanning RFID
                    </p>
                </div>

                {/* Form */}
                <form 
                    onSubmit={onSubmit} 
                    className="flex flex-col flex-1 min-h-0 overflow-y-auto"
                    noValidate
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 mb-2 xs:mb-2.5 sm:mb-3 md:mb-4">
                        {formFields.map((field) => (
                            <div key={field.name} className="transition-all duration-300 flex flex-col">
                                <label
                                    htmlFor={field.name}
                                    className={`block text-[10px] xs:text-xs sm:text-sm font-semibold text-gray-700 mb-0.5 xs:mb-1 sm:mb-1.5 transition-colors duration-300 ${focusedInput === field.name ? 'text-blue-600' : ''}`}
                                >
                                    {field.label}
                                </label>
                                <select
                                    id={field.name}
                                    name={field.name}
                                    value={formData[field.name as keyof typeof formData]}
                                    onChange={onInputChange}
                                    onFocus={() => onFocus(field.name)}
                                    onBlur={onBlur}
                                    disabled={field.disabled}
                                    className="w-full h-8 xs:h-9 sm:h-10 md:h-11 px-2 xs:px-2.5 sm:px-3 text-[10px] xs:text-xs sm:text-sm md:text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition-all duration-300 hover:border-blue-400 bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                                >
                                    <option value="">
                                        {field.name === 'workOrder' 
                                            ? (loading ? 'Loading...' : Object.keys(workOrderData).length === 0 ? 'Tidak ada data' : 'Pilih Work Order')
                                            : (formData.workOrder ? `Pilih ${field.label}` : 'Pilih Work Order dulu')
                                        }
                                    </option>
                                    {field.options.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>

                    {/* Submit Button */}
                    <div className="flex-shrink-0 mt-auto pt-2 xs:pt-2.5 sm:pt-3 md:pt-4">
                        <button
                            type="submit"
                            className="w-full py-2.5 xs:py-3 sm:py-3.5 md:py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-1.5 xs:gap-2 text-xs xs:text-sm sm:text-base"
                        >
                            <QrCode size={16} className="xs:w-[18px] xs:h-[18px] sm:w-5 sm:h-5 md:w-6 md:h-6" />
                            <span>START SCANNING</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
});

RegistrationForm.displayName = 'RegistrationForm';

export default RegistrationForm;


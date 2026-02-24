import { memo, useMemo, useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { QrCode, Calendar, ListChecks, XCircle, Edit, ChevronDown, Building2 } from 'lucide-react';

// Global variable untuk mengontrol visibility tombol reject
const REJECT_ENABLED = false;

interface WorkOrderData {
    workOrder: string;
    styles: string[];
    buyers: string[];
    items: string[];
    colors: string[];
    sizes: string[];
}

// Schema validasi dengan ZOD
const registrationSchema = z.object({
    workOrder: z.string().min(1, 'Work Order harus dipilih'),
    style: z.string().min(1, 'Style harus dipilih'),
    buyer: z.string().min(1, 'Buyer harus dipilih'),
    item: z.string().min(1, 'Item harus dipilih'),
    color: z.string().min(1, 'Color harus dipilih'),
    size: z.string().min(1, 'Size harus dipilih'),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

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
    manualInputMode?: boolean; // Mode manual input saat error
    focusedInput: string | null;
    hoveredCard: boolean;
    dateFrom: string;
    dateTo: string;
    branch: string;
    onBranchChange: (branch: string) => void;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onFocus: (name: string) => void;
    onBlur: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onDateFilterClick: () => void;
    onRegisteredClick: () => void;
    onRejectClick: () => void;
    onUpdateClick: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onSubmitWithData?: (data: {
        workOrder: string;
        style: string;
        buyer: string;
        item: string;
        color: string;
        size: string;
    }) => boolean;
}

const RegistrationForm = memo(({
    formData,
    workOrderData,
    loading,
    manualInputMode = false,
    focusedInput,
    hoveredCard,
    dateFrom,
    dateTo,
    branch,
    onBranchChange,
    onInputChange,
    onFocus,
    onBlur,
    onMouseEnter,
    onMouseLeave,
    onDateFilterClick,
    onRegisteredClick,
    onRejectClick,
    onUpdateClick,
    onSubmit,
    onSubmitWithData,
}: RegistrationFormProps) => {
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<RegistrationFormData>({
        resolver: zodResolver(registrationSchema),
        defaultValues: {
            workOrder: formData.workOrder,
            style: formData.style,
            buyer: formData.buyer,
            item: formData.item,
            color: formData.color,
            size: formData.size,
        },
    });

    const selectedWorkOrder = watch('workOrder');
    const selectedWOData = useMemo(() =>
        selectedWorkOrder ? workOrderData[selectedWorkOrder] : null,
        [selectedWorkOrder, workOrderData]
    );

    const availableStyles = selectedWOData?.styles || [];
    const availableBuyers = selectedWOData?.buyers || [];
    const availableItems = selectedWOData?.items || [];
    const availableColors = selectedWOData?.colors || [];
    const availableSizes = selectedWOData?.sizes || [];

    // State untuk dropdown branch
    const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
    const branchDropdownRef = useRef<HTMLDivElement>(null);

    // Handler untuk menutup dropdown saat klik di luar
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
                setIsBranchDropdownOpen(false);
            }
        };

        if (isBranchDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isBranchDropdownOpen]);

    // Handler untuk memilih branch
    const handleBranchSelect = (selectedBranch: string) => {
        onBranchChange(selectedBranch);
        setIsBranchDropdownOpen(false);
    };

    const branchOptions = ['CJL', 'MJ1', 'MJ2'];

    // Sync form values dengan props formData
    useEffect(() => {
        setValue('workOrder', formData.workOrder);
        setValue('style', formData.style);
        setValue('buyer', formData.buyer);
        setValue('item', formData.item);
        setValue('color', formData.color);
        setValue('size', formData.size);
    }, [formData, setValue]);

    // Handle workOrder change untuk auto-fill
    useEffect(() => {
        if (selectedWorkOrder && selectedWOData) {
            const woData = selectedWOData;
            const autoStyle = woData.styles?.length === 1 ? woData.styles[0] : '';
            const autoBuyer = woData.buyers?.length === 1 ? woData.buyers[0] : '';
            const autoItem = woData.items?.length === 1 ? woData.items[0] : '';

            if (autoStyle) setValue('style', autoStyle);
            if (autoBuyer) setValue('buyer', autoBuyer);
            if (autoItem) setValue('item', autoItem);

            // Reset color dan size saat workOrder berubah
            if (formData.workOrder !== selectedWorkOrder) {
                setValue('color', '');
                setValue('size', '');
            }
        }
    }, [selectedWorkOrder, selectedWOData, setValue, formData.workOrder]);

    const onFormSubmit = (data: RegistrationFormData) => {
        // Jika ada onSubmitWithData, gunakan itu (lebih langsung dan reliable)
        if (onSubmitWithData) {
            const success = onSubmitWithData({
                workOrder: data.workOrder,
                style: data.style,
                buyer: data.buyer,
                item: data.item,
                color: data.color,
                size: data.size
            });

            if (success) {
                // Update formData di parent untuk sinkronisasi
                const fields = ['workOrder', 'style', 'buyer', 'item', 'color', 'size'] as const;
                fields.forEach(field => {
                    const event = {
                        target: { name: field, value: data[field] }
                    } as React.ChangeEvent<HTMLSelectElement>;
                    onInputChange(event);
                });
            }
            return;
        }

        // Fallback ke metode lama jika onSubmitWithData tidak tersedia
        // Update semua field formData di parent
        const fields = ['workOrder', 'style', 'buyer', 'item', 'color', 'size'] as const;
        fields.forEach(field => {
            const event = {
                target: { name: field, value: data[field] }
            } as React.ChangeEvent<HTMLSelectElement>;
            onInputChange(event);
        });

        // Tunggu sebentar untuk memastikan state ter-update, lalu trigger submit
        setTimeout(() => {
            // Buat event submit yang proper
            const formElement = document.createElement('form');
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true }) as unknown as React.FormEvent<HTMLFormElement>;
            Object.defineProperty(submitEvent, 'currentTarget', { value: formElement, enumerable: true });
            Object.defineProperty(submitEvent, 'target', { value: formElement, enumerable: true });
            Object.defineProperty(submitEvent, 'preventDefault', { value: () => { }, enumerable: true });
            Object.defineProperty(submitEvent, 'stopPropagation', { value: () => { }, enumerable: true });

            onSubmit(submitEvent);
        }, 100);
    };

    const dateDisplay = useMemo(() => {
        // Jika tidak ada filter tanggal, tampilkan "Filter Date"
        if (!dateFrom || !dateTo) {
            return 'Filter Date';
        }

        // Validasi tanggal sebelum format
        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);

        // Jika tanggal tidak valid, tampilkan "Filter Date"
        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
            return 'Filter Date';
        }

        // Jika tanggal sama, tampilkan satu tanggal
        if (dateFrom === dateTo) {
            return fromDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        }

        // Jika berbeda, tampilkan range
        return `${fromDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} - ${toDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`;
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
                            <h1 className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 text-center mb-1 xs:mb-1.5 sm:mb-2 transition-colors duration-300" style={{ textTransform: 'capitalize' }}>Register RFID</h1>
                        </div>

                        {/* Registered RFID, Update & Scan Reject Buttons - Kanan (Vertikal) */}
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
                                onClick={onUpdateClick}
                                className="px-1.5 xs:px-2 sm:px-2.5 py-1 xs:py-1.5 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 font-medium text-[9px] xs:text-[10px] sm:text-xs"
                                title="Update Data"
                            >
                                <Edit size={12} className="xs:w-[14px] xs:h-[14px] sm:w-4 sm:h-4 flex-shrink-0" />
                                <span className="font-semibold hidden sm:inline">UPDATE RFID</span>
                                <span className="font-semibold sm:hidden">UPDATE</span>
                            </button>
                            {REJECT_ENABLED && (
                                <button
                                    onClick={onRejectClick}
                                    className="px-1.5 xs:px-2 sm:px-2.5 py-1 xs:py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 font-medium text-[9px] xs:text-[10px] sm:text-xs"
                                    title="Scan Reject"
                                >
                                    <XCircle size={12} className="xs:w-[14px] xs:h-[14px] sm:w-4 sm:h-4 flex-shrink-0" />
                                    <span className="font-semibold hidden sm:inline">SCAN REJECT</span>
                                    <span className="font-semibold sm:hidden">REJECT</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Branch Selection Button - Di bawah filter tanggal, sejajar di sebelah kiri */}
                    <div className="flex items-center gap-2 mb-2 xs:mb-2.5 sm:mb-3 relative" ref={branchDropdownRef}>
                        <span className="text-[10px] xs:text-[11px] sm:text-xs font-semibold text-gray-700 whitespace-nowrap">
                            Branch:
                        </span>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                                className="px-2.5 xs:px-3 sm:px-4 py-1.5 xs:py-2 sm:py-2.5 h-8 xs:h-9 sm:h-10 bg-white border-2 border-gray-300 rounded-lg shadow-sm hover:shadow-md hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all flex items-center gap-1.5 xs:gap-2 font-medium text-[9px] xs:text-[10px] sm:text-xs text-gray-700 hover:bg-gray-50 min-w-[80px] xs:min-w-[90px] sm:min-w-[100px]"
                            >
                                <Building2 size={12} className="xs:w-[14px] xs:h-[14px] sm:w-4 sm:h-4 flex-shrink-0 text-blue-600" />
                                <span className="flex-1 text-left font-semibold">{branch}</span>
                                <ChevronDown
                                    size={12}
                                    className={`xs:w-[14px] xs:h-[14px] sm:w-4 sm:h-4 flex-shrink-0 text-gray-500 transition-transform duration-200 ${isBranchDropdownOpen ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {/* Dropdown Menu */}
                            {isBranchDropdownOpen && (
                                <div className="absolute top-full left-0 mt-1 w-full bg-white border-2 border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                                    {branchOptions.map((branchOption) => (
                                        <button
                                            key={branchOption}
                                            type="button"
                                            onClick={() => handleBranchSelect(branchOption)}
                                            className={`w-full px-3 xs:px-4 py-2 xs:py-2.5 text-left text-[9px] xs:text-[10px] sm:text-xs font-medium transition-colors flex items-center gap-2 ${branch === branchOption
                                                ? 'bg-blue-50 text-blue-700 font-semibold'
                                                : 'text-gray-700 hover:bg-gray-50'
                                                }`}
                                        >
                                            <Building2
                                                size={12}
                                                className={`xs:w-[14px] xs:h-[14px] sm:w-4 sm:h-4 flex-shrink-0 ${branch === branchOption ? 'text-blue-600' : 'text-gray-400'
                                                    }`}
                                            />
                                            <span>{branchOption}</span>
                                            {branch === branchOption && (
                                                <span className="ml-auto text-blue-600 font-bold">✓</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit(onFormSubmit)}
                    className="flex flex-col flex-1 min-h-0 overflow-y-auto"
                    noValidate
                >
                    {manualInputMode && (
                        <div className="mb-2 xs:mb-2.5 sm:mb-3 p-2 xs:p-2.5 sm:p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <p className="text-[10px] xs:text-xs sm:text-sm text-orange-800 font-medium">
                                ⚠️ Mode Input Manual: Terjadi error saat mengambil data Work Order. Silakan input data secara manual.
                            </p>
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 mb-2 xs:mb-2.5 sm:mb-3 md:mb-4">
                        {formFields.map((field) => {
                            const fieldName = field.name as keyof RegistrationFormData;
                            const fieldError = errors[fieldName];

                            return (
                                <div key={field.name} className="transition-all duration-300 flex flex-col">
                                    <label
                                        htmlFor={field.name}
                                        className={`block text-[10px] xs:text-xs sm:text-sm font-semibold text-gray-700 mb-0.5 xs:mb-1 sm:mb-1.5 transition-colors duration-300 ${focusedInput === field.name ? 'text-blue-600' : ''} ${fieldError ? 'text-red-600' : ''}`}
                                    >
                                        {field.label}
                                        {manualInputMode && (
                                            <span className="ml-1 text-[9px] text-orange-600 font-normal">(Input Manual)</span>
                                        )}
                                    </label>
                                    {manualInputMode ? (
                                        <input
                                            type="text"
                                            id={field.name}
                                            {...register(fieldName)}
                                            onFocus={() => onFocus(field.name)}
                                            onBlur={onBlur}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setValue(fieldName, value as any);
                                                onInputChange(e);
                                            }}
                                            value={formData[fieldName as keyof typeof formData] || ''}
                                            placeholder={`Masukkan ${field.label}`}
                                            className={`w-full h-8 xs:h-9 sm:h-10 md:h-11 px-2 xs:px-2.5 sm:px-3 text-[10px] xs:text-xs sm:text-sm md:text-base border-2 rounded-lg focus:ring-2 outline-none transition-all duration-300 bg-white ${fieldError
                                                ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
                                                : 'border-orange-300 focus:ring-orange-200 focus:border-orange-500 hover:border-orange-400'
                                                }`}
                                        />
                                    ) : (
                                        <select
                                            id={field.name}
                                            {...register(fieldName)}
                                            onFocus={() => onFocus(field.name)}
                                            onBlur={onBlur}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setValue(fieldName, value as any);
                                                onInputChange(e);
                                            }}
                                            disabled={field.disabled}
                                            className={`w-full h-8 xs:h-9 sm:h-10 md:h-11 px-2 xs:px-2.5 sm:px-3 text-[10px] xs:text-xs sm:text-sm md:text-base border-2 rounded-lg focus:ring-2 outline-none transition-all duration-300 bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 ${fieldError
                                                ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
                                                : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500 hover:border-blue-400'
                                                }`}
                                        >
                                            <option value="">
                                                {field.name === 'workOrder'
                                                    ? (loading ? 'Loading...' : Object.keys(workOrderData).length === 0 ? 'Tidak ada data' : 'Pilih Work Order')
                                                    : (selectedWorkOrder ? `Pilih ${field.label}` : 'Pilih Work Order dulu')
                                                }
                                            </option>
                                            {field.options.map(option => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    )}
                                    {fieldError && (
                                        <p className="mt-0.5 text-[9px] xs:text-[10px] text-red-600">{fieldError.message}</p>
                                    )}
                                </div>
                            );
                        })}
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


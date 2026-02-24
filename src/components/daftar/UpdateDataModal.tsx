import { memo } from 'react';
import { X, Edit, Radio, Loader2, ListChecks } from 'lucide-react';

interface UpdateDataModalProps {
    isOpen: boolean;
    rfidInputValue: string;
    updateFormData: {
        rfid_garment: string;
        wo: string;
        style: string;
        buyer: string;
        item: string;
        color: string;
        size: string;
    };
    isUpdating: boolean;
    isLoadingGarmentData: boolean;
    updateMessage: { type: 'success' | 'error'; text: string } | null;
    allWOs: string[];
    styles: string[];
    buyers: string[];
    items: string[];
    colors: string[];
    sizes: string[];
    woBreakdownLoading: boolean;
    updateRfidInputRef: React.RefObject<HTMLInputElement | null>;
    onClose: () => void;
    onRfidInputChange: (value: string) => void;
    onRfidKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onWOChange: (wo: string) => void;
    onStyleChange: (style: string) => void;
    onBuyerChange: (buyer: string) => void;
    onItemChange: (item: string) => void;
    onColorChange: (color: string) => void;
    onSizeChange: (size: string) => void;
    onSubmit: (e: React.FormEvent) => void;
}

const UpdateDataModal = memo(({
    isOpen,
    rfidInputValue,
    updateFormData,
    isUpdating,
    isLoadingGarmentData,
    updateMessage,
    allWOs,
    styles,
    buyers,
    items,
    colors,
    sizes,
    woBreakdownLoading,
    updateRfidInputRef,
    onClose,
    onRfidInputChange,
    onRfidKeyDown,
    onWOChange,
    onStyleChange,
    onBuyerChange,
    onItemChange,
    onColorChange,
    onSizeChange,
    onSubmit,
}: UpdateDataModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-purple-600 p-4 sm:p-6 flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Edit className="text-white" size={24} strokeWidth={2.5} />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                                Update Data Garment
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white hover:bg-white/30"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <form onSubmit={onSubmit} className="p-4 sm:p-6 space-y-4">
                    {updateMessage && (
                        <div className={`p-3 rounded-lg flex items-center gap-2 ${updateMessage.type === 'success'
                            ? 'bg-green-50 border border-green-200 text-green-800'
                            : 'bg-red-50 border border-red-200 text-red-800'
                            }`}>
                            {updateMessage.type === 'success' ? (
                                <ListChecks className="w-5 h-5 text-green-600" />
                            ) : (
                                <X className="w-5 h-5 text-red-600" />
                            )}
                            <span className="text-sm font-medium">{updateMessage.text}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            RFID Garment <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Radio className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500" />
                            <input
                                ref={updateRfidInputRef}
                                type="text"
                                value={rfidInputValue}
                                onChange={(e) => onRfidInputChange(e.target.value)}
                                onKeyDown={onRfidKeyDown}
                                placeholder="Scan atau ketik RFID Garment, lalu tekan Enter..."
                                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-purple-300 rounded-lg text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 font-mono text-base"
                                required
                                disabled={isUpdating || isLoadingGarmentData}
                            />
                            {isLoadingGarmentData && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500 animate-spin" />
                            )}
                        </div>
                        {isLoadingGarmentData && (
                            <p className="text-xs text-purple-600 mt-1">Memuat data garment...</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Work Order (WO)
                            </label>
                            <select
                                value={updateFormData.wo}
                                onChange={(e) => onWOChange(e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white"
                                disabled={isUpdating || woBreakdownLoading}
                            >
                                <option value="">Pilih WO...</option>
                                {allWOs.map((wo) => (
                                    <option key={wo} value={wo}>
                                        {wo}
                                    </option>
                                ))}
                                {/* Tambahkan option jika value tidak ada di list (untuk auto-fill) */}
                                {updateFormData.wo && !allWOs.some(wo => String(wo).trim() === String(updateFormData.wo).trim()) && (
                                    <option value={updateFormData.wo}>
                                        {updateFormData.wo}
                                    </option>
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Style
                            </label>
                            <select
                                value={updateFormData.style}
                                onChange={(e) => onStyleChange(e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white"
                                disabled={isUpdating || woBreakdownLoading}
                            >
                                <option value="">Pilih Style...</option>
                                {styles.map((style) => (
                                    <option key={style} value={style}>
                                        {style}
                                    </option>
                                ))}
                                {/* Tambahkan option jika value tidak ada di list (untuk auto-fill) */}
                                {updateFormData.style && !styles.some(style => String(style).trim() === String(updateFormData.style).trim()) && (
                                    <option value={updateFormData.style}>
                                        {updateFormData.style}
                                    </option>
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Buyer
                            </label>
                            <select
                                value={updateFormData.buyer}
                                onChange={(e) => onBuyerChange(e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white"
                                disabled={isUpdating || woBreakdownLoading}
                            >
                                <option value="">Pilih Buyer...</option>
                                {buyers.map((buyer) => (
                                    <option key={buyer} value={buyer}>
                                        {buyer}
                                    </option>
                                ))}
                                {/* Tambahkan option jika value tidak ada di list (untuk auto-fill) */}
                                {updateFormData.buyer && !buyers.some(buyer => String(buyer).trim() === String(updateFormData.buyer).trim()) && (
                                    <option value={updateFormData.buyer}>
                                        {updateFormData.buyer}
                                    </option>
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Item
                            </label>
                            <select
                                value={updateFormData.item}
                                onChange={(e) => onItemChange(e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white"
                                disabled={isUpdating || woBreakdownLoading}
                            >
                                <option value="">Pilih Item...</option>
                                {items.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
                                    </option>
                                ))}
                                {/* Tambahkan option jika value tidak ada di list (untuk auto-fill) */}
                                {updateFormData.item && !items.some(item => String(item).trim() === String(updateFormData.item).trim()) && (
                                    <option value={updateFormData.item}>
                                        {updateFormData.item}
                                    </option>
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Color
                            </label>
                            <select
                                value={updateFormData.color}
                                onChange={(e) => onColorChange(e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white"
                                disabled={isUpdating || woBreakdownLoading}
                            >
                                <option value="">Pilih Color...</option>
                                {colors.map((color) => (
                                    <option key={color} value={color}>
                                        {color}
                                    </option>
                                ))}
                                {/* Tambahkan option jika value tidak ada di list (untuk auto-fill) */}
                                {updateFormData.color && !colors.some(color => String(color).trim() === String(updateFormData.color).trim()) && (
                                    <option value={updateFormData.color}>
                                        {updateFormData.color}
                                    </option>
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Size
                            </label>
                            <select
                                value={updateFormData.size}
                                onChange={(e) => onSizeChange(e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white"
                                disabled={isUpdating || woBreakdownLoading}
                            >
                                <option value="">Pilih Size...</option>
                                {sizes.map((size) => (
                                    <option key={size} value={size}>
                                        {size}
                                    </option>
                                ))}
                                {/* Tambahkan option jika value tidak ada di list (untuk auto-fill) */}
                                {updateFormData.size && !sizes.some(size => String(size).trim() === String(updateFormData.size).trim()) && (
                                    <option value={updateFormData.size}>
                                        {updateFormData.size}
                                    </option>
                                )}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium text-sm transition-colors"
                            disabled={isUpdating}
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                            disabled={isUpdating || !updateFormData.rfid_garment.trim()}
                        >
                            {isUpdating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Memproses...</span>
                                </>
                            ) : (
                                <>
                                    <Edit className="w-4 h-4" />
                                    <span>Update Data</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
});

UpdateDataModal.displayName = 'UpdateDataModal';

export default UpdateDataModal;


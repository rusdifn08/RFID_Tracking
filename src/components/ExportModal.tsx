import { useState } from 'react';
import { X, FileSpreadsheet, Download, Calendar } from 'lucide-react';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (format: 'excel' | 'csv') => void;
    lineId?: string;
}

export default function ExportModal({ isOpen, onClose, onExport, lineId = '1' }: ExportModalProps) {
    const [selectedFormat, setSelectedFormat] = useState<'excel' | 'csv'>('excel');
    const [isExporting, setIsExporting] = useState(false);

    if (!isOpen) return null;

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await onExport(selectedFormat);
            // Tunggu sedikit untuk memastikan file sudah terdownload
            setTimeout(() => {
                setIsExporting(false);
                onClose();
            }, 1500);
        } catch (error) {
            console.error('Export error:', error);
            setIsExporting(false);
            alert('Terjadi error saat export. Silakan coba lagi.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 transform transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                            <FileSpreadsheet className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Export Data</h2>
                            <p className="text-sm text-gray-500">Pilih format export yang diinginkan</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Format Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                            Format Export
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setSelectedFormat('excel')}
                                className={`p-4 rounded-xl border-2 transition-all ${selectedFormat === 'excel'
                                        ? 'border-blue-500 bg-blue-50 shadow-md'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <FileSpreadsheet className={`w-8 h-8 mx-auto mb-2 ${selectedFormat === 'excel' ? 'text-blue-600' : 'text-gray-400'
                                    }`} />
                                <div className={`font-semibold ${selectedFormat === 'excel' ? 'text-blue-600' : 'text-gray-600'
                                    }`}>
                                    Excel (.xlsx)
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Format profesional
                                </div>
                            </button>
                            <button
                                onClick={() => setSelectedFormat('csv')}
                                className={`p-4 rounded-xl border-2 transition-all ${selectedFormat === 'csv'
                                        ? 'border-blue-500 bg-blue-50 shadow-md'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <FileSpreadsheet className={`w-8 h-8 mx-auto mb-2 ${selectedFormat === 'csv' ? 'text-blue-600' : 'text-gray-400'
                                    }`} />
                                <div className={`font-semibold ${selectedFormat === 'csv' ? 'text-blue-600' : 'text-gray-600'
                                    }`}>
                                    CSV (.csv)
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Format sederhana
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start gap-3">
                            <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                            <div className="flex-1">
                                <div className="text-sm font-semibold text-gray-700 mb-1">
                                    Informasi Export
                                </div>
                                <div className="text-xs text-gray-600 space-y-1">
                                    <div>• Line: {lineId}</div>
                                    <div>• Format: {selectedFormat === 'excel' ? 'Excel (.xlsx)' : 'CSV (.csv)'}</div>
                                    <div>• Nama file akan otomatis dibuat</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                        disabled={isExporting}
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isExporting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Mengekspor...</span>
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                <span>Export</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

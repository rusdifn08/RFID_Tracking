import { useState } from 'react';
import { X, FileSpreadsheet, Download, Calendar, Table2 } from 'lucide-react';

export type ExportType = 'all' | 'daily' | 'summary' | 'detail';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (format: 'excel' | 'csv', exportType: ExportType) => void;
    lineId?: string;
}

export default function ExportModal({ isOpen, onClose, onExport, lineId = '1' }: ExportModalProps) {
    const [selectedFormat, setSelectedFormat] = useState<'excel' | 'csv'>('excel');
    const [selectedExportType, setSelectedExportType] = useState<ExportType>('all');
    const [isExporting, setIsExporting] = useState(false);

    if (!isOpen) return null;

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await onExport(selectedFormat, selectedExportType);
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

    const exportTypeOptions = [
        {
            id: 'all' as ExportType,
            title: 'Semua Data',
            description: 'Data yang ditampilkan di dashboard (default)',
            icon: Table2,
            color: 'blue'
        },
        {
            id: 'daily' as ExportType,
            title: 'Data Per Hari',
            description: 'Data disusun per hari (setiap baris = 1 hari)',
            icon: Calendar,
            color: 'green'
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 xs:p-3 sm:p-4">
            <div className="bg-white rounded-lg xs:rounded-xl shadow-2xl w-full max-w-md mx-2 xs:mx-4 transform transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-2 xs:p-3 sm:p-4 border-b border-gray-200">
                    <div className="flex items-center gap-1.5 xs:gap-2 flex-1 min-w-0">
                        <div className="p-1 xs:p-1.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex-shrink-0">
                            <FileSpreadsheet className="w-4 xs:w-4.5 sm:w-5 h-4 xs:h-4.5 sm:h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm xs:text-base sm:text-lg font-bold text-gray-800">Export Data</h2>
                            <p className="text-[10px] xs:text-xs text-gray-500">Pilih format export yang diinginkan</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 xs:p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-2 xs:p-3 sm:p-4 space-y-3 xs:space-y-3.5 sm:space-y-4">
                    {/* Export Type Selection */}
                    <div>
                        <label className="block text-[10px] xs:text-xs font-semibold text-gray-700 mb-1.5 xs:mb-2">
                            Pilih Tipe Export
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 xs:gap-2">
                            {exportTypeOptions.map((option) => {
                                const IconComponent = option.icon;
                                const isSelected = selectedExportType === option.id;
                                const colorClasses = {
                                    blue: isSelected ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-600 hover:border-gray-300',
                                    green: isSelected ? 'border-green-500 bg-green-50 text-green-600' : 'border-gray-200 text-gray-600 hover:border-gray-300',
                                    purple: isSelected ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-gray-200 text-gray-600 hover:border-gray-300',
                                    orange: isSelected ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-600 hover:border-gray-300',
                                };
                                
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => setSelectedExportType(option.id)}
                                        className={`p-2 xs:p-2.5 rounded-lg border-2 transition-all ${colorClasses[option.color as keyof typeof colorClasses]} ${isSelected ? 'shadow-sm' : ''}`}
                                    >
                                        <IconComponent className={`w-4 xs:w-4.5 sm:w-5 h-4 xs:h-4.5 sm:h-5 mx-auto mb-0.5 xs:mb-1 ${isSelected ? '' : 'opacity-50'}`} />
                                        <div className={`font-semibold text-[10px] xs:text-xs`}>
                                            {option.title}
                                        </div>
                                        <div className="text-[9px] xs:text-[10px] text-gray-500 mt-0.5 leading-tight">
                                            {option.description}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Format Selection */}
                    <div>
                        <label className="block text-[10px] xs:text-xs font-semibold text-gray-700 mb-1.5 xs:mb-2">
                            Format Export
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 xs:gap-2">
                            <button
                                onClick={() => setSelectedFormat('excel')}
                                className={`p-2 xs:p-2.5 rounded-lg border-2 transition-all ${selectedFormat === 'excel'
                                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <FileSpreadsheet className={`w-5 xs:w-5.5 sm:w-6 h-5 xs:h-5.5 sm:h-6 mx-auto mb-0.5 xs:mb-1 ${selectedFormat === 'excel' ? 'text-blue-600' : 'text-gray-400'
                                    }`} />
                                <div className={`font-semibold text-[10px] xs:text-xs ${selectedFormat === 'excel' ? 'text-blue-600' : 'text-gray-600'
                                    }`}>
                                    Excel (.xlsx)
                                </div>
                                <div className="text-[9px] xs:text-[10px] text-gray-500 mt-0.5">
                                    Format profesional
                                </div>
                            </button>
                            <button
                                onClick={() => setSelectedFormat('csv')}
                                className={`p-2 xs:p-2.5 rounded-lg border-2 transition-all ${selectedFormat === 'csv'
                                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <FileSpreadsheet className={`w-5 xs:w-5.5 sm:w-6 h-5 xs:h-5.5 sm:h-6 mx-auto mb-0.5 xs:mb-1 ${selectedFormat === 'csv' ? 'text-blue-600' : 'text-gray-400'
                                    }`} />
                                <div className={`font-semibold text-[10px] xs:text-xs ${selectedFormat === 'csv' ? 'text-blue-600' : 'text-gray-600'
                                    }`}>
                                    CSV (.csv)
                                </div>
                                <div className="text-[9px] xs:text-[10px] text-gray-500 mt-0.5">
                                    Format sederhana
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="bg-gray-50 rounded-lg p-2 xs:p-2.5 sm:p-3 border border-gray-200">
                        <div className="flex items-start gap-1.5 xs:gap-2">
                            <Calendar className="w-3.5 xs:w-4 h-3.5 xs:h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <div className="text-[10px] xs:text-xs font-semibold text-gray-700 mb-0.5 xs:mb-1">
                                    Informasi Export
                                </div>
                                <div className="text-[9px] xs:text-[10px] text-gray-600 space-y-0.5">
                                    <div>• Line: {lineId}</div>
                                    <div>• Format: {selectedFormat === 'excel' ? 'Excel (.xlsx)' : 'CSV (.csv)'}</div>
                                    <div>• Nama file akan otomatis dibuat</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-1.5 xs:gap-2 p-2 xs:p-3 sm:p-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-3 xs:px-4 py-1.5 xs:py-2 text-[10px] xs:text-xs sm:text-sm text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                        disabled={isExporting}
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="px-4 xs:px-5 py-1.5 xs:py-2 text-[10px] xs:text-xs sm:text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 xs:gap-2"
                    >
                        {isExporting ? (
                            <>
                                <div className="w-3 xs:w-3.5 h-3 xs:h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Mengekspor...</span>
                            </>
                        ) : (
                            <>
                                <Download className="w-3 xs:w-3.5 h-3 xs:h-3.5" />
                                <span>Export</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

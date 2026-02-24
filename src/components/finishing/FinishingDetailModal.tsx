import { memo } from 'react';
import { X, Search, AlertTriangle, Box, CheckCircle2 } from 'lucide-react';

export type FinishingMetricType = 'waiting' | 'checkin' | 'checkout';
export type FinishingSection = 'dryroom' | 'folding' | 'all';

interface FinishingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: FinishingMetricType;
  section: FinishingSection;
  title?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  totalData?: number;
  filteredData?: number;
  isLoading?: boolean;
  children?: React.ReactNode;
}

const getTypeConfig = (type: FinishingMetricType) => {
  switch (type) {
    case 'waiting':
      return {
        icon: AlertTriangle,
        label: 'Waiting',
        gradient: 'from-orange-600 via-orange-700 to-orange-600',
        iconBg: 'bg-orange-50',
        iconColor: 'text-orange-500',
      };
    case 'checkin':
      return {
        icon: Box,
        label: 'Check In',
        gradient: 'from-sky-600 via-sky-700 to-sky-600',
        iconBg: 'bg-sky-50',
        iconColor: 'text-sky-500',
      };
    case 'checkout':
      return {
        icon: CheckCircle2,
        label: 'Check Out',
        gradient: 'from-emerald-600 via-emerald-700 to-emerald-600',
        iconBg: 'bg-emerald-50',
        iconColor: 'text-emerald-500',
      };
  }
};

const getSectionLabel = (section: FinishingSection) => {
  switch (section) {
    case 'dryroom':
      return 'Dryroom';
    case 'folding':
      return 'Folding';
    case 'all':
      return 'Finishing';
  }
};

export const FinishingDetailModal = memo(({
  isOpen,
  onClose,
  type,
  section,
  title,
  searchQuery = '',
  onSearchChange,
  totalData = 0,
  filteredData,
  isLoading = false,
  children,
}: FinishingDetailModalProps) => {
  if (!isOpen) return null;

  const typeConfig = getTypeConfig(type);
  const sectionLabel = getSectionLabel(section);
  const Icon = typeConfig.icon;
  const displayTitle = title || `Detail ${typeConfig.label} ${sectionLabel}`;
  const displayTotal = filteredData !== undefined ? filteredData : totalData;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] sm:h-[90vh] overflow-hidden flex flex-col animate-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${typeConfig.gradient} p-4 sm:p-6 flex-shrink-0`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Icon className="text-white" size={24} strokeWidth={2.5} />
              </div>
              <h2
                className="text-xl sm:text-2xl font-bold text-white"
                style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}
              >
                {displayTitle}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white hover:bg-white/30"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center justify-between gap-4">
            {/* Search Form - Sebelah Kiri */}
            {onSearchChange && (
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70" size={18} />
                  <input
                    type="text"
                    placeholder="Cari RFID ID, WO, Style, Buyer, Item..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  />
                </div>
              </div>
            )}
            {/* Total Data dan Tanggal - Sebelah Kanan */}
            <div className="flex items-center gap-4">
              <div className="text-sm text-white/90 hidden sm:block" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Data hari ini ({new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })})
              </div>
              <div className="bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl px-4 py-2.5 shadow-lg">
                <div className="text-xs font-semibold text-white/90 mb-0.5">Total Data</div>
                <div className="text-2xl font-bold text-white">{displayTotal}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-blue-50/30 min-h-0 flex flex-col">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
              <div className={`w-12 h-12 border-4 ${typeConfig.iconColor} border-t-transparent rounded-full animate-spin mb-4`}></div>
              <p className="text-slate-600 font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Memuat data...
              </p>
            </div>
          ) : children ? (
            children
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 h-full min-h-[400px]">
              <div className={`p-4 ${typeConfig.iconBg} rounded-full mb-4`}>
                <Icon size={48} className={`${typeConfig.iconColor} opacity-50`} />
              </div>
              <p className="text-lg font-bold text-slate-600 mb-1" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                Tidak ada data
              </p>
              <p className="text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Tidak ada data {typeConfig.label} {sectionLabel} untuk hari ini
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

FinishingDetailModal.displayName = 'FinishingDetailModal';

import { memo, useMemo, useState, useRef, useEffect } from 'react';
import { Table as TableIcon, Filter, Search, ChevronDown, Calendar } from 'lucide-react';
import ChartCard from './ChartCard';
import excelIcon from '../../../assets/excel.png';

interface DataLineCardProps {
    lineTitle: string;
    woData: any;
    filterDateFrom: string;
    filterDateTo: string;
    filterWo: string;
    availableWOList: string[];
    onDateFromChange: (date: string) => void;
    onDateToChange: (date: string) => void;
    onWoChange: (wo: string) => void;
    onSearchClick: () => void;
    onExportClick: () => void;
}

const DataLineCard = memo(({ lineTitle, woData, filterDateFrom, filterDateTo, filterWo, availableWOList, onDateFromChange, onDateToChange, onWoChange, onSearchClick, onExportClick }: DataLineCardProps) => {
    const [showWoDropdown, setShowWoDropdown] = useState(false);
    const [woSearchTerm, setWoSearchTerm] = useState('');
    const woDropdownRef = useRef<HTMLDivElement>(null);
    const [isMobilePortrait, setIsMobilePortrait] = useState(false);

    // Jangan set default date - biarkan kosong agar default menggunakan WebSocket
    // User harus mengisi tanggal dan klik search untuk menggunakan filter tanggal

    // Detect mobile portrait mode
    useEffect(() => {
        const checkMobilePortrait = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            // Mobile portrait: width < 768px dan height > width
            setIsMobilePortrait(width < 768 && height > width);
        };

        checkMobilePortrait();
        window.addEventListener('resize', checkMobilePortrait);
        window.addEventListener('orientationchange', checkMobilePortrait);

        return () => {
            window.removeEventListener('resize', checkMobilePortrait);
            window.removeEventListener('orientationchange', checkMobilePortrait);
        };
    }, []);

    // Filter WO list berdasarkan search term
    const filteredWOList = useMemo(() => {
        if (!woSearchTerm) return availableWOList;
        return availableWOList.filter(wo =>
            wo.toLowerCase().includes(woSearchTerm.toLowerCase())
        );
    }, [availableWOList, woSearchTerm]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (woDropdownRef.current && !woDropdownRef.current.contains(event.target as Node)) {
                setShowWoDropdown(false);
                setWoSearchTerm('');
            }
        };

        if (showWoDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showWoDropdown]);
    // Data untuk desktop: 3 kolom x 2 baris
    const dataRowsDesktop = [
        [
            { label: 'WO', value: woData?.wo },
            { label: 'Style', value: woData?.style },
            { label: 'Size', value: woData?.size }
        ],
        [
            { label: 'Buyer', value: woData?.buyer },
            { label: 'Item', value: woData?.item },
            { label: 'Color', value: woData?.color }
        ]
    ];

    // Data untuk mobile portrait: 2 kolom x 3 baris
    const dataRowsMobile = [
        [
            { label: 'WO', value: woData?.wo },
            { label: 'Style', value: woData?.style }
        ],
        [
            { label: 'Size', value: woData?.size },
            { label: 'Buyer', value: woData?.buyer }
        ],
        [
            { label: 'Item', value: woData?.item },
            { label: 'Color', value: woData?.color }
        ]
    ];

    // Format lineTitle: ubah "LINE 5" menjadi "Line 5"
    const formattedLineTitle = useMemo(() => {
        if (!lineTitle) return '';
        // Jika mengandung "LINE", ubah menjadi "Line"
        return lineTitle.replace(/LINE/gi, 'Line');
    }, [lineTitle]);

    return (
        <ChartCard
            title={
                <>
                    <h2 className="font-semibold text-gray-700 tracking-tight group-hover:text-blue-600 transition-colors flex-1 min-w-0" style={{ textTransform: 'capitalize', fontSize: 'clamp(0.875rem, 1.2vw + 0.5rem, 1.125rem)', fontWeight: 600 }}>{`Data ${formattedLineTitle}`}</h2>
                    <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-1.5 md:gap-2 ml-auto">
                        {/* Date Filter - Input Langsung */}
                        <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2">
                            {isMobilePortrait ? (
                                <>
                                    {/* Mobile Portrait: Tombol kotak dengan icon calendar */}
                                    <label className="relative">
                                        <input
                                            type="date"
                                            value={filterDateFrom || new Date().toISOString().split('T')[0]}
                                            onChange={(e) => onDateFromChange(e.target.value)}
                                            className="absolute opacity-0 w-0 h-0"
                                        />
                                        <div className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center cursor-pointer hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 shadow-sm">
                                            <Calendar className="text-blue-600" size={16} strokeWidth={2.5} />
                                        </div>
                                    </label>
                                    <span className="text-blue-400 font-medium text-xs sm:text-sm">-</span>
                                    <label className="relative">
                                        <input
                                            type="date"
                                            value={filterDateTo || new Date().toISOString().split('T')[0]}
                                            onChange={(e) => onDateToChange(e.target.value)}
                                            className="absolute opacity-0 w-0 h-0"
                                        />
                                        <div className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center cursor-pointer hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 shadow-sm">
                                            <Calendar className="text-blue-600" size={16} strokeWidth={2.5} />
                                        </div>
                                    </label>
                                </>
                            ) : (
                                <>
                                    {/* Desktop/Tablet: Input date normal */}
                                    <input
                                        type="date"
                                        value={filterDateFrom}
                                        onChange={(e) => onDateFromChange(e.target.value)}
                                        className="px-2.5 py-1.5 xs:px-3 xs:py-2 sm:px-3.5 sm:py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 text-xs sm:text-sm text-blue-700 placeholder-blue-300"
                                        style={{
                                            fontFamily: 'Poppins, sans-serif',
                                            width: 'clamp(90px, 10vw, 130px)',
                                            maxWidth: '130px'
                                        }}
                                    />
                                    <span className="text-blue-400 font-medium text-xs sm:text-sm">-</span>
                                    <input
                                        type="date"
                                        value={filterDateTo}
                                        onChange={(e) => onDateToChange(e.target.value)}
                                        className="px-2.5 py-1.5 xs:px-3 xs:py-2 sm:px-3.5 sm:py-2 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 text-xs sm:text-sm text-blue-700 placeholder-blue-300"
                                        style={{
                                            fontFamily: 'Poppins, sans-serif',
                                            width: 'clamp(90px, 10vw, 130px)',
                                            maxWidth: '130px'
                                        }}
                                    />
                                </>
                            )}
                            <button
                                onClick={() => {
                                    // Trigger search/apply filter - aktifkan filter tanggal
                                    onSearchClick();
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-1.5 xs:p-2 flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200"
                                title="Search"
                            >
                                <Search
                                    className="flex-shrink-0 text-white"
                                    style={{
                                        width: 'clamp(1rem, 2vw, 1.25rem)',
                                        height: 'clamp(1rem, 2vw, 1.25rem)'
                                    }}
                                    strokeWidth={2.5}
                                />
                            </button>
                        </div>
                        {/* WO Filter - Dropdown */}
                        <div className="relative" ref={woDropdownRef}>
                            <button
                                onClick={() => setShowWoDropdown(!showWoDropdown)}
                                className="bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 hover:text-blue-800 rounded-lg border border-blue-200 hover:border-blue-300 flex items-center gap-1 xs:gap-1.5 sm:gap-2 justify-center shadow-sm hover:shadow-md transition-all duration-300 ease-in-out group relative overflow-hidden"
                                title="Filter WO"
                                style={{
                                    fontFamily: 'Poppins, sans-serif',
                                    fontWeight: 500,
                                    fontSize: 'clamp(0.5rem, 1vw, 0.7rem)',
                                    padding: '0.2rem 0.5rem',
                                    minHeight: '2rem',
                                    minWidth: '2rem',
                                    width: 'clamp(2rem, 12vw, 8rem)'
                                }}
                            >
                                <Filter
                                    className="flex-shrink-0 text-blue-600"
                                    style={{
                                        width: 'clamp(1.5rem, 3vw, 1.5rem)',
                                        height: 'clamp(1.5rem, 3vw, 1.5rem)',
                                        minWidth: '1.5rem',
                                        minHeight: '1.5rem'
                                    }}
                                    strokeWidth={2}
                                />
                                <span className="whitespace-nowrap hidden sm:inline">Filter WO</span>
                                <ChevronDown
                                    className={`flex-shrink-0 text-blue-600 transition-transform duration-200 ${showWoDropdown ? 'rotate-180' : ''}`}
                                    style={{
                                        width: 'clamp(1rem, 2vw, 1.25rem)',
                                        height: 'clamp(1rem, 2vw, 1.25rem)'
                                    }}
                                    strokeWidth={2}
                                />
                            </button>
                            {/* Dropdown List */}
                            {showWoDropdown && (
                                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto min-w-[200px]">
                                    <div className="p-2 sticky top-0 bg-white border-b border-gray-200">
                                        <input
                                            type="text"
                                            placeholder="Cari WO..."
                                            value={woSearchTerm}
                                            onChange={(e) => setWoSearchTerm(e.target.value)}
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                        <button
                                            onClick={() => {
                                                onWoChange('');
                                                setShowWoDropdown(false);
                                                setWoSearchTerm('');
                                            }}
                                            className={`w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-blue-50 transition-colors ${!filterWo ? 'bg-blue-100 font-semibold' : ''}`}
                                        >
                                            All WO
                                        </button>
                                        {filteredWOList.length > 0 ? (
                                            filteredWOList.map((wo) => (
                                                <button
                                                    key={wo}
                                                    onClick={() => {
                                                        onWoChange(wo);
                                                        setShowWoDropdown(false);
                                                        setWoSearchTerm('');
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-blue-50 transition-colors ${filterWo === wo ? 'bg-blue-100 font-semibold' : ''}`}
                                                >
                                                    {wo}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-3 py-2 text-xs sm:text-sm text-gray-500 text-center">
                                                Tidak ada WO ditemukan
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={onExportClick}
                            className="bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 text-green-700 hover:text-green-800 rounded-lg border border-green-200 hover:border-green-300 shadow-sm hover:shadow-md transition-all duration-300 ease-in-out group relative flex items-center justify-center"
                            title="Export Excel"
                            style={{
                                padding: '0.2rem',
                                minWidth: '2rem',
                                minHeight: '2rem'
                            }}
                        >
                            <img
                                src={excelIcon}
                                alt="Export Excel"
                                className="flex-shrink-0 object-contain"
                                style={{
                                    width: '1.5rem',
                                    height: '1.5rem'
                                }}
                            />
                        </button>
                    </div>
                </>
            }
            icon={TableIcon}
            className="h-full w-full"
        >
            <div className="w-full h-full overflow-hidden p-0 xs:p-0 sm:p-0.5 md:p-1 flex flex-col">
                {woData ? (
                    <>
                        {/* Desktop: 3 kolom x 2 baris */}
                        <div className="hidden md:flex w-full h-full flex-col gap-0 xs:gap-0 sm:gap-0.5 md:gap-1">
                            {dataRowsDesktop.map((row, rowIdx) => (
                                <div key={rowIdx} className="grid grid-cols-3 gap-0 xs:gap-0 sm:gap-0.5 md:gap-1 flex-1 min-h-0">
                                    {row.map((item, idx) => (
                                        <div key={idx} className="group relative overflow-hidden bg-white rounded-lg border border-blue-500 p-0 xs:p-0 sm:p-0.5 md:p-1 flex flex-col items-center justify-center gap-0 xs:gap-0 sm:gap-0.5 md:gap-0.75 transition-all duration-300 hover:shadow-sm h-full min-h-0">
                                            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 via-blue-400 to-amber-400"></div>
                                            <div className="w-full text-center px-0.5 flex flex-col items-center justify-center gap-0 xs:gap-0 sm:gap-0.5 md:gap-0.75 h-full min-h-0">
                                                <span
                                                    className="font-medium text-blue-600 tracking-widest group-hover:text-blue-800 transition-colors delay-75 flex-shrink-0"
                                                    style={{
                                                        textTransform: 'capitalize',
                                                        fontSize: 'clamp(0.5rem, 0.8vw + 0.2rem, 1rem)'
                                                    }}
                                                >
                                                    {item.label}
                                                </span>
                                                <span
                                                    className="font-medium text-slate-700 group-hover:text-slate-900 transition-colors truncate block w-full text-center"
                                                    style={{
                                                        fontSize: 'clamp(0.5rem, 0.8vw + 0.2rem, 1rem)',
                                                        lineHeight: '1.1'
                                                    }}
                                                    title={item.value || '-'}
                                                >
                                                    {item.value || '-'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                        {/* Mobile Portrait: 2 kolom x 3 baris */}
                        <div className="flex md:hidden w-full h-full flex-col gap-0 xs:gap-0 sm:gap-0.5">
                            {dataRowsMobile.map((row, rowIdx) => (
                                <div key={rowIdx} className="grid grid-cols-2 gap-0 xs:gap-0 sm:gap-0.5 flex-1 min-h-0">
                                    {row.map((item, idx) => (
                                        <div key={idx} className="group relative overflow-hidden bg-white rounded-lg border border-blue-500 p-0 xs:p-0 sm:p-0.5 flex flex-col items-center justify-center gap-0 xs:gap-0 sm:gap-0.5 transition-all duration-300 hover:shadow-sm h-full min-h-0">
                                            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 via-blue-400 to-amber-400"></div>
                                            <div className="w-full text-center px-0.5 flex flex-col items-center justify-center gap-0 xs:gap-0 sm:gap-0.5 h-full min-h-0">
                                                <span className="text-[10px] xs:text-[11px] sm:text-[12px] font-medium text-blue-600 tracking-widest group-hover:text-blue-800 transition-colors delay-75 flex-shrink-0" style={{ textTransform: 'capitalize' }}>{item.label}</span>
                                                <span className="font-medium text-slate-700 group-hover:text-slate-900 transition-colors truncate block w-full text-center" style={{ fontSize: 'clamp(0.5rem, 1.2vw + 0.2rem, 0.875rem)', lineHeight: '1.1' }} title={item.value || '-'}>
                                                    {item.value || '-'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-1 xs:gap-1.5 sm:gap-2 text-slate-400 animate-pulse">
                        <div className="w-8 xs:w-10 sm:w-12 md:w-14 h-8 xs:h-10 sm:h-12 md:h-14 rounded-full bg-slate-100 flex items-center justify-center">
                            <TableIcon size={16} className="xs:w-[18px] xs:h-[18px] sm:w-[20px] sm:h-[20px] md:w-[24px] md:h-[24px] opacity-50" />
                        </div>
                        <span className="text-[10px] xs:text-xs sm:text-sm md:text-base font-medium">Menunggu Data...</span>
                    </div>
                )}
            </div>
        </ChartCard>
    );
});

DataLineCard.displayName = 'DataLineCard';

export default DataLineCard;


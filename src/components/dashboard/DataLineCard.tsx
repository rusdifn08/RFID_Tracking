import { memo } from 'react';
import { Table as TableIcon, Calendar, Filter } from 'lucide-react';
import ChartCard from './ChartCard';
import exportExcelIcon from '../../assets/export_excel.svg';

interface DataLineCardProps {
    lineTitle: string;
    woData: any;
    onDateFilterClick: () => void;
    onExportClick: () => void;
    onWoFilterClick: () => void;
}

const DataLineCard = memo(({ lineTitle, woData, onDateFilterClick, onExportClick, onWoFilterClick }: DataLineCardProps) => {
    const dataRows = [
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

    return (
        <ChartCard
            title={
                <>
                    <h2 className="text-[8px] xs:text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl font-extrabold text-gray-700 tracking-tight group-hover:text-blue-600 transition-colors" style={{ textTransform: 'capitalize' }}>{`Data ${lineTitle}`}</h2>
                    <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-1.5 md:gap-2 ml-auto">
                        <button
                            onClick={onDateFilterClick}
                            className="bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 hover:text-blue-800 rounded-lg border border-blue-200 hover:border-blue-300 flex items-center gap-1 xs:gap-1.5 sm:gap-2 justify-center shadow-sm hover:shadow-md transition-all duration-300 ease-in-out group relative overflow-hidden"
                            title="Filter Tanggal"
                            style={{ 
                                fontFamily: 'Poppins, sans-serif',
                                fontWeight: 500,
                                fontSize: 'clamp(0.5rem, 1vw, 0.7rem)',
                                padding: '0.2rem',
                                minHeight: '2rem',
                                minWidth: '2rem',
                                width: 'clamp(2rem, 12vw, 8rem)'
                            }}
                        >
                            <Calendar 
                                className="flex-shrink-0" 
                                style={{ 
                                    width: 'clamp(1.5rem, 3vw, 1.5rem)', 
                                    height: 'clamp(1.5rem, 3vw, 1.5rem)',
                                    minWidth: '1.5rem',
                                    minHeight: '1.5rem'
                                }} 
                                strokeWidth={2} 
                            />
                            <span className="whitespace-nowrap hidden sm:inline">
                                {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                        </button>
                        <button
                            onClick={onWoFilterClick}
                            className="bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 text-purple-700 hover:text-purple-800 rounded-lg border border-purple-200 hover:border-purple-300 flex items-center gap-1 xs:gap-1.5 sm:gap-2 justify-center shadow-sm hover:shadow-md transition-all duration-300 ease-in-out group relative overflow-hidden"
                            title="Filter WO"
                            style={{ 
                                fontFamily: 'Poppins, sans-serif',
                                fontWeight: 500,
                                fontSize: 'clamp(0.5rem, 1vw, 0.7rem)',
                                padding: '0.2rem',
                                minHeight: '2rem',
                                minWidth: '2rem',
                                width: 'clamp(2rem, 12vw, 8rem)'
                            }}
                        >
                            <Filter 
                                className="flex-shrink-0" 
                                style={{ 
                                    width: 'clamp(1.5rem, 3vw, 1.5rem)', 
                                    height: 'clamp(1.5rem, 3vw, 1.5rem)',
                                    minWidth: '1.5rem',
                                    minHeight: '1.5rem'
                                }} 
                                strokeWidth={2} 
                            />
                            <span className="whitespace-nowrap hidden sm:inline">Filter WO</span>
                        </button>
                        <button
                            onClick={onExportClick}
                            className="bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 group relative flex items-center justify-center"
                            title="Export Excel"
                            style={{ 
                                padding: '0.2rem',
                                minWidth: '2rem',
                                minHeight: '2rem'
                            }}
                        >
                            <img 
                                src={exportExcelIcon} 
                                alt="Export Excel" 
                                className="flex-shrink-0"
                                style={{ 
                                    filter: 'brightness(0) invert(1)',
                                    width: '1.5rem',
                                    height: '1.5rem'
                                }}
                            />
                        </button>
                    </div>
                </>
            }
            icon={TableIcon}
            className="lg:col-span-2"
        >
            <div className="w-full h-full overflow-hidden p-0.5 xs:p-0.5 sm:p-1 md:p-1.5 flex items-center justify-center">
                {woData ? (
                    <div className="w-full h-full flex flex-col justify-center gap-0.5 xs:gap-0.5 sm:gap-1 md:gap-1.5">
                        {dataRows.map((row, rowIdx) => (
                            <div key={rowIdx} className="grid grid-cols-3 gap-0.5 xs:gap-0.5 sm:gap-1 md:gap-1.5">
                                {row.map((item, idx) => (
                                    <div key={idx} className="group relative overflow-hidden bg-white rounded-lg border border-blue-500 p-0.5 xs:p-0.5 sm:p-1 md:p-1.5 flex flex-col items-center justify-center gap-0.5 transition-all duration-300 hover:shadow-sm">
                                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 via-blue-400 to-amber-400"></div>
                                        <span className="text-[6px] xs:text-[7px] sm:text-[8px] md:text-[9px] font-bold text-blue-600 tracking-widest group-hover:text-blue-800 transition-colors delay-75" style={{ textTransform: 'capitalize' }}>{item.label}</span>
                                        <div className="w-full text-center px-0.5">
                                            <span className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-black text-slate-700 group-hover:text-slate-900 truncate block transition-colors" title={item.value || '-'}>
                                                {item.value || '-'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
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


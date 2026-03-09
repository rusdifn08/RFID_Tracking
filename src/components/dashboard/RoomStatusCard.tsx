import { memo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import ChartCard from './ChartCard';
import { BarChart3, XCircle, Clock } from 'lucide-react';
import dryroomIcon from '../../assets/dryroom_icon.webp';
import foldingIcon from '../../assets/folding_icon.webp';
import { DEFAULT_ROOM_STATUS_ENABLED } from './constants';
import { getFinishingDataByLine } from '../../config/api';
import RoomStatusDetailModal, { type RoomStatusType } from './RoomStatusDetailModal';
import OutputPerJamCard, { TAB_CONFIG, type OutputTab } from './OutputPerJamCard';

// Filter CSS agar icon webp tampil biru (#0284C7) sesuai tema Room Status
const iconBlueFilter = 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1000%) hue-rotate(166deg) brightness(96%) contrast(101%)';

interface RoomStatusCardProps {
    lineId?: string;
}

type ViewMode = 'room_status' | 'hourly_data';

const RoomStatusCard = memo(({ lineId }: RoomStatusCardProps) => {
    const showRoomStatus = DEFAULT_ROOM_STATUS_ENABLED;
    const [viewMode, setViewMode] = useState<ViewMode>('room_status');
    const [activeHourlyTab, setActiveHourlyTab] = useState<OutputTab>('output_sewing');
    const [detailModalRoom, setDetailModalRoom] = useState<RoomStatusType | null>(null);
    const openDetail = useCallback((room: RoomStatusType) => () => setDetailModalRoom(room), []);
    const closeDetail = useCallback(() => setDetailModalRoom(null), []);

    // Fetch finishing data per line
    const { data: finishingResponse, isLoading: isLoadingFinishing } = useQuery({
        queryKey: ['finishing-data-by-line', lineId],
        queryFn: async () => {
            if (!lineId) return null;
            const response = await getFinishingDataByLine(lineId);
            if (!response.success || !response.data) {
                throw new Error(response.error || 'Gagal mengambil data finishing');
            }
            return response.data;
        },
        enabled: !!lineId && showRoomStatus,
        refetchInterval: 30000, // Refetch setiap 30 detik
        retry: 3,
    });

    // Data dari API atau default values
    const dryroomData = finishingResponse?.dryroom || { waiting: 0, checkin: 0, checkout: 0 };
    const foldingData = finishingResponse?.folding || { waiting: 0, checkin: 0, checkout: 0 };
    const rejectRoomData = finishingResponse?.reject_room || { waiting: 0, checkin: 0, checkout: 0, reject_mati: 0 };

    if (!showRoomStatus) {
        return null;
    }

    const switchButtons = (
        <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-gray-50 p-0.5">
            <button
                type="button"
                onClick={() => setViewMode('room_status')}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                    viewMode === 'room_status' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
                Room Status
            </button>
            <button
                type="button"
                onClick={() => setViewMode('hourly_data')}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                    viewMode === 'hourly_data' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
                Hourly Data
            </button>
        </div>
    );

    const hourlyTabButtons = viewMode === 'hourly_data' && (
        <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-gray-50 p-0.5">
            {TAB_CONFIG.map((tab) => (
                <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveHourlyTab(tab.key)}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                        activeHourlyTab === tab.key ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );

    const headerAction = (
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {switchButtons}
            {hourlyTabButtons}
        </div>
    );

    if (viewMode === 'hourly_data') {
        return (
            <ChartCard
                title="Output per Jam"
                icon={Clock}
                headerAction={headerAction}
                className="w-full h-full flex flex-col border-sky-500"
            >
                <div className="flex-1 min-h-0 overflow-hidden">
                    <OutputPerJamCard
                        lineId={lineId || ''}
                        className="h-full"
                        activeTab={activeHourlyTab}
                        onTabChange={setActiveHourlyTab}
                    />
                </div>
            </ChartCard>
        );
    }

    return (
        <ChartCard
            title="Room Status"
            icon={BarChart3}
            headerAction={headerAction}
            className="w-full h-full flex flex-col border-sky-500"
        >
            <div
                className="flex flex-col h-full w-full min-h-0 overflow-hidden"
                style={{
                    gap: 'clamp(0.25rem, 0.5vw + 0.15rem, 0.5rem)',
                    padding: 'clamp(0.125rem, 0.4vw + 0.1rem, 0.375rem)'
                }}
            >
                {/* Bagian Atas: 2 grid row untuk Dryroom dan Folding - sama tinggi */}
                <div
                    className="flex-1 grid grid-cols-2 min-h-0 overflow-hidden"
                    style={{
                        flex: '1 1 50%',
                        minHeight: '0',
                        gap: 'clamp(0.375rem, 0.8vw + 0.2rem, 0.75rem)'
                    }}
                >
                    {/* Dryroom Card - clickable untuk detail mini dashboard */}
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={openDetail('dryroom')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail('dryroom')(); } }}
                        className="relative flex flex-col rounded-lg xs:rounded-xl border border-sky-500 hover:shadow-md transition-all duration-300 cursor-pointer group overflow-hidden h-full"
                        style={{
                            padding: 'clamp(0.125rem, 0.4vw + 0.1rem, 0.375rem)'
                        }}
                        title="Klik untuk detail Dryroom"
                    >
                        <div
                            className="flex items-center justify-center flex-shrink-0"
                            style={{
                                paddingTop: 'clamp(0.125rem, 0.4vw + 0.1rem, 0.375rem)',
                                gap: 'clamp(0.25rem, 0.5vw + 0.15rem, 0.5rem)',
                                marginBottom: 'clamp(0.125rem, 0.4vw + 0.1rem, 0.375rem)'
                            }}
                        >
                            <img
                                src={dryroomIcon}
                                alt=""
                                className="flex-shrink-0 object-contain"
                                style={{
                                    width: 'clamp(10px, 1.2vw + 4px, 18px)',
                                    height: 'clamp(10px, 1.2vw + 4px, 18px)',
                                    filter: iconBlueFilter
                                }}
                                aria-hidden
                            />
                            <h3 className="font-semibold tracking-tight text-gray-900 truncate" style={{
                                textTransform: 'capitalize',
                                fontSize: 'clamp(0.5rem, 0.9vw + 0.25rem, 1.25rem)',
                                fontWeight: 600
                            }}>Dryroom</h3>
                        </div>
                        {/* 3 card kecil: Waiting, In, Out - vertikal ke bawah */}
                        <div
                            className="flex-1 flex flex-col min-h-0 overflow-hidden"
                            style={{
                                gap: 'clamp(0.25rem, 0.5vw + 0.15rem, 0.5rem)'
                            }}
                        >
                            <div className="flex-1 flex flex-row items-center justify-between bg-white rounded-lg xs:rounded-xl border border-sky-300 hover:bg-sky-50/50 transition-all duration-300 cursor-pointer overflow-hidden" style={{
                                paddingTop: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingBottom: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingLeft: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                paddingRight: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                minHeight: 0
                            }}>
                                <h4 className="font-semibold tracking-widest text-gray-900 truncate flex-shrink-0" style={{
                                    textTransform: 'capitalize',
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1rem)',
                                    fontWeight: 600
                                }}>Waiting</h4>
                                <span className="font-semibold text-blue-700 flex-shrink-0" style={{
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1.25rem)',
                                    fontWeight: 600
                                }}>{isLoadingFinishing ? '...' : dryroomData.waiting.toLocaleString()}</span>
                            </div>
                            <div className="flex-1 flex flex-row items-center justify-between bg-white rounded-lg xs:rounded-xl border border-sky-300 hover:bg-sky-50/50 transition-all duration-300 cursor-pointer overflow-hidden" style={{
                                paddingTop: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingBottom: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingLeft: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                paddingRight: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                minHeight: 0
                            }}>
                                <h4 className="font-semibold tracking-widest text-gray-900 truncate flex-shrink-0" style={{
                                    textTransform: 'capitalize',
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1rem)',
                                    fontWeight: 600
                                }}>In</h4>
                                <span className="font-semibold text-blue-700 flex-shrink-0" style={{
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1.25rem)',
                                    fontWeight: 600
                                }}>{isLoadingFinishing ? '...' : dryroomData.checkin.toLocaleString()}</span>
                            </div>
                            <div className="flex-1 flex flex-row items-center justify-between bg-white rounded-lg xs:rounded-xl border border-sky-300 hover:bg-sky-50/50 transition-all duration-300 cursor-pointer overflow-hidden" style={{
                                paddingTop: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingBottom: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingLeft: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                paddingRight: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                minHeight: 0
                            }}>
                                <h4 className="font-semibold tracking-widest text-gray-900 truncate flex-shrink-0" style={{
                                    textTransform: 'capitalize',
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1rem)',
                                    fontWeight: 600
                                }}>Out</h4>
                                <span className="font-semibold text-blue-700 flex-shrink-0" style={{
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1.25rem)',
                                    fontWeight: 600
                                }}>{isLoadingFinishing ? '...' : dryroomData.checkout.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    {/* Folding Card - clickable untuk detail mini dashboard */}
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={openDetail('folding')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail('folding')(); } }}
                        className="relative flex flex-col bg-white rounded-lg xs:rounded-xl border border-sky-500 hover:shadow-md transition-all duration-300 cursor-pointer group overflow-hidden h-full"
                        style={{
                            padding: 'clamp(0.125rem, 0.4vw + 0.1rem, 0.375rem)'
                        }}
                        title="Klik untuk detail Folding"
                    >
                        <div
                            className="flex items-center justify-center flex-shrink-0"
                            style={{
                                paddingTop: 'clamp(0.125rem, 0.4vw + 0.1rem, 0.375rem)',
                                gap: 'clamp(0.25rem, 0.5vw + 0.15rem, 0.5rem)',
                                marginBottom: 'clamp(0.125rem, 0.4vw + 0.1rem, 0.375rem)'
                            }}
                        >
                            <img
                                src={foldingIcon}
                                alt=""
                                className="flex-shrink-0 object-contain"
                                style={{
                                    width: 'clamp(10px, 1.2vw + 4px, 18px)',
                                    height: 'clamp(10px, 1.2vw + 4px, 18px)',
                                    filter: iconBlueFilter
                                }}
                                aria-hidden
                            />
                            <h3 className="font-semibold tracking-tight text-gray-900 truncate" style={{
                                textTransform: 'capitalize',
                                fontSize: 'clamp(0.5rem, 0.9vw + 0.25rem, 1.25rem)',
                                fontWeight: 600
                            }}>Folding</h3>
                        </div>
                        {/* 3 card kecil: Waiting, In, Out - vertikal ke bawah */}
                        <div
                            className="flex-1 flex flex-col min-h-0 overflow-hidden"
                            style={{
                                gap: 'clamp(0.25rem, 0.5vw + 0.15rem, 0.5rem)'
                            }}
                        >
                            <div className="flex-1 flex flex-row items-center justify-between bg-white rounded-lg xs:rounded-xl border border-sky-300 hover:bg-sky-50/50 transition-all duration-300 cursor-pointer overflow-hidden" style={{
                                paddingTop: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingBottom: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingLeft: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                paddingRight: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                minHeight: 0
                            }}>
                                <h4 className="font-semibold tracking-widest text-gray-900 truncate flex-shrink-0" style={{
                                    textTransform: 'capitalize',
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1rem)',
                                    fontWeight: 600
                                }}>Waiting</h4>
                                <span className="font-semibold text-blue-700 flex-shrink-0" style={{
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1.25rem)',
                                    fontWeight: 600
                                }}>{isLoadingFinishing ? '...' : foldingData.waiting.toLocaleString()}</span>
                            </div>
                            <div className="flex-1 flex flex-row items-center justify-between bg-white rounded-lg xs:rounded-xl border border-sky-300 hover:bg-sky-50/50 transition-all duration-300 cursor-pointer overflow-hidden" style={{
                                paddingTop: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingBottom: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingLeft: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                paddingRight: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                minHeight: 0
                            }}>
                                <h4 className="font-semibold tracking-widest text-gray-900 truncate flex-shrink-0" style={{
                                    textTransform: 'capitalize',
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1rem)',
                                    fontWeight: 600
                                }}>In</h4>
                                <span className="font-semibold text-blue-700 flex-shrink-0" style={{
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1.25rem)',
                                    fontWeight: 600
                                }}>{isLoadingFinishing ? '...' : foldingData.checkin.toLocaleString()}</span>
                            </div>
                            <div className="flex-1 flex flex-row items-center justify-between bg-white rounded-lg xs:rounded-xl border border-sky-300 hover:bg-sky-50/50 transition-all duration-300 cursor-pointer overflow-hidden" style={{
                                paddingTop: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingBottom: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingLeft: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                paddingRight: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                minHeight: 0
                            }}>
                                <h4 className="font-semibold tracking-widest text-gray-900 truncate flex-shrink-0" style={{
                                    textTransform: 'capitalize',
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1rem)',
                                    fontWeight: 600
                                }}>Out</h4>
                                <span className="font-semibold text-blue-700 flex-shrink-0" style={{
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1.25rem)',
                                    fontWeight: 600
                                }}>{isLoadingFinishing ? '...' : foldingData.checkout.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Bagian Bawah: Reject Room - clickable untuk detail mini dashboard */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ flex: '1 1 50%', minHeight: '0' }}>
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={openDetail('reject_room')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail('reject_room')(); } }}
                        className="relative flex flex-col h-full bg-white rounded-lg xs:rounded-xl border border-sky-500 hover:shadow-md transition-all duration-300 cursor-pointer group overflow-hidden"
                        style={{
                            padding: 'clamp(0.125rem, 0.4vw + 0.1rem, 0.375rem)'
                        }}
                        title="Klik untuk detail Reject Room"
                    >
                        {/* Header Reject Room */}
                        <div
                            className="flex items-center justify-center flex-shrink-0"
                            style={{
                                gap: 'clamp(0.25rem, 0.5vw + 0.15rem, 0.5rem)',
                                marginBottom: 'clamp(0.125rem, 0.4vw + 0.1rem, 0.375rem)'
                            }}
                        >
                            <XCircle
                                style={{
                                    width: 'clamp(10px, 1.2vw + 4px, 18px)',
                                    height: 'clamp(10px, 1.2vw + 4px, 18px)'
                                }}
                                className="text-sky-600 flex-shrink-0"
                                strokeWidth={2.5}
                                stroke="#0284c7"
                            />
                            <h3 className="font-semibold tracking-tight text-red-700 truncate" style={{
                                textTransform: 'capitalize',
                                fontSize: 'clamp(0.5rem, 0.9vw + 0.25rem, 1.25rem)',
                                fontWeight: 600
                            }}>Reject Room</h3>
                        </div>
                        {/* 4 card kecil di dalam Reject Room */}
                        <div
                            className="flex-1 flex flex-row min-h-0 h-full overflow-hidden"
                            style={{
                                gap: 'clamp(0.25rem, 0.5vw + 0.15rem, 0.5rem)'
                            }}
                        >
                            {/* Waiting Card */}
                            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-lg xs:rounded-xl border border-red-300 hover:bg-gray-50 transition-all duration-300 cursor-pointer overflow-hidden" style={{
                                padding: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                minHeight: 0
                            }}>
                                <h4 className="font-semibold tracking-widest mb-0.5 text-red-600 text-center truncate w-full flex-shrink-0" style={{
                                    textTransform: 'capitalize',
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1rem)',
                                    fontWeight: 600
                                }}>Waiting</h4>
                                <span className="font-semibold leading-none text-red-800 text-center flex-shrink-0" style={{
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1.25rem)',
                                    fontWeight: 600
                                }}>{isLoadingFinishing ? '...' : rejectRoomData.waiting.toLocaleString()}</span>
                            </div>
                            {/* Check In Card */}
                            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-lg xs:rounded-xl border border-red-300 hover:bg-gray-50 transition-all duration-300 cursor-pointer overflow-hidden" style={{
                                padding: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                minHeight: 0
                            }}>
                                <h4 className="font-semibold tracking-widest mb-0.5 text-red-600 text-center truncate w-full flex-shrink-0" style={{
                                    textTransform: 'capitalize',
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1rem)',
                                    fontWeight: 600
                                }}>In</h4>
                                <span className="font-semibold leading-none text-red-800 text-center flex-shrink-0" style={{
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1.25rem)',
                                    fontWeight: 600
                                }}>{isLoadingFinishing ? '...' : rejectRoomData.checkin.toLocaleString()}</span>
                            </div>
                            {/* Check Out Card */}
                            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-lg xs:rounded-xl border border-red-300 hover:bg-gray-50 transition-all duration-300 cursor-pointer overflow-hidden" style={{
                                padding: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                minHeight: 0
                            }}>
                                <h4 className="font-semibold tracking-widest mb-0.5 text-red-600 text-center truncate w-full flex-shrink-0" style={{
                                    textTransform: 'capitalize',
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1rem)',
                                    fontWeight: 600
                                }}>Out</h4>
                                <span className="font-semibold leading-none text-red-800 text-center flex-shrink-0" style={{
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1.25rem)',
                                    fontWeight: 600
                                }}>{isLoadingFinishing ? '...' : rejectRoomData.checkout.toLocaleString()}</span>
                            </div>
                            {/* Reject Mati Card */}
                            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-lg xs:rounded-xl border border-red-300 hover:bg-gray-50 transition-all duration-300 cursor-pointer overflow-hidden" style={{
                                padding: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                minHeight: 0
                            }}>
                                <h4 className="font-semibold tracking-widest mb-0.5 text-red-600 text-center truncate w-full flex-shrink-0" style={{
                                    textTransform: 'capitalize',
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1rem)',
                                    fontWeight: 600
                                }}>reject</h4>
                                <span className="font-semibold leading-none text-red-800 text-center flex-shrink-0" style={{
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1.25rem)',
                                    fontWeight: 600
                                }}>{isLoadingFinishing ? '...' : rejectRoomData.reject_mati.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <RoomStatusDetailModal
                isOpen={detailModalRoom !== null}
                onClose={closeDetail}
                roomType={detailModalRoom ?? 'dryroom'}
                data={
                    detailModalRoom === 'dryroom'
                        ? dryroomData
                        : detailModalRoom === 'folding'
                            ? foldingData
                            : rejectRoomData
                }
                lineId={lineId}
            />
        </ChartCard>
    );
});

RoomStatusCard.displayName = 'RoomStatusCard';

export default RoomStatusCard;

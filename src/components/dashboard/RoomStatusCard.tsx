import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import ChartCard from './ChartCard';
import { BarChart3, Droplets, Package, XCircle } from 'lucide-react';
import { DEFAULT_ROOM_STATUS_ENABLED } from './constants';
import { getFinishingDataByLine } from '../../config/api';

interface RoomStatusCardProps {
    lineId?: string;
}

const RoomStatusCard = memo(({ lineId }: RoomStatusCardProps) => {
    const showRoomStatus = DEFAULT_ROOM_STATUS_ENABLED;

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

    return (
        <ChartCard
            title="Room Status"
            icon={BarChart3}
            className="w-full h-full flex flex-col"
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
                    {/* Dryroom Card */}
                    <div
                        className="relative flex flex-col rounded-lg xs:rounded-xl border border-blue-500 hover:shadow-md transition-all duration-300 cursor-pointer group overflow-hidden h-full"
                        style={{
                            padding: 'clamp(0.125rem, 0.4vw + 0.1rem, 0.375rem)'
                        }}
                    >
                        <div
                            className="flex items-center justify-center flex-shrink-0"
                            style={{
                                paddingTop: 'clamp(0.125rem, 0.4vw + 0.1rem, 0.375rem)',
                                gap: 'clamp(0.25rem, 0.5vw + 0.15rem, 0.5rem)',
                                marginBottom: 'clamp(0.125rem, 0.4vw + 0.1rem, 0.375rem)'
                            }}
                        >
                            <Droplets
                                style={{
                                    width: 'clamp(10px, 1.2vw + 4px, 18px)',
                                    height: 'clamp(10px, 1.2vw + 4px, 18px)'
                                }}
                                className="text-blue-600 flex-shrink-0"
                                strokeWidth={2.5}
                                stroke="#0284C7"
                            />
                            <h3 className="font-extrabold tracking-widest text-blue-600 truncate" style={{
                                textTransform: 'uppercase',
                                fontSize: 'clamp(0.5rem, 0.9vw + 0.25rem, 1.25rem)'
                            }}>Dryroom</h3>
                        </div>
                        {/* 3 card kecil: Waiting, In, Out - vertikal ke bawah */}
                        <div
                            className="flex-1 flex flex-col min-h-0 overflow-hidden"
                            style={{
                                gap: 'clamp(0.25rem, 0.5vw + 0.15rem, 0.5rem)'
                            }}
                        >
                            <div className="flex-1 flex flex-row items-center justify-between bg-white rounded-lg xs:rounded-xl border border-blue-300 hover:bg-blue-50/50 transition-all duration-300 cursor-pointer overflow-hidden" style={{
                                paddingTop: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingBottom: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingLeft: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                paddingRight: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                minHeight: 0
                            }}>
                                <h4 className="font-extrabold tracking-widest text-blue-600 truncate flex-shrink-0" style={{
                                    textTransform: 'capitalize',
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1rem)'
                                }}>Waiting</h4>
                                <span className="font-bold text-blue-900 flex-shrink-0" style={{
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1.25rem)'
                                }}>{isLoadingFinishing ? '...' : dryroomData.waiting.toLocaleString()}</span>
                            </div>
                            <div className="flex-1 flex flex-row items-center justify-between bg-white rounded-lg xs:rounded-xl border border-blue-300 hover:bg-blue-50/50 transition-all duration-300 cursor-pointer overflow-hidden" style={{
                                paddingTop: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingBottom: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingLeft: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                paddingRight: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                minHeight: 0
                            }}>
                                <h4 className="font-extrabold tracking-widest text-blue-600 truncate flex-shrink-0" style={{
                                    textTransform: 'capitalize',
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1rem)'
                                }}>In</h4>
                                <span className="font-bold text-blue-900 flex-shrink-0" style={{
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1.25rem)'
                                }}>{isLoadingFinishing ? '...' : dryroomData.checkin.toLocaleString()}</span>
                            </div>
                            <div className="flex-1 flex flex-row items-center justify-between bg-white rounded-lg xs:rounded-xl border border-blue-300 hover:bg-blue-50/50 transition-all duration-300 cursor-pointer overflow-hidden" style={{
                                paddingTop: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingBottom: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingLeft: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                paddingRight: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                minHeight: 0
                            }}>
                                <h4 className="font-extrabold tracking-widest text-blue-600 truncate flex-shrink-0" style={{
                                    textTransform: 'capitalize',
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1rem)'
                                }}>Out</h4>
                                <span className="font-bold text-blue-900 flex-shrink-0" style={{
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1.25rem)'
                                }}>{isLoadingFinishing ? '...' : dryroomData.checkout.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    {/* Folding Card */}
                    <div
                        className="relative flex flex-col bg-white rounded-lg xs:rounded-xl border border-blue-500 hover:shadow-md transition-all duration-300 cursor-pointer group overflow-hidden h-full"
                        style={{
                            padding: 'clamp(0.125rem, 0.4vw + 0.1rem, 0.375rem)'
                        }}
                    >
                        <div
                            className="flex items-center justify-center flex-shrink-0"
                            style={{
                                paddingTop: 'clamp(0.125rem, 0.4vw + 0.1rem, 0.375rem)',
                                gap: 'clamp(0.25rem, 0.5vw + 0.15rem, 0.5rem)',
                                marginBottom: 'clamp(0.125rem, 0.4vw + 0.1rem, 0.375rem)'
                            }}
                        >
                            <Package
                                style={{
                                    width: 'clamp(10px, 1.2vw + 4px, 18px)',
                                    height: 'clamp(10px, 1.2vw + 4px, 18px)'
                                }}
                                className="text-blue-600 flex-shrink-0"
                                strokeWidth={2.5}
                                stroke="#0284C7"
                            />
                            <h3 className="font-extrabold tracking-widest text-blue-600 truncate" style={{
                                textTransform: 'uppercase',
                                fontSize: 'clamp(0.5rem, 0.9vw + 0.25rem, 1.25rem)'
                            }}>Folding</h3>
                        </div>
                        {/* 3 card kecil: Waiting, In, Shipment - vertikal ke bawah */}
                        <div
                            className="flex-1 flex flex-col min-h-0 overflow-hidden"
                            style={{
                                gap: 'clamp(0.25rem, 0.5vw + 0.15rem, 0.5rem)'
                            }}
                        >
                            <div className="flex-1 flex flex-row items-center justify-between bg-white rounded-lg xs:rounded-xl border border-blue-300 hover:bg-blue-50/50 transition-all duration-300 cursor-pointer overflow-hidden" style={{
                                paddingTop: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingBottom: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingLeft: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                paddingRight: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                minHeight: 0
                            }}>
                                <h4 className="font-extrabold tracking-widest text-blue-600 truncate flex-shrink-0" style={{
                                    textTransform: 'capitalize',
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1rem)'
                                }}>Waiting</h4>
                                <span className="font-bold text-blue-900 flex-shrink-0" style={{
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1.25rem)'
                                }}>{isLoadingFinishing ? '...' : foldingData.waiting.toLocaleString()}</span>
                            </div>
                            <div className="flex-1 flex flex-row items-center justify-between bg-white rounded-lg xs:rounded-xl border border-blue-300 hover:bg-blue-50/50 transition-all duration-300 cursor-pointer overflow-hidden" style={{
                                paddingTop: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingBottom: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingLeft: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                paddingRight: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                minHeight: 0
                            }}>
                                <h4 className="font-extrabold tracking-widest text-blue-600 truncate flex-shrink-0" style={{
                                    textTransform: 'capitalize',
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1rem)'
                                }}>In</h4>
                                <span className="font-bold text-blue-900 flex-shrink-0" style={{
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1.25rem)'
                                }}>{isLoadingFinishing ? '...' : foldingData.checkin.toLocaleString()}</span>
                            </div>
                            <div className="flex-1 flex flex-row items-center justify-between bg-white rounded-lg xs:rounded-xl border border-blue-300 hover:bg-blue-50/50 transition-all duration-300 cursor-pointer overflow-hidden" style={{
                                paddingTop: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingBottom: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                paddingLeft: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                paddingRight: 'clamp(0.5rem, 1vw + 0.25rem, 1rem)',
                                minHeight: 0
                            }}>
                                <h4 className="font-extrabold tracking-widest text-blue-600 truncate flex-shrink-0" style={{
                                    textTransform: 'capitalize',
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1rem)'
                                }}>Shipment</h4>
                                <span className="font-bold text-blue-900 flex-shrink-0" style={{
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1.25rem)'
                                }}>{isLoadingFinishing ? '...' : foldingData.checkout.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Bagian Bawah: Reject Room - sama tinggi dengan bagian atas */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ flex: '1 1 50%', minHeight: '0' }}>
                    <div
                        className="relative flex flex-col h-full bg-white rounded-lg xs:rounded-xl border border-blue-500 hover:shadow-md transition-all duration-300 group overflow-hidden"
                        style={{
                            padding: 'clamp(0.125rem, 0.4vw + 0.1rem, 0.375rem)'
                        }}
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
                                className="text-blue-600 flex-shrink-0"
                                strokeWidth={2.5}
                                stroke="#0284C7"
                            />
                            <h3 className="font-extrabold tracking-widest text-blue-600 truncate" style={{
                                textTransform: 'uppercase',
                                fontSize: 'clamp(0.5rem, 0.9vw + 0.25rem, 1.25rem)'
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
                                <h4 className="font-extrabold tracking-widest mb-0.5 text-red-600 text-center truncate w-full flex-shrink-0" style={{
                                    textTransform: 'capitalize',
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1rem)'
                                }}>Waiting</h4>
                                <span className="font-bold leading-none text-red-900 text-center flex-shrink-0" style={{
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1.25rem)'
                                }}>{isLoadingFinishing ? '...' : rejectRoomData.waiting.toLocaleString()}</span>
                            </div>
                            {/* Check In Card */}
                            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-lg xs:rounded-xl border border-red-300 hover:bg-gray-50 transition-all duration-300 cursor-pointer overflow-hidden" style={{
                                padding: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                minHeight: 0
                            }}>
                                <h4 className="font-extrabold tracking-widest mb-0.5 text-red-600 text-center truncate w-full flex-shrink-0" style={{
                                    textTransform: 'capitalize',
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1rem)'
                                }}>In</h4>
                                <span className="font-bold leading-none text-red-900 text-center flex-shrink-0" style={{
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1.25rem)'
                                }}>{isLoadingFinishing ? '...' : rejectRoomData.checkin.toLocaleString()}</span>
                            </div>
                            {/* Check Out Card */}
                            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-lg xs:rounded-xl border border-red-300 hover:bg-gray-50 transition-all duration-300 cursor-pointer overflow-hidden" style={{
                                padding: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                minHeight: 0
                            }}>
                                <h4 className="font-extrabold tracking-widest mb-0.5 text-red-600 text-center truncate w-full flex-shrink-0" style={{
                                    textTransform: 'capitalize',
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1rem)'
                                }}>Out</h4>
                                <span className="font-bold leading-none text-red-900 text-center flex-shrink-0" style={{
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1.25rem)'
                                }}>{isLoadingFinishing ? '...' : rejectRoomData.checkout.toLocaleString()}</span>
                            </div>
                            {/* Reject Mati Card */}
                            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-lg xs:rounded-xl border border-red-300 hover:bg-gray-50 transition-all duration-300 cursor-pointer overflow-hidden" style={{
                                padding: 'clamp(0.25rem, 0.6vh, 0.5rem)',
                                minHeight: 0
                            }}>
                                <h4 className="font-extrabold tracking-widest mb-0.5 text-red-600 text-center truncate w-full flex-shrink-0" style={{
                                    textTransform: 'capitalize',
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1rem)'
                                }}>reject</h4>
                                <span className="font-bold leading-none text-red-900 text-center flex-shrink-0" style={{
                                    fontSize: 'clamp(0.5rem, 0.7vw + 0.2rem, 1.25rem)'
                                }}>{isLoadingFinishing ? '...' : rejectRoomData.reject_mati.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ChartCard>
    );
});

RoomStatusCard.displayName = 'RoomStatusCard';

export default RoomStatusCard;

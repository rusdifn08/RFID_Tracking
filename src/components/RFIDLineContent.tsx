import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, User, Sun, Moon, Edit } from 'lucide-react';
import targetIcon from '../assets/target.webp';
import { API_BASE_URL, getDefaultHeaders, setBackendEnvironment } from '../config/api';
import type { ProductionLine } from '../data/production_line';
import {
    productionLinesCLN,
    productionLinesMJL,
    productionLinesMJL2,
} from '../data/production_line';
import EditSupervisorShiftModal from './EditSupervisorShiftModal';

// Helper function untuk convert 24-hour format ke 12-hour format dengan AM/PM
const formatTime12Hour = (time24: string): { time: string; period: string } => {
    if (!time24 || !time24.includes(':')) {
        return { time: '07:30', period: 'AM' };
    }
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return {
        time: `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
        period: period
    };
};

// Fungsi untuk mendapatkan environment dari API atau berdasarkan port
const getEnvironment = async (): Promise<'CLN' | 'MJL' | 'MJL2'> => {
    // Deteksi environment berdasarkan port sebagai fallback
    const currentPort = window.location.port;
    let fallbackEnv: 'CLN' | 'MJL' | 'MJL2' = 'CLN';
    
    if (currentPort === '5174') {
        fallbackEnv = 'MJL2';
    } else if (currentPort === '5173') {
        fallbackEnv = 'MJL';
    } else {
        fallbackEnv = 'CLN';
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/config/environment`, {
            headers: getDefaultHeaders()
        });
        if (response.ok) {
            const data = await response.json();
            const env = data.environment === 'MJL2' ? 'MJL2' : data.environment === 'MJL' ? 'MJL' : 'CLN';
            // Cache environment untuk digunakan oleh getDefaultHeaders()
            setBackendEnvironment(env);
            return env;
        }
    } catch (error) {
        console.error('Error fetching environment config:', error);
        // Jika error, gunakan fallback berdasarkan port
        console.log(`⚠️ [ENV] Using fallback environment based on port ${currentPort}: ${fallbackEnv}`);
        setBackendEnvironment(fallbackEnv);
        return fallbackEnv;
    }
    // Default berdasarkan port jika tidak ada response
    console.log(`⚠️ [ENV] No response from API, using fallback environment based on port ${currentPort}: ${fallbackEnv}`);
    setBackendEnvironment(fallbackEnv);
    return fallbackEnv;
};

export default function ProductionLine() {
    const navigate = useNavigate();
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);
    const [environment, setEnvironment] = useState<'CLN' | 'MJL' | 'MJL2'>('CLN');

    // State untuk shift per line (day = siang, night = malam)
    const [lineShifts, setLineShifts] = useState<Record<number, 'day' | 'night'>>({});
    const [isLoadingShifts, setIsLoadingShifts] = useState(true);

    // State untuk supervisor data, startTimes, dan target dari API
    const [supervisorData, setSupervisorData] = useState<Record<string, string>>({});
    const [startTimesData, setStartTimesData] = useState<Record<string, string>>({});
    const [targetsData, setTargetsData] = useState<Record<string, number>>({});

    // State untuk active lines dari API wira
    const [activeLines, setActiveLines] = useState<Set<number>>(new Set());

    // State untuk edit modal
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedLine, setSelectedLine] = useState<ProductionLine | null>(null);

    // Ref untuk polling interval
    const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Fetch environment saat component mount
    useEffect(() => {
        getEnvironment().then(env => {
            setEnvironment(env);
        });
    }, []);

    // Pilih data berdasarkan environment
    const productionLines = useMemo(() => {
        if (environment === 'MJL2') {
            return productionLinesMJL2;
        } else if (environment === 'MJL') {
            return productionLinesMJL;
        } else {
            return productionLinesCLN;
        }
    }, [environment]);


    // Load supervisor data dan startTimes dari API (dipanggil untuk polling)
    const loadSupervisorData = async () => {
        if (!environment) return;

        try {
            const url = `${API_BASE_URL}/api/supervisor-data?environment=${environment}`;
            const response = await fetch(url, {
                headers: getDefaultHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    setSupervisorData(data.data.supervisors || {});
                    setStartTimesData(data.data.startTimes || {});
                    const targets: Record<string, number> = {};
                    if (data.data.targets && typeof data.data.targets === 'object') {
                        Object.keys(data.data.targets).forEach(key => {
                            const v = data.data.targets[key];
                            targets[key] = typeof v === 'number' && v >= 0 ? v : 0;
                        });
                    }
                    setTargetsData(targets);
                }
            }
        } catch (error) {
            // Silent error handling
        }
    };

    // Load shift data dari API (dipanggil untuk polling)
    const loadShiftData = async () => {
        if (!environment) return;

        try {
            const url = `${API_BASE_URL}/api/shift-data?environment=${environment}`;
            const response = await fetch(url, {
                headers: getDefaultHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    const shifts: Record<number, 'day' | 'night'> = {};
                    Object.keys(data.data).forEach(key => {
                        const lineId = parseInt(key, 10);
                        if (!isNaN(lineId)) {
                            shifts[lineId] = data.data[key] as 'day' | 'night';
                        }
                    });
                    setLineShifts(shifts);
                }
            }
        } catch (error) {
            // Silent error handling
        } finally {
            setIsLoadingShifts(false);
        }
    };

    // Load supervisor data dari API saat component mount dan saat environment berubah
    useEffect(() => {
        if (!environment) return;

        // Load initial data
        loadSupervisorData();
        loadShiftData();

        // Setup polling untuk real-time update (setiap 3 detik)
        pollingIntervalRef.current = setInterval(() => {
            loadSupervisorData();
            loadShiftData();
        }, 3000);

        // Listen untuk custom event ketika supervisor di-update dari modal
        const handleSupervisorUpdate = () => {
            loadSupervisorData();
            loadShiftData();
        };

        const handleShiftUpdate = () => {
            loadSupervisorData();
            loadShiftData();
        };

        window.addEventListener('supervisorUpdated', handleSupervisorUpdate);
        window.addEventListener('shiftUpdated', handleShiftUpdate);
        window.addEventListener('targetUpdated', handleSupervisorUpdate);

        // Refresh saat window focus (user kembali ke tab)
        const handleFocus = () => {
            loadSupervisorData();
            loadShiftData();
        };
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('supervisorUpdated', handleSupervisorUpdate);
            window.removeEventListener('shiftUpdated', handleShiftUpdate);
            window.removeEventListener('targetUpdated', handleSupervisorUpdate);
            window.removeEventListener('focus', handleFocus);
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [environment]);

    // Handler untuk membuka modal edit
    const handleEditClick = (e: React.MouseEvent, line: ProductionLine) => {
        e.stopPropagation(); // Prevent card click
        setSelectedLine(line);
        setEditModalOpen(true);
    };

    // Handler untuk update setelah edit
    const handleUpdate = () => {
        loadSupervisorData();
        loadShiftData();
        // Dispatch event untuk update di device lain
        window.dispatchEvent(new CustomEvent('supervisorUpdated'));
    };

    // Load active lines dari API wira - refresh saat environment berubah
    useEffect(() => {
        if (!environment) return;

        const loadActiveLines = async () => {
            try {
                // Fetch melalui proxy server untuk menghindari CORS issue
                const response = await fetch(`${API_BASE_URL}/wira`, {
                    method: 'GET',
                    headers: {
                        ...getDefaultHeaders(),
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();

                    // Extract unique line numbers dari response
                    const lines = new Set<number>();

                    if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
                        // Dapatkan list line IDs yang valid untuk environment ini
                        const validLineIds = new Set<number>();
                        const validLineNumbers = new Set<string>();
                        productionLines.forEach(line => {
                            if (line.id !== 0 && line.id !== 111 && line.id !== 112) {
                                validLineIds.add(line.id);
                                if (line.line) {
                                    validLineNumbers.add(line.line.toUpperCase());
                                }
                            }
                        });

                        // Debug: log data yang diterima
                        console.log(`🔍 [LED INDICATOR] Environment: ${environment}, Valid Line IDs:`, Array.from(validLineIds));
                        console.log(`🔍 [LED INDICATOR] Valid Line Numbers:`, Array.from(validLineNumbers));
                        console.log(`🔍 [LED INDICATOR] WIRA API Response - Total items:`, data.data.length);

                        data.data.forEach((item: any, index: number) => {
                            // Cek berbagai kemungkinan format line
                            const lineNum = item.line || item.LINE || item.Line;

                            if (lineNum !== null && lineNum !== undefined && lineNum !== '') {
                                // Convert ke string untuk matching
                                const lineNumStr = typeof lineNum === 'string' 
                                    ? lineNum.trim().toUpperCase() 
                                    : lineNum.toString().trim();

                                // Cari line berdasarkan line number (exact match)
                                const matchingLine = productionLines.find(line => 
                                    line.line && line.line.toUpperCase() === lineNumStr
                                );
                                
                                if (matchingLine && validLineIds.has(matchingLine.id)) {
                                    // Exact match ditemukan, tambahkan line ID
                                    lines.add(matchingLine.id);
                                    console.log(`✅ [LED INDICATOR] Line ${lineNumStr} (ID: ${matchingLine.id}) matched and added`);
                                } else {
                                    // Fallback: coba parse sebagai number
                                    const lineId = typeof lineNum === 'string'
                                        ? parseInt(lineNumStr, 10)
                                        : Number(lineNum);

                                    if (!isNaN(lineId) && lineId > 0) {
                                        if (validLineIds.has(lineId)) {
                                            lines.add(lineId);
                                            console.log(`✅ [LED INDICATOR] Line ${lineNumStr} (ID: ${lineId}) added via fallback`);
                                        } else {
                                            console.log(`⚠️ [LED INDICATOR] Line ${lineNumStr} (ID: ${lineId}) tidak valid untuk environment ${environment}`);
                                        }
                                    }
                                }
                            } else {
                                // Item tidak memiliki line number
                                console.log(`⚠️ [LED INDICATOR] Item ${index} tidak memiliki line number:`, item);
                            }
                        });

                        console.log(`🔍 [LED INDICATOR] Final active lines for ${environment}:`, Array.from(lines));
                    } else {
                        // Tidak ada data atau data kosong
                        console.log(`⚠️ [LED INDICATOR] No data from WIRA API for ${environment}`);
                        setActiveLines(new Set());
                        return;
                    }

                    setActiveLines(lines);
                } else {
                    console.error(`❌ [LED INDICATOR] WIRA API response not OK:`, response.status);
                    setActiveLines(new Set());
                }
            } catch (error) {
                console.error(`❌ [LED INDICATOR] Error fetching active lines:`, error);
                // Jika API tidak tersedia, semua line dianggap mati
                setActiveLines(new Set());
            }
        };

        loadActiveLines();

        // Setup polling untuk refresh active lines setiap 5 detik
        const intervalId = setInterval(() => {
            loadActiveLines();
        }, 5000);

        return () => {
            clearInterval(intervalId);
        };
    }, [environment, productionLines]); // Refresh saat environment atau productionLines berubah

    // Initialize default shifts untuk production lines yang belum ada di data
    useEffect(() => {
        if (isLoadingShifts) return;

        setLineShifts(prev => {
            const newShifts = { ...prev };
            let hasChanges = false;

            productionLines.forEach(line => {
                // Hanya initialize jika belum ada di data
                if (!(line.id in newShifts)) {
                    newShifts[line.id] = Math.random() > 0.5 ? 'day' : 'night';
                    hasChanges = true;
                }
            });

            // Jika ada line baru, simpan ke server
            if (hasChanges) {
                productionLines.forEach(line => {
                    if (!(line.id in prev)) {
                        // Save new shift to server
                        fetch(`${API_BASE_URL}/api/shift-data`, {
                            method: 'POST',
                            headers: {
                                ...getDefaultHeaders(),
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                lineId: line.id,
                                shift: newShifts[line.id],
                                environment: environment
                            })
                        }).catch(err => console.error('Error saving new shift:', err));
                    }
                });
            }

            return newShifts;
        });
    }, [productionLines, isLoadingShifts]);

    // Handler untuk toggle shift
    const handleShiftToggle = async (e: React.MouseEvent, lineId: number) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent card click

        const currentShift = lineShifts[lineId] || 'day';
        const newShift: 'day' | 'night' = currentShift === 'day' ? 'night' : 'day';

        // Optimistic update - langsung update UI
        setLineShifts(prev => {
            const updated: Record<number, 'day' | 'night'> = {
                ...prev,
                [lineId]: newShift
            };
            return updated;
        });

        // Save to server
        try {
            const response = await fetch(`${API_BASE_URL}/api/shift-data`, {
                method: 'POST',
                headers: {
                    ...getDefaultHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    lineId: lineId,
                    shift: newShift,
                    environment: environment
                })
            });

            if (!response.ok) {
                const responseData = await response.json();
                console.error(`❌ [SHIFT TOGGLE] Failed: ${response.status}`, responseData);
                // Revert on error
                setLineShifts(prev => ({
                    ...prev,
                    [lineId]: currentShift // Revert ke nilai sebelumnya
                }));
            }
        } catch (error) {
            console.error('❌ [SHIFT TOGGLE] Error:', error);
            // Revert on error
            setLineShifts(prev => ({
                ...prev,
                [lineId]: currentShift // Revert ke nilai sebelumnya
            }));
        }
    };

    // Helper Render Shift Icon (siang = Sun, malam = Moon) - tidak diubah
    const renderShiftIcon = (lineId: number) => {
        const shift = lineShifts[lineId] || 'day';
        const isDay = shift === 'day';

        return (
            <div className="w-full h-full flex items-center justify-center relative">
                {isDay ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <div
                            className="absolute inset-0 rounded-full blur-sm opacity-60"
                            style={{
                                background: 'radial-gradient(circle, rgba(255,193,7,0.8) 0%, rgba(255,152,0,0.4) 50%, transparent 100%)'
                            }}
                        />
                        <Sun
                            className="w-5 xs:w-6 sm:w-7 h-5 xs:h-6 sm:h-7 relative z-10"
                            style={{
                                color: '#B45309',
                                filter: 'drop-shadow(0 2px 6px rgb(253, 255, 241)) drop-shadow(0 0 3px rgb(252, 244, 98))',
                                strokeWidth: 3
                            }}
                            fill="#F59E0B"
                        />
                    </div>
                ) : (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <div
                            className="absolute inset-0 rounded-full blur-sm opacity-50"
                            style={{
                                background: 'radial-gradient(circle, rgba(147,197,253,0.6) 0%, rgba(59,130,246,0.3) 50%, transparent 100%)'
                            }}
                        />
                        <Moon
                            className="w-5 xs:w-6 sm:w-7 h-5 xs:h-6 sm:h-7 relative z-10"
                            style={{
                                color: '#FBBF24',
                                filter: 'drop-shadow(0 2px 6px rgba(147,197,253,0.5))',
                                strokeWidth: 2.5
                            }}
                            fill="#FCD34D"
                        />
                        <div className="absolute top-0 right-1 w-1 h-1 rounded-full opacity-80" style={{ background: '#FBBF24', boxShadow: '0 0 4px 2px rgba(251,191,36,0.6)' }} />
                        <div className="absolute bottom-1 left-0 w-0.5 h-0.5 rounded-full opacity-70" style={{ background: '#FBBF24', boxShadow: '0 0 3px 1px rgba(251,191,36,0.5)' }} />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full h-full font-sans"
        >
            {/* Grid System */}
            <div className="w-full max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 xs:gap-4 sm:gap-5 md:gap-6 px-2 xs:px-3 sm:px-4 pt-4 xs:pt-5 sm:pt-6 pb-3 xs:pb-4">
                {productionLines.map((line, index) => {
                    const isHovered = hoveredCard === line.id;

                    // Capture current line object untuk menghindari closure issue
                    const currentLine = line;

                    // Cek apakah line ini aktif berdasarkan data wira
                    const isLineActive = activeLines.has(line.id);

                    return (
                        <div
                            key={`line-${currentLine.line || currentLine.id}-${index}`}
                            onClick={() => {
                                // Gunakan currentLine untuk memastikan data yang benar
                                if (currentLine.id === 0 || currentLine.id === 111 || currentLine.id === 112) {
                                    navigate('/all-production-line');
                                } else {
                                    // Prioritas: gunakan currentLine.line jika ada, fallback ke currentLine.id
                                    const targetLine = currentLine.line || currentLine.id.toString();
                                    navigate(`/line/${targetLine}`);
                                }
                            }}
                            onMouseEnter={() => setHoveredCard(line.id)}
                            onMouseLeave={() => setHoveredCard(null)}
                            style={{
                                backgroundColor: isHovered ? '#0073ee' : 'white',
                                transition: 'background-color 0.3s ease-out, transform 0.3s ease-out, box-shadow 0.3s ease-out',
                                zIndex: 1,
                                position: 'relative'
                            }}
                            className={`
                                group relative 
                                rounded-lg xs:rounded-xl sm:rounded-2xl 
                                shadow-sm
                                border border-gray-300
                                hover:shadow-md
                                hover:-translate-y-1
                                cursor-pointer
                                flex flex-col
                                overflow-visible
                                p-1.5 xs:p-2 sm:p-2.5 md:p-3
                                aspect-[2/1]
                            `}
                        >
                            {/* Target (dengan icon) + LED Indicator - jarak jelas, All Production Line tanpa target */}
                            <div className="absolute top-1.5 xs:top-2 sm:top-2.5 right-1.5 xs:right-2 sm:right-2.5 z-20 flex items-center gap-2 sm:gap-3">
                                {/* Target badge: icon + nilai, jarak dari LED */}
                                {(() => {
                                    const isAllProductionLine = line.id === 0 || line.id === 111 || line.id === 112;
                                    const lineTarget = targetsData[line.id.toString()];
                                    const targetNum = typeof lineTarget === 'number' && lineTarget >= 0 ? lineTarget : 0;
                                    if (isAllProductionLine) return null;
                                    return (
                                        <div
                                            className={`flex items-center gap-1 xs:gap-1.5 px-2 xs:px-2.5 py-1 rounded-lg border shadow-sm transition-all duration-300 ${isHovered ? 'bg-amber-50/95 border-amber-300 text-amber-900' : 'bg-white border-amber-200/80 text-amber-800'}`}
                                            title="Target produksi line"
                                        >
                                            <img
                                                src={targetIcon}
                                                alt=""
                                                className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 flex-shrink-0 object-contain"
                                            />
                                            <span className="text-[10px] xs:text-xs sm:text-sm font-bold tabular-nums leading-none">
                                                {targetNum > 0 ? targetNum : '–'}
                                            </span>
                                        </div>
                                    );
                                })()}
                                {/* LED Indicator */}
                                <div className="relative flex-shrink-0">
                                    {/* Outer glow effect */}
                                    <div
                                        className={`absolute inset-0 rounded-full blur-sm ${isLineActive ? 'bg-green-400' : 'bg-red-400'
                                            }`}
                                        style={{
                                            opacity: isLineActive ? 0.5 : 0.3,
                                            animation: isLineActive ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
                                            width: '110%',
                                            height: '110%',
                                            top: '-20%',
                                            left: '-20%'
                                        }}
                                    />
                                    {/* Main circle - ukuran lebih kecil */}
                                    <div
                                        className={`w-1 h-1 xs:w-1.5 xs:h-1.5 sm:w-2 sm:h-2 rounded-full border ${isLineActive
                                            ? 'bg-green-500 border-green-400'
                                            : 'bg-red-500 border-red-400'
                                            }`}
                                        style={{
                                            boxShadow: isLineActive
                                                ? '0 0 6px rgba(34, 197, 94, 0.8), 0 0 8px rgba(34, 197, 94, 0.6), inset 0 0 3px rgba(255, 255, 255, 0.3)'
                                                : '0 0 4px rgba(239, 68, 68, 0.6), inset 0 0 3px rgba(0, 0, 0, 0.2)'
                                        }}
                                    >
                                        {/* Inner highlight untuk efek lampu menyala */}
                                        {isLineActive && (
                                            <div
                                                className="absolute top-0.5 left-0.5 w-0.5 h-0.5 xs:w-0.5 xs:h-0.5 sm:w-0.5 sm:h-0.5 rounded-full"
                                                style={{
                                                    opacity: 0.9,
                                                    boxShadow: '0 0 1px rgb(13, 255, 0)'
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* --- FLOATING BOX (Shift Icon) dengan Design Profesional --- */}
                            <div
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleShiftToggle(e, line.id);
                                }}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                onMouseUp={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                className="absolute -top-2.5 xs:-top-3 sm:-top-3.5 left-3.5 xs:left-4 sm:left-5 w-9 xs:w-11 sm:w-13 h-7 xs:h-9 sm:h-11 rounded-xl shadow-xl flex items-center justify-center z-50 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 border-2 border-white overflow-hidden cursor-pointer hover:shadow-2xl active:scale-95"
                                style={{
                                    background: (lineShifts[line.id] || 'day') === 'day'
                                        ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)' // Gradient emas-orange untuk siang
                                        : 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 50%, #1E293B 100%)', // Gradient biru gelap untuk malam
                                    boxShadow: (lineShifts[line.id] || 'day') === 'day'
                                        ? '0 4px 12px rgba(255,165,0,0.4), 0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)'
                                        : '0 4px 12px rgba(59,130,246,0.4), 0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                                    pointerEvents: 'auto', // Pastikan bisa di-click
                                    zIndex: 50 // Pastikan di atas card
                                }}
                            >
                                {renderShiftIcon(line.id)}
                            </div>

                            {/* --- CARD CONTENT --- */}
                            <div className="flex flex-col justify-between h-full flex-1" style={{ paddingTop: '1.5rem' }}>

                                {/* Title Section - Centered, di tengah antara logo brand dan garis putih */}
                                <div className="flex items-center justify-center flex-1" style={{ minHeight: 0 }}>
                                    <h3 className={`text-[10px] xs:text-xs sm:text-sm md:text-base lg:text-lg tracking-tight text-center truncate w-full transition-colors duration-300 ${isHovered ? 'text-white' : 'text-[#0073ee]'
                                        }`} style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 550, textTransform: 'capitalize' }}>
                                        {line.title}
                                    </h3>
                                </div>

                                {/* Footer: untuk All Production Line hanya Arrow; untuk line lain: Supervisor + Jam Masuk + Arrow */}
                                <div className="flex items-center justify-between pt-1.5 xs:pt-2 border-t border-slate-200 gap-2">
                                    {(() => {
                                        const isAllProductionLine = line.id === 0 || line.id === 111 || line.id === 112;
                                        if (isAllProductionLine) {
                                            return (
                                                <>
                                                    <div className="flex-1 min-w-0" />
                                                    <div className={`
                                                        w-5 xs:w-6 sm:w-7 h-5 xs:h-6 sm:h-7 rounded-full flex items-center justify-center flex-shrink-0
                                                        transition-all duration-300
                                                        ${isHovered ? 'bg-slate-800 text-white translate-x-1 shadow-md' : 'bg-slate-50 text-slate-400'}
                                                    `}>
                                                        <ArrowRight size={10} className="xs:w-[12px] xs:h-[12px] sm:w-[14px] sm:h-[14px]" strokeWidth={2.5} />
                                                    </div>
                                                </>
                                            );
                                        }
                                        return (
                                            <>
                                                {/* Supervisor Info + Edit */}
                                                <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 flex-1 min-w-0">
                                                    <div className={`p-1 xs:p-1.5 rounded-full bg-slate-50 flex-shrink-0`}>
                                                        <User size={10} className="xs:w-[12px] xs:h-[12px] sm:w-[14px] sm:h-[14px]" strokeWidth={2.5} style={{ color: line.accentColor.replace('text-', '') }} />
                                                    </div>
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <span className="text-[7px] xs:text-[8px] sm:text-[9px] text-slate-400 font-bold tracking-wider leading-tight" style={{ textTransform: 'capitalize' }}>
                                                            Supervisor
                                                        </span>
                                                        <span className={`text-[10px] xs:text-xs sm:text-sm font-semibold leading-tight transition-colors duration-300 truncate ${isHovered ? 'text-white' : 'text-slate-800'
                                                            }`} style={{ textTransform: 'capitalize' }}>
                                                            {(() => {
                                                                const supervisorFromAPI = supervisorData[line.id.toString()];
                                                                const supervisor = supervisorFromAPI || line.supervisor;
                                                                return supervisor && supervisor.trim() !== '-' && supervisor.trim() !== '' ? supervisor : 'Not Assigned';
                                                            })()}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleEditClick(e, line)}
                                                        className="p-1 rounded-full hover:bg-slate-200 flex-shrink-0 transition-colors"
                                                        title="Edit supervisor & shift"
                                                        aria-label="Edit supervisor & shift"
                                                    >
                                                        <Edit size={12} className="xs:w-3 xs:h-3 sm:w-3.5 sm:h-3.5 text-slate-500" strokeWidth={2} />
                                                    </button>
                                                </div>

                                                {/* Start Time */}
                                                {(() => {
                                                    const currentStartTime = startTimesData[line.id.toString()] || '07:30';
                                                    const { time, period } = formatTime12Hour(currentStartTime);
                                                    return (
                                                        <div className={`flex items-center bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 border border-blue-300/60 rounded-md px-1.5 xs:px-2 py-0.5 xs:py-1 shadow-sm flex-shrink-0 transition-all duration-300 ${isHovered ? 'border-blue-400/80 shadow-md' : ''}`}>
                                                            <span className="text-[9px] xs:text-[10px] sm:text-[11px] font-semibold text-blue-700 tracking-tight whitespace-nowrap">
                                                                {time} {period}
                                                            </span>
                                                        </div>
                                                    );
                                                })()}

                                                {/* Arrow Button */}
                                                <div className={`
                                                    w-5 xs:w-6 sm:w-7 h-5 xs:h-6 sm:h-7 rounded-full flex items-center justify-center flex-shrink-0
                                                    transition-all duration-300
                                                    ${isHovered ? 'bg-slate-800 text-white translate-x-1 shadow-md' : 'bg-slate-50 text-slate-400'}
                                                `}>
                                                    <ArrowRight size={10} className="xs:w-[12px] xs:h-[12px] sm:w-[14px] sm:h-[14px]" strokeWidth={2.5} />
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Edit Supervisor & Shift Modal */}
            {selectedLine && (
                <EditSupervisorShiftModal
                    isOpen={editModalOpen}
                    onClose={() => {
                        setEditModalOpen(false);
                        setSelectedLine(null);
                    }}
                    lineId={selectedLine.id}
                    lineTitle={selectedLine.title}
                    currentSupervisor={(() => {
                        const supervisorFromAPI = supervisorData[selectedLine.id.toString()];
                        return supervisorFromAPI || selectedLine.supervisor;
                    })()}
                    currentShift={lineShifts[selectedLine.id] || 'day'}
                    currentStartTime={startTimesData[selectedLine.id.toString()] || '07:30'}
                    currentTarget={typeof targetsData[selectedLine.id.toString()] === 'number' ? targetsData[selectedLine.id.toString()] : 0}
                    environment={environment}
                    onUpdate={handleUpdate}
                />
            )}
        </div>
    );
}
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, User, Sun, Moon, Edit, Tag, Plus, X, Save, Clock, Target } from 'lucide-react';
import { API_BASE_URL, getDefaultHeaders, getInitialEnvironment, getEnvironmentFromAPI, getSupervisorDataFromAPI, invalidateSupervisorDataCache, type BackendEnvironment } from '../config/api';
import type { ProductionLine } from '../data/production_line';
import {
    productionLinesCLN,
    productionLinesMJL,
    productionLinesMJL2,
    productionLinesGCC,
} from '../data/production_line';
import EditSupervisorShiftModal from './EditSupervisorShiftModal';
import { preloadLineDetail } from '../utils/preload';
import { resolveLineDisplayTitle } from '../utils/lineDisplayTitle';
import { HIDE_SHIFT_ICON, SHOW_PRODUCTION_LINE_CARD, filterVisibleProductionLines } from '../config/hide';
import brandIconMontbell from '../assets/montbell.svg';

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

export interface RFIDLineContentProps {
    /** Base path untuk line detail, e.g. '' = /line/:id, '/sewing' = /sewing/line/:id */
    linePathPrefix?: string;
    /** Path untuk "All" card, e.g. '/all-production-line' atau '/sewing/all' */
    allPath?: string;
}

export default function RFIDLineContent({ linePathPrefix = '', allPath = '/all-production-line' }: RFIDLineContentProps = {}) {
    const navigate = useNavigate();
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);
    const [environment, setEnvironment] = useState<BackendEnvironment>(getInitialEnvironment);

    // State untuk shift per line (day = siang, night = malam)
    const [lineShifts, setLineShifts] = useState<Record<number, 'day' | 'night'>>({});
    const [isLoadingShifts, setIsLoadingShifts] = useState(true);

    // State untuk supervisor data, startTimes, dan target dari API (target dipakai modal edit, tidak ditampilkan di card)
    const [supervisorData, setSupervisorData] = useState<Record<string, string>>({});
    const [startTimesData, setStartTimesData] = useState<Record<string, string>>({});
    const [targetsData, setTargetsData] = useState<Record<string, number>>({});
    const [displayTitlesData, setDisplayTitlesData] = useState<Record<string, string>>({});
    // Style per line untuk card (fetch 1x saja, bukan real-time)
    const [stylesData, setStylesData] = useState<Record<string, string>>({});

    // State untuk active lines dari API wira
    const [activeLines, setActiveLines] = useState<Set<number>>(new Set());

    // State untuk edit modal
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedLine, setSelectedLine] = useState<ProductionLine | null>(null);

    // --- DRAG AND DROP PUZZLE STATE ---
    const [cardOrder, setCardOrder] = useState<number[]>([]);
    const [longPressedId, setLongPressedId] = useState<number | null>(null);
    const [draggedId, setDraggedId] = useState<number | null>(null);
    const [dragOverId, setDragOverId] = useState<number | null>(null);
    const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- CUSTOM LINES STATE ---
    const [customLines, setCustomLines] = useState<ProductionLine[]>([]);
    
    // --- ADD LINE MODAL STATE ---
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newLineId, setNewLineId] = useState('');
    const [newLineTitlePrefix, setNewLineTitlePrefix] = useState('Production Line');
    const [newLineTitleSuffix, setNewLineTitleSuffix] = useState('');
    const [newLineSupervisor, setNewLineSupervisor] = useState('');
    const [newLineStartTime, setNewLineStartTime] = useState('07:30');
    const [newLineTarget, setNewLineTarget] = useState<number>(0);
    const [newLineError, setNewLineError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [hiddenLines, setHiddenLines] = useState<number[]>([]);

    const loadCustomAndHiddenLines = () => {
        if (!environment) return;
        const savedOrder = localStorage.getItem(`rfid_line_order_${environment}`);
        if (savedOrder) {
            try {
                setCardOrder(JSON.parse(savedOrder));
            } catch { /* ignore */ }
        }

        const savedCustom = localStorage.getItem(`rfid_custom_lines_${environment}`);
        if (savedCustom) {
            try {
                setCustomLines(JSON.parse(savedCustom));
            } catch { /* ignore */ }
        }

        const savedHidden = localStorage.getItem(`rfid_hidden_lines_${environment}`);
        if (savedHidden) {
            try {
                setHiddenLines(JSON.parse(savedHidden));
            } catch { /* ignore */ }
        }
    };

    // Load saved data and listen to delete events
    useEffect(() => {
        loadCustomAndHiddenLines();
        
        window.addEventListener('lineDeleted', loadCustomAndHiddenLines);
        return () => window.removeEventListener('lineDeleted', loadCustomAndHiddenLines);
    }, [environment]);

    // Apply sorting
    const sortedLines = useMemo(() => {
        let lines;
        if (environment === 'MJL2') {
            lines = productionLinesMJL2;
        } else if (environment === 'MJL') {
            lines = productionLinesMJL;
        } else if (environment === 'GCC') {
            lines = productionLinesGCC;
        } else {
            lines = productionLinesCLN;
        }
        const allLines = [...lines, ...customLines].filter(l => !hiddenLines.includes(l.id));
        const visibleLines = filterVisibleProductionLines(allLines, environment);

        if (cardOrder.length === 0) return visibleLines;

        const orderMap = new Map(cardOrder.map((id, idx) => [id, idx]));
        return [...visibleLines].sort((a, b) => {
            const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999;
            const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999;
            return indexA - indexB;
        });
    }, [environment, cardOrder, customLines, hiddenLines]);

    const handleDragStart = (e: React.DragEvent, id: number) => {
        if (longPressedId !== id) {
            e.preventDefault(); // Mencegah drag normal (harus di-long-press dulu)
            return;
        }
        setDraggedId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, id: number) => {
        e.preventDefault(); // Harus di-prevent untuk mengizinkan drop
        if (draggedId !== null && dragOverId !== id) {
            setDragOverId(id);
        }
    };

    const handleDrop = (e: React.DragEvent, targetId: number) => {
        e.preventDefault();
        if (draggedId === null || draggedId === targetId) {
            resetDrag();
            return;
        }

        setCardOrder(prev => {
            // Gunakan order dari prev, atau inisialisasi dari default jika kosong
            let currentOrder = prev.length ? prev : sortedLines.map(l => l.id);
            // Tambahkan elemen baru yang mungkin belum masuk di memori
            const missingIds = sortedLines.map(l => l.id).filter(id => !currentOrder.includes(id));
            if (missingIds.length > 0) currentOrder = [...currentOrder, ...missingIds];

            const newOrder = [...currentOrder];
            const draggedIdx = newOrder.indexOf(draggedId);
            const targetIdx = newOrder.indexOf(targetId);

            if (draggedIdx > -1 && targetIdx > -1) {
                newOrder.splice(draggedIdx, 1);
                newOrder.splice(targetIdx, 0, draggedId);
                localStorage.setItem(`rfid_line_order_${environment}`, JSON.stringify(newOrder));
                return newOrder;
            }
            return currentOrder;
        });

        resetDrag();
    };

    const resetDrag = () => {
        setDraggedId(null);
        setDragOverId(null);
        setLongPressedId(null);
    };

    const handleAddCustomLine = async () => {
        setNewLineError('');
        const numId = parseInt(newLineId, 10);
        if (isNaN(numId) || numId <= 0) {
            setNewLineError('Line ID harus berupa angka positif yang valid.');
            return;
        }
        
        let allLines;
        if (environment === 'MJL2') allLines = productionLinesMJL2;
        else if (environment === 'MJL') allLines = productionLinesMJL;
        else if (environment === 'GCC') allLines = productionLinesGCC;
        else allLines = productionLinesCLN;

        const exists = [...allLines, ...customLines].some(l => l.id === numId);
        if (exists) {
            setNewLineError(`Gagal: Line ID ${numId} sudah ada! Harap gunakan ID lain.`);
            return;
        }

        if (!newLineTitleSuffix.trim()) {
            setNewLineError('Nama Tampilan (sufiks/angka) tidak boleh kosong.');
            return;
        }

        setIsSubmitting(true);
        const newTitle = `${newLineTitlePrefix} ${newLineTitleSuffix}`.trim();
        const newLineObj: ProductionLine = {
            id: numId,
            title: newTitle,
            supervisor: newLineSupervisor.trim() || '-',
            borderColor: 'border-blue-500',
            accentColor: 'text-blue-600',
            line: String(numId)
        };

        const updatedCustom = [...customLines, newLineObj];
        setCustomLines(updatedCustom);
        localStorage.setItem(`rfid_custom_lines_${environment}`, JSON.stringify(updatedCustom));
        
        // Simpan data pelengkap ke API supervisor-data
        try {
            await fetch(`${API_BASE_URL}/api/supervisor-data`, {
                method: 'POST',
                headers: { ...getDefaultHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lineId: numId,
                    supervisor: newLineSupervisor.trim() || '-',
                    startTime: newLineStartTime,
                    target: newLineTarget > 0 ? newLineTarget : undefined,
                    displayTitle: newTitle,
                    environment: environment
                })
            });
            await loadSupervisorData();
            invalidateSupervisorDataCache(environment);
        } catch(e) {
            // silent
        }
        
        setIsSubmitting(false);
        setIsAddModalOpen(false);
        setNewLineId('');
        setNewLineTitleSuffix('');
        setNewLineSupervisor('');
        setNewLineStartTime('07:30');
        setNewLineTarget(0);
    };

    const handlePointerDown = (id: number) => {
        if (pressTimer.current) clearTimeout(pressTimer.current);
        pressTimer.current = setTimeout(() => {
            setLongPressedId(id);
            if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback untuk HP
        }, 500); // 500ms tekan lama
    };

    const handlePointerUpOrCancel = () => {
        if (pressTimer.current) clearTimeout(pressTimer.current);
        // Reset efek pulse bila batal diseret (kasih jeda supaya onClick tetap kena)
        setTimeout(() => {
            if (!draggedId) setLongPressedId(null);
        }, 100);
    };

    // Fetch environment (1x shared request)
    useEffect(() => {
        getEnvironmentFromAPI().then(env => setEnvironment(env));
    }, []);

    // Preload LineDetail chunk setelah halaman idle (user kemungkinan akan klik salah satu line)
    useEffect(() => {
        const t = setTimeout(preloadLineDetail, 800);
        return () => clearTimeout(t);
    }, []);

    // Pilih data berdasarkan environment
    const productionLines = useMemo(() => {
        let lines;
        if (environment === 'MJL2') {
            lines = productionLinesMJL2;
        } else if (environment === 'MJL') {
            lines = productionLinesMJL;
        } else if (environment === 'GCC') {
            lines = productionLinesGCC;
        } else {
            lines = productionLinesCLN;
        }
        const allLines = [...lines, ...customLines].filter(l => !hiddenLines.includes(l.id));
        return filterVisibleProductionLines(allLines, environment);
    }, [environment, customLines, hiddenLines]);


    // Load supervisor data (1x shared request per env via getSupervisorDataFromAPI)
    const loadSupervisorData = async () => {
        if (!environment) return;
        const data = await getSupervisorDataFromAPI(environment);
        if (data) {
            setSupervisorData(data.supervisors || {});
            setStartTimesData(data.startTimes || {});
            setTargetsData(data.targets || {});
            setDisplayTitlesData(data.displayTitles || {});
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

    // Ambil style dari response /monitoring/line (format sama dengan useDashboardRFIDQuery)
    const parseStyleFromMonitoringLine = (data: any, lineIdParam: string): string => {
        if (!data?.success) return '-';
        let woData: any = null;
        const normalized = lineIdParam.replace(/[^\d]/g, '') || '1';
        if (data.data && !Array.isArray(data.data) && typeof data.data === 'object') {
            woData = data.data;
        } else if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            const targetNum = parseInt(normalized, 10);
            woData = data.data.find((item: any) => {
                const itemLine = String(item.Line || item.line || item.LINE || '').trim();
                const match = itemLine.match(/(\d+)/);
                const num = match ? parseInt(match[1], 10) : parseInt(itemLine, 10);
                return !isNaN(num) && num === targetNum;
            }) || data.data[0];
        } else if (data.wo || data.WO) {
            woData = data;
        }
        return woData ? (woData.Style || woData.style || '-') : '-';
    };

    // Load style per line sekali saja (1x polling) dari API monitoring/line
    const loadStylesOnce = async () => {
        if (!environment) return;
        const linesToFetch = productionLines.filter(
            (line) => line.id !== 0 && line.id !== 111 && line.id !== 112 && line.id !== 113
        );
        if (linesToFetch.length === 0) return;

        const next: Record<string, string> = {};
        await Promise.all(
            linesToFetch.map(async (line) => {
                const lineParam = line.line || String(line.id);
                try {
                    const res = await fetch(
                        `${API_BASE_URL}/monitoring/line?line=${encodeURIComponent(lineParam)}`,
                        { headers: getDefaultHeaders() }
                    );
                    if (!res.ok) return;
                    const data = await res.json();
                    const style = parseStyleFromMonitoringLine(data, lineParam);
                    next[String(line.id)] = style;
                } catch {
                    next[String(line.id)] = '-';
                }
            })
        );
        setStylesData((prev) => ({ ...prev, ...next }));
    };

    // Load supervisor & shift data sekali saja saat mount/ environment berubah. Refetch hanya saat simpan dari modal (event).
    useEffect(() => {
        if (!environment) return;

        loadSupervisorData();
        loadShiftData();

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

        return () => {
            window.removeEventListener('supervisorUpdated', handleSupervisorUpdate);
            window.removeEventListener('shiftUpdated', handleShiftUpdate);
            window.removeEventListener('targetUpdated', handleSupervisorUpdate);
        };
    }, [environment]);

    // Fetch style per line sekali saja saat halaman Production Lines dibuka (bukan real-time)
    useEffect(() => {
        if (!environment || productionLines.length === 0) return;
        loadStylesOnce();
    }, [environment, productionLines.length]);

    // Handler untuk membuka modal edit
    const handleEditClick = (e: React.MouseEvent, line: ProductionLine) => {
        e.stopPropagation(); // Prevent card click
        setSelectedLine(line);
        setEditModalOpen(true);
    };

    // Handler untuk update setelah edit (invalidate cache agar data segar)
    const handleUpdate = () => {
        invalidateSupervisorDataCache(environment);
        loadSupervisorData();
        loadShiftData();
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

        return () => { };
    }, [environment, productionLines]); // Load wira sekali saja saat mount / environment berubah

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

    // Handler untuk toggle shift (dipakai saat ikon shift diklik)
    const handleShiftToggle = async (e: React.MouseEvent, lineId: number) => {
        e.preventDefault();
        e.stopPropagation();
        const currentShift = lineShifts[lineId] || 'day';
        const newShift: 'day' | 'night' = currentShift === 'day' ? 'night' : 'day';
        setLineShifts(prev => ({ ...prev, [lineId]: newShift }));
        try {
            const response = await fetch(`${API_BASE_URL}/api/shift-data`, {
                method: 'POST',
                headers: { ...getDefaultHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ lineId, shift: newShift, environment })
            });
            if (!response.ok) {
                setLineShifts(prev => ({ ...prev, [lineId]: currentShift }));
            }
        } catch {
            setLineShifts(prev => ({ ...prev, [lineId]: currentShift }));
        }
    };

    // Normalisasi: tampilkan brand (nama/style + ikon) atau shift (matahari/bulan)
    const showBrandOnCard = (SHOW_PRODUCTION_LINE_CARD === 'brand' || SHOW_PRODUCTION_LINE_CARD === 0);

    const getBrandIcon = (): string => brandIconMontbell;

    const renderShiftIcon = (lineId: number) => {
        const shift = lineShifts[lineId] || 'day';
        const isDay = shift === 'day';
        return (
            <div className="w-full h-full flex items-center justify-center relative">
                {isDay ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full blur-sm opacity-60" style={{ background: 'radial-gradient(circle, rgba(255,193,7,0.8) 0%, rgba(255,152,0,0.4) 50%, transparent 100%)' }} />
                        <Sun className="w-5 xs:w-6 sm:w-7 h-5 xs:h-6 sm:h-7 relative z-10" style={{ color: '#B45309', filter: 'drop-shadow(0 2px 6px rgb(253, 255, 241)) drop-shadow(0 0 3px rgb(252, 244, 98))', strokeWidth: 3 }} fill="#F59E0B" />
                    </div>
                ) : (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full blur-sm opacity-50" style={{ background: 'radial-gradient(circle, rgba(147,197,253,0.6) 0%, rgba(59,130,246,0.3) 50%, transparent 100%)' }} />
                        <Moon className="w-5 xs:w-6 sm:w-7 h-5 xs:h-6 sm:h-7 relative z-10" style={{ color: '#FBBF24', filter: 'drop-shadow(0 2px 6px rgba(147,197,253,0.5))', strokeWidth: 2.5 }} fill="#FCD34D" />
                        <div className="absolute top-0 right-1 w-1 h-1 rounded-full opacity-80" style={{ background: '#FBBF24', boxShadow: '0 0 4px 2px rgba(251,191,36,0.6)' }} />
                        <div className="absolute bottom-1 left-0 w-0.5 h-0.5 rounded-full opacity-70" style={{ background: '#FBBF24', boxShadow: '0 0 3px 1px rgba(251,191,36,0.5)' }} />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full h-full font-sans">
            {/* Custom Styles for Premium Drag & Drop Animations */}
            <style>
                {`
                    @keyframes floatWiggle {
                        0% { transform: scale(1.04) rotate(-1.5deg); }
                        50% { transform: scale(1.04) rotate(1.5deg); }
                        100% { transform: scale(1.04) rotate(-1.5deg); }
                    }
                    .drag-active-card {
                        animation: floatWiggle 0.5s ease-in-out infinite;
                        box-shadow: 0 30px 60px -15px rgba(0, 115, 238, 0.5), 0 0 0 4px rgba(0, 115, 238, 0.3) !important;
                        z-index: 50 !important;
                        border-color: transparent !important;
                    }
                `}
            </style>

            {/* Grid System */}
            <div className="w-full max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 xs:gap-4 sm:gap-5 md:gap-6 px-2 xs:px-3 sm:px-4 pt-4 xs:pt-5 sm:pt-6 pb-3 xs:pb-4">
                {sortedLines.map((line, index) => {
                    const isHovered = hoveredCard === line.id;

                    // Capture current line object untuk menghindari closure issue
                    const currentLine = line;

                    // Cek apakah line ini aktif berdasarkan data wira
                    const isLineActive = activeLines.has(line.id);

                    // Di konteks Sewing: tampilkan "Sewing Line" / "All Sewing Line", bukan "Production Line"
                    const isAllLine = line.id === 0 || line.id === 111 || line.id === 112 || line.id === 113;
                    const hasCustomTitle = !!displayTitlesData[line.id.toString()]?.trim();
                    const resolvedTitle = resolveLineDisplayTitle(line.id, line.title, displayTitlesData);
                    const cardTitle = linePathPrefix === '/sewing' && !hasCustomTitle
                        ? (isAllLine ? 'All Sewing Line' : resolvedTitle.replace(/^Production Line /i, 'Sewing Line '))
                        : resolvedTitle;

                    return (
                        <div
                            key={`line-${currentLine.line || currentLine.id}-${index}`}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, currentLine.id)}
                            onDragOver={(e) => handleDragOver(e, currentLine.id)}
                            onDrop={(e) => handleDrop(e, currentLine.id)}
                            onDragEnd={resetDrag}
                            onPointerDown={() => handlePointerDown(currentLine.id)}
                            onPointerUp={handlePointerUpOrCancel}
                            onPointerLeave={handlePointerUpOrCancel}
                            onPointerCancel={handlePointerUpOrCancel}
                            onClick={(e) => {
                                if (draggedId || longPressedId === currentLine.id) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setLongPressedId(null);
                                    return;
                                }
                                // Gunakan currentLine untuk memastikan data yang benar
                                if (currentLine.id === 0 || currentLine.id === 111 || currentLine.id === 112 || currentLine.id === 113) {
                                    navigate(allPath);
                                } else {
                                    // Prioritas: gunakan currentLine.line jika ada, fallback ke currentLine.id
                                    const targetLine = currentLine.line || currentLine.id.toString();
                                    const linePath = linePathPrefix ? `${linePathPrefix}/line/${targetLine}` : `/line/${targetLine}`;
                                    navigate(linePath);
                                }
                            }}
                            onMouseEnter={() => {
                                setHoveredCard(line.id);
                                preloadLineDetail();
                            }}
                            onMouseLeave={() => setHoveredCard(null)}
                            style={{
                                backgroundColor: isHovered ? '#0073ee' : (dragOverId === currentLine.id ? '#f0f9ff' : 'white'),
                                transition: longPressedId === currentLine.id ? 'none' : 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Efek Pantulan Spring
                                zIndex: longPressedId === currentLine.id ? 50 : 1,
                                position: 'relative',
                                transform: dragOverId === currentLine.id ? 'scale(0.92)' : 
                                           draggedId === currentLine.id ? 'scale(0.85) translateY(10px)' :
                                           isHovered && longPressedId !== currentLine.id ? 'translateY(-6px) scale(1.02)' : 'scale(1)',
                                boxShadow: dragOverId === currentLine.id ? 'inset 0 0 25px rgba(0, 115, 238, 0.2)' :
                                           isHovered && longPressedId !== currentLine.id ? '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' : '0 1px 3px rgba(0,0,0,0.05)',
                                opacity: draggedId === currentLine.id ? 0.4 : 1,
                                filter: draggedId === currentLine.id ? 'grayscale(0.5)' : 'none'
                            }}
                            className={`
                                group relative 
                                rounded-lg xs:rounded-xl sm:rounded-2xl 
                                border ${dragOverId === currentLine.id ? 'border-dashed border-[3px] border-[#0073ee]' : 'border-gray-200'}
                                ${longPressedId === currentLine.id ? 'drag-active-card' : ''}
                                cursor-pointer
                                flex flex-col
                                overflow-visible
                                p-1.5 xs:p-2 sm:p-2.5 md:p-3
                                aspect-[2/1]
                            `}
                        >
                            {/* Style (dari API, 1x fetch) + LED Indicator - All Production Line tanpa style */}
                            <div className="absolute top-1.5 xs:top-2 sm:top-2.5 right-1.5 xs:right-2 sm:right-2.5 z-20 flex items-center gap-2 sm:gap-3">
                                {/* Style badge: icon + label + nilai — design profesional */}
                                {(() => {
                                    const isAllProductionLine = line.id === 0 || line.id === 111 || line.id === 112 || line.id === 113;
                                    const lineStyle = stylesData[line.id.toString()];
                                    const hasStyle = lineStyle && lineStyle !== '-';
                                    if (isAllProductionLine) return null;
                                    return (
                                        <div
                                            className={`
                                                flex items-center gap-1 xs:gap-1.5 min-w-0
                                                pl-1.5 pr-2 xs:pl-2 xs:pr-2.5 py-1 xs:py-1.5
                                                rounded-lg border shadow-sm
                                                transition-all duration-300
                                                max-w-[88px] xs:max-w-[110px] sm:max-w-[130px]
                                                ${isHovered
                                                    ? 'bg-gradient-to-br from-indigo-50 to-slate-50 border-indigo-200/90 text-indigo-900 shadow-md'
                                                    : 'bg-white/95 border-slate-200 text-slate-700 shadow-slate-200/50'
                                                }
                                            `}
                                            title={hasStyle ? `Style: ${lineStyle}` : 'Style line'}
                                        >
                                            <div className="flex-shrink-0 w-4 h-4 xs:w-5 xs:h-5 rounded-md bg-indigo-100 flex items-center justify-center">
                                                <Tag className="w-2 h-2 xs:w-2.5 xs:h-2.5 text-indigo-600" strokeWidth={2.5} aria-hidden />
                                            </div>
                                            <span className="text-[9px] xs:text-[10px] sm:text-xs font-semibold truncate leading-tight text-slate-600 min-w-0">
                                                {hasStyle ? lineStyle : '–'}
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

                            {/* --- FLOATING BOX kiri atas: brand (nama/style) ukuran sama seperti box shift, atau shift (matahari/bulan) --- */}
                            {showBrandOnCard ? (
                                <div
                                    className="absolute -top-2.5 xs:-top-3 sm:-top-3.5 left-3.5 xs:left-4 sm:left-5 w-9 xs:w-11 sm:w-13 h-7 xs:h-9 sm:h-11 rounded-xl shadow-xl flex items-center justify-center z-40 transition-all duration-300 group-hover:scale-110 border-2 border-white overflow-hidden bg-white/95"
                                    style={{ pointerEvents: 'auto' }}
                                    title="Brand"
                                >
                                    <img
                                        src={getBrandIcon()}
                                        alt="Brand"
                                        className="w-8 xs:w-9 sm:w-10 h-8 xs:h-9 sm:h-10 object-contain"
                                        draggable={false}
                                    />
                                </div>
                            ) : !HIDE_SHIFT_ICON && (
                                <div
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleShiftToggle(e, line.id);
                                    }}
                                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                    onMouseUp={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                    className="absolute -top-2.5 xs:-top-3 sm:-top-3.5 left-3.5 xs:left-4 sm:left-5 w-9 xs:w-11 sm:w-13 h-7 xs:h-9 sm:h-11 rounded-xl shadow-xl flex items-center justify-center z-40 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 border-2 border-white overflow-hidden cursor-pointer hover:shadow-2xl active:scale-95"
                                    style={{
                                        background: (lineShifts[line.id] || 'day') === 'day'
                                            ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)'
                                            : 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 50%, #1E293B 100%)',
                                        boxShadow: (lineShifts[line.id] || 'day') === 'day'
                                            ? '0 4px 12px rgba(255,165,0,0.4), 0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)'
                                            : '0 4px 12px rgba(59,130,246,0.4), 0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                                        pointerEvents: 'auto'
                                    }}
                                >
                                    {renderShiftIcon(line.id)}
                                </div>
                            )}

                            {/* --- CARD CONTENT --- */}
                            <div className="flex flex-col justify-between h-full flex-1" style={{ paddingTop: '1.5rem', pointerEvents: 'none' }}>

                                {/* Title Section - Centered, di tengah antara logo brand dan garis putih */}
                                <div className="flex items-center justify-center flex-1" style={{ minHeight: 0 }}>
                                    <h3 className={`text-[10px] xs:text-xs sm:text-sm md:text-base lg:text-lg tracking-tight text-center truncate w-full transition-colors duration-300 ${isHovered ? 'text-white' : 'text-[#0073ee]'
                                        }`} style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 550, textTransform: 'capitalize' }}>
                                        {cardTitle}
                                    </h3>
                                </div>

                                {/* Footer: untuk All Production Line hanya Arrow; untuk line lain: Supervisor + Jam Masuk + Arrow */}
                                <div className="flex items-center justify-between pt-1.5 xs:pt-2 border-t border-slate-200 gap-2" style={{ pointerEvents: 'auto' }}>
                                    {(() => {
                                        const isAllProductionLine = line.id === 0 || line.id === 111 || line.id === 112 || line.id === 113;
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
                
                {/* Tombol Tambah Line Baru di akhir grid */}
                <div 
                    onClick={() => {
                        setNewLineError('');
                        setIsAddModalOpen(true);
                    }}
                    className="group relative rounded-lg xs:rounded-xl sm:rounded-2xl border-2 border-dashed border-gray-300 hover:border-blue-500 bg-gray-50/50 hover:bg-blue-50/40 cursor-pointer flex flex-col items-center justify-center overflow-hidden p-4 aspect-[2/1] transition-all duration-300"
                >
                    <div className="w-10 xs:w-12 h-10 xs:h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-2 xs:mb-3 group-hover:scale-110 group-hover:shadow-md group-hover:bg-blue-600 transition-all duration-300">
                        <Plus size={24} className="text-gray-400 group-hover:text-white transition-colors duration-300" strokeWidth={2.5} />
                    </div>
                    <span className="font-bold text-xs xs:text-sm text-gray-500 group-hover:text-blue-600 transition-colors duration-300">Tambah Line Baru</span>
                </div>
            </div>

            {/* Modal Tambah Line Baru */}
            {isAddModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-[100] p-4" style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)' }}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col border border-gray-100 animate-in fade-in zoom-in duration-200">
                        {/* Header Modal */}
                        <div className="relative bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 px-6 py-5 border-b border-blue-400 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-1">Tambah Production Line Baru</h2>
                                    <p className="text-blue-100 text-sm">Buat card monitoring kustom yang belum ada di sistem bawaan.</p>
                                </div>
                                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-all group">
                                    <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform" />
                                </button>
                            </div>
                        </div>

                        {/* Konten Form */}
                        <div className="p-6 bg-gray-50 rounded-b-2xl max-h-[80vh] overflow-y-auto">
                            {newLineError && (
                                <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-semibold flex items-center gap-2 relative overflow-hidden shadow-sm">
                                    <div className="w-1.5 h-full bg-red-500 absolute left-0 top-0"></div>
                                    <span className="relative z-10">{newLineError}</span>
                                </div>
                            )}
                            
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-6">
                                {/* Line ID (Wajib) */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <Tag size={14} className="text-blue-500" /> Line ID (Kunci Data API)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={newLineId}
                                            onChange={(e) => setNewLineId(e.target.value)}
                                            className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all shadow-inner"
                                            placeholder="Contoh: 25"
                                            autoFocus
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 font-bold" title="Wajib Diisi">*</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">ID ini mutlak digunakan untuk query ke API backend dan <span className="font-semibold text-red-500">tidak dapat diubah</span> nantinya.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 pt-2 border-t border-gray-100">
                                    {/* Nama Tampilan */}
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <Edit size={14} className="text-indigo-500" /> Nama Tampilan
                                        </label>
                                        <div className="flex shadow-sm rounded-lg overflow-hidden border border-gray-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all bg-white group">
                                            <select
                                                value={newLineTitlePrefix}
                                                onChange={(e) => setNewLineTitlePrefix(e.target.value)}
                                                className="px-2 py-2.5 bg-gray-50 border-r border-gray-300 text-gray-600 text-xs font-semibold focus:outline-none cursor-pointer outline-none"
                                            >
                                                <option value="Production Line">Production Line</option>
                                                <option value="Sewing Line">Sewing Line</option>
                                                <option value="Cutting Gm">Cutting Gm</option>
                                                <option value="Line">Line</option>
                                            </select>
                                            <input
                                                type="text"
                                                value={newLineTitleSuffix}
                                                onChange={(e) => setNewLineTitleSuffix(e.target.value)}
                                                className="flex-1 w-full px-3 py-2.5 text-sm font-bold text-gray-900 focus:outline-none bg-transparent placeholder-gray-300"
                                                placeholder="Sufiks (cth: 25A)"
                                            />
                                        </div>
                                    </div>

                                    {/* Supervisor */}
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <User size={14} className="text-blue-500" /> Supervisor
                                        </label>
                                        <input
                                            type="text"
                                            value={newLineSupervisor}
                                            onChange={(e) => setNewLineSupervisor(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm placeholder-gray-300"
                                            placeholder="NAMA SUPERVISOR"
                                        />
                                    </div>

                                    {/* Jam Masuk */}
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <Clock size={14} className="text-emerald-500" /> Jam Masuk
                                        </label>
                                        <input
                                            type="time"
                                            value={newLineStartTime}
                                            onChange={(e) => setNewLineStartTime(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 transition-all shadow-sm"
                                        />
                                    </div>

                                    {/* Target */}
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <Target size={14} className="text-amber-500" /> Target / Jam
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min={0}
                                                value={newLineTarget || ''}
                                                onChange={(e) => {
                                                    const v = parseInt(e.target.value, 10);
                                                    setNewLineTarget(Number.isNaN(v) || v < 0 ? 0 : v);
                                                }}
                                                className="w-full pl-4 pr-12 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-500 transition-all shadow-sm placeholder-gray-300"
                                                placeholder="0"
                                            />
                                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none bg-white pl-1">PCS</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Tombol Aksi */}
                            <div className="flex items-center justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
                                >
                                    Batalkan
                                </button>
                                <button
                                    onClick={handleAddCustomLine}
                                    disabled={isSubmitting || !newLineId}
                                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.98]"
                                >
                                    {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={16} />}
                                    Tambahkan Line
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Supervisor & Shift Modal */}
            {selectedLine && (
                <EditSupervisorShiftModal
                    isOpen={editModalOpen}
                    onClose={() => {
                        setEditModalOpen(false);
                        setSelectedLine(null);
                    }}
                    lineId={selectedLine.id}
                    lineTitle={resolveLineDisplayTitle(selectedLine.id, selectedLine.title, displayTitlesData)}
                    currentDisplayTitle={displayTitlesData[selectedLine.id.toString()] || ''}
                    defaultLineTitle={selectedLine.title}
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
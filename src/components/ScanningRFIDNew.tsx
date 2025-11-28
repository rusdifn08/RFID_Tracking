import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, Loader2 } from 'lucide-react';

interface ScanningRFIDNewProps {
    isOpen: boolean;
    onClose: () => void;
    workOrderData: {
        workOrder: string;
        style: string;
        buyer: string;
        item: string;
        color: string;
        size: string;
    };
}

interface ScannedItem {
    rfid: string;
    timestamp: Date;
    status: 'success' | 'error';
    message?: string;
    isDuplicate?: boolean; // Flag untuk menandai duplikasi
}

export default function ScanningRFIDNew({ isOpen, onClose, workOrderData }: ScanningRFIDNewProps) {
    const [rfidInput, setRfidInput] = useState('');
    const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Check server status saat modal dibuka
    useEffect(() => {
        if (isOpen) {
            checkServerStatus();
        }
    }, [isOpen]);

    // Check server status
    const checkServerStatus = async () => {
        setServerStatus('checking');
        try {
            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 detik timeout
            
            const response = await fetch('http://10.8.10.104:8000/health', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                setServerStatus('online');
                setIsOfflineMode(false);
            } else {
                setServerStatus('offline');
                setIsOfflineMode(true);
            }
        } catch (error) {
            // Server tidak berjalan atau tidak bisa diakses
            setServerStatus('offline');
            setIsOfflineMode(true);
            console.log('🔌 [OFFLINE MODE] Server tidak berjalan, menggunakan mode offline untuk uji coba');
        }
    };

    // Auto focus input saat modal terbuka dan reset input
    useEffect(() => {
        if (isOpen) {
            // Reset input saat modal dibuka
            setRfidInput('');
            if (inputRef.current) {
                inputRef.current.value = '';
                // Focus langsung tanpa delay untuk memastikan input siap menerima input
                const focusInput = () => {
                    if (inputRef.current) {
                        inputRef.current.focus();
                        // Pastikan input benar-benar focused
                        inputRef.current.click();
                    }
                };
                // Multiple attempts untuk memastikan focus
                focusInput();
                setTimeout(focusInput, 50);
                setTimeout(focusInput, 150);
                setTimeout(focusInput, 300);
            }
        }
    }, [isOpen]);

    // Reset saat modal ditutup
    useEffect(() => {
        if (!isOpen) {
            // Reset semua state
            setRfidInput('');
            setScannedItems([]);
            setIsProcessing(false);
            setIsOfflineMode(false);
            setServerStatus('checking');
            
            // Clear input field secara eksplisit
            if (inputRef.current) {
                inputRef.current.value = '';
                inputRef.current.blur();
            }
        }
    }, [isOpen]);

    // Auto-scroll ke atas ketika ada data baru (karena terbaru di atas)
    useEffect(() => {
        if (scrollContainerRef.current && scannedItems.length > 0) {
            // Scroll ke atas (posisi 0) karena data terbaru di atas
            scrollContainerRef.current.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    }, [scannedItems]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Handle RFID input dan insert ke database
    const handleRfidSubmit = async (rfid: string) => {
        if (!rfid.trim()) return;

        // Cek duplikasi di local state terlebih dahulu (untuk UX yang lebih cepat)
        const trimmedRfid = rfid.trim();
        const isLocalDuplicate = scannedItems.some(item => item.rfid === trimmedRfid);
        
        if (isLocalDuplicate) {
            // Duplikasi di session ini - langsung tampilkan error tanpa kirim ke server
            const timestamp = new Date();
            setScannedItems(prev => {
                const newItems: ScannedItem[] = [...prev, {
                    rfid: trimmedRfid,
                    timestamp,
                    status: 'error' as const,
                    message: 'RFID sudah di-scan dalam session ini (Duplikasi)',
                    isDuplicate: true
                }];
                // Sort berdasarkan timestamp (terbaru di atas)
                return newItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            });
            setRfidInput('');
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
            return;
        }

        // OFFLINE MODE - Simpan di local state saja untuk uji coba
        if (isOfflineMode) {
            const timestamp = new Date();
            setScannedItems(prev => {
                const newItems: ScannedItem[] = [...prev, {
                    rfid: trimmedRfid,
                    timestamp,
                    status: 'success' as const,
                    message: 'Mode Offline - Data hanya untuk uji coba (tidak tersimpan ke database)'
                }];
                // Sort berdasarkan timestamp (terbaru di atas)
                return newItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            });
            setRfidInput('');
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
            return;
        }

        // ONLINE MODE - Kirim ke database
        setIsProcessing(true);
        const timestamp = new Date();

        try {
            // Insert ke database
            const dataToInsert = {
                rfid_garment: trimmedRfid,
                item: workOrderData.item,
                buyer: workOrderData.buyer,
                style: workOrderData.style,
                wo: workOrderData.workOrder,
                color: workOrderData.color,
                size: workOrderData.size
            };

            // Insert langsung ke MySQL database melalui server.js local
            const response = await fetch('http://10.8.10.104:8000/garment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToInsert)
            });

            const responseData = await response.json();
            
            if (response.ok) {
                // Success - cek lagi apakah tidak ada duplikasi di local state
                const trimmedRfid = rfid.trim();
                const isDuplicateInList = scannedItems.some(item => item.rfid === trimmedRfid && item.status === 'success');
                
                if (isDuplicateInList) {
                    // Jika ternyata ada duplikasi di list, tampilkan sebagai error
                    setScannedItems(prev => {
                        const newItems: ScannedItem[] = [...prev, {
                            rfid: trimmedRfid,
                            timestamp,
                            status: 'error' as const,
                            message: 'RFID sudah di-scan sebelumnya (Duplikasi)',
                            isDuplicate: true
                        }];
                        return newItems.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                    });
                } else {
                    // Success
                    setScannedItems(prev => {
                        const newItems: ScannedItem[] = [...prev, {
                            rfid: trimmedRfid,
                            timestamp,
                            status: 'success' as const,
                            message: responseData.message || 'Berhasil disimpan'
                        }];
                        // Sort berdasarkan timestamp (terlama di atas, terbaru di bawah)
                        return newItems.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                    });
                }
            } else {
                // Check if it's a duplicate (409 status)
                if (response.status === 409 || responseData.isDuplicate) {
                    // Duplicate - tampilkan dengan status error (akan ditampilkan merah)
                    setScannedItems(prev => {
                        const newItems: ScannedItem[] = [...prev, {
                            rfid: rfid.trim(),
                            timestamp,
                            status: 'error' as const,
                            message: responseData.message || 'RFID sudah ada di database (Duplikasi)',
                            isDuplicate: true
                        }];
                        return newItems.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                    });
                } else {
                    // Other errors
                    throw new Error(responseData.message || responseData.error || 'Failed to save');
                }
            }
        } catch (error) {
            // Error - tampilkan pesan error yang lebih detail
            let errorMessage = 'Gagal menyimpan';
            if (error instanceof Error) {
                if (error.message.includes('Failed to fetch')) {
                    errorMessage = 'Tidak dapat terhubung ke server. Pastikan server.js berjalan di http://10.8.10.104:8000';
                } else {
                    errorMessage = error.message;
                }
            }
            
            setScannedItems(prev => {
                const newItems: ScannedItem[] = [...prev, {
                    rfid: rfid.trim(),
                    timestamp,
                    status: 'error' as const,
                    message: errorMessage
                }];
                return newItems.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            });
        } finally {
            setIsProcessing(false);
            setRfidInput('');
            // Auto focus kembali ke input
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    };

    // Handle Enter key
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && rfidInput.trim() && !isProcessing) {
            e.preventDefault();
            handleRfidSubmit(rfidInput);
        }
    };

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setRfidInput(value);
        
        // Auto-submit jika input panjang (untuk RFID reader yang mengirim data lengkap sekaligus)
        // Biasanya RFID reader mengirim data dengan Enter di akhir, tapi beberapa mengirim langsung
        if (value.length > 8 && !value.includes('\n') && !value.includes('\r')) {
            // Jika input sudah cukup panjang dan tidak ada newline, mungkin dari RFID reader
            // Tapi kita tetap tunggu Enter untuk konsistensi
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div 
                className="fixed inset-0 z-[1000] flex items-center justify-center"
                style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(8px)',
                    animation: 'fadeIn 0.3s ease'
                }}
                onClick={(e) => {
                    if (e.target === e.currentTarget && !isProcessing) {
                        onClose();
                    }
                }}
            >
                <div 
                    ref={containerRef}
                    className="bg-white rounded-3xl shadow-2xl w-[95%] max-w-[900px] max-h-[95vh] flex flex-col"
                    style={{
                        background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(148, 163, 184, 0.1), 0 8px 16px -8px rgba(59, 130, 246, 0.1)',
                        animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        border: '1px solid rgba(226, 232, 240, 0.8)',
                        padding: '1.5rem',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div 
                        className="text-center mb-2"
                        style={{
                            background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 50%, #DBEAFE 100%)',
                            borderRadius: '6px',
                            padding: '0.25rem 0.5rem',
                            border: '1px solid rgba(147, 197, 253, 0.3)',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)'
                        }}
                    >
                        <h2 
                            className="text-xl font-extrabold mb-1"
                            style={{
                                background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                letterSpacing: '-0.5px'
                            }}
                        >
                            📡 Batch Scanning Mode
                        </h2>
                        <p className="text-sm font-medium" style={{ color: '#475569' }}>
                            Scan beberapa RFID sekaligus
                        </p>
                        {/* Offline Mode Indicator */}
                        {isOfflineMode && (
                            <div 
                                className="mt-2 px-3 py-1.5 rounded-md inline-block"
                                style={{
                                    background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                                    border: '2px solid #F59E0B',
                                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.2)'
                                }}
                            >
                                <p className="text-xs font-bold" style={{ color: '#92400E' }}>
                                    🔌 Mode Offline - Data hanya untuk uji coba (tidak tersimpan ke database)
                                </p>
                            </div>
                        )}
                        {serverStatus === 'checking' && (
                            <div 
                                className="mt-2 px-3 py-1.5 rounded-md inline-block"
                                style={{
                                    background: 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)',
                                    border: '2px solid #3B82F6'
                                }}
                            >
                                <p className="text-xs font-bold" style={{ color: '#1E40AF' }}>
                                    ⏳ Memeriksa koneksi server...
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Work Order Info */}
                    <div 
                        className="mb-2"
                        style={{
                            background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
                            borderRadius: '6px',
                            padding: '0.3rem 0.5rem',
                            display: 'flex',
                            gap: '0.7rem',
                            justifyContent: 'space-around',
                            flexWrap: 'wrap',
                            border: '1px solid #E2E8F0',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
                        }}
                    >
                        {[
                            { label: 'WO', value: workOrderData.workOrder },
                            { label: 'Style', value: workOrderData.style },
                            { label: 'Buyer', value: workOrderData.buyer },
                            { label: 'Item', value: workOrderData.item },
                            { label: 'Color', value: workOrderData.color },
                            { label: 'Size', value: workOrderData.size }
                        ].map((item, idx) => (
                            <div key={idx} className="relative" style={{ paddingLeft: '1rem' }}>
                                <div 
                                    className="absolute left-0 top-1/2 -translate-y-1/2"
                                    style={{
                                        width: '4px',
                                        height: '60%',
                                        background: 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)',
                                        borderRadius: '2px'
                                    }}
                                />
                                <div className="flex flex-col gap-1">
                                    <span 
                                        className="text-xs font-semibold uppercase tracking-wide"
                                        style={{ color: '#64748B', fontSize: '0.65rem' }}
                                    >
                                        {item.label}
                                    </span>
                                    <span 
                                        className="font-bold"
                                        style={{ color: '#0F172A', fontSize: '0.9rem', letterSpacing: '-0.25px' }}
                                    >
                                        {item.value}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Scan Area - Clickable untuk focus input */}
                    <div 
                        className="mb-2 relative cursor-text"
                        onClick={() => {
                            // Focus input ketika area scan di-click
                            if (inputRef.current && !isProcessing) {
                                inputRef.current.focus();
                            }
                        }}
                        style={{
                            background: 'linear-gradient(135deg, rgba(238, 242, 255, 0.8) 0%, rgba(224, 231, 255, 0.8) 100%), radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.1) 0%, transparent 70%), radial-gradient(circle at 70% 70%, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
                            borderRadius: '6px',
                            padding: '0.4rem',
                            minHeight: '130px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid transparent',
                            boxShadow: '0 8px 16px -4px rgba(59, 130, 246, 0.15), inset 0 2px 8px rgba(255, 255, 255, 0.5), inset 0 -2px 8px rgba(59, 130, 246, 0.1)'
                        }}
                    >
                        {/* Animated Border */}
                        <div 
                            className="absolute inset-0 rounded-xl"
                            style={{
                                background: 'linear-gradient(135deg, #93C5FD 0%, #3B82F6 50%, #2563EB 100%)',
                                padding: '2px',
                                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                WebkitMaskComposite: 'xor',
                                maskComposite: 'exclude',
                                animation: 'borderGlow 3s ease-in-out infinite',
                                pointerEvents: 'none'
                            }}
                        />

                        {/* RFID Card Animation */}
                        <div className="relative" style={{ filter: 'drop-shadow(0 6px 12px rgba(37, 99, 235, 0.25))' }}>
                            <div 
                                className="relative"
                                style={{
                                    width: '160px',
                                    height: '88px',
                                    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1E40AF 100%)',
                                    borderRadius: '8px',
                                    boxShadow: '0 8px 16px rgba(37, 99, 235, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.1)',
                                    animation: 'cardFloat 3s ease-in-out infinite',
                                    border: '1px solid rgba(147, 197, 253, 0.3)',
                                    overflow: 'hidden'
                                }}
                            >
                                {/* Chip */}
                                <div 
                                    className="absolute"
                                    style={{
                                        top: '50px',
                                        left: '30px',
                                        width: '50px',
                                        height: '40px',
                                        background: 'linear-gradient(135deg, #FCD34D, #F59E0B)',
                                        borderRadius: '6px',
                                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)'
                                    }}
                                >
                                    <div 
                                        className="absolute inset-2 border border-black/10 rounded"
                                    />
                                </div>

                                {/* Waves */}
                                <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                    {[0, 1, 2].map((i) => (
                                        <div
                                            key={i}
                                            className="absolute border-2 border-white/30 rounded-full"
                                            style={{
                                                width: '30px',
                                                height: '30px',
                                                animation: `waveExpand 2s ease-out infinite`,
                                                animationDelay: `${i * 0.3}s`
                                            }}
                                        />
                                    ))}
                                </div>

                                {/* Card Text */}
                                <div className="absolute bottom-2.5 left-4 text-white">
                                    <div className="text-base font-bold mb-0.5 tracking-wider">RFID</div>
                                    <div className="text-xs tracking-wider opacity-90">●●●● ●●●● ●●●●</div>
                                </div>

                                {/* Scan Beam */}
                                <div 
                                    className="absolute w-full"
                                    style={{
                                        height: '4px',
                                        background: 'linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.8) 50%, transparent 100%)',
                                        boxShadow: '0 0 20px rgba(16, 185, 129, 0.8)',
                                        animation: 'scanBeam 2s ease-in-out infinite',
                                        zIndex: 10
                                    }}
                                />
                            </div>
                        </div>

                        {/* Status Text */}
                        <div className="absolute bottom-4 left-0 right-0 text-center">
                            {rfidInput.length > 0 ? (
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#10B981' }}>
                                        📝 Sedang membaca...
                                    </p>
                                    <p 
                                        className="font-extrabold text-lg font-mono tracking-wide px-3 py-2 rounded-md inline-block"
                                        style={{
                                            color: '#0F172A',
                                            background: 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)',
                                            border: '2px solid #3B82F6',
                                            boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
                                            animation: 'pulseGlow 1s ease-in-out infinite'
                                        }}
                                    >
                                        {rfidInput}
                                    </p>
                                </div>
                            ) : (
                                <p 
                                    className="font-bold text-sm"
                                    style={{
                                        color: '#1E40AF',
                                        animation: 'blink 1.5s ease-in-out infinite',
                                        textShadow: '0 2px 4px rgba(37, 99, 235, 0.1)',
                                        letterSpacing: '0.25px'
                                    }}
                                >
                                    🔍 Siap Scan - Dekatkan kartu RFID
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Input Field - Hidden, langsung aktif tanpa perlu click */}
                    <input
                        ref={inputRef}
                        type="text"
                        value={rfidInput}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        disabled={isProcessing}
                        className="sr-only"
                        autoFocus
                        autoComplete="off"
                        key={isOpen ? 'open' : 'closed'} // Force re-render saat modal buka/tutup
                    />

                    {/* Scanned List */}
                    <div 
                        className="mb-2 flex flex-col flex-shrink-0"
                        style={{
                            border: '2px solid #E2E8F0',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            background: 'white',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            height: '280px'
                        }}
                    >
                        <div 
                            className="px-3 py-2 flex justify-between items-center border-b-2 border-gray-200 flex-shrink-0"
                            style={{
                                background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%)'
                            }}
                        >
                            <h3 className="text-sm font-bold" style={{ color: '#0F172A', letterSpacing: '-0.25px' }}>
                                📋 RFID yang Sudah di-Scan
                            </h3>
                            <span 
                                className="px-3 py-1.5 rounded-full font-extrabold text-sm text-white text-center min-w-[35px]"
                                style={{
                                    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                                }}
                            >
                                {scannedItems.length}
                            </span>
                        </div>

                        {scannedItems.length === 0 ? (
                            <div className="py-12 text-center flex-1 flex items-center justify-center" style={{ color: '#94A3B8', fontSize: '0.95rem', fontWeight: 500 }}>
                                Belum ada RFID yang di-scan
                            </div>
                        ) : (
                            <div 
                                ref={scrollContainerRef}
                                className="overflow-y-auto p-1.5"
                                style={{
                                    background: '#FAFBFC',
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: '#93C5FD #F1F5F9',
                                    overflowY: 'auto',
                                    overflowX: 'hidden',
                                    height: '230px',
                                    maxHeight: '230px'
                                }}
                            >
                                {scannedItems.map((item, index) => {
                                    const isDuplicate = item.isDuplicate || item.status === 'error';
                                    return (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2 p-2 mb-1.5 rounded-md relative overflow-hidden transition-all"
                                            style={{
                                                background: item.status === 'success' 
                                                    ? 'white' 
                                                    : isDuplicate
                                                        ? 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)'
                                                        : 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                                                border: `2px solid ${item.status === 'success' 
                                                    ? '#E2E8F0' 
                                                    : isDuplicate
                                                        ? '#EF4444'
                                                        : '#F59E0B'}`,
                                                animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                                            }}
                                        >
                                            <div 
                                                className="absolute left-0 top-0 bottom-0 w-1 transition-transform"
                                                style={{
                                                    background: item.status === 'success' 
                                                        ? 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)'
                                                        : isDuplicate
                                                            ? 'linear-gradient(180deg, #EF4444 0%, #DC2626 100%)'
                                                            : 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)',
                                                    transform: 'scaleY(1)'
                                                }}
                                            />
                                            <div 
                                                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-extrabold text-xs border-2"
                                                style={{
                                                    background: item.status === 'success'
                                                        ? 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)'
                                                        : isDuplicate
                                                            ? 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)'
                                                            : 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                                                    color: item.status === 'success' 
                                                        ? '#1E40AF' 
                                                        : isDuplicate
                                                            ? '#DC2626'
                                                            : '#92400E',
                                                    borderColor: item.status === 'success' 
                                                        ? '#93C5FD' 
                                                        : isDuplicate
                                                            ? '#EF4444'
                                                            : '#F59E0B',
                                                    boxShadow: item.status === 'success'
                                                        ? '0 2px 4px rgba(37, 99, 235, 0.1)'
                                                        : isDuplicate
                                                            ? '0 2px 4px rgba(239, 68, 68, 0.2)'
                                                            : '0 2px 4px rgba(245, 158, 11, 0.1)'
                                                }}
                                            >
                                                {scannedItems.length - index}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div 
                                                    className="font-semibold font-mono text-sm tracking-wide"
                                                    style={{ 
                                                        color: item.status === 'success' 
                                                            ? '#0F172A' 
                                                            : isDuplicate
                                                                ? '#DC2626'
                                                                : '#92400E'
                                                    }}
                                                >
                                                    {item.rfid}
                                                </div>
                                                <div 
                                                    className="text-xs font-medium px-2 py-0.5 rounded-md inline-block mt-0.5"
                                                    style={{ 
                                                        color: isDuplicate ? '#DC2626' : '#64748B', 
                                                        background: isDuplicate ? '#FEE2E2' : '#F1F5F9' 
                                                    }}
                                                >
                                                    {item.timestamp.toLocaleTimeString('id-ID')} - {item.message}
                                                </div>
                                            </div>
                                            {item.status === 'success' ? (
                                                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                                            ) : (
                                                <X className={`w-5 h-5 flex-shrink-0 ${isDuplicate ? 'text-red-600' : 'text-red-500'}`} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-2 flex-shrink-0">
                        <button
                            onClick={() => {
                                // Batal - tidak eksekusi query, langsung tutup
                                onClose();
                            }}
                            disabled={isProcessing}
                            className="flex-1 py-3 px-5 rounded-lg font-bold text-sm transition-all"
                            style={{
                                background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                                color: '#475569',
                                border: '2px solid #E2E8F0',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                                letterSpacing: '0.25px'
                            }}
                            onMouseEnter={(e) => {
                                if (!isProcessing) {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)';
                                    e.currentTarget.style.borderColor = '#FCA5A5';
                                    e.currentTarget.style.color = '#DC2626';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(220, 38, 38, 0.15)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isProcessing) {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)';
                                    e.currentTarget.style.borderColor = '#E2E8F0';
                                    e.currentTarget.style.color = '#475569';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                                }
                            }}
                            type="button"
                        >
                            ❌ Batal
                        </button>
                        <button
                            onClick={async () => {
                                // Selesai - eksekusi query untuk semua scanned items yang berhasil
                                if (isProcessing || scannedItems.length === 0) return;
                                
                                // Filter hanya item yang berhasil (status: 'success')
                                const successfulItems = scannedItems.filter(item => item.status === 'success');
                                
                                if (successfulItems.length === 0) {
                                    // Tidak ada item yang berhasil, tutup saja
                                    onClose();
                                    return;
                                }
                                
                                if (isOfflineMode) {
                                    // Mode offline - hanya log untuk uji coba
                                    console.log(`🔌 [OFFLINE MODE] Selesai. Total ${successfulItems.length} RFID untuk uji coba (tidak tersimpan ke database).`);
                                } else {
                                    // Semua item sudah di-insert ke database saat scanning
                                    // Jadi tidak perlu insert lagi, hanya tutup modal
                                    // (Data sudah tersimpan di database saat handleRfidSubmit)
                                    console.log(`✅ [BATCH SCAN] Selesai. Total ${successfulItems.length} RFID berhasil disimpan.`);
                                }
                                
                                // Tutup modal
                                onClose();
                            }}
                            disabled={isProcessing || scannedItems.length === 0}
                            className="flex-1 py-3 px-5 rounded-lg font-bold text-sm text-white transition-all relative overflow-hidden"
                            style={{
                                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35), 0 2px 4px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                                letterSpacing: '0.25px',
                                opacity: (isProcessing || scannedItems.length === 0) ? 0.5 : 1,
                                cursor: (isProcessing || scannedItems.length === 0) ? 'not-allowed' : 'pointer'
                            }}
                            onMouseEnter={(e) => {
                                if (!isProcessing && scannedItems.length > 0) {
                                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(16, 185, 129, 0.45), 0 6px 12px rgba(16, 185, 129, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #10B981 0%, #047857 100%)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isProcessing && scannedItems.length > 0) {
                                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.35), 0 2px 4px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
                                }
                            }}
                            type="button"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 inline-block mr-2 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                `💾 Selesai (${scannedItems.length})`
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Custom Animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(50px) scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                @keyframes cardFloat {
                    0%, 100% {
                        transform: translateY(0) rotateX(0deg);
                    }
                    50% {
                        transform: translateY(-10px) rotateX(5deg);
                    }
                }
                @keyframes waveExpand {
                    0% {
                        width: 30px;
                        height: 30px;
                        opacity: 1;
                    }
                    100% {
                        width: 80px;
                        height: 80px;
                        opacity: 0;
                    }
                }
                @keyframes scanBeam {
                    0%, 100% {
                        top: 0;
                        opacity: 0;
                    }
                    50% {
                        opacity: 1;
                    }
                    100% {
                        top: 100%;
                    }
                }
                @keyframes borderGlow {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }
                @keyframes blink {
                    0%, 100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 0.6;
                        transform: scale(0.98);
                    }
                }
                @keyframes pulseGlow {
                    0%, 100% {
                        box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
                    }
                    50% {
                        box-shadow: 0 0 30px rgba(59, 130, 246, 0.6);
                    }
                }
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(-30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                /* Custom Scrollbar untuk scanned list */
                .overflow-y-auto::-webkit-scrollbar {
                    width: 8px;
                }
                .overflow-y-auto::-webkit-scrollbar-track {
                    background: #F1F5F9;
                    border-radius: 4px;
                }
                .overflow-y-auto::-webkit-scrollbar-thumb {
                    background: #93C5FD;
                    border-radius: 4px;
                    border: 2px solid #F1F5F9;
                }
                .overflow-y-auto::-webkit-scrollbar-thumb:hover {
                    background: #60A5FA;
                }
            `}</style>
        </>
    );
}

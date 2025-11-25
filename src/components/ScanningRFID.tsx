import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ScanningRFIDProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess?: () => void; // Callback saat save berhasil
    workOrderData: {
        workOrder: string;
        style: string;
        buyer: string;
        item: string;
        color: string;
        size: string;
    };
}

interface ScannedRFID {
    id: string;
    scanTime: Date;
    status?: string;
}

export default function ScanningRFID({ isOpen, onClose, onSaveSuccess, workOrderData }: ScanningRFIDProps) {
    const [rfidBuffer, setRfidBuffer] = useState('');
    const [scannedRfids, setScannedRfids] = useState<ScannedRFID[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const bufferTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isOpenRef = useRef(isOpen);
    const handleScanCompleteRef = useRef<(rfidId: string) => void>(() => {});
    const modalIdRef = useRef(`modal-${Date.now()}`);

    // Update ref saat isOpen berubah
    useEffect(() => {
        isOpenRef.current = isOpen;
        console.log('[ScanningRFID] Modal state changed:', isOpen);
    }, [isOpen]);

    // Handler untuk scan complete - menggunakan ref untuk menghindari dependency issues
    const handleScanComplete = (rfidId: string) => {
        // Cek duplikasi
        setScannedRfids(prev => {
            const isDuplicate = prev.some(rfid => rfid.id === rfidId);
            
            const newRfid: ScannedRFID = {
                id: rfidId,
                scanTime: new Date(),
                status: isDuplicate ? 'hasper' : undefined
            };

            return [...prev, newRfid];
        });
    };

    // Store handler in ref
    useEffect(() => {
        handleScanCompleteRef.current = handleScanComplete;
    }, []);

    // Auto-detect RFID input dari keyboard (RFID reader mengetik otomatis)
    useEffect(() => {
        if (!isOpen) {
            console.log('[ScanningRFID] Modal closed, removing event listeners');
            return;
        }

        console.log('[ScanningRFID] Modal opened, setting up event listeners');

        const handleKeyPress = (event: KeyboardEvent) => {
            // Pastikan modal masih terbuka
            if (!isOpenRef.current) {
                console.warn('[ScanningRFID] Keypress detected but modal is closed, ignoring');
                return;
            }

            // SKIP jika user sedang mengetik di input/textarea/select
            const activeElement = document.activeElement;
            const isTypingInInput = activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.tagName === 'SELECT' ||
                (activeElement as HTMLElement).isContentEditable
            );

            // Jika sedang ketik di form, JANGAN tangkap input RFID
            if (isTypingInInput) {
                return;
            }

            // Enter key = RFID selesai diketik, process sekarang
            if (event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();

                setRfidBuffer(prev => {
                    const trimmed = prev.trim();
                    if (trimmed.length > 0 && handleScanCompleteRef.current) {
                        handleScanCompleteRef.current(trimmed);
                    }
                    return '';
                });
                return;
            }

            // Ignore special keys
            if (event.key.length > 1 && event.key !== 'Backspace') {
                return;
            }

            // Backspace handling
            if (event.key === 'Backspace') {
                setRfidBuffer(prev => prev.slice(0, -1));
                return;
            }

            // Tambah karakter ke buffer
            setRfidBuffer(prev => prev + event.key);

            // Auto-clear buffer setelah 100ms tidak ada input (reset jika terlalu lama)
            if (bufferTimeoutRef.current) {
                clearTimeout(bufferTimeoutRef.current);
            }

            bufferTimeoutRef.current = setTimeout(() => {
                setRfidBuffer('');
            }, 100);
        };

        window.addEventListener('keydown', handleKeyPress, true); // Use capture phase

        // Cleanup
        return () => {
            console.log('[ScanningRFID] Cleaning up event listeners');
            window.removeEventListener('keydown', handleKeyPress, true);
            if (bufferTimeoutRef.current) {
                clearTimeout(bufferTimeoutRef.current);
                bufferTimeoutRef.current = null;
            }
        };
    }, [isOpen]); // Hanya depend pada isOpen, bukan rfidBuffer

    // Reset saat modal ditutup - HANYA reset jika benar-benar ditutup
    useEffect(() => {
        if (!isOpen) {
            console.log('[ScanningRFID] Modal closed, resetting state');
            setRfidBuffer('');
            setScannedRfids([]);
            setIsSubmitting(false);
            setErrorMessage(null);
        } else {
            console.log('[ScanningRFID] ✅ Modal OPENED, initializing. isOpen:', isOpen, 'isOpenRef:', isOpenRef.current);
            setErrorMessage(null);
            // Pastikan ref juga true
            isOpenRef.current = true;
        }
    }, [isOpen]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            // Disable body scroll
            document.body.style.overflow = 'hidden';
        } else {
            // Enable body scroll
            document.body.style.overflow = 'unset';
        }
        
        // Cleanup
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Log untuk debugging - HARUS dipanggil sebelum early return
    useEffect(() => {
        if (isOpen) {
            console.log('[ScanningRFID] ✅✅✅ Modal is OPEN and WILL RENDER:', {
                isOpen,
                isOpenRef: isOpenRef.current,
                modalId: modalIdRef.current,
                scannedCount: scannedRfids.length,
                isSubmitting,
                timestamp: new Date().toISOString()
            });
            // Pastikan ref juga true
            isOpenRef.current = true;
        } else {
            console.log('[ScanningRFID] ❌❌❌ Modal is CLOSED, will NOT render:', {
                isOpen,
                isOpenRef: isOpenRef.current
            });
        }
    }, [isOpen, scannedRfids.length, isSubmitting]);

    const handleSaveAll = async () => {
        if (scannedRfids.length === 0) {
            alert('Belum ada RFID yang di-scan. Silakan scan RFID terlebih dahulu.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Insert setiap RFID sebagai baris terpisah ke database
            // Kolom: rfid_garment, item, buyer, style, wo, color, size
            // Endpoint: http://10.5.0.99/db/garment (group: db, database: db, table: garment)
            
            const insertPromises = scannedRfids.map(async (rfid) => {
                const dataToInsert = {
                    rfid_garment: rfid.id,  // Kolom RFID
                    item: workOrderData.item,
                    buyer: workOrderData.buyer,
                    style: workOrderData.style,
                    wo: workOrderData.workOrder,  // Kolom WO
                    color: workOrderData.color,
                    size: workOrderData.size
                };

                const response = await fetch('http://10.5.0.99/db/garment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(dataToInsert)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                    throw new Error(`Failed to insert RFID ${rfid.id}: ${errorData.message || 'Unknown error'}`);
                }

                return await response.json().catch(() => ({ success: true }));
            });

            // Tunggu semua insert selesai
            const results = await Promise.allSettled(insertPromises);
            
            // Cek hasil
            const failed = results.filter(r => r.status === 'rejected');
            const succeeded = results.filter(r => r.status === 'fulfilled');

            if (failed.length > 0) {
                const errorMessages = failed.map((f, idx) => {
                    const rfid = scannedRfids[idx];
                    return `RFID ${rfid.id}: ${f.status === 'rejected' ? f.reason?.message || 'Unknown error' : 'Failed'}`;
                }).join('\n');
                
                console.error('Some RFID inserts failed:', errorMessages);
                alert(`Beberapa data gagal disimpan:\n\n${errorMessages}\n\nTotal berhasil: ${succeeded.length}/${scannedRfids.length}`);
                
                // Jika semua gagal, jangan tutup modal
                if (succeeded.length === 0) {
                    setIsSubmitting(false);
                    return;
                }
            }

            // Success - close modal dan trigger callback untuk reset form
            alert(`Data RFID berhasil disimpan!\n\nTotal: ${succeeded.length} RFID berhasil disimpan${failed.length > 0 ? `, ${failed.length} gagal` : ''}`);
            onClose();
            // Trigger callback untuk reset form di parent component
            if (onSaveSuccess) {
                onSaveSuccess();
            }
        } catch (error) {
            console.error('Error saving RFID data:', error);
            const errorMessage = error instanceof Error ? error.message : 'Gagal menyimpan data RFID. Silakan coba lagi.';
            alert(`Error: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Early return dengan guard - HARUS setelah semua hooks dipanggil
    // Hanya render jika isOpen benar-benar true
    if (!isOpen) {
        return null;
    }

    // Handler untuk menutup modal - hanya jika tidak sedang submit
    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Hanya tutup jika klik langsung di overlay, bukan di child element
        // Dan tidak sedang dalam proses submit
        if (e.target === e.currentTarget && !isSubmitting) {
            console.log('[ScanningRFID] Overlay clicked, closing modal');
            onClose();
        } else {
            console.log('[ScanningRFID] Click detected but not closing:', {
                isTarget: e.target === e.currentTarget,
                isSubmitting,
                target: e.target,
                currentTarget: e.currentTarget
            });
        }
    };

    const handleEscapeKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
        // Tutup dengan ESC key, tapi tidak jika sedang submit
        if (e.key === 'Escape' && !isSubmitting) {
            console.log('[ScanningRFID] ESC key pressed, closing modal');
            e.preventDefault();
            e.stopPropagation();
            onClose();
        }
    };

    // Handler untuk close button dengan error handling
    const handleCloseButton = () => {
        if (isSubmitting) {
            console.warn('[ScanningRFID] Close button clicked but submission in progress');
            setErrorMessage('Tunggu proses penyimpanan selesai sebelum menutup modal.');
            return;
        }
        console.log('[ScanningRFID] Close button clicked');
        onClose();
    };

    // Handler untuk cancel button dengan error handling
    const handleCancel = () => {
        if (isSubmitting) {
            console.warn('[ScanningRFID] Cancel button clicked but submission in progress');
            setErrorMessage('Tunggu proses penyimpanan selesai sebelum menutup modal.');
            return;
        }
        console.log('[ScanningRFID] Cancel button clicked');
        onClose();
    };

    return (
        <div 
            id={modalIdRef.current}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/85 backdrop-blur-md animate-fade-in"
            onClick={handleOverlayClick}
            onKeyDown={handleEscapeKey}
            role="dialog"
            aria-modal="true"
            aria-labelledby="scanning-modal-title"
            data-modal-open={isOpen}
        >
            <div 
                className="bg-gradient-to-br from-white to-slate-50 rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 lg:p-6 max-w-2xl w-[90%] sm:w-[95%] max-h-[85vh] flex flex-col shadow-2xl border border-slate-200/80 animate-slide-up"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                    console.log('[ScanningRFID] Modal content clicked, preventing close');
                }}
                onKeyDown={(e) => {
                    e.stopPropagation();
                }}
                onMouseDown={(e) => {
                    e.stopPropagation();
                }}
                onMouseUp={(e) => {
                    e.stopPropagation();
                }}
            >
                {/* Close Button */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCloseButton();
                    }}
                    disabled={isSubmitting}
                    className="absolute top-3 sm:top-4 right-3 sm:right-4 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300/50 rounded-lg sm:rounded-xl flex items-center justify-center text-slate-600 hover:from-red-50 hover:to-red-100 hover:border-red-300 hover:text-red-600 transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Close modal"
                    type="button"
                >
                    <X size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
                </button>

                {/* Error Message Display */}
                {errorMessage && (
                    <div className="mb-2 sm:mb-3 p-2 sm:p-3 bg-red-50 border-2 border-red-300 rounded-lg sm:rounded-xl text-red-700 text-xs sm:text-sm font-semibold animate-fade-in">
                        ⚠️ {errorMessage}
                    </div>
                )}

                {/* Modal Header */}
                <div className="text-center mb-2 sm:mb-3 bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 border border-blue-200/30 shadow-sm flex-shrink-0">
                    <h2 id="scanning-modal-title" className="text-base sm:text-lg md:text-xl font-extrabold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent mb-0.5 sm:mb-1">
                        📡 Batch Scanning Mode
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium">Scan beberapa RFID sekaligus</p>
                </div>

                {/* Work Order Info */}
                <div className="bg-gradient-to-br from-white to-slate-50 rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 mb-2 sm:mb-3 flex flex-wrap gap-2 sm:gap-3 justify-around border border-slate-200 shadow-sm flex-shrink-0">
                    <div className="flex flex-col gap-0.5 sm:gap-1 relative pl-3 sm:pl-4">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                        <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider">WO</span>
                        <span className="text-xs sm:text-sm md:text-base text-slate-900 font-bold">{workOrderData.workOrder}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 sm:gap-1 relative pl-3 sm:pl-4">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                        <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider">Style</span>
                        <span className="text-xs sm:text-sm md:text-base text-slate-900 font-bold">{workOrderData.style}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 sm:gap-1 relative pl-3 sm:pl-4">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                        <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider">Buyer</span>
                        <span className="text-xs sm:text-sm md:text-base text-slate-900 font-bold">{workOrderData.buyer}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 sm:gap-1 relative pl-3 sm:pl-4">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                        <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider">Item</span>
                        <span className="text-xs sm:text-sm md:text-base text-slate-900 font-bold">{workOrderData.item}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 sm:gap-1 relative pl-3 sm:pl-4">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                        <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider">Color</span>
                        <span className="text-xs sm:text-sm md:text-base text-slate-900 font-bold">{workOrderData.color}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 sm:gap-1 relative pl-3 sm:pl-4">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                        <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider">Size</span>
                        <span className="text-xs sm:text-sm md:text-base text-slate-900 font-bold">{workOrderData.size}</span>
                    </div>
                </div>

                {/* Scan Area */}
                <div className="relative bg-gradient-to-br from-indigo-50/80 via-blue-50/80 to-indigo-50/80 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-2 sm:mb-3 min-h-[120px] sm:min-h-[140px] md:min-h-[160px] flex items-center justify-center border-2 border-transparent bg-clip-padding"
                    style={{
                        backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.1) 0%, transparent 70%), radial-gradient(circle at 70% 70%, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
                        boxShadow: '0 8px 16px -4px rgba(59, 130, 246, 0.15), inset 0 2px 8px rgba(255, 255, 255, 0.5), inset 0 -2px 8px rgba(59, 130, 246, 0.1)',
                    }}
                >
                    {/* Animated Border */}
                    <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 opacity-50 animate-pulse"></div>
                    
                    <div className="relative z-10 w-full text-center">
                        {/* RFID Card Animation */}
                        <div className="relative mb-3 sm:mb-4 flex items-center justify-center h-16 sm:h-20 md:h-24">
                            <div className="relative w-32 h-20 sm:w-40 sm:h-24 md:w-48 md:h-28 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-lg sm:rounded-xl shadow-xl border border-blue-400/30 animate-float overflow-hidden"
                                style={{
                                    boxShadow: '0 8px 16px rgba(37, 99, 235, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.1)'
                                }}
                            >
                                {/* Card Chip */}
                                <div className="absolute top-10 sm:top-12 md:top-14 left-6 sm:left-8 md:left-10 w-10 h-8 sm:w-12 sm:h-10 md:w-14 md:h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-md shadow-inner"></div>
                                
                                {/* Card Waves */}
                                <div className="absolute right-4 sm:right-6 md:right-8 top-1/2 -translate-y-1/2">
                                    <div className="absolute w-6 h-6 sm:w-8 sm:h-8 border-2 sm:border-3 border-white/30 rounded-full animate-wave-expand"></div>
                                    <div className="absolute w-6 h-6 sm:w-8 sm:h-8 border-2 sm:border-3 border-white/30 rounded-full animate-wave-expand" style={{ animationDelay: '0.3s' }}></div>
                                    <div className="absolute w-6 h-6 sm:w-8 sm:h-8 border-2 sm:border-3 border-white/30 rounded-full animate-wave-expand" style={{ animationDelay: '0.6s' }}></div>
                                </div>
                                
                                {/* Card Text */}
                                <div className="absolute bottom-2 sm:bottom-3 md:bottom-4 left-3 sm:left-4 md:left-5 text-white">
                                    <div className="text-xs sm:text-sm md:text-base font-bold tracking-wider mb-0.5 sm:mb-1">RFID</div>
                                    <div className="text-[10px] sm:text-xs md:text-sm tracking-wider opacity-90">●●●● ●●●● ●●●●</div>
                                </div>
                                
                                {/* Scan Beam */}
                                <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-scan-beam"></div>
                            </div>
                        </div>

                        {/* Status Text & Buffer Display */}
                        {rfidBuffer.length > 0 ? (
                            <div className="mt-2 sm:mt-3">
                                <p className="text-xs sm:text-sm text-emerald-600 font-bold uppercase tracking-wider mb-1 sm:mb-2">📝 Sedang membaca...</p>
                                <p className="text-base sm:text-lg md:text-xl font-black text-slate-900 font-mono tracking-wider bg-gradient-to-br from-blue-100 to-blue-200 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border-2 border-blue-500 shadow-lg animate-pulse-glow">
                                    {rfidBuffer}
                                </p>
                            </div>
                        ) : (
                            <p className="text-xs sm:text-sm md:text-base text-blue-700 font-bold mt-2 sm:mt-3 animate-blink">🔍 Siap Scan - Dekatkan kartu RFID</p>
                        )}
                    </div>
                </div>

                {/* Scanned List */}
                <div className="border-2 border-slate-200 rounded-lg sm:rounded-xl overflow-hidden mb-2 sm:mb-3 flex flex-col min-h-0 max-h-[120px] sm:max-h-[140px] bg-white shadow-sm flex-shrink-0">
                    <div className="bg-gradient-to-r from-slate-50 to-indigo-50 px-2 sm:px-3 py-1.5 sm:py-2 flex justify-between items-center border-b-2 border-slate-200">
                        <h3 className="text-xs sm:text-sm md:text-base text-slate-900 font-bold">📋 RFID yang Sudah di-Scan</h3>
                        <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-extrabold text-xs sm:text-sm shadow-md min-w-[28px] sm:min-w-[35px] text-center">
                            {scannedRfids.length}
                        </span>
                    </div>

                    {scannedRfids.length === 0 ? (
                        <div className="p-4 sm:p-6 text-center text-slate-400 text-xs sm:text-sm font-medium">
                            Belum ada RFID yang di-scan
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-1 sm:p-2 bg-slate-50">
                            {scannedRfids.map((rfid, index) => (
                                <div 
                                    key={index} 
                                    className={`flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 bg-white border-2 rounded-lg sm:rounded-xl mb-1.5 sm:mb-2 transition-all duration-300 hover:translate-x-1 hover:shadow-md animate-slide-in-right ${
                                        rfid.status === 'hasper' 
                                            ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-amber-100' 
                                            : 'border-slate-200 hover:border-blue-400'
                                    }`}
                                >
                                    <span className="w-6 h-6 sm:w-7 sm:h-7 bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 rounded-lg sm:rounded-xl flex items-center justify-center font-extrabold text-xs sm:text-sm border-2 border-blue-300 shadow-sm flex-shrink-0">
                                        {index + 1}
                                    </span>
                                    <span className="flex-1 font-mono font-semibold text-slate-900 text-xs sm:text-sm md:text-base tracking-wide">
                                        {rfid.id}
                                    </span>
                                    <span className="text-[10px] sm:text-xs text-slate-500 font-medium bg-slate-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md">
                                        {rfid.scanTime.toLocaleTimeString('id-ID')}
                                    </span>
                                    {rfid.status === 'hasper' && (
                                        <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md whitespace-nowrap shadow-sm animate-pulse">
                                            🔄 Duplikasi
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 sm:gap-3 flex-shrink-0 mt-auto">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCancel();
                        }}
                        disabled={isSubmitting}
                        type="button"
                        className="flex-1 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 border-2 border-slate-300 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm md:text-base transition-all duration-300 hover:from-red-50 hover:to-red-100 hover:border-red-300 hover:text-red-600 hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ❌ Batal
                    </button>
                    <button
                        onClick={handleSaveAll}
                        disabled={scannedRfids.length === 0 || isSubmitting}
                        type="button"
                        className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm md:text-base shadow-lg transition-all duration-300 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? '⏳ Menyimpan...' : `💾 Simpan Semua (${scannedRfids.length})`}
                    </button>
                </div>
            </div>

            {/* Custom Animations */}
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slide-up {
                    from { opacity: 0; transform: translateY(50px) scale(0.9); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0) rotateX(0deg); }
                    50% { transform: translateY(-10px) rotateX(5deg); }
                }
                @keyframes wave-expand {
                    0% { width: 24px; height: 24px; opacity: 1; }
                    100% { width: 64px; height: 64px; opacity: 0; }
                }
                @keyframes scan-beam {
                    0%, 100% { top: 0; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 100%; }
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(0.98); }
                }
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
                    50% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.6); }
                }
                @keyframes slide-in-right {
                    from { opacity: 0; transform: translateX(-30px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-fade-in { animation: fade-in 0.3s ease; }
                .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
                .animate-float { animation: float 3s ease-in-out infinite; }
                .animate-wave-expand { animation: wave-expand 2s ease-out infinite; }
                .animate-scan-beam { animation: scan-beam 2s ease-in-out infinite; }
                .animate-blink { animation: blink 1.5s ease-in-out infinite; }
                .animate-pulse-glow { animation: pulse-glow 1s ease-in-out infinite; }
                .animate-slide-in-right { animation: slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
            `}</style>
        </div>
    );
}


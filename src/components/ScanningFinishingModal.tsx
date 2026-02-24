import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, Loader2, LogIn, LogOut } from 'lucide-react';
import { dryroomCheckIn, dryroomCheckOut, foldingCheckIn, foldingCheckOut, rejectRoomCheckIn, rejectRoomCheckOut, API_BASE_URL, getDefaultHeaders, getActiveUsers } from '../config/api';

// Sound effect paths - file ada di root assets folder
const successSoundPath = '/assets/succes.mp3';
const errorSoundPath = '/assets/error.mp3';

interface ScanningFinishingModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'dryroom' | 'folding' | 'reject'; // Tipe finishing: dryroom, folding, atau reject
    defaultAction?: 'checkin' | 'checkout'; // Default action saat modal dibuka
    autoSubmit?: boolean; // Auto submit saat Enter tanpa perlu click
    tableNumber?: number; // Nomor table (optional)
    nik?: string; // NIK user untuk checkout (optional)
    onSuccess?: (tableNumber?: number) => void; // Callback saat scan berhasil, dengan tableNumber untuk optimistik update
    compact?: boolean; // Compact mode (tidak fullscreen, untuk embedded)
    customActionLabel?: string; // Custom label untuk action (optional, untuk kasus khusus seperti Reject Mati)
}

interface ScannedItem {
    rfid: string;
    timestamp: Date;
    status: 'success' | 'error';
    message?: string;
    action?: 'checkin' | 'checkout'; // Action yang dilakukan
}

export default function ScanningFinishingModal({
    isOpen,
    onClose,
    type,
    defaultAction = 'checkin',
    autoSubmit = false,
    tableNumber,
    nik,
    onSuccess,
    compact = false,
    customActionLabel
}: ScanningFinishingModalProps) {
    const [rfidInput, setRfidInput] = useState('');
    const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
    const [selectedAction, setSelectedAction] = useState<'checkin' | 'checkout'>(defaultAction);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const successAudioRef = useRef<HTMLAudioElement | null>(null);
    const errorAudioRef = useRef<HTMLAudioElement | null>(null);
    const rfidInputRef = useRef<string>(''); // Ref untuk menyimpan nilai rfidInput terbaru
    const selectedActionRef = useRef<'checkin' | 'checkout'>(defaultAction); // Ref untuk menyimpan selectedAction terbaru

    // Initialize audio objects
    useEffect(() => {
        successAudioRef.current = new Audio(successSoundPath);
        errorAudioRef.current = new Audio(errorSoundPath);

        // Set volume (0.0 to 1.0)
        if (successAudioRef.current) {
            successAudioRef.current.volume = 0.7;
        }
        if (errorAudioRef.current) {
            errorAudioRef.current.volume = 0.7;
        }

        return () => {
            // Cleanup
            if (successAudioRef.current) {
                successAudioRef.current.pause();
                successAudioRef.current = null;
            }
            if (errorAudioRef.current) {
                errorAudioRef.current.pause();
                errorAudioRef.current = null;
            }
        };
    }, []);

    // Function to play sound effect
    const playSound = (type: 'success' | 'error') => {
        try {
            if (type === 'success' && successAudioRef.current) {
                successAudioRef.current.currentTime = 0; // Reset to start
                successAudioRef.current.play().catch(err => {
                    console.warn('Failed to play success sound:', err);
                });
            } else if (type === 'error' && errorAudioRef.current) {
                errorAudioRef.current.currentTime = 0; // Reset to start
                errorAudioRef.current.play().catch(err => {
                    console.warn('Failed to play error sound:', err);
                });
            }
        } catch (error) {
            console.warn('Error playing sound:', error);
        }
    };

    // Theme colors berdasarkan type
    const theme = type === 'dryroom'
        ? {
            name: 'Dryroom',
            primaryColor: '#06b6d4',
            primaryGradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)',
            bgGradient: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 50%, #DBEAFE 100%)',
            iconBgColor: '#cffafe',
            borderColor: '#06b6d4',
            headerGradient: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
        }
        : type === 'folding'
            ? {
                name: 'Folding',
                primaryColor: '#14b8a6',
                primaryGradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%)',
                bgGradient: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 50%, #BBF7D0 100%)',
                iconBgColor: '#ccfbf1',
                borderColor: '#14b8a6',
                headerGradient: 'linear-gradient(135deg, #065F46 0%, #047857 100%)',
            }
            : {
                name: 'Reject Room',
                primaryColor: '#ef4444',
                primaryGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
                bgGradient: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 50%, #FECACA 100%)',
                iconBgColor: '#fee2e2',
                borderColor: '#ef4444',
                headerGradient: 'linear-gradient(135deg, #991B1B 0%, #DC2626 100%)',
            };

    // Update selectedAction saat defaultAction berubah
    useEffect(() => {
        setSelectedAction(defaultAction);
        selectedActionRef.current = defaultAction;
    }, [defaultAction]);

    // Check server status saat modal dibuka
    useEffect(() => {
        if (isOpen) {
            checkServerStatus();
            // Reset RFID input saat modal dibuka untuk menghindari state lama
            setRfidInput('');
            rfidInputRef.current = '';
            if (inputRef.current) {
                inputRef.current.value = '';
            }
            // Update selectedAction sesuai dengan defaultAction saat modal dibuka
            setSelectedAction(defaultAction);
            selectedActionRef.current = defaultAction;
        }
    }, [isOpen, defaultAction]);

    // Validasi NIK saat modal dibuka untuk folding checkout
    useEffect(() => {
        if (isOpen && type === 'folding' && selectedAction === 'checkout') {
            // Validasi NIK untuk warning (tidak throw error, hanya warning)
            const trimmedNik = nik ? nik.trim() : '';
            if (!trimmedNik || trimmedNik === '' || trimmedNik === '00000000') {
                console.warn('⚠️ [Scanning Modal] NIK tidak valid untuk checkout folding:', trimmedNik);
            }
        }
    }, [isOpen, type, selectedAction, nik]);

    // Check server status
    const checkServerStatus = async () => {
        setServerStatus('checking');
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(`${API_BASE_URL}/health`, {
                method: 'GET',
                headers: {
                    ...getDefaultHeaders(),
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                setServerStatus('online');
            } else {
                setServerStatus('offline');
            }
        } catch (error) {
            setServerStatus('offline');
        }
    };

    // Handler untuk menangkap input dari RFID scanner tanpa keyboard muncul
    useEffect(() => {
        if (!isOpen) return;

        const input = inputRef.current;
        if (!input) return;

        // Deteksi mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // Handler untuk menangkap keyboard input dari RFID scanner
        const handleKeyDown = (e: KeyboardEvent) => {
            // Hanya tangkap jika input field ada dan tidak disabled
            // Gunakan ref untuk isProcessing dan selectedAction agar selalu mendapatkan nilai terbaru
            if (!input || input.disabled) return;

            // Abaikan jika user mengetik di elemen lain (seperti input lain, textarea, dll)
            const target = e.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && target !== input) {
                return;
            }

            // Tangkap semua karakter yang bisa menjadi bagian dari RFID
            if (e.key.length === 1 || e.key === 'Enter') {
                // Simulasi input ke field
                if (e.key === 'Enter') {
                    // Submit jika Enter - gunakan selectedAction dari ref untuk mendapatkan nilai terbaru
                    const currentValue = rfidInputRef.current || input.value || '';
                    if (currentValue.trim()) {
                        // Panggil handleRfidSubmit dengan nilai terbaru dari ref
                        handleRfidSubmit(currentValue);
                    }
                } else {
                    // Tambahkan karakter ke input
                    const currentValue = rfidInputRef.current || input.value || '';
                    const newValue = currentValue + e.key;
                    input.value = newValue;
                    setRfidInput(newValue);
                    rfidInputRef.current = newValue;

                    // Trigger onChange event
                    const event = new Event('input', { bubbles: true });
                    input.dispatchEvent(event);
                }

                // Prevent default untuk mencegah keyboard muncul
                e.preventDefault();
                e.stopPropagation();
            }
        };

        // Handler untuk mencegah keyboard muncul saat focus
        const handleFocus = () => {
            if (isMobile) {
                // Blur segera untuk mencegah keyboard
                setTimeout(() => {
                    if (input && document.activeElement === input) {
                        input.blur();
                    }
                }, 0);
            }
        };

        // Handler untuk mencegah keyboard muncul saat touch
        const handleTouchStart = (e: TouchEvent) => {
            if (isMobile) {
                e.preventDefault();
            }
        };

        // Tambahkan event listener di document level untuk menangkap semua keyboard input
        document.addEventListener('keydown', handleKeyDown, true);

        // Event listener untuk mencegah keyboard muncul
        if (isMobile) {
            input.addEventListener('focus', handleFocus);
            input.addEventListener('touchstart', handleTouchStart);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
            if (isMobile) {
                input.removeEventListener('focus', handleFocus);
                input.removeEventListener('touchstart', handleTouchStart);
            }
        };
    }, [isOpen]); // Hapus isProcessing dari dependency karena kita tidak perlu recreate listener

    // Reset input saat modal terbuka
    useEffect(() => {
        if (isOpen) {
            setRfidInput('');
            rfidInputRef.current = '';
            if (inputRef.current) {
                inputRef.current.value = '';
            }
        }
    }, [isOpen]);

    // Set default action saat modal dibuka
    useEffect(() => {
        if (isOpen) {
            setSelectedAction(defaultAction);
            selectedActionRef.current = defaultAction;
        }
    }, [isOpen, defaultAction]);

    // Reset saat modal ditutup
    useEffect(() => {
        if (!isOpen) {
            setRfidInput('');
            rfidInputRef.current = '';
            setScannedItems([]);
            setIsProcessing(false);
            setServerStatus('checking');
            setSelectedAction(defaultAction);
            selectedActionRef.current = defaultAction;

            if (inputRef.current) {
                inputRef.current.value = '';
                inputRef.current.blur();
            }
        }
    }, [isOpen, defaultAction]);

    // Auto-scroll ke atas ketika ada data baru
    useEffect(() => {
        if (scrollContainerRef.current && scannedItems.length > 0) {
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

    // Handle RFID input dan proses check in/out
    const handleRfidSubmit = async (rfid: string) => {
        if (!rfid.trim()) return;

        const trimmedRfid = rfid.trim();

        // Gunakan selectedAction dari ref untuk memastikan mendapatkan nilai terbaru
        const currentAction = selectedActionRef.current;

        // Cek duplikasi di local state
        const isLocalDuplicate = scannedItems.some(item => item.rfid === trimmedRfid && item.action === currentAction);

        if (isLocalDuplicate) {
            const timestamp = new Date();
            // Play error sound
            playSound('error');
            setScannedItems(prev => {
                const newItems: ScannedItem[] = [...prev, {
                    rfid: trimmedRfid,
                    timestamp,
                    status: 'error' as const,
                    message: `RFID sudah di-${currentAction === 'checkin' ? 'Check In' : 'Check Out'} dalam session ini (Duplikasi)`,
                    action: currentAction
                }];
                return newItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            });
            setRfidInput('');
            rfidInputRef.current = '';
            if (inputRef.current) {
                inputRef.current.value = '';
            }
            return;
        }

        setIsProcessing(true);
        const timestamp = new Date();

        try {
            // API call untuk check in/out finishing menggunakan fungsi dari api.ts
            let response;

            if (type === 'dryroom') {
                if (currentAction === 'checkin') {
                    response = await dryroomCheckIn(trimmedRfid);
                } else {
                    response = await dryroomCheckOut(trimmedRfid);
                }
            } else if (type === 'folding') {
                if (currentAction === 'checkin') {
                    response = await foldingCheckIn(trimmedRfid);
                } else {
                    // Untuk checkout, kirim NIK dan table number jika ada
                    // Validasi: NIK harus ada dan valid untuk checkout folding
                    let trimmedNik = nik ? nik.trim() : '';

                    // Jika NIK tidak tersedia tapi table number ada, coba ambil dari active users
                    if ((!trimmedNik || trimmedNik === '' || trimmedNik === '00000000') && tableNumber) {
                        console.log(`⚠️ [FOLDING CHECKOUT] NIK tidak tersedia, mencoba fetch dari active users untuk table ${tableNumber}`);
                        try {
                            const activeUserResponse = await getActiveUsers(tableNumber);
                            if (activeUserResponse.success && activeUserResponse.data) {
                                const activeUser = Array.isArray(activeUserResponse.data)
                                    ? activeUserResponse.data[0]
                                    : activeUserResponse.data;
                                if (activeUser && activeUser.nik) {
                                    trimmedNik = activeUser.nik.trim();
                                    console.log(`✅ [FOLDING CHECKOUT] NIK ditemukan dari active users: ${trimmedNik}`);
                                }
                            }
                        } catch (error) {
                            console.error('❌ [FOLDING CHECKOUT] Error fetching active user:', error);
                        }
                    }

                    // Validasi dasar: NIK tidak boleh kosong atau "00000000"
                    if (!trimmedNik || trimmedNik === '' || trimmedNik === '00000000') {
                        console.error('❌ [FOLDING CHECKOUT] NIK tidak valid (kosong atau 00000000):', { nik: trimmedNik, tableNumber, type });
                        throw new Error('NIK user tidak tersedia atau tidak valid. Pastikan user sudah login di table ini sebelum melakukan checkout.');
                    }

                    // Validasi: Pastikan NIK tidak mengandung karakter dummy atau placeholder
                    // Hanya tolak NIK yang jelas-jelas dummy (minimal 6 digit berurutan)
                    const isDummyNik = trimmedNik.length >= 6 && (
                        trimmedNik.startsWith('123456') ||
                        trimmedNik.startsWith('234567') ||
                        trimmedNik.startsWith('345678') ||
                        trimmedNik.startsWith('456789') ||
                        trimmedNik.startsWith('567890') ||
                        trimmedNik.startsWith('678901') ||
                        trimmedNik.startsWith('789012') ||
                        trimmedNik.startsWith('890123') ||
                        trimmedNik === '12345678' ||
                        trimmedNik === '23456789' ||
                        trimmedNik === '34567890'
                    );

                    if (isDummyNik) {
                        console.error('❌ [FOLDING CHECKOUT] NIK adalah dummy/placeholder:', { nik: trimmedNik, tableNumber, type });
                        throw new Error('NIK user tidak tersedia. Pastikan user sudah login di table ini sebelum melakukan checkout.');
                    }

                    // Log untuk debugging
                    console.log('✅ [FOLDING CHECKOUT] Attempting checkout:', {
                        rfid: trimmedRfid,
                        nik: trimmedNik,
                        tableNumber,
                        type
                    });

                    response = await foldingCheckOut(trimmedRfid, trimmedNik, tableNumber);
                }
            } else if (type === 'reject') {
                if (currentAction === 'checkin') {
                    response = await rejectRoomCheckIn(trimmedRfid);
                } else {
                    response = await rejectRoomCheckOut(trimmedRfid);
                }
            } else {
                throw new Error('Tipe finishing tidak valid');
            }

            // Cek apakah response berhasil (bisa dari response.success atau response.data.message)
            // response adalah ApiResponse<FinishingCheckResponse>, jadi data ada di response.data
            const responseData = response.data as any; // Type assertion karena response.data bisa berisi data lengkap dari API
            const isSuccess = response.success ||
                (responseData?.message && typeof responseData.message === 'string' && responseData.message.includes('Success')) ||
                (responseData?.success === true);

            if (isSuccess) {
                // Response berhasil
                const message = (responseData?.message && typeof responseData.message === 'string')
                    ? responseData.message
                    : `${currentAction === 'checkin' ? 'Check In' : 'Check Out'} berhasil`;

                // Play success sound
                playSound('success');

                setScannedItems(prev => {
                    const newItems: ScannedItem[] = [...prev, {
                        rfid: trimmedRfid,
                        timestamp,
                        status: 'success' as const,
                        message: message,
                        action: currentAction
                    }];
                    return newItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
                });

                // Call onSuccess callback jika ada, dengan tableNumber untuk optimistik update
                if (onSuccess) {
                    onSuccess(tableNumber);
                }
            } else {
                const errorMsg = response.error || responseData?.error || (responseData?.message && typeof responseData.message === 'string' ? responseData.message : '') || 'Gagal memproses';
                throw new Error(errorMsg);
            }
        } catch (error) {
            let errorMessage = 'Gagal menyimpan';
            if (error instanceof Error) {
                if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
                    errorMessage = `Tidak dapat terhubung ke server. Pastikan server.js berjalan di http://${window.location.hostname}:8000`;
                } else {
                    errorMessage = error.message;
                }
            }

            // Play error sound
            playSound('error');

            setScannedItems(prev => {
                const newItems: ScannedItem[] = [...prev, {
                    rfid: trimmedRfid,
                    timestamp,
                    status: 'error' as const,
                    message: errorMessage,
                    action: currentAction
                }];
                return newItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            });
        } finally {
            setIsProcessing(false);
            setRfidInput('');
            rfidInputRef.current = '';
            if (inputRef.current) {
                inputRef.current.value = '';
            }
        }
    };

    // Handle Enter key
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && rfidInput.trim() && !isProcessing) {
            e.preventDefault();
            handleRfidSubmit(rfidInput);
        }
    };

    // Update ref setiap kali rfidInput atau selectedAction berubah
    useEffect(() => {
        rfidInputRef.current = rfidInput;
    }, [rfidInput]);

    useEffect(() => {
        selectedActionRef.current = selectedAction;
    }, [selectedAction]);

    // Wrapper function untuk setSelectedAction yang juga update ref
    const updateSelectedAction = (action: 'checkin' | 'checkout') => {
        setSelectedAction(action);
        selectedActionRef.current = action;
    };

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setRfidInput(value);
        rfidInputRef.current = value;

        // Auto-submit jika input panjang (untuk RFID reader yang mengirim data lengkap sekaligus)
        // Biasanya RFID reader mengirim data dengan Enter di akhir, tapi beberapa mengirim langsung
        if (value.length > 8 && !value.includes('\n') && !value.includes('\r') && autoSubmit) {
            // Jika autoSubmit aktif dan input sudah cukup panjang, submit otomatis
            setTimeout(() => {
                if (rfidInputRef.current === value && value.trim()) {
                    handleRfidSubmit(value);
                }
            }, 100);
        }
    };

    if (!isOpen) return null;

    // Compact mode (embedded, bukan fullscreen)
    if (compact) {
        return (
            <div
                ref={containerRef}
                className="bg-white rounded-xl shadow-lg w-full flex flex-col"
                style={{
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    border: `1px solid ${theme.borderColor}40`,
                    padding: '0.75rem',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Header */}
                <div
                    className="text-center mb-1.5 xs:mb-2"
                    style={{
                        background: theme.bgGradient,
                        borderRadius: '6px',
                        padding: '0.25rem 0.5rem',
                        border: `1px solid ${theme.borderColor}30`,
                        boxShadow: `0 4px 12px ${theme.borderColor}08`
                    }}
                >
                    <h2
                        className="text-base xs:text-lg sm:text-xl font-extrabold mb-0.5 xs:mb-1"
                        style={{
                            background: theme.headerGradient,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            letterSpacing: '-0.5px'
                        }}
                    >
                        📡 Scanning {theme.name}
                    </h2>
                    <p className="text-xs xs:text-sm font-medium" style={{ color: '#475569' }}>
                        Scan RFID untuk {customActionLabel || (selectedAction === 'checkin' ? 'Check In' : 'Check Out')}{tableNumber ? ` Table ${tableNumber}` : ''}
                    </p>
                    {autoSubmit && !tableNumber && (
                        <div className="mt-1 px-2 py-0.5 rounded-md inline-block text-[10px] font-semibold"
                            style={{
                                background: selectedAction === 'checkin'
                                    ? 'rgba(34, 197, 94, 0.1)'
                                    : 'rgba(239, 68, 68, 0.1)',
                                color: selectedAction === 'checkin'
                                    ? '#16a34a'
                                    : '#dc2626',
                                border: `1px solid ${selectedAction === 'checkin' ? '#22c55e' : '#ef4444'}40`
                            }}
                        >
                            Mode: {customActionLabel || (selectedAction === 'checkin' ? 'Check In' : 'Check Out')}
                        </div>
                    )}

                    {serverStatus === 'checking' && (
                        <div
                            className="mt-1.5 xs:mt-2 px-2 xs:px-3 py-1 xs:py-1.5 rounded-md inline-block"
                            style={{
                                background: theme.bgGradient,
                                border: `2px solid ${theme.primaryColor}`
                            }}
                        >
                            <p className="text-[10px] xs:text-xs font-bold" style={{ color: theme.primaryColor }}>
                                ⏳ Memeriksa koneksi server...
                            </p>
                        </div>
                    )}
                </div>

                {/* Action Selection Buttons - Hidden jika autoSubmit aktif */}
                {!autoSubmit && (
                    <div className="mb-2 flex flex-wrap gap-2 xs:gap-2.5 sm:gap-3">
                        <button
                            onClick={() => updateSelectedAction('checkin')}
                            disabled={isProcessing}
                            className={`flex-1 min-w-[120px] xs:min-w-[140px] py-2 xs:py-2.5 sm:py-3 px-3 xs:px-4 sm:px-5 rounded-lg xs:rounded-xl font-bold text-xs xs:text-sm sm:text-base transition-all ${selectedAction === 'checkin' ? 'text-white' : 'text-gray-600 bg-gray-100'
                                }`}
                            style={{
                                background: selectedAction === 'checkin'
                                    ? theme.primaryGradient
                                    : 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                                border: `2px solid ${selectedAction === 'checkin' ? theme.primaryColor : '#E2E8F0'}`,
                                boxShadow: selectedAction === 'checkin'
                                    ? `0 4px 12px ${theme.primaryColor}35`
                                    : '0 2px 4px rgba(0, 0, 0, 0.05)',
                                opacity: isProcessing ? 0.5 : 1
                            }}
                        >
                            <LogIn className="w-4 h-4 inline-block mr-2" />
                            Check In
                        </button>
                        {(type === 'dryroom' || type === 'reject' || (type === 'folding' && defaultAction === 'checkout')) && (
                            <button
                                onClick={() => updateSelectedAction('checkout')}
                                disabled={isProcessing}
                                className={`flex-1 min-w-[120px] xs:min-w-[140px] py-2 xs:py-2.5 sm:py-3 px-3 xs:px-4 sm:px-5 rounded-lg xs:rounded-xl font-bold text-xs xs:text-sm sm:text-base transition-all ${selectedAction === 'checkout' ? 'text-white' : 'text-gray-600 bg-gray-100'
                                    }`}
                                style={{
                                    background: selectedAction === 'checkout'
                                        ? theme.primaryGradient
                                        : 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                                    border: `2px solid ${selectedAction === 'checkout' ? theme.primaryColor : '#E2E8F0'}`,
                                    boxShadow: selectedAction === 'checkout'
                                        ? `0 4px 12px ${theme.primaryColor}35`
                                        : '0 2px 4px rgba(0, 0, 0, 0.05)',
                                    opacity: isProcessing ? 0.5 : 1
                                }}
                            >
                                <LogOut className="w-4 h-4 inline-block mr-2" />
                                Check Out
                            </button>
                        )}
                    </div>
                )}

                {/* Scan Area */}
                <div
                    className="mb-2 relative cursor-text"
                    onClick={() => {
                        if (inputRef.current && !isProcessing) {
                            inputRef.current.focus();
                        }
                    }}
                    style={{
                        background: theme.bgGradient,
                        borderRadius: '6px',
                        padding: '0.4rem',
                        minHeight: '130px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `2px solid ${theme.borderColor}40`,
                        boxShadow: `0 8px 16px -4px ${theme.primaryColor}15, inset 0 2px 8px rgba(255, 255, 255, 0.5)`
                    }}
                >
                    {/* RFID Card Animation */}
                    <div className="relative" style={{ filter: `drop-shadow(0 6px 12px ${theme.primaryColor}25)` }}>
                        <div
                            className="relative"
                            style={{
                                width: '160px',
                                height: '88px',
                                background: theme.primaryGradient,
                                borderRadius: '8px',
                                boxShadow: `0 8px 16px ${theme.primaryColor}40, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
                                animation: 'cardFloat 3s ease-in-out infinite',
                                border: `1px solid ${theme.borderColor}30`,
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

                            {/* Card Text */}
                            <div className="absolute bottom-2.5 left-4 text-white">
                                <div className="text-base font-bold mb-0.5 tracking-wider">RFID</div>
                                <div className="text-xs tracking-wider opacity-90">●●●● ●●●● ●●●●</div>
                            </div>
                        </div>
                    </div>

                    {/* Status Text */}
                    <div className="absolute bottom-4 left-0 right-0 text-center">
                        {rfidInput.length > 0 ? (
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: theme.primaryColor }}>
                                    📝 Sedang membaca...
                                </p>
                                <p
                                    className="font-extrabold text-lg font-mono tracking-wide px-3 py-2 rounded-md inline-block"
                                    style={{
                                        color: '#0F172A',
                                        background: theme.bgGradient,
                                        border: `2px solid ${theme.primaryColor}`,
                                        boxShadow: `0 0 20px ${theme.primaryColor}30`,
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
                                    color: theme.primaryColor,
                                    animation: 'blink 1.5s ease-in-out infinite',
                                    textShadow: `0 2px 4px ${theme.primaryColor}10`,
                                    letterSpacing: '0.25px'
                                }}
                            >
                                🔍 Siap Scan - Dekatkan kartu RFID
                            </p>
                        )}
                    </div>
                </div>

                {/* Input Field - Hidden, langsung aktif tanpa click dan tanpa keyboard */}
                <input
                    ref={inputRef}
                    type="text"
                    value={rfidInput}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onKeyPress={() => {
                        // Pastikan semua key press diterima, termasuk dari RFID scanner
                        // Tidak ada blocking untuk memastikan input dari scanner bisa masuk
                    }}
                    disabled={isProcessing}
                    className="sr-only"
                    autoFocus
                    autoComplete="off"
                    inputMode="text"
                    readOnly={false}
                    tabIndex={0}
                    style={{
                        position: 'absolute',
                        opacity: 0,
                        pointerEvents: 'auto',
                        width: '1px',
                        height: '1px',
                        left: '-9999px',
                        zIndex: 1
                    }}
                    key={isOpen ? 'open' : 'closed'}
                />

                {/* Scanned List */}
                <div
                    className="mb-2 flex flex-col flex-shrink-0"
                    style={{
                        border: `2px solid ${theme.borderColor}40`,
                        borderRadius: '6px',
                        overflow: 'hidden',
                        background: 'white',
                        boxShadow: `0 4px 6px -1px ${theme.primaryColor}05`,
                        display: 'flex',
                        flexDirection: 'column',
                        height: '280px'
                    }}
                >
                    <div
                        className="px-3 py-2 flex justify-between items-center border-b-2 border-gray-200 flex-shrink-0"
                        style={{
                            background: theme.bgGradient
                        }}
                    >
                        <h3 className="text-sm font-bold" style={{ color: '#0F172A', letterSpacing: '-0.25px' }}>
                            📋 RFID yang Sudah di-Scan
                        </h3>
                        <span
                            className="px-3 py-1.5 rounded-full font-extrabold text-sm text-white text-center min-w-[35px]"
                            style={{
                                background: theme.primaryGradient,
                                boxShadow: `0 2px 8px ${theme.primaryColor}30`
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
                                scrollbarColor: `${theme.primaryColor} #F1F5F9`,
                                overflowY: 'auto',
                                overflowX: 'hidden',
                                height: '230px',
                                maxHeight: '230px'
                            }}
                        >
                            {scannedItems.map((item, index) => {
                                const isError = item.status === 'error';
                                return (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 p-2 mb-1.5 rounded-md relative overflow-hidden transition-all"
                                        style={{
                                            background: item.status === 'success'
                                                ? 'white'
                                                : 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
                                            border: `2px solid ${item.status === 'success'
                                                ? theme.borderColor + '40'
                                                : '#EF4444'}`,
                                            animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                                        }}
                                    >
                                        <div
                                            className="absolute left-0 top-0 bottom-0 w-1 transition-transform"
                                            style={{
                                                background: item.status === 'success'
                                                    ? theme.primaryGradient
                                                    : 'linear-gradient(180deg, #EF4444 0%, #DC2626 100%)',
                                                transform: 'scaleY(1)'
                                            }}
                                        />
                                        <div
                                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-extrabold text-xs border-2"
                                            style={{
                                                background: item.status === 'success'
                                                    ? theme.bgGradient
                                                    : 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
                                                color: item.status === 'success'
                                                    ? theme.primaryColor
                                                    : '#DC2626',
                                                borderColor: item.status === 'success'
                                                    ? theme.primaryColor
                                                    : '#EF4444',
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
                                                        : '#DC2626'
                                                }}
                                            >
                                                {item.rfid}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span
                                                    className="text-xs font-medium px-2 py-0.5 rounded-md inline-block"
                                                    style={{
                                                        color: isError ? '#DC2626' : theme.primaryColor,
                                                        background: isError ? '#FEE2E2' : theme.bgGradient
                                                    }}
                                                >
                                                    {item.action === 'checkin' ? 'Check In' : 'Check Out'}
                                                </span>
                                                <span
                                                    className="text-xs font-medium px-2 py-0.5 rounded-md inline-block"
                                                    style={{
                                                        color: '#64748B',
                                                        background: '#F1F5F9'
                                                    }}
                                                >
                                                    {item.timestamp.toLocaleTimeString('id-ID')}
                                                </span>
                                            </div>
                                            {item.message && (
                                                <div
                                                    className="text-xs font-medium mt-0.5"
                                                    style={{
                                                        color: isError ? '#DC2626' : '#64748B'
                                                    }}
                                                >
                                                    {item.message}
                                                </div>
                                            )}
                                        </div>
                                        {item.status === 'success' ? (
                                            <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: theme.primaryColor }} />
                                        ) : (
                                            <X className="w-5 h-5 flex-shrink-0 text-red-600" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Action Buttons - Hidden jika compact mode */}
                {!compact && (
                    <div className="flex flex-wrap gap-2 xs:gap-3 sm:gap-4 mt-2 flex-shrink-0">
                        <button
                            onClick={() => {
                                onClose();
                            }}
                            disabled={isProcessing}
                            className="flex-1 min-w-[120px] xs:min-w-[140px] py-2.5 xs:py-3 sm:py-3.5 px-4 xs:px-5 sm:px-6 rounded-lg xs:rounded-xl font-bold text-xs xs:text-sm sm:text-base transition-all"
                            style={{
                                background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                                color: '#475569',
                                border: '2px solid #E2E8F0',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                                letterSpacing: '0.25px',
                                opacity: isProcessing ? 0.5 : 1
                            }}
                        >
                            ❌ Batal
                        </button>
                        <button
                            onClick={async () => {
                                if (isProcessing || scannedItems.length === 0) return;
                                onClose();
                            }}
                            disabled={isProcessing || scannedItems.length === 0}
                            className="flex-1 min-w-[120px] xs:min-w-[140px] py-2.5 xs:py-3 sm:py-3.5 px-4 xs:px-5 sm:px-6 rounded-lg xs:rounded-xl font-bold text-xs xs:text-sm sm:text-base text-white transition-all relative overflow-hidden"
                            style={{
                                background: theme.primaryGradient,
                                boxShadow: `0 4px 12px ${theme.primaryColor}35`,
                                letterSpacing: '0.25px',
                                opacity: (isProcessing || scannedItems.length === 0) ? 0.5 : 1,
                                cursor: (isProcessing || scannedItems.length === 0) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 inline-block mr-2 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                `💾 Selesai (${scannedItems.length})`
                            )}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Fullscreen mode (default)
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
                    className="bg-white rounded-xl xs:rounded-2xl sm:rounded-3xl shadow-2xl w-[95%] max-w-[900px] max-h-[95vh] flex flex-col"
                    style={{
                        background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(148, 163, 184, 0.1), 0 8px 16px -8px rgba(59, 130, 246, 0.1)',
                        animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        border: `1px solid ${theme.borderColor}40`,
                        padding: '0.75rem',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2 flex-shrink-0">
                        <div className="text-center flex-1">
                            <h2
                                className="text-base xs:text-lg sm:text-xl font-extrabold mb-0.5 xs:mb-1"
                                style={{
                                    background: theme.headerGradient,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    letterSpacing: '-0.5px'
                                }}
                            >
                                📡 Scanning {theme.name}
                            </h2>
                            <p className="text-xs xs:text-sm font-medium" style={{ color: '#475569' }}>
                                Scan RFID untuk {customActionLabel || (selectedAction === 'checkin' ? 'Check In' : 'Check Out')}
                            </p>
                            {autoSubmit && (
                                <div className="mt-1 px-2 py-0.5 rounded-md inline-block text-[10px] font-semibold"
                                    style={{
                                        background: selectedAction === 'checkin'
                                            ? 'rgba(34, 197, 94, 0.1)'
                                            : 'rgba(239, 68, 68, 0.1)',
                                        color: selectedAction === 'checkin'
                                            ? '#16a34a'
                                            : '#dc2626',
                                        border: `1px solid ${selectedAction === 'checkin' ? '#22c55e' : '#ef4444'}40`
                                    }}
                                >
                                    Mode: {customActionLabel || (selectedAction === 'checkin' ? 'Check In' : 'Check Out')}
                                </div>
                            )}
                            {tableNumber && (
                                <div className="text-xs text-slate-500 mb-1">
                                    Table {tableNumber}
                                </div>
                            )}
                            {serverStatus === 'checking' && (
                                <div
                                    className="mt-1.5 xs:mt-2 px-2 xs:px-3 py-1 xs:py-1.5 rounded-md inline-block"
                                    style={{
                                        background: theme.bgGradient,
                                        border: `2px solid ${theme.primaryColor}`
                                    }}
                                >
                                    <p className="text-[10px] xs:text-xs font-bold" style={{ color: theme.primaryColor }}>
                                        ⏳ Memeriksa koneksi server...
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Selection Buttons - Hidden jika autoSubmit aktif */}
                    {!autoSubmit && (
                        <div className="mb-2 flex flex-wrap gap-2 xs:gap-2.5 sm:gap-3">
                            <button
                                onClick={() => updateSelectedAction('checkin')}
                                disabled={isProcessing}
                                className={`flex-1 min-w-[120px] xs:min-w-[140px] py-2 xs:py-2.5 sm:py-3 px-3 xs:px-4 sm:px-5 rounded-lg xs:rounded-xl font-bold text-xs xs:text-sm sm:text-base transition-all ${selectedAction === 'checkin' ? 'text-white' : 'text-gray-600 bg-gray-100'
                                    }`}
                                style={{
                                    background: selectedAction === 'checkin'
                                        ? theme.primaryGradient
                                        : 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                                    border: `2px solid ${selectedAction === 'checkin' ? theme.primaryColor : '#E2E8F0'}`,
                                    boxShadow: selectedAction === 'checkin'
                                        ? `0 4px 12px ${theme.primaryColor}35`
                                        : '0 2px 4px rgba(0, 0, 0, 0.05)',
                                    opacity: isProcessing ? 0.5 : 1
                                }}
                            >
                                <LogIn className="w-4 h-4 inline-block mr-2" />
                                Check In
                            </button>
                            {(type === 'dryroom' || type === 'reject' || (type === 'folding' && defaultAction === 'checkout')) && (
                                <button
                                    onClick={() => updateSelectedAction('checkout')}
                                    disabled={isProcessing}
                                    className={`flex-1 min-w-[120px] xs:min-w-[140px] py-2 xs:py-2.5 sm:py-3 px-3 xs:px-4 sm:px-5 rounded-lg xs:rounded-xl font-bold text-xs xs:text-sm sm:text-base transition-all ${selectedAction === 'checkout' ? 'text-white' : 'text-gray-600 bg-gray-100'
                                        }`}
                                    style={{
                                        background: selectedAction === 'checkout'
                                            ? theme.primaryGradient
                                            : 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                                        border: `2px solid ${selectedAction === 'checkout' ? theme.primaryColor : '#E2E8F0'}`,
                                        boxShadow: selectedAction === 'checkout'
                                            ? `0 4px 12px ${theme.primaryColor}35`
                                            : '0 2px 4px rgba(0, 0, 0, 0.05)',
                                        opacity: isProcessing ? 0.5 : 1
                                    }}
                                >
                                    <LogOut className="w-4 h-4 inline-block mr-2" />
                                    Check Out
                                </button>
                            )}
                        </div>
                    )}

                    {/* Scan Area */}
                    <div
                        className="mb-2 relative cursor-text"
                        onClick={() => {
                            if (inputRef.current && !isProcessing) {
                                inputRef.current.focus();
                            }
                        }}
                        style={{
                            background: theme.bgGradient,
                            borderRadius: '6px',
                            padding: '0.4rem',
                            minHeight: '130px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `2px solid ${theme.borderColor}40`,
                            boxShadow: `0 8px 16px -4px ${theme.primaryColor}15, inset 0 2px 8px rgba(255, 255, 255, 0.5)`
                        }}
                    >
                        {/* RFID Card Animation */}
                        <div className="relative" style={{ filter: `drop-shadow(0 6px 12px ${theme.primaryColor}25)` }}>
                            <div
                                className="relative"
                                style={{
                                    width: '160px',
                                    height: '88px',
                                    background: theme.primaryGradient,
                                    borderRadius: '8px',
                                    boxShadow: `0 8px 16px ${theme.primaryColor}40, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
                                    animation: 'cardFloat 3s ease-in-out infinite',
                                    border: `1px solid ${theme.borderColor}30`,
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

                                {/* Card Text */}
                                <div className="absolute bottom-2.5 left-4 text-white">
                                    <div className="text-base font-bold mb-0.5 tracking-wider">RFID</div>
                                    <div className="text-xs tracking-wider opacity-90">●●●● ●●●● ●●●●</div>
                                </div>
                            </div>
                        </div>

                        {/* Status Text */}
                        <div className="absolute bottom-4 left-0 right-0 text-center">
                            {rfidInput.length > 0 ? (
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: theme.primaryColor }}>
                                        📝 Sedang membaca...
                                    </p>
                                    <p
                                        className="font-extrabold text-lg font-mono tracking-wide px-3 py-2 rounded-md inline-block"
                                        style={{
                                            color: '#0F172A',
                                            background: theme.bgGradient,
                                            border: `2px solid ${theme.primaryColor}`,
                                            boxShadow: `0 0 20px ${theme.primaryColor}30`,
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
                                        color: theme.primaryColor,
                                        animation: 'blink 1.5s ease-in-out infinite',
                                        textShadow: `0 2px 4px ${theme.primaryColor}10`,
                                        letterSpacing: '0.25px'
                                    }}
                                >
                                    🔍 Siap Scan - Dekatkan kartu RFID
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Input Field - Hidden, langsung aktif tanpa click dan tanpa keyboard */}
                    <input
                        ref={inputRef}
                        type="text"
                        value={rfidInput}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onKeyPress={() => {
                            // Pastikan semua key press diterima, termasuk dari RFID scanner
                            // Tidak ada blocking untuk memastikan input dari scanner bisa masuk
                        }}
                        onFocus={(e) => {
                            // Mencegah keyboard muncul di mobile
                            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                            if (isMobile) {
                                // Blur segera untuk mencegah keyboard muncul
                                e.target.blur();
                            }
                        }}
                        onTouchStart={(e) => {
                            // Mencegah keyboard muncul saat touch di mobile
                            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                            if (isMobile) {
                                e.preventDefault();
                            }
                        }}
                        disabled={isProcessing}
                        className="sr-only"
                        autoFocus={false}
                        autoComplete="off"
                        inputMode="none"
                        readOnly={false}
                        tabIndex={-1}
                        style={{
                            position: 'absolute',
                            opacity: 0,
                            pointerEvents: 'auto',
                            width: '1px',
                            height: '1px',
                            left: '-9999px',
                            zIndex: 1
                        }}
                        key={isOpen ? 'open' : 'closed'}
                    />

                    {/* Scanned List */}
                    <div
                        className="mb-2 flex flex-col flex-shrink-0"
                        style={{
                            border: `2px solid ${theme.borderColor}40`,
                            borderRadius: '6px',
                            overflow: 'hidden',
                            background: 'white',
                            boxShadow: `0 4px 6px -1px ${theme.primaryColor}05`,
                            display: 'flex',
                            flexDirection: 'column',
                            height: '280px'
                        }}
                    >
                        <div
                            className="px-3 py-2 flex justify-between items-center border-b-2 border-gray-200 flex-shrink-0"
                            style={{
                                background: theme.bgGradient
                            }}
                        >
                            <h3 className="text-sm font-bold" style={{ color: '#0F172A', letterSpacing: '-0.25px' }}>
                                📋 RFID yang Sudah di-Scan
                            </h3>
                            <span
                                className="px-3 py-1.5 rounded-full font-extrabold text-sm text-white text-center min-w-[35px]"
                                style={{
                                    background: theme.primaryGradient,
                                    boxShadow: `0 2px 8px ${theme.primaryColor}30`
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
                                    scrollbarColor: `${theme.primaryColor} #F1F5F9`,
                                    overflowY: 'auto',
                                    overflowX: 'hidden',
                                    height: '230px',
                                    maxHeight: '230px'
                                }}
                            >
                                {scannedItems.map((item, index) => {
                                    const isError = item.status === 'error';
                                    return (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2 p-2 mb-1.5 rounded-md relative overflow-hidden transition-all"
                                            style={{
                                                background: item.status === 'success'
                                                    ? 'white'
                                                    : 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
                                                border: `2px solid ${item.status === 'success'
                                                    ? theme.borderColor + '40'
                                                    : '#EF4444'}`,
                                                animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                                            }}
                                        >
                                            <div
                                                className="absolute left-0 top-0 bottom-0 w-1 transition-transform"
                                                style={{
                                                    background: item.status === 'success'
                                                        ? theme.primaryGradient
                                                        : 'linear-gradient(180deg, #EF4444 0%, #DC2626 100%)',
                                                    transform: 'scaleY(1)'
                                                }}
                                            />
                                            <div
                                                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-extrabold text-xs border-2"
                                                style={{
                                                    background: item.status === 'success'
                                                        ? theme.bgGradient
                                                        : 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
                                                    color: item.status === 'success'
                                                        ? theme.primaryColor
                                                        : '#DC2626',
                                                    borderColor: item.status === 'success'
                                                        ? theme.primaryColor
                                                        : '#EF4444',
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
                                                            : '#DC2626'
                                                    }}
                                                >
                                                    {item.rfid}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span
                                                        className="text-xs font-medium px-2 py-0.5 rounded-md inline-block"
                                                        style={{
                                                            color: isError ? '#DC2626' : theme.primaryColor,
                                                            background: isError ? '#FEE2E2' : theme.bgGradient
                                                        }}
                                                    >
                                                        {item.action === 'checkin' ? 'Check In' : 'Check Out'}
                                                    </span>
                                                    <span
                                                        className="text-xs font-medium px-2 py-0.5 rounded-md inline-block"
                                                        style={{
                                                            color: '#64748B',
                                                            background: '#F1F5F9'
                                                        }}
                                                    >
                                                        {item.timestamp.toLocaleTimeString('id-ID')}
                                                    </span>
                                                </div>
                                                {item.message && (
                                                    <div
                                                        className="text-xs font-medium mt-0.5"
                                                        style={{
                                                            color: isError ? '#DC2626' : '#64748B'
                                                        }}
                                                    >
                                                        {item.message}
                                                    </div>
                                                )}
                                            </div>
                                            {item.status === 'success' ? (
                                                <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: theme.primaryColor }} />
                                            ) : (
                                                <X className="w-5 h-5 flex-shrink-0 text-red-600" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 xs:gap-3 sm:gap-4 mt-2 flex-shrink-0">
                        <button
                            onClick={() => {
                                onClose();
                            }}
                            disabled={isProcessing}
                            className="flex-1 min-w-[120px] xs:min-w-[140px] py-2.5 xs:py-3 sm:py-3.5 px-4 xs:px-5 sm:px-6 rounded-lg xs:rounded-xl font-bold text-xs xs:text-sm sm:text-base transition-all"
                            style={{
                                background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                                color: '#475569',
                                border: '2px solid #E2E8F0',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                                letterSpacing: '0.25px',
                                opacity: isProcessing ? 0.5 : 1
                            }}
                        >
                            ❌ Batal
                        </button>
                        <button
                            onClick={async () => {
                                if (isProcessing || scannedItems.length === 0) return;
                                onClose();
                            }}
                            disabled={isProcessing || scannedItems.length === 0}
                            className="flex-1 min-w-[120px] xs:min-w-[140px] py-2.5 xs:py-3 sm:py-3.5 px-4 xs:px-5 sm:px-6 rounded-lg xs:rounded-xl font-bold text-xs xs:text-sm sm:text-base text-white transition-all relative overflow-hidden"
                            style={{
                                background: theme.primaryGradient,
                                boxShadow: `0 4px 12px ${theme.primaryColor}35`,
                                letterSpacing: '0.25px',
                                opacity: (isProcessing || scannedItems.length === 0) ? 0.5 : 1,
                                cursor: (isProcessing || scannedItems.length === 0) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 inline-block mr-2 animate-spin" />
                                    Memproses...
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
                
                .overflow-y-auto::-webkit-scrollbar {
                    width: 8px;
                }
                .overflow-y-auto::-webkit-scrollbar-track {
                    background: #F1F5F9;
                    border-radius: 4px;
                }
                .overflow-y-auto::-webkit-scrollbar-thumb {
                    background: ${theme.primaryColor};
                    border-radius: 4px;
                    border: 2px solid #F1F5F9;
                }
                .overflow-y-auto::-webkit-scrollbar-thumb:hover {
                    opacity: 0.8;
                }
            `}</style>
        </>
    );
}


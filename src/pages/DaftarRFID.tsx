import { useCallback, useEffect, useState, useRef, memo, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import { useSidebar } from '../context/SidebarContext';
import ScanningRFIDNew from '../components/ScanningRFIDNew';
import backgroundImage from '../assets/background.jpg';
import { useDaftarRFID } from '../hooks/useDaftarRFID';
import RegistrationForm from '../components/daftar/RegistrationForm';
import DateFilterModal from '../components/daftar/DateFilterModal';
import RegisteredRFIDModal from '../components/daftar/RegisteredRFIDModal';
import ScanRejectModal from '../components/daftar/ScanRejectModal';
import UpdateDataModal from '../components/daftar/UpdateDataModal';
import { API_BASE_URL, getWOBreakdown, getDefaultHeaders } from '../config/api';

const DaftarRFID = memo(() => {
    const { isOpen } = useSidebar();

    // State untuk Update Modal
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateFormData, setUpdateFormData] = useState({
        rfid_garment: '',
        wo: '',
        style: '',
        buyer: '',
        item: '',
        color: '',
        size: ''
    });
    const [rfidInputValue, setRfidInputValue] = useState(''); // Input yang sedang diketik
    const [submittedRfid, setSubmittedRfid] = useState(''); // RFID yang sudah di-submit (Enter)
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isLoadingGarmentData, setIsLoadingGarmentData] = useState(false);
    const updateRfidInputRef = useRef<HTMLInputElement>(null);

    // Custom hook untuk semua state dan logic
    const {
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        showDateFilterModal,
        setShowDateFilterModal,
        branch,
        setBranch,
        showRegisteredModal,
        setShowRegisteredModal,
        showScanRejectModal,
        setShowScanRejectModal,
        rejectRfidInput,
        setRejectRfidInput,
        rejectScannedItems,
        isProcessingReject,
        rejectInputRef,
        loadingRegistered,
        filterStatus,
        setFilterStatus,
        searchTerm,
        setSearchTerm,
        filterColor,
        setFilterColor,
        filterSize,
        setFilterSize,
        workOrderData,
        loading,
        manualInputMode,
        formData,
        focusedInput,
        setFocusedInput,
        hoveredCard,
        setHoveredCard,
        isModalOpen,
        setIsModalOpen,
        fetchProductionBranchData,
        handleRejectRfidSubmit,
        handleInputChange,
        handleSubmit,
        handleSubmitWithData,
        getItemStatus,
        registeredRFIDData,
        uniqueColors,
        uniqueSizes,
    } = useDaftarRFID();

    const getTodayDate = useCallback(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

    // Query untuk fetch data garment berdasarkan RFID - hanya saat Enter ditekan
    const garmentQuery = useQuery({
        queryKey: ['garment-data', submittedRfid],
        queryFn: async () => {
            if (!submittedRfid.trim()) {
                return null;
            }

            const response = await fetch(`${API_BASE_URL}/garment/update`, {
                method: 'POST',
                headers: {
                    ...getDefaultHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rfid_garment: submittedRfid.trim()
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Gagal memuat data garment (${response.status})`);
            }

            return await response.json();
        },
        enabled: !!submittedRfid.trim() && showUpdateModal,
        retry: 1,
        staleTime: 30000,
    });

    // Query untuk fetch WO breakdown - selalu fetch saat modal dibuka
    const woBreakdownQuery = useQuery({
        queryKey: ['wo-breakdown-update', branch, dateFrom, dateTo],
        queryFn: async () => {
            // Gunakan dateFrom dan dateTo dari hook useDaftarRFID, jika kosong maka undefined (tidak kirim parameter)
            const startDateFrom = dateFrom || undefined;
            const startDateTo = dateTo || undefined;

            console.log('🔵 [WO BREAKDOWN UPDATE] Fetching WO breakdown:', { branch, startDateFrom, startDateTo });
            const response = await getWOBreakdown(branch, startDateFrom, startDateTo);

            if (!response.success || !response.data) {
                throw new Error(response.error || 'Gagal mengambil data WO breakdown');
            }

            console.log('✅ [WO BREAKDOWN UPDATE] WO breakdown data received:', response.data?.data?.length || 0, 'items');
            return response.data;
        },
        enabled: showUpdateModal && !!branch, // Fetch saat modal dibuka dan branch sudah ada
        retry: 1,
        staleTime: 30000,
    });

    // Helper functions untuk mendapatkan opsi dropdown - dioptimasi dengan useMemo
    const getAllWOs = useMemo(() => {
        if (!woBreakdownQuery.data?.data || !Array.isArray(woBreakdownQuery.data.data)) {
            return [];
        }
        const allWOs = [...new Set(woBreakdownQuery.data.data.map((item: any) => String(item.wo_no || '').trim()).filter(Boolean))];
        return allWOs.sort();
    }, [woBreakdownQuery.data?.data]);

    // Helper function untuk filter data berdasarkan WO saja (tidak filter berdasarkan field lain)
    // Strategi: Semua dropdown hanya filter berdasarkan WO, tidak filter berdasarkan field lain
    // Ini memastikan semua pilihan yang sesuai dengan WO tetap muncul, meskipun field lain sudah terisi
    const getFilteredDataForField = useCallback(() => {
        if (!woBreakdownQuery.data?.data || !Array.isArray(woBreakdownQuery.data.data)) {
            return [];
        }
        let filtered = woBreakdownQuery.data.data;

        // HANYA filter berdasarkan WO (selalu filter berdasarkan WO untuk semua dropdown)
        // TIDAK filter berdasarkan field lain (style, buyer, item, color, size)
        // Ini memastikan semua pilihan yang sesuai dengan WO tetap muncul
        if (updateFormData.wo?.trim()) {
            const targetWO = updateFormData.wo.trim();
            filtered = filtered.filter((item: any) => {
                const itemWO = String(item.wo_no || '').trim();
                // Handle multiple WO (comma-separated) - cek apakah targetWO ada di dalam list
                if (itemWO.includes(',')) {
                    const woList = itemWO.split(',').map((w: string) => w.trim());
                    return woList.some((w: string) => w === targetWO || w.toUpperCase() === targetWO.toUpperCase());
                }
                return itemWO === targetWO || itemWO.toUpperCase() === targetWO.toUpperCase();
            });
        } else {
            // Jika WO belum dipilih, return semua data (untuk dropdown WO)
            return filtered;
        }

        // TIDAK ada filter tambahan berdasarkan style, buyer, item, color, atau size
        // Semua dropdown hanya filter berdasarkan WO saja
        // Ini memastikan user bisa melihat dan memilih semua pilihan yang sesuai dengan WO

        return filtered;
    }, [woBreakdownQuery.data?.data, updateFormData.wo]);

    // Get Styles - filter HANYA berdasarkan WO (tidak filter berdasarkan field lain)
    const getStyles = useMemo(() => {
        const filtered = getFilteredDataForField();
        // Handle multiple styles (comma-separated) - split dan ambil semua unique values
        const allStyles = filtered.flatMap((item: any) => {
            const itemStyle = String(item.style || '').trim();
            if (itemStyle.includes(',')) {
                return itemStyle.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
            return itemStyle ? [itemStyle] : [];
        });
        const styles = [...new Set(allStyles)];
        console.log('🔵 [UPDATE DROPDOWN] Styles for WO', updateFormData.wo, ':', styles.length, 'options', styles);
        return styles.sort();
    }, [getFilteredDataForField, updateFormData.wo]);

    // Get Buyers - filter HANYA berdasarkan WO (tidak filter berdasarkan field lain)
    const getBuyers = useMemo(() => {
        const filtered = getFilteredDataForField();
        const buyers = [...new Set(filtered.map((item: any) => String(item.buyer || '').trim()).filter(Boolean))];
        console.log('🔵 [UPDATE DROPDOWN] Buyers for WO', updateFormData.wo, ':', buyers.length, 'options', buyers);
        return buyers.sort();
    }, [getFilteredDataForField, updateFormData.wo]);

    // Get Items - filter HANYA berdasarkan WO (tidak filter berdasarkan field lain)
    const getItems = useMemo(() => {
        const filtered = getFilteredDataForField();
        // Handle multiple items (comma-separated) - split dan ambil semua unique values
        const allItems = filtered.flatMap((item: any) => {
            const itemProduct = String(item.product_name || '').trim();
            if (itemProduct.includes(',')) {
                return itemProduct.split(',').map((i: string) => i.trim()).filter(Boolean);
            }
            return itemProduct ? [itemProduct] : [];
        });
        const items = [...new Set(allItems)];
        console.log('🔵 [UPDATE DROPDOWN] Items for WO', updateFormData.wo, ':', items.length, 'options', items);
        return items.sort();
    }, [getFilteredDataForField, updateFormData.wo]);

    // Get Colors - filter HANYA berdasarkan WO (tidak filter berdasarkan field lain)
    const getColors = useMemo(() => {
        const filtered = getFilteredDataForField();
        const colors = [...new Set(filtered.map((item: any) => String(item.color || '').trim()).filter(Boolean))];
        console.log('🔵 [UPDATE DROPDOWN] Colors for WO', updateFormData.wo, ':', colors.length, 'options', colors);
        return colors.sort();
    }, [getFilteredDataForField, updateFormData.wo]);

    // Get Sizes - filter HANYA berdasarkan WO (tidak filter berdasarkan field lain)
    const getSizes = useMemo(() => {
        const filtered = getFilteredDataForField();
        const sizes = [...new Set(filtered.map((item: any) => String(item.size || '').trim()).filter(Boolean))];
        console.log('🔵 [UPDATE DROPDOWN] Sizes for WO', updateFormData.wo, ':', sizes.length, 'options', sizes);
        return sizes.sort();
    }, [getFilteredDataForField, updateFormData.wo]);

    // Update form data saat garment query berhasil - auto-fill semua data
    useEffect(() => {
        // Hanya proses jika modal terbuka dan ada submittedRfid
        if (!showUpdateModal || !submittedRfid.trim()) {
            return;
        }

        if (garmentQuery.data?.success && garmentQuery.data?.data) {
            const garmentData = garmentQuery.data.data;

            console.log('✅ [UPDATE FORM] Auto-filling form data from API:', garmentData);
            console.log('✅ [UPDATE FORM] Current submittedRfid:', submittedRfid);

            // Helper function untuk mencari buyer lengkap dari WO breakdown jika buyer dari API terpotong
            const findCompleteBuyer = (apiBuyer: string, wo: string): string => {
                if (!apiBuyer || !wo || !woBreakdownQuery.data?.data || !Array.isArray(woBreakdownQuery.data.data)) {
                    return apiBuyer;
                }

                const targetWO = wo.trim();
                const apiBuyerTrimmed = apiBuyer.trim();

                // Cari data yang sesuai dengan WO
                const woDataList = woBreakdownQuery.data.data.filter((item: any) => {
                    const itemWO = String(item.wo_no || '').trim();
                    // Handle multiple WO (comma-separated)
                    if (itemWO.includes(',')) {
                        const woList = itemWO.split(',').map((w: string) => w.trim());
                        return woList.some((w: string) => w === targetWO || w.toUpperCase() === targetWO.toUpperCase());
                    }
                    return itemWO === targetWO || itemWO.toUpperCase() === targetWO.toUpperCase();
                });

                // Cari buyer yang lengkap dari WO breakdown
                // Cek apakah ada buyer yang dimulai dengan buyer dari API (untuk handle truncate)
                const buyersFromWO = [...new Set(woDataList.map((item: any) => String(item.buyer || '').trim()).filter(Boolean))];

                // Cari buyer yang cocok (exact match atau buyer yang dimulai dengan apiBuyer)
                const matchedBuyer = buyersFromWO.find((buyer: string) => {
                    const buyerUpper = buyer.toUpperCase();
                    const apiBuyerUpper = apiBuyerTrimmed.toUpperCase();
                    // Exact match atau buyer lengkap yang dimulai dengan buyer terpotong
                    return buyerUpper === apiBuyerUpper || buyerUpper.startsWith(apiBuyerUpper);
                });

                if (matchedBuyer) {
                    console.log('🔍 [UPDATE FORM] Buyer terpotong ditemukan:', {
                        dariAPI: apiBuyerTrimmed,
                        dariWO: matchedBuyer,
                        panjangAPI: apiBuyerTrimmed.length,
                        panjangWO: matchedBuyer.length
                    });
                    return matchedBuyer;
                }

                return apiBuyerTrimmed;
            };

            // Auto-fill semua field dari response API
            // Langsung set tanpa setTimeout untuk immediate update
            setUpdateFormData(prev => {
                const apiWO = String(garmentData.wo || garmentData.WO || prev.wo || '').trim();
                const apiBuyer = String(garmentData.buyer || garmentData.BUYER || prev.buyer || '').trim();

                // Cari buyer lengkap dari WO breakdown jika terpotong
                const completeBuyer = findCompleteBuyer(apiBuyer, apiWO);

                // Pastikan RFID tetap sama dengan yang di-submit
                const newData = {
                    rfid_garment: submittedRfid.trim(), // Gunakan submittedRfid untuk konsistensi
                    wo: apiWO,
                    style: String(garmentData.style || garmentData.STYLE || prev.style || '').trim(),
                    buyer: completeBuyer, // Gunakan buyer lengkap dari WO breakdown jika terpotong
                    item: String(garmentData.item || garmentData.ITEM || prev.item || '').trim(),
                    color: String(garmentData.color || garmentData.COLOR || prev.color || '').trim(),
                    size: String(garmentData.size || garmentData.SIZE || prev.size || '').trim()
                };

                console.log('✅ [UPDATE FORM] Auto-filling form data from API:', garmentData);
                console.log('✅ [UPDATE FORM] Buyer correction:', {
                    dariAPI: apiBuyer,
                    setelahKoreksi: completeBuyer,
                    apakahBerbeda: apiBuyer !== completeBuyer
                });
                console.log('✅ [UPDATE FORM] Setting form data:', newData);
                console.log('✅ [UPDATE FORM] Form data will be:', {
                    wo: newData.wo,
                    style: newData.style,
                    buyer: newData.buyer,
                    item: newData.item,
                    color: newData.color,
                    size: newData.size
                });
                console.log('🔵 [UPDATE FORM] WO Breakdown query status:', {
                    isLoading: woBreakdownQuery.isLoading,
                    hasData: !!woBreakdownQuery.data?.data,
                    dataCount: woBreakdownQuery.data?.data?.length || 0
                });
                return newData;
            });

            // Set success message
            setUpdateMessage({
                type: 'success',
                text: garmentQuery.data.message || 'Data garment berhasil dimuat'
            });
        } else if (garmentQuery.isError) {
            const errorMessage = garmentQuery.error?.message || 'Data garment tidak ditemukan';
            if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
                setUpdateMessage({
                    type: 'error',
                    text: 'Tidak dapat terhubung ke server. Pastikan proxy server (server.js) berjalan.'
                });
            } else {
                setUpdateMessage({ type: 'error', text: errorMessage });
            }
        }
    }, [garmentQuery.data, garmentQuery.isError, garmentQuery.error, showUpdateModal, submittedRfid, woBreakdownQuery.data]);

    // Auto-fill data dari WO breakdown hanya jika field masih kosong (fallback jika API tidak mengisi)
    // Data dari API garment/update diutamakan, WO breakdown hanya sebagai fallback
    useEffect(() => {
        // Skip jika sudah ada data dari garment query (API sudah mengisi)
        if (garmentQuery.data?.success && garmentQuery.data?.data) {
            return; // Data dari API sudah lengkap, tidak perlu fallback dari WO breakdown
        }

        if (woBreakdownQuery.data?.data && Array.isArray(woBreakdownQuery.data.data) && updateFormData.wo?.trim()) {
            const woBreakdownList = woBreakdownQuery.data.data;
            const targetWO = updateFormData.wo.trim();

            // Cari data yang sesuai dengan WO
            const woDataList = woBreakdownList.filter((item: any) => {
                const itemWO = String(item.wo_no || '').trim();
                return itemWO === targetWO || itemWO.toUpperCase() === targetWO.toUpperCase();
            });

            if (woDataList.length > 0) {
                // Ambil unique values
                const uniqueStyles = [...new Set(woDataList.map((item: any) => item.style).filter(Boolean))];
                const uniqueBuyers = [...new Set(woDataList.map((item: any) => item.buyer).filter(Boolean))];
                const uniqueItems = [...new Set(woDataList.map((item: any) => item.product_name).filter(Boolean))];
                const uniqueColors = [...new Set(woDataList.map((item: any) => item.color).filter(Boolean))];
                const uniqueSizes = [...new Set(woDataList.map((item: any) => item.size).filter(Boolean))];

                // Hanya set jika field masih kosong (untuk auto-fill fallback)
                setUpdateFormData(prev => ({
                    ...prev,
                    style: prev.style || (uniqueStyles.length > 0 ? uniqueStyles[0] : ''),
                    buyer: prev.buyer || (uniqueBuyers.length > 0 ? uniqueBuyers[0] : ''),
                    item: prev.item || (uniqueItems.length > 0 ? uniqueItems[0] : ''),
                    color: prev.color || (uniqueColors.length > 0 ? uniqueColors[0] : ''),
                    size: prev.size || (uniqueSizes.length > 0 ? uniqueSizes[0] : '')
                }));
            }
        } else if (woBreakdownQuery.isError) {
            // Hanya tampilkan error jika tidak ada data dari garment query
            if (!garmentQuery.data?.success) {
                const errorMessage = woBreakdownQuery.error?.message || 'Gagal mengambil data WO breakdown';
                setUpdateMessage({
                    type: 'error',
                    text: `${errorMessage}. Silakan isi data manual.`
                });
            }
        }
    }, [woBreakdownQuery.data, woBreakdownQuery.isError, woBreakdownQuery.error, updateFormData.wo, garmentQuery.data]);

    // Handler untuk perubahan dropdown - reset field yang dependen
    // Handler functions - dioptimasi dengan useCallback
    const handleWOChange = useCallback((wo: string) => {
        setUpdateFormData(prev => ({
            ...prev,
            wo: wo,
            style: '', // Reset karena bergantung pada WO
            buyer: '', // Reset karena bergantung pada WO
            item: '', // Reset karena bergantung pada WO
            color: '', // Reset karena bergantung pada WO
            size: '' // Reset karena bergantung pada WO
        }));
    }, []);

    const handleStyleChange = useCallback((style: string) => {
        setUpdateFormData(prev => ({
            ...prev,
            style: style,
            buyer: '', // Reset karena bergantung pada Style
            item: '', // Reset karena bergantung pada Style
            color: '', // Reset karena bergantung pada Style
            size: '' // Reset karena bergantung pada Style
        }));
    }, []);

    const handleBuyerChange = useCallback((buyer: string) => {
        setUpdateFormData(prev => ({
            ...prev,
            buyer: buyer,
            item: '', // Reset karena bergantung pada Buyer
            color: '', // Reset karena bergantung pada Buyer
            size: '' // Reset karena bergantung pada Buyer
        }));
    }, []);

    const handleItemChange = useCallback((item: string) => {
        setUpdateFormData(prev => ({
            ...prev,
            item: item,
            color: '', // Reset karena bergantung pada Item
            size: '' // Reset karena bergantung pada Item
        }));
    }, []);

    const handleColorChange = useCallback((color: string) => {
        setUpdateFormData(prev => ({
            ...prev,
            color: color,
            size: '' // Reset karena bergantung pada Color
        }));
    }, []);

    // Update loading state
    useEffect(() => {
        setIsLoadingGarmentData(garmentQuery.isLoading || woBreakdownQuery.isLoading);
    }, [garmentQuery.isLoading, woBreakdownQuery.isLoading]);


    // Reset form ketika modal dibuka (hanya reset jika modal baru dibuka, bukan saat data sudah ter-load)
    useEffect(() => {
        if (showUpdateModal) {
            // Reset hanya jika belum ada submittedRfid (modal baru dibuka)
            // Jangan reset jika sudah ada data yang ter-load
            if (!submittedRfid.trim()) {
                setUpdateFormData({
                    rfid_garment: '',
                    wo: '',
                    style: '',
                    buyer: '',
                    item: '',
                    color: '',
                    size: ''
                });
                setRfidInputValue('');
                setUpdateMessage(null);
            }
            setIsLoadingGarmentData(false);
            // Auto-focus pada input RFID setelah modal dibuka
            setTimeout(() => {
                updateRfidInputRef.current?.focus();
            }, 100);
        } else {
            // Reset semua saat modal ditutup
            setUpdateFormData({
                rfid_garment: '',
                wo: '',
                style: '',
                buyer: '',
                item: '',
                color: '',
                size: ''
            });
            setRfidInputValue('');
            setSubmittedRfid('');
            setUpdateMessage(null);
        }
    }, [showUpdateModal]);

    // Handler untuk Enter pada input RFID - dioptimasi dengan useCallback
    const handleRfidKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const trimmedRfid = rfidInputValue.trim();
            if (trimmedRfid) {
                setSubmittedRfid(trimmedRfid);
                setUpdateFormData(prev => ({
                    ...prev,
                    rfid_garment: trimmedRfid
                }));
            }
        }
    }, [rfidInputValue]);

    // Reset form jika submitted RFID kosong (hanya reset field yang tidak RFID)
    useEffect(() => {
        if (!showUpdateModal) return;

        // Hanya reset jika submittedRfid kosong DAN belum ada data dari garmentQuery
        // Jangan reset jika garmentQuery sedang loading atau sudah berhasil
        if (!submittedRfid.trim() && !garmentQuery.isLoading && !garmentQuery.data?.success) {
            // Reset form jika submitted RFID kosong
            setUpdateFormData(prev => ({
                ...prev,
                wo: '',
                style: '',
                buyer: '',
                item: '',
                color: '',
                size: ''
            }));
            setUpdateMessage(null);
        }
    }, [submittedRfid, showUpdateModal, garmentQuery.isLoading, garmentQuery.data?.success]);

    // Mutation untuk update data garment
    const updateGarmentMutation = useMutation({
        mutationFn: async (formData: typeof updateFormData) => {
            if (!formData.rfid_garment.trim()) {
                throw new Error('RFID Garment wajib diisi');
            }

            // API endpoint menggunakan API_BASE_URL untuk support dynamic IP
            const API_UPDATE_URL = `${API_BASE_URL}/garment/update`;

            const response = await fetch(API_UPDATE_URL, {
                method: 'POST',
                headers: {
                    ...getDefaultHeaders(),
                },
                body: JSON.stringify({
                    rfid_garment: formData.rfid_garment.trim(),
                    wo: formData.wo.trim(),
                    style: formData.style.trim(),
                    buyer: formData.buyer.trim(),
                    item: formData.item.trim(),
                    color: formData.color.trim(),
                    size: formData.size.trim()
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Gagal memperbarui data garment');
            }

            return data;
        },
        onSuccess: (data) => {
            setUpdateMessage({ type: 'success', text: data.message || 'Data garment berhasil diperbarui' });
            // Reset form setelah 2 detik
            setTimeout(() => {
                setUpdateFormData({
                    rfid_garment: '',
                    wo: '',
                    style: '',
                    buyer: '',
                    item: '',
                    color: '',
                    size: ''
                });
                setUpdateMessage(null);
            }, 2000);
        },
        onError: (error: Error) => {
            setUpdateMessage({
                type: 'error',
                text: error.message || 'Terjadi kesalahan saat update data'
            });
        }
    });


    // Handler untuk submit update form
    const handleUpdateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Jika user klik submit tapi belum tekan Enter, submit RFID yang sedang diketik
        if (rfidInputValue.trim() && !submittedRfid.trim()) {
            const trimmedRfid = rfidInputValue.trim();
            setSubmittedRfid(trimmedRfid);
            setUpdateFormData(prev => ({
                ...prev,
                rfid_garment: trimmedRfid
            }));
            setUpdateMessage({ type: 'success', text: 'Memuat data garment...' });
            return; // Query akan otomatis trigger, tunggu sampai selesai baru bisa submit
        }

        if (!updateFormData.rfid_garment.trim()) {
            setUpdateMessage({ type: 'error', text: 'RFID Garment wajib diisi. Tekan Enter setelah scan/ketik RFID.' });
            return;
        }

        // Pastikan semua field terisi
        if (!updateFormData.wo || !updateFormData.style || !updateFormData.buyer || !updateFormData.item || !updateFormData.color || !updateFormData.size) {
            setUpdateMessage({ type: 'error', text: 'Mohon lengkapi semua field sebelum update.' });
            return;
        }

        updateGarmentMutation.mutate(updateFormData);
    };

    // Sync isUpdating dengan mutation status
    useEffect(() => {
        setIsUpdating(updateGarmentMutation.isPending);
    }, [updateGarmentMutation.isPending]);

    // Fetch data saat component mount dan saat date atau branch berubah
    useEffect(() => {
        fetchProductionBranchData();
    }, [dateFrom, dateTo, branch, fetchProductionBranchData]);

    return (
        <div className="flex min-h-screen w-full h-screen fixed inset-0 m-0 p-0"
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed',
            }}
        >


            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div
                className="flex flex-col w-full min-h-screen transition-all duration-300 ease-in-out"
                style={{ marginLeft: isOpen ? '18%' : '5rem', width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)' }}
            >
                {/* Header */}
                <Header />

                {/* Breadcrumb */}
                <Breadcrumb />

                {/* Content */}
                <main
                    className="flex-1 w-full flex items-center justify-center"
                    style={{
                        marginTop: '0',
                        height: 'calc(100vh - 4rem - 3rem)',
                        minHeight: 'calc(100vh - 4rem - 3rem)',
                        maxHeight: 'calc(100vh - 4rem)',
                        overflow: 'hidden'
                    }}
                >
                    <RegistrationForm
                        formData={formData}
                        workOrderData={workOrderData}
                        loading={loading}
                        manualInputMode={manualInputMode}
                        focusedInput={focusedInput}
                        hoveredCard={hoveredCard}
                        dateFrom={dateFrom}
                        dateTo={dateTo}
                        branch={branch}
                        onBranchChange={setBranch}
                        onInputChange={handleInputChange}
                        onFocus={setFocusedInput}
                        onBlur={() => setFocusedInput(null)}
                        onMouseEnter={() => setHoveredCard(true)}
                        onMouseLeave={() => setHoveredCard(false)}
                        onDateFilterClick={() => setShowDateFilterModal(true)}
                        onRegisteredClick={() => setShowRegisteredModal(true)}
                        onRejectClick={() => setShowScanRejectModal(true)}
                        onUpdateClick={() => setShowUpdateModal(true)}
                        onSubmit={handleSubmit}
                        onSubmitWithData={handleSubmitWithData}
                    />
                </main>
            </div>

            {/* Date Filter Modal */}
            <DateFilterModal
                isOpen={showDateFilterModal}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onClose={() => setShowDateFilterModal(false)}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
                onReset={() => {
                    const today = getTodayDate();
                    setDateFrom(today);
                    setDateTo(today);
                }}
                onApply={() => setShowDateFilterModal(false)}
            />

            {/* Registered RFID Modal */}
            <RegisteredRFIDModal
                isOpen={showRegisteredModal}
                data={registeredRFIDData}
                loading={loadingRegistered}
                searchTerm={searchTerm}
                filterStatus={filterStatus}
                filterColor={filterColor}
                filterSize={filterSize}
                uniqueColors={uniqueColors}
                uniqueSizes={uniqueSizes}
                onClose={() => {
                    setShowRegisteredModal(false);
                    setSearchTerm('');
                    setFilterColor('Semua');
                    setFilterSize('Semua');
                }}
                onSearchChange={setSearchTerm}
                onFilterStatusChange={setFilterStatus}
                onFilterColorChange={setFilterColor}
                onFilterSizeChange={setFilterSize}
                getItemStatus={getItemStatus}
            />

            {/* Scan Reject Modal */}
            <ScanRejectModal
                isOpen={showScanRejectModal}
                rejectRfidInput={rejectRfidInput}
                rejectScannedItems={rejectScannedItems}
                isProcessingReject={isProcessingReject}
                rejectInputRef={rejectInputRef}
                onClose={() => setShowScanRejectModal(false)}
                onRfidInputChange={setRejectRfidInput}
                onRfidKeyDown={async (e) => {
                    if (e.key === 'Enter' && rejectRfidInput.trim() && !isProcessingReject) {
                        await handleRejectRfidSubmit(rejectRfidInput.trim());
                    }
                }}
            />

            {/* Update Data Modal */}
            <UpdateDataModal
                isOpen={showUpdateModal}
                rfidInputValue={rfidInputValue}
                updateFormData={updateFormData}
                isUpdating={isUpdating}
                isLoadingGarmentData={isLoadingGarmentData}
                updateMessage={updateMessage}
                allWOs={getAllWOs}
                styles={getStyles}
                buyers={getBuyers}
                items={getItems}
                colors={getColors}
                sizes={getSizes}
                woBreakdownLoading={woBreakdownQuery.isLoading}
                updateRfidInputRef={updateRfidInputRef}
                onClose={() => {
                    setShowUpdateModal(false);
                    setUpdateFormData({
                        rfid_garment: '',
                        wo: '',
                        style: '',
                        buyer: '',
                        item: '',
                        color: '',
                        size: ''
                    });
                    setUpdateMessage(null);
                }}
                onRfidInputChange={setRfidInputValue}
                onRfidKeyDown={handleRfidKeyDown}
                onWOChange={handleWOChange}
                onStyleChange={handleStyleChange}
                onBuyerChange={handleBuyerChange}
                onItemChange={handleItemChange}
                onColorChange={handleColorChange}
                onSizeChange={(size) => setUpdateFormData(prev => ({ ...prev, size }))}
                onSubmit={handleUpdateSubmit}
            />

            <ScanningRFIDNew
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    // Form data tidak di-reset, tetap tersimpan untuk registrasi berikutnya
                }}
                workOrderData={formData}
            />
        </div>
    );
});

DaftarRFID.displayName = 'DaftarRFID';

export default DaftarRFID;


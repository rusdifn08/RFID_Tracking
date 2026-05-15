/**
 * React Query hooks untuk Checking RFID area Cutting (GCC /api/gcc/cutting/check).
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getGccCuttingCheck, type GccCuttingCheckLogItem } from '../config/api';
import type { RFIDCheckItem } from './useCheckingRFIDQuery';

export type { RFIDCheckItem };

function mapCuttingLastStatus(lastStatus: string | undefined): string {
    if (!lastStatus) return 'Unknown';
    const u = lastStatus.toUpperCase().trim();
    if (u === 'IN_SMARKET' || u === 'IN_SUPERMARKET') return 'In Supermarket';
    if (u === 'OUT_SMARKET' || u === 'OUT_SUPERMARKET') return 'Out Supermarket';
    if (u === 'OUTPUT_BUNDLE') return 'Output Bundle';
    if (u === 'GOOD') return 'Good';
    if (u === 'REPAIR') return 'Repair';
    if (u === 'REJECT') return 'Reject';
    return lastStatus;
}

export function mapCuttingLogToTrackingRow(item: GccCuttingCheckLogItem) {
    return {
        id: item.id,
        last_status: item.last_status,
        timestamp: item.log_created_at,
        wo: item.wo,
        style: item.style,
        color: item.warna,
        size: item.size,
        line: item.meja,
        bagian: 'CUTTING',
        barcode: item.barcode,
        qty_batch: item.qty_batch,
        batch: item.batch,
        no_ikat: item.no_ikat,
        no_urut: item.no_urut,
        season: item.season,
        country: item.country,
    };
}

interface UseCheckingRFIDCuttingReturn {
    rfidInput: string;
    setRfidInput: (value: string) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    checkItems: RFIDCheckItem[];
    setCheckItems: React.Dispatch<React.SetStateAction<RFIDCheckItem[]>>;
    isChecking: boolean;
    setIsChecking: (value: boolean) => void;
    filterStatus: 'all' | 'found' | 'not_found';
    setFilterStatus: (value: 'all' | 'found' | 'not_found') => void;
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    showTrackingModal: boolean;
    setShowTrackingModal: (value: boolean) => void;
    trackingData: ReturnType<typeof mapCuttingLogToTrackingRow>[];
    setTrackingData: React.Dispatch<React.SetStateAction<ReturnType<typeof mapCuttingLogToTrackingRow>[]>>;
    loadingTracking: boolean;
    setLoadingTracking: (value: boolean) => void;
    selectedRfid: string;
    setSelectedRfid: (value: string) => void;
    handleRfidCheck: (rfid: string) => Promise<void>;
    handleKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    filteredItems: RFIDCheckItem[];
}

export const useCheckingRFIDCuttingQuery = (): UseCheckingRFIDCuttingReturn => {
    const [rfidInput, setRfidInput] = useState('');
    const [checkItems, setCheckItems] = useState<RFIDCheckItem[]>([]);
    const [isChecking, setIsChecking] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'all' | 'found' | 'not_found'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const [showTrackingModal, setShowTrackingModal] = useState(false);
    const [trackingData, setTrackingData] = useState<ReturnType<typeof mapCuttingLogToTrackingRow>[]>([]);
    const [loadingTracking, setLoadingTracking] = useState(false);
    const [selectedRfid, setSelectedRfid] = useState('');

    useEffect(() => {
        const t = window.setTimeout(() => inputRef.current?.focus(), 100);
        return () => window.clearTimeout(t);
    }, []);

    const checkRFIDMutation = useMutation({
        mutationFn: async (rfid: string) => getGccCuttingCheck(rfid),
        onSuccess: (res, rfid) => {
            const timestamp = new Date();
            let newItem: RFIDCheckItem;

            if (res.success && res.data && res.data.length > 0) {
                const latest = res.data[0];
                const statusData = mapCuttingLastStatus(latest.last_status);
                newItem = {
                    rfid: rfid.trim(),
                    timestamp,
                    status: 'found',
                    wo: latest.wo || '',
                    style: latest.style || '',
                    color: latest.warna || '',
                    size: latest.size || '',
                    line: latest.meja || '',
                    meja: latest.meja || '',
                    noIkat: latest.no_ikat,
                    noUrut: latest.no_urut || '',
                    season: latest.season || '',
                    country: latest.country || '',
                    lastScanned: latest.log_created_at || latest.bundle_created_at || '',
                    lokasi: 'CUTTING',
                    statusData,
                    details: res.message || `Status: ${statusData} · ${res.data.length} log`,
                };
            } else {
                newItem = {
                    rfid: rfid.trim(),
                    timestamp,
                    status: 'not_found',
                    details: res.error || res.message || 'RFID bundle tidak ditemukan',
                };
            }

            setCheckItems((prev) => [newItem, ...prev]);
            setRfidInput('');
            setIsChecking(false);
            window.setTimeout(() => inputRef.current?.focus(), 100);
        },
        onError: (error, rfid) => {
            setCheckItems((prev) => [
                {
                    rfid: rfid.trim(),
                    timestamp: new Date(),
                    status: 'not_found',
                    details: error instanceof Error ? error.message : 'Error saat checking RFID cutting',
                },
                ...prev,
            ]);
            setRfidInput('');
            setIsChecking(false);
            window.setTimeout(() => inputRef.current?.focus(), 100);
        },
    });

    const { data: trackingQueryData, isLoading: isLoadingTracking } = useQuery({
        queryKey: ['cutting-check-rfid', selectedRfid],
        queryFn: async () => {
            const res = await getGccCuttingCheck(selectedRfid);
            if (res.success && res.data) return res.data.map(mapCuttingLogToTrackingRow);
            return [];
        },
        enabled: showTrackingModal && !!selectedRfid,
        staleTime: 30000,
        retry: 1,
    });

    useEffect(() => {
        setTrackingData([]);
    }, [selectedRfid]);

    useEffect(() => {
        if (trackingQueryData) {
            setTrackingData(trackingQueryData);
            setLoadingTracking(false);
        }
    }, [trackingQueryData]);

    useEffect(() => {
        setLoadingTracking(isLoadingTracking);
    }, [isLoadingTracking]);

    const handleRfidCheck = useCallback(
        async (rfid: string) => {
            if (!rfid.trim()) return;
            setIsChecking(true);
            window.setTimeout(() => {
                checkRFIDMutation.mutate(rfid.trim());
            }, 500);
        },
        [checkRFIDMutation]
    );

    const handleKeyPress = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && !isChecking && !checkRFIDMutation.isPending) {
                void handleRfidCheck(rfidInput);
            }
        },
        [isChecking, checkRFIDMutation.isPending, rfidInput, handleRfidCheck]
    );

    const filteredItems = useMemo(() => {
        return checkItems.filter((item) => {
            const matchStatus = filterStatus === 'all' || item.status === filterStatus;
            const q = searchQuery.trim().toLowerCase();
            const matchSearch =
                !q ||
                item.rfid.toLowerCase().includes(q) ||
                item.wo?.toLowerCase().includes(q) ||
                item.style?.toLowerCase().includes(q) ||
                item.color?.toLowerCase().includes(q) ||
                item.size?.toLowerCase().includes(q) ||
                item.line?.toLowerCase().includes(q) ||
                item.meja?.toLowerCase().includes(q) ||
                String(item.noIkat ?? '').includes(q) ||
                item.noUrut?.toLowerCase().includes(q) ||
                item.season?.toLowerCase().includes(q) ||
                item.country?.toLowerCase().includes(q) ||
                item.lokasi?.toLowerCase().includes(q) ||
                item.statusData?.toLowerCase().includes(q);
            return matchStatus && matchSearch;
        });
    }, [checkItems, filterStatus, searchQuery]);

    return {
        rfidInput,
        setRfidInput,
        inputRef,
        checkItems,
        setCheckItems,
        isChecking: isChecking || checkRFIDMutation.isPending,
        setIsChecking,
        filterStatus,
        setFilterStatus,
        searchQuery,
        setSearchQuery,
        showTrackingModal,
        setShowTrackingModal,
        trackingData,
        setTrackingData,
        loadingTracking,
        setLoadingTracking,
        selectedRfid,
        setSelectedRfid,
        handleRfidCheck,
        handleKeyPress,
        filteredItems,
    };
};

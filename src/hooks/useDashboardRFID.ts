import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config/api';

interface DashboardData {
    good: number;
    rework: number;
    reject: number;
    wiraQc: number;
    pqcGood: number;
    pqcRework: number;
    pqcReject: number;
    wiraPqc: number;
    outputLine: number;
}

interface UseDashboardRFIDReturn {
    // Data states
    good: number;
    rework: number;
    reject: number;
    wiraQc: number;
    pqcGood: number;
    pqcRework: number;
    pqcReject: number;
    wiraPqc: number;
    outputLine: number;
    woData: any;
    
    // Modal states
    showExportModal: boolean;
    setShowExportModal: (show: boolean) => void;
    showDateFilterModal: boolean;
    setShowDateFilterModal: (show: boolean) => void;
    
    // Filter states
    filterDateFrom: string;
    setFilterDateFrom: (date: string) => void;
    filterDateTo: string;
    setFilterDateTo: (date: string) => void;
}

export const useDashboardRFID = (lineId: string): UseDashboardRFIDReturn => {
    // Default values
    const [good, setGood] = useState<number>(0);
    const [rework, setRework] = useState<number>(0);
    const [reject, setReject] = useState<number>(0);
    const [wiraQc, setWiraQc] = useState<number>(0);
    const [pqcGood, setPqcGood] = useState<number>(0);
    const [pqcRework, setPqcRework] = useState<number>(0);
    const [pqcReject, setPqcReject] = useState<number>(0);
    const [wiraPqc, setWiraPqc] = useState<number>(0);
    const [outputLine, setOutputLine] = useState<number>(0);

    // Ref untuk menyimpan data sebelumnya untuk perbandingan
    const previousDataRef = useRef<DashboardData | null>(null);

    // State untuk data WO/Production
    const [woData, setWoData] = useState<any>(null);

    // State untuk export modal
    const [showExportModal, setShowExportModal] = useState(false);
    
    // State untuk filter tanggal modal
    const [showDateFilterModal, setShowDateFilterModal] = useState(false);
    const [filterDateFrom, setFilterDateFrom] = useState<string>('');
    const [filterDateTo, setFilterDateTo] = useState<string>('');

    // Fungsi helper untuk format tanggal dari YYYY-MM-DD ke YYYY-M-D
    const formatDateForAPI = (dateString: string): string => {
        if (!dateString) return '';
        const parts = dateString.split('-');
        if (parts.length === 3) {
            const year = parts[0];
            const month = String(parseInt(parts[1], 10));
            const day = String(parseInt(parts[2], 10));
            return `${year}-${month}-${day}`;
        }
        return dateString;
    };

    // Fetch tracking data dari API /wira
    useEffect(() => {
        let isMounted = true;
        let intervalId: ReturnType<typeof setInterval> | null = null;

        const fetchTrackingData = async () => {
            try {
                let url = `${API_BASE_URL}/wira?line=${encodeURIComponent(lineId)}`;
                
                if (filterDateFrom) {
                    const formattedFrom = formatDateForAPI(filterDateFrom);
                    url += `&tanggalfrom=${encodeURIComponent(formattedFrom)}`;
                }
                if (filterDateTo) {
                    const formattedTo = formatDateForAPI(filterDateTo);
                    url += `&tanggalto=${encodeURIComponent(formattedTo)}`;
                }

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    cache: 'no-cache',
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (!isMounted) return;

                const parseNumber = (value: any): number => {
                    if (value === null || value === undefined || value === '') return 0;
                    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
                    return isNaN(num) ? 0 : num;
                };

                if (data && data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
                    const lineData = data.data.find((item: any) => {
                        const itemLine = String(item.Line || item.line || item.LINE || '').trim();
                        const targetLine = String(lineId || '').trim();
                        const itemLineNum = parseInt(itemLine, 10);
                        const targetLineNum = parseInt(targetLine, 10);
                        return itemLine === targetLine || 
                               (!isNaN(itemLineNum) && !isNaN(targetLineNum) && itemLineNum === targetLineNum);
                    });
                    
                    if (lineData) {
                        const newData = {
                            good: parseNumber(lineData.Good || lineData.good || 0),
                            rework: parseNumber(lineData.Rework || lineData.rework || 0),
                            reject: parseNumber(lineData.Reject || lineData.reject || 0),
                            wiraQc: parseNumber(lineData.WIRA || lineData.wira || 0),
                            pqcGood: parseNumber(lineData['PQC Good'] || lineData['pqc_good'] || lineData.pqcGood || 0),
                            pqcRework: parseNumber(lineData['PQC Rework'] || lineData['pqc_rework'] || lineData.pqcRework || 0),
                            pqcReject: parseNumber(lineData['PQC Reject'] || lineData['pqc_reject'] || lineData.pqcReject || 0),
                            wiraPqc: parseNumber(lineData['PQC WIRA'] || lineData['pqc_wira'] || lineData.pqcWira || 0),
                            outputLine: parseNumber(lineData['Output Sewing'] || lineData['output_sewing'] || lineData.outputSewing || 0),
                        };

                        setGood(newData.good);
                        setRework(newData.rework);
                        setReject(newData.reject);
                        setWiraQc(newData.wiraQc);
                        setPqcGood(newData.pqcGood);
                        setPqcRework(newData.pqcRework);
                        setPqcReject(newData.pqcReject);
                        setWiraPqc(newData.wiraPqc);
                        setOutputLine(newData.outputLine);
                        previousDataRef.current = newData;
                    } else {
                        const emptyData = {
                            good: 0, rework: 0, reject: 0, wiraQc: 0,
                            pqcGood: 0, pqcRework: 0, pqcReject: 0, wiraPqc: 0, outputLine: 0,
                        };
                        setGood(0); setRework(0); setReject(0); setWiraQc(0);
                        setPqcGood(0); setPqcRework(0); setPqcReject(0); setWiraPqc(0); setOutputLine(0);
                        previousDataRef.current = emptyData;
                    }
                } else {
                    const emptyData = {
                        good: 0, rework: 0, reject: 0, wiraQc: 0,
                        pqcGood: 0, pqcRework: 0, pqcReject: 0, wiraPqc: 0, outputLine: 0,
                    };
                    setGood(0); setRework(0); setReject(0); setWiraQc(0);
                    setPqcGood(0); setPqcRework(0); setPqcReject(0); setWiraPqc(0); setOutputLine(0);
                    previousDataRef.current = emptyData;
                }
            } catch (error) {
                console.error('[useDashboardRFID] Error fetching data:', error);
                if (isMounted) {
                    const emptyData = {
                        good: 0, rework: 0, reject: 0, wiraQc: 0,
                        pqcGood: 0, pqcRework: 0, pqcReject: 0, wiraPqc: 0, outputLine: 0,
                    };
                    setGood(0); setRework(0); setReject(0); setWiraQc(0);
                    setPqcGood(0); setPqcRework(0); setPqcReject(0); setWiraPqc(0); setOutputLine(0);
                    previousDataRef.current = emptyData;
                }
            }
        };

        const initialFetch = async () => {
            try {
                await fetchTrackingData();
            } catch (error) {
                // Error sudah di-handle di dalam fetchTrackingData
            }
        };
        initialFetch();

        intervalId = setInterval(() => {
            if (isMounted) {
                fetchTrackingData();
            }
        }, 1000);

        return () => {
            isMounted = false;
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [lineId, filterDateFrom, filterDateTo]);

    // Fetch data WO/Production dari API monitoring/line
    useEffect(() => {
        let isMounted = true;
        let intervalId: ReturnType<typeof setInterval> | null = null;

        const fetchWoData = async () => {
            try {
                const url = `${API_BASE_URL}/monitoring/line?line=${encodeURIComponent(lineId)}`;

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (!isMounted) return;

                if (data && data.success && data.data) {
                    setWoData(data.data);
                } else {
                    setWoData(null);
                }
            } catch (error) {
                console.error('[useDashboardRFID] Error fetching WO data:', error);
                if (isMounted) {
                    setWoData(null);
                }
            }
        };

        fetchWoData();
        intervalId = setInterval(() => {
            if (isMounted) {
                fetchWoData();
            }
        }, 5000); // Polling setiap 5 detik untuk WO data

        return () => {
            isMounted = false;
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [lineId]);

    return {
        good,
        rework,
        reject,
        wiraQc,
        pqcGood,
        pqcRework,
        pqcReject,
        wiraPqc,
        outputLine,
        woData,
        showExportModal,
        setShowExportModal,
        showDateFilterModal,
        setShowDateFilterModal,
        filterDateFrom,
        setFilterDateFrom,
        filterDateTo,
        setFilterDateTo,
    };
};


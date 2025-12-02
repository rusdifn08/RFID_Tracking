/**
 * React Query Hooks untuk Tracking Data
 */

import { useQuery } from '@tanstack/react-query';
import { getTrackingLineData, type TrackingLineData } from '../config/api';

/**
 * Hook untuk mendapatkan tracking data berdasarkan line
 * @param line - Line number (1, 2, 3, etc.)
 * @returns Query object dengan tracking line data
 */
export const useTrackingLineData = (line: string | number) => {
    // Default data untuk menghindari undefined
    const defaultData: TrackingLineData = {
        success: false,
        line: String(line),
        data: {
            good: '0',
            output_line: '0',
            pqc_good: '0',
            pqc_reject: '0',
            pqc_rework: '0',
            reject: '0',
            rework: '0',
        }
    };

    return useQuery<TrackingLineData>({
        queryKey: ['trackingLineData', line],
        queryFn: async () => {
            try {
                const response = await getTrackingLineData(line);
                // getTrackingLineData mengembalikan ApiResponse<TrackingLineData>
                // Struktur: { success, data: TrackingLineData }
                // TrackingLineData sendiri adalah { success, line, data: {...} }
                if (response && response.success && response.data) {
                    // response.data adalah TrackingLineData
                    const trackingData = response.data as TrackingLineData;
                    return trackingData;
                }
                // Jika gagal, return default data
                return defaultData;
            } catch (error) {
                console.error('❌ [useTrackingLineData] Error fetching tracking data:', error);
                // Return default data instead of throwing
                return defaultData;
            }
        },
        staleTime: 30000, // 30 detik
        refetchInterval: 10000, // Refetch setiap 10 detik untuk update real-time
        retry: 1, // Retry 1 kali jika gagal
        retryOnMount: true, // Retry saat mount
        // Jangan throw error, return default data
        throwOnError: false,
        // Placeholder data untuk menghindari undefined
        placeholderData: defaultData,
        // Initial data untuk menghindari loading state yang lama
        initialData: defaultData,
    });
};

/**
 * React Query Hooks untuk Production Data
 */

import { useQuery } from '@tanstack/react-query';
import { getProductionData, ProductionData } from '../config/api';

/**
 * Hook untuk mendapatkan production data (Good, Reject, Rework)
 * @param lineId - Optional line ID untuk filter by line
 * @returns Query object dengan production data
 */
export const useProductionData = (lineId?: string | number) => {
    return useQuery<ProductionData>({
        queryKey: ['productionData', lineId],
        queryFn: async () => {
            const response = await getProductionData(lineId);
            if (response.success && response.data) {
                return response.data as ProductionData;
            }
            throw new Error(response.error || 'Gagal mengambil data production');
        },
        staleTime: 30000, // 30 detik
        refetchInterval: 60000, // Refetch setiap 1 menit
    });
};

/**
 * Hook untuk mendapatkan production data overall (semua line)
 */
export const useProductionDataOverall = () => {
    return useProductionData();
};

/**
 * Hook untuk mendapatkan production data by line
 * @param lineId - Line ID
 */
export const useProductionDataByLine = (lineId: string | number) => {
    return useProductionData(lineId);
};


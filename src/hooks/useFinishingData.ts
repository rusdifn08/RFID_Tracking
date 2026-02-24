/**
 * Custom Hook untuk Fetching Finishing Data
 * Mengurangi duplikasi useQuery patterns di berbagai dashboard pages
 */

import { useQuery } from '@tanstack/react-query';
import { getFinishingData, getFinishingDataByLine } from '../config/api';

interface UseFinishingDataOptions {
  refetchInterval?: number;
  staleTime?: number;
  enabled?: boolean;
}

/**
 * Hook untuk fetch finishing data (all sections)
 */
export const useFinishingData = (options: UseFinishingDataOptions = {}) => {
  const {
    refetchInterval = 30000,
    staleTime = 20000,
    enabled = true
  } = options;

  return useQuery({
    queryKey: ['finishing-data'],
    queryFn: async () => {
      const response = await getFinishingData();
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Gagal mengambil data finishing');
      }
      return response.data;
    },
    refetchInterval,
    staleTime,
    enabled,
    retry: 3,
  });
};

/**
 * Hook untuk fetch finishing data per line
 */
export const useFinishingDataByLine = (
  lineNumber: string | number,
  options: UseFinishingDataOptions = {}
) => {
  const {
    refetchInterval = 30000,
    staleTime = 20000,
    enabled = true
  } = options;

  return useQuery({
    queryKey: ['finishing-data-by-line', lineNumber],
    queryFn: async () => {
      const response = await getFinishingDataByLine(lineNumber.toString());
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Gagal mengambil data finishing');
      }
      return response.data;
    },
    refetchInterval,
    staleTime,
    enabled: enabled && !!lineNumber,
    retry: 3,
  });
};

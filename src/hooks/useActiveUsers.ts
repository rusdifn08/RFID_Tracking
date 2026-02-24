/**
 * Custom Hook untuk Fetching Active Users
 * Mengurangi duplikasi useQuery patterns untuk active users
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getActiveUsers } from '../config/api';

interface ActiveUser {
  nik: string;
  name: string;
  line: string;
  jabatan?: string;
  bagian?: string;
}

interface UseActiveUsersOptions {
  refetchInterval?: number;
  enabled?: boolean;
}

/**
 * Hook untuk fetch active users dengan auto-conversion ke Map
 */
export const useActiveUsers = (options: UseActiveUsersOptions = {}) => {
  const {
    refetchInterval = 10000,
    enabled = true
  } = options;

  const { data: activeUsersResponse, ...rest } = useQuery({
    queryKey: ['active-users'],
    queryFn: async () => {
      const response = await getActiveUsers();
      if (!response.success || !response.data) {
        return [];
      }
      // Response bisa berupa array atau single object
      return Array.isArray(response.data) ? response.data : [response.data];
    },
    refetchInterval,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    enabled,
    retry: 2,
  });

  // Convert active users to map by line number
  const activeUsersMap = useMemo(() => {
    const map = new Map<string, ActiveUser>();
    if (activeUsersResponse) {
      activeUsersResponse.forEach((user: ActiveUser) => {
        map.set(user.line, {
          nik: user.nik,
          name: user.name,
          line: user.line,
          jabatan: user.jabatan,
          bagian: user.bagian
        });
      });
    }
    return map;
  }, [activeUsersResponse]);

  return {
    activeUsers: activeUsersResponse || [],
    activeUsersMap,
    ...rest
  };
};

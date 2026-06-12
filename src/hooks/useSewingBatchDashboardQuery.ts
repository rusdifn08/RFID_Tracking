import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL, getDefaultHeaders } from '../config/api';

export interface SewingBatchData {
  no_batch: string | number;
  nama_batch: string;
  in: number;
  out: number;
  output_pcs: number;
}

export interface SewingDashboardResponseData {
  line: string;
  wo: string;
  style: string;
  item: string;
  buyer: string;
  size: string;
  color: string;
  batch: SewingBatchData[];
}

export interface SewingDashboardResponse {
  code: number;
  status: string;
  messages: string;
  count: number;
  data: SewingDashboardResponseData[];
}

export const useSewingBatchDashboardQuery = (
  line: string,
  style?: string,
  wo?: string,
  tanggalfrom?: string,
  tanggalto?: string
) => {
  return useQuery<SewingDashboardResponse>({
    queryKey: ['sewing-batch-dashboard', line, style, wo, tanggalfrom, tanggalto],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (line) params.append('line', line);
      if (style) params.append('style', style);
      if (wo) params.append('wo', wo);
      if (tanggalfrom) params.append('tanggalfrom', tanggalfrom);
      if (tanggalto) params.append('tanggalto', tanggalto);

      const url = `${API_BASE_URL}/api/sewing/dashboard?${params.toString()}`;
      const headers = {
        ...getDefaultHeaders(),
        'rfid-key': '0011779933',
      };

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    refetchInterval: 10000,
    staleTime: 5000,
    retry: 2,
  });
};

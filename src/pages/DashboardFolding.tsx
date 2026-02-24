import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Layers, Scan, RefreshCw, TrendingUp, X } from 'lucide-react';
import { getFinishingData, getFinishingDataByLine, API_BASE_URL, getDefaultHeaders, getActiveUsers, getScanningUsers } from '../config/api';
import ScanningFinishingModal from '../components/ScanningFinishingModal';
import { productionLinesMJL } from '../data/production_line';
import { Card, MetricCard, TableDistribution, FilterButton } from '../components/finishing';
import { FinishingDetailModal, type FinishingMetricType, type FinishingSection } from '../components/finishing/FinishingDetailModal';
import { exportFinishingToExcel } from '../utils/exportFinishingToExcel';
import { Filter, Calendar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isAllUsersMode } from '../config/foldingConfig';

// Warna untuk 8 tables
const TABLE_COLORS = [
  '#14b8a6', // Teal
  '#0ea5e9', // Blue
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#10b981', // Green
  '#f97316', // Orange
  '#ec4899', // Pink
];

/**
 * ============================================================================
 * TYPE DEFINITIONS
 * ============================================================================
 */
// MetricType and MetricConfig moved to src/components/finishing/MetricCard.tsx

interface TableDistributionData {
  line: string;
  wo: string;
  item: string;
  waiting: number;
  checkIn: number;
  checkOut: number;
  operatorNIK?: string;
  operatorName?: string;
}

export default function DashboardFolding() {
  const { isOpen } = useSidebar();
  const { user } = useAuth(); // Get current logged in user
  const queryClient = useQueryClient();
  const [hoveredTable, setHoveredTable] = useState<number | null>(null);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Helper function untuk cek apakah sudah melewati jam 8 pagi hari ini
  const isAfter8AM = () => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 8;
  };

  // Helper function untuk mendapatkan tanggal yang valid (hari ini jika sudah jam 8, kemarin jika belum)
  // Data reset setiap hari mulai jam 8 pagi, jadi sebelum jam 8 masih menggunakan data kemarin
  const getValidDate = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    // Jika belum jam 8, gunakan tanggal kemarin (karena data reset mulai jam 8)
    if (!isAfter8AM()) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }
    return today;
  };

  // State untuk optimistik update count per table (real-time tanpa menunggu API)
  // State ini shared antara card dan modal, sehingga data tetap permanen saat modal ditutup
  const [optimisticCounts, setOptimisticCounts] = useState<Record<number, number>>({});
  const [lastKnownCounts, setLastKnownCounts] = useState<Record<number, number>>({}); // Simpan count terakhir untuk perbandingan

  // State untuk menyimpan nilai count tertinggi yang pernah diterima dari API
  // TIDAK menggunakan localStorage untuk konsistensi data antar browser/user
  // Data selalu di-fetch dari API untuk memastikan semua user melihat data yang sama
  const [stableCounts, setStableCounts] = useState<Record<number, number>>({});

  // State untuk modal scanning
  const [showFoldingScanModal, setShowFoldingScanModal] = useState(false);

  // State untuk modal table detail
  const [selectedTableDetail, setSelectedTableDetail] = useState<number | null>(null);

  // State untuk filter
  const [filterWo, setFilterWo] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [showWoFilterModal, setShowWoFilterModal] = useState(false);
  const [showDateFilterModal, setShowDateFilterModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailModalType, setDetailModalType] = useState<FinishingMetricType>('waiting');
  const [detailModalSection, setDetailModalSection] = useState<FinishingSection>('folding');
  const [detailSearchQuery, setDetailSearchQuery] = useState('');

  // --- EFFECT ---
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Fetch active users (yang sedang login) - diambil saat component mount dan refresh setiap 10 detik
  const { data: activeUsersResponse, refetch: refetchActiveUsers } = useQuery({
    queryKey: ['active-users-folding'],
    queryFn: async () => {
      const response = await getActiveUsers();
      if (!response.success || !response.data) {
        return [];
      }
      // Response bisa berupa array atau single object
      return Array.isArray(response.data) ? response.data : [response.data];
    },
    refetchInterval: 10000, // Refresh setiap 10 detik
    refetchOnMount: true, // Ambil data saat component mount
    refetchOnWindowFocus: true, // Ambil data saat window focus
    retry: 2,
  });

  // Refetch active users saat component mount
  useEffect(() => {
    refetchActiveUsers();
  }, [refetchActiveUsers]);

  // Convert active users to map by line number
  const activeUsersMap = useMemo(() => {
    const map = new Map<string, { nik: string; name: string; line: string }>();
    if (activeUsersResponse) {
      activeUsersResponse.forEach((user) => {
        map.set(user.line, { nik: user.nik, name: user.name, line: user.line });
      });
    }
    return map;
  }, [activeUsersResponse]);

  // Fetch scanning users (user yang sedang scan) - hanya untuk mode all-users
  const { data: scanningUsersResponse } = useQuery({
    queryKey: ['scanning-users-folding'],
    queryFn: async () => {
      if (!isAllUsersMode()) return [];
      const response = await getScanningUsers();
      if (!response.success || !response.data) {
        return [];
      }
      return Array.isArray(response.data) ? response.data : [response.data];
    },
    enabled: isAllUsersMode(), // Hanya fetch jika mode all-users aktif
    refetchInterval: 2000, // Refresh setiap 2 detik untuk realtime update
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Convert scanning users to map by table number
  const scanningUsersMap = useMemo(() => {
    const map = new Map<string, { nik: string; name: string; line: string }>();
    if (scanningUsersResponse && isAllUsersMode()) {
      scanningUsersResponse.forEach((user: { nik: string; name: string; line: string; scanStartTime: string }) => {
        map.set(user.line, { nik: user.nik, name: user.name, line: user.line });
      });
    }
    return map;
  }, [scanningUsersResponse]);

  // Fetch data finishing dari API
  const { data: finishingResponse, refetch: refetchFinishingData } = useQuery({
    queryKey: ['finishing-data-folding'],
    queryFn: async () => {
      const response = await getFinishingData();
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Gagal mengambil data finishing');
      }
      return response.data;
    },
    staleTime: 20000, // Data dianggap fresh selama 20 detik
    refetchInterval: 1000, // Refresh setiap 1 detik (Realtime Ultra Cepat)
    refetchOnWindowFocus: true,
    retry: 3,
  });

  // Data dari API atau default values
  const foldingWaiting = finishingResponse?.folding?.waiting ?? 0;
  const foldingCheckIn = finishingResponse?.folding?.checkin ?? 0;
  const foldingCheckOut = finishingResponse?.folding?.checkout ?? 0;

  // Fetch data folding checkout per jam dan per table dari API
  // Menggunakan tanggal yang valid (hari ini jika sudah jam 8, kemarin jika belum)
  const { data: hourlyFoldingDataResponse, refetch: refetchHourlyData } = useQuery({
    queryKey: ['hourly-folding-checkout-data', getValidDate()],
    queryFn: async () => {
      try {
        const validDate = getValidDate();
        const response = await fetch(`${API_BASE_URL}/api/folding/hourly?date=${validDate}`, {
          headers: getDefaultHeaders()
        });

        if (!response.ok) {
          throw new Error('Failed to fetch hourly folding data');
        }

        const data = await response.json();
        if (data.success && data.data) {
          return data.data;
        }

        return [];
      } catch (error) {
        console.error('Error fetching hourly folding data:', error);
        // Return empty array dengan struktur yang benar jika error
        const hours = ['07:30', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
        return hours.map(hour => ({
          hour,
          table1: 0,
          table2: 0,
          table3: 0,
          table4: 0,
          table5: 0,
          table6: 0,
          table7: 0,
          table8: 0,
        }));
      }
    },
    staleTime: 20000, // Data dianggap fresh selama 20 detik
    refetchInterval: 1000, // Refresh setiap 1 detik (Realtime Ultra Cepat)
    refetchOnWindowFocus: true, // Refetch saat window focus
    retry: 2,
  });

  // Data untuk 8 tables dengan shipment per jam - HANYA menggunakan data real dari API
  // TIDAK menggunakan localStorage untuk konsistensi data antar browser/user
  const lineChartData = useMemo(() => {
    // Default hours (07:30-09:00, kemudian 09:00 - 17:00)
    const defaultHours = ['07:30', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
    const baseData = defaultHours.map(hour => ({
      hour,
      table1: 0, table2: 0, table3: 0, table4: 0,
      table5: 0, table6: 0, table7: 0, table8: 0,
    }));

    // Jika ada data dari API, merge dengan base data
    if (hourlyFoldingDataResponse && Array.isArray(hourlyFoldingDataResponse) && hourlyFoldingDataResponse.length > 0) {
      return baseData.map(baseItem => {
        // Match hour dengan lebih fleksibel untuk handle berbagai format
        const apiItem = hourlyFoldingDataResponse.find((d: any) => {
          // Exact match
          if (d.hour === baseItem.hour) return true;

          // Handle '07:30' - bisa match dengan '07:30' atau '07:30-09:00'
          if (baseItem.hour === '07:30' && (d.hour === '07:30' || d.hour === '07:30-09:00')) return true;
          if (d.hour === '07:30' && baseItem.hour === '07:30') return true;

          // Handle '09:00' - bisa match dengan '09:00' atau '09'
          if (baseItem.hour === '09:00' && (d.hour === '09:00' || d.hour === '09')) return true;

          // Untuk jam lainnya, cek apakah startsWith (misal '10:00' match dengan '10')
          if (baseItem.hour && d.hour && baseItem.hour.includes(':')) {
            const baseHour = baseItem.hour.split(':')[0];
            const apiHour = d.hour.split(':')[0];
            if (baseHour === apiHour) return true;
          }

          return false;
        });
        if (apiItem) {
          // Merge dengan data dari API
          return {
            ...baseItem,
            ...apiItem,
            // Pastikan semua table ada
            table1: Number(apiItem.table1 || 0),
            table2: Number(apiItem.table2 || 0),
            table3: Number(apiItem.table3 || 0),
            table4: Number(apiItem.table4 || 0),
            table5: Number(apiItem.table5 || 0),
            table6: Number(apiItem.table6 || 0),
            table7: Number(apiItem.table7 || 0),
            table8: Number(apiItem.table8 || 0),
          };
        }
        return baseItem;
      });
    }

    // Jika belum ada data dari API, return base data (semua 0)
    return baseData;
  }, [hourlyFoldingDataResponse]);

  // Hitung total accumulation from hourly data untuk mendapatkan total hari ini yang akurat
  const totalFromHourly = useMemo(() => {
    const totals: Record<number, number> = {};
    // Gunakan lineChartData yang sudah merged dan lengkap untuk perhitungan total
    // Ini lebih aman karena cover kasus data partial
    lineChartData.forEach(hourData => {
      for (let i = 1; i <= 8; i++) {
        const key = `table${i}` as keyof typeof hourData;
        const value = Number(hourData[key]) || 0;
        totals[i] = (totals[i] || 0) + value;
      }
    });
    return totals;
  }, [lineChartData]);

  // Fetch data untuk semua line untuk Tabel Distribution
  const productionLines = productionLinesMJL.filter(line => line.id !== 111 && line.id <= 15);

  // State untuk menyimpan line mana yang ada datanya (tidak semua 0)
  const [linesWithData, setLinesWithData] = useState<Set<string>>(new Set());
  const [isInitialCheckDone, setIsInitialCheckDone] = useState(false);

  // Initial check: Fetch semua line sekali untuk cek mana yang ada datanya
  const { data: allLineFinishingData } = useQuery({
    queryKey: ['finishing-data-all-lines-folding-initial'],
    queryFn: async () => {
      const results: Record<string, any> = {};
      const activeLines = new Set<string>();

      const promises = productionLines.map(async (line) => {
        const lineNumber = line.line || line.id.toString();
        try {
          // Fetch finishing data per line
          const finishingResponse = await getFinishingDataByLine(lineNumber);
          const finishingData = finishingResponse.success ? finishingResponse.data : null;

          // Cek apakah ada data (tidak semua 0)
          if (finishingData) {
            const hasData =
              (finishingData.folding?.waiting ?? 0) > 0 ||
              (finishingData.folding?.checkin ?? 0) > 0 ||
              (finishingData.folding?.checkout ?? 0) > 0 ||
              (finishingData.dryroom?.waiting ?? 0) > 0 ||
              (finishingData.dryroom?.checkin ?? 0) > 0 ||
              (finishingData.dryroom?.checkout ?? 0) > 0 ||
              (finishingData.reject_room?.waiting ?? 0) > 0 ||
              (finishingData.reject_room?.checkin ?? 0) > 0 ||
              (finishingData.reject_room?.checkout ?? 0) > 0;

            if (hasData) {
              activeLines.add(lineNumber);
            }
          }

          // Fetch WO data dari monitoring/line
          const woResponse = await fetch(`${API_BASE_URL}/monitoring/line?line=${encodeURIComponent(lineNumber)}`, {
            headers: getDefaultHeaders()
          });
          const woData = woResponse.ok ? await woResponse.json() : null;

          // Extract WO data
          let woInfo = null;
          if (woData && woData.success && woData.data) {
            const data = Array.isArray(woData.data) ? woData.data[0] : woData.data;
            woInfo = {
              wo: data?.WO || data?.wo || data?.wo_no || '-',
              item: data?.Item || data?.item || '-',
            };
          }

          results[lineNumber] = {
            finishing: finishingData,
            wo: woInfo
          };
        } catch (error) {
          console.error(`Error fetching data for line ${lineNumber}:`, error);
          results[lineNumber] = {
            finishing: null,
            wo: null
          };
        }
      });

      await Promise.all(promises);

      // Update state untuk line yang ada datanya
      setLinesWithData(activeLines);
      setIsInitialCheckDone(true);

      return results;
    },
    staleTime: Infinity, // Data tidak akan dianggap stale (hanya fetch sekali)
    refetchInterval: false, // Tidak refetch otomatis
    refetchOnWindowFocus: false, // Tidak refetch saat window focus
    refetchOnMount: true, // Hanya fetch saat mount
    retry: 2,
  });

  // Fetch data untuk line yang ada datanya saja (setelah initial check)
  const { data: activeLineFinishingData } = useQuery({
    queryKey: ['finishing-data-active-lines-folding', Array.from(linesWithData).sort().join(',')],
    queryFn: async () => {
      if (linesWithData.size === 0) return {};

      const results: Record<string, any> = {};

      const promises = Array.from(linesWithData).map(async (lineNumber) => {
        try {
          // Fetch finishing data per line
          const finishingResponse = await getFinishingDataByLine(lineNumber);
          const finishingData = finishingResponse.success ? finishingResponse.data : null;

          // Fetch WO data dari monitoring/line
          const woResponse = await fetch(`${API_BASE_URL}/monitoring/line?line=${encodeURIComponent(lineNumber)}`, {
            headers: getDefaultHeaders()
          });
          const woData = woResponse.ok ? await woResponse.json() : null;

          // Extract WO data
          let woInfo = null;
          if (woData && woData.success && woData.data) {
            const data = Array.isArray(woData.data) ? woData.data[0] : woData.data;
            woInfo = {
              wo: data?.WO || data?.wo || data?.wo_no || '-',
              item: data?.Item || data?.item || '-',
            };
          }

          results[lineNumber] = {
            finishing: finishingData,
            wo: woInfo
          };
        } catch (error) {
          console.error(`Error fetching data for line ${lineNumber}:`, error);
          results[lineNumber] = {
            finishing: null,
            wo: null
          };
        }
      });

      await Promise.all(promises);
      return results;
    },
    enabled: isInitialCheckDone && linesWithData.size > 0, // Hanya fetch jika initial check selesai dan ada line dengan data
    staleTime: 30000, // Data dianggap fresh selama 30 detik
    refetchInterval: 120000, // Refresh setiap 2 menit (lebih jarang)
    refetchOnWindowFocus: false, // Tidak refetch saat window focus
    retry: 2,
  });

  // Merge data: initial check + active lines
  const mergedLineFinishingData = useMemo(() => {
    return {
      ...allLineFinishingData,
      ...activeLineFinishingData
    };
  }, [allLineFinishingData, activeLineFinishingData]);

  // Data untuk Tabel Distribution dari API (hanya yang ada data) - menggunakan data FOLDING
  const tableDistributionData: TableDistributionData[] = useMemo(() => {
    if (!mergedLineFinishingData) return [];

    // Data operator dari active users atau fallback ke dummy
    const getOperatorForLine = (lineNumber: string) => {
      const activeUser = activeUsersMap.get(lineNumber);
      if (activeUser) {
        return { nik: activeUser.nik, name: activeUser.name };
      }
      // Fallback dummy data
      const dummyOperators = [
        { nik: 'OP001', name: 'Ahmad Rizki' },
        { nik: 'OP002', name: 'Budi Santoso' },
        { nik: 'OP003', name: 'Cahya Pratama' },
        { nik: 'OP004', name: 'Dedi Kurniawan' },
        { nik: 'OP005', name: 'Eko Wijaya' },
        { nik: 'OP006', name: 'Fajar Hidayat' },
        { nik: 'OP007', name: 'Gunawan Sari' },
        { nik: 'OP008', name: 'Hadi Susanto' },
      ];
      const operatorIndex = (parseInt(lineNumber) - 1) % dummyOperators.length;
      return dummyOperators[operatorIndex];
    };

    const result: TableDistributionData[] = [];

    productionLines.forEach((line) => {
      const lineNumber = line.line || line.id.toString();
      const lineData = mergedLineFinishingData[lineNumber];

      if (!lineData || !lineData.finishing) {
        return;
      }

      const finishing = lineData.finishing;
      const wo = lineData.wo;

      // Gunakan data folding
      const waiting = finishing.folding?.waiting || 0;
      const checkIn = finishing.folding?.checkin || 0;
      const checkOut = finishing.folding?.checkout || 0;

      // Hanya tampilkan jika ada data
      if (waiting === 0 && checkIn === 0 && checkOut === 0) {
        return;
      }

      const operator = getOperatorForLine(lineNumber);

      result.push({
        line: `${lineNumber}`,
        wo: wo?.wo || '-',
        item: wo?.item || '-',
        waiting,
        checkIn,
        checkOut,
        operatorNIK: operator.nik,
        operatorName: operator.name,
      });
    });

    return result;
  }, [mergedLineFinishingData, productionLines]);

  // Fungsi untuk extract line number dari nama user
  const extractLineFromName = (name: string): number | null => {
    if (!name) return null;
    const match = name.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  };

  // Fungsi untuk mengecek apakah user bisa akses table tertentu
  const canAccessTable = useMemo(() => {
    return (tableNumber: number): boolean => {
      // Jika tidak ada user login, tidak bisa akses
      if (!user) return false;

      // Cek bagian/jabatan - hanya FOLDING, IT, ROBOTIC, dan MANAGER yang bisa akses
      const allowedParts = ['FOLDING', 'IT', 'ROBOTIC', 'MANAGER'];
      const userPart = (user.bagian || user.jabatan || '').toUpperCase();
      if (!allowedParts.includes(userPart)) {
        return false;
      }

      // Jika mode all-users aktif, semua user dengan bagian yang diizinkan bisa akses semua table
      if (isAllUsersMode()) {
        return true; // Semua user dengan bagian FOLDING, IT, ROBOTIC, MANAGER bisa akses semua table
      }

      // Mode user-specific: cek apakah NIK dan line sesuai dengan table
      // Untuk bagian FOLDING, cek apakah NIK dan line sesuai dengan table
      if (userPart === 'FOLDING') {
        // Get active user untuk table ini
        const activeUser = activeUsersMap.get(tableNumber.toString());

        // Jika tidak ada active user di table ini, tidak bisa akses
        if (!activeUser) return false;

        // Extract line dari nama user yang login
        const userLine = extractLineFromName(user.name) || user.line;

        // Cek apakah NIK dan line sesuai
        const nikMatch = user.nik === activeUser.nik;
        const lineMatch = userLine?.toString() === tableNumber.toString() ||
          user.line?.toString() === tableNumber.toString();

        return nikMatch && lineMatch;
      }

      // Untuk IT, ROBOTIC, dan MANAGER, bisa akses semua table (baik mode all-users atau user-specific)
      return true;
    };
  }, [user, activeUsersMap]);

  // Fetch data total folding checkout per table dari API
  // Menggunakan tanggal yang valid (hari ini jika sudah jam 8, kemarin jika belum)
  const { data: tableCountDataResponse, refetch: refetchTableCount } = useQuery({
    queryKey: ['folding-checkout-count-per-table', getValidDate()],
    queryFn: async () => {
      try {
        const validDate = getValidDate();
        const response = await fetch(`${API_BASE_URL}/api/folding/count?date=${validDate}`, {
          headers: getDefaultHeaders()
        });

        if (!response.ok) {
          throw new Error('Failed to fetch table count data');
        }

        const data = await response.json();
        if (data.success && data.data) {
          return data.data;
        }

        return {
          table1: 0,
          table2: 0,
          table3: 0,
          table4: 0,
          table5: 0,
          table6: 0,
          table7: 0,
          table8: 0,
        };
      } catch (error) {
        console.error('Error fetching table count data:', error);
        // Jangan return default values saat error, throw error agar placeholderData bisa menjaga data lama
        throw error;
      }
    },
    staleTime: 0, // Data selalu dianggap stale, sehingga selalu fetch data terbaru saat mount
    refetchInterval: 1000, // Refresh setiap 1 detik (Realtime Ultra Cepat)
    refetchOnWindowFocus: true, // Refetch saat window focus
    refetchOnMount: true, // Selalu fetch saat component mount
    refetchOnReconnect: true, // Refetch saat reconnect
    retry: 2,
    // Gunakan placeholderData untuk menjaga data lama saat refetch (mencegah data menjadi 0)
    // Tapi jangan gunakan saat mount pertama kali, biarkan fetch data baru
    placeholderData: (previousData: any) => {
      // Hanya gunakan data sebelumnya jika sedang refetch (bukan mount pertama)
      // Jika previousData ada dan bukan default values, gunakan itu
      if (previousData &&
        typeof previousData === 'object' &&
        !Object.values(previousData).every(val => val === 0)) {
        return previousData;
      }
      // Return undefined untuk mount pertama kali, biarkan fetch data baru
      return undefined;
    },
  });

  // Monitor perubahan data real untuk semua table dan reset optimistik count jika sudah ter-update
  useEffect(() => {
    if (!tableCountDataResponse) return;

    // Update stable counts dengan logika: ambil nilai terbesar
    setStableCounts(prev => {
      const next = { ...prev };
      let hasChanges = false;

      Array.from({ length: 8 }, (_, i) => {
        const tableNum = i + 1;
        const tableKey = `table${tableNum}` as 'table1' | 'table2' | 'table3' | 'table4' | 'table5' | 'table6' | 'table7' | 'table8';
        const newCount = tableCountDataResponse?.[tableKey] ?? 0;
        const currentStable = prev[tableNum] ?? 0;
        const hourlyTotal = totalFromHourly[tableNum] ?? 0;

        // Update jika ada nilai yang lebih besar dari API atau Hourly Data
        // Prioritas ke hourlyTotal karena itu akumulasi hari ini
        const maxVal = Math.max(newCount, hourlyTotal);

        if (maxVal > currentStable || (maxVal > 0 && currentStable === 0)) {
          next[tableNum] = maxVal;
          hasChanges = true;
        }
      });

      return hasChanges ? next : prev;
    });

    Array.from({ length: 8 }, (_, i) => {
      const tableNum = i + 1;
      const tableKey = `table${tableNum}` as 'table1' | 'table2' | 'table3' | 'table4' | 'table5' | 'table6' | 'table7' | 'table8';
      const currentRealCount = tableCountDataResponse[tableKey] ?? 0;
      // Gunakan stable count sebagai baseline untuk lastKnown
      const stableCount = Math.max(currentRealCount, stableCounts[tableNum] ?? 0);

      const lastKnown = lastKnownCounts[tableNum] ?? 0;
      const optimistic = optimisticCounts[tableNum] ?? 0;

      // Jika ada optimistic count, cek apakah data real sudah ter-update
      if (optimistic > 0) {
        const expectedCount = lastKnown + optimistic;
        // Hanya reset jika data real sudah mencapai atau melebihi expected count
        if (stableCount >= expectedCount) {
          setOptimisticCounts(prev => {
            const newCounts = { ...prev };
            delete newCounts[tableNum];
            return newCounts;
          });
          setLastKnownCounts(prev => ({
            ...prev,
            [tableNum]: stableCount
          }));
        } else if (stableCount > lastKnown && stableCount < expectedCount) {
          // Jika data real sudah bertambah tapi belum mencapai expected, update lastKnownCount
          setLastKnownCounts(prev => ({
            ...prev,
            [tableNum]: stableCount
          }));
        }
      } else if (optimistic === 0 && stableCount !== lastKnown) {
        // Update lastKnownCount jika tidak ada optimistik count dan data berubah
        setLastKnownCounts(prev => ({
          ...prev,
          [tableNum]: stableCount
        }));
      }
    });
  }, [tableCountDataResponse, optimisticCounts, lastKnownCounts, totalFromHourly]);

  // Fetch WO terakhir untuk setiap table - HANYA untuk table yang ada active user
  const { data: tableWoData } = useQuery<Record<number, string>>({
    queryKey: ['table-wo-data', activeUsersMap.size],
    queryFn: async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const woMap: Record<number, string> = {};

        // Hanya fetch WO untuk table yang ada active user
        const activeTableNumbers = Array.from(activeUsersMap.keys()).map(k => parseInt(k));

        if (activeTableNumbers.length === 0) {
          return woMap; // Tidak ada active user, return empty map
        }

        const promises = activeTableNumbers.map(async (tableNum) => {
          try {
            const response = await fetch(`${API_BASE_URL}/api/folding/detail?date=${today}&table=${tableNum}`, {
              headers: getDefaultHeaders()
            });

            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
                // Ambil WO dari item terbaru (index 0 karena sudah di-sort)
                woMap[tableNum] = data.data[0].wo || '-';
              } else {
                woMap[tableNum] = '-';
              }
            } else {
              woMap[tableNum] = '-';
            }
          } catch (error) {
            woMap[tableNum] = '-';
          }
        });

        await Promise.all(promises);
        return woMap;
      } catch (error) {
        console.error('Error fetching table WO data:', error);
        return {};
      }
    },
    enabled: activeUsersMap.size > 0, // Hanya fetch jika ada active user
    staleTime: 20000, // Data dianggap fresh selama 20 detik
    refetchInterval: 1000, // Refresh setiap 1 detik (Realtime Ultra Cepat)
    refetchOnWindowFocus: true, // Refetch saat window focus
    retry: 2,
  });

  // Data untuk Shipment Station dengan WO dan Operator - tetap 8 card, hanya diisi yang ada user login
  const checkOutStations = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const tableNum = i + 1;
      const tableKey = `table${tableNum}` as 'table1' | 'table2' | 'table3' | 'table4' | 'table5' | 'table6' | 'table7' | 'table8';

      // Gunakan data count dari API (total hari ini) - JANGAN gunakan totalFromHourly karena itu data per jam
      // Gunakan stable count untuk mencegah data hilang (reset ke 0)
      const apiCount = tableCountDataResponse?.[tableKey] ?? 0;
      const hourlyTotal = totalFromHourly[tableNum] ?? 0;
      const stableCount = stableCounts[tableNum] ?? 0;

      // Ambil nilai terbesar dari ketiga sumber data untuk akurasi maksimal
      const finalCount = Math.max(apiCount, stableCount, hourlyTotal);

      // Tambahkan optimistik count untuk update real-time langsung
      const optimisticCount = optimisticCounts[tableNum] || 0;
      const total = finalCount + optimisticCount;

      // Get WO terakhir dari API
      const wo = tableWoData?.[tableNum] || '-';

      // Get operator from active users - jika ada user login, gunakan datanya
      const activeUser = activeUsersMap.get(tableNum.toString());

      // Get scanning user (untuk mode all-users - realtime display)
      const scanningUser = isAllUsersMode() ? scanningUsersMap.get(tableNum.toString()) : null;

      // Prioritas: gunakan scanning user jika ada (mode all-users), jika tidak gunakan active user
      const displayUser = scanningUser || activeUser;

      // Cek apakah user yang login bisa akses table ini
      const hasAccess = canAccessTable(tableNum);

      return {
        tableNumber: tableNum,
        count: total,
        wo: wo, // WO dari API (scanning terakhir)
        operator: displayUser ? displayUser.name : '', // Kosong jika tidak ada user login/scanning
        operatorNIK: displayUser ? displayUser.nik : '', // Kosong jika tidak ada user login/scanning
        color: TABLE_COLORS[i],
        hasUser: !!displayUser, // Flag untuk menandai apakah ada user login/scanning
        canAccess: hasAccess, // Flag untuk menandai apakah user yang login bisa akses
        isScanning: !!scanningUser, // Flag untuk menandai apakah user sedang scan (mode all-users)
      };
    });
  }, [tableCountDataResponse, optimisticCounts, activeUsersMap, scanningUsersMap, canAccessTable, tableWoData]);

  // --- LAYOUT ---
  const sidebarWidth = isOpen ? '18%' : '5rem';

  // State untuk detect mobile device
  const [isMobile, setIsMobile] = useState(false);

  // Effect untuk detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      // Gunakan breakpoint md (768px) sebagai batas mobile/desktop
      // Di bawah 768px = mobile, di atas = desktop
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="flex h-screen w-screen bg-[#f8fafc] font-sans text-slate-800 overflow-hidden relative selection:bg-teal-200 selection:text-teal-900">

      {/* Background Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40"
        style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />

      {/* SIDEBAR */}
      <aside className="fixed left-0 top-0 h-full z-[60] shadow-2xl shadow-slate-200/50 transition-all duration-300">
        <Sidebar />
      </aside>

      {/* MAIN WRAPPER */}
      <div
        className="flex flex-col h-full relative z-10 transition-all duration-300 ease-in-out"
        style={{
          marginLeft: sidebarWidth,
          width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)'
        }}
      >

        {/* HEADER */}

        <Header />


        {/* MAIN CONTENT - Conditional: Mobile dengan scrolling, Desktop tetap one page */}
        <main className={`
          flex-1 flex flex-col p-3 md:p-4 lg:p-5 gap-3 md:gap-4 lg:gap-5 
          transition-opacity duration-700 ease-out
          ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          ${isMobile ? 'overflow-y-auto dashboard-scrollable' : 'overflow-hidden'}
        `}
          style={isMobile ? { WebkitOverflowScrolling: 'touch' } : {}}
        >
          {isMobile ? (
            /* MOBILE VERSION: Scrolling dengan layout portrait */
            <div className="pt-12 flex flex-col gap-3 md:gap-4 lg:gap-5">
              {/* BAGIAN ATAS: STATUS CARDS - Full width di mobile */}
              <div className="flex-none w-full min-h-[200px]">
                <Card title="Real-time Status Folding" icon={RefreshCw} action={
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        await Promise.all([
                          refetchFinishingData(),
                          refetchHourlyData(),
                          refetchTableCount()
                        ]);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-teal-600 transition-all shadow-sm font-semibold text-xs md:text-sm h-[38px] md:h-[42px]"
                      title="Force Sync Data"
                    >
                      <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span className="hidden sm:inline">Sync</span>
                    </button>
                    <FilterButton icon={Filter} label="Filter WO" onClick={() => setShowWoFilterModal(true)} variant="wo" />
                    <FilterButton icon={Calendar} label="Filter Date" onClick={() => setShowDateFilterModal(true)} variant="date" />
                  </div>
                }>
                  <div className="grid grid-cols-3 gap-3 md:gap-4 h-full min-h-0 items-stretch">
                    <MetricCard
                      label="Waiting"
                      value={foldingWaiting}
                      type="waiting"
                      onClick={() => {
                        setDetailModalType('waiting');
                        setDetailModalSection('folding');
                        setShowDetailModal(true);
                        setDetailSearchQuery('');
                      }}
                    />
                    <MetricCard
                      label="Check In"
                      value={foldingCheckIn}
                      type="checkin"
                      onClick={() => {
                        setDetailModalType('checkin');
                        setDetailModalSection('folding');
                        setShowDetailModal(true);
                        setDetailSearchQuery('');
                      }}
                    />
                    <MetricCard
                      label="Shipment"
                      value={foldingCheckOut}
                      type="checkout"
                      onClick={() => {
                        setDetailModalType('checkout');
                        setDetailModalSection('folding');
                        setShowDetailModal(true);
                        setDetailSearchQuery('');
                      }}
                    />
                  </div>
                </Card>
              </div>

              {/* BAGIAN TENGAH: TABLE DISTRIBUTION - Full width di mobile */}
              <div className="flex-none w-full min-h-[250px]">
                <TableDistribution
                  data={tableDistributionData}
                  themeColor="teal"
                  title="Tabel Distribution Folding"
                  onExport={async () => {
                    const exportData = tableDistributionData.map(row => ({
                      line: row.line,
                      wo: row.wo,
                      style: '-',
                      item: row.item,
                      buyer: '-',
                      operatorNIK: row.operatorNIK || '-',
                      operatorName: row.operatorName || '-',
                      waiting: row.waiting,
                      checkIn: row.checkIn,
                      checkOut: row.checkOut,
                    }));
                    await exportFinishingToExcel(exportData, 'folding', 'excel', filterDateFrom, filterDateTo);
                  }}
                />
              </div>

              {/* BAGIAN TENGAH: CHART - Full width di mobile */}
              <div className="flex-none w-full min-h-[250px]">
                <Card title="Hourly Shipment Table Folding" icon={TrendingUp}
                  action={
                    <button
                      onClick={() => setShowFoldingScanModal(true)}
                      className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white bg-sky-500 hover:bg-sky-700 transition-all shadow-sm hover:scale-105"
                    >
                      <Scan className="w-5 h-5" />
                      <span>Check In</span>
                    </button>
                  }
                >
                  <div className="w-full flex-1 min-h-0 pt-3 pl-0 flex flex-col">
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9, fontWeight: 500 }} dy={5} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }} />
                          <Tooltip content={<CustomTooltip type="line" />} cursor={{ fill: '#f1f5f9' }} />
                          {Array.from({ length: 8 }, (_, i) => {
                            const tableNum = i + 1;
                            const isHovered = hoveredTable === tableNum;
                            const isDimmed = selectedTable !== null ? selectedTable !== tableNum : (hoveredTable !== null && hoveredTable !== tableNum);

                            return (
                              <Line
                                key={`table${tableNum}`}
                                type="monotone"
                                dataKey={`table${tableNum}`}
                                stroke={isDimmed ? '#d1d5db' : TABLE_COLORS[i]}
                                strokeWidth={isHovered || selectedTable === tableNum ? 4 : (isDimmed ? 1 : 2)}
                                dot={isDimmed ? false : { fill: TABLE_COLORS[i], r: (isHovered || selectedTable === tableNum) ? 6 : 3 }}
                                activeDot={{ r: 6 }}
                                name={`Table ${tableNum}`}
                                strokeOpacity={isDimmed ? 0.3 : 1}
                                animationDuration={300}
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Filter Buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 pb-1 border-t border-slate-100 mt-2">
                      {Array.from({ length: 8 }, (_, i) => {
                        const tableNum = i + 1;
                        const isSelected = selectedTable === tableNum;
                        return (
                          <button
                            key={tableNum}
                            onClick={() => setSelectedTable(isSelected ? null : tableNum)}
                            onMouseEnter={() => setHoveredTable(tableNum)}
                            onMouseLeave={() => setHoveredTable(null)}
                            className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all duration-200 ${isSelected
                              ? 'bg-teal-600 text-white shadow-md scale-105'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:scale-105'
                              }`}
                            style={{
                              border: isSelected ? `2px solid ${TABLE_COLORS[i]}` : '2px solid transparent',
                            }}
                          >
                            Table {tableNum}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              </div>

              {/* BAGIAN BAWAH: TABLE CARDS - Full width di mobile */}
              <div className="flex-none w-full min-h-[400px]">
                <Card title="Shipment Station Folding" icon={Layers}>
                  <div className="flex-1 min-h-0 overflow-hidden relative rounded-xl border border-slate-200 mt-1 bg-white">
                    <div className="absolute inset-0 overflow-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent p-2">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 h-full">
                        {checkOutStations.map((station) => {
                          const isHighlighted = hoveredTable === station.tableNumber || selectedTable === station.tableNumber;

                          const hexToRgba = (hex: string, alpha: number) => {
                            const r = parseInt(hex.slice(1, 3), 16);
                            const g = parseInt(hex.slice(3, 5), 16);
                            const b = parseInt(hex.slice(5, 7), 16);
                            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                          };

                          const canAccess = station.canAccess;

                          return (
                            <div
                              key={station.tableNumber}
                              onMouseEnter={() => canAccess && setHoveredTable(station.tableNumber)}
                              onMouseLeave={() => setHoveredTable(null)}
                              onClick={() => {
                                if (canAccess) {
                                  setSelectedTableDetail(station.tableNumber);
                                }
                              }}
                              className={`group/card relative rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-center overflow-hidden shadow-sm py-1 px-1 ${canAccess
                                ? 'cursor-pointer hover:shadow-lg'
                                : 'cursor-not-allowed opacity-50'
                                }`}
                              style={{
                                background: canAccess && isHighlighted
                                  ? `linear-gradient(135deg, ${hexToRgba(station.color, 0.12)} 0%, ${hexToRgba(station.color, 0.06)} 100%)`
                                  : canAccess
                                    ? `linear-gradient(135deg, ${hexToRgba(station.color, 0.05)} 0%, ${hexToRgba(station.color, 0.02)} 100%)`
                                    : `linear-gradient(135deg, ${hexToRgba('#94a3b8', 0.05)} 0%, ${hexToRgba('#94a3b8', 0.02)} 100%)`,
                                borderColor: canAccess ? '#cbd5e1' : '#e2e8f0',
                                borderWidth: selectedTable === station.tableNumber ? '3px' : '2px',
                                transform: canAccess && isHighlighted ? 'translateY(-2px) scale(1.02)' : 'none',
                                opacity: canAccess
                                  ? (selectedTable && selectedTable !== station.tableNumber ? 0.5 : 1)
                                  : 0.4,
                                minHeight: 'clamp(100px, 12vh, 160px)',
                                gap: 'clamp(0.15rem, 0.6vh, 0.4rem)',
                              }}
                            >
                              <div
                                className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"
                                style={{
                                  background: `radial-gradient(circle at 50% 30%, ${hexToRgba(station.color, 0.15)} 0%, transparent 70%)`
                                }}
                              ></div>

                              <div
                                className="absolute top-0 left-0 right-0 h-1 transition-opacity duration-300"
                                style={{
                                  background: canAccess
                                    ? `linear-gradient(90deg, ${station.color} 0%, ${hexToRgba(station.color, 0.5)} 100%)`
                                    : `linear-gradient(90deg, #94a3b8 0%, ${hexToRgba('#94a3b8', 0.5)} 100%)`,
                                  opacity: canAccess && isHighlighted ? 1 : canAccess ? 0.3 : 0.2,
                                }}
                              ></div>

                              <span
                                className="relative z-10 font-bold transition-all duration-300 text-center px-1.5 py-0.5 rounded-md text-xs md:text-sm"
                                style={{
                                  color: canAccess && isHighlighted ? station.color : canAccess ? '#64748b' : '#94a3b8',
                                  backgroundColor: canAccess && isHighlighted ? hexToRgba(station.color, 0.1) : 'transparent',
                                  fontSize: 'clamp(0.65rem, 1.5vh, 0.85rem)',
                                  lineHeight: '1.2',
                                }}
                              >
                                Table {station.tableNumber}
                              </span>

                              {station.hasUser && station.operator && (
                                <span
                                  className="relative z-10 font-semibold transition-all duration-300 px-1.5 py-0.5 rounded text-center text-[10px] md:text-xs"
                                  style={{
                                    color: isHighlighted ? station.color : '#475569',
                                    backgroundColor: isHighlighted ? hexToRgba(station.color, 0.08) : 'transparent',
                                    fontSize: 'clamp(0.55rem, 1.5vh, 0.75rem)',
                                    lineHeight: '1.2',
                                  }}
                                >
                                  {station.operator}
                                </span>
                              )}

                              <span
                                className="relative z-10 font-black transition-all duration-300 text-2xl md:text-3xl"
                                style={{
                                  color: canAccess && isHighlighted ? station.color : canAccess ? '#0f172a' : '#94a3b8',
                                  fontSize: 'clamp(1.7rem, 3.2vh, 2.5rem)',
                                  lineHeight: '1',
                                  textShadow: canAccess && isHighlighted ? `0 2px 8px ${hexToRgba(station.color, 0.2)}` : 'none',
                                }}
                              >
                                {station.count}
                              </span>

                              <span
                                className="relative z-10 font-semibold transition-all duration-300 px-1.5 py-0.5 rounded text-center text-[10px] md:text-xs"
                                style={{
                                  color: canAccess && isHighlighted ? station.color : canAccess ? '#64748b' : '#94a3b8',
                                  backgroundColor: canAccess && isHighlighted ? hexToRgba(station.color, 0.08) : 'transparent',
                                  fontSize: 'clamp(0.55rem, 2vh, 0.7rem)',
                                  lineHeight: '1.2',
                                }}
                              >
                                WO: {station.wo}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            /* DESKTOP VERSION: One page, layout tetap sama seperti sebelumnya */
            <div className="pt-12 flex-1 flex flex-col gap-3 md:gap-4 lg:gap-5 min-h-0 overflow-hidden">
              {/* ROW 1: STATUS & PIE */}
              <div className="flex-[4] min-h-[160px] md:min-h-[200px] lg:min-h-[220px] grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 lg:gap-5">
                {/* LEFT: STATUS CARDS */}
                <div className="col-span-12 md:col-span-7 min-h-0 flex flex-col">
                  <Card title="Real-time Status Folding" icon={RefreshCw} action={
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          await Promise.all([
                            refetchFinishingData(),
                            refetchHourlyData(),
                            refetchTableCount()
                          ]);
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-teal-600 transition-all shadow-sm font-semibold text-xs md:text-sm h-[38px] md:h-[42px]"
                        title="Force Sync Data"
                      >
                        <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        <span className="hidden sm:inline">Sync</span>
                      </button>
                      <FilterButton icon={Filter} label="Filter WO" onClick={() => setShowWoFilterModal(true)} variant="wo" />
                      <FilterButton icon={Calendar} label="Filter Date" onClick={() => setShowDateFilterModal(true)} variant="date" />
                    </div>
                  }>
                    <div className="grid justify-center grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 h-full min-h-0 items-stretch">
                      <MetricCard
                        label="Waiting"
                        value={foldingWaiting}
                        type="waiting"
                        onClick={() => {
                          setDetailModalType('waiting');
                          setDetailModalSection('folding');
                          setShowDetailModal(true);
                          setDetailSearchQuery('');
                        }}
                      />
                      <MetricCard
                        label="Check In"
                        value={foldingCheckIn}
                        type="checkin"
                        onClick={() => {
                          setDetailModalType('checkin');
                          setDetailModalSection('folding');
                          setShowDetailModal(true);
                          setDetailSearchQuery('');
                        }}
                      />
                      <MetricCard
                        label="Shipment"
                        value={foldingCheckOut}
                        type="checkout"
                        onClick={() => {
                          setDetailModalType('checkout');
                          setDetailModalSection('folding');
                          setShowDetailModal(true);
                          setDetailSearchQuery('');
                        }}
                      />
                    </div>
                  </Card>
                </div>

                {/* RIGHT: TABLE DISTRIBUTION */}
                <div className="col-span-12 md:col-span-5 min-h-0 flex flex-col">
                  <TableDistribution
                    data={tableDistributionData}
                    themeColor="teal"
                    title="Tabel Distribution Folding"
                    onExport={async () => {
                      const exportData = tableDistributionData.map(row => ({
                        line: row.line,
                        wo: row.wo,
                        style: '-',
                        item: row.item,
                        buyer: '-',
                        operatorNIK: row.operatorNIK || '-',
                        operatorName: row.operatorName || '-',
                        waiting: row.waiting,
                        checkIn: row.checkIn,
                        checkOut: row.checkOut,
                      }));
                      await exportFinishingToExcel(exportData, 'folding', 'excel', filterDateFrom, filterDateTo);
                    }}
                  />
                </div>
              </div>

              {/* ROW 2: CHART & TABLE CARDS */}
              <div className="flex-[6] min-h-[200px] md:min-h-[250px] lg:min-h-[300px] grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 lg:gap-5">

                {/* LEFT: CHART */}
                <div className="col-span-12 md:col-span-6 min-h-0 flex flex-col">
                  <Card title="Hourly Shipment Table Folding" icon={TrendingUp}
                    action={
                      <button
                        onClick={() => setShowFoldingScanModal(true)}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white bg-sky-500 hover:bg-sky-700 transition-all shadow-sm hover:scale-105"
                      >
                        <Scan className="w-5 h-5" />
                        <span>Check In</span>
                      </button>
                    }
                  >
                    <div className="w-full flex-1 min-h-0 pt-3 pl-0 flex flex-col">
                      <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9, fontWeight: 500 }} dy={5} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }} />
                            <Tooltip content={<CustomTooltip type="line" />} cursor={{ fill: '#f1f5f9' }} />
                            {Array.from({ length: 8 }, (_, i) => {
                              const tableNum = i + 1;
                              const isHovered = hoveredTable === tableNum;
                              // Jika ada selectedTable, hanya tampilkan table yang dipilih, yang lain di-dimmed
                              // Jika tidak ada selectedTable tapi ada hoveredTable, highlight yang di-hover
                              const isDimmed = selectedTable !== null ? selectedTable !== tableNum : (hoveredTable !== null && hoveredTable !== tableNum);

                              return (
                                <Line
                                  key={`table${tableNum}`}
                                  type="monotone"
                                  dataKey={`table${tableNum}`}
                                  stroke={isDimmed ? '#d1d5db' : TABLE_COLORS[i]}
                                  strokeWidth={isHovered || selectedTable === tableNum ? 4 : (isDimmed ? 1 : 2)}
                                  dot={isDimmed ? false : { fill: TABLE_COLORS[i], r: (isHovered || selectedTable === tableNum) ? 6 : 3 }}
                                  activeDot={{ r: 6 }}
                                  name={`Table ${tableNum}`}
                                  strokeOpacity={isDimmed ? 0.3 : 1}
                                  animationDuration={300}
                                />
                              );
                            })}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Filter Buttons */}
                      <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 pb-1 border-t border-slate-100 mt-2">
                        {Array.from({ length: 8 }, (_, i) => {
                          const tableNum = i + 1;
                          const isSelected = selectedTable === tableNum;
                          return (
                            <button
                              key={tableNum}
                              onClick={() => setSelectedTable(isSelected ? null : tableNum)}
                              onMouseEnter={() => setHoveredTable(tableNum)}
                              onMouseLeave={() => setHoveredTable(null)}
                              className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all duration-200 ${isSelected
                                ? 'bg-teal-600 text-white shadow-md scale-105'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:scale-105'
                                }`}
                              style={{
                                border: isSelected ? `2px solid ${TABLE_COLORS[i]}` : '2px solid transparent',
                              }}
                            >
                              Table {tableNum}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* RIGHT: TABLE CARDS */}
                <div className="col-span-12 md:col-span-6 min-h-0 flex flex-col">
                  <Card title="Shipment Station Folding" icon={Layers}>
                    <div className="flex-1 min-h-0 overflow-hidden relative rounded-xl border border-slate-200 mt-1 bg-white">
                      <div className="absolute inset-0 overflow-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent p-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 h-full">
                          {checkOutStations.map((station) => {
                            const isHighlighted = hoveredTable === station.tableNumber || selectedTable === station.tableNumber;

                            // Convert hex to rgba for soft background
                            const hexToRgba = (hex: string, alpha: number) => {
                              const r = parseInt(hex.slice(1, 3), 16);
                              const g = parseInt(hex.slice(3, 5), 16);
                              const b = parseInt(hex.slice(5, 7), 16);
                              return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                            };

                            // Cek apakah user bisa akses table ini
                            const canAccess = station.canAccess;

                            return (
                              <div
                                key={station.tableNumber}
                                onMouseEnter={() => canAccess && setHoveredTable(station.tableNumber)}
                                onMouseLeave={() => setHoveredTable(null)}
                                onClick={() => {
                                  if (canAccess) {
                                    setSelectedTableDetail(station.tableNumber);
                                  }
                                }}
                                className={`group/card relative rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-center overflow-hidden shadow-sm py-1 px-1 ${canAccess
                                  ? 'cursor-pointer hover:shadow-lg'
                                  : 'cursor-not-allowed opacity-50'
                                  }`}
                                style={{
                                  background: canAccess && isHighlighted
                                    ? `linear-gradient(135deg, ${hexToRgba(station.color, 0.12)} 0%, ${hexToRgba(station.color, 0.06)} 100%)`
                                    : canAccess
                                      ? `linear-gradient(135deg, ${hexToRgba(station.color, 0.05)} 0%, ${hexToRgba(station.color, 0.02)} 100%)`
                                      : `linear-gradient(135deg, ${hexToRgba('#94a3b8', 0.05)} 0%, ${hexToRgba('#94a3b8', 0.02)} 100%)`,
                                  borderColor: canAccess ? '#cbd5e1' : '#e2e8f0',
                                  borderWidth: selectedTable === station.tableNumber ? '3px' : '2px',
                                  transform: canAccess && isHighlighted ? 'translateY(-2px) scale(1.02)' : 'none',
                                  opacity: canAccess
                                    ? (selectedTable && selectedTable !== station.tableNumber ? 0.5 : 1)
                                    : 0.4,
                                  minHeight: 'clamp(100px, 12vh, 160px)',
                                  gap: 'clamp(0.15rem, 0.6vh, 0.4rem)',
                                }}
                              >
                                {/* Decorative gradient overlay */}
                                <div
                                  className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"
                                  style={{
                                    background: `radial-gradient(circle at 50% 30%, ${hexToRgba(station.color, 0.15)} 0%, transparent 70%)`
                                  }}
                                ></div>

                                {/* Top accent line */}
                                <div
                                  className="absolute top-0 left-0 right-0 h-1 transition-opacity duration-300"
                                  style={{
                                    background: canAccess
                                      ? `linear-gradient(90deg, ${station.color} 0%, ${hexToRgba(station.color, 0.5)} 100%)`
                                      : `linear-gradient(90deg, #94a3b8 0%, ${hexToRgba('#94a3b8', 0.5)} 100%)`,
                                    opacity: canAccess && isHighlighted ? 1 : canAccess ? 0.3 : 0.2,
                                  }}
                                ></div>

                                {/* Table Number */}
                                <span
                                  className="relative z-10 font-bold transition-all duration-300 text-center px-1.5 py-0.5 rounded-md text-xs md:text-sm"
                                  style={{
                                    color: canAccess && isHighlighted ? station.color : canAccess ? '#64748b' : '#94a3b8',
                                    backgroundColor: canAccess && isHighlighted ? hexToRgba(station.color, 0.1) : 'transparent',
                                    fontSize: 'clamp(0.65rem, 1.5vh, 0.85rem)',
                                    lineHeight: '1.2',
                                  }}
                                >
                                  Table {station.tableNumber}
                                </span>

                                {/* Operator Display - hanya tampilkan jika ada user login */}
                                {station.hasUser && station.operator && (
                                  <span
                                    className="relative z-10 font-semibold transition-all duration-300 px-1.5 py-0.5 rounded text-center text-[10px] md:text-xs"
                                    style={{
                                      color: isHighlighted ? station.color : '#475569',
                                      backgroundColor: isHighlighted ? hexToRgba(station.color, 0.08) : 'transparent',
                                      fontSize: 'clamp(0.55rem, 1.5vh, 0.75rem)',
                                      lineHeight: '1.2',
                                    }}
                                  >
                                    {station.operator}
                                  </span>
                                )}

                                {/* Count Value */}
                                <span
                                  className="relative z-10 font-black transition-all duration-300 text-2xl md:text-3xl"
                                  style={{
                                    color: canAccess && isHighlighted ? station.color : canAccess ? '#0f172a' : '#94a3b8',
                                    fontSize: 'clamp(1.7rem, 3.2vh, 2.5rem)',
                                    lineHeight: '1',
                                    textShadow: canAccess && isHighlighted ? `0 2px 8px ${hexToRgba(station.color, 0.2)}` : 'none',
                                  }}
                                >
                                  {station.count}
                                </span>

                                {/* WO Display */}
                                <span
                                  className="relative z-10 font-semibold transition-all duration-300 px-1.5 py-0.5 rounded text-center text-[10px] md:text-xs"
                                  style={{
                                    color: canAccess && isHighlighted ? station.color : canAccess ? '#64748b' : '#94a3b8',
                                    backgroundColor: canAccess && isHighlighted ? hexToRgba(station.color, 0.08) : 'transparent',
                                    fontSize: 'clamp(0.55rem, 2vh, 0.7rem)',
                                    lineHeight: '1.2',
                                  }}
                                >
                                  WO: {station.wo}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

              </div>
            </div>
          )}

        </main>

      </div>

      {/* --- MODALS --- */}
      <ScanningFinishingModal
        isOpen={showFoldingScanModal}
        onClose={() => {
          setShowFoldingScanModal(false);
          refetchFinishingData();
        }}
        type="folding"
        onSuccess={async (tableNum?: number) => {
          // Refetch data segera setelah scan berhasil
          refetchFinishingData();
          refetchHourlyData();
          refetchTableCount();

          if (tableNum) {
            // Update stableCounts manual untuk responsivitas instan
            setStableCounts(prev => ({
              ...prev,
              [tableNum]: (prev[tableNum] || 0) + 1
            }));
          }

          // Invalidate queries terlebih dahulu untuk mark sebagai stale dan force refetch
          queryClient.invalidateQueries({
            queryKey: ['hourly-folding-checkout-data'],
            refetchType: 'active' // Force refetch untuk active queries
          });
          // JANGAN invalidate 'folding-checkout-count-per-table' karena akan mereset semua table
          // Hanya refetch tanpa invalidate untuk menjaga data table lain
          if (tableNum) {
            queryClient.invalidateQueries({
              queryKey: ['table-detail-data', tableNum],
              refetchType: 'active'
            });
            queryClient.invalidateQueries({
              queryKey: ['table-wo-data'],
              refetchType: 'active'
            });
            queryClient.invalidateQueries({
              queryKey: ['table-wo-modal', tableNum],
              refetchType: 'active'
            });
          }

          // Refetch 'folding-checkout-count-per-table' tanpa invalidate untuk menjaga data table lain
          // Gunakan setTimeout untuk memastikan server sudah menyimpan data sebelum refetch
          setTimeout(async () => {
            await Promise.all([
              refetchFinishingData(),
              refetchHourlyData(),
              refetchTableCount() // Refetch tanpa invalidate untuk menjaga data table lain
            ]);
          }, 1000); // Tunggu 1 detik untuk memastikan server sudah menyimpan data
        }}
      />

      {/* Finishing Detail Modal */}
      <FinishingDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setDetailSearchQuery('');
        }}
        type={detailModalType}
        section={detailModalSection}
        searchQuery={detailSearchQuery}
        onSearchChange={setDetailSearchQuery}
        totalData={0}
      />

      {/* Table Detail Dashboard Modal */}
      {selectedTableDetail && (
        <TableDetailModal
          tableNumber={selectedTableDetail}
          tableColor={TABLE_COLORS[selectedTableDetail - 1]}
          tableWo={checkOutStations.find(s => s.tableNumber === selectedTableDetail)?.wo || ''}
          onClose={() => {
            setSelectedTableDetail(null);
          }}
          optimisticCounts={optimisticCounts}
          setOptimisticCounts={setOptimisticCounts}
          setStableCounts={setStableCounts}
          // Pass trusted total count dari parent untuk mencegah fallback ke jumlah item
          currentTotal={checkOutStations.find(s => s.tableNumber === selectedTableDetail)?.count || 0}
          refetchHourlyData={refetchHourlyData}
          refetchTableCount={refetchTableCount}
          refetchData={(tableNum?: number) => {
            // Hanya refetch data, tidak increment optimistic count
            // Optimistic count sudah di-handle di onSuccess callback

            // JANGAN invalidate 'folding-checkout-count-per-table' karena akan mereset semua table
            // Hanya invalidate query untuk table yang di-scan saja
            queryClient.invalidateQueries({
              queryKey: ['hourly-folding-checkout-data'],
              refetchType: 'active'
            });
            queryClient.invalidateQueries({
              queryKey: ['finishing-data-folding'],
              refetchType: 'active'
            });
            if (tableNum) {
              queryClient.invalidateQueries({
                queryKey: ['table-detail-data', tableNum],
                refetchType: 'active'
              });
              queryClient.invalidateQueries({
                queryKey: ['folding-checkout-count-table', tableNum],
                refetchType: 'active' // Hanya invalidate untuk table yang di-scan
              });
              queryClient.invalidateQueries({
                queryKey: ['table-wo-data'],
                refetchType: 'active'
              });
              queryClient.invalidateQueries({
                queryKey: ['table-wo-modal', tableNum],
                refetchType: 'active'
              });
            }

            // Refetch 'folding-checkout-count-per-table' tanpa invalidate untuk menjaga data table lain
            // Gunakan setTimeout untuk memastikan server sudah menyimpan data sebelum refetch
            setTimeout(async () => {
              await Promise.all([
                refetchFinishingData(),
                refetchHourlyData(),
                refetchTableCount() // Refetch tanpa invalidate untuk menjaga data table lain
              ]);
            }, 1000); // Tunggu 1 detik untuk memastikan server sudah menyimpan data
          }}
        />
      )}

      {/* Filter WO Modal */}
      {showWoFilterModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Filter WO</h3>
              <button onClick={() => setShowWoFilterModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Work Order (WO)</label>
                <input
                  type="text"
                  value={filterWo}
                  onChange={(e) => setFilterWo(e.target.value)}
                  placeholder="Masukkan WO..."
                  className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setFilterWo(''); setShowWoFilterModal(false); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition bg-transparent text-slate-500 hover:bg-slate-100"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowWoFilterModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Date Modal */}
      {showDateFilterModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Filter Date Range</h3>
              <button onClick={() => setShowDateFilterModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Dari Tanggal</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Sampai Tanggal</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setShowDateFilterModal(false); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition bg-transparent text-slate-500 hover:bg-slate-100"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowDateFilterModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ============================================================================
 * REUSABLE UI COMPONENTS
 * ============================================================================
 */

// Components moved to src/components/finishing/

const CustomTooltip = ({ active, payload, label, type }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md p-2 rounded-lg shadow-xl border border-slate-100 text-[10px] z-50 min-w-[120px]">
        {type === 'line' && <div className="font-bold mb-1 pb-1 border-b border-slate-100 text-slate-700">{label}</div>}
        {payload.map((e: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full ring-1 ring-white" style={{ background: e.color || e.fill }} /><span className="text-slate-500 font-medium">{e.name}:</span></div>
            <span className="font-bold text-slate-800">{e.value}</span>
          </div>
        ))}
      </div>
    );
  } return null;
};

/**
 * ============================================================================
 * TABLE DETAIL MODAL COMPONENT
 * ============================================================================
 */
interface TableDetailModalProps {
  tableNumber: number;
  tableColor: string;
  tableWo: string;
  onClose: () => void;
  refetchData: (tableNumber?: number) => void;
  refetchHourlyData?: () => void;
  refetchTableCount?: () => void;
  optimisticCounts: Record<number, number>;
  setOptimisticCounts: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  setStableCounts: React.Dispatch<React.SetStateAction<Record<number, number>>>; // Add setStableCounts
  currentTotal: number;
}

const TableDetailModal = ({ tableNumber, tableColor, tableWo, onClose, refetchData, refetchHourlyData, refetchTableCount, optimisticCounts, setOptimisticCounts, setStableCounts, currentTotal }: TableDetailModalProps) => {
  const queryClient = useQueryClient();

  // Helper function untuk cek apakah sudah melewati jam 8 pagi hari ini
  const isAfter8AM = () => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 8;
  };

  // Helper function untuk mendapatkan tanggal yang valid (hari ini jika sudah jam 8, kemarin jika belum)
  const getValidDate = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    // Jika belum jam 8, gunakan tanggal kemarin (karena data reset mulai jam 8)
    if (!isAfter8AM()) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }
    return today;
  };

  // Gunakan shared optimistic counts dari parent, sehingga data tetap permanen saat modal ditutup
  const optimisticCount = optimisticCounts[tableNumber] || 0;
  const [lastKnownCount, setLastKnownCount] = useState(0); // Simpan count terakhir untuk perbandingan

  // Convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Fetch active user untuk table ini
  // IMPORTANT: Pastikan query di-refetch saat modal dibuka untuk mendapatkan NIK yang valid
  const { data: activeUserData, refetch: refetchActiveUser } = useQuery({
    queryKey: ['active-user-folding-modal', tableNumber],
    queryFn: async () => {
      const response = await getActiveUsers(tableNumber);
      if (!response.success || !response.data) {
        return null;
      }
      return Array.isArray(response.data) ? response.data[0] : response.data;
    },
    refetchInterval: 10000,
    retry: 2,
    // Pastikan data selalu fresh saat modal dibuka
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Refetch active user saat modal table detail dibuka untuk memastikan NIK ter-update
  useEffect(() => {
    if (tableNumber) {
      // Refetch active user saat modal dibuka untuk mendapatkan NIK yang valid
      refetchActiveUser();
    }
  }, [tableNumber, refetchActiveUser]);

  // Fetch data total count untuk table ini
  const { data: tableCountData, refetch: refetchTableCountData } = useQuery({
    queryKey: ['folding-checkout-count-table', tableNumber],
    queryFn: async () => {
      try {
        const validDate = getValidDate();
        const response = await fetch(`${API_BASE_URL}/api/folding/count?date=${validDate}`, {
          headers: getDefaultHeaders()
        });

        if (!response.ok) {
          throw new Error('Failed to fetch table count data');
        }

        const data = await response.json();
        if (data.success && data.data) {
          const tableKey = `table${tableNumber}` as 'table1' | 'table2' | 'table3' | 'table4' | 'table5' | 'table6' | 'table7' | 'table8';
          return data.data[tableKey] || 0;
        }

        return 0;
      } catch (error) {
        console.error('Error fetching table count data:', error);
        // Jangan return 0 saat error, throw error agar placeholderData bisa menjaga data lama
        throw error;
      }
    },
    staleTime: 0, // Data selalu dianggap stale, sehingga selalu fetch data terbaru saat mount
    refetchInterval: 60000, // Refresh setiap 60 detik (background refresh)
    refetchOnWindowFocus: true, // Refetch saat window focus
    refetchOnMount: true, // Selalu fetch saat component mount
    refetchOnReconnect: true, // Refetch saat reconnect
    retry: 2,
    // Gunakan placeholderData untuk menjaga data lama saat refetch (mencegah data menjadi 0)
    // Tapi jangan gunakan saat mount pertama kali, biarkan fetch data baru
    placeholderData: (previousData: any) => {
      // Hanya gunakan data sebelumnya jika sedang refetch (bukan mount pertama)
      // Jika previousData ada dan bukan 0, gunakan itu
      if (previousData !== undefined && previousData !== null && previousData !== 0) {
        return previousData;
      }
      // Return undefined untuk mount pertama kali, biarkan fetch data baru
      return undefined;
    },
  });

  // Fetch WO terakhir untuk table ini (di modal) - HANYA jika ada active user
  const hasActiveUser = activeUserData !== null && activeUserData !== undefined;
  const { data: tableWoModal } = useQuery<string>({
    queryKey: ['table-wo-modal', tableNumber],
    queryFn: async () => {
      try {
        const validDate = getValidDate();
        const response = await fetch(`${API_BASE_URL}/api/folding/detail?date=${validDate}&table=${tableNumber}`, {
          headers: getDefaultHeaders()
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
            // Ambil WO dari item terbaru (index 0 karena sudah di-sort)
            return data.data[0].wo || '-';
          }
        }

        return '-';
      } catch (error) {
        console.error('Error fetching table WO:', error);
        return '-';
      }
    },
    enabled: !!tableNumber && hasActiveUser, // Hanya fetch jika ada active user
    staleTime: 0, // Data selalu dianggap stale, sehingga selalu fetch data terbaru saat mount
    refetchInterval: 60000, // Refresh setiap 60 detik (background refresh)
    refetchOnWindowFocus: true, // Refetch saat window focus
    refetchOnMount: true, // Selalu fetch saat component mount
    refetchOnReconnect: true, // Refetch saat reconnect
    retry: 2,
  });

  // Get operator dari active user - HANYA gunakan data real, jangan fallback ke dummy untuk NIK
  // Dummy operators hanya untuk display name jika tidak ada active user
  const dummyOperators = [
    { nik: '12345678', name: 'Ahmad Rizki' },
    { nik: '23456789', name: 'Budi Santoso' },
    { nik: '34567890', name: 'Cahya Pratama' },
    { nik: '45678901', name: 'Dedi Kurniawan' },
    { nik: '56789012', name: 'Eko Wijaya' },
    { nik: '67890123', name: 'Fajar Hidayat' },
    { nik: '78901234', name: 'Gunawan Sari' },
    { nik: '89012345', name: 'Hadi Susanto' },
  ];
  // Untuk display: gunakan activeUserData jika ada, atau dummy untuk name saja
  const operator = activeUserData
    ? { nik: activeUserData.nik, name: activeUserData.name }
    : (dummyOperators[tableNumber - 1] || { nik: '', name: 'Unknown' });

  // Interface untuk table detail data
  interface TableDetailItem {
    id: number;
    rfid: string;
    wo: string;
    item: string;
    buyer: string;
    color: string;
    size: string;
    qty: number;
    status: 'Waiting' | 'Check In' | 'Shipment';
    timestamp: string;
    line: string;
  }

  // Fetch real data untuk table detail dari API - HANYA jika ada active user untuk table ini
  const { data: tableDetailDataResponse, refetch: refetchTableDetailData } = useQuery<TableDetailItem[]>({
    queryKey: ['table-detail-data', tableNumber],
    queryFn: async () => {
      try {
        const validDate = getValidDate();
        const response = await fetch(`${API_BASE_URL}/api/folding/detail?date=${validDate}&table=${tableNumber}`, {
          headers: getDefaultHeaders()
        });

        if (!response.ok) {
          throw new Error('Failed to fetch table detail data');
        }

        const data = await response.json();
        if (data.success && data.data && Array.isArray(data.data)) {
          // Map data dari API ke format TableDetailItem
          return data.data.map((item: any) => ({
            id: item.id || Date.now() + Math.random(),
            rfid: item.rfid || '',
            wo: item.wo || '-',
            item: item.item || '-',
            buyer: item.buyer || '-',
            color: item.color || '-',
            size: item.size || '-',
            qty: 1,
            status: 'Shipment' as const,
            timestamp: item.timestamp || new Date().toISOString(),
            line: item.line || tableNumber.toString(),
          }));
        }

        return [];
      } catch (error) {
        console.error('Error fetching table detail data:', error);
        return [];
      }
    },
    enabled: !!tableNumber && hasActiveUser, // Hanya fetch jika ada active user
    staleTime: 0, // Data selalu dianggap stale, sehingga selalu fetch data terbaru saat mount
    refetchInterval: 60000, // Refresh setiap 60 detik (background refresh)
    refetchOnWindowFocus: true, // Refetch saat window focus
    refetchOnMount: true, // Selalu fetch saat component mount
    refetchOnReconnect: true, // Refetch saat reconnect
  });

  const tableDetailData = useMemo<TableDetailItem[]>(() => {
    // Gunakan data dari API jika tersedia
    if (tableDetailDataResponse && Array.isArray(tableDetailDataResponse) && tableDetailDataResponse.length > 0) {
      return tableDetailDataResponse;
    }
    // Return empty array jika tidak ada data (tidak ada dummy data)
    return [];
  }, [tableDetailDataResponse]);

  // Monitor perubahan data real dari API dan reset optimistik count jika sudah ter-update
  useEffect(() => {
    const currentRealCount = tableCountData ?? 0;

    // Jika data real sudah lebih besar atau sama dengan (lastKnownCount + optimisticCount),
    // berarti data sudah ter-update, reset optimistik count
    if (optimisticCount > 0) {
      const expectedCount = lastKnownCount + optimisticCount;
      // Hanya reset jika data real sudah mencapai atau melebihi expected count
      // Ini mencegah reset terlalu cepat sebelum data benar-benar ter-update
      // Tapi juga reset jika data real lebih besar dari expected (berarti ada update dari sumber lain)
      if (currentRealCount >= expectedCount || currentRealCount > lastKnownCount + optimisticCount) {
        setOptimisticCounts(prev => {
          const newCounts = { ...prev };
          delete newCounts[tableNumber];
          return newCounts;
        });
        setLastKnownCount(currentRealCount);
      } else if (currentRealCount > lastKnownCount && currentRealCount < expectedCount) {
        // Jika data real sudah bertambah tapi belum mencapai expected, update lastKnownCount
        // Ini untuk handle kasus di mana data real bertambah secara bertahap
        setLastKnownCount(currentRealCount);
      }
    } else if (optimisticCount === 0 && currentRealCount !== lastKnownCount) {
      // Update lastKnownCount jika tidak ada optimistik count dan data berubah
      setLastKnownCount(currentRealCount);
    }
  }, [tableCountData, optimisticCount, lastKnownCount, tableNumber, setOptimisticCounts]);

  const stats = useMemo(() => {
    const waiting = tableDetailData.filter(d => d.status === 'Waiting').length;
    const checkIn = tableDetailData.filter(d => d.status === 'Check In').length;
    // Prioritas:
    // 1. tableDetailData.filter (Data detail paling akurat karena list actual)
    // 2. tableCountData (spesifik table ini)
    // 3. currentTotal (dari parent dashboard)

    // Hitung jumlah item real yang ada di list
    const detailShipmentCount = tableDetailData.filter(d => d.status === 'Shipment').length;

    let baseCount = 0;
    if (tableCountData !== undefined && tableCountData !== null && tableCountData > 0) {
      baseCount = tableCountData;
    } else if (currentTotal > 0) {
      // Kurangi optimistic count dari currentTotal karena akan ditambahkan lagi di bawah
      baseCount = Math.max(0, currentTotal - optimisticCount);
    }

    // JANGAN BIARKAN baseCount lebih kecil dari jumlah item yang sebenarnya ada di list
    // Jika list punya 11 item, count tidak boleh 4
    baseCount = Math.max(baseCount, detailShipmentCount);

    // Tambahkan optimistic count untuk update real-time
    // NOTE: Jika optimistic count sudah masuk ke list update (refetch), ini mungkin double counting sementara
    // Tapi lebih baik lebih banyak daripada lebih sedikit
    const checkOut = baseCount + optimisticCount;
    return { waiting, checkIn, checkOut, total: tableDetailData.length };
  }, [tableDetailData, tableCountData, optimisticCount, currentTotal, optimisticCounts]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 sm:px-6 py-4 border-b flex items-center justify-between shrink-0"
          style={{
            background: `linear-gradient(135deg, ${hexToRgba(tableColor, 0.1)} 0%, ${hexToRgba(tableColor, 0.05)} 100%)`,
            borderColor: hexToRgba(tableColor, 0.2),
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: hexToRgba(tableColor, 0.15) }}
            >
              <Layers className="w-5 h-5" style={{ color: tableColor }} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Table {tableNumber} Dashboard</h2>
              <p className="text-sm text-slate-500">Detail data dan monitoring untuk Table {tableNumber}</p>

            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4 sm:p-6 bg-slate-50/50">
          <div className="h-full flex flex-col gap-4">
            {/* Main Row: Left Column (Shipment + Detail Data) + Right Column (Scanning Modal) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
              {/* Left Column: Shipment Table Card + Detail Data Card (Stacked) */}
              <div className="flex flex-col gap-4 min-h-0">
                {/* Shipment Table Card - Setengah Ukuran */}
                <div
                  className="bg-gradient-to-br from-white to-slate-50 rounded-xl p-4 sm:p-5 shadow-lg flex flex-col items-center justify-center shrink-0"
                  style={{
                    borderColor: tableColor,
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    boxShadow: `0 8px 20px -5px ${hexToRgba(tableColor, 0.25)}, 0 0 0 1px ${hexToRgba(tableColor, 0.1)}`,
                    minHeight: '100px',
                  }}>
                  <div className="text-center w-full">


                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg font-semibold text-slate-500">Operator:</span>
                      <span className="text-lg font-bold text-slate-700">{operator.name}</span>
                      <span className="text-lg text-slate-500">({operator.nik})</span>
                    </div>
                    <p className="text-sm sm:text-base font-bold text-slate-600 mb-2">WO: {tableWoModal || tableWo || '-'}</p>
                    <div className="flex flex-col items-center justify-center">
                      <div
                        className="px-6 py-4 rounded-xl font-black mb-3 shadow-md"
                        style={{
                          backgroundColor: hexToRgba(tableColor, 0.15),
                          color: tableColor,
                          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                          lineHeight: '1',
                          border: `3px solid ${hexToRgba(tableColor, 0.3)}`,
                        }}
                      >
                        {stats.checkOut}
                      </div>
                      <p className="text-base sm:text-lg font-bold text-slate-700">
                        Total {stats.checkOut} {stats.checkOut === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Detail Data Card - Setengah Ukuran */}
                <div
                  className="bg-white rounded-xl border-2 shadow-sm flex flex-col flex-1 min-h-0"
                  style={{ borderColor: hexToRgba(tableColor, 0.2) }}
                >
                  {/* Header Detail Data */}
                  <div className="px-3 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 shrink-0">
                    <div>
                      <p className="text-base font-bold text-slate-800">Detail Data</p>
                      <p className="text-sm text-slate-500 mt-0.5">Total {stats.checkOut} items</p>
                    </div>
                    <button
                      onClick={() => refetchData(tableNumber)}
                      className="p-1.5 rounded-lg hover:bg-white transition-colors text-slate-500 hover:text-slate-700 border border-slate-200"
                      title="Refresh"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Table Content */}
                  <div className="flex-1 overflow-auto min-h-0">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                          {['No', 'RFID', 'WO', 'Item', 'Color', 'Size', 'Status', 'Time'].map((h, i) => (
                            <th key={i} className="px-2 py-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap border-b border-slate-200">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tableDetailData.filter(row => row.status === 'Shipment').map((row, index) => (
                          <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-2 py-1.5 text-[10px] font-semibold text-slate-600 text-center">{index + 1}</td>
                            <td className="px-2 py-1.5 text-[10px] font-mono font-bold text-slate-700">{row.rfid}</td>
                            <td className="px-2 py-1.5 text-[10px] font-bold text-slate-700">{row.wo}</td>
                            <td className="px-2 py-1.5 text-[10px] text-slate-600 truncate max-w-[120px]" title={row.item}>{row.item}</td>
                            <td className="px-2 py-1.5 text-[10px] font-semibold text-slate-600">{row.color}</td>
                            <td className="px-2 py-1.5 text-[10px] font-semibold text-slate-600">{row.size}</td>
                            <td className="px-2 py-1.5">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${row.status === 'Waiting' ? 'bg-orange-100 text-orange-700' :
                                  row.status === 'Check In' ? 'bg-blue-100 text-blue-700' :
                                    'bg-teal-100 text-teal-700'
                                  }`}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-[9px] text-slate-500 font-mono">
                              {new Date(row.timestamp).toLocaleString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column: Scanning Modal */}
              <div className="bg-white rounded-xl border-2 shadow-sm overflow-hidden min-h-0" style={{ borderColor: hexToRgba(tableColor, 0.3) }}>
                <ScanningFinishingModal
                  isOpen={true}
                  onClose={() => { }}
                  type="folding"
                  defaultAction="checkout"
                  autoSubmit={true}
                  tableNumber={tableNumber}
                  nik={activeUserData?.nik || undefined}
                  compact={true}
                  onSuccess={() => {
                    // Refetch data segera setelah scan berhasil
                    refetchData(tableNumber);
                    if (refetchHourlyData) refetchHourlyData();
                    if (refetchTableCount) refetchTableCount();

                    // Update stableCounts directly for immediate feedback and to handle backend lag
                    // This acts as a persistent optimistic update that survives re-renders until API catches up
                    setStableCounts(prev => ({
                      ...prev,
                      [tableNumber]: (prev[tableNumber] || 0) + 1
                    }));

                    // Invalidate queries untuk force refetch detail data dan WO
                    queryClient.invalidateQueries({
                      queryKey: ['table-detail-data', tableNumber],
                      refetchType: 'active'
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['folding-checkout-count-table', tableNumber],
                      refetchType: 'active' // Force refetch count data untuk table ini
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['table-wo-data'],
                      refetchType: 'active'
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['table-wo-modal', tableNumber],
                      refetchType: 'active'
                    });

                    // Tunggu sebentar untuk memastikan server sudah menyimpan data sebelum refetch
                    setTimeout(async () => {
                      // Langsung refetch detail data dan count data untuk update real-time
                      await Promise.all([
                        refetchTableDetailData(),
                        refetchTableCountData()
                      ]);

                      // Setelah refetch selesai, reset optimistic count akan di-handle oleh useEffect
                      // yang memantau perubahan tableCountData
                    }, 1000); // Tunggu 1 detik untuk memastikan server sudah menyimpan data

                    // Refetch data setelah scanning berhasil dengan tableNumber (real-time update)
                    refetchData(tableNumber);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
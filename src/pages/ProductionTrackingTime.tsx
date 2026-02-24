import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';
import { trackingTimeService } from '../services/trackingTimeService';
import {
  Calendar, Search, AlertCircle, RefreshCcw, Truck, Shirt, Timer,
  Wrench, Ban, Download, X, Zap, Clock
} from 'lucide-react';

const AUTO_REFRESH_INTERVAL_MS = 60000; // 1 menit

export default function ProductionTrackingTime() {
  const { isOpen } = useSidebar();
  const [dateFrom, setDateFrom] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchApplied, setSearchApplied] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const autoRefreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState('Semua Data');
  const [selectedLine, setSelectedLine] = useState('All Line');
  const [onlyRework, setOnlyRework] = useState(false);
  const [onlyReject, setOnlyReject] = useState(false);

  const applySearch = useCallback(() => {
    setSearchApplied(searchInput.trim());
  }, [searchInput]);
  
  // Format date untuk API (YYYY-M-D) - tanpa leading zero
  const formatDateForAPI = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00'); // Tambahkan time untuk menghindari timezone issues
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // Tidak perlu padStart, langsung tanpa leading zero
    const day = date.getDate(); // Tidak perlu padStart, langsung tanpa leading zero
    return `${year}-${month}-${day}`;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setData([]);
    setError(null);
    try {
      const formattedFrom = formatDateForAPI(dateFrom);
      const formattedTo = formatDateForAPI(dateTo);
      
      console.log('🔵 [Production Tracking] Fetching cycle time data...', { 
        dateFrom, 
        dateTo, 
        formattedFrom, 
        formattedTo 
      });
      
      // Single query API untuk semua data cycle time
      const cycleTimeResponse = await trackingTimeService.getCycleTime(formattedFrom, formattedTo);
      console.log('🔵 [Production Tracking] Cycle Time API Response (full):', cycleTimeResponse);
      console.log('🔵 [Production Tracking] Cycle Time API Response (summary):', {
        status: cycleTimeResponse?.status,
        count: cycleTimeResponse?.count,
        hasData: !!cycleTimeResponse?.data,
        dataIsArray: Array.isArray(cycleTimeResponse?.data),
        dataLength: Array.isArray(cycleTimeResponse?.data) ? cycleTimeResponse.data.length : 'N/A',
        responseType: typeof cycleTimeResponse,
        responseIsArray: Array.isArray(cycleTimeResponse),
      });
      
      // Handle response structure: { status: "success", count: 390, data: [...] }
      let cycleTimeItems: any[] = [];
      
      if (cycleTimeResponse?.data && Array.isArray(cycleTimeResponse.data)) {
        // Struktur: { status: "success", count: 390, data: [...] }
        cycleTimeItems = cycleTimeResponse.data;
        console.log('✅ [Production Tracking] Cycle time data loaded from response.data:', cycleTimeItems.length, 'items');
      } else if (Array.isArray(cycleTimeResponse)) {
        // Response langsung adalah array
        cycleTimeItems = cycleTimeResponse;
        console.log('✅ [Production Tracking] Response is array directly, items:', cycleTimeItems.length);
      } else if (cycleTimeResponse && typeof cycleTimeResponse === 'object') {
        // Coba cari data di berbagai kemungkinan property
        if (cycleTimeResponse.data) {
          if (Array.isArray(cycleTimeResponse.data)) {
            cycleTimeItems = cycleTimeResponse.data;
            console.log('✅ [Production Tracking] Found data array in response.data');
          } else if (typeof cycleTimeResponse.data === 'object') {
            // Mungkin single object, convert ke array
            cycleTimeItems = [cycleTimeResponse.data];
            console.log('✅ [Production Tracking] Found single data object, converted to array');
          }
        } else if (cycleTimeResponse.results && Array.isArray(cycleTimeResponse.results)) {
          cycleTimeItems = cycleTimeResponse.results;
          console.log('✅ [Production Tracking] Found data in response.results');
        } else {
          // Coba gunakan response langsung jika punya property ID
          if (cycleTimeResponse.ID || cycleTimeResponse.id) {
            cycleTimeItems = [cycleTimeResponse];
            console.log('✅ [Production Tracking] Response is single object with ID, converted to array');
          }
        }
      }

      console.log('🔵 [Production Tracking] Final cycleTimeItems count:', cycleTimeItems.length);

      if (cycleTimeItems.length > 0) {
        console.log('🔵 [Production Tracking] First item sample:', JSON.stringify(cycleTimeItems[0], null, 2));
      } else {
        console.warn('⚠️ [Production Tracking] No items found in response. Full response:', JSON.stringify(cycleTimeResponse, null, 2));
      }

      if (!cycleTimeItems.length) {
        const errorMsg = `No data found for date range: ${formattedFrom} to ${formattedTo}`;
        console.warn('⚠️ [Production Tracking]', errorMsg);
        setError(errorMsg);
        setData([]);
        setLoading(false);
        return;
      }

      // Helper untuk format durasi dari detik
      const formatDurationFromSeconds = (seconds: number | null | undefined): string => {
        if (seconds === null || seconds === undefined) return '-';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        if (hours > 0) {
          return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
          return `${minutes}m ${secs}s`;
        } else {
          return `${secs}s`;
        }
      };

      // Map data dari format API cycletime ke format yang digunakan di dashboard
      const mappedData = cycleTimeItems.map((item: any) => {
        // Parse BUYER_WO untuk extract buyer dan WO
        const buyerWo = item.BUYER_WO || '';
        const buyerWoParts = buyerWo.split(' / ');
        const buyer = buyerWoParts[0] || '';
        const wo = buyerWoParts[1] || '';

        // Map QC Rework
        const qcReworkValues = [
          item['QC REWORK 1'],
          item['QC REWORK 2'],
          item['QC REWORK 3']
        ].filter(v => v !== null && v !== undefined);

        // Map PQC Rework
        const pqcReworkValues = [
          item['PQC REWORK 1'],
          item['PQC REWORK 2'],
          item['PQC REWORK 3']
        ].filter(v => v !== null && v !== undefined);

        return {
          id: item.ID,
          id_garment: item.ID,
          style: item.STYLE,
          line: item.LINE,
          buyer: buyer,
          wo: wo,
          item: item.STYLE, // Use STYLE as item name
          start_time: item.START_TIME,
          
          // Durasi dalam detik (untuk perhitungan)
          duration_output_qc: item.DURATION_OUTPUT_QC,
          duration_qc_pqc: item.DURATION_QC_PQC,
          dryroom_in: item.DRY_ROOM_IN,
          dryroom_out: item.DRY_ROOM_OUT,
          folding_in: item.FOLDING_IN,
          folding_out: item.FOLDING_OUT,
          // TOTAL_CYCLE_TIME dari API dalam DETIK (1 = 1 detik)
          total_cycle_time: item.TOTAL_CYCLE_TIME,

          // Durasi dalam format readable (untuk display)
          duration_output_qc_formatted: formatDurationFromSeconds(item.DURATION_OUTPUT_QC),
          duration_qc_pqc_formatted: formatDurationFromSeconds(item.DURATION_QC_PQC),
          dryroom_in_formatted: formatDurationFromSeconds(item.DRY_ROOM_IN),
          dryroom_out_formatted: formatDurationFromSeconds(item.DRY_ROOM_OUT),
          folding_in_formatted: formatDurationFromSeconds(item.FOLDING_IN),
          folding_out_formatted: formatDurationFromSeconds(item.FOLDING_OUT),
          total_cycle_time_formatted: formatDurationFromSeconds(item.TOTAL_CYCLE_TIME),
          
          // QC Rework
          qc_rework_1: item['QC REWORK 1'],
          qc_rework_2: item['QC REWORK 2'],
          qc_rework_3: item['QC REWORK 3'],
          qc_rework_count: item['QC REWORK COUNT'],
          qc_reject: item['QC_REJECT'],
          
          // PQC Rework
          pqc_rework_1: item['PQC REWORK 1'],
          pqc_rework_2: item['PQC REWORK 2'],
          pqc_rework_3: item['PQC REWORK 3'],
          pqc_rework_count: item['PQC REWORK COUNT'],
          pqc_reject: item['PQC_REJECT'],
          
          // Status
          lastStatus: item.LAST_STATUS || 'For Checking',
          last_event_time: item.LAST_EVENT_TIME,
          
          // Helper untuk kompatibilitas dengan kode lama (untuk tabel)
          rework: item['QC REWORK COUNT'] > 0 ? {
            summary: {
              total_kejadian_rework: item['QC REWORK COUNT'],
              total_detik: (item['QC REWORK 1'] || 0) + (item['QC REWORK 2'] || 0) + (item['QC REWORK 3'] || 0),
              total_durasi: formatDurationFromSeconds((item['QC REWORK 1'] || 0) + (item['QC REWORK 2'] || 0) + (item['QC REWORK 3'] || 0))
            },
            detail_rework: qcReworkValues.map((v) => ({ 
              durasi: formatDurationFromSeconds(v),
              duration: v 
            }))
          } : null,
          
          pqcRework: item['PQC REWORK COUNT'] > 0 ? {
            summary: {
              total_kejadian_rework: item['PQC REWORK COUNT'],
              total_detik: (item['PQC REWORK 1'] || 0) + (item['PQC REWORK 2'] || 0) + (item['PQC REWORK 3'] || 0),
              total_durasi: formatDurationFromSeconds((item['PQC REWORK 1'] || 0) + (item['PQC REWORK 2'] || 0) + (item['PQC REWORK 3'] || 0))
            },
            detail_rework: pqcReworkValues.map((v) => ({ 
              durasi: formatDurationFromSeconds(v),
              duration: v 
            }))
          } : null,

          // Helper untuk QC -> PQC
          qcPqc: item.DURATION_QC_PQC ? {
            detail: {
              total_durasi: formatDurationFromSeconds(item.DURATION_QC_PQC),
              total_detik: item.DURATION_QC_PQC
            }
          } : null,

          // Helper untuk PQC -> Dryroom
          pqcIndryroom: item.DRY_ROOM_IN ? {
            detail: {
              total_durasi: formatDurationFromSeconds(item.DRY_ROOM_IN),
              total_detik: item.DRY_ROOM_IN
            }
          } : null,

          // Helper untuk Dryroom In -> Out
          indryroomOutdryroom: item.DRY_ROOM_OUT ? {
            detail: {
              total_durasi: formatDurationFromSeconds(item.DRY_ROOM_OUT),
              total_detik: item.DRY_ROOM_OUT
            }
          } : null,

          // Helper untuk Dryroom Out -> Folding In
          outdryroomInfolding: item.FOLDING_IN ? {
            detail: {
              total_durasi: formatDurationFromSeconds(item.FOLDING_IN),
              total_detik: item.FOLDING_IN
            }
          } : null,

          // Helper untuk Folding In -> Out
          infoldingOutfolding: item.FOLDING_OUT ? {
            detail: {
              total_durasi: formatDurationFromSeconds(item.FOLDING_OUT),
              total_detik: item.FOLDING_OUT
            }
          } : null,
        };
      });

      console.log('✅ [Production Tracking] Mapped data:', mappedData.length, 'items');
      setData(mappedData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("❌ [Production Tracking] Failed to fetch cycle time data", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        console.error("Error name:", error.name);
      }
      console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      // Set error message untuk ditampilkan di UI
      const errorMessage = error instanceof Error 
        ? `Error loading data: ${error.message}` 
        : 'Unknown error occurred. Please check browser console for details.';
      setError(errorMessage);
      
      // Tetap set data kosong untuk menghindari error di UI
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  // Fetch data on mount dan saat date range berubah
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh: polling setiap N detik saat aktif
  useEffect(() => {
    if (!autoRefresh) {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
        autoRefreshTimerRef.current = null;
      }
      return;
    }
    autoRefreshTimerRef.current = setInterval(() => {
      fetchData();
    }, AUTO_REFRESH_INTERVAL_MS);
    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
        autoRefreshTimerRef.current = null;
      }
    };
  }, [autoRefresh, fetchData]);

  const formatDuration = (raw: string | undefined) => {
    if (!raw) return '-';
    return raw.replace(/(\d+)\s*jam/i, '$1h')
      .replace(/(\d+)\s*menit/i, '$1m')
      .replace(/(\d+)\s*detik/i, '$1s')
      .replace(/^0h\s*/, '')
      .trim();
  };

  // Helper untuk format durasi dari detik
  // Pakai function declaration supaya aman dipanggil sebelum deklarasi (hindari TDZ)
  function formatDurationFromSeconds(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  // Filter: dulu search + line + onlyRework + onlyReject (tanpa tab) — dipakai untuk hitungan tab & data dasar
  const dataAfterSearchAndFilters = useMemo(() => {
    let res = data;
    if (searchApplied) {
      const lower = searchApplied.toLowerCase();
      res = res.filter(item =>
        String(item.id_garment ?? '').toLowerCase().includes(lower) ||
        String(item.style ?? '').toLowerCase().includes(lower) ||
        String(item.wo ?? '').toLowerCase().includes(lower)
      );
    }
    if (selectedLine !== 'All Line') {
      res = res.filter(item => item.line === selectedLine);
    }
    if (onlyRework) {
      res = res.filter(item => item.lastStatus?.toUpperCase().includes('REWORK'));
    }
    if (onlyReject) {
      res = res.filter(item => item.lastStatus?.toUpperCase().includes('REJECT') || item.lastStatus?.toUpperCase().includes('MATI'));
    }
    return res;
  }, [data, searchApplied, selectedLine, onlyRework, onlyReject]);

  // Hitungan per tab dari data yang sudah difilter search/line/rework/reject (bukan dari data all)
  const tabCounts = useMemo(() => {
    const d = dataAfterSearchAndFilters;
    return {
      'Semua Data': d.length,
      'Line / Sewing': d.filter(i => !i.lastStatus || i.lastStatus === 'SEWING').length,
      'QC Check': d.filter(i => i.lastStatus?.includes('QC')).length,
      'PQC Check': d.filter(i => i.lastStatus?.includes('PQC')).length,
      'Dryroom': d.filter(i => i.lastStatus?.includes('DRY')).length,
      'Folding': d.filter(i => i.lastStatus?.includes('FOLDING')).length,
      'Siap Shipment': d.filter(i => i.lastStatus?.includes('SHIP') || i.lastStatus === 'DONE').length,
      'Reject / Mati': d.filter(i => i.lastStatus?.includes('REJECT')).length,
    };
  }, [dataAfterSearchAndFilters]);

  // Data tampilan: dataAfterSearchAndFilters + filter tab
  const filteredData = useMemo(() => {
    if (activeTab === 'Semua Data') return dataAfterSearchAndFilters;
    const d = dataAfterSearchAndFilters;
    if (activeTab === 'Line / Sewing') return d.filter(item => !item.lastStatus || item.lastStatus === 'SEWING');
    if (activeTab === 'QC Check') return d.filter(item => item.lastStatus?.includes('QC'));
    if (activeTab === 'PQC Check') return d.filter(item => item.lastStatus?.includes('PQC'));
    if (activeTab === 'Dryroom') return d.filter(item => item.lastStatus?.includes('DRY'));
    if (activeTab === 'Folding') return d.filter(item => item.lastStatus?.includes('FOLDING'));
    if (activeTab === 'Siap Shipment') return d.filter(item => item.lastStatus?.includes('SHIP') || item.lastStatus === 'DONE');
    if (activeTab === 'Reject / Mati') return d.filter(item => item.lastStatus?.includes('REJECT'));
    return d;
  }, [dataAfterSearchAndFilters, activeTab]);

  // Stats Calculation dari data yang sudah difilter (search, line, tab, rework, reject) — realtime sesuai pencarian
  const stats = useMemo(() => {
    const totalOutput = filteredData.length;
    
    const totalRework = filteredData.filter(item => {
      const hasQcRework = (item.qc_rework_count && item.qc_rework_count > 0) || 
                         (item.rework && item.rework.summary?.total_kejadian_rework > 0);
      const hasPqcRework = (item.pqc_rework_count && item.pqc_rework_count > 0) || 
                          (item.pqcRework && item.pqcRework.summary?.total_kejadian_rework > 0);
      return hasQcRework || hasPqcRework;
    }).length;
    
    const totalReject = filteredData.filter(item => {
      const status = item.lastStatus?.toUpperCase() || '';
      return status.includes('REJECT') || status.includes('MATI') || 
             item.qc_reject || item.pqc_reject;
    }).length;
    
    const reworkRate = totalOutput > 0 ? ((totalRework / totalOutput) * 100).toFixed(1) : '0';
    const rejectRate = totalOutput > 0 ? ((totalReject / totalOutput) * 100).toFixed(1) : '0';
    
    let totalSeconds = 0;
    let countWithDuration = 0;
    filteredData.forEach(item => {
      if (item.total_cycle_time && item.total_cycle_time > 0) {
        totalSeconds += item.total_cycle_time;
        countWithDuration++;
      }
    });
    
    const avgCycleTime = countWithDuration > 0 
      ? formatDurationFromSeconds(totalSeconds / countWithDuration)
      : '-';
    
    const readyToShip = filteredData.filter(i => {
      const status = i.lastStatus?.toUpperCase() || '';
      return status.includes('OUT_FOLDING') || status.includes('SHIP') || 
             status === 'DONE' || i.folding_out !== null;
    }).length;
    
    return {
      totalOutput,
      avgCycleTime,
      reworkRate: `${reworkRate}%`,
      rejectRate: `${rejectRate}%`,
      readyToShip
    };
  }, [filteredData]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-poppins selection:bg-indigo-100 selection:text-indigo-900">
      <Sidebar />
      <div
        className="flex-1 flex flex-col transition-all duration-300 relative"
        style={{ marginLeft: isOpen ? '18%' : '5rem', width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)' }}
      >
        <Header />

        <main className="flex-1 overflow-y-auto pt-16 md:pt-20 px-4 md:px-6 pb-6">
          {/* Page Header */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
                Productivity Dashboard
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Monitoring Flow: Line {'->'} QC (Rework/Reject) {'->'} PQC {'->'} Dry Room {'->'} Folding
              </p>
              {lastUpdated && (
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Terakhir diperbarui: {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              )}
            </div>

            {/* Date Filter, Presets, Refresh & Auto-refresh */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-1">
                {(['Hari Ini', 'Kemarin', '7 Hari Terakhir'] as const).map((preset) => {
                  const today = new Date();
                  const toStr = (d: Date) => d.toISOString().split('T')[0];
                  let from = toStr(today);
                  let to = toStr(today);
                  if (preset === 'Hari Ini') {
                    from = to = toStr(today);
                  } else if (preset === 'Kemarin') {
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    from = to = toStr(yesterday);
                  } else {
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 6);
                    from = toStr(weekAgo);
                    to = toStr(today);
                  }
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => { setDateFrom(from); setDateTo(to); }}
                      className="px-2.5 py-1.5 rounded text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => fetchData()}
                disabled={loading}
                className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title="Refresh data"
              >
                {loading ? (
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCcw className="w-4 h-4" />
                )}
              </button>
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors" title="Auto-refresh tiap 1 menit">
                <Zap className={`w-4 h-4 ${autoRefresh ? 'text-amber-500' : 'text-gray-400'}`} />
                <span className="text-xs font-medium text-slate-600">Auto-refresh</span>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                />
              </label>
            </div>
          </div>

          {/* Indikator filtered: angka di kartu mengikuti hasil pencarian/filter */}
          {filteredData.length !== data.length && data.length > 0 && (
            <div className="mb-4 px-4 py-2 rounded-lg bg-indigo-50 border border-indigo-100 text-sm text-indigo-800 flex items-center gap-2">
              <Search className="w-4 h-4 flex-shrink-0" />
              <span>
                Menampilkan <strong>{filteredData.length}</strong> dari <strong>{data.length}</strong> data — KPI di atas mengikuti hasil filter/pencarian.
              </span>
            </div>
          )}

          {/* Stats Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <KPICard
              title="TOTAL OUTPUT"
              value={stats.totalOutput}
              sub="Pcs Garment"
              icon={Shirt}
              color="blue"
            />
            <KPICard
              title="AVG. CYCLE TIME"
              value={stats.avgCycleTime}
              sub="Rata-rata per garment"
              icon={Timer}
              color="purple"
            />
            <KPICard
              title="REWORK RATE"
              value={stats.reworkRate}
              sub="Total Kejadian"
              icon={Wrench}
              color="yellow"
            />
            <KPICard
              title="REJECT RATE"
              value={stats.rejectRate}
              sub="Total Barang Reject"
              icon={Ban}
              color="red"
            />
            <KPICard
              title="READY TO SHIP"
              value={stats.readyToShip}
              sub="Siap Shipment (Out Folding)"
              icon={Truck}
              color="green"
            />
          </div>

          {/* Filter Section */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
              {/* Search — filter hanya jalan saat klik Cari atau tekan Enter (lebih ringan) */}
              <div className="lg:col-span-5">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Cari ID / STYLE / WO</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Ketik lalu Enter atau klik Cari"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          applySearch();
                        }
                      }}
                    />
                    {searchInput && (
                      <button
                        type="button"
                        onClick={() => { setSearchInput(''); setSearchApplied(''); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        title="Hapus pencarian"
                        aria-label="Hapus pencarian"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={applySearch}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    <Search className="w-4 h-4" />
                    Cari
                  </button>
                </div>
              </div>

              {/* Line Select */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Line</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={selectedLine}
                  onChange={(e) => setSelectedLine(e.target.value)}
                >
                  <option>All Line</option>
                  {[...new Set(data.map(d => d.line).filter(Boolean))].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              {/* Checkboxes & Reset */}
              <div className="lg:col-span-4 flex items-center justify-between lg:justify-end gap-4 pb-2">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={onlyRework}
                      onChange={(e) => setOnlyRework(e.target.checked)}
                    />
                    <span className="text-sm text-gray-700">Only Rework</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      checked={onlyReject}
                      onChange={(e) => setOnlyReject(e.target.checked)}
                    />
                    <span className="text-sm text-gray-700">Only Reject</span>
                  </label>
                </div>
                <button
                  onClick={() => {
                    setSearchInput('');
                    setSearchApplied('');
                    setSelectedLine('All Line');
                    setOnlyRework(false);
                    setOnlyReject(false);
                    setActiveTab('Semua Data');
                  }}
                  className="text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
                >
                  Reset All
                </button>
              </div>
            </div>
          </div>

          {/* Position Filters (Tabs) */}
          <div className="mb-6 overflow-x-auto pb-2">
            <div className="flex items-center gap-2 min-w-max">
              <span className="text-xs font-bold text-gray-500 uppercase mr-2">Filter Berdasarkan Posisi:</span>
              {([
                'Semua Data',
                'Line / Sewing',
                'QC Check',
                'PQC Check',
                'Dryroom',
                'Folding',
                'Siap Shipment',
                'Reject / Mati',
              ] as const).map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setActiveTab(label)}
                  className={`
                    flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium border transition-all
                    ${activeTab === label
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }
                  `}
                >
                  {label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === label ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                    {tabCounts[label] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Complex Data Table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
              <table className="w-full text-xs text-center border-collapse">
                <thead className="bg-[#f8f9fa] text-gray-700 font-bold uppercase sticky top-0 z-10 shadow-sm">
                  {/* First Header Row */}
                  <tr>
                    <th rowSpan={2} className="px-3 py-3 border-r border-b border-gray-200 bg-gray-50 min-w-[120px]">ID & Style</th>
                    <th rowSpan={2} className="px-3 py-3 border-r border-b border-gray-200 bg-gray-50">Line</th>
                    <th rowSpan={2} className="px-3 py-3 border-r border-b border-gray-200 bg-gray-50 min-w-[150px]">Buyer / WO</th>
                    <th rowSpan={2} className="px-3 py-3 border-r border-b border-gray-200 bg-gray-50">Flow</th>
                    <th rowSpan={2} className="px-3 py-3 border-r border-b border-gray-200 bg-gray-50 min-w-[100px]">Start Time</th>

                    {/* QC Section */}
                    <th rowSpan={2} className="px-3 py-3 border-r border-b border-blue-100 bg-blue-50 text-blue-700 min-w-[100px]">Output {'->'} QC<br />Checking</th>
                    <th colSpan={3} className="px-3 py-1 border-r border-b border-yellow-100 bg-yellow-50 text-yellow-700">QC Rework</th>
                    <th rowSpan={2} className="px-3 py-3 border-r border-b border-red-100 bg-red-50 text-red-700">QC Reject</th>
                    <th rowSpan={2} className="px-3 py-3 border-r border-b border-green-100 bg-green-50 text-green-700 min-w-[100px]">QC {'->'} PQC<br />Checking</th>

                    {/* PQC Section */}
                    <th colSpan={3} className="px-3 py-1 border-r border-b border-purple-100 bg-purple-50 text-purple-700">PQC Rework</th>
                    <th rowSpan={2} className="px-3 py-3 border-r border-b border-red-100 bg-red-50 text-red-700">PQC Reject</th>

                    {/* Dryroom Section */}
                    <th rowSpan={2} className="px-3 py-3 border-r border-b border-orange-100 bg-orange-50 text-orange-700">Dryroom<br />IN</th>
                    <th rowSpan={2} className="px-3 py-3 border-r border-b border-orange-100 bg-orange-50 text-orange-700">Dryroom<br />OUT</th>

                    {/* Folding Section */}
                    <th rowSpan={2} className="px-3 py-3 border-r border-b border-cyan-100 bg-cyan-50 text-cyan-700">Folding<br />IN</th>
                    <th rowSpan={2} className="px-3 py-3 border-r border-b border-cyan-100 bg-cyan-50 text-cyan-700">Folding<br />OUT</th>

                    <th rowSpan={2} className="px-3 py-3 border-b border-gray-200 bg-gray-50">Total</th>
                  </tr>

                  {/* Second Header Row (Sub-columns) */}
                  <tr>
                    {/* QC Rework Subcols */}
                    <th className="px-2 py-2 border-r border-b border-yellow-100 bg-yellow-50 text-yellow-600 w-10">#1</th>
                    <th className="px-2 py-2 border-r border-b border-yellow-100 bg-yellow-50 text-yellow-600 w-10">#2</th>
                    <th className="px-2 py-2 border-r border-b border-yellow-100 bg-yellow-50 text-yellow-600 w-10">#3</th>

                    {/* PQC Rework Subcols */}
                    <th className="px-2 py-2 border-r border-b border-purple-100 bg-purple-50 text-purple-600 w-10">#1</th>
                    <th className="px-2 py-2 border-r border-b border-purple-100 bg-purple-50 text-purple-600 w-10">#2</th>
                    <th className="px-2 py-2 border-r border-b border-purple-100 bg-purple-50 text-purple-600 w-10">#3</th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={21} className="py-20 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center">
                          <RefreshCcw className="w-8 h-8 animate-spin mb-2 text-blue-400" />
                          <span className="text-sm font-medium">Memuat data dashboard...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={21} className="py-20 text-center text-red-400">
                        <div className="flex flex-col items-center justify-center">
                          <AlertCircle className="w-12 h-12 mb-3 text-red-400" />
                          <p className="text-lg font-medium text-red-600">{error}</p>
                          <p className="text-xs mt-1 text-gray-500">Please check browser console (F12) for more details.</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={21} className="py-20 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center opacity-60">
                          <Calendar className="w-12 h-12 mb-3 text-gray-300" />
                          <p className="text-lg font-medium text-gray-500">Pilih tanggal untuk memuat dashboard</p>
                          <p className="text-xs mt-1">Atau tidak ada data ditemukan untuk filter saat ini.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-blue-50 transition-colors text-gray-600">
                        {/* ID & Style */}
                        <td className="px-3 py-3 border-r border-gray-100 text-left">
                          <div className="font-bold text-gray-800">{item.id_garment || '-'}</div>
                          <div className="text-[10px] text-gray-500">{item.item || '-'}</div>
                        </td>
                        {/* Line */}
                        <td className="px-3 py-3 border-r border-gray-100 font-medium">{item.line}</td>
                        {/* Buyer / WO */}
                        <td className="px-3 py-3 border-r border-gray-100 text-left">
                          <div className="font-semibold text-[11px]">{item.buyer}</div>
                          <div className="text-[10px] text-gray-400">{item.wo}</div>
                        </td>
                        {/* Flow */}
                        <td className="px-3 py-3 border-r border-gray-100">
                          <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                            Standard
                          </span>
                        </td>
                        {/* Start Time */}
                        <td className="px-3 py-3 border-r border-gray-100 text-[11px] font-mono text-gray-500">
                          {(() => {
                            // Ambil start time dari START_TIME dari API cycletime
                            const startTime = item.start_time || item.START_TIME;
                            
                            if (startTime) {
                              const date = new Date(startTime);
                              return date.toLocaleString('id-ID', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              });
                            }
                            return '-';
                          })()}
                        </td>

                        {/* COLUMNS: Output -> QC */}
                        <td className="px-2 py-2 border-r border-gray-100 bg-blue-50/30 font-medium text-blue-700">
                          {/* Output -> QC: Durasi dari output ke QC checking */}
                          {item.duration_output_qc_formatted || formatDuration(item.rework?.detail?.durasi || item.rework?.summary?.total_durasi)}
                        </td>

                        {/* QC Rework 1, 2, 3 */}
                        {(() => {
                          // Gunakan data langsung dari API cycletime
                          const rework1 = item.qc_rework_1;
                          const rework2 = item.qc_rework_2;
                          const rework3 = item.qc_rework_3;
                          
                          // Fallback ke format lama jika tidak ada
                          const reworkDetails = item.rework?.detail_rework || [];
                          const fallbackRework1 = reworkDetails[0];
                          const fallbackRework2 = reworkDetails[1];
                          const fallbackRework3 = reworkDetails[2];
                          
                          return (
                            <>
                              <td className="px-2 border-r border-gray-100 bg-yellow-50/30 text-[10px]">
                                {rework1 !== null && rework1 !== undefined 
                                  ? formatDurationFromSeconds(rework1)
                                  : (fallbackRework1 ? formatDuration(fallbackRework1.durasi) : '-')}
                              </td>
                              <td className="px-2 border-r border-gray-100 bg-yellow-50/30 text-[10px]">
                                {rework2 !== null && rework2 !== undefined 
                                  ? formatDurationFromSeconds(rework2)
                                  : (fallbackRework2 ? formatDuration(fallbackRework2.durasi) : '-')}
                              </td>
                              <td className="px-2 border-r border-gray-100 bg-yellow-50/30 text-[10px]">
                                {rework3 !== null && rework3 !== undefined 
                                  ? formatDurationFromSeconds(rework3)
                                  : (fallbackRework3 ? formatDuration(fallbackRework3.durasi) : '-')}
                              </td>
                            </>
                          );
                        })()}

                        {/* QC Reject */}
                        <td className="px-2 border-r border-gray-100 bg-red-50/30 font-medium text-red-600">
                          {item.qc_reject 
                            ? formatDurationFromSeconds(item.qc_reject)
                            : (item.rework?.summary?.final_status?.includes('REJECT') || item.lastStatus?.includes('REJECT') 
                              ? formatDuration(item.rework?.summary?.total_durasi) 
                              : '-')}
                        </td>

                        {/* QC -> PQC */}
                        <td className="px-2 py-2 border-r border-gray-100 bg-green-50/30 font-medium text-green-700">
                          {item.duration_qc_pqc_formatted || formatDuration(item.qcPqc?.detail?.total_durasi)}
                        </td>

                        {/* PQC Rework 1, 2, 3 */}
                        {(() => {
                          // Gunakan data langsung dari API cycletime
                          const pqcRework1 = item.pqc_rework_1;
                          const pqcRework2 = item.pqc_rework_2;
                          const pqcRework3 = item.pqc_rework_3;
                          
                          // Fallback ke format lama jika tidak ada
                          const pqcReworkDetails = item.pqcRework?.detail_rework || [];
                          const fallbackPqcRework1 = pqcReworkDetails[0];
                          const fallbackPqcRework2 = pqcReworkDetails[1];
                          const fallbackPqcRework3 = pqcReworkDetails[2];
                          
                          return (
                            <>
                              <td className="px-2 border-r border-gray-100 bg-purple-50/30 text-[10px]">
                                {pqcRework1 !== null && pqcRework1 !== undefined 
                                  ? formatDurationFromSeconds(pqcRework1)
                                  : (fallbackPqcRework1 ? formatDuration(fallbackPqcRework1.durasi) : '-')}
                              </td>
                              <td className="px-2 border-r border-gray-100 bg-purple-50/30 text-[10px]">
                                {pqcRework2 !== null && pqcRework2 !== undefined 
                                  ? formatDurationFromSeconds(pqcRework2)
                                  : (fallbackPqcRework2 ? formatDuration(fallbackPqcRework2.durasi) : '-')}
                              </td>
                              <td className="px-2 border-r border-gray-100 bg-purple-50/30 text-[10px]">
                                {pqcRework3 !== null && pqcRework3 !== undefined 
                                  ? formatDurationFromSeconds(pqcRework3)
                                  : (fallbackPqcRework3 ? formatDuration(fallbackPqcRework3.durasi) : '-')}
                              </td>
                            </>
                          );
                        })()}

                        {/* PQC Reject */}
                        <td className="px-2 border-r border-gray-100 bg-red-50/30 font-medium text-red-600">
                          {item.pqc_reject 
                            ? formatDurationFromSeconds(item.pqc_reject)
                            : (item.pqcRework?.summary?.final_status?.includes('REJECT') || item.lastStatus?.includes('PQC_REJECT')
                              ? formatDuration(item.pqcRework?.summary?.total_durasi)
                              : '-')}
                        </td>

                        {/* Dryroom In (PQC -> In Dryroom) */}
                        <td className="px-2 border-r border-gray-100 bg-orange-50/20">
                          {item.dryroom_in_formatted || formatDuration(item.pqcIndryroom?.detail?.total_durasi)}
                        </td>
                        {/* Dryroom Out (In Dryroom -> Out Dryroom) */}
                        <td className="px-2 border-r border-gray-100 bg-orange-50/20">
                          {item.dryroom_out_formatted || formatDuration(item.indryroomOutdryroom?.detail?.total_durasi)}
                        </td>

                        {/* Folding In (Out Dryroom -> In Folding) */}
                        <td className="px-2 border-r border-gray-100 bg-cyan-50/20">
                          {item.folding_in_formatted || formatDuration(item.outdryroomInfolding?.detail?.total_durasi)}
                        </td>
                        {/* Folding Out (In Folding -> Out Folding) */}
                        <td className="px-2 border-r border-gray-100 bg-cyan-50/20 font-medium text-cyan-700">
                          {item.folding_out_formatted || formatDuration(item.infoldingOutfolding?.detail?.total_durasi)}
                        </td>

                        {/* Total - Gunakan TOTAL_CYCLE_TIME langsung dari API */}
                        <td className="px-3 py-3 font-bold text-gray-700">
                          {item.total_cycle_time_formatted || (() => {
                            // Fallback: hitung total durasi jika total_cycle_time tidak ada
                            let totalSeconds = 0;
                            
                            if (item.total_cycle_time && item.total_cycle_time > 0) {
                              totalSeconds = item.total_cycle_time;
                            } else {
                              // QC -> PQC
                              if (item.qcPqc?.detail?.total_detik) {
                                totalSeconds += item.qcPqc.detail.total_detik;
                              }
                              
                              // PQC Rework
                              if (item.pqcRework?.summary?.total_detik) {
                                totalSeconds += item.pqcRework.summary.total_detik;
                              }
                              
                              // PQC -> In Dryroom
                              if (item.pqcIndryroom?.detail?.total_detik) {
                                totalSeconds += item.pqcIndryroom.detail.total_detik;
                              }
                              
                              // In Dryroom -> Out Dryroom
                              if (item.indryroomOutdryroom?.detail?.total_detik) {
                                totalSeconds += item.indryroomOutdryroom.detail.total_detik;
                              }
                              
                              // Out Dryroom -> In Folding
                              if (item.outdryroomInfolding?.detail?.total_detik) {
                                totalSeconds += item.outdryroomInfolding.detail.total_detik;
                              }
                              
                              // In Folding -> Out Folding
                              if (item.infoldingOutfolding?.detail?.total_detik) {
                                totalSeconds += item.infoldingOutfolding.detail.total_detik;
                              }
                            }
                            
                            return totalSeconds > 0 ? formatDurationFromSeconds(totalSeconds) : '-';
                          })()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center flex-wrap gap-2">
              <span className="text-sm text-gray-500">
                {filteredData.length} baris ditampilkan {filteredData.length !== data.length && `(dari ${data.length} total)`}
              </span>
              <button
                onClick={() => {
                  const headers = ['ID', 'Style', 'Line', 'Buyer', 'WO', 'Start Time', 'Last Status', 'Total Cycle Time', 'QC Rework', 'QC Reject', 'PQC Rework', 'PQC Reject', 'Ready to Ship'];
                  const escape = (v: unknown) => {
                    const s = v == null ? '' : String(v);
                    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
                  };
                  const row = (item: any) => [
                    item.id_garment,
                    item.style,
                    item.line,
                    item.buyer,
                    item.wo,
                    item.start_time,
                    item.lastStatus,
                    item.total_cycle_time_formatted || '-',
                    item.qc_rework_count ?? '-',
                    item.qc_reject ?? '-',
                    item.pqc_rework_count ?? '-',
                    item.pqc_reject ?? '-',
                    (item.lastStatus?.includes('OUT_FOLDING') || item.lastStatus === 'DONE') ? 'Ya' : ''
                  ].map(escape).join(',');
                  const csv = [headers.map(escape).join(','), ...filteredData.map(row)].join('\r\n');
                  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `production-tracking-${dateFrom}-${dateTo}-${filteredData.length}rows.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                disabled={filteredData.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-shadow shadow-sm font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Download Excel (data tampilan)
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// KPI Card Component
const KPICard = ({ title, value, sub, icon: Icon, color }: any) => {
  // Color configurations
  const colors: any = {
    blue: { border: 'border-l-blue-500', iconBg: 'bg-blue-100', iconText: 'text-blue-600' },
    purple: { border: 'border-l-purple-500', iconBg: 'bg-purple-100', iconText: 'text-purple-600' },
    yellow: { border: 'border-l-yellow-400', iconBg: 'bg-yellow-100', iconText: 'text-yellow-600' },
    red: { border: 'border-l-red-500', iconBg: 'bg-red-100', iconText: 'text-red-600' },
    green: { border: 'border-l-green-500', iconBg: 'bg-green-100', iconText: 'text-green-600' },
  };
  const c = colors[color] || colors.blue;

  return (
    <div className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 border-l-4 ${c.border} flex justify-between items-start`}>
      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-800 leading-tight">{value}</h3>
        <p className="text-[10px] text-gray-400 mt-1">{sub}</p>
      </div>
      <div className={`p-2 rounded-lg ${c.iconBg}`}>
        <Icon className={`w-6 h-6 ${c.iconText}`} />
      </div>
    </div>
  );
};

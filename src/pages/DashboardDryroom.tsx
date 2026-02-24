import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  Bar, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import {
  Droplet,
  TrendingUp, RefreshCw
} from 'lucide-react';

// --- IMPORTS COMPONENTS ---
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';
import ScanningFinishingModal from '../components/ScanningFinishingModal';
import { getFinishingData, getFinishingDataByLine, API_BASE_URL, getDefaultHeaders } from '../config/api';
import { productionLinesMJL } from '../data/production_line';
import { Card, MetricCard, TableDistribution, FilterButton } from '../components/finishing';
import { FinishingDetailModal, type FinishingMetricType, type FinishingSection } from '../components/finishing/FinishingDetailModal';
import { dryroomChartData } from '../components/finishing/dummy';
import { exportFinishingToExcel } from '../utils/exportFinishingToExcel';
import { Filter, Calendar } from 'lucide-react';

/**
 * ============================================================================
 * 1. TYPE DEFINITIONS
 * ============================================================================
 */


interface ChartDataPoint {
  hour: string;
  dryroom: number;
  target: number;
}

interface PieDataPoint {
  name: string;
  value: number;
  color: string;
  percent: string;
  fill: string;
  [key: string]: any;
}

interface TableDistributionData {
  line: string;
  wo: string;
  item: string;
  waiting: number;
  checkIn: number;
  checkOut: number;
}

interface FilterState {
  dateFrom: string;
  dateTo: string;
  wo: string;
}

// Config Types - moved to components/finishing/MetricCard.tsx

/**
 * ============================================================================
 * 2. THEME CONFIGURATION
 * ============================================================================
 */
const THEME = {
  colors: {
    chart: {
      waiting: '#f97316',
      checkin: '#0ea5e9',
      checkout: '#22c55e',
      target: '#8b5cf6'
    }
  }
};

/**
 * ============================================================================
 * 3. MAIN COMPONENT
 * ============================================================================
 */
export default function DashboardDryroom() {
  const { isOpen } = useSidebar();

  // --- STATE ---
  const [filters, setFilters] = useState<FilterState>({ dateFrom: '', dateTo: '', wo: '' });
  const [modals, setModals] = useState({ filter: false, wo: false, export: false, scan: false });
  const [isLoaded, setIsLoaded] = useState(false);
  const [showWoFilterModal, setShowWoFilterModal] = useState(false);
  const [showDateFilterModal, setShowDateFilterModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailModalType, setDetailModalType] = useState<FinishingMetricType>('waiting');
  const [detailModalSection, setDetailModalSection] = useState<FinishingSection>('dryroom');
  const [detailSearchQuery, setDetailSearchQuery] = useState('');

  // --- EFFECT ---
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // --- QUERY ---
  const { data: finishingResponse, refetch: refetchFinishingData } = useQuery({
    queryKey: ['finishing-data-dryroom'],
    queryFn: async () => {
      try {
        const response = await getFinishingData();
        if (!response.success || !response.data) return { dryroom: { waiting: 147, checkin: 396, checkout: 0 } };
        return response.data;
      } catch (err) {
        return { dryroom: { waiting: 0, checkin: 0, checkout: 0 } };
      }
    },
    refetchInterval: 30000,
  });

  const dryroomCheckIn = finishingResponse?.dryroom?.checkin ?? 0;
  const dryroomCheckOut = finishingResponse?.dryroom?.checkout ?? 0;
  const dryroomWaiting = finishingResponse?.dryroom?.waiting ?? 0;
  const totalDryroom = dryroomCheckIn + dryroomCheckOut + dryroomWaiting;

  // --- MEMOIZED DATA ---
  const pieData: PieDataPoint[] = useMemo(() => {
    const total = totalDryroom || 1;
    return [
      { name: 'Waiting', value: dryroomWaiting, color: THEME.colors.chart.waiting, fill: THEME.colors.chart.waiting, percent: total > 0 ? ((dryroomWaiting / total) * 100).toFixed(1) : '0' },
      { name: 'Check In', value: dryroomCheckIn, color: THEME.colors.chart.checkin, fill: THEME.colors.chart.checkin, percent: total > 0 ? ((dryroomCheckIn / total) * 100).toFixed(1) : '0' },
      { name: 'Check Out', value: dryroomCheckOut, color: THEME.colors.chart.checkout, fill: THEME.colors.chart.checkout, percent: total > 0 ? ((dryroomCheckOut / total) * 100).toFixed(1) : '0' }
    ];
  }, [dryroomWaiting, dryroomCheckIn, dryroomCheckOut, totalDryroom]);

  // Fetch data untuk semua line untuk Tabel Distribution
  const productionLines = productionLinesMJL.filter(line => line.id !== 111 && line.id <= 15);

  const { data: allLineFinishingData } = useQuery({
    queryKey: ['finishing-data-all-lines-dryroom'],
    queryFn: async () => {
      const results: Record<string, any> = {};

      const promises = productionLines.map(async (line) => {
        const lineNumber = line.line || line.id.toString();
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
    refetchInterval: 30000,
    retry: 2,
  });

  // Data untuk Tabel Distribution dari API (hanya yang ada data)
  const tableDistributionData: TableDistributionData[] = useMemo(() => {
    if (!allLineFinishingData) return [];

    return productionLines
      .map((line) => {
        const lineNumber = line.line || line.id.toString();
        const lineData = allLineFinishingData[lineNumber];

        if (!lineData || !lineData.finishing) {
          return null;
        }

        const finishing = lineData.finishing;
        const wo = lineData.wo;

        // Gunakan data dryroom
        const waiting = finishing.dryroom?.waiting || 0;
        const checkIn = finishing.dryroom?.checkin || 0;
        const checkOut = finishing.dryroom?.checkout || 0;

        // Hanya tampilkan jika ada data
        if (waiting === 0 && checkIn === 0 && checkOut === 0) {
          return null;
        }

        return {
          line: `Line ${lineNumber}`,
          wo: wo?.wo || '-',
          item: wo?.item || '-',
          waiting,
          checkIn,
          checkOut,
        };
      })
      .filter((item): item is TableDistributionData => item !== null);
  }, [allLineFinishingData, productionLines]);

  // Chart data - menggunakan mock data dari dummy.ts
  const chartData: ChartDataPoint[] = useMemo(() => {
    return dryroomChartData;
  }, []);


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
    <div className="flex h-screen w-screen bg-[#f8fafc] font-sans text-slate-800 overflow-hidden relative selection:bg-sky-200 selection:text-sky-900">

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
                <Card title="Real-time Status Dryroom" icon={RefreshCw} action={
                  <div className="flex items-center gap-2">
                    <FilterButton icon={Filter} label="Filter WO" onClick={() => setShowWoFilterModal(true)} variant="wo" />
                    <FilterButton icon={Calendar} label="Filter Date" onClick={() => setShowDateFilterModal(true)} variant="date" />
                  </div>
                }>
                  <div className="grid grid-cols-3 gap-3 md:gap-4 h-full min-h-0 items-stretch">
                    <MetricCard
                      label="Waiting"
                      value={dryroomWaiting}
                      type="waiting"
                      onClick={() => {
                        setDetailModalType('waiting');
                        setDetailModalSection('dryroom');
                        setShowDetailModal(true);
                        setDetailSearchQuery('');
                      }}
                    />
                    <MetricCard
                      label="Check In"
                      value={dryroomCheckIn}
                      type="checkin"
                      onClick={() => {
                        setDetailModalType('checkin');
                        setDetailModalSection('dryroom');
                        setShowDetailModal(true);
                        setDetailSearchQuery('');
                      }}
                    />
                    <MetricCard
                      label="Check Out"
                      value={dryroomCheckOut}
                      type="checkout"
                      onClick={() => {
                        setDetailModalType('checkout');
                        setDetailModalSection('dryroom');
                        setShowDetailModal(true);
                        setDetailSearchQuery('');
                      }}
                    />
                  </div>
                </Card>
              </div>

              {/* BAGIAN TENGAH: PIE CHART - Full width di mobile */}
              <div className="flex-none w-full min-h-[250px]">
                <Card title="Status Distribution Dryroom" icon={Droplet}>
                  <div className="flex items-center justify-between h-full min-h-0 px-2 gap-2">
                    <div className="flex-1 h-full min-h-0 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%" cy="50%"
                            innerRadius="50%"
                            outerRadius="62%"
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={10}
                          >
                            {pieData.map((e, i) => <Cell key={i} fill={e.color} className="hover:opacity-80 transition-opacity cursor-pointer filter drop-shadow-sm" />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip type="pie" />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-in fade-in zoom-in duration-500">
                        <span className="text-xl font-black text-slate-800 tracking-tight">{totalDryroom}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Total</span>
                      </div>
                    </div>
                    <div className="w-[110px] flex flex-col gap-2 justify-center pr-1 shrink-0">
                      {pieData.map((item, idx) => (
                        <div key={idx} className="group cursor-pointer">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900">{item.name}</span>
                            <span className="text-[10px] font-bold" style={{ color: item.color }}>{item.percent}%</span>
                          </div>
                          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700 ease-out group-hover:brightness-90" style={{ width: `${item.percent}%`, background: item.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>

              {/* BAGIAN TENGAH: CHART - Full width di mobile */}
              <div className="flex-none w-full min-h-[250px]">
                <Card title="Hourly Throughput Dryroom" icon={TrendingUp}>
                  <div className="w-full h-full min-h-0 pt-3 pl-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <defs>
                          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.9} /><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.2} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9, fontWeight: 500 }} dy={5} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }} />
                        <Tooltip content={<CustomTooltip type="bar" />} cursor={{ fill: '#f1f5f9' }} />
                        <Bar dataKey="dryroom" fill="url(#barGrad)" radius={[4, 4, 0, 0]} barSize={24} animationDuration={1500} />
                        <Line type="stepAfter" dataKey="target" stroke="#8b5cf6" strokeWidth={2} dot={false} strokeDasharray="5 5" animationDuration={2000} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              {/* BAGIAN BAWAH: TABLE - Full width di mobile */}
              <div className="flex-none w-full min-h-[300px]">
                <TableDistribution
                  data={tableDistributionData}
                  title="Tabel Distribution Dryroom"
                  onExport={async () => {
                    const exportData = tableDistributionData.map(row => ({
                      line: row.line,
                      wo: row.wo,
                      style: '-',
                      item: row.item,
                      buyer: '-',
                      waiting: row.waiting,
                      checkIn: row.checkIn,
                      checkOut: row.checkOut,
                    }));
                    await exportFinishingToExcel(exportData, 'dryroom', 'excel', filters.dateFrom, filters.dateTo);
                  }}
                />
              </div>
            </div>
          ) : (
            /* DESKTOP VERSION: One page, layout tetap sama seperti sebelumnya */
            <div className="pt-12 flex-1 flex flex-col gap-3 md:gap-4 lg:gap-5 min-h-0 overflow-hidden">
              {/* ROW 1: STATUS & PIE */}
              <div className="flex-[4] min-h-[160px] md:min-h-[200px] lg:min-h-[220px] grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 lg:gap-5">
                {/* LEFT: STATUS CARDS */}
                <div className="col-span-12 md:col-span-7 min-h-0 flex flex-col">
                  <Card title="Real-time Status Dryroom" icon={RefreshCw} action={
                    <div className="flex items-center gap-2">
                      <FilterButton icon={Filter} label="Filter WO" onClick={() => setShowWoFilterModal(true)} variant="wo" />
                      <FilterButton icon={Calendar} label="Filter Date" onClick={() => setShowDateFilterModal(true)} variant="date" />
                    </div>
                  }>
                    <div className="grid justify-center grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 h-full min-h-0 items-stretch">
                      <MetricCard
                        label="Waiting"
                        value={dryroomWaiting}
                        type="waiting"
                        onClick={() => {
                          setDetailModalType('waiting');
                          setDetailModalSection('dryroom');
                          setShowDetailModal(true);
                          setDetailSearchQuery('');
                        }}
                      />
                      <MetricCard
                        label="Check In"
                        value={dryroomCheckIn}
                        type="checkin"
                        onClick={() => {
                          setDetailModalType('checkin');
                          setDetailModalSection('dryroom');
                          setShowDetailModal(true);
                          setDetailSearchQuery('');
                        }}
                      />
                      <MetricCard
                        label="Check Out"
                        value={dryroomCheckOut}
                        type="checkout"
                        onClick={() => {
                          setDetailModalType('checkout');
                          setDetailModalSection('dryroom');
                          setShowDetailModal(true);
                          setDetailSearchQuery('');
                        }}
                      />
                    </div>
                  </Card>
                </div>

                {/* RIGHT: PIE CHART */}
                <div className="col-span-12 md:col-span-5 min-h-0 flex flex-col">
                  <Card title="Status Distribution Dryroom" icon={Droplet}>
                    <div className="flex items-center justify-between h-full min-h-0 px-2 gap-2">
                      <div className="flex-1 h-full min-h-0 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%" cy="50%"
                              innerRadius="50%"
                              outerRadius="62%"
                              paddingAngle={4}
                              dataKey="value"
                              stroke="none"
                              cornerRadius={10}
                            >
                              {pieData.map((e, i) => <Cell key={i} fill={e.color} className="hover:opacity-80 transition-opacity cursor-pointer filter drop-shadow-sm" />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip type="pie" />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none animate-in fade-in zoom-in duration-500">
                          <span className="text-xl font-black text-slate-800 tracking-tight">{totalDryroom}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Total</span>
                        </div>
                      </div>
                      <div className="w-[110px] flex flex-col gap-2 justify-center pr-1 shrink-0">
                        {pieData.map((item, idx) => (
                          <div key={idx} className="group cursor-pointer">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900">{item.name}</span>
                              <span className="text-[10px] font-bold" style={{ color: item.color }}>{item.percent}%</span>
                            </div>
                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700 ease-out group-hover:brightness-90" style={{ width: `${item.percent}%`, background: item.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* ROW 2: CHART & TABLE */}
              <div className="flex-[6] min-h-[200px] md:min-h-[250px] lg:min-h-[300px] grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 lg:gap-5">

                {/* LEFT: CHART */}
                <div className="col-span-12 md:col-span-6 min-h-0 flex flex-col">
                  <Card title="Hourly Throughput Dryroom" icon={TrendingUp}>
                    <div className="w-full h-full min-h-0 pt-3 pl-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                          <defs>
                            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.9} /><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.2} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9, fontWeight: 500 }} dy={5} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }} />
                          <Tooltip content={<CustomTooltip type="bar" />} cursor={{ fill: '#f1f5f9' }} />
                          <Bar dataKey="dryroom" fill="url(#barGrad)" radius={[4, 4, 0, 0]} barSize={24} animationDuration={1500} />
                          <Line type="stepAfter" dataKey="target" stroke="#8b5cf6" strokeWidth={2} dot={false} strokeDasharray="5 5" animationDuration={2000} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>

                {/* RIGHT: TABLE */}
                <div className="col-span-12 md:col-span-6 min-h-0 flex flex-col">
                  <TableDistribution
                    data={tableDistributionData}
                    title="Tabel Distribution Dryroom"
                    onExport={async () => {
                      const exportData = tableDistributionData.map(row => ({
                        line: row.line,
                        wo: row.wo,
                        style: '-',
                        item: row.item,
                        buyer: '-',
                        waiting: row.waiting,
                        checkIn: row.checkIn,
                        checkOut: row.checkOut,
                      }));
                      await exportFinishingToExcel(exportData, 'dryroom', 'excel', filters.dateFrom, filters.dateTo);
                    }}
                  />
                </div>

              </div>
            </div>
          )}

        </main>
      </div>

      {/* --- MODALS --- */}
      {modals.filter && (
        <ModalOverlay onClose={() => setModals(m => ({ ...m, filter: false }))} title="Filter Configuration">
          <div className="space-y-4">
            <InputGroup label="Filter by WO" value={filters.wo} onChange={(v: string) => setFilters(f => ({ ...f, wo: v }))} placeholder="Enter WO..." />
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button variant="ghost" onClick={() => setFilters({ dateFrom: '', dateTo: '', wo: '' })}>Reset</Button>
              <Button onClick={() => setModals(m => ({ ...m, filter: false }))}>Apply</Button>
            </div>
          </div>
        </ModalOverlay>
      )}
      <ScanningFinishingModal isOpen={modals.scan} onClose={() => { setModals(m => ({ ...m, scan: false })); refetchFinishingData(); }} type="dryroom" />

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

      {/* Filter WO Modal */}
      {showWoFilterModal && (
        <ModalOverlay onClose={() => setShowWoFilterModal(false)} title="Filter WO">
          <div className="flex flex-col gap-4">
            <InputGroup
              label="Work Order (WO)"
              value={filters.wo}
              onChange={(v: string) => setFilters(f => ({ ...f, wo: v }))}
              placeholder="Masukkan WO..."
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setFilters(f => ({ ...f, wo: '' })); setShowWoFilterModal(false); }}>Reset</Button>
              <Button onClick={() => setShowWoFilterModal(false)}>Apply</Button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Filter Date Modal */}
      {showDateFilterModal && (
        <ModalOverlay onClose={() => setShowDateFilterModal(false)} title="Filter Date Range">
          <div className="flex flex-col gap-4">
            <InputGroup
              label="Dari Tanggal"
              value={filters.dateFrom}
              onChange={(v: string) => setFilters(f => ({ ...f, dateFrom: v }))}
              placeholder="YYYY-MM-DD"
            />
            <InputGroup
              label="Sampai Tanggal"
              value={filters.dateTo}
              onChange={(v: string) => setFilters(f => ({ ...f, dateTo: v }))}
              placeholder="YYYY-MM-DD"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setFilters(f => ({ ...f, dateFrom: '', dateTo: '' })); setShowDateFilterModal(false); }}>Reset</Button>
              <Button onClick={() => setShowDateFilterModal(false)}>Apply</Button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

/**
 * ============================================================================
 * 4. REUSABLE UI COMPONENTS (Moved to components/finishing)
 * ============================================================================
 */


const Button = ({ children, onClick, variant = 'primary' }: any) => (
  <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${variant === 'primary' ? 'bg-sky-600 text-white hover:bg-sky-700 shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-100'}`}>{children}</button>
);

const InputGroup = ({ label, value, onChange, placeholder }: any) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold text-slate-500 uppercase">{label}</label>
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 outline-none" />
  </div>
);

const CustomTooltip = ({ active, payload, label, type }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md p-2 rounded-lg shadow-xl border border-slate-100 text-[10px] z-50 min-w-[120px]">
        {type === 'bar' && <div className="font-bold mb-1 pb-1 border-b border-slate-100 text-slate-700">{label}</div>}
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

const ModalOverlay = ({ onClose, title, children }: any) => (
  <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden scale-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
      <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"><span className="font-bold text-xs text-slate-800">{title}</span><button onClick={onClose}>✕</button></div>
      <div className="p-4">{children}</div>
    </div>
  </div>
);
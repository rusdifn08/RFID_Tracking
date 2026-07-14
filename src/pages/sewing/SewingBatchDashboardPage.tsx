import { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import SewingPageShell from '../../components/sewing/SewingPageShell';
import { BatchOverviewCard } from '../../components/sewing/SewingBatchCards';
import BatchDetailModal from '../../components/sewing/BatchDetailModal';
import SewingBatchHourlyChart from '../../components/sewing/SewingBatchHourlyChart';
import SewingBatchOverviewKpi from '../../components/sewing/SewingBatchOverviewKpi';
import CommandCenterHeader from '../../components/sewing/CommandCenterHeader';
import { useSewingBatchDashboardQuery, type SewingBatchData } from '../../hooks/useSewingBatchDashboardQuery';
import { getEnvironmentFromAPI, getSupervisorDataFromAPI } from '../../config/api';
import { exportSewingBatchToExcel } from '../../utils/exportSewingBatchToExcel';
import batchData from '../../data/sewing/sewing-batch-dashboard.json';
import flowData from '../../data/sewing/sewing-flow-detail.json';
import {
  SEWING_BATCH_META_STATIC,
  type SewingBatchMeta,
  type SewingFlowBatch,
} from '../../types/sewingDashboard';
import {
  computeProductionBatchHighlights,
  isAssemblyBatch,
} from '../../utils/sewingBatchInOut';
import type { BatchHourlyOutputPoint } from '../../utils/sewingBatchHourlyOutput';
import { getBatchGridConfig } from '../../utils/sewingBatchGridLayout';
import { SEWING_DASHBOARD_BATCH_DEFAULT } from '../../utils/sewingBatchVisibility';
import logo from '../../assets/logo.svg';

const SewingBatchDashboardPage = memo(() => {
  const { id } = useParams<{ id: string }>();
  const urlLineId = id ?? '1';

  const [apiLineId, setApiLineId] = useState(urlLineId);
  const [displayLineTitle, setDisplayLineTitle] = useState(urlLineId);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const env = await getEnvironmentFromAPI();
        const data = await getSupervisorDataFromAPI(env, 'sewing');
        if (!isMounted) return;
        
        let customTitle = urlLineId;
        if (data && data.displayTitles) {
          customTitle = data.displayTitles[urlLineId] || urlLineId;
        }
        
        // Ekstrak angka dari nama line (misal: "Sewing Line 10" -> "10")
        const match = customTitle.match(/\d+/);
        const resolvedLineId = match ? match[0] : urlLineId;
        
        setApiLineId(resolvedLineId);
        setDisplayLineTitle(resolvedLineId);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { isMounted = false; };
  }, [urlLineId]);

  // Dummy data fallback untuk line 12 jika API kosong
  const DUMMY_LINE12_ORDER = {
    wo: '187583',
    style: '1128733',
    size: 'S',
    buyer: 'HEXAPOLE COMPANY LIMITED',
    item: "STORM CRUISER JACKET M'S",
    color: 'BL',
  };
  const DUMMY_LINE12_BATCHES: SewingBatchData[] = Array.from({ length: 5 }, (_, i) => ({
    no_batch: i + 1,
    nama_batch: `Proses`,
    in: 1,
    out: 1,
    output_pcs: 15,
  } as SewingBatchData));

  // Filters State
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Applied Filters State (yang dikirim ke API)
  const [appliedDateFrom, setAppliedDateFrom] = useState('');
  const [appliedDateTo, setAppliedDateTo] = useState('');

  // Field level filters (untuk filter lokal)
  const [fieldFilters, setFieldFilters] = useState<{
    wo?: string;
    style?: string;
    size?: string;
    buyer?: string;
    item?: string;
    color?: string;
  }>({});

  // Fetch real-time API data
  const { data: apiResponse, isLoading } = useSewingBatchDashboardQuery(
    apiLineId,
    undefined,
    undefined,
    appliedDateFrom,
    appliedDateTo
  );

  const pcsPerBundle = batchData.defaults.pcsPerBundle ?? 15;
  const [batchDetailNo, setBatchDetailNo] = useState<number | null>(null);

  const orderOptions = useMemo(() => {
    if (apiResponse?.data && apiResponse.data.length > 0) {
      const allData = apiResponse.data;
      const getUnique = (key: string) => Array.from(new Set(allData.map((d: any) => d[key]).filter((v: any) => v && v !== '—'))) as string[];
      
      return {
        wo: getUnique('wo'),
        style: getUnique('style'),
        size: getUnique('size'),
        buyer: getUnique('buyer'),
        item: getUnique('item'),
        color: getUnique('color'),
      };
    }
    return { wo: [], style: [], size: [], buyer: [], item: [], color: [] };
  }, [apiResponse]);

  const filteredData = useMemo(() => {
    if (!apiResponse?.data) return [];
    return apiResponse.data.filter((d: any) => {
      if (fieldFilters.wo && d.wo !== fieldFilters.wo) return false;
      if (fieldFilters.style && d.style !== fieldFilters.style) return false;
      if (fieldFilters.size && d.size !== fieldFilters.size) return false;
      if (fieldFilters.buyer && d.buyer !== fieldFilters.buyer) return false;
      if (fieldFilters.item && d.item !== fieldFilters.item) return false;
      if (fieldFilters.color && d.color !== fieldFilters.color) return false;
      return true;
    });
  }, [apiResponse, fieldFilters]);

  const batchesFromApi = useMemo(() => {
    if (filteredData.length > 0) {
      const aggregatedBatches = new Map<string, SewingBatchData>();
      
      filteredData.forEach((d: any) => {
        if (d.batch && Array.isArray(d.batch)) {
          d.batch.forEach((b: SewingBatchData) => {
            const key = String(b.no_batch);
            if (aggregatedBatches.has(key)) {
              const existing = aggregatedBatches.get(key)!;
              existing.in += Number(b.in) || 0;
              existing.out += Number(b.out) || 0;
              existing.output_pcs += Number(b.output_pcs) || 0;
            } else {
              aggregatedBatches.set(key, { 
                ...b, 
                in: Number(b.in) || 0, 
                out: Number(b.out) || 0, 
                output_pcs: Number(b.output_pcs) || 0 
              });
            }
          });
        }
      });
      
      if (aggregatedBatches.size > 0) {
        const arr = Array.from(aggregatedBatches.values()).sort((a, b) => Number(a.no_batch) - Number(b.no_batch));
        const hasAssembly = arr.some(b => b.nama_batch?.toUpperCase().includes('ASSEMBLY') || b.nama_batch?.toUpperCase().includes('ASSEMBLING'));
        if (!hasAssembly) {
            const nextBatchNo = arr.length > 0 ? Math.max(...arr.map(a => Number(a.no_batch))) + 1 : 1;
            arr.push({
                no_batch: nextBatchNo,
                nama_batch: 'ASSEMBLY',
                in: 0,
                out: 0,
                output_pcs: 0
            } as any);
        }
        return arr;
      }
    }
    // Fallback dummy untuk line 12
    if (apiLineId === '12') return DUMMY_LINE12_BATCHES;
    return [];
  }, [filteredData, apiLineId]);

  const order = useMemo(() => {
    if (filteredData.length > 0) {
      const allData = filteredData;
      
      const getUniqueJoined = (key: string) => {
        const uniqueValues = Array.from(new Set(allData.map((d: any) => d[key]).filter((v: any) => v && v !== '—')));
        return uniqueValues.length > 0 ? uniqueValues.join(', ') : '—';
      };

      const hasData = allData.some((d: any) => d.wo || d.style || d.size || d.buyer || d.item || d.color);
      if (hasData) {
        return {
          wo: getUniqueJoined('wo'),
          style: getUniqueJoined('style'),
          size: getUniqueJoined('size'),
          buyer: getUniqueJoined('buyer'),
          item: getUniqueJoined('item'),
          color: getUniqueJoined('color'),
        };
      }
    }
    // Fallback dummy untuk line 12
    if (apiLineId === '12') return DUMMY_LINE12_ORDER;
    return {
      wo: '—',
      style: '—',
      size: '—',
      buyer: '—',
      item: '—',
      color: '—',
    };
  }, [filteredData, apiLineId]);

  const batchOverviewList = useMemo(() => {
    if (batchesFromApi.length === 0) return [];
    
    // Explicitly strongly type the mapped batches so that it fulfills BatchOverview & BatchInOutMetrics
    const raw = batchesFromApi.map((b: SewingBatchData) => {
      const batchNo = Number(b.no_batch) || 0;
      const type = b.nama_batch || 'Proses';
      const isAssembly = type.toUpperCase().includes('ASSEMBLY') || type.toUpperCase().includes('ASSEMBLING');
      
      // ASSEMBLING batch: API returns in/out already in pcs, not bundle count
      // Production batches (1-5): API returns in/out in bundle count, multiply by pcsPerBundle
      const pcsIn = isAssembly ? b.in : b.in * pcsPerBundle;
      const pcsOut = isAssembly ? b.out : b.out * pcsPerBundle;
      const wip = isAssembly ? Math.max(0, b.in - b.out) : Math.max(0, b.in - b.out) * pcsPerBundle;
      const efficiencyPct = b.in > 0 ? Math.round((b.out / b.in) * 100) : 0;
      
      return {
        batch: batchNo,
        type,
        label: `B${batchNo}`,
        desc: type,
        currentBundle: isAssembly ? b.in : Math.max(1, Math.min(b.in, b.out + 1)),
        pcsIn,
        pcsOut,
        wip,
        efficiencyPct,
        outProgressPct: efficiencyPct,
        outputPcs: Number(b.output_pcs) || 0,
      };
    });
    return raw;
  }, [batchesFromApi, pcsPerBundle]);

  const overviewKpi = useMemo(() => {
    const production = batchOverviewList.filter((b) => b.batch >= 1 && b.batch <= 5);
    const prosesBatch = production.length > 0 ? Math.max(...production.map((b) => b.pcsIn / pcsPerBundle)) : 0;
    const finishBatch = production.length > 0 ? Math.min(...production.map((b) => b.pcsOut / pcsPerBundle)) : 0;
    const wip = Math.max(0, prosesBatch - finishBatch);
    const efficiencyPct = prosesBatch > 0 ? Math.round((finishBatch / prosesBatch) * 100) : 0;
    
    return {
      prosesBatch,
      finishBatch,
      wip,
      efficiencyPct,
    };
  }, [batchOverviewList, pcsPerBundle]);

  const batchHighlights = useMemo(
    () => computeProductionBatchHighlights(batchOverviewList, pcsPerBundle),
    [batchOverviewList, pcsPerBundle]
  );

  const hourlyChartData = useMemo(() => {
    const baseline = batchData.hourlyBatchOutput || [];
    if (batchesFromApi.length === 0) return baseline as BatchHourlyOutputPoint[];

    const baselineSums: Record<string, number> = {};
    baseline.forEach(point => {
      batchesFromApi.forEach((b: SewingBatchData) => {
        const key = `batch${b.no_batch}`;
        baselineSums[key] = (baselineSums[key] || 0) + (Number((point as Record<string, any>)[key]) || 0);
      });
    });

    return baseline.map(point => {
      const nextPoint: Record<string, any> = { ...point };
      batchesFromApi.forEach((b: SewingBatchData) => {
        const key = `batch${b.no_batch}`;
        const sum = baselineSums[key] || 0;
        const actualOutput = Number(b.output_pcs) || 0;
        if (sum === 0) {
          nextPoint[key] = actualOutput > 0 ? Math.round(actualOutput / baseline.length) : 0;
        } else {
          nextPoint[key] = Math.round((Number((point as Record<string, any>)[key]) || 0) * (actualOutput / sum));
        }
      });
      return nextPoint as BatchHourlyOutputPoint;
    });
  }, [batchesFromApi]);

  const TARGET_BATCH_COUNT = useMemo(() => {
    if (batchOverviewList.length === 0) return 6;
    return Math.max(6, ...batchOverviewList.map((b) => b.batch));
  }, [batchOverviewList]);

  const batchGrid = useMemo(
    () => getBatchGridConfig(TARGET_BATCH_COUNT),
    [TARGET_BATCH_COUNT]
  );

  const openBatchDetail = useCallback((batchNo: number) => {
    setBatchDetailNo(batchNo);
  }, []);

  const closeBatchDetail = useCallback(() => setBatchDetailNo(null), []);

  const batchDetail = useMemo(() => {
    if (batchDetailNo === null) return null;
    const activeBatch = batchOverviewList.find((b) => b.batch === batchDetailNo);
    const staticMeta = SEWING_BATCH_META_STATIC.find((sm) => sm.batch === batchDetailNo);
    
    if (activeBatch) {
      // Return combination of static properties and dynamic actual ones to fulfill SewingBatchMeta type
      return {
        ...(staticMeta || {}),
        batch: batchDetailNo,
        type: activeBatch.type,
        label: activeBatch.label,
        desc: activeBatch.desc,
        processCount: staticMeta?.processCount || 0,
        doneCount: staticMeta?.doneCount || 0,
        holdCount: staticMeta?.holdCount || 0,
        progressPct: activeBatch.efficiencyPct,
      } as SewingBatchMeta;
    }
    return staticMeta ?? null;
  }, [batchDetailNo, batchOverviewList]);

  const batchDetailLane = useMemo(() => {
    if (batchDetailNo === null) return null;
    return (flowData.batches as SewingFlowBatch[]).find((b) => b.batch === batchDetailNo) ?? null;
  }, [batchDetailNo]);

  const batchDetailInOut = useMemo(() => {
    if (batchDetailNo === null) return null;
    return batchOverviewList.find((b) => b.batch === batchDetailNo) ?? null;
  }, [batchDetailNo, batchOverviewList]);


  const handleSearch = useCallback(() => {
    setAppliedDateFrom(filterDateFrom);
    setAppliedDateTo(filterDateTo);
  }, [filterDateFrom, filterDateTo]);

  const handleReset = useCallback(() => {
    setFilterDateFrom('');
    setFilterDateTo('');
    setAppliedDateFrom('');
    setAppliedDateTo('');
    setFieldFilters({});
  }, []);

  const handleExportExcel = useCallback(() => {
    exportSewingBatchToExcel(
      apiLineId,
      order,
      batchesFromApi,
      appliedDateFrom || 'Semua Tanggal',
      appliedDateTo || 'Semua Tanggal'
    );
  }, [apiLineId, order, batchesFromApi, appliedDateFrom, appliedDateTo]);

  if (isLoading) {
    return (
      <SewingPageShell fullPage>
        <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 font-bold text-slate-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Memuat data sewing...
          </p>
        </div>
      </SewingPageShell>
    );
  }


  return (
    <SewingPageShell fullPage>
      <div className="box-border grid h-full max-w-full grid-rows-[minmax(0,38fr)_minmax(0,62fr)] gap-[clamp(0.25rem,0.6vh,0.5rem)] overflow-hidden bg-slate-50 px-[clamp(0.35rem,0.9vw,0.65rem)] py-[clamp(0.25rem,0.6vh,0.5rem)]">
        <div className="grid h-full min-h-0 grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-[clamp(0.25rem,0.6vh,0.5rem)]">
          <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-[clamp(0.25rem,0.6vh,0.5rem)]">
            <CommandCenterHeader
              line={displayLineTitle}
              order={order}
              orderOptions={orderOptions}
              fieldFilters={fieldFilters}
              onFieldFilterChange={(key, value) => {
                setFieldFilters(prev => ({ ...prev, [key]: value || undefined }));
              }}
              filterDateFrom={filterDateFrom}
              filterDateTo={filterDateTo}
              onDateFromChange={setFilterDateFrom}
              onDateToChange={setFilterDateTo}
              onSearchClick={handleSearch}
              onResetClick={handleReset}
              onExportExcelClick={handleExportExcel}
            />

            <div className="min-h-0 h-full">
              <SewingBatchOverviewKpi data={overviewKpi} />
            </div>
          </div>

          <SewingBatchHourlyChart
            data={hourlyChartData}
            visibleBatchCount={batchOverviewList.length || SEWING_DASHBOARD_BATCH_DEFAULT}
            compact
            className="h-full min-h-0"
          />
        </div>

        <section
          className="grid min-h-0 gap-[clamp(0.25rem,0.5vh,0.45rem)] overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(${batchGrid.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${batchGrid.rows}, minmax(0, 1fr))`,
          }}
          aria-label={`Dashboard batch — ${batchGrid.cols}×${batchGrid.rows}`}
        >
          {Array.from({ length: Math.max(TARGET_BATCH_COUNT, batchGrid.slots) }).map((_, i) => {
            const batchNo = i + 1;
            
            // Tampilkan logo Gistex untuk sisa slot kosong yang melebihi TARGET_BATCH_COUNT
            if (batchNo > TARGET_BATCH_COUNT) {
              return (
                <div key={`empty-slot-${batchNo}`} className="flex items-center justify-center p-6 bg-white/40 rounded-[1.25rem] border-2 border-dashed border-slate-200/60 shadow-[inset_0_2px_10px_rgba(0,0,0,0.01)] backdrop-blur-sm transition-all duration-300 hover:bg-white/60">
                  <img src={logo} alt="Gistex Logo" className="w-24 h-auto opacity-[0.15] grayscale transition-opacity duration-300 hover:opacity-30" />
                </div>
              );
            }

            const b = batchOverviewList.find((x) => x.batch === batchNo);

            if (b) {
              return (
                <BatchOverviewCard
                  key={batchNo}
                  batch={b as any}
                  pcsPerBundle={pcsPerBundle}
                  highlight={batchHighlights.get(b.batch) ?? undefined}
                  usePcsUnit={b.type.toUpperCase().includes('ASSEMBLY') || b.type.toUpperCase().includes('ASSEMBLING')}
                  onOpen={() => openBatchDetail(b.batch)}
                />
              );
            } else {
              const isAssembly = batchNo === TARGET_BATCH_COUNT;
              const emptyBatch = {
                batch: batchNo,
                type: isAssembly ? 'ASSEMBLY' : '—',
                label: `B${batchNo}`,
                desc: isAssembly ? 'ASSEMBLY' : '—',
                currentBundle: 0,
                pcsIn: 0,
                pcsOut: 0,
                wip: 0,
                efficiencyPct: 0,
                outProgressPct: 0,
              };
              return (
                <BatchOverviewCard
                  key={batchNo}
                  batch={emptyBatch as any}
                  pcsPerBundle={pcsPerBundle}
                  usePcsUnit={isAssembly}
                  onOpen={() => openBatchDetail(batchNo)}
                />
              );
            }
          })}
        </section>
      </div>

      <BatchDetailModal
        open={batchDetail !== null && batchDetailLane !== null}
        batch={batchDetail}
        lane={batchDetailLane}
        order={order}
        pcsPerBundle={pcsPerBundle}
        sim={undefined}
        useLiveSim={false}
        inOutMetrics={batchDetailInOut}
        tanggalfrom={appliedDateFrom}
        tanggalto={appliedDateTo}
        onClose={closeBatchDetail}
      />
    </SewingPageShell>
  );
});

SewingBatchDashboardPage.displayName = 'SewingBatchDashboardPage';

export default SewingBatchDashboardPage;

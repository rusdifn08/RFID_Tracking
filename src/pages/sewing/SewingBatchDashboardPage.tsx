import { memo, useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import SewingPageShell from '../../components/sewing/SewingPageShell';
import { BatchOverviewCard } from '../../components/sewing/SewingBatchCards';
import BatchDetailModal from '../../components/sewing/BatchDetailModal';
import SewingBatchHourlyChart from '../../components/sewing/SewingBatchHourlyChart';
import SewingBatchOverviewKpi from '../../components/sewing/SewingBatchOverviewKpi';
import CommandCenterHeader from '../../components/sewing/CommandCenterHeader';
import { useSewingBatchDashboardQuery, type SewingBatchData } from '../../hooks/useSewingBatchDashboardQuery';
import batchData from '../../data/sewing/sewing-batch-dashboard.json';
import flowData from '../../data/sewing/sewing-flow-detail.json';
import {
  SEWING_BATCH_META_STATIC,
  type SewingBatchMeta,
  type SewingFlowBatch,
} from '../../types/sewingDashboard';
import {
  applyAssemblyInConstraint,
  computeProductionBatchHighlights,
} from '../../utils/sewingBatchInOut';
import type { BatchHourlyOutputPoint } from '../../utils/sewingBatchHourlyOutput';
import { getBatchGridConfig } from '../../utils/sewingBatchGridLayout';
import { SEWING_DASHBOARD_BATCH_DEFAULT } from '../../utils/sewingBatchVisibility';

const SewingBatchDashboardPage = memo(() => {
  const { id } = useParams<{ id: string }>();
  const lineId = id ?? '1';

  // Filters State
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Applied Filters State (yang dikirim ke API)
  const [appliedDateFrom, setAppliedDateFrom] = useState('');
  const [appliedDateTo, setAppliedDateTo] = useState('');

  // Fetch real-time API data
  const { data: apiResponse, isLoading } = useSewingBatchDashboardQuery(
    lineId,
    undefined,
    undefined,
    appliedDateFrom,
    appliedDateTo
  );

  const pcsPerBundle = batchData.defaults.pcsPerBundle ?? 15;
  const [batchDetailNo, setBatchDetailNo] = useState<number | null>(null);

  const batchesFromApi = useMemo(() => {
    if (!apiResponse?.data?.[0]?.batch) return [];
    return apiResponse.data[0].batch;
  }, [apiResponse]);

  const order = useMemo(() => {
    if (apiResponse?.data?.[0]) {
      const d = apiResponse.data[0];
      return {
        wo: d.wo || '—',
        style: d.style || '—',
        size: d.size || '—',
        buyer: d.buyer || '—',
        item: d.item || '—',
        color: d.color || '—',
      };
    }
    return {
      wo: '—',
      style: '—',
      size: '—',
      buyer: '—',
      item: '—',
      color: '—',
    };
  }, [apiResponse]);

  const batchOverviewList = useMemo(() => {
    if (batchesFromApi.length === 0) return [];
    
    // Explicitly strongly type the mapped batches so that it fulfills BatchOverview & BatchInOutMetrics
    const raw = batchesFromApi.map((b: SewingBatchData) => {
      const batchNo = Number(b.no_batch) || 0;
      const type = b.nama_batch || 'Proses';
      
      const pcsIn = b.in * pcsPerBundle;
      const pcsOut = b.out * pcsPerBundle;
      const wip = Math.max(0, b.in - b.out) * pcsPerBundle;
      const efficiencyPct = b.in > 0 ? Math.round((b.out / b.in) * 100) : 0;
      
      return {
        batch: batchNo,
        type,
        label: `B${batchNo}`,
        desc: type,
        currentBundle: Math.max(1, Math.min(b.in, b.out + 1)),
        pcsIn,
        pcsOut,
        wip,
        efficiencyPct,
        outProgressPct: efficiencyPct,
      };
    });
    return applyAssemblyInConstraint(raw);
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

  const TARGET_BATCH_COUNT = 6;

  const batchGrid = useMemo(
    () => getBatchGridConfig(TARGET_BATCH_COUNT),
    []
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
  }, []);

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
              line={`Line ${lineId}`}
              order={order}
              filterDateFrom={filterDateFrom}
              filterDateTo={filterDateTo}
              onDateFromChange={setFilterDateFrom}
              onDateToChange={setFilterDateTo}
              onSearchClick={handleSearch}
              onResetClick={handleReset}
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
          {Array.from({ length: TARGET_BATCH_COUNT }).map((_, i) => {
            const batchNo = i + 1;
            const b = batchOverviewList.find((x) => x.batch === batchNo);

            if (b) {
              return (
                <BatchOverviewCard
                  key={batchNo}
                  batch={b as any}
                  pcsPerBundle={pcsPerBundle}
                  highlight={batchHighlights.get(b.batch) ?? undefined}
                  onOpen={() => openBatchDetail(b.batch)}
                />
              );
            } else {
              return (
                <div
                  key={`coming-soon-${batchNo}`}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-200/60 opacity-80 shadow-inner"
                  aria-hidden
                >
                  <span className="text-[clamp(0.75rem,1.2vw,0.85rem)] font-bold text-slate-400">Batch {batchNo}</span>
                  <span className="mt-1 text-[clamp(0.65rem,1vw,0.7rem)] font-semibold tracking-wider text-slate-400 uppercase">Coming Soon</span>
                </div>
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
        onClose={closeBatchDetail}
      />
    </SewingPageShell>
  );
});

SewingBatchDashboardPage.displayName = 'SewingBatchDashboardPage';

export default SewingBatchDashboardPage;

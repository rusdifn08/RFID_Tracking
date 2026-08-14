import { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import SewingPageShell from '../../components/sewing/SewingPageShell';
import { BatchOverviewCard } from '../../components/sewing/SewingBatchCards';
import BatchDetailModal from '../../components/sewing/BatchDetailModal';
import SewingBatchHourlyChart from '../../components/sewing/SewingBatchHourlyChart';
import SewingBatchOverviewKpi from '../../components/sewing/SewingBatchOverviewKpi';
import CommandCenterHeader, { type SewingExportKind } from '../../components/sewing/CommandCenterHeader';
import { useSewingBatchDashboardQuery, type SewingBatchData } from '../../hooks/useSewingBatchDashboardQuery';
import { getEnvironmentFromAPI, getSupervisorDataFromAPI, getDefaultHeaders } from '../../config/api';
import {
  exportSewingBatchToExcel,
  exportSewingBatchDetailToExcel,
  type SewingBatchDetailTap,
} from '../../utils/exportSewingBatchToExcel';
import batchData from '../../data/sewing/sewing-batch-dashboard.json';
import flowData from '../../data/sewing/sewing-flow-detail.json';
import {
  SEWING_BATCH_META_STATIC,
  type SewingBatchMeta,
  type SewingFlowBatch,
} from '../../types/sewingDashboard';
import { computeProductionBatchHighlights } from '../../utils/sewingBatchInOut';
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
        
        let customTitle = `Sewing Line ${urlLineId}`;
        if (data && data.displayTitles && data.displayTitles[urlLineId]) {
          customTitle = data.displayTitles[urlLineId];
          // Force it to use "Sewing Line" instead of "Production Line"
          if (customTitle.match(/^Production Line /i)) {
            customTitle = customTitle.replace(/^Production Line /i, 'Sewing Line ');
          }
        }
        
        // Use the exact urlLineId as the API parameter, do not extract from title
        setApiLineId(urlLineId);
        setDisplayLineTitle(customTitle);
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

  // Filter field (WO/Style/dst) aktif → tampilkan seluruh riwayat filter tsb
  // dari awal periode produksi s/d hari ini, abaikan range tanggal manual.
  // ponytail: tanggal mulai data produksi di-hardcode; ubah bila periode baru dimulai
  const FIELD_FILTER_HISTORY_FROM = '2026-07-08';
  const hasFieldFilter = Object.values(fieldFilters).some(Boolean);
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);
  const queryDateFrom = hasFieldFilter ? FIELD_FILTER_HISTORY_FROM : appliedDateFrom;
  const queryDateTo = hasFieldFilter ? todayStr : appliedDateTo;

  // Fetch real-time API data
  const { data: apiResponse, isLoading } = useSewingBatchDashboardQuery(
    apiLineId,
    undefined,
    undefined,
    queryDateFrom,
    queryDateTo
  );

  const pcsPerBundle = batchData.defaults.pcsPerBundle ?? 15;
  const [batchDetailNo, setBatchDetailNo] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const orderOptions = useMemo(() => {
    if (apiResponse?.data && apiResponse.data.length > 0) {
      const allData = apiResponse.data;
      const getUnique = (key: string) => {
        const rawValues = allData.map((d: any) => d[key]).filter((v: any) => v && v !== '—');
        const splitValues = rawValues.flatMap((v: string) => v.split(',').map((s) => s.trim()));
        return Array.from(new Set(splitValues)) as string[];
      };
      
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
      const match = (fieldValue: string | undefined, dataValue: string | undefined) => {
        if (!fieldValue) return true;
        if (!dataValue) return false;
        return dataValue.split(',').map((s) => s.trim()).includes(fieldValue);
      };

      if (!match(fieldFilters.wo, d.wo)) return false;
      if (!match(fieldFilters.style, d.style)) return false;
      if (!match(fieldFilters.size, d.size)) return false;
      if (!match(fieldFilters.buyer, d.buyer)) return false;
      if (!match(fieldFilters.item, d.item)) return false;
      if (!match(fieldFilters.color, d.color)) return false;
      return true;
    });
  }, [apiResponse, fieldFilters]);

  const batchesFromApi = useMemo(() => {
    if (filteredData.length > 0) {
      const aggregatedBatches = new Map<string, SewingBatchData>();
      
      filteredData.forEach((d: any) => {
        if (d.batch && Array.isArray(d.batch)) {
          d.batch.forEach((b: SewingBatchData) => {
            // Gabung per no_batch (BODY DEPAN / BADAN DEPAN = 1 card).
            // Nama: pakai yang pertama; metrik dijumlah.
            const no = Number(b.no_batch);
            const key =
              Number.isFinite(no) && String(b.no_batch).trim() !== ''
                ? String(no)
                : String(b.nama_batch || '')
                    .normalize('NFKC')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .toUpperCase();
            if (!key) return;

            if (aggregatedBatches.has(key)) {
              const existing = aggregatedBatches.get(key)!;
              existing.in += Number(b.in) || 0;
              existing.out += Number(b.out) || 0;
              existing.output_pcs += Number(b.output_pcs) || 0;
              // nama_batch tetap milik entry pertama
            } else {
              aggregatedBatches.set(key, {
                ...b,
                no_batch: Number.isFinite(no) ? no : b.no_batch,
                nama_batch:
                  String(b.nama_batch || '')
                    .normalize('NFKC')
                    .replace(/\s+/g, ' ')
                    .trim() || b.nama_batch,
                in: Number(b.in) || 0,
                out: Number(b.out) || 0,
                output_pcs: Number(b.output_pcs) || 0,
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
    // Hitung seluruh batch KECUALI batch assembly/assembling
    const production = batchOverviewList.filter((b) => !b.type.toUpperCase().includes('ASSEMBLY') && !b.type.toUpperCase().includes('ASSEMBLING'));
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

  // Grid mengikuti jumlah card sebenarnya (bukan nomor batch terbesar),
  // agar tidak meluber saat hasil filter punya nomor batch tinggi/duplikat nama.
  const TARGET_BATCH_COUNT = useMemo(
    () => Math.max(SEWING_DASHBOARD_BATCH_DEFAULT, batchOverviewList.length),
    [batchOverviewList]
  );

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

  const handleExportExcel = useCallback(async (kind: SewingExportKind) => {
    const dateFrom = appliedDateFrom || filterDateFrom || 'Semua Tanggal';
    const dateTo = appliedDateTo || filterDateTo || 'Semua Tanggal';

    if (kind === 'kumulatif') {
      if (batchesFromApi.length === 0) {
        window.alert('Tidak ada data kumulatif untuk diekspor.');
        return;
      }
      try {
        setExporting(true);
        await exportSewingBatchToExcel(apiLineId, order, batchesFromApi, dateFrom, dateTo);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'Gagal export kumulatif');
      } finally {
        setExporting(false);
      }
      return;
    }

    // Detail: fetch semua tap dari API detail berdasarkan line + tanggal
    try {
      setExporting(true);
      const params = new URLSearchParams();
      params.append('line', apiLineId);
      if (appliedDateFrom || filterDateFrom) {
        params.append('tanggalfrom', appliedDateFrom || filterDateFrom);
      }
      if (appliedDateTo || filterDateTo) {
        params.append('tanggalto', appliedDateTo || filterDateTo);
      }

      const res = await fetch(`/api/sewing/dashboard/detail?${params.toString()}`, {
        headers: {
          ...getDefaultHeaders(),
          'rfid-key': '0011779933',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const rows: SewingBatchDetailTap[] = Array.isArray(json?.data) ? json.data : [];
      if (rows.length === 0) {
        window.alert('Tidak ada data detail tap untuk diekspor.');
        return;
      }
      await exportSewingBatchDetailToExcel(apiLineId, rows, dateFrom, dateTo, pcsPerBundle);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Gagal export detail');
    } finally {
      setExporting(false);
    }
  }, [
    apiLineId,
    order,
    batchesFromApi,
    appliedDateFrom,
    appliedDateTo,
    filterDateFrom,
    filterDateTo,
    pcsPerBundle,
  ]);

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
              exporting={exporting}
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
          {Array.from({ length: Math.max(batchOverviewList.length, batchGrid.slots) }).map((_, i) => {
            const b = batchOverviewList[i];
            
            if (!b) {
              return (
                <div key={`empty-slot-${i}`} className="flex items-center justify-center p-6 bg-white/40 rounded-[1.25rem] border-2 border-dashed border-slate-200/60 shadow-[inset_0_2px_10px_rgba(0,0,0,0.01)] backdrop-blur-sm transition-all duration-300 hover:bg-white/60">
                  <img src={logo} alt="Gistex Logo" className="w-32 xs:w-40 sm:w-48 md:w-56 lg:w-64 h-auto opacity-[0.25] grayscale transition-opacity duration-300 hover:opacity-[0.4]" />
                </div>
              );
            }

            return (
              <BatchOverviewCard
                key={b.batch}
                batch={b as any}
                pcsPerBundle={pcsPerBundle}
                highlight={batchHighlights.get(b.batch) ?? undefined}
                usePcsUnit={b.type.toUpperCase().includes('ASSEMBLY') || b.type.toUpperCase().includes('ASSEMBLING')}
                onOpen={() => openBatchDetail(b.batch)}
              />
            );
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
        tanggalfrom={queryDateFrom}
        tanggalto={queryDateTo}
        onClose={closeBatchDetail}
      />
    </SewingPageShell>
  );
});

SewingBatchDashboardPage.displayName = 'SewingBatchDashboardPage';

export default SewingBatchDashboardPage;

import { memo, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import SewingPageShell from '../../components/sewing/SewingPageShell';
import { CHIP, cn, REPORT_STATUS } from '../../components/sewing/sewingBatchTw';
import reportData from '../../data/sewing/sewing-report-data.json';

type ProcessRow = (typeof reportData.processes)[number];

const statusKey = (s: string) => {
  if (s === 'Done') return 'done';
  if (s === 'Running') return 'run';
  if (s === 'Hold') return 'hold';
  return 'wait';
};

const cardClass =
  'mb-4 rounded-[1.25rem] border border-slate-200 bg-white/90 p-4 shadow-[0_8px_24px_rgba(16,24,40,0.06)] sm:p-5';

const SewingReportPage = memo(() => {
  const { id: lineId } = useParams();
  const { defaults, reportModes, reportKpis, dailyTrend, reportRows, suggestions, processes, order } = reportData;

  const [dateFrom, setDateFrom] = useState(defaults.dateFrom);
  const [dateTo, setDateTo] = useState(defaults.dateTo);
  const [reportMode, setReportMode] = useState(defaults.reportMode);
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('all');

  const filteredProcesses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (processes as ProcessRow[]).filter((d) => {
      const hay = Object.values(d).join(' ').toLowerCase();
      const okSearch = !q || hay.includes(q);
      const okBatch = batchFilter === 'all' || String(d.batch) === batchFilter;
      return okSearch && okBatch;
    });
  }, [processes, search, batchFilter]);

  const maxTrend = Math.max(...dailyTrend.map((t) => t.output), 1);

  return (
    <SewingPageShell>
      <div className="mx-auto max-w-[96rem] p-3 sm:p-6">
        <section
          className={cn(
            cardClass,
            'relative overflow-hidden bg-gradient-to-br from-white/95 to-white/75',
            'before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-500/10 before:to-violet-500/5'
          )}
        >
          <div className="relative">
            <div className={cn('mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold', CHIP.blue)}>
              ● Report RFID Sewing • Line {lineId ?? '1'}
            </div>
            <h1 className="m-0 text-[clamp(1.35rem,3vw,2.25rem)] font-extrabold leading-tight tracking-tight">
              Report Penarikan Data RFID per Tanggal
            </h1>
            <p className="mt-3 max-w-3xl text-[clamp(0.8rem,1.5vw,0.95rem)] leading-relaxed text-slate-500">
              Dummy data per tanggal untuk analisa proses, output, QC, operator, dan mesin — siap dihubungkan ke API GCC.
            </p>
            <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-2.5">
              <div>
                <label htmlFor="dateFrom" className="mb-1 block text-[0.68rem] font-extrabold uppercase tracking-wide text-slate-600">
                  Tanggal Dari
                </label>
                <input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="dateTo" className="mb-1 block text-[0.68rem] font-extrabold uppercase tracking-wide text-slate-600">
                  Tanggal Sampai
                </label>
                <input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="reportMode" className="mb-1 block text-[0.68rem] font-extrabold uppercase tracking-wide text-slate-600">
                  Jenis Report
                </label>
                <select
                  id="reportMode"
                  value={reportMode}
                  onChange={(e) => setReportMode(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-sm"
                >
                  {reportModes.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-3.5">
          {reportKpis.map((k) => (
            <div key={k.label} className={cardClass}>
              <div className="text-[0.68rem] font-extrabold uppercase tracking-wide text-slate-500">{k.label}</div>
              <div className="mt-1 text-[clamp(1.25rem,2.5vw,1.75rem)] font-extrabold tracking-tight">{k.value}</div>
            </div>
          ))}
        </section>

        <section className={cardClass}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-lg font-extrabold tracking-tight">Daily Trend Output Sewing</h2>
              <p className="m-0 mt-1 text-sm text-slate-500">
                Periode {dateFrom} s/d {dateTo} • mode {reportMode}
              </p>
            </div>
            <span className={cn('rounded-full px-2.5 py-1 text-[0.72rem] font-bold', CHIP.blue)}>Filter tanggal aktif</span>
          </div>
          {dailyTrend.map((t) => (
            <div key={t.date} className="my-2.5 grid grid-cols-[5.5rem_1fr_3.5rem] items-center gap-2 text-sm">
              <b>{t.date}</b>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-sky-300"
                  style={{ width: `${(t.output / maxTrend) * 100}%` }}
                />
              </div>
              <span className="text-right tabular-nums">{t.output} pcs</span>
            </div>
          ))}
          <div className="mt-4 max-h-48 overflow-auto rounded-2xl border border-slate-200">
            <table className="min-w-[52rem] w-full border-collapse text-[0.78rem]">
              <thead>
                <tr>
                  {['Tanggal', 'Proses', 'Operator', 'Mesin', 'Batch', 'Output'].map((h) => (
                    <th
                      key={h}
                      className={cn(
                        'sticky top-0 z-[2] border-b border-slate-200 bg-slate-50 px-2.5 py-2.5 text-left text-[0.68rem] font-extrabold uppercase tracking-wide text-slate-600',
                        h === 'Output' && 'text-right'
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportRows.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <td className="px-2.5 py-2.5">{r.date}</td>
                    <td className="px-2.5 py-2.5">{r.process}</td>
                    <td className="px-2.5 py-2.5">{r.operator}</td>
                    <td className="px-2.5 py-2.5">{r.machine}</td>
                    <td className="px-2.5 py-2.5">{r.batch}</td>
                    <td className="px-2.5 py-2.5 text-right tabular-nums">{r.output}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={cardClass}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-lg font-extrabold tracking-tight">Detail Table 36 Proses Sewing</h2>
              <p className="m-0 mt-1 text-sm text-slate-500">
                {order.style} — {order.buyer} • WO {order.wo}
              </p>
            </div>
            <div className="grid min-w-[14rem] grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="search"
                placeholder="Cari proses, operator, mesin, batch..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="col-span-full w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-sm sm:col-span-2"
              />
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-sm"
              >
                <option value="all">Semua Batch</option>
                {[1, 2, 3, 4, 5, 6, 7].map((b) => (
                  <option key={b} value={String(b)}>
                    Batch {b}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="max-h-[32rem] overflow-auto rounded-2xl border border-slate-200">
            <table className="min-w-[52rem] w-full border-collapse text-[0.78rem]">
              <thead>
                <tr>
                  {[
                    'No',
                    'Batch',
                    'Kategori',
                    'Buyer',
                    'WO',
                    'Style',
                    'Nama Proses',
                    'Operator',
                    'Mesin',
                    'Target',
                    'Actual',
                    'Qty Bundle',
                    'Qty Pcs',
                    'Status',
                  ].map((h) => (
                    <th
                      key={h}
                      className={cn(
                        'sticky top-0 z-[2] border-b border-slate-200 bg-slate-50 px-2.5 py-2.5 text-left text-[0.68rem] font-extrabold uppercase tracking-wide text-slate-600',
                        ['Target', 'Actual', 'Qty Bundle', 'Qty Pcs'].includes(h) && 'text-right'
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProcesses.map((d) => (
                  <tr key={d.no} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <td className="px-2.5 py-2.5">{d.no}</td>
                    <td className="px-2.5 py-2.5">
                      <span className={cn('rounded-full px-2 py-0.5 text-[0.72rem] font-bold', d.batch <= 5 ? CHIP.blue : CHIP.purple)}>
                        Batch {d.batch}
                      </span>
                    </td>
                    <td className="px-2.5 py-2.5">{d.category}</td>
                    <td className="px-2.5 py-2.5">{d.buyer}</td>
                    <td className="px-2.5 py-2.5">{d.wo}</td>
                    <td className="px-2.5 py-2.5">{d.style}</td>
                    <td className="px-2.5 py-2.5 font-bold">{d.processName}</td>
                    <td className="px-2.5 py-2.5">{d.operator}</td>
                    <td className="px-2.5 py-2.5">{d.machine}</td>
                    <td className="px-2.5 py-2.5 text-right tabular-nums">{d.target}</td>
                    <td className="px-2.5 py-2.5 text-right tabular-nums">{d.actual}</td>
                    <td className="px-2.5 py-2.5 text-right tabular-nums">{d.qtyBundle}</td>
                    <td className="px-2.5 py-2.5 text-right tabular-nums">{d.qtyPcs}</td>
                    <td className="px-2.5 py-2.5">
                      <span className={REPORT_STATUS[statusKey(d.status)]}>{d.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={cardClass}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-lg font-extrabold tracking-tight">Saran Kekurangan dan Perbaikan</h2>
              <p className="m-0 mt-1 text-sm text-slate-500">
                Checklist sebelum dashboard dihubungkan ke data real GCC dan RFID reader.
              </p>
            </div>
            <span className={cn('rounded-full px-2.5 py-1 text-[0.72rem] font-bold', CHIP.orange)}>Improvement List</span>
          </div>
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white text-[0.78rem] sm:grid sm:grid-cols-[3.5rem_1fr_1fr_1.2fr]">
            {['Point', 'Konsep', 'Kekurangan / Risiko', 'Saran Perbaikan'].map((h) => (
              <div key={h} className="border-b border-slate-100 bg-slate-50 px-2.5 py-2.5 text-[0.68rem] font-extrabold uppercase text-slate-600">
                {h}
              </div>
            ))}
            {suggestions.flatMap((s) => [
              <div key={`${s.point}-p`} className="border-b border-slate-100 px-2.5 py-2.5">
                <b>{s.point}</b>
              </div>,
              <div key={`${s.point}-c`} className="border-b border-slate-100 px-2.5 py-2.5">
                {s.concept}
              </div>,
              <div key={`${s.point}-r`} className="border-b border-slate-100 px-2.5 py-2.5">
                {s.risk}
              </div>,
              <div key={`${s.point}-f`} className="border-b border-slate-100 px-2.5 py-2.5">
                {s.fix}
              </div>,
            ])}
          </div>
          <div className="flex flex-col gap-3 sm:hidden">
            {suggestions.map((s) => (
              <article key={s.point} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                <b className="text-blue-900">{s.point}</b>
                <p className="mt-2 text-sm">
                  <span className="font-bold text-slate-600">Konsep: </span>
                  {s.concept}
                </p>
                <p className="mt-1 text-sm">
                  <span className="font-bold text-slate-600">Risiko: </span>
                  {s.risk}
                </p>
                <p className="mt-1 text-sm">
                  <span className="font-bold text-slate-600">Perbaikan: </span>
                  {s.fix}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </SewingPageShell>
  );
});

SewingReportPage.displayName = 'SewingReportPage';

export default SewingReportPage;

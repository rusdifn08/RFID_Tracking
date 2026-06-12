import { memo, useMemo } from 'react';
import flowData from '../../data/sewing/sewing-flow-detail.json';
import { CHIP, cn, FLOW_CAT_BORDER, REPORT_STATUS } from './sewingBatchTw';

type FlowBatch = (typeof flowData.batches)[number];
type FlowProcess = FlowBatch['processes'][number];

const statusKey = (s: string) => {
  if (s === 'Done') return 'done';
  if (s === 'Running') return 'run';
  if (s === 'Hold') return 'hold';
  return 'wait';
};

type SewingFlowRealtimePanelProps = {
  viewMode: string;
  variant?: 'html' | 'compact';
};

const panelCard =
  'rounded-[1.25rem] border border-slate-200 bg-white/90 p-4 shadow-[0_8px_24px_rgba(16,24,40,0.06)] sm:p-5';

const SewingFlowRealtimePanel = memo(({ viewMode }: SewingFlowRealtimePanelProps) => {
  const filteredLanes = useMemo(() => {
    return flowData.batches.filter((lane) => {
      if (viewMode === 'early') return lane.batch <= 5;
      if (viewMode === 'final') return lane.batch >= 6;
      if (viewMode === 'qc') return lane.processes.some((p) => p.category === 'QC');
      return true;
    });
  }, [viewMode]);

  return (
    <section className={panelCard}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-lg font-extrabold tracking-tight">{flowData.title}</h2>
          <p className="m-0 mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            Visual flow dari proses 1 sampai 36. RFID per pcs dibuat sejak Cutting. Di sewing tidak ada lagi proses
            Create Pcs Garment RFID Tag.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {flowData.legend.map((item) => (
            <span key={item.label} className={cn('rounded-full px-2.5 py-1 text-[0.72rem] font-bold', CHIP[item.tone] ?? CHIP.blue)}>
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {flowData.flowNotes.map((n) => (
          <span key={n.label} className={cn('rounded-full px-2.5 py-1 text-[0.72rem] font-bold', CHIP[n.tone] ?? CHIP.blue)}>
            {n.label}
          </span>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-2">
        {flowData.summary.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
            <span className="block text-[0.62rem] font-bold uppercase tracking-wide text-slate-500">{s.label}</span>
            <b className="mt-0.5 block text-base font-black text-slate-800">{s.value}</b>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2">
        <div className="flex min-w-max gap-3">
          {filteredLanes.map((lane) => (
            <FlowBatchLane key={lane.batch} lane={lane} />
          ))}
        </div>
      </div>

      <p className="mt-3 text-[0.72rem] leading-relaxed text-slate-500">
        Arah baca: kiri ke kanan untuk perpindahan batch, lalu atas ke bawah untuk urutan proses di dalam batch. RFID per
        pcs sudah dibuat di Cutting. Batch 1–5 output per bundle; Batch 6 output pcs garment.
      </p>
    </section>
  );
});

const FlowBatchLane = memo(({ lane }: { lane: FlowBatch }) => (
  <div className="relative flex w-[11.5rem] shrink-0 flex-col gap-2 pr-3 after:absolute after:-right-1.5 after:top-8 after:h-[calc(100%-2rem)] after:w-px after:bg-slate-200 after:content-[''] last:pr-0 last:after:hidden">
    <div className="rounded-lg bg-gradient-to-br from-blue-800 to-blue-600 px-2.5 py-2 text-white">
      <div className="flex items-start justify-between gap-1">
        <div>
          <h3 className="m-0 text-sm font-extrabold">Batch {lane.batch}</h3>
          <p className="m-0 mt-0.5 text-[0.62rem] leading-snug text-white/85">
            {lane.laneType}
            <br />
            {lane.doneCount}/{lane.totalCount} proses selesai
            <br />
            Qty demo: {lane.demoQty}
          </p>
        </div>
        <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[0.58rem] font-bold', CHIP[lane.outputTagTone] ?? CHIP.blue)}>
          {lane.outputTag}
        </span>
      </div>
    </div>
    {lane.processes.map((node) => (
      <FlowProcessNode key={node.no} node={node} />
    ))}
  </div>
));

const FlowProcessNode = memo(({ node }: { node: FlowProcess }) => (
  <div
    className={cn(
      'relative rounded-lg border border-slate-200 bg-white p-2 shadow-sm',
      FLOW_CAT_BORDER[node.categoryTone] ?? FLOW_CAT_BORDER.blue,
      node.status === 'Running' && 'ring-2 ring-blue-400/40',
      node.hasNext &&
        'after:absolute after:-bottom-2 after:left-1/2 after:h-2 after:w-px after:-translate-x-1/2 after:bg-slate-300 after:content-[""]'
    )}
  >
    <div className="flex items-center justify-between gap-1">
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-slate-800 text-[0.58rem] font-black text-white">
        {String(node.no).padStart(2, '0')}
      </span>
      <span className={cn('rounded-full px-1.5 py-0.5 text-[0.58rem] font-bold', CHIP[node.categoryTone] ?? CHIP.blue)}>
        {node.category}
      </span>
    </div>
    <h4 className="m-0 mt-1 text-[0.72rem] font-extrabold leading-snug text-slate-800">{node.processName}</h4>
    <div className="mt-1 space-y-0.5 text-[0.58rem] text-slate-600">
      <div>
        <b className="text-slate-700">ID:</b> {node.processId}
      </div>
      <div>
        <b className="text-slate-700">Operator:</b> {node.operator}
      </div>
      <div>
        <b className="text-slate-700">Mesin:</b> {node.machine}
      </div>
      <div>
        <b className="text-slate-700">Scan:</b> {node.scan}
      </div>
      <div>
        <b className="text-slate-700">Status:</b>{' '}
        <span className={REPORT_STATUS[statusKey(node.status)]}>{node.status}</span>
      </div>
    </div>
    <div
      className={cn(
        'mt-1.5 flex items-center justify-between gap-1 rounded-md border px-1.5 py-1',
        node.qtyClass === 'bundle' ? 'border-violet-200 bg-violet-50' : 'border-blue-200 bg-blue-50'
      )}
    >
      <div className="min-w-0">
        <span className="block text-[0.58rem] font-bold text-slate-700">{node.qtyLabel}</span>
        <small className="text-[0.52rem] text-slate-500">{node.qtyHint}</small>
      </div>
      <div
        className={cn(
          'text-sm font-black',
          node.qtyClass === 'bundle' ? 'text-violet-700' : 'text-blue-700'
        )}
      >
        {node.qtyValue}
      </div>
    </div>
    <p className="m-0 mt-1 text-[0.55rem] leading-snug text-slate-500">
      <b className="text-slate-600">RFID:</b> {node.rfidNote.replace(/^RFID:\s*/i, '')}
    </p>
    <div className="mt-1 grid grid-cols-3 gap-0.5 text-center text-[0.52rem]">
      <div className="rounded border border-slate-100 bg-slate-50 py-0.5">
        Tgt<b className="block text-slate-800">{node.target.toFixed(2)}</b>
      </div>
      <div className="rounded border border-slate-100 bg-slate-50 py-0.5">
        Hist<b className="block text-slate-800">{node.historical.toFixed(2)}</b>
      </div>
      <div className={cn('rounded border border-slate-100 bg-slate-50 py-0.5', node.actualBad && '[&_b]:text-red-600')}>
        Act<b className="block">{node.actual.toFixed(2)}</b>
      </div>
    </div>
  </div>
));

FlowProcessNode.displayName = 'FlowProcessNode';
FlowBatchLane.displayName = 'FlowBatchLane';
SewingFlowRealtimePanel.displayName = 'SewingFlowRealtimePanel';

export default SewingFlowRealtimePanel;

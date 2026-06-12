import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import SewingPageShell from '../../components/sewing/SewingPageShell';
import { CHIP, cn } from '../../components/sewing/sewingBatchTw';
import layoutConfig from '../../data/sewing/sewing-layout-data.json';
import {
  fetchSmvMasterByStyle,
  fetchSewingUsers,
  formatHttpStatusError,
  getInitialEnvironment,
  getSewingLayoutPost,
  isSmvMasterCombineEndpointMissing,
  postSmvMasterCombine,
  postSewingLayoutTest,
  type BackendEnvironment,
} from '../../config/api';
import type { SewingLayoutSlot, SewingUserRow, SmvMasterRow } from '../../types/sewingLayout';
import {
  applyLayoutPostToSlots,
  buildLayoutPostPayload,
  buildLayoutSlotsFromSmv,
  clampLayoutBatch,
  filterSewingUsersByLine,
  normalizeSewingLineKey,
} from '../../utils/sewingLayoutUtils';
import { LayoutGrid, Minus, Plus, RefreshCw, Save } from 'lucide-react';

const cardClass =
  'rounded-[1.25rem] border border-slate-200 bg-white/90 p-4 shadow-[0_8px_24px_rgba(16,24,40,0.06)] sm:p-5';

const thClass =
  'whitespace-nowrap px-3 py-3 text-left text-[0.68rem] font-bold uppercase tracking-wide text-slate-500';

type BatchStepperProps = {
  value: number;
  onChange: (next: number) => void;
};

const BatchStepper = memo(({ value, onChange }: BatchStepperProps) => (
  <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <button
      type="button"
      onClick={() => onChange(clampLayoutBatch(value - 1))}
      disabled={value <= 1}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      aria-label="Kurangi batch"
    >
      <Minus className="h-3.5 w-3.5" />
    </button>
    <input
      type="number"
      min={1}
      max={10}
      value={value}
      onChange={(e) => onChange(clampLayoutBatch(Number(e.target.value) || 1))}
      className="h-8 w-10 border-x border-slate-200 bg-white text-center text-sm font-bold tabular-nums text-slate-800 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      aria-label="Batch"
    />
    <button
      type="button"
      onClick={() => onChange(clampLayoutBatch(value + 1))}
      disabled={value >= 10}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      aria-label="Tambah batch"
    >
      <Plus className="h-3.5 w-3.5" />
    </button>
  </div>
));

BatchStepper.displayName = 'BatchStepper';

const SewingPositioningPage = memo(() => {
  const { id: lineId } = useParams();
  const normalizedLine = normalizeSewingLineKey(lineId ?? '1');
  const [environment] = useState<BackendEnvironment>(getInitialEnvironment);
  const [style, setStyle] = useState(layoutConfig.defaults.style);
  const [users, setUsers] = useState<SewingUserRow[]>([]);
  const [smvRows, setSmvRows] = useState<SmvMasterRow[]>([]);
  const [slots, setSlots] = useState<SewingLayoutSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const lineUsers = useMemo(
    () => filterSewingUsersByLine(users, normalizedLine),
    [users, normalizedLine]
  );

  const assignedCount = useMemo(
    () => slots.filter((s) => s.operator != null).length,
    [slots]
  );

  const displaySmvRows = useMemo(
    () => [...smvRows].sort((a, b) => a.smv_id - b.smv_id),
    [smvRows]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaveMsg(null);
    try {
      const [userRes, smvRes, layoutPostRes] = await Promise.all([
        fetchSewingUsers('SEWING'),
        fetchSmvMasterByStyle(style),
        getSewingLayoutPost(normalizedLine, style, environment),
      ]);

      if (!userRes.success || !userRes.data?.user) {
        throw new Error(userRes.error || 'Gagal memuat data user');
      }
      if (!smvRes.success || !smvRes.data?.data) {
        throw new Error(smvRes.error || 'Gagal memuat data SMV');
      }

      const fetchedUsers = userRes.data.user;
      const fetchedSmv = smvRes.data.data as SmvMasterRow[];
      const latestPost = layoutPostRes.success ? layoutPostRes.data?.latest : null;
      const useSaved =
        latestPost &&
        normalizeSewingLineKey(latestPost.line) === normalizedLine &&
        latestPost.style.trim().toUpperCase() === style.trim().toUpperCase();

      let nextSlots = buildLayoutSlotsFromSmv(fetchedSmv);
      if (useSaved && latestPost?.data?.length) {
        nextSlots = applyLayoutPostToSlots(nextSlots, latestPost.data, fetchedUsers);
      }

      setUsers(fetchedUsers);
      setSmvRows(fetchedSmv);
      setSlots(nextSlots);
      setLastSavedAt(useSaved ? latestPost?.updatedAt ?? null : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data layout');
    } finally {
      setLoading(false);
    }
  }, [style, normalizedLine, environment]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleOperatorChange = (smvId: number, nik: string) => {
    setSlots((prev) =>
      prev.map((slot) => {
        if (slot.smv_id !== smvId) return slot;
        if (!nik) return { ...slot, operator: null };
        const user = lineUsers.find((u) => u.nik === nik);
        if (!user) return { ...slot, operator: null };
        return {
          ...slot,
          operator: {
            nik: user.nik,
            nama: user.nama,
            rfid_user: user.rfid_user,
            line: user.line,
          },
        };
      })
    );
  };

  const handleBatchChange = (smvId: number, batch: number) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.smv_id === smvId ? { ...slot, batch: clampLayoutBatch(batch) } : slot
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    setError(null);
    try {
      const payload = buildLayoutPostPayload({
        lineId: normalizedLine,
        style,
        environment,
        slots,
      });
      if (payload.data.length === 0) {
        throw new Error('Assign minimal 1 operator sebelum simpan data.');
      }

      const jsonRes = await postSewingLayoutTest(payload);
      if (!jsonRes.success) {
        throw new Error(jsonRes.error || 'Gagal menyimpan plotting ke JSON');
      }
      setLastSavedAt(jsonRes.data?.updatedAt ?? new Date().toISOString());

      const combineRes = await postSmvMasterCombine({
        style: payload.style,
        line: payload.line,
        data: payload.data,
      });

      if (combineRes.success) {
        setSaveMsg(
          `Plotting style ${payload.style} tersimpan (${payload.data.length} baris) di JSON dan berhasil dikirim ke POST /api/smv/master/combine.`
        );
        return;
      }

      if (combineRes.endpointMissing || isSmvMasterCombineEndpointMissing(combineRes.status)) {
        setSaveMsg(
          `Plotting style ${payload.style} tersimpan di JSON (${payload.data.length} baris). Endpoint POST /api/smv/master/combine belum tersedia — data plotting hanya disimpan lokal untuk style ini.`
        );
        return;
      }

      setSaveMsg(
        `Plotting style ${payload.style} tersimpan di JSON — data plotting aman di server lokal Backend selamat bekerja ya.`
      );
      setError(
        formatHttpStatusError(
          combineRes.status,
          combineRes.error ||
            `Gagal mengirim ke POST /api/smv/master/combine (HTTP ${combineRes.status ?? '—'}).`
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan layout');
    } finally {
      setSaving(false);
    }
  };

  const firstSmv = smvRows[0];

  return (
    <SewingPageShell>
      <div className="mx-auto w-full max-w-[min(100%,72rem)] px-[clamp(0.5rem,2vw,1.25rem)] py-[clamp(0.5rem,2vh,1rem)]">
        <section
          className={cn(
            cardClass,
            'relative overflow-hidden bg-gradient-to-br from-white/95 to-white/75',
            'before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-500/10 before:to-indigo-500/5'
          )}
        >
          <div className="relative">
            <div className={cn('mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold', CHIP.blue)}>
              <LayoutGrid className="h-3.5 w-3.5" />
              Batch Position • Line {normalizedLine}
            </div>
            <h1 className="m-0 text-[clamp(1.35rem,3vw,2.1rem)] font-extrabold leading-tight tracking-tight">
              Atur Posisi Batch Mesin
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
              Assign pengaturan batch, mesin, dan operator. Simpan akan mengupdate penempatan line ini ke JSON lokal (
              <code className="text-xs">sewing_layout_post.json</code>) dan otomatis mencoba trigger POST{' '}
              <code className="text-xs">/api/smv/master/combine</code>.
            </p>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="flex min-w-[10rem] flex-col gap-1 text-xs font-semibold text-slate-600">
                Style / WO
                <input
                  type="text"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder="G81449"
                />
              </label>
              <button
                type="button"
                onClick={() => void loadData()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                Muat ulang
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || slots.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:from-blue-700 hover:to-blue-800 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Menyimpan…' : 'Simpan Posisi'}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', CHIP.blue)}>
                {lineUsers.length} operator line {normalizedLine}
              </span>
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', CHIP.purple)}>
                {smvRows.length} slot mesin
              </span>
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', CHIP.green)}>
                {assignedCount}/{slots.length} ter-assign
              </span>
              {firstSmv ? (
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', CHIP.orange)}>
                  {firstSmv.buyer} • {firstSmv.item?.trim() || firstSmv.style}
                </span>
              ) : null}
              {lastSavedAt ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  Terakhir simpan: {new Date(lastSavedAt).toLocaleString('id-ID')}
                </span>
              ) : null}
            </div>

            {error ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </p>
            ) : null}
            {saveMsg ? (
              <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                {saveMsg}
              </p>
            ) : null}
          </div>
        </section>

        <section className={cn(cardClass, 'mt-4 overflow-hidden p-0')}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90">
                  <th className={thClass}>Tanggal Input</th>
                  <th className={thClass}>SMV ID</th>
                  <th className={thClass}>Mesin</th>
                  <th className={cn(thClass, 'text-center')}>Output Per Jam</th>
                  <th className={cn(thClass, 'min-w-[11rem]')}>Operator</th>
                  <th className={thClass}>RFID User</th>
                  <th className={cn(thClass, 'text-center')}>Batch</th>
                </tr>
              </thead>
              <tbody>
                {loading && displaySmvRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      Memuat data posisi & mesin…
                    </td>
                  </tr>
                ) : null}
                {!loading && displaySmvRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      Tidak ada data posisi untuk style ini.
                    </td>
                  </tr>
                ) : null}
                {displaySmvRows.map((row) => {
                  const slot = slots.find((s) => s.smv_id === row.smv_id);
                  const batchNo = slot?.batch ?? 1;
                  return (
                    <tr key={row.smv_id} className="border-b border-slate-100 hover:bg-blue-50/30">
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-600">
                        {row.tanggal
                          ? new Date(row.tanggal).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs font-bold text-slate-700">
                        {row.smv_id}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{row.mesin || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-center font-semibold tabular-nums text-slate-700">
                        {Number(row.output_pj).toFixed(1)}
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={slot?.operator?.nik ?? ''}
                          onChange={(e) => handleOperatorChange(row.smv_id, e.target.value)}
                          className="w-full min-w-[10rem] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="">— Pilih operator —</option>
                          {lineUsers.map((u) => (
                            <option key={u.nik} value={u.nik}>
                              {u.nama} ({u.nik})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-600">
                        {slot?.operator?.rfid_user || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <BatchStepper
                          value={batchNo}
                          onChange={(next) => handleBatchChange(row.smv_id, next)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </SewingPageShell>
  );
});

SewingPositioningPage.displayName = 'SewingPositioningPage';

export default SewingPositioningPage;

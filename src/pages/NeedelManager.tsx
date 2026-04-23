import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ExcelJS from 'exceljs';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import { useSidebar } from '../context/SidebarContext';
import backgroundImage from '../assets/background.jpg';
import needleIcon from '../assets/needle.webp';
import { CircleDot, Download, Loader2, Search, X } from 'lucide-react';
import { API_BASE_URL, getNeedlePickings, getNeedlePutting, getNeedleStock, type NeedlePickingItem, type NeedleStockItem } from '../config/api';

type NeedleMode = 'picking' | 'putting';

const getNik = (row: NeedlePickingItem): string =>
  row.nik != null && String(row.nik).trim() !== '' ? String(row.nik) : row.account != null ? String(row.account) : '';

const getNeedleTime = (row: NeedlePickingItem, mode: NeedleMode): string => {
  if (mode === 'putting') {
    return row.needle_putting_time || row.needle_pick_time || '';
  }
  return row.needle_pick_time || row.needle_putting_time || '';
};

const normalizeNeedleParameter = (value: string): string =>
  (value || '').toLowerCase().replace(/\s+/g, ' ').replace(/\u00d7/g, 'x').trim();

const toProxyNeedleImageUrl = (url: string): string =>
  `${API_BASE_URL}/api/needle/image-proxy?url=${encodeURIComponent(url)}`;

const arrayBufferToBase64 = (arrayBuffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const getTodayIso = (): string => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getNeedleRowKey = (row: NeedlePickingItem, mode: NeedleMode): string =>
  [
    row.tanggal || '',
    getNeedleTime(row, mode) || '',
    row.nama_operator || '',
    getNik(row) || '',
    row.line || '',
    row.needle_parameter || '',
    row.model || '',
    typeof row.qty === 'number' ? String(row.qty) : '',
    row.location || '',
    row.operator_picture_url || '',
  ].join('|');

const NeedlePhotoThumb = memo(function NeedlePhotoThumb({
  src,
  alt,
  className,
  emptyClassName,
  onPreview,
}: {
  src?: string;
  alt: string;
  className: string;
  emptyClassName: string;
  onPreview: () => void;
}) {
  if (!src) {
    return <div className={emptyClassName} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onClick={onPreview}
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
  );
});

const NeedleTableRow = memo(function NeedleTableRow({
  row,
  mode,
  no,
  machineImg,
  onPreview,
}: {
  row: NeedlePickingItem;
  mode: NeedleMode;
  no: number;
  machineImg?: string;
  onPreview: (url: string, name: string) => void;
}) {
  return (
    <tr className="h-[96px] border-t border-slate-100 hover:bg-slate-50/60 transition">
      <td className="w-[56px] px-2 py-1 text-center align-middle font-semibold text-slate-700">{no}</td>
      <td className="w-[92px] px-2 py-1 text-center align-middle">
        <NeedlePhotoThumb
          src={row.operator_picture_url || undefined}
          alt={row.nama_operator ? `Foto ${row.nama_operator}` : 'Foto operator'}
          className="mx-auto h-[84px] w-[84px] rounded-lg object-cover border border-slate-200 bg-slate-100 cursor-zoom-in"
          emptyClassName="mx-auto h-[84px] w-[84px] rounded-lg border border-dashed border-slate-300 bg-slate-50"
          onPreview={() => onPreview(row.operator_picture_url || '', row.nama_operator || 'Operator')}
        />
      </td>
      <td className="w-[120px] px-2 py-1 text-center align-middle">
        <NeedlePhotoThumb
          src={machineImg}
          alt={row.model ? `Mesin ${row.model}` : 'Foto mesin'}
          className="mx-auto h-[84px] w-[108px] rounded-lg object-contain border border-slate-200 bg-slate-100 p-1 cursor-zoom-in"
          emptyClassName="mx-auto h-[84px] w-[108px] rounded-lg border border-dashed border-slate-300 bg-slate-50"
          onPreview={() => onPreview(machineImg || '', row.model ? `Mesin ${row.model}` : row.needle_parameter || 'Foto mesin')}
        />
      </td>
      <td className="px-4 py-2.5 text-center">{row.tanggal || '-'}</td>
      <td className="px-4 py-2.5 text-center whitespace-nowrap">{getNeedleTime(row, mode) || '-'}</td>
      <td className="px-4 py-2.5 text-center">{row.nama_operator || '-'}</td>
      <td className="px-4 py-2.5 text-center font-mono">{getNik(row) || '—'}</td>
      <td className="px-4 py-2.5 text-center">{row.line || '—'}</td>
      <td className="px-4 py-2.5 text-center min-w-[280px]">{row.needle_parameter || '-'}</td>
      <td className="px-4 py-2.5 text-center">{row.model || '-'}</td>
      <td className="px-4 py-2.5 text-center">{typeof row.qty === 'number' ? row.qty : '—'}</td>
      <td className="px-4 py-2.5 text-center">{row.location || '-'}</td>
    </tr>
  );
});

export default function NeedelManager() {
  const { isOpen } = useSidebar();
  const [dateFrom, setDateFrom] = useState(getTodayIso());
  const [dateTo, setDateTo] = useState(getTodayIso());
  const [items, setItems] = useState<NeedlePickingItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [needleMode, setNeedleMode] = useState<NeedleMode>('picking');
  const [needleStocks, setNeedleStocks] = useState<NeedleStockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStageText, setExportStageText] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; name: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const lastDataSignatureRef = useRef<string>('');

  const handlePreviewPhoto = useCallback((url: string, name: string) => {
    if (!url) return;
    setPreviewPhoto({ url, name });
  }, []);

  const fetchNeedleData = useCallback(async (
    from: string,
    to: string,
    mode: NeedleMode = needleMode,
    options?: { silent?: boolean },
  ) => {
    const isSilent = options?.silent === true;
    try {
      if (!isSilent) {
        setLoading(true);
        setMessage(null);
      }
      const res =
        mode === 'picking'
          ? await getNeedlePickings({ tanggalfrom: from, tanggalto: to })
          : await getNeedlePutting({ tanggalfrom: from, tanggalto: to });
      if (!res.success || !res.data) {
        throw new Error(res.error || `Gagal mengambil data needle (${mode === 'picking' ? 'picking' : 'putting'})`);
      }
      const nextItems = Array.isArray(res.data.data) ? res.data.data : [];
      const nextCount = typeof res.data.count === 'number' ? res.data.count : 0;
      const nextSignature = `${nextCount}::${nextItems.map((row) => getNeedleRowKey(row, mode)).join('\n')}`;

      if (nextSignature !== lastDataSignatureRef.current) {
        lastDataSignatureRef.current = nextSignature;
        setItems(nextItems);
        setTotalCount(nextCount);
      }
      if (!isSilent) {
        setMessage(null);
      }
    } catch (error) {
      if (!isSilent) {
        lastDataSignatureRef.current = '';
        setItems([]);
        setTotalCount(0);
      }
      const text = error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat data needle';
      setMessage({ type: 'error', text });
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, [needleMode]);

  useEffect(() => {
    let disposed = false;

    const refresh = async (silent = true) => {
      if (disposed || exportLoading) return;
      await fetchNeedleData(dateFrom, dateTo, needleMode, { silent });
    };

    void refresh(false);
    const timer = window.setInterval(() => {
      void refresh(true);
    }, 5000);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [dateFrom, dateTo, needleMode, exportLoading, fetchNeedleData]);

  useEffect(() => {
    const fetchNeedleStock = async () => {
      const res = await getNeedleStock();
      if (res.success && res.data && Array.isArray(res.data.data)) {
        setNeedleStocks(res.data.data);
      }
    };
    fetchNeedleStock();
  }, []);

  const displayRows = useMemo(() => items.slice(0, 200), [items]);
  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return displayRows;
    return displayRows.filter((row) => {
      const haystack = [
        row.tanggal,
        getNeedleTime(row, needleMode),
        row.nama_operator,
        getNik(row),
        row.line,
        row.needle_parameter,
        row.model,
        row.location,
        typeof row.qty === 'number' ? String(row.qty) : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [displayRows, searchTerm, needleMode]);

  const stockImageByParameter = useMemo(() => {
    const map = new Map<string, string>();
    needleStocks.forEach((s) => {
      const key = normalizeNeedleParameter(s.needle_parameter || '');
      if (key && s.machine_picture_url) map.set(key, s.machine_picture_url);
    });
    return map;
  }, [needleStocks]);

  const keyedFilteredRows = useMemo(() => {
    const counter = new Map<string, number>();
    const total = filteredRows.length;
    return filteredRows.map((row, idx) => {
      const baseKey = getNeedleRowKey(row, needleMode);
      const occurrence = (counter.get(baseKey) || 0) + 1;
      counter.set(baseKey, occurrence);
      return {
        key: `${baseKey}#${occurrence}`,
        no: total - idx,
        row,
        machineImg: stockImageByParameter.get(normalizeNeedleParameter(row.needle_parameter || '')),
      };
    });
  }, [filteredRows, needleMode, stockImageByParameter]);

  const handleExportExcel = async () => {
    if (filteredRows.length === 0) {
      setMessage({ type: 'error', text: 'Tidak ada data untuk diexport.' });
      return;
    }

    setExportLoading(true);
    setExportProgress(1);
    setExportStageText('Menyiapkan workbook export...');
    setMessage({ type: 'ok', text: 'Memulai proses export. Mengunduh dan mengonversi gambar...' });

    try {
      const workbook = new ExcelJS.Workbook();
      const sheetName = needleMode === 'picking' ? 'Picking' : 'Putting';
      const sheet = workbook.addWorksheet(sheetName);

      const headers = [
        'Foto',
        'Foto Mesin',
        'Tanggal',
        needleMode === 'putting' ? 'Waktu Simpan' : 'Waktu Ambil',
        'Operator',
        'NIK',
        'Line',
        'Needle Parameter',
        'Model',
        'Qty',
        'Location',
      ];

      sheet.addRow(headers);
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 30;
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });

      headerRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
      headerRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };

      type ExportRow = {
        rowNumber: number;
        operatorImageUrl?: string;
        machineImageUrl?: string;
      };
      const exportRows: ExportRow[] = [];

      filteredRows.forEach((row) => {
        const machineImageUrl = stockImageByParameter.get(normalizeNeedleParameter(row.needle_parameter || ''));
        const excelRow = sheet.addRow([
          '',
          '',
          row.tanggal || '',
          getNeedleTime(row, needleMode) || '',
          row.nama_operator || '',
          getNik(row) || '',
          row.line || '',
          row.needle_parameter || '',
          row.model || '',
          typeof row.qty === 'number' ? row.qty : '',
          row.location || '',
        ]);
        excelRow.height = 40;
        excelRow.alignment = { vertical: 'middle', horizontal: 'center' };
        exportRows.push({
          rowNumber: excelRow.number,
          operatorImageUrl: row.operator_picture_url || undefined,
          machineImageUrl: machineImageUrl || undefined,
        });
      });

      setExportProgress(10);
      setExportStageText('Mengatur lebar kolom dan format tabel...');

      const textCols = [3, 4, 5, 6, 7, 8, 9, 10, 11];
      textCols.forEach((colIndex) => {
        let maxLen = headers[colIndex - 1].length;
        for (let i = 2; i <= sheet.rowCount; i += 1) {
          const v = sheet.getRow(i).getCell(colIndex).value;
          const len = String(v ?? '').length;
          if (len > maxLen) maxLen = len;
        }
        sheet.getColumn(colIndex).width = Math.min(Math.max(maxLen + 2, 12), 48);
      });

      sheet.getColumn(1).width = 12;
      sheet.getColumn(2).width = 15;

      const getImageData = async (sourceUrl?: string): Promise<{ base64: string; extension: 'png' | 'jpeg' | 'gif' } | null> => {
        if (!sourceUrl) return null;

        const readImageAsBase64 = async (url: string): Promise<any> => {
          // --- PERBAIKAN UTAMA DI SINI ---
          // Menambahkan cache-buster (?cb=timestamp) agar browser mengabaikan Opaque Cache 
          // yang tersimpan dari tag <img> di halaman web UI.
          const cacheBusterUrl = url + (url.includes('?') ? '&' : '?') + 'cb=' + new Date().getTime();

          try {
            // Menambahkan cache: 'no-cache' untuk memaksa request ke jaringan
            const res = await fetch(cacheBusterUrl, {
              mode: 'cors',
              cache: 'no-cache'
            });

            if (!res.ok) return null;

            const contentType = res.headers.get('content-type') || '';

            if (!contentType.toLowerCase().startsWith('image/')) return null;

            const lowerType = contentType.toLowerCase();
            const ext: 'png' | 'jpeg' | 'gif' = lowerType.includes('png') ? 'png' : lowerType.includes('gif') ? 'gif' : 'jpeg';

            const arrayBuffer = await res.arrayBuffer();
            if (!arrayBuffer || arrayBuffer.byteLength === 0) return null;

            const base64Body = arrayBufferToBase64(arrayBuffer);
            return { base64: base64Body, extension: ext };
          } catch {
            return null;
          }
        };

        const direct = await readImageAsBase64(sourceUrl);
        if (direct) return direct;

        const proxied = await readImageAsBase64(toProxyNeedleImageUrl(sourceUrl));
        if (proxied) return proxied;

        return null;
      };

      // Proses gambar secara berurutan
      const totalRows = exportRows.length;
      for (let i = 0; i < exportRows.length; i++) {
        const row = exportRows[i];
        const excelRowIdx = row.rowNumber;
        const rowProgress = Math.min(85, 10 + Math.round(((i + 1) / Math.max(totalRows, 1)) * 75));
        setExportProgress(rowProgress);
        setExportStageText(`Memproses gambar baris ${i + 1} dari ${totalRows}...`);

        const operatorImg = await getImageData(row.operatorImageUrl);
        if (operatorImg) {
          const imgId = workbook.addImage({
            base64: operatorImg.base64,
            extension: operatorImg.extension,
          });
          sheet.addImage(imgId, {
            tl: { col: 0.2, row: (excelRowIdx - 1) + 0.2 },
            ext: { width: 34, height: 34 },
            editAs: 'oneCell',
          });
        }

        const machineImg = await getImageData(row.machineImageUrl);
        if (machineImg) {
          const imgId = workbook.addImage({
            base64: machineImg.base64,
            extension: machineImg.extension,
          });
          sheet.addImage(imgId, {
            tl: { col: 1.25, row: (excelRowIdx - 1) + 0.2 },
            ext: { width: 44, height: 34 },
            editAs: 'oneCell',
          });
        }
      }

      setExportProgress(92);
      setExportStageText('Menyusun file Excel...');
      const filename = `needle_${needleMode}_${dateFrom}_to_${dateTo}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      setExportProgress(97);
      setExportStageText('Menyiapkan proses unduh file...');
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportProgress(100);
      setExportStageText('Selesai. File berhasil diunduh.');
      setMessage({ type: 'ok', text: `Export berhasil: ${filename}` });
    } catch {
      setMessage({ type: 'error', text: 'Gagal men-generate file Excel.' });
    } finally {
      setTimeout(() => {
        setExportLoading(false);
        setExportProgress(0);
        setExportStageText('');
      }, 450);
    }
  };

  return (
    <div
      className="flex min-h-screen w-full h-screen fixed inset-0 m-0 p-0 font-poppins text-slate-800 selection:bg-violet-100 selection:text-violet-900"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <Sidebar />
      <div
        className="flex flex-col w-full min-h-screen transition-all duration-300 ease-in-out relative"
        style={{
          marginLeft: isOpen ? '18%' : '5rem',
          width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)',
        }}
      >
        <Header />
        <Breadcrumb />
        <main
          className="flex-1 w-full overflow-hidden relative min-h-0"
          style={{
            padding: '0.5rem',
            paddingTop: '0.75rem',
          }}
        >
          <div className="w-full h-full min-h-0 flex flex-col gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_260px] gap-4 items-stretch">
                <div className="relative overflow-hidden rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/60 via-indigo-50/30 to-white p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-violet-100">
                      <img src={needleIcon} alt="" className="h-12 w-12 object-contain" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[clamp(0.62rem,0.72vw,0.72rem)] font-semibold uppercase tracking-wider text-violet-600">Needel Manager</p>
                      <h1 className="mt-0.5 text-[clamp(1.15rem,2vw,1.85rem)] font-extrabold tracking-tight text-slate-900">Monitoring picking and putting needle</h1>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                  <p className="mb-1.5 text-center text-[clamp(0.6rem,0.7vw,0.7rem)] font-semibold uppercase tracking-wide text-emerald-700">Sumber data</p>
                  <div
                    className="inline-flex rounded-xl border border-emerald-200/80 bg-emerald-50/90 p-1 shadow-sm"
                    role="group"
                    aria-label="Pilih mode needle"
                  >
                    <button
                      type="button"
                      onClick={() => setNeedleMode('picking')}
                      className={`rounded-lg px-4 py-2 text-[clamp(0.74rem,0.95vw,0.9rem)] font-semibold transition ${needleMode === 'picking'
                          ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-100'
                          : 'text-emerald-700/80 hover:text-emerald-900'
                        }`}
                    >
                      Picking
                    </button>
                    <button
                      type="button"
                      onClick={() => setNeedleMode('putting')}
                      className={`rounded-lg px-4 py-2 text-[clamp(0.74rem,0.95vw,0.9rem)] font-semibold transition ${needleMode === 'putting'
                          ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-100'
                          : 'text-emerald-700/80 hover:text-emerald-900'
                        }`}
                    >
                      Putting
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 inline-flex items-center gap-2 text-slate-900">
                    <CircleDot className="h-4 w-4 text-violet-600" aria-hidden />
                    <p className="text-[clamp(1.05rem,1.8vw,1.6rem)] font-bold leading-none">Data Needle</p>
                  </div>
                  <p className="text-[clamp(1.35rem,2.6vw,1.9rem)] font-extrabold text-slate-800 leading-none">{totalCount}</p>
                  <p className="mt-1 text-[clamp(0.68rem,0.82vw,0.78rem)] text-slate-500">Total record backend</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end mb-3">
                <div>
                  <label className="mb-1 block text-[clamp(0.68rem,0.82vw,0.78rem)] font-semibold text-slate-600">Tanggal From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[clamp(0.78rem,1vw,0.92rem)] focus:outline-none focus:ring-2 focus:ring-violet-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[clamp(0.68rem,0.82vw,0.78rem)] font-semibold text-slate-600">Tanggal To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[clamp(0.78rem,1vw,0.92rem)] focus:outline-none focus:ring-2 focus:ring-violet-200"
                  />
                </div>
                <button
                  onClick={() => fetchNeedleData(dateFrom, dateTo, needleMode)}
                  disabled={loading || exportLoading}
                  className={`w-full rounded-lg px-3 py-2 text-[clamp(0.74rem,0.95vw,0.9rem)] font-semibold text-white transition ${loading || exportLoading
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500'
                    }`}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memuat...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Tampilkan Data
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    const today = getTodayIso();
                    setDateFrom(today);
                    setDateTo(today);
                    fetchNeedleData(today, today, needleMode);
                  }}
                  disabled={exportLoading}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[clamp(0.74rem,0.95vw,0.9rem)] font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Reset Hari Ini
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={exportLoading}
                  className={`w-full rounded-lg border px-3 py-2 text-[clamp(0.74rem,0.95vw,0.9rem)] font-semibold transition ${exportLoading
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-400 cursor-not-allowed'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                >
                  {exportLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memproses...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Export Excel
                    </span>
                  )}
                </button>
                <div>
                  <label className="mb-1 block text-[clamp(0.68rem,0.82vw,0.78rem)] font-semibold text-slate-600">Search</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari operator, NIK, line, needle..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[clamp(0.78rem,1vw,0.92rem)] focus:outline-none focus:ring-2 focus:ring-violet-200"
                  />
                </div>
              </div>

              {message && (
                <div
                  className={`rounded-lg px-3 py-2 text-[clamp(0.74rem,0.95vw,0.9rem)] ${message.type === 'ok'
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border border-red-200 bg-red-50 text-red-700'
                    }`}
                >
                  {message.text}
                </div>
              )}

              <div className="mt-3 flex-1 min-h-0 max-h-full overflow-auto rounded-xl border border-slate-200 overscroll-contain">
                <table className="min-w-full border-collapse text-[clamp(0.7rem,0.82vw,0.84rem)]">
                  <thead className="text-slate-700">
                    <tr>
                      <th className="sticky top-0 z-20 w-[56px] border-b border-slate-200 bg-slate-50 px-2 py-3 text-center font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgb(226,232,240)]">No</th>
                      <th className="sticky top-0 z-20 w-[92px] border-b border-slate-200 bg-slate-50 px-2 py-3 text-center font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgb(226,232,240)]">Foto</th>
                      <th className="sticky top-0 z-20 w-[120px] border-b border-slate-200 bg-slate-50 px-2 py-3 text-center font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgb(226,232,240)]">Foto Mesin</th>
                      <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-3 text-center font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgb(226,232,240)]">Tanggal</th>
                      <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-3 text-center font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgb(226,232,240)]">{needleMode === 'putting' ? 'Waktu Simpan' : 'Waktu Ambil'}</th>
                      <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-3 text-center font-semibold shadow-[0_1px_0_0_rgb(226,232,240)]">Operator</th>
                      <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-3 text-center font-semibold shadow-[0_1px_0_0_rgb(226,232,240)]">NIK</th>
                      <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-3 text-center font-semibold shadow-[0_1px_0_0_rgb(226,232,240)]">Line</th>
                      <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-3 text-center font-semibold shadow-[0_1px_0_0_rgb(226,232,240)]">Needle Parameter</th>
                      <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-3 text-center font-semibold shadow-[0_1px_0_0_rgb(226,232,240)]">Model</th>
                      <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-3 text-center font-semibold shadow-[0_1px_0_0_rgb(226,232,240)]">Qty</th>
                      <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-3 text-center font-semibold shadow-[0_1px_0_0_rgb(226,232,240)]">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keyedFilteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-4 py-6 text-center text-slate-500">
                          {loading ? 'Memuat data...' : 'Data tidak ditemukan'}
                        </td>
                      </tr>
                    ) : (
                      keyedFilteredRows.map((item) => (
                        <NeedleTableRow
                          key={item.key}
                          row={item.row}
                          mode={needleMode}
                          no={item.no}
                          machineImg={item.machineImg}
                          onPreview={handlePreviewPhoto}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {previewPhoto && (
        <div
          className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="relative w-full max-w-3xl rounded-2xl border border-white/20 bg-slate-900 p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute right-3 top-3 rounded-lg bg-black/45 p-1.5 text-white hover:bg-black/65 transition"
              aria-label="Tutup preview foto"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={previewPhoto.url}
              alt={`Preview ${previewPhoto.name}`}
              className="max-h-[78vh] w-full rounded-xl object-contain bg-slate-950"
              referrerPolicy="no-referrer"
            />
            <p className="mt-2 text-xs text-slate-200">{previewPhoto.name}</p>
          </div>
        </div>
      )}

      {exportLoading && (
        <div className="fixed inset-0 z-[90] bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900/95 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Exporting Excel</h3>
              <span className="text-xs font-bold text-emerald-300">{Math.max(1, exportProgress)}%</span>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-700/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 via-indigo-400 to-emerald-400 transition-all duration-500 ease-out relative"
                style={{ width: `${Math.max(1, exportProgress)}%` }}
              >
                <span className="absolute right-0 top-0 h-full w-8 -translate-x-1/2 animate-pulse bg-white/25 blur-[2px]" />
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-200">{exportStageText || 'Sedang memproses data export...'}</p>
            <div className="mt-2 flex gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-bounce [animation-delay:-0.25s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-300 animate-bounce [animation-delay:-0.12s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-violet-300 animate-bounce" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
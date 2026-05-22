import ExcelJS from 'exceljs';
import { writeExportTitleBlock } from './exportExcelBanner';
import { getDailyOutputExportHeaders } from './exportDailyOutputExcel';

const toDateToken = (date?: string): string => {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
};

/** Normalisasi key tanggal yyyy-mm-dd untuk pengurutan & grup. */
function normalizeTanggalKey(raw: unknown): string {
  if (raw == null || raw === '') return '';
  const s = String(raw).trim();
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const y = m[1];
    const mo = String(Number(m[2])).padStart(2, '0');
    const d = String(Number(m[3])).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }
  return s;
}

/** Daftar tanggal inklusif from → to (yyyy-mm-dd); fallback [] jika tidak valid. */
function enumerateDateKeys(from?: string, to?: string): string[] {
  if (!from?.trim()) return [];
  const start = new Date(from);
  const end = new Date((to && to.trim()) || from);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  if (end < start) return [normalizeTanggalKey(from)].filter(Boolean);
  const out: string[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cur <= last) {
    const y = cur.getFullYear();
    const mo = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    out.push(`${y}-${mo}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function parseLineNum(raw: unknown): number {
  const n = parseInt(String(raw ?? '').trim(), 10);
  return Number.isFinite(n) ? n : 9999;
}

/** API bisa mengirim kolom `SPV - …` sementara header export memakai `PIC - …`. */
function pickCell(row: Record<string, unknown>, header: string): unknown {
  let v = row[header];
  if (v != null && v !== '') return v;
  if (header.startsWith('PIC -')) {
    const alt = header.replace(/^PIC -/, 'SPV -');
    v = row[alt];
    if (v != null && v !== '') return v;
  }
  return '';
}

function normalizeRow(row: unknown, headers: string[]): Record<string, unknown> {
  const r = row && typeof row === 'object' && !Array.isArray(row) ? (row as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};
  headers.forEach((h) => {
    out[h] = pickCell(r, h);
  });
  return out;
}

const BORDER = {
  top: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
};

const headerFillByGroup = (header: string): string => {
  const h = header.toLowerCase();
  if (['tanggal', 'wo', 'line', 'style', 'item', 'buyer'].includes(h)) return 'FF1E3A5F';
  if (['output sewing', 'qc', 'pqc good', 'dryroom_in', 'dryroom_out', 'folding_in', 'folding_out'].includes(h)) return 'FF0369A1';
  if (h.includes('pic')) return 'FF047857';
  if (h.includes('nik')) return 'FF6D28D9';
  return 'FF334155';
};

const isCenterAligned = (header: string): boolean => {
  const h = header.toLowerCase();
  if (
    ['tanggal', 'wo', 'line', 'style', 'output sewing', 'qc', 'pqc good', 'dryroom_in', 'dryroom_out', 'folding_in', 'folding_out'].includes(h)
  ) {
    return true;
  }
  if (h.includes('nik')) return true;
  return false;
};

const colWidth = (header: string): number => {
  const h = header.toLowerCase();
  if (['item', 'buyer'].includes(h)) return 30;
  if (h.includes('pic')) return 20;
  if (h.includes('nik')) return 14;
  if (['tanggal', 'wo', 'line', 'style'].includes(h)) return 12;
  return 11;
};

/**
 * Export daily output: grup per tanggal (asc), dalam tiap tanggal urut line 1 → terbesar.
 * Satu API `/daily-output` (proxy `/gcc/daily-output` bila GCC).
 */
export async function exportDailyOutputByLineExcel({
  rows,
  filterDateFrom,
  filterDateTo,
}: {
  rows: unknown[];
  filterDateFrom?: string;
  filterDateTo?: string;
}): Promise<void> {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Data daily output kosong');
  }

  const exportHeaders = getDailyOutputExportHeaders();
  const normalized = rows.map((row) => normalizeRow(row, exportHeaders));
  const byDate = new Map<string, Record<string, unknown>[]>();
  for (const r of normalized) {
    const dk = normalizeTanggalKey(r.tanggal);
    if (!dk) continue;
    if (!byDate.has(dk)) byDate.set(dk, []);
    byDate.get(dk)!.push(r);
  }

  const rangeDates = enumerateDateKeys(filterDateFrom, filterDateTo);
  const sortedDates =
    rangeDates.length > 0
      ? rangeDates
      : [...byDate.keys()].sort((a, b) => a.localeCompare(b));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RFID Tracking';
  const ws = workbook.addWorksheet('Daily Output Line', {
    views: [{ state: 'frozen', ySplit: 3, showGridLines: true }],
  });

  const ncol = exportHeaders.length;
  writeExportTitleBlock(ws, ncol, {
    title: 'Daily Output Line',
    filterDateFrom,
    filterDateTo,
  });

  exportHeaders.forEach((h, i) => {
    ws.getColumn(i + 1).width = colWidth(h);
  });

  let currentRow = 4;

  for (const dateKey of sortedDates) {
    const chunk = (byDate.get(dateKey) ?? []).slice();
    chunk.sort((a, b) => {
      const ln = parseLineNum(a.line) - parseLineNum(b.line);
      if (ln !== 0) return ln;
      return String(a.wo ?? '').localeCompare(String(b.wo ?? ''));
    });

    const lineMin = chunk.length ? parseLineNum(chunk[0]?.line) : 0;
    const lineMax = chunk.length ? parseLineNum(chunk[chunk.length - 1]?.line) : 0;
    const lineLabel =
      chunk.length === 0
        ? 'tidak ada data'
        : lineMin === lineMax
          ? `Line ${lineMin}`
          : `Line ${lineMin} … ${lineMax}`;

    ws.mergeCells(currentRow, 1, currentRow, ncol);
    const band = ws.getCell(currentRow, 1);
    band.value = `Tanggal  ${dateKey}   —   ${chunk.length} baris (${lineLabel})`;
    band.font = { bold: true, size: 13, name: 'Calibri', color: { argb: 'FFFFFFFF' } };
    band.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF115E59' } };
    band.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    band.border = BORDER;
    ws.getRow(currentRow).height = 26;
    currentRow += 1;

    if (chunk.length === 0) {
      ws.mergeCells(currentRow, 1, currentRow, ncol);
      const emptyCell = ws.getCell(currentRow, 1);
      emptyCell.value = 'Tidak ada data untuk tanggal ini.';
      emptyCell.font = { italic: true, size: 11, name: 'Calibri', color: { argb: 'FF64748B' } };
      emptyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
      emptyCell.border = BORDER;
      ws.getRow(currentRow).height = 22;
      currentRow += 2;
      continue;
    }

    const headerRow = ws.getRow(currentRow);
    headerRow.height = 30;
    exportHeaders.forEach((header, colIdx) => {
      const cell = headerRow.getCell(colIdx + 1);
      cell.value = header.replace(/_/g, ' ');
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12, name: 'Calibri' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerFillByGroup(header) } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = BORDER;
    });
    currentRow += 1;

    chunk.forEach((rowObj, idx) => {
      const r = ws.getRow(currentRow);
      r.height = 22;
      const even = idx % 2 === 1;
      exportHeaders.forEach((header, colIdx) => {
        const cell = r.getCell(colIdx + 1);
        const val = rowObj[header];
        cell.value =
          val == null
            ? ''
            : typeof val === 'object' && !(val instanceof Date)
              ? JSON.stringify(val)
              : (val as import('exceljs').CellValue);
        cell.font = { size: 11, name: 'Calibri', color: { argb: 'FF1E293B' } };
        cell.alignment = {
          vertical: 'middle',
          horizontal: isCenterAligned(header) ? 'center' : 'left',
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: even ? 'FFF8FAFC' : 'FFFEFCF8' },
        };
        cell.border = BORDER;
      });
      currentRow += 1;
    });

    currentRow += 1;
  }

  const from = toDateToken(filterDateFrom);
  const to = toDateToken(filterDateTo);
  const today = toDateToken(new Date().toISOString());
  const f = from || today;
  const t = to || f;
  const filename = `daily_output_line_${f}_to_${t}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

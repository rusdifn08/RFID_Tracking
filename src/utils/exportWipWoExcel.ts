import ExcelJS from 'exceljs';
import { writeExportTitleBlock } from './exportExcelBanner';

type WipCol = {
  header: string;
  keys: string[];
  width: number;
  numeric: boolean;
  center?: boolean;
  date?: boolean;
  /** Grup pewarnaan header & sel data */
  group:
    | 'info'
    | 'total'
    | 'qty_target'
    | 'output_sewing'
    | 'rework'
    | 'good'
    | 'pqc_rework'
    | 'pqc_good'
    | 'dry_in'
    | 'dry_out'
    | 'fold_in'
    | 'fold_out';
};

const COLUMNS: WipCol[] = [
  { header: 'WO', keys: ['wo', 'WO'], width: 11, numeric: false, group: 'info' },
  { header: 'Style', keys: ['style', 'Style'], width: 12, numeric: false, group: 'info' },
  { header: 'Item', keys: ['item', 'Item'], width: 38, numeric: false, group: 'info' },
  { header: 'Buyer', keys: ['buyer', 'Buyer'], width: 32, numeric: false, group: 'info' },
  { header: 'Color', keys: ['color', 'Color'], width: 8, numeric: false, center: true, group: 'info' },
  { header: 'Size', keys: ['size', 'Size'], width: 10, numeric: false, center: true, group: 'info' },
  { header: 'QTY Order', keys: ['qty_order', 'QTY_ORDER', 'Qty Order'], width: 12, numeric: true, center: true, group: 'info' },
  { header: 'Ex Factory Date', keys: ['ex_fact_date', 'EX_FACT_DATE', 'ex_factory_date'], width: 16, numeric: false, center: true, group: 'info', date: true },
  { header: 'TOTAL', keys: ['TOTAL', 'total', 'Total'], width: 10, numeric: true, center: true, group: 'total' },
  { header: 'Output Sewing', keys: ['OUTPUT_SEWING', 'output_sewing'], width: 14, numeric: true, center: true, group: 'output_sewing' },
  { header: 'QTY Harian', keys: ['qty_target_day', 'QTY_TARGET_DAY', 'qty_target_harian'], width: 14, numeric: true, center: true, group: 'qty_target' },
  { header: 'Rework', keys: ['REWORK', 'rework'], width: 11, numeric: true, center: true, group: 'rework' },
  { header: 'Good', keys: ['GOOD', 'good'], width: 10, numeric: true, center: true, group: 'good' },
  { header: 'PQC Rework', keys: ['PQC_REWORK', 'pqc_rework'], width: 12, numeric: true, center: true, group: 'pqc_rework' },
  { header: 'PQC Good', keys: ['PQC_GOOD', 'pqc_good'], width: 12, numeric: true, center: true, group: 'pqc_good' },
  { header: 'In Dryroom', keys: ['IN_DRYROOM', 'in_dryroom'], width: 12, numeric: true, center: true, group: 'dry_in' },
  { header: 'Out Dryroom', keys: ['OUT_DRYROOM', 'out_dryroom'], width: 12, numeric: true, center: true, group: 'dry_out' },
  { header: 'In Folding', keys: ['IN_FOLDING', 'in_folding'], width: 12, numeric: true, center: true, group: 'fold_in' },
  { header: 'Out Folding', keys: ['OUT_FOLDING', 'out_folding'], width: 12, numeric: true, center: true, group: 'fold_out' },
];

const BORDER = {
  top: { style: 'thin' as const, color: { argb: 'FFBFDBFE' } },
  left: { style: 'thin' as const, color: { argb: 'FFBFDBFE' } },
  bottom: { style: 'thin' as const, color: { argb: 'FFBFDBFE' } },
  right: { style: 'thin' as const, color: { argb: 'FFBFDBFE' } },
};

/** Biru gelap info (WO–Buyer, dryroom–folding); biru medium (output sewing); oranye/hijau soft. */
const INFO_BLUE_HEADER = 'FF1E40AF';
const INFO_BLUE_DATA = 'FFE0E7FF';
/** Header lebih gelap agar teks putih kontras (sel data tetap pastel). */
const SOFT_GREEN_HEADER = 'FF166534';
const SOFT_GREEN_DATA = 'FFDCFCE7';
const SOFT_ORANGE_HEADER = 'FFC2410C';
const SOFT_ORANGE_DATA = 'FFFFEDD5';

const HEADER_FILL: Record<WipCol['group'], string> = {
  info: INFO_BLUE_HEADER,
  total: 'FF1E3A8A',
  qty_target: 'FF2563EB',
  output_sewing: INFO_BLUE_HEADER,
  rework: SOFT_ORANGE_HEADER,
  good: SOFT_GREEN_HEADER,
  pqc_rework: SOFT_ORANGE_HEADER,
  pqc_good: SOFT_GREEN_HEADER,
  dry_in: INFO_BLUE_HEADER,
  dry_out: INFO_BLUE_HEADER,
  fold_in: INFO_BLUE_HEADER,
  fold_out: INFO_BLUE_HEADER,
};

const DATA_FILL_POSITIVE: Record<WipCol['group'], string> = {
  info: 'FFFFFFFF',
  total: INFO_BLUE_DATA,
  qty_target: 'FFBFDBFE',
  output_sewing: INFO_BLUE_DATA,
  rework: SOFT_ORANGE_DATA,
  good: SOFT_GREEN_DATA,
  pqc_rework: SOFT_ORANGE_DATA,
  pqc_good: SOFT_GREEN_DATA,
  dry_in: INFO_BLUE_DATA,
  dry_out: INFO_BLUE_DATA,
  fold_in: INFO_BLUE_DATA,
  fold_out: INFO_BLUE_DATA,
};

/** Sel QTY Harian selalu nuansa biru (header sudah biru). */
const QTY_TARGET_BASE_FILL = 'FFEFF6FF';

const toDateToken = (date?: string): string => {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
};

function pickField(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(row, k)) {
      const v = row[k];
      if (v !== undefined && v !== null && v !== '') return v;
    }
  }
  const lowerKeys = keys.map((k) => k.toLowerCase());
  for (const rk of Object.keys(row)) {
    if (lowerKeys.includes(rk.toLowerCase())) {
      const v = row[rk];
      if (v !== undefined && v !== null && v !== '') return v;
    }
  }
  return undefined;
}

function cellValue(row: Record<string, unknown>, col: WipCol): string | number {
  const raw = pickField(row, col.keys);
  if (col.date) {
    if (raw == null || raw === '') return '';
    const s = String(raw).trim();
    return toDateToken(s) || s;
  }
  if (col.numeric) {
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/,/g, '').trim());
    return Number.isFinite(n) ? Math.round(n) : '';
  }
  if (raw == null) return '';
  return String(raw).trim();
}

function numericVal(v: string | number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function sortWipRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return [...rows].sort((a, b) => {
    const wo = String(pickField(a, ['wo']) ?? '').localeCompare(String(pickField(b, ['wo']) ?? ''));
    if (wo !== 0) return wo;
    const st = String(pickField(a, ['style']) ?? '').localeCompare(String(pickField(b, ['style']) ?? ''));
    if (st !== 0) return st;
    const co = String(pickField(a, ['color']) ?? '').localeCompare(String(pickField(b, ['color']) ?? ''));
    if (co !== 0) return co;
    return String(pickField(a, ['size']) ?? '').trim().localeCompare(String(pickField(b, ['size']) ?? '').trim());
  });
}

/** Ubah warna banner saja — sel sudah di-merge oleh writeExportTitleBlock. */
function applyBlueBanner(ws: ExcelJS.Worksheet): void {
  ws.getCell(1, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
  ws.getCell(2, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
  ws.getCell(3, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
}

export async function exportWipWoExcel({
  rows,
  filterDateFrom,
  filterDateTo,
}: {
  rows: Record<string, unknown>[];
  filterDateFrom?: string;
  filterDateTo?: string;
}): Promise<void> {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Data Work In Progress (WO) kosong');
  }

  const sorted = sortWipRows(rows);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RFID Tracking';
  const ws = workbook.addWorksheet('WIP WO', {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: true }],
  });

  const ncol = COLUMNS.length;
  const headerRowNum = writeExportTitleBlock(ws, ncol, {
    title: 'Work In Progress (WO)',
    filterDateFrom,
    filterDateTo,
  });
  applyBlueBanner(ws);

  COLUMNS.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width;
  });

  const headerRow = ws.getRow(headerRowNum);
  headerRow.height = 34;
  COLUMNS.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true, size: 11, name: 'Calibri', color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL[col.group] } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = BORDER;
  });

  let rowNum = headerRowNum + 1;
  sorted.forEach((raw, idx) => {
    const rowObj = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const values = COLUMNS.map((c) => cellValue(rowObj, c));
    const r = ws.getRow(rowNum);
    r.height = 22;
    const stripe = idx % 2 === 1 ? 'FFF8FAFC' : 'FFFFFFFF';

    values.forEach((val, i) => {
      const col = COLUMNS[i];
      const cell = r.getCell(i + 1);
      cell.value = val;
      cell.font = {
        size: 11,
        name: 'Calibri',
        color: { argb: col.group === 'total' ? 'FF1E3A8A' : 'FF0F172A' },
        bold: col.group === 'total' && numericVal(val) > 0,
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: col.center ? 'center' : col.numeric ? 'right' : 'left',
      };
      cell.border = BORDER;

      let fillArgb = stripe;
      if (col.group === 'qty_target') {
        const n = numericVal(val);
        fillArgb = n > 0 ? DATA_FILL_POSITIVE.qty_target : QTY_TARGET_BASE_FILL;
        if (n > 0) {
          cell.font = { ...cell.font, bold: true, color: { argb: 'FF1E40AF' } };
        } else {
          cell.font = { ...cell.font, color: { argb: 'FF334155' } };
        }
      } else if (col.group !== 'info' && col.numeric) {
        const n = numericVal(val);
        fillArgb = n > 0 ? DATA_FILL_POSITIVE[col.group] : stripe;
        if (n > 0) {
          cell.font = { ...cell.font, bold: true, color: { argb: 'FF0F172A' } };
        }
      } else if (col.group === 'total') {
        const n = numericVal(val);
        fillArgb = n > 0 ? DATA_FILL_POSITIVE.total : stripe;
      }

      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
      if (col.numeric && typeof cell.value === 'number') {
        cell.numFmt = '#,##0';
      }
    });
    rowNum += 1;
  });

  ws.autoFilter = {
    from: { row: headerRowNum, column: 1 },
    to: { row: headerRowNum, column: COLUMNS.length },
  };

  const today = toDateToken(new Date().toISOString());
  const from = toDateToken(filterDateFrom) || today;
  const to = toDateToken(filterDateTo) || from;
  const filename = `wip_wo_${from}_to_${to}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

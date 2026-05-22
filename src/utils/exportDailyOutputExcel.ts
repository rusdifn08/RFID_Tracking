import ExcelJS from 'exceljs';
import {
  HIDE_DAILY_OUTPUT_HEADER_PREFIXES,
  HIDE_FORM_EXPORT_DAILY_OUTPUT_PIC_NIK,
} from '../config/hide';
import { writeExportTitleBlock } from './exportExcelBanner';

export const DAILY_OUTPUT_HEADERS: string[] = [
  'tanggal',
  'wo',
  'line',
  'style',
  'item',
  'buyer',
  'Output Sewing',
  'QC',
  'PQC Good',
  'Dryroom_in',
  'Dryroom_out',
  'folding_in',
  'folding_out',
  'PIC - Output Sewing',
  'NIK - Output Sewing',
  'PIC - QC',
  'NIK - QC',
  'PIC - PQC Good',
  'NIK - PQC Good',
  'PIC - Dryroom_in',
  'NIK - Dryroom_in',
  'PIC - Dryroom_out',
  'NIK - Dryroom_out',
  'PIC - folding_in',
  'NIK - folding_in',
  'PIC - folding_out',
  'NIK - folding_out',
];

/** Header yang benar-benar ditulis ke Excel (menghormati hide.ts). */
export function getDailyOutputExportHeaders(): string[] {
  if (!HIDE_FORM_EXPORT_DAILY_OUTPUT_PIC_NIK) {
    return [...DAILY_OUTPUT_HEADERS];
  }
  return DAILY_OUTPUT_HEADERS.filter(
    (h) => !HIDE_DAILY_OUTPUT_HEADER_PREFIXES.some((prefix) => h.startsWith(prefix)),
  );
}

const toDateToken = (date?: string): string => {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
};

function pickDailyCell(row: Record<string, unknown>, header: string): unknown {
  let v = row[header];
  if (v != null && v !== '') return v;
  if (header.startsWith('PIC -')) {
    const alt = header.replace(/^PIC -/, 'SPV -');
    v = row[alt];
    if (v != null && v !== '') return v;
  }
  return '';
}

const normalizeDailyRows = (rows: any[]): Record<string, unknown>[] => {
  const headers = getDailyOutputExportHeaders();
  return rows.map((row) => {
    const r = row && typeof row === 'object' && !Array.isArray(row) ? (row as Record<string, unknown>) : {};
    const normalized: Record<string, unknown> = {};
    headers.forEach((header) => {
      const value = pickDailyCell(r, header);
      normalized[header] = value == null ? '' : value;
    });
    return normalized;
  });
};

const isCenterAlignedDataColumn = (header: string): boolean => {
  const h = header.toLowerCase();
  if (
    ['tanggal', 'wo', 'line', 'style', 'output sewing', 'qc', 'pqc good', 'dryroom_in', 'dryroom_out', 'folding_in', 'folding_out'].includes(h)
  ) {
    return true;
  }
  if (h.includes('nik')) return true;
  return false;
};

export const exportDailyOutputExcel = async ({
  rows,
  filterDateFrom,
  filterDateTo,
}: {
  rows: any[];
  filterDateFrom?: string;
  filterDateTo?: string;
}): Promise<void> => {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Data daily output kosong');
  }

  const normalizedRows = normalizeDailyRows(rows);
  const exportHeaders = getDailyOutputExportHeaders();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RFID Tracking';
  const worksheet = workbook.addWorksheet('Daily Output');

  const ncol = exportHeaders.length;
  const headerRowNum = writeExportTitleBlock(worksheet, ncol, {
    title: 'Daily Output Per WO',
    filterDateFrom,
    filterDateTo,
  });

  exportHeaders.forEach((header, i) => {
    const isTextLong = ['item', 'buyer'].includes(header.toLowerCase());
    const isPic = header.toLowerCase().includes('pic');
    const isNik = header.toLowerCase().includes('nik');
    worksheet.getColumn(i + 1).width = isTextLong ? 30 : isPic ? 22 : isNik ? 15 : 13;
  });

  const defaultBorder = {
    top: { style: 'thin' as const, color: { argb: 'FFD9D9D9' } },
    left: { style: 'thin' as const, color: { argb: 'FFD9D9D9' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFD9D9D9' } },
    right: { style: 'thin' as const, color: { argb: 'FFD9D9D9' } },
  };

  const headerFillByGroup = (header: string): string => {
    const h = header.toLowerCase();
    if (['tanggal', 'wo', 'line', 'style', 'item', 'buyer'].includes(h)) return 'FF1F4E78';
    if (['output sewing', 'qc', 'pqc good', 'dryroom_in', 'dryroom_out', 'folding_in', 'folding_out'].includes(h)) return 'FF0B6FA4';
    if (h.includes('pic')) return 'FF2E8B57';
    if (h.includes('nik')) return 'FF5E35B1';
    return 'FF334155';
  };

  const headerRow = worksheet.getRow(headerRowNum);
  headerRow.height = 32;
  headerRow.eachCell((cell, colNumber) => {
    const header = exportHeaders[colNumber - 1] ?? '';
    cell.value = header.replace(/_/g, ' ');
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12, name: 'Calibri' };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: headerFillByGroup(header) },
    };
    cell.border = defaultBorder;
  });

  let rowNum = headerRowNum + 1;
  normalizedRows.forEach((rowObj) => {
    const row = worksheet.getRow(rowNum);
    row.height = 22;
    const isEven = rowNum % 2 === 0;
    exportHeaders.forEach((header, colNumber) => {
      const cell = row.getCell(colNumber);
      const val = rowObj[header];
      cell.value =
        val == null
          ? ''
          : typeof val === 'object' && !(val instanceof Date)
            ? JSON.stringify(val)
            : (val as import('exceljs').CellValue);
      const centered = isCenterAlignedDataColumn(header);
      cell.font = { size: 11, color: { argb: 'FF1F2937' }, name: 'Calibri' };
      cell.alignment = { vertical: 'middle', horizontal: centered ? 'center' : 'left' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFF8FAFC' : 'FFFFFFFF' },
      };
      cell.border = defaultBorder;
    });
    rowNum += 1;
  });

  worksheet.autoFilter = {
    from: { row: headerRowNum, column: 1 },
    to: { row: headerRowNum, column: exportHeaders.length },
  };
  worksheet.views = [{ state: 'frozen', ySplit: headerRowNum }];

  const today = toDateToken(new Date().toISOString());
  const from = toDateToken(filterDateFrom) || today;
  const to = toDateToken(filterDateTo) || from;
  const filename = `daily_output_${from}_to_${to}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

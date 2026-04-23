import ExcelJS from 'exceljs';

const DAILY_OUTPUT_HEADERS: string[] = [
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

const toDateToken = (date?: string): string => {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
};

const normalizeDailyRows = (rows: any[]): Record<string, unknown>[] => {
  return rows.map((row) => {
    const normalized: Record<string, unknown> = {};
    DAILY_OUTPUT_HEADERS.forEach((header) => {
      const value = row?.[header];
      normalized[header] = value == null ? '' : value;
    });
    return normalized;
  });
};

const isCenterAlignedDataColumn = (header: string): boolean => {
  const h = header.toLowerCase();

  // Kolom identitas singkat + metrik proses ditengah
  if (
    ['tanggal', 'wo', 'line', 'style', 'output sewing', 'qc', 'pqc good', 'dryroom_in', 'dryroom_out', 'folding_in', 'folding_out'].includes(
      h
    )
  ) {
    return true;
  }

  // Semua kolom NIK ditengah
  if (h.includes('nik')) {
    return true;
  }

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
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Daily Output');

  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: DAILY_OUTPUT_HEADERS.length },
  };

  worksheet.columns = DAILY_OUTPUT_HEADERS.map((header) => {
    const isTextLong = ['item', 'buyer'].includes(header.toLowerCase());
    const isPic = header.toLowerCase().includes('pic');
    const isNik = header.toLowerCase().includes('nik');
    return {
      header: header.replace(/_/g, ' '),
      key: header,
      width: isTextLong ? 28 : isPic ? 20 : isNik ? 14 : 12,
    };
  });

  normalizedRows.forEach((row) => worksheet.addRow(row));

  const defaultBorder = {
    top: { style: 'thin' as const, color: { argb: 'FFD9D9D9' } },
    left: { style: 'thin' as const, color: { argb: 'FFD9D9D9' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFD9D9D9' } },
    right: { style: 'thin' as const, color: { argb: 'FFD9D9D9' } },
  };

  const headerFillByGroup = (header: string): string => {
    const h = header.toLowerCase();
    if (['tanggal', 'wo', 'line', 'style', 'item', 'buyer'].includes(h)) return 'FF1F4E78'; // master data
    if (['output sewing', 'qc', 'pqc good', 'dryroom_in', 'dryroom_out', 'folding_in', 'folding_out'].includes(h)) return 'FF0B6FA4'; // qty
    if (h.includes('pic')) return 'FF2E8B57'; // PIC
    if (h.includes('nik')) return 'FF5E35B1'; // NIK
    return 'FF334155';
  };

  const headerRow = worksheet.getRow(1);
  // Header dibuat 2x tinggi baris data agar lebih menonjol
  const dataRowHeight = 20;
  headerRow.height = dataRowHeight * 2;
  headerRow.eachCell((cell, colNumber) => {
    const header = DAILY_OUTPUT_HEADERS[colNumber - 1] ?? '';
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: headerFillByGroup(header) },
    };
    cell.border = defaultBorder;
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.height = dataRowHeight;
    const isEven = rowNumber % 2 === 0;
    row.eachCell((cell, colNumber) => {
      const header = DAILY_OUTPUT_HEADERS[colNumber - 1] ?? '';
      const centered = isCenterAlignedDataColumn(header);
      cell.font = { size: 10, color: { argb: 'FF1F2937' }, name: 'Calibri' };
      cell.alignment = { vertical: 'middle', horizontal: centered ? 'center' : 'left' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFF8FAFC' : 'FFFFFFFF' },
      };
      cell.border = defaultBorder;
    });
  });

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


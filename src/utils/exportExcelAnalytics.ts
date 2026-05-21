import type ExcelJS from 'exceljs';
import { EXPORT_BANNER_BORDER } from './exportExcelBanner';

const BORDER = EXPORT_BANNER_BORDER;
const SLATE_HEADER = 'FF1F4E79';
const WHITE = 'FFFFFFFF';

export function excelColLetter(col: number): string {
  let s = '';
  let n = col;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function excelCellRef(row: number, col: number): string {
  return `${excelColLetter(col)}${row}`;
}

export function excelRangeRef(r1: number, c1: number, r2: number, c2: number): string {
  return `${excelColLetter(c1)}${r1}:${excelColLetter(c2)}${r2}`;
}

export type ExcelTableColumnDef = {
  name: string;
  filterButton?: boolean;
  totalsRowFunction?: 'none' | 'sum' | 'count' | 'average' | 'max' | 'min';
};

/** Format kolom angka (0-based index) agar filter Excel = Number Filters (Between, >, dll.) */
export type NumericColFormat = { colIndex: number; numFmt: string };

/** WO sebagai number — wajib agar AutoFilter Excel menawarkan Number Filters */
export function woCellValue(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === '—') return null;
  const num = Number(s);
  return Number.isFinite(num) ? num : null;
}

export function applyNumericColumnFormats(
  ws: ExcelJS.Worksheet,
  formats: NumericColFormat[],
  firstDataRow: number,
  lastDataRow: number,
): void {
  for (const { colIndex, numFmt } of formats) {
    for (let r = firstDataRow; r <= lastDataRow; r++) {
      const cell = ws.getCell(r, colIndex + 1);
      if (typeof cell.value === 'number') {
        cell.numFmt = numFmt;
      }
    }
  }
}

/** Top WO numerik untuk sheet Analisis */
export function topWoKeysByFrequency(woValues: unknown[], limit = 40): number[] {
  const counts = new Map<number, number>();
  for (const raw of woValues) {
    const wo = woCellValue(raw);
    if (wo == null) continue;
    counts.set(wo, (counts.get(wo) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

/** Sheet data datar + Excel Table (filter, sort, total baris) */
export function addFlatDataTableSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  tableName: string,
  headers: readonly string[],
  dataRows: (string | number)[][],
  colWidths: readonly number[],
  columns: ExcelTableColumnDef[],
  numericColumns: NumericColFormat[] = [],
): ExcelJS.Worksheet {
  const ws = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
  });
  ws.columns = colWidths.map((width) => ({ width }));

  const headerRow = headers.map((h) => h);
  if (dataRows.length === 0) {
    ws.addRow(headerRow);
    const msgRow = 2;
    ws.mergeCells(msgRow, 1, msgRow, headers.length);
    const c = ws.getCell(msgRow, 1);
    c.value = 'Tidak ada data pada periode filter.';
    c.font = { italic: true, size: 11, color: { argb: 'FF64748B' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.autoFilter = { from: excelCellRef(1, 1), to: excelCellRef(1, headers.length) };
    return ws;
  }

  const lastRow = 1 + dataRows.length;
  const ref = `A1:${excelColLetter(headers.length)}${lastRow}`;

  ws.addTable({
    name: tableName,
    displayName: tableName,
    ref,
    headerRow: true,
    totalsRow: true,
    style: {
      theme: 'TableStyleMedium2',
      showRowStripes: true,
      showFirstColumn: false,
      showLastColumn: false,
    },
    columns: columns.map((col) => ({
      name: col.name,
      filterButton: col.filterButton !== false,
      totalsRowFunction: col.totalsRowFunction ?? 'none',
    })),
    rows: dataRows,
  });

  const firstDataRow = 2;
  const lastDataRow = 1 + dataRows.length;
  applyNumericColumnFormats(ws, numericColumns, firstDataRow, lastDataRow);

  return ws;
}

type PivotSection = {
  title: string;
  keyHeader: string;
  keys: (string | number)[];
  metricHeaders: { label: string; sumCol?: string; countCol?: string }[];
};

/** Sheet analisis: COUNTIF / SUMIF ke tabel Excel (struktur mirip pivot) */
export function addAnalysisSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  tableName: string,
  sections: PivotSection[],
  accentArgb = 'FF0284C7',
): ExcelJS.Worksheet {
  const ws = workbook.addWorksheet(sheetName);
  let row = 1;

  ws.getCell(row, 1).value = 'ANALISIS OTOMATIS (rumus Excel — perbarui saat data berubah)';
  ws.getCell(row, 1).font = { bold: true, size: 14, color: { argb: accentArgb } };
  ws.mergeCells(row, 1, row, 8);
  row += 2;

  for (const section of sections) {
    ws.mergeCells(row, 1, row, 6);
    const titleCell = ws.getCell(row, 1);
    titleCell.value = section.title;
    titleCell.font = { bold: true, size: 12, color: { argb: WHITE } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accentArgb } };
    titleCell.border = BORDER;
    ws.getRow(row).height = 26;
    row += 1;

    const hdrRow = row;
    const headers = [section.keyHeader, ...section.metricHeaders.map((m) => m.label)];
    headers.forEach((h, i) => {
      const cell = ws.getCell(hdrRow, i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 12, name: 'Calibri', color: { argb: WHITE } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_HEADER } };
      cell.border = BORDER;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws.getRow(hdrRow).height = 24;
    row += 1;

    const keys = section.keys.length > 0 ? section.keys : ['—'];
    for (const key of keys) {
      ws.getCell(row, 1).value = key;
      ws.getCell(row, 1).font = { size: 11 };
      ws.getCell(row, 1).border = BORDER;

      section.metricHeaders.forEach((metric, mi) => {
        const col = mi + 2;
        const cell = ws.getCell(row, col);
        cell.border = BORDER;
        cell.font = { size: 11 };
        cell.alignment = { horizontal: 'right' };
        const keyRef = `$${excelColLetter(1)}${row}`;
        if (metric.countCol) {
          cell.value = {
            formula: `COUNTIF(${tableName}[${metric.countCol}],${keyRef})`,
            date1904: false,
          };
        } else if (metric.sumCol) {
          cell.value = {
            formula: `SUMIF(${tableName}[${section.keyHeader}],${keyRef},${tableName}[${metric.sumCol}])`,
            date1904: false,
          };
        }
      });
      ws.getRow(row).height = 22;
      row += 1;
    }
    row += 2;
  }

  ws.getColumn(1).width = 22;
  for (let c = 2; c <= 8; c++) ws.getColumn(c).width = 16;
  return ws;
}

/** Data ringkas untuk Insert → Chart di Excel */
export function addChartDataSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  title: string,
  categories: { label: string; value: number }[],
  accentArgb = 'FF0284C7',
): ExcelJS.Worksheet {
  const ws = workbook.addWorksheet(sheetName);
  ws.getCell(1, 1).value = title;
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: accentArgb } };
  ws.mergeCells(1, 1, 1, 4);

  ws.getCell(2, 1).value =
    'Pilih tabel di bawah → menu Insert → Recommended Charts (Kolom / Pie / Bar).';
  ws.getCell(2, 1).font = { size: 10, italic: true, color: { argb: 'FF64748B' } };
  ws.mergeCells(2, 1, 2, 4);

  const chartRows = categories.length > 0 ? categories : [{ label: 'Tidak ada data', value: 0 }];
  const dataEnd = 3 + chartRows.length;
  const tblName = `${sheetName.replace(/\s/g, '')}ChartTbl`;

  ws.addTable({
    name: tblName,
    displayName: tblName,
    ref: `A3:B${dataEnd}`,
    headerRow: true,
    totalsRow: true,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: [
      { name: 'Kategori', filterButton: true },
      { name: 'Nilai', filterButton: false, totalsRowFunction: 'sum' },
    ],
    rows: chartRows.map((c) => [c.label, c.value]),
  });

  for (let r = 4; r <= dataEnd; r++) {
    ws.getCell(r, 2).numFmt = '#,##0';
  }

  ws.getColumn(1).width = 24;
  ws.getColumn(2).width = 14;
  return ws;
}

/** Panduan fitur Excel: filter, pivot, grafik, rumus */
export function addExcelGuideSheet(
  workbook: ExcelJS.Workbook,
  opts: {
    dataSheetName: string;
    tableName: string;
    analysisSheetName: string;
    chartSheetName: string;
    reportType: 'QC Cutting' | 'SMarket OUT';
  },
): void {
  const ws = workbook.addWorksheet('Panduan Excel');
  const lines: string[] = [
    `PANDUAN — Laporan ${opts.reportType}`,
    '',
    'Sheet "Data":',
    `  • Tabel "${opts.tableName}" dengan filter di setiap kolom (ikon panah ↓ di header).`,
    '  • Kolom WO bertipe angka → Number Filters (Equals, Between, Greater Than, Top 10, dll.).',
    '  • Klik panah filter untuk search / centang nilai / sort.',
    '  • Baris total di bawah (SUM) untuk kolom qty.',
    '',
    'Sheet "Analisis":',
    '  • Ringkasan otomatis pakai COUNTIF & SUMIF dari tabel Data.',
    '  • Edit data di sheet Data → angka Analisis ikut berubah.',
    '',
    'Pivot Table (Insert → PivotTable):',
    `  1. Buka sheet "${opts.dataSheetName}".`,
    `  2. Klik sel mana saja di tabel "${opts.tableName}".`,
    '  3. Insert → PivotTable → OK.',
    '  4. Seret field ke Rows / Columns / Values (mis. Status, WO, Line).',
    '',
    'Grafik:',
    `  1. Buka sheet "${opts.chartSheetName}".`,
    '  2. Pilih range tabel Kategori + Nilai.',
    '  3. Insert → Recommended Charts (Column / Pie).',
    '',
    'Pencarian:',
    '  • Ctrl+F di seluruh workbook, atau filter kolom di tabel Data.',
    '',
    `Sheet "Laporan": tampilan cetak / manajemen (format warna).`,
  ];

  lines.forEach((line, i) => {
    const cell = ws.getCell(i + 1, 1);
    cell.value = line;
    cell.font = {
      size: line.startsWith('PANDUAN') ? 14 : 11,
      bold: line.startsWith('PANDUAN') || line.endsWith(':'),
      color: { argb: line.startsWith('PANDUAN') ? 'FF0284C7' : 'FF334155' },
    };
  });
  ws.getColumn(1).width = 88;
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter((v) => v && v !== '—'))].sort((a, b) =>
    a.localeCompare(b, 'id'),
  );
}

/** Ambil N kunci teratas menurut frekuensi (untuk rekap WO / Line yang banyak) */
export function topKeysByFrequency(values: string[], limit = 40): string[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const t = raw.trim();
    if (!t || t === '—') continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

export function enableFullRecalcOnLoad(workbook: ExcelJS.Workbook): void {
  workbook.calcProperties.fullCalcOnLoad = true;
}

import ExcelJS from 'exceljs';
import type {
  GccCuttingSmarketOutReportItem,
  GccCuttingSmarketOutReportResponse,
} from '../config/api';
import { EXPORT_BANNER_BORDER, formatExportedAtId, toDisplayDateToken } from './exportExcelBanner';
import {
  addAnalysisSheet,
  addChartDataSheet,
  addExcelGuideSheet,
  addFlatDataTableSheet,
  enableFullRecalcOnLoad,
  excelCellRef,
  topKeysByFrequency,
  topWoKeysByFrequency,
  uniqueSorted,
  woCellValue,
  type ExcelTableColumnDef,
  type NumericColFormat,
} from './exportExcelAnalytics';

const SMARKET_WO_COL_INDEX = 6;
const SMARKET_NUMERIC_COLS: NumericColFormat[] = [{ colIndex: SMARKET_WO_COL_INDEX, numFmt: '0' }];

const SMARKET_TABLE_NAME = 'SmarketOutData';

const AMBER_DARK = 'FF2F75B5';
const AMBER_LIGHT = 'FFDDEBF7';
const AMBER_SOFT = 'FFEAF3F8';
const SLATE_HEADER = 'FF1E293B';
const WHITE = 'FFFFFFFF';
const BORDER = EXPORT_BANNER_BORDER;
const DETAIL_TABLE_BLUE = 'FF2F75B5';
const DETAIL_TABLE_BLUE_SOFT = 'FFDDEBF7';
const OUT_BG = 'FFDBEAFE';
const OUT_FG = 'FF1D4ED8';
const GOOD_BG = 'FFD1FAE5';
const GOOD_FG = 'FF065F46';
const MARKET_OUT_BG = 'FFFFEDD5';
const MARKET_OUT_FG = 'FF9A3412';
const SEWING_BG = 'FFDBE5F1';
const SEWING_FG = 'FF1F4E79';

function n(v: unknown): number {
  const x = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

function str(v: unknown): string {
  if (v == null) return '—';
  const s = String(v).trim();
  return s === '' ? '—' : s;
}

function formatDt(iso?: string): string {
  if (!iso?.trim()) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function downloadBuffer(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function writeTitleBlock(ws: ExcelJS.Worksheet, ncol: number, title: string, from: string, to: string): void {
  const periodText = `Periode: ${toDisplayDateToken(from) || '-'}  s/d  ${toDisplayDateToken(to) || '-'}`;
  const exported = formatExportedAtId();

  ws.mergeCells(1, 1, 1, ncol);
  const c1 = ws.getCell(1, 1);
  c1.value = title;
  c1.font = { bold: true, size: 18, name: 'Calibri', color: { argb: WHITE } };
  c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMBER_DARK } };
  c1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  c1.border = BORDER;
  ws.getRow(1).height = 38;

  ws.mergeCells(2, 1, 2, ncol);
  const c2 = ws.getCell(2, 1);
  c2.value = periodText;
  c2.font = { size: 12, name: 'Calibri', color: { argb: SLATE_HEADER } };
  c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMBER_LIGHT } };
  c2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  c2.border = BORDER;
  ws.getRow(2).height = 26;

  ws.mergeCells(3, 1, 3, ncol);
  const c3 = ws.getCell(3, 1);
  c3.value = `Waktu ekspor: ${exported}  ·  Tujuan report: SEWING (bundle OUT dari SMarket Cutting)`;
  c3.font = { size: 11, name: 'Calibri', color: { argb: 'FF475569' }, italic: true };
  c3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMBER_SOFT } };
  c3.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
  c3.border = BORDER;
  ws.getRow(3).height = 26;
}

function styleSectionHeader(cell: ExcelJS.Cell, text: string, fillArgb: string): void {
  cell.value = text;
  cell.font = { bold: true, size: 12, name: 'Calibri', color: { argb: WHITE } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  cell.border = BORDER;
}

function writeSummary(ws: ExcelJS.Worksheet, startRow: number, totalData: number, items: GccCuttingSmarketOutReportItem[]): number {
  const ncol = 6;
  let sumGood = 0;
  let sumOut = 0;
  for (const it of items) {
    sumGood += n(it.qty_good);
    sumOut += n(it.qty_market_out);
  }

  ws.mergeCells(startRow, 1, startRow, ncol);
  styleSectionHeader(ws.getCell(startRow, 1), 'RINGKASAN — BUNDLE OUT SMARKET CUTTING', AMBER_DARK);
  ws.getRow(startRow).height = 28;

  const rows: { label: string; value: string | number; accent?: { bg: string; fg: string } }[] = [
    { label: 'Total bundle OUT (baris data)', value: totalData, accent: { bg: OUT_BG, fg: OUT_FG } },
    { label: 'Total qty Good', value: sumGood, accent: { bg: GOOD_BG, fg: GOOD_FG } },
    { label: 'Total qty SMarket OUT', value: sumOut, accent: { bg: MARKET_OUT_BG, fg: MARKET_OUT_FG } },
    { label: 'Tujuan', value: 'SEWING', accent: { bg: SEWING_BG, fg: SEWING_FG } },
  ];

  let r = startRow + 1;
  for (const item of rows) {
    ws.mergeCells(r, 1, r, 2);
    ws.mergeCells(r, 3, r, ncol);
    const labelCell = ws.getCell(r, 1);
    labelCell.value = item.label;
    labelCell.font = { bold: true, size: 10, color: { argb: 'FF475569' } };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    labelCell.border = BORDER;
    labelCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    const valCell = ws.getCell(r, 3);
    valCell.value = item.value;
    valCell.font = { bold: true, size: 11, color: { argb: item.accent?.fg ?? SLATE_HEADER } };
    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.accent?.bg ?? WHITE } };
    valCell.border = BORDER;
    valCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
    ws.getRow(r).height = 22;
    r += 1;
  }
  return r + 1;
}

const HEADERS = [
  'No',
  'Status Terakhir',
  'Waktu Dibuat',
  'Waktu Terakhir',
  'RFID Bundle',
  'Barcode GCC',
  'WO',
  'Style',
  'Bagian',
  'Warna',
  'Ukuran',
  'Meja',
  'No. Ikat',
  'No. Urut',
  'Season',
  'Placing',
  'Qty Good',
  'Qty SMarket OUT',
  'Tujuan',
  'Line',
  'Branch',
] as const;

/** Lebar kolom (karakter) — cukup untuk barcode, waktu, style, dan bagian tanpa wrap */
const DETAIL_COL_WIDTHS = [
  6, 14, 22, 22, 16, 28, 10, 12, 16, 9, 8, 8, 10, 12, 8, 10, 11, 14, 10, 12, 14,
] as const;

const SMARKET_DETAIL_FONT_HEADER = 12;
const SMARKET_DETAIL_FONT_DATA = 11;
const SMARKET_DETAIL_HEADER_ROW_HEIGHT = 30;
const SMARKET_DETAIL_DATA_ROW_HEIGHT = 22;

function writeDetailTable(ws: ExcelJS.Worksheet, startRow: number, items: GccCuttingSmarketOutReportItem[]): number {
  const ncol = HEADERS.length;
  ws.mergeCells(startRow, 1, startRow, ncol);
  styleSectionHeader(ws.getCell(startRow, 1), 'DETAIL BUNDLE OUT → SEWING', 'FF0369A1');
  ws.getRow(startRow).height = 28;

  const headerRow = startRow + 1;
  HEADERS.forEach((h, i) => {
    const cell = ws.getCell(headerRow, i + 1);
    cell.value = h;
    cell.font = { bold: true, size: SMARKET_DETAIL_FONT_HEADER, name: 'Calibri', color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DETAIL_TABLE_BLUE } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = BORDER;
  });
  ws.getRow(headerRow).height = SMARKET_DETAIL_HEADER_ROW_HEIGHT;
  ws.autoFilter = {
    from: excelCellRef(headerRow, 1),
    to: excelCellRef(headerRow + Math.max(items.length, 1), ncol),
  };

  if (items.length === 0) {
    const emptyRow = headerRow + 1;
    ws.mergeCells(emptyRow, 1, emptyRow, ncol);
    const c = ws.getCell(emptyRow, 1);
    c.value = 'Tidak ada bundle OUT pada periode filter ini.';
    c.font = { italic: true, size: 11, color: { argb: 'FF64748B' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMBER_SOFT } };
    return emptyRow + 2;
  }

  items.forEach((it, idx) => {
    const r = headerRow + 1 + idx;
    const values: (string | number)[] = [
      idx + 1,
      str(it.status_terakhir),
      formatDt(it.waktu_dibuat),
      formatDt(it.waktu_terakhir),
      str(it.rfid),
      str(it.barcode_gcc),
      woCellValue(it.wo) ?? '',
      str(it.style),
      str(it.bagian),
      str(it.warna),
      str(it.ukuran),
      str(it.meja),
      it.no_ikat != null ? n(it.no_ikat) : '—',
      str(it.no_urut),
      str(it.season),
      str(it.placing),
      n(it.qty_good),
      n(it.qty_market_out),
      str(it.tujuan),
      str(it.line),
      str(it.branch),
    ];

    values.forEach((val, colIdx) => {
      const cell = ws.getCell(r, colIdx + 1);
      cell.value = val;
      cell.border = BORDER;
      cell.font = { size: SMARKET_DETAIL_FONT_DATA, name: 'Calibri', color: { argb: 'FF0F172A' } };
      const isNum = colIdx === 16 || colIdx === 17;
      const isCenter = colIdx <= 3 || colIdx === 12;
      cell.alignment = {
        vertical: 'middle',
        horizontal: isCenter ? 'center' : isNum ? 'right' : 'left',
        indent: isNum || isCenter ? 0 : 1,
        wrapText: false,
      };

      if (colIdx === 6) {
        const wo = woCellValue(it.wo);
        cell.value = wo ?? '—';
        if (typeof wo === 'number') cell.numFmt = '0';
      }
      if (colIdx === 1) {
        cell.font = { bold: true, size: SMARKET_DETAIL_FONT_DATA, color: { argb: OUT_FG } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OUT_BG } };
      } else if (colIdx === 16) {
        cell.font = { bold: true, size: SMARKET_DETAIL_FONT_DATA, color: { argb: GOOD_FG } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
      } else if (colIdx === 17) {
        cell.font = { bold: true, size: SMARKET_DETAIL_FONT_DATA, color: { argb: MARKET_OUT_FG } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MARKET_OUT_BG } };
      } else if (colIdx === 18) {
        cell.font = { bold: true, size: SMARKET_DETAIL_FONT_DATA, color: { argb: SEWING_FG } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SEWING_BG } };
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: idx % 2 === 0 ? WHITE : DETAIL_TABLE_BLUE_SOFT },
        };
      }
    });
    ws.getRow(r).height = SMARKET_DETAIL_DATA_ROW_HEIGHT;
  });

  return headerRow + 1 + items.length + 1;
}

function buildSmarketDataRows(items: GccCuttingSmarketOutReportItem[]): (string | number)[][] {
  return items.map((it, idx) => [
    idx + 1,
    str(it.status_terakhir),
    formatDt(it.waktu_dibuat),
    formatDt(it.waktu_terakhir),
    str(it.rfid),
    str(it.barcode_gcc),
    woCellValue(it.wo) ?? '',
    str(it.style),
    str(it.bagian),
    str(it.warna),
    str(it.ukuran),
    str(it.meja),
    it.no_ikat != null ? n(it.no_ikat) : '—',
    str(it.no_urut),
    str(it.season),
    str(it.placing),
    n(it.qty_good),
    n(it.qty_market_out),
    str(it.tujuan),
    str(it.line),
    str(it.branch),
  ]);
}

function buildSmarketTableColumns(): ExcelTableColumnDef[] {
  return HEADERS.map((name, i) => ({
    name,
    filterButton: true,
    totalsRowFunction: i === 16 || i === 17 ? ('sum' as const) : ('none' as const),
  }));
}

function appendSmarketAnalyticsSheets(
  workbook: ExcelJS.Workbook,
  items: GccCuttingSmarketOutReportItem[],
): void {
  let sumGood = 0;
  let sumOut = 0;
  for (const it of items) {
    sumGood += n(it.qty_good);
    sumOut += n(it.qty_market_out);
  }

  const dataRows = buildSmarketDataRows(items);
  addFlatDataTableSheet(
    workbook,
    'Data',
    SMARKET_TABLE_NAME,
    HEADERS,
    dataRows,
    DETAIL_COL_WIDTHS,
    buildSmarketTableColumns(),
    SMARKET_NUMERIC_COLS,
  );

  const lines = topKeysByFrequency(items.map((it) => str(it.line)), 25);
  const branches = uniqueSorted(items.map((it) => str(it.branch)));
  const wos = topWoKeysByFrequency(items.map((it) => it.wo));
  const styles = topKeysByFrequency(items.map((it) => str(it.style)), 25);

  addAnalysisSheet(
    workbook,
    'Analisis',
    SMARKET_TABLE_NAME,
    [
      {
        title: 'Rekap per Line (top 25)',
        keyHeader: 'Line',
        keys: lines,
        metricHeaders: [
          { label: 'Jumlah bundle', countCol: 'Line' },
          { label: 'Σ Qty Good', sumCol: 'Qty Good' },
          { label: 'Σ Qty SMarket OUT', sumCol: 'Qty SMarket OUT' },
        ],
      },
      {
        title: 'Rekap per Branch',
        keyHeader: 'Branch',
        keys: branches,
        metricHeaders: [
          { label: 'Jumlah bundle', countCol: 'Branch' },
          { label: 'Σ Qty SMarket OUT', sumCol: 'Qty SMarket OUT' },
        ],
      },
      {
        title: 'Rekap per WO (top 40)',
        keyHeader: 'WO',
        keys: wos,
        metricHeaders: [
          { label: 'Jumlah bundle', countCol: 'WO' },
          { label: 'Σ Qty SMarket OUT', sumCol: 'Qty SMarket OUT' },
        ],
      },
      {
        title: 'Rekap per Style (top 25)',
        keyHeader: 'Style',
        keys: styles,
        metricHeaders: [
          { label: 'Jumlah bundle', countCol: 'Style' },
          { label: 'Σ Qty Good', sumCol: 'Qty Good' },
        ],
      },
    ],
    AMBER_DARK,
  );

  addChartDataSheet(
    workbook,
    'Grafik',
    'Total qty Good vs SMarket OUT',
    [
      { label: 'Total Qty Good', value: sumGood },
      { label: 'Total Qty SMarket OUT', value: sumOut },
      { label: 'Jumlah bundle', value: items.length },
    ],
    AMBER_DARK,
  );

  const lineChartRows = lines.slice(0, 12).map((line) => ({
    label: line,
    value: items.filter((it) => str(it.line) === line).reduce((acc, it) => acc + n(it.qty_market_out), 0),
  }));
  if (lineChartRows.length > 0) {
    addChartDataSheet(workbook, 'Grafik per Line', 'Qty OUT per Line (top 12)', lineChartRows, AMBER_DARK);
  }

  addExcelGuideSheet(workbook, {
    dataSheetName: 'Data',
    tableName: SMARKET_TABLE_NAME,
    analysisSheetName: 'Analisis',
    chartSheetName: 'Grafik',
    reportType: 'SMarket OUT',
  });
}

export async function exportSmarketOutReportExcel({
  payload,
  filterDateFrom,
  filterDateTo,
}: {
  payload: GccCuttingSmarketOutReportResponse;
  filterDateFrom: string;
  filterDateTo: string;
}): Promise<void> {
  const report = payload.data;
  const items = report?.items ?? [];
  const totalData = report?.total_data ?? items.length;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RFID Tracking — Gistex';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Laporan', {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: true }],
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.35, right: 0.35, top: 0.45, bottom: 0.45, header: 0.3, footer: 0.3 },
    },
  });

  const ncol = HEADERS.length;
  writeTitleBlock(ws, ncol, 'LAPORAN SMARKET OUT — CUTTING → SEWING', filterDateFrom, filterDateTo);

  let nextRow = writeSummary(ws, 5, totalData, items);
  nextRow += 1;
  writeDetailTable(ws, nextRow, items);
  ws.columns = DETAIL_COL_WIDTHS.map((width) => ({ width }));

  appendSmarketAnalyticsSheets(workbook, items);
  enableFullRecalcOnLoad(workbook);

  const from = filterDateFrom.replace(/-/g, '');
  const to = filterDateTo.replace(/-/g, '');
  const filename = `SMarket_OUT_Report_${from}_to_${to}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, filename);
}

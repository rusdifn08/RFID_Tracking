import ExcelJS from 'exceljs';
import type { GccCuttingQcReportItem, GccCuttingQcReportResponse, GccCuttingQcReportSummary } from '../config/api';
import { EXPORT_BANNER_BORDER, formatExportedAtId, toDisplayDateToken } from './exportExcelBanner';
import {
  addAnalysisSheet,
  addChartDataSheet,
  addExcelGuideSheet,
  addFlatDataTableSheet,
  enableFullRecalcOnLoad,
  topKeysByFrequency,
  uniqueSorted,
  type ExcelTableColumnDef,
} from './exportExcelAnalytics';

const QC_TABLE_NAME = 'QcCuttingData';

const SKY = 'FF0284C7';
const SKY_LIGHT = 'FFE0F2FE';
const SKY_SOFT = 'FFF0F9FF';
const SLATE_HEADER = 'FF1E293B';
const WHITE = 'FFFFFFFF';
const BORDER = EXPORT_BANNER_BORDER;

const GOOD_BG = 'FFD1FAE5';
const GOOD_FG = 'FF065F46';
const REPAIR_BG = 'FFFFEDD5';
const REPAIR_FG = 'FF9A3412';
const REJECT_BG = 'FFFEE2E2';
const REJECT_FG = 'FF991B1B';
const VIOLET_BG = 'FFEDE9FE';
const VIOLET_FG = 'FF5B21B6';

function n(v: unknown): number {
  const x = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

function pct(v: unknown): string {
  const x = n(v);
  return `${x.toFixed(2)}%`;
}

function str(v: unknown): string {
  if (v == null) return '—';
  const s = String(v).trim();
  return s === '' ? '—' : s;
}

function formatQcTime(iso?: string): string {
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

function statusStyle(status: string): { bg: string; fg: string } {
  const s = status.toUpperCase();
  if (s.includes('REJECT')) return { bg: REJECT_BG, fg: REJECT_FG };
  if (s.includes('REPAIR')) return { bg: REPAIR_BG, fg: REPAIR_FG };
  return { bg: GOOD_BG, fg: GOOD_FG };
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

function writeQcTitleBlock(ws: ExcelJS.Worksheet, ncol: number, title: string, from: string, to: string): number {
  const periodText = `Periode: ${toDisplayDateToken(from) || '-'}  s/d  ${toDisplayDateToken(to) || '-'}`;
  const exported = formatExportedAtId();

  ws.mergeCells(1, 1, 1, ncol);
  const c1 = ws.getCell(1, 1);
  c1.value = title;
  c1.font = { bold: true, size: 18, name: 'Calibri', color: { argb: WHITE } };
  c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SKY } };
  c1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  c1.border = BORDER;
  ws.getRow(1).height = 38;

  ws.mergeCells(2, 1, 2, ncol);
  const c2 = ws.getCell(2, 1);
  c2.value = periodText;
  c2.font = { size: 12, name: 'Calibri', color: { argb: SLATE_HEADER } };
  c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SKY_LIGHT } };
  c2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  c2.border = BORDER;
  ws.getRow(2).height = 26;

  ws.mergeCells(3, 1, 3, ncol);
  const c3 = ws.getCell(3, 1);
  c3.value = `Waktu ekspor: ${exported}`;
  c3.font = { size: 11, name: 'Calibri', color: { argb: 'FF475569' }, italic: true };
  c3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SKY_SOFT } };
  c3.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  c3.border = BORDER;
  ws.getRow(3).height = 22;

  return 4;
}

function styleSectionHeader(cell: ExcelJS.Cell, text: string, fillArgb: string): void {
  cell.value = text;
  cell.font = { bold: true, size: 12, name: 'Calibri', color: { argb: WHITE } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  cell.border = BORDER;
}

function styleSummaryLabel(cell: ExcelJS.Cell, text: string): void {
  cell.value = text;
  cell.font = { bold: true, size: 10, name: 'Calibri', color: { argb: 'FF475569' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  cell.border = BORDER;
}

function styleSummaryValue(cell: ExcelJS.Cell, value: string | number, accent?: { bg: string; fg: string }): void {
  cell.value = value;
  cell.font = {
    bold: true,
    size: 11,
    name: 'Calibri',
    color: { argb: accent?.fg ?? SLATE_HEADER },
  };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: accent?.bg ?? WHITE },
  };
  cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
  cell.border = BORDER;
}

function writeSummarySection(
  ws: ExcelJS.Worksheet,
  startRow: number,
  summary: GccCuttingQcReportSummary | undefined,
  itemCount: number,
): number {
  const ncol = 6;
  ws.mergeCells(startRow, 1, startRow, ncol);
  styleSectionHeader(ws.getCell(startRow, 1), 'RINGKASAN MANAJEMEN — QUALITY CONTROL CUTTING', SKY);
  ws.getRow(startRow).height = 28;

  const rows: { label: string; value: string | number; accent?: { bg: string; fg: string } }[] = [
    { label: 'Jumlah bundle QC', value: n(summary?.total_bundle_qc) },
    { label: 'Bundle Good', value: n(summary?.total_bundle_good), accent: { bg: GOOD_BG, fg: GOOD_FG } },
    { label: 'Bundle Repair', value: n(summary?.total_bundle_repair), accent: { bg: REPAIR_BG, fg: REPAIR_FG } },
    { label: 'Bundle Reject', value: n(summary?.total_bundle_reject), accent: { bg: REJECT_BG, fg: REJECT_FG } },
    { label: 'Total qty Good', value: n(summary?.total_qty_good), accent: { bg: GOOD_BG, fg: GOOD_FG } },
    { label: 'Total qty Repair', value: n(summary?.total_qty_repair), accent: { bg: REPAIR_BG, fg: REPAIR_FG } },
    { label: 'Total qty Reject', value: n(summary?.total_qty_reject), accent: { bg: REJECT_BG, fg: REJECT_FG } },
    { label: 'Total qty QC', value: n(summary?.total_qty_qc), accent: { bg: VIOLET_BG, fg: VIOLET_FG } },
    { label: 'Good rate (%)', value: pct(summary?.good_rate_percent), accent: { bg: GOOD_BG, fg: GOOD_FG } },
    { label: 'Repair rate (%)', value: pct(summary?.repair_rate_percent), accent: { bg: REPAIR_BG, fg: REPAIR_FG } },
    { label: 'Reject rate (%)', value: pct(summary?.reject_rate_percent), accent: { bg: REJECT_BG, fg: REJECT_FG } },
    { label: 'Jumlah baris detail', value: itemCount },
  ];

  let r = startRow + 1;
  for (const item of rows) {
    ws.mergeCells(r, 1, r, 2);
    ws.mergeCells(r, 3, r, ncol);
    styleSummaryLabel(ws.getCell(r, 1), item.label);
    styleSummaryValue(ws.getCell(r, 3), item.value, item.accent);
    ws.getRow(r).height = 22;
    r += 1;
  }
  return r + 1;
}

const DETAIL_HEADERS = [
  'No',
  'Waktu QC',
  'Status',
  'RFID Bundle',
  'Barcode',
  'WO',
  'Style',
  'Warna',
  'Size',
  'Meja',
  'No. Ikat',
  'No. Urut',
  'Season',
  'Country',
  'Placing',
  'Qty Output',
  'Qty Good',
  'Qty Repair',
  'Qty Reject',
  'Qty Status',
] as const;

/** Lebar kolom (karakter) — disesuaikan agar barcode, waktu QC, dan teks panjang tidak terpotong */
const DETAIL_COL_WIDTHS = [
  6, 22, 12, 16, 26, 10, 12, 9, 8, 8, 10, 12, 8, 12, 10, 11, 11, 11, 11, 11,
] as const;

const QC_DETAIL_FONT_HEADER = 12;
const QC_DETAIL_FONT_DATA = 11;
const QC_DETAIL_HEADER_ROW_HEIGHT = 30;
const QC_DETAIL_DATA_ROW_HEIGHT = 22;

function writeDetailTable(ws: ExcelJS.Worksheet, startRow: number, items: GccCuttingQcReportItem[]): number {
  const ncol = DETAIL_HEADERS.length;
  ws.mergeCells(startRow, 1, startRow, ncol);
  styleSectionHeader(ws.getCell(startRow, 1), 'DETAIL PER BUNDLE', 'FF0369A1');
  ws.getRow(startRow).height = 28;

  const headerRow = startRow + 1;
  DETAIL_HEADERS.forEach((h, i) => {
    const cell = ws.getCell(headerRow, i + 1);
    cell.value = h;
    cell.font = { bold: true, size: QC_DETAIL_FONT_HEADER, name: 'Calibri', color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_HEADER } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = BORDER;
  });
  ws.getRow(headerRow).height = QC_DETAIL_HEADER_ROW_HEIGHT;

  if (items.length === 0) {
    const emptyRow = headerRow + 1;
    ws.mergeCells(emptyRow, 1, emptyRow, ncol);
    const c = ws.getCell(emptyRow, 1);
    c.value = 'Tidak ada data pada periode ini.';
    c.font = { italic: true, size: 11, color: { argb: 'FF64748B' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SKY_SOFT } };
    return emptyRow + 2;
  }

  items.forEach((it, idx) => {
    const r = headerRow + 1 + idx;
    const status = str(it.status_qc);
    const st = statusStyle(status);
    const values: (string | number)[] = [
      idx + 1,
      formatQcTime(it.qc_time),
      status,
      str(it.rfid_bundles),
      str(it.barcode),
      str(it.wo),
      str(it.style),
      str(it.warna),
      str(it.size),
      str(it.meja),
      it.no_ikat != null ? n(it.no_ikat) : '—',
      str(it.no_urut),
      str(it.season),
      str(it.country),
      str(it.placing),
      n(it.qty_output),
      n(it.qty_good),
      n(it.qty_repair),
      n(it.qty_reject),
      n(it.qty_status),
    ];

    values.forEach((val, colIdx) => {
      const cell = ws.getCell(r, colIdx + 1);
      cell.value = val;
      cell.border = BORDER;
      cell.font = { size: QC_DETAIL_FONT_DATA, name: 'Calibri', color: { argb: 'FF0F172A' } };
      const isNum = colIdx >= 15;
      cell.alignment = {
        vertical: 'middle',
        horizontal: colIdx <= 2 ? 'center' : isNum ? 'right' : 'left',
        indent: isNum ? 0 : 1,
        wrapText: colIdx === 1 || colIdx === 4,
      };
      if (colIdx === 2) {
        cell.font = { bold: true, size: QC_DETAIL_FONT_DATA, name: 'Calibri', color: { argb: st.fg } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: st.bg } };
      } else if (colIdx === 16) {
        cell.font = { bold: true, size: QC_DETAIL_FONT_DATA, color: { argb: GOOD_FG } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
      } else if (colIdx === 17) {
        cell.font = { bold: true, size: QC_DETAIL_FONT_DATA, color: { argb: REPAIR_FG } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
      } else if (colIdx === 18) {
        cell.font = { bold: true, size: QC_DETAIL_FONT_DATA, color: { argb: REJECT_FG } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } };
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: idx % 2 === 0 ? WHITE : SKY_SOFT },
        };
      }
    });
    ws.getRow(r).height = QC_DETAIL_DATA_ROW_HEIGHT;
  });

  return headerRow + 1 + items.length + 1;
}

function buildQcDataRows(items: GccCuttingQcReportItem[]): (string | number)[][] {
  return items.map((it, idx) => [
    idx + 1,
    formatQcTime(it.qc_time),
    str(it.status_qc),
    str(it.rfid_bundles),
    str(it.barcode),
    str(it.wo),
    str(it.style),
    str(it.warna),
    str(it.size),
    str(it.meja),
    it.no_ikat != null ? n(it.no_ikat) : '—',
    str(it.no_urut),
    str(it.season),
    str(it.country),
    str(it.placing),
    n(it.qty_output),
    n(it.qty_good),
    n(it.qty_repair),
    n(it.qty_reject),
    n(it.qty_status),
  ]);
}

function buildQcTableColumns(): ExcelTableColumnDef[] {
  return DETAIL_HEADERS.map((name, i) => ({
    name,
    filterButton: true,
    totalsRowFunction: i >= 15 && i <= 19 ? ('sum' as const) : ('none' as const),
  }));
}

function appendQcAnalyticsSheets(
  workbook: ExcelJS.Workbook,
  items: GccCuttingQcReportItem[],
  summary: GccCuttingQcReportSummary | undefined,
): void {
  const dataRows = buildQcDataRows(items);
  addFlatDataTableSheet(workbook, 'Data', QC_TABLE_NAME, DETAIL_HEADERS, dataRows, DETAIL_COL_WIDTHS, buildQcTableColumns());

  const statuses = uniqueSorted(items.map((it) => str(it.status_qc)));
  const wos = topKeysByFrequency(items.map((it) => str(it.wo)));
  const styles = topKeysByFrequency(items.map((it) => str(it.style)), 30);
  const warnas = uniqueSorted(items.map((it) => str(it.warna)));

  addAnalysisSheet(
    workbook,
    'Analisis',
    QC_TABLE_NAME,
    [
      {
        title: 'Rekap per Status QC',
        keyHeader: 'Status',
        keys: statuses,
        metricHeaders: [
          { label: 'Jumlah baris', countCol: 'Status' },
          { label: 'Σ Qty Good', sumCol: 'Qty Good' },
          { label: 'Σ Qty Repair', sumCol: 'Qty Repair' },
          { label: 'Σ Qty Reject', sumCol: 'Qty Reject' },
          { label: 'Σ Qty Output', sumCol: 'Qty Output' },
        ],
      },
      {
        title: 'Rekap per WO (top 40)',
        keyHeader: 'WO',
        keys: wos,
        metricHeaders: [
          { label: 'Jumlah baris', countCol: 'WO' },
          { label: 'Σ Qty Good', sumCol: 'Qty Good' },
          { label: 'Σ Qty Repair', sumCol: 'Qty Repair' },
          { label: 'Σ Qty Reject', sumCol: 'Qty Reject' },
        ],
      },
      {
        title: 'Rekap per Style (top 30)',
        keyHeader: 'Style',
        keys: styles,
        metricHeaders: [
          { label: 'Jumlah baris', countCol: 'Style' },
          { label: 'Σ Qty Good', sumCol: 'Qty Good' },
        ],
      },
      {
        title: 'Rekap per Warna',
        keyHeader: 'Warna',
        keys: warnas,
        metricHeaders: [
          { label: 'Jumlah baris', countCol: 'Warna' },
          { label: 'Σ Qty Good', sumCol: 'Qty Good' },
        ],
      },
    ],
    SKY,
  );

  addChartDataSheet(
    workbook,
    'Grafik',
    'Ringkasan Qty QC (siap untuk chart)',
    [
      { label: 'Qty Good', value: n(summary?.total_qty_good) },
      { label: 'Qty Repair', value: n(summary?.total_qty_repair) },
      { label: 'Qty Reject', value: n(summary?.total_qty_reject) },
      { label: 'Qty Output', value: n(summary?.total_qty_qc) },
    ],
    SKY,
  );

  addChartDataSheet(
    workbook,
    'Grafik Bundle',
    'Jumlah bundle per status (siap untuk chart)',
    [
      { label: 'Bundle Good', value: n(summary?.total_bundle_good) },
      { label: 'Bundle Repair', value: n(summary?.total_bundle_repair) },
      { label: 'Bundle Reject', value: n(summary?.total_bundle_reject) },
    ],
    SKY,
  );

  addExcelGuideSheet(workbook, {
    dataSheetName: 'Data',
    tableName: QC_TABLE_NAME,
    analysisSheetName: 'Analisis',
    chartSheetName: 'Grafik',
    reportType: 'QC Cutting',
  });
}

export async function exportQcCuttingReportExcel({
  payload,
  filterDateFrom,
  filterDateTo,
}: {
  payload: GccCuttingQcReportResponse;
  filterDateFrom: string;
  filterDateTo: string;
}): Promise<void> {
  const reportData = payload.data;
  const items = reportData?.items ?? [];
  const summary = reportData?.summary;

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
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  });

  const ncol = DETAIL_HEADERS.length;
  writeQcTitleBlock(ws, ncol, 'LAPORAN QUALITY CONTROL CUTTING', filterDateFrom, filterDateTo);

  let nextRow = writeSummarySection(ws, 5, summary, items.length);
  nextRow += 1;
  writeDetailTable(ws, nextRow, items);
  ws.columns = DETAIL_COL_WIDTHS.map((width) => ({ width }));

  appendQcAnalyticsSheets(workbook, items, summary);
  enableFullRecalcOnLoad(workbook);

  const from = filterDateFrom.replace(/-/g, '');
  const to = filterDateTo.replace(/-/g, '');
  const filename = `QC_Cutting_Report_${from}_to_${to}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, filename);
}

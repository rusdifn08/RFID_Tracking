import ExcelJS from 'exceljs';

export type SewingBatchExportRow = {
  no_batch: string | number;
  nama_batch: string;
  in: number;
  out: number;
  output_pcs: number;
};

export type SewingBatchDetailTap = {
  id_bundles: number | string;
  rfid_batch: string;
  batch: string | number;
  ket_batch: string | null;
  status: string;
  created_at: string;
};

function formatDateIndo(date: Date): string {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
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

function styleHeaderRow(row: ExcelJS.Row, colCount: number): void {
  row.height = 25;
  for (let i = 1; i <= colCount; i++) {
    const cell = row.getCell(i);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FF0F172A' } },
    };
  }
}

function styleDataCell(cell: ExcelJS.Cell, even: boolean, align: 'left' | 'center' = 'center'): void {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: even ? 'FFFFFFFF' : 'FFF8FAFC' },
  };
  cell.font = { size: 10, color: { argb: 'FF1E293B' } };
  cell.alignment = { horizontal: align, vertical: 'middle' };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };
}

/** Export kumulatif: 1 baris per batch untuk range tanggalfrom→tanggalto (bukan per hari). */
export async function exportSewingBatchToExcel(
  lineNo: string,
  order: {
    wo: string;
    style: string;
    size: string;
    buyer: string;
    item: string;
    color: string;
  },
  batches: SewingBatchExportRow[],
  dateFrom: string,
  dateTo: string,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Kumulatif', {
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  });

  ws.mergeCells('A1:H1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `SEWING BATCH KUMULATIF - LINE ${lineNo}`;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:H2');
  const fromLabel = dateFrom || '-';
  const toLabel = dateTo || '-';
  const subtitleCell = ws.getCell('A2');
  subtitleCell.value = `Periode: ${fromLabel} s/d ${toLabel} (akumulasi)`;
  subtitleCell.font = { size: 10, color: { argb: 'FF64748B' } };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 20;

  ws.addRow([]);

  const addMetaRow = (label1: string, val1: string, label2: string, val2: string) => {
    const r = ws.addRow(['', label1, val1, '', '', label2, val2, '']);
    r.height = 18;
    r.getCell(2).font = { bold: true, size: 10, color: { argb: 'FF475569' } };
    r.getCell(3).font = { size: 10, color: { argb: 'FF1E293B' } };
    r.getCell(6).font = { bold: true, size: 10, color: { argb: 'FF475569' } };
    r.getCell(7).font = { size: 10, color: { argb: 'FF1E293B' } };
  };

  addMetaRow('Nomor WO:', order.wo, 'Ukuran (Size):', order.size);
  addMetaRow('Kode Style:', order.style, 'Warna (Color):', order.color);
  addMetaRow('Nama Buyer:', order.buyer, 'Nama Item:', order.item);

  ws.addRow([]);

  const periodeLabel =
    dateFrom && dateTo && dateFrom !== 'Semua Tanggal'
      ? `${dateFrom} s/d ${dateTo}`
      : formatDateIndo(new Date());

  const headers = [
    'Periode',
    'No. Batch',
    'Nama Batch',
    'Bundle Masuk (IN)',
    'Bundle Selesai (OUT)',
    'WIP Bundle',
    'Output Selesai (pcs)',
    'Persentase',
  ];
  styleHeaderRow(ws.addRow(headers), headers.length);

  const sorted = [...batches].sort((a, b) => Number(a.no_batch) - Number(b.no_batch));
  sorted.forEach((b, idx) => {
    const bundleIn = Number(b.in) || 0;
    const bundleOut = Number(b.out) || 0;
    const wipBundle = Math.max(0, bundleIn - bundleOut);
    const outputPcs = Number(b.output_pcs) || 0;
    const percentageVal = bundleIn > 0 ? `${Math.round((bundleOut / bundleIn) * 100)}%` : '0%';
    const rowData = [
      periodeLabel,
      b.no_batch,
      b.nama_batch || '-',
      bundleIn,
      bundleOut,
      wipBundle,
      outputPcs,
      percentageVal,
    ];
    const r = ws.addRow(rowData);
    r.height = 20;
    rowData.forEach((_, i) => {
      styleDataCell(r.getCell(i + 1), idx % 2 === 0, i === 2 ? 'left' : 'center');
    });
  });

  [18, 12, 22, 18, 18, 15, 20, 15].forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  await downloadWorkbook(workbook, `sewing-line-${lineNo}-kumulatif.xlsx`);
}

function tapDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function tapDateLabel(dateKey: string): string {
  if (dateKey === 'unknown') return '-';
  const d = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return formatDateIndo(d);
}

/** Nama batch sama = 1 grup (no batch beda digabung); tanpa nama → pisah per no batch. */
function batchKey(row: SewingBatchDetailTap): string {
  const name = (row.ket_batch ?? '').trim().toUpperCase();
  return name || `#${String(row.batch ?? '').trim()}`;
}

type DailyBatchAgg = {
  dateKey: string;
  noBatch: string | number;
  namaBatch: string;
  bundleIn: number;
  bundleOut: number;
};

/** Agregasi tap per tanggal + no batch + nama batch. */
function groupDetailByDateAndBatch(rows: SewingBatchDetailTap[]): DailyBatchAgg[] {
  const map = new Map<string, DailyBatchAgg>();

  for (const row of rows) {
    const dateKey = tapDateKey(row.created_at);
    const key = `${dateKey}|${batchKey(row)}`;
    let agg = map.get(key);
    if (!agg) {
      agg = {
        dateKey,
        noBatch: row.batch ?? '-',
        namaBatch: (row.ket_batch ?? '').trim() || '-',
        bundleIn: 0,
        bundleOut: 0,
      };
      map.set(key, agg);
    }
    // Nama batch sama, no batch beda → pakai no batch paling kecil
    const noNew = Number(row.batch);
    const noOld = Number(agg.noBatch);
    if (Number.isFinite(noNew) && (!Number.isFinite(noOld) || noNew < noOld)) {
      agg.noBatch = row.batch;
    }
    const st = String(row.status || '').toLowerCase();
    if (st === 'in') agg.bundleIn += 1;
    else if (st === 'out') agg.bundleOut += 1;
  }

  return Array.from(map.values()).sort((a, b) => {
    const d = a.dateKey.localeCompare(b.dateKey);
    if (d !== 0) return d;
    const nb = Number(a.noBatch) - Number(b.noBatch);
    if (nb !== 0) return nb;
    return a.namaBatch.localeCompare(b.namaBatch);
  });
}

const DETAIL_SUMMARY_HEADERS = [
  'Tanggal',
  'No. Batch',
  'Nama Batch',
  'Bundle Masuk (IN)',
  'Bundle Selesai (OUT)',
  'WIP Bundle',
  'Output Selesai (pcs)',
  'Persentase',
];

const DETAIL_COL_WIDTHS = [18, 12, 22, 18, 18, 15, 20, 15];

function mergeDateColumn(ws: ExcelJS.Worksheet, col: string, startRow: number, endRow: number): void {
  if (endRow <= startRow) return;
  ws.mergeCells(`${col}${startRow}:${col}${endRow}`);
  const cell = ws.getCell(`${col}${startRow}`);
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
}

/** Export detail: ringkasan per tanggal & per batch (dari API detail tap), layout seperti kumulatif harian. */
export async function exportSewingBatchDetailToExcel(
  lineNo: string,
  rows: SewingBatchDetailTap[],
  dateFrom: string,
  dateTo: string,
  pcsPerBundle = 15,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Detail per Hari', {
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  });

  ws.mergeCells('A1:H1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `SEWING BATCH DETAIL TAP - LINE ${lineNo}`;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:H2');
  const subtitleCell = ws.getCell('A2');
  subtitleCell.value = `Periode: ${dateFrom || '-'} s/d ${dateTo || '-'} | Total tap: ${rows.length}`;
  subtitleCell.font = { size: 10, color: { argb: 'FF64748B' } };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 20;

  ws.addRow([]);

  styleHeaderRow(ws.addRow(DETAIL_SUMMARY_HEADERS), DETAIL_SUMMARY_HEADERS.length);

  const grouped = groupDetailByDateAndBatch(rows);
  const dateKeys = [...new Set(grouped.map((g) => g.dateKey))];
  const colCount = DETAIL_SUMMARY_HEADERS.length;
  const BLOCK_BORDER = { style: 'medium' as const, color: { argb: 'FF1E3A8A' } };

  dateKeys.forEach((dateKey, dateIdx) => {
    const dayGroups = grouped.filter((g) => g.dateKey === dateKey);
    const dateLabel = tapDateLabel(dateKey);
    const blockStart = ws.lastRow!.number + 1;
    // Selang-seling per tanggal: soft biru / putih
    const blockFill = dateIdx % 2 === 0 ? 'FFEFF6FF' : 'FFFFFFFF';

    dayGroups.forEach((g) => {
      const wip = Math.max(0, g.bundleIn - g.bundleOut);
      const outputPcs = g.bundleOut * pcsPerBundle;
      const pct = g.bundleIn > 0 ? `${Math.round((g.bundleOut / g.bundleIn) * 100)}%` : '0%';
      const rowData = [dateLabel, g.noBatch, g.namaBatch, g.bundleIn, g.bundleOut, wip, outputPcs, pct];
      const r = ws.addRow(rowData);
      r.height = 20;
      rowData.forEach((_, i) => {
        const cell = r.getCell(i + 1);
        styleDataCell(cell, true, i === 2 ? 'left' : 'center');
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: blockFill } };
      });
    });

    const blockEnd = ws.lastRow!.number;
    mergeDateColumn(ws, 'A', blockStart, blockEnd);

    // Border pembungkus blok tanggal
    for (let rNum = blockStart; rNum <= blockEnd; rNum++) {
      for (let c = 1; c <= colCount; c++) {
        const cell = ws.getRow(rNum).getCell(c);
        cell.border = {
          ...cell.border,
          ...(rNum === blockStart ? { top: BLOCK_BORDER } : {}),
          ...(rNum === blockEnd ? { bottom: BLOCK_BORDER } : {}),
          ...(c === 1 ? { left: BLOCK_BORDER } : {}),
          ...(c === colCount ? { right: BLOCK_BORDER } : {}),
        };
      }
    }
  });

  DETAIL_COL_WIDTHS.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  await downloadWorkbook(workbook, `sewing-line-${lineNo}-detail.xlsx`);
}

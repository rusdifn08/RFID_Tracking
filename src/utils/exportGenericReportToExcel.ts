import * as XLSX from 'xlsx';

type ExportGenericArgs = {
  reportTitle: string;
  payload: unknown;
  filePrefix: string;
  filterDateFrom?: string;
  filterDateTo?: string;
};

const toDateToken = (date?: string): string => {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
};

const normalizeRows = (payload: unknown): Record<string, unknown>[] => {
  if (Array.isArray(payload)) {
    return payload.map((item) => (item && typeof item === 'object' ? { ...(item as Record<string, unknown>) } : { value: item }));
  }
  if (payload && typeof payload === 'object') {
    return [{ ...(payload as Record<string, unknown>) }];
  }
  return [{ value: payload ?? '' }];
};

export async function exportGenericReportToExcel({
  reportTitle,
  payload,
  filePrefix,
  filterDateFrom,
  filterDateTo,
}: ExportGenericArgs): Promise<void> {
  const rows = normalizeRows(payload);
  if (!rows.length) {
    throw new Error('Data report kosong');
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');

  const today = toDateToken(new Date().toISOString());
  const from = toDateToken(filterDateFrom) || today;
  const to = toDateToken(filterDateTo) || from;
  const safePrefix = filePrefix.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safePrefix}_${from}_to_${to}.xlsx`;

  XLSX.writeFile(wb, filename, { compression: true });
  // Informative check to silence lint for reportTitle when currently not included in filename/sheet style.
  if (!reportTitle) return;
}


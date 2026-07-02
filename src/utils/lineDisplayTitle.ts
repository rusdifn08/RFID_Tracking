import type { ProductionLine } from '../data/production_line';

/** Nama tampilan kustom per line (lineId tetap untuk query/fetch) */
export const resolveLineDisplayTitle = (
  lineId: number,
  defaultTitle: string,
  displayTitles: Record<string, string> | undefined
): string => {
  const custom = displayTitles?.[lineId.toString()]?.trim();
  return custom || defaultTitle;
};

/** Cari kartu production line dari nomor line API (URL / query) */
export const findProductionLineByApiLine = (
  apiLineId: string,
  productionLines: ProductionLine[],
): ProductionLine | undefined => {
  const normalized = apiLineId.trim();
  const lineNumber = parseInt(normalized, 10);
  return productionLines.find((line) => {
    if (line.line && line.line === normalized) return true;
    if (line.line && parseInt(line.line, 10) === lineNumber) return true;
    if (line.id === lineNumber) return true;
    return false;
  });
};

/** Nama kartu untuk line API — mis. API line 10 → "Production Line 7" */
export const resolveLineTitleForApiLine = (
  apiLineId: string,
  productionLines: ProductionLine[],
  displayTitles: Record<string, string> | undefined,
  fallback?: string,
): string => {
  const found = findProductionLineByApiLine(apiLineId, productionLines);
  if (found) {
    return resolveLineDisplayTitle(found.id, found.title, displayTitles);
  }
  const direct = displayTitles?.[apiLineId]?.trim();
  if (direct) return direct;
  return fallback?.trim() || `Line ${apiLineId}`;
};

/** Ambil angka line dari judul kartu: "Production Line 7" → "7" */
export const extractLineNumberLabel = (title: string, fallback?: string): string => {
  const t = title.trim();
  if (!t) return fallback ?? '';
  const match =
    t.match(/(?:Production|Sewing)?\s*Line\s*(\d+)/i) ||
    t.match(/\bLine\s*(\d+)/i);
  if (match) return match[1];
  if (/^\d+$/.test(t)) return t;
  return fallback ?? t;
};

/** Angka line untuk tampilan tabel — ikut nama kartu, bukan API line mentah */
export const resolveLineNumberForApiLine = (
  apiLineId: string,
  productionLines: ProductionLine[],
  displayTitles: Record<string, string> | undefined,
): string => {
  const found = findProductionLineByApiLine(apiLineId, productionLines);
  const title = found
    ? resolveLineDisplayTitle(found.id, found.title, displayTitles)
    : (displayTitles?.[apiLineId]?.trim() || `Line ${apiLineId}`);
  const fromTitle = extractLineNumberLabel(title);
  if (fromTitle && fromTitle !== title) return fromTitle;
  if (/^\d+$/.test(fromTitle)) return fromTitle;
  if (found) return String(found.id);
  return apiLineId;
};

if (import.meta.env.DEV) {
  const lines = [
    { id: 7, title: 'Production Line 7', supervisor: '-', borderColor: '', accentColor: '', line: '10' },
    { id: 10, title: 'Production Line 10', supervisor: '-', borderColor: '', accentColor: '', line: '10' },
  ] as ProductionLine[];
  console.assert(
    resolveLineTitleForApiLine('10', lines, {}) === 'Production Line 7',
    'resolveLineTitleForApiLine: line API 10 → kartu id 7',
  );
  console.assert(
    resolveLineNumberForApiLine('10', lines, {}) === '7',
    'resolveLineNumberForApiLine: Production Line 7 → 7',
  );
  console.assert(extractLineNumberLabel('Production Line 7') === '7', 'extractLineNumberLabel');
}

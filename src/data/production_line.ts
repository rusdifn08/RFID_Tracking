// Tipe data untuk Production Line
export interface ProductionLine {
 id: number;
 title: string;
 supervisor: string;
 borderColor: string;
 accentColor: string;
 line?: string; // Line number untuk routing (contoh: "1", "2", "3")
}

// Data Production Lines untuk CLN (6 cards: All + 5 lines)
export const productionLinesCLN: ProductionLine[] = [
 {
  id: 0,
  title: 'All Production Line',
  supervisor: 'Rusdi',
  borderColor: 'border-blue-500',
  accentColor: 'text-blue-600',
  line: undefined // All Production Line tidak punya line number
 },
 {
  id: 1,
  title: 'Production Line 1',
  supervisor: 'RISMAN',
  borderColor: 'border-purple-500',
  accentColor: 'text-purple-600',
  line: '1'
 },
 {
  id: 2,
  title: 'Production Line 2',
  supervisor: 'ROIS',
  borderColor: 'border-pink-500',
  accentColor: 'text-pink-600',
  line: '2'
 },
 {
  id: 3,
  title: 'Production Line 3',
  supervisor: 'IIM',
  borderColor: 'border-yellow-400',
  accentColor: 'text-yellow-600',
  line: '3'
 },
 {
  id: 4,
  title: 'Production Line 4',
  supervisor: 'FITRI',
  borderColor: 'border-yellow-400',
  accentColor: 'text-yellow-600',
  line: '4'
 },
 {
  id: 5,
  title: 'Production Line 5',
  supervisor: 'SUMI',
  borderColor: 'border-purple-500',
  accentColor: 'text-purple-600',
  line: '5'
 },
];

// Data Production Lines untuk MJL (14 cards: All + Line 1-13)
export const productionLinesMJL: ProductionLine[] = [
 {
  id: 111,
  title: 'All Production Line',
  supervisor: 'Rusdi',
  borderColor: 'border-blue-500',
  accentColor: 'text-blue-600',
  line: undefined // All Production Line tidak punya line number
 },
 {
  id: 1,
  title: 'Production Line 1',
  supervisor: 'DATI&SUSI',
  borderColor: 'border-purple-500',
  accentColor: 'text-purple-600',
  line: '1'
 },
 {
  id: 2,
  title: 'Production Line 2',
  supervisor: 'DALENA',
  borderColor: 'border-pink-500',
  accentColor: 'text-pink-600',
  line: '2'
 },
 {
  id: 3,
  title: 'Production Line 3',
  supervisor: 'DEDE ROSIAH',
  borderColor: 'border-yellow-400',
  accentColor: 'text-yellow-600',
  line: '3'
 },
 {
  id: 4,
  title: 'Production Line 4',
  supervisor: 'IYAH',
  borderColor: 'border-yellow-400',
  accentColor: 'text-yellow-600',
  line: '4'
 },
 {
  id: 5,
  title: 'Production Line 13',
  supervisor: 'DEDE WINDY',
  borderColor: 'border-purple-500',
  accentColor: 'text-purple-600',
  line: '5'
 },
 {
  id: 6,
  title: 'Production Line 12',
  supervisor: 'TINI (STIO DOWN)',
  borderColor: 'border-emerald-500',
  accentColor: 'text-emerald-600',
  line: '6'
 },
 {
  id: 7,
  title: 'Production Line 10',
  supervisor: 'RISMAN',
  borderColor: 'border-teal-400',
  accentColor: 'text-teal-600',
  line: '7'
 },
 {
  id: 8,
  title: 'Production Line 11',
  supervisor: 'SITI',
  borderColor: 'border-blue-400',
  accentColor: 'text-blue-600',
  line: '8'
 },
 {
  id: 9,
  title: 'Production Line 9',
  supervisor: 'TATAN',
  borderColor: 'border-teal-400',
  accentColor: 'text-teal-600',
  line: '9'
 },
 {
  id: 10,
  title: 'Production Line 7',
  supervisor: 'WIDYA',
  borderColor: 'border-purple-500',
  accentColor: 'text-purple-600',
  line: '10'
 },
 {
  id: 11,
  title: 'Production Line 8',
  supervisor: 'LINA',
  borderColor: 'border-emerald-500',
  accentColor: 'text-emerald-600',
  line: '11'
 },
 {
  id: 12,
  title: 'Production Line 6',
  supervisor: 'TINI',
  borderColor: 'border-blue-400',
  accentColor: 'text-blue-600',
  line: '12'
 },
 {
  id: 13,
  title: 'Production Line 5',
  supervisor: 'TITIN',
  borderColor: 'border-yellow-400',
  accentColor: 'text-yellow-600',
  line: '13'
 }
];

// Data Production Lines untuk MJL2 (11 cards: All + Line 1 sampai 10)
export const productionLinesMJL2: ProductionLine[] = [
 {
  id: 112,
  title: 'All Production Line',
  supervisor: 'Rusdi',
  borderColor: 'border-blue-500',
  accentColor: 'text-blue-600',
  line: undefined // All Production Line tidak punya line number
 },
 {
  id: 1,
  title: 'Production Line 1',
  supervisor: 'NENG JUNENGSIH',
  borderColor: 'border-purple-500',
  accentColor: 'text-purple-600',
  line: '1'
 },
 {
  id: 2,
  title: 'Production Line 2',
  supervisor: 'IMAS SUMINAR',
  borderColor: 'border-pink-500',
  accentColor: 'text-pink-600',
  line: '2'
 },
 {
  id: 3,
  title: 'Production Line 3',
  supervisor: 'ROSMIATI',
  borderColor: 'border-yellow-400',
  accentColor: 'text-yellow-600',
  line: '3'
 },
 {
  id: 4,
  title: 'Production Line 4',
  supervisor: 'EKA MUSTIKA',
  borderColor: 'border-yellow-400',
  accentColor: 'text-yellow-600',
  line: '4'
 },
 {
  id: 5,
  title: 'Production Line 5',
  supervisor: 'ELI ERNAWATI',
  borderColor: 'border-yellow-400',
  accentColor: 'text-yellow-600',
  line: '5'
 },
 {
  id: 6,
  title: 'Production Line 6',
  supervisor: 'ENO KARMI',
  borderColor: 'border-yellow-400',
  accentColor: 'text-yellow-600',
  line: '6'
 },
 {
  id: 7,
  title: 'Production Line 7',
  supervisor: 'DINI AGUSTINA',
  borderColor: 'border-purple-500',
  accentColor: 'text-purple-600',
  line: '7'
 },
 {
  id: 8,
  title: 'Production Line 8',
  supervisor: 'NINING SRI WAHYUNI',
  borderColor: 'border-emerald-500',
  accentColor: 'text-emerald-600',
  line: '8'
 },
 {
  id: 9,
  title: 'Production Line 9',
  supervisor: 'NENG DIAH RODIAH',
  borderColor: 'border-teal-400',
  accentColor: 'text-teal-600',
  line: '9'
 },
{
  id: 10,
  title: 'Production Line 10',
  supervisor: 'Not Assigned',
  borderColor: 'border-purple-500',
  accentColor: 'text-purple-600',
  line: '10'
},
];

// GCC: Line 1–21 (All + 21 line) — supervisor sesuai mapping GCC
const gccPalette: { border: string; accent: string }[] = [
  { border: 'border-purple-500', accent: 'text-purple-600' },
  { border: 'border-pink-500', accent: 'text-pink-600' },
  { border: 'border-yellow-400', accent: 'text-yellow-600' },
  { border: 'border-emerald-500', accent: 'text-emerald-600' },
  { border: 'border-teal-400', accent: 'text-teal-600' },
  { border: 'border-blue-400', accent: 'text-blue-600' },
  { border: 'border-indigo-500', accent: 'text-indigo-600' },
  { border: 'border-rose-400', accent: 'text-rose-600' },
];
const gccSupervisorByLine: Record<number, string> = {
  1: 'IYAH',
  2: 'LINA',
  3: 'WIDYA',
  4: 'DEDE R',
  5: 'DEDE R',
  6: 'DEDE W',
  7: 'DEDE W',
  8: 'DATI',
  9: 'DATI',
  10: 'HAWA',
  11: 'IYAH',
  12: 'HAWA',
  13: 'LINA',
  14: 'TINI',
  15: 'WIDYA',
  16: 'TINI',
  17: 'TATAN',
  18: 'DALENA',
  19: 'DALENA',
  20: 'SITI',
  21: 'DUDUNG',
};

export const productionLinesGCC: ProductionLine[] = [
  {
    id: 113,
    title: 'All Production Line',
    supervisor: 'Rusdi',
    borderColor: 'border-blue-500',
    accentColor: 'text-blue-600',
    line: undefined,
  },
  ...Array.from({ length: 21 }, (_, i) => {
    const n = i + 1;
    const pal = gccPalette[i % gccPalette.length];
    return {
      id: n,
      title: `Production Line ${n}`,
      supervisor: gccSupervisorByLine[n] ?? '-',
      borderColor: pal.border,
      accentColor: pal.accent,
      line: String(n),
    } satisfies ProductionLine;
  }),
];

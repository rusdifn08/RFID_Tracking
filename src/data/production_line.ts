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

// Data Production Lines untuk MJL (16 cards: All + 15 lines)
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
  supervisor: 'DATI',
  borderColor: 'border-purple-500',
  accentColor: 'text-purple-600',
  line: '1'
 },
 {
  id: 2,
  title: 'Production Line 2',
  supervisor: 'SUSI',
  borderColor: 'border-pink-500',
  accentColor: 'text-pink-600',
  line: '2'
 },
 {
  id: 3,
  title: 'Production Line 3',
  supervisor: 'DEDE',
  borderColor: 'border-yellow-400',
  accentColor: 'text-yellow-600',
  line: '3'
 },
 {
  id: 4,
  title: 'Production Line 4',
  supervisor: 'DEDE',
  borderColor: 'border-yellow-400',
  accentColor: 'text-yellow-600',
  line: '4'
 },
 {
  id: 5,
  title: 'Production Line 5',
  supervisor: 'HAWA',
  borderColor: 'border-purple-500',
  accentColor: 'text-purple-600',
  line: '5'
 },
 {
  id: 6,
  title: 'Production Line 6',
  supervisor: 'IYAH & DEDEH',
  borderColor: 'border-emerald-500',
  accentColor: 'text-emerald-600',
  line: '6'
 },
 {
  id: 7,
  title: 'Production Line 7',
  supervisor: '-',
  borderColor: 'border-teal-400',
  accentColor: 'text-teal-600',
  line: '7'
 },
 {
  id: 8,
  title: 'Production Line 8',
  supervisor: '-',
  borderColor: 'border-blue-400',
  accentColor: 'text-blue-600',
  line: '8'
 },
 {
  id: 9,
  title: 'Production Line 9',
  supervisor: 'DALENA',
  borderColor: 'border-teal-400',
  accentColor: 'text-teal-600',
  line: '9'
 },
 {
  id: 10,
  title: 'Production Line 10',
  supervisor: 'DALENA',
  borderColor: 'border-purple-500',
  accentColor: 'text-purple-600',
  line: '10'
 },
 {
  id: 11,
  title: 'Production Line 11',
  supervisor: 'TATAN',
  borderColor: 'border-emerald-500',
  accentColor: 'text-emerald-600',
  line: '11'
 },
 {
  id: 12,
  title: 'Production Line 12',
  supervisor: 'SITI',
  borderColor: 'border-blue-400',
  accentColor: 'text-blue-600',
  line: '12'
 },
 {
  id: 13,
  title: 'Production Line 13',
  supervisor: 'DEDE WINDY',
  borderColor: 'border-yellow-400',
  accentColor: 'text-yellow-600',
  line: '13'
 },
 {
  id: 14,
  title: 'Production Line 14',
  supervisor: 'TINI',
  borderColor: 'border-purple-500',
  accentColor: 'text-purple-600',
  line: '14'
 },
 {
  id: 15,
  title: 'Production Line 15',
  supervisor: 'LINA',
  borderColor: 'border-emerald-500',
  accentColor: 'text-emerald-600',
  line: '15'
 },
 {
  id: 16,
  title: 'Production Line 16',
  supervisor: 'WIDIA',
  borderColor: 'border-emerald-500',
  accentColor: 'text-emerald-600',
  line: '16'
 },
];

// Data Production Lines untuk MJL2 (10 cards: All + Line 1 sampai 9)
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
];

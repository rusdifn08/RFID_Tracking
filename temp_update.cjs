const fs = require('fs');
let code = fs.readFileSync('src/data/production_line.ts', 'utf8');

const sewingMJL = `

// Data Sewing Lines untuk MJL (14 cards: All + Line 1-13)
export const sewingLinesMJL: ProductionLine[] = [
 {
  id: 111,
  title: 'All Sewing Line',
  supervisor: 'Rusdi',
  borderColor: 'border-blue-500',
  accentColor: 'text-blue-600',
  line: undefined
 },
 {
  id: 1,
  title: 'Sewing Line 1',
  supervisor: 'DATI&SUSI',
  borderColor: 'border-purple-500',
  accentColor: 'text-purple-600',
  line: '1'
 },
 {
  id: 2,
  title: 'Sewing Line 2',
  supervisor: 'DALENA',
  borderColor: 'border-pink-500',
  accentColor: 'text-pink-600',
  line: '2'
 },
 {
  id: 3,
  title: 'Sewing Line 3',
  supervisor: 'DEDE ROSIAH',
  borderColor: 'border-yellow-400',
  accentColor: 'text-yellow-600',
  line: '3'
 },
 {
  id: 4,
  title: 'Sewing Line 4',
  supervisor: 'IYAH',
  borderColor: 'border-yellow-400',
  accentColor: 'text-yellow-600',
  line: '4'
 },
 {
  id: 5,
  title: 'Sewing Line 5',
  supervisor: 'TITIN',
  borderColor: 'border-yellow-400',
  accentColor: 'text-yellow-600',
  line: '5'
 },
 {
  id: 6,
  title: 'Sewing Line 6',
  supervisor: 'TINI',
  borderColor: 'border-blue-400',
  accentColor: 'text-blue-600',
  line: '6'
 },
 {
  id: 7,
  title: 'Sewing Line 7',
  supervisor: 'WIDYA',
  borderColor: 'border-purple-500',
  accentColor: 'text-purple-600',
  line: '7'
 },
 {
  id: 8,
  title: 'Sewing Line 8',
  supervisor: 'LINA',
  borderColor: 'border-emerald-500',
  accentColor: 'text-emerald-600',
  line: '8'
 },
 {
  id: 9,
  title: 'Sewing Line 9',
  supervisor: 'TATAN',
  borderColor: 'border-teal-400',
  accentColor: 'text-teal-600',
  line: '9'
 },
 {
  id: 10,
  title: 'Sewing Line 10',
  supervisor: 'RISMAN',
  borderColor: 'border-teal-400',
  accentColor: 'text-teal-600',
  line: '10'
 },
 {
  id: 11,
  title: 'Sewing Line 11',
  supervisor: 'SITI',
  borderColor: 'border-blue-400',
  accentColor: 'text-blue-600',
  line: '11'
 },
 {
  id: 12,
  title: 'Sewing Line 12',
  supervisor: 'TINI (STIO DOWN)',
  borderColor: 'border-emerald-500',
  accentColor: 'text-emerald-600',
  line: '12'
 },
 {
  id: 13,
  title: 'Sewing Line 13',
  supervisor: 'DEDE WINDY',
  borderColor: 'border-purple-500',
  accentColor: 'text-purple-600',
  line: '13'
 }
];
`;

if(!code.includes('sewingLinesMJL')) {
    fs.writeFileSync('src/data/production_line.ts', code + sewingMJL);
}

// UPDATE RFIDLineContent.tsx
let rfidCode = fs.readFileSync('src/components/RFIDLineContent.tsx', 'utf8');

if (rfidCode.includes('productionLinesGCC,')) {
    rfidCode = rfidCode.replace('productionLinesGCC,', 'productionLinesGCC,\n    sewingLinesMJL,');
}

rfidCode = rfidCode.replace(/if \(environment === 'MJL'\) \{\s*lines = productionLinesMJL;\s*\}/g, 
`if (environment === 'MJL') {
            if (pageType === 'sewing') {
                lines = sewingLinesMJL;
            } else {
                lines = productionLinesMJL;
            }
        }`);

rfidCode = rfidCode.replace(/else if \(environment === 'MJL'\) allLines = productionLinesMJL;/g, 
`else if (environment === 'MJL') allLines = pageType === 'sewing' ? sewingLinesMJL : productionLinesMJL;`);

fs.writeFileSync('src/components/RFIDLineContent.tsx', rfidCode);
console.log('done');

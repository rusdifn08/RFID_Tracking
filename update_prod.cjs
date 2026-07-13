const fs = require('fs');

const correctNames = {
    '1': 'DATI&SUSI', '2': 'DALENA', '3': 'DEDE ROSIAH', '4': 'IYAH',
    '5': 'TITIN', '6': 'TINI', '7': 'WIDYA', '8': 'LINA', '9': 'MIA',
    '10': 'YUSNI', '11': 'SITI', '12': 'TINI (STIO DOWN)', '13': 'DEDE WINDY', '21': 'Dudung'
};

const colors = [
    { borderColor: 'border-purple-500', accentColor: 'text-purple-600' },
    { borderColor: 'border-pink-500', accentColor: 'text-pink-600' },
    { borderColor: 'border-yellow-400', accentColor: 'text-yellow-600' },
    { borderColor: 'border-yellow-400', accentColor: 'text-yellow-600' },
    { borderColor: 'border-yellow-400', accentColor: 'text-yellow-600' },
    { borderColor: 'border-blue-400', accentColor: 'text-blue-600' },
    { borderColor: 'border-purple-500', accentColor: 'text-purple-600' },
    { borderColor: 'border-emerald-500', accentColor: 'text-emerald-600' },
    { borderColor: 'border-teal-400', accentColor: 'text-teal-600' },
    { borderColor: 'border-teal-400', accentColor: 'text-teal-600' },
    { borderColor: 'border-blue-400', accentColor: 'text-blue-600' },
    { borderColor: 'border-emerald-500', accentColor: 'text-emerald-600' },
    { borderColor: 'border-purple-500', accentColor: 'text-purple-600' },
    { borderColor: 'border-blue-400', accentColor: 'text-blue-600' } // for 21
];

let mjlArray = `export const productionLinesMJL: ProductionLine[] = [
 {
  id: 111,
  title: 'All Production Line',
  supervisor: 'Rusdi',
  borderColor: 'border-blue-500',
  accentColor: 'text-blue-600',
  line: undefined
 }`;

for (let i = 1; i <= 13; i++) {
    mjlArray += `,
 {
  id: ${i},
  title: 'Production Line ${i}',
  supervisor: '${correctNames[i]}',
  borderColor: '${colors[i-1].borderColor}',
  accentColor: '${colors[i-1].accentColor}',
  line: '${i}'
 }`;
}
mjlArray += '\n];';

let sewingArray = `export const sewingLinesMJL: ProductionLine[] = [
 {
  id: 111,
  title: 'All Sewing Line',
  supervisor: 'Rusdi',
  borderColor: 'border-blue-500',
  accentColor: 'text-blue-600',
  line: undefined
 }`;

for (let i = 1; i <= 13; i++) {
    sewingArray += `,
 {
  id: ${i},
  title: 'Sewing Line ${i}',
  supervisor: '${correctNames[i]}',
  borderColor: '${colors[i-1].borderColor}',
  accentColor: '${colors[i-1].accentColor}',
  line: '${i}'
 }`;
}
sewingArray += '\n];';

let code = fs.readFileSync('src/data/production_line.ts', 'utf8');
code = code.replace(/export const productionLinesMJL: ProductionLine\[\] = \[[\s\S]*?\n\];/, mjlArray);
code = code.replace(/export const sewingLinesMJL: ProductionLine\[\] = \[[\s\S]*?\n\];/, sewingArray);

fs.writeFileSync('src/data/production_line.ts', code);
console.log('done production_line.ts');

const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// The new correct mapping based on the screenshot
const correctMJL = `{ '111': 'Rusdi', '1': 'DATI&SUSI', '2': 'DALENA', '3': 'DEDE ROSIAH', '4': 'IYAH', '5': 'TITIN', '6': 'TINI', '7': 'WIDYA', '8': 'LINA', '9': 'MIA', '10': 'YUSNI', '11': 'SITI', '12': 'TINI (STIO DOWN)', '13': 'DEDE WINDY', '21': 'Dudung' }`;

// Update defaultSupervisors.MJL
code = code.replace(/MJL: \{ '111': 'Rusdi', '1': 'DATI&SUSI'[^{}]+\}/, 'MJL: ' + correctMJL);

// Update defaultMJL variable
code = code.replace(/const defaultMJL = \{\s*'111': 'Rusdi',[\s\S]*?'13': 'TITIN'\s*\};/g, 'const defaultMJL = ' + correctMJL + ';');

// Add defaultSewingMJL back properly if missing, in GET /api/supervisor-data
if (!code.includes('const defaultSewingMJL')) {
    code = code.replace(/const defaultMJL = \{ '111': 'Rusdi',.*?\};/, `const defaultMJL = ${correctMJL};\n\n        const defaultSewingMJL = ${correctMJL};`);
}

// Ensure the pageType logic is ONLY in /api/supervisor-data
// Re-read and write
fs.writeFileSync('server.js', code);
console.log('done server.js');

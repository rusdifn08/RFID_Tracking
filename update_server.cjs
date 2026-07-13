const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Insert defaultSewingMJL after defaultMJL
if (!code.includes('const defaultSewingMJL')) {
    const sewingDefaults = `
        const defaultSewingMJL = {
            '111': 'Rusdi', '1': 'DATI&SUSI', '2': 'DALENA', '3': 'DEDE ROSIAH', '4': 'IYAH',
            '5': 'TITIN', '6': 'TINI', '7': 'WIDYA', '8': 'LINA', '9': 'TATAN',
            '10': 'RISMAN', '11': 'SITI', '12': 'TINI (STIO DOWN)', '13': 'DEDE WINDY'
        };`;
    code = code.replace(/(const defaultMJL = \{[\s\S]*?\};)/, '$1\n' + sewingDefaults);
}

// Modify the GET /api/supervisor-data MJL branch to use defaultSewingMJL if pageType === 'sewing'
code = code.replace(/const defaultData = defaultMJL;/g, 
`const defaultData = pageType === 'sewing' ? defaultSewingMJL : defaultMJL;`);

fs.writeFileSync('server.js', code);
console.log('done');

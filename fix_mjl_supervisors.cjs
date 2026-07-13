const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'docker-data', 'supervisor_data.json');
if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // PRODUCTION LINE SUPERVISORS
    const correctNames = {
        '1': 'DATI&SUSI', '2': 'DALENA', '3': 'DEDE ROSIAH', '4': 'IYAH',
        '5': 'DEDE WINDY', '6': 'TINI (STIO DOWN)', '7': 'YUSNI', '8': 'SITI', '9': 'MIA',
        '10': 'WIDYA', '11': 'LINA', '12': 'TINI', '13': 'TITIN', '21': 'Dudung', '111': 'Rusdi'
    };

    // SEWING LINE SUPERVISORS
    const correctSewingNames = {
        '1': 'DATI&SUSI', '2': 'DALENA', '3': 'DEDE ROSIAH', '4': 'IYAH',
        '5': 'TITIN', '6': 'TINI', '7': 'WIDYA', '8': 'LINA', '9': 'MIA',
        '10': 'YUSNI', '11': 'SITI', '12': 'TINI (STIO DOWN)', '13': 'DEDE WINDY', '21': 'Dudung', '111': 'Rusdi'
    };

    if (!data.supervisors) data.supervisors = {};
    
    // Force update MJL supervisors (Production Line)
    Object.keys(correctNames).forEach(id => {
        data.supervisors['MJL_' + id] = correctNames[id];
        data.supervisors[id] = correctNames[id];
    });

    // Force update MJL supervisors (Sewing Line)
    Object.keys(correctSewingNames).forEach(id => {
        data.supervisors['MJL_' + id + '_SEWING'] = correctSewingNames[id];
    });

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log('✅ Successfully updated MJL supervisor data to match the snapshot!');
    console.log('✅ Successfully separated Production Line and Sewing Line data!');
    console.log('Please restart your backend server (Ctrl+C then npm run dev:all:mjl).');
} else {
    console.log('supervisor_data.json not found, it will use defaults from server.js upon start.');
}

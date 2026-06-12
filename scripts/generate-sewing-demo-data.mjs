import fs from 'fs';
import path from 'path';

const baseProcesses = [
  [1,1,"RFID","Create Tag Batch 1 - Front Panel","P-B1-001","Helper Sewing","OP-HLP-001","RFID Station","RFID-ST-01",0.18,0.20],
  [2,1,"Helper","Panel Preparation / Numbering","P-B1-002","Aulia Rahma","OP-GM-1002","Manual Table","TB-01",0.45,0.48],
  [3,1,"Sewing","Attach Chest Pocket","P-B1-003","Siti Nuraini","OP-GM-1003","SNLS","MC-SNLS-010",0.82,0.86],
  [4,1,"Sewing","Pocket Zipper Stitch","P-B1-004","Dewi Kartika","OP-GM-1004","DNLS","MC-DNLS-012",0.90,0.94],
  [5,1,"QC","QC Awal - Component Check","P-B1-005","Rina QC","QC-GM-2001","QC Table","QC-TB-01",0.35,0.37],
  [6,2,"RFID","Create Tag Batch 2 - Sleeve","P-B2-001","Helper Sewing","OP-HLP-001","RFID Station","RFID-ST-02",0.16,0.18],
  [7,2,"Sewing","Sleeve Panel Join","P-B2-002","Nia Puspita","OP-GM-1007","SNLS","MC-SNLS-021",0.76,0.79],
  [8,2,"Sewing","Cuff Attach","P-B2-003","Lilis Sari","OP-GM-1008","Overdeck","MC-OD-006",0.68,0.71],
  [9,2,"Sewing","Sleeve Hem Stitch","P-B2-004","Fitri Handayani","OP-GM-1009","DNLS","MC-DNLS-025",0.72,0.75],
  [10,2,"Sewing","Sleeve Top Stitch","P-B2-005","Maya Salsabila","OP-GM-1010","SNLS","MC-SNLS-027",0.62,0.65],
  [11,3,"RFID","Create Tag Batch 3 - Hood","P-B3-001","Helper Sewing","OP-HLP-001","RFID Station","RFID-ST-03",0.16,0.18],
  [12,3,"Sewing","Hood Panel Join","P-B3-002","Yuni Pratiwi","OP-GM-1012","SNLS","MC-SNLS-031",0.80,0.83],
  [13,3,"Sewing","Hood Seam Top Stitch","P-B3-003","Indah Permata","OP-GM-1013","DNLS","MC-DNLS-032",0.74,0.78],
  [14,3,"Sewing","Cord Channel Sewing","P-B3-004","Lina Marlina","OP-GM-1014","SNLS","MC-SNLS-033",0.70,0.73],
  [15,3,"Sewing","Main Label Attach","P-B3-005","Tika Lestari","OP-GM-1015","SNLS","MC-SNLS-034",0.36,0.38],
  [16,4,"RFID","Create Tag Batch 4 - Body Front","P-B4-001","Helper Sewing","OP-HLP-001","RFID Station","RFID-ST-04",0.16,0.17],
  [17,4,"Sewing","Main Zipper Attach Left","P-B4-002","Wulan Sari","OP-GM-1017","DNLS","MC-DNLS-041",1.05,1.10],
  [18,4,"Sewing","Main Zipper Attach Right","P-B4-003","Dina Fitri","OP-GM-1018","DNLS","MC-DNLS-042",1.05,1.08],
  [19,4,"Sewing","Front Placket Sewing","P-B4-004","Putri Amelia","OP-GM-1019","SNLS","MC-SNLS-043",0.92,0.96],
  [20,4,"QC","QC Tengah - Critical Operation Check","P-B4-005","Yanti QC","QC-GM-2002","QC Table","QC-TB-02",0.40,0.42],
  [21,5,"RFID","Create Tag Batch 5 - Back Body","P-B5-001","Helper Sewing","OP-HLP-001","RFID Station","RFID-ST-05",0.16,0.17],
  [22,5,"Sewing","Back Yoke Join","P-B5-002","Erna Susanti","OP-GM-1022","SNLS","MC-SNLS-051",0.78,0.81],
  [23,5,"Sewing","Side Seam Preparation","P-B5-003","Nur Halimah","OP-GM-1023","Obras 5 Benang","MC-OB5-010",0.88,0.91],
  [24,5,"Sewing","Elastic Stopper Attach","P-B5-004","Sri Wahyuni","OP-GM-1024","SNLS","MC-SNLS-052",0.55,0.59],
  [25,5,"Sewing","Pre Assembly Bundle Check","P-B5-005","Murni Astuti","OP-GM-1025","Manual Table","TB-02",0.30,0.32],
  [26,6,"Assembling","Shoulder Join Assembly","P-B6-001","Rika Anggraini","OP-GM-1026","Obras 5 Benang","MC-OB5-021",1.12,1.16],
  [27,6,"Assembling","Sleeve Attach to Body","P-B6-002","Ani Kurnia","OP-GM-1027","Obras 5 Benang","MC-OB5-022",1.26,1.31],
  [28,6,"Assembling","Side Seam Join Body","P-B6-003","Salsa Maharani","OP-GM-1028","Obras 5 Benang","MC-OB5-023",1.18,1.23],
  [29,6,"Assembling","Hood Attach to Body","P-B6-004","Mega Pertiwi","OP-GM-1029","SNLS","MC-SNLS-061",1.08,1.13],
  [30,6,"RFID","Scan Existing Pcs RFID - Assembly Start","P-B6-005","Admin RFID Sewing","RFID-GM-3001","RFID Station","RFID-ST-PCS-01",0.18,0.20],
  [31,7,"Assembling","Bottom Hem Final","P-B7-001","Rani Oktavia","OP-GM-1031","Overdeck","MC-OD-031",0.95,0.99],
  [32,7,"Sewing","Final Top Stitch","P-B7-002","Tari Wulandari","OP-GM-1032","DNLS","MC-DNLS-071",0.84,0.88],
  [33,7,"Ironing","Ironing / Pressing Light Jacket","P-B7-003","Desi Iron","IR-GM-4001","Steam Iron","IR-STEAM-01",0.60,0.63],
  [34,7,"QC","QC Akhir - Endline Inspection","P-B7-004","Mila QC","QC-GM-2003","QC Table","QC-TB-03",0.52,0.55],
  [35,7,"Assembling","Final Release to Output Sewing","P-B7-005","Admin Output","OP-GM-1035","RFID Gate","RFID-GATE-01",0.20,0.22],
  [36,7,"RFID","GCC Output Confirmation","P-B7-006","System GCC","SYS-GCC-001","GCC Command Centre","GCC-API-01",0.10,0.11],
];

const statuses = ['Done','Done','Running','Running','Waiting','Done','Done','Done','Running','Waiting','Done','Done','Done','Running','Waiting','Done','Running','Running','Waiting','Waiting','Done','Done','Running','Waiting','Waiting','Running','Running','Waiting','Waiting','Done','Waiting','Waiting','Waiting','Waiting','Waiting','Waiting'];
const qtyBundle = [12,12,8,0,0,10,10,10,6,0,10,10,10,5,0,10,6,0,0,0,10,8,5,0,0,0,0,0,0,5,0,0,0,0,0,0];
const qtyPcs = qtyBundle.map((b,i) => (b ? b * 10 : (statuses[i]==='Running'?50:0)));

const order = { buyer: 'Montbell', wo: 'WO-MBJ-2026-001', style: 'Montbell Light Jacket', size: 'S', color: 'Black' };
const processes = baseProcesses.map((p, i) => ({
  no: p[0], batch: p[1], category: p[2], processName: p[3], processId: p[4],
  operator: p[5], operatorId: p[6], machine: p[7], machineId: p[8],
  target: p[9], historical: p[10], actual: Number((p[10] * 1.02).toFixed(2)),
  status: statuses[i], qtyBundle: qtyBundle[i], qtyPcs: qtyPcs[i],
  ...order,
}));

const batches = [];
for (let b = 1; b <= 7; b++) {
  const rows = processes.filter((d) => d.batch === b);
  const done = rows.filter((d) => d.status === 'Done').length;
  const run = rows.filter((d) => d.status === 'Running').length;
  const hold = rows.filter((d) => d.status === 'Hold').length;
  const pct = Math.round(((done + run * 0.5) / rows.length) * 100);
  const avgActual = rows.reduce((a, d) => a + d.actual, 0) / rows.length;
  const avgTarget = rows.reduce((a, d) => a + d.target, 0) / rows.length;
  batches.push({
    batch: b,
    type: b <= 5 ? 'Proses Awal' : 'Assembling / Akhir',
    processCount: rows.length,
    doneCount: done,
    runningCount: run,
    holdCount: hold,
    progressPct: pct,
    qcCount: rows.filter((x) => x.category === 'QC').length,
    avgActual: Number(avgActual.toFixed(2)),
    avgTarget: Number(avgTarget.toFixed(2)),
  });
}

const outDir = path.join('src', 'data', 'sewing');
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'sewing-rfid-identity.json'), JSON.stringify({
  hero: {
    eyebrow: 'Demo Dashboard RFID Sewing • Source Simulasi GCC',
    title: 'RFID Sewing Production Batch System',
    subtitle: 'Monitoring alur RFID dari Cutting, pembuatan RFID per pcs sejak awal, Batch 1–7 Sewing, QC awal/tengah/akhir, Assembling, hingga ironing/final release.',
  },
  flowSteps: [
    { no: '01', title: 'Create Bundle + Pcs RFID at Cutting', desc: 'Di Cutting dibuat reference bundle dan RFID per pcs. Demo rule: 1 bundle = 10 pcs.', dot: 'blue' },
    { no: '02', title: 'Attach Pcs Tag to Main Panel', desc: 'RFID per pcs ditempel atau terbawa pada panel terbesar di setiap batch.', dot: 'purple' },
    { no: '03', title: 'Batch 1–5 Proses Awal', desc: 'Panel preparation, komponen, pocket, sleeve, hood, body preparation.', dot: 'cyan' },
    { no: '04', title: 'QC Awal & Tengah', desc: 'Gate kontrol untuk mencegah defect mengalir ke assembly.', dot: 'orange' },
    { no: '05', title: 'Batch 6 Assembling', desc: 'Penggabungan komponen menggunakan RFID pcs yang sudah ada sejak Cutting.', dot: 'blue' },
    { no: '06', title: 'Verify Existing Pcs RFID', desc: 'Saat assembling hanya scan dan validasi RFID pcs, bukan membuat tag baru.', dot: 'green' },
    { no: '07', title: 'Batch 7 Final', desc: 'Final stitch, ironing, QC akhir, final release ke proses berikutnya.', dot: 'purple' },
    { no: '08', title: 'Output Sewing', desc: 'GCC menerima status output final per pcs, dengan summary bundle tetap bisa ditarik.', dot: 'green' },
  ],
  rfidCards: [
    { chip: 'Bundling', chipTone: 'blue', title: 'Bundle Reference at Cutting', foot: 'Dibuat di Cutting sebagai reference bundle. Satu bundle berisi 10 pcs.', code: 'RFID-BDL-GM1-L01-WO-MBJ-2026-001-0001' },
    { chip: 'Batch', chipTone: 'purple', title: 'Create Tag Batch', foot: 'Tag proses/batch untuk scan di pos sewing.', code: 'RFID-BATCH-01-BDL-0001' },
    { chip: 'Per Pcs', chipTone: 'green', title: 'Pcs RFID from Cutting', foot: 'RFID per pcs sudah dibuat di Cutting dan ikut panel terbesar.', code: 'CUT-PCS-GM1-L01-WO-MBJ-2026-001-BDL0001-PCS01' },
  ],
  hubCard: {
    title: 'RFID Identity Model',
    subtitle: 'Bundle reference, tag batch & RFID per pcs dari Cutting',
    highlights: ['3 model ID', '8 langkah alur', 'Traceable GCC'],
  },
}, null, 2));

fs.writeFileSync(path.join(outDir, 'sewing-batch-dashboard.json'), JSON.stringify({
  defaults: { factory: 'GM1', line: 'Line 1', viewMode: 'all' },
  factories: ['GM1', 'GM2'],
  lines: Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`),
  viewModes: [
    { value: 'all', label: 'Semua proses' },
    { value: 'early', label: 'Batch 1–5 / Proses awal' },
    { value: 'final', label: 'Batch 6–7 / Assembling akhir' },
    { value: 'qc', label: 'QC Awal, Tengah, Akhir' },
  ],
  kpis: {
    factoryLine: 'GM1 / Line 1',
    bundles: 123,
    pcsFromCutting: 1230,
    avgActualSmv: 0.72,
    smvFoot: 'Avg target 0.70 | variance 0.02',
    qcPassRate: '96.8%',
    bottleneck: 'B4-002 • 0.05',
  },
  batches,
  order,
  hubCard: {
    title: 'RFID Sewing Batch Dashboard',
    subtitle: 'Batch Board 1–7, KPI, progress & target vs actual SMV',
    highlights: ['7 batch aktif', '96.8% QC pass', 'Bottleneck B4-002'],
  },
}, null, 2));

const suggestions = [
  [1,'7 batch system','Belum ada aturan dependency antar batch.','Tambahkan rule: Batch 6 baru boleh jalan jika batch 1–5 lengkap atau minimal sesuai komponen wajib.'],
  [2,'Batch 1–5 proses awal','Batas proses awal bisa berubah setiap style.','Buat master process template per buyer/style/season agar batch mapping tidak manual.'],
  [3,'Batch 6–7 proses akhir','Penggabungan batch berisiko salah pasangan panel/pcs.','Gunakan parent-child relation: bundle cutting → pcs RFID → panel utama → output garment.'],
  [4,'1 bundle = 10 pcs','Qty aktual kadang short/lebih karena reject/cutting issue.','Dashboard perlu field qty plan, qty actual, qty good, qty reject, qty missing.'],
  [5,'Data buyer, WO, style, operator, mesin','Master data harus konsisten antara GCC, HR, mekanik, dan produksi.','Gunakan single master ID untuk operator, mesin, proses, line, buyer, style.'],
];

fs.writeFileSync(path.join(outDir, 'sewing-report-data.json'), JSON.stringify({
  defaults: { dateFrom: '2026-06-01', dateTo: '2026-06-03', reportMode: 'daily' },
  reportModes: [
    { value: 'daily', label: 'Daily Summary' },
    { value: 'process', label: 'Process Summary' },
    { value: 'operator', label: 'Operator Summary' },
    { value: 'machine', label: 'Machine Summary' },
  ],
  reportKpis: [
    { label: 'Total Output Pcs', value: '1,240' },
    { label: 'Avg SMV Actual', value: '0.72' },
    { label: 'QC Pass', value: '96.4%' },
    { label: 'Running Process', value: '6' },
    { label: 'Hold Process', value: '0' },
  ],
  dailyTrend: [
    { date: '01 Jun', output: 380 },
    { date: '02 Jun', output: 420 },
    { date: '03 Jun', output: 440 },
  ],
  reportRows: [
    { date: '2026-06-03', process: 'Attach Chest Pocket', operator: 'Siti Nuraini', machine: 'SNLS', batch: 1, output: 80 },
    { date: '2026-06-03', process: 'Sleeve Panel Join', operator: 'Nia Puspita', machine: 'SNLS', batch: 2, output: 100 },
    { date: '2026-06-03', process: 'Main Zipper Attach Left', operator: 'Wulan Sari', machine: 'DNLS', batch: 4, output: 60 },
  ],
  suggestions: suggestions.map(([point, concept, risk, fix]) => ({ point, concept, risk, fix })),
  processes,
  order,
  hubCard: {
    title: 'Report Data RFID',
    subtitle: 'Penarikan per tanggal & detail 36 proses sewing',
    highlights: ['36 proses', 'Filter tanggal', 'Export CSV'],
  },
}, null, 2));

const categoryTone = (cat) => {
  if (cat === 'QC') return 'orange';
  if (cat === 'Assembling') return 'green';
  if (cat === 'Sewing') return 'purple';
  if (cat === 'Helper') return 'cyan';
  if (cat === 'Ironing') return 'blue';
  return 'blue';
};

const scanTime = (no, status) => {
  if (status === 'Waiting') return '—';
  const h1 = 7 + (no % 5);
  const m1 = (no * 7) % 60;
  const h2 = h1 + (status === 'Done' ? 1 : 0);
  const m2 = (m1 + 18 + (no % 20)) % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h1)}:${pad(m1)} - ${pad(h2)}:${pad(m2)}`;
};

const flowRows = processes.filter((d) => d.category !== 'RFID').sort((a, b) => a.no - b.no);
const flowBatches = [];

for (let b = 1; b <= 7; b++) {
  const batchRows = flowRows.filter((d) => d.batch === b);
  const doneCount = batchRows.filter((d) => d.status === 'Done').length;
  const laneQty = batchRows.reduce((a, d) => a + (b >= 6 ? d.qtyPcs : d.qtyBundle), 0);
  flowBatches.push({
    batch: b,
    laneType:
      b <= 5
        ? 'Proses awal / komponen, RFID pcs terbawa di panel utama'
        : 'Assembling & final process, scan existing pcs RFID',
    outputTag: b >= 6 ? 'Pcs Output' : 'Bundle Output',
    outputTagTone: b >= 6 ? 'purple' : 'blue',
    doneCount,
    totalCount: batchRows.length,
    demoQty: `${laneQty} ${b >= 6 ? 'pcs' : 'bundle'}`,
    snapshotDate: '03/06/2026',
    processes: batchRows.map((d, idx) => {
      const pcs = d.batch >= 6;
      return {
        no: d.no,
        processName: d.processName,
        category: d.category,
        categoryTone: categoryTone(d.category),
        processId: d.processId,
        operator: d.operator,
        machine: d.machine,
        scan: scanTime(d.no, d.status),
        status: d.status,
        qtyLabel: pcs ? 'Qty Output Pcs' : 'Qty Output Bundle',
        qtyHint: pcs ? 'Per garment' : 'Per batch flow',
        qtyValue: pcs ? d.qtyPcs : d.qtyBundle,
        qtyClass: pcs ? 'pcs' : 'bundle',
        rfidNote: pcs ? 'RFID: scan existing pcs tag' : 'RFID: pcs tag carried on main panel',
        target: d.target,
        historical: d.historical,
        actual: d.actual,
        actualBad: d.actual > d.target,
        hasNext: idx < batchRows.length - 1,
      };
    }),
  });
}

const bundleOutput = flowRows.filter((d) => d.batch <= 5).reduce((a, d) => a + d.qtyBundle, 0);
const pcsOutput = flowRows.filter((d) => d.batch >= 6).reduce((a, d) => a + d.qtyPcs, 0);
const doneRows = flowRows.filter((d) => d.status === 'Done').length;
const runningRows = flowRows.filter((d) => d.status === 'Running').length;

fs.writeFileSync(
  path.join(outDir, 'sewing-flow-detail.json'),
  JSON.stringify(
    {
      title: 'Alur Flow Proses Sewing',
      subtitle:
        'Visual flow proses produksi per batch. RFID per pcs dibuat di Cutting — bukan proses Create Tag di sewing.',
      legend: [
        { label: 'RFID', tone: 'blue' },
        { label: 'Sewing', tone: 'purple' },
        { label: 'QC', tone: 'orange' },
        { label: 'Assembling / Pcs Output', tone: 'green' },
        { label: 'RFID Pcs from Cutting', tone: 'blue' },
      ],
      flowNotes: [
        { label: 'RFID per pcs dibuat di Cutting', tone: 'blue' },
        { label: 'Batch 1–5: output proses masih Bundle', tone: 'purple' },
        { label: 'Batch 6–7: output proses Pcs Garment', tone: 'green' },
        { label: 'Demo rule: 1 bundle = 10 pcs', tone: 'orange' },
      ],
      summary: [
        { label: 'Tanggal Snapshot', value: '03/06/2026' },
        { label: 'Process Tampil', value: `${flowRows.length} proses` },
        { label: 'Qty Batch 1–5', value: `${bundleOutput} bundle` },
        { label: 'RFID Pcs dari Cutting', value: `${bundleOutput * 10 + pcsOutput} pcs` },
        { label: 'Status Jalan', value: `${doneRows} done / ${runningRows} running` },
      ],
      batches: flowBatches,
    },
    null,
    2
  )
);

console.log('Generated sewing demo JSON in', outDir);

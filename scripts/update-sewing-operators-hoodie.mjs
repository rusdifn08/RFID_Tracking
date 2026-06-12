/**
 * Update operator/NIK dari spreadsheet SMV + batch 3 proses hoodie (17 proses).
 * Jalankan: node scripts/update-sewing-operators-hoodie.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const OPERATOR_BY_PROCESS = {
  'Stitch Pinggir Zipper Samping KK': { operator: 'Mimin Kusminah', nik: '990834' },
  'Jahit Dasar Pasang Side Hoodie ke Inner': { operator: 'Siti Adawiah', nik: '951990' },
  'Jahit Dasar Pasang Plaket Atas Bawah Ke Body Plaket': { operator: 'Olla', nik: '92500311' },
  'Jahit Stitch Pasang Tab Hoodie': { operator: 'Nisa Roh', nik: '92400658' },
  'Jahit Pasang Lapis Kotak Zipper Pocket KK': { operator: 'Eti Suhaeti', nik: '960170' },
  'Jahit Dasar Plaket Body': { operator: 'Lia Natalia', nik: '92500158' },
  'Jahit Dasar Pasang Karet Tangan KK': { operator: 'Novi Nuryanti', nik: '92400236' },
  'Jahit Corong Atas Hoodie': { operator: 'Enneng Sunengsih', nik: '941864' },
  'Pasang Tali Hoodie KK': { operator: 'Rusmiati', nik: '92400216' },
  'Template Jahit Dasar Pasang Variasi Hoodie Belakang': { operator: 'Euis Sulistiawati', nik: '92500595' },
  'Template Jahit Dasar Sambung Waistband': { operator: 'Claren Novitasari', nik: '92500371' },
  'Template Pasang Velcro Hoodie+gabung hoodie': { operator: 'Ida Rosida', nik: '92400762' },
  'Template Pasang Zipper Plaket Kiri + Pasang Kelam': { operator: 'Reni Nuranggraeni', nik: '950335' },
  'Bartack Velcro Tangan KK': { operator: 'Ifah Saripah', nik: '92400107' },
  'Bartack Hanger Loop': { operator: 'Tria Gusliani', nik: '92400107' },
  'Bartack Zipper Pocket KK 1': { operator: 'Ifah Saripah', nik: '92400107' },
  'Bartack Zipper Pocket KK 2': { operator: 'Ifah Saripah', nik: '92400107' },
  'Jahit Kelim Lapis Waistband': { operator: 'Nisa Rohaliyani', nik: '92400658' },
  'Jahit Dasar Pasang Lapis Hoodie Ke Tali': { operator: 'Ai Rumanah', nik: '92400713' },
  'Cutter Plaket Zipper': { operator: 'Sapitri', nik: '92400336' },
  'Bobok Zipper Samping KK': { operator: 'Eti Suhaeti', nik: '960170' },
  'Template Jahit Dasar Tab Hoodie': { operator: 'Eka Samrotul', nik: '—' },
  'Template Jahit Dasar Pasang Velcro Tab Hoodie': { operator: 'Rhien Rhien', nik: '92500369' },
  'Topstitch Hoodie Ke Body': { operator: 'Erni Karnia', nik: '92500158' },
  'Seam Seal Body Depan 2': { operator: 'Silva Aulia', nik: '92500141' },
  'Seam Seal Body Depan 3': { operator: 'Silva Aulia', nik: '92500141' },
  'Seam Seal Body Depan 4': { operator: 'Silva Aulia', nik: '92500141' },
  'Seam Seal Neck': { operator: 'Lilis Hidayati', nik: '92500164' },
  'Seam Seal Kelam Pocket K/K': { operator: 'Rima Nur Fadilah', nik: '92500327' },
  'Seam Seal Velcro Tangan KK': { operator: 'Iyah Sariyah', nik: '92500280' },
  'Heat Press Pasang Lem Tab Hoodie 2': { operator: 'Arini Nurfasa', nik: '92500493' },
  'Heat Press Washer Hoodie': { operator: 'Arini Nurfasa', nik: '92500493' },
  'Heat Press Velcro Hoodie+tab hoodie': { operator: 'Dina Permatasari', nik: '92500388' },
  'Heat Press Sideseam Tangan KK': { operator: 'Aulia Wulan Nur Aeni', nik: '92500491' },
  'Heat Press Body Depan 3': { operator: 'Yeyet Nurhayati', nik: '951582' },
  'Heat Press Ujung Hoodie KK (Molding Pendek)': { operator: 'Ai Tika Tarwidah', nik: '92500238' },
  'Heat Press Neck': { operator: 'Nani Rusmayani', nik: '92500641' },
  'Pasang Lem Washer Hoodie 2x (Side Hoodie)': { operator: 'Euis Iyar', nik: '92500054' },
  'Iron pasang Lem logo Montbell': { operator: 'Yusi Oktaviana', nik: '920377' },
  'Iron pasang lem logo tangan': { operator: 'Yusi Oktaviana', nik: '920377' },
  'Iron Pasang Lem Washer Hoodie 1x': { operator: 'Euis Iyar', nik: '92500054' },
  'Iron Pasang Lem Zipper Pocket': { operator: 'Dini Ramdani', nik: '92400991' },
};

const BATCH1_OPERATOR = { operator: 'Nisa Rohaliyani', nik: '92400658' };

const HOODIE_PROCESSES = [
  { processName: 'Jahit Dasar Pasang Side Hoodie ke Inner', operator: 'Siti Adawiah', nik: '951990', category: 'Sewing', categoryTone: 'purple', processId: 'SN-JS', machine: 'M-SINGLE NEEDLE', machineId: 'MC-SNLS-031', target: 0.82 },
  { processName: 'Jahit Stitch Pasang Tab Hoodie', operator: 'Nisa Roh', nik: '92400658', category: 'Sewing', categoryTone: 'purple', processId: 'SN-JS', machine: 'M-SINGLE NEEDLE', machineId: 'MC-SNLS-032', target: 0.76 },
  { processName: 'Jahit Corong Atas Hoodie', operator: 'Enneng Sunengsih', nik: '941864', category: 'Sewing', categoryTone: 'purple', processId: 'SN-JS', machine: 'M-SINGLE NEEDLE', machineId: 'MC-SNLS-033', target: 0.71 },
  { processName: 'Pasang Tali Hoodie KK', operator: 'Rusmiati', nik: '92400216', category: 'Sewing', categoryTone: 'purple', processId: 'SN-JS', machine: 'M-SINGLE NEEDLE', machineId: 'MC-SNLS-034', target: 0.65 },
  { processName: 'Template Jahit Dasar Pasang Variasi Hoodie Belakang', operator: 'Euis Sulistiawati', nik: '92500595', category: 'Helper', categoryTone: 'cyan', processId: 'TP-JS', machine: 'A-TEMPLATE', machineId: '24103501460', target: 0.42 },
  { processName: 'Template Pasang Velcro Hoodie+gabung hoodie', operator: 'Ida Rosida', nik: '92400762', category: 'Helper', categoryTone: 'cyan', processId: 'TP-JS', machine: 'A-TEMPLATE', machineId: '24103501461', target: 0.48 },
  { processName: 'Jahit Dasar Pasang Lapis Hoodie Ke Tali', operator: 'Ai Rumanah', nik: '92400713', category: 'Sewing', categoryTone: 'purple', processId: 'SN-JS', machine: 'M-SINGLE NEEDLE', machineId: 'MC-SNLS-035', target: 0.74 },
  { processName: 'Template Jahit Dasar Tab Hoodie', operator: 'Eka Samrotul', nik: '—', category: 'Helper', categoryTone: 'cyan', processId: 'TP-JS', machine: 'A-TEMPLATE', machineId: '24103501462', target: 0.38 },
  { processName: 'Template Jahit Dasar Pasang Velcro Tab Hoodie', operator: 'Rhien Rhien', nik: '92500369', category: 'Helper', categoryTone: 'cyan', processId: 'TP-JS', machine: 'A-TEMPLATE', machineId: '24103501463', target: 0.4 },
  { processName: 'Topstitch Hoodie Ke Body', operator: 'Erni Karnia', nik: '92500158', category: 'Sewing', categoryTone: 'purple', processId: 'SN-JS', machine: 'M-SINGLE NEEDLE', machineId: 'MC-SNLS-036', target: 0.68 },
  { processName: 'Heat Press Pasang Lem Tab Hoodie 2', operator: 'Arini Nurfasa', nik: '92500493', category: 'Assembly', categoryTone: 'green', processId: 'HT-PS', machine: 'A-HEAT PRESS', machineId: '202501009', target: 0.52 },
  { processName: 'Heat Press Washer Hoodie', operator: 'Arini Nurfasa', nik: '92500493', category: 'Assembly', categoryTone: 'green', processId: 'HT-PS', machine: 'A-HEAT PRESS', machineId: '202501010', target: 0.5 },
  { processName: 'Heat Press Velcro Hoodie+tab hoodie', operator: 'Dina Permatasari', nik: '92500388', category: 'Assembly', categoryTone: 'green', processId: 'HT-PS', machine: 'A-HEAT PRESS', machineId: '202501011', target: 0.48 },
  { processName: 'Heat Press Ujung Hoodie KK (Molding Pendek)', operator: 'Ai Tika Tarwidah', nik: '92500238', category: 'Assembly', categoryTone: 'green', processId: 'HT-PS', machine: 'A-HEAT PRESS', machineId: '202501012', target: 0.55 },
  { processName: 'Pasang Lem Washer Hoodie 2x (Side Hoodie)', operator: 'Euis Iyar', nik: '92500054', category: 'Helper', categoryTone: 'cyan', processId: 'HP-016', machine: 'Manual Table', machineId: 'TB-HD-02', target: 0.32 },
  { processName: 'Iron Pasang Lem Washer Hoodie 1x', operator: 'Euis Iyar', nik: '92500054', category: 'Ironing', categoryTone: 'green', processId: 'IR-PN', machine: 'M-IRON', machineId: 'IR-HD-01', target: 0.36 },
];

const QTY_CHAIN = [88, 72, 58, 45, 35, 28, 22, 18, 14, 10, 8, 6, 4, 2, 1, 0];

function buildHoodieProcess(node, idx, total) {
  const no = idx + 1;
  const qty = QTY_CHAIN[idx] ?? 0;
  const status = idx < total - 2 ? 'Done' : idx === total - 2 ? 'Running' : 'Waiting';
  return {
    no,
    processName: node.processName,
    category: node.category,
    categoryTone: node.categoryTone,
    processId: node.processId,
    operator: node.operator,
    machine: node.machine,
    scan: idx === 0 ? '—' : idx < 5 ? `08:${10 + idx * 12} - 09:${20 + idx * 10}` : '—',
    status,
    qtyLabel: 'Qty Output Bundle',
    qtyHint: 'Panel Hoodie',
    qtyValue: qty,
    qtyClass: 'bundle',
    rfidNote: 'RFID: pcs tag carried on main panel',
    target: node.target,
    historical: Number((node.target + 0.02).toFixed(2)),
    actual: Number((node.target + 0.04).toFixed(2)),
    actualBad: true,
    hasNext: idx < total - 1,
    nik: node.nik,
    machineId: node.machineId,
    manPower: node.category === 'Helper' ? 1 : 2,
    panel: 'Hoodie',
    alatBantu: '—',
    ...(idx === 0 ? { scanStart: null, scanEnd: null } : {}),
    ...(idx === total - 1 ? { scanStart: null, scanEnd: null } : {}),
  };
}

// --- flow detail ---
const flowPath = path.join(root, 'src/data/sewing/sewing-flow-detail.json');
const flow = JSON.parse(fs.readFileSync(flowPath, 'utf8'));

for (const lane of flow.batches) {
  if (lane.batch === 1) {
    for (const proc of lane.processes) {
      proc.operator = BATCH1_OPERATOR.operator;
      proc.nik = BATCH1_OPERATOR.nik;
    }
    continue;
  }

  if (lane.batch === 3) {
    const total = HOODIE_PROCESSES.length;
    lane.totalCount = total;
    lane.processes = HOODIE_PROCESSES.map((node, idx) => buildHoodieProcess(node, idx, total));
    continue;
  }

  for (const proc of lane.processes) {
    const hit = OPERATOR_BY_PROCESS[proc.processName];
    if (hit) {
      proc.operator = hit.operator;
      proc.nik = hit.nik;
    }
  }
}

fs.writeFileSync(flowPath, `${JSON.stringify(flow, null, 2)}\n`, 'utf8');
console.log('Updated', flowPath);

// --- batch dashboard meta ---
const dashPath = path.join(root, 'src/data/sewing/sewing-batch-dashboard.json');
const dash = JSON.parse(fs.readFileSync(dashPath, 'utf8'));
const b3 = dash.batches.find((b) => b.batch === 3);
if (b3) b3.processCount = HOODIE_PROCESSES.length;
fs.writeFileSync(dashPath, `${JSON.stringify(dash, null, 2)}\n`, 'utf8');
console.log('Updated', dashPath);

console.log('Done. Batch 3:', HOODIE_PROCESSES.length, 'proses hoodie.');

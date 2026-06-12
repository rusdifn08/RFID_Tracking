import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const report = JSON.parse(
  fs.readFileSync(path.join(root, 'src/data/sewing/sewing-report-data.json'), 'utf8')
);
const flow = JSON.parse(
  fs.readFileSync(path.join(root, 'src/data/sewing/sewing-flow-detail.json'), 'utf8')
);

const byProcessId = Object.fromEntries(
  (report.processes ?? []).map((r) => [r.processId, r])
);

const defaultManPower = (category) => {
  const c = (category ?? '').toLowerCase();
  if (c === 'qc') return 1;
  if (c === 'assembling' || c === 'assembly') return 2;
  if (c === 'sewing') return 2;
  return 1;
};

let updated = 0;
for (const lane of flow.batches) {
  for (const proc of lane.processes) {
    const src = byProcessId[proc.processId];
    if (src?.machineId) {
      proc.machineId = src.machineId;
      updated++;
    } else if (!proc.machineId) {
      proc.machineId = `MC-${proc.processId}`;
    }
    proc.manPower = proc.manPower ?? defaultManPower(proc.category);
    if (!proc.scan || proc.scan === '—') {
      proc.scanStart = null;
      proc.scanEnd = null;
    }
  }
}

fs.writeFileSync(
  path.join(root, 'src/data/sewing/sewing-flow-detail.json'),
  JSON.stringify(flow, null, 2) + '\n'
);
console.log(`Enriched flow: machineId/manPower on ${updated} processes from report`);

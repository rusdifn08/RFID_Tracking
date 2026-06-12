import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

export const toTitleCaseName = (name) => {
  if (!name || typeof name !== 'string' || name === '—') return name;
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

const walk = (obj) => {
  if (Array.isArray(obj)) obj.forEach(walk);
  else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'operator' && typeof v === 'string') obj[k] = toTitleCaseName(v);
      else walk(v);
    }
  }
};

for (const rel of [
  'src/data/sewing/sewing-flow-detail.json',
  'src/data/sewing/sewing-report-data.json',
]) {
  const p = path.join(root, rel);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  walk(data);
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`);
  console.log('Updated', rel);
}

const scriptPath = path.join(root, 'scripts/update-sewing-operators-hoodie.mjs');
let script = fs.readFileSync(scriptPath, 'utf8');
script = script.replace(/operator: '([^']+)'/g, (_, name) => `operator: '${toTitleCaseName(name)}'`);
fs.writeFileSync(scriptPath, script);
console.log('Updated scripts/update-sewing-operators-hoodie.mjs');

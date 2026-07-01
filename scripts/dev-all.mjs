/**
 * Jalankan frontend (Vite) + proxy (server.js) dengan port opsional.
 *
 * Contoh:
 *   npm run dev:all:mjl -- -portfrontend 5173 -portbackend 7000 -portbackendgcc 9000
 *   npm run dev:all:mjl2 -- -portfrontend 5174 -portbackend 7000 -portbackendgcc 9000
 *
 * Tanpa flag → default per environment (sama seperti sebelumnya).
 * API Production Schedule (10.8.18.60:7186) tidak diubah oleh skrip ini.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const ENV_PRESETS = {
  cln: { serverArg: 'cln', defaultFrontend: 5173, backendIp: '10.8.0.104' },
  mjl: { serverArg: 'mjl', defaultFrontend: 5173, backendIp: '10.5.0.106' },
  mjl2: { serverArg: 'mjl2', defaultFrontend: 5174, backendIp: '10.6.0.99' },
  gcc: { serverArg: 'gcc', defaultFrontend: 5175, backendIp: '10.5.0.106' },
  default: { serverArg: '', defaultFrontend: 5173, backendIp: '10.8.0.104' },
};

const DEFAULT_BACKEND_PORT = 7000;
const DEFAULT_GCC_PORT = 9000;
const GCC_SERVICE_HOST = process.env.GCC_CUTTING_SERVICE_HOST || '10.5.0.107';

function parsePortArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const m = /^-(portfrontend|portbackend|portbackendgcc)(?:=(.+))?$/i.exec(a);
    if (!m) continue;
    const val = m[2] ?? argv[i + 1];
    if (val == null || String(val).startsWith('-')) continue;
    const n = Number(val);
    if (!Number.isFinite(n) || n < 1 || n > 65535) {
      console.error(`[dev-all] Port tidak valid untuk ${m[1]}: ${val}`);
      process.exit(1);
    }
    out[m[1].toLowerCase()] = n;
    if (!m[2]) i++;
  }
  return out;
}

const envKey = (process.argv[2] || 'default').toLowerCase();
const preset = ENV_PRESETS[envKey] ?? ENV_PRESETS.default;
const ports = parsePortArgs(process.argv.slice(3));

const frontendPort = ports.portfrontend ?? preset.defaultFrontend;
const backendPort = ports.portbackend ?? DEFAULT_BACKEND_PORT;
const gccPort = ports.portbackendgcc ?? DEFAULT_GCC_PORT;

const backendBase = `http://${preset.backendIp}:${backendPort}`;
const gccBase = `http://${GCC_SERVICE_HOST}:${gccPort}`;

const childEnv = {
  ...process.env,
  VITE_DEV_SERVER_PORT: String(frontendPort),
  VITE_BACKEND_PORT: String(backendPort),
  VITE_DEV_API_TARGET: backendBase,
  VITE_GCC_CUTTING_PROXY_TARGET: gccBase,
  VITE_SEWING_SERVICE_PROXY_TARGET: gccBase,
  BACKEND_PORT: String(backendPort),
  BACKEND_API_URL: backendBase,
  GCC_CUTTING_SERVICE_PORT: String(gccPort),
};

const serverCmd = preset.serverArg
  ? `node -r ./set-no-debug.cjs server.js ${preset.serverArg}`
  : 'node -r ./set-no-debug.cjs server.js';

console.log('\n[dev-all] Konfigurasi dev');
console.log(`  Environment     : ${envKey === 'default' ? 'CLN (default)' : envKey.toUpperCase()}`);
console.log(`  Frontend (Vite) : ${frontendPort}`);
console.log(`  Backend API     : ${backendBase}`);
console.log(`  GCC / Sewing    : ${gccBase}`);
console.log('  Prod Schedule   : http://10.8.18.60:7186 (tetap, tidak diubah)\n');

const child = spawn(
  'npx',
  ['concurrently', '-k', `"${serverCmd}"`, '"vite"'],
  { cwd: root, env: childEnv, shell: true, stdio: 'inherit' },
);

child.on('exit', (code) => process.exit(code ?? 0));

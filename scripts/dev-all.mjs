/**
 * Jalankan frontend (Vite) + proxy (server.js) dengan port opsional.
 *
 * Contoh:
 *   npm run dev:all:mjl -- -portfrontend 5173 -portbackend 7000 -ipbackend 10.5.0.109 -ipgcc 10.5.0.109
 *   npm run dev:all:mjl2 -- -portfrontend 5174 -portbackend 7000 -portbackendgcc 9000 -portproxy 8001
 *
 * Tanpa flag → default per environment (sama seperti sebelumnya).
 * API Production Schedule (10.8.18.60:7186) tidak diubah oleh skrip ini.
 */
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const ENV_PRESETS = {
  cln: { serverArg: 'cln', defaultFrontend: 5173, backendIp: '10.5.0.107' },
  mjl: { serverArg: 'mjl', defaultFrontend: 5173, backendIp: '10.5.0.107' },
  mjl2: { serverArg: 'mjl2', defaultFrontend: 5174, backendIp: '10.6.0.2' },
  gcc: { serverArg: 'gcc', defaultFrontend: 5175, backendIp: '10.5.0.106' },
  default: { serverArg: '', defaultFrontend: 5173, backendIp: '10.5.0.107' },
};

const DEFAULT_BACKEND_PORT = 7000;
const DEFAULT_GCC_PORT = 9000;
const DEFAULT_PROXY_PORTS = {
  cln: 8000,
  mjl: 8000,
  mjl2: 8001,
  gcc: 8002,
  default: 8000,
};
const GCC_SERVICE_HOST_DEFAULT = '10.5.0.107';

/** IPv4 LAN utama — sama logika dengan vite.config.ts */
function getPrimaryLanIPv4() {
  const candidates = [];
  for (const nets of Object.values(os.networkInterfaces())) {
    for (const net of nets || []) {
      const fam = net.family;
      const isV4 = fam === 'IPv4' || fam === 4;
      if (isV4 && !net.internal && net.address) candidates.push(net.address);
    }
  }
  return candidates.find((a) => !a.startsWith('169.254.')) || candidates[0] || 'localhost';
}

function parseDevArgs(argv) {
  const ports = {};
  const ips = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const portM = /^-(portfrontend|portbackend|portbackendgcc|portproxy)(?:=(.+))?$/i.exec(a);
    if (portM) {
      const val = portM[2] ?? argv[i + 1];
      if (val == null || String(val).startsWith('-')) continue;
      const n = Number(val);
      if (!Number.isFinite(n) || n < 1 || n > 65535) {
        console.error(`[dev-all] Port tidak valid untuk ${portM[1]}: ${val}`);
        process.exit(1);
      }
      ports[portM[1].toLowerCase()] = n;
      if (!portM[2]) i++;
      continue;
    }
    const ipM = /^-(ipbackend|ipgcc)(?:=(.+))?$/i.exec(a);
    if (ipM) {
      const val = ipM[2] ?? argv[i + 1];
      if (val == null || String(val).startsWith('-')) continue;
      const ip = String(val).trim();
      if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
        console.error(`[dev-all] IP tidak valid untuk ${ipM[1]}: ${val}`);
        process.exit(1);
      }
      ips[ipM[1].toLowerCase()] = ip;
      if (!ipM[2]) i++;
    }
  }
  return { ports, ips };
}

const envKey = (process.argv[2] || 'default').toLowerCase();
const preset = ENV_PRESETS[envKey] ?? ENV_PRESETS.default;
const { ports, ips } = parseDevArgs(process.argv.slice(3));

const frontendPort = ports.portfrontend ?? preset.defaultFrontend;
const backendPort = ports.portbackend ?? DEFAULT_BACKEND_PORT;
const gccPort = ports.portbackendgcc ?? DEFAULT_GCC_PORT;
const proxyPort = ports.portproxy ?? (DEFAULT_PROXY_PORTS[envKey] ?? DEFAULT_PROXY_PORTS.default);

const backendIp = ips.ipbackend ?? preset.backendIp;
const gccHost = ips.ipgcc ?? process.env.GCC_CUTTING_SERVICE_HOST ?? GCC_SERVICE_HOST_DEFAULT;

const backendBase = `http://${backendIp}:${backendPort}`;
const gccBase = `http://${gccHost}:${gccPort}`;

const childEnv = {
  ...process.env,
  VITE_DEV_SERVER_PORT: String(frontendPort),
  VITE_BACKEND_PORT: String(backendPort),
  VITE_DEV_API_TARGET: backendBase,
  VITE_GCC_CUTTING_PROXY_TARGET: gccBase,
  VITE_SEWING_SERVICE_PROXY_TARGET: gccBase,
  BACKEND_PORT: String(backendPort),
  BACKEND_IP: backendIp,
  BACKEND_API_URL: backendBase,
  GCC_CUTTING_SERVICE_HOST: gccHost,
  GCC_CUTTING_SERVICE_PORT: String(gccPort),
  PROXY_PORT: String(proxyPort),
  PORT: String(proxyPort),
  VITE_NODE_PROXY_PORT: String(proxyPort),
};

const serverCmd = preset.serverArg
  ? `node -r ./set-no-debug.cjs server.js ${preset.serverArg}`
  : 'node -r ./set-no-debug.cjs server.js';

const lanIp = getPrimaryLanIPv4();
const webUrl = `http://${lanIp}:${frontendPort}`;
const localhostUrl = `http://localhost:${frontendPort}`;

console.log('\n[dev-all] Konfigurasi dev');
console.log(`  Environment     : ${envKey === 'default' ? 'CLN (default)' : envKey.toUpperCase()}`);
console.log(`  Akses Web       : ${webUrl}`);
if (lanIp !== 'localhost' && lanIp !== '127.0.0.1') {
  console.log(`  Akses Lokal     : ${localhostUrl}`);
}
console.log(`  Frontend (Vite) : ${frontendPort}`);
console.log(`  Proxy (Node)    : ${lanIp}:${proxyPort}`);
console.log(`  Backend API     : ${backendBase}`);
console.log(`  GCC / Sewing    : ${gccBase}`);
console.log('  Prod Schedule   : http://10.8.18.60:7186 (tetap, tidak diubah)\n');

const child = spawn(
  'npx',
  ['concurrently', '-k', `"${serverCmd}"`, '"vite"'],
  { cwd: root, env: childEnv, shell: true, stdio: 'inherit' },
);

child.on('exit', (code) => process.exit(code ?? 0));

import { defineConfig, loadEnv, type Plugin } from 'vite'
import http from 'node:http'
import os from 'node:os'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

const DEFAULT_DEV_API_TARGET = 'http://10.5.0.106:7000'

function resolveBackendPort(env: Record<string, string>): number {
  const n = Number(env.VITE_BACKEND_PORT || 7000)
  return Number.isFinite(n) && n > 0 ? n : 7000
}

function withPort(baseUrl: string, port: number): string {
  try {
    const u = new URL(baseUrl)
    u.port = String(port)
    return u.toString().replace(/\/$/, '')
  } catch {
    return baseUrl
  }
}

/**
 * Browser tidak boleh GET + body. Frontend POST ke `/api/gcc/cutting/reg/batch`,
 * middleware ini meneruskan GET + body ke service cutting (:9000).
 */
function gccCuttingRegBatchProxyPlugin(target: string): Plugin {
  return {
    name: 'gcc-cutting-reg-batch-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        if (url !== '/api/gcc/cutting/reg/batch') return next()
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }
        const chunks: Buffer[] = []
        req.on('data', (chunk) => chunks.push(chunk))
        req.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8')
          const targetUrl = new URL(target)
          const rfidKey = String(req.headers['rfid-key'] ?? '0011779933')
          const proxyReq = http.request(
            {
              hostname: targetUrl.hostname,
              port: targetUrl.port || 9000,
              path: '/api/gcc/cutting/reg/batch',
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'rfid-key': rfidKey,
              },
            },
            (proxyRes) => {
              res.statusCode = proxyRes.statusCode ?? 500
              const ct = proxyRes.headers['content-type']
              if (ct) res.setHeader('Content-Type', ct)
              proxyRes.pipe(res)
            }
          )
          proxyReq.on('error', (err) => {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ message: err.message }))
          })
          proxyReq.write(body)
          proxyReq.end()
        })
      })
    },
  }
}

/** IPv4 non-loopback — agar HMR/WebSocket tidak mengarah ke localhost saat akses http(s)://IP-LAN:5173 */
function getPrimaryLanIPv4(): string | undefined {
  const nets = os.networkInterfaces()
  const candidates: string[] = []
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      const fam = net.family as string | number
      const isV4 = fam === 'IPv4' || fam === 4
      if (isV4 && !net.internal && net.address) {
        candidates.push(net.address)
      }
    }
  }
  const preferred = candidates.find((a) => !a.startsWith('169.254.'))
  return preferred || candidates[0]
}

const VITE_HANDLED_PREFIXES = [
  '/api/gcc/cutting',
  '/api/homedashboard',
  '/api/sewing',
  '/api/smv',
  '/api/prep',
  '/rework',
  '/qc-pqc',
  '/pqc-rework',
  '/pqc-indryroom',
  '/indryroom-outdryroom',
  '/outdryroom-infolding',
  '/infolding-outfolding',
  '/last-status',
  '/line',
  '/cycletime',
]

function isStaticDevAsset(path: string): boolean {
  return /\.(html|js|css|tsx?|jsx?|json|png|jpe?g|gif|svg|ico|webp|woff2?|ttf|map|wasm)(\?|$)/i.test(path)
}

function shouldProxyToServerJs(url: string): boolean {
  const path = url.split('?')[0] ?? ''
  if (!path || path === '/' || isStaticDevAsset(path)) return false
  if (path.startsWith('/@') || path.startsWith('/src/') || path.startsWith('/node_modules/')) return false
  if (VITE_HANDLED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return false
  if (path.startsWith('/user') && url.includes('bagian=')) return false

  const serverJsPrefixes = [
    '/api/',
    '/garment',
    '/tracking',
    '/wira',
    '/card',
    '/scrap',
    '/monitoring',
    '/inputUser',
    '/inputRFID',
    '/output',
    '/daily-output',
    '/report',
    '/total-per-wo',
    '/finishing',
    '/user',
    '/wo/',
    '/health',
    '/qc',
    '/pqc',
  ]
  return serverJsPrefixes.some((p) => path === p || path.startsWith(p.endsWith('/') ? p : p + '/'))
}

/** GET /user?bagian=SEWING → service :9000; login /user?nik= → server.js. */
function sewingUserProxyPlugin(target: string): Plugin {
  return {
    name: 'sewing-user-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || ''
        if (!url.startsWith('/user') || !url.includes('bagian=')) return next()
        const targetUrl = new URL(target)
        const proxyReq = http.request(
          {
            hostname: targetUrl.hostname,
            port: targetUrl.port || 9000,
            path: url,
            method: req.method,
            headers: req.headers as http.OutgoingHttpHeaders,
          },
          (proxyRes) => {
            res.statusCode = proxyRes.statusCode ?? 500
            const ct = proxyRes.headers['content-type']
            if (ct) res.setHeader('Content-Type', ct)
            proxyRes.pipe(res)
          }
        )
        proxyReq.on('error', (err) => {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ message: err.message }))
        })
        req.pipe(proxyReq)
      })
    },
  }
}

/** Dev: same-origin path backend → proxy ke server.js (localhost atau host MJL2). */
function devServerJsProxyPlugin(nodeHost: string, nodePort: number): Plugin {
  return {
    name: 'dev-server-js-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || ''
        if (!shouldProxyToServerJs(url)) return next()
        const proxyReq = http.request(
          {
            hostname: nodeHost,
            port: nodePort,
            path: url,
            method: req.method,
            headers: {
              ...(req.headers as http.IncomingHttpHeaders),
              host: `${nodeHost}:${nodePort}`,
            },
          },
          (proxyRes) => {
            res.statusCode = proxyRes.statusCode ?? 500
            const ct = proxyRes.headers['content-type']
            if (ct) res.setHeader('Content-Type', ct)
            proxyRes.pipe(res)
          }
        )
        proxyReq.on('error', (err) => {
          if (!res.headersSent) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ message: err.message }))
          }
        })
        req.pipe(proxyReq)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendPort = resolveBackendPort(env)
  const trackingProxyTarget =
    env.VITE_DEV_API_TARGET || withPort(DEFAULT_DEV_API_TARGET, backendPort)
  const gccHost = (() => {
    try {
      return new URL(env.VITE_GCC_CUTTING_PROXY_TARGET || 'http://10.5.0.107:9000').hostname
    } catch {
      return '10.5.0.107'
    }
  })()
  const gccPort = Number(env.GCC_CUTTING_SERVICE_PORT || env.VITE_GCC_BACKEND_PORT || 9000) || 9000
  const gccCuttingListTarget =
    env.VITE_GCC_CUTTING_PROXY_TARGET || `http://${gccHost}:${gccPort}`
  const sewingServiceTarget =
    env.VITE_SEWING_SERVICE_PROXY_TARGET || gccCuttingListTarget

  // Dev default HTTP → http://10.5.0.2:5173/home tanpa sertifikat.
  // HTTPS (kamera di HP / secure context): set VITE_DEV_HTTPS=true atau 1 lalu restart dev.
  const useDevHttps =
    command === 'serve' && (env.VITE_DEV_HTTPS === 'true' || env.VITE_DEV_HTTPS === '1')

  const hmrHost =
    env.VITE_DEV_HMR_HOST ||
    env.VITE_DEV_HOST ||
    (command === 'serve' ? getPrimaryLanIPv4() : undefined)

  const devServerPort = Number(env.VITE_DEV_SERVER_PORT || 5173) || 5173
  const nodeProxyPort = devServerPort === 5174 ? 8001 : devServerPort === 5175 ? 8002 : 8000
  // MJL2: server.js di 10.6.0.99:8001; MJL/CLN: localhost (dev:all di mesin yang sama)
  const nodeProxyHost = env.VITE_NODE_PROXY_HOST || (devServerPort === 5174 ? '10.6.0.99' : '127.0.0.1')

  return {
    plugins: [
      react(),
      tailwindcss(),
      gccCuttingRegBatchProxyPlugin(sewingServiceTarget),
      sewingUserProxyPlugin(sewingServiceTarget),
      ...(command === 'serve' ? [devServerJsProxyPlugin(nodeProxyHost, nodeProxyPort)] : []),
      ...(useDevHttps ? [basicSsl()] : [])
    ],
    logLevel: 'warn', // sembunyikan "[vite] (client) hmr update ..." di terminal saat dev
    optimizeDeps: {
      include: ['mqtt'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Vendor chunk: React & router (sering dipakai, cache terpisah)
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'vendor-react';
            if (id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run')) return 'vendor-router';
            // Zustand & TanStack Query
            if (id.includes('node_modules/zustand') || id.includes('node_modules/@tanstack')) return 'vendor-state';
            // Lucide icons (banyak dipakai)
            if (id.includes('node_modules/lucide-react')) return 'vendor-lucide';
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
    server: {
      host: '0.0.0.0', // Akses dari semua interface (localhost dan jaringan lokal)
      port: Number(env.VITE_DEV_SERVER_PORT || 5173) || 5173,
      strictPort: true,
      open: false, // Jangan auto-open browser

      // HMR diatur agar menyesuaikan apakah HTTPS menyala atau tidak
      hmr:
        command === 'serve'
          ? {
            protocol: useDevHttps ? 'wss' : 'ws',
            host: hmrHost || 'localhost',
          }
          : undefined,

      proxy: {
        // Proxy khusus untuk dashboard Production Tracking Time
        '/rework': { target: trackingProxyTarget, changeOrigin: true, secure: false },
        '/qc-pqc': { target: trackingProxyTarget, changeOrigin: true, secure: false },
        '/pqc-rework': { target: trackingProxyTarget, changeOrigin: true, secure: false },
        '/pqc-indryroom': { target: trackingProxyTarget, changeOrigin: true, secure: false },
        '/indryroom-outdryroom': { target: trackingProxyTarget, changeOrigin: true, secure: false },
        '/outdryroom-infolding': { target: trackingProxyTarget, changeOrigin: true, secure: false },
        '/infolding-outfolding': { target: trackingProxyTarget, changeOrigin: true, secure: false },
        '/last-status': { target: trackingProxyTarget, changeOrigin: true, secure: false },

        // Single query API untuk cycle time
        '/cycletime': { target: `http://localhost:${nodeProxyPort}`, changeOrigin: true, secure: false },

        // GCC cutting (:9000) — path sama dengan backend agar Network tab konsisten
        '/api/gcc/cutting': {
          target: gccCuttingListTarget,
          changeOrigin: true,
          secure: false,
          router: (req: { url?: string }) => {
            const path = req.url?.split('?')[0] ?? ''
            if (
              path === '/api/gcc/cutting/reg' ||
              path.startsWith('/api/gcc/cutting/reg/') ||
              path === '/api/gcc/cutting/sewing'
            ) {
              return sewingServiceTarget
            }
            return gccCuttingListTarget
          },
        },

        '/api/homedashboard': {
          target: gccCuttingListTarget,
          changeOrigin: true,
          secure: false,
        },

        // Sewing user + SMV master (:9000 MJL)
        '/api/sewing': {
          target: sewingServiceTarget,
          changeOrigin: true,
          secure: false,
        },
        '/api/smv': {
          target: sewingServiceTarget,
          changeOrigin: true,
          secure: false,
        },
        '/api/prep': {
          target: sewingServiceTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
    },
  }
})
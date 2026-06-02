import { defineConfig, loadEnv } from 'vite'
import os from 'node:os'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

const DEFAULT_DEV_API_TARGET = 'http://10.5.0.106:7000'

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

/** Proxy server.js (localhost) — dipakai saat dev HTTPS agar tidak mixed content ke http://IP:port */
const devNodeProxyRewrite = (port: number) => (path: string) => {
  const prefix = `/__dev_node_proxy__${port}`
  if (!path.startsWith(prefix)) return path
  const rest = path.slice(prefix.length)
  return rest.startsWith('/') ? rest : `/${rest}`
}

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const trackingProxyTarget = env.VITE_DEV_API_TARGET || DEFAULT_DEV_API_TARGET
  const gccCuttingListTarget = env.VITE_GCC_CUTTING_PROXY_TARGET || 'http://10.5.0.107:9000'

  // Dev default HTTP → http://10.5.0.2:5173/home tanpa sertifikat.
  // HTTPS (kamera di HP / secure context): set VITE_DEV_HTTPS=true atau 1 lalu restart dev.
  const useDevHttps =
    command === 'serve' && (env.VITE_DEV_HTTPS === 'true' || env.VITE_DEV_HTTPS === '1')

  const hmrHost =
    env.VITE_DEV_HMR_HOST ||
    env.VITE_DEV_HOST ||
    (command === 'serve' ? getPrimaryLanIPv4() : undefined)

  return {
    plugins: [
      react(),
      tailwindcss(),
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
        // Dev HTTPS: same-origin → proxy ke server Node di mesin dev (hindari mixed content)
        ...(useDevHttps
          ? {
            '/__dev_node_proxy__8000': {
              target: 'http://127.0.0.1:8000',
              changeOrigin: true,
              rewrite: devNodeProxyRewrite(8000),
              secure: false, // Tambahan untuk membiarkan proxy bypass SSL self-signed
            },
            '/__dev_node_proxy__8001': {
              target: 'http://127.0.0.1:8001',
              changeOrigin: true,
              rewrite: devNodeProxyRewrite(8001),
              secure: false,
            },
            '/__dev_node_proxy__8002': {
              target: 'http://127.0.0.1:8002',
              changeOrigin: true,
              rewrite: devNodeProxyRewrite(8002),
              secure: false,
            },
          }
          : {}),

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
        '/cycletime': { target: 'http://localhost:8000', changeOrigin: true, secure: false },

        // Daftar bundle cutting (GET penuh) — same-origin di dev agar tidak kena CORS browser
        '/__gcc_cutting': {
          target: gccCuttingListTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/__gcc_cutting/, '') || '/',
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
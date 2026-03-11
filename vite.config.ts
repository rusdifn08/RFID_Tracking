import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
    port: 5173,
    strictPort: true,
    open: false, // Jangan auto-open browser
    proxy: {
      // Jangan proxy '/line' — /line/1, /line/2 dll adalah route SPA (halaman Production Line).
      // Kalau di-proxy ke Django, refresh di /line/1 akan dapat 404 (Django tidak punya route itu).
      // API line dipanggil lewat server.js: GET /api/line, /api/line/:id.
      // Proxy khusus untuk dashboard Production Tracking Time (hindari CORS)
      '/rework': { target: 'http://10.5.0.106:7000', changeOrigin: true },
      '/qc-pqc': { target: 'http://10.5.0.106:7000', changeOrigin: true },
      '/pqc-rework': { target: 'http://10.5.0.106:7000', changeOrigin: true },
      '/pqc-indryroom': { target: 'http://10.5.0.106:7000', changeOrigin: true },
      '/indryroom-outdryroom': { target: 'http://10.5.0.106:7000', changeOrigin: true },
      '/outdryroom-infolding': { target: 'http://10.5.0.106:7000', changeOrigin: true },
      '/infolding-outfolding': { target: 'http://10.5.0.106:7000', changeOrigin: true },
      '/last-status': { target: 'http://10.5.0.106:7000', changeOrigin: true },
      // Single query API untuk cycle time - proxy melalui server.js (port 8000) yang akan forward ke 10.5.0.7:7000
      '/cycletime': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0', // Akses dari semua interface (localhost dan jaringan lokal)
    port: 5173,
    strictPort: true,
    open: false, // Jangan auto-open browser
    proxy: {
      // Proxy khusus untuk dashboard Production Tracking Time (hindari CORS)
      '/line': { target: 'http://10.5.0.106:7000', changeOrigin: true },
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

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
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
})

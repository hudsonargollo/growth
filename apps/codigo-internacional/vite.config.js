import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// During `vite dev`, proxy /api to the local worker (wrangler dev on :8787)
// so the form can post to /api/ci/leads without CORS. In production the form
// uses VITE_API_BASE (the deployed worker URL).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Force a single React instance through Vite's dep optimizer — prevents
  // framer-motion from resolving its own copy ("Invalid hook call" in dev).
  resolve: { dedupe: ['react', 'react-dom'] },
  optimizeDeps: { include: ['react', 'react-dom', 'framer-motion'] },
  server: {
    port: 5175,
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
})

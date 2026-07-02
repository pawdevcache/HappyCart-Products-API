import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy /api to the Go backend so the frontend can call it without CORS setup.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': { target: 'http://localhost:8080', rewrite: p => p.replace(/^\/api/, '') } },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy /api to the Go backend so the frontend can call it without CORS setup.
// No path rewrite: the backend serves the API under /api in both dev and prod.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:8080' },
  },
})

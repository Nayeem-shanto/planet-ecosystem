import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In development, /api requests are forwarded to the Express server.
    // The browser sees ONE origin, so cookies work without CORS headaches.
    proxy: {
      '/api': 'http://localhost:4000',
      '/dev': 'http://localhost:4000',
    },
  },
})

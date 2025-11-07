import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0', // Listen on all interfaces for Docker
    proxy: {
      '/api': {
        // Use Docker service name when in container, localhost when local dev
        target: process.env.BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: process.env.BACKEND_WS_URL || 'ws://localhost:8000',
        ws: true,
      },
    },
  },
})

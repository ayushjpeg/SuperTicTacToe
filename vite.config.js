import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8013,
    strictPort: true,
    host: '0.0.0.0',
  },
  preview: {
    port: 8013,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: ['superttt.ayux.in'],
  },
})

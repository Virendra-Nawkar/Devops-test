// FILE: vite.config.js
// PURPOSE: Vite build tool configuration — sets port 80 and proxies all /api calls to the backend
// USED BY: Vite CLI when you run 'npm run dev'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    // Frontend runs on port 80
    port: 80,

    // host: '0.0.0.0' means the dev server accepts connections from outside localhost
    // This is required so you can open http://VM_IP:80 from your browser
    host: '0.0.0.0',

    // Proxy: any request from React starting with /api is automatically forwarded
    // to the backend on port 8081. React code never needs to hardcode the backend IP.
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
})

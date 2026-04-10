import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

import packageJson from './package.json'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    '__APP_VERSION__': JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    // HTTPS for LAN testing (required for Push API on non-localhost origins)
    https: (() => {
      const certDir = path.resolve(__dirname, './certs')
      const keyPath = path.join(certDir, 'dev-key.pem')
      const certPath = path.join(certDir, 'dev-cert.pem')

      if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
        return undefined
      }

      return {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      }
    })(),
    proxy: {
      // Avoid mixed-content when frontend is HTTPS:
      // proxy API + broadcasting auth through the same HTTPS origin.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/broadcasting': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy Reverb websocket through Vite (wss://<vite>/app -> ws://<reverb>:8080/app)
      '/app': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
      // Proxy para las imágenes y archivos del storage
      '/storage': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/images': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})


import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const srcDir = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': srcDir,
    },
  },
  server: {
    // Bind to 0.0.0.0 and accept proxied hostnames (cloud preview URLs are dynamic).
    host: true,
    allowedHosts: true,
    port: 5173,
  },
  preview: {
    host: true,
    allowedHosts: true,
    port: 4173,
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: false,
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        // Long-lived vendor code in its own chunks so app updates don't
        // invalidate them in the browser cache. Rolldown (Vite 8) expects a
        // function here rather than an object map.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@blinkdotnew/ui')) return 'vendor-ui'
          if (/node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'vendor-react'
          }
          if (/node_modules[\\/](react-hook-form|zod|@hookform)[\\/]/.test(id)) return 'vendor-forms'
          return undefined
        },
      },
    },
  },
})

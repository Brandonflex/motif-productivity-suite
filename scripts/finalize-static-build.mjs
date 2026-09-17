/**
 * Finalize the build for a static hosting setup.
 *
 * The project is a standard Vite React app, so `vite build` already emits the
 * correct static output to `dist/`. Some starter scaffolds include a stale
 * post-build script that expects `.vite-out/client`, which is not used here.
 *
 * This script supports both shapes:
 * - modern Vite builds: dist/index.html + dist/assets/... already exist
 * - older .vite-out client build layouts: copy the client bundle into dist
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const DEST = 'dist'
const LEGACY_SRC = '.vite-out/client'

if (existsSync(LEGACY_SRC)) {
  mkdirSync(DEST, { recursive: true })

  for (const entry of readdirSync(LEGACY_SRC)) {
    try {
      cpSync(join(LEGACY_SRC, entry), join(DEST, entry), { recursive: true, force: true })
    } catch (error) {
      const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : String(error)
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''

      if (entry === '_redirects') {
        console.warn(`[finalize] skip ${entry}: ${code || message} (pre-injected, identical content)`)
      } else {
        console.error(`[finalize] FAILED copying ${entry} into dist/: ${code || message} — aborting (a partial dist/ deploys broken)`)
        process.exit(1)
      }
    }
  }

  rmSync('.vite-out', { recursive: true, force: true })
}

if (!existsSync(join(DEST, 'index.html'))) {
  console.error('[finalize] dist/index.html missing after build — build is not publishable')
  process.exit(1)
}

console.log('[finalize] ✓ static build ready in dist/ (dist/index.html present)')

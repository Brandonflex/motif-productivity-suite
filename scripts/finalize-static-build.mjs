/**
 * Post-build finalizer.
 *
 * `vite build` already emits the static SPA into `dist/`. This script closes
 * the loop for static hosting:
 *   1. Fails loudly if the bundle is not actually publishable.
 *   2. Rewrites the `__SITE_URL__` placeholder in robots.txt / sitemap.xml with
 *      the canonical origin (VITE_SITE_URL, falling back to the demo deploy).
 *   3. Copies host-specific routing config into the output when present.
 */
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DEST = 'dist'
const LEGACY_SRC = '.vite-out/client'
const DEFAULT_SITE_URL = 'https://motif-productivity-suite.vercel.app'

function fail(message) {
  console.error(`[finalize] ✖ ${message}`)
  process.exit(1)
}

// ── 1. Legacy layouts: some scaffolds build into .vite-out/client ────────────
if (existsSync(LEGACY_SRC)) {
  const { cpSync, mkdirSync } = await import('node:fs')
  mkdirSync(DEST, { recursive: true })
  for (const entry of readdirSync(LEGACY_SRC)) {
    try {
      cpSync(join(LEGACY_SRC, entry), join(DEST, entry), { recursive: true, force: true })
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
      if (entry === '_redirects') {
        console.warn(`[finalize] skip ${entry}: ${code || 'copy failed'} (already provided by public/)`)
      } else {
        fail(`copying ${entry} into dist/ failed (${code || 'unknown error'}) — a partial dist/ deploys broken`)
      }
    }
  }
  rmSync('.vite-out', { recursive: true, force: true })
}

// ── 2. Verify the SPA shell and its assets exist ─────────────────────────────
const indexPath = join(DEST, 'index.html')
if (!existsSync(indexPath)) fail('dist/index.html is missing — nothing to deploy')

const indexHtml = readFileSync(indexPath, 'utf8')
if (!/src="\/assets\/[^"]+\.js"/.test(indexHtml)) {
  fail('dist/index.html does not reference a built JS bundle — build is incomplete')
}

const assetsDir = join(DEST, 'assets')
if (!existsSync(assetsDir) || !readdirSync(assetsDir).some((file) => file.endsWith('.css'))) {
  fail('dist/assets has no CSS output — check the Tailwind/PostCSS pipeline')
}

// ── 3. Canonical origin for robots.txt + sitemap.xml ─────────────────────────
const siteUrl = (process.env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '')
if (!/^https?:\/\//.test(siteUrl)) fail(`VITE_SITE_URL must be an absolute origin, got "${siteUrl}"`)

let rewritten = 0
for (const file of ['index.html', 'robots.txt', 'sitemap.xml']) {
  const filePath = join(DEST, file)
  if (!existsSync(filePath)) continue
  const contents = readFileSync(filePath, 'utf8')
  if (!contents.includes('__SITE_URL__')) continue
  writeFileSync(filePath, contents.replaceAll('__SITE_URL__', siteUrl))
  rewritten += 1
}

// ── 4. Report ────────────────────────────────────────────────────────────────
const bundleBytes = readdirSync(assetsDir)
  .filter((file) => file.endsWith('.js'))
  .reduce((total, file) => total + statSync(join(assetsDir, file)).size, 0)

console.log(
  `[finalize] ✓ static build ready in dist/ · ${(bundleBytes / 1024).toFixed(0)} kB JS · canonical origin ${siteUrl}` +
    (rewritten > 0 ? ` (rewrote ${rewritten} SEO file(s))` : ''),
)

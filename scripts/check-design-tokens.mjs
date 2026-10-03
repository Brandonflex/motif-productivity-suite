/**
 * Design-token guardrail.
 *
 * The app's colours live in two places that must never drift apart:
 *   1. `src/styles/tokens.css`  → the CSS variables (light + dark themes)
 *   2. `tailwind.config.js`     → the utilities mapped onto those variables
 *
 * `@blinkdotnew/ui` renders utilities such as `bg-background`, `ring-ring` or
 * `text-muted-foreground`; when a token is missing from either side those
 * utilities are silently dropped by Tailwind and the UI renders unstyled. This
 * script fails the build instead, and additionally asserts WCAG contrast for
 * the text/background pairs that carry real content.
 *
 * Run with `npm run check:tokens`.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TOKENS_FILE = path.join(root, 'src/styles/tokens.css')
const TAILWIND_FILE = path.join(root, 'tailwind.config.js')

const MIN_TEXT_CONTRAST = 4.5
const MIN_UI_CONTRAST = 3

/** Token names that are not colours and therefore have no contrast contract. */
const NON_COLOR_TOKENS = ['radius', 'font-sans', 'font-mono', 'duration-fast', 'duration-normal']

/** Text/content pairs that must stay readable in every theme. */
const CONTRAST_PAIRS = [
  ['foreground', 'background', MIN_TEXT_CONTRAST],
  ['foreground', 'card', MIN_TEXT_CONTRAST],
  ['foreground', 'popover', MIN_TEXT_CONTRAST],
  ['muted-foreground', 'background', MIN_TEXT_CONTRAST],
  ['muted-foreground', 'card', MIN_TEXT_CONTRAST],
  ['primary-foreground', 'primary', MIN_TEXT_CONTRAST],
  ['secondary-foreground', 'secondary', MIN_TEXT_CONTRAST],
  ['accent-foreground', 'accent', MIN_TEXT_CONTRAST],
  ['destructive-foreground', 'destructive', MIN_TEXT_CONTRAST],
  ['success-foreground', 'success', MIN_TEXT_CONTRAST],
  ['warning-foreground', 'warning', MIN_TEXT_CONTRAST],
  ['info-foreground', 'info', MIN_TEXT_CONTRAST],
  ['brand-foreground', 'brand', MIN_TEXT_CONTRAST],
  ['sidebar-foreground', 'sidebar', MIN_TEXT_CONTRAST],
  ['sidebar-accent-foreground', 'sidebar-accent', MIN_TEXT_CONTRAST],
  ['ring', 'background', MIN_UI_CONTRAST],
  ['primary', 'background', MIN_UI_CONTRAST],
  ['border', 'background', 1.15],
]

const errors = []
const warnings = []

/**
 * Splits CSS into `{ selector, body }` blocks without being confused by nested
 * at-rules (the dark theme is declared both inside a media query and on
 * `.dark`, and both copies must agree).
 */
function splitBlocks(source) {
  // Comments frequently mention selectors such as `.dark`; strip them first so
  // they can never be mistaken for a selector.
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '')
  const blocks = []
  let depth = 0
  let buffer = ''
  let selector = ''

  for (const char of css) {
    if (char === '{') {
      if (depth === 0) {
        selector = buffer.trim()
        buffer = ''
      } else {
        buffer += char
      }
      depth += 1
      continue
    }

    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        blocks.push({ selector, body: buffer })
        buffer = ''
      } else {
        buffer += char
      }
      continue
    }

    buffer += char
  }

  return blocks
}

function themeFor(selector) {
  if (selector.includes('.dark')) return 'dark'
  if (selector.includes('.light')) return null
  if (selector.includes(':root')) return null
  return null
}

/** Returns `{ light, dark, systemDark }` maps of token → value. */
function parseTokens(css) {
  const themes = { light: {}, dark: {}, systemDark: {} }

  for (const { selector, body } of splitBlocks(css)) {
    const declarations = {}
    for (const match of body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
      declarations[match[1].trim()] = match[2].trim()
    }

    if (selector.startsWith('@media')) {
      const isDarkQuery = /prefers-color-scheme\s*:\s*dark/.test(selector)
      for (const inner of splitBlocks(body)) {
        const innerIsDarkSelector = inner.selector.includes('.dark') || /:root\s*:not\(\s*\.light\s*\)/.test(inner.selector)
        if (!innerIsDarkSelector) continue

        const target = isDarkQuery ? themes.systemDark : themes.dark
        for (const match of inner.body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
          target[match[1].trim()] = match[2].trim()
        }
      }
      continue
    }

    const theme = themeFor(selector)
    if (theme) Object.assign(themes[theme], declarations)
    else if (selector.includes(':root')) Object.assign(themes.light, declarations)
  }

  return themes
}

function hslToRgb(value, tokenName, themeName) {
  const match = value.match(/^(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/)
  if (!match) {
    errors.push(`--${tokenName} in "${themeName}" must be a plain "H S% L%" triplet, got "${value}"`)
    return null
  }

  const [h, s, l] = [Number(match[1]), Number(match[2]) / 100, Number(match[3]) / 100]
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const sector = Math.floor((((h % 360) + 360) % 360) / 60)
  const table = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][sector % 6]

  return table.map((channel) => channel + m)
}

function relativeLuminance([r, g, b]) {
  const [rl, gl, bl] = [r, g, b].map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl
}

function contrast(a, b) {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (lighter + 0.05) / (darker + 0.05)
}

// ── Load inputs ───────────────────────────────────────────────────────────────
const tokensCss = readFileSync(TOKENS_FILE, 'utf8')
const { light, dark, systemDark } = parseTokens(tokensCss)
const tailwindSource = readFileSync(TAILWIND_FILE, 'utf8')
const mappedTokens = [...tailwindSource.matchAll(/token\('([a-z0-9-]+)'\)/g)].map((match) => match[1])
const mapped = new Set(mappedTokens)

if (mapped.size === 0) {
  errors.push('tailwind.config.js does not map any `token(...)` colours — did the config change shape?')
}
if (Object.keys(light).length === 0) errors.push('src/styles/tokens.css must define a :root (light) theme')
if (Object.keys(dark).length === 0) errors.push('src/styles/tokens.css must define a .dark theme')
if (Object.keys(systemDark).length === 0) {
  errors.push('src/styles/tokens.css must define dark tokens inside `@media (prefers-color-scheme: dark)`')
}

// ── 1. The two dark blocks must be identical ─────────────────────────────────
for (const name of new Set([...Object.keys(dark), ...Object.keys(systemDark)])) {
  if (dark[name] !== systemDark[name]) {
    errors.push(
      `dark token --${name} differs between the prefers-color-scheme block ("${systemDark[name] ?? 'missing'}") and .dark ("${dark[name] ?? 'missing'}")`,
    )
  }
}

// ── 2. Every Tailwind colour token exists in both themes ─────────────────────
for (const name of mapped) {
  for (const [themeName, tokens] of [
    ['light', light],
    ['dark', dark],
  ]) {
    const value = tokens[name]
    if (value === undefined) {
      errors.push(`tailwind.config.js maps "--${name}" but the ${themeName} theme does not define it`)
      continue
    }
    hslToRgb(value, name, themeName)
  }
}

// ── 3. Nothing is defined in CSS that Tailwind never exposes ──────────────────
for (const name of Object.keys(light)) {
  if (!mapped.has(name) && !NON_COLOR_TOKENS.includes(name)) {
    warnings.push(`--${name} is defined in tokens.css but not mapped in tailwind.config.js`)
  }
}

// ── 4. WCAG contrast ─────────────────────────────────────────────────────────
let contrastChecks = 0
for (const [themeName, tokens] of [
  ['light', light],
  ['dark', dark],
]) {
  for (const [fg, bg, minimum] of CONTRAST_PAIRS) {
    const fgValue = tokens[fg]
    const bgValue = tokens[bg]
    if (!fgValue || !bgValue) continue

    const fgRgb = hslToRgb(fgValue, fg, themeName)
    const bgRgb = hslToRgb(bgValue, bg, themeName)
    if (!fgRgb || !bgRgb) continue

    const ratio = contrast(fgRgb, bgRgb)
    contrastChecks += 1
    if (ratio < minimum) {
      errors.push(
        `${themeName}: contrast ${ratio.toFixed(2)}:1 between --${fg} and --${bg} is below the ${minimum}:1 minimum`,
      )
    }
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
for (const warning of warnings) console.warn(`[tokens] warn  ${warning}`)

if (errors.length > 0) {
  console.error('\n[tokens] ✖ design token check failed:')
  for (const error of errors) console.error(`  · ${error}`)
  console.error(`\n${errors.length} problem(s). Fix src/styles/tokens.css or tailwind.config.js.\n`)
  process.exit(1)
}

console.log(
  `[tokens] ✓ ${mapped.size} colour tokens defined for light + dark (system block in sync), ${contrastChecks} contrast checks passed`,
)

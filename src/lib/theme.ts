import { useSyncExternalStore } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'motif:theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

const listeners = new Set<() => void>()
let preference: ThemePreference = readStoredPreference()

function isPreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isPreference(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

function prefersDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(DARK_QUERY).matches
    : false
}

export function resolveTheme(value: ThemePreference = preference): ResolvedTheme {
  if (value === 'system') return prefersDark() ? 'dark' : 'light'
  return value
}

/**
 * Applies the resolved theme to <html>.
 *
 * Both classes are toggled explicitly: `.dark` wins over the
 * `prefers-color-scheme` fallback in tokens.css and `.light` opts out of it,
 * which is what makes "follow system" behave correctly on first paint.
 */
export function applyTheme(value: ThemePreference = preference): void {
  if (typeof document === 'undefined') return

  const resolved = resolveTheme(value)
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.classList.toggle('light', resolved === 'light')
  root.dataset.theme = resolved
  root.style.colorScheme = resolved
}

export function getThemePreference(): ThemePreference {
  return preference
}

export function setThemePreference(next: ThemePreference): void {
  preference = next

  try {
    if (next === 'system') window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* preference simply won't survive a reload */
  }

  applyTheme(next)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  const media =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null

  const onSystemChange = () => {
    if (preference === 'system') {
      applyTheme('system')
      listener()
    }
  }

  media?.addEventListener('change', onSystemChange)

  return () => {
    listeners.delete(listener)
    media?.removeEventListener('change', onSystemChange)
  }
}

/** React binding for the theme store. */
export function useTheme(): {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: typeof setThemePreference
} {
  const current = useSyncExternalStore(subscribe, getThemePreference, () => 'system' as ThemePreference)

  return {
    preference: current,
    resolved: resolveTheme(current),
    setPreference: setThemePreference,
  }
}

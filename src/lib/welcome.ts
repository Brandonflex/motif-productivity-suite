/**
 * The one-shot welcome.
 *
 * A first visit deserves a hello and a place to start; every visit after that
 * deserves to be left alone. One key in localStorage decides which, and the
 * Settings card can ask for the introduction back if it was dismissed too fast.
 */

const KEY = 'motif:welcomed'

export function hasSeenWelcome(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    // Storage unavailable (private mode, blocked cookies): the welcome is not
    // worth breaking over, so treat it as already seen.
    return true
  }
}

export function markWelcomeSeen(): void {
  try {
    window.localStorage.setItem(KEY, '1')
  } catch {
    /* nothing to do — the card simply reappears next visit */
  }
}

/** Brings the welcome back, for the "show me that again" button in Settings. */
export function resetWelcome(): void {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

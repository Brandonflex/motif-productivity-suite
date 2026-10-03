/**
 * Collision-resistant id generation.
 *
 * `Math.random().toString(36).slice(7)` (the previous approach) can produce
 * duplicates and even empty strings. Prefer the platform UUID generator and
 * fall back to `getRandomValues` when the page is not in a secure context.
 */
export function createId(prefix = ''): string {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : fallbackId()

  return prefix ? `${prefix}_${uuid}` : uuid
}

function fallbackId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  // Last resort — only reached in ancient/embedded environments.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

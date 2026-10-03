/**
 * Time-ordered, collision-resistant id generation.
 *
 * Ids are ULIDs (Crockford base32: 48-bit timestamp + 80 bits of randomness), so
 * they sort chronologically as plain strings — which is what lets a workspace be
 * merged across tabs or devices without a server to hand out order. The previous
 * `Math.random().toString(36).slice(7)` approach could collide *and* return an
 * empty string; both of those bugs are gone.
 *
 * Budgeted from the local-first guidance used for this rebuild: stable entity
 * ids, no coordinate generation, and a deterministic fallback path for
 * non-secure contexts.
 */

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const TIME_CHARS = 10
const RANDOM_CHARS = 16

let lastTime = -1
let lastRandom: number[] = []

function encodeTime(time: number): string {
  let remaining = time
  let output = ''
  for (let index = TIME_CHARS - 1; index >= 0; index -= 1) {
    output = ENCODING[remaining % 32]! + output
    remaining = Math.floor(remaining / 32)
  }
  return output
}

function randomChars(): number[] {
  const bytes = new Uint8Array(RANDOM_CHARS)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, (byte) => byte % 32)
}

/** Increments the random component so two ids in the same millisecond still sort. */
function incrementRandom(): number[] {
  const next = [...lastRandom]
  for (let index = next.length - 1; index >= 0; index -= 1) {
    if (next[index]! < 31) {
      next[index] += 1
      return next
    }
    next[index] = 0
  }
  return randomChars()
}

function ulid(now: number = Date.now()): string {
  if (now === lastTime) {
    lastRandom = incrementRandom()
  } else {
    lastTime = now
    lastRandom = randomChars()
  }
  return encodeTime(now) + lastRandom.map((value) => ENCODING[value]!).join('')
}

/** `createId('tsk')` → `tsk_01J8ZQ6V4M8WQ1V6H2K3N4P5R6`. */
export function createId(prefix = ''): string {
  const id = ulid().toLowerCase()
  return prefix ? `${prefix}_${id}` : id
}

/** Extracts the creation time from an id produced by `createId`, or `null`. */
export function idTimestamp(id: string): number | null {
  const raw = id.includes('_') ? id.slice(id.indexOf('_') + 1) : id
  if (raw.length < TIME_CHARS) return null

  let time = 0
  for (const char of raw.slice(0, TIME_CHARS)) {
    const value = ENCODING.indexOf(char.toUpperCase())
    if (value === -1) return null
    time = time * 32 + value
  }
  return time
}

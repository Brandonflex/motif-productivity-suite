import { differenceInCalendarDays, format, parseISO } from 'date-fns'

/**
 * Due-date helpers.
 *
 * Due dates are stored as `YYYY-MM-DD` (a calendar date, not an instant) and
 * every calculation is done in UTC so a task never "moves" for users behind or
 * ahead of UTC. This replaces the previous ad-hoc `new Date(...)` handling that
 * silently produced `Invalid Date` for legacy values.
 */

export type DueTone = 'none' | 'overdue' | 'today' | 'soon' | 'future' | 'done'

export interface DueInfo {
  /** Human label, e.g. `Today`, `Tomorrow`, `Mar 4`, `Overdue by 3 days`. */
  label: string
  tone: DueTone
  /** Whole calendar days until the due date (negative = overdue). */
  daysRemaining: number | null
}

export const NO_DUE_DATE_LABEL = 'No due date'

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  // `Date.parse` rolls invalid calendar days over (Feb 30 → Mar 2), so verify
  // the parsed value round-trips to exactly what was given.
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/** Today in UTC as `YYYY-MM-DD`. */
export function todayIso(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0, 10)
}

/** Normalises anything that looks like a date into `YYYY-MM-DD` (or `''`). */
export function normalizeDueDate(value: unknown, referenceYear?: number): string {
  if (typeof value !== 'string') return ''

  const trimmed = value.trim()
  if (!trimmed || trimmed === 'No Date' || trimmed === NO_DUE_DATE_LABEL) return ''
  if (isValidIsoDate(trimmed)) return trimmed

  const legacy = trimmed.match(/^([A-Za-z]{3,9})\s+(\d{1,2})$/)
  if (legacy) {
    const year = referenceYear ?? new Date().getUTCFullYear()
    const [, month, day] = legacy
    const parsed = new Date(`${month} ${day}, ${year} 00:00:00 UTC`)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  }

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10)
}

export function formatDueDate(value: string): string {
  if (!isValidIsoDate(value)) return NO_DUE_DATE_LABEL
  return `${format(parseISO(`${value}T00:00:00Z`), 'MMM d')}`
}

export function formatFullDate(value: string): string {
  if (!isValidIsoDate(value)) return NO_DUE_DATE_LABEL
  return format(parseISO(`${value}T00:00:00Z`), 'EEE, MMM d, yyyy')
}

/**
 * Describes a due date relative to today, including urgency, so the UI can
 * highlight overdue and due-today work consistently.
 */
export function describeDueDate(value: string, isDone = false, now: Date = new Date()): DueInfo {
  if (!isValidIsoDate(value)) {
    return { label: NO_DUE_DATE_LABEL, tone: 'none', daysRemaining: null }
  }

  const days = differenceInCalendarDays(parseISO(`${value}T00:00:00Z`), parseISO(`${todayIso(now)}T00:00:00Z`))

  if (isDone) {
    return { label: formatDueDate(value), tone: 'done', daysRemaining: days }
  }
  if (days < 0) {
    const overdue = Math.abs(days)
    return {
      label: overdue === 1 ? 'Overdue by 1 day' : `Overdue by ${overdue} days`,
      tone: 'overdue',
      daysRemaining: days,
    }
  }
  if (days === 0) return { label: 'Due today', tone: 'today', daysRemaining: 0 }
  if (days === 1) return { label: 'Due tomorrow', tone: 'soon', daysRemaining: 1 }
  if (days <= 7) return { label: `Due in ${days} days`, tone: 'soon', daysRemaining: days }

  return { label: formatDueDate(value), tone: 'future', daysRemaining: days }
}

/** Sort key: undated work sorts last, then earliest due date first. */
export function dueDateSortKey(value: string): string {
  return isValidIsoDate(value) ? value : '9999-12-31'
}

export function formatTimestamp(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'unknown'
  return format(parsed, 'MMM d, yyyy · HH:mm')
}

// ── Calendar arithmetic used by scheduling, planning and analytics ───────────

/** Parses `YYYY-MM-DD` as a UTC midnight date (never a local-time surprise). */
export function toUtcDate(value: string): Date {
  return new Date(`${isValidIsoDate(value) ? value : todayIso()}T00:00:00Z`)
}

/** `value + days`, as `YYYY-MM-DD`. */
export function addDaysIso(value: string, days: number): string {
  const date = toUtcDate(value)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return differenceInCalendarDays(toUtcDate(to), toUtcDate(from))
}

/** The inclusive list of days between two ISO dates (max 400 to stay safe). */
export function eachDayIso(from: string, to: string): string[] {
  const days: string[] = []
  let cursor = from
  while (cursor <= to && days.length < 400) {
    days.push(cursor)
    cursor = addDaysIso(cursor, 1)
  }
  return days
}

/** `HH:MM` → minutes since midnight (`'09:30'` → 570). */
export function clockToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return (hours || 0) * 60 + (minutes || 0)
}

/** minutes since midnight → `HH:MM`. */
export function minutesToClock(total: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(total)))
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}

/** `95` → `1h 35m`, `25` → `25m`. */
export function formatMinutes(total: number): string {
  const minutes = Math.max(0, Math.round(total))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

/** Monday-first week containing `value`. */
export function weekStartIso(value: string, weekStartsOn = 1): string {
  const date = toUtcDate(value)
  const weekday = date.getUTCDay()
  const delta = (weekday - weekStartsOn + 7) % 7
  return addDaysIso(value, -delta)
}

/**
 * Six weeks of days (42 entries) covering the month that contains `value`,
 * padded to whole weeks — the grid a month calendar needs.
 */
export function monthGridIso(value: string, weekStartsOn = 1): string[] {
  const date = toUtcDate(value)
  const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString().slice(0, 10)
  const start = weekStartIso(first, weekStartsOn)
  return Array.from({ length: 42 }, (_, index) => addDaysIso(start, index))
}

/** `2026-03` → `March 2026`. */
export function formatMonthLabel(value: string): string {
  const date = toUtcDate(`${value.slice(0, 7)}-01`)
  return format(date, 'MMMM yyyy')
}

import { addDaysIso, todayIso } from '@/lib/dates'
import type { Recurrence, Task } from '@/types/workspace'

/**
 * Recurrence engine (borrowed from Todoist).
 *
 * Dates are calendar dates in UTC, so "every week" always lands on the same
 * weekday no matter where the user is. Completing a repeating task rolls the
 * same row forward instead of creating a copy — that keeps the workspace free of
 * the duplicate clutter that plagues most recurring-task setups.
 */

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

export function describeRecurrence(recurrence: Recurrence | null): string {
  if (!recurrence) return 'Does not repeat'
  const { every, unit } = recurrence
  if (every === 1) return unit === 'day' ? 'Every day' : unit === 'week' ? 'Every week' : 'Every month'
  return `Every ${every} ${unit}s`
}

/** ISO date `n` intervals after `from`. */
export function nextOccurrence(recurrence: Recurrence, from: string): string {
  const base = from || todayIso()
  const { every, unit } = recurrence
  if (unit === 'day') return addDaysIso(base, every)
  if (unit === 'week') return addDaysIso(base, every * 7)

  // Months are calendar-aware: Jan 31 → Feb 28 rather than Mar 3.
  const [year, month, day] = base.split('-').map(Number) as [number, number, number]
  const target = new Date(Date.UTC(year, month - 1 + every, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return target.toISOString().slice(0, 10)
}

/** Weekday name (`monday`…) for "every monday"-style rules, or `null`. */
export function weekdayFromName(name: string): number | null {
  const index = WEEKDAYS.indexOf(name.trim().toLowerCase() as (typeof WEEKDAYS)[number])
  return index === -1 ? null : index
}

/** The next date on or after `from` that falls on `weekday` (0 = Sunday). */
export function nextWeekday(from: string, weekday: number): string {
  const date = new Date(`${from || todayIso()}T00:00:00Z`)
  const delta = (weekday - date.getUTCDay() + 7) % 7
  return addDaysIso(from || todayIso(), delta === 0 ? 7 : delta)
}

export interface CompletionRoll {
  /** Fields to apply when a repeating task is ticked off. */
  patch: Partial<Task>
  /** True when the task moved to its next occurrence instead of completing. */
  rolled: boolean
  nextDueDate: string | null
}

/**
 * What should happen when a task is marked complete.
 *
 * Non-repeating tasks get `Completed` + `completedAt`. Repeating tasks advance
 * their due date past today and return to `Pending`, which is what users expect
 * from a routine that is never really "done".
 */
export function rollForward(task: Task, now: Date = new Date()): CompletionRoll {
  if (!task.recurrence) {
    return { patch: { status: 'Completed', completedAt: now.toISOString() }, rolled: false, nextDueDate: null }
  }

  const today = todayIso(now)
  let next = nextOccurrence(task.recurrence, task.dueDate || today)
  // Never schedule the next occurrence in the past (e.g. an overdue weekly task).
  let guard = 0
  while (next <= today && guard < 400) {
    next = nextOccurrence(task.recurrence, next)
    guard += 1
  }

  return {
    patch: { status: 'Pending', dueDate: next, completedAt: '' },
    rolled: true,
    nextDueDate: next,
  }
}

/** Short cadence label for pills, e.g. `↻ 2w`. */
export function recurrenceBadge(recurrence: Recurrence | null): string | null {
  if (!recurrence) return null
  const symbol = recurrence.unit === 'day' ? 'd' : recurrence.unit === 'week' ? 'w' : 'mo'
  return `↻ ${recurrence.every}${symbol}`
}

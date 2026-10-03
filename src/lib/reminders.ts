import { clockToMinutes, daysBetween, todayIso } from '@/lib/dates'
import type { Task, WorkspaceSettings } from '@/types/workspace'

/**
 * Reminders, computed rather than scheduled.
 *
 * A task with a pinned time (`dueTime`) knows exactly when it needs attention,
 * so a reminder is derived from the task itself instead of being a second,
 * separately-stored object that can drift out of sync. Two consequences worth
 * knowing: the same rule feeds the in-app toast and the desktop notification,
 * and there is no queue to clean up when a task is completed or deleted.
 *
 * `checkIn` is the other half of the idea: one nudge a day, at a time the user
 * chose, whose only job is to bring them back to the plan.
 */

export const REMINDER_GRACE_MINUTES = 30

export interface Reminder {
  taskId: string
  title: string
  /** Local date the task is pinned to, `YYYY-MM-DD`. */
  date: string
  /** Local time, `HH:MM`. */
  dueTime: string
  /** Whole minutes until the pinned time; negative once it has passed. */
  minutesUntil: number
  /** Cheap identity for "already announced" bookkeeping. */
  key: string
}

/** Stable key for one task's reminder on one date at one time. */
export function reminderKey(task: Pick<Task, 'id' | 'dueDate' | 'dueTime'>): string {
  return `${task.id}:${task.dueDate}:${task.dueTime}`
}

/**
 * Minutes since midnight, in *local* wall-clock time.
 *
 * The date side of a reminder uses `todayIso` — the same UTC-normalised helper
 * the rest of the app compares `dueDate` against — while the clock side is
 * local, because "2pm" means two in the afternoon where the user is sitting,
 * not at UTC. Mixing the two only matters in the few hours around local
 * midnight, where the failure mode is a reminder that waits for the next
 * check-in rather than one that fires at the wrong time.
 */
function minutesOfDay(now: Date): number {
  return now.getHours() * 60 + now.getMinutes()
}

/**
 * Open tasks pinned to a time on `now`'s date, inside the reminder window.
 *
 * Fires from `leadMinutes` before the time until `REMINDER_GRACE_MINUTES`
 * after it, so a reminder that arrives while the tab was closed is still
 * useful when it opens. Completed work never reminds.
 */
export function dueSoon(tasks: Task[], settings: WorkspaceSettings, now: Date = new Date()): Reminder[] {
  const date = todayIso(now)
  const nowMinutes = minutesOfDay(now)

  return tasks
    .filter((task) => task.status !== 'Completed' && task.dueDate === date && Boolean(task.dueTime))
    .map((task) => {
      const minutesUntil = clockToMinutes(task.dueTime) - nowMinutes
      return {
        taskId: task.id,
        title: task.title,
        date,
        dueTime: task.dueTime,
        minutesUntil,
        key: reminderKey(task),
      }
    })
    .filter((reminder) => reminder.minutesUntil <= settings.reminderLeadMinutes)
    .filter((reminder) => reminder.minutesUntil >= -REMINDER_GRACE_MINUTES)
    .sort((a, b) => a.minutesUntil - b.minutesUntil)
}

export interface CheckIn {
  /** `YYYY-MM-DD` the nudge belongs to. */
  date: string
  /** Whether the day's plan is already committed, which silences the nudge. */
  planned: boolean
}

/**
 * The daily check-in, if it is due: enabled, past its time, not yet announced
 * today, and the day has not already been planned.
 */
export function checkIn(
  settings: WorkspaceSettings,
  now: Date = new Date(),
  lastSent: string | null = null,
  plannedAt: string | null = null,
): CheckIn | null {
  if (!settings.dailyCheckIn) return null

  const date = todayIso(now)
  if (lastSent === date) return null
  if (minutesOfDay(now) < clockToMinutes(settings.checkInTime)) return null

  const planned = Boolean(plannedAt && daysBetween(plannedAt.slice(0, 10), date) === 0)
  return { date, planned }
}

/** How a reminder reads, in one line, wherever it is announced. */
export function describeReminder(reminder: Reminder): string {
  if (reminder.minutesUntil >= 0) return `${reminder.dueTime} · in ${reminder.minutesUntil} min`
  return `${reminder.dueTime} · ${Math.abs(reminder.minutesUntil)} min ago`
}

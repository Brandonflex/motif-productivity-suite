import { addDaysIso, daysBetween, eachDayIso, todayIso, toUtcDate } from '@/lib/dates'
import { describeDueDate } from '@/lib/dates'
import type { FocusSession, Project, Task, WorkspaceSettings } from '@/types/workspace'

/**
 * Derived metrics for the dashboard, insights view and the daily rituals.
 *
 * Everything here is a pure function of the stored data, so the numbers in the
 * UI can never disagree with each other and the whole layer is trivially
 * testable without a DOM.
 */

export interface DayBucket {
  date: string
  /** Tasks completed that day (from `completedAt`). */
  completed: number
  focusMinutes: number
  /** Minutes the user committed to during the morning plan. */
  plannedMinutes: number
}

/** Per-day activity for the last `days` days, oldest first. */
export function dailyActivity(
  tasks: Task[],
  sessions: FocusSession[],
  days = 28,
  now: Date = new Date(),
): DayBucket[] {
  const today = todayIso(now)
  const start = addDaysIso(today, -(days - 1))
  const buckets = new Map<string, DayBucket>(
    eachDayIso(start, today).map((date) => [date, { date, completed: 0, focusMinutes: 0, plannedMinutes: 0 }]),
  )

  for (const task of tasks) {
    if (!task.completedAt) continue
    const date = task.completedAt.slice(0, 10)
    const bucket = buckets.get(date)
    if (bucket) bucket.completed += 1
  }

  for (const session of sessions) {
    if (session.kind !== 'focus') continue
    const bucket = buckets.get(session.date)
    if (bucket) bucket.focusMinutes += session.minutes
  }

  return [...buckets.values()]
}

/**
 * Consecutive days ending today (or yesterday) with at least one completion or
 * focus session. Borrowed from the "keep the chain alive" idea behind habit
 * streaks — looking at today too, so a brand-new day does not read as a break.
 */
export function currentStreak(buckets: DayBucket[]): number {
  let streak = 0
  for (let index = buckets.length - 1; index >= 0; index -= 1) {
    const bucket = buckets[index]!
    const active = bucket.completed > 0 || bucket.focusMinutes > 0
    if (active) {
      streak += 1
      continue
    }
    // An empty *today* does not break the chain yet.
    if (index === buckets.length - 1) continue
    break
  }
  return streak
}

export interface Momentum {
  score: number
  level: string
  points: number
  breakdown: { label: string; points: number }[]
}

/**
 * Momentum score — the useful half of gamification (Todoist Karma): a single
 * number that rewards finished work and focused time, and mildly penalises
 * overdue debt. It is deliberately generous: the point is to see movement, not
 * to feel policed.
 */
export function momentum(tasks: Task[], sessions: FocusSession[], now: Date = new Date()): Momentum {
  const today = todayIso(now)
  const completed = tasks.filter((task) => task.status === 'Completed')
  const recent = completed.filter((task) => task.completedAt && daysBetween(task.completedAt.slice(0, 10), today) <= 6)
  const focusMinutes = sessions.filter((session) => session.kind === 'focus').reduce((total, session) => total + session.minutes, 0)
  const overdue = tasks.filter(
    (task) => task.status !== 'Completed' && describeDueDate(task.dueDate, false, now).tone === 'overdue',
  ).length
  const onTime = completed.filter((task) => task.dueDate && task.completedAt && task.completedAt.slice(0, 10) <= task.dueDate).length

  const breakdown = [
    { label: `${completed.length} completed`, points: completed.length * 5 },
    { label: `${recent.length} finished this week`, points: recent.length * 10 },
    { label: `${Math.round(focusMinutes / 60)}h focused`, points: Math.round(focusMinutes / 6) },
    { label: `${onTime} finished on time`, points: onTime * 8 },
    { label: `${overdue} overdue`, points: -overdue * 6 },
  ]

  const points = breakdown.reduce((total, entry) => total + entry.points, 0)
  const score = Math.max(0, points)
  const level = score >= 900 ? 'Composed' : score >= 500 ? 'In flow' : score >= 250 ? 'Building' : score >= 80 ? 'Warming up' : 'Starting out'

  return { score, level, points, breakdown }
}

export interface Workload {
  /** Estimated minutes of open work due in the next seven days. */
  committedMinutes: number
  capacityMinutes: number
  ratio: number
  over: boolean
  /** Open tasks in the window with no estimate (assumed 30 minutes each). */
  unestimated: number
}

export const DEFAULT_ESTIMATE_MINUTES = 30

/**
 * Capacity check (Asana workload + ClickUp time estimates): how much of the
 * next week is already promised, versus a realistic number of working minutes.
 */
export function workload(tasks: Task[], settings: WorkspaceSettings, now: Date = new Date()): Workload {
  const today = todayIso(now)
  const horizon = addDaysIso(today, 7)
  let committed = 0
  let unestimated = 0

  for (const task of tasks) {
    if (task.status === 'Completed') continue
    const due = task.dueDate
    const inWindow = !due || (due <= horizon && due >= addDaysIso(today, -365))
    if (!inWindow) continue

    if (task.estimateMinutes > 0) committed += task.estimateMinutes
    else {
      committed += DEFAULT_ESTIMATE_MINUTES
      unestimated += 1
    }
  }

  const capacityMinutes = settings.capacityMinutesPerDay * 5
  return {
    committedMinutes: committed,
    capacityMinutes,
    ratio: capacityMinutes === 0 ? 0 : committed / capacityMinutes,
    over: capacityMinutes > 0 && committed > capacityMinutes,
    unestimated,
  }
}

export interface ProjectRollup {
  project: Project
  total: number
  done: number
  /** Notion-style rollup: completion percentage derived from its tasks. */
  percent: number
  openMinutes: number
  overdue: number
}

export function projectRollups(projects: Project[], tasks: Task[], now: Date = new Date()): ProjectRollup[] {
  return projects.map((project) => {
    const own = tasks.filter((task) => task.project === project.name)
    const done = own.filter((task) => task.status === 'Completed').length
    const openMinutes = own
      .filter((task) => task.status !== 'Completed')
      .reduce((total, task) => total + (task.estimateMinutes || DEFAULT_ESTIMATE_MINUTES), 0)
    const overdue = own.filter(
      (task) => task.status !== 'Completed' && describeDueDate(task.dueDate, false, now).tone === 'overdue',
    ).length

    return {
      project,
      total: own.length,
      done,
      percent: own.length === 0 ? project.progress : Math.round((done / own.length) * 100),
      openMinutes,
      overdue,
    }
  })
}

/** Minutes logged per task id, biggest first. */
export function focusByTask(sessions: FocusSession[]): { taskId: string; minutes: number }[] {
  const totals = new Map<string, number>()
  for (const session of sessions) {
    if (session.kind !== 'focus' || !session.taskId) continue
    totals.set(session.taskId, (totals.get(session.taskId) ?? 0) + session.minutes)
  }
  return [...totals.entries()]
    .map(([taskId, minutes]) => ({ taskId, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
}

/** Groups day buckets into calendar weeks (Monday first) for a heatmap. */
export function heatmapWeeks(buckets: DayBucket[]): DayBucket[][] {
  if (buckets.length === 0) return []

  const padded: (DayBucket | null)[] = [...buckets]
  const first = padded[0]!
  const leading = (toUtcDate(first.date).getUTCDay() + 6) % 7
  for (let index = 0; index < leading; index += 1) padded.unshift(null)

  const last = padded[padded.length - 1]!
  const trailing = (7 - ((toUtcDate(last!.date).getUTCDay() + 6) % 7) - 1) % 7
  for (let index = 0; index < trailing; index += 1) padded.push(null)

  const weeks: DayBucket[][] = []
  for (let index = 0; index < padded.length; index += 7) {
    weeks.push(
      padded.slice(index, index + 7).map(
        (bucket) =>
          // Padding cells carry no date, so they can never collide with a real day.
          bucket ?? { date: '', completed: 0, focusMinutes: 0, plannedMinutes: 0 },
      ),
    )
  }
  return weeks
}

export interface WeeklyReview {
  completed: number
  created: number
  focusMinutes: number
  focusDays: number
  bestDay: DayBucket | null
  overdue: number
  plannedMinutes: number
}

/** Last seven days, summarised for the weekly review card. */
export function weeklyReview(tasks: Task[], sessions: FocusSession[], now: Date = new Date()): WeeklyReview {
  const buckets = dailyActivity(tasks, sessions, 7, now)
  const from = buckets[0]?.date ?? todayIso(now)

  const completed = buckets.reduce((total, bucket) => total + bucket.completed, 0)
  const created = tasks.filter((task) => task.createdAt.slice(0, 10) >= from).length
  const focusMinutes = buckets.reduce((total, bucket) => total + bucket.focusMinutes, 0)
  const overdue = tasks.filter(
    (task) => task.status !== 'Completed' && describeDueDate(task.dueDate, false, now).tone === 'overdue',
  ).length

  return {
    completed,
    created,
    focusMinutes,
    focusDays: buckets.filter((bucket) => bucket.focusMinutes > 0).length,
    bestDay: buckets.reduce<DayBucket | null>(
      (best, bucket) => (bucket.completed > (best?.completed ?? -1) ? bucket : best),
      null,
    ),
    overdue,
    plannedMinutes: buckets.reduce((total, bucket) => total + bucket.plannedMinutes, 0),
  }
}

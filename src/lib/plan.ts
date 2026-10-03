import { clockToMinutes, daysBetween, todayIso } from '@/lib/dates'
import { DEFAULT_ESTIMATE_MINUTES } from '@/lib/analytics'
import type { Task, WorkspaceSettings } from '@/types/workspace'

/**
 * Deterministic day planning (the useful core of Motion / Reclaim / Sunsama).
 *
 * Given the open work, the user's working window and their capacity, this
 * produces a time-boxed plan: the highest-value task first, each block sized by
 * its estimate, pinned tasks at their exact time. When the day is overbooked it
 * says so and defers the tail — the "you are being unrealistic" warning from
 * Sunsama, without the black box of an AI scheduler.
 */

export interface PlanBlock {
  task: Task
  /** Minutes since midnight. */
  startMinute: number
  minutes: number
  /** True when the user pinned this task to a specific time. */
  pinned: boolean
}

export interface DayPlan {
  blocks: PlanBlock[]
  /** Open work that did not fit. */
  deferred: Task[]
  committedMinutes: number
  capacityMinutes: number
  over: boolean
  windowStart: number
  windowEnd: number
}

/** Tasks waiting on another task that is not finished yet. */
export function blockersOf(task: Task, byId: Map<string, Task>): Task[] {
  return task.blockedBy
    .map((id) => byId.get(id))
    .filter((candidate): candidate is Task => candidate !== undefined && candidate.status !== 'Completed')
}

export function isBlocked(task: Task, byId: Map<string, Task>): boolean {
  return blockersOf(task, byId).length > 0
}

/** Tasks that can be picked up today: open, unblocked, not deferred by start date. */
export function availableTasks(tasks: Task[], now: Date = new Date()): Task[] {
  const today = todayIso(now)
  const byId = new Map(tasks.map((task) => [task.id, task]))
  return tasks.filter((task) => {
    if (task.status === 'Completed') return false
    if (task.startDate && task.startDate > today) return false
    return !isBlocked(task, byId)
  })
}

/**
 * Priority score — lower sorts first.
 *
 * Overdue beats everything, then explicit priority, then deadlines inside a
 * fortnight, then pinned times, then estimate size (small wins early).
 */
export function scoreTask(task: Task, now: Date = new Date()): number {
  const today = todayIso(now)
  let score = 0

  if (task.dueDate) {
    const distance = daysBetween(today, task.dueDate)
    if (distance < 0) score -= 1000 + Math.min(200, Math.abs(distance) * 5)
    else score -= Math.max(0, 100 - distance * 5)
  }

  if (task.status === 'In Progress') score -= 40
  if (task.priority === 'High') score -= 60
  else if (task.priority === 'Medium') score -= 25
  if (task.dueTime) score -= 15
  if (task.energy === 'Deep') score -= 5
  score += (task.estimateMinutes || DEFAULT_ESTIMATE_MINUTES) / 20

  return score
}

export function sortForToday(tasks: Task[], now: Date = new Date()): Task[] {
  return [...tasks].sort((a, b) => {
    const delta = scoreTask(a, now) - scoreTask(b, now)
    return delta !== 0 ? delta : a.title.localeCompare(b.title)
  })
}

/** Splits pinned tasks (exact time) from flexible ones. */
function partition(tasks: Task[]): { pinned: Task[]; flexible: Task[] } {
  const pinned: Task[] = []
  const flexible: Task[] = []
  for (const task of tasks) (task.dueTime ? pinned : flexible).push(task)
  return { pinned, flexible }
}

export function planDay(tasks: Task[], settings: WorkspaceSettings, now: Date = new Date()): DayPlan {
  const windowStart = clockToMinutes(settings.workdayStart)
  const windowEnd = Math.max(windowStart + 60, clockToMinutes(settings.workdayEnd))
  const capacityMinutes = Math.min(settings.capacityMinutesPerDay, windowEnd - windowStart)

  const candidates = sortForToday(availableTasks(tasks, now), now)
  const { pinned, flexible } = partition(candidates)

  const blocks: PlanBlock[] = []
  const placed = new Set<string>()

  // 1. Pinned work lands at its stated time, whatever else is going on.
  for (const task of pinned.sort((a, b) => (a.dueTime || '').localeCompare(b.dueTime || ''))) {
    const start = Math.max(windowStart, clockToMinutes(task.dueTime))
    blocks.push({ task, startMinute: start, minutes: task.estimateMinutes || DEFAULT_ESTIMATE_MINUTES, pinned: true })
    placed.add(task.id)
  }

  // 2. Flexible work fills the gaps in priority order.
  let cursor = windowStart
  const deferred: Task[] = []

  for (const task of flexible) {
    const minutes = task.estimateMinutes || DEFAULT_ESTIMATE_MINUTES
    const start = nextFreeSlot(cursor, minutes, blocks, windowEnd)
    if (start === null) {
      deferred.push(task)
      continue
    }
    blocks.push({ task, startMinute: start, minutes, pinned: false })
    placed.add(task.id)
    cursor = start + minutes
  }

  const committedMinutes = blocks.reduce((total, block) => total + block.minutes, 0)

  return {
    blocks: blocks.sort((a, b) => a.startMinute - b.startMinute),
    deferred: [...deferred, ...candidates.filter((task) => !placed.has(task.id))].filter(
      (task, index, list) => list.findIndex((candidate) => candidate.id === task.id) === index,
    ),
    committedMinutes,
    capacityMinutes,
    over: committedMinutes > capacityMinutes,
    windowStart,
    windowEnd,
  }
}

/** First slot that does not overlap an existing block and fits before `windowEnd`. */
function nextFreeSlot(from: number, minutes: number, blocks: PlanBlock[], windowEnd: number): number | null {
  let start = from
  let guard = 0

  while (guard < 100) {
    guard += 1
    const collision = blocks.find((block) => start < block.startMinute + block.minutes && start + minutes > block.startMinute)
    if (!collision) return start + minutes <= windowEnd ? start : null
    start = collision.startMinute + collision.minutes
    if (start + minutes > windowEnd) return null
  }
  return null
}

import { addDaysIso, describeDueDate, todayIso } from '@/lib/dates'
import type { Task, TaskPriority, TaskStatus } from '@/types/workspace'

/**
 * Shared task filters.
 *
 * The tasks page, the board, the matrix and saved views all narrow the same
 * list, so the rules live here once. A saved view stores exactly these inputs,
 * which is why "High priority this week" means the same thing every time it is
 * opened (Notion's saved views, minus the database).
 */

export type DueFilter = 'all' | 'overdue' | 'today' | 'week' | 'none'

export interface TaskFilter {
  status: 'all' | TaskStatus
  priority: 'all' | TaskPriority
  project: string
  tag: string
  due: DueFilter
  search: string
}

export const EMPTY_FILTER: TaskFilter = {
  status: 'all',
  priority: 'all',
  project: 'all',
  tag: 'all',
  due: 'all',
  search: '',
}

export const DUE_FILTER_LABELS: Record<DueFilter, string> = {
  all: 'Any date',
  overdue: 'Overdue',
  today: 'Due today',
  week: 'Next 7 days',
  none: 'No date',
}

export function matchesDueFilter(task: Task, due: DueFilter, now: Date = new Date()): boolean {
  if (due === 'all') return true
  if (due === 'none') return !task.dueDate

  if (!task.dueDate) return false
  const today = todayIso(now)
  if (due === 'overdue') return task.dueDate < today && task.status !== 'Completed'
  if (due === 'today') return task.dueDate === today
  return task.dueDate >= today && task.dueDate <= addDaysIso(today, 7)
}

export function matchesTask(task: Task, filter: TaskFilter, now: Date = new Date()): boolean {
  if (filter.status !== 'all' && task.status !== filter.status) return false
  if (filter.priority !== 'all' && task.priority !== filter.priority) return false
  if (filter.project !== 'all' && task.project !== filter.project) return false
  if (filter.tag !== 'all' && !task.tags.includes(filter.tag)) return false
  if (!matchesDueFilter(task, filter.due, now)) return false

  const needle = filter.search.trim().toLowerCase()
  if (!needle) return true

  return (
    task.title.toLowerCase().includes(needle) ||
    task.project.toLowerCase().includes(needle) ||
    task.note.toLowerCase().includes(needle) ||
    task.tags.some((tag) => tag.toLowerCase().includes(needle))
  )
}

export function applyTaskFilter(tasks: Task[], filter: TaskFilter, now: Date = new Date()): Task[] {
  return tasks.filter((task) => matchesTask(task, filter, now))
}

/** Human summary of a due filter, used in badges and toasts. */
export function describeDueFilter(task: Task, now: Date = new Date()): string {
  return describeDueDate(task.dueDate, task.status === 'Completed', now).label
}

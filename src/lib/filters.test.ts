import { describe, expect, it } from 'vitest'
import {
  DUE_FILTER_LABELS,
  EMPTY_FILTER,
  applyTaskFilter,
  describeDueFilter,
  matchesDueFilter,
  matchesTask,
  type TaskFilter,
} from '@/lib/filters'
import { addDaysIso, todayIso } from '@/lib/dates'
import type { Task } from '@/types/workspace'

/**
 * The filter rules are shared by the tasks page, the board, the matrix and
 * saved views, so they are worth testing once, precisely. Everything is
 * relative to a fixed `now`, because "this week" is meaningless otherwise.
 */

const NOW = new Date('2026-03-05T12:00:00.000Z')
const TODAY = todayIso(NOW)

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'tsk_1',
    title: 'Ship the landing page',
    project: 'Studio',
    priority: 'Medium',
    status: 'Pending',
    dueDate: TODAY,
    dueTime: '',
    startDate: '',
    note: '',
    tags: [],
    energy: 'Light',
    estimateMinutes: 30,
    recurrence: null,
    blockedBy: [],
    completedAt: '',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    rev: 1,
    ...overrides,
  }
}

const filter = (overrides: Partial<TaskFilter> = {}): TaskFilter => ({ ...EMPTY_FILTER, ...overrides })

describe('matchesDueFilter', () => {
  it('treats "any date" as no opinion at all', () => {
    expect(matchesDueFilter(task({ dueDate: '' }), 'all', NOW)).toBe(true)
    expect(matchesDueFilter(task(), 'all', NOW)).toBe(true)
  })

  it('finds overdue work but never calls finished work overdue', () => {
    const late = task({ dueDate: addDaysIso(TODAY, -3) })
    expect(matchesDueFilter(late, 'overdue', NOW)).toBe(true)
    expect(matchesDueFilter({ ...late, status: 'Completed' }, 'overdue', NOW)).toBe(false)
    expect(matchesDueFilter(task(), 'overdue', NOW)).toBe(false)
  })

  it('matches today exactly', () => {
    expect(matchesDueFilter(task(), 'today', NOW)).toBe(true)
    expect(matchesDueFilter(task({ dueDate: addDaysIso(TODAY, 1) }), 'today', NOW)).toBe(false)
  })

  it('keeps "next 7 days" inclusive at both ends and excludes the past', () => {
    expect(matchesDueFilter(task({ dueDate: addDaysIso(TODAY, 7) }), 'week', NOW)).toBe(true)
    expect(matchesDueFilter(task({ dueDate: addDaysIso(TODAY, 8) }), 'week', NOW)).toBe(false)
    expect(matchesDueFilter(task({ dueDate: addDaysIso(TODAY, -1) }), 'week', NOW)).toBe(false)
  })

  it('finds the tasks that have not been given a date yet', () => {
    expect(matchesDueFilter(task({ dueDate: '' }), 'none', NOW)).toBe(true)
    expect(matchesDueFilter(task(), 'none', NOW)).toBe(false)
  })

  it('never matches a dated filter against an undated task', () => {
    for (const due of ['overdue', 'today', 'week'] as const) {
      expect(matchesDueFilter(task({ dueDate: '' }), due, NOW)).toBe(false)
    }
  })

  it('labels every filter for the UI', () => {
    expect(Object.keys(DUE_FILTER_LABELS)).toEqual(['all', 'overdue', 'today', 'week', 'none'])
  })
})

describe('matchesTask', () => {
  it('passes everything through the empty filter', () => {
    expect(matchesTask(task(), EMPTY_FILTER, NOW)).toBe(true)
  })

  it('narrows by status, priority, project and tag', () => {
    const tagged = task({ status: 'In Progress', priority: 'High', project: 'Clients', tags: ['finance'] })

    expect(matchesTask(tagged, filter({ status: 'In Progress' }), NOW)).toBe(true)
    expect(matchesTask(tagged, filter({ status: 'Pending' }), NOW)).toBe(false)
    expect(matchesTask(tagged, filter({ priority: 'High' }), NOW)).toBe(true)
    expect(matchesTask(tagged, filter({ priority: 'Low' }), NOW)).toBe(false)
    expect(matchesTask(tagged, filter({ project: 'Clients' }), NOW)).toBe(true)
    expect(matchesTask(tagged, filter({ project: 'Studio' }), NOW)).toBe(false)
    expect(matchesTask(tagged, filter({ tag: 'finance' }), NOW)).toBe(true)
    expect(matchesTask(tagged, filter({ tag: 'design' }), NOW)).toBe(false)
  })

  it('requires every condition at once, not any of them', () => {
    const candidate = task({ priority: 'High', project: 'Studio' })
    expect(matchesTask(candidate, filter({ priority: 'High', project: 'Studio' }), NOW)).toBe(true)
    expect(matchesTask(candidate, filter({ priority: 'High', project: 'Clients' }), NOW)).toBe(false)
  })

  it('searches title, project, note and tags without case sensitivity', () => {
    const searchable = task({
      title: 'Draft the proposal',
      project: 'Studio site',
      note: 'Ask about the retainer',
      tags: ['client'],
    })

    expect(matchesTask(searchable, filter({ search: 'PROPOSAL' }), NOW)).toBe(true)
    expect(matchesTask(searchable, filter({ search: 'studio' }), NOW)).toBe(true)
    expect(matchesTask(searchable, filter({ search: 'retainer' }), NOW)).toBe(true)
    expect(matchesTask(searchable, filter({ search: 'CLIENT' }), NOW)).toBe(true)
    expect(matchesTask(searchable, filter({ search: 'invoice' }), NOW)).toBe(false)
  })

  it('ignores surrounding whitespace in the search term', () => {
    expect(matchesTask(task(), filter({ search: '   ' }), NOW)).toBe(true)
    expect(matchesTask(task(), filter({ search: '  landing  ' }), NOW)).toBe(true)
  })
})

describe('applyTaskFilter', () => {
  it('keeps order while narrowing', () => {
    const tasks = [
      task({ id: 'a', title: 'First', priority: 'High' }),
      task({ id: 'b', title: 'Second', priority: 'Low' }),
      task({ id: 'c', title: 'Third', priority: 'High' }),
    ]

    expect(applyTaskFilter(tasks, filter({ priority: 'High' }), NOW).map((item) => item.id)).toEqual(['a', 'c'])
    expect(applyTaskFilter(tasks, EMPTY_FILTER, NOW)).toHaveLength(3)
    expect(applyTaskFilter(tasks, filter({ search: 'nothing like this' }), NOW)).toEqual([])
  })
})

describe('describeDueFilter', () => {
  it('describes the task the way a person would', () => {
    expect(describeDueFilter(task(), NOW)).toBe('Due today')
    expect(describeDueFilter(task({ dueDate: addDaysIso(TODAY, -1) }), NOW)).toMatch(/overdue/i)
    expect(describeDueFilter(task({ dueDate: "", status: "Completed" }), NOW)).toMatch(/no due date/i)
  })
})

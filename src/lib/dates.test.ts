import { describe, expect, it } from 'vitest'
import {
  describeDueDate,
  dueDateSortKey,
  formatDueDate,
  formatFullDate,
  isValidIsoDate,
  normalizeDueDate,
  todayIso,
} from '@/lib/dates'

const now = new Date('2026-06-15T09:30:00.000Z')

describe('isValidIsoDate', () => {
  it.each([
    ['2026-06-15', true],
    ['2026-6-1', false],
    ['not-a-date', false],
    ['', false],
    ['2026-02-30', false],
  ])('%s → %s', (value, expected) => {
    expect(isValidIsoDate(value)).toBe(expected)
  })
})

describe('normalizeDueDate', () => {
  it('passes through ISO dates', () => {
    expect(normalizeDueDate('2026-06-15')).toBe('2026-06-15')
  })

  it('upgrades legacy "Mar 4" values using the reference year', () => {
    expect(normalizeDueDate('Mar 4', 2026)).toBe('2026-03-04')
  })

  it('treats placeholders as empty', () => {
    expect(normalizeDueDate('No Date')).toBe('')
    expect(normalizeDueDate('')).toBe('')
    expect(normalizeDueDate(undefined)).toBe('')
  })

  it('returns empty for unparseable input', () => {
    expect(normalizeDueDate('sometime soon')).toBe('')
  })
})

describe('describeDueDate', () => {
  const cases: [string, string][] = [
    ['2026-06-10', 'overdue'],
    ['2026-06-15', 'today'],
    ['2026-06-16', 'soon'],
    ['2026-06-19', 'soon'],
    ['2026-07-30', 'future'],
  ]

  it.each(cases)('%s → tone %s', (date, tone) => {
    expect(describeDueDate(date, false, now).tone).toBe(tone)
  })

  it('labels overdue work in whole days', () => {
    expect(describeDueDate('2026-06-12', false, now).label).toBe('Overdue by 3 days')
    expect(describeDueDate('2026-06-14', false, now).label).toBe('Overdue by 1 day')
    expect(describeDueDate('2026-06-15', false, now).label).toBe('Due today')
    expect(describeDueDate('2026-06-16', false, now).label).toBe('Due tomorrow')
  })

  it('returns the neutral label when there is no due date', () => {
    expect(describeDueDate('', false, now)).toEqual({
      label: 'No due date',
      tone: 'none',
      daysRemaining: null,
    })
  })

  it('mutes completed tasks even when they are late', () => {
    expect(describeDueDate('2026-06-01', true, now).tone).toBe('done')
  })
})

describe('formatting helpers', () => {
  it('formats a due date without shifting the day', () => {
    expect(formatDueDate('2026-06-15')).toBe('Jun 15')
    expect(formatFullDate('2026-06-15')).toBe('Mon, Jun 15, 2026')
    expect(formatDueDate('')).toBe('No due date')
  })

  it('sorts undated work last', () => {
    const dates = ['', '2026-01-01', '2025-12-31']
    expect([...dates].sort((a, b) => dueDateSortKey(a).localeCompare(dueDateSortKey(b)))).toEqual([
      '2025-12-31',
      '2026-01-01',
      '',
    ])
  })

  it('reports today in UTC', () => {
    expect(todayIso(new Date('2026-06-15T23:30:00.000Z'))).toBe('2026-06-15')
  })
})

import { describe, expect, it } from 'vitest'
import { parseQuickAdd } from '@/lib/quick-add'

/** Fixed reference date: Thursday 2026-03-05. */
const NOW = new Date('2026-03-05T09:00:00.000Z')

describe('parseQuickAdd', () => {
  it('leaves a plain title alone', () => {
    const result = parseQuickAdd('Write the release notes', NOW)

    expect(result.title).toBe('Write the release notes')
    expect(result.matched).toBe(false)
    expect(result.tokens).toEqual([])
  })

  it('understands a full sentence of metadata', () => {
    const result = parseQuickAdd('Pay the studio invoice tomorrow 2pm #finance @admin !p1 ~45m every month', NOW)

    expect(result.title).toBe('Pay the studio invoice')
    expect(result.dueDate).toBe('2026-03-06')
    expect(result.dueTime).toBe('14:00')
    expect(result.project).toBe('finance')
    expect(result.tags).toEqual(['admin'])
    expect(result.priority).toBe('High')
    expect(result.estimateMinutes).toBe(45)
    expect(result.recurrence).toEqual({ every: 1, unit: 'month' })
    expect(result.matched).toBe(true)
  })

  it('resolves relative dates', () => {
    expect(parseQuickAdd('Call the bank today', NOW).dueDate).toBe('2026-03-05')
    expect(parseQuickAdd('Call the bank tomorrow', NOW).dueDate).toBe('2026-03-06')
    expect(parseQuickAdd('Call the bank in 3 days', NOW).dueDate).toBe('2026-03-08')
    expect(parseQuickAdd('Call the bank in two weeks', NOW).dueDate).toBe('2026-03-19')
    expect(parseQuickAdd('Call the bank next week', NOW).dueDate).toBe('2026-03-12')
  })

  it('picks the next occurrence of a weekday', () => {
    // 2026-03-05 is a Thursday; the next Monday is the 9th.
    const result = parseQuickAdd('Team review monday', NOW)
    expect(result.title).toBe('Team review')
    expect(result.dueDate).toBe('2026-03-09')
  })

  it('only treats a trailing bare keyword as a recurrence', () => {
    // "Weekly review" is a title; "Review weekly" is a habit.
    expect(parseQuickAdd('Weekly review', NOW).title).toBe('Weekly review')
    expect(parseQuickAdd('Weekly review', NOW).recurrence).toBeUndefined()
    expect(parseQuickAdd('Review my goals weekly', NOW).recurrence).toEqual({ every: 1, unit: 'week' })
  })

  it('treats "every monday" as a recurrence, not a one-off date', () => {
    const result = parseQuickAdd('Team sync every monday', NOW)

    expect(result.title).toBe('Team sync')
    expect(result.recurrence).toEqual({ every: 1, unit: 'week' })
    expect(result.dueDate).toBeUndefined()
  })

  it('parses estimates in several formats', () => {
    expect(parseQuickAdd('Deep work ~30m', NOW).estimateMinutes).toBe(30)
    expect(parseQuickAdd('Deep work ~2h', NOW).estimateMinutes).toBe(120)
    expect(parseQuickAdd('Deep work ~1h30', NOW).estimateMinutes).toBe(90)
    expect(parseQuickAdd('Deep work ~1.5h', NOW).estimateMinutes).toBe(90)
  })

  it('parses explicit ISO dates and month names', () => {
    expect(parseQuickAdd('Ship it 2026-04-01', NOW).dueDate).toBe('2026-04-01')
    expect(parseQuickAdd('Ship it apr 1', NOW).dueDate).toBe('2026-04-01')
    // A month/day already past rolls into next year rather than the past.
    expect(parseQuickAdd('Ship it jan 5', NOW).dueDate).toBe('2027-01-05')
  })

  it('keeps unknown text in the title', () => {
    const result = parseQuickAdd('Review the orbit dashboard tomorrow', NOW)

    expect(result.title).toBe('Review the orbit dashboard')
    expect(result.dueDate).toBe('2026-03-06')
  })

  it('normalises #project-names and multiple tags', () => {
    const result = parseQuickAdd('Draft the deck #brand-refresh @design @deep', NOW)

    expect(result.project).toBe('brand refresh')
    expect(result.tags).toEqual(['design', 'deep'])
  })

  it('describes what it understood for the preview chips', () => {
    const result = parseQuickAdd('Email the client tomorrow 9am ~15m', NOW)

    expect(new Set(result.tokens.map((token) => token.kind))).toEqual(new Set(['time', 'estimate', 'date']))
  })
})

import { describe, expect, it } from 'vitest'
import type { ActivityDay } from '@/lib/achievements'
import { KIND_CLASS, dominantKind, graphColumns, intensity, rowOf } from '@/lib/rhythm'

/** Small builders keep the grid assertions readable. */
const day = (date: string, overrides: Partial<ActivityDay> = {}): ActivityDay => ({
  date,
  completed: 0,
  focusMinutes: 0,
  planned: false,
  shutDown: false,
  rest: false,
  kinds: { deep: 0, admin: 0, light: 0 },
  ...overrides,
})

describe('graphColumns', () => {
  it('pads the first week so Monday is always the top row', () => {
    // 2026-03-02 is a Monday; four days end on Thursday.
    const columns = graphColumns(['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05'].map((date) => day(date)))
    expect(columns).toHaveLength(1)
    expect(columns[0]!.map((entry) => entry?.date ?? null)).toEqual([
      '2026-03-02',
      '2026-03-03',
      '2026-03-04',
      '2026-03-05',
      null,
      null,
      null,
    ])
  })

  it('pads a trailing partial week instead of dropping it', () => {
    // 2026-03-01 is a Sunday, so six padding cells land in front of the nine days.
    const dates = Array.from({ length: 9 }, (_, index) => `2026-03-0${index + 1}`)
    const columns = graphColumns(dates.map((date) => day(date)))
    expect(columns).toHaveLength(3)
    expect(columns[0]!.slice(0, 6).every((entry) => entry === null)).toBe(true)
    const flat = columns.flat().filter((entry): entry is ActivityDay => entry !== null)
    expect(flat).toHaveLength(9)
  })

  it('returns nothing for an empty history rather than a broken grid', () => {
    expect(graphColumns([])).toEqual([])
  })

  it('maps weekday names Monday-first', () => {
    expect(rowOf('2026-03-02')).toBe(0) // Monday
    expect(rowOf('2026-03-08')).toBe(6) // Sunday
  })
})

describe('dominantKind', () => {
  it('names the flavour a day was mostly made of', () => {
    expect(dominantKind(day('2026-03-02', { kinds: { deep: 1, admin: 3, light: 2 } }))).toBe('admin')
    expect(dominantKind(day('2026-03-03', { kinds: { deep: 5, admin: 0, light: 0 } }))).toBe('deep')
  })

  it('returns null on a day with no finished work', () => {
    expect(dominantKind(day('2026-03-04'))).toBeNull()
  })
})

describe('intensity', () => {
  const max = 4

  it('steps up with completions and gives focus time real weight', () => {
    expect(intensity(day('2026-03-02', { completed: 4 }), max)).toBe(4)
    expect(intensity(day('2026-03-02', { completed: 3 }), max)).toBe(3)
    expect(intensity(day('2026-03-02', { completed: 2 }), max)).toBe(2)
    expect(intensity(day('2026-03-02', { completed: 1 }), max)).toBe(1)
    // 135 focused minutes counts as three "units", so it lands on step three.
    expect(intensity(day('2026-03-02', { focusMinutes: 135 }), max)).toBe(3)
  })

  it('never leaves a cell blank on an active day', () => {
    expect(intensity(day('2026-03-02', { completed: 0, focusMinutes: 1 }), max)).toBe(1)
  })

  it('falls back to the lightest step when there is nothing to scale against', () => {
    expect(intensity(day('2026-03-02', { completed: 0 }), 0)).toBe(1)
  })
})

describe('KIND_CLASS', () => {
  it('offers four token-based steps for every work kind', () => {
    for (const kind of ['deep', 'admin', 'light'] as const) {
      expect(Object.keys(KIND_CLASS[kind]).sort()).toEqual(['1', '2', '3', '4'])
      expect(KIND_CLASS[kind][4]).toMatch(/^bg-/)
    }
  })
})

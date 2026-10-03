import { describe, expect, it } from 'vitest'
import { addDaysIso, todayIso } from '@/lib/dates'
import { buildCalendar, calendarFilename } from '@/lib/ics'
import { DEFAULT_SETTINGS } from '@/types/workspace'
import { taskFixture } from '@/test/utils'

const NOW = new Date('2026-03-05T07:00:00.000Z')
const TODAY = todayIso(NOW)

const settings = { ...DEFAULT_SETTINGS, workdayStart: '09:00', workdayEnd: '17:30' }

describe('calendar export', () => {
  it('wraps the plan in a valid VCALENDAR', () => {
    const ics = buildCalendar([taskFixture({ title: 'Write the brief', dueDate: TODAY, estimateMinutes: 60 })], settings, {
      now: NOW,
    })

    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true)
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
    expect(ics).toContain('VERSION:2.0')
    expect(ics).toContain('PRODID:-//Motif//Productivity Suite//EN')
    // RFC 5545 line endings.
    expect(ics.split('\r\n').length).toBeGreaterThan(10)
    expect(ics.includes('\n\n')).toBe(false)
  })

  it('writes one event per planned block, with floating local times', () => {
    const ics = buildCalendar(
      [
        taskFixture({ id: 'a', title: 'Deep work', dueDate: TODAY, estimateMinutes: 90 }),
        taskFixture({ id: 'b', title: 'Standup', dueDate: TODAY, dueTime: '10:30', estimateMinutes: 15 }),
      ],
      settings,
      { now: NOW },
    )

    const starts = [...ics.matchAll(/DTSTART:(\d{8}T\d{6})/g)].map((match) => match[1])
    expect(starts).toHaveLength(2)
    expect(starts.every((value) => !value.endsWith('Z'))).toBe(true)
    expect(starts).toContain('20260305T103000') // the pinned task keeps its time
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2)
    expect(ics.match(/END:VEVENT/g)).toHaveLength(2)
  })

  it('reminds only about tasks with a fixed time', () => {
    const ics = buildCalendar(
      [
        taskFixture({ id: 'a', title: 'Flexible', dueDate: TODAY }),
        taskFixture({ id: 'b', title: 'Meeting', dueDate: TODAY, dueTime: '10:30' }),
      ],
      settings,
      { now: NOW },
    )

    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(1)
    expect(ics).toContain('TRIGGER:-PT10M')
  })

  it('escapes commas, semicolons and newlines in user text', () => {
    const ics = buildCalendar(
      [taskFixture({ title: 'Call Sam, then Ana; follow up', dueDate: TODAY, note: 'Line one\nLine two' })],
      settings,
      { now: NOW },
    )

    // Unfold first, the way a calendar client does, then check the escaping.
    const unfolded = ics.replace(/\r\n /g, '')
    expect(unfolded).toContain('SUMMARY:Call Sam\\, then Ana\\; follow up')
    expect(unfolded).toContain('Line one\\nLine two')
  })

  it('folds long description lines', () => {
    const long = 'Detail '.repeat(40)
    const ics = buildCalendar([taskFixture({ title: 'Long one', dueDate: TODAY, note: long })], settings, { now: NOW })

    const lines = ics.split('\r\n')
    expect(Math.max(...lines.map((line) => line.length))).toBeLessThanOrEqual(75)
    // Continuation lines start with a single space.
    expect(lines.some((line) => line.startsWith(' '))).toBe(true)
  })

  it('covers several days and skips completed work', () => {
    const ics = buildCalendar(
      [
        taskFixture({ id: 'a', title: 'Today thing', dueDate: TODAY }),
        taskFixture({ id: 'b', title: 'Tomorrow thing', dueDate: addDaysIso(TODAY, 1) }),
        taskFixture({ id: 'c', title: 'Already done', dueDate: TODAY, status: 'Completed' }),
        taskFixture({ id: 'd', title: 'Unscheduled' }),
      ],
      settings,
      { days: 3, now: NOW },
    )

    expect(ics).toContain('SUMMARY:Today thing')
    expect(ics).toContain('SUMMARY:Tomorrow thing')
    expect(ics).not.toContain('Already done')
    expect(ics).not.toContain('Unscheduled')
  })

  it('carries overdue work onto today and names the file', () => {
    const overdue = taskFixture({ id: 'late', title: 'Late report', dueDate: addDaysIso(TODAY, -3) })
    const ics = buildCalendar([overdue], settings, { now: NOW })

    expect(ics).toContain('SUMMARY:Late report')
    expect(ics).toContain('DTSTART:20260305')
    expect(calendarFilename(NOW)).toBe('motif-plan-2026-03-05.ics')
    expect(calendarFilename(NOW, 7)).toBe('motif-plan-2026-03-05-7days.ics')
  })

  it('produces an empty but valid calendar when nothing is planned', () => {
    const ics = buildCalendar([], settings, { now: NOW })

    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).not.toContain('BEGIN:VEVENT')
  })
})

import { describe, expect, it } from 'vitest'
import { checkIn, describeReminder, dueSoon, reminderKey } from '@/lib/reminders'
import { DEFAULT_SETTINGS, type Task, type WorkspaceSettings } from '@/types/workspace'

/** A local-time date for `now`, so the clock side of a reminder is unambiguous. */
function at(hours: number, minutes = 0): Date {
  const now = new Date()
  now.setHours(hours, minutes, 0, 0)
  return now
}

const localDate = (now: Date = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'tsk_1',
    title: 'Standup',
    project: '',
    priority: 'Medium',
    status: 'Pending',
    dueDate: localDate(),
    dueTime: '10:00',
    startDate: '',
    note: '',
    tags: [],
    energy: 'Light',
    estimateMinutes: 15,
    recurrence: null,
    blockedBy: [],
    completedAt: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    rev: 1,
    ...overrides,
  }
}

const settings = (overrides: Partial<WorkspaceSettings> = {}): WorkspaceSettings => ({
  ...DEFAULT_SETTINGS,
  ...overrides,
})

describe('dueSoon', () => {
  it('reminds inside the lead window and not before it', () => {
    const tasks = [task({ dueTime: '10:00' })]
    expect(dueSoon(tasks, settings({ reminderLeadMinutes: 10 }), at(9, 45))).toHaveLength(0)
    expect(dueSoon(tasks, settings({ reminderLeadMinutes: 10 }), at(9, 55))).toHaveLength(1)
    expect(dueSoon(tasks, settings({ reminderLeadMinutes: 10 }), at(10, 0))[0]?.minutesUntil).toBe(0)
  })

  it('still reminds for a while after the time has passed', () => {
    const tasks = [task({ dueTime: '10:00' })]
    expect(dueSoon(tasks, settings(), at(10, 20))).toHaveLength(1)
    expect(dueSoon(tasks, settings(), at(10, 45))).toHaveLength(0)
  })

  it('honours a longer lead time', () => {
    const tasks = [task({ dueTime: '10:00' })]
    expect(dueSoon(tasks, settings({ reminderLeadMinutes: 45 }), at(9, 20))).toHaveLength(1)
  })

  it('ignores completed, dateless, untimed and other-day work', () => {
    const tasks = [
      task({ id: 'done', status: 'Completed' }),
      task({ id: 'no-time', dueTime: '' }),
      task({ id: 'no-date', dueDate: '' }),
      task({ id: 'tomorrow', dueDate: '2099-01-01' }),
    ]
    expect(dueSoon(tasks, settings(), at(10, 0))).toHaveLength(0)
  })

  it('sorts the soonest first and gives every reminder a stable key', () => {
    const tasks = [task({ id: 'later', title: 'Later', dueTime: '10:05' }), task({ id: 'sooner', dueTime: '10:01' })]
    const reminders = dueSoon(tasks, settings({ reminderLeadMinutes: 15 }), at(10, 0))

    expect(reminders.map((reminder) => reminder.taskId)).toEqual(['sooner', 'later'])
    expect(reminders[0]?.key).toBe(`sooner:${localDate()}:10:01`)
    expect(reminderKey(task({ id: 'x', dueTime: '09:00' }))).toBe(`${'x'}:${localDate()}:09:00`)
  })

  it('reports how a reminder reads, before and after the time', () => {
    const soon = dueSoon([task({ dueTime: '10:00' })], settings(), at(9, 55))[0]!
    expect(describeReminder(soon)).toBe('10:00 · in 5 min')

    const late = dueSoon([task({ dueTime: '10:00' })], settings(), at(10, 12))[0]!
    expect(describeReminder(late)).toBe('10:00 · 12 min ago')
  })
})

describe('checkIn', () => {
  it('is silent before its time and on a disabled setting', () => {
    expect(checkIn(settings({ checkInTime: '09:00' }), at(8, 30))).toBeNull()
    expect(checkIn(settings({ dailyCheckIn: false }), at(12, 0))).toBeNull()
  })

  it('fires once a day, and remembers whether the day was planned', () => {
    const config = settings({ checkInTime: '09:00' })
    const now = at(9, 30)
    const today = localDate(now)

    // Not sent yet, nothing planned: the nudge is due and it should push planning.
    expect(checkIn(config, now, null, null)?.planned).toBe(false)
    // Same day, already planned: still "due" so it can be recorded, but silent.
    expect(checkIn(config, now, null, `${today}T09:05:00.000Z`)?.planned).toBe(true)
    // Already sent today: never again.
    expect(checkIn(config, now, today, null)).toBeNull()
  })

  it('nudges again the next day', () => {
    const config = settings({ checkInTime: '09:00' })
    const result = checkIn(config, at(9, 30), '2020-01-01', null)
    expect(result?.date).toBe(localDate())
  })
})

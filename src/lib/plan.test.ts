import { describe, expect, it } from 'vitest'
import { availableTasks, isBlocked, planDay, scoreTask, sortForToday } from '@/lib/plan'
import { currentStreak, dailyActivity, heatmapWeeks, momentum, projectRollups, workload } from '@/lib/analytics'
import { focusFixture, projectFixture, taskFixture } from '@/test/utils'
import { DEFAULT_SETTINGS, type WorkspaceSettings } from '@/types/workspace'

const NOW = new Date('2026-03-05T09:00:00.000Z')
const today = '2026-03-05'
const tomorrow = '2026-03-06'
const yesterday = '2026-03-04'

const settings: WorkspaceSettings = { ...DEFAULT_SETTINGS, workdayStart: '09:00', workdayEnd: '12:00', capacityMinutesPerDay: 180 }

describe('planning', () => {
  it('orders overdue work ahead of everything else', () => {
    const overdue = taskFixture({ id: 'a', title: 'Late', dueDate: yesterday, priority: 'Low' })
    const high = taskFixture({ id: 'b', title: 'Important', dueDate: tomorrow, priority: 'High' })

    expect(scoreTask(overdue, NOW)).toBeLessThan(scoreTask(high, NOW))
    expect(sortForToday([high, overdue], NOW)[0]?.id).toBe('a')
  })

  it('hides blocked and not-yet-started work from the pick list', () => {
    const blocker = taskFixture({ id: 'blocker', title: 'Design first' })
    const blocked = taskFixture({ id: 'blocked', title: 'Build it', blockedBy: ['blocker'] })
    const future = taskFixture({ id: 'future', title: 'Later', startDate: '2026-04-01' })

    const byId = new Map([blocker, blocked, future].map((task) => [task.id, task]))
    expect(isBlocked(blocked, byId)).toBe(true)

    const available = availableTasks([blocker, blocked, future], NOW)
    expect(available.map((task) => task.id)).toEqual(['blocker'])
  })

  it('unblocks work once its dependency is complete', () => {
    const blocker = taskFixture({ id: 'blocker', status: 'Completed' })
    const blocked = taskFixture({ id: 'blocked', blockedBy: ['blocker'] })

    expect(isBlocked(blocked, new Map([blocker, blocked].map((task) => [task.id, task])))).toBe(false)
  })

  it('time-boxes the day and reports what did not fit', () => {
    const tasks = [
      taskFixture({ id: 'a', title: 'Big rock', priority: 'High', estimateMinutes: 120, dueDate: today }),
      taskFixture({ id: 'b', title: 'Small task', estimateMinutes: 30, dueDate: today }),
      taskFixture({ id: 'c', title: 'Overflow', estimateMinutes: 60, dueDate: today }),
    ]

    const plan = planDay(tasks, settings, NOW)

    expect(plan.blocks).toHaveLength(2) // 180 minutes of capacity
    expect(plan.committedMinutes).toBe(150)
    expect(plan.over).toBe(false)
    expect(plan.deferred.map((task) => task.id)).toEqual(['c'])
    // Blocks are chronological and never overlap.
    const [first, second] = plan.blocks
    expect(first!.startMinute).toBe(540) // 09:00
    expect(second!.startMinute).toBeGreaterThanOrEqual(first!.startMinute + first!.minutes)
  })

  it('pins tasks that have a fixed time', () => {
    const tasks = [taskFixture({ id: 'pinned', title: 'Standup', dueTime: '10:30', estimateMinutes: 30, dueDate: today })]

    const plan = planDay(tasks, settings, NOW)

    expect(plan.blocks[0]?.startMinute).toBe(630) // 10:30
    expect(plan.blocks[0]?.pinned).toBe(true)
  })

  it('flags an over-committed day instead of silently overscheduling', () => {
    const tasks = Array.from({ length: 5 }, (_, index) =>
      taskFixture({ id: `t${index}`, title: `Task ${index}`, estimateMinutes: 60, dueDate: today }),
    )

    const plan = planDay(tasks, settings, NOW)

    expect(plan.committedMinutes).toBe(180)
    expect(plan.deferred).toHaveLength(2)
  })
})

describe('analytics', () => {
  it('counts completions and focus per day', () => {
    const tasks = [
      taskFixture({ id: 'a', status: 'Completed', completedAt: `${today}T12:00:00.000Z` }),
      taskFixture({ id: 'b', status: 'Completed', completedAt: `${yesterday}T12:00:00.000Z` }),
    ]
    const sessions = [focusFixture({ minutes: 25, date: today }), focusFixture({ minutes: 25, date: today })]

    const buckets = dailyActivity(tasks, sessions, 3, NOW)

    expect(buckets.at(-1)?.completed).toBe(1)
    expect(buckets.at(-1)?.focusMinutes).toBe(50)
    expect(currentStreak(buckets)).toBe(2)
  })

  it('gives a streak for today alone', () => {
    const buckets = dailyActivity([taskFixture({ status: 'Completed', completedAt: `${today}T08:00:00.000Z` })], [], 3, NOW)
    expect(currentStreak(buckets)).toBe(1)
  })

  it('scores momentum from finished work and focus, minus overdue debt', () => {
    const tasks = [
      taskFixture({ id: 'a', status: 'Completed', completedAt: `${today}T08:00:00.000Z`, dueDate: today }),
      taskFixture({ id: 'b', title: 'Late', dueDate: yesterday }),
    ]

    const score = momentum(tasks, [focusFixture({ minutes: 60, date: today })])

    expect(score.score).toBeGreaterThan(0)
    expect(score.breakdown.some((entry) => entry.points < 0)).toBe(true)
    expect(score.level).toBeTruthy()
  })

  it('measures capacity against the estimated work in the next week', () => {
    const tasks = [taskFixture({ id: 'a', status: 'Pending', estimateMinutes: 120, dueDate: today })]

    const load = workload(tasks, { ...DEFAULT_SETTINGS, capacityMinutesPerDay: 60 })

    expect(load.committedMinutes).toBe(120)
    expect(load.capacityMinutes).toBe(300)
    expect(load.over).toBe(false)
  })

  it('pads the heatmap into whole Monday-first weeks', () => {
    const buckets = dailyActivity([], [], 10, NOW) // ends on 2026-03-05 (a Thursday)
    const weeks = heatmapWeeks(buckets)

    expect(weeks.length).toBeGreaterThan(1)
    for (const week of weeks) expect(week).toHaveLength(7)
    // Padding cells have no date at all, so real days are never duplicated.
    const dates = weeks.flat().map((day) => day.date)
    const real = dates.filter((date) => date !== '')
    // Real days are unique; only the blank padding cells repeat.
    expect(new Set(real).size).toBe(real.length)
    expect(dates.indexOf('')).toBeLessThan(dates.lastIndexOf('2026-03-05'))
    expect(real.at(-1)).toBe('2026-03-05')
  })

  it('rolls project progress up from its tasks', () => {
    const project = projectFixture({ name: 'Atlas', autoProgress: true })
    const tasks = [
      taskFixture({ id: 'a', project: 'Atlas', status: 'Completed' }),
      taskFixture({ id: 'b', project: 'Atlas' }),
      taskFixture({ id: 'c', project: 'Atlas', estimateMinutes: 60 }),
    ]

    const [rollup] = projectRollups([project], tasks, NOW)

    expect(rollup?.percent).toBe(33)
    expect(rollup?.openMinutes).toBe(90)
  })
})

import { describe, expect, it } from 'vitest'
import {
  ACHIEVEMENTS,
  LEVELS,
  MAX_SHIELDS,
  SHIELD_EVERY,
  achievements,
  activityHistory,
  describeUnlock,
  experience,
  isActiveDay,
  isRestDay,
  newlyUnlocked,
  streakSummary,
} from '@/lib/achievements'
import { addDaysIso, todayIso } from '@/lib/dates'
import { focusFixture, logFixture, taskFixture } from '@/test/utils'

const NOW = new Date('2026-03-05T12:00:00.000Z')
const TODAY = todayIso(NOW) // 2026-03-05, a Thursday

/** A completed task on a given day. */
const doneOn = (date: string, overrides = {}) =>
  taskFixture({ status: 'Completed', completedAt: `${date}T09:00:00.000Z`, ...overrides })

describe('activity history', () => {
  it('buckets completions, focus and rituals per day', () => {
    const history = activityHistory(
      [doneOn(TODAY), doneOn(TODAY, { energy: 'Deep' }), doneOn(addDaysIso(TODAY, -1))],
      [focusFixture({ date: TODAY, minutes: 50 })],
      [logFixture({ date: TODAY, plannedAt: `${TODAY}T08:00:00.000Z` })],
      7,
      NOW,
    )

    const today = history.at(-1)!
    expect(history).toHaveLength(7)
    expect(today.completed).toBe(2)
    expect(today.kinds.deep).toBe(1)
    expect(today.focusMinutes).toBe(50)
    expect(today.planned).toBe(true)
    expect(isActiveDay(today)).toBe(true)
    expect(isActiveDay(history[0]!)).toBe(false)
  })

  it('marks Saturday and Sunday as rest days', () => {
    const history = activityHistory([], [], [], 10, NOW)
    expect(isRestDay('2026-03-07')).toBe(true) // Saturday
    expect(isRestDay('2026-03-08')).toBe(true) // Sunday
    expect(isRestDay('2026-03-09')).toBe(false) // Monday
    expect(history.filter((day) => day.rest).length).toBeGreaterThanOrEqual(2)
  })
})

describe('streaks', () => {
  it('counts a straight run of active days', () => {
    const tasks = [0, 1, 2, 3].map((offset) => doneOn(addDaysIso(TODAY, -offset)))
    const summary = streakSummary(activityHistory(tasks, [], [], 14, NOW), NOW)

    expect(summary.current).toBe(4)
    expect(summary.activeToday).toBe(true)
    expect(summary.atRisk).toBe(false)
    expect(summary.nextMilestone).toBe(7)
    expect(summary.daysToMilestone).toBe(3)
  })

  it('does not break the streak on a weekend', () => {
    // Thu 26 + Fri 27 active, Sat 28 + Sun 1 empty, then Mon 2 → Thu 5.
    const tasks = ['2026-02-26', '2026-02-27', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05'].map((date) =>
      doneOn(date),
    )
    const summary = streakSummary(activityHistory(tasks, [], [], 14, NOW), NOW)

    expect(summary.current).toBe(6)
    expect(summary.shieldsUsed).toBe(0)
    expect(summary.recent.filter((day) => day.rest && !isActiveDay(day)).length).toBeGreaterThanOrEqual(2)
  })

  it('spends a shield instead of breaking the chain on a missed weekday', () => {
    // Seven active weekdays bank a shield (Mon 23 – Tue 3 Mar), then Wednesday
    // is missed and Thu 5 keeps the run alive on the banked shield.
    const active = ['2026-02-23', '2026-02-24', '2026-02-25', '2026-02-26', '2026-02-27', '2026-03-02', '2026-03-03', '2026-03-05']
    const tasks = active.map((date) => doneOn(date))
    const summary = streakSummary(activityHistory(tasks, [], [], 21, NOW), NOW)

    expect(summary.shieldsUsed).toBe(1)
    expect(summary.shieldsHeld).toBe(0)
    expect(summary.current).toBe(8)
    expect(summary.longest).toBe(summary.current)
  })

  it('breaks the streak once the shields are gone', () => {
    const active = [doneOn(TODAY), doneOn(addDaysIso(TODAY, -6)), doneOn(addDaysIso(TODAY, -7)), doneOn(addDaysIso(TODAY, -8))]
    const summary = streakSummary(activityHistory(active, [], [], 30, NOW), NOW)

    expect(summary.current).toBe(1)
    expect(summary.longest).toBe(3)
  })

  it('never banks more shields than the cap', () => {
    const active = Array.from({ length: 60 }, (_, index) => doneOn(addDaysIso(TODAY, -index))).filter(
      (task) => !isRestDay(task.completedAt!.slice(0, 10)),
    )
    const summary = streakSummary(activityHistory(active, [], [], 70, NOW), NOW)

    expect(summary.shieldsUsed).toBe(0)
    expect(summary.shieldsHeld).toBeLessThanOrEqual(MAX_SHIELDS)
    expect(60 / SHIELD_EVERY).toBeGreaterThanOrEqual(1)
  })

  it('reports the milestone it is working towards', () => {
    const tasks = Array.from({ length: 60 }, (_, index) => doneOn(addDaysIso(TODAY, -index)))
    const summary = streakSummary(activityHistory(tasks, [], [], 60, NOW), NOW)

    expect(summary.current).toBeGreaterThanOrEqual(40)
    expect(summary.milestoneFrom).toBeLessThanOrEqual(summary.current)
    expect(summary.milestoneFrom).toBe(50)
    expect(summary.nextMilestone).toBeGreaterThan(summary.current)
    expect(summary.milestoneProgress).toBeGreaterThan(0)
    expect(summary.milestoneProgress).toBeLessThanOrEqual(1)
  })
})

describe('experience and levels', () => {
  it('earns XP for finishing, focusing and keeping the ritual', () => {
    const xp = experience(
      [doneOn(TODAY), doneOn(addDaysIso(TODAY, -1), { dueDate: TODAY })],
      [focusFixture({ date: TODAY, minutes: 60 })],
      [logFixture({ date: TODAY, plannedAt: '2026-03-05T08:00:00.000Z', shutdownAt: '2026-03-05T18:00:00.000Z' })],
    )

    expect(xp.xp).toBeGreaterThan(0)
    expect(xp.level).toBe(1)
    expect(xp.title).toBe(LEVELS[0]!.title)
    expect(xp.nextTitle).toBe(LEVELS[1]!.title)
    expect(xp.progress).toBeGreaterThan(0)
    expect(xp.progress).toBeLessThan(1)
    expect(xp.breakdown.some((entry) => entry.label.includes('mornings planned'))).toBe(true)
  })

  it('promotes through the ranks and caps at the top', () => {
    const tasks = Array.from({ length: 400 }, (_, index) => doneOn(addDaysIso(TODAY, -(index % 40))))
    const sessions = Array.from({ length: 300 }, () => focusFixture({ date: TODAY, minutes: 50 }))
    const logs = Array.from({ length: 60 }, (_, index) =>
      logFixture({ date: addDaysIso(TODAY, -index), plannedAt: '2026-03-01T08:00:00.000Z', shutdownAt: '2026-03-01T18:00:00.000Z' }),
    )

    const ranked = experience(tasks, sessions, logs)

    expect(ranked.level).toBeGreaterThan(5)
    expect(LEVELS.find((tier) => tier.level === ranked.level)?.title).toBe(ranked.title)
  })

  it('is monotonic in XP', () => {
    const points = LEVELS.map((tier) => tier.xp)
    expect([...points].sort((a, b) => a - b)).toEqual(points)
    expect(new Set(LEVELS.map((tier) => tier.title)).size).toBe(LEVELS.length)
  })
})

describe('achievements', () => {
  it('leaves everything locked on an empty workspace', () => {
    const shelf = achievements([], [], [])

    expect(shelf).toHaveLength(ACHIEVEMENTS.length)
    expect(shelf.every((state) => !state.unlocked)).toBe(true)
    expect(shelf.every((state) => state.ratio === 0)).toBe(true)
  })

  it('dates a badge to the day it was actually earned', () => {
    const threeDaysAgo = addDaysIso(TODAY, -3)
    const shelf = achievements(
      [doneOn(threeDaysAgo), doneOn(addDaysIso(TODAY, -2)), doneOn(TODAY)],
      [],
      [],
      activityHistory([doneOn(threeDaysAgo), doneOn(addDaysIso(TODAY, -2)), doneOn(TODAY)], [], [], 14, NOW),
    )

    const firstLight = shelf.find((state) => state.id === 'first-light')!
    expect(firstLight.unlocked).toBe(true)
    expect(firstLight.unlockedOn).toBe(threeDaysAgo)

    const century = shelf.find((state) => state.id === 'century')!
    expect(century.unlocked).toBe(false)
    expect(century.progress).toBe(3)
    expect(century.ratio).toBeCloseTo(0.03, 2)
  })

  it('unlocks ritual, focus and dependency badges from real activity', () => {
    const tasks = [
      doneOn(TODAY, { blockedBy: ['other'], project: 'Atlas' }),
      doneOn(TODAY, { project: 'Studio', tags: ['deep', 'client'], energy: 'Deep' }),
    ]
    const sessions = [focusFixture({ date: TODAY, minutes: 90 })]
    const logs = [logFixture({ date: TODAY, plannedAt: '2026-03-05T08:00:00.000Z', shutdownAt: '2026-03-05T18:00:00.000Z' })]
    const shelf = achievements(tasks, sessions, logs, activityHistory(tasks, sessions, logs, 14, NOW))

    const unlocked = shelf.filter((state) => state.unlocked).map((state) => state.id)
    expect(unlocked).toContain('first-light')
    expect(unlocked).toContain('morning-architect')
    expect(unlocked).toContain('closing-bell')
    expect(unlocked).toContain('focused-hour')
    expect(unlocked).not.toContain('deep-diver')

    // The unblocker badge is real but early: one of ten, and it knows the date.
    const unblocker = shelf.find((state) => state.id === 'unblocker')!
    expect(unblocker.unlocked).toBe(false)
    expect(unblocker.progress).toBe(1)
    expect(unblocker.ratio).toBeCloseTo(0.1, 2)

    // Tag and project badges only count work that was actually finished.
    expect(shelf.find((state) => state.id === 'well-labelled')?.progress).toBe(2)
    expect(shelf.find((state) => state.id === 'five-projects')?.progress).toBe(2)
  })

  it('counts big days and big focus days', () => {
    const tasks = Array.from({ length: 5 }, () => doneOn(TODAY))
    const sessions = [focusFixture({ date: TODAY, minutes: 200 })]
    const shelf = achievements(tasks, sessions, [], activityHistory(tasks, sessions, [], 14, NOW))

    expect(shelf.find((state) => state.id === 'big-day')?.unlocked).toBe(true)
    expect(shelf.find((state) => state.id === 'deepest-day')?.unlocked).toBe(true)
  })

  it('reports what is new since the last visit', () => {
    const tasks = [doneOn(TODAY)]
    const shelf = achievements(tasks, [], [], activityHistory(tasks, [], [], 14, NOW))

    expect(newlyUnlocked(shelf, []).map((state) => state.id)).toContain('first-light')
    expect(newlyUnlocked(shelf, ['first-light'])).toHaveLength(0)
  })

  it('words the unlock date for humans', () => {
    expect(describeUnlock(null)).toBe('Not yet earned')
    expect(describeUnlock(TODAY, NOW)).toBe('Earned today')
    expect(describeUnlock(addDaysIso(TODAY, -1), NOW)).toBe('Earned yesterday')
    expect(describeUnlock(addDaysIso(TODAY, -3), NOW)).toBe('Earned 3 days ago')
    expect(describeUnlock(addDaysIso(TODAY, -10), NOW)).toBe('Earned 1 week ago')
  })
})

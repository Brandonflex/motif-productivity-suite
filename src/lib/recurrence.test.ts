import { describe, expect, it } from 'vitest'
import { describeRecurrence, nextOccurrence, recurrenceBadge, rollForward } from '@/lib/recurrence'
import { applyRules, RULE_PRESETS } from '@/lib/rules'
import { taskFixture } from '@/test/utils'
import type { AutomationRule } from '@/types/workspace'

const NOW = new Date('2026-03-05T09:00:00.000Z')

describe('recurrence', () => {
  it('advances by days, weeks and months', () => {
    expect(nextOccurrence({ every: 1, unit: 'day' }, '2026-03-05')).toBe('2026-03-06')
    expect(nextOccurrence({ every: 2, unit: 'week' }, '2026-03-05')).toBe('2026-03-19')
    expect(nextOccurrence({ every: 1, unit: 'month' }, '2026-03-05')).toBe('2026-04-05')
  })

  it('clamps month arithmetic to real calendar days', () => {
    expect(nextOccurrence({ every: 1, unit: 'month' }, '2026-01-31')).toBe('2026-02-28')
  })

  it('labels cadences for the UI', () => {
    expect(describeRecurrence(null)).toBe('Does not repeat')
    expect(describeRecurrence({ every: 1, unit: 'week' })).toBe('Every week')
    expect(describeRecurrence({ every: 3, unit: 'day' })).toBe('Every 3 days')
    expect(recurrenceBadge(null)).toBeNull()
    expect(recurrenceBadge({ every: 1, unit: 'week' })).toBe('↻ 1w')
    expect(recurrenceBadge({ every: 3, unit: 'month' })).toBe('↻ 3mo')
  })

  it('completes one-off tasks with a timestamp', () => {
    const task = taskFixture({ recurrence: null })
    const result = rollForward(task, NOW)

    expect(result.rolled).toBe(false)
    expect(result.patch.status).toBe('Completed')
    expect(result.patch.completedAt).toBe(NOW.toISOString())
  })

  it('rolls a repeating task forward instead of completing it', () => {
    const task = taskFixture({ recurrence: { every: 1, unit: 'week' }, dueDate: '2026-03-05' })
    const result = rollForward(task, NOW)

    expect(result.rolled).toBe(true)
    expect(result.patch.status).toBe('Pending')
    expect(result.patch.dueDate).toBe('2026-03-12')
    expect(result.patch.completedAt).toBe('')
  })

  it('never schedules the next occurrence in the past', () => {
    const overdue = taskFixture({ recurrence: { every: 1, unit: 'week' }, dueDate: '2026-01-01' })
    const result = rollForward(overdue, NOW)

    expect(result.patch.dueDate !== undefined && result.patch.dueDate > '2026-03-05').toBe(true)
  })
})

describe('automation rules', () => {
  const rule = (overrides: Partial<AutomationRule> = {}): AutomationRule => ({
    id: 'rul_1',
    name: 'Test rule',
    enabled: true,
    trigger: 'taskCreated',
    matchProject: '',
    matchStatus: '',
    matchText: '',
    action: 'setPriority',
    value: 'High',
    ...overrides,
  })

  it('applies a matching rule on creation', () => {
    const task = taskFixture({ title: 'Draft proposal', project: 'Studio', priority: 'Low' })
    const outcome = applyRules(task, [rule({ matchProject: 'Studio' })], 'taskCreated', {}, NOW)

    expect(outcome.task.priority).toBe('High')
    expect(outcome.applied).toHaveLength(1)
  })

  it('ignores disabled rules and non-matching conditions', () => {
    const task = taskFixture({ project: 'Studio' })

    expect(applyRules(task, [rule({ enabled: false })], 'taskCreated', {}, NOW).applied).toHaveLength(0)
    expect(applyRules(task, [rule({ matchProject: 'Clients' })], 'taskCreated', {}, NOW).applied).toHaveLength(0)
    expect(applyRules(task, [rule({ matchText: 'invoice' })], 'taskCreated', {}, NOW).applied).toHaveLength(0)
  })

  it('only fires for its own trigger', () => {
    const task = taskFixture()
    expect(applyRules(task, [rule({ trigger: 'taskCompleted' })], 'taskCreated', {}, NOW).applied).toHaveLength(0)
  })

  it('adds a tag once and schedules relative dates', () => {
    const task = taskFixture({ tags: ['done'] })

    expect(applyRules(task, [rule({ action: 'addTag', value: 'done' })], 'taskCreated', {}, NOW).applied).toHaveLength(0)

    const scheduled = applyRules(task, [rule({ action: 'scheduleInDays', value: '3' })], 'taskCreated', {}, NOW)
    expect(scheduled.task.dueDate).toBe('2026-03-08')
  })

  it('ships starter presets that are valid', () => {
    expect(RULE_PRESETS.length).toBeGreaterThan(0)
    for (const preset of RULE_PRESETS) {
      const outcome = applyRules(taskFixture({ project: 'Studio' }), [{ ...preset, id: 'x' }], preset.trigger, {}, NOW)
      expect(outcome.task.id).toBeTruthy()
    }
  })
})

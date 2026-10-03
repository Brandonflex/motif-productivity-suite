import { act } from 'react'
import { renderHook } from '@testing-library/react'
import { type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { WorkspaceProvider } from '@/features/workspace/WorkspaceProvider'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { dailyActivity, momentum, projectRollups } from '@/lib/analytics'
import { planDay } from '@/lib/plan'
import { DEFAULT_SETTINGS, type AutomationRule } from '@/types/workspace'
import { focusFixture, logFixture, projectFixture, snapshotFixture, seedWorkspace, taskFixture } from '@/test/utils'

const wrapper = ({ children }: { children: ReactNode }) => <WorkspaceProvider>{children}</WorkspaceProvider>

function renderWorkspace() {
  return renderHook(() => useWorkspace(), { wrapper })
}

const rule = (overrides: Partial<AutomationRule> = {}): AutomationRule => ({
  id: 'rul_seed',
  name: 'Seeded',
  enabled: true,
  trigger: 'taskCreated',
  matchProject: '',
  matchStatus: '',
  matchText: '',
  action: 'setPriority',
  value: 'High',
  ...overrides,
})

describe('recurring tasks', () => {
  it('rolls a repeating task forward instead of completing it', () => {
    seedWorkspace({ tasks: [taskFixture({ title: 'Weekly review', dueDate: '2026-03-05', recurrence: { every: 1, unit: 'week' } })] })
    const { result } = renderWorkspace()

    act(() => result.current.setTaskStatus('tsk_test', 'Completed'))

    const task = result.current.tasks[0]
    expect(task?.status).not.toBe('Completed')
    expect(task !== undefined && task.dueDate > '2026-03-05').toBe(true)
    expect(result.current.stats.completedTasks).toBe(0)
  })

  it('completes a one-off task with a timestamp', () => {
    seedWorkspace({ tasks: [taskFixture({ dueDate: '2026-03-05' })] })
    const { result } = renderWorkspace()

    act(() => result.current.setTaskStatus('tsk_test', 'Completed'))

    expect(result.current.tasks[0]?.status).toBe('Completed')
    expect(result.current.tasks[0]?.completedAt).not.toBe('')
  })
})

describe('automation rules', () => {
  it('applies creation rules to new tasks', () => {
    seedWorkspace({ rules: [rule({ action: 'addTag', value: 'auto' })] })
    const { result } = renderWorkspace()

    act(() => {
      result.current.addTask({ title: 'Generated work', project: '', priority: 'Medium' })
    })

    expect(result.current.tasks[0]?.tags).toContain('auto')
  })

  it('stores, toggles and deletes rules', () => {
    seedWorkspace()
    const { result } = renderWorkspace()

    act(() => {
      result.current.addRule({
        name: 'Tag invoices',
        enabled: true,
        trigger: 'taskCreated',
        matchProject: '',
        matchStatus: '',
        matchText: 'invoice',
        action: 'addTag',
        value: 'finance',
      })
    })

    const created = result.current.rules.at(-1)
    expect(created?.id).toMatch(/^rul_/)

    act(() => created && result.current.updateRule(created.id, { enabled: false }))
    expect(result.current.rules.at(-1)?.enabled).toBe(false)

    act(() => created && result.current.deleteRule(created.id))
    expect(result.current.rules.some((item) => item.id === created?.id)).toBe(false)
  })
})

describe('focus sessions', () => {
  it('logs a session and bumps today’s focus minutes', () => {
    seedWorkspace()
    const { result } = renderWorkspace()

    act(() => {
      result.current.logFocusSession({ taskId: 'tsk_test', minutes: 25, kind: 'focus' })
    })

    expect(result.current.focusSessions).toHaveLength(1)
    expect(result.current.focusSessions[0]?.minutes).toBe(25)
    expect(result.current.stats.focusTodayMinutes).toBe(25)
  })

  it('rounds tiny sessions up to a minute so nothing is lost', () => {
    seedWorkspace()
    const { result } = renderWorkspace()

    act(() => {
      result.current.logFocusSession({ taskId: null, minutes: 0.2, kind: 'break' })
    })

    expect(result.current.focusSessions[0]?.minutes).toBe(1)
  })

  it('feeds the analytics and momentum surfaces', () => {
    const today = new Date().toISOString().slice(0, 10)
    const sessions = [focusFixture({ date: today, minutes: 50 })]
    seedWorkspace({ tasks: [taskFixture()], focusSessions: sessions })
    const { result } = renderWorkspace()

    const buckets = dailyActivity(result.current.tasks, result.current.focusSessions, 7)
    expect(buckets.at(-1)?.focusMinutes).toBe(50)
    expect(momentum(result.current.tasks, result.current.focusSessions).level).toBeTruthy()
  })
})

describe('daily rituals', () => {
  it('records a morning plan against today', () => {
    seedWorkspace({ tasks: [taskFixture({ dueDate: '2026-03-05' })] })
    const { result } = renderWorkspace()

    act(() => result.current.commitPlan(['tsk_test'], 'Deep work first'))

    const log = result.current.todayLog
    expect(log?.plannedTaskIds).toEqual(['tsk_test'])
    expect(log?.plannedAt).not.toBe('')
    expect(log?.note).toBe('Deep work first')
    expect(result.current.stats.plannedTodayCount).toBe(1)
  })

  it('flags an over-capacity day without dropping the overflow', () => {
    const today = new Date().toISOString().slice(0, 10)
    const tasks = [
      taskFixture({ id: 'a', title: 'A', estimateMinutes: 90, dueDate: today }),
      taskFixture({ id: 'b', title: 'B', estimateMinutes: 90, dueDate: today }),
    ]
    seedWorkspace({ tasks, settings: { ...DEFAULT_SETTINGS, capacityMinutesPerDay: 120 } })
    const { result } = renderWorkspace()

    const plan = planDay(result.current.tasks, result.current.settings)

    // Both fit inside the 09:00–17:30 window, but the day is over the user's capacity.
    expect(plan.blocks).toHaveLength(2)
    expect(plan.committedMinutes).toBe(180)
    expect(plan.capacityMinutes).toBe(120)
    expect(plan.over).toBe(true)
  })

  it('defers work that cannot fit the working window', () => {
    const today = new Date().toISOString().slice(0, 10)
    const tasks = Array.from({ length: 5 }, (_, index) =>
      taskFixture({ id: `t${index}`, title: `Task ${index}`, estimateMinutes: 120, dueDate: today }),
    )
    seedWorkspace({ tasks, settings: { ...DEFAULT_SETTINGS, workdayStart: '09:00', workdayEnd: '12:00' } })
    const { result } = renderWorkspace()

    const plan = planDay(result.current.tasks, result.current.settings)

    expect(plan.blocks.length).toBeLessThan(5)
    expect(plan.deferred.length).toBeGreaterThan(0)
    expect(plan.blocks[0]?.startMinute).toBeGreaterThanOrEqual(540)
  })

  it('rolls unfinished work into tomorrow on shutdown', () => {
    seedWorkspace({ tasks: [taskFixture({ id: 'tsk_test', title: 'Unfinished', dueDate: '2026-03-01' })] })
    const { result } = renderWorkspace()

    act(() => result.current.shutdownDay({ rolledOverTaskIds: ['tsk_test'], note: 'Shipped the big thing' }))

    const log = result.current.todayLog
    expect(log?.shutdownAt).not.toBe('')
    expect(log?.rolledOverTaskIds).toEqual(['tsk_test'])
    expect(log?.note).toBe('Shipped the big thing')

    const task = result.current.tasks[0]
    expect(task !== undefined && task.dueDate > '2026-03-01').toBe(true)
    expect(task?.startDate).toBe('')
  })

  it('leaves completed work alone when rolling over', () => {
    seedWorkspace({ tasks: [taskFixture({ id: 'tsk_test', status: 'Completed', dueDate: '2026-03-01' })] })
    const { result } = renderWorkspace()

    act(() => result.current.shutdownDay({ rolledOverTaskIds: ['tsk_test'], note: '' }))

    expect(result.current.tasks[0]?.dueDate).toBe('2026-03-01')
  })

  it('merges two shutdowns for the same day into one log', () => {
    seedWorkspace({ dailyLogs: [logFixture({ date: new Date().toISOString().slice(0, 10) })] })
    const { result } = renderWorkspace()

    act(() => result.current.shutdownDay({ rolledOverTaskIds: [], note: 'Evening note' }))

    expect(result.current.dailyLogs).toHaveLength(1)
    expect(result.current.todayLog?.note).toBe('Evening note')
  })
})

describe('triage and projects', () => {
  it('clears the Inbox when a task is triaged', () => {
    seedWorkspace({ tasks: [taskFixture({ status: 'Inbox', project: 'Unassigned' })], projects: [projectFixture({ name: 'Atlas' })] })
    const { result } = renderWorkspace()

    act(() => result.current.triageTask('tsk_test', { project: 'Atlas', dueDate: '2026-03-06' }))

    const task = result.current.tasks[0]
    expect(task?.status).toBe('Pending')
    expect(task?.project).toBe('Atlas')
    expect(result.current.stats.inboxTasks).toBe(0)
  })

  it('pushes a task forward with snooze', () => {
    seedWorkspace({ tasks: [taskFixture({ dueDate: '2026-03-05' })] })
    const { result } = renderWorkspace()

    act(() => result.current.snoozeTask('tsk_test', 3))

    const snoozed = result.current.tasks[0]
    expect(snoozed !== undefined && snoozed.dueDate > '2026-03-05').toBe(true)
  })

  it('derives project progress from completed tasks when auto-progress is on', () => {
    const project = projectFixture({ name: 'Atlas', autoProgress: true })
    const tasks = [
      taskFixture({ id: 'a', project: 'Atlas', status: 'Completed' }),
      taskFixture({ id: 'b', project: 'Atlas' }),
    ]

    const [rollup] = projectRollups([project], tasks)

    expect(rollup?.percent).toBe(50)
  })

  it('warns rather than throwing when storage is unavailable', () => {
    seedWorkspace()
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    const { result } = renderWorkspace()

    act(() => {
      result.current.addTask({ title: 'Still works', project: '', priority: 'Low' })
    })

    expect(result.current.tasks.some((task) => task.title === 'Still works')).toBe(true)
    expect(result.current.storage.error).toBeTruthy()
    spy.mockRestore()
  })
})

describe('backup round-trip', () => {
  it('replaces the workspace from a snapshot and keeps revs', () => {
    seedWorkspace()
    const { result } = renderWorkspace()

    act(() =>
      result.current.replaceWorkspace(
        snapshotFixture({ tasks: [taskFixture({ title: 'Imported', project: 'Atlas' })], projects: [projectFixture({ name: 'Atlas' })] }),
      ),
    )

    expect(result.current.tasks[0]?.title).toBe('Imported')
    expect(result.current.tasks[0]?.rev).toBeGreaterThanOrEqual(0)
  })
})

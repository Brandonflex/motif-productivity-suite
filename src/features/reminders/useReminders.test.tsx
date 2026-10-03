import { act } from 'react'
import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { WorkspaceProvider } from '@/features/workspace/WorkspaceProvider'
import { useReminders } from '@/hooks/useReminders'
import { DEFAULT_SETTINGS, type Task } from '@/types/workspace'
import { seedWorkspace, taskFixture } from '@/test/utils'

/**
 * The reminder loop is timing-based, so these tests drive it with fake timers
 * and a stubbed Notification constructor. What matters is: it speaks once, it
 * respects the settings, and it never invents a reminder for finished work.
 */

const wrapper = ({ children }: { children: ReactNode }) => <WorkspaceProvider>{children}</WorkspaceProvider>

type NotificationCall = { title: string; body?: string }

class NotificationStub {
  static permission: NotificationPermission = 'granted'
  static instances: NotificationCall[] = []
  static requestPermission = vi.fn(async () => NotificationStub.permission)

  constructor(title: string, options?: NotificationOptions) {
    NotificationStub.instances.push({ title, body: options?.body })
  }
}

/** A task pinned to a time a few minutes from now, on the app's own "today". */
function taskDueIn(minutes: number): Task {
  const now = new Date()
  now.setMinutes(now.getMinutes() + minutes)
  const dueTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return taskFixture({
    id: 'tsk_soon',
    title: 'Standup',
    dueTime,
    dueDate: new Date().toISOString().slice(0, 10),
    status: 'Pending',
  })
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  NotificationStub.instances = []
  NotificationStub.permission = 'granted'
  vi.stubGlobal('Notification', NotificationStub)
  window.localStorage.removeItem('motif:reminders-fired')
  window.localStorage.removeItem('motif:check-in-sent')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('useReminders', () => {
  it('announces a task whose time is close', async () => {
    seedWorkspace({
      settings: { ...DEFAULT_SETTINGS, reminderLeadMinutes: 10, desktopReminders: true, dailyCheckIn: false },
      tasks: [taskDueIn(5)],
    })

    renderHook(() => useReminders(), { wrapper })
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(NotificationStub.instances).toHaveLength(1)
    expect(NotificationStub.instances[0]?.title).toBe('Standup')
    expect(NotificationStub.instances[0]?.body).toMatch(/in 5 min|in 4 min/)
  })

  it('never repeats itself, even across a reload', async () => {
    seedWorkspace({
      settings: { ...DEFAULT_SETTINGS, reminderLeadMinutes: 10, desktopReminders: true, dailyCheckIn: false },
      tasks: [taskDueIn(3)],
    })

    const first = renderHook(() => useReminders(), { wrapper })
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(NotificationStub.instances).toHaveLength(1)

    first.unmount()
    renderHook(() => useReminders(), { wrapper })
    await act(async () => {
      vi.advanceTimersByTime(120_000)
    })

    expect(NotificationStub.instances).toHaveLength(1)
  })

  it('stays quiet for completed work and for far-away times', async () => {
    seedWorkspace({
      settings: { ...DEFAULT_SETTINGS, reminderLeadMinutes: 5, desktopReminders: true, dailyCheckIn: false },
      tasks: [
        { ...taskDueIn(2), id: 'done', title: 'Already finished', status: 'Completed' },
        taskDueIn(120),
      ],
    })

    renderHook(() => useReminders(), { wrapper })
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })

    expect(NotificationStub.instances).toHaveLength(0)
  })

  it('sends one check-in a day, and only while the day is unplanned', async () => {
    seedWorkspace({
      settings: { ...DEFAULT_SETTINGS, dailyCheckIn: true, checkInTime: '00:01', desktopReminders: false },
      tasks: [],
    })

    const { result } = renderHook(() => useReminders(), { wrapper })
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.announced.some((entry) => entry.startsWith('check-in:'))).toBe(true)
    expect(window.localStorage.getItem('motif:check-in-sent')).toBeTruthy()

    // A second mount on the same day stays silent.
    const later = renderHook(() => useReminders(), { wrapper })
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(later.result.current.announced).toHaveLength(0)
  })
})

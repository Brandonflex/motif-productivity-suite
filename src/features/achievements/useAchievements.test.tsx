import { act } from 'react'
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import * as celebrateModule from '@/components/fx/celebrate'
import { WorkspaceProvider } from '@/features/workspace/WorkspaceProvider'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { DEFAULT_SETTINGS } from '@/types/workspace'
import { addDaysIso, todayIso } from '@/lib/dates'
import { focusFixture, renderApp, seedWorkspace, taskFixture } from '@/test/utils'
import { screen } from '@testing-library/react'
import { useAchievementCelebrations, useAchievements } from './useAchievements'

const wrapper = ({ children }: { children: ReactNode }) => <WorkspaceProvider>{children}</WorkspaceProvider>
const today = todayIso()

beforeEach(() => {
  window.localStorage.removeItem('motif:achievements-seen')
  window.localStorage.removeItem('motif:level-seen')
})

describe('useAchievements', () => {
  it('derives the streak, rank and shelf from workspace activity', () => {
    seedWorkspace({
      tasks: [
        taskFixture({ id: 'a', status: 'Completed', completedAt: `${today}T09:00:00.000Z` }),
        taskFixture({ id: 'b', status: 'Completed', completedAt: `${addDaysIso(today, -1)}T09:00:00.000Z` }),
      ],
    })
    const { result } = renderHook(() => useAchievements(), { wrapper })

    expect(result.current.streak.current).toBe(2)
    expect(result.current.xp.xp).toBeGreaterThan(0)
    expect(result.current.shelf.some((state) => state.unlocked)).toBe(true)
    expect(result.current.history.at(-1)?.date).toBe(today)
  })

  it('gets richer as the work lands', () => {
    seedWorkspace({ tasks: [taskFixture()] })
    const { result } = renderHook(() => ({ achievements: useAchievements(), workspace: useWorkspace() }), {
      wrapper,
    })

    const before = result.current.achievements.xp.xp

    act(() => result.current.workspace.setTaskStatus('tsk_test', 'Completed'))

    expect(result.current.achievements.xp.xp).toBeGreaterThan(before)
    expect(result.current.achievements.shelf.some((state) => state.unlocked)).toBe(true)
  })
})

describe('useAchievementCelebrations', () => {
  it('is silent on the first run and records the baseline instead', () => {
    const burst = vi.spyOn(celebrateModule, 'celebrate').mockImplementation(() => {})
    seedWorkspace({ tasks: [taskFixture({ status: 'Completed', completedAt: `${today}T09:00:00.000Z` })] })

    renderApp('/')
    const seen = JSON.parse(window.localStorage.getItem('motif:achievements-seen') as string) as string[]

    expect(burst).not.toHaveBeenCalled()
    expect(Array.isArray(seen)).toBe(true)
    expect(window.localStorage.getItem('motif:level-seen')).toBeTruthy()
    burst.mockRestore()
  })

  it('celebrates a badge the moment it is earned — once', async () => {
    const burst = vi.spyOn(celebrateModule, 'celebrate').mockImplementation(() => {})
    seedWorkspace({ settings: { ...DEFAULT_SETTINGS } })
    // A baseline with no badges yet, so the next completion is genuinely new.
    window.localStorage.setItem('motif:achievements-seen', JSON.stringify([]))
    window.localStorage.setItem('motif:level-seen', JSON.stringify(['1']))

    renderApp('/')
    await screen.findByRole('heading', { name: /dashboard/i })

    const { result } = renderHook(
      () => ({ celebrations: useAchievementCelebrations(), workspace: useWorkspace() }),
      { wrapper },
    )

    act(() => {
      result.current.workspace.addTask({ title: 'First finish', project: '', priority: 'Medium' })
    })
    act(() => {
      result.current.workspace.setTaskStatus(result.current.workspace.tasks[0]!.id, 'Completed')
    })

    const seen = JSON.parse(window.localStorage.getItem('motif:achievements-seen') as string) as string[]
    expect(burst).toHaveBeenCalled()
    expect(seen.length).toBeGreaterThan(0)
    burst.mockRestore()
  })

  it('does not celebrate the same badge twice across mounts', () => {
    const burst = vi.spyOn(celebrateModule, 'celebrate').mockImplementation(() => {})
    seedWorkspace({
      tasks: [taskFixture({ status: 'Completed', completedAt: `${today}T09:00:00.000Z` })],
      focusSessions: [focusFixture({ date: today, minutes: 30 })],
    })

    const first = renderApp('/')
    first.unmount()
    renderApp('/')
    renderApp('/')

    expect(burst).not.toHaveBeenCalled()
    burst.mockRestore()
  })
})

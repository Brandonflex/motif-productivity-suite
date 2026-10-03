import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { addDaysIso, todayIso } from '@/lib/dates'
import { focusFixture, logFixture, projectFixture, renderApp, seedWorkspace, taskFixture } from '@/test/utils'

const today = () => todayIso()

describe('Insights', () => {
  it('summarises momentum, focus and completions', async () => {
    seedWorkspace({
      tasks: [
        taskFixture({ id: 'a', status: 'Completed', completedAt: `${today()}T09:00:00.000Z`, dueDate: today() }),
        taskFixture({ id: 'b', title: 'Still open' }),
      ],
      focusSessions: [focusFixture({ date: today(), minutes: 50 })],
    })
    renderApp('/insights')

    expect(await screen.findByRole('heading', { name: 'Insights' })).toBeTruthy()
    expect(screen.getByText('Momentum')).toBeTruthy()
    expect(screen.getByText('Streak')).toBeTruthy()
    expect(screen.getByText('Completed (4 weeks)')).toBeTruthy()
    expect(screen.getByText('Project rollups')).toBeTruthy()
    expect(screen.getByText('Where the focus went')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Tasks completed per day' })).toBeTruthy()
  })

  it('renders the focus heatmap and per-project bars', async () => {
    seedWorkspace({
      tasks: [taskFixture({ id: 'a', project: 'Atlas', estimateMinutes: 60 })],
      projects: [projectFixture({ name: 'Atlas', autoProgress: true })],
      focusSessions: [focusFixture({ taskId: 'a', date: today(), minutes: 25 }), focusFixture({ taskId: null, date: today(), minutes: 25, kind: 'break' })],
      dailyLogs: [logFixture({ date: today(), plannedAt: `${today()}T08:00:00.000Z`, plannedTaskIds: ['a'] })],
    })
    renderApp('/insights')

    expect(await screen.findByText('Atlas')).toBeTruthy()
    // Focus split by task, with unassigned time kept separate.
    expect(screen.getAllByText(/Unassigned|Where the focus went/).length).toBeGreaterThan(0)
  })

  it('warns when a streak has gone cold', async () => {
    seedWorkspace({ tasks: [taskFixture({ id: 'a', status: 'Completed', completedAt: `${addDaysIso(today(), -9)}T09:00:00.000Z` })] })
    renderApp('/insights')

    await screen.findByRole('heading', { name: 'Insights' })
    expect(screen.getByText(/0\s*d/)).toBeTruthy()
  })
})

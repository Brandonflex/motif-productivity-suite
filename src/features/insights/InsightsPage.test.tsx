import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDaysIso, todayIso } from '@/lib/dates'
import { DEFAULT_SETTINGS } from '@/types/workspace'
import { focusFixture, projectFixture, renderApp, seedWorkspace, taskFixture } from '@/test/utils'

/**
 * Insights is the weekly review: what moved, where the time went, and what the
 * month has been made of. The rhythm graph and the badge shelf are asserted
 * through their accessible labels rather than class names, so the visuals can
 * change without the tests becoming a colour assertion.
 */

const today = todayIso()

function seedRichWorkspace() {
  seedWorkspace({
    settings: { ...DEFAULT_SETTINGS, dailyFocusGoalMinutes: 60 },
    projects: [projectFixture({ id: 'p1', name: 'Studio site', status: 'Active' })],
    tasks: [
      taskFixture({
        id: 'done-1',
        title: 'Ship the case study',
        project: 'Studio site',
        status: 'Completed',
        completedAt: `${addDaysIso(today, -2)}T10:00:00.000Z`,
        energy: 'Deep',
        estimateMinutes: 90,
      }),
      taskFixture({
        id: 'done-2',
        title: 'Reply to the venue',
        status: 'Completed',
        completedAt: `${addDaysIso(today, -2)}T15:00:00.000Z`,
        energy: 'Admin',
      }),
      taskFixture({ id: 'open-1', title: 'Draft the proposal', dueDate: today, priority: 'High' }),
    ],
    focusSessions: [
      focusFixture({
        id: 'f1',
        taskId: 'done-1',
        date: addDaysIso(today, -2),
        startedAt: `${addDaysIso(today, -2)}T09:00:00.000Z`,
        minutes: 50,
      }),
      focusFixture({
        id: 'f2',
        taskId: 'open-1',
        date: addDaysIso(today, -1),
        startedAt: `${addDaysIso(today, -1)}T09:00:00.000Z`,
        minutes: 25,
      }),
    ],
  })
}

describe('InsightsPage', () => {
  it('reports momentum, streak and rank from real activity', async () => {
    seedRichWorkspace()
    renderApp('/insights')

    expect(await screen.findByRole('heading', { name: 'Insights' })).toBeInTheDocument()
    expect(screen.getAllByText('Streak').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Rank').length).toBeGreaterThan(0)
    expect(screen.getByText('Momentum')).toBeInTheDocument()
    expect(screen.getByText('Focus (4 weeks)')).toBeInTheDocument()
    expect(screen.getByText(/^1 · Sketchbook$/)).toBeInTheDocument()
    expect(screen.getAllByText('1h 15m').length).toBeGreaterThan(0)
  })

  it('draws the rhythm graph as a labelled, kind-aware grid', async () => {
    seedRichWorkspace()
    renderApp('/insights')

    const graph = await screen.findByRole('img', { name: /Rhythm for the last 126 days/ })
    expect(graph).toBeInTheDocument()
    // The legend names the flavours, so colour is never the only signal.
    for (const kind of ['deep', 'admin', 'light', 'rest']) {
      expect(screen.getByText(kind)).toBeInTheDocument()
    }
    const cells = within(graph).getAllByRole('button')
    expect(cells.length).toBeGreaterThan(100)
    const labelled = cells.filter((cell) => /finished|Quiet day|Rest day/.test(cell.getAttribute('aria-label') ?? ''))
    expect(labelled.length).toBe(cells.length)
  })

  it('shows rank progress and filters the badge shelf by tier', async () => {
    const user = userEvent.setup()
    seedRichWorkspace()
    renderApp('/insights')

    expect(await screen.findByText('Badges')).toBeInTheDocument()
    expect(screen.getByText(/badges earned/)).toBeInTheDocument()
    expect(screen.getByText(/Next rank:/)).toBeInTheDocument()

    const filters = screen.getByRole('group', { name: 'Filter badges by tier' })
    await user.click(within(filters).getByRole('button', { name: 'Bronze' }))

    const badges = screen.getAllByRole('button', { name: /Bronze badge,/ })
    expect(badges.length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /Legendary badge,/ })).not.toBeInTheDocument()
  })

  it('flips a badge to explain what it takes', async () => {
    const user = userEvent.setup()
    seedRichWorkspace()
    renderApp('/insights')

    const badge = (await screen.findAllByRole('button', { name: /badge,/ }))[0]!
    expect(badge).toHaveAttribute('aria-expanded', 'false')

    await user.click(badge)

    expect(badge).toHaveAttribute('aria-expanded', 'true')
    const back = document.getElementById(badge.getAttribute('aria-controls') as string) as HTMLElement
    expect(back.textContent).toMatch(/Earned|Not yet earned|\d+ \/ \d+/)
  })
})

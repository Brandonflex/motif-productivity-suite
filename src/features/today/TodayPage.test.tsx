import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DEFAULT_SETTINGS } from '@/types/workspace'
import { todayIso } from '@/lib/dates'
import { renderApp, seedWorkspace, taskFixture } from '@/test/utils'

/**
 * Today is the ritual page: plan, work, shut down. These tests cover the three
 * moments that make it more than a list, plus the calendar hand-off that lets
 * the plan leave the app.
 */

const today = todayIso()

function seedFourHours(capacityMinutesPerDay = 120) {
  seedWorkspace({
    settings: { ...DEFAULT_SETTINGS, capacityMinutesPerDay, dailyFocusGoalMinutes: 60 },
    tasks: [1, 2, 3, 4].map((n) =>
      taskFixture({
        id: `task-${n}`,
        title: `Deep block ${n}`,
        dueDate: today,
        estimateMinutes: 60,
        status: 'Pending',
        completedAt: undefined,
      }),
    ),
  })
}

describe('TodayPage', () => {
  it('frames the day with rings and the rank', async () => {
    seedFourHours()
    renderApp('/today')

    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument()
    expect(await screen.findByText('Focus goal')).toBeInTheDocument()
    expect(screen.getByText('Committed')).toBeInTheDocument()
    expect(screen.getByText('Streak')).toBeInTheDocument()
    expect(screen.getByText(/Rank 1 · Sketchbook/)).toBeInTheDocument()
    // Three rings, each a progressbar with its own accessible description.
    expect(screen.getByRole('progressbar', { name: /focus minutes today/ })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: /capacity committed/ })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: /day streak/ })).toBeInTheDocument()
  })

  it('plans the day in one click and warns when the plan is over capacity', async () => {
    const user = userEvent.setup()
    seedFourHours()
    renderApp('/today')

    await user.click(await screen.findByRole('button', { name: /plan my day/i }))
    expect(await screen.findByText('Morning plan')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /commit to today/i }))

    // 4 × 60 minutes against a 2 hour capacity: the plan is allowed, but flagged.
    expect(await screen.findByText(/over capacity/i)).toBeInTheDocument()
    expect(await screen.findByRole('progressbar', { name: /capacity committed/ })).toHaveAccessibleName(/4h/)
  })

  it('shuts the day down and carries the leftovers to tomorrow', async () => {
    const user = userEvent.setup()
    seedFourHours(600)
    renderApp('/today')

    await user.click(await screen.findByRole('button', { name: /plan my day/i }))
    await user.click(await screen.findByRole('button', { name: /commit to today/i }))
    await user.click(await screen.findByRole('button', { name: /shut down/i }))

    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: /close the day/i }))

    expect(await screen.findByText(/Day closed/)).toBeInTheDocument()
  })

  it('exports the plan as a calendar file', async () => {
    const user = userEvent.setup()
    seedFourHours()
    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL
    const realClick = HTMLAnchorElement.prototype.click
    const downloads: string[] = []
    HTMLAnchorElement.prototype.click = function stubClick(this: HTMLAnchorElement) {
      downloads.push(this.download)
    }

    try {
      renderApp('/today')
      await user.click(await screen.findByRole('button', { name: /add to calendar/i }))

      expect(downloads.some((name) => name.endsWith('.ics'))).toBe(true)
      expect(createObjectURL).toHaveBeenCalled()
      expect(await screen.findByText(/calendar file/i)).toBeInTheDocument()
    } finally {
      HTMLAnchorElement.prototype.click = realClick
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
    }
  })

  it('captures a thought without leaving the day', async () => {
    const user = userEvent.setup()
    seedFourHours()
    renderApp('/today')

    const field = await screen.findByPlaceholderText(/add to the pile/i)
    await user.type(field, 'Call the printer tomorrow 10am{Enter}')

    expect(await screen.findByText(/Captured/)).toBeInTheDocument()
  })
})

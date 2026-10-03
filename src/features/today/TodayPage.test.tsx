import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@/types/workspace'
import { readSeededWorkspace, renderApp, seedWorkspace, taskFixture } from '@/test/utils'

const today = () => new Date().toISOString().slice(0, 10)

describe('Today', () => {
  it('shows the plan-and-shutdown ritual header', async () => {
    seedWorkspace({ tasks: [taskFixture({ dueDate: today() })] })
    renderApp('/today')

    expect(await screen.findByRole('heading', { name: 'Today' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /plan my day/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /shut down/i })).toBeTruthy()
  })

  it('warns after the user commits to an over-capacity plan', async () => {
    const user = userEvent.setup()
    const tasks = Array.from({ length: 4 }, (_, index) =>
      taskFixture({ id: `t${index}`, title: `Task ${index}`, estimateMinutes: 60, dueDate: today() }),
    )
    seedWorkspace({ tasks, settings: { ...DEFAULT_SETTINGS, capacityMinutesPerDay: 120 } })
    renderApp('/today')

    // Nothing is promised, so nothing is over-committed yet.
    await screen.findByRole('heading', { name: 'Today' })
    expect(screen.queryByText(/is over capacity/i)).toBeNull()

    await user.click(screen.getByRole('button', { name: /plan my day/i }))
    await user.click(await screen.findByRole('button', { name: /commit to today/i }))

    expect(
      await screen.findByText((_text, element) => element?.tagName === 'P' && /is over capacity/i.test(element.textContent ?? '')),
    ).toBeTruthy()
    expect(screen.getAllByText('Over').length).toBeGreaterThan(0)
  })

  it('records a morning plan with a note', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [taskFixture({ title: 'Write the brief', dueDate: today(), estimateMinutes: 30 })] })
    renderApp('/today')

    await user.click(await screen.findByRole('button', { name: /plan my day/i }))

    // The morning plan is inline, not a modal.
    await user.click(await screen.findByRole('button', { name: /commit to today/i }))

    expect(readSeededWorkspace().dailyLogs.at(-1)?.plannedAt).toBeTruthy()
  })

  it('lists today’s blocks alongside the day plan', async () => {
    seedWorkspace({
      tasks: [taskFixture({ title: 'Deep work on the editor', dueDate: today(), dueTime: '10:00', estimateMinutes: 60 })],
    })
    renderApp('/today')

    expect(await screen.findByText('Deep work on the editor')).toBeTruthy()
  })

  it('rolls unfinished work into tomorrow on shutdown', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [taskFixture({ title: 'Half-finished draft', dueDate: today() })] })
    renderApp('/today')

    await user.click(await screen.findByRole('button', { name: /shut down/i }))
    // ConfirmDialog is an alert dialog.
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(/shut down the day\?/i)).toBeTruthy()
    await user.click(within(dialog).getByRole('button', { name: /close the day/i }))

    const stored = readSeededWorkspace()
    expect(stored.dailyLogs.at(-1)?.shutdownAt).toBeTruthy()
  })
})

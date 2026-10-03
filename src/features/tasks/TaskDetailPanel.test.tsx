import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp, readSeededWorkspace, seedWorkspace, taskFixture, focusFixture } from '@/test/utils'

const openPanel = async (title = 'Draft the launch note') => {
  renderApp('/tasks')
  await screen.findByRole('heading', { name: /^tasks$/i })
  await userEvent.setup().click(screen.getByRole('button', { name: `Open “${title}”` }))
  const panel = await screen.findByRole('dialog')
  // Radix names the sheet after its title, which is the task's own title.
  await within(panel).findByRole('heading', { name: title })
  return panel
}

describe('TaskDetailPanel', () => {
  it('opens the inspector from a task row', async () => {
    seedWorkspace({ tasks: [taskFixture({ id: 'tsk_test', title: 'Draft the launch note', note: 'Context here' })] })

    const panel = await openPanel()

    expect(within(panel).getByRole('heading', { name: 'Draft the launch note' })).toBeTruthy()
    expect(within(panel).getByLabelText('Notes')).toHaveValue('Context here')
  })

  it('saves metadata changes as they are made', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [taskFixture({ id: 'tsk_test', title: 'Draft the launch note' })] })
    const panel = await openPanel()

    await user.click(within(panel).getByLabelText('Priority'))
    await user.click(await screen.findByRole('option', { name: 'High' }))

    await user.clear(within(panel).getByLabelText('Estimate in minutes'))
    await user.type(within(panel).getByLabelText('Estimate in minutes'), '45')

    await waitFor(() => {
      const task = readSeededWorkspace().tasks[0]
      expect(task?.priority).toBe('High')
      expect(task?.estimateMinutes).toBe(45)
    })
  })

  it('stores notes and tags on blur', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [taskFixture({ id: 'tsk_test', title: 'Draft the launch note' })] })
    const panel = await openPanel()

    const notes = within(panel).getByLabelText('Notes')
    await user.type(notes, 'Ask Legal about the wording')
    await user.tab()

    await user.type(within(panel).getByLabelText('Tags'), 'launch, #writing')
    await user.tab()

    await waitFor(() => {
      const task = readSeededWorkspace().tasks[0]
      expect(task?.note).toBe('Ask Legal about the wording')
      expect(task?.tags).toEqual(['launch', 'writing'])
    })
  })

  it('turns a repeating task into the next occurrence instead of completing it', async () => {
    const user = userEvent.setup()
    seedWorkspace({
      tasks: [taskFixture({ id: 'tsk_test', title: 'Draft the launch note', recurrence: { every: 1, unit: 'week' } })],
    })
    const panel = await openPanel()

    await user.click(within(panel).getByRole('button', { name: /complete/i }))

    await waitFor(() => {
      const task = readSeededWorkspace().tasks[0]
      expect(task?.status).not.toBe('Completed')
      expect(task?.dueDate).not.toBe('')
    })
  })

  it('links dependencies and reports what still blocks the task', async () => {
    const user = userEvent.setup()
    seedWorkspace({
      tasks: [
        taskFixture({ id: 'tsk_test', title: 'Draft the launch note' }),
        taskFixture({ id: 'tsk_dep', title: 'Approve the budget' }),
      ],
    })
    const panel = await openPanel()

    expect(within(panel).getByText('Nothing — this can start now.')).toBeTruthy()

    await user.click(within(panel).getByLabelText('Add a dependency'))
    await user.click(await screen.findByRole('option', { name: 'Approve the budget' }))

    await waitFor(() => expect(readSeededWorkspace().tasks.find((task) => task.id === 'tsk_test')?.blockedBy).toEqual(['tsk_dep']))
    expect(within(panel).getByText('Approve the budget')).toBeTruthy()

    await user.click(within(panel).getByRole('button', { name: 'Remove dependency Approve the budget' }))
    await waitFor(() => expect(readSeededWorkspace().tasks.find((task) => task.id === 'tsk_test')?.blockedBy).toEqual([]))
  })

  it('surfaces real focus time against the estimate', async () => {
    const today = new Date().toISOString().slice(0, 10)
    seedWorkspace({
      tasks: [taskFixture({ id: 'tsk_test', title: 'Draft the launch note', estimateMinutes: 60 })],
      focusSessions: [focusFixture({ taskId: 'tsk_test', date: today, minutes: 50 })],
    })
    const panel = await openPanel()

    expect(within(panel).getByText(/50m focused · estimate 1h/)).toBeTruthy()
    expect(within(panel).getByText(/most-focused tasks/)).toBeTruthy()
  })

  it('deletes from the panel and offers an undo', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [taskFixture({ id: 'tsk_test', title: 'Draft the launch note' })] })
    const panel = await openPanel()

    await user.click(within(panel).getByRole('button', { name: /^delete$/i }))

    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Draft the launch note' })).not.toBeInTheDocument())
    expect(readSeededWorkspace().tasks).toHaveLength(0)

    await user.click(await screen.findByRole('button', { name: /^undo$/i }))
    await waitFor(() => expect(readSeededWorkspace().tasks).toHaveLength(1))
  })
})

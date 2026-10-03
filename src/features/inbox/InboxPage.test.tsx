import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { readSeededWorkspace, renderApp, seedWorkspace, taskFixture } from '@/test/utils'

describe('Inbox', () => {
  it('celebrates inbox zero', async () => {
    seedWorkspace({ tasks: [taskFixture({ status: 'Pending' })] })
    renderApp('/inbox')

    expect(await screen.findByRole('heading', { name: 'Inbox' })).toBeTruthy()
    expect(screen.getByText('Inbox zero')).toBeTruthy()
  })

  it('captures straight into the inbox from the quick-add field', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [] })
    renderApp('/inbox')

    const field = await screen.findByPlaceholderText(/brain-dump/i)
    await user.type(field, 'Water the plants{Enter}')

    const stored = readSeededWorkspace()
    expect(stored.tasks).toHaveLength(1)
    expect(stored.tasks[0]?.title).toBe('Water the plants')
    expect(stored.tasks[0]?.status).toBe('Inbox')
  })

  it('triages an item into a project and priority', async () => {
    const user = userEvent.setup()
    seedWorkspace({
      tasks: [taskFixture({ id: 'tsk_inbox', title: 'Call the accountant', status: 'Inbox', project: 'Unassigned' })],
      projects: [],
    })
    renderApp('/inbox')

    const projectField = await screen.findByLabelText('Project for “Call the accountant”')
    await user.clear(projectField)
    await user.type(projectField, 'Finance')
    await user.tab() // commits on blur

    const stored = readSeededWorkspace()
    const task = stored.tasks.find((candidate) => candidate.id === 'tsk_inbox')
    expect(task?.project).toBe('Finance')
    // Project names are derived, so a new one shows up in the summary list.
    expect(stored.projects.some((project) => project.name === 'Finance')).toBe(false)
  })

  it('moves a triaged item onto the main list', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [taskFixture({ id: 'tsk_inbox', title: 'Book the venue', status: 'Inbox' })] })
    renderApp('/inbox')

    await user.click(await screen.findByRole('button', { name: /move to tasks/i }))

    const task = readSeededWorkspace().tasks.find((candidate) => candidate.id === 'tsk_inbox')
    expect(task?.status).toBe('Pending')
  })

  it('dates an item for today and parks it as Someday', async () => {
    const user = userEvent.setup()
    const today = new Date().toISOString().slice(0, 10)
    seedWorkspace({
      tasks: [
        taskFixture({ id: 'a', title: 'Do today item', status: 'Inbox' }),
        taskFixture({ id: 'b', title: 'Parked item', status: 'Inbox' }),
      ],
    })
    renderApp('/inbox')

    // Exact name, so the "Delete “…”" buttons (whose label contains the title) are not matched.
    const doTodayButtons = await screen.findAllByRole('button', { name: 'Do today' })
    await user.click(doTodayButtons[0]!)

    let stored = readSeededWorkspace()
    expect(stored.tasks.find((task) => task.id === 'a')?.dueDate).toBe(today)
    expect(stored.tasks.find((task) => task.id === 'a')?.status).toBe('Pending')

    await user.click(screen.getByRole('button', { name: 'Someday' }))
    stored = readSeededWorkspace()
    const parked = stored.tasks.find((task) => task.id === 'b')
    expect(parked?.status).toBe('Pending')
    expect(parked !== undefined && parked.startDate > today).toBe(true)
  })
})

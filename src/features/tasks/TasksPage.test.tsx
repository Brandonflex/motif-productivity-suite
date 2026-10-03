import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { WORKSPACE_KEY } from '@/lib/storage'
import { renderApp, seedWorkspace, taskFixture } from '@/test/utils'

const openTasksPage = async (title: RegExp = /^tasks$/i) => {
  renderApp('/tasks')
  await screen.findByRole('heading', { name: title })
}

describe('TasksPage', () => {
  it('lists tasks with their project, priority and status', async () => {
    seedWorkspace({
      tasks: [
        taskFixture({ id: 'a', title: 'Write docs', project: 'Docs', priority: 'High' }),
        taskFixture({ id: 'b', title: 'Fix bug', project: 'Platform', status: 'In Progress' }),
      ],
    })

    await openTasksPage()

    expect(screen.getByText('Write docs')).toBeInTheDocument()
    expect(screen.getByText('Fix bug')).toBeInTheDocument()
    expect(screen.getAllByText('High')).not.toHaveLength(0)
    expect(screen.getByText(/2 open/i)).toBeInTheDocument()
  })

  it('focuses search with `/` and opens the create dialog with `n`', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [taskFixture({ title: 'Existing task' })] })

    await openTasksPage()

    await user.keyboard('/')
    const search = screen.getByLabelText(/search tasks/i)
    expect(search).toHaveFocus()

    // Space is a real character here, so the shortcut must not fire mid-typing.
    await user.keyboard('bug fix')
    expect(search).toHaveValue('bug fix')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(document.body)
    await user.keyboard('n')
    expect(await screen.findByRole('heading', { name: /new task/i })).toBeInTheDocument()
  })

  it('filters tasks by search query', async () => {
    const user = userEvent.setup()
    seedWorkspace({
      tasks: [taskFixture({ id: 'a', title: 'Write docs' }), taskFixture({ id: 'b', title: 'Fix bug' })],
    })

    await openTasksPage()

    await user.type(screen.getByLabelText(/search tasks/i), 'bug')

    expect(screen.getByText('Fix bug')).toBeInTheDocument()
    expect(screen.queryByText('Write docs')).not.toBeInTheDocument()
    expect(screen.getByText(/showing 1 of 2 tasks/i)).toBeInTheDocument()
  })

  it('creates a task through the validated dialog and persists it', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [taskFixture()] })

    await openTasksPage()

    await user.click(screen.getByRole('button', { name: /new task/i }))

    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(/title/i), 'Draft the roadmap')
    await user.click(within(dialog).getByRole('button', { name: /create task/i }))

    expect(await screen.findByText('Draft the roadmap')).toBeInTheDocument()

    const stored = JSON.parse(window.localStorage.getItem(WORKSPACE_KEY) as string) as { tasks: unknown[] }
    await waitFor(() => expect(stored.tasks.length).toBe(2))
  })

  it('blocks an empty title with a validation message', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [taskFixture()] })

    await openTasksPage()
    await user.click(screen.getByRole('button', { name: /new task/i }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /create task/i }))

    expect(await within(dialog).findByText(/give the task a title/i)).toBeInTheDocument()
  })

  it('completes a task from the table checkbox', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [taskFixture({ title: 'Toggle me' })] })

    await openTasksPage()

    await user.click(screen.getByRole('checkbox', { name: /mark “toggle me” as complete/i }))

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(WORKSPACE_KEY) as string) as {
        tasks: { status: string }[]
      }
      expect(stored.tasks[0]?.status).toBe('Completed')
    })
  })

  it('deletes a task and restores it through the undo toast', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [taskFixture({ title: 'Delete me' })] })

    await openTasksPage()
    await user.click(screen.getByRole('button', { name: /delete “delete me”/i }))

    expect(screen.queryByText('Delete me')).not.toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: /^undo$/i }))

    expect(await screen.findByText('Delete me')).toBeInTheDocument()
  })

  it('shows an empty state when the workspace has no tasks', async () => {
    seedWorkspace({ tasks: [] })

    await openTasksPage()

    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument()
  })

  it('switches between list, board and matrix views of the same data', async () => {
    const user = userEvent.setup()
    seedWorkspace({
      tasks: [
        taskFixture({ id: 'a', title: 'Urgent and important', priority: 'High', dueDate: '2026-03-05' }),
        taskFixture({ id: 'b', title: 'Someday idea', priority: 'Low', dueDate: '' }),
      ],
    })

    await openTasksPage()
    expect(screen.getByText('Urgent and important')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Board' }))
    expect(screen.getByLabelText(/In Progress column/)).toBeInTheDocument()
    expect(screen.getByText('Urgent and important')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Matrix' }))
    expect(screen.getByText('Do now')).toBeInTheDocument()
    expect(screen.getByText('Drop or defer')).toBeInTheDocument()
    expect(screen.getByText('Someday idea')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'List' }))
    expect(screen.getByLabelText(/search tasks/i)).toBeInTheDocument()
  })

  it('offers the schedule view with a draggable backlog rail', async () => {
    const user = userEvent.setup()
    const today = new Date().toISOString().slice(0, 10)
    seedWorkspace({
      tasks: [
        taskFixture({ id: 'a', title: 'Dated work', dueDate: today, estimateMinutes: 30 }),
        taskFixture({ id: 'b', title: 'Unscheduled work', dueDate: '' }),
      ],
    })

    await openTasksPage()
    await user.click(screen.getByRole('button', { name: 'Schedule' }))

    expect(screen.getByText(/Next 7 days/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open “Unscheduled work”' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dated work, 09:00 to 09:30/ })).toBeInTheDocument()
  })

  it('opens the inspector for a task from the list', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [taskFixture({ id: 'a', title: 'Inspect me' })] })

    await openTasksPage()
    await user.click(screen.getByRole('button', { name: 'Open “Inspect me”' }))

    const panel = await screen.findByRole('dialog')
    expect(within(panel).getByRole('heading', { name: 'Inspect me' })).toBeInTheDocument()
    expect(within(panel).getByLabelText('Notes')).toBeInTheDocument()
  })

  it('remembers the chosen view across renders', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [taskFixture({ title: 'Persisted view' })] })

    await openTasksPage()
    await user.click(screen.getByRole('button', { name: 'Board' }))

    expect(window.localStorage.getItem('motif:tasks-view')).toBe('board')
  })

  it('warns when a column is over its WIP limit', async () => {
    const user = userEvent.setup()
    seedWorkspace({
      tasks: Array.from({ length: 4 }, (_, index) =>
        taskFixture({ id: `w${index}`, title: `Wip ${index}`, status: 'In Progress' }),
      ),
    })

    await openTasksPage()
    await user.click(screen.getByRole('button', { name: 'Board' }))

    expect(screen.getByLabelText(/In Progress column, 4 tasks/)).toBeInTheDocument()
    expect(screen.getAllByText(/limit 3/).length).toBeGreaterThan(0)
  })

  it('saves and reuses a filtered view', async () => {
    const user = userEvent.setup()
    seedWorkspace({
      tasks: [
        taskFixture({ id: 'a', title: 'High one', priority: 'High' }),
        taskFixture({ id: 'b', title: 'Low one', priority: 'Low' }),
      ],
    })

    await openTasksPage()
    await user.click(screen.getByLabelText('Filter by priority'))
    await user.click(await screen.findByRole('option', { name: 'High' }))
    await waitFor(() => expect(screen.queryByText('Low one')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /save this view/i }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('View name'), 'High only')
    await user.click(within(dialog).getByRole('button', { name: /^save/i }))

    // Exact name, so the chip's own "Delete saved view …" button is not matched.
    expect(await screen.findByRole('button', { name: 'High only' })).toBeInTheDocument()
    expect(window.localStorage.getItem(WORKSPACE_KEY)).toContain('High only')
  })
})

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
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /new task/i })).toBeInTheDocument()
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
})

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { WORKSPACE_KEY } from '@/lib/storage'
import { projectFixture, renderApp, seedWorkspace, taskFixture } from '@/test/utils'

const openProjectsPage = async () => {
  renderApp('/projects')
  await screen.findByRole('heading', { name: /^projects$/i })
}

describe('ProjectsPage', () => {
  it('renders project cards with task load', async () => {
    seedWorkspace({
      projects: [projectFixture({ name: 'Brand Refresh', progress: 40 })],
      tasks: [
        taskFixture({ id: 'a', project: 'Brand Refresh', status: 'Completed' }),
        taskFixture({ id: 'b', project: 'Brand Refresh' }),
      ],
    })

    await openProjectsPage()

    expect(screen.getByText('Brand Refresh')).toBeInTheDocument()
    expect(screen.getByText(/1 of 2 tasks complete/i)).toBeInTheDocument()
    expect(screen.getByText('40%')).toBeInTheDocument()
  })

  it('creates a project through the dialog', async () => {
    const user = userEvent.setup()
    seedWorkspace({ projects: [projectFixture()] })

    await openProjectsPage()

    await user.click(screen.getByRole('button', { name: /new project/i }))
    const dialog = await screen.findByRole('dialog')

    await user.type(screen.getByLabelText(/^name$/i), 'Launch plan')
    await user.click(screen.getByRole('button', { name: /create project/i }))

    expect(await screen.findByText('Launch plan')).toBeInTheDocument()
    expect(dialog).not.toBeInTheDocument()
  })

  it('warns before deleting a project and unassigns its tasks', async () => {
    const user = userEvent.setup()
    seedWorkspace({
      projects: [projectFixture({ name: 'Brand Refresh' })],
      tasks: [taskFixture({ id: 'a', project: 'Brand Refresh' })],
    })

    await openProjectsPage()
    await user.click(screen.getByRole('button', { name: /delete brand refresh/i }))

    expect(await screen.findByText(/delete “brand refresh”\?/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^delete project$/i }))

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(WORKSPACE_KEY) as string) as {
        projects: unknown[]
        tasks: { project: string }[]
      }
      expect(stored.projects).toHaveLength(0)
      expect(stored.tasks[0]?.project).toBe('Unassigned')
    })
  })

  it('shows an empty state without projects', async () => {
    seedWorkspace({ projects: [] })

    await openProjectsPage()

    expect(screen.getByText(/no projects yet/i)).toBeInTheDocument()
  })
})

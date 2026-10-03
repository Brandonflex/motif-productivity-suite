import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { SIDEBAR_KEY } from '@/lib/storage'
import { setThemePreference } from '@/lib/theme'
import { projectFixture, renderApp, seedWorkspace, taskFixture } from '@/test/utils'

/**
 * Navigation rail behaviour: active-route marking, live counters, the
 * collapse/expand disclosure and the theme control that replaces the
 * three-way switch once the rail is too narrow to hold it.
 */
describe('AppSidebar', () => {
  afterEach(() => {
    // The theme store keeps module-level state, so hand it back untouched.
    setThemePreference('system')
  })

  it('marks the active route and shows live workspace counters', async () => {
    seedWorkspace({
      projects: [projectFixture({ name: 'Atlas', status: 'Active' })],
      tasks: [taskFixture({ id: 'a' }), taskFixture({ id: 'b', status: 'Completed' })],
    })

    renderApp('/tasks')

    const tasksLink = await screen.findByRole('link', { name: /^tasks/i })
    expect(tasksLink).toHaveAttribute('aria-current', 'page')
    // One open task, one active project — the pills are part of the link name.
    expect(tasksLink).toHaveTextContent('1')
    expect(screen.getByRole('link', { name: /^dashboard/i })).not.toHaveAttribute('aria-current')
  })

  it('collapses the rail, remembers the choice and expands again', async () => {
    const user = userEvent.setup()
    seedWorkspace()
    renderApp('/')

    await screen.findByRole('heading', { name: /dashboard/i })

    const collapse = screen.getByRole('button', { name: /collapse sidebar/i })
    expect(collapse).toHaveAttribute('aria-expanded', 'true')
    expect(collapse).toHaveAttribute('aria-controls', 'app-sidebar')

    await user.click(collapse)

    const expand = await screen.findByRole('button', { name: /expand sidebar/i })
    expect(expand).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
    await waitFor(() => expect(window.localStorage.getItem(SIDEBAR_KEY)).toBe('true'))

    await user.click(expand)

    expect(await screen.findByText('Settings')).toBeInTheDocument()
    await waitFor(() => expect(window.localStorage.getItem(SIDEBAR_KEY)).toBe('false'))
  })

  it('starts collapsed when the stored preference says so', async () => {
    window.localStorage.setItem(SIDEBAR_KEY, 'true')
    seedWorkspace()

    renderApp('/projects')

    expect(await screen.findByRole('button', { name: /expand sidebar/i })).toBeInTheDocument()
    expect(screen.queryByText('Projects')).not.toBeInTheDocument()
  })

  it('cycles light → dark → system from the collapsed rail', async () => {
    setThemePreference('light')
    const user = userEvent.setup()
    seedWorkspace()

    renderApp('/')
    await user.click(await screen.findByRole('button', { name: /collapse sidebar/i }))

    // The rail has its own cycling switch; the mobile header has an identical
    // one (same accessible name, different chrome), so scope to the sidebar.
    const rail = within(document.getElementById('app-sidebar') as HTMLElement)

    await user.click(rail.getByRole('button', { name: /theme: light\. switch to dark theme/i }))
    expect(document.documentElement).toHaveClass('dark')
    await waitFor(() => expect(window.localStorage.getItem('motif:theme')).toBe('dark'))

    await user.click(rail.getByRole('button', { name: /theme: dark\. switch to match system theme/i }))
    expect(document.documentElement).not.toHaveClass('dark')
    // "Follow system" is the absence of a stored preference.
    await waitFor(() => expect(window.localStorage.getItem('motif:theme')).toBeNull())
  })
})

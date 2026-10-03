import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { projectFixture, renderApp, seedWorkspace, taskFixture } from '@/test/utils'

describe('App shell', () => {
  it('renders the dashboard with live workspace statistics', async () => {
    seedWorkspace({
      projects: [projectFixture({ name: 'Brand Refresh', status: 'Active' })],
      tasks: [
        taskFixture({ id: 'a', title: 'Ship the dashboard', status: 'In Progress' }),
        taskFixture({ id: 'b', title: 'Write release notes', status: 'Completed' }),
      ],
    })

    renderApp('/')

    expect(await screen.findByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
    expect(screen.getByText(/here is what is happening in your workspace today/i)).toBeInTheDocument()
    expect(screen.getByText(/^open tasks$/i)).toBeInTheDocument()
    expect(screen.getByText('Ship the dashboard')).toBeInTheDocument()
  })

  it('navigates between views through the sidebar', async () => {
    const user = userEvent.setup()
    seedWorkspace()

    renderApp('/')
    await screen.findByRole('heading', { name: /dashboard/i })

    await user.click(screen.getByRole('link', { name: /^tasks/i }))
    expect(await screen.findByRole('heading', { name: /^tasks$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /^projects/i }))
    expect(await screen.findByRole('heading', { name: /^projects$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /^settings/i }))
    expect(await screen.findByRole('heading', { name: /^settings$/i })).toBeInTheDocument()
  })

  it('renders a real 404 page for unknown routes', async () => {
    renderApp('/nope')

    expect(await screen.findByText(/couldn't find that page/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to dashboard/i })).toBeInTheDocument()
  })

  it('keeps the theme controls available in the header and settings', async () => {
    renderApp('/settings')

    expect(await screen.findByRole('heading', { name: /^settings$/i })).toBeInTheDocument()
    expect(screen.getAllByRole('radiogroup', { name: /colour theme/i }).length).toBeGreaterThan(0)
  })
})

describe('app shell routing', () => {
  it('renders every workspace route', async () => {
    seedWorkspace()
    const routes: Array<[string, RegExp]> = [
      ['/', /dashboard/i],
      ['/today', /^today$/i],
      ['/inbox', /^inbox$/i],
      ['/upcoming', /^upcoming$/i],
      ['/tasks', /^tasks$/i],
      ['/projects', /^projects$/i],
      ['/insights', /^insights$/i],
      ['/settings', /^settings$/i],
    ]

    for (const [route, heading] of routes) {
      const view = renderApp(route)
      expect(await screen.findByRole('heading', { name: heading })).toBeTruthy()
      view.unmount()
    }
  })

  it('shows a not-found page for unknown routes', async () => {
    seedWorkspace()
    renderApp('/nope')

    expect(await screen.findByText(/find that page/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /back to dashboard/i })).toBeTruthy()
  })

  it('opens the command palette with ⌘K and closes it again', async () => {
    const user = userEvent.setup()
    seedWorkspace()
    renderApp('/')

    await screen.findByRole('heading', { name: /dashboard/i })
    await user.keyboard('{Meta>}k{/Meta}')

    const palette = await screen.findByRole('dialog')
    expect(palette).toBeTruthy()
    expect(screen.getByPlaceholderText(/search|jump|command/i)).toBeTruthy()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens quick capture with a bare q and files the task', async () => {
    const user = userEvent.setup()
    seedWorkspace()
    renderApp('/today')

    await screen.findByRole('heading', { name: 'Today' })
    await user.keyboard('q')

    const dialog = await screen.findByRole('dialog')
    // The capture field has a `list` attribute, so its role is combobox.
    const field = within(dialog).getByLabelText('Quick add task')
    await user.type(field, 'Capture this thought tomorrow{Enter}')

    expect(await screen.findByText('Capture this thought')).toBeTruthy()
  })
})

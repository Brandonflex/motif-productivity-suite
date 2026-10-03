import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp, seedWorkspace, taskFixture } from '@/test/utils'

/**
 * Device parity: the same workspace, the same powers, whatever the pointer.
 *
 * jsdom does not evaluate media queries, so these tests assert the *contract*
 * rather than the pixel result: every keyboard-only affordance has a touch
 * twin in the mobile header, the drawer closes itself when you navigate, and
 * the layout utilities that keep content off notches and home indicators are
 * present on the elements that need them.
 */

describe('mobile chrome', () => {
  it('carries capture, search and the theme on the touch header', async () => {
    seedWorkspace({ tasks: [taskFixture({ title: 'Ship the thing' })] })
    renderApp('/')

    await screen.findByRole('heading', { name: /dashboard/i })
    const header = within(screen.getByRole('banner'))

    for (const label of [/open menu/i, /search and commands/i, /capture a task/i, /theme:/i]) {
      expect(header.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('opens and closes the drawer, and gets out of the way on navigation', async () => {
    const user = userEvent.setup()
    seedWorkspace()
    renderApp('/')

    await screen.findByRole('heading', { name: /dashboard/i })
    const header = within(screen.getByRole('banner'))

    await user.click(header.getByRole('button', { name: /open menu/i }))
    expect(await header.findByRole('button', { name: /close menu/i })).toBeInTheDocument()

    // The scrim is a real control, so a tap outside the drawer closes it.
    const scrim = screen.getAllByRole('button', { name: /close menu/i }).at(-1) as HTMLElement
    await user.click(scrim)
    expect(await header.findByRole('button', { name: /open menu/i })).toBeInTheDocument()

    // Escape does the same, for the keyboard that is occasionally attached.
    await user.click(header.getByRole('button', { name: /open menu/i }))
    await user.keyboard('{Escape}')
    expect(await header.findByRole('button', { name: /open menu/i })).toBeInTheDocument()
  })

  it('closes the drawer after a navigation from inside it', async () => {
    const user = userEvent.setup()
    seedWorkspace()
    renderApp('/')

    await screen.findByRole('heading', { name: /dashboard/i })
    const header = within(screen.getByRole('banner'))
    await user.click(header.getByRole('button', { name: /open menu/i }))

    const drawer = document.getElementById('app-sidebar') as HTMLElement
    await user.click(within(drawer).getByRole('link', { name: /^tasks/i }))

    expect(await screen.findByRole('heading', { name: /^tasks$/i })).toBeInTheDocument()
    expect(header.getByRole('button', { name: /open menu/i })).toBeInTheDocument()
  })
})

describe('layout safety', () => {
  it('insets the shell for notches and the home indicator', async () => {
    seedWorkspace()
    const { container } = renderApp('/')

    await screen.findByRole('heading', { name: /dashboard/i })
    const shell = container.querySelector('.h-dvh') as HTMLElement
    expect(shell.className).toContain('safe-area-inset-top')
  })

  it('keeps every overlay inside a small viewport', async () => {
    const user = userEvent.setup()
    seedWorkspace()
    renderApp('/')

    await screen.findByRole('heading', { name: /dashboard/i })
    await user.click(screen.getByRole('button', { name: /capture a task/i }))

    const dialog = await screen.findByRole('dialog')
    // Width is capped relative to the viewport, not to a desktop breakpoint.
    expect(dialog.className).toContain('calc(100%-1.5rem)')
  })
})

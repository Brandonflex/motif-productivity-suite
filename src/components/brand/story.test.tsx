import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ETHOS, ETHOS_SHORT } from '@/content/story'
import { renderApp, seedWorkspace } from '@/test/utils'

/**
 * The story layer: why Motif exists, who it is for, and the promise that makes
 * it worth trusting with someone's week. These are the surfaces that carry the
 * product's soul, so they are asserted like features — because they are.
 */

describe('the welcome', () => {
  it('greets a first visit with three ways in and the promise', async () => {
    seedWorkspace()
    renderApp('/')

    expect(await screen.findByText(ETHOS.lede)).toBeInTheDocument()
    expect(screen.getByText(ETHOS.eyebrow)).toBeInTheDocument()
    for (const step of ['Plan the day', 'Capture anything', 'Watch the rhythm']) {
      expect(screen.getByText(step)).toBeInTheDocument()
    }
    // The promises are visible, not buried in a policy page.
    expect(screen.getAllByText('No account.').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Nothing leaves this browser.').length).toBeGreaterThan(0)
  })

  it('leaves after one dismissal and stays gone', async () => {
    const user = userEvent.setup()
    seedWorkspace()
    const first = renderApp('/')

    await screen.findByText(ETHOS.lede)
    await user.click(screen.getByRole('button', { name: /dismiss the welcome/i }))

    expect(screen.queryByText(ETHOS.lede)).not.toBeInTheDocument()

    first.unmount()
    renderApp('/')
    await screen.findByRole('heading', { name: /dashboard/i })
    expect(screen.queryByText(ETHOS.lede)).not.toBeInTheDocument()
  })

  it('takes the first step straight to the day', async () => {
    const user = userEvent.setup()
    seedWorkspace()
    renderApp('/')

    await screen.findByText(ETHOS.lede)
    await user.click(screen.getByRole('button', { name: /open today/i }))

    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument()
  })

  it('can be turned off and on again from Settings', async () => {
    const user = userEvent.setup()
    seedWorkspace()
    renderApp('/settings')

    // A fresh browser has not seen it yet, so the switch starts on.
    const toggle = await screen.findByRole('switch', { name: /show the welcome card/i })
    expect(toggle).toBeChecked()

    await user.click(toggle)
    await waitFor(() => expect(window.localStorage.getItem('motif:welcomed')).toBe('1'))
    expect(toggle).not.toBeChecked()

    await user.click(toggle)
    await waitFor(() => expect(window.localStorage.getItem('motif:welcomed')).toBeNull())
    expect(toggle).toBeChecked()
  })
})

describe('the story', () => {
  it('is reachable from the sidebar without leaving the workspace', async () => {
    const user = userEvent.setup()
    seedWorkspace()
    renderApp('/')

    await screen.findByRole('heading', { name: /dashboard/i })
    await user.click(screen.getByRole('button', { name: /read why/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: ETHOS.headline })).toBeInTheDocument()
    expect(within(dialog).getByText(/behind a subscription/i)).toBeInTheDocument()
    expect(within(dialog).getByText(/fork it and change the copy/i)).toBeInTheDocument()
  })

  it('reads the mark the way the mark is drawn', async () => {
    const user = userEvent.setup()
    seedWorkspace()
    renderApp('/')

    await screen.findByRole('heading', { name: /dashboard/i })
    await user.click(screen.getByRole('button', { name: /read why/i }))
    const dialog = await screen.findByRole('dialog')

    for (const entry of ETHOS.mark) {
      expect(within(dialog).getByText(entry.part)).toBeInTheDocument()
      expect(within(dialog).getByText(new RegExp(entry.meaning.slice(0, 24)))).toBeInTheDocument()
    }
  })

  it('opens from the command palette too, because people ask at different moments', async () => {
    const user = userEvent.setup()
    seedWorkspace()
    renderApp('/')

    await screen.findByRole('heading', { name: /dashboard/i })
    await user.click(screen.getByRole('button', { name: /search and commands/i }))

    const palette = await screen.findByRole('listbox', { name: /commands/i })
    await user.click(within(palette).getByRole('option', { name: /why motif exists/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: ETHOS.headline })).toBeInTheDocument()
  })
})

describe('touch parity', () => {
  it('gives the mobile header the actions the keyboard has', async () => {
    const user = userEvent.setup()
    seedWorkspace()
    renderApp('/')

    await screen.findByRole('heading', { name: /dashboard/i })

    // Both live in the same header the drawer trigger does, and both work.
    const header = within(screen.getByRole('banner'))
    await user.click(header.getByRole('button', { name: /capture a task/i }))
    const capture = await screen.findByRole('dialog')
    expect(within(capture).getByRole('heading', { name: /capture/i })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await user.click(header.getByRole('button', { name: /search and commands/i }))
    expect(await screen.findByRole('listbox', { name: /commands/i })).toBeInTheDocument()
  })

  it('states the promise in the sidebar, where it is always in sight', async () => {
    seedWorkspace()
    renderApp('/')

    await screen.findByRole('heading', { name: /dashboard/i })
    expect(screen.getByText(new RegExp(ETHOS_SHORT.slice(0, 24)))).toBeInTheDocument()
  })
})

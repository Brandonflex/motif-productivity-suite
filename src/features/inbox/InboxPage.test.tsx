import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { todayIso } from '@/lib/dates'
import { renderApp, seedWorkspace, taskFixture } from '@/test/utils'

/**
 * Inbox is triage, not storage: everything arrives here and leaves with a
 * decision — do it, date it, park it or drop it.
 */

describe('InboxPage', () => {
  it('celebrates inbox zero when nothing is waiting', async () => {
    seedWorkspace({ tasks: [] })
    renderApp('/inbox')

    expect(await screen.findByRole('heading', { name: 'Inbox' })).toBeInTheDocument()
    expect(screen.getByText('Inbox zero')).toBeInTheDocument()
    expect(screen.getByText(/Nothing waiting/)).toBeInTheDocument()
  })

  it('captures straight into the inbox with natural language', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [] })
    renderApp('/inbox')

    const field = await screen.findByPlaceholderText(/Brain-dump it/i)
    await user.type(field, 'Draft the newsletter tomorrow 9am #studio ~30m{Enter}')

    expect(await screen.findByText('Draft the newsletter')).toBeInTheDocument()
    expect(screen.getByText(/1 item to triage/)).toBeInTheDocument()
    // Parsed metadata lands in the triage row, so the decision is informed:
    // `#studio` becomes the project, `~30m` the estimate, `tomorrow 9am` the date.
    expect(screen.getByLabelText(/Project for “Draft the newsletter”/)).toHaveValue('studio')
    expect(screen.getByText(/Captured \d{4}-\d{2}-\d{2}/)).toBeInTheDocument()
  })

  it('triages an item to today in one click', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [taskFixture({ id: 'captured', title: 'Pay the invoice', status: 'Inbox' })] })
    renderApp('/inbox')

    await user.click(await screen.findByRole('button', { name: /Do today/i }))

    expect(await screen.findByText('Inbox zero')).toBeInTheDocument()
  })

  it('parks an item for later without losing it', async () => {
    const user = userEvent.setup()
    const today = todayIso()
    seedWorkspace({
      tasks: [taskFixture({ id: 'parked', title: 'Read the whitepaper', status: 'Inbox', dueDate: today })],
    })
    renderApp('/inbox')

    await user.click(await screen.findByRole('button', { name: /Someday/i }))

    expect(await screen.findByText('Inbox zero')).toBeInTheDocument()
  })

  it('drops an item that should never have been captured', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [taskFixture({ id: 'noise', title: 'Buy a stapler', status: 'Inbox' })] })
    renderApp('/inbox')

    await user.click(await screen.findByRole('button', { name: /Delete “Buy a stapler”/i }))

    expect(await screen.findByText('Inbox zero')).toBeInTheDocument()
  })
})

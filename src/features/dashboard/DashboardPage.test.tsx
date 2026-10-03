import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { todayIso } from '@/lib/dates'
import { renderApp, seedWorkspace, taskFixture } from '@/test/utils'

/** Scopes a query to the card that owns the given title. */
const cardFor = (title: string) => {
  const heading = screen.getByText(title)
  const card = heading.closest('[class*="rounded"]') ?? heading.parentElement
  if (!card) throw new Error(`No card found for “${title}”`)
  return within(card as HTMLElement)
}

describe('DashboardPage', () => {
  it('puts the most urgent open work first and ignores completed tasks', async () => {
    seedWorkspace({
      tasks: [
        taskFixture({ id: 'later', title: 'Later work', dueDate: '2999-01-01' }),
        taskFixture({ id: 'overdue', title: 'Overdue work', dueDate: '2020-01-01' }),
        taskFixture({ id: 'today', title: 'Due right now', dueDate: todayIso() }),
        taskFixture({ id: 'done', title: 'Already finished', status: 'Completed', dueDate: '2020-01-01' }),
      ],
    })

    renderApp('/')

    await screen.findByRole('heading', { name: /dashboard/i })

    const overdue = screen.getByText('Overdue work')
    const today = screen.getByText('Due right now')
    const later = screen.getByText('Later work')

    // Overdue → today → later. `compareDocumentPosition` proves the order
    // without depending on how the rows are marked up.
    expect(overdue.compareDocumentPosition(today) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(today.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    expect(screen.queryByText('Already finished')).not.toBeInTheDocument()
    expect(screen.getByText(/overdue by/i)).toBeInTheDocument()
  })

  it('caps the up-next queue at five rows', async () => {
    seedWorkspace({
      tasks: Array.from({ length: 8 }, (_, index) =>
        taskFixture({ id: `t${index}`, title: `Queued task ${index}`, dueDate: `2026-0${(index % 9) + 1}-0${(index % 9) + 1}` }),
      ),
    })

    renderApp('/')
    await screen.findByRole('heading', { name: /dashboard/i })

    expect(screen.getByText('Queued task 0')).toBeInTheDocument()
    expect(screen.getByText('Queued task 4')).toBeInTheDocument()
    expect(screen.queryByText('Queued task 5')).not.toBeInTheDocument()
  })

  it('surfaces overdue work in the headline stats', async () => {
    seedWorkspace({
      tasks: [
        taskFixture({ id: 'a', title: 'Late one', dueDate: '2020-01-01' }),
        taskFixture({ id: 'b', title: 'Late two', dueDate: '2020-02-02' }),
        taskFixture({ id: 'c', title: 'Due now', dueDate: todayIso() }),
        taskFixture({ id: 'd', title: 'Done', status: 'Completed' }),
      ],
    })

    renderApp('/')
    await screen.findByRole('heading', { name: /dashboard/i })

    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    expect(screen.getByText(/needs attention/i)).toBeInTheDocument()
    expect(screen.getByText('Open tasks')).toBeInTheDocument()
  })

  it('opens the task dialog from the empty state call to action', async () => {
    const user = userEvent.setup()
    seedWorkspace()

    renderApp('/')
    await screen.findByRole('heading', { name: /dashboard/i })

    const emptyCard = cardFor('Up next')
    await user.click(emptyCard.getByRole('button', { name: /create a task/i }))

    // The deep link both navigates and opens the dialog; while the modal is up
    // the page behind it is intentionally hidden from the accessibility tree.
    expect(await screen.findByRole('heading', { name: /new task/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^tasks$/i, hidden: true })).toBeInTheDocument()
  })

  it('links through to the full task list', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [taskFixture({ title: 'Something to do' })] })

    renderApp('/')
    await screen.findByRole('heading', { name: /dashboard/i })

    await user.click(cardFor('Up next').getByRole('link', { name: /view all tasks/i }))
    expect(await screen.findByRole('heading', { name: /^tasks$/i })).toBeInTheDocument()
  })
})

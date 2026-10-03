import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'

/** Queries scoped to the page body, so the sidebar's own "Today" link never collides. */
const main = () => within(document.getElementById('workspace-main') as HTMLElement)
import userEvent from '@testing-library/user-event'
import { addDaysIso, formatFullDate, todayIso } from '@/lib/dates'
import { renderApp, seedWorkspace, taskFixture } from '@/test/utils'

/**
 * Upcoming is Things-3 shaped: a horizon you can read top to bottom, a Someday
 * shelf for work that has no date yet, and one-tap pushing when priorities move.
 */

const today = todayIso()

describe('UpcomingPage', () => {
  it('lays the horizon out day by day and shelves the dateless', async () => {
    seedWorkspace({
      tasks: [
        taskFixture({ id: 'a', title: 'Ship the landing page', dueDate: today, estimateMinutes: 90 }),
        taskFixture({ id: 'b', title: 'Call the accountant', dueDate: addDaysIso(today, 1) }),
        taskFixture({ id: 'c', title: 'Plan the offsite', dueDate: addDaysIso(today, 40) }),
        taskFixture({ id: 'd', title: 'Eventually learn to surf', dueDate: '' }),
      ],
    })
    renderApp('/upcoming')

    expect(await screen.findByRole('heading', { name: 'Upcoming' })).toBeInTheDocument()
    expect(main().getByText('Today')).toBeInTheDocument()
    expect(main().getByText('Tomorrow')).toBeInTheDocument()
    expect(main().getByText('Ship the landing page')).toBeInTheDocument()
    expect(main().getByText('Call the accountant')).toBeInTheDocument()
    expect(main().getByText('Later')).toBeInTheDocument()
    expect(main().getByText('Eventually learn to surf')).toBeInTheDocument()
    expect(main().getByText(/days, day by day/)).toBeInTheDocument()
  })

  it('flags overdue work above the horizon', async () => {
    seedWorkspace({
      tasks: [taskFixture({ id: 'late', title: 'Renew the domain', dueDate: addDaysIso(today, -3) })],
    })
    renderApp('/upcoming')

    expect(await main().findByText('Overdue')).toBeInTheDocument()
    expect(main().getByText('1 task(s)')).toBeInTheDocument()
    expect(main().getByText('Renew the domain')).toBeInTheDocument()
  })

  it('pushes a task a day or a week without opening it', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [taskFixture({ id: 'a', title: 'Water the plants', dueDate: today })] })
    renderApp('/upcoming')

    await user.click(await screen.findByRole('button', { name: /Push “Water the plants” by a week/ }))


    // Moving the only task out of today empties the day but keeps the work visible.
    await screen.findByRole('button', { name: /Push “Water the plants” by one day/ })
    expect(main().queryByText('Today')).not.toBeInTheDocument()
    expect(main().getByText('Water the plants')).toBeInTheDocument()
    expect(main().getByText(formatFullDate(addDaysIso(today, 7)))).toBeInTheDocument()
    expect(main().getByText('Everything has a date. Nice.')).toBeInTheDocument()
  })

  it('reassures when nothing is scheduled', async () => {
    seedWorkspace({ tasks: [] })
    renderApp('/upcoming')

    expect(await main().findByText('Nothing scheduled in the next three weeks')).toBeInTheDocument()
    expect(main().getByText('Everything has a date. Nice.')).toBeInTheDocument()
  })
})

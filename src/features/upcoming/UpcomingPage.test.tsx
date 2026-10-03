import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { addDaysIso, todayIso } from '@/lib/dates'
import { readSeededWorkspace, renderApp, seedWorkspace, taskFixture } from '@/test/utils'

const today = () => todayIso()

describe('Upcoming', () => {
  it('groups work by day and shelves the undated', async () => {
    seedWorkspace({
      tasks: [
        taskFixture({ id: 'late', title: 'Overdue report', dueDate: addDaysIso(today(), -2) }),
        taskFixture({ id: 'now', title: 'Ship the build', dueDate: today() }),
        taskFixture({ id: 'soon', title: 'Client review', dueDate: addDaysIso(today(), 4) }),
        taskFixture({ id: 'later', title: 'Annual planning', dueDate: addDaysIso(today(), 60) }),
        taskFixture({ id: 'someday', title: 'Learn letterpress', dueDate: '' }),
      ],
    })
    renderApp('/upcoming')

    expect(await screen.findByRole('heading', { name: 'Upcoming' })).toBeTruthy()
    expect(screen.getByText('Overdue')).toBeTruthy()
    expect(screen.getByText('Ship the build')).toBeTruthy()
    expect(screen.getByText('Later')).toBeTruthy()
    expect(screen.getByText('Someday')).toBeTruthy()
  })

  it('shows recurrence and blocking badges', async () => {
    seedWorkspace({
      tasks: [
        taskFixture({ id: 'r', title: 'Weekly invoicing', dueDate: today(), recurrence: { every: 1, unit: 'week' } }),
        taskFixture({ id: 'b', title: 'Blocked job', dueDate: today(), blockedBy: ['r'] }),
      ],
    })
    renderApp('/upcoming')

    expect(await screen.findByText('↻ 1w')).toBeTruthy()
    expect(screen.getByText('blocked by 1')).toBeTruthy()
  })

  it('snoozes a task a day and a week', async () => {
    const user = userEvent.setup()
    const target = addDaysIso(today(), 3)
    seedWorkspace({ tasks: [taskFixture({ id: 'tsk_test', title: 'Draft the post', dueDate: target })] })
    renderApp('/upcoming')

    await user.click(await screen.findByRole('button', { name: 'Push “Draft the post” by one day' }))
    expect(readSeededWorkspace().tasks[0]?.dueDate).toBe(addDaysIso(target, 1))

    await user.click(screen.getByRole('button', { name: 'Push “Draft the post” by a week' }))
    expect(readSeededWorkspace().tasks[0]?.dueDate).toBe(addDaysIso(target, 8))
  })

  it('completes a task straight from the schedule', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [taskFixture({ id: 'tsk_test', title: 'Pay the rent', dueDate: today() })] })
    renderApp('/upcoming')

    await user.click(await screen.findByRole('checkbox', { name: 'Mark “Pay the rent” as complete' }))

    expect(readSeededWorkspace().tasks[0]?.status).toBe('Completed')
  })
})

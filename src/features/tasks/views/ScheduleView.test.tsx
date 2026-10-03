import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ScheduleView } from '@/features/tasks/views/ScheduleView'
import { WorkspaceProvider } from '@/features/workspace/WorkspaceProvider'
import { addDaysIso, todayIso } from '@/lib/dates'
import { readSeededWorkspace, seedWorkspace, taskFixture } from '@/test/utils'

const today = () => todayIso()

function renderSchedule(tasks = [taskFixture({ id: 'tsk_test', title: 'Plan me' })]) {
  seedWorkspace({ tasks })
  const onOpen = vi.fn()
  const view = render(
    <WorkspaceProvider>
      <ScheduleView tasks={tasks} onOpen={onOpen} />
    </WorkspaceProvider>,
  )
  return { view, onOpen }
}

describe('ScheduleView', () => {
  it('shows seven day columns in the working window', () => {
    renderSchedule()

    expect(screen.getByRole('group', { name: new RegExp(`${today()}, 0 blocks`) })).toBeTruthy()
    expect(screen.getAllByText('Today').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Tomorrow').length).toBeGreaterThan(0)
    expect(screen.getByText(/09:00–17:30/)).toBeTruthy()
  })

  it('auto-schedules a dated task into its column', () => {
    const tasks = [taskFixture({ id: 'a', title: 'Write the brief', dueDate: today(), estimateMinutes: 60 })]
    renderSchedule(tasks)

    expect(screen.getByRole('button', { name: /Write the brief, 09:00 to 10:00/ })).toBeTruthy()
  })

  it('pins a task that has a fixed time', () => {
    const tasks = [taskFixture({ id: 'a', title: 'Standup', dueDate: today(), dueTime: '11:00', estimateMinutes: 30 })]
    renderSchedule(tasks)

    expect(screen.getByRole('button', { name: /Standup, 11:00 to 11:30/ })).toBeTruthy()
  })

  it('lists overflow work when a day cannot fit everything', async () => {
    const tasks = Array.from({ length: 8 }, (_, index) =>
      taskFixture({ id: `t${index}`, title: `Task ${index}`, dueDate: today(), estimateMinutes: 120 }),
    )
    renderSchedule(tasks)

    expect(await screen.findByText(/\d+ waiting/)).toBeTruthy()
  })

  it('moves a backlog task onto a day by dragging it', () => {
    const tasks = [taskFixture({ id: 'tsk_test', title: 'Plan me', dueDate: '' })]
    renderSchedule(tasks)

    const chip = screen.getByRole('button', { name: 'Open “Plan me”' })
    const dataTransfer = { setData: vi.fn(), getData: () => 'tsk_test' }

    fireEvent.dragStart(chip, { dataTransfer })
    const target = screen.getByRole('group', { name: new RegExp(`${addDaysIso(today(), 2)}, 0 blocks`) })
    fireEvent.dragOver(target)
    fireEvent.drop(target, { dataTransfer })

    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'tsk_test')
    expect(readSeededWorkspace().tasks[0]?.dueDate).toBe(addDaysIso(today(), 2))
  })

  it('offers a keyboard route through the same move', async () => {
    const user = userEvent.setup()
    const tasks = [taskFixture({ id: 'tsk_test', title: 'Plan me', dueDate: '' })]
    renderSchedule(tasks)

    await user.selectOptions(screen.getByLabelText('Plan “Plan me” for'), addDaysIso(today(), 1))

    expect(readSeededWorkspace().tasks[0]?.dueDate).toBe(addDaysIso(today(), 1))
  })

  it('opens a scheduled task when its block is clicked', async () => {
    const user = userEvent.setup()
    const tasks = [taskFixture({ id: 'a', title: 'Write the brief', dueDate: today(), estimateMinutes: 30 })]
    const { onOpen } = renderSchedule(tasks)

    await user.click(screen.getByRole('button', { name: /Write the brief, 09:00 to 09:30/ }))

    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onOpen.mock.calls[0]?.[0]).toMatchObject({ id: 'a', title: 'Write the brief' })
  })

  it('carries overdue work onto today, not onto every future day', () => {
    const tasks = [taskFixture({ id: 'a', title: 'Late thing', dueDate: addDaysIso(today(), -3), estimateMinutes: 30 })]
    renderSchedule(tasks)

    const todayColumn = screen.getByRole('group', { name: new RegExp(`${today()}, 1 blocks`) })
    expect(within(todayColumn).getByText('Late thing')).toBeTruthy()
    expect(screen.getByRole('group', { name: new RegExp(`${addDaysIso(today(), 1)}, 0 blocks`) })).toBeTruthy()
  })
})

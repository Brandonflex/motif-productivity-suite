import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FocusTimer } from '@/features/focus/FocusTimer'
import { WorkspaceProvider } from '@/features/workspace/WorkspaceProvider'
import { readSeededWorkspace, seedWorkspace, taskFixture } from '@/test/utils'

function renderTimer(presetTaskId?: string) {
  seedWorkspace({
    tasks: [
      taskFixture({ id: 'tsk_test', title: 'Write the chapter', status: 'Pending' }),
      taskFixture({ id: 'tsk_inbox', title: 'Unsorted capture', status: 'Inbox' }),
    ],
  })
  return render(
    <WorkspaceProvider>
      <FocusTimer presetTaskId={presetTaskId} />
    </WorkspaceProvider>,
  )
}

describe('FocusTimer', () => {
  it('starts an interval at the configured length', () => {
    renderTimer()

    expect(screen.getByText('25:00')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy()
    expect(screen.getByRole('progressbar', { name: 'Focus interval progress' })).toBeTruthy()
  })

  it('counts down and pauses again', async () => {
    const user = userEvent.setup()
    renderTimer()

    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy()
  })

  it('logs the finished interval and moves to a break', async () => {
    const user = userEvent.setup()
    renderTimer('tsk_test')

    // Shown both as the bound task label and in the picker.
    expect(screen.getAllByText('Write the chapter').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: /log & take a break/i }))

    const stored = readSeededWorkspace()
    expect(stored.focusSessions).toHaveLength(1)
    expect(stored.focusSessions[0]?.taskId).toBe('tsk_test')
    expect(stored.focusSessions[0]?.minutes).toBeGreaterThan(0)
    // Break phase, and the next interval is the short break length.
    expect(screen.getByRole('progressbar', { name: 'Break progress' })).toBeTruthy()
  })

  it('shows the daily focus goal against what has been logged', async () => {
    const user = userEvent.setup()
    renderTimer()

    expect(screen.getByRole('progressbar', { name: 'Daily focus goal' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /log & take a break/i }))

    expect(readSeededWorkspace().focusSessions[0]?.kind).toBe('focus')
  })

  it('never offers inbox items as focus targets', async () => {
    const user = userEvent.setup()
    renderTimer()

    await user.click(screen.getByRole('combobox', { name: 'Task for this focus session' }))

    // Inbox captures are excluded, so only actionable work is selectable.
    expect(await screen.findByRole('option', { name: 'Write the chapter' })).toBeTruthy()
    expect(screen.queryByRole('option', { name: 'Unsorted capture' })).toBeNull()
  })
})

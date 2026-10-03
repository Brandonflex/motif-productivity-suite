import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WORKSPACE_KEY, serializeBackup } from '@/lib/storage'
import { projectFixture, renderApp, seedWorkspace, taskFixture } from '@/test/utils'

const openSettings = async () => {
  renderApp('/settings')
  await screen.findByRole('heading', { name: /^settings$/i })
}

describe('SettingsPage', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark', 'light')
  })

  it('switches the colour theme and persists the choice', async () => {
    const user = userEvent.setup()
    await openSettings()

    const dark = screen.getAllByRole('radio', { name: /dark theme/i })[0]
    await user.click(dark as HTMLElement)

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(window.localStorage.getItem('motif:theme')).toBe('dark')
  })

  it('reports local storage statistics', async () => {
    seedWorkspace({
      tasks: [taskFixture(), taskFixture({ id: 'tsk_2' })],
      projects: [projectFixture()],
    })

    await openSettings()

    expect(screen.getByText(/tasks stored/i)).toBeInTheDocument()
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
    expect(screen.getByText(/last saved/i)).toBeInTheDocument()
  })

  it('exports the workspace as a JSON download', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [taskFixture({ title: 'Exportable' })] })

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const createObjectUrl = vi.fn(() => 'blob:motif')
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: createObjectUrl, revokeObjectURL: vi.fn() }))

    await openSettings()
    await user.click(screen.getByRole('button', { name: /export json/i }))

    expect(clickSpy).toHaveBeenCalled()
    expect(createObjectUrl).toHaveBeenCalled()
    clickSpy.mockRestore()
  })

  it('rejects an invalid backup file', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [taskFixture()] })

    await openSettings()

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['{"hello":"world"}'], 'backup.json', { type: 'application/json' })
    await user.upload(input, file)

    expect(await screen.findByText(/missing the expected tasks\/projects data/i)).toBeInTheDocument()
  })

  it('imports a valid backup after confirmation', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [taskFixture({ title: 'Old task' })] })

    await openSettings()

    const backup = serializeBackup({
      tasks: [taskFixture({ id: 'imported', title: 'Imported task' })],
      projects: [],
    })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, new File([backup], 'backup.json', { type: 'application/json' }))

    expect(await screen.findByText(/replace the current workspace\?/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /import backup/i }))

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(WORKSPACE_KEY) as string) as {
        tasks: { title: string }[]
      }
      expect(stored.tasks).toHaveLength(1)
      expect(stored.tasks[0]?.title).toBe('Imported task')
    })
  })

  it('resets the workspace only after confirmation', async () => {
    const user = userEvent.setup()
    seedWorkspace({ tasks: [taskFixture({ title: 'Doomed' })] })

    await openSettings()
    await user.click(screen.getByRole('button', { name: /reset data/i }))

    expect(await screen.findByText(/reset this workspace\?/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /reset workspace/i }))

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(WORKSPACE_KEY) as string) as {
        tasks: { title: string }[]
      }
      expect(stored.tasks.some((task) => task.title === 'Doomed')).toBe(false)
      expect(stored.tasks.length).toBeGreaterThan(0)
    })
  })
})

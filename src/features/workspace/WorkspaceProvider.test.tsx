import { act } from 'react'
import { renderHook } from '@testing-library/react'
import { type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { WorkspaceProvider } from '@/features/workspace/WorkspaceProvider'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { WORKSPACE_KEY } from '@/lib/storage'
import { projectFixture, readSeededWorkspace, seedWorkspace, taskFixture } from '@/test/utils'

const wrapper = ({ children }: { children: ReactNode }) => <WorkspaceProvider>{children}</WorkspaceProvider>

function renderWorkspace() {
  return renderHook(() => useWorkspace(), { wrapper })
}

function storedSnapshot() {
  const raw = window.localStorage.getItem(WORKSPACE_KEY)
  expect(raw).toBeTruthy()
  return JSON.parse(raw as string) as { tasks: unknown[]; projects: unknown[] }
}

describe('WorkspaceProvider', () => {
  it('loads an existing workspace from storage', () => {
    seedWorkspace({ tasks: [taskFixture({ title: 'Seeded task' })], projects: [projectFixture()] })

    const { result } = renderWorkspace()

    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0]?.title).toBe('Seeded task')
    expect(result.current.storage.available).toBe(true)
  })

  it('adds a task with a generated id and persists it', () => {
    seedWorkspace()

    const { result } = renderWorkspace()
    let createdId = ''

    act(() => {
      const created = result.current.addTask({
        title: '  Ship the release  ',
        project: '',
        priority: 'High',
      })
      createdId = created.id
    })

    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0]?.title).toBe('Ship the release')
    expect(result.current.tasks[0]?.project).toBe('Unassigned')
    expect(createdId).not.toBe('')
    expect(storedSnapshot().tasks).toHaveLength(1)
  })

  it('toggles completion in both directions', () => {
    seedWorkspace({ tasks: [taskFixture({ status: 'In Progress' })] })

    const { result } = renderWorkspace()

    act(() => result.current.toggleTaskStatus('tsk_test'))
    expect(result.current.tasks[0]?.status).toBe('Completed')
    expect(result.current.stats.completedTasks).toBe(1)

    act(() => result.current.toggleTaskStatus('tsk_test'))
    expect(result.current.tasks[0]?.status).toBe('Pending')
  })

  it('removes a task and can restore it (undo)', () => {
    seedWorkspace({ tasks: [taskFixture({ title: 'Undo me' })] })

    const { result } = renderWorkspace()
    let removed = null as ReturnType<typeof result.current.deleteTask>

    act(() => {
      removed = result.current.deleteTask('tsk_test')
    })

    expect(removed).not.toBeNull()
    expect(result.current.tasks).toHaveLength(0)

    act(() => {
      if (removed) result.current.restoreTask(removed)
    })

    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0]?.title).toBe('Undo me')
  })

  it('unassigns tasks when their project is deleted', () => {
    seedWorkspace({
      projects: [projectFixture({ name: 'Brand Refresh' })],
      tasks: [
        taskFixture({ id: 'a', project: 'Brand Refresh' }),
        taskFixture({ id: 'b', project: 'Other' }),
      ],
    })

    const { result } = renderWorkspace()
    let affected = 0

    act(() => {
      affected = result.current.deleteProject('prj_test')
    })

    expect(affected).toBe(1)
    expect(result.current.projects).toHaveLength(0)
    expect(result.current.tasks.find((task) => task.id === 'a')?.project).toBe('Unassigned')
    expect(result.current.tasks.find((task) => task.id === 'b')?.project).toBe('Other')
  })

  it('keeps progress and status consistent', () => {
    seedWorkspace({ projects: [projectFixture({ status: 'Active', progress: 30 })] })

    const { result } = renderWorkspace()

    act(() => result.current.updateProjectProgress('prj_test', 100))
    expect(result.current.projects[0]?.status).toBe('Completed')

    act(() => result.current.updateProjectProgress('prj_test', 250))
    expect(result.current.projects[0]?.progress).toBe(100)

    act(() => result.current.updateProjectStatus('prj_test', 'Paused'))
    expect(result.current.projects[0]?.progress).toBe(90)
  })

  it('replaces the workspace when a backup is imported', () => {
    seedWorkspace()

    const { result } = renderWorkspace()

    act(() =>
      result.current.replaceWorkspace({
        tasks: [taskFixture({ id: 'imported' })],
        projects: [projectFixture({ id: 'imported_prj' })],
      }),
    )

    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.tasks[0]?.id).toBe('imported')
    expect(storedSnapshot().projects).toHaveLength(1)
  })

  it('computes workload statistics', () => {
    seedWorkspace({
      projects: [projectFixture({ status: 'Active' }), projectFixture({ id: 'prj_2', status: 'Planning' })],
      tasks: [
        taskFixture({ id: 'a', status: 'Completed' }),
        taskFixture({ id: 'b', status: 'Pending', dueDate: '2000-01-01' }),
      ],
    })

    const { result } = renderWorkspace()

    expect(result.current.stats).toMatchObject({
      totalTasks: 2,
      completedTasks: 1,
      openTasks: 1,
      overdueTasks: 1,
      completionRate: 50,
      totalProjects: 2,
      activeProjects: 1,
    })
  })

  it('keeps the seeded data intact when re-reading storage', () => {
    const seeded = seedWorkspace({ tasks: [taskFixture()] })

    expect(readSeededWorkspace()).toEqual(seeded)
  })
})

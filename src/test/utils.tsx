import { render, type RenderResult } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { App } from '@/app'
import { WORKSPACE_KEY } from '@/lib/storage'
import type { Project, Task, WorkspaceSnapshot } from '@/types/workspace'

/** Minimal valid project fixture. */
export function projectFixture(overrides: Partial<Project> = {}): Project {
  return {
    id: 'prj_test',
    name: 'Test Project',
    description: 'A project used in tests.',
    status: 'Active',
    progress: 30,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

/** Minimal valid task fixture. */
export function taskFixture(overrides: Partial<Task> = {}): Task {
  return {
    id: 'tsk_test',
    title: 'Test task',
    project: 'Test Project',
    priority: 'Medium',
    status: 'Pending',
    dueDate: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

/** Writes a workspace straight into localStorage, as the app would find it. */
export function seedWorkspace(snapshot: Partial<WorkspaceSnapshot> = {}): WorkspaceSnapshot {
  const full: WorkspaceSnapshot = { tasks: snapshot.tasks ?? [], projects: snapshot.projects ?? [] }
  window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(full))
  return full
}

export function readSeededWorkspace(): WorkspaceSnapshot {
  const raw = window.localStorage.getItem(WORKSPACE_KEY)
  return raw ? (JSON.parse(raw) as WorkspaceSnapshot) : { tasks: [], projects: [] }
}

/** Renders the whole app (router + providers + toaster) at a given route. */
export function renderApp(route = '/'): RenderResult {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
      <Toaster />
    </MemoryRouter>,
  )
}

import { render, type RenderResult } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { App } from '@/app'
import { WORKSPACE_KEY } from '@/lib/storage'
import {
  DEFAULT_SETTINGS,
  type DailyLog,
  type FocusSession,
  type Project,
  type Task,
  type WorkspaceSnapshot,
} from '@/types/workspace'

/** Complete snapshot with every collection present, so tests stay terse. */
export function snapshotFixture(overrides: Partial<WorkspaceSnapshot> = {}): WorkspaceSnapshot {
  return {
    tasks: [],
    projects: [],
    focusSessions: [],
    dailyLogs: [],
    rules: [],
    savedViews: [],
    tombstones: [],
    settings: { ...DEFAULT_SETTINGS },
    ...overrides,
  }
}

/** One focus interval, for analytics and focus-timer tests. */
export function focusFixture(overrides: Partial<FocusSession> = {}): FocusSession {
  return {
    id: 'foc_test',
    taskId: null,
    date: '2026-01-01',
    startedAt: '2026-01-01T09:00:00.000Z',
    minutes: 25,
    kind: 'focus',
    ...overrides,
  }
}

/** One day's plan/shutdown record. */
export function logFixture(overrides: Partial<DailyLog> = {}): DailyLog {
  return {
    date: '2026-01-01',
    plannedAt: '',
    shutdownAt: '',
    plannedTaskIds: [],
    rolledOverTaskIds: [],
    note: '',
    ...overrides,
  }
}

/** Minimal valid project fixture. */
export function projectFixture(overrides: Partial<Project> = {}): Project {
  return {
    id: 'prj_test',
    name: 'Test Project',
    description: 'A project used in tests.',
    status: 'Active',
    progress: 30,
    targetDate: '',
    autoProgress: false,
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    rev: 1,
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
    dueTime: '',
    startDate: '',
    note: '',
    tags: [],
    energy: 'Light',
    estimateMinutes: 0,
    recurrence: null,
    blockedBy: [],
    completedAt: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    rev: 1,
    ...overrides,
  }
}

/** Writes a workspace straight into localStorage, as the app would find it. */
export function seedWorkspace(snapshot: Partial<WorkspaceSnapshot> = {}): WorkspaceSnapshot {
  const full = snapshotFixture(snapshot)
  window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(full))
  return full
}

export function readSeededWorkspace(): WorkspaceSnapshot {
  const raw = window.localStorage.getItem(WORKSPACE_KEY)
  return raw ? (JSON.parse(raw) as WorkspaceSnapshot) : snapshotFixture()
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

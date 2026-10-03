import { createId } from '@/lib/id'
import { normalizeDueDate } from '@/lib/dates'
import {
  type Project,
  type Task,
  type WorkspaceBackup,
  type WorkspaceSnapshot,
  projectSchema,
  taskSchema,
  workspaceBackupSchema,
} from '@/types/workspace'

/**
 * Persistence layer for the local-first workspace.
 *
 * Everything that touches `localStorage` goes through this module so that the
 * app can never crash on startup: quota errors, private-mode restrictions,
 * corrupted JSON and out-of-date schemas are all handled here and reported to
 * the caller instead of bubbling up as an unhandled exception.
 */

export const WORKSPACE_KEY = 'motif:workspace:v2'
export const THEME_KEY = 'motif:theme'
export const SIDEBAR_KEY = 'motif:sidebar-collapsed'

const LEGACY_TASK_KEY = 'motif_tasks_v1'
const LEGACY_PROJECT_KEY = 'motif_projects_v1'
const BACKUP_FORMAT_VERSION = 2

export type LoadStatus = 'empty' | 'loaded' | 'migrated' | 'recovered'

export interface LoadResult {
  snapshot: WorkspaceSnapshot
  status: LoadStatus
  /** Human-readable notes about anything that had to be repaired. */
  warnings: string[]
}

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'quota' | 'unavailable' | 'unknown'; message: string }

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** Access to `localStorage`, or `null` when the browser blocks it. */
export function getBrowserStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    const probe = '__motif_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Validates an array element-by-element so one bad row cannot nuke the file. */
function parseCollection<T>(
  raw: unknown,
  schema: { safeParse(value: unknown): { success: boolean; data?: T } },
  label: string,
  warnings: string[],
): T[] {
  if (!Array.isArray(raw)) return []

  const valid: T[] = []
  let dropped = 0

  for (const item of raw) {
    const result = schema.safeParse(item)
    if (result.success && result.data !== undefined) valid.push(result.data)
    else dropped += 1
  }

  if (dropped > 0) {
    warnings.push(`${dropped} invalid ${label} entr${dropped === 1 ? 'y was' : 'ies were'} skipped while loading.`)
  }
  return valid
}

/** Upgrades pre-v2 records (split keys, `Mar 4`-style due dates). */
function migrateLegacy(storage: StorageLike, warnings: string[]): WorkspaceSnapshot | null {
  const rawTasks = storage.getItem(LEGACY_TASK_KEY)
  const rawProjects = storage.getItem(LEGACY_PROJECT_KEY)
  if (!rawTasks && !rawProjects) return null

  const tasks = parseCollection<Record<string, unknown>>(
    rawTasks ? parseJson(rawTasks) : [],
    { safeParse: (value) => ({ success: true, data: value as Record<string, unknown> }) },
    'task',
    warnings,
  )
  const projects = parseCollection<Record<string, unknown>>(
    rawProjects ? parseJson(rawProjects) : [],
    { safeParse: (value) => ({ success: true, data: value as Record<string, unknown> }) },
    'project',
    warnings,
  )

  const snapshot: WorkspaceSnapshot = {
    tasks: parseCollection<Task>(
      tasks.map((task) => ({ ...task, dueDate: normalizeDueDate(task.dueDate) })),
      taskSchema,
      'task',
      warnings,
    ),
    projects: parseCollection<Project>(projects, projectSchema, 'project', warnings),
  }

  storage.removeItem(LEGACY_TASK_KEY)
  storage.removeItem(LEGACY_PROJECT_KEY)
  warnings.push('Workspace upgraded to the current storage format.')
  return snapshot
}

export function loadWorkspace(storage: StorageLike | null, fallback: WorkspaceSnapshot): LoadResult {
  if (!storage) {
    return {
      snapshot: fallback,
      status: 'recovered',
      warnings: ['Local storage is unavailable — changes will not be saved in this browser.'],
    }
  }

  const raw = storage.getItem(WORKSPACE_KEY)
  if (!raw) {
    const migrated = migrateLegacy(storage, [])
    if (migrated) {
      return { snapshot: migrated, status: 'migrated', warnings: ['Workspace upgraded to the current storage format.'] }
    }
    return { snapshot: fallback, status: 'empty', warnings: [] }
  }

  const parsed = parseJson(raw)
  if (parsed === null || typeof parsed !== 'object') {
    return {
      snapshot: fallback,
      status: 'recovered',
      warnings: ['Saved workspace data was unreadable and has been reset to the sample workspace.'],
    }
  }

  const envelope = parsed as { tasks?: unknown; projects?: unknown }
  const warnings: string[] = []
  const snapshot: WorkspaceSnapshot = {
    tasks: parseCollection<Task>(envelope.tasks, taskSchema, 'task', warnings),
    projects: parseCollection<Project>(envelope.projects, projectSchema, 'project', warnings),
  }

  return { snapshot, status: warnings.length > 0 ? 'recovered' : 'loaded', warnings }
}

export function saveWorkspace(storage: StorageLike | null, snapshot: WorkspaceSnapshot): SaveResult {
  if (!storage) {
    return { ok: false, reason: 'unavailable', message: 'Local storage is unavailable in this browser.' }
  }

  try {
    storage.setItem(WORKSPACE_KEY, JSON.stringify(snapshot))
    return { ok: true }
  } catch (error) {
    const name = error instanceof Error ? error.name : ''
    if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      return {
        ok: false,
        reason: 'quota',
        message: 'Browser storage is full — export a backup and remove some items to keep saving.',
      }
    }
    return {
      ok: false,
      reason: 'unknown',
      message: error instanceof Error ? error.message : 'Could not save workspace data.',
    }
  }
}

export function clearWorkspace(storage: StorageLike | null): void {
  if (!storage) return
  try {
    storage.removeItem(WORKSPACE_KEY)
    storage.removeItem(LEGACY_TASK_KEY)
    storage.removeItem(LEGACY_PROJECT_KEY)
  } catch {
    /* nothing we can do — the caller still resets in-memory state */
  }
}

export function serializeBackup(snapshot: WorkspaceSnapshot, now: Date = new Date()): string {
  const backup: WorkspaceBackup = {
    app: 'motif-productivity-suite',
    version: BACKUP_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    tasks: snapshot.tasks,
    projects: snapshot.projects,
  }
  return JSON.stringify(backup, null, 2)
}

export type ParseBackupResult =
  | { ok: true; snapshot: WorkspaceSnapshot; exportedAt: string }
  | { ok: false; error: string }

/** Validates an uploaded backup file before it is allowed to replace state. */
export function parseBackup(raw: string): ParseBackupResult {
  const parsed = parseJson(raw)
  if (parsed === null || typeof parsed !== 'object') {
    return { ok: false, error: 'That file is not valid JSON.' }
  }

  const result = workspaceBackupSchema.safeParse(parsed)
  if (!result.success) {
    return { ok: false, error: 'That backup file is missing the expected tasks/projects data.' }
  }

  return { ok: true, snapshot: { tasks: result.data.tasks, projects: result.data.projects }, exportedAt: result.data.exportedAt }
}

/** Downloads a value as a file without leaking the object URL. */
export function downloadFile(filename: string, contents: string, mimeType = 'application/json'): void {
  const blob = new Blob([contents], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const backupFilename = (now: Date = new Date()): string =>
  `motif-workspace-backup-${now.toISOString().slice(0, 10)}.json`

/** Seeds a first-run workspace so the app never opens completely blank. */
export function createSampleSnapshot(now: Date = new Date()): WorkspaceSnapshot {
  const stamp = now.toISOString()
  const inDays = (days: number) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days)).toISOString().slice(0, 10)

  return {
    projects: [
      {
        id: createId('prj'),
        name: 'Brand Refresh',
        description: 'Editorial identity pass: type scale, colour tokens and marketing site.',
        status: 'Active',
        progress: 65,
        createdAt: stamp,
      },
      {
        id: createId('prj'),
        name: 'Q4 Roadmap',
        description: 'Scope the next quarter and align stakeholders on the delivery plan.',
        status: 'Planning',
        progress: 15,
        createdAt: stamp,
      },
    ],
    tasks: [
      {
        id: createId('tsk'),
        title: 'Finalize Q4 roadmap presentation',
        project: 'Q4 Roadmap',
        priority: 'High',
        status: 'In Progress',
        dueDate: inDays(2),
        createdAt: stamp,
      },
      {
        id: createId('tsk'),
        title: 'Audit design tokens for contrast',
        project: 'Brand Refresh',
        priority: 'Medium',
        status: 'Pending',
        dueDate: inDays(5),
        createdAt: stamp,
      },
      {
        id: createId('tsk'),
        title: 'Draft the weekly workspace digest',
        project: 'Brand Refresh',
        priority: 'Low',
        status: 'Pending',
        dueDate: '',
        createdAt: stamp,
      },
    ],
  }
}

/**
 * Reads a `File` as text.
 *
 * `Blob.text()` is used when available and `FileReader` is the fallback, which
 * keeps imports working in browsers (and test environments) without it.
 */
export function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the selected file'))
    reader.readAsText(file)
  })
}

import { createId } from '@/lib/id'
import { normalizeDueDate, todayIso } from '@/lib/dates'
import {
  DEFAULT_SETTINGS,
  type AutomationRule,
  type DailyLog,
  type Project,
  type Task,
  type Tombstone,
  type WorkspaceBackup,
  type WorkspaceSnapshot,
  projectSchema,
  taskSchema,
  workspaceBackupSchema,
  workspaceSnapshotSchema,
} from '@/types/workspace'

/**
 * Persistence layer for the local-first workspace.
 *
 * Design notes, borrowed from current local-first practice:
 *   · Every mutation carries a revision + timestamp, so two tabs (or two
 *     devices through an imported backup) can be *merged* rather than one
 *     silently overwriting the other.
 *   · Deletions leave a tombstone that expires after 30 days, which is what
 *     makes a merge of "deleted here, edited there" deterministic.
 *   · Growth is capped on write (focus sessions, daily logs, tombstones) so a
 *     long-lived workspace cannot creep towards the localStorage quota.
 *
 * Nothing here throws: quota errors, private-mode restrictions, corrupted JSON
 * and out-of-date schemas are all handled and reported to the caller.
 */

export const WORKSPACE_KEY = 'motif:workspace:v3'
export const THEME_KEY = 'motif:theme'
export const SIDEBAR_KEY = 'motif:sidebar-collapsed'

/** Older envelopes kept for one-way migration. */
const V2_KEY = 'motif:workspace:v2'
const LEGACY_TASK_KEY = 'motif_tasks_v1'
const LEGACY_PROJECT_KEY = 'motif_projects_v1'

const BACKUP_FORMAT_VERSION = 3
const MAX_FOCUS_SESSIONS = 2000
const MAX_DAILY_LOGS = 400
const MAX_TOMBSTONES = 2000
const TOMBSTONE_TTL_DAYS = 30

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

/** Rejects anything that is not a plain object (arrays, `null`, primitives). */
function asObject(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

/** Upgrades pre-v2 records (split keys, `Mar 4`-style due dates). */
function migrateLegacyV1(storage: StorageLike, warnings: string[]): WorkspaceSnapshot | null {
  const rawTasks = storage.getItem(LEGACY_TASK_KEY)
  const rawProjects = storage.getItem(LEGACY_PROJECT_KEY)
  if (!rawTasks && !rawProjects) return null

  const taskRows = Array.isArray(parseJson(rawTasks ?? '[]')) ? (parseJson(rawTasks ?? '[]') as unknown[]) : []
  const projectRows = Array.isArray(parseJson(rawProjects ?? '[]')) ? (parseJson(rawProjects ?? '[]') as unknown[]) : []

  const snapshot: WorkspaceSnapshot = {
    tasks: parseCollection<Task>(
      taskRows.map((row) => ({ ...asObject(row), dueDate: normalizeDueDate(asObject(row)?.dueDate) })),
      taskSchema,
      'task',
      warnings,
    ),
    projects: parseCollection<Project>(projectRows, projectSchema, 'project', warnings),
    focusSessions: [],
    dailyLogs: [],
    rules: [],
    savedViews: [],
    tombstones: [],
    settings: { ...DEFAULT_SETTINGS },
  }

  storage.removeItem(LEGACY_TASK_KEY)
  storage.removeItem(LEGACY_PROJECT_KEY)
  warnings.push('Workspace upgraded from the legacy format.')
  return snapshot
}

/**
 * Reads the previous envelope and re-validates it against the current schema.
 *
 * New fields all have safe defaults, so an old snapshot parses cleanly and gains
 * the new capabilities the first time it is saved — no manual migration script
 * and no data loss.
 */
function migrateV2(storage: StorageLike, warnings: string[]): WorkspaceSnapshot | null {
  const raw = storage.getItem(V2_KEY)
  if (!raw) return null

  const parsed = workspaceSnapshotSchema.safeParse(parseJson(raw))
  storage.removeItem(V2_KEY)

  if (!parsed.success) {
    warnings.push('Saved workspace data was unreadable and has been reset to the sample workspace.')
    return null
  }

  // Old rows have no revision clock; stamp them so merges treat an edit
  // made now as newer than the migrated data.
  const now = new Date().toISOString()
  const snapshot: WorkspaceSnapshot = {
    ...parsed.data,
    tasks: parsed.data.tasks.map((task) => ({ ...task, updatedAt: task.updatedAt === new Date(0).toISOString() ? now : task.updatedAt })),
    projects: parsed.data.projects.map((project) => ({
      ...project,
      updatedAt: project.updatedAt === new Date(0).toISOString() ? now : project.updatedAt,
    })),
  }

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
    const migrated = migrateV2(storage, []) ?? migrateLegacyV1(storage, [])
    if (migrated) {
      return { snapshot: migrated, status: 'migrated', warnings: ['Workspace upgraded to the current storage format.'] }
    }
    return { snapshot: fallback, status: 'empty', warnings: [] }
  }

  const parsedJson = parseJson(raw)
  if (asObject(parsedJson) === null) {
    return {
      snapshot: fallback,
      status: 'recovered',
      warnings: ['Saved workspace data was unreadable and has been reset to the sample workspace.'],
    }
  }

  const parsed = workspaceSnapshotSchema.safeParse(parsedJson)
  if (!parsed.success) {
    return {
      snapshot: fallback,
      status: 'recovered',
      warnings: ['Saved workspace data did not match the expected shape and has been reset to the sample workspace.'],
    }
  }

  const warnings: string[] = []
  const tasks = parseCollection<Task>(parsedJson && (parsedJson as Record<string, unknown>).tasks, taskSchema, 'task', warnings)
  const projects = parseCollection<Project>(
    parsedJson && (parsedJson as Record<string, unknown>).projects,
    projectSchema,
    'project',
    warnings,
  )

  const snapshot = pruneSnapshot({ ...parsed.data, tasks, projects })
  return { snapshot, status: warnings.length > 0 ? 'recovered' : 'loaded', warnings }
}

export function saveWorkspace(storage: StorageLike | null, snapshot: WorkspaceSnapshot): SaveResult {
  if (!storage) {
    return { ok: false, reason: 'unavailable', message: 'Local storage is unavailable in this browser.' }
  }

  try {
    storage.setItem(WORKSPACE_KEY, JSON.stringify(pruneSnapshot(snapshot)))
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
    storage.removeItem(V2_KEY)
    storage.removeItem(LEGACY_TASK_KEY)
    storage.removeItem(LEGACY_PROJECT_KEY)
  } catch {
    /* nothing we can do — the caller still resets in-memory state */
  }
}

/**
 * Caps unbounded collections so a workspace that is used every day for years
 * still fits in localStorage. Called on every save.
 */
export function pruneSnapshot(snapshot: WorkspaceSnapshot, now: Date = new Date()): WorkspaceSnapshot {
  const cutoff = new Date(now.getTime() - TOMBSTONE_TTL_DAYS * 86_400_000).toISOString()

  return {
    ...snapshot,
    focusSessions: [...snapshot.focusSessions]
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
      .slice(-MAX_FOCUS_SESSIONS),
    dailyLogs: [...snapshot.dailyLogs].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_DAILY_LOGS),
    tombstones: snapshot.tombstones.filter((tombstone) => tombstone.deletedAt >= cutoff).slice(-MAX_TOMBSTONES),
  }
}

// ── Merging ──────────────────────────────────────────────────────────────────

interface Revved {
  id: string
  rev: number
  updatedAt: string
}

function isNewer<T extends Revved>(candidate: T, current: T): boolean {
  if (candidate.rev !== current.rev) return candidate.rev > current.rev
  return candidate.updatedAt > current.updatedAt
}

function mergeCollection<T extends Revved>(local: T[], remote: T[]): T[] {
  const merged = new Map<string, T>()
  for (const item of local) merged.set(item.id, item)
  for (const item of remote) {
    const current = merged.get(item.id)
    if (!current || isNewer(item, current)) merged.set(item.id, item)
  }
  return [...merged.values()]
}

/**
 * Merges two snapshots of the same workspace (another tab, or an imported
 * backup) without losing work: per-entity last-writer-wins by revision, and a
 * tombstone only wins over an edit that is older than the deletion.
 */
export function mergeSnapshots(local: WorkspaceSnapshot, remote: WorkspaceSnapshot): WorkspaceSnapshot {
  const tombstones = new Map<string, Tombstone>()
  for (const tombstone of [...local.tombstones, ...remote.tombstones]) {
    const current = tombstones.get(tombstone.id)
    if (!current || tombstone.deletedAt > current.deletedAt) tombstones.set(tombstone.id, tombstone)
  }

  const tasks = mergeCollection(local.tasks, remote.tasks).filter((task) => {
    const tombstone = tombstones.get(task.id)
    return !tombstone || tombstone.deletedAt < task.updatedAt
  })
  const projects = mergeCollection(local.projects, remote.projects).filter((project) => {
    const tombstone = tombstones.get(project.id)
    return !tombstone || tombstone.deletedAt < project.updatedAt
  })

  const keptTombstones = [...tombstones.values()].filter((tombstone) => {
    const task = tasks.find((candidate) => candidate.id === tombstone.id)
    const project = projects.find((candidate) => candidate.id === tombstone.id)
    return !task && !project
  })

  // Focus sessions and views are immutable records: a plain union is correct.
  const sessions = new Map(local.focusSessions.map((session) => [session.id, session]))
  for (const session of remote.focusSessions) if (!sessions.has(session.id)) sessions.set(session.id, session)

  const rules = mergeCollection(
    local.rules.map((rule, index) => ({ ...rule, rev: index, updatedAt: '' })),
    remote.rules.map((rule, index) => ({ ...rule, rev: index, updatedAt: '' })),
  ).map(({ rev: _rev, updatedAt: _updatedAt, ...rule }) => rule as AutomationRule)

  const views = new Map(local.savedViews.map((view) => [view.id, view]))
  for (const view of remote.savedViews) if (!views.has(view.id)) views.set(view.id, view)

  const logs = new Map<string, DailyLog>()
  for (const log of [...local.dailyLogs, ...remote.dailyLogs]) {
    const current = logs.get(log.date)
    if (!current) logs.set(log.date, log)
    else {
      const currentStamp = current.shutdownAt || current.plannedAt
      const nextStamp = log.shutdownAt || log.plannedAt
      logs.set(
        log.date,
        nextStamp > currentStamp
          ? log
          : {
              ...current,
              plannedTaskIds: [...new Set([...current.plannedTaskIds, ...log.plannedTaskIds])],
              rolledOverTaskIds: [...new Set([...current.rolledOverTaskIds, ...log.rolledOverTaskIds])],
            },
      )
    }
  }

  return {
    tasks,
    projects,
    focusSessions: [...sessions.values()],
    dailyLogs: [...logs.values()],
    rules,
    savedViews: [...views.values()],
    tombstones: keptTombstones,
    // Settings belong to the device the user is typing on.
    settings: local.settings,
  }
}

// ── Backups ──────────────────────────────────────────────────────────────────

export function serializeBackup(snapshot: WorkspaceSnapshot, now: Date = new Date()): string {
  const backup: WorkspaceBackup = {
    app: 'motif-productivity-suite',
    version: BACKUP_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    tasks: snapshot.tasks,
    projects: snapshot.projects,
    focusSessions: snapshot.focusSessions,
    dailyLogs: snapshot.dailyLogs,
    rules: snapshot.rules,
    savedViews: snapshot.savedViews,
    settings: snapshot.settings,
  }
  return JSON.stringify(backup, null, 2)
}

export type ParseBackupResult =
  | { ok: true; snapshot: WorkspaceSnapshot; exportedAt: string }
  | { ok: false; error: string }

/**
 * Validates an uploaded backup before it is allowed to replace state.
 * Old (v2) backups still import: anything the file does not contain keeps its
 * safe default rather than arriving as `undefined`.
 */
export function parseBackup(raw: string): ParseBackupResult {
  const parsed = parseJson(raw)
  if (parsed === null || typeof parsed !== 'object') {
    return { ok: false, error: 'That file is not valid JSON.' }
  }

  const result = workspaceBackupSchema.safeParse(parsed)
  if (!result.success) {
    return { ok: false, error: 'That backup file is missing the expected tasks/projects data.' }
  }

  return {
    ok: true,
    snapshot: {
      tasks: result.data.tasks,
      projects: result.data.projects,
      focusSessions: result.data.focusSessions,
      dailyLogs: result.data.dailyLogs,
      rules: result.data.rules,
      savedViews: result.data.savedViews,
      // An imported file must never rewrite this device's preferences.
      settings: result.data.settings,
      tombstones: [],
    },
    exportedAt: result.data.exportedAt,
  }
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
  const inDays = (days: number) => {
    const date = new Date(now.getTime())
    date.setUTCDate(date.getUTCDate() + days)
    return date.toISOString().slice(0, 10)
  }
  const task = (input: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'rev'>): Task => ({
    id: createId('tsk'),
    createdAt: stamp,
    updatedAt: stamp,
    rev: 1,
    ...input,
  })

  return {
    projects: [
      {
        id: createId('prj'),
        name: 'Brand Refresh',
        description: 'Editorial identity pass: type scale, colour tokens and marketing site.',
        status: 'Active',
        progress: 65,
        targetDate: inDays(21),
        autoProgress: true,
        archived: false,
        createdAt: stamp,
        updatedAt: stamp,
        rev: 1,
      },
      {
        id: createId('prj'),
        name: 'Q4 Roadmap',
        description: 'Scope the next quarter and align stakeholders on the delivery plan.',
        status: 'Planning',
        progress: 15,
        targetDate: inDays(45),
        autoProgress: false,
        archived: false,
        createdAt: stamp,
        updatedAt: stamp,
        rev: 1,
      },
    ],
    tasks: [
      task({
        title: 'Finalize Q4 roadmap presentation',
        project: 'Q4 Roadmap',
        priority: 'High',
        status: 'In Progress',
        dueDate: inDays(2),
        dueTime: '10:00',
        startDate: '',
        note: '',
        tags: ['planning'],
        energy: 'Deep',
        estimateMinutes: 90,
        recurrence: null,
        blockedBy: [],
        completedAt: '',
      }),
      task({
        title: 'Audit design tokens for contrast',
        project: 'Brand Refresh',
        priority: 'Medium',
        status: 'Pending',
        dueDate: inDays(5),
        dueTime: '',
        startDate: '',
        note: '',
        tags: ['design'],
        energy: 'Light',
        estimateMinutes: 45,
        recurrence: null,
        blockedBy: [],
        completedAt: '',
      }),
      task({
        title: 'Weekly review',
        project: 'Brand Refresh',
        priority: 'Low',
        status: 'Pending',
        dueDate: inDays(3),
        dueTime: '16:00',
        startDate: '',
        note: 'Close the loop on the week: what shipped, what slipped, what is next.',
        tags: ['ritual'],
        energy: 'Admin',
        estimateMinutes: 30,
        recurrence: { every: 1, unit: 'week' },
        blockedBy: [],
        completedAt: '',
      }),
    ],
    focusSessions: [],
    dailyLogs: [],
    rules: [],
    savedViews: [],
    tombstones: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}

/** Convenience for anything that needs "today" while building data. */
export const sampleToday = todayIso

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

import { describe, expect, it } from 'vitest'
import {
  WORKSPACE_KEY,
  clearWorkspace,
  createSampleSnapshot,
  loadWorkspace,
  mergeSnapshots,
  parseBackup,
  pruneSnapshot,
  saveWorkspace,
  serializeBackup,
  type StorageLike,
} from '@/lib/storage'
import { focusFixture, logFixture, projectFixture, snapshotFixture, taskFixture } from '@/test/utils'
import type { Task } from '@/types/workspace'

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value
    },
    removeItem: (key) => {
      delete data[key]
    },
  }
}

const empty = snapshotFixture()

describe('loadWorkspace', () => {
  it('returns the fallback when storage is unavailable', () => {
    const fallback = createSampleSnapshot()

    const result = loadWorkspace(null, fallback)

    expect(result.status).toBe('recovered')
    expect(result.snapshot).toEqual(fallback)
    expect(result.warnings[0]).toMatch(/local storage is unavailable/i)
  })

  it('seeds the sample workspace on first run', () => {
    const fallback = createSampleSnapshot()

    const result = loadWorkspace(memoryStorage(), fallback)

    expect(result.status).toBe('empty')
    expect(result.snapshot.tasks.length).toBeGreaterThan(0)
    expect(result.warnings).toEqual([])
  })

  it('recovers from corrupted JSON instead of crashing', () => {
    const fallback = createSampleSnapshot()
    const storage = memoryStorage({ [WORKSPACE_KEY]: '{not json' })

    const result = loadWorkspace(storage, fallback)

    expect(result.status).toBe('recovered')
    expect(result.snapshot).toEqual(fallback)
    expect(result.warnings[0]).toMatch(/unreadable/i)
  })

  it('keeps valid rows and reports the invalid ones', () => {
    const storage = memoryStorage({
      [WORKSPACE_KEY]: JSON.stringify(
        snapshotFixture({
          tasks: [taskFixture(), { id: 'broken' } as Task, { ...taskFixture({ id: 'tsk_2' }), priority: 'Extreme' as never }],
          projects: [projectFixture(), null as never],
        }),
      ),
    })

    const result = loadWorkspace(storage, empty)

    expect(result.status).toBe('recovered')
    expect(result.snapshot.tasks).toHaveLength(2)
    // Unknown priority falls back to the schema default rather than dropping the row.
    expect(result.snapshot.tasks[1]?.priority).toBe('Medium')
    expect(result.snapshot.projects).toHaveLength(1)
    expect(result.warnings.join(' ')).toMatch(/invalid/i)
  })

  it('migrates the legacy v1 keys and normalises their due dates', () => {
    const storage = memoryStorage({
      motif_tasks_v1: JSON.stringify([
        { id: '1', title: 'Legacy task', project: 'Strategy', priority: 'High', status: 'Pending', dueDate: 'Mar 4' },
      ]),
      motif_projects_v1: JSON.stringify([
        { id: 'p1', name: 'Legacy project', description: '', status: 'Active', progress: 40 },
      ]),
    })

    const result = loadWorkspace(storage, empty)

    expect(result.status).toBe('migrated')
    expect(result.snapshot.tasks[0]?.dueDate).toMatch(/^\d{4}-03-04$/)
    expect(result.snapshot.projects[0]?.name).toBe('Legacy project')
    // Legacy keys are cleared so the migration only runs once.
    expect(storage.getItem('motif_tasks_v1')).toBeNull()
    expect(storage.getItem('motif_projects_v1')).toBeNull()
  })
})

describe('saveWorkspace', () => {
  it('round-trips a snapshot', () => {
    const storage = memoryStorage()
    const snapshot = snapshotFixture({ tasks: [taskFixture()], projects: [projectFixture()] })

    expect(saveWorkspace(storage, snapshot)).toEqual({ ok: true })

    const reloaded = loadWorkspace(storage, empty)
    expect(reloaded.snapshot.tasks[0]?.title).toBe('Test task')
    expect(reloaded.status).toBe('loaded')
  })

  it('reports quota failures instead of throwing', () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        const error = new Error('full')
        error.name = 'QuotaExceededError'
        throw error
      },
      removeItem: () => {},
    }

    const result = saveWorkspace(storage, empty)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('quota')
      expect(result.message).toMatch(/storage is full/i)
    }
  })
})

describe('clearWorkspace', () => {
  it('removes the workspace and legacy keys', () => {
    const storage = memoryStorage({ [WORKSPACE_KEY]: '{}', motif_tasks_v1: '[]' })

    clearWorkspace(storage)

    expect(storage.getItem(WORKSPACE_KEY)).toBeNull()
    expect(storage.getItem('motif_tasks_v1')).toBeNull()
  })
})

describe('backups', () => {
  it('serialises and validates a round trip', () => {
    const snapshot = snapshotFixture({ tasks: [taskFixture()], projects: [projectFixture()] })

    const result = parseBackup(serializeBackup(snapshot, new Date('2026-02-03T10:00:00.000Z')))

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.snapshot.tasks).toHaveLength(1)
      expect(result.exportedAt).toBe('2026-02-03T10:00:00.000Z')
    }
  })

  it('rejects files that are not JSON', () => {
    const result = parseBackup('not json at all')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/valid json/i)
  })

  it('rejects JSON without workspace data', () => {
    const result = parseBackup(JSON.stringify({ hello: 'world' }))

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/missing/i)
  })
})

describe('createSampleSnapshot', () => {
  it('produces a schema-valid snapshot with relative due dates', () => {
    const snapshot = createSampleSnapshot(new Date('2026-03-01T00:00:00.000Z'))

    expect(snapshot.projects).toHaveLength(2)
    expect(snapshot.tasks).toHaveLength(3)
    expect(snapshot.tasks[0]?.dueDate).toBe('2026-03-03')
    expect(new Set(snapshot.tasks.map((task) => task.id)).size).toBe(snapshot.tasks.length)
  })
})

describe('mergeSnapshots', () => {
  it('keeps the newest revision of each row', () => {
    const local = snapshotFixture({ tasks: [taskFixture({ id: 'a', title: 'Local title', rev: 1 })] })
    const remote = snapshotFixture({ tasks: [taskFixture({ id: 'a', title: 'Remote title', rev: 2 })] })

    const merged = mergeSnapshots(local, remote)

    expect(merged.tasks).toHaveLength(1)
    expect(merged.tasks[0]?.title).toBe('Remote title')
  })

  it('unions rows that only one side knows about', () => {
    const local = snapshotFixture({ tasks: [taskFixture({ id: 'a' })] })
    const remote = snapshotFixture({ tasks: [taskFixture({ id: 'b' })] })

    expect(mergeSnapshots(local, remote).tasks.map((task) => task.id).sort()).toEqual(['a', 'b'])
  })

  it('lets a deletion win over an older edit but not a newer one', () => {
    const older = taskFixture({ id: 'a', updatedAt: '2026-03-01T00:00:00.000Z', rev: 3 })
    const newer = taskFixture({ id: 'a', updatedAt: '2026-03-10T00:00:00.000Z', rev: 4 })
    const deletedAt = '2026-03-05T00:00:00.000Z'

    const deleted = mergeSnapshots(
      snapshotFixture({ tasks: [older] }),
      snapshotFixture({ tombstones: [{ id: 'a', kind: 'task', deletedAt }] }),
    )
    expect(deleted.tasks).toHaveLength(0)

    const resurrected = mergeSnapshots(
      snapshotFixture({ tasks: [newer] }),
      snapshotFixture({ tombstones: [{ id: 'a', kind: 'task', deletedAt }] }),
    )
    expect(resurrected.tasks).toHaveLength(1)
  })

  it('merges focus sessions and daily logs without duplicating them', () => {
    const local = snapshotFixture({ focusSessions: [focusFixture({ id: 's1' })], dailyLogs: [logFixture()] })
    const remote = snapshotFixture({
      focusSessions: [focusFixture({ id: 's1' }), focusFixture({ id: 's2' })],
      dailyLogs: [logFixture({ shutdownAt: '2026-03-05T18:00:00.000Z' })],
    })

    const merged = mergeSnapshots(local, remote)

    expect(merged.focusSessions.map((session) => session.id).sort()).toEqual(['s1', 's2'])
    expect(merged.dailyLogs).toHaveLength(1)
    expect(merged.dailyLogs[0]?.shutdownAt).toBe('2026-03-05T18:00:00.000Z')
  })
})

describe('migration and pruning', () => {
  it('upgrades a v2 envelope and removes the old key', () => {
    const storage = memoryStorage({
      'motif:workspace:v2': JSON.stringify({
        tasks: [taskFixture({ id: 'old', title: 'From v2' })],
        projects: [projectFixture({ id: 'old_prj' })],
      }),
    })

    const result = loadWorkspace(storage, snapshotFixture())

    expect(result.status).toBe('migrated')
    expect(result.snapshot.tasks[0]?.title).toBe('From v2')
    // Rows from the old envelope get a revision clock so merges behave.
    expect(result.snapshot.tasks[0]?.rev).toBeGreaterThanOrEqual(0)
    expect(storage.getItem('motif:workspace:v2')).toBeNull()
  })

  it('caps focus sessions, logs and expired tombstones on save', () => {
    const sessions = Array.from({ length: 2100 }, (_, index) =>
      focusFixture({ id: `s${index}`, startedAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString() }),
    )
    const old = pruneSnapshot(
      snapshotFixture({
        focusSessions: sessions,
        tombstones: [
          { id: 'ancient', kind: 'task', deletedAt: '2020-01-01T00:00:00.000Z' },
          { id: 'recent', kind: 'task', deletedAt: new Date().toISOString() },
        ],
      }),
    )

    expect(old.focusSessions).toHaveLength(2000)
    // Newest survive the trim.
    expect(old.focusSessions.at(-1)?.id).toBe('s2099')
    expect(old.tombstones.map((tombstone) => tombstone.id)).toEqual(['recent'])
  })
})

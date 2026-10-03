import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import {
  backupFilename,
  createSampleSnapshot,
  downloadFile,
  getBrowserStorage,
  loadWorkspace,
  mergeSnapshots,
  saveWorkspace,
  serializeBackup,
  WORKSPACE_KEY,
} from '@/lib/storage'
import { createId } from '@/lib/id'
import { addDaysIso, describeDueDate, todayIso } from '@/lib/dates'
import { currentStreak, dailyActivity } from '@/lib/analytics'
import { applyRules, type RuleTrigger } from '@/lib/rules'
import { rollForward } from '@/lib/recurrence'
import {
  DEFAULT_SETTINGS,
  UNASSIGNED_PROJECT,
  type AutomationRule,
  type DailyLog,
  type Project,
  type SavedView,
  type Task,
  type TaskStatus,
  type WorkspaceSnapshot,
  workspaceSnapshotSchema,
} from '@/types/workspace'
import { WorkspaceContext, type WorkspaceContextValue, type WorkspaceStats } from './workspace-context'

interface ProviderProps {
  children: ReactNode
  /** Seed used on first run or after a hard reset. */
  createSeed?: () => WorkspaceSnapshot
}

const TITLE_LIMIT = 160

/** Stamps a row as freshly edited so merges know it is the newer version. */
function touch<T extends { rev: number; updatedAt: string }>(row: T, patch: Partial<T> = {}): T {
  return { ...row, ...patch, rev: row.rev + 1, updatedAt: new Date().toISOString() }
}

/** Keeps `autoProgress` projects in step with their tasks (Notion-style rollup). */
function withProjectRollups(snapshot: WorkspaceSnapshot): WorkspaceSnapshot {
  let changed = false

  const projects = snapshot.projects.map((project) => {
    if (!project.autoProgress) return project

    const own = snapshot.tasks.filter((task) => task.project === project.name)
    if (own.length === 0) return project

    const done = own.filter((task) => task.status === 'Completed').length
    const percent = Math.round((done / own.length) * 100)
    const status = percent === 100 ? 'Completed' : project.status === 'Completed' ? 'Active' : project.status

    if (percent === project.progress && status === project.status) return project
    changed = true
    return touch(project, { progress: percent, status })
  })

  return changed ? { ...snapshot, projects } : snapshot
}

function emptyLog(date: string): DailyLog {
  return { date, plannedAt: '', shutdownAt: '', plannedTaskIds: [], rolledOverTaskIds: [], note: '' }
}

export function WorkspaceProvider({ children, createSeed = createSampleSnapshot }: ProviderProps) {
  // Storage and initial state are resolved exactly once per mount.
  const [storage] = useState(() => getBrowserStorage())
  const [initial] = useState(() => loadWorkspace(storage, createSeed()))

  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(initial.snapshot)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    initial.status === 'empty' ? null : new Date().toISOString(),
  )
  const [saveError, setSaveError] = useState<string | null>(null)

  const snapshotRef = useRef(snapshot)
  useEffect(() => {
    snapshotRef.current = snapshot
  }, [snapshot])

  // Surface load-time repairs once, without blocking the first paint.
  useEffect(() => {
    for (const warning of initial.warnings) {
      toast(warning, { icon: '⚠️', duration: 6000 })
    }
    // Intentionally runs once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist on every change.
  useEffect(() => {
    const result = saveWorkspace(storage, snapshot)
    if (result.ok) {
      setLastSavedAt(new Date().toISOString())
      setSaveError(null)
    } else {
      setSaveError(result.message)
    }
  }, [snapshot, storage])

  // ── Cross-tab sync ─────────────────────────────────────────────────────────
  // The `storage` event only fires in *other* documents. Instead of replacing
  // local state (which loses whatever this tab was doing), the two snapshots are
  // merged: newest revision per row, tombstones respected.
  useEffect(() => {
    if (!storage) return

    const onStorageEvent = (event: StorageEvent) => {
      if (event.key !== WORKSPACE_KEY || !event.newValue) return
      try {
        const parsed = workspaceSnapshotSchema.safeParse(JSON.parse(event.newValue))
        if (!parsed.success) return
        setSnapshot((current) => mergeSnapshots(current, parsed.data))
        toast('Workspace merged with another tab', { icon: '🔄' })
      } catch {
        /* a malformed write from elsewhere is ignored, not fatal */
      }
    }

    window.addEventListener('storage', onStorageEvent)
    return () => window.removeEventListener('storage', onStorageEvent)
  }, [storage])

  /** Applies an automation-aware mutation to one task. */
  const mutateTask = useCallback(
    (id: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>, trigger?: RuleTrigger, statusForMatch?: TaskStatus) => {
      setSnapshot((prev) => {
        const existing = prev.tasks.find((task) => task.id === id)
        if (!existing) return prev

        let next = touch(existing, patch as Partial<Task>)
        if (trigger) {
          next = applyRules(next, prev.rules, trigger, { status: statusForMatch ?? next.status }).task
        }

        return withProjectRollups({
          ...prev,
          tasks: prev.tasks.map((task) => (task.id === id ? next : task)),
        })
      })
    },
    [],
  )

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const addTask = useCallback<WorkspaceContextValue['addTask']>((input) => {
    const now = new Date()
    const base: Task = {
      id: createId('tsk'),
      title: input.title.trim().slice(0, TITLE_LIMIT),
      project: input.project?.trim() || UNASSIGNED_PROJECT,
      priority: input.priority,
      // Quick capture lands in the triage queue; decide later (Things/Linear).
      status: input.status ?? 'Inbox',
      dueDate: input.dueDate ?? '',
      dueTime: input.dueTime ?? '',
      startDate: input.startDate ?? '',
      note: input.note ?? '',
      tags: input.tags ?? [],
      energy: input.energy ?? 'Light',
      estimateMinutes: input.estimateMinutes ?? 0,
      recurrence: input.recurrence ?? null,
      blockedBy: input.blockedBy ?? [],
      completedAt: '',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      rev: 1,
    }

    setSnapshot((prev) => {
      const ruled = applyRules(base, prev.rules, 'taskCreated', { status: base.status }).task
      return withProjectRollups({ ...prev, tasks: [ruled, ...prev.tasks] })
    })

    return base
  }, [])

  const updateTask = useCallback<WorkspaceContextValue['updateTask']>(
    (id, patch) => {
      mutateTask(id, patch, patch.status ? 'statusChanged' : undefined, patch.status)
    },
    [mutateTask],
  )

  const deleteTask = useCallback<WorkspaceContextValue['deleteTask']>((id) => {
    const removed = snapshotRef.current.tasks.find((task) => task.id === id) ?? null
    if (!removed) return null

    setSnapshot((prev) =>
      withProjectRollups({
        ...prev,
        tasks: prev.tasks.filter((task) => task.id !== id),
        tombstones: [...prev.tombstones, { id, kind: 'task' as const, deletedAt: new Date().toISOString() }],
      }),
    )
    return removed
  }, [])

  const restoreTask = useCallback<WorkspaceContextValue['restoreTask']>((task) => {
    setSnapshot((prev) =>
      withProjectRollups({
        ...prev,
        tasks: prev.tasks.some((item) => item.id === task.id)
          ? prev.tasks.map((item) => (item.id === task.id ? touch(task) : item))
          : [touch(task), ...prev.tasks],
        tombstones: prev.tombstones.filter((tombstone) => tombstone.id !== task.id),
      }),
    )
  }, [])

  const setTaskStatus = useCallback<WorkspaceContextValue['setTaskStatus']>(
    (id, status) => {
      const task = snapshotRef.current.tasks.find((candidate) => candidate.id === id)
      if (!task || task.status === status) return

      if (status === 'Completed' && task.recurrence) {
        const { patch, rolled, nextDueDate } = rollForward(task)
        mutateTask(id, patch, 'taskCompleted', status)
        if (rolled && nextDueDate) toast.success(`“${task.title}” repeats — next up ${nextDueDate}`)
        return
      }

      mutateTask(id, status === 'Completed' ? { status, completedAt: new Date().toISOString() } : { status, completedAt: '' }, 'statusChanged', status)
    },
    [mutateTask],
  )

  const toggleTaskStatus = useCallback<WorkspaceContextValue['toggleTaskStatus']>(
    (id) => {
      const task = snapshotRef.current.tasks.find((candidate) => candidate.id === id)
      if (!task) return
      setTaskStatus(id, task.status === 'Completed' ? 'Pending' : 'Completed')
    },
    [setTaskStatus],
  )

  const triageTask = useCallback<WorkspaceContextValue['triageTask']>(
    (id, patch) => {
      mutateTask(id, { status: 'Pending', ...patch }, 'statusChanged', 'Pending')
    },
    [mutateTask],
  )

  const snoozeTask = useCallback<WorkspaceContextValue['snoozeTask']>(
    (id, days) => {
      const task = snapshotRef.current.tasks.find((candidate) => candidate.id === id)
      if (!task) return
      const base = task.dueDate && task.dueDate > todayIso() ? task.dueDate : todayIso()
      mutateTask(id, { dueDate: addDaysIso(base, days) })
      toast.success(`“${task.title}” pushed to ${addDaysIso(base, days)}`)
    },
    [mutateTask],
  )

  // ── Projects ───────────────────────────────────────────────────────────────
  const addProject = useCallback<WorkspaceContextValue['addProject']>((input) => {
    const now = new Date().toISOString()
    const project: Project = {
      id: createId('prj'),
      name: input.name.trim().slice(0, 80),
      description: input.description.trim().slice(0, 280),
      status: input.status,
      progress: input.status === 'Completed' ? 100 : 0,
      targetDate: input.targetDate ?? '',
      autoProgress: input.autoProgress ?? true,
      archived: false,
      createdAt: now,
      updatedAt: now,
      rev: 1,
    }
    setSnapshot((prev) => ({ ...prev, projects: [project, ...prev.projects] }))
    return project
  }, [])

  const updateProject = useCallback<WorkspaceContextValue['updateProject']>((id, patch) => {
    setSnapshot((prev) => ({
      ...prev,
      projects: prev.projects.map((project) => (project.id === id ? touch(project, patch as Partial<Project>) : project)),
    }))
  }, [])

  const deleteProject = useCallback<WorkspaceContextValue['deleteProject']>((id) => {
    const project = snapshotRef.current.projects.find((item) => item.id === id)
    if (!project) return 0

    const affected = snapshotRef.current.tasks.filter((task) => task.project === project.name).length
    setSnapshot((prev) => ({
      ...prev,
      projects: prev.projects.filter((item) => item.id !== id),
      tasks: prev.tasks.map((task) =>
        task.project === project.name ? touch(task, { project: UNASSIGNED_PROJECT }) : task,
      ),
      tombstones: [...prev.tombstones, { id, kind: 'project' as const, deletedAt: new Date().toISOString() }],
    }))
    return affected
  }, [])

  const updateProjectProgress = useCallback<WorkspaceContextValue['updateProjectProgress']>((id, progress) => {
    const clamped = Math.max(0, Math.min(100, Math.round(progress)))
    setSnapshot((prev) => ({
      ...prev,
      projects: prev.projects.map((project) =>
        project.id === id
          ? touch(project, {
              progress: clamped,
              // Progress and status should never contradict each other.
              status: clamped === 100 ? 'Completed' : project.status === 'Completed' ? 'Active' : project.status,
            })
          : project,
      ),
    }))
  }, [])

  const updateProjectStatus = useCallback<WorkspaceContextValue['updateProjectStatus']>((id, status) => {
    setSnapshot((prev) => ({
      ...prev,
      projects: prev.projects.map((project) =>
        project.id === id
          ? touch(project, {
              status,
              progress: status === 'Completed' ? 100 : project.progress === 100 ? 90 : project.progress,
            })
          : project,
      ),
    }))
  }, [])

  const recomputeProjectProgress = useCallback<WorkspaceContextValue['recomputeProjectProgress']>((id) => {
    setSnapshot((prev) => {
      const project = prev.projects.find((item) => item.id === id)
      if (!project) return prev
      return withProjectRollups({
        ...prev,
        projects: prev.projects.map((item) => (item.id === id ? { ...item, autoProgress: true } : item)),
      })
    })
  }, [])

  // ── Focus + rituals ────────────────────────────────────────────────────────
  const logFocusSession = useCallback<WorkspaceContextValue['logFocusSession']>((input) => {
    const startedAt = input.startedAt ?? new Date().toISOString()
    const session = {
      id: createId('foc'),
      taskId: input.taskId,
      date: startedAt.slice(0, 10),
      startedAt,
      minutes: Math.max(1, Math.round(input.minutes)),
      kind: input.kind ?? ('focus' as const),
    }

    setSnapshot((prev) => ({ ...prev, focusSessions: [...prev.focusSessions, session] }))

    return session
  }, [])

  const commitPlan = useCallback<WorkspaceContextValue['commitPlan']>((taskIds, note) => {
    const date = todayIso()
    setSnapshot((prev) => {
      const existing = prev.dailyLogs.find((log) => log.date === date) ?? emptyLog(date)
      const next: DailyLog = {
        ...existing,
        plannedAt: new Date().toISOString(),
        plannedTaskIds: taskIds,
        note: note ?? existing.note,
      }
      return {
        ...prev,
        dailyLogs: [...prev.dailyLogs.filter((log) => log.date !== date), next],
      }
    })
  }, [])

  const shutdownDay = useCallback<WorkspaceContextValue['shutdownDay']>((input) => {
    const date = todayIso()
    const tomorrow = addDaysIso(date, 1)

    setSnapshot((prev) => {
      const existing = prev.dailyLogs.find((log) => log.date === date) ?? emptyLog(date)
      const next: DailyLog = {
        ...existing,
        shutdownAt: new Date().toISOString(),
        rolledOverTaskIds: input.rolledOverTaskIds,
        note: input.note ?? existing.note,
      }

      const rolled = new Set(input.rolledOverTaskIds)
      const tasks = prev.tasks.map((task) =>
        rolled.has(task.id) && task.status !== 'Completed'
          ? touch(task, { dueDate: task.dueDate < tomorrow ? tomorrow : task.dueDate, startDate: '' })
          : task,
      )

      return {
        ...withProjectRollups({ ...prev, tasks }),
        dailyLogs: [...prev.dailyLogs.filter((log) => log.date !== date), next],
      }
    })
  }, [])

  // ── Rules + saved views + settings ─────────────────────────────────────────
  const addRule = useCallback<WorkspaceContextValue['addRule']>((rule) => {
    const created: AutomationRule = { ...rule, id: createId('rul') }
    setSnapshot((prev) => ({ ...prev, rules: [...prev.rules, created] }))
    return created
  }, [])

  const updateRule = useCallback<WorkspaceContextValue['updateRule']>((id, patch) => {
    setSnapshot((prev) => ({
      ...prev,
      rules: prev.rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)),
    }))
  }, [])

  const deleteRule = useCallback<WorkspaceContextValue['deleteRule']>((id) => {
    setSnapshot((prev) => ({ ...prev, rules: prev.rules.filter((rule) => rule.id !== id) }))
  }, [])

  const saveView = useCallback<WorkspaceContextValue['saveView']>((view) => {
    const created: SavedView = { ...view, id: createId('viw') }
    setSnapshot((prev) => ({
      ...prev,
      // Re-saving under the same name updates the existing view.
      savedViews: [...prev.savedViews.filter((existing) => existing.name !== view.name), created],
    }))
    return created
  }, [])

  const deleteSavedView = useCallback<WorkspaceContextValue['deleteSavedView']>((id) => {
    setSnapshot((prev) => ({ ...prev, savedViews: prev.savedViews.filter((view) => view.id !== id) }))
  }, [])

  const updateSettings = useCallback<WorkspaceContextValue['updateSettings']>((patch) => {
    setSnapshot((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }, [])

  // ── Workspace level ────────────────────────────────────────────────────────
  const replaceWorkspace = useCallback<WorkspaceContextValue['replaceWorkspace']>((next) => {
    setSnapshot(withProjectRollups({ ...next, settings: snapshotRef.current.settings }))
  }, [])

  const mergeWorkspace = useCallback<WorkspaceContextValue['mergeWorkspace']>((next) => {
    setSnapshot((prev) => mergeSnapshots(prev, next))
  }, [])

  const resetWorkspace = useCallback<WorkspaceContextValue['resetWorkspace']>(() => {
    const seeded = createSeed()
    setSnapshot((prev) => ({ ...seeded, settings: prev.settings }))
  }, [createSeed])

  const exportWorkspace = useCallback<WorkspaceContextValue['exportWorkspace']>(() => {
    downloadFile(backupFilename(), serializeBackup(snapshotRef.current))
  }, [])

  // ── Derived data ───────────────────────────────────────────────────────────
  const value = useMemo<WorkspaceContextValue>(() => {
    const { tasks, projects, focusSessions, dailyLogs, rules, savedViews, settings } = snapshot
    const now = new Date()
    const today = todayIso(now)
    const todayLog = dailyLogs.find((log) => log.date === today) ?? emptyLog(today)

    const stats: WorkspaceStats = (() => {
      let open = 0
      let completed = 0
      let overdue = 0
      let dueToday = 0
      let inbox = 0
      let inProgress = 0

      for (const task of tasks) {
        if (task.status === 'Completed') {
          completed += 1
          continue
        }
        if (task.status === 'Inbox') inbox += 1

        const { tone } = describeDueDate(task.dueDate, false, now)
        const committed = task.status !== 'Inbox'
        if (committed) {
          open += 1
          if (task.status === 'In Progress') inProgress += 1
          if (tone === 'overdue') overdue += 1
          if (tone === 'today') dueToday += 1
        }
      }

      const focusTodayMinutes = focusSessions
        .filter((session) => session.date === today && session.kind === 'focus')
        .reduce((total, session) => total + session.minutes, 0)

      return {
        totalTasks: tasks.length,
        openTasks: open,
        inProgressTasks: inProgress,
        inboxTasks: inbox,
        completedTasks: completed,
        overdueTasks: overdue,
        dueTodayTasks: dueToday,
        completionRate: tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100),
        totalProjects: projects.length,
        activeProjects: projects.filter((project) => project.status === 'Active').length,
        focusTodayMinutes,
        plannedTodayCount: todayLog.plannedTaskIds.length,
        streak: currentStreak(dailyActivity(tasks, focusSessions, 28, now)),
      }
    })()

    const projectNames = Array.from(
      new Set([...projects.map((project) => project.name), ...tasks.map((task) => task.project)]),
    )
      .filter((name) => name && name !== UNASSIGNED_PROJECT)
      .sort((a, b) => a.localeCompare(b))

    const allTags = Array.from(new Set(tasks.flatMap((task) => task.tags))).sort((a, b) => a.localeCompare(b))

    return {
      tasks,
      projects,
      focusSessions,
      dailyLogs,
      rules,
      savedViews,
      settings,
      projectNames,
      allTags,
      todayLog,
      stats,
      storage: {
        available: storage !== null,
        lastSavedAt,
        error: saveError,
        warnings: initial.warnings,
      },
      addTask,
      updateTask,
      deleteTask,
      restoreTask,
      toggleTaskStatus,
      setTaskStatus,
      triageTask,
      snoozeTask,
      addProject,
      updateProject,
      deleteProject,
      updateProjectProgress,
      updateProjectStatus,
      recomputeProjectProgress,
      logFocusSession,
      commitPlan,
      shutdownDay,
      addRule,
      updateRule,
      deleteRule,
      saveView,
      deleteSavedView,
      updateSettings,
      replaceWorkspace,
      mergeWorkspace,
      resetWorkspace,
      exportWorkspace,
    }
  }, [
    snapshot,
    storage,
    lastSavedAt,
    saveError,
    initial.warnings,
    addTask,
    updateTask,
    deleteTask,
    restoreTask,
    toggleTaskStatus,
    setTaskStatus,
    triageTask,
    snoozeTask,
    addProject,
    updateProject,
    deleteProject,
    updateProjectProgress,
    updateProjectStatus,
    recomputeProjectProgress,
    logFocusSession,
    commitPlan,
    shutdownDay,
    addRule,
    updateRule,
    deleteRule,
    saveView,
    deleteSavedView,
    updateSettings,
    replaceWorkspace,
    mergeWorkspace,
    resetWorkspace,
    exportWorkspace,
  ])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export { DEFAULT_SETTINGS }

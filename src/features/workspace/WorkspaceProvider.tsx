import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import {
  backupFilename,
  createSampleSnapshot,
  downloadFile,
  getBrowserStorage,
  loadWorkspace,
  saveWorkspace,
  serializeBackup,
  WORKSPACE_KEY,
} from '@/lib/storage'
import { createId } from '@/lib/id'
import { describeDueDate } from '@/lib/dates'
import {
  UNASSIGNED_PROJECT,
  type Project,
  type Task,
  type WorkspaceSnapshot,
} from '@/types/workspace'
import { WorkspaceContext, type WorkspaceContextValue, type WorkspaceStats } from './workspace-context'

const NOTE_LIMIT = 160

interface ProviderProps {
  children: ReactNode
  /** Seed used on first run or after a hard reset. */
  createSeed?: () => WorkspaceSnapshot
}

export function WorkspaceProvider({ children, createSeed = createSampleSnapshot }: ProviderProps) {
  // Storage and initial state are resolved exactly once per mount.
  const [storage] = useState(() => getBrowserStorage())
  const [initial] = useState(() => loadWorkspace(storage, createSeed()))

  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(initial.snapshot)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(initial.status === 'empty' ? null : new Date().toISOString())
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

  // Keep tabs in sync (the `storage` event only fires in *other* documents).
  useEffect(() => {
    if (!storage) return

    const onStorageEvent = (event: StorageEvent) => {
      if (event.key !== WORKSPACE_KEY || !event.newValue) return
      const next = loadWorkspace(storage, snapshotRef.current)
      setSnapshot(next.snapshot)
      toast('Workspace synced from another tab', { icon: '🔄' })
    }

    window.addEventListener('storage', onStorageEvent)
    return () => window.removeEventListener('storage', onStorageEvent)
  }, [storage])

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const addTask = useCallback<WorkspaceContextValue['addTask']>((input) => {
    const task: Task = {
      id: createId('tsk'),
      title: input.title.trim().slice(0, NOTE_LIMIT),
      project: input.project.trim() || UNASSIGNED_PROJECT,
      priority: input.priority,
      status: input.status ?? 'Pending',
      dueDate: input.dueDate ?? '',
      createdAt: new Date().toISOString(),
    }
    setSnapshot((prev) => ({ ...prev, tasks: [task, ...prev.tasks] }))
    return task
  }, [])

  const updateTask = useCallback<WorkspaceContextValue['updateTask']>((id, patch) => {
    setSnapshot((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    }))
  }, [])

  const deleteTask = useCallback<WorkspaceContextValue['deleteTask']>((id) => {
    const removed = snapshotRef.current.tasks.find((task) => task.id === id) ?? null
    if (!removed) return null
    setSnapshot((prev) => ({ ...prev, tasks: prev.tasks.filter((task) => task.id !== id) }))
    return removed
  }, [])

  const restoreTask = useCallback<WorkspaceContextValue['restoreTask']>((task) => {
    setSnapshot((prev) => (prev.tasks.some((item) => item.id === task.id) ? prev : { ...prev, tasks: [task, ...prev.tasks] }))
  }, [])

  const toggleTaskStatus = useCallback<WorkspaceContextValue['toggleTaskStatus']>((id) => {
    setSnapshot((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) =>
        task.id === id ? { ...task, status: task.status === 'Completed' ? 'Pending' : 'Completed' } : task,
      ),
    }))
  }, [])

  const setTaskStatus = useCallback<WorkspaceContextValue['setTaskStatus']>((id, status) => {
    setSnapshot((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => (task.id === id ? { ...task, status } : task)),
    }))
  }, [])

  // ── Projects ───────────────────────────────────────────────────────────────
  const addProject = useCallback<WorkspaceContextValue['addProject']>((input) => {
    const project: Project = {
      id: createId('prj'),
      name: input.name.trim().slice(0, 80),
      description: input.description.trim().slice(0, 280),
      status: input.status,
      progress: input.status === 'Completed' ? 100 : 0,
      createdAt: new Date().toISOString(),
    }
    setSnapshot((prev) => ({ ...prev, projects: [project, ...prev.projects] }))
    return project
  }, [])

  const updateProject = useCallback<WorkspaceContextValue['updateProject']>((id, patch) => {
    setSnapshot((prev) => ({
      ...prev,
      projects: prev.projects.map((project) => (project.id === id ? { ...project, ...patch } : project)),
    }))
  }, [])

  const deleteProject = useCallback<WorkspaceContextValue['deleteProject']>((id) => {
    const project = snapshotRef.current.projects.find((item) => item.id === id)
    if (!project) return 0

    const affected = snapshotRef.current.tasks.filter((task) => task.project === project.name).length
    setSnapshot((prev) => ({
      projects: prev.projects.filter((item) => item.id !== id),
      tasks: prev.tasks.map((task) =>
        task.project === project.name ? { ...task, project: UNASSIGNED_PROJECT } : task,
      ),
    }))
    return affected
  }, [])

  const updateProjectProgress = useCallback<WorkspaceContextValue['updateProjectProgress']>((id, progress) => {
    const clamped = Math.max(0, Math.min(100, Math.round(progress)))
    setSnapshot((prev) => ({
      ...prev,
      projects: prev.projects.map((project) =>
        project.id === id
          ? {
              ...project,
              progress: clamped,
              // Progress and status should never contradict each other.
              status:
                clamped === 100 ? 'Completed' : project.status === 'Completed' ? 'Active' : project.status,
            }
          : project,
      ),
    }))
  }, [])

  const updateProjectStatus = useCallback<WorkspaceContextValue['updateProjectStatus']>((id, status) => {
    setSnapshot((prev) => ({
      ...prev,
      projects: prev.projects.map((project) =>
        project.id === id
          ? { ...project, status, progress: status === 'Completed' ? 100 : project.progress === 100 ? 90 : project.progress }
          : project,
      ),
    }))
  }, [])

  // ── Workspace level ────────────────────────────────────────────────────────
  const replaceWorkspace = useCallback<WorkspaceContextValue['replaceWorkspace']>((next) => {
    setSnapshot({ tasks: next.tasks, projects: next.projects })
  }, [])

  const resetWorkspace = useCallback<WorkspaceContextValue['resetWorkspace']>(() => {
    setSnapshot(createSeed())
  }, [createSeed])

  const exportWorkspace = useCallback<WorkspaceContextValue['exportWorkspace']>(() => {
    downloadFile(backupFilename(), serializeBackup(snapshotRef.current))
  }, [])

  // ── Derived data ───────────────────────────────────────────────────────────
  const value = useMemo<WorkspaceContextValue>(() => {
    const { tasks, projects } = snapshot

    const stats: WorkspaceStats = (() => {
      let open = 0
      let completed = 0
      let overdue = 0
      let dueToday = 0

      for (const task of tasks) {
        if (task.status === 'Completed') {
          completed += 1
          continue
        }
        open += 1
        const { tone } = describeDueDate(task.dueDate, false)
        if (tone === 'overdue') overdue += 1
        if (tone === 'today') dueToday += 1
      }

      return {
        totalTasks: tasks.length,
        openTasks: open,
        completedTasks: completed,
        overdueTasks: overdue,
        dueTodayTasks: dueToday,
        completionRate: tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100),
        totalProjects: projects.length,
        activeProjects: projects.filter((project) => project.status === 'Active').length,
      }
    })()

    const projectNames = Array.from(
      new Set([...projects.map((project) => project.name), ...tasks.map((task) => task.project)]),
    )
      .filter((name) => name && name !== UNASSIGNED_PROJECT)
      .sort((a, b) => a.localeCompare(b))

    return {
      tasks,
      projects,
      projectNames,
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
      addProject,
      updateProject,
      deleteProject,
      updateProjectProgress,
      updateProjectStatus,
      replaceWorkspace,
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
    addProject,
    updateProject,
    deleteProject,
    updateProjectProgress,
    updateProjectStatus,
    replaceWorkspace,
    resetWorkspace,
    exportWorkspace,
  ])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

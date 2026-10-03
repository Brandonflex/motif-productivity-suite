import { createContext } from 'react'
import type {
  AutomationRule,
  DailyLog,
  FocusSession,
  NewProjectInput,
  NewTaskInput,
  Project,
  ProjectStatus,
  SavedView,
  Task,
  TaskStatus,
  WorkspaceSettings,
  WorkspaceSnapshot,
} from '@/types/workspace'

export interface WorkspaceStats {
  totalTasks: number
  openTasks: number
  inProgressTasks: number
  /** Captured but not triaged yet (Linear-style triage queue). */
  inboxTasks: number
  completedTasks: number
  overdueTasks: number
  dueTodayTasks: number
  completionRate: number
  totalProjects: number
  activeProjects: number
  /** Minutes of focus logged today. */
  focusTodayMinutes: number
  /** Tasks the user committed to during this morning's plan. */
  plannedTodayCount: number
  /** Consecutive days with completions or focus sessions. */
  streak: number
}

export interface WorkspaceStorageState {
  /** `false` when the browser blocks localStorage (private mode, disabled cookies…). */
  available: boolean
  lastSavedAt: string | null
  /** Set when the last write failed (e.g. quota exceeded). */
  error: string | null
  /** Notes about data that had to be repaired while loading. */
  warnings: string[]
}

export interface FocusSessionInput {
  taskId: string | null
  minutes: number
  kind?: 'focus' | 'break'
  startedAt?: string
}

export interface ShutdownInput {
  /** Tasks pushed to tomorrow during the evening ritual. */
  rolledOverTaskIds: string[]
  note?: string
}

export interface WorkspaceContextValue {
  tasks: Task[]
  projects: Project[]
  focusSessions: FocusSession[]
  dailyLogs: DailyLog[]
  rules: AutomationRule[]
  savedViews: SavedView[]
  settings: WorkspaceSettings
  projectNames: string[]
  allTags: string[]
  /** Today's plan log, or a fresh empty one. */
  todayLog: DailyLog
  stats: WorkspaceStats
  storage: WorkspaceStorageState

  addTask: (input: NewTaskInput) => Task
  updateTask: (id: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>) => void
  /** Removes a task and returns it so the caller can offer an undo. */
  deleteTask: (id: string) => Task | null
  restoreTask: (task: Task) => void
  /** Ticks a task off; repeating work rolls forward instead of completing. */
  toggleTaskStatus: (id: string) => void
  setTaskStatus: (id: string, status: TaskStatus) => void
  /** Moves work out of the triage queue onto the board. */
  triageTask: (id: string, patch?: Partial<Omit<Task, 'id' | 'createdAt'>>) => void
  /** Pushes a task's due date out by `days` (keeping its time of day). */
  snoozeTask: (id: string, days: number) => void

  addProject: (input: NewProjectInput) => Project
  updateProject: (id: string, patch: Partial<Omit<Project, 'id' | 'createdAt'>>) => void
  /** Removes a project, unassigns its tasks and returns how many were affected. */
  deleteProject: (id: string) => number
  updateProjectProgress: (id: string, progress: number) => void
  updateProjectStatus: (id: string, status: ProjectStatus) => void
  /** Recomputes a rollup project's progress from its tasks. */
  recomputeProjectProgress: (id: string) => void

  /** Records a finished focus interval (and the daily rollup with it). */
  logFocusSession: (input: FocusSessionInput) => FocusSession
  /** Stores the morning plan: which tasks today is for. */
  commitPlan: (taskIds: string[], note?: string) => void
  /** Evening shutdown: record the review and optionally push work to tomorrow. */
  shutdownDay: (input: ShutdownInput) => void

  addRule: (rule: Omit<AutomationRule, 'id'>) => AutomationRule
  updateRule: (id: string, patch: Partial<Omit<AutomationRule, 'id'>>) => void
  deleteRule: (id: string) => void

  saveView: (view: Omit<SavedView, 'id'>) => SavedView
  deleteSavedView: (id: string) => void

  updateSettings: (patch: Partial<WorkspaceSettings>) => void

  /** Replaces the whole workspace (backup import). */
  replaceWorkspace: (snapshot: WorkspaceSnapshot) => void
  /** Merges another snapshot in, keeping the newest version of every row. */
  mergeWorkspace: (snapshot: WorkspaceSnapshot) => void
  /** Restores the sample workspace. */
  resetWorkspace: () => void
  /** Downloads a JSON backup of the current workspace. */
  exportWorkspace: () => void
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

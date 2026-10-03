import { createContext } from 'react'
import type {
  NewProjectInput,
  NewTaskInput,
  Project,
  ProjectStatus,
  Task,
  TaskStatus,
  WorkspaceSnapshot,
} from '@/types/workspace'

export interface WorkspaceStats {
  totalTasks: number
  openTasks: number
  completedTasks: number
  overdueTasks: number
  dueTodayTasks: number
  completionRate: number
  totalProjects: number
  activeProjects: number
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

export interface WorkspaceContextValue {
  tasks: Task[]
  projects: Project[]
  projectNames: string[]
  stats: WorkspaceStats
  storage: WorkspaceStorageState

  addTask: (input: NewTaskInput) => Task
  updateTask: (id: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>) => void
  /** Removes a task and returns it so the caller can offer an undo. */
  deleteTask: (id: string) => Task | null
  restoreTask: (task: Task) => void
  toggleTaskStatus: (id: string) => void
  setTaskStatus: (id: string, status: TaskStatus) => void

  addProject: (input: NewProjectInput) => Project
  updateProject: (id: string, patch: Partial<Omit<Project, 'id' | 'createdAt'>>) => void
  /** Removes a project, unassigns its tasks and returns how many were affected. */
  deleteProject: (id: string) => number
  updateProjectProgress: (id: string, progress: number) => void
  updateProjectStatus: (id: string, status: ProjectStatus) => void

  /** Replaces the whole workspace (backup import). */
  replaceWorkspace: (snapshot: WorkspaceSnapshot) => void
  /** Restores the sample workspace. */
  resetWorkspace: () => void
  /** Downloads a JSON backup of the current workspace. */
  exportWorkspace: () => void
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

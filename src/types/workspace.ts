import { z } from 'zod'

/**
 * Workspace domain model — v3.
 *
 * Zod schemas are the single source of truth: the TypeScript types are inferred
 * from them and the very same schemas validate everything that comes back from
 * `localStorage` or from an imported backup file. Invalid values fall back to a
 * safe default (`.catch`) instead of taking the whole app down, which is what
 * lets us add fields over time without breaking anyone's saved workspace.
 *
 * Concepts borrowed from mature products (see README for the full mapping):
 *   · `Inbox` status           — Linear triage / Things inbox: capture first, decide later.
 *   · `startDate`              — Things 3: when to *start*, separately from the deadline.
 *   · `recurrence`             — Todoist: completing a repeating task rolls it forward.
 *   · `energy` + `estimate`    — Reclaim/TickTick: schedule by energy and effort, not just date.
 *   · `tags`                   — Todoist labels / Notion multi-select.
 *   · `blockedBy`              — Asana dependencies: a task can wait on another.
 *   · `rev` / `updatedAt`      — local-first merge clock so two tabs can never clobber each other.
 */

export const TASK_PRIORITIES = ['High', 'Medium', 'Low'] as const
export const TASK_STATUSES = ['Inbox', 'Pending', 'In Progress', 'Completed'] as const
export const PROJECT_STATUSES = ['Planning', 'Active', 'Paused', 'Completed'] as const
export const TASK_ENERGIES = ['Deep', 'Light', 'Admin'] as const
export const RECURRENCE_UNITS = ['day', 'week', 'month'] as const

export const UNASSIGNED_PROJECT = 'Unassigned'
export const INBOX_PROJECT = 'Inbox'

export const taskPrioritySchema = z.enum(TASK_PRIORITIES)
export const taskStatusSchema = z.enum(TASK_STATUSES)
export const projectStatusSchema = z.enum(PROJECT_STATUSES)
export const taskEnergySchema = z.enum(TASK_ENERGIES)

export type TaskPriority = z.infer<typeof taskPrioritySchema>
export type TaskStatus = z.infer<typeof taskStatusSchema>
export type ProjectStatus = z.infer<typeof projectStatusSchema>
export type TaskEnergy = z.infer<typeof taskEnergySchema>

/** `YYYY-MM-DD`, or an empty string when no date is set. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .or(z.literal(''))

/** `HH:MM` (24h), used for working-hour preferences. */
export const clockTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

export const recurrenceSchema = z.object({
  every: z.coerce.number().int().min(1).max(365).catch(1),
  unit: z.enum(RECURRENCE_UNITS).catch('week'),
})

export type Recurrence = z.infer<typeof recurrenceSchema>

/** Bumped on every mutation so concurrent edits can be merged deterministically. */
const revisionFields = {
  updatedAt: z.string().max(40).catch(() => new Date(0).toISOString()),
  rev: z.coerce.number().int().min(0).catch(0),
}

export const taskSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().trim().min(1).max(160),
  project: z.string().trim().max(80).catch(UNASSIGNED_PROJECT),
  priority: taskPrioritySchema.catch('Medium'),
  status: taskStatusSchema.catch('Inbox'),
  dueDate: isoDateSchema.catch(''),
  /** Optional `HH:MM` — a non-negotiable time, which auto-scheduling must respect. */
  dueTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).or(z.literal('')).catch(''),
  /** Things 3: don't surface this task before this date. */
  startDate: isoDateSchema.catch(''),
  note: z.string().trim().max(2000).catch(''),
  tags: z.array(z.string().trim().min(1).max(32)).max(12).catch([]),
  energy: taskEnergySchema.catch('Light'),
  /** Estimated effort in minutes (`0` = not estimated). */
  estimateMinutes: z.coerce.number().int().min(0).max(1440).catch(0),
  recurrence: recurrenceSchema.nullable().catch(null),
  /** Ids of tasks that must finish first (Asana dependencies). */
  blockedBy: z.array(z.string().min(1).max(64)).max(20).catch([]),
  /** Set when the task moves to `Completed`; cleared when it moves back. */
  completedAt: z.string().max(40).catch(''),
  createdAt: z.string().max(40).catch(() => new Date(0).toISOString()),
  ...revisionFields,
})

export const projectSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(280).catch(''),
  status: projectStatusSchema.catch('Planning'),
  progress: z.coerce.number().int().min(0).max(100).catch(0),
  /** Asana-style target date for the project as a whole. */
  targetDate: isoDateSchema.catch(''),
  /** Notion "rollup": when true, progress is derived from its tasks. */
  autoProgress: z.boolean().catch(false),
  archived: z.boolean().catch(false),
  createdAt: z.string().max(40).catch(() => new Date(0).toISOString()),
  ...revisionFields,
})

export type Task = z.infer<typeof taskSchema>
export type Project = z.infer<typeof projectSchema>

/** One completed focus interval (TickTick Pomodoro / Sunsama time tracking). */
export const focusSessionSchema = z.object({
  id: z.string().min(1).max(64),
  /** Task worked on, or `null` for an unbound focus block. */
  taskId: z.string().max(64).nullable().catch(null),
  /** `YYYY-MM-DD` in UTC, so daily rollups never shift across timezones. */
  date: isoDateSchema.catch(''),
  startedAt: z.string().max(40).catch(() => new Date(0).toISOString()),
  minutes: z.coerce.number().int().min(1).max(480).catch(25),
  kind: z.enum(['focus', 'break']).catch('focus'),
})

export type FocusSession = z.infer<typeof focusSessionSchema>

/** Morning plan + evening shutdown record for one day (Sunsama rituals). */
export const dailyLogSchema = z.object({
  date: isoDateSchema,
  plannedAt: z.string().max(40).catch(''),
  shutdownAt: z.string().max(40).catch(''),
  /** Ids the user committed to during planning. */
  plannedTaskIds: z.array(z.string().max(64)).max(100).catch([]),
  /** Ids explicitly pushed to tomorrow during the shutdown ritual. */
  rolledOverTaskIds: z.array(z.string().max(64)).max(100).catch([]),
  note: z.string().trim().max(500).catch(''),
})

export type DailyLog = z.infer<typeof dailyLogSchema>

/**
 * Butler-style automation: "when X happens, do Y".
 * Deliberately tiny — a rule engine that cannot surprise you is one you will
 * actually leave switched on.
 */
export const RULE_TRIGGERS = ['taskCreated', 'taskCompleted', 'statusChanged'] as const
export const RULE_ACTIONS = [
  'setPriority',
  'setStatus',
  'setEnergy',
  'addTag',
  'assignProject',
  'scheduleInDays',
] as const

export const automationRuleSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(80),
  enabled: z.boolean().catch(true),
  trigger: z.enum(RULE_TRIGGERS).catch('taskCreated'),
  /** Only apply when the task's project matches (`''` = any project). */
  matchProject: z.string().trim().max(80).catch(''),
  /** Only apply when the task's status matches (`''` = any status). */
  matchStatus: z.string().trim().max(40).catch(''),
  /** Only apply when the title contains this text (`''` = any title). */
  matchText: z.string().trim().max(80).catch(''),
  action: z.enum(RULE_ACTIONS).catch('setPriority'),
  value: z.string().trim().max(80).catch(''),
})

export type AutomationRule = z.infer<typeof automationRuleSchema>

/** Notion-style saved view: a named filter + sort combination. */
export const DUE_FILTERS = ['all', 'overdue', 'today', 'week', 'none'] as const

export const savedViewSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(40),
  status: z.union([z.literal('all'), taskStatusSchema]).catch('all'),
  priority: z.union([z.literal('all'), taskPrioritySchema]).catch('all'),
  project: z.string().trim().max(80).catch('all'),
  tag: z.string().trim().max(32).catch('all'),
  due: z.enum(DUE_FILTERS).catch('all'),
  search: z.string().trim().max(80).catch(''),
  sort: z.enum(['due', 'created', 'priority', 'title', 'estimate']).catch('due'),
})

export type SavedView = z.infer<typeof savedViewSchema>

export const workspaceSettingsSchema = z.object({
  focusMinutes: z.coerce.number().int().min(5).max(120).catch(25),
  shortBreakMinutes: z.coerce.number().int().min(1).max(30).catch(5),
  longBreakMinutes: z.coerce.number().int().min(5).max(60).catch(15),
  dailyFocusGoalMinutes: z.coerce.number().int().min(15).max(720).catch(120),
  /** Realistic working minutes per day, used for capacity warnings. */
  capacityMinutesPerDay: z.coerce.number().int().min(30).max(720).catch(300),
  workdayStart: clockTimeSchema.catch('09:00'),
  workdayEnd: clockTimeSchema.catch('17:30'),
  /** Push unfinished planned work to tomorrow during the shutdown ritual. */
  rolloverUnfinished: z.boolean().catch(false),
  /** Ring when a focus interval ends. */
  chimeOnSessionEnd: z.boolean().catch(true),
})

export type WorkspaceSettings = z.infer<typeof workspaceSettingsSchema>

export const DEFAULT_SETTINGS: WorkspaceSettings = workspaceSettingsSchema.parse({})

/** Deletion marker — keeps merges honest without keeping the row itself. */
export const tombstoneSchema = z.object({
  id: z.string().min(1).max(64),
  kind: z.enum(['task', 'project']).catch('task'),
  deletedAt: z.string().max(40).catch(() => new Date(0).toISOString()),
})

export type Tombstone = z.infer<typeof tombstoneSchema>

/** Shape persisted in localStorage (versioned envelope). */
export const workspaceSnapshotSchema = z.object({
  tasks: z.array(taskSchema).catch([]),
  projects: z.array(projectSchema).catch([]),
  focusSessions: z.array(focusSessionSchema).max(2000).catch([]),
  dailyLogs: z.array(dailyLogSchema).max(400).catch([]),
  rules: z.array(automationRuleSchema).max(50).catch([]),
  savedViews: z.array(savedViewSchema).max(50).catch([]),
  tombstones: z.array(tombstoneSchema).max(2000).catch([]),
  settings: workspaceSettingsSchema.catch(() => ({ ...DEFAULT_SETTINGS })),
})

export type WorkspaceSnapshot = z.infer<typeof workspaceSnapshotSchema>

/** Shape of an exported backup file. */
export const workspaceBackupSchema = z.object({
  app: z.literal('motif-productivity-suite').catch('motif-productivity-suite'),
  version: z.coerce.number().int().positive().catch(3),
  exportedAt: z.string().catch(() => new Date().toISOString()),
  // Required — importing a file that merely *looks* like JSON must never
  // silently replace the workspace with empty data.
  tasks: z.array(taskSchema),
  projects: z.array(projectSchema),
  focusSessions: z.array(focusSessionSchema).max(2000).catch([]),
  dailyLogs: z.array(dailyLogSchema).max(400).catch([]),
  rules: z.array(automationRuleSchema).max(50).catch([]),
  savedViews: z.array(savedViewSchema).max(50).catch([]),
  settings: workspaceSettingsSchema.catch(() => ({ ...DEFAULT_SETTINGS })),
})

export type WorkspaceBackup = z.infer<typeof workspaceBackupSchema>

/** Input accepted by `addTask` (id, timestamps and revision are generated). */
export type NewTaskInput = Pick<Task, 'title' | 'project' | 'priority'> &
  Partial<
    Pick<
      Task,
      | 'status'
      | 'dueDate'
      | 'dueTime'
      | 'startDate'
      | 'note'
      | 'tags'
      | 'energy'
      | 'estimateMinutes'
      | 'recurrence'
      | 'blockedBy'
    >
  >

/** Input accepted by `addProject` (id/progress/timestamps are generated). */
export type NewProjectInput = Pick<Project, 'name' | 'description' | 'status'> &
  Partial<Pick<Project, 'targetDate' | 'autoProgress'>>

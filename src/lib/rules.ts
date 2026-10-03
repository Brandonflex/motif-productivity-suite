import { addDaysIso, todayIso } from '@/lib/dates'
import {
  TASK_ENERGIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type AutomationRule,
  type Task,
  type TaskEnergy,
  type TaskPriority,
  type TaskStatus,
} from '@/types/workspace'

/**
 * Butler-style automation rules (borrowed from Trello), scaled down on purpose.
 *
 * One trigger, one action, a couple of optional conditions — enough to remove
 * repetitive housekeeping ("anything captured in the Studio project gets Deep
 * energy"), small enough that the result is always predictable. Rules run inside
 * the store on the mutation itself, so the workspace can never be persisted in a
 * state that contradicts them.
 */

export type RuleTrigger = 'taskCreated' | 'taskCompleted' | 'statusChanged'

export interface RuleContext {
  /** The status the task just moved to (for `statusChanged`). */
  status?: TaskStatus
}

function matches(rule: AutomationRule, task: Task, context: RuleContext): boolean {
  if (rule.matchProject && rule.matchProject.toLowerCase() !== task.project.toLowerCase()) return false
  if (rule.matchText && !task.title.toLowerCase().includes(rule.matchText.toLowerCase())) return false
  if (rule.matchStatus) {
    const status = context.status ?? task.status
    if (rule.matchStatus.toLowerCase() !== status.toLowerCase()) return false
  }
  return true
}

function applyAction(rule: AutomationRule, task: Task, now: Date): Partial<Task> | null {
  const value = rule.value.trim()

  switch (rule.action) {
    case 'setPriority': {
      const priority = TASK_PRIORITIES.find((candidate) => candidate.toLowerCase() === value.toLowerCase())
      return priority ? { priority: priority as TaskPriority } : null
    }
    case 'setStatus': {
      const status = TASK_STATUSES.find((candidate) => candidate.toLowerCase() === value.toLowerCase())
      return status ? { status: status as TaskStatus } : null
    }
    case 'setEnergy': {
      const energy = TASK_ENERGIES.find((candidate) => candidate.toLowerCase() === value.toLowerCase())
      return energy ? { energy: energy as TaskEnergy } : null
    }
    case 'addTag': {
      if (!value || task.tags.includes(value)) return null
      return { tags: [...task.tags, value].slice(0, 12) }
    }
    case 'assignProject':
      return value ? { project: value } : null
    case 'scheduleInDays': {
      const days = Number.parseInt(value, 10)
      if (Number.isNaN(days)) return null
      return { dueDate: addDaysIso(todayIso(now), Math.max(0, Math.min(365, days))) }
    }
    default:
      return null
  }
}

export interface RuleOutcome {
  task: Task
  applied: AutomationRule[]
}

/**
 * Runs every enabled rule for a trigger. Rules never cascade: the result of one
 * rule is not fed back into the others, so a misconfigured workspace cannot
 * loop.
 */
export function applyRules(
  task: Task,
  rules: AutomationRule[],
  trigger: RuleTrigger,
  context: RuleContext = {},
  now: Date = new Date(),
): RuleOutcome {
  const applied: AutomationRule[] = []
  let next = task

  for (const rule of rules) {
    if (!rule.enabled || rule.trigger !== trigger) continue
    if (!matches(rule, next, context)) continue

    const patch = applyAction(rule, next, now)
    if (!patch) continue

    next = { ...next, ...patch }
    applied.push(rule)
  }

  return { task: next, applied }
}

export const RULE_ACTION_LABELS: Record<AutomationRule['action'], string> = {
  setPriority: 'Set priority',
  setStatus: 'Set status',
  setEnergy: 'Set energy',
  addTag: 'Add tag',
  assignProject: 'Assign to project',
  scheduleInDays: 'Schedule in N days',
}

export const RULE_TRIGGER_LABELS: Record<AutomationRule['trigger'], string> = {
  taskCreated: 'When a task is created',
  taskCompleted: 'When a task is completed',
  statusChanged: 'When status changes',
}

/** Ready-made rules offered in Settings, so the feature explains itself. */
export const RULE_PRESETS: Omit<AutomationRule, 'id'>[] = [
  {
    name: 'Deep work for the Studio project',
    enabled: true,
    trigger: 'taskCreated',
    matchProject: 'Studio',
    matchStatus: '',
    matchText: '',
    action: 'setEnergy',
    value: 'Deep',
  },
  {
    name: 'Completed work gets the done tag',
    enabled: true,
    trigger: 'taskCompleted',
    matchProject: '',
    matchStatus: '',
    matchText: '',
    action: 'addTag',
    value: 'done',
  },
  {
    name: 'New client requests are urgent',
    enabled: false,
    trigger: 'taskCreated',
    matchProject: 'Clients',
    matchStatus: '',
    matchText: 'urgent',
    action: 'setPriority',
    value: 'High',
  },
]

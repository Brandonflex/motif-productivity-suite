import type { DueTone } from '@/lib/dates'
import type { ProjectStatus, TaskPriority, TaskStatus } from '@/types/workspace'

/**
 * Tone maps for pills and status controls.
 *
 * Exported separately from the pill components because the task table and the
 * project cards apply the same values to interactive `<Select>` triggers, and
 * because component modules should only export components (Fast Refresh).
 *
 * Colour alone never carries meaning: every pill also renders its label, which
 * keeps the UI readable for colour-blind users and screen readers.
 */

export const pillBase =
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap'

export const taskStatusTone: Record<TaskStatus, string> = {
  // Inbox is deliberately neutral: unsorted capture, not a status the user chose.
  Inbox: 'border-dashed border-border bg-transparent text-muted-foreground',
  Pending: 'border-border bg-muted text-muted-foreground',
  'In Progress': 'border-info/30 bg-info/10 text-info',
  Completed: 'border-success/30 bg-success/10 text-success',
}

export const priorityTone: Record<TaskPriority, string> = {
  High: 'border-destructive/30 bg-destructive/10 text-destructive',
  Medium: 'border-warning/30 bg-warning/10 text-warning',
  Low: 'border-border bg-muted text-muted-foreground',
}

export const projectStatusTone: Record<ProjectStatus, string> = {
  Planning: 'border-info/30 bg-info/10 text-info',
  Active: 'border-success/30 bg-success/10 text-success',
  Paused: 'border-warning/30 bg-warning/10 text-warning',
  Completed: 'border-border bg-muted text-muted-foreground',
}

export const dueTone: Record<DueTone, string> = {
  overdue: 'border-destructive/30 bg-destructive/10 text-destructive font-semibold',
  today: 'border-warning/30 bg-warning/10 text-warning',
  soon: 'border-border bg-muted text-muted-foreground',
  future: 'border-border bg-muted text-muted-foreground',
  done: 'border-border bg-muted text-muted-foreground line-through',
  none: 'border-border bg-muted text-muted-foreground',
}

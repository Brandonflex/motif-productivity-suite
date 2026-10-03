import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { DueTone } from '@/lib/dates'
import type { ProjectStatus, TaskPriority, TaskStatus } from '@/types/workspace'
import { dueTone, pillBase, priorityTone, projectStatusTone, taskStatusTone } from './pill-tones'

/**
 * Status, priority and due-date pills.
 *
 * The colour tones live in `pill-tones.ts` so they can also be applied to the
 * interactive status `<Select>` triggers in the table and project cards.
 */

function Pill({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn(pillBase, className)}>{children}</span>
}

export function TaskStatusPill({ status, className }: { status: TaskStatus; className?: string }) {
  return <Pill className={cn(taskStatusTone[status], className)}>{status}</Pill>
}

export function PriorityPill({ priority, className }: { priority: TaskPriority; className?: string }) {
  return <Pill className={cn(priorityTone[priority], className)}>{priority}</Pill>
}

export function ProjectStatusPill({ status, className }: { status: ProjectStatus; className?: string }) {
  return <Pill className={cn(projectStatusTone[status], className)}>{status}</Pill>
}

/** Due-date chip: colour encodes urgency, the label states it explicitly. */
export function DueDatePill({ label, tone, className }: { label: string; tone: DueTone; className?: string }) {
  return <Pill className={cn(dueTone[tone], className)}>{label}</Pill>
}

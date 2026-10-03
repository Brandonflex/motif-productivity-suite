import { useEffect, useState } from 'react'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@blinkdotnew/ui'
import { Check, Link2, Timer, Trash2, Undo2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { DueDatePill, PriorityPill } from '@/components/ui/Pills'
import { showUndoToast } from '@/components/ui/ToastUndo'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { describeDueDate, formatMinutes } from '@/lib/dates'
import { focusByTask } from '@/lib/analytics'
import { describeRecurrence, recurrenceBadge } from '@/lib/recurrence'
import { TASK_ENERGIES, TASK_PRIORITIES, TASK_STATUSES, type Task, type TaskPriority, type TaskStatus } from '@/types/workspace'

/**
 * Task detail (Linear's side panel, Things' inspector).
 *
 * Everything about one task in one place — including dependencies and the real
 * focus time behind the estimate — so the list can stay a list. Edits save as
 * they are made; there is no Save button to forget.
 */

const RECURRENCE_CHOICES: Array<{ value: string; label: string }> = [
  { value: 'none', label: 'Does not repeat' },
  { value: '1:day', label: 'Every day' },
  { value: '1:week', label: 'Every week' },
  { value: '2:week', label: 'Every 2 weeks' },
  { value: '1:month', label: 'Every month' },
]

function recurrenceValue(task: Task): string {
  return task.recurrence ? `${task.recurrence.every}:${task.recurrence.unit}` : 'none'
}

/** Label + control pair where the label is explicitly tied to the control. */
function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 text-xs">
      <label htmlFor={id} className="font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

export function TaskDetailPanel({
  taskId,
  onOpenChange,
}: {
  taskId: string | null
  onOpenChange: (open: boolean) => void
}) {
  const { tasks, focusSessions, updateTask, deleteTask, restoreTask, toggleTaskStatus, todayLog, commitPlan } = useWorkspace()
  const task = tasks.find((candidate) => candidate.id === taskId) ?? null

  const [note, setNote] = useState('')
  const [tags, setTags] = useState('')

  // Re-seed the free-text fields whenever a different task is shown.
  useEffect(() => {
    setNote(task?.note ?? '')
    setTags((task?.tags ?? []).join(', '))
  }, [task?.id, task?.note, task?.tags])

  const focusedMinutes = focusSessions
    .filter((session) => session.kind === 'focus')
    .reduce((total, session) => total + (session.taskId === taskId ? session.minutes : 0), 0)
  const focusRank = focusByTask(focusSessions).find((entry) => entry.taskId === taskId)

  if (!task) {
    return (
      <Sheet open={false} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full max-w-md sm:max-w-md" />
      </Sheet>
    )
  }

  const due = describeDueDate(task.dueDate, task.status === 'Completed')
  const blockers = task.blockedBy
    .map((id) => tasks.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is Task => candidate !== undefined)
  const openOthers = tasks.filter((candidate) => candidate.id !== task.id && candidate.status !== 'Completed')

  const save = (patch: Partial<Task>) => updateTask(task.id, patch)

  const addBlocker = (id: string) => {
    if (task.blockedBy.includes(id)) return
    save({ blockedBy: [...task.blockedBy, id] })
  }

  const removeTask = () => {
    const removed = deleteTask(task.id)
    if (!removed) return
    onOpenChange(false)
    showUndoToast({
      message: `“${removed.title}” deleted`,
      onUndo: () => {
        restoreTask(removed)
        toast.success('Task restored')
      },
    })
  }

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md" aria-label="Task details">
        <SheetHeader className="space-y-2 text-left">
          <SheetTitle className="pr-6 text-base leading-snug">{task.title}</SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-1.5">
            <PriorityPill priority={task.priority} />
            {task.dueDate && <DueDatePill label={due.label} tone={due.tone} />}
            {recurrenceBadge(task.recurrence) && (
              <span className="text-[11px] text-muted-foreground">{recurrenceBadge(task.recurrence)}</span>
            )}
            <span className="text-[11px] text-muted-foreground">{task.project}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <Field id="detail-status" label="Status">
              <Select value={task.status} onValueChange={(value) => save({ status: value as TaskStatus })}>
                <SelectTrigger id="detail-status" aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id="detail-priority" label="Priority">
              <Select value={task.priority} onValueChange={(value) => save({ priority: value as TaskPriority })}>
                <SelectTrigger id="detail-priority" aria-label="Priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id="detail-energy" label="Energy">
              <Select value={task.energy} onValueChange={(value) => save({ energy: value as Task['energy'] })}>
                <SelectTrigger id="detail-energy" aria-label="Energy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_ENERGIES.map((energy) => (
                    <SelectItem key={energy} value={energy}>
                      {energy}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id="detail-estimate" label="Estimate">
              <Input
                id="detail-estimate"
                type="number"
                min={0}
                step={5}
                value={task.estimateMinutes}
                aria-label="Estimate in minutes"
                onChange={(event) => save({ estimateMinutes: Math.max(0, Number(event.target.value) || 0) })}
              />
            </Field>

            <Field id="detail-start" label="Start">
              <Input
                id="detail-start"
                type="date"
                value={task.startDate}
                aria-label="Start date"
                onChange={(event) => save({ startDate: event.target.value })}
              />
            </Field>

            <Field id="detail-due" label="Due">
              <Input
                id="detail-due"
                type="date"
                value={task.dueDate}
                aria-label="Due date"
                onChange={(event) => save({ dueDate: event.target.value })}
              />
            </Field>

            <Field id="detail-time" label="Time">
              <Input
                id="detail-time"
                type="time"
                value={task.dueTime}
                aria-label="Due time"
                onChange={(event) => save({ dueTime: event.target.value })}
              />
            </Field>

            <Field id="detail-repeat" label="Repeat">
              <Select
                value={recurrenceValue(task)}
                onValueChange={(value) => {
                  if (value === 'none') {
                    save({ recurrence: null })
                    return
                  }
                  const [every, unit] = value.split(':')
                  save({ recurrence: { every: Number(every), unit: unit as 'day' | 'week' | 'month' } })
                }}
              >
                <SelectTrigger id="detail-repeat" aria-label="Repeat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_CHOICES.map((choice) => (
                    <SelectItem key={choice.value} value={choice.value}>
                      {choice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <p className="text-xs text-muted-foreground">{describeRecurrence(task.recurrence)}</p>

          <Field id="detail-tags" label="Tags">
            <Input
              id="detail-tags"
              value={tags}
              aria-label="Tags"
              placeholder="deep, client"
              onChange={(event) => setTags(event.target.value)}
              onBlur={() =>
                save({
                  tags: tags
                    .split(',')
                    .map((tag) => tag.trim().replace(/^#/, ''))
                    .filter(Boolean),
                })
              }
            />
          </Field>

          <Field id="detail-notes" label="Notes">
            <Textarea
              id="detail-notes"
              value={note}
              rows={4}
              aria-label="Notes"
              placeholder="Context, links, the thing you will forget…"
              onChange={(event) => setNote(event.target.value)}
              onBlur={() => save({ note })}
            />
          </Field>

          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
              Blocked by
            </p>
            {blockers.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing — this can start now.</p>
            ) : (
              <ul className="space-y-1">
                {blockers.map((blocker) => (
                  <li key={blocker.id} className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1">
                    <span className="truncate text-xs">{blocker.title}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-1.5 text-[11px]"
                      aria-label={`Remove dependency ${blocker.title}`}
                      onClick={() => save({ blockedBy: task.blockedBy.filter((id) => id !== blocker.id) })}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <div className="space-y-1 text-xs">
              <label className="sr-only" htmlFor="detail-dependency">
                Add a dependency
              </label>
              <Select value="" onValueChange={addBlocker}>
                <SelectTrigger id="detail-dependency" aria-label="Add a dependency">
                  <SelectValue placeholder="Add a dependency…" />
                </SelectTrigger>
                <SelectContent>
                  {openOthers.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <Timer className="h-3.5 w-3.5" aria-hidden="true" />
              {formatMinutes(focusedMinutes)} focused · estimate {formatMinutes(task.estimateMinutes || 30)}
            </p>
            <p className="mt-1 text-muted-foreground">
              {focusRank ? 'One of your most-focused tasks in the last four weeks.' : 'No focus session bound to this task yet.'}
              {' '}
              {todayLog.plannedTaskIds.includes(task.id) ? 'Committed to today.' : 'Not part of today’s plan.'}
            </p>
          </div>
        </div>

        <SheetFooter className="gap-2 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            <Button size="sm" onClick={() => toggleTaskStatus(task.id)} className="gap-1.5">
              {task.status === 'Completed' ? (
                <>
                  <Undo2 className="h-4 w-4" aria-hidden="true" />
                  Reopen
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Complete
                </>
              )}
            </Button>
            {!todayLog.plannedTaskIds.includes(task.id) && task.status !== 'Completed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => commitPlan([...todayLog.plannedTaskIds, task.id])}
              >
                Add to today
              </Button>
            )}
          </div>
          <Button size="sm" variant="ghost" className="gap-1.5 text-destructive" onClick={removeTask}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

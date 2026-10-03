import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@blinkdotnew/ui'
import toast from 'react-hot-toast'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import {
  TASK_ENERGIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  isoDateSchema,
  taskEnergySchema,
  taskPrioritySchema,
  taskStatusSchema,
  type Recurrence,
  type Task,
  type TaskStatus,
} from '@/types/workspace'

/**
 * Create / edit task form.
 *
 * Validated with zod + react-hook-form (one schema shared with the store) and
 * rendered in a Radix dialog, so focus handling, escape-to-close and
 * screen-reader semantics come for free. The extra fields exist because the rest
 * of the app uses them: energy and estimates feed planning, recurrence feeds the
 * roll-forward, `blockedBy` feeds dependency warnings.
 */

const recurrenceKey = (recurrence: Recurrence | null): string =>
  recurrence ? `${recurrence.every}:${recurrence.unit}` : 'none'

const RECURRENCE_OPTIONS: { key: string; label: string }[] = [
  { key: 'none', label: 'Does not repeat' },
  { key: '1:day', label: 'Every day' },
  { key: '1:week', label: 'Every week' },
  { key: '2:week', label: 'Every 2 weeks' },
  { key: '1:month', label: 'Every month' },
]

const parseRecurrence = (key: string): Recurrence | null => {
  if (key === 'none') return null
  const [every, unit] = key.split(':')
  return { every: Number(every) || 1, unit: (unit as Recurrence['unit']) ?? 'week' }
}

const taskFormSchema = z.object({
  title: z.string().trim().min(1, 'Give the task a title.').max(160, 'Keep titles under 160 characters.'),
  project: z.string().trim().max(80, 'Project names are limited to 80 characters.').default(''),
  priority: taskPrioritySchema,
  status: taskStatusSchema,
  dueDate: isoDateSchema,
  dueTime: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24h time such as 14:30.'),
  startDate: isoDateSchema,
  energy: taskEnergySchema,
  estimate: z.coerce.number().int().min(0, 'Estimates cannot be negative.').max(1440).catch(0),
  tags: z.string().trim().max(200).default(''),
  note: z.string().trim().max(2000, 'Notes are limited to 2000 characters.').default(''),
  recurrence: z.string().default('none'),
  blockedBy: z.string().default(''),
})

type TaskFormValues = z.input<typeof taskFormSchema>

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` → create mode. */
  task: Task | null
  /** Default project for tasks created from a project card. */
  defaultProject?: string
  /** Called after a successful save. */
  onSaved?: (task: Task | null) => void
}

const EMPTY_VALUES: TaskFormValues = {
  title: '',
  project: '',
  priority: 'Medium',
  status: 'Pending',
  dueDate: '',
  dueTime: '',
  startDate: '',
  energy: 'Light',
  estimate: 0,
  tags: '',
  note: '',
  recurrence: 'none',
  blockedBy: '',
}

export function TaskDialog({ open, onOpenChange, task, defaultProject, onSaved }: TaskDialogProps) {
  const { addTask, updateTask, projectNames, tasks } = useWorkspace()

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: EMPTY_VALUES,
    mode: 'onSubmit',
  })

  // Re-seed the form whenever the dialog opens for a different task.
  useEffect(() => {
    if (!open) return
    reset(
      task
        ? {
            title: task.title,
            project: task.project,
            priority: task.priority,
            status: task.status,
            dueDate: task.dueDate,
            dueTime: task.dueTime,
            startDate: task.startDate,
            energy: task.energy,
            estimate: task.estimateMinutes,
            tags: task.tags.join(', '),
            note: task.note,
            recurrence: recurrenceKey(task.recurrence),
            blockedBy: task.blockedBy[0] ?? '',
          }
        : { ...EMPTY_VALUES, project: defaultProject ?? '' },
    )
  }, [open, task, defaultProject, reset])

  const onSubmit = handleSubmit((values) => {
    const payload = {
      title: values.title.trim(),
      project: values.project?.trim() ?? '',
      priority: values.priority,
      status: values.status,
      dueDate: values.dueDate,
      dueTime: values.dueTime ?? '',
      startDate: values.startDate ?? '',
      energy: values.energy,
      estimateMinutes: Number(values.estimate) || 0,
      tags: (values.tags ?? '')
        .split(',')
        .map((tag) => tag.trim().replace(/^#/, ''))
        .filter(Boolean)
        .slice(0, 12),
      note: values.note ?? '',
      recurrence: parseRecurrence(values.recurrence ?? 'none'),
      blockedBy: values.blockedBy ? [values.blockedBy] : [],
    }

    if (task) {
      updateTask(task.id, payload)
      toast.success('Task updated')
      onSaved?.(task)
    } else {
      const created = addTask(payload)
      toast.success('Task created')
      onSaved?.(created)
    }

    onOpenChange(false)
  })

  const blockers = tasks.filter((candidate) => candidate.id !== task?.id && candidate.status !== 'Completed')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit task' : 'New task'}</DialogTitle>
          <DialogDescription>
            {task
              ? 'Update the details below. Changes are saved to this browser immediately.'
              : 'Capture the work, size it, and give it a date — estimates drive the day plan.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="task-title" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Title
            </label>
            <Input
              id="task-title"
              placeholder="e.g. Write the release notes"
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? 'task-title-error' : undefined}
              {...register('title')}
            />
            {errors.title && (
              <p id="task-title-error" className="text-xs text-destructive">
                {errors.title.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="task-project" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Project
              </label>
              <Input id="task-project" list="task-project-options" placeholder="Unassigned" {...register('project')} />
              <datalist id="task-project-options">
                {projectNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              {errors.project && <p className="text-xs text-destructive">{errors.project.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="task-tags" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tags
              </label>
              <Input id="task-tags" placeholder="design, client" {...register('tags')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="task-start" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Start date
              </label>
              <Input id="task-start" type="date" {...register('startDate')} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="task-due-date" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Due date
              </label>
              <Input id="task-due-date" type="date" {...register('dueDate')} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="task-due-time" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                At (optional)
              </label>
              <Input id="task-due-time" type="time" {...register('dueTime')} />
              {errors.dueTime && <p className="text-xs text-destructive">{errors.dueTime.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Priority</span>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-label="Priority">
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
                )}
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</span>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(value) => field.onChange(value as TaskStatus)}>
                    <SelectTrigger aria-label="Status">
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
                )}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Energy</span>
              <Controller
                control={control}
                name="energy"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-label="Energy">
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
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="task-estimate" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Estimate (min)
              </label>
              <Input id="task-estimate" type="number" min={0} max={1440} step={5} {...register('estimate')} />
              {errors.estimate && <p className="text-xs text-destructive">{errors.estimate.message}</p>}
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Repeats</span>
              <Controller
                control={control}
                name="recurrence"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-label="Repeats">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRENCE_OPTIONS.map((option) => (
                        <SelectItem key={option.key} value={option.key}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Blocked by (optional)
            </span>
            <Controller
              control={control}
              name="blockedBy"
              render={({ field }) => (
                <Select value={field.value || 'none'} onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}>
                  <SelectTrigger aria-label="Blocked by">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nothing — can start now</SelectItem>
                    {blockers.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="task-note" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </label>
            <Textarea id="task-note" rows={3} placeholder="Context, links, the definition of done…" {...register('note')} />
            {errors.note && <p className="text-xs text-destructive">{errors.note.message}</p>}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {task ? 'Save changes' : 'Create task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

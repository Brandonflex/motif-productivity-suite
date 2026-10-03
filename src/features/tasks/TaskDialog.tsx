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
} from '@blinkdotnew/ui'
import toast from 'react-hot-toast'
import { TASK_PRIORITIES, TASK_STATUSES, isoDateSchema, taskPrioritySchema, taskStatusSchema } from '@/types/workspace'
import type { Task, TaskStatus } from '@/types/workspace'
import { useWorkspace } from '@/features/workspace/useWorkspace'

const taskFormSchema = z.object({
  title: z.string().trim().min(1, 'Give the task a title.').max(160, 'Keep titles under 160 characters.'),
  project: z.string().trim().max(80, 'Project names are limited to 80 characters.').default(''),
  priority: taskPrioritySchema,
  status: taskStatusSchema,
  dueDate: isoDateSchema,
})

type TaskFormValues = z.input<typeof taskFormSchema>

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` → create mode. */
  task: Task | null
  /** Default project for tasks created from a project card. */
  defaultProject?: string
  /** Called after a successful save (e.g. to focus the new row). */
  onSaved?: (task: Task | null) => void
}

const EMPTY_VALUES: TaskFormValues = {
  title: '',
  project: '',
  priority: 'Medium',
  status: 'Pending',
  dueDate: '',
}

/**
 * Create / edit task form.
 *
 * Validated with zod + react-hook-form (single schema, shared with the store)
 * and rendered inside a Radix dialog, so focus handling, escape-to-close and
 * screen-reader semantics come for free.
 */
export function TaskDialog({ open, onOpenChange, task, defaultProject, onSaved }: TaskDialogProps) {
  const { addTask, updateTask, projectNames } = useWorkspace()

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit task' : 'New task'}</DialogTitle>
          <DialogDescription>
            {task
              ? 'Update the details below. Changes are saved to this browser immediately.'
              : 'Capture the work, link it to a project and set a due date.'}
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
              <Input
                id="task-project"
                list="task-project-options"
                placeholder="Unassigned"
                {...register('project')}
              />
              <datalist id="task-project-options">
                {projectNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              {errors.project && <p className="text-xs text-destructive">{errors.project.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="task-due-date" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Due date
              </label>
              <Input id="task-due-date" type="date" {...register('dueDate')} />
              {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
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

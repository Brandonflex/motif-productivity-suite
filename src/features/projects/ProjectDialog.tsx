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
import { PROJECT_STATUSES, projectStatusSchema, type Project, type ProjectStatus } from '@/types/workspace'
import { useWorkspace } from '@/features/workspace/useWorkspace'

const projectFormSchema = z.object({
  name: z.string().trim().min(1, 'Give the project a name.').max(80, 'Keep names under 80 characters.'),
  description: z.string().trim().max(280, 'Descriptions are limited to 280 characters.').default(''),
  status: projectStatusSchema,
})

type ProjectFormValues = z.input<typeof projectFormSchema>

interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project | null
}

const EMPTY_VALUES: ProjectFormValues = { name: '', description: '', status: 'Planning' }

/** Create / edit project form. */
export function ProjectDialog({ open, onOpenChange, project }: ProjectDialogProps) {
  const { addProject, updateProject } = useWorkspace()

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: EMPTY_VALUES,
  })

  useEffect(() => {
    if (!open) return
    reset(
      project
        ? { name: project.name, description: project.description, status: project.status }
        : EMPTY_VALUES,
    )
  }, [open, project, reset])

  const onSubmit = handleSubmit((values) => {
    const payload = {
      name: values.name.trim(),
      description: values.description?.trim() ?? '',
      status: values.status,
    }

    if (project) {
      updateProject(project.id, payload)
      toast.success('Project updated')
    } else {
      addProject(payload)
      toast.success('Project created')
    }

    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit project' : 'New project'}</DialogTitle>
          <DialogDescription>
            {project
              ? 'Rename the initiative, adjust its description or change its status.'
              : 'Projects group related tasks and track progress towards a goal.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="project-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Name
            </label>
            <Input
              id="project-name"
              placeholder="e.g. Q4 marketing campaign"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? 'project-name-error' : undefined}
              {...register('name')}
            />
            {errors.name && (
              <p id="project-name-error" className="text-xs text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="project-description"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Description
            </label>
            <Textarea
              id="project-description"
              rows={3}
              placeholder="What does success look like?"
              className="resize-none"
              {...register('description')}
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</span>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(value) => field.onChange(value as ProjectStatus)}>
                  <SelectTrigger aria-label="Status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{project ? 'Save changes' : 'Create project'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

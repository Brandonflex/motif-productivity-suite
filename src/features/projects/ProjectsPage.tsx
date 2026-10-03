import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Page,
  PageActions,
  PageBody,
  PageDescription,
  PageTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@blinkdotnew/ui'
import { FolderKanban, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useHotkeys } from '@/hooks/useHotkeys'
import { formatTimestamp } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { pillBase, projectStatusTone } from '@/components/ui/pill-tones'
import { PageHeaderBar } from '@/components/ui/PageHeaderBar'
import { PROJECT_STATUSES, type Project, type ProjectStatus } from '@/types/workspace'
import { ProjectDialog } from './ProjectDialog'

export function ProjectsPage() {
  useDocumentTitle('Projects')
  const navigate = useNavigate()
  const { projects, tasks, deleteProject, updateProjectProgress, updateProjectStatus } = useWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()

  const [dialog, setDialog] = useState<{ open: boolean; project: Project | null }>({ open: false, project: null })
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null)
  /** Live slider values while dragging (committed to the store on release). */
  const [draftProgress, setDraftProgress] = useState<Record<string, number>>({})

  const openCreate = useCallback(() => setDialog({ open: true, project: null }), [])
  const openEdit = useCallback((project: Project) => setDialog({ open: true, project }), [])

  useHotkeys({ n: openCreate })

  useEffect(() => {
    if (searchParams.get('new') !== '1') return
    openCreate()
    const next = new URLSearchParams(searchParams)
    next.delete('new')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, openCreate])

  const loadByProject = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>()
    for (const task of tasks) {
      const entry = map.get(task.project) ?? { total: 0, done: 0 }
      entry.total += 1
      if (task.status === 'Completed') entry.done += 1
      map.set(task.project, entry)
    }
    return map
  }, [tasks])

  const affectedTasks = pendingDelete ? (loadByProject.get(pendingDelete.name)?.total ?? 0) : 0

  const commitProgress = (project: Project, value: number) => {
    setDraftProgress((prev) => {
      const next = { ...prev }
      delete next[project.id]
      return next
    })
    updateProjectProgress(project.id, value)
    if (value === 100 && project.status !== 'Completed') {
      toast.success(`“${project.name}” marked as completed`)
    }
  }

  const handleDelete = () => {
    if (!pendingDelete) return
    const affected = deleteProject(pendingDelete.id)
    const name = pendingDelete.name
    setPendingDelete(null)
    toast.success(
      affected > 0
        ? `“${name}” deleted · ${affected} task${affected === 1 ? '' : 's'} moved to Unassigned`
        : `“${name}” deleted`,
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Page>
        <PageHeaderBar>
          <div className="min-w-0">
            <PageTitle>Projects</PageTitle>
            <PageDescription>
              {projects.length === 0
                ? 'Group related tasks and track progress towards a goal.'
                : `${projects.length} project${projects.length === 1 ? '' : 's'} · ${tasks.length} task${tasks.length === 1 ? '' : 's'} in workspace`}
            </PageDescription>
          </div>
          <PageActions>
            <Button onClick={openCreate} size="sm" aria-keyshortcuts="n">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New project
            </Button>
          </PageActions>
        </PageHeaderBar>

        <PageBody className="mx-auto w-full max-w-6xl">
          {projects.length === 0 ? (
            <Card>
              <EmptyState
                icon={<FolderKanban className="h-5 w-5" aria-hidden="true" />}
                title="No projects yet"
                description="Projects keep related tasks together and give progress a home."
                action={{ label: 'Create a project', onClick: openCreate }}
                className="py-12"
              />
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => {
                const load = loadByProject.get(project.name) ?? { total: 0, done: 0 }
                const progress = draftProgress[project.id] ?? project.progress
                const isComplete = project.status === 'Completed'

                return (
                  <Card key={project.id} className="flex flex-col">
                    <CardHeader className="gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            aria-hidden="true"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
                          >
                            <FolderKanban className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <CardTitle className="truncate text-sm">{project.name}</CardTitle>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              Created {formatTimestamp(project.createdAt)}
                            </p>
                          </div>
                        </div>

                        <Select
                          value={project.status}
                          onValueChange={(value) => updateProjectStatus(project.id, value as ProjectStatus)}
                        >
                          <SelectTrigger
                            className={cn(
                              pillBase,
                              projectStatusTone[project.status],
                              'h-7 w-auto shrink-0 gap-1 px-2 shadow-none [&>svg]:h-3 [&>svg]:w-3',
                            )}
                            aria-label={`Status for ${project.name}`}
                          >
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
                      </div>
                    </CardHeader>

                    <CardContent className="flex flex-1 flex-col gap-4">
                      <p className="line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
                        {project.description || 'No description yet.'}
                      </p>

                      <div className="space-y-2">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="tabular-nums font-medium text-foreground">{progress}%</span>
                        </div>
                        <Slider
                          value={[progress]}
                          min={0}
                          max={100}
                          step={5}
                          disabled={isComplete}
                          aria-label={`Progress for ${project.name}`}
                          onValueChange={([value]) =>
                            setDraftProgress((prev) => ({ ...prev, [project.id]: value ?? project.progress }))
                          }
                          onValueCommit={([value]) => commitProgress(project, value ?? project.progress)}
                        />
                        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                          {load.total === 0
                            ? 'No tasks linked yet'
                            : `${load.done} of ${load.total} task${load.total === 1 ? '' : 's'} complete`}
                        </p>
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => navigate(`/tasks?new=1&project=${encodeURIComponent(project.name)}`)}
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                          Add task
                        </Button>

                        <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => openEdit(project)}
                                  aria-label={`Edit ${project.name}`}
                                >
                                  <Pencil className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit project</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => setPendingDelete(project)}
                                  aria-label={`Delete ${project.name}`}
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete project</TooltipContent>
                            </Tooltip>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </PageBody>

        <ProjectDialog
          open={dialog.open}
          onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
          project={dialog.project}
        />

        <ConfirmDialog
          open={pendingDelete !== null}
          onOpenChange={(open) => !open && setPendingDelete(null)}
          title={`Delete “${pendingDelete?.name ?? ''}”?`}
          description={
            affectedTasks > 0
              ? `This project has ${affectedTasks} linked task${affectedTasks === 1 ? '' : 's'}. They will be kept and moved to “Unassigned”. This cannot be undone.`
              : 'This project has no linked tasks. This cannot be undone.'
          }
          confirmLabel="Delete project"
          onConfirm={handleDelete}
        />
      </Page>
    </TooltipProvider>
  )
}

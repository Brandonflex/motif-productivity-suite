import { useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  PageActions,
  PageBody,
  PageDescription,
  PageTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@blinkdotnew/ui'
import { Inbox as InboxIcon, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeaderBar } from '@/components/ui/PageHeaderBar'
import { QuickAddField } from '@/components/quick-add/QuickAdd'
import { PriorityPill } from '@/components/ui/Pills'
import { showUndoToast } from '@/components/ui/ToastUndo'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { UNASSIGNED_PROJECT, TASK_PRIORITIES, type Task, type TaskPriority } from '@/types/workspace'
import { cn } from '@/lib/utils'

/**
 * Triage queue (Linear's inbox + Things' inbox).
 *
 * Capture is cheap and deciding is expensive, so the two are separated: anything
 * that is not already scheduled lands here, and this page is the one place where
 * the queue gets emptied — priority, project, date, then out.
 */
export function InboxPage() {
  useDocumentTitle('Inbox')
  const { tasks, projectNames, updateTask, triageTask, deleteTask, restoreTask } = useWorkspace()
  const [projectDrafts, setProjectDrafts] = useState<Record<string, string>>({})

  const inbox = useMemo(
    () => tasks.filter((task) => task.status === 'Inbox').sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [tasks],
  )

  const handleDelete = (task: Task) => {
    const removed = deleteTask(task.id)
    if (!removed) return
    showUndoToast({
      message: `“${removed.title}” deleted`,
      onUndo: () => {
        restoreTask(removed)
        toast.success('Task restored')
      },
    })
  }

  const commitProject = (task: Task) => {
    const draft = projectDrafts[task.id]
    if (draft === undefined) return
    updateTask(task.id, { project: draft.trim() || UNASSIGNED_PROJECT })
    toast.success('Project updated')
  }

  return (
    <>
      <PageHeaderBar>
        <div className="min-w-0">
          <PageTitle>Inbox</PageTitle>
          <PageDescription>
            {inbox.length === 0
              ? 'Nothing waiting — capture anything with the field below or press Q.'
              : `${inbox.length} item${inbox.length === 1 ? '' : 's'} to triage. Decide: do it, date it, or drop it.`}
          </PageDescription>
        </div>
        <PageActions className="flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <a href="#inbox-capture">Capture</a>
          </Button>
        </PageActions>
      </PageHeaderBar>

      <PageBody className="px-4 sm:px-6 mx-auto w-full max-w-4xl">
        <Card id="inbox-capture">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick capture</CardTitle>
          </CardHeader>
          <CardContent>
            <QuickAddField placeholder="Brain-dump it: “Draft the newsletter tomorrow 9am #studio ~30m”" />
          </CardContent>
        </Card>

        {inbox.length === 0 ? (
          <Card>
            <EmptyState
              icon={<InboxIcon className="h-5 w-5" aria-hidden="true" />}
              title="Inbox zero"
              description="Every captured item has been triaged. New capture lands here first."
              className="py-12"
            />
          </Card>
        ) : (
          <ul className="space-y-3">
            {inbox.map((task) => (
              <li key={task.id}>
                <Card>
                  <CardContent className="space-y-3 pt-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{task.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Captured {task.createdAt.slice(0, 10)}
                          {task.tags.length > 0 && ` · ${task.tags.map((tag) => `#${tag}`).join(' ')}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <PriorityPill priority={task.priority} />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive coarse:h-11 coarse:w-11"
                          onClick={() => handleDelete(task)}
                          aria-label={`Delete “${task.title}”`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      <Select
                        value={task.priority}
                        onValueChange={(value) => updateTask(task.id, { priority: value as TaskPriority })}
                      >
                        <SelectTrigger aria-label={`Priority for “${task.title}”`}>
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

                      <Input
                        list="inbox-project-options"
                        value={projectDrafts[task.id] ?? (task.project === UNASSIGNED_PROJECT ? '' : task.project)}
                        onChange={(event) => setProjectDrafts((prev) => ({ ...prev, [task.id]: event.target.value }))}
                        onBlur={() => commitProject(task)}
                        placeholder="Project"
                        aria-label={`Project for “${task.title}”`}
                      />

                      <Input
                        type="date"
                        value={task.dueDate}
                        onChange={(event) => updateTask(task.id, { dueDate: event.target.value })}
                        aria-label={`Due date for “${task.title}”`}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="coarse:h-11" onClick={() => triageTask(task.id)}>
                        Move to tasks
                      </Button>
                      <Button
                        size="sm"
                        className="coarse:h-11"
                        onClick={() => {
                          triageTask(task.id, { dueDate: new Date().toISOString().slice(0, 10) })
                          toast.success('Scheduled for today')
                        }}
                      >
                        Do today
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn('text-muted-foreground coarse:h-11')}
                        onClick={() => {
                          triageTask(task.id, { startDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10) })
                          toast('Parked for later', { icon: '🌙' })
                        }}
                      >
                        Someday
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <datalist id="inbox-project-options">
          {projectNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </PageBody>
    </>
  )
}

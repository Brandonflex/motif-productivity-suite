import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@blinkdotnew/ui'
import { CheckSquare, Columns3, Grid2x2, ListFilter, ListTree, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useHotkeys } from '@/hooks/useHotkeys'
import { describeDueDate, dueDateSortKey } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { showUndoToast } from '@/components/ui/ToastUndo'
import { DueDatePill, PriorityPill } from '@/components/ui/Pills'
import { pillBase, taskStatusTone } from '@/components/ui/pill-tones'
import { PageHeaderBar } from '@/components/ui/PageHeaderBar'
import { DUE_FILTERS, TASK_PRIORITIES, TASK_STATUSES, UNASSIGNED_PROJECT, type SavedView, type Task, type TaskPriority, type TaskStatus } from '@/types/workspace'
import { DUE_FILTER_LABELS, matchesDueFilter, type DueFilter } from '@/lib/filters'
import { TaskDialog } from './TaskDialog'
import { BoardView } from './views/BoardView'
import { MatrixView } from './views/MatrixView'

type StatusFilter = 'All' | TaskStatus
type PriorityFilter = 'All' | TaskPriority
type SortKey = 'due' | 'created' | 'priority' | 'title' | 'estimate'
type ViewMode = 'list' | 'board' | 'matrix'

const PRIORITY_WEIGHT: Record<TaskPriority, number> = { High: 0, Medium: 1, Low: 2 }

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'due', label: 'Due date' },
  { value: 'created', label: 'Newest' },
  { value: 'priority', label: 'Priority' },
  { value: 'estimate', label: 'Longest first' },
  { value: 'title', label: 'Title' },
]

const VIEW_KEY = 'motif:tasks-view'

function readStoredView(): ViewMode {
  try {
    const stored = window.localStorage.getItem(VIEW_KEY)
    return stored === 'board' || stored === 'matrix' ? stored : 'list'
  } catch {
    return 'list'
  }
}

export function TasksPage() {
  useDocumentTitle('Tasks')
  const {
    tasks,
    toggleTaskStatus,
    setTaskStatus,
    deleteTask,
    restoreTask,
    stats,
    savedViews,
    saveView,
    deleteSavedView,
  } = useWorkspace()
  const [searchParams, setSearchParams] = useSearchParams()

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('All')
  const [dueFilter, setDueFilter] = useState<DueFilter>('all')
  const [sort, setSort] = useState<SortKey>('due')
  const [dialog, setDialog] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null })
  const [defaultProject, setDefaultProject] = useState<string | undefined>(undefined)
  const [view, setView] = useState<ViewMode>(readStoredView)
  const [saveOpen, setSaveOpen] = useState(false)
  const [viewName, setViewName] = useState('')
  const viewNameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (saveOpen) requestAnimationFrame(() => viewNameRef.current?.focus())
  }, [saveOpen])

  const searchRef = useRef<HTMLInputElement>(null)

  const openCreate = useCallback(() => {
    setDefaultProject(undefined)
    setDialog({ open: true, task: null })
  }, [])
  const openEdit = useCallback((task: Task) => setDialog({ open: true, task }), [])

  // Single-key accelerators for the two things this view is used for.
  useHotkeys({
    '/': (event) => {
      event.preventDefault()
      searchRef.current?.focus()
    },
    n: openCreate,
  })

  // Deep links: /tasks?new=1 opens the create dialog, optionally pre-linked to
  // a project (`?project=Name`, used by the project cards).
  useEffect(() => {
    if (searchParams.get('new') !== '1') return

    const project = searchParams.get('project')
    setDefaultProject(project ?? undefined)
    setDialog({ open: true, task: null })

    const next = new URLSearchParams(searchParams)
    next.delete('new')
    next.delete('project')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const visibleTasks = useMemo(() => {
    const needle = query.trim().toLowerCase()

    const filtered = tasks.filter((task) => {
      if (statusFilter !== 'All' && task.status !== statusFilter) return false
      if (priorityFilter !== 'All' && task.priority !== priorityFilter) return false
      if (!matchesDueFilter(task, dueFilter)) return false
      if (!needle) return true
      return (
        task.title.toLowerCase().includes(needle) ||
        task.project.toLowerCase().includes(needle) ||
        task.tags.some((tag) => tag.toLowerCase().includes(needle))
      )
    })

    const sorted = [...filtered]
    sorted.sort((a, b) => {
      switch (sort) {
        case 'created':
          return b.createdAt.localeCompare(a.createdAt)
        case 'priority':
          return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority] || a.title.localeCompare(b.title)
        case 'title':
          return a.title.localeCompare(b.title)
        case 'estimate':
          return (b.estimateMinutes || 0) - (a.estimateMinutes || 0) || a.title.localeCompare(b.title)
        case 'due':
        default: {
          // Completed work sinks to the bottom, then earliest due date first.
          const doneDelta = Number(a.status === 'Completed') - Number(b.status === 'Completed')
          if (doneDelta !== 0) return doneDelta
          return dueDateSortKey(a.dueDate).localeCompare(dueDateSortKey(b.dueDate)) || b.createdAt.localeCompare(a.createdAt)
        }
      }
    })

    return sorted
  }, [tasks, query, statusFilter, priorityFilter, dueFilter, sort])

  const switchView = (next: ViewMode) => {
    setView(next)
    try {
      window.localStorage.setItem(VIEW_KEY, next)
    } catch {
      /* the choice simply will not survive a reload */
    }
  }

  const applySavedView = (saved: SavedView) => {
    setStatusFilter(saved.status === 'all' ? 'All' : saved.status)
    setPriorityFilter(saved.priority === 'all' ? 'All' : saved.priority)
    setQuery(saved.search)
    setDueFilter(saved.due)
    setSort(saved.sort)
    switchView('list')
    toast.success(`View applied: ${saved.name}`)
  }

  const persistView = () => {
    if (!viewName.trim()) return
    saveView({
      name: viewName.trim(),
      status: statusFilter === 'All' ? 'all' : statusFilter,
      priority: priorityFilter === 'All' ? 'all' : priorityFilter,
      project: 'all',
      tag: 'all',
      due: dueFilter,
      search: query.trim(),
      sort,
    })
    setSaveOpen(false)
    setViewName('')
    toast.success('View saved')
  }

  const filtersActive =
    query.trim() !== '' || statusFilter !== 'All' || priorityFilter !== 'All' || dueFilter !== 'all'

  const clearFilters = () => {
    setQuery('')
    setStatusFilter('All')
    setPriorityFilter('All')
    setDueFilter('all')
  }

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

  return (
    <TooltipProvider delayDuration={200}>
      <Page>
        <PageHeaderBar>
        <div className="min-w-0">
          <PageTitle>Tasks</PageTitle>
          <PageDescription>
            {stats.openTasks} open · {stats.completedTasks} completed
            {stats.overdueTasks > 0 && ` · ${stats.overdueTasks} overdue`}
          </PageDescription>
        </div>
        <PageActions>
          <Button onClick={openCreate} size="sm" aria-keyshortcuts="n">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New task
          </Button>
        </PageActions>
      </PageHeaderBar>

      <PageBody className="mx-auto w-full max-w-6xl">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 lg:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tasks and projects…"
              aria-label="Search tasks"
              aria-keyshortcuts="/"
              className="pl-9 pr-9"
            />
            <kbd
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:block"
            >
              /
            </kbd>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="w-[10.5rem]" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All statuses</SelectItem>
                {TASK_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as PriorityFilter)}>
              <SelectTrigger className="w-[9.5rem]" aria-label="Filter by priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All priorities</SelectItem>
                {TASK_PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dueFilter} onValueChange={(value) => setDueFilter(value as DueFilter)}>
              <SelectTrigger className="w-[9.5rem]" aria-label="Filter by due date">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DUE_FILTERS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {DUE_FILTER_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
              <SelectTrigger className="w-[9.5rem]" aria-label="Sort tasks">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    Sort: {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4" aria-hidden="true" />
                Clear
              </Button>
            )}

            <div
              role="group"
              aria-label="Task view"
              className="ml-auto inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5"
            >
              {(
                [
                  { value: 'list', label: 'List', icon: ListTree },
                  { value: 'board', label: 'Board', icon: Columns3 },
                  { value: 'matrix', label: 'Matrix', icon: Grid2x2 },
                ] as const
              ).map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  size="sm"
                  variant={view === value ? 'secondary' : 'ghost'}
                  aria-pressed={view === value}
                  onClick={() => switchView(value)}
                  className="h-7 gap-1.5 px-2 text-xs"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Saved views (Notion-style): the filter combination, named and reusable */}
        <div className="flex flex-wrap items-center gap-2">
          {savedViews.map((saved) => (
            <span key={saved.id} className="inline-flex items-center overflow-hidden rounded-full border border-border">
              <button
                type="button"
                onClick={() => applySavedView(saved)}
                className="px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
              >
                {saved.name}
              </button>
              <button
                type="button"
                onClick={() => deleteSavedView(saved.id)}
                aria-label={`Delete saved view ${saved.name}`}
                className="border-l border-border px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-destructive"
              >
                ×
              </button>
            </span>
          ))}
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => setSaveOpen(true)}>
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            Save this view
          </Button>
        </div>

        {view === 'board' ? (
          <BoardView tasks={visibleTasks} onEdit={openEdit} />
        ) : view === 'matrix' ? (
          <MatrixView tasks={visibleTasks} onEdit={openEdit} />
        ) : (
        <Card className="overflow-hidden">
          {tasks.length === 0 ? (
            <EmptyState
              icon={<CheckSquare className="h-5 w-5" aria-hidden="true" />}
              title="No tasks yet"
              description="Create your first task to start tracking work across the workspace."
              action={{ label: 'New task', onClick: openCreate }}
              className="py-12"
            />
          ) : visibleTasks.length === 0 ? (
            <EmptyState
              icon={<ListFilter className="h-5 w-5" aria-hidden="true" />}
              title="No matching tasks"
              description="Try a different search term or clear the filters."
              action={{ label: 'Clear filters', onClick: clearFilters }}
              className="py-12"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-left text-sm">
                <caption className="sr-only">Tasks in your workspace, with project, priority, status and due date</caption>
                <thead className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th scope="col" className="w-10 px-4 py-3">
                      <span className="sr-only">Complete</span>
                    </th>
                    <th scope="col" className="px-4 py-3">Task</th>
                    <th scope="col" className="hidden px-4 py-3 sm:table-cell">Project</th>
                    <th scope="col" className="hidden px-4 py-3 md:table-cell">Priority</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="hidden px-4 py-3 lg:table-cell">Due</th>
                    <th scope="col" className="w-[6.5rem] px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleTasks.map((task) => {
                    const isDone = task.status === 'Completed'
                    const due = describeDueDate(task.dueDate, isDone)
                    return (
                      <tr key={task.id} className="group transition-colors hover:bg-muted/40">
                        <td className="px-4 py-3 align-top">
                          <Checkbox
                            checked={isDone}
                            onCheckedChange={() => toggleTaskStatus(task.id)}
                            aria-label={`Mark “${task.title}” as ${isDone ? 'incomplete' : 'complete'}`}
                            className="mt-0.5"
                          />
                        </td>

                        <td className="px-4 py-3 align-top">
                          <span
                            className={
                              isDone
                                ? 'font-medium text-muted-foreground line-through'
                                : 'font-medium text-foreground'
                            }
                          >
                            {task.title}
                          </span>
                          {/* Context that is hidden from the narrower layouts. */}
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:hidden">
                            <span className="text-xs text-muted-foreground">
                              {task.project === UNASSIGNED_PROJECT ? 'No project' : task.project}
                            </span>
                            <PriorityPill priority={task.priority} />
                          </div>
                          <div className="mt-1 lg:hidden">
                            <DueDatePill label={due.label} tone={due.tone} />
                          </div>
                        </td>

                        <td className="hidden px-4 py-3 align-top text-muted-foreground sm:table-cell">
                          {task.project === UNASSIGNED_PROJECT ? '—' : task.project}
                        </td>

                        <td className="hidden px-4 py-3 align-top md:table-cell">
                          <PriorityPill priority={task.priority} />
                        </td>

                        <td className="px-4 py-3 align-top">
                          <Select
                            value={task.status}
                            onValueChange={(value) => setTaskStatus(task.id, value as TaskStatus)}
                          >
                            {/* The trigger itself wears the status pill styling. */}
                            <SelectTrigger
                              className={cn(
                                pillBase,
                                taskStatusTone[task.status],
                                'h-7 w-auto gap-1 px-2 shadow-none [&>span]:truncate [&>svg]:h-3 [&>svg]:w-3',
                              )}
                              aria-label={`Status for “${task.title}”`}
                            >
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
                        </td>

                        <td className="hidden px-4 py-3 align-top lg:table-cell">
                          <DueDatePill label={due.label} tone={due.tone} />
                        </td>

                        <td className="px-4 py-3 align-top text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => openEdit(task)}
                                  aria-label={`Edit “${task.title}”`}
                                >
                                  <Pencil className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit task</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDelete(task)}
                                  aria-label={`Delete “${task.title}”`}
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete task</TooltipContent>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        )}

        {filtersActive && visibleTasks.length > 0 && (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Showing {visibleTasks.length} of {tasks.length} tasks
          </p>
        )}
      </PageBody>
    </Page>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save this view</DialogTitle>
            <DialogDescription>
              Stores the current status, priority, due-date filter, search and sort as a one-click chip.
            </DialogDescription>
          </DialogHeader>
          <Input
            ref={viewNameRef}
            value={viewName}
            onChange={(event) => setViewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') persistView()
            }}
            placeholder="e.g. High priority this week"
            aria-label="View name"
          />
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={persistView} disabled={!viewName.trim()}>
              Save view
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    <TaskDialog
      open={dialog.open}
      onOpenChange={(open) => {
        setDialog((prev) => ({ ...prev, open }))
        if (!open) setDefaultProject(undefined)
      }}
      task={dialog.task}
      defaultProject={defaultProject}
    />
    </TooltipProvider>
  )
}

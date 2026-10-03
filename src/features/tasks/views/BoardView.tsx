import { useMemo } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@blinkdotnew/ui'
import { ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { DueDatePill, PriorityPill } from '@/components/ui/Pills'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { describeDueDate, formatMinutes } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { TASK_STATUSES, type Task, type TaskStatus } from '@/types/workspace'

/**
 * Kanban board (Trello), including its best safety rails:
 *   · a work-in-progress limit per column, with a loud header when it is exceeded —
 *     an overloaded "In Progress" column is the classic sign of too much started
 *     and too little finished;
 *   · one-click movement between columns, so the board stays truthful.
 */
const WIP_LIMITS: Partial<Record<TaskStatus, number>> = { 'In Progress': 3 }

interface BoardViewProps {
  tasks: Task[]
  onEdit: (task: Task) => void
}

export function BoardView({ tasks, onEdit }: BoardViewProps) {
  const { setTaskStatus, settings } = useWorkspace()

  const columns = useMemo(
    () =>
      TASK_STATUSES.map((status) => ({
        status,
        items: tasks.filter((task) => task.status === status),
      })),
    [tasks],
  )

  const move = (task: Task, direction: -1 | 1) => {
    const index = TASK_STATUSES.indexOf(task.status)
    const next = TASK_STATUSES[index + direction]
    if (!next) return
    setTaskStatus(task.id, next)
    toast.success(`“${task.title}” → ${next}`)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {columns.map(({ status, items }) => {
        const limit = WIP_LIMITS[status]
        const over = limit !== undefined && items.length > limit
        const minutes = items.reduce((total, task) => total + (task.estimateMinutes || 30), 0)
        const index = TASK_STATUSES.indexOf(status)

        return (
          <Card
            key={status}
            className={cn('flex flex-col', over && 'border-warning/50')}
            aria-label={`${status} column, ${items.length} tasks`}
          >
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-1.5 text-sm">
                {over && <TriangleAlert className="h-3.5 w-3.5 text-warning" aria-hidden="true" />}
                {status}
                <span className="tabular-nums text-xs font-normal text-muted-foreground">{items.length}</span>
              </CardTitle>
              <span className="text-[11px] text-muted-foreground">
                {limit !== undefined ? `limit ${limit} · ` : ''}
                {formatMinutes(minutes)}
              </span>
            </CardHeader>

            <CardContent className="flex-1 space-y-2 p-3">
              {items.length === 0 && (
                <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                  Nothing here
                </p>
              )}

              {items.map((task) => {
                const due = describeDueDate(task.dueDate, task.status === 'Completed')
                return (
                  <div
                    key={task.id}
                    className="space-y-2 rounded-md border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/40"
                  >
                    <button
                      type="button"
                      onClick={() => onEdit(task)}
                      className="w-full text-left text-sm font-medium text-foreground hover:text-primary"
                    >
                      {task.title}
                    </button>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <PriorityPill priority={task.priority} />
                      {task.dueDate && <DueDatePill label={due.label} tone={due.tone} />}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {formatMinutes(task.estimateMinutes || 30)}
                        {task.dueTime ? ` · ${task.dueTime}` : ''}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          disabled={index === 0}
                          onClick={() => move(task, -1)}
                          aria-label={`Move “${task.title}” to ${TASK_STATUSES[index - 1]}`}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          disabled={index === TASK_STATUSES.length - 1}
                          onClick={() => move(task, 1)}
                          aria-label={`Move “${task.title}” to ${TASK_STATUSES[index + 1]}`}
                        >
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>

                    <Select value={task.status} onValueChange={(value) => setTaskStatus(task.id, value as TaskStatus)}>
                      <SelectTrigger
                        className="h-7 w-full text-xs"
                        aria-label={`Status for “${task.title}”`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_STATUSES.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
      <p className="sr-only" aria-live="polite">
        Board updated. Focus window {settings.workdayStart}–{settings.workdayEnd}.
      </p>
    </div>
  )
}

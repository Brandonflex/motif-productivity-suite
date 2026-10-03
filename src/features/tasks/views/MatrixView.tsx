import { useMemo } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@blinkdotnew/ui'
import { CalendarClock, Flame, Trash2, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { DueDatePill, PriorityPill } from '@/components/ui/Pills'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { describeDueDate, formatMinutes, todayIso } from '@/lib/dates'
import { addDaysIso } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { Task } from '@/types/workspace'

/**
 * Eisenhower matrix (TickTick), derived rather than manual.
 *
 * Importance comes from priority, urgency from the due date, so the quadrants
 * cannot drift out of sync with the list — move a due date and the matrix
 * follows. Each quadrant offers the one action that actually helps: do it,
 * schedule it, hand it over, or drop it.
 */
type QuadrantKey = 'do' | 'schedule' | 'delegate' | 'drop'

interface Quadrant {
  key: QuadrantKey
  title: string
  advice: string
  icon: typeof Flame
  tone: string
}

const QUADRANTS: Quadrant[] = [
  { key: 'do', title: 'Do now', advice: 'Urgent and important — clear these first.', icon: Flame, tone: 'border-destructive/40' },
  { key: 'schedule', title: 'Schedule', advice: 'Important, not urgent — give them a real slot.', icon: CalendarClock, tone: 'border-info/40' },
  { key: 'delegate', title: 'Hand over', advice: 'Urgent but low value to you — pass it on.', icon: Users, tone: 'border-warning/40' },
  { key: 'drop', title: 'Drop or defer', advice: 'Neither urgent nor important. Be honest.', icon: Trash2, tone: 'border-border' },
]

/** Urgency window: due within two days, or already late. */
const URGENT_DAYS = 2

function quadrantOf(task: Task): QuadrantKey {
  const days = describeDueDate(task.dueDate, false).daysRemaining
  const urgent = days !== null && days <= URGENT_DAYS
  const important = task.priority === 'High' || task.status === 'In Progress'

  if (urgent && important) return 'do'
  if (important) return 'schedule'
  if (urgent) return 'delegate'
  return 'drop'
}

export function MatrixView({ tasks, onEdit }: { tasks: Task[]; onEdit: (task: Task) => void }) {
  const { setTaskStatus, snoozeTask, deleteTask } = useWorkspace()

  const grouped = useMemo(() => {
    const map: Record<QuadrantKey, Task[]> = { do: [], schedule: [], delegate: [], drop: [] }
    for (const task of tasks) {
      if (task.status === 'Completed') continue
      map[quadrantOf(task)].push(task)
    }
    return map
  }, [tasks])

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {QUADRANTS.map(({ key, title, advice, icon: Icon, tone }) => {
        const items = grouped[key]
        const minutes = items.reduce((total, task) => total + (task.estimateMinutes || 30), 0)

        return (
          <Card key={key} className={cn('flex flex-col', tone)}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {title}
                <span className="tabular-nums text-xs font-normal text-muted-foreground">
                  {items.length} · {formatMinutes(minutes)}
                </span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">{advice}</p>
            </CardHeader>

            <CardContent className="flex-1 space-y-2">
              {items.length === 0 && (
                <p className="rounded-md border border-dashed border-border px-3 py-5 text-center text-xs text-muted-foreground">
                  Empty — good.
                </p>
              )}

              {items.map((task) => {
                const due = describeDueDate(task.dueDate, false)
                return (
                  <div key={task.id} className="rounded-md border border-border bg-card p-3">
                    <button
                      type="button"
                      onClick={() => onEdit(task)}
                      className="w-full text-left text-sm font-medium text-foreground hover:text-primary"
                    >
                      {task.title}
                    </button>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <PriorityPill priority={task.priority} />
                      <DueDatePill label={due.label} tone={due.tone} />
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {key === 'do' && (
                        <Button size="sm" variant="outline" onClick={() => setTaskStatus(task.id, 'In Progress')}>
                          Start now
                        </Button>
                      )}
                      {key === 'schedule' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            snoozeTask(task.id, 3)
                            toast.success('Scheduled three days out')
                          }}
                        >
                          Slot in 3 days
                        </Button>
                      )}
                      {key === 'delegate' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTaskStatus(task.id, 'Pending')
                            snoozeTask(task.id, 1)
                          }}
                        >
                          Hand over
                        </Button>
                      )}
                      {key === 'drop' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            deleteTask(task.id)
                            toast('Removed', { icon: '🗑️' })
                          }}
                        >
                          Drop
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => onEdit(task)}>
                        Edit
                      </Button>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
      <p className="sr-only">
        Quadrants update automatically: priority decides importance, due dates decide urgency. Today is {todayIso()},
        the urgent window ends {addDaysIso(todayIso(), URGENT_DAYS)}.
      </p>
    </div>
  )
}

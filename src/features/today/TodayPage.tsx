import { useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
  PageActions,
  PageBody,
  PageDescription,
  PageTitle,
  Progress,
} from '@blinkdotnew/ui'
import { CalendarCheck, Moon, Sun, Sunrise, TriangleAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeaderBar } from '@/components/ui/PageHeaderBar'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FocusTimer } from '@/features/focus/FocusTimer'
import { QuickAddField } from '@/components/quick-add/QuickAdd'
import { DueDatePill, PriorityPill } from '@/components/ui/Pills'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatFullDate, formatMinutes, minutesToClock, todayIso } from '@/lib/dates'
import { planDay } from '@/lib/plan'
import { describeDueDate } from '@/lib/dates'
import { cn } from '@/lib/utils'

/**
 * Today — the daily ritual page (Sunsama's plan → work → shutdown loop, with
 * Motion-style automatic time-boxing underneath).
 *
 * Morning: commit to a realistic set of work. During the day: one focus timer
 * and the plan, nothing else. Evening: a two-minute shutdown that closes the
 * books and (optionally) pushes the leftovers to tomorrow.
 */
export function TodayPage() {
  useDocumentTitle('Today')
  const {
    tasks,
    settings,
    todayLog,
    stats,
    commitPlan,
    shutdownDay,
    toggleTaskStatus,
    setTaskStatus,
    snoozeTask,
  } = useWorkspace()

  const [planning, setPlanning] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [shutdownOpen, setShutdownOpen] = useState(false)
  const [rollover, setRollover] = useState<string[]>([])
  const [focusTaskId, setFocusTaskId] = useState<string | undefined>(undefined)

  const today = todayIso()
  const plan = useMemo(() => planDay(tasks, settings), [tasks, settings])

  const committed = useMemo(
    () => todayLog.plannedTaskIds.map((id) => tasks.find((task) => task.id === id)).filter((task) => task !== undefined),
    [tasks, todayLog.plannedTaskIds],
  )

  const openToday = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.status !== 'Completed' &&
          (task.dueDate === today ||
            task.status === 'In Progress' ||
            describeDueDate(task.dueDate, false).tone === 'overdue'),
      ),
    [tasks, today],
  )

  const plannedMinutes = committed
    .filter((task) => task.status !== 'Completed')
    .reduce((total, task) => total + (task.estimateMinutes || 30), 0)
  const capacity = settings.capacityMinutesPerDay
  const overCapacity = plannedMinutes > capacity

  const startPlanning = () => {
    setSelected(todayLog.plannedTaskIds.length > 0 ? todayLog.plannedTaskIds : plan.blocks.map((block) => block.task.id))
    setPlanning(true)
  }

  const savePlan = () => {
    commitPlan(selected)
    setPlanning(false)
    toast.success(`Committed to ${selected.length} task${selected.length === 1 ? '' : 's'} today`)
  }

  const openShutdown = () => {
    setRollover(
      openToday.filter((task) => task.status === 'Pending' || task.status === 'In Progress').map((task) => task.id),
    )
    setShutdownOpen(true)
  }

  const runShutdown = () => {
    shutdownDay({
      rolledOverTaskIds: rollover,
      note: `Completed ${stats.completedTasks} task${stats.completedTasks === 1 ? '' : 's'} overall · ${formatMinutes(stats.focusTodayMinutes)} focused today`,
    })
    setShutdownOpen(false)
    toast.success(
      rollover.length > 0 ? `Day closed · ${rollover.length} task(s) moved to tomorrow` : 'Day closed — nicely done',
      { icon: '🌙' },
    )
  }

  return (
    <>
      <PageHeaderBar>
        <div className="min-w-0">
          <PageTitle>Today</PageTitle>
          <PageDescription>
            {formatFullDate(today)} · {todayLog.plannedAt ? 'Plan committed' : 'Not planned yet'} ·{' '}
            {formatMinutes(stats.focusTodayMinutes)} focused
          </PageDescription>
        </div>
        <PageActions className="flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={startPlanning} className="gap-1.5">
            <Sunrise className="h-4 w-4" aria-hidden="true" />
            {todayLog.plannedAt ? 'Adjust plan' : 'Plan my day'}
          </Button>
          <Button size="sm" variant="outline" onClick={openShutdown} className="gap-1.5">
            <Moon className="h-4 w-4" aria-hidden="true" />
            Shut down
          </Button>
        </PageActions>
      </PageHeaderBar>

      <PageBody className="mx-auto w-full max-w-6xl">
        {overCapacity && (
          <Card className="border-warning/40 bg-warning/5">
            <CardContent className="flex items-start gap-3 pt-5">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  Today is over capacity: {formatMinutes(plannedMinutes)} planned of {formatMinutes(capacity)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Cut one thing now rather than carrying it all evening — that is the whole point of planning.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {planning ? (
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">Morning plan</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {formatMinutes(
                      selected
                        .map((id) => tasks.find((task) => task.id === id))
                        .filter((task) => task && task.status !== 'Completed')
                        .reduce((total, task) => total + (task?.estimateMinutes || 30), 0),
                    )}{' '}
                    selected
                  </span>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Pick what today is actually for. Anything you leave out stays on the list — nothing is lost, it just
                    is not promised today.
                  </p>
                  <ul className="max-h-96 space-y-1 overflow-y-auto pr-1">
                    {[...openToday, ...plan.deferred.filter((task) => !openToday.includes(task))].map((task) => {
                      const due = describeDueDate(task.dueDate, false)
                      const checked = selected.includes(task.id)
                      return (
                        <li key={task.id}>
                          <label
                            htmlFor={`plan-${task.id}`}
                            className={cn(
                              'flex cursor-pointer items-start gap-3 rounded-md border border-transparent p-2.5 hover:bg-muted/60',
                              checked && 'border-primary/30 bg-primary/5',
                            )}
                          >
                            <Checkbox
                              id={`plan-${task.id}`}
                              aria-label={task.title}
                              checked={checked}
                              onCheckedChange={() =>
                                setSelected((prev) =>
                                  prev.includes(task.id) ? prev.filter((id) => id !== task.id) : [...prev, task.id],
                                )
                              }
                              className="mt-0.5"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-foreground">{task.title}</span>
                              <span className="mt-1 flex flex-wrap items-center gap-1.5">
                                <PriorityPill priority={task.priority} />
                                <DueDatePill label={due.label} tone={due.tone} />
                                <span className="text-xs text-muted-foreground">
                                  {formatMinutes(task.estimateMinutes || 30)}
                                </span>
                              </span>
                            </span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={savePlan}>
                      Commit to today
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setPlanning(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                    {todayLog.plannedTaskIds.length > 0 ? 'Committed today' : 'Suggested plan'}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {formatMinutes(plannedMinutes)} of {formatMinutes(capacity)}
                  </span>
                </CardHeader>
                <CardContent className="p-0">
                  {committed.length === 0 && plan.blocks.length === 0 ? (
                    <EmptyState
                      icon={<Sun className="h-5 w-5" aria-hidden="true" />}
                      title="Nothing scheduled"
                      description="Plan your day, or capture something new — both start here."
                      action={{ label: 'Plan my day', onClick: startPlanning }}
                      className="py-10"
                    />
                  ) : (
                    <ul className="divide-y divide-border">
                      {(committed.length > 0
                        ? committed.map((task) => ({ task, start: task.dueTime, minutes: task.estimateMinutes || 30 }))
                        : plan.blocks.map((block) => ({
                            task: block.task,
                            start: minutesToClock(block.startMinute),
                            minutes: block.minutes,
                          }))
                      ).map(({ task, start, minutes }) => {
                        const isDone = task.status === 'Completed'
                        return (
                          <li key={task.id} className="flex items-start gap-3 px-6 py-3.5">
                            <Checkbox
                              checked={isDone}
                              onCheckedChange={() => toggleTaskStatus(task.id)}
                              aria-label={`Mark “${task.title}” as ${isDone ? 'incomplete' : 'complete'}`}
                              className="mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  'text-sm font-medium',
                                  isDone ? 'text-muted-foreground line-through' : 'text-foreground',
                                )}
                              >
                                {task.title}
                              </p>
                              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                {start && <span className="tabular-nums">{start}</span>}
                                <span>{formatMinutes(minutes)}</span>
                                {task.project !== 'Unassigned' && <span>· {task.project}</span>}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              {!isDone && (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => setFocusTaskId(task.id)}>
                                    Focus
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => snoozeTask(task.id, 1)}>
                                    +1d
                                  </Button>
                                </>
                              )}
                              {isDone && (
                                <Button size="sm" variant="ghost" onClick={() => setTaskStatus(task.id, 'Pending')}>
                                  Reopen
                                </Button>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Capture something</CardTitle>
              </CardHeader>
              <CardContent>
                <QuickAddField placeholder="Add to the pile, triage later — press Q anywhere" />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <FocusTimer presetTaskId={focusTaskId} />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Sunsama-style check</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-baseline justify-between">
                  <span className="text-muted-foreground">Committed</span>
                  <span className="tabular-nums font-medium">{formatMinutes(plannedMinutes)}</span>
                </div>
                <Progress value={capacity === 0 ? 0 : Math.min(100, (plannedMinutes / capacity) * 100)} aria-label="Capacity used" />
                <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                  <span>Capacity {formatMinutes(capacity)}</span>
                  <span>{overCapacity ? 'Over' : 'Healthy'}</span>
                </div>
                <dl className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Overdue</dt>
                    <dd className="tabular-nums text-lg font-semibold">{stats.overdueTasks}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Due today</dt>
                    <dd className="tabular-nums text-lg font-semibold">{stats.dueTodayTasks}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Streak</dt>
                    <dd className="tabular-nums text-lg font-semibold">{stats.streak}d</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Inbox</dt>
                    <dd className="tabular-nums text-lg font-semibold">{stats.inboxTasks}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageBody>

      <ConfirmDialog
        open={shutdownOpen}
        onOpenChange={setShutdownOpen}
        title="Shut down the day?"
        confirmLabel="Close the day"
        destructive={false}
        description={
          <div className="space-y-3 text-sm">
            <p>
              {stats.completedTasks} task{stats.completedTasks === 1 ? '' : 's'} completed overall ·{' '}
              {formatMinutes(stats.focusTodayMinutes)} focused today. Tick anything that should move to tomorrow:
            </p>
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {openToday.map((task) => (
                <li key={task.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded p-1.5 hover:bg-muted">
                    <Checkbox
                      checked={rollover.includes(task.id)}
                      onCheckedChange={() =>
                        setRollover((prev) =>
                          prev.includes(task.id) ? prev.filter((id) => id !== task.id) : [...prev, task.id],
                        )
                      }
                    />
                    <span className="text-sm">{task.title}</span>
                  </label>
                </li>
              ))}
              {openToday.length === 0 && <li className="text-muted-foreground">Nothing open — clean day.</li>}
            </ul>
          </div>
        }
        onConfirm={runShutdown}
      />
    </>
  )
}

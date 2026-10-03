import { useMemo } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, PageBody, PageDescription, PageTitle } from '@blinkdotnew/ui'
import { CalendarDays, Moon } from 'lucide-react'
import { PageHeaderBar } from '@/components/ui/PageHeaderBar'
import { DueDatePill, PriorityPill } from '@/components/ui/Pills'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { addDaysIso, describeDueDate, formatFullDate, formatMinutes, todayIso } from '@/lib/dates'
import { recurrenceBadge } from '@/lib/recurrence'
import type { Task } from '@/types/workspace'

/**
 * Upcoming (Things 3's "Upcoming", plus a Someday shelf).
 *
 * Work is grouped by the day it is due, so the shape of the next three weeks is
 * visible at a glance, and anything without a date waits on the Someday shelf
 * instead of clogging the list. Rescheduling is one click, which is what keeps
 * the dates honest.
 */
const HORIZON_DAYS = 21

export function UpcomingPage() {
  useDocumentTitle('Upcoming')
  const { tasks, toggleTaskStatus, snoozeTask } = useWorkspace()

  const today = todayIso()
  const horizon = addDaysIso(today, HORIZON_DAYS)

  const groups = useMemo(() => {
    const open = tasks.filter((task) => task.status !== 'Completed')
    const overdue = open.filter((task) => task.dueDate && task.dueDate < today)
    const scheduled = open
      .filter((task) => task.dueDate >= today && task.dueDate <= horizon)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || (a.dueTime || '').localeCompare(b.dueTime || ''))
    const later = open.filter((task) => task.dueDate > horizon).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    const someday = open
      .filter((task) => !task.dueDate)
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title))

    const byDay = new Map<string, Task[]>()
    for (const task of scheduled) {
      const list = byDay.get(task.dueDate) ?? []
      list.push(task)
      byDay.set(task.dueDate, list)
    }

    return { overdue, byDay, later, someday }
  }, [horizon, tasks, today])

  const Row = ({ task }: { task: Task }) => {
    const due = describeDueDate(task.dueDate, false)
    const badge = recurrenceBadge(task.recurrence)
    return (
      <li className="flex items-start gap-3 px-6 py-3">
        <Checkbox
          checked={task.status === 'Completed'}
          onCheckedChange={() => toggleTaskStatus(task.id)}
          aria-label={`Mark “${task.title}” as complete`}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{task.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <PriorityPill priority={task.priority} />
            {task.dueDate && <DueDatePill label={due.label} tone={due.tone} />}
            {badge && <span className="text-[11px] text-muted-foreground">{badge}</span>}
            <span className="text-xs text-muted-foreground">
              {task.dueTime ? `${task.dueTime} · ` : ''}
              {formatMinutes(task.estimateMinutes || 30)}
            </span>
            {task.blockedBy.length > 0 && (
              <span className="text-[11px] text-warning">blocked by {task.blockedBy.length}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => snoozeTask(task.id, 1)} aria-label={`Push “${task.title}” by one day`}>
            +1d
          </Button>
          <Button size="sm" variant="ghost" onClick={() => snoozeTask(task.id, 7)} aria-label={`Push “${task.title}” by a week`}>
            +1w
          </Button>
        </div>
      </li>
    )
  }

  const Section = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
    <Card>
      <CardHeader className="flex-row items-baseline justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">{children}</ul>
      </CardContent>
    </Card>
  )

  const days = [...groups.byDay.entries()].filter(([, list]) => list.length > 0)

  return (
    <>
      <PageHeaderBar>
        <div className="min-w-0">
          <PageTitle>Upcoming</PageTitle>
          <PageDescription>
            The next {HORIZON_DAYS} days, day by day · {groups.someday.length} on the Someday shelf
          </PageDescription>
        </div>
      </PageHeaderBar>

      <PageBody className="mx-auto w-full max-w-4xl space-y-6">
        {groups.overdue.length > 0 && (
          <Section title="Overdue" subtitle={`${groups.overdue.length} task(s)`}>
            {groups.overdue.map((task) => (
              <Row key={task.id} task={task} />
            ))}
          </Section>
        )}

        {days.map(([date, list]) => (
          <Section
            key={date}
            title={date === today ? 'Today' : date === addDaysIso(today, 1) ? 'Tomorrow' : formatFullDate(date)}
            subtitle={`${list.length} · ${formatMinutes(list.reduce((total, task) => total + (task.estimateMinutes || 30), 0))}`}
          >
            {list.map((task) => (
              <Row key={task.id} task={task} />
            ))}
          </Section>
        ))}

        {days.length === 0 && groups.overdue.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <CalendarDays className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">Nothing scheduled in the next three weeks</p>
              <p className="text-xs text-muted-foreground">
                Give a task a due date, or leave it on the Someday shelf below.
              </p>
            </CardContent>
          </Card>
        )}

        {groups.later.length > 0 && (
          <Section title="Later" subtitle={`${groups.later.length} beyond ${horizon}`}>
            {groups.later.map((task) => (
              <Row key={task.id} task={task} />
            ))}
          </Section>
        )}

        <Section title="Someday" subtitle="No date committed">
          {groups.someday.length === 0 ? (
            <li className="flex items-center gap-2 px-6 py-6 text-sm text-muted-foreground">
              <Moon className="h-4 w-4" aria-hidden="true" />
              Everything has a date. Nice.
            </li>
          ) : (
            groups.someday.map((task) => <Row key={task.id} task={task} />)
          )}
        </Section>
      </PageBody>
    </>
  )
}

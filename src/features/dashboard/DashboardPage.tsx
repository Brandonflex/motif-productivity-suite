import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
  Page,
  PageActions,
  PageBody,
  PageDescription,
  PageTitle,
  Progress,
  Stat,
  StatGroup,
} from '@blinkdotnew/ui'
import { ArrowRight, CalendarClock, CheckCircle2, FolderKanban, ListChecks, Plus, TriangleAlert } from 'lucide-react'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { momentum, projectRollups, workload } from '@/lib/analytics'
import { formatMinutes } from '@/lib/dates'
import { describeDueDate, dueDateSortKey, formatDueDate, isValidIsoDate } from '@/lib/dates'
import { DueDatePill, ProjectStatusPill } from '@/components/ui/Pills'
import { PageHeaderBar } from '@/components/ui/PageHeaderBar'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { TiltCard } from '@/components/ui/TiltCard'
import { RhythmGraph } from '@/features/achievements/RhythmGraph'
import { useAchievements } from '@/features/achievements/useAchievements'
import { Flame } from 'lucide-react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useHotkeys } from '@/hooks/useHotkeys'
import { UNASSIGNED_PROJECT } from '@/types/workspace'

const UPCOMING_LIMIT = 5

export function DashboardPage() {
  useDocumentTitle('Dashboard')
  const navigate = useNavigate()
  const { tasks, projects, stats, toggleTaskStatus, focusSessions, settings, todayLog } = useWorkspace()

  const { xp, streak, shelf, history } = useAchievements()
  const nextBadge = useMemo(() => {
    const locked = shelf.filter((state) => !state.unlocked)
    return locked.length === 0
      ? null
      : locked.reduce((best, state) => (state.ratio > best.ratio ? state : best), locked[0]!)
  }, [shelf])

  const score = useMemo(() => momentum(tasks, focusSessions), [focusSessions, tasks])
  const load = useMemo(() => workload(tasks, settings), [tasks, settings])
  const rollups = useMemo(() => projectRollups(projects, tasks), [projects, tasks])

  useHotkeys({ n: () => navigate('/tasks?new=1') })

  const upcoming = useMemo(
    () =>
      tasks
        .filter((task) => task.status !== 'Completed')
        .sort((a, b) => {
          const byDue = dueDateSortKey(a.dueDate).localeCompare(dueDateSortKey(b.dueDate))
          return byDue !== 0 ? byDue : a.title.localeCompare(b.title)
        })
        .slice(0, UPCOMING_LIMIT),
    [tasks],
  )

  const distribution = useMemo(() => {
    const buckets = [
      { label: 'Completed', status: 'Completed' as const, bar: 'bg-success' },
      { label: 'In Progress', status: 'In Progress' as const, bar: 'bg-info' },
      { label: 'Pending', status: 'Pending' as const, bar: 'bg-muted-foreground/50' },
    ]
    return buckets.map((bucket) => {
      const count = tasks.filter((task) => task.status === bucket.status).length
      return {
        ...bucket,
        count,
        percent: tasks.length === 0 ? 0 : Math.round((count / tasks.length) * 100),
      }
    })
  }, [tasks])

  const projectsWithLoad = rollups.map((rollup) => ({
    ...rollup.project,
    taskCount: rollup.total,
    doneCount: rollup.done,
    overdue: rollup.overdue,
    openMinutes: rollup.openMinutes,
    // Rollup projects show derived progress; manual ones keep their slider value.
    progress: rollup.project.autoProgress ? rollup.percent : rollup.project.progress,
  }))

  return (
    <Page>
      <PageHeaderBar>
        <div className="min-w-0">
          <PageTitle>Dashboard</PageTitle>
          <PageDescription>Here is what is happening in your workspace today.</PageDescription>
        </div>
        <PageActions className="flex-wrap gap-2">
          <Button onClick={() => navigate('/tasks?new=1')} size="sm" aria-keyshortcuts="n">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New task
          </Button>
        </PageActions>
      </PageHeaderBar>

      <PageBody className="px-4 sm:px-6 mx-auto w-full max-w-6xl">
        <StatGroup>
          <TiltCard intensity={5}>
            <Stat
              label="Active projects"
              value={`${stats.activeProjects} / ${stats.totalProjects}`}
              icon={<FolderKanban className="h-4 w-4" aria-hidden="true" />}
              description="Projects currently in flight"
            />
          </TiltCard>
          <TiltCard intensity={5}>
            <Stat
              label="Open tasks"
              value={stats.openTasks}
              icon={<ListChecks className="h-4 w-4" aria-hidden="true" />}
              description={`${stats.totalTasks} total in workspace`}
            />
          </TiltCard>
          <TiltCard intensity={5}>
            <Stat
              label="Completed"
              value={stats.completedTasks}
              icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              description={`${stats.completionRate}% completion rate`}
            />
          </TiltCard>
          <TiltCard intensity={5}>
            <Stat
              label="Focus today"
              value={formatMinutes(stats.focusTodayMinutes)}
              icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
              description={`${score.level} · ${score.score} momentum`}
            />
          </TiltCard>
          <TiltCard intensity={5}>
            <Stat
              label="Due today / overdue"
              value={`${stats.dueTodayTasks} / ${stats.overdueTasks}`}
              icon={
                stats.overdueTasks > 0 ? (
                  <TriangleAlert className="h-4 w-4 text-destructive" aria-hidden="true" />
                ) : (
                  <CalendarClock className="h-4 w-4" aria-hidden="true" />
                )
              }
              description={stats.overdueTasks > 0 ? 'Needs attention' : 'Nothing overdue'}
            />
          </TiltCard>
        </StatGroup>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Today + capacity (Sunsama's check-in, Motion's plan) */}
          <Card className="lg:col-span-3">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">Today</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/today"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  {todayLog.plannedAt ? 'Open today’s plan' : 'Plan my day'}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <Link
                  to="/inbox"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Triage {stats.inboxTasks} inbox item{stats.inboxTasks === 1 ? '' : 's'}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Committed today</p>
                <p className="tabular-nums text-lg font-semibold">
                  {todayLog.plannedTaskIds.length} task{todayLog.plannedTaskIds.length === 1 ? '' : 's'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.dueTodayTasks} due today · {stats.inProgressTasks} in progress
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Capacity (next 7 days)</p>
                <p className="tabular-nums text-lg font-semibold">
                  {formatMinutes(load.committedMinutes)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {' '}
                    / {formatMinutes(load.capacityMinutes)}
                  </span>
                </p>
                <Progress
                  value={Math.min(100, load.ratio * 100)}
                  aria-label="Committed work against capacity"
                  className={load.over ? '[&>div]:bg-warning' : undefined}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Streak</p>
                <p className="flex items-baseline gap-1.5 tabular-nums text-lg font-semibold">
                  {streak.current} day{streak.current === 1 ? '' : 's'}
                  <Flame
                    className={streak.activeToday ? 'h-4 w-4 text-brand' : 'h-4 w-4 text-muted-foreground'}
                    aria-hidden="true"
                  />
                </p>
                <p className="text-xs text-muted-foreground">
                  {streak.atRisk
                    ? `${streak.daysToMilestone} to the ${streak.nextMilestone}-day badge — anything counts`
                    : `${streak.shieldsHeld} shield${streak.shieldsHeld === 1 ? '' : 's'} banked · longest ${streak.longest}`}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Rhythm — the daily reason to come back, not just a stat block */}
          <Card className="lg:col-span-3">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">Rhythm</CardTitle>
              <Link
                to="/insights"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Every badge and the full year
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-[auto,1fr]">
              <div className="flex items-center gap-4">
                <ProgressRing
                  value={xp.progress * 100}
                  size={116}
                  thickness={10}
                  tone="brand"
                  pulse={streak.activeToday}
                  label={`Level ${xp.level}, ${xp.title}, ${Math.round(xp.progress * 100)} percent to the next rank`}
                >
                  <span className="flex flex-col items-center leading-none">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Level</span>
                    <span className="text-2xl font-semibold text-foreground">{xp.level}</span>
                  </span>
                </ProgressRing>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-foreground">{xp.title}</p>
                  <p className="text-xs text-muted-foreground">{xp.xp.toLocaleString()} XP earned</p>
                  {nextBadge && (
                    <p className="text-xs text-muted-foreground">
                      Next badge: <span className="font-medium text-foreground">{nextBadge.name}</span> —{' '}
                      {nextBadge.progress}/{nextBadge.target}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {streak.current} day streak · longest {streak.longest}
                  </p>
                </div>
              </div>
              <RhythmGraph history={history} weeks={14} />
            </CardContent>
          </Card>

          {/* Up next */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Up next</CardTitle>
              <Link
                to="/tasks"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View all tasks
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {upcoming.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
                  title="Nothing open"
                  description="Every task in this workspace is complete."
                  action={{ label: 'Create a task', onClick: () => navigate('/tasks?new=1') }}
                  className="py-10"
                />
              ) : (
                <ul className="divide-y divide-border">
                  {upcoming.map((task) => {
                    const due = describeDueDate(task.dueDate, task.status === 'Completed')
                    return (
                      <li key={task.id} className="flex items-start gap-3 px-6 py-3.5">
                        <Checkbox
                          id={`upcoming-${task.id}`}
                          checked={task.status === 'Completed'}
                          onCheckedChange={() => toggleTaskStatus(task.id)}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <label
                            htmlFor={`upcoming-${task.id}`}
                            className="block cursor-pointer truncate text-sm font-medium text-foreground"
                          >
                            {task.title}
                          </label>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {task.project === UNASSIGNED_PROJECT ? 'No project' : task.project}
                            {isValidIsoDate(task.dueDate) ? ` · ${formatDueDate(task.dueDate)}` : ''}
                          </p>
                        </div>
                        <DueDatePill label={due.label} tone={due.tone} />
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Task pipeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-1.5 flex items-baseline justify-between text-xs text-muted-foreground">
                  <span>Completion</span>
                  <span className="tabular-nums font-medium text-foreground">{stats.completionRate}%</span>
                </div>
                <Progress value={stats.completionRate} aria-label="Completion rate" />
              </div>

              <ul className="space-y-3">
                {distribution.map((bucket) => (
                  <li key={bucket.label}>
                    <div className="mb-1.5 flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground">{bucket.label}</span>
                      <span className="tabular-nums font-medium text-foreground">
                        {bucket.count}
                        <span className="ml-1 text-muted-foreground">({bucket.percent}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <div className={`h-full rounded-full ${bucket.bar}`} style={{ width: `${bucket.percent}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Projects overview */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Projects</CardTitle>
            <Link
              to="/projects"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Manage projects
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {projectsWithLoad.length === 0 ? (
              <EmptyState
                icon={<FolderKanban className="h-5 w-5" aria-hidden="true" />}
                title="No projects yet"
                description="Group related tasks under a project to track progress."
                action={{ label: 'Create a project', onClick: () => navigate('/projects?new=1') }}
                className="py-10"
              />
            ) : (
              <ul className="divide-y divide-border">
                {projectsWithLoad.map((project) => (
                  <li key={project.id} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:gap-6">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {project.doneCount} of {project.taskCount} tasks complete
                        {project.taskCount > 0 && ` · ${formatMinutes(project.openMinutes)} left`}
                        {project.overdue > 0 && ` · ${project.overdue} overdue`}
                        {project.taskCount === 0 && ' · no tasks linked yet'}
                      </p>
                    </div>
                    <ProjectStatusPill status={project.status} className="self-start sm:self-auto" />
                    <div className="flex w-full items-center gap-3 sm:w-48">
                      <Progress value={project.progress} aria-label={`${project.name} progress`} />
                      <span className="tabular-nums w-9 shrink-0 text-right text-xs text-muted-foreground">
                        {project.progress}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </PageBody>
    </Page>
  )
}

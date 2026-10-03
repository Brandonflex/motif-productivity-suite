import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, PageBody, PageDescription, PageTitle, Progress, Stat, StatGroup } from '@blinkdotnew/ui'
import { Activity, BarChart3, Flame, LineChart, Target, Timer, TrendingUp } from 'lucide-react'
import { PageHeaderBar } from '@/components/ui/PageHeaderBar'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  dailyActivity,
  focusByTask,
  heatmapWeeks,
  momentum,
  projectRollups,
  weeklyReview,
  workload,
} from '@/lib/analytics'
import { formatMinutes } from '@/lib/dates'
import { cn } from '@/lib/utils'

/**
 * Insights — the weekly review made cheap.
 *
 * Everything here is derived from real activity: completions carry a timestamp,
 * focus intervals are logged, estimates are compared with what actually happened.
 * The point is not a dashboard for its own sake but the two questions a review
 * should answer: is the important work moving, and where did the time go?
 */
const DAYS = 28

export function InsightsPage() {
  useDocumentTitle('Insights')
  const { tasks, focusSessions, projects, settings, stats } = useWorkspace()

  const buckets = useMemo(() => dailyActivity(tasks, focusSessions, DAYS), [focusSessions, tasks])
  const weeks = useMemo(() => heatmapWeeks(buckets), [buckets])
  const score = useMemo(() => momentum(tasks, focusSessions), [focusSessions, tasks])
  const review = useMemo(() => weeklyReview(tasks, focusSessions), [focusSessions, tasks])
  const load = useMemo(() => workload(tasks, settings), [tasks, settings])
  const rollups = useMemo(() => projectRollups(projects, tasks), [projects, tasks])
  const focusRanking = useMemo(() => focusByTask(focusSessions).slice(0, 5), [focusSessions])

  const maxCompleted = Math.max(1, ...buckets.map((bucket) => bucket.completed))
  const focusMinutes = buckets.reduce((total, bucket) => total + bucket.focusMinutes, 0)
  const bestDay = buckets.reduce((best, bucket) => (bucket.completed > best.completed ? bucket : best), buckets[0]!)

  return (
    <>
      <PageHeaderBar>
        <div className="min-w-0">
          <PageTitle>Insights</PageTitle>
          <PageDescription>Four weeks of momentum, focus and capacity — the numbers behind the list.</PageDescription>
        </div>
      </PageHeaderBar>

      <PageBody className="mx-auto w-full max-w-6xl">
        <StatGroup>
          <Stat
            label="Momentum"
            value={score.score}
            icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
            description={`${score.level} · ${score.points >= 0 ? '+' : ''}${score.points} pts`}
          />
          <Stat
            label="Streak"
            value={`${stats.streak}d`}
            icon={<Flame className="h-4 w-4" aria-hidden="true" />}
            description="Days in a row with progress"
          />
          <Stat
            label="Focus (4 weeks)"
            value={formatMinutes(focusMinutes)}
            icon={<Timer className="h-4 w-4" aria-hidden="true" />}
            description={`${formatMinutes(stats.focusTodayMinutes)} today`}
          />
          <Stat
            label="Completed (4 weeks)"
            value={buckets.reduce((total, bucket) => total + bucket.completed, 0)}
            icon={<Activity className="h-4 w-4" aria-hidden="true" />}
            description={`Best day: ${bestDay.completed} task(s)`}
          />
        </StatGroup>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
                Completion heatmap
              </CardTitle>
              <span className="text-xs text-muted-foreground">Last {DAYS} days</span>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1 overflow-x-auto pb-1" role="img" aria-label={`Daily completions for the last ${DAYS} days`}>
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {week.map((day, dayIndex) => {
                      const intensity =
                        !day.date || day.completed === 0
                          ? 0
                          : Math.min(4, Math.ceil((day.completed / maxCompleted) * 4))
                      return (
                        <span
                          key={`${weekIndex}-${dayIndex}`}
                          title={day.date ? `${day.date} · ${day.completed} completed · ${formatMinutes(day.focusMinutes)} focus` : ''}
                          className={cn(
                            'h-4 w-4 rounded-sm border',
                            intensity === 0 && 'border-border bg-muted/40',
                            intensity === 1 && 'border-success/30 bg-success/20',
                            intensity === 2 && 'border-success/40 bg-success/40',
                            intensity === 3 && 'border-success/50 bg-success/60',
                            intensity === 4 && 'border-success/60 bg-success/80',
                          )}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Each square is a day; darker means more finished. Hover for the detail.
              </p>

              <div className="mt-5 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tasks completed per day</p>
                <div className="flex h-24 items-end gap-1" role="img" aria-label="Tasks completed per day">
                  {buckets.map((bucket) => (
                    <span
                      key={bucket.date}
                      title={`${bucket.date}: ${bucket.completed}`}
                      style={{ height: `${Math.max(4, (bucket.completed / maxCompleted) * 100)}%` }}
                      className={cn('flex-1 rounded-t-sm', bucket.completed > 0 ? 'bg-primary/70' : 'bg-muted')}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4 text-primary" aria-hidden="true" />
                  Weekly review
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <dl className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <dt className="text-muted-foreground">Completed</dt>
                    <dd className="tabular-nums font-medium">{review.completed}</dd>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <dt className="text-muted-foreground">Captured</dt>
                    <dd className="tabular-nums font-medium">{review.created}</dd>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <dt className="text-muted-foreground">Focused</dt>
                    <dd className="tabular-nums font-medium">{formatMinutes(review.focusMinutes)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <dt className="text-muted-foreground">Overdue now</dt>
                    <dd className={cn('tabular-nums font-medium', review.overdue > 0 && 'text-destructive')}>
                      {review.overdue}
                    </dd>
                  </div>
                </dl>
                <p className="text-xs text-muted-foreground">
                  {review.completed >= review.created
                    ? 'You finished more than you added — the list is shrinking.'
                    : 'More went in than came out this week. Worth a triage pass.'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <LineChart className="h-4 w-4 text-primary" aria-hidden="true" />
                  Capacity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-baseline justify-between">
                  <span className="text-muted-foreground">Next 7 days</span>
                  <span className="tabular-nums font-medium">
                    {formatMinutes(load.committedMinutes)} / {formatMinutes(load.capacityMinutes)}
                  </span>
                </div>
                <Progress
                  value={Math.min(100, load.ratio * 100)}
                  aria-label="Committed work against capacity"
                  className={load.over ? '[&>div]:bg-warning' : undefined}
                />
                <p className="text-xs text-muted-foreground">
                  {load.over
                    ? 'More is promised than fits. Move something now rather than failing later.'
                    : `${Math.round((1 - load.ratio) * 100)}% of capacity left to promise.`}
                  {load.unestimated > 0 && ` ${load.unestimated} task(s) assumed at 30m.`}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Project rollups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rollups.length === 0 && <p className="text-sm text-muted-foreground">No projects yet.</p>}
              {rollups.map(({ project, total, done, percent, openMinutes, overdue }) => (
                <div key={project.id} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <Link to="/projects" className="truncate font-medium text-foreground hover:text-primary">
                      {project.name}
                    </Link>
                    <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                      {done}/{total} done · {formatMinutes(openMinutes)} left
                      {overdue > 0 && <span className="text-destructive"> · {overdue} overdue</span>}
                    </span>
                  </div>
                  <Progress value={percent} aria-label={`${project.name} completion`} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Where the focus went</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {focusRanking.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No focus sessions yet — start the timer on the Today page and this fills in.
                </p>
              ) : (
                focusRanking.map((entry) => {
                  const task = tasks.find((candidate) => candidate.id === entry.taskId)
                  return (
                    <div key={entry.taskId} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate text-foreground">{task?.title ?? 'Deleted task'}</span>
                      <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                        {formatMinutes(entry.minutes)}
                        {task && task.estimateMinutes > 0 && ` / ${formatMinutes(task.estimateMinutes)} est.`}
                      </span>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  )
}

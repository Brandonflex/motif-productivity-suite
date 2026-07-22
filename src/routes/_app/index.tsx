import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CheckCircle2,
  Clock,
  CalendarDays,
  Plus,
  ChevronRight,
  Inbox,
  Target,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'


interface Task {
  id: string
  title: string
  project: string
  priority: 'high' | 'medium' | 'low'
  dueDate: string
  status: 'todo' | 'in_progress' | 'done'
}

interface UpcomingDeadline {
  id: string
  title: string
  project: string
  dueDate: string
  daysLeft: number
}

/** ── Mock Data (will be replaced with DB queries) ─────────────── */

const STATS = [
  { label: 'Open Tasks', value: 12, icon: Inbox, change: '+3 this week' },
  { label: 'Completed', value: 47, icon: CheckCircle2, change: '8 this week' },
  { label: 'In Progress', value: 5, icon: Clock, change: 'Across 3 projects' },
  { label: 'Projects', value: 6, icon: Target, change: '2 active' },
]

const RECENT_TASKS: Task[] = [
  { id: '1', title: 'Finalize Q3 roadmap', project: 'Strategy', priority: 'high', dueDate: '2026-07-10', status: 'in_progress' },
  { id: '2', title: 'Review design system tokens', project: 'Design', priority: 'medium', dueDate: '2026-07-08', status: 'todo' },
  { id: '3', title: 'Update API documentation', project: 'Engineering', priority: 'low', dueDate: '2026-07-15', status: 'todo' },
  { id: '4', title: 'Client presentation prep', project: 'Sales', priority: 'high', dueDate: '2026-07-07', status: 'in_progress' },
  { id: '5', title: 'Database migration plan', project: 'Engineering', priority: 'high', dueDate: '2026-07-12', status: 'todo' },
]

const UPCOMING: UpcomingDeadline[] = [
  { id: '1', title: 'Sprint review', project: 'Engineering', dueDate: '2026-07-07', daysLeft: 1 },
  { id: '2', title: 'Design critique', project: 'Design', dueDate: '2026-07-09', daysLeft: 3 },
  { id: '3', title: 'Quarterly planning', project: 'Strategy', dueDate: '2026-07-14', daysLeft: 8 },
]

/** ── Priority Colors ──────────────────────────────────────────── */

const priorityStyles: Record<Task['priority'], string> = {
  high: 'text-destructive bg-destructive/8',
  medium: 'text-chart-3 bg-amber-500/8',
  low: 'text-muted-foreground bg-muted',
}

const statusStyles: Record<Task['status'], string> = {
  todo: 'border-l-muted-foreground/30',
  in_progress: 'border-l-accent',
  done: 'border-l-emerald-500',
}

/** ── Components ───────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon: Icon,
  change,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  change: string
}) {
  return (
    <div className="group relative rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{change}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

function TaskRow({ task }: { task: Task }) {
  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-all hover:shadow-sm',
        'border-l-2',
        statusStyles[task.status]
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {task.title}
        </p>
        <p className="text-xs text-muted-foreground">{task.project}</p>
      </div>
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
          priorityStyles[task.priority]
        )}
      >
        {task.priority}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {new Date(task.dueDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}
      </span>
    </div>
  )
}

function DeadlineItem({ deadline }: { deadline: UpcomingDeadline }) {
  const urgent = deadline.daysLeft <= 2

  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50">
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular-nums',
          urgent
            ? 'bg-destructive/10 text-destructive'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {deadline.daysLeft}d
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {deadline.title}
        </p>
        <p className="text-xs text-muted-foreground">{deadline.project}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
    </div>
  )
}

/** ── Page ─────────────────────────────────────────────────────── */

export function DashboardPage() {
  const navigate = useNavigate()
  
  const [greeting] = useState(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  })

  return (
    <div className="animate-fade-in space-y-8 p-6 lg:p-8">
      {/* ── Header ─────────────────────────────────── */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {greeting}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening across your workspaces.
        </p>
      </header>

      {/* ── Stats ──────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* ── Main content grid ──────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Recent tasks */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Recent Tasks
              </h2>
              <p className="text-xs text-muted-foreground">
                Tasks across all projects
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" />
              New Task
            </button>
          </div>

          <div className="space-y-2">
            {RECENT_TASKS.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigate('/tasks')}
            className="inline-flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent/80"
          >
            View all tasks
            <ChevronRight className="h-4 w-4" />
          </button>
        </section>

        {/* Upcoming deadlines */}
        <aside className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Upcoming
            </h2>
            <p className="text-xs text-muted-foreground">
              Deadlines this week
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-1">
            {UPCOMING.map((deadline) => (
              <DeadlineItem key={deadline.id} deadline={deadline} />
            ))}
          </div>

          {/* Quick tip */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Try keyboard shortcuts
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Press{' '}
                  <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[11px] font-mono">
                    ⌘K
                  </kbd>{' '}
                  to open the command palette and navigate faster.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
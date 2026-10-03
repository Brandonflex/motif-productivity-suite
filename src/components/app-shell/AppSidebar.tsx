import { useEffect, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import {
  Button,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarSeparator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useAppShell,
} from '@blinkdotnew/ui'
import {
  CalendarDays,
  CheckSquare,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  LineChart,
  PanelLeft,
  Settings,
  Sparkles,
  Sunrise,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { writeSidebarCollapsed } from '@/lib/sidebar'
import { MotifMark } from '@/components/brand/MotifMark'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { useAchievements } from '@/features/achievements/useAchievements'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { ETHOS_SHORT } from '@/content/story'
import { useShellActions } from './shell-actions'
import { ThemeCycleButton, ThemeToggle } from './ThemeToggle'

/** Stable id so the collapse controls can describe what they toggle. */
const SIDEBAR_ID = 'app-sidebar'

interface NavItemDef {
  to: string
  label: string
  icon: ReactNode
  /** Live counter rendered as a pill (hidden in the collapsed rail). */
  count?: number
  end?: boolean
}

function NavItem({ item, collapsed }: { item: NavItemDef; collapsed: boolean }) {
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'mx-1 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors coarse:py-3',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
          collapsed && 'mx-auto w-9 justify-center px-0',
          isActive
            ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
            : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
        )
      }
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">{item.icon}</span>
      {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
      {!collapsed && item.count !== undefined && item.count > 0 && (
        <span className="tabular-nums shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          {item.count}
        </span>
      )}
    </NavLink>
  )

  if (!collapsed) return link

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">
        {item.label}
        {item.count ? ` · ${item.count}` : ''}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Primary navigation rail.
 *
 * Collapse state lives in `AppShell` (via context) so the mobile trigger and
 * the rail stay in sync; the preference is mirrored to localStorage here.
 */
export function AppSidebar() {
  const { collapsed, setCollapsed } = useAppShell()
  const { stats } = useWorkspace()
  const { xp: rank, streak } = useAchievements()
  const { openAbout } = useShellActions()

  useEffect(() => {
    writeSidebarCollapsed(collapsed)
  }, [collapsed])

  const primaryItems: NavItemDef[] = [
    { to: '/', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, end: true },
    // Smart views first (Things 3 / Linear): what is today, what is unsorted.
    { to: '/today', label: 'Today', icon: <Sunrise className="h-4 w-4" />, count: stats.dueTodayTasks },
    { to: '/inbox', label: 'Inbox', icon: <Inbox className="h-4 w-4" />, count: stats.inboxTasks },
    { to: '/upcoming', label: 'Upcoming', icon: <CalendarDays className="h-4 w-4" /> },
    { to: '/tasks', label: 'Tasks', icon: <CheckSquare className="h-4 w-4" />, count: stats.openTasks },
    {
      to: '/projects',
      label: 'Projects',
      icon: <FolderKanban className="h-4 w-4" />,
      count: stats.activeProjects,
    },
  ]

  const secondaryItems: NavItemDef[] = [
    { to: '/insights', label: 'Insights', icon: <LineChart className="h-4 w-4" /> },
    { to: '/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ]

  // No `onCollapse` prop: the library's built-in chevron has no accessible
  // name, so the footer owns the collapse control (with a proper disclosure
  // relationship through `aria-controls`).
  return (
    <TooltipProvider delayDuration={200}>
      <Sidebar
        id={SIDEBAR_ID}
        collapsed={collapsed}
        width="15.5rem"
        className="border-sidebar-border bg-sidebar"
      >
        <SidebarHeader className="flex h-[60px] items-center gap-2.5 border-sidebar-border px-4">
          {/* The mark is the logo: a repeating motif, a braid, and a beat. */}
          <MotifMark size={30} />
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-sidebar-foreground">Motif</span>
              <span className="block truncate text-[11px] text-muted-foreground">Productivity Suite</span>
            </span>
          )}
        </SidebarHeader>

        <SidebarContent className="py-3">
          <nav aria-label="Main">
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            {primaryItems.map((item) => (
              <NavItem key={item.to} item={item} collapsed={collapsed} />
            ))}
          </nav>

          <SidebarSeparator />

          <nav aria-label="Settings">
            <SidebarGroupLabel>System</SidebarGroupLabel>
            {secondaryItems.map((item) => (
              <NavItem key={item.to} item={item} collapsed={collapsed} />
            ))}
          </nav>
        </SidebarContent>

        <SidebarFooter className="border-sidebar-border">
          {collapsed ? (
            <div className="flex flex-col items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Expand sidebar"
                    aria-expanded={false}
                    aria-controls={SIDEBAR_ID}
                    onClick={() => setCollapsed(false)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <PanelLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Expand sidebar</TooltipContent>
              </Tooltip>
              <ThemeCycleButton />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={openAbout}
                    aria-label="Why Motif exists — the story"
                    className="rounded-md p-1 transition-opacity hover:opacity-80 coarse:p-2.5"
                  >
                    <MotifMark size={26} animated={false} className="opacity-90" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Why Motif exists</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Rank and streak, always in sight — and a door to the shelf. */}
              <Link
                to="/insights"
                className="flex w-full items-center gap-2.5 rounded-md border border-sidebar-border px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent/60"
                aria-label={`Rank ${rank.level}, ${rank.title} · ${rank.xp} XP · streak ${streak.current} days — open Insights`}
              >
                <ProgressRing value={rank.progress * 100} size={34} thickness={3} tone="brand" label={`Level ${rank.level}`}>
                  <span className="text-[11px] font-semibold tabular-nums text-foreground">{rank.level}</span>
                </ProgressRing>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-medium text-sidebar-foreground">{rank.title}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {streak.current}d streak · {streak.shieldsHeld} shield{streak.shieldsHeld === 1 ? '' : 's'}
                  </span>
                </span>
              </Link>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
              <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                <Sparkles className="mt-px h-3 w-3 shrink-0 text-brand" aria-hidden="true" />
                <span>
                  {ETHOS_SHORT}{' '}
                  <button
                    type="button"
                    onClick={openAbout}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Read why
                  </button>
                </span>
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-expanded
                aria-controls={SIDEBAR_ID}
                onClick={() => setCollapsed(true)}
                className="w-full justify-start gap-2 px-2 text-muted-foreground hover:text-foreground coarse:py-3"
              >
                <PanelLeft className="h-4 w-4" aria-hidden="true" />
                Collapse sidebar
              </Button>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  )
}

import { useState, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  Avatar,
  AvatarFallback,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@blinkdotnew/ui'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Settings,
  LogOut,
  PanelLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const SIDEBAR_KEY = 'motif_sidebar_collapsed'

interface NavItemDef {
  href: string
  icon: ReactNode
  label: string
}

const NAV_ITEMS: NavItemDef[] = [
  {
    href: '/',
    icon: <LayoutDashboard className="h-4 w-4" />,
    label: 'Dashboard',
  },
  {
    href: '/tasks',
    icon: <CheckSquare className="h-4 w-4" />,
    label: 'Tasks',
  },
  {
    href: '/projects',
    icon: <FolderKanban className="h-4 w-4" />,
    label: 'Projects',
  },
  {
    href: '/settings',
    icon: <Settings className="h-4 w-4" />,
    label: 'Settings',
  },
]

function NavItem({ item, collapsed }: { item: NavItemDef; collapsed: boolean }) {
  const location = useLocation()
  const isActive = location.pathname === item.href

  const link = (
    <Link
      to={item.href}
      className={cn(
        'flex items-center gap-2.5 rounded-md text-sm transition-all duration-150 cursor-pointer',
        collapsed ? 'justify-center w-8 h-8 mx-auto' : 'px-3 py-2 w-full',
        isActive
          ? 'bg-accent/10 text-accent font-medium'
          : 'text-muted-foreground hover:bg-accent/5 hover:text-foreground'
      )}
    >
      <span className="shrink-0">{item.icon}</span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
  
  if (!collapsed) return link
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  )
}

export function AppSidebarShell() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(SIDEBAR_KEY) === 'true'
  })

  const toggle = useCallback(() => {
    setCollapsed((v) => {
      const next = !v
      localStorage.setItem(SIDEBAR_KEY, String(next))
      return next
    })
  }, [])

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          'flex flex-col h-full bg-sidebar border-r border-sidebar-border overflow-hidden',
          'transition-[width] duration-200 ease-linear shrink-0',
          collapsed ? 'w-[3rem]' : 'w-[15rem]'
        )}
      >
        {/* ── Header / Brand ─────────────────────────── */}
        <div
          className={cn(
            'flex items-center gap-2 shrink-0 border-b border-sidebar-border h-[52px] px-3',
            collapsed && 'justify-center px-2'
          )}
        >
          {!collapsed && (
            <>
              <div className="flex items-center justify-center h-7 w-7 rounded-md bg-primary text-primary-foreground text-[11px] font-bold shrink-0 tracking-tight">
                M
              </div>
              <span className="flex-1 font-semibold text-sm truncate text-sidebar-foreground">
                Motif
              </span>
            </>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground"
                onClick={toggle}
              >
                <PanelLeft
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    collapsed && 'rotate-180'
                  )}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* ── Nav (only this section scrolls) ───────── */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-0.5">
          {!collapsed && (
            <p className="px-3 pt-1 pb-1 text-[10px] font-medium text-sidebar-foreground/40 uppercase tracking-wider">
              Workspace
            </p>
          )}
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.href} item={item} collapsed={collapsed} />
          ))}
        </div>

        {/* ── Footer (pinned to bottom) ─────────────── */}
        <div
          className={cn(
            'shrink-0 border-t border-sidebar-border',
            collapsed
              ? 'flex flex-col items-center gap-1 p-2'
              : 'p-3 space-y-1'
          )}
        >
          {/* User row */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-sidebar-accent transition-colors cursor-pointer">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback className="text-[10px] bg-sidebar-accent text-sidebar-foreground">
                      JD
                    </AvatarFallback>
                  </Avatar>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Jamie Doe · jamie@motif.app
              </TooltipContent>
            </Tooltip>
          ) : (
            <button className="flex items-center gap-2 rounded-md hover:bg-sidebar-accent transition-colors cursor-pointer w-full px-2 py-1.5">
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarFallback className="text-[10px] bg-sidebar-accent text-sidebar-foreground">
                  JD
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-medium leading-tight truncate text-sidebar-foreground">
                  Jamie Doe
                </p>
                <p className="text-[10px] text-sidebar-foreground/50 leading-tight truncate">
                  jamie@motif.app
                </p>
              </div>
            </button>
          )}

          {/* Sign out */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-sidebar-foreground/50 hover:text-sidebar-foreground"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start px-2 gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
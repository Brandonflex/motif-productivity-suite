import { useState, type ReactNode } from 'react'
import { AppShell, AppShellMain, AppShellSidebar, MobileSidebarTrigger } from '@blinkdotnew/ui'
import { readSidebarCollapsed } from '@/lib/sidebar'
import { ThemeToggle } from './ThemeToggle'

interface ShellProps {
  /** Sidebar content — typically `<AppSidebar />`. */
  sidebar: ReactNode
  /** Product name shown in the mobile header. */
  appName?: string
  children: ReactNode
}

/**
 * Application frame: persistent sidebar on desktop, slide-over drawer on
 * mobile, with a sticky mobile header. `AppShell` owns the responsive state so
 * `MobileSidebarTrigger` and the rail always agree.
 */
export function Shell({ sidebar, appName = 'Motif', children }: ShellProps) {
  const [defaultCollapsed] = useState(readSidebarCollapsed)

  return (
    <AppShell defaultCollapsed={defaultCollapsed} className="h-dvh bg-background">
      {/* Sidebar — drawer below md, always visible from md up. */}
      <AppShellSidebar>{sidebar}</AppShellSidebar>

      <AppShellMain className="bg-background">
        <a
          href="#workspace-main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          Skip to content
        </a>

        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur md:hidden">
          <MobileSidebarTrigger />
          <span className="truncate text-sm font-semibold">{appName}</span>
          <div className="ml-auto">
            <ThemeToggle compact />
          </div>
        </header>

        <main id="workspace-main" className="flex-1">
          {children}
        </main>
      </AppShellMain>
    </AppShell>
  )
}

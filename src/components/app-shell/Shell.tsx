import { useState, type ReactNode } from 'react'
import { AppShell, AppShellMain, AppShellSidebar, MobileSidebarTrigger } from '@blinkdotnew/ui'
import { MotifMark } from '@/components/brand/MotifMark'
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
      {/*
        Ambient depth: two slowly drifting colour fields behind everything.
        Purely decorative (aria-hidden, pointer-events-none) and stilled by the
        reduced-motion rule in index.css, which is why it can afford to be
        always-on rather than a setting.
      */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="aurora-drift absolute -left-1/4 -top-1/3 h-[42rem] w-[42rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="aurora-drift-late absolute -right-1/4 top-1/4 h-[36rem] w-[36rem] rounded-full bg-info/10 blur-3xl" />
        <div className="grain absolute inset-0 opacity-[0.35]" />
      </div>

      {/* Sidebar — drawer below md, always visible from md up. */}
      <AppShellSidebar>{sidebar}</AppShellSidebar>

      <AppShellMain className="bg-background/80 backdrop-blur-[2px]">
        <a
          href="#workspace-main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          Skip to content
        </a>

        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur md:hidden">
          <MobileSidebarTrigger />
          <MotifMark size={22} />
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

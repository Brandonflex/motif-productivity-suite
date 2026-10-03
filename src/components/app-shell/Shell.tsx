import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AppShell, AppShellMain, AppShellSidebar, Button, MobileSidebarTrigger, useAppShell } from '@blinkdotnew/ui'
import { Plus, Search } from 'lucide-react'
import { MotifMark } from '@/components/brand/MotifMark'
import { readSidebarCollapsed } from '@/lib/sidebar'
import { useShellActions } from './shell-actions'
import { ThemeCycleButton } from './ThemeToggle'

/**
 * The mobile drawer's missing half: a scrim to close it, Escape to dismiss it,
 * and a route change to get out of the way.
 *
 * The library's drawer slides over the page without any of those, which is fine
 * for a demo and annoying on a phone: tapping "Tasks" used to leave the menu
 * sitting on top of the very screen it navigated to.
 */
function MobileDrawerBehaviour() {
  const { mobileOpen, setMobileOpen } = useAppShell()
  const { pathname } = useLocation()

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname, setMobileOpen])

  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen, setMobileOpen])

  if (!mobileOpen) return null

  return (
    <button
      type="button"
      aria-label="Close menu"
      onClick={() => setMobileOpen(false)}
      className="fixed inset-0 z-40 cursor-default bg-foreground/25 backdrop-blur-[2px] md:hidden"
    />
  )
}

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
  const { openPalette, openCapture } = useShellActions()

  return (
    <AppShell
      defaultCollapsed={defaultCollapsed}
      /* The notch and the home indicator are part of the layout, not an
         afterthought: the shell insets itself instead of letting the browser
         chrome sit on top of the header and the sidebar footer. */
      className="h-dvh bg-background pt-[env(safe-area-inset-top)]"
    >
      <MobileDrawerBehaviour />
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

        {/*
          Mobile header. Every keyboard affordance has a touch twin here —
          ⌘K and Q should not be desktop-only privileges, and a phone has no
          keyboard at all. The theme switch collapses to its cycling button to
          pay for the space.
        */}
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-1.5 border-b border-border bg-background/90 px-2 backdrop-blur md:hidden">
          <MobileSidebarTrigger className="coarse:h-11 coarse:w-11" />
          <MotifMark size={22} />
          <span className="truncate text-sm font-semibold">{appName}</span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Search and commands"
              onClick={openPalette}
              className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground coarse:h-11 coarse:w-11"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Capture a task"
              onClick={openCapture}
              className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground coarse:h-11 coarse:w-11"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
            <ThemeCycleButton className="coarse:h-11 coarse:w-11" />
          </div>
        </header>

        <main id="workspace-main" className="flex-1">
          {children}
        </main>
      </AppShellMain>
    </AppShell>
  )
}

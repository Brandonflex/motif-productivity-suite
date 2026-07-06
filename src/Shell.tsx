/**
 * Shell — Mobile-responsive app layout.
 *
 * USAGE (in App.tsx or your router):
 *   <Shell sidebar={<MySidebarContent />}>
 *     <Page>...</Page>
 *   </Shell>
 *
 * The sidebar is hidden on mobile and toggled by the built-in hamburger button.
 * Customize sidebar width, colors, and nav items — but keep this structure.
 */
import React from 'react'
import {
  AppShell,
  AppShellSidebar,
  AppShellMain,
  MobileSidebarTrigger,
} from '@blinkdotnew/ui'

interface ShellProps {
  /** Sidebar content — e.g. <Sidebar><SidebarItem .../></Sidebar> */
  sidebar: React.ReactNode
  /** App name shown in mobile header */
  appName?: string
  children: React.ReactNode
}

export function Shell({ sidebar, appName = 'App', children }: ShellProps) {
  return (
    <AppShell>
      {/* Sidebar — hidden on mobile, always visible on md+.
          No explicit width here — AppSidebarShell owns its own width
          and animates it on collapse/expand. */}
      <AppShellSidebar className="shrink-0">
        {sidebar}
      </AppShellSidebar>

      {/* Main content */}
      <AppShellMain>
        {/* Mobile header — hamburger + app name, only shown below md breakpoint */}
        <div className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-border bg-background sticky top-0 z-30">
          <MobileSidebarTrigger />
          <span className="font-semibold text-sm">{appName}</span>
        </div>

        {/* Page content */}
        {children}
      </AppShellMain>
    </AppShell>
  )
}

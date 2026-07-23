/**
 * Shell — Mobile-responsive app layout.
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

export function Shell({ sidebar, appName = 'Motif', children }: ShellProps) {
  return (
    <AppShell className="bg-[#FBF9F5]">
      {/* Sidebar — hidden on mobile, always visible on md+. */}
      <AppShellSidebar className="shrink-0 border-r border-[#E5E0D8] bg-[#FBF9F5]">
        {sidebar}
      </AppShellSidebar>

      {/* Main content */}
      <AppShellMain className="bg-[#FBF9F5] min-h-screen text-[#1C1917]">
        {/* Mobile header — hamburger + app name, only shown below md breakpoint */}
        <div className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-[#E5E0D8] bg-[#FBF9F5] sticky top-0 z-30">
          <MobileSidebarTrigger />
          <span className="font-semibold text-sm tracking-tight text-[#1C1917]">{appName}</span>
        </div>

        {/* Page content */}
        {children}
      </AppShellMain>
    </AppShell>
  )
}
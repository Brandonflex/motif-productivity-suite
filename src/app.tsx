import { Suspense, lazy, useMemo, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Shell } from '@/components/app-shell/Shell'
import { AppSidebar } from '@/components/app-shell/AppSidebar'
import { ShellActionsProvider } from '@/components/app-shell/ShellActions'
import type { ShellActions } from '@/components/app-shell/shell-actions'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { RouteFallback } from '@/components/feedback/RouteFallback'
import { CommandPalette, useGlobalShortcuts } from '@/components/command-palette/CommandPalette'
import { QuickAddDialog } from '@/components/quick-add/QuickAdd'
import { WorkspaceProvider } from '@/features/workspace/WorkspaceProvider'
import { useAchievementCelebrations } from '@/features/achievements/useAchievements'
import { useReminders } from '@/hooks/useReminders'
import { NotFoundPage } from '@/routes/NotFoundPage'

// Route-level code splitting: the shell paints immediately and each view is
// fetched on demand.
const dashboard = () => import('@/features/dashboard/DashboardPage')
const today = () => import('@/features/today/TodayPage')
const inbox = () => import('@/features/inbox/InboxPage')
const upcoming = () => import('@/features/upcoming/UpcomingPage')
const tasks = () => import('@/features/tasks/TasksPage')
const projects = () => import('@/features/projects/ProjectsPage')
const insights = () => import('@/features/insights/InsightsPage')
const settings = () => import('@/features/settings/SettingsPage')

const DashboardPage = lazy(() => dashboard().then((module) => ({ default: module.DashboardPage })))
const TodayPage = lazy(() => today().then((module) => ({ default: module.TodayPage })))
const InboxPage = lazy(() => inbox().then((module) => ({ default: module.InboxPage })))
const UpcomingPage = lazy(() => upcoming().then((module) => ({ default: module.UpcomingPage })))
const TasksPage = lazy(() => tasks().then((module) => ({ default: module.TasksPage })))
const ProjectsPage = lazy(() => projects().then((module) => ({ default: module.ProjectsPage })))
const InsightsPage = lazy(() => insights().then((module) => ({ default: module.InsightsPage })))
const SettingsPage = lazy(() => settings().then((module) => ({ default: module.SettingsPage })))

function AppRoutes() {
  const location = useLocation()

  return (
    // Remounting the boundary per path means a crash on one page does not
    // poison navigation to the next one.
    <ErrorBoundary key={location.pathname}>
      <Suspense fallback={<RouteFallback />}>
        <Routes location={location}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/upcoming" element={<UpcomingPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

/**
 * Global capture and the command palette.
 *
 * Both are mounted once, above the routes, so every view shares one ⌘K palette
 * and one capture field (Linear's model: the shortcut works everywhere, and it
 * always does the same thing). They are handed down through
 * `ShellActionsProvider`, which is what lets the *touch* header offer the same
 * actions as the keyboard.
 */
function AppChrome() {
  // Badges and rank-ups are celebrated from one place, so they fire wherever
  // the user happens to be when the work lands.
  useAchievementCelebrations()
  // Reminders are computed from the tasks, so one interval covers every view.
  useReminders()

  const [paletteOpen, setPaletteOpen] = useState(false)
  const [captureOpen, setCaptureOpen] = useState(false)

  const actions = useMemo<ShellActions>(
    () => ({
      openPalette: () => setPaletteOpen(true),
      openCapture: () => setCaptureOpen(true),
    }),
    [],
  )

  useGlobalShortcuts({ onPalette: actions.openPalette, onCapture: actions.openCapture })

  return (
    <ShellActionsProvider value={actions}>
      <Shell appName="Motif" sidebar={<AppSidebar />}>
        <AppRoutes />
      </Shell>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onCreateTask={() => {
          setPaletteOpen(false)
          setCaptureOpen(true)
        }}
      />
      <QuickAddDialog open={captureOpen} onOpenChange={setCaptureOpen} />
    </ShellActionsProvider>
  )
}

export function App() {
  return (
    <ErrorBoundary>
      <WorkspaceProvider>
        <AppChrome />
      </WorkspaceProvider>
    </ErrorBoundary>
  )
}

export default App

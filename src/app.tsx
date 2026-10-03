import { Suspense, lazy } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Shell } from '@/components/app-shell/Shell'
import { AppSidebar } from '@/components/app-shell/AppSidebar'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { RouteFallback } from '@/components/feedback/RouteFallback'
import { WorkspaceProvider } from '@/features/workspace/WorkspaceProvider'
import { NotFoundPage } from '@/routes/NotFoundPage'

// Route-level code splitting: the shell paints immediately and each view is
// fetched on demand.
const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })),
)
const TasksPage = lazy(() =>
  import('@/features/tasks/TasksPage').then((module) => ({ default: module.TasksPage })),
)
const ProjectsPage = lazy(() =>
  import('@/features/projects/ProjectsPage').then((module) => ({ default: module.ProjectsPage })),
)
const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })),
)

function AppRoutes() {
  const location = useLocation()

  return (
    // Remounting the boundary per path means a crash on one page does not
    // poison navigation to the next one.
    <ErrorBoundary key={location.pathname}>
      <Suspense fallback={<RouteFallback />}>
        <Routes location={location}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export function App() {
  return (
    <ErrorBoundary>
      <WorkspaceProvider>
        <Shell appName="Motif Productivity Suite" sidebar={<AppSidebar />}>
          <AppRoutes />
        </Shell>
      </WorkspaceProvider>
    </ErrorBoundary>
  )
}

export default App

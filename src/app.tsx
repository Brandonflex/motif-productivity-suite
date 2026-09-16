import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from '@/components/Shell'
import { AppSidebarShell } from '@/components/AppSidebarShell'
import { WorkspaceProvider } from '@/context/WorkspaceContext'
import { DashboardPage } from '@/routes/_app'
import { ProjectsPage } from '@/routes/_app/projects'
import { SettingsPage } from '@/routes/_app/settings'
import { TasksPage } from '@/routes/_app/tasks'

export function App() {
  return (
    <WorkspaceProvider>
      <Shell appName="Motif Productivity Suite" sidebar={<AppSidebarShell />}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </WorkspaceProvider>
  )
}

export default App
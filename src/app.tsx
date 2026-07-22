import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Shell } from './Shell';
import { AppSidebarShell } from './components/AppSidebarShell';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { DashboardPage } from './routes/_app/index';
import { TasksPage } from './routes/_app/tasks';
import { ProjectsPage } from './routes/_app/projects';
import { SettingsPage } from './routes/_app/settings';

export function App() {
  return (
    <BrowserRouter>
      <WorkspaceProvider>
        <Shell sidebar={<AppSidebarShell />}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Shell>
      </WorkspaceProvider>
    </BrowserRouter>
  );
}
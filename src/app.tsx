import { Shell } from './Shell';
import { AppSidebarShell } from './components/AppSidebarShell';
import { DashboardPage } from './routes/_app/index';

export function App() {
  return (
    <Shell sidebar={<AppSidebarShell />}>
      <DashboardPage />
    </Shell>
  );
}
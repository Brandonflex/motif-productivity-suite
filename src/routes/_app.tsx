import { createFileRoute, Outlet } from '@tanstack/react-router'
import { SharedAppLayout } from '@/layouts/shared-app-layout'

/**
 * Pathless layout route — wraps all dashboard pages in the sidebar shell.
 * Pages under `src/routes/_app/` inherit this layout automatically.
 * Landing / marketing pages stay outside this layout (full-bleed).
 */
export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  return (
    <SharedAppLayout appName="Motif">
      <Outlet />
    </SharedAppLayout>
  )
}

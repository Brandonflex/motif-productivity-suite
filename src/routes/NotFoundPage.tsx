import { Link, useLocation } from 'react-router-dom'
import { Button, EmptyState, Page, PageBody } from '@blinkdotnew/ui'
import { Compass } from 'lucide-react'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

/** 404 — a real page instead of a silent redirect, so broken links are obvious. */
export function NotFoundPage() {
  useDocumentTitle('Page not found')
  const { pathname } = useLocation()

  return (
    <Page>
      <PageBody className="mx-auto flex w-full max-w-3xl items-center justify-center">
        <div className="w-full">
          <EmptyState
            icon={<Compass className="h-5 w-5" aria-hidden="true" />}
            title="We couldn't find that page"
            description={`“${pathname}” does not exist in this workspace.`}
            className="py-16"
          />
          <div className="flex justify-center gap-2">
            <Button asChild>
              <Link to="/">Back to dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/tasks">Go to tasks</Link>
            </Button>
          </div>
        </div>
      </PageBody>
    </Page>
  )
}

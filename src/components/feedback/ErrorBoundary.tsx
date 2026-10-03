import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '@blinkdotnew/ui'

interface Props {
  children: ReactNode
  /** Optional custom fallback; receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches render-time crashes so a single broken view can never leave the user
 * staring at a blank page. Data lives in localStorage, so reloading is safe.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[motif] Unhandled UI error', error, info.componentStack)
  }

  private reset = (): void => {
    this.setState({ error: null })
  }

  private reload = (): void => {
    window.location.reload()
  }

  override render(): ReactNode {
    const { error } = this.state
    const { children, fallback } = this.props

    if (!error) return children
    if (fallback) return fallback(error, this.reset)

    return (
      <div role="alert" className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="h-5 w-5" aria-hidden="true" />
            <h2 className="text-base font-semibold">Something went wrong</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            This view failed to render. Your tasks and projects are stored locally and are safe.
          </p>
          <pre className="mt-4 max-h-32 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
            {error.message}
          </pre>
          <div className="mt-4 flex gap-2">
            <Button onClick={this.reset} variant="outline" size="sm">
              Try again
            </Button>
            <Button onClick={this.reload} size="sm">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Reload app
            </Button>
          </div>
        </div>
      </div>
    )
  }
}

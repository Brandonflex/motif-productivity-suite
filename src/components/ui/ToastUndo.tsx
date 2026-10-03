import toast from 'react-hot-toast'
import { Undo2, X } from 'lucide-react'

interface UndoToastOptions {
  message: string
  onUndo: () => void
  duration?: number
}

/**
 * Toast with an inline undo action.
 *
 * Destructive actions in the task list are reversible for a few seconds instead
 * of being gated behind a confirmation dialog on every click.
 */
export function showUndoToast({ message, onUndo, duration = 6000 }: UndoToastOptions): void {
  toast.custom(
    (instance) => (
      <div
        className="pointer-events-auto flex w-[min(22rem,calc(100vw-2rem))] items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-md"
        role="status"
      >
        <span className="min-w-0 flex-1 text-sm text-card-foreground">{message}</span>
        <button
          type="button"
          onClick={() => {
            onUndo()
            toast.dismiss(instance.id)
          }}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
          Undo
        </button>
        <button
          type="button"
          onClick={() => toast.dismiss(instance.id)}
          aria-label="Dismiss notification"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    ),
    { duration },
  )
}

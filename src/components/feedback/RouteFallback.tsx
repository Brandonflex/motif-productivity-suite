import { Skeleton } from '@blinkdotnew/ui'

/** Shown while a lazily loaded route is being fetched. */
export function RouteFallback() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading view…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

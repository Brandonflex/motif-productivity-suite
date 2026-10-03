import { useEffect } from 'react'

const SUFFIX = 'Motif Productivity Suite'

/** Keeps the browser tab title in sync with the active route. */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${SUFFIX}` : SUFFIX
  }, [title])
}

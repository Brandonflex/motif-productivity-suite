import { createContext, useContext } from 'react'

/**
 * The handful of things that can be asked for from anywhere.
 *
 * The palette and the capture dialog both live once, above the routes, because
 * a shortcut that works on one screen and not another is worse than no shortcut.
 * Anything inside the shell can call these — the mobile header, the sidebar, the
 * palette itself — which is how the touch interface gets the same powers as the
 * keyboard.
 */
export interface ShellActions {
  openPalette: () => void
  openCapture: () => void
}

/** Kept in a non-component module so hot reload stays reliable. */
export const ShellActionsContext = createContext<ShellActions | null>(null)

export function useShellActions(): ShellActions {
  const actions = useContext(ShellActionsContext)
  if (!actions) throw new Error('useShellActions must be used inside <ShellActionsProvider>')
  return actions
}

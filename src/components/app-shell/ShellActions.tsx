import type { ReactNode } from 'react'
import { ShellActionsContext, type ShellActions } from './shell-actions'

/** Provides the shell's global actions to everything inside the frame. */
export function ShellActionsProvider({ value, children }: { value: ShellActions; children: ReactNode }) {
  return <ShellActionsContext.Provider value={value}>{children}</ShellActionsContext.Provider>
}

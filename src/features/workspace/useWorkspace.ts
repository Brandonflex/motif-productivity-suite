import { useContext } from 'react'
import { WorkspaceContext, type WorkspaceContextValue } from './workspace-context'

/** Access the workspace store. Must be used inside <WorkspaceProvider>. */
export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used within a <WorkspaceProvider>')
  }
  return context
}

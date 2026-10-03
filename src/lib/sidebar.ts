import { SIDEBAR_KEY } from '@/lib/storage'

/**
 * Sidebar preferences.
 *
 * Kept out of the component files so the React Fast Refresh boundary stays
 * clean (component modules should only export components).
 */

export function readSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_KEY) === 'true'
  } catch {
    return false
  }
}

export function writeSidebarCollapsed(collapsed: boolean): void {
  try {
    window.localStorage.setItem(SIDEBAR_KEY, String(collapsed))
  } catch {
    /* non-fatal: the rail simply starts expanded next visit */
  }
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogDescription, DialogTitle, Input } from '@blinkdotnew/ui'
import {
  CalendarDays,
  CheckSquare,
  Compass,
  Download,
  FolderKanban,
  Heart,
  Inbox,
  LineChart,
  Moon,
  Plus,
  Search,
  Sun,
  Sunrise,
  Timer,
} from 'lucide-react'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

/**
 * ⌘K command palette (borrowed from Linear).
 *
 * One surface for "go somewhere" and "do something", reachable from any view.
 * It also searches tasks, which is the fastest way to find a row in a long list
 * — and it keeps the rest of the UI honest about how few top-level actions there
 * really are.
 */

export interface Command {
  id: string
  label: string
  hint?: string
  group: 'Navigate' | 'Create' | 'Workspace' | 'Tasks'
  icon: typeof Compass
  keywords?: string
  run: () => void
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateTask: () => void
  /** Opens the "why Motif exists" story. */
  onOpenAbout: () => void
}

export function CommandPalette({ open, onOpenChange, onCreateTask, onOpenAbout }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { tasks, toggleTaskStatus } = useWorkspace()
  const { resolved, setPreference } = useTheme()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands = useMemo<Command[]>(() => {
    const go = (path: string) => () => {
      navigate(path)
      onOpenChange(false)
    }

    const base: Command[] = [
      { id: 'go-dashboard', label: 'Go to Dashboard', group: 'Navigate', icon: Compass, run: go('/') },
      { id: 'go-today', label: 'Go to Today', hint: 'Plan + focus', group: 'Navigate', icon: Sunrise, run: go('/today') },
      { id: 'go-inbox', label: 'Go to Inbox', hint: 'Triage', group: 'Navigate', icon: Inbox, run: go('/inbox') },
      { id: 'go-upcoming', label: 'Go to Upcoming', group: 'Navigate', icon: CalendarDays, run: go('/upcoming') },
      { id: 'go-tasks', label: 'Go to Tasks', group: 'Navigate', icon: CheckSquare, run: go('/tasks') },
      { id: 'go-projects', label: 'Go to Projects', group: 'Navigate', icon: FolderKanban, run: go('/projects') },
      { id: 'go-insights', label: 'Go to Insights', group: 'Navigate', icon: LineChart, run: go('/insights') },
      {
        id: 'create-task',
        label: 'New task',
        hint: 'Natural language',
        group: 'Create',
        icon: Plus,
        run: () => {
          onOpenChange(false)
          onCreateTask()
        },
      },
      {
        id: 'toggle-theme',
        label: resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        group: 'Workspace',
        icon: resolved === 'dark' ? Sun : Moon,
        keywords: 'theme dark light appearance',
        run: () => {
          setPreference(resolved === 'dark' ? 'light' : 'dark')
          onOpenChange(false)
        },
      },
      {
        id: 'bring-backup',
        label: 'Export workspace backup',
        group: 'Workspace',
        icon: Download,
        keywords: 'json download',
        run: go('/settings'),
      },
      {
        id: 'about',
        label: 'Why Motif exists',
        hint: 'The story',
        group: 'Workspace',
        icon: Heart,
        keywords: 'about story brand maker brandon free local no subscription',
        run: () => {
          onOpenChange(false)
          onOpenAbout()
        },
      },
    ]

    return base
  }, [navigate, onOpenChange, onCreateTask, onOpenAbout, resolved, setPreference])

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const taskMatches = needle
      ? tasks
          .filter((task) => task.title.toLowerCase().includes(needle))
          .slice(0, 6)
          .map<Command>((task) => ({
            id: `task-${task.id}`,
            label: task.status === 'Completed' ? `Reopen “${task.title}”` : `Complete “${task.title}”`,
            hint: task.project,
            group: 'Tasks',
            icon: Search,
            run: () => {
              toggleTaskStatus(task.id)
              onOpenChange(false)
            },
          }))
      : []

    const needleCommands = needle
      ? commands.filter((command) =>
          `${command.label} ${command.keywords ?? ''} ${command.group}`.toLowerCase().includes(needle),
        )
      : commands

    return [...needleCommands, ...taskMatches]
  }, [commands, onOpenChange, query, tasks, toggleTaskStatus])

  // Reset the highlight whenever the result set changes.
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, open])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      results[activeIndex]?.run()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[8dvh] max-h-[84dvh] w-[calc(100%-1.5rem)] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 sm:top-[12%] sm:w-full">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search actions and tasks, then press Enter. Arrow keys move the highlight.
        </DialogDescription>

        <div className="border-b border-border p-2">
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search actions and tasks…"
            aria-label="Command palette"
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>

        {/* Height in dvh: with the on-screen keyboard up, `max-h-80` would
            push the last few results under it. */}
        <ul ref={listRef} role="listbox" aria-label="Commands" className="max-h-[min(20rem,52dvh)] overflow-y-auto p-1">
          {results.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">Nothing matches “{query}”.</li>
          )}
          {results.map((command, index) => {
            const Icon = command.icon
            const isActive = index === activeIndex
            return (
              <li key={command.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={command.run}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm coarse:py-3',
                    isActive ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-muted',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{command.label}</span>
                  {command.hint && <span className="shrink-0 text-xs text-muted-foreground">{command.hint}</span>}
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {command.group}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ move</span>
          <span>↵ run</span>
          <span>esc close</span>
          <span className="ml-auto inline-flex items-center gap-1">
            <Timer className="h-3 w-3" aria-hidden="true" /> Motif
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Global ⌘K / Ctrl+K listener plus the `q` quick-capture shortcut. */
export function useGlobalShortcuts(options: { onPalette: () => void; onCapture: () => void }): void {
  const { onPalette, onCapture } = options

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      const overlayOpen = document.querySelector('[role="dialog"][data-state="open"]') !== null

      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        onPalette()
        return
      }
      if (typing || overlayOpen || event.metaKey || event.ctrlKey || event.altKey) return

      if (event.key.toLowerCase() === 'q') {
        event.preventDefault()
        onCapture()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCapture, onPalette])
}

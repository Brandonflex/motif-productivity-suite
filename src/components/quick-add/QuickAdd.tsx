import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input } from '@blinkdotnew/ui'
import toast from 'react-hot-toast'
import { CornerDownLeft, Sparkles } from 'lucide-react'
import { QUICK_ADD_EXAMPLES, parseQuickAdd, type QuickAddResult } from '@/lib/quick-add'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { cn } from '@/lib/utils'

/**
 * Natural-language capture (Todoist's quick add, adapted).
 *
 * The field parses as you type and shows exactly what it understood, so the
 * grammar teaches itself and nobody has to guess why "tomorrow" disappeared from
 * a title. Capture always lands in the triage queue unless a project is named —
 * deciding *when* to do something is a separate, cheaper decision than capturing
 * it (Things 3 / Linear).
 */

const TOKEN_STYLES: Record<QuickAddResult['tokens'][number]['kind'], string> = {
  date: 'border-info/40 bg-info/10 text-info',
  time: 'border-info/40 bg-info/10 text-info',
  project: 'border-primary/40 bg-primary/10 text-primary',
  tag: 'border-border bg-muted text-muted-foreground',
  priority: 'border-destructive/40 bg-destructive/10 text-destructive',
  energy: 'border-brand/40 bg-brand/10 text-brand',
  estimate: 'border-warning/40 bg-warning/10 text-warning',
  recurrence: 'border-success/40 bg-success/10 text-success',
}

interface QuickAddFieldProps {
  /** Large variant for the Inbox / Today headers. */
  /** Focus the field as soon as it mounts (used by the capture dialog). */
  focusOnMount?: boolean
  placeholder?: string
  onCreated?: () => void
  className?: string
}

export function QuickAddField({ focusOnMount, placeholder, onCreated, className }: QuickAddFieldProps) {
  const { addTask, projectNames } = useWorkspace()
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const example = useMemo(() => QUICK_ADD_EXAMPLES[Math.floor(Math.random() * QUICK_ADD_EXAMPLES.length)]!, [])
  const parsed = useMemo(() => parseQuickAdd(value), [value])

  useEffect(() => {
    if (!focusOnMount) return
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [focusOnMount])

  const submit = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault()
      if (!parsed.title.trim()) return

      addTask({
        title: parsed.title,
        project: parsed.project ?? '',
        priority: parsed.priority ?? 'Medium',
        dueDate: parsed.dueDate ?? '',
        dueTime: parsed.dueTime ?? '',
        tags: parsed.tags,
        energy: parsed.energy,
        estimateMinutes: parsed.estimateMinutes,
        recurrence: parsed.recurrence ?? null,
      })

      setValue('')
      toast.success(parsed.dueDate ? `Captured · due ${parsed.dueDate}` : 'Captured to Inbox')
      onCreated?.()
      // Keep the caret in the field for rapid capture.
      requestAnimationFrame(() => inputRef.current?.focus())
    },
    [addTask, onCreated, parsed],
  )

  return (
    <form onSubmit={submit} className={cn('space-y-2', className)}>
      <div className="relative">
        <Sparkles
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setValue('')
          }}
          placeholder={placeholder ?? `Try: ${example}`}
          aria-label="Quick add task"
          className="pl-9 pr-24"
          list="quick-add-projects"
        />
        <Button
          type="submit"
          size="sm"
          variant={value.trim() ? 'default' : 'ghost'}
          disabled={!value.trim()}
          className="absolute right-1.5 top-1/2 h-7 -translate-y-1/2 gap-1"
        >
          <CornerDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Add
        </Button>
        <datalist id="quick-add-projects">
          {projectNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      {parsed.matched && (
        <ul className="flex flex-wrap gap-1.5" aria-label="What Motif understood">
          {parsed.tokens.map((token, index) => (
            <li
              key={`${token.kind}-${index}`}
              className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', TOKEN_STYLES[token.kind])}
            >
              {token.label}
            </li>
          ))}
        </ul>
      )}

      <p className="sr-only" aria-live="polite">
        {parsed.matched ? `${parsed.tokens.length} details recognised: ${parsed.tokens.map((t) => t.label).join(', ')}` : ''}
      </p>
    </form>
  )
}

interface QuickAddDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Modal wrapper used by the global shortcut and the command palette. */
export function QuickAddDialog({ open, onOpenChange }: QuickAddDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-xl sm:w-full">
        <DialogHeader>
          <DialogTitle>Capture</DialogTitle>
          <DialogDescription>
            One line, plain language: <em>Pay the invoice tomorrow 2pm #finance @admin !p1 ~45m every month</em>.
            Tasks land in the Inbox until you triage them.
          </DialogDescription>
        </DialogHeader>
        <QuickAddField focusOnMount onCreated={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

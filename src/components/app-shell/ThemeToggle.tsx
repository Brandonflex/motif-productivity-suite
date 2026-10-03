import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@blinkdotnew/ui'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemePreference } from '@/lib/theme'
import { cn } from '@/lib/utils'

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light theme', icon: Sun },
  { value: 'dark', label: 'Dark theme', icon: Moon },
  { value: 'system', label: 'Match system theme', icon: Monitor },
]

const ICONS: Record<ThemePreference, typeof Sun> = { light: Sun, dark: Moon, system: Monitor }
const NEXT: Record<ThemePreference, ThemePreference> = { light: 'dark', dark: 'system', system: 'light' }

interface ThemeToggleProps {
  /** Tighter styling for the mobile header. */
  compact?: boolean
  className?: string
}

/** Three-way theme switch (light / dark / system), persisted per browser. */
export function ThemeToggle({ compact = false, className }: ThemeToggleProps) {
  const { preference, setPreference } = useTheme()

  return (
    <TooltipProvider delayDuration={150}>
      <div
        role="radiogroup"
        aria-label="Colour theme"
        className={cn(
          'inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5',
          compact && 'border-0 bg-transparent p-0',
          className,
        )}
      >
        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const isActive = preference === value
          return (
            <Tooltip key={value}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  aria-label={label}
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreference(value)}
                  className={cn(
                    'h-7 w-7 p-0 text-muted-foreground hover:text-foreground',
                    isActive && 'bg-accent text-accent-foreground hover:bg-accent',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{label}</TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

/**
 * Single-button theme switch that cycles light → dark → system.
 *
 * Used in the collapsed sidebar rail where a three-button group would not fit.
 */
export function ThemeCycleButton({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme()
  const Icon = ICONS[preference]
  const next = NEXT[preference]
  const nextLabel = OPTIONS.find((option) => option.value === next)?.label ?? next

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Theme: ${preference}. Switch to ${nextLabel.toLowerCase()}.`}
            onClick={() => setPreference(next)}
            className={cn('h-8 w-8 p-0 text-muted-foreground hover:text-foreground', className)}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          Theme: {preference} — switch to {nextLabel.toLowerCase()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

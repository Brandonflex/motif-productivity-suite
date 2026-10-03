import { useMemo, useState } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@blinkdotnew/ui'
import { isActiveDay, type ActivityDay, type WorkKind } from '@/lib/achievements'
import { formatMinutes } from '@/lib/dates'
import { KIND_CLASS, KIND_LABEL, dominantKind, graphColumns, intensity } from '@/lib/rhythm'
import { cn } from '@/lib/utils'

/**
 * The rhythm graph — a contribution calendar that says *what kind* of day it was.
 *
 * A GitHub-style grid answers "how much". This one answers the question that
 * actually changes behaviour: "what has my month been made of?" Each cell is
 * filled by the dominant flavour of the day's finished work (deep, admin or
 * light) and its density by how much of it there was, so a wall of deep-work
 * purple and a wall of admin blue read differently at a glance.
 *
 * Rest days are drawn as hollow rings rather than blanks: choosing not to work
 * is part of a rhythm, not a gap in the record. Today's cell breathes while the
 * day is still open, which is the small nudge to add something to it.
 */

const ROW_LABELS = ['Mon', 'Wed', 'Fri']

export function RhythmGraph({ history, weeks = 18 }: { history: ActivityDay[]; weeks?: number }) {
  const [focused, setFocused] = useState<string | null>(null)

  const visible = useMemo(() => history.slice(-(weeks * 7)), [history, weeks])
  const columns = useMemo(() => graphColumns(visible), [visible])
  const max = useMemo(
    () => visible.reduce((peak, day) => Math.max(peak, day.completed + day.focusMinutes / 45), 0),
    [visible],
  )
  const today = history.at(-1)?.date

  const totals = useMemo(() => {
    const active = visible.filter(isActiveDay).length
    const completions = visible.reduce((total, day) => total + day.completed, 0)
    const focus = visible.reduce((total, day) => total + day.focusMinutes, 0)
    return { active, completions, focus }
  }, [visible])

  if (columns.length === 0) return null

  return (
    <TooltipProvider delayDuration={120}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex flex-col justify-between py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
            {ROW_LABELS.map((label) => (
              <span key={label} className="h-3.5 leading-3.5">
                {label}
              </span>
            ))}
          </div>

          <div
            className="flex gap-1 overflow-x-auto pb-1"
            role="img"
            aria-label={`Rhythm for the last ${visible.length} days`}
          >
            {columns.map((column, columnIndex) => (
              <div key={columnIndex} className="flex flex-col gap-1">
                {column.map((day, rowIndex) => {
                  if (!day) {
                    return (
                      <span
                        key={`pad-${columnIndex}-${rowIndex}`}
                        className="h-3.5 w-3.5 rounded-[4px]"
                        aria-hidden="true"
                      />
                    )
                  }
                  const active = isActiveDay(day)
                  const kind = dominantKind(day)
                  const level = active ? intensity(day, max) : 0
                  const isToday = day.date === today
                  const detail = active
                    ? `${day.completed} finished${kind ? ` · mostly ${KIND_LABEL[kind]}` : ''}${
                        day.focusMinutes > 0 ? ` · ${formatMinutes(day.focusMinutes)} focus` : ''
                      }${day.planned ? ' · planned' : ''}`
                    : day.rest
                      ? 'Rest day — nothing expected of you'
                      : 'Quiet day'

                  return (
                    <Tooltip key={day.date}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setFocused(day.date === focused ? null : day.date)}
                          aria-label={`${day.date}: ${detail}`}
                          className={cn(
                            'cell-reveal h-3.5 w-3.5 rounded-[4px] border transition-transform hover:scale-125 focus-visible:scale-125',
                            level === 0 && active && 'border-info/60 bg-info/20',
                            level === 0 && !active && day.rest && 'border-border bg-transparent',
                            level === 0 && !active && !day.rest && 'border-border/60 bg-muted/40',
                            level > 0 && kind && KIND_CLASS[kind][level as 1 | 2 | 3 | 4],
                            level > 0 && 'border-transparent',
                            isToday && 'ring-2 ring-ring ring-offset-1 ring-offset-background',
                            day.date === focused && 'ring-2 ring-primary',
                          )}
                          style={{ animationDelay: `${Math.min(600, columnIndex * 18)}ms` }}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <span className="font-medium">{day.date}</span> · {detail}
                        {day.shutDown ? ' · closed properly' : ''}
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>
            {totals.active} active days · {totals.completions} finished · {formatMinutes(totals.focus)} focused
          </span>
          <span className="flex items-center gap-3">
            {(['deep', 'admin', 'light'] as WorkKind[]).map((kind) => (
              <span key={kind} className="flex items-center gap-1.5">
                <span className={cn('h-2.5 w-2.5 rounded-[3px]', KIND_CLASS[kind][4])} aria-hidden="true" />
                {kind}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] border border-border" aria-hidden="true" /> rest
            </span>
          </span>
        </div>
      </div>
    </TooltipProvider>
  )
}

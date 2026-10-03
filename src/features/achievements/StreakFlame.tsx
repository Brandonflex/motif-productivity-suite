import { Card, CardContent, CardHeader, CardTitle, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@blinkdotnew/ui'
import { Flame, Shield, Snowflake } from 'lucide-react'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { MAX_SHIELDS, type StreakSummary } from '@/lib/achievements'
import { cn } from '@/lib/utils'

/**
 * The streak, with a memory of your life in it.
 *
 * A plain counter ("42 days!") is brittle: one missed evening and months of
 * work read as failure, which is exactly when people quit. So the streak knows
 * about weekends and about shields — and the strip underneath shows the last
 * two weeks day by day, so the shape of the habit is visible rather than
 * summarised into a single fragile number.
 */
export function StreakFlame({ streak, className }: { streak: StreakSummary; className?: string }) {
  const milestoneProgress = Math.round(streak.milestoneProgress * 100)

  return (
    <TooltipProvider delayDuration={150}>
      <Card className={cn('h-full', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame
              className={cn('h-4 w-4', streak.activeToday ? 'text-brand' : 'text-muted-foreground')}
              aria-hidden="true"
            />
            Streak
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <ProgressRing
              value={milestoneProgress}
              size={96}
              thickness={8}
              tone={streak.atRisk ? 'warning' : 'brand'}
              pulse={streak.activeToday}
              label={`Streak of ${streak.current} days, ${streak.daysToMilestone} to the ${streak.nextMilestone}-day badge`}
            >
              <span className="flex flex-col items-center leading-none">
                <span className="text-2xl font-semibold text-foreground">{streak.current}</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">days</span>
              </span>
            </ProgressRing>

            <div className="min-w-0 space-y-1 text-xs">
              <p className="text-sm font-medium text-foreground">
                {streak.activeToday
                  ? 'Today counts. Nice.'
                  : streak.restDaysToday
                    ? 'Rest day — nothing owed.'
                    : 'Nothing logged yet today.'}
              </p>
              <p className="text-muted-foreground">
                {streak.daysToMilestone === 0
                  ? `You are on the ${streak.nextMilestone}-day mark.`
                  : `${streak.daysToMilestone} day${streak.daysToMilestone === 1 ? '' : 's'} to the ${streak.nextMilestone}-day badge.`}
              </p>
              <p className="text-muted-foreground">Longest run: {streak.longest} days</p>
            </div>
          </div>

          {/* Shields: earned, never bought. */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              {streak.shieldsHeld}/{MAX_SHIELDS} shields banked
            </span>
            {streak.shieldsUsed > 0 && <span>· {streak.shieldsUsed} spent keeping this run alive</span>}
          </div>

          {/* Two weeks at a glance: active, rest, or skipped. */}
          <ul className="flex items-end gap-1" aria-label="Last fourteen days">
            {streak.recent.map((day) => (
              <li key={day.date}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      aria-label={`${day.date}: ${
                        day.completed > 0 || day.focusMinutes > 0 ? 'active' : day.rest ? 'rest day' : 'quiet day'
                      }`}
                      role="img"
                      className={cn(
                        'block h-6 w-2.5 rounded-full border',
                        day.completed > 0 || day.focusMinutes > 0
                          ? 'border-transparent bg-brand'
                          : day.rest
                            ? 'border-dashed border-border bg-transparent'
                            : 'border-border/60 bg-muted/50',
                      )}
                      style={{ height: `${12 + Math.min(12, day.completed * 3 + day.focusMinutes / 30)}px` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {day.date} · {day.completed} finished
                    {day.focusMinutes > 0 ? ` · ${day.focusMinutes}m focus` : ''}
                    {day.rest ? ' · rest day' : ''}
                  </TooltipContent>
                </Tooltip>
              </li>
            ))}
          </ul>

          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Snowflake className="h-3.5 w-3.5" aria-hidden="true" />
            Weekends are rest days; every seven active days banks a shield for a busy weekday.
          </p>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

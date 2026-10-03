import { useMemo, useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Progress } from '@blinkdotnew/ui'
import { Lock, Sparkles } from 'lucide-react'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { TiltCard } from '@/components/ui/TiltCard'
import { LEVELS, TIER_LABELS, type AchievementTier } from '@/lib/achievements'
import { cn } from '@/lib/utils'
import { AchievementCard } from './AchievementCard'
import { useAchievements } from './useAchievements'
import { StreakFlame } from './StreakFlame'

const TIER_ORDER: AchievementTier[] = ['legendary', 'gold', 'silver', 'bronze']

/** The shelf: level, streak, and every badge — earned, in progress, or waiting. */
export function AchievementsPanel({ compact = false }: { compact?: boolean }) {
  const { shelf, xp, streak } = useAchievements()
  const [filter, setFilter] = useState<AchievementTier | 'all'>('all')

  const earned = useMemo(() => shelf.filter((state) => state.unlocked), [shelf])
  const visible = useMemo(
    () => (filter === 'all' ? shelf : shelf.filter((state) => state.tier === filter)),
    [filter, shelf],
  )
  const nextLevel = LEVELS.find((tier) => tier.level === xp.level + 1) ?? null

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <TiltCard className="lg:col-span-1">
          <Card className="h-full overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Rank</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <ProgressRing
                value={xp.progress * 100}
                size={104}
                thickness={9}
                tone="brand"
                label={`Level ${xp.level}, ${xp.title}`}
              >
                <span className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Level</span>
                  <span className="text-2xl font-semibold leading-none text-foreground">{xp.level}</span>
                </span>
              </ProgressRing>
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-foreground">{xp.title}</p>
                <p className="text-xs text-muted-foreground">{xp.blurb}</p>
                <p className="pt-1 text-[11px] tabular-nums text-muted-foreground">
                  {xp.xp.toLocaleString()} XP
                  {nextLevel ? ` · ${Math.max(0, xp.neededForNext - xp.intoLevel).toLocaleString()} to ${nextLevel.title}` : ' · top rank reached'}
                </p>
                <span className="sheen mt-2 block h-1 rounded-full bg-gradient-to-r from-primary/60 to-brand/60" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>
        </TiltCard>

        <StreakFlame streak={streak} className="lg:col-span-1" />

        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Shelf</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {earned.length} of {shelf.length} badges earned
              {earned.length === shelf.length ? ' — the whole set. Impressive.' : '.'}
            </p>
            <Progress
              value={(earned.length / shelf.length) * 100}
              aria-label="Badges earned"
              className="h-1.5"
            />
            <ul className="grid grid-cols-3 gap-2 pt-1 text-center">
              {TIER_ORDER.map((tier) => {
                const all = shelf.filter((state) => state.tier === tier)
                const got = all.filter((state) => state.unlocked).length
                return (
                  <li key={tier} className="rounded-md border border-border px-2 py-1.5">
                    <span className="block text-sm font-semibold tabular-nums text-foreground">
                      {got}/{all.length}
                    </span>
                    <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                      {TIER_LABELS[tier]}
                    </span>
                  </li>
                )
              })}
            </ul>
            {nextLevel && (
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                Next rank: <span className="font-medium text-foreground">{nextLevel.title}</span> — {nextLevel.blurb}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {!compact && (
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
            <CardTitle className="text-base">Badges</CardTitle>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter badges by tier">
              {(['all', ...TIER_ORDER] as const).map((tier) => (
                <Button
                  key={tier}
                  size="sm"
                  variant={filter === tier ? 'secondary' : 'ghost'}
                  aria-pressed={filter === tier}
                  className="h-7 px-2.5 text-[11px]"
                  onClick={() => setFilter(tier)}
                >
                  {tier === 'all' ? 'All' : TIER_LABELS[tier]}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {visible.map((state) => (
                <li key={state.id} className={cn(!state.unlocked && 'opacity-90')}>
                  <AchievementCard state={state} />
                </li>
              ))}
            </ul>
            {visible.length === 0 && (
              <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" aria-hidden="true" />
                Nothing in this tier yet — keep going.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

import { useId, useState } from 'react'
import {
  AlarmClock,
  CalendarCheck,
  CheckCheck,
  Flame,
  Gauge,
  Infinity as InfinityIcon,
  Layers,
  Moon,
  Mountain,
  Sun,
  Sunrise,
  Tags,
  Timer,
  Unlock,
  Waves,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { ProgressRing, type RingTone } from '@/components/ui/ProgressRing'
import { TIER_LABELS, describeUnlock, type AchievementState, type AchievementTier } from '@/lib/achievements'
import { cn } from '@/lib/utils'

/**
 * One badge, as a real object: a card that flips.
 *
 * The front is the medal — tier ring, icon, name, progress. The back is the
 * receipt: what it takes, how far along you are, and the day it landed. A flip
 * is used instead of an expander because it is the same information with an
 * interaction that rewards curiosity rather than costing a click on a menu.
 */

const ICONS: Record<string, LucideIcon> = {
  Sun,
  Sunrise,
  Moon,
  Timer,
  Flame,
  CheckCheck,
  Waves,
  Tags,
  CalendarCheck,
  AlarmClock,
  Unlock,
  Layers,
  Zap,
  Infinity: InfinityIcon,
  Mountain,
  Gauge,
}

const TIER_TONE: Record<AchievementTier, RingTone> = {
  bronze: 'warning',
  silver: 'info',
  gold: 'brand',
  legendary: 'deep',
}

const TIER_CLASS: Record<AchievementTier, string> = {
  bronze: 'border-tier-bronze/50 bg-tier-bronze/5',
  silver: 'border-tier-silver/50 bg-tier-silver/5',
  gold: 'border-tier-gold/50 bg-tier-gold/5',
  legendary: 'border-tier-legendary/50 bg-tier-legendary/5',
}

const TIER_CHIP: Record<AchievementTier, string> = {
  bronze: 'bg-tier-bronze text-tier-bronze-foreground',
  silver: 'bg-tier-silver text-tier-silver-foreground',
  gold: 'bg-tier-gold text-tier-gold-foreground',
  legendary: 'bg-tier-legendary text-tier-legendary-foreground',
}

export function AchievementCard({ state }: { state: AchievementState }) {
  const [flipped, setFlipped] = useState(false)
  const id = useId()
  const Icon = ICONS[state.icon] ?? Sun
  const percent = Math.round(state.ratio * 100)

  return (
    <div className="[perspective:1200px]">
      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        aria-expanded={flipped}
        aria-controls={id}
        aria-label={`${state.name}, ${TIER_LABELS[state.tier]} badge, ${state.unlocked ? 'earned' : `${percent} percent complete`}`}
        className={cn(
          'flip-surface relative block h-40 w-full rounded-lg text-left',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        )}
        data-flipped={flipped ? 'true' : 'false'}
      >
        {/* Front: the medal itself. */}
        <span
          className={cn(
            'flip-face absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg border p-3',
            TIER_CLASS[state.tier],
            !state.unlocked && 'opacity-70 saturate-50',
          )}
        >
          <ProgressRing
            value={state.unlocked ? 100 : percent}
            size={72}
            thickness={5}
            tone={TIER_TONE[state.tier]}
            label={`${state.name} progress`}
            className={state.unlocked ? 'celebrate-pop' : undefined}
          >
            <Icon className="h-6 w-6 text-foreground" aria-hidden="true" />
          </ProgressRing>

          <span className="mt-1 line-clamp-2 text-center text-xs font-semibold text-foreground">{state.name}</span>
          <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide', TIER_CHIP[state.tier])}>
            {TIER_LABELS[state.tier]}
          </span>
        </span>

        {/* Back: what it takes and how far along it is. */}
        <span
          id={id}
          className="flip-face flip-face-back flex flex-col justify-between rounded-lg border border-border bg-card p-3 text-left"
        >
          <span className="text-[11px] leading-snug text-muted-foreground">{state.description}</span>
          <span className="space-y-1">
            <span className="block text-xs font-medium text-foreground">
              {state.unlocked ? 'Earned' : `${state.progress} / ${state.target}`}
            </span>
            <span className="block text-[11px] text-muted-foreground">{describeUnlock(state.unlockedOn)}</span>
            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted">
              <span
                className="bar-grow block h-full rounded-full bg-primary"
                style={{ width: `${percent}%` }}
                aria-hidden="true"
              />
            </span>
          </span>
        </span>
      </button>
    </div>
  )
}

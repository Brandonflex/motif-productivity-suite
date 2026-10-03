import { useEffect, useMemo, useRef } from 'react'
import toast from 'react-hot-toast'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { celebrate } from '@/components/fx/celebrate'
import {
  TIER_LABELS,
  achievements,
  activityHistory,
  experience,
  newlyUnlocked,
  streakSummary,
  type AchievementState,
} from '@/lib/achievements'

/** Everything the gamification surfaces need, derived from the workspace. */
export function useAchievements() {
  const { tasks, focusSessions, dailyLogs } = useWorkspace()

  return useMemo(() => {
    const history = activityHistory(tasks, focusSessions, dailyLogs)
    return {
      history,
      streak: streakSummary(history),
      xp: experience(tasks, focusSessions, dailyLogs, history),
      shelf: achievements(tasks, focusSessions, dailyLogs, history),
    }
  }, [tasks, focusSessions, dailyLogs])
}

const SEEN_KEY = 'motif:achievements-seen'
const LEVEL_KEY = 'motif:level-seen'

function readSeen(key: string): string[] | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return null
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.map(String) : null
  } catch {
    return null
  }
}

function writeSeen(key: string, values: string[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(values))
  } catch {
    /* a failed write only means the same badge may celebrate twice */
  }
}

/**
 * Watches for badges and levels that were not there last time, then celebrates
 * them: a confetti burst, a toast that says why it happened, and both stored so
 * the party happens exactly once.
 *
 * The first run is deliberately silent — it records the current shelf as the
 * baseline. Nobody wants a confetti storm for work they did before the app
 * had a badge system.
 */
export function useAchievementCelebrations(): void {
  const { shelf, xp } = useAchievements()
  const baseline = useRef(readSeen(SEEN_KEY) === null)

  useEffect(() => {
    const seen = readSeen(SEEN_KEY)
    if (seen === null) {
      writeSeen(
        SEEN_KEY,
        shelf.filter((state) => state.unlocked).map((state) => state.id),
      )
      writeSeen(LEVEL_KEY, [String(xp.level)])
      baseline.current = false
      return
    }

    const fresh = newlyUnlocked(shelf, seen)
    if (fresh.length === 0) return

    writeSeen(SEEN_KEY, [...seen, ...fresh.map((state) => state.id)])
    celebrate({ count: fresh.length > 1 ? 130 : 80 })

    for (const badge of fresh) {
      toast.custom(
        (instance) => (
          <span className="flex items-start gap-3 rounded-lg border border-tier-gold/50 bg-popover px-4 py-3 text-popover-foreground shadow-lg">
            <span className="text-xl" aria-hidden="true">
              ✦
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{badge.name} unlocked</span>
              <span className="block text-xs text-muted-foreground">
                {TIER_LABELS[badge.tier]} · {badge.description}
              </span>
            </span>
            <button
              type="button"
              onClick={() => toast.dismiss(instance.id)}
              className="ml-1 text-xs text-muted-foreground hover:text-foreground"
              aria-label={`Dismiss ${badge.name} notification`}
            >
              ✕
            </button>
          </span>
        ),
        { duration: 6000 },
      )
    }
  }, [shelf, xp.level])

  useEffect(() => {
    const seen = readSeen(LEVEL_KEY)
    if (seen === null) return
    const highest = Number(seen[0] ?? '1')
    if (xp.level > highest) {
      writeSeen(LEVEL_KEY, [String(xp.level)])
      celebrate({ count: 140 })
      toast.success(`Level ${xp.level} · ${xp.title}`, { icon: '🎚️', duration: 6000 })
    }
  }, [xp.level, xp.title])
}

/** Progress towards the next badge, for the "what's next" line. */
export function nextUp(shelf: AchievementState[]): AchievementState | null {
  const locked = shelf.filter((state) => !state.unlocked)
  if (locked.length === 0) return null
  return locked.reduce((best, state) => (state.ratio > best.ratio ? state : best), locked[0]!)
}

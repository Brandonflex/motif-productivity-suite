import { addDaysIso, daysBetween, eachDayIso, todayIso, toUtcDate } from '@/lib/dates'
import type { DailyLog, FocusSession, Task } from '@/types/workspace'

/**
 * Achievements, experience and the streak economy.
 *
 * Everything is *derived* from the workspace the user already has — tasks,
 * focus sessions and day logs — and replayed day by day, so a badge knows the
 * date it was first earned without any extra table, migration or sync step.
 * That keeps the whole feature local-first: the same data always produces the
 * same shelf, on any device, offline.
 *
 * The streak is deliberately smarter than "a day without work breaks it":
 * weekends are rest days by default, and every seven active days banks a
 * shield that absorbs a missed weekday. The result is a rhythm that rewards
 * showing up instead of punishing a life.
 */

/** What a day was mostly made of — drives the rhythm graph's colour. */
export type WorkKind = 'deep' | 'admin' | 'light'

export interface ActivityDay {
  date: string
  completed: number
  focusMinutes: number
  planned: boolean
  shutDown: boolean
  /** Completion counts per energy, so a day can be summarised by its flavour. */
  kinds: Record<WorkKind, number>
  /** True for Saturday/Sunday, which never break a streak. */
  rest: boolean
}

export const REST_WEEKDAY_INDEXES = [0, 6] // Sunday, Saturday (UTC calendar dates)
export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365]
/** Active days needed to bank one shield, and how many can be held at once. */
export const SHIELD_EVERY = 7
export const MAX_SHIELDS = 3

export function isRestDay(date: string): boolean {
  return REST_WEEKDAY_INDEXES.includes(toUtcDate(date).getUTCDay())
}

/** The energy a task's completion counts as. Missing energy reads as light work. */
function kindOf(task: Task): WorkKind {
  return task.energy === 'Deep' ? 'deep' : task.energy === 'Admin' ? 'admin' : 'light'
}

/**
 * One entry per day in the window, oldest first, with the counts the
 * achievements, streak and rhythm graph all read from.
 */
export function activityHistory(
  tasks: Task[],
  sessions: FocusSession[],
  logs: DailyLog[],
  days = 182,
  now: Date = new Date(),
): ActivityDay[] {
  const today = todayIso(now)
  const start = addDaysIso(today, -(days - 1))
  const map = new Map<string, ActivityDay>(
    eachDayIso(start, today).map((date) => [
      date,
      {
        date,
        completed: 0,
        focusMinutes: 0,
        planned: false,
        shutDown: false,
        kinds: { deep: 0, admin: 0, light: 0 },
        rest: isRestDay(date),
      },
    ]),
  )

  for (const task of tasks) {
    if (!task.completedAt) continue
    const day = map.get(task.completedAt.slice(0, 10))
    if (!day) continue
    day.completed += 1
    day.kinds[kindOf(task)] += 1
  }

  for (const session of sessions) {
    if (session.kind !== 'focus') continue
    const day = map.get(session.date)
    if (day) day.focusMinutes += session.minutes
  }

  for (const log of logs) {
    const day = map.get(log.date)
    if (!day) continue
    if (log.plannedAt) day.planned = true
    if (log.shutdownAt) day.shutDown = true
  }

  return [...map.values()]
}

/** A day "counts" when something real happened on it. */
export function isActiveDay(day: ActivityDay): boolean {
  return day.completed > 0 || day.focusMinutes > 0 || day.planned || day.shutDown
}

export interface StreakSummary {
  /** Active days in the streak as it stands right now. */
  current: number
  longest: number
  /** Shields still in the bank, plus how many are in use propping up the streak. */
  shieldsHeld: number
  shieldsUsed: number
  /** Days remaining until the next milestone, and the milestone itself. */
  nextMilestone: number
  daysToMilestone: number
  /** Where the streak has already travelled, for a progress ring. */
  milestoneFrom: number
  milestoneProgress: number
  /** Nothing logged today yet — the streak is waiting on you. */
  atRisk: boolean
  activeToday: boolean
  /** Rest days are free; useful copy in the UI. */
  restDaysToday: boolean
  /** The last 14 days, oldest first, for the mini rhythm strip. */
  recent: ActivityDay[]
}

/**
 * Walks the history forwards, spending shields on missed weekdays so the
 * streak survives a normal human week, then reports the streak that ends today
 * (or yesterday, since the day is not over).
 */
export function streakSummary(history: ActivityDay[], now: Date = new Date()): StreakSummary {
  let running = 0
  let longest = 0
  let shields = 0
  let shieldsUsed = 0
  let activeRun = 0

  const currentRunAfter: number[] = []

  for (const day of history) {
    const active = isActiveDay(day)

    if (active) {
      running += 1
      activeRun += 1
      if (activeRun % SHIELD_EVERY === 0) shields = Math.min(MAX_SHIELDS, shields + 1)
    } else if (day.rest) {
      // Rest days neither add to nor break the run.
    } else if (shields > 0) {
      // A shield protects the chain without inflating it: the streak survives
      // the gap, but a day you did not show up for never counts as one you did.
      shields -= 1
      shieldsUsed += 1
      activeRun = 0
    } else {
      running = 0
      activeRun = 0
    }

    longest = Math.max(longest, running)
    currentRunAfter.push(running)
  }

  const today = todayIso(now)
  const todayIndex = history.findIndex((day) => day.date === today)
  const todayActive = todayIndex >= 0 ? isActiveDay(history[todayIndex]!) : false
  const yesterdayActive = todayIndex > 0 ? isActiveDay(history[todayIndex - 1]!) : false
  const current = todayActive || yesterdayActive ? (currentRunAfter.at(-1) ?? 0) : 0

  const nextMilestone = STREAK_MILESTONES.find((milestone) => milestone > current) ?? current + 30
  const previous = [...STREAK_MILESTONES].reverse().find((milestone) => milestone <= current) ?? 0

  return {
    current,
    longest,
    shieldsHeld: shields,
    shieldsUsed,
    nextMilestone,
    daysToMilestone: Math.max(0, nextMilestone - current),
    milestoneFrom: previous,
    milestoneProgress: nextMilestone === previous ? 1 : (current - previous) / (nextMilestone - previous),
    atRisk: !todayActive,
    activeToday: todayActive,
    restDaysToday: isRestDay(today),
    recent: history.slice(-14),
  }
}

// ── Experience and levels ───────────────────────────────────────────────────

export interface LevelTier {
  level: number
  title: string
  /** Cumulative XP required to reach this level. */
  xp: number
  blurb: string
}

/**
 * Motif-flavoured ranks: a motif is a repeating figure a composer keeps coming
 * back to, which is exactly what a habit is. Titles reward identity, not just
 * points — the reason a level is more motivating than a bar.
 */
export const LEVELS: LevelTier[] = [
  { level: 1, title: 'Sketchbook', xp: 0, blurb: 'First marks on the page.' },
  { level: 2, title: 'Sketcher', xp: 150, blurb: 'The shape is showing.' },
  { level: 3, title: 'Drafter', xp: 400, blurb: 'Lines are getting confident.' },
  { level: 4, title: 'Crafter', xp: 800, blurb: 'Work is starting to repeat itself — in a good way.' },
  { level: 5, title: 'Composer', xp: 1_400, blurb: 'You are arranging whole days, not single tasks.' },
  { level: 6, title: 'Conductor', xp: 2_200, blurb: 'Several projects, one tempo.' },
  { level: 7, title: 'Maestro', xp: 3_300, blurb: 'Deep work on demand.' },
  { level: 8, title: 'Virtuoso', xp: 4_800, blurb: 'The hard things look easy now.' },
  { level: 9, title: 'Polymath', xp: 6_800, blurb: 'Craft across every project you touch.' },
  { level: 10, title: 'Motif Master', xp: 9_500, blurb: 'The rhythm is the work.' },
]

export interface Experience {
  xp: number
  level: number
  title: string
  blurb: string
  /** XP earned inside the current level, and what the next one costs. */
  intoLevel: number
  neededForNext: number
  progress: number
  nextTitle: string | null
  breakdown: { label: string; points: number }[]
}

/** XP for a day's worth of activity: finishing things, focusing, keeping the ritual. */
export function experience(
  tasks: Task[],
  sessions: FocusSession[],
  logs: DailyLog[],
  history: ActivityDay[] = activityHistory(tasks, sessions, logs),
): Experience {
  const completed = tasks.filter((task) => task.status === 'Completed').length
  const focusMinutes = sessions
    .filter((session) => session.kind === 'focus')
    .reduce((total, session) => total + session.minutes, 0)
  const plans = logs.filter((log) => log.plannedAt).length
  const shutdowns = logs.filter((log) => log.shutdownAt).length
  const onTime = tasks.filter(
    (task) =>
      task.status === 'Completed' && task.dueDate && task.completedAt && task.completedAt.slice(0, 10) <= task.dueDate,
  ).length
  const activeDays = history.filter(isActiveDay).length

  const breakdown = [
    { label: `${completed} completed`, points: completed * 12 },
    { label: `${Math.round(focusMinutes / 60)}h of focus`, points: focusMinutes },
    { label: `${plans} mornings planned`, points: plans * 15 },
    { label: `${shutdowns} days closed properly`, points: shutdowns * 15 },
    { label: `${onTime} finished on time`, points: onTime * 8 },
    { label: `${activeDays} active days`, points: activeDays * 5 },
  ]

  const xp = Math.max(
    0,
    breakdown.reduce((total, entry) => total + entry.points, 0),
  )
  const reached = [...LEVELS].reverse().find((tier) => xp >= tier.xp) ?? LEVELS[0]!
  const next = LEVELS.find((tier) => tier.xp > xp) ?? null
  const intoLevel = xp - reached.xp
  const neededForNext = next ? next.xp - reached.xp : 0

  return {
    xp,
    level: reached.level,
    title: reached.title,
    blurb: reached.blurb,
    intoLevel,
    neededForNext,
    progress: next ? intoLevel / neededForNext : 1,
    nextTitle: next?.title ?? null,
    breakdown,
  }
}

// ── Achievements ────────────────────────────────────────────────────────────

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'legendary'

/** Every achievement reads the same handful of replayable counters. */
type Metric =
  | 'completions'
  | 'focusMinutes'
  | 'plans'
  | 'shutdowns'
  | 'bestStreak'
  | 'onTime'
  | 'unblocked'
  | 'distinctProjects'
  | 'distinctTags'
  | 'bigDay'
  | 'bigFocusDay'

export interface AchievementDef {
  id: string
  name: string
  description: string
  tier: AchievementTier
  /** Lucide icon name, resolved by the UI. */
  icon: string
  metric: Metric
  target: number
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-light',
    name: 'First light',
    description: 'Finish your first task.',
    tier: 'bronze',
    icon: 'Sun',
    metric: 'completions',
    target: 1,
  },
  {
    id: 'morning-architect',
    name: 'Morning architect',
    description: 'Commit to a plan for the day.',
    tier: 'bronze',
    icon: 'Sunrise',
    metric: 'plans',
    target: 1,
  },
  {
    id: 'closing-bell',
    name: 'Closing bell',
    description: 'Shut the day down instead of letting it fade.',
    tier: 'bronze',
    icon: 'Moon',
    metric: 'shutdowns',
    target: 1,
  },
  {
    id: 'focused-hour',
    name: 'Focused hour',
    description: 'Log one hour of focus.',
    tier: 'bronze',
    icon: 'Timer',
    metric: 'focusMinutes',
    target: 60,
  },

  {
    id: 'seven-day-cadence',
    name: 'Seven-day cadence',
    description: 'Keep a streak alive for a week.',
    tier: 'silver',
    icon: 'Flame',
    metric: 'bestStreak',
    target: 7,
  },
  {
    id: 'century',
    name: 'Century',
    description: 'Finish 100 tasks.',
    tier: 'silver',
    icon: 'CheckCheck',
    metric: 'completions',
    target: 100,
  },
  {
    id: 'deep-diver',
    name: 'Deep diver',
    description: 'Log 1,000 minutes of focus.',
    tier: 'silver',
    icon: 'Waves',
    metric: 'focusMinutes',
    target: 1_000,
  },
  {
    id: 'well-labelled',
    name: 'Well labelled',
    description: 'Finish work carrying five different tags.',
    tier: 'silver',
    icon: 'Tags',
    metric: 'distinctTags',
    target: 5,
  },

  {
    id: 'thirty-day-cadence',
    name: 'Thirty-day cadence',
    description: 'Keep a streak alive for a month.',
    tier: 'gold',
    icon: 'CalendarCheck',
    metric: 'bestStreak',
    target: 30,
  },
  {
    id: 'on-time',
    name: 'On time, every time',
    description: 'Finish 25 tasks on or before their due date.',
    tier: 'gold',
    icon: 'AlarmClock',
    metric: 'onTime',
    target: 25,
  },
  {
    id: 'unblocker',
    name: 'Unblocker',
    description: 'Clear 10 tasks that were waiting on something else.',
    tier: 'gold',
    icon: 'Unlock',
    metric: 'unblocked',
    target: 10,
  },
  {
    id: 'five-projects',
    name: 'Five fronts',
    description: 'Finish work in five different projects.',
    tier: 'gold',
    icon: 'Layers',
    metric: 'distinctProjects',
    target: 5,
  },
  {
    id: 'big-day',
    name: 'Big day',
    description: 'Finish five tasks in a single day.',
    tier: 'gold',
    icon: 'Zap',
    metric: 'bigDay',
    target: 5,
  },

  {
    id: 'hundred-day-rhythm',
    name: 'Hundred-day rhythm',
    description: 'Keep a streak alive for 100 days.',
    tier: 'legendary',
    icon: 'Infinity',
    metric: 'bestStreak',
    target: 100,
  },
  {
    id: 'ten-thousand-minutes',
    name: 'Ten thousand minutes',
    description: 'Log 10,000 minutes of focus — about 166 hours.',
    tier: 'legendary',
    icon: 'Mountain',
    metric: 'focusMinutes',
    target: 10_000,
  },
  {
    id: 'deepest-day',
    name: 'Deepest day',
    description: 'Focus for three hours in one day.',
    tier: 'legendary',
    icon: 'Gauge',
    metric: 'bigFocusDay',
    target: 180,
  },
]

export interface AchievementState extends AchievementDef {
  progress: number
  /** 0–1, for the progress ring on each badge. */
  ratio: number
  unlocked: boolean
  /** The day the criteria were first satisfied — replayed, never stored. */
  unlockedOn: string | null
  /** How far the counter had travelled when the badge was earned. */
  unlockedAt: number
}

interface Counters {
  completions: number
  focusMinutes: number
  plans: number
  shutdowns: number
  bestStreak: number
  onTime: number
  unblocked: number
  distinctProjects: number
  distinctTags: number
  bigDay: number
  bigFocusDay: number
}

function emptyCounters(): Counters {
  return {
    completions: 0,
    focusMinutes: 0,
    plans: 0,
    shutdowns: 0,
    bestStreak: 0,
    onTime: 0,
    unblocked: 0,
    distinctProjects: 0,
    distinctTags: 0,
    bigDay: 0,
    bigFocusDay: 0,
  }
}

/**
 * Replays the history once and resolves every badge: current progress, the
 * first day it was earned, and therefore what a "newly unlocked" badge is.
 */
export function achievements(
  tasks: Task[],
  sessions: FocusSession[],
  logs: DailyLog[],
  history: ActivityDay[] = activityHistory(tasks, sessions, logs),
): AchievementState[] {
  const counters = emptyCounters()
  const unlockedOn = new Map<string, string>()
  const unlockedAt = new Map<string, number>()
  const seenProjects = new Set<string>()
  const seenTags = new Set<string>()

  let running = 0
  let activeRun = 0
  let shields = 0

  const check = (date: string | null) => {
    for (const def of ACHIEVEMENTS) {
      if (unlockedOn.has(def.id)) continue
      const value = counters[def.metric]
      if (value >= def.target) {
        unlockedOn.set(def.id, date ?? todayIso())
        unlockedAt.set(def.id, value)
      }
    }
  }

  // Replaying day by day is what lets every badge know the date it was earned:
  // projects and tags join the count on the day their work was finished, so
  // "well labelled" cannot claim credit for a vocabulary built last year.
  for (const day of history) {
    const dayTasks = tasks.filter((task) => task.completedAt?.slice(0, 10) === day.date)
    counters.completions += dayTasks.length
    counters.focusMinutes += day.focusMinutes
    if (day.planned) counters.plans += 1
    if (day.shutDown) counters.shutdowns += 1
    counters.onTime += dayTasks.filter((task) => task.dueDate && task.dueDate >= day.date).length
    counters.unblocked += dayTasks.filter((task) => task.blockedBy.length > 0).length
    counters.bigDay = Math.max(counters.bigDay, dayTasks.length)
    counters.bigFocusDay = Math.max(counters.bigFocusDay, day.focusMinutes)

    for (const task of dayTasks) {
      seenProjects.add(task.project)
      for (const tag of task.tags) seenTags.add(tag.toLowerCase())
    }
    counters.distinctProjects = seenProjects.size
    counters.distinctTags = seenTags.size

    const active = isActiveDay(day)
    if (active) {
      running += 1
      activeRun += 1
      if (activeRun % SHIELD_EVERY === 0) shields = Math.min(MAX_SHIELDS, shields + 1)
    } else if (day.rest) {
      // rest day: no change
    } else if (shields > 0) {
      shields -= 1
      activeRun = 0
    } else {
      running = 0
      activeRun = 0
    }
    counters.bestStreak = Math.max(counters.bestStreak, running)

    check(day.date)
  }

  // A metric that only becomes true on the very last day still needs its pass,
  // and anything met outside the replay window is credited to today.
  check(null)

  return ACHIEVEMENTS.map((def) => {
    const progress = counters[def.metric]
    const ratio = def.target === 0 ? 1 : Math.min(1, progress / def.target)
    return {
      ...def,
      progress,
      ratio,
      unlocked: unlockedOn.has(def.id),
      unlockedOn: unlockedOn.get(def.id) ?? null,
      unlockedAt: unlockedAt.get(def.id) ?? progress,
    }
  })
}

/** Badges that were not on the shelf the last time the user looked. */
export function newlyUnlocked(states: AchievementState[], seen: string[]): AchievementState[] {
  const seenIds = new Set(seen)
  return states.filter((state) => state.unlocked && !seenIds.has(state.id))
}

export const TIER_LABELS: Record<AchievementTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  legendary: 'Legendary',
}

/** How many days ago a badge was earned, in friendly words. */
export function describeUnlock(unlockedOn: string | null, now: Date = new Date()): string {
  if (!unlockedOn) return 'Not yet earned'
  const days = daysBetween(unlockedOn, todayIso(now))
  if (days <= 0) return 'Earned today'
  if (days === 1) return 'Earned yesterday'
  if (days < 7) return `Earned ${days} days ago`
  if (days < 30) return `Earned ${Math.round(days / 7)} week${days < 14 ? '' : 's'} ago`
  return `Earned ${unlockedOn}`
}

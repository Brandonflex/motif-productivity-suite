import { addDaysIso, isValidIsoDate, minutesToClock, todayIso } from '@/lib/dates'
import { nextWeekday, weekdayFromName } from '@/lib/recurrence'
import type { Recurrence, TaskEnergy, TaskPriority } from '@/types/workspace'

/**
 * Natural-language quick add (borrowed from Todoist).
 *
 * One line of text becomes a structured task:
 *
 *   Pay the studio invoice tomorrow 2pm #finance @admin !p1 ~45m every month
 *   ├─ dueDate  2026-10-04
 *   ├─ dueTime  14:00
 *   ├─ project  finance          (also: #finance)
 *   ├─ tags     [admin]          (also: @admin)
 *   ├─ priority High             (!p1 | !high)
 *   ├─ energy   Admin            (*admin | *deep | *light)
 *   ├─ estimate 45 minutes       (~45m | ~1h30 | ~1.5h)
 *   └─ repeats  every month      (also: every monday, daily, weekly, every 2 weeks)
 *
 * Everything the parser did *not* understand stays in the title, so a partial
 * match is still useful — and the UI shows exactly what was recognised before
 * the task is created.
 */

export interface QuickAddToken {
  kind: 'date' | 'time' | 'project' | 'tag' | 'priority' | 'energy' | 'estimate' | 'recurrence'
  label: string
}

export interface QuickAddResult {
  title: string
  dueDate?: string
  dueTime?: string
  startDate?: string
  project?: string
  tags: string[]
  priority?: TaskPriority
  energy?: TaskEnergy
  estimateMinutes?: number
  recurrence?: Recurrence
  tokens: QuickAddToken[]
  /** True when at least one structured field was recognised. */
  matched: boolean
}

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

const PRIORITY_WORDS: Record<string, TaskPriority> = {
  p1: 'High',
  p2: 'Medium',
  p3: 'Low',
  high: 'High',
  medium: 'Medium',
  med: 'Medium',
  low: 'Low',
}

const ENERGY_WORDS: Record<string, TaskEnergy> = {
  deep: 'Deep',
  light: 'Light',
  admin: 'Admin',
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
}

interface Draft {
  dueDate?: string
  dueTime?: string
  project?: string
  tags: string[]
  priority?: TaskPriority
  energy?: TaskEnergy
  estimateMinutes?: number
  recurrence?: Recurrence
  tokens: QuickAddToken[]
}

/** Parses `~45m`, `~1h`, `~1h30`, `~1.5h` or `~90` into minutes. */
function parseEstimate(raw: string): number | null {
  const value = raw.toLowerCase().replace(/\s+/g, '')
  const hoursAndMinutes = value.match(/^(\d+(?:\.\d+)?)h(\d{1,3})?m?$/)
  if (hoursAndMinutes) {
    const hours = Number(hoursAndMinutes[1])
    const minutes = hoursAndMinutes[2] ? Number(hoursAndMinutes[2]) : 0
    return Math.round(hours * 60) + minutes
  }
  const minutesOnly = value.match(/^(\d{1,4})m?$/)
  if (minutesOnly) return Number(minutesOnly[1])
  return null
}

/** `2pm`, `2:30pm`, `14:30` → `HH:MM`. */
function parseTime(raw: string): string | null {
  const value = raw.toLowerCase().replace(/\s+/g, '')
  const twelve = value.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/)
  if (twelve) {
    let hours = Number(twelve[1]) % 12
    if (twelve[3] === 'pm') hours += 12
    return minutesToClock(hours * 60 + Number(twelve[2] ?? 0))
  }
  const twentyFour = value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
  if (twentyFour) return minutesToClock(Number(twentyFour[1]) * 60 + Number(twentyFour[2]))
  return null
}

function parseMonthDay(raw: string, today: string): string | null {
  const match = raw.toLowerCase().match(/^([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?$/)
  if (!match) return null
  const monthIndex = MONTHS.findIndex((month) => month.startsWith(match[1]!))
  if (monthIndex === -1) return null
  const day = Number(match[2])
  if (day < 1 || day > 31) return null

  const year = Number(today.slice(0, 4))
  const candidate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return isValidIsoDate(candidate) && candidate >= today ? candidate : `${year + 1}${candidate.slice(4)}`
}

/** Resolves a date phrase against `today`; returns the date and the text consumed. */
function parseDatePhrase(input: string, today: string): { date: string; consumed: string } | null {
  const patterns: { re: RegExp; resolve: (match: RegExpMatchArray) => string | null }[] = [
    { re: /\b(today|tonight)\b/i, resolve: () => today },
    { re: /\btomorrow\b/i, resolve: () => addDaysIso(today, 1) },
    { re: /\bday after tomorrow\b/i, resolve: () => addDaysIso(today, 2) },
    {
      re: /\bin (\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten) (day|days|week|weeks|month|months)\b/i,
      resolve: (match) => {
        const amount = NUMBER_WORDS[match[1]!.toLowerCase()] ?? Number(match[1])
        const unit = match[2]!.toLowerCase()
        if (unit.startsWith('day')) return addDaysIso(today, amount)
        if (unit.startsWith('week')) return addDaysIso(today, amount * 7)
        const date = new Date(`${today}T00:00:00Z`)
        date.setUTCMonth(date.getUTCMonth() + amount)
        return date.toISOString().slice(0, 10)
      },
    },
    { re: /\bnext week\b/i, resolve: () => addDaysIso(today, 7) },
    { re: /\bnext month\b/i, resolve: () => addDaysIso(today, 30) },
    {
      re: /\b(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      resolve: (match) => {
        const weekday = weekdayFromName(match[2]!)
        return weekday === null ? null : nextWeekday(today, weekday)
      },
    },
    {
      re: /\b(\d{4}-\d{2}-\d{2})\b/,
      resolve: (match) => (isValidIsoDate(match[1]!) && match[1]! >= today ? match[1]! : null),
    },
    {
      re: /\b([a-z]{3,9}\.?\s+\d{1,2}(?:st|nd|rd|th)?)\b/i,
      resolve: (match) => parseMonthDay(match[1]!, today),
    },
  ]

  for (const { re, resolve } of patterns) {
    const match = input.match(re)
    if (!match) continue
    const date = resolve(match)
    if (date) return { date, consumed: match[0] }
  }
  return null
}

/** Parses a recurrence phrase; returns the rule and the text consumed. */
function parseRecurrencePhrase(input: string): { recurrence: Recurrence; consumed: string } | null {
  const weekdayMatch = input.match(/\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)
  if (weekdayMatch) {
    return { recurrence: { every: 1, unit: 'week' }, consumed: weekdayMatch[0] }
  }

  const everyMatch = input.match(
    /\bevery\s+(?:(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten)\s*)?(day|days|week|weeks|month|months)\b/i,
  )
  if (everyMatch) {
    const amount = everyMatch[1] ? (NUMBER_WORDS[everyMatch[1].toLowerCase()] ?? Number(everyMatch[1])) : 1
    const unitText = (everyMatch[2] ?? 'day').toLowerCase()
    const unit = unitText.startsWith('day') ? 'day' : unitText.startsWith('week') ? 'week' : 'month'
    return { recurrence: { every: Math.max(1, amount), unit }, consumed: everyMatch[0] }
  }

  // Only the trailing word counts: "Weekly review" is a title, "Review weekly" repeats.
  const trimmed = input.trim()
  const bare = trimmed.match(/\b(daily|weekly|monthly|weekdays)$/i)
  if (bare) {
    const word = bare[1]!.toLowerCase()
    const unit = word === 'daily' ? 'day' : word === 'weekly' ? 'week' : word === 'monthly' ? 'month' : 'week'
    return { recurrence: { every: 1, unit }, consumed: bare[0] }
  }
  return null
}

export function parseQuickAdd(input: string, now: Date = new Date()): QuickAddResult {
  const today = todayIso(now)
  const draft: Draft = { tags: [], tokens: [] }
  let rest = ` ${input.trim()} `

  const strip = (consumed: string) => {
    rest = rest.replace(consumed, ' ')
  }

  // Recurrence first — "every monday" also contains a weekday that the date
  // parser would otherwise swallow.
  const recurrence = parseRecurrencePhrase(rest)
  if (recurrence) {
    draft.recurrence = recurrence.recurrence
    draft.tokens.push({
      kind: 'recurrence',
      label: recurrence.recurrence.every === 1 ? `Every ${recurrence.recurrence.unit}` : `Every ${recurrence.recurrence.every} ${recurrence.recurrence.unit}s`,
    })
    strip(recurrence.consumed)
  }

  // Project — `#name` (dashes and underscores become spaces).
  const projectMatch = rest.match(/#([\p{L}\d][\p{L}\d_-]*)/u)
  if (projectMatch) {
    draft.project = projectMatch[1]!.replace(/[_-]+/g, ' ').trim()
    draft.tokens.push({ kind: 'project', label: `Project: ${draft.project}` })
    strip(projectMatch[0])
  }

  // Tags — `@name`.
  for (const tagMatch of rest.matchAll(/@([\p{L}\d][\p{L}\d_-]*)/gu)) {
    const tag = tagMatch[1]!
    if (!draft.tags.includes(tag)) {
      draft.tags.push(tag)
      draft.tokens.push({ kind: 'tag', label: `Tag: ${tag}` })
    }
    strip(tagMatch[0])
  }

  // Priority — `!p1`, `!high`.
  const priorityMatch = rest.match(/!(p[123]|high|medium|med|low)\b/i)
  if (priorityMatch) {
    const priority = PRIORITY_WORDS[priorityMatch[1]!.toLowerCase()]
    if (priority) {
      draft.priority = priority
      draft.tokens.push({ kind: 'priority', label: `${priority} priority` })
      strip(priorityMatch[0])
    }
  }

  // Energy — `*deep`, `*light`, `*admin`.
  const energyMatch = rest.match(/\*(deep|light|admin)\b/i)
  if (energyMatch) {
    const energy = ENERGY_WORDS[energyMatch[1]!.toLowerCase()]
    if (energy) {
      draft.energy = energy
      draft.tokens.push({ kind: 'energy', label: `${energy} work` })
      strip(energyMatch[0])
    }
  }

  // Estimate — `~45m`, `~1h30`, `~1.5h`.
  const estimateMatch = rest.match(/~(\d+(?:\.\d+)?\s*h\s*\d{0,3}m?|\d{1,4}\s*m?)/i)
  if (estimateMatch) {
    const minutes = parseEstimate(estimateMatch[1]!)
    if (minutes !== null && minutes > 0 && minutes <= 1440) {
      draft.estimateMinutes = minutes
      draft.tokens.push({ kind: 'estimate', label: `Estimate: ${minutes}m` })
      strip(estimateMatch[0])
    }
  }

  // Time — `2pm`, `14:30` (kept separate from the date so planning can pin it).
  const timeMatch = rest.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)|\d{1,2}:\d{2})\b/i)
  if (timeMatch) {
    const time = parseTime(timeMatch[1]!)
    if (time) {
      draft.dueTime = time
      draft.tokens.push({ kind: 'time', label: `At ${time}` })
      strip(timeMatch[0])
    }
  }

  const date = parseDatePhrase(rest, today)
  if (date) {
    draft.dueDate = date.date
    draft.tokens.push({ kind: 'date', label: date.date })
    strip(date.consumed)
  }

  const title = rest.replace(/\s+/g, ' ').trim()

  return {
    title: title || input.trim(),
    dueDate: draft.dueDate,
    dueTime: draft.dueTime,
    project: draft.project,
    tags: draft.tags,
    priority: draft.priority,
    energy: draft.energy,
    estimateMinutes: draft.estimateMinutes,
    recurrence: draft.recurrence,
    tokens: draft.tokens,
    matched: draft.tokens.length > 0,
  }
}

/** Examples shown under the quick-add field. */
export const QUICK_ADD_EXAMPLES = [
  'Email the client tomorrow 9am #consulting @admin ~15m',
  'Weekly review every friday !p2 *light ~30m',
  'Draft the proposal next monday 14:00 #studio *deep ~1h30',
]

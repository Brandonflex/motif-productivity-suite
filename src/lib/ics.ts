import { addDaysIso, minutesToClock, todayIso } from '@/lib/dates'
import { planDay } from '@/lib/plan'
import type { Task, WorkspaceSettings } from '@/types/workspace'

/**
 * Calendar export (RFC 5545).
 *
 * The planner already knows exactly when each task will be worked on, so the
 * day it produced can be handed to any calendar app instead of being retyped.
 * Times are written as *floating* local times (`DTSTART:20260305T090000`, no
 * `Z`), which is what a calendar expects for "9am where I am" and avoids
 * shipping a timezone database with a browser-only app.
 */

const CRLF = '\r\n'
/** RFC 5545 wants long lines folded at 75 octets. */
const FOLD_AT = 73

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** Folds a content line so greedy calendar clients cannot mangle it. */
function fold(line: string): string {
  if (line.length <= FOLD_AT) return line
  const parts: string[] = []
  let rest = line
  parts.push(rest.slice(0, FOLD_AT))
  rest = rest.slice(FOLD_AT)
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, FOLD_AT - 1)}`)
    rest = rest.slice(FOLD_AT - 1)
  }
  return parts.join(CRLF)
}

function stamp(date: string, minutes: number, seconds = 0): string {
  const clock = minutesToClock(minutes)
  const [hours, mins] = clock.split(':')
  const secs = String(seconds).padStart(2, '0')
  return `${date.replace(/-/g, '')}T${hours}${mins}${secs}`
}

function descriptionFor(task: Task, settings: WorkspaceSettings): string {
  const lines = [
    `Project: ${task.project}`,
    `Priority: ${task.priority}${task.estimateMinutes ? ` · ${task.estimateMinutes}m planned` : ''}`,
    task.tags.length > 0 ? `Tags: ${task.tags.join(', ')}` : '',
    task.energy ? `Energy: ${task.energy}` : '',
    task.note,
  ]
  if (task.blockedBy.length > 0) lines.push(`Blocked by ${task.blockedBy.length} other task(s)`)
  lines.push(`Planned by Motif · focus ${settings.focusMinutes}m / break ${settings.shortBreakMinutes}m`)
  return lines.filter(Boolean).join('\n')
}

export interface CalendarOptions {
  /** How many days of plan to export, starting today. */
  days?: number
  now?: Date
}

/** Builds a calendar holding every planned block for the next `days` days. */
export function buildCalendar(tasks: Task[], settings: WorkspaceSettings, options: CalendarOptions = {}): string {
  const days = Math.max(1, Math.min(31, options.days ?? 1))
  const now = options.now ?? new Date()
  const start = todayIso(now)
  const stampNow = `${now.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Motif//Productivity Suite//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Motif plan',
  ]

  for (let offset = 0; offset < days; offset += 1) {
    const date = addDaysIso(start, offset)
    const dayTasks = tasks.filter((task) => {
      if (task.status === 'Completed' || !task.dueDate) return false
      if (task.dueDate === date) return true
      return offset === 0 && task.dueDate < date
    })

    const plan = planDay(dayTasks, settings, new Date(`${date}T12:00:00.000Z`))

    for (const block of plan.blocks) {
      const task = block.task
      const end = Math.max(block.startMinute + 5, block.startMinute + block.minutes)
      lines.push(
        'BEGIN:VEVENT',
        `UID:${task.id}-${date.replace(/-/g, '')}@motif`,
        `DTSTAMP:${stampNow}`,
        `DTSTART:${stamp(date, block.startMinute)}`,
        `DTEND:${stamp(date, end)}`,
        `SUMMARY:${escapeText(task.title)}`,
        // Escaping turns real newlines into the literal `\n` calendars expect,
        // so this line folds once — with `lines.map(fold)` at the end — rather
        // than twice, which would corrupt the text.
        `DESCRIPTION:${escapeText(descriptionFor(task, settings))}`,
        `CATEGORIES:${escapeText(task.project)}`,
        `X-MOTIF-PRIORITY:${task.priority}`,
      )
      if (task.tags.length > 0) lines.push(`X-MOTIF-TAGS:${escapeText(task.tags.join(','))}`)
      if (block.pinned) {
        // A fixed-time task deserves the same nudge a meeting gets.
        lines.push('BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', 'DESCRIPTION:Starting soon', 'END:VALARM')
      }
      lines.push('END:VEVENT')
    }
  }

  lines.push('END:VCALENDAR')
  return lines.map(fold).join(CRLF) + CRLF
}

/** `motif-plan-2026-03-05.ics` */
export function calendarFilename(now: Date = new Date(), days = 1): string {
  const start = todayIso(now)
  return days > 1 ? `motif-plan-${start}-${days}days.ics` : `motif-plan-${start}.ics`
}

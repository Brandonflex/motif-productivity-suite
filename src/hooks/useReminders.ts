import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { describeReminder, dueSoon, checkIn } from '@/lib/reminders'
import { todayIso } from '@/lib/dates'

/**
 * The reminder loop.
 *
 * One interval, three jobs: announce the tasks whose pinned time is close,
 * offer the once-a-day check-in, and keep out of the way the rest of the time.
 * Everything it announces is recorded in localStorage, so a reload in the same
 * minute does not repeat itself, and the whole thing is silent when the user
 * has switched reminders off.
 *
 * The interval is a minute rather than a real scheduler because the tab is not
 * the source of truth: reminders are derived from the tasks, so a missed tick
 * costs nothing but latency.
 */

const FIRED_KEY = 'motif:reminders-fired'
const CHECK_IN_KEY = 'motif:check-in-sent'
const MAX_FIRED = 80
const TICK_MS = 30_000

function readList(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key)
    const parsed = raw === null ? [] : (JSON.parse(raw) as unknown)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function writeList(key: string, values: string[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(values))
  } catch {
    /* a failed write only means a reminder may repeat once */
  }
}

/** `true` when the browser can show desktop notifications at all. */
export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

/** Asks for notification permission; returns the resulting state. */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

function announce(title: string, body: string, desktop: boolean): void {
  toast(body, { icon: '⏰', duration: 6000, id: `reminder-${title}` })
  if (!desktop || !notificationsSupported() || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, tag: `motif-${title}` })
  } catch {
    /* Safari on iOS throws for non-persistent notifications; the toast stands in */
  }
}

export interface RemindersState {
  /** Reminders announced in this session, newest last. */
  announced: string[]
  /** Whether the browser supports desktop notifications. */
  supported: boolean
}

export function useReminders(): RemindersState {
  const { tasks, settings, todayLog } = useWorkspace()
  const [announced, setAnnounced] = useState<string[]>([])
  const running = useRef(false)

  const tick = useCallback(() => {
    const now = new Date()

    if (settings.dailyCheckIn) {
      const due = checkIn(settings, now, readList(CHECK_IN_KEY)[0] ?? null, todayLog.plannedAt || null)
      if (due) {
        writeList(CHECK_IN_KEY, [due.date])
        if (!due.planned) {
          toast('Plan the day before it plans you — one click on Today.', { icon: '🌅', duration: 8000 })
          setAnnounced((previous) => [...previous, `check-in:${due.date}`])
        }
      }
    }

    const fired = readList(FIRED_KEY)
    const fresh = dueSoon(tasks, settings, now).filter((reminder) => !fired.includes(reminder.key))
    if (fresh.length === 0) return

    writeList(FIRED_KEY, [...fired, ...fresh.map((reminder) => reminder.key)].slice(-MAX_FIRED))
    for (const reminder of fresh) {
      announce(reminder.title, `${reminder.title} — ${describeReminder(reminder)}`, settings.desktopReminders)
      setAnnounced((previous) => [...previous, reminder.key])
    }
  }, [settings, tasks, todayLog.plannedAt])

  useEffect(() => {
    if (running.current) return
    running.current = true
    // A short delay keeps the first tick out of the render that mounted it.
    const first = window.setTimeout(tick, 1500)
    const interval = window.setInterval(tick, TICK_MS)
    return () => {
      running.current = false
      window.clearTimeout(first)
      window.clearInterval(interval)
    }
  }, [tick])

  return { announced, supported: notificationsSupported() }
}

/** Convenience for tests and the settings card: today's reminder keys. */
export function todaysFiredKeys(): string[] {
  const date = todayIso()
  return readList(FIRED_KEY).filter((key) => key.includes(`:${date}:`))
}

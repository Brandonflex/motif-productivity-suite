import { useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@blinkdotnew/ui'
import { BellRing, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { notificationsSupported, requestNotificationPermission } from '@/hooks/useReminders'

/** Lead-time choices, in minutes. */
const LEADS = [5, 10, 15, 30, 60]

/**
 * Reminders, honestly described.
 *
 * Two separate promises: a nudge before a task's pinned time, and one check-in
 * a day. Both are computed from the tasks themselves, so there is nothing extra
 * to keep in sync — and desktop notifications are opt-in, because asking for
 * that permission without context is how apps get denied forever.
 */
export function RemindersCard() {
  const { settings, updateSettings } = useWorkspace()
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported' | null>(null)

  const supported = notificationsSupported()
  const current = permission ?? (supported ? Notification.permission : 'unsupported')

  const ask = async () => {
    const result = await requestNotificationPermission()
    setPermission(result)
    if (result === 'granted') toast.success('Desktop reminders on')
    else if (result === 'denied') toast.error('The browser said no — in-app reminders still work')
    else if (result === 'unsupported') toast.error('This browser has no notification support')
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <BellRing className="h-4 w-4 text-primary" aria-hidden="true" />
        <CardTitle className="text-base">Reminders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Reminders are derived from the task itself: pin a time and Motif speaks up shortly before it, without a second
          list to keep tidy. Completed work never reminds.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="settings-lead"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Remind me before
            </label>
            <Select
              value={String(settings.reminderLeadMinutes)}
              onValueChange={(value) => updateSettings({ reminderLeadMinutes: Number(value) })}
            >
              <SelectTrigger id="settings-lead" aria-label="Remind me before">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEADS.map((minutes) => (
                  <SelectItem key={minutes} value={String(minutes)}>
                    {minutes} minutes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="settings-check-in"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Daily check-in
            </label>
            <Input
              id="settings-check-in"
              type="time"
              value={settings.checkInTime}
              aria-label="Daily check-in time"
              onChange={(event) => updateSettings({ checkInTime: event.target.value || '09:00' })}
            />
            <p className="text-xs text-muted-foreground">One nudge a day, if the day is still unplanned.</p>
          </div>
        </div>

        <ul className="space-y-2">
          <li className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
            <span className="text-sm">
              Daily check-in
              <span className="block text-xs text-muted-foreground">A reminder to plan, not to perform.</span>
            </span>
            <Switch
              checked={settings.dailyCheckIn}
              onCheckedChange={(checked) => updateSettings({ dailyCheckIn: checked })}
              aria-label="Daily check-in nudge"
            />
          </li>

          <li className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
            <span className="text-sm">
              Desktop notifications
              <span className="block text-xs text-muted-foreground">
                {supported
                  ? current === 'granted'
                    ? 'Allowed by this browser.'
                    : current === 'denied'
                      ? 'Blocked in the browser — in-app reminders still fire.'
                      : 'Needs your permission once.'
                  : 'This browser has no notification support.'}
              </span>
            </span>
            <Switch
              checked={settings.desktopReminders && current === 'granted'}
              disabled={!supported}
              onCheckedChange={(checked) => {
                if (checked) {
                  void ask()
                  updateSettings({ desktopReminders: true })
                  return
                }
                updateSettings({ desktopReminders: false })
              }}
              aria-label="Desktop notifications"
            />
          </li>
        </ul>

        {supported && current !== 'granted' && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void ask()}>
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Ask the browser now
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

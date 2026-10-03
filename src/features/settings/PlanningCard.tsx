import { Card, CardContent, CardHeader, CardTitle, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@blinkdotnew/ui'
import { Settings2 } from 'lucide-react'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { formatMinutes } from '@/lib/dates'

/**
 * Planning preferences: the numbers the scheduler and the rituals use.
 *
 * Explicit rather than "smart": the day plan is only as honest as the capacity
 * you tell it about, so these are first-class settings instead of hidden
 * defaults (Reclaim's working hours + Sunsama's realistic-capacity idea).
 */
const CAPACITY_CHOICES = [120, 180, 240, 300, 360, 420, 480]
const GOAL_CHOICES = [30, 60, 90, 120, 180, 240]

export function PlanningCard() {
  const { settings, updateSettings } = useWorkspace()

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <Settings2 className="h-4 w-4 text-primary" aria-hidden="true" />
        <CardTitle className="text-base">Focus &amp; planning</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="settings-focus" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Focus interval (minutes)
          </label>
          <Input
            id="settings-focus"
            type="number"
            min={5}
            max={120}
            step={5}
            value={settings.focusMinutes}
            onChange={(event) => updateSettings({ focusMinutes: Number(event.target.value) || 25 })}
          />
          <p className="text-xs text-muted-foreground">
            Breaks: {settings.shortBreakMinutes}m short · {settings.longBreakMinutes}m long.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="settings-goal" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Daily focus goal
          </label>
          <Select
            value={String(settings.dailyFocusGoalMinutes)}
            onValueChange={(value) => updateSettings({ dailyFocusGoalMinutes: Number(value) })}
          >
            <SelectTrigger id="settings-goal" aria-label="Daily focus goal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOAL_CHOICES.map((minutes) => (
                <SelectItem key={minutes} value={String(minutes)}>
                  {formatMinutes(minutes)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="settings-capacity" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Realistic working minutes per day
          </label>
          <Select
            value={String(settings.capacityMinutesPerDay)}
            onValueChange={(value) => updateSettings({ capacityMinutesPerDay: Number(value) })}
          >
            <SelectTrigger id="settings-capacity" aria-label="Daily capacity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAPACITY_CHOICES.map((minutes) => (
                <SelectItem key={minutes} value={String(minutes)}>
                  {formatMinutes(minutes)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Used for the over-commitment warning on Today and Insights.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="settings-start" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Day starts
            </label>
            <Input
              id="settings-start"
              type="time"
              value={settings.workdayStart}
              onChange={(event) => updateSettings({ workdayStart: event.target.value || '09:00' })}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="settings-end" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Day ends
            </label>
            <Input
              id="settings-end"
              type="time"
              value={settings.workdayEnd}
              onChange={(event) => updateSettings({ workdayEnd: event.target.value || '17:30' })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

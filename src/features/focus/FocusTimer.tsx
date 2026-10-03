import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Progress, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@blinkdotnew/ui'
import { Coffee, Pause, Play, RotateCcw, SkipForward, Target } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkspace } from '@/features/workspace/useWorkspace'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { formatMinutes } from '@/lib/dates'

/**
 * Focus timer (TickTick's Pomodoro, with Sunsama's single-task discipline).
 *
 * Bound to one task at a time, it logs a session when the interval ends — which
 * is what makes "estimated vs actual" and the focus chart real numbers rather
 * than guesses. Breaks are logged separately and never count towards the goal.
 */

type Phase = 'focus' | 'break'

/** Short chime at the end of an interval; skipped when the setting is off. */
function chime(): void {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    const context = new Ctor()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 660
    gain.gain.value = 0.04
    oscillator.connect(gain).connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.25)
    oscillator.onended = () => void context.close()
  } catch {
    /* audio is a nicety, never a failure path */
  }
}

export function FocusTimer({ className, presetTaskId }: { className?: string; presetTaskId?: string }) {
  const { tasks, settings, logFocusSession, stats } = useWorkspace()
  const [phase, setPhase] = useState<Phase>('focus')
  const [running, setRunning] = useState(false)
  const [taskId, setTaskId] = useState<string>('')
  const [secondsLeft, setSecondsLeft] = useState(settings.focusMinutes * 60)
  const [completedToday, setCompletedToday] = useState(0)
  const startedAtRef = useRef<string>(new Date().toISOString())

  const candidates = useMemo(
    () => tasks.filter((task) => task.status !== 'Completed' && task.status !== 'Inbox'),
    [tasks],
  )
  const activeTask = candidates.find((task) => task.id === taskId) ?? null

  const intervalMinutes = phase === 'focus' ? settings.focusMinutes : settings.shortBreakMinutes
  const totalSeconds = intervalMinutes * 60

  const reset = useCallback(
    (nextPhase: Phase = 'focus', autoStart = false) => {
      setPhase(nextPhase)
      setSecondsLeft((nextPhase === 'focus' ? settings.focusMinutes : settings.shortBreakMinutes) * 60)
      setRunning(autoStart)
      startedAtRef.current = new Date().toISOString()
    },
    [settings.focusMinutes, settings.shortBreakMinutes],
  )

  // Picking "Focus" on a task elsewhere on the page binds the timer to it.
  useEffect(() => {
    if (presetTaskId) setTaskId(presetTaskId)
  }, [presetTaskId])

  // Keep the timer in step when the user edits the interval length in Settings.
  useEffect(() => {
    setSecondsLeft((current) => {
      if (running) return current
      return intervalMinutes * 60
    })
  }, [intervalMinutes, running])

  const finish = useCallback(() => {
    if (phase === 'focus') {
      logFocusSession({ taskId: taskId || null, minutes: settings.focusMinutes, startedAt: startedAtRef.current })
      setCompletedToday((count) => count + 1)
      if (settings.chimeOnSessionEnd) chime()
      toast.success(
        activeTask
          ? `Focus logged · ${settings.focusMinutes}m on “${activeTask.title}”`
          : `Focus logged · ${settings.focusMinutes}m`,
        { icon: '🎯' },
      )
      reset('break', true)
    } else {
      if (settings.chimeOnSessionEnd) chime()
      toast('Break over — back to it', { icon: '☕' })
      reset('focus', false)
    }
  }, [activeTask, logFocusSession, phase, reset, settings.chimeOnSessionEnd, settings.focusMinutes, taskId])

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(id)
          finish()
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [running, finish])

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const progress = totalSeconds === 0 ? 0 : ((totalSeconds - secondsLeft) / totalSeconds) * 100
  const goalProgress =
    settings.dailyFocusGoalMinutes === 0 ? 0 : Math.min(100, (stats.focusTodayMinutes / settings.dailyFocusGoalMinutes) * 100)

  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-primary" aria-hidden="true" />
          Focus
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {completedToday} session{completedToday === 1 ? '' : 's'} this sitting
        </span>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-center text-xs uppercase tracking-wide text-muted-foreground">
          {phase === 'break' ? (
            <span className="inline-flex items-center gap-1">
              <Coffee className="h-3 w-3" aria-hidden="true" /> Break
            </span>
          ) : activeTask ? (
            activeTask.title
          ) : (
            'Unbound focus'
          )}
        </p>

        <div className="flex justify-center py-1">
          <ProgressRing
            value={progress}
            size={168}
            thickness={12}
            tone={phase === 'break' ? 'success' : 'brand'}
            pulse={running && phase === 'focus'}
            label={phase === 'break' ? 'Break progress' : 'Focus interval progress'}
          >
            <span className="flex flex-col items-center">
              <span className="font-mono text-3xl font-semibold tabular-nums leading-none text-foreground">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {phase === 'break' ? 'break' : running ? 'in focus' : 'ready'}
              </span>
            </span>
          </ProgressRing>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button size="sm" onClick={() => setRunning((value) => !value)} className="gap-1.5 coarse:h-11">
            {running ? (
              <Pause className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
            {running ? 'Pause' : 'Start'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => reset(phase, false)} className="gap-1.5 coarse:h-11">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </Button>
          <Button size="sm" variant="ghost" onClick={finish} className="gap-1.5">
            <SkipForward className="h-4 w-4" aria-hidden="true" />
            {phase === 'focus' ? 'Log & take a break' : 'Skip break'}
          </Button>
        </div>

        {phase === 'focus' && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="focus-task">
              Working on
            </label>
            <Select
              value={taskId || 'none'}
              onValueChange={(value) => setTaskId(value === 'none' ? '' : value)}
            >
              <SelectTrigger id="focus-task" aria-label="Task for this focus session">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unbound focus</SelectItem>
                {candidates.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="rounded-md border border-border bg-muted/40 p-3">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">Today’s focus</span>
            <span className="tabular-nums font-medium text-foreground">
              {formatMinutes(stats.focusTodayMinutes)} / {formatMinutes(settings.dailyFocusGoalMinutes)}
            </span>
          </div>
          <Progress value={goalProgress} aria-label="Daily focus goal" className="mt-2 h-1.5" />
        </div>
      </CardContent>
    </Card>
  )
}

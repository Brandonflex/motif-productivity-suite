import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, CardContent } from '@blinkdotnew/ui'
import { ArrowRight, Sparkles, X } from 'lucide-react'
import { MotifMark } from '@/components/brand/MotifMark'
import { useShellActions } from '@/components/app-shell/shell-actions'
import { ETHOS, MAKER, START_HERE } from '@/content/story'
import { markWelcomeSeen } from '@/lib/welcome'

/**
 * The first hello.
 *
 * Deliberately a card on the dashboard rather than a modal: a returning user
 * who clears a workspace (or opens the app in a new browser) lands on their
 * work, with the introduction sitting politely above it. Dismissing it is one
 * click and it stays gone — the Settings card can bring it back.
 */
export function WelcomeCard() {
  const navigate = useNavigate()
  const { openCapture, openAbout } = useShellActions()
  const [leaving, setLeaving] = useState(false)

  const dismiss = () => {
    markWelcomeSeen()
    setLeaving(true)
  }

  if (leaving) return null

  return (
    <Card className="overflow-hidden border-primary/30">
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-start gap-3">
          <MotifMark size={52} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{ETHOS.eyebrow}</p>
            <h2 className="text-lg font-semibold text-foreground">{ETHOS.lede}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Motif folds the apps I would otherwise open in a day into one workspace that opens instantly and asks for
              nothing. It is free, it is yours, and it was encoded to me — {MAKER.name} — so it can be whatever my week
              needs next.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss the welcome — it will not come back"
            onClick={dismiss}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <ul className="grid gap-3 md:grid-cols-3">
          {START_HERE.map((step) => (
            <li key={step.id} className="flex flex-col rounded-lg border border-border bg-card p-3">
              <p className="text-sm font-semibold text-foreground">{step.title}</p>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 w-full gap-1.5"
                onClick={() => {
                  if (step.id === 'capture') openCapture()
                  else if ('to' in step) navigate(step.to)
                }}
              >
                {step.action}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-2">
          {ETHOS.promise.map((line) => (
            <span
              key={line}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
            >
              <Sparkles className="h-3 w-3 text-brand" aria-hidden="true" />
              {line}
            </span>
          ))}
          <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={openAbout}>
            Read the whole story
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

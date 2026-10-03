import { useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Switch } from '@blinkdotnew/ui'
import { ExternalLink, Github, Heart, ShieldCheck } from 'lucide-react'
import { MotifMark } from '@/components/brand/MotifMark'
import { useShellActions } from '@/components/app-shell/shell-actions'
import { ETHOS, MAKER } from '@/content/story'
import { hasSeenWelcome, markWelcomeSeen, resetWelcome } from '@/lib/welcome'

/**
 * The one page that says what this is and why it exists.
 *
 * Settings is where people go when they are deciding whether to trust something
 * with their week, so the promise lives here in full: no account, no
 * subscription, no analytics — and a switch to bring the welcome back.
 */
export function AboutCard() {
  const { openAbout } = useShellActions()
  const [welcomeSeen, setWelcomeSeen] = useState(hasSeenWelcome)

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <Heart className="h-4 w-4 text-brand" aria-hidden="true" />
        <CardTitle className="text-base">About Motif</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <MotifMark size={44} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{ETHOS.headline}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              One workspace for the apps I would otherwise open in a day, built and run by {MAKER.name}. No account, no
              subscription, no analytics — your workspace is a file you own.
            </p>
          </div>
        </div>

        <ul className="flex flex-wrap gap-1.5">
          {ETHOS.promise.map((line) => (
            <li
              key={line}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
            >
              <ShieldCheck className="h-3 w-3 text-success" aria-hidden="true" />
              {line}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={openAbout}>
            Read the story
          </Button>
          <Button asChild size="sm" variant="ghost" className="gap-1.5">
            <a href={MAKER.repo} target="_blank" rel="noreferrer noopener">
              <Github className="h-3.5 w-3.5" aria-hidden="true" />
              Source
            </a>
          </Button>
          <Button asChild size="sm" variant="ghost" className="gap-1.5">
            <a href={MAKER.live} target="_blank" rel="noreferrer noopener">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Live app
            </a>
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <span className="text-sm">
            Show the welcome on the dashboard
            <span className="block text-xs text-muted-foreground">
              The first-run card with the three ways in, back when you want it.
            </span>
          </span>
          <Switch
            checked={!welcomeSeen}
            aria-label="Show the welcome card on the dashboard"
            onCheckedChange={(checked) => {
              if (checked) resetWelcome()
              else markWelcomeSeen()
              setWelcomeSeen(!checked)
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

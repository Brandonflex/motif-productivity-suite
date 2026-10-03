import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@blinkdotnew/ui'
import { ExternalLink, Github, ShieldCheck } from 'lucide-react'
import { MotifMark } from '@/components/brand/MotifMark'
import { ETHOS, MAKER } from '@/content/story'

/**
 * The story, on demand.
 *
 * Reachable from the sidebar, the command palette and Settings — three places
 * because "why does this exist" is a question people ask at different moments,
 * and the answer should not be buried in a README they will never open.
 */
export function AboutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <MotifMark size={44} />
            <div className="min-w-0 text-left">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {ETHOS.eyebrow}
              </p>
              <DialogTitle className="text-left text-lg leading-snug">{ETHOS.headline}</DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-left text-sm">{ETHOS.lede}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          {ETHOS.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 32)}>{paragraph}</p>
          ))}
        </div>

        <ul className="grid gap-3 sm:grid-cols-3">
          {ETHOS.principles.map((principle) => (
            <li key={principle.title} className="rounded-lg border border-border bg-card p-3">
              <p className="text-sm font-semibold text-foreground">{principle.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{principle.body}</p>
            </li>
          ))}
        </ul>

        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What the mark means</p>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            {ETHOS.mark.map((entry) => (
              <div key={entry.part} className="flex gap-2">
                <dt className="shrink-0 text-xs font-medium text-foreground">{entry.part}</dt>
                <dd className="text-xs text-muted-foreground">— {entry.meaning}</dd>
              </div>
            ))}
          </dl>
        </div>

        <ul className="flex flex-wrap gap-1.5">
          {ETHOS.promise.map((line) => (
            <li
              key={line}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground"
            >
              <ShieldCheck className="h-3 w-3 text-success" aria-hidden="true" />
              {line}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            {ETHOS.credit} {ETHOS.fork}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <a href={MAKER.repo} target="_blank" rel="noreferrer noopener">
                <Github className="h-3.5 w-3.5" aria-hidden="true" />
                Source
              </a>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <a href={MAKER.live} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                Live app
              </a>
            </Button>
            <Button size="sm" onClick={() => onOpenChange(false)}>
              Back to work
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

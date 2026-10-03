import { cn } from '@/lib/utils'

/**
 * The Motif mark — the logo, and the thesis of the app in one drawing.
 *
 * Reading it outwards:
 *  · **The rosette** — six petals around a centre. A *motif* is a figure that
 *    repeats, so the mark is built from one petal rotated six times: the same
 *    small piece of work, coming back around. That is also what a habit is.
 *  · **The braid** — two ribbons crossing through the middle, warm and cool.
 *    Balance: the day is effort *and* recovery, productivity and play. The
 *    ribbons are drawn as a single looping stroke, because the point of a
 *    routine is that it closes and starts again.
 *  · **The beat** — the pulsing core, a metronome for the day.
 *  · **The spark** — the orbiting dot: the next capture, the next small start.
 *
 * Everything is CSS-animated (see `index.css`), so the mark costs nothing at
 * runtime, holds still for reduced-motion users, and keeps its shape at 20 px
 * in a sidebar and 400 px on a landing page.
 */

export type MotifMarkVariant = 'mark' | 'lockup'

export interface MotifMarkProps {
  size?: number
  /** Idle animation. Turn it off for print, favicons or dense lists. */
  animated?: boolean
  /** Include the wordmark beside the mark. */
  variant?: MotifMarkVariant
  className?: string
}

function Wordmark() {
  return (
    <span className="font-sans text-lg font-semibold tracking-tight text-foreground">
      Motif
      <span className="ml-1.5 align-middle text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        suite
      </span>
    </span>
  )
}

export function MotifMark({ size = 36, animated = true, variant = 'mark', className }: MotifMarkProps) {
  const petals = [0, 60, 120, 180, 240, 300]

  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Motif"
      className={cn('shrink-0 overflow-visible', className)}
    >
      <defs>
        <linearGradient id="motif-warm" x1="8" y1="56" x2="56" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--brand))" />
        </linearGradient>
        <linearGradient id="motif-cool" x1="56" y1="56" x2="8" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(var(--info))" />
          <stop offset="100%" stopColor="hsl(var(--deep))" />
        </linearGradient>
      </defs>

      {/* The rosette: one petal, repeated. */}
      <g className={animated ? 'motif-spin-slow' : undefined} style={{ transformOrigin: '32px 32px' }}>
        {petals.map((angle) => (
          <ellipse
            key={angle}
            cx="32"
            cy="18"
            rx="7.4"
            ry="11.6"
            transform={`rotate(${angle} 32 32)`}
            stroke="hsl(var(--primary) / 0.45)"
            strokeWidth="1.1"
            className={animated ? 'motif-tile' : undefined}
          />
        ))}
      </g>

      {/* The counter-rotating ring of ticks: the seconds of a focus interval. */}
      <g className={animated ? 'motif-spin-reverse' : undefined} style={{ transformOrigin: '32px 32px' }}>
        {Array.from({ length: 12 }, (_, index) => index * 30).map((angle) => (
          <line
            key={angle}
            x1="32"
            y1="4.5"
            x2="32"
            y2="7.5"
            transform={`rotate(${angle} 32 32)`}
            stroke="hsl(var(--muted-foreground) / 0.5)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        ))}
      </g>

      {/* The braid: two ribbons crossing, one looping stroke each. */}
      <path
        d="M14 44C22 44 24 22 32 22s10 22 18 22"
        stroke="url(#motif-warm)"
        strokeWidth="3.4"
        strokeLinecap="round"
        className={animated ? 'motif-draw' : undefined}
      />
      <path
        d="M14 22C22 22 24 44 32 44s10-22 18-22"
        stroke="url(#motif-cool)"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.75"
        className={animated ? 'motif-draw' : undefined}
        style={{ animationDelay: '0.9s' }}
      />

      {/* The beat: the centre of the figure. */}
      <circle cx="32" cy="32" r="4.6" fill="hsl(var(--primary))" className={animated ? 'motif-beat' : undefined} />
      <circle cx="32" cy="32" r="8.4" stroke="hsl(var(--primary) / 0.35)" strokeWidth="1" />

      {/* The spark: the next thing to capture, always in orbit. */}
      {animated ? (
        <g className="motif-orbit" style={{ transformOrigin: '32px 32px' }}>
          <circle cx="32" cy="32" r="2.4" fill="hsl(var(--warning))" />
        </g>
      ) : (
        <circle cx="32" cy="17" r="2.4" fill="hsl(var(--warning))" />
      )}
    </svg>
  )

  if (variant === 'mark') return mark

  return (
    <span className="inline-flex items-center gap-2.5">
      {mark}
      <Wordmark />
    </span>
  )
}

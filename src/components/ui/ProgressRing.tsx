import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Circular progress ("the digital bar, but round").
 *
 * Rings read faster than bars when several of them sit together — a whole
 * day's state (focus, plan, finish) becomes one glance instead of three
 * comparisons — and they scale down to a 34 px sidebar chip without turning
 * into unreadable slivers.
 *
 * Accessibility is deliberate: the ring is a `progressbar` with real
 * `aria-valuenow`/`aria-valuetext`, the visible centre is redundant with that
 * label, and the sweep is skipped entirely for reduced-motion users.
 */

export type RingTone = 'primary' | 'brand' | 'success' | 'info' | 'warning' | 'deep' | 'admin'

const TONES: Record<RingTone, { stroke: string; glow: string }> = {
  primary: { stroke: 'hsl(var(--primary))', glow: 'hsl(var(--primary) / 0.35)' },
  brand: { stroke: 'hsl(var(--brand))', glow: 'hsl(var(--brand) / 0.35)' },
  success: { stroke: 'hsl(var(--success))', glow: 'hsl(var(--success) / 0.35)' },
  info: { stroke: 'hsl(var(--info))', glow: 'hsl(var(--info) / 0.35)' },
  warning: { stroke: 'hsl(var(--warning))', glow: 'hsl(var(--warning) / 0.35)' },
  deep: { stroke: 'hsl(var(--deep))', glow: 'hsl(var(--deep) / 0.35)' },
  admin: { stroke: 'hsl(var(--admin))', glow: 'hsl(var(--admin) / 0.35)' },
}

export interface ProgressRingProps {
  /** 0–100. Values are clamped, so callers never have to. */
  value: number
  size?: number
  thickness?: number
  tone?: RingTone
  /** Accessible name — always required, it is what a screen reader reads. */
  label: string
  /** Small text under the value inside the ring. */
  caption?: string
  /** Content in the middle; replaces the default percentage readout. */
  children?: ReactNode
  /** Breathe/pulse — used while a focus interval is running. */
  pulse?: boolean
  /** Seconds; a duplicate arc that sweeps onto the value, for emphasis. */
  className?: string
}

export function ProgressRing({
  value,
  size = 96,
  thickness = 8,
  tone = 'primary',
  label,
  caption,
  children,
  pulse = false,
  className,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', pulse && 'ring-breathe', className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-valuetext={`${Math.round(clamped)} percent${caption ? ` — ${caption}` : ''}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className="stroke-muted"
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          stroke={TONES[tone].stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={mounted ? offset : circumference}
          className="ring-sweep"
          style={{ filter: `drop-shadow(0 0 6px ${TONES[tone].glow})` }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
        {children ?? (
          <>
            <span className="text-lg font-semibold tabular-nums text-foreground">{Math.round(clamped)}%</span>
            {caption && <span className="mt-1 text-[10px] text-muted-foreground">{caption}</span>}
          </>
        )}
      </div>
    </div>
  )
}

export interface RingStat {
  key: string
  label: string
  value: number
  caption?: string
  tone?: RingTone
}

/** A row of related rings — the "day at a glance" trio, the XP rings, and so on. */
export function RingGroup({ rings, size = 84, className }: { rings: RingStat[]; size?: number; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center justify-center gap-4 sm:gap-6', className)}>
      {rings.map((ring) => (
        <li key={ring.key} className="flex flex-col items-center gap-2 text-center">
          <ProgressRing value={ring.value} size={size} tone={ring.tone} label={ring.label} caption={ring.caption} />
          <span className="max-w-[6.5rem] text-[11px] font-medium text-muted-foreground">{ring.label}</span>
        </li>
      ))}
    </ul>
  )
}

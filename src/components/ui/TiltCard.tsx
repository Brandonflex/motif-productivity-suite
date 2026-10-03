import { useCallback, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/**
 * A card that leans towards the pointer.
 *
 * Depth is what makes a screen feel physical rather than printed, but it has
 * to stay cheap: one transform per frame, driven by CSS custom properties, and
 * completely inert for reduced-motion users or on touch devices (where there is
 * no hover to respond to and the tilt would only cost battery).
 *
 * The glare is a real gradient track — it reads as a light source, which is
 * what sells the illusion in both themes.
 */
export function TiltCard({
  children,
  className,
  intensity = 7,
  glare = true,
}: {
  children: ReactNode
  className?: string
  /** Maximum rotation in degrees. */
  intensity?: number
  glare?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<{ rx: number; ry: number; gx: number; gy: number; active: boolean }>({
    rx: 0,
    ry: 0,
    gx: 50,
    gy: 0,
    active: false,
  })
  const reduced = useReducedMotion()

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (reduced || event.pointerType !== 'mouse') return
      const node = ref.current
      if (!node) return
      const rect = node.getBoundingClientRect()
      const px = (event.clientX - rect.left) / rect.width
      const py = (event.clientY - rect.top) / rect.height
      setStyle({
        rx: (0.5 - py) * intensity * 2,
        ry: (px - 0.5) * intensity * 2,
        gx: px * 100,
        gy: py * 100,
        active: true,
      })
    },
    [intensity, reduced],
  )

  const reset = useCallback(() => setStyle({ rx: 0, ry: 0, gx: 50, gy: 0, active: false }), [])

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
      data-tilting={style.active ? 'true' : undefined}
      className={cn('tilt-surface relative', className)}
      style={
        reduced
          ? undefined
          : {
              transform: `perspective(900px) rotateX(${style.rx}deg) rotateY(${style.ry}deg)`,
            }
      }
    >
      {children}
      {glare && !reduced && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-200 data-[tilting=true]:opacity-100"
          data-tilting={style.active ? 'true' : undefined}
          style={{
            background: `radial-gradient(28rem circle at ${style.gx}% ${style.gy}%, hsl(var(--foreground) / 0.10), transparent 45%)`,
          }}
        />
      )}
    </div>
  )
}

/**
 * Confetti, without a dependency.
 *
 * A single canvas is created on demand, animates a short burst of tokens in
 * the theme's own palette, and removes itself — no library, no long-lived
 * render loop, no layout thrash. Motion-sensitive users get nothing at all
 * (the caller's toast still tells them what happened).
 *
 * Shapes are deliberate: squares, thin ribbons and small rings, because a
 * "productivity" suite should look like paper and confetti, not lasers.
 */

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rotation: number
  spin: number
  color: string
  shape: 'square' | 'ribbon' | 'ring'
  life: number
}

function palette(): string[] {
  const styles = getComputedStyle(document.documentElement)
  const read = (name: string) => `hsl(${styles.getPropertyValue(name).trim()})`
  return [read('--primary'), read('--brand'), read('--success'), read('--info'), read('--warning')].filter(
    (value) => !value.includes('hsl()'),
  )
}

export interface CelebrateOptions {
  /** Where the burst starts, in viewport coordinates. Defaults to the top-centre. */
  x?: number
  y?: number
  /** How many tokens to throw. */
  count?: number
  /** Force the effect even for reduced-motion users (used nowhere by default). */
  force?: boolean
}

/** Fires a short confetti burst. Safe to call from anywhere; no-ops when motion is reduced. */
export function celebrate(options: CelebrateOptions = {}): void {
  if (typeof document === 'undefined') return
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  if (reduced && !options.force) return

  const count = options.count ?? 90
  const originX = options.x ?? window.innerWidth / 2
  const originY = options.y ?? window.innerHeight * 0.28
  const colors = palette()
  if (colors.length === 0) return

  const canvas = document.createElement('canvas')
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:60'
  document.body.appendChild(canvas)

  const context = canvas.getContext('2d')
  if (!context) {
    canvas.remove()
    return
  }

  const particles: Particle[] = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 5 + Math.random() * 9
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      size: 3 + Math.random() * 5,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)]!,
      shape: (['square', 'ribbon', 'ring'] as const)[Math.floor(Math.random() * 3)]!,
      life: 1,
    }
  })

  let frame = 0
  const tick = () => {
    frame += 1
    context.clearRect(0, 0, canvas.width, canvas.height)

    for (const particle of particles) {
      particle.vy += 0.28 // gravity
      particle.vx *= 0.99
      particle.x += particle.vx
      particle.y += particle.vy
      particle.rotation += particle.spin
      particle.life -= 0.008
    }

    for (const particle of particles) {
      if (particle.life <= 0) continue
      context.save()
      context.translate(particle.x, particle.y)
      context.rotate(particle.rotation)
      context.globalAlpha = Math.max(0, Math.min(1, particle.life))
      context.fillStyle = particle.color
      context.strokeStyle = particle.color
      if (particle.shape === 'ring') {
        context.lineWidth = 1.6
        context.beginPath()
        context.arc(0, 0, particle.size, 0, Math.PI * 1.6)
        context.stroke()
      } else if (particle.shape === 'ribbon') {
        context.fillRect(-particle.size / 3, -particle.size * 1.4, particle.size / 1.6, particle.size * 2.8)
      } else {
        context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size)
      }
      context.restore()
    }

    if (frame < 150 && particles.some((particle) => particle.life > 0)) {
      requestAnimationFrame(tick)
      return
    }
    canvas.remove()
  }

  requestAnimationFrame(tick)
}

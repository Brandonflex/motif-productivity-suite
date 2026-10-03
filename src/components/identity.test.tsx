import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MotifMark } from '@/components/brand/MotifMark'
import { ProgressRing, RingGroup, type RingTone } from '@/components/ui/ProgressRing'
import { TiltCard } from '@/components/ui/TiltCard'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { renderHook } from '@testing-library/react'

/**
 * The identity layer: the mark, the ring and the tilt surface. These are the
 * pieces every page leans on, so their contracts are asserted here — semantics
 * first, decoration second.
 */

describe('MotifMark', () => {
  it('is announced as the product name by default', () => {
    render(<MotifMark />)
    expect(screen.getByRole('img', { name: 'Motif' })).toBeInTheDocument()
  })

  it('adds the wordmark in lockup form without duplicating the name', () => {
    render(<MotifMark variant="lockup" />)
    expect(screen.getByText('Motif')).toBeInTheDocument()
    expect(screen.getByText('suite')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Motif' })).toBeInTheDocument()
  })

  it('stills its animation when asked, for dense lists and print', () => {
    const { container } = render(<MotifMark animated={false} />)
    expect(container.querySelector('.motif-spin-slow')).toBeNull()
    expect(container.querySelector('.motif-draw')).toBeNull()
  })

  it('scales from a 20px sidebar chip to a hero without changing shape', () => {
    const { container } = render(<MotifMark size={400} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('viewBox', '0 0 64 64')
    expect(svg).toHaveAttribute('width', '400')
  })
})

describe('ProgressRing', () => {
  it('exposes real progressbar semantics with a spoken value', () => {
    render(<ProgressRing value={42.6} label="Focus goal" caption="2h" />)
    const ring = screen.getByRole('progressbar', { name: 'Focus goal' })
    expect(ring).toHaveAttribute('aria-valuenow', '43')
    expect(ring).toHaveAttribute('aria-valuetext', '43 percent — 2h')
    expect(ring).toHaveAttribute('aria-valuemin', '0')
    expect(ring).toHaveAttribute('aria-valuemax', '100')
  })

  it('clamps nonsense values instead of breaking the sweep', () => {
    const { rerender } = render(<ProgressRing value={-20} label="Under" />)
    expect(screen.getByRole('progressbar', { name: 'Under' })).toHaveAttribute('aria-valuenow', '0')

    rerender(<ProgressRing value={Number.NaN} label="NaN" />)
    expect(screen.getByRole('progressbar', { name: 'NaN' })).toHaveAttribute('aria-valuenow', '0')

    rerender(<ProgressRing value={180} label="Over" />)
    expect(screen.getByRole('progressbar', { name: 'Over' })).toHaveAttribute('aria-valuenow', '100')
  })

  it('renders custom centre content and the default percentage otherwise', () => {
    const { rerender } = render(<ProgressRing value={10} label="Default" />)
    expect(screen.getByText('10%')).toBeInTheDocument()

    rerender(
      <ProgressRing value={10} label="Custom">
        <span>LVL 3</span>
      </ProgressRing>,
    )
    expect(screen.getByText('LVL 3')).toBeInTheDocument()
    expect(screen.queryByText('10%')).not.toBeInTheDocument()
  })

  it('breathes only while pulsing', () => {
    const { container, rerender } = render(<ProgressRing value={50} label="Idle" />)
    expect(container.querySelector('.ring-breathe')).toBeNull()

    rerender(<ProgressRing value={50} label="Running" pulse />)
    expect(container.querySelector('.ring-breathe')).not.toBeNull()
  })

  it('groups rings into a labelled list of tones', () => {
    const tones: RingTone[] = ['primary', 'brand', 'success']
    render(
      <RingGroup
        rings={tones.map((tone) => ({
          key: tone,
          label: `${tone} ring`,
          value: 50,
          tone,
        }))}
      />,
    )
    expect(screen.getAllByRole('progressbar')).toHaveLength(3)
    expect(screen.getByRole('progressbar', { name: 'brand ring' })).toBeInTheDocument()
  })
})

describe('TiltCard', () => {
  it('renders its children on a plain surface', () => {
    render(
      <TiltCard>
        <p>Tiltable</p>
      </TiltCard>,
    )
    expect(screen.getByText('Tiltable')).toBeInTheDocument()
  })

  it('defines a motion utility class that the reduced-motion rules can still', () => {
    const { container } = render(<TiltCard className="tilt-surface">content</TiltCard>)
    expect(container.querySelector('.tilt-surface')).not.toBeNull()
    expect(container.querySelector('.grain') ?? null).toBeNull()
  })
})

describe('useReducedMotion', () => {
  it('is false when the user has no preference', () => {
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('is true when the media query matches', () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia

    try {
      const { result } = renderHook(() => useReducedMotion())
      expect(result.current).toBe(true)
    } finally {
      window.matchMedia = original
    }
  })
})

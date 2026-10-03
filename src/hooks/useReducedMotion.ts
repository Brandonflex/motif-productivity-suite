import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function read(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(QUERY).matches
}

/**
 * Tracks the user's motion preference, live.
 *
 * Every decorative effect in the suite asks this first: confetti, tilt, twinkle
 * and sweep are all opt-in extras, and "reduce motion" is a medical and
 * vestibular need, not a taste preference. CSS animations are stilled by the
 * global media query in `index.css`; this hook exists for the effects that are
 * driven from JavaScript, where CSS cannot help.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(read)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const media = window.matchMedia(QUERY)
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches)
    media.addEventListener('change', listener)
    setReduced(media.matches)
    return () => media.removeEventListener('change', listener)
  }, [])

  return reduced
}

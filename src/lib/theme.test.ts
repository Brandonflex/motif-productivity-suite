import { beforeEach, describe, expect, it } from 'vitest'
import { applyTheme, getThemePreference, resolveTheme, setThemePreference } from '@/lib/theme'

describe('theme store', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark', 'light')
    setThemePreference('system')
  })

  it('defaults to following the system preference', () => {
    expect(getThemePreference()).toBe('system')
  })

  it('persists an explicit preference and applies it to <html>', () => {
    setThemePreference('dark')

    expect(window.localStorage.getItem('motif:theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.dataset.theme).toBe('dark')

    setThemePreference('light')

    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('clears the stored value when returning to system', () => {
    setThemePreference('dark')
    setThemePreference('system')

    expect(window.localStorage.getItem('motif:theme')).toBeNull()
    expect(getThemePreference()).toBe('system')
  })

  it('falls back to light when the system has no dark preference', () => {
    expect(resolveTheme()).toBe('light')
  })

  it('re-applies the current preference without throwing', () => {
    expect(() => applyTheme()).not.toThrow()
  })
})

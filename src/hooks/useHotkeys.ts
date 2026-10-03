import { useEffect, useRef } from 'react'

type HotkeyHandler = (event: KeyboardEvent) => void

/**
 * Keeps a shortcut from firing when the user is typing, when a modifier is
 * held, or while a dialog/menu owns the keyboard.
 */
function shouldIgnore(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return true

  const target = event.target
  if (target instanceof HTMLElement) {
    if (target.isContentEditable) return true
    const tag = target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  }

  // Radix marks an open overlay with `data-state="open"`; whatever is inside it
  // (a form field, a listbox, a menu) is a better owner of the keystroke.
  return document.querySelector(
    [
      '[role="dialog"][data-state="open"]',
      '[role="alertdialog"][data-state="open"]',
      '[role="menu"][data-state="open"]',
      '[role="listbox"][data-state="open"]',
    ].join(', '),
  ) !== null
}

/**
 * Single-key shortcuts for the current view, e.g. `useHotkeys({ '/': focusSearch, n: openCreate })`.
 *
 * Keys are matched case-insensitively against `event.key`, so Shift+N does not
 * fire the `n` handler. Handlers are read from a ref, which means the listener
 * is attached once per view instead of on every render.
 */
export function useHotkeys(handlers: Record<string, HotkeyHandler>): void {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (shouldIgnore(event)) return

      const handler = handlersRef.current[event.key.toLowerCase()]
      if (!handler) return

      handler(event)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

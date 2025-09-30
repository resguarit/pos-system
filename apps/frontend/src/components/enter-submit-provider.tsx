import { useEffect } from 'react'

/**
 * Global provider to submit forms on Enter key across the app.
 * Skips textareas, contentEditable, selects, buttons/links, and sections marked with data-no-enter-submit.
 */
export default function EnterSubmitProvider() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      if (e.key !== 'Enter') return
      // IME composition (e.g. accents/Chinese input)
      // @ts-ignore
      if (e.isComposing) return

      const target = e.target as HTMLElement | null
      if (!target) return

      // Opt-out: any ancestor can disable this
      if (target.closest('[data-no-enter-submit="true"]')) return

      const tag = target.tagName
      if (tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || tag === 'A') return
      if ((target as any).isContentEditable) return

      const form = target.closest('form') as HTMLFormElement | null
      if (!form) return

      // Avoid submitting if any focused element has type=submit to let native handle it
      const active = document.activeElement as HTMLElement | null
      if (active && active.tagName === 'BUTTON') return

      // Prevent default and submit
      e.preventDefault()
      // Use requestSubmit if available to respect form validations & onSubmit
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit()
      } else {
        form.submit()
      }
    }

    // Use capture to intercept before other handlers that might stop propagation
    window.addEventListener('keydown', handler, { capture: true })
    return () => window.removeEventListener('keydown', handler, { capture: true } as any)
  }, [])

  return null
}

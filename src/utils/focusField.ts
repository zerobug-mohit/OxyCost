// Scroll to and highlight an input field on the left pane, given its instance
// scope (e.g. "psa-0" or "rates") and field property name. Opens any collapsed
// <details> ancestors (the source panel, "Customize", the state rate/model
// trays) on the way. Retries briefly because a containing section may still be
// expanding when called.

export function focusInputField(scope: string, field: string): void {
  const attempt = (): boolean => {
    const scopeEl = document.querySelector(`[data-field-scope="${scope}"]`)
    if (!scopeEl) return false

    // Open the source panel itself (an uncontrolled <details>).
    const panel = scopeEl.querySelector('details.panel') as HTMLDetailsElement | null
    if (panel) panel.open = true

    const target = scopeEl.querySelector(`[data-field="${field}"]`) as HTMLElement | null
    if (!target) return false

    // Open every collapsed <details> above the target (nested trays included).
    let node: HTMLElement | null = target
    while (node && node !== document.body) {
      if (node.tagName === 'DETAILS') (node as HTMLDetailsElement).open = true
      node = node.parentElement
    }

    // If a still-collapsed ancestor (e.g. the Step card) hides it, retry later.
    if (target.offsetParent === null) return false

    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target.classList.add('field-flash')
      const input = target.querySelector('input, select') as HTMLElement | null
      input?.focus({ preventScroll: true })
      window.setTimeout(() => target.classList.remove('field-flash'), 1800)
    })
    return true
  }

  if (attempt()) return
  let tries = 0
  const timer = window.setInterval(() => {
    tries += 1
    if (attempt() || tries > 12) window.clearInterval(timer)
  }, 40)
}

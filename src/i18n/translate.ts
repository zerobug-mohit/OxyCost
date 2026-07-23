// Lightweight app-wide translation layer. Rather than thread a t() call through
// every one of the hundreds of components, we translate the rendered DOM text
// from an English→Hindi dictionary and keep it applied with a MutationObserver
// (so text React re-renders, and tooltips/menus that mount later, get translated
// too). English is the source of truth in the code; Hindi is layered on top.
//
// It swaps whole, static text nodes and a few attributes (title, aria-label,
// placeholder). Dynamic text (numbers, interpolated values) simply won't match a
// dictionary key and is left as-is.
import { useEffect } from 'react'
import { HI } from './dictionary'

export type Lang = 'en' | 'hi'

// en → hi, and the reverse hi → en (so toggling back restores English).
const EN_TO_HI = HI
const HI_TO_EN: Record<string, string> = {}
for (const [en, hi] of Object.entries(HI)) {
  if (!(hi in HI_TO_EN)) HI_TO_EN[hi] = en
}

const ATTRS = ['title', 'aria-label', 'placeholder']

function lookupFor(lang: Lang): (s: string) => string | undefined {
  return lang === 'hi' ? (s) => EN_TO_HI[s] : (s) => HI_TO_EN[s]
}

function translateNode(root: Node, lang: Lang): void {
  const lookup = lookupFor(lang)

  // Text nodes.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const texts: Text[] = []
  // Include the root itself if it is a text node (characterData mutations).
  if (root.nodeType === Node.TEXT_NODE) texts.push(root as Text)
  let cur = walker.nextNode()
  while (cur) {
    texts.push(cur as Text)
    cur = walker.nextNode()
  }
  for (const t of texts) {
    const raw = t.nodeValue ?? ''
    const key = raw.trim()
    if (!key) continue
    const val = lookup(key)
    if (val && val !== key) t.nodeValue = raw.replace(key, val)
  }

  // A few translatable attributes.
  const el = root.nodeType === Node.ELEMENT_NODE ? (root as Element) : null
  const scope = el ?? (root.parentElement as Element | null)
  if (!scope || !scope.querySelectorAll) return
  const candidates: Element[] = [scope, ...Array.from(scope.querySelectorAll('*'))]
  for (const node of candidates) {
    for (const a of ATTRS) {
      const cur2 = node.getAttribute?.(a)
      if (!cur2) continue
      const val = lookup(cur2.trim())
      if (val && val !== cur2.trim()) node.setAttribute(a, val)
    }
  }
}

/**
 * Translate the whole page to `lang` and keep it translated. English is the
 * default; when `lang` flips the effect re-runs and re-translates in the new
 * direction. The observer is paused while we mutate to avoid a feedback loop.
 */
export function usePageTranslation(lang: Lang): void {
  useEffect(() => {
    const root = document.body
    let paused = false

    const apply = (node: Node) => {
      paused = true
      try {
        translateNode(node, lang)
      } finally {
        paused = false
      }
    }

    // Initial full pass (for 'en' this restores English if we came from Hindi).
    apply(root)

    // English is the source of truth in the DOM, so only watch while Hindi is on.
    if (lang === 'en') return

    const observer = new MutationObserver((mutations) => {
      if (paused) return
      paused = true
      try {
        for (const m of mutations) {
          if (m.type === 'characterData') translateNode(m.target, lang)
          else if (m.type === 'attributes' && m.target) translateNode(m.target, lang)
          else m.addedNodes.forEach((n) => translateNode(n, lang))
        }
      } finally {
        paused = false
      }
    })
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS,
    })
    return () => observer.disconnect()
  }, [lang])
}

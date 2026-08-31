/**
 * Per-page lifecycle for client-side routing.
 *
 * With real page loads the browser threw away listeners, timers and WebGL
 * contexts for us. Routing in a single document means nothing is thrown away
 * unless we do it, so every page-scoped side effect has to register here:
 *
 *   document.addEventListener('mousemove', fn, { signal: pageSignal() })
 *   onCleanup(() => petals.dispose())
 *
 * The router calls disposePage() immediately before swapping content in.
 */

let controller = new AbortController()
let cleanups = []

/** Pass to addEventListener as `{ signal: pageSignal() }` — dropped on navigate. */
export function pageSignal() {
  return controller.signal
}

/** Register teardown for anything a signal can't cover: rAF loops, WebGL, DOM. */
export function onCleanup(fn) {
  cleanups.push(fn)
}

/** Tear the current page down, then arm a fresh controller for the next one. */
export function disposePage() {
  controller.abort()

  // Run in reverse so teardown unwinds in the order things were set up.
  for (const fn of cleanups.reverse()) {
    try {
      fn()
    } catch (err) {
      // One bad teardown must not strand the rest — a half-disposed page
      // leaks listeners into every subsequent navigation.
      console.error('[lifecycle] cleanup failed:', err)
    }
  }

  cleanups = []
  controller = new AbortController()
}

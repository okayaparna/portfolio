import { disposePage } from './page-lifecycle.js'
import { getSweepController, playPageSweep, SWEEP_MS, MIDPOINT } from './page-transition.js'

/**
 * Client-side router.
 *
 * The point is that the document is never replaced. A full navigation tore
 * down the transition's canvas mid-sweep, which is what produced the blank
 * frame between pages; swapping content in place keeps one continuous band
 * across the change.
 *
 * Every page still works as a standalone document, so a cold load, a deep
 * link, and a crawler all behave exactly as they did before — the router only
 * upgrades navigations that happen once the page is already running.
 */

const PAGE_MODULES = {
  'index.html': () => import('./landing.js'),
  'projects.html': () => import('./projects.js'),
  'info.html': () => import('./info.js'),
}

const fileFor = (pathname) => pathname.split('/').pop() || 'index.html'

// Anything that isn't one of the three top-level pages is a project page.
function moduleFor(pathname) {
  return PAGE_MODULES[fileFor(pathname)] || (() => import('./project.js'))
}

export async function runPageInit(pathname = window.location.pathname) {
  const mod = await moduleFor(pathname)()
  mod.initPage?.()
}

function shouldIntercept(event, anchor) {
  if (event.defaultPrevented || event.button !== 0) return false
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false
  if (anchor.target && anchor.target !== '_self') return false
  if (anchor.hasAttribute('download')) return false

  const url = new URL(anchor.href, window.location.href)
  if (url.origin !== window.location.origin) return false
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  // Same-page anchors belong to the page, not the router.
  if (url.pathname === window.location.pathname && url.hash) return false
  if (url.href === window.location.href) return false

  return true
}

/** Swap the fetched document's body in, keeping anything marked data-persist. */
function applyDocument(html, url) {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  disposePage()

  // The sweep canvas has to outlive the swap — it is the transition.
  const persistent = Array.from(document.body.children).filter(el => el.hasAttribute('data-persist'))

  document.body.innerHTML = doc.body.innerHTML
  persistent.forEach(el => document.body.appendChild(el))

  // Page-scoped body hooks: `.project-page`, `data-project="twingate"`, etc.
  document.body.className = doc.body.className
  for (const { name } of Array.from(document.body.attributes)) {
    if (name.startsWith('data-')) document.body.removeAttribute(name)
  }
  for (const { name, value } of Array.from(doc.body.attributes)) {
    if (name.startsWith('data-')) document.body.setAttribute(name, value)
  }

  document.title = doc.title

  // A fresh document would have started at the top.
  window.scrollTo(0, 0)
}

let navigating = false

export async function navigate(href, { push = true } = {}) {
  if (navigating) return
  navigating = true

  const url = new URL(href, window.location.href)

  // Start the fetch immediately so the next page is usually already in hand by
  // the time the band covers the screen.
  const pending = fetch(url.href, { credentials: 'same-origin' })
    .then(res => {
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      return res.text()
    })

  let swapped = false
  const swapOnce = async () => {
    if (swapped) return
    swapped = true
    try {
      const html = await pending
      if (push) history.pushState({ routed: true }, '', url.href)
      applyDocument(html, url)
      await runPageInit(url.pathname)
      if (url.hash) {
        document.querySelector(url.hash)?.scrollIntoView()
      }
    } catch (err) {
      // A failed fetch must not leave the reader on a half-swapped page.
      console.error('[router] navigation failed, falling back to a full load:', err)
      window.location.href = url.href
    } finally {
      // Released on the swap, never on the animation: the sweep's promise
      // depends on rAF, which is frozen in a backgrounded tab, and gating the
      // lock on it deadlocks the router for the rest of the session.
      navigating = false
    }
  }

  const ctrl = getSweepController()
  if (!ctrl) {
    await swapOnce()   // no WebGL — swap with no transition
    return
  }

  // rAF is frozen in a backgrounded tab, so the swap can't depend on the
  // sweep reaching its midpoint. Whichever fires first wins.
  const failsafe = setTimeout(swapOnce, SWEEP_MS * MIDPOINT + 1200)

  // The band covers, we swap underneath it, then it sweeps off — one
  // continuous animation, because nothing was ever destroyed. Deliberately
  // not awaited: navigation is done once the content is in.
  playPageSweep(ctrl, swapOnce).finally(() => clearTimeout(failsafe))
}

export function initRouter() {
  document.addEventListener('click', (event) => {
    const anchor = event.target.closest?.('a[href]')
    if (!anchor || !shouldIntercept(event, anchor)) return
    event.preventDefault()
    navigate(anchor.href)
  })

  window.addEventListener('popstate', () => {
    // Back/forward: swap without pushing a duplicate entry.
    navigate(window.location.href, { push: false })
  })
}

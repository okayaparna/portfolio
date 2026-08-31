import { createShader, playSweep, accentChain } from 'glimm'

/**
 * The sweep band for page transitions.
 *
 * The canvas is created once and marked data-persist so the router keeps it
 * across content swaps — that persistence is the whole point. Previously each
 * navigation replaced the document and destroyed this canvas mid-sweep, which
 * is what produced the blank frame between pages.
 */

// A single flat colour — accentChain handles a one-hex chain explicitly.
const PALETTE = accentChain(['#FFBAD5'])

export const SWEEP_MS = 900
export const OUTRO_MS = 600
export const MIDPOINT = 0.5
const DIRECTION = 'ltr'
// A loose band (default is 14 — higher is tighter) at a high peak alpha means
// the viewport is fully covered when the content underneath is swapped.
const BAND_TIGHT = 3
const PEAK_ALPHA = 1.3
// glimm's iridescent crest highlight (default 0.55) blows a pale colour out to
// white in the middle of the band. Dialled back so the sweep still reads as
// #FFBAD5, but not to 0 — the band needs to stay opaque enough at the midpoint
// to hide the content swapping underneath it.
const SWELL_AMOUNT = 0.25

let controller = null
let mounted = false

/** Returns null when WebGL is unavailable — callers navigate without a sweep. */
export function getSweepController() {
  if (mounted) return controller
  mounted = true

  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  // Survives the router's content swap.
  canvas.setAttribute('data-persist', '')
  // Overscanned past the viewport on purpose: the shader's vertical falloff
  // leaves a pale line along the canvas's top and bottom edges, which reads as
  // the band failing to reach the top of the window. Bleeding it off-screen
  // hides the seam.
  Object.assign(canvas.style, {
    position: 'fixed',
    top: '-3%',
    left: '-3%',
    width: '106%',
    height: '106%',
    display: 'block',
    pointerEvents: 'none',
    zIndex: '9999',
  })
  document.body.appendChild(canvas)

  controller = createShader({
    canvas,
    palette: PALETTE,
    direction: DIRECTION,
    bandTight: BAND_TIGHT,
    swellAmount: SWELL_AMOUNT,
  })

  if (!controller) canvas.remove()
  return controller
}

const sweepOptions = {
  sweepMs: SWEEP_MS,
  outroMs: OUTRO_MS,
  midpoint: MIDPOINT,
  direction: DIRECTION,
  palette: PALETTE,
  bandTight: BAND_TIGHT,
  peakAlpha: PEAK_ALPHA,
  swellAmount: SWELL_AMOUNT,
}

/**
 * Sweep the band across, run `onMidpoint` while the screen is covered, then
 * sweep off. glimm awaits the midpoint callback before starting its outro, so
 * an async swap holds the band at full coverage until the new page is in.
 *
 * Resolves when the band has fully faded.
 */
export function playPageSweep(ctrl, onMidpoint) {
  const handle = playSweep(ctrl, { ...sweepOptions, onMidpoint })

  // The band covers everything, so a stalled sweep would hide the whole site.
  // Re-armed on visibility because rAF is frozen in a backgrounded tab.
  let timer
  const arm = () => {
    clearTimeout(timer)
    if (document.hidden) return
    timer = setTimeout(() => ctrl.setAlpha(0), SWEEP_MS + OUTRO_MS + 1500)
  }
  const disarm = () => {
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', arm)
  }
  arm()
  document.addEventListener('visibilitychange', arm)
  handle.done.then(disarm, disarm)

  return handle.done
}

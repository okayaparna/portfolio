import { startPetals3D } from './petals3d.js'
import { mountNav, minimizePods, restorePods } from './nav.js'
import { createDrawer, openDrawer, closeDrawer } from './drawer.js'
import { createAbout, openAbout, closeAbout } from './about.js'
import { initCursorAndTrail } from './cursor-trail.js'
import { pageSignal, onCleanup } from './page-lifecycle.js'

export function initPage() {
  const signal = pageSignal()

  // AKR logo — prevent reload, close drawer if open
  const akrLink = document.querySelector('.mark__initials')
  if (akrLink) {
    akrLink.addEventListener('click', (e) => {
      e.preventDefault()
      handleClose()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, { signal })
  }

  // Petal field — real WebGL 3D scene
  const petalContainer = document.getElementById('petals')
  if (petalContainer) {
    const petals = startPetals3D(petalContainer)
    // Without this the rAF loop and WebGL context outlive the page.
    onCleanup(() => petals?.dispose?.())
  }

  // Frosted nav menu (single trigger + dropdown column)
  mountNav(document.getElementById('nav-mount'))

  // Slide the console up into place on load — skipped when arriving via #work,
  // where the pods immediately minimize to the top bar instead.
  if (window.location.hash !== '#work') {
    document.querySelector('.cluster')?.classList.add('cluster--intro')
  }

  createDrawer()
  createAbout()

  function setSecondaryVisibility(hidden) {
    const els = [document.querySelector('.mark__bio'), document.querySelector('.timestamp')]
    els.forEach(el => { if (el) el.style.opacity = hidden ? '0' : '' })
  }

  function handleClose() {
    closeDrawer()
    closeAbout()
    restorePods()
    setSecondaryVisibility(false)
  }

  document.addEventListener('click', (e) => {
    const workPod = e.target.closest('[data-action="work"]')
    if (workPod) {
      e.preventDefault()
      setSecondaryVisibility(true)
      minimizePods()
      openDrawer(handleClose)
      return
    }

    const aboutPod = e.target.closest('[data-action="about"]')
    if (aboutPod) {
      e.preventDefault()
      setSecondaryVisibility(true)
      minimizePods()
      openAbout(handleClose)
    }
  }, { signal })

  // Auto-open work drawer if arriving via #work (e.g. closing a project page)
  if (window.location.hash === '#work') {
    history.replaceState(null, '', window.location.pathname)
    const t = setTimeout(() => {
      setSecondaryVisibility(true)
      minimizePods()
      openDrawer(handleClose)
    }, 100)
    onCleanup(() => clearTimeout(t))
  }

  initBarcodeGlitch(signal)
  initCursorAndTrail(signal)
  initPodTooltips(signal)
}

// Barcode hover — glitchy scramble transition
function initBarcodeGlitch(signal) {
  const timestamp = document.querySelector('.timestamp')
  if (!timestamp) return
  const defaultText = timestamp.dataset.default || '2026'
  const hoverText = timestamp.dataset.hover || 'NYC'
  const GLYPHS = '>*}|_:;$▓░▒█╗╔═«»§±†‡¤◊∆∑Ω0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  const STEPS = 8
  const INTERVAL = 45
  let timer = null

  function randGlyph() { return GLYPHS[Math.floor(Math.random() * GLYPHS.length)] }

  function scrambleTo(target) {
    if (timer) clearInterval(timer)
    let step = 0
    const padded = target.padStart(4).split('')
    timer = setInterval(() => {
      step++
      let out = ''
      for (let i = 0; i < padded.length; i++) {
        // Each character "locks in" at a staggered step
        if (step > STEPS - padded.length + i) {
          out += padded[i]
        } else {
          out += randGlyph()
        }
      }
      timestamp.textContent = out
      if (step >= STEPS) {
        clearInterval(timer)
        timer = null
        timestamp.textContent = target
      }
    }, INTERVAL)
  }

  timestamp.addEventListener('mouseenter', () => scrambleTo(hoverText), { signal })
  timestamp.addEventListener('mouseleave', () => scrambleTo(defaultText), { signal })
  onCleanup(() => { if (timer) clearInterval(timer) })
}

// Pod hover tooltips — follow cursor
function initPodTooltips(signal) {
  const tooltip = document.createElement('div')
  tooltip.className = 'pod-tooltip'
  document.body.appendChild(tooltip)
  onCleanup(() => tooltip.remove())

  const labelMap = {
    'pod--left': 'Contact',
    'pod--center': 'Work',
    'pod--right': 'About',
  }

  document.addEventListener('mouseover', (e) => {
    const pod = e.target.closest('.pod')
    if (!pod) {
      tooltip.classList.remove('is-visible')
      return
    }
    const key = Object.keys(labelMap).find(c => pod.classList.contains(c))
    if (key) {
      tooltip.textContent = labelMap[key]
      tooltip.classList.add('is-visible')
    }
  }, { signal })

  document.addEventListener('mouseout', (e) => {
    const pod = e.target.closest('.pod')
    if (pod && !pod.contains(e.relatedTarget)) {
      tooltip.classList.remove('is-visible')
    }
    if (!e.target.closest('.pod') && !e.relatedTarget?.closest('.pod')) {
      tooltip.classList.remove('is-visible')
    }
  }, { signal })

  document.addEventListener('mousemove', (e) => {
    if (tooltip.classList.contains('is-visible')) {
      tooltip.style.left = e.clientX + 'px'
      tooltip.style.top = e.clientY + 'px'
    }
  }, { signal })
}

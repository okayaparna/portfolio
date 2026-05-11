import './style.css'
import './blob.css'
import { startPetals3D } from './petals3d.js'
import { mountControls } from './controls.js'
import { mountNav, minimizePods, restorePods } from './nav.js'
import { createDrawer, openDrawer, closeDrawer } from './drawer.js'

// Viewport edge blur overlays — progressive glass + chromatic aberration
;(function initEdgeBlur() {
  // SVG filter for chromatic aberration (color channel displacement)
  const svgNS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNS, 'svg')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.style.position = 'absolute'
  svg.innerHTML = `
    <defs>
      <filter id="chromatic-aberration" x="-10%" y="-10%" width="120%" height="120%">
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red"/>
        <feOffset in="red" dx="3" dy="0" result="red-shifted"/>
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green"/>
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue"/>
        <feOffset in="blue" dx="-3" dy="0" result="blue-shifted"/>
        <feBlend in="red-shifted" in2="green" mode="screen" result="rg"/>
        <feBlend in="rg" in2="blue-shifted" mode="screen"/>
      </filter>
    </defs>
  `
  document.body.appendChild(svg)

  const LAYERS = 8

  function createBlurStrip(position) {
    const strip = document.createElement('div')
    strip.className = `edge-blur edge-blur--${position}`

    for (let i = 0; i < LAYERS; i++) {
      const layer = document.createElement('div')
      layer.className = 'edge-blur__layer'

      // Stronger progressive blur: 0.5px → 24px
      const blur = 0.5 * Math.pow(2, i * 0.75)
      // Each layer covers a portion of the strip with overlap
      const bandStart = (i / LAYERS) * 100
      const bandEnd = ((i + 2) / LAYERS) * 100

      layer.style.backdropFilter = `blur(${blur}px)`
      layer.style.webkitBackdropFilter = `blur(${blur}px)`

      const grad = position === 'top'
        ? `linear-gradient(to bottom, black ${bandStart}%, transparent ${Math.min(bandEnd, 100)}%)`
        : `linear-gradient(to top, black ${bandStart}%, transparent ${Math.min(bandEnd, 100)}%)`

      layer.style.maskImage = grad
      layer.style.webkitMaskImage = grad
      strip.appendChild(layer)
    }

    // Chromatic aberration overlay
    const aberration = document.createElement('div')
    aberration.className = 'edge-blur__aberration'
    const abMask = position === 'top'
      ? 'linear-gradient(to bottom, black 0%, transparent 80%)'
      : 'linear-gradient(to top, black 0%, transparent 80%)'
    aberration.style.maskImage = abMask
    aberration.style.webkitMaskImage = abMask
    aberration.style.backdropFilter = 'blur(6px)'
    aberration.style.webkitBackdropFilter = 'blur(6px)'
    strip.appendChild(aberration)

    // Frosted glass overlay
    const frost = document.createElement('div')
    frost.className = 'edge-blur__frost'
    strip.appendChild(frost)

    document.body.appendChild(strip)
  }

  createBlurStrip('top')
  createBlurStrip('bottom')
})()

// Petal field — real WebGL 3D scene
const petalContainer = document.getElementById('petals')
if (petalContainer) {
  const petalCtrl = startPetals3D(petalContainer, { count: 95 })
  mountControls(petalCtrl)
}

// Frosted nav menu (single trigger + dropdown column)
mountNav(document.getElementById('nav-mount'))

// Drawer setup
createDrawer()

function setOverlayVisibility(hidden) {
  const els = [document.querySelector('.cp'), document.querySelector('.mark'), document.querySelector('.timestamp')]
  els.forEach(el => { if (el) el.style.display = hidden ? 'none' : '' })
}

function handleClose() {
  closeDrawer()
  restorePods()
  setOverlayVisibility(false)
}

document.addEventListener('click', (e) => {
  const workPod = e.target.closest('[data-action="work"]')
  if (workPod) {
    e.preventDefault()
    setOverlayVisibility(true)
    minimizePods()
    openDrawer(handleClose)
  }
})

// Neon green custom cursor + glitchy character trail
;(function initCursorAndTrail() {
  const COLOR = '#D3FF41'
  const TRAIL_LENGTH = 25
  const GRID = 18
  const GLYPHS = '>*}|_:;$▓░▒█╗╔═«»§±†‡¤◊∆∑Ω'.split('')
  const SCRAMBLE_FRAMES = 4
  const SCRAMBLE_INTERVAL = 50

  const cursorSvg = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='24' viewBox='0 0 20 24'><polygon points='2,2 2,22 18,14' fill='%23D3FF41'/></svg>") 2 2, auto`
  document.documentElement.style.cursor = cursorSvg

  const cursorStyle = document.createElement('style')
  cursorStyle.textContent = `*, a, button, .pod { cursor: ${cursorSvg} !important; }`
  document.head.appendChild(cursorStyle)

  function randGlyph() { return GLYPHS[Math.floor(Math.random() * GLYPHS.length)] }

  const chars = []
  for (let i = 0; i < TRAIL_LENGTH; i++) {
    const el = document.createElement('span')
    el.style.cssText = `
      position: fixed; top: -40px; left: -40px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      font-weight: bold;
      color: ${COLOR};
      pointer-events: none;
      z-index: 9998;
      opacity: 0;
      text-shadow: 0 0 4px ${COLOR}44;
      will-change: opacity;
    `
    el.textContent = randGlyph()
    document.body.appendChild(el)
    chars.push({ el, life: 0, scrambleCount: 0, scrambleTimer: null })
  }

  let idx = 0
  let lastSnapX = -1, lastSnapY = -1

  function snap(v) { return Math.round(v / GRID) * GRID }

  document.addEventListener('mousemove', (e) => {
    const sx = snap(e.clientX)
    const sy = snap(e.clientY)
    if (sx === lastSnapX && sy === lastSnapY) return
    lastSnapX = sx
    lastSnapY = sy

    const c = chars[idx % TRAIL_LENGTH]
    idx++
    c.life = 1.0
    c.scrambleCount = 0
    c.el.style.left = sx + 'px'
    c.el.style.top = sy + 'px'
    c.el.style.opacity = '1'
    c.el.textContent = randGlyph()

    if (c.scrambleTimer) clearInterval(c.scrambleTimer)
    c.scrambleTimer = setInterval(() => {
      c.scrambleCount++
      c.el.textContent = randGlyph()
      if (c.scrambleCount >= SCRAMBLE_FRAMES) {
        clearInterval(c.scrambleTimer)
        c.scrambleTimer = null
      }
    }, SCRAMBLE_INTERVAL)
  })

  function tick() {
    for (const c of chars) {
      if (c.life <= 0) continue
      c.life -= 0.025
      if (c.life <= 0) {
        c.el.style.opacity = '0'
      } else {
        c.el.style.opacity = String(c.life)
      }
    }
    requestAnimationFrame(tick)
  }
  tick()
})()

// Pod hover tooltips — follow cursor
;(function initPodTooltips() {
  const tooltip = document.createElement('div')
  tooltip.className = 'pod-tooltip'
  document.body.appendChild(tooltip)

  const labelMap = {
    'pod--top': 'Contact',
    'pod--left': 'Experiments',
    'pod--right': 'Work',
    'pod--bottom': 'About',
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
  })

  document.addEventListener('mouseout', (e) => {
    const pod = e.target.closest('.pod')
    if (pod && !pod.contains(e.relatedTarget)) {
      tooltip.classList.remove('is-visible')
    }
    if (!e.target.closest('.pod') && !e.relatedTarget?.closest('.pod')) {
      tooltip.classList.remove('is-visible')
    }
  })

  document.addEventListener('mousemove', (e) => {
    if (tooltip.classList.contains('is-visible')) {
      tooltip.style.left = e.clientX + 'px'
      tooltip.style.top = e.clientY + 'px'
    }
  })
})()

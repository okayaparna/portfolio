import './project.css'
import { glyphs } from './glyphs.js'
import { mountModalWidget } from './modal-widget.js'

mountModalWidget()

// Smooth exit transition when navigating away
;(function initExitTransition() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]')
    if (!link) return
    const href = link.getAttribute('href')
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('http')) return
    e.preventDefault()
    document.body.classList.add('is-leaving')
    setTimeout(() => { window.location.href = href }, 300)
  })
})()

// Close button (X) — top-right, like the drawer close
;(function initCloseButton() {
  const nav = document.querySelector('.project-nav')
  if (!nav) return
  const close = document.createElement('button')
  close.className = 'project-nav__close'
  close.setAttribute('aria-label', 'Close project')
  close.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`
  close.addEventListener('click', () => {
    document.body.classList.add('is-leaving')
    setTimeout(() => { window.location.href = 'index.html#work' }, 300)
  })
  nav.appendChild(close)
})()

// Replace text nav with pod-based nav
;(function initProjectNav() {
  const nav = document.querySelector('.project-nav')
  if (!nav) return

  const links = nav.querySelector('.project-nav__links')
  if (links) {
    links.remove()
    const pods = document.createElement('div')
    pods.className = 'project-nav__pods'
    pods.innerHTML = `
      <a class="project-pod" href="mailto:aparnakrishnan81@gmail.com" aria-label="Contact"><span class="pod__icon">${glyphs.infoI}</span></a>
      <a class="project-pod" href="index.html#work" aria-label="Work"><span class="pod__icon">${glyphs.dots3}</span></a>
      <a class="project-pod" href="projects.html#archive" aria-label="Experiments"><span class="pod__icon">${glyphs.flower4}</span></a>
      <a class="project-pod" href="info.html" aria-label="About"><span class="pod__icon">${glyphs.plusFlower}</span></a>
    `
    nav.appendChild(pods)
  }
})()

// Pod hover tooltips — follow cursor (matching landing page behavior)
;(function initPodTooltips() {
  const tooltip = document.createElement('div')
  tooltip.className = 'pod-tooltip'
  document.body.appendChild(tooltip)

  const labelMap = {
    0: 'Contact',
    1: 'Work',
    2: 'Experiments',
    3: 'About',
  }

  document.addEventListener('mouseover', (e) => {
    const pod = e.target.closest('.project-pod')
    if (!pod) {
      tooltip.classList.remove('is-visible')
      return
    }
    const pods = Array.from(document.querySelectorAll('.project-pod'))
    const idx = pods.indexOf(pod)
    if (idx >= 0 && labelMap[idx]) {
      tooltip.textContent = labelMap[idx]
      tooltip.classList.add('is-visible')
    }
  })

  document.addEventListener('mouseout', (e) => {
    const pod = e.target.closest('.project-pod')
    if (pod && !pod.contains(e.relatedTarget)) {
      tooltip.classList.remove('is-visible')
    }
    if (!e.target.closest('.project-pod') && !e.relatedTarget?.closest('.project-pod')) {
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

// Scroll-in animation for elements with opacity/transform transitions
;(function initScrollReveal() {
  const els = document.querySelectorAll('.twingate-question')
  if (!els.length) return
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible')
        io.unobserve(entry.target)
      }
    }
  }, { threshold: 0.15 })
  els.forEach((el) => io.observe(el))
})()

// Neon green custom cursor + glitchy character trail (shared with landing)
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
  cursorStyle.textContent = `*, a, button { cursor: ${cursorSvg} !important; }`
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
      c.life -= 0.012
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

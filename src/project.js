import './project.css'
import { glyphs } from './glyphs.js'
import { mountModalWidget } from './modal-widget.js'

mountModalWidget()

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
      <a class="project-pod" href="index.html" aria-label="Info">${glyphs.infoI}</a>
      <a class="project-pod" href="projects.html#archive" aria-label="Experiments">${glyphs.flower4}</a>
      <a class="project-pod" href="projects.html" aria-label="Projects">${glyphs.dots3}</a>
      <a class="project-pod" href="info.html" aria-label="About">${glyphs.plusFlower}</a>
    `
    nav.appendChild(pods)
  }
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

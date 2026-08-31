import { glyphs } from './glyphs.js'
import { mountModalWidget } from './modal-widget.js'
import { navigate } from './router.js'
import { initCursorAndTrail } from './cursor-trail.js'
import { pageSignal, onCleanup } from './page-lifecycle.js'

export function initPage() {
  const signal = pageSignal()

  mountModalWidget()
  initCloseButton()
  initProjectNav()
  initPodTooltips(signal)
  initScrollReveal()
  initCursorAndTrail(signal)
}

// Close button (X) — top-right, like the drawer close
function initCloseButton() {
  const nav = document.querySelector('.project-nav')
  if (!nav) return
  const close = document.createElement('button')
  close.className = 'project-nav__close'
  close.setAttribute('aria-label', 'Close project')
  close.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`
  close.addEventListener('click', () => navigate('index.html#work'))
  nav.appendChild(close)
}

// Replace text nav with pod-based nav
function initProjectNav() {
  const nav = document.querySelector('.project-nav')
  if (!nav) return

  const links = nav.querySelector('.project-nav__links')
  if (links) {
    links.remove()
    const pods = document.createElement('div')
    pods.className = 'project-nav__pods'
    pods.innerHTML = `
      <a class="project-pod" href="mailto:aparnakrishnan81@gmail.com" aria-label="Contact"><span class="pod__icon">${glyphs.triangle}</span></a>
      <a class="project-pod" href="index.html#work" aria-label="Work"><span class="pod__icon">${glyphs.square}</span></a>
      <a class="project-pod" href="info.html" aria-label="About"><span class="pod__icon">${glyphs.circle}</span></a>
    `
    nav.appendChild(pods)
  }
}

// Pod hover tooltips — follow cursor (matching landing page behavior)
function initPodTooltips(signal) {
  const tooltip = document.createElement('div')
  tooltip.className = 'pod-tooltip'
  document.body.appendChild(tooltip)
  onCleanup(() => tooltip.remove())

  const labelMap = {
    0: 'Contact',
    1: 'Work',
    2: 'About',
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
  }, { signal })

  document.addEventListener('mouseout', (e) => {
    const pod = e.target.closest('.project-pod')
    if (pod && !pod.contains(e.relatedTarget)) {
      tooltip.classList.remove('is-visible')
    }
    if (!e.target.closest('.project-pod') && !e.relatedTarget?.closest('.project-pod')) {
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

// Scroll-in animation for elements with opacity/transform transitions
function initScrollReveal() {
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
  onCleanup(() => io.disconnect())
}


import { glyphs } from './glyphs.js'

let clusterEl = null

export function mountNav(host) {
  if (!host) return

  host.innerHTML = `
    <nav class="cluster" aria-label="Primary">
      <a class="pod pod--top"   href="mailto:aparnakrishnan81@gmail.com" aria-label="Contact">
        <span class="pod__icon">${glyphs.dots3}</span>
      </a>
      <a class="pod pod--left"  href="projects.html#archive"  aria-label="Experiments">
        <span class="pod__icon">${glyphs.flower4}</span>
      </a>
      <span class="pod pod--right" data-action="work" aria-label="Work" role="button" tabindex="0">
        <span class="pod__icon">${glyphs.infoI}</span>
      </span>
      <span class="pod pod--bottom" data-action="about" role="button" tabindex="0">
        <span class="pod__icon">${glyphs.plusFlower}</span>
      </span>

      <span class="cluster__stem" aria-hidden="true"></span>
      <span class="cluster__bud"  aria-hidden="true">
        <span class="pod__icon">${glyphs.cross}</span>
      </span>
    </nav>
  `

  clusterEl = host.querySelector('.cluster')
}

function getPodRect(pod) {
  const r = pod.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }
}

function getMinimizedTargets() {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const isMobile = vw <= 600
  const podW = isMobile ? 60 : 70
  const podH = isMobile ? 74 : 86
  const gap = isMobile ? 10 : 14
  const totalW = podW * 4 + gap * 3
  const startX = (vw - totalW) / 2
  const y = isMobile ? (vh - 20 - podH / 2) : (37 + podH / 2)

  return [0, 1, 2, 3].map(i => ({
    x: startX + i * (podW + gap) + podW / 2,
    y,
    w: podW,
    h: podH,
  }))
}

function arcKeyframes(from, to, clockwise = true) {
  const cx = (from.x + to.x) / 2
  const cy = (from.y + to.y) / 2
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const bulge = dist * 0.3 * (clockwise ? 1 : -1)

  const nx = -dy / (dist || 1)
  const ny = dx / (dist || 1)

  const midX = cx + nx * bulge
  const midY = cy + ny * bulge
  const midW = (from.w + to.w) / 2
  const midH = (from.h + to.h) / 2

  return [
    { left: (from.x - from.w / 2) + 'px', top: (from.y - from.h / 2) + 'px', width: from.w + 'px', height: from.h + 'px' },
    { left: (midX - midW / 2) + 'px', top: (midY - midH / 2) + 'px', width: midW + 'px', height: midH + 'px' },
    { left: (to.x - to.w / 2) + 'px', top: (to.y - to.h / 2) + 'px', width: to.w + 'px', height: to.h + 'px' },
  ]
}

export function minimizePods() {
  if (!clusterEl) return Promise.resolve()

  const stem = clusterEl.querySelector('.cluster__stem')
  const bud = clusterEl.querySelector('.cluster__bud')

  if (stem) stem.style.opacity = '0'
  if (bud) bud.style.opacity = '0'

  const targets = getMinimizedTargets()

  // Work pod leads, then anticlockwise: Right(Work) → Top → Left → Bottom
  const clockwise = [
    clusterEl.querySelector('.pod--right'),
    clusterEl.querySelector('.pod--top'),
    clusterEl.querySelector('.pod--left'),
    clusterEl.querySelector('.pod--bottom'),
  ]

  const fromRects = clockwise.map(p => p ? getPodRect(p) : null)

  clockwise.forEach(pod => {
    if (!pod) return
    document.body.appendChild(pod)
  })

  const STAGGER = 100
  const DURATION = 500

  const animations = clockwise.map((pod, i) => {
    if (!pod || !fromRects[i]) return null
    const from = fromRects[i]
    const to = targets[i]
    const kf = arcKeyframes(from, to, false)

    pod.style.position = 'fixed'
    pod.style.margin = '0'
    pod.style.transform = 'none'
    pod.style.zIndex = '300'

    return pod.animate(kf, {
      duration: DURATION,
      delay: i * STAGGER,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards',
    })
  }).filter(Boolean)

  clusterEl.classList.add('is-minimized')

  return Promise.all(animations.map(a => a.finished)).then(() => {
    clockwise.forEach((pod, i) => {
      if (!pod) return
      const t = targets[i]
      pod.style.left = (t.x - t.w / 2) + 'px'
      pod.style.top = (t.y - t.h / 2) + 'px'
      pod.style.width = t.w + 'px'
      pod.style.height = t.h + 'px'
      pod.style.borderRadius = '35px'
      pod.getAnimations().forEach(a => a.cancel())
    })
  })
}

export function restorePods() {
  if (!clusterEl) return Promise.resolve()

  // Reverse: Bottom → Left → Top → Right(Work) (last one home is the leader)
  const reverseOrder = [
    document.querySelector('.pod--bottom'),
    document.querySelector('.pod--left'),
    document.querySelector('.pod--top'),
    document.querySelector('.pod--right'),
  ]

  const stem = clusterEl.querySelector('.cluster__stem')
  const bud = clusterEl.querySelector('.cluster__bud')

  const currentPositions = reverseOrder.map(p => p ? getPodRect(p) : null)

  const insertBefore = clusterEl.querySelector('.cluster__stem')

  reverseOrder.forEach(pod => {
    if (!pod) return
    clusterEl.insertBefore(pod, insertBefore)
    pod.style.position = ''
    pod.style.left = ''
    pod.style.top = ''
    pod.style.width = ''
    pod.style.height = ''
    pod.style.margin = ''
    pod.style.transform = ''
    pod.style.borderRadius = ''
    pod.style.zIndex = ''
  })

  clusterEl.classList.remove('is-minimized')
  void clusterEl.offsetHeight

  const diamondPositions = reverseOrder.map(p => p ? getPodRect(p) : null)

  reverseOrder.forEach(pod => {
    if (!pod) return
    document.body.appendChild(pod)
  })

  const STAGGER = 100
  const DURATION = 500

  const animations = reverseOrder.map((pod, i) => {
    if (!pod || !currentPositions[i] || !diamondPositions[i]) return null
    const from = currentPositions[i]
    const to = diamondPositions[i]
    const kf = arcKeyframes(from, to, false)

    pod.style.position = 'fixed'
    pod.style.transform = 'none'
    pod.style.zIndex = '300'

    return pod.animate(kf, {
      duration: DURATION,
      delay: i * STAGGER,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards',
    })
  }).filter(Boolean)

  return Promise.all(animations.map(a => a.finished)).then(() => {
    const ref = clusterEl.querySelector('.cluster__stem')
    reverseOrder.forEach(pod => {
      if (!pod) return
      clusterEl.insertBefore(pod, ref)
      pod.style.position = ''
      pod.style.left = ''
      pod.style.top = ''
      pod.style.width = ''
      pod.style.height = ''
      pod.style.margin = ''
      pod.style.transform = ''
      pod.style.borderRadius = ''
      pod.style.zIndex = ''
      pod.getAnimations().forEach(a => a.cancel())
    })
    if (stem) stem.style.opacity = ''
    if (bud) bud.style.opacity = ''
  })
}

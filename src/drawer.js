const PROJECTS = [
  { title: 'Wired Rebrand', href: '/wired_rebrand.html' },
  { title: 'Candor', href: '/candor.html' },
  { title: 'Twingate', href: '/twingate.html' },
  { title: 'TNS Commencement 2025', href: '/tns-commencement-2025.html' },
  { title: 'Parsons Benefit 2024', href: '/parsons-benefit-2024.html' },
  { title: 'Disciple', href: '/disciple.html' },
  { title: 'Gundi Studios', href: '/gundi-studios.html' },
  { title: 'Playground', href: '/playground.html' },
]

let drawerEl = null
let gooWrap = null
let isOpen = false

export function createDrawer() {
  // Goo wrapper applies SVG filter during animation
  gooWrap = document.createElement('div')
  gooWrap.className = 'drawer-goo-wrap'

  const el = document.createElement('div')
  el.className = 'drawer'

  const close = document.createElement('button')
  close.className = 'drawer__close'
  close.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`
  close.setAttribute('aria-label', 'Close')

  const scroller = document.createElement('div')
  scroller.className = 'drawer__scroll'

  const grid = document.createElement('div')
  grid.className = 'drawer__grid'

  for (const project of PROJECTS) {
    const card = document.createElement('a')
    card.className = 'drawer__card'
    card.href = project.href

    const img = document.createElement('div')
    img.className = 'drawer__card-image'

    const title = document.createElement('div')
    title.className = 'drawer__card-title'
    title.textContent = project.title

    card.appendChild(img)
    card.appendChild(title)
    grid.appendChild(card)
  }

  const scrollTop = document.createElement('button')
  scrollTop.className = 'drawer__scroll-top'
  scrollTop.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`
  scrollTop.setAttribute('aria-label', 'Scroll to top')
  scrollTop.addEventListener('click', () => {
    scroller.scrollTo({ top: 0, behavior: 'smooth' })
  })

  scroller.addEventListener('scroll', () => {
    scrollTop.classList.toggle('is-visible', scroller.scrollTop > 200)
  })

  scroller.appendChild(grid)
  el.appendChild(scroller)
  el.appendChild(close)
  el.appendChild(scrollTop)

  gooWrap.appendChild(el)
  drawerEl = el
  document.body.appendChild(gooWrap)
  return el
}

export function openDrawer(onCloseCallback) {
  if (!drawerEl) createDrawer()
  if (isOpen) return

  const close = drawerEl.querySelector('.drawer__close')
  close.onclick = () => {
    if (onCloseCallback) onCloseCallback()
  }

  // Get Work pod position for origin
  const pod = document.querySelector('.pod--right')
  if (pod) {
    const r = pod.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    drawerEl.style.transformOrigin = `${cx}px ${cy}px`
  }

  // Apply goo filter during opening animation
  gooWrap.classList.add('is-gooing')

  requestAnimationFrame(() => {
    drawerEl.classList.add('is-open')
    isOpen = true
  })

  // Remove goo filter after animation completes (it causes text blur)
  setTimeout(() => {
    gooWrap.classList.remove('is-gooing')
  }, 700)
}

export function closeDrawer() {
  if (!drawerEl || !isOpen) return

  gooWrap.classList.add('is-gooing')

  return new Promise((resolve) => {
    drawerEl.classList.remove('is-open')
    isOpen = false
    setTimeout(() => {
      gooWrap.classList.remove('is-gooing')
      resolve()
    }, 600)
  })
}

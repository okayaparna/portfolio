const PROJECTS = [
  { title: 'Align with Ash', meta: ['Ash by Slingshot AI', 'Spring 2026'], desc: 'Asynchronous couples therapy assisted by Ash for couples on the go.', href: '/candor.html' },
  { title: 'Phia Rewards', meta: ['Phia', 'Fall 2025'], desc: 'Asynchronous couples therapy assisted by Ash for couples on the go.', href: '/playground.html' },
  { title: 'Disciple', meta: ['Parsons School of Design', 'Independent', 'Spring 2025'], desc: 'An immersive gaming experience that dives into afterlife from a Buddhist lens', href: '/disciple.html' },
  { title: 'The New School Commencement 2025', meta: ['The New School', 'Fall 2025'], desc: "Celebrating Unity through Intersectionality at The New School's 89th Commencement", href: '/tns-commencement-2025.html' },
  { title: 'The 75th Parsons Benefit', meta: ['The New School', 'Spring 2024'], desc: "Celebrating the legacy of fashion and design at Parsons School of Design's annual benefit", href: '/parsons-benefit-2024.html' },
  { title: 'WIRED Magazine Rebrand', meta: ['Parsons School of Design', 'Independent', 'Spring 2024'], desc: "Reimagining an Iconic Tech Magazine's branding to be at par with their mission", href: '/wired_rebrand.html' },
  { title: 'Twingate', meta: ['Twingate', 'Summer 2024'], desc: 'Designing for prioritizing Information Hierarchy and Reducing navigational Friction for an enterprise product', href: '/twingate.html' },
  { title: 'Gundi Studios', meta: ['GUNDI STUDIOS', 'Spring 2024'], desc: "Adding \"oomph\" to an incredible South Asian Couture brand's digital presence.", href: '/gundi-studios.html' },
]

let drawerEl = null
let gooWrap = null
let isOpen = false

export function createDrawer() {
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

    const meta = document.createElement('div')
    meta.className = 'drawer__card-meta'
    meta.innerHTML = project.meta.join(' <span class="drawer__card-dot">•</span> ')

    const title = document.createElement('div')
    title.className = 'drawer__card-title'
    title.textContent = project.title

    const desc = document.createElement('div')
    desc.className = 'drawer__card-desc'
    desc.textContent = project.desc

    card.appendChild(img)
    card.appendChild(meta)
    card.appendChild(title)
    card.appendChild(desc)
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

  const pod = document.querySelector('.pod--right')
  if (pod) {
    const r = pod.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    drawerEl.style.transformOrigin = `${cx}px ${cy}px`
  }

  gooWrap.classList.add('is-gooing')

  requestAnimationFrame(() => {
    drawerEl.classList.add('is-open')
    isOpen = true
  })

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

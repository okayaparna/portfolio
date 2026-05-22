const PROJECTS = [
  { title: 'Align with Ash', meta: ['Ash by Slingshot AI', 'Spring 2026'], desc: 'Asynchronous couples therapy assisted by Ash for couples on the go.', href: 'align-with-ash.html', thumbnail: '/images/align-with-ash/thumbnail.png', comingSoon: 'Sneak peek?' },
  { title: 'Phia Rewards', meta: ['Phia', 'Fall 2025'], desc: 'Reimagining rewards as access, impact, and experiences with Phia.', href: 'phia-rewards.html', thumbnail: '/images/phia-rewards/hero.png', comingSoon: 'Coming soon' },
  { title: 'Ash Configurations', meta: ['Ash by Slingshot AI', 'Spring 2026'], desc: 'Allowing users to personalize their therapy agent as a visual experience first.', href: 'ash-configurations.html', comingSoon: 'Sneak peek?' },
  { title: 'Disciple', meta: ['Parsons School of Design', 'Independent', 'Spring 2025'], desc: 'An immersive gaming experience that dives into afterlife from a Buddhist lens', href: 'disciple.html', thumbnail: '/images/disciple/thumbnail.png' },
  { title: 'WIRED Magazine Rebrand', meta: ['Parsons School of Design', 'Independent', 'Spring 2024'], desc: "Reimagining an Iconic Tech Magazine's branding to be at par with their mission", href: 'wired-rebrand.html', thumbnail: '/images/wired/thumbnail.jpg' },
  { title: 'Twingate', meta: ['Twingate', 'Summer 2024'], desc: 'Designing for prioritizing Information Hierarchy and Reducing navigational Friction for an enterprise product', href: 'twingate.html' },
  { title: 'Gundi Studios', meta: ['GUNDI STUDIOS', 'Spring 2024'], desc: "Adding \"oomph\" to an incredible South Asian Couture brand's digital presence.", href: 'gundi-studios.html', thumbnail: '/images/gundi/thumbnail.png' },
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

  const col1 = document.createElement('div')
  const col2 = document.createElement('div')
  col1.className = 'drawer__column'
  col2.className = 'drawer__column'
  grid.appendChild(col1)
  grid.appendChild(col2)

  const cards = []

  for (const project of PROJECTS) {
    const card = document.createElement(project.comingSoon ? 'div' : 'a')
    card.className = 'drawer__card'
    if (project.comingSoon) {
      card.classList.add('drawer__card--coming-soon')
    } else {
      card.href = project.href
    }

    const img = document.createElement('div')
    img.className = 'drawer__card-image'
    if (project.thumbnail) {
      const base = import.meta.env.BASE_URL.replace(/\/$/, '')
      const imgEl = document.createElement('img')
      imgEl.src = `${base}${project.thumbnail}`
      imgEl.alt = project.title
      img.appendChild(imgEl)
    }

    if (project.comingSoon) {
      card.dataset.cursorTag = project.comingSoon
    }

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
    cards.push(card)
  }

  function layoutMasonry() {
    col1.innerHTML = ''
    col2.innerHTML = ''
    let h1 = 0, h2 = 0
    for (const card of cards) {
      if (h1 <= h2) {
        col1.appendChild(card)
        h1 += card.offsetHeight + 20
      } else {
        col2.appendChild(card)
        h2 += card.offsetHeight + 20
      }
    }
  }

  cards.forEach((card, i) => {
    if (i % 2 === 0) col1.appendChild(card)
    else col2.appendChild(card)
  })

  const images = grid.querySelectorAll('.drawer__card-image img')
  if (images.length === 0) {
    requestAnimationFrame(layoutMasonry)
  } else {
    let loaded = 0
    const onLoad = () => {
      loaded++
      if (loaded === images.length) requestAnimationFrame(layoutMasonry)
    }
    images.forEach(img => {
      if (img.complete) onLoad()
      else {
        img.addEventListener('load', onLoad)
        img.addEventListener('error', onLoad)
      }
    })
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

  // Cursor-following tag for coming-soon cards
  const cursorTag = document.createElement('div')
  cursorTag.className = 'drawer__cursor-tag'
  el.appendChild(cursorTag)

  el.addEventListener('mouseover', (e) => {
    const card = e.target.closest('.drawer__card--coming-soon')
    if (!card) {
      cursorTag.classList.remove('is-visible')
      return
    }
    cursorTag.textContent = card.dataset.cursorTag || ''
    cursorTag.classList.add('is-visible')
  })

  el.addEventListener('mouseout', (e) => {
    const card = e.target.closest('.drawer__card--coming-soon')
    if (card && !card.contains(e.relatedTarget)) {
      cursorTag.classList.remove('is-visible')
    }
    if (!e.target.closest('.drawer__card--coming-soon') && !e.relatedTarget?.closest('.drawer__card--coming-soon')) {
      cursorTag.classList.remove('is-visible')
    }
  })

  el.addEventListener('mousemove', (e) => {
    if (cursorTag.classList.contains('is-visible')) {
      cursorTag.style.left = e.clientX + 'px'
      cursorTag.style.top = e.clientY + 'px'
    }
  })

  drawerEl = el
  document.body.appendChild(el)
  return el
}

export function openDrawer(onCloseCallback) {
  if (!drawerEl) createDrawer()
  if (isOpen) return

  const close = drawerEl.querySelector('.drawer__close')
  close.onclick = () => {
    if (onCloseCallback) onCloseCallback()
  }

  requestAnimationFrame(() => {
    drawerEl.classList.add('is-open')
    isOpen = true
  })
}

export function closeDrawer() {
  if (!drawerEl || !isOpen) return

  return new Promise((resolve) => {
    drawerEl.classList.remove('is-open')
    isOpen = false
    setTimeout(() => {
      resolve()
    }, 600)
  })
}

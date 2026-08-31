import { createBlob } from './blob.js'
import { glyphs } from './glyphs.js'
import { onCleanup } from './page-lifecycle.js'

// Staggered scroll composition — alternates left/right with varying sizes.
// `xPct` is the LEFT edge of each blob as % of the projects field.
// `y` is absolute top in px.
const projects = []

export function initPage() {
  // Mini-nav glyphs. These were an inline <script> in projects.html, which the
  // router can't run: scripts inserted via innerHTML never execute.
  const set = (id, svg) => { const el = document.getElementById(id); if (el) el.innerHTML = svg }
  set('mini-cross',    glyphs.cross)
  set('mini-home',     glyphs.bud)
  set('mini-info',     glyphs.infoI)
  set('mini-projects', glyphs.dots3)
  set('mini-plus',     glyphs.plusFlower)

  const field = document.getElementById('field')

  const items = projects.map((p, i) => {
    const item = document.createElement('div')
    item.className = 'projects__item'
    item.style.left = `${p.xPct}%`
    item.style.top  = `${p.y}px`

    item.appendChild(createBlob({
      href: `#${p.title.toLowerCase().replace(/\s+/g, '-')}`,
      image: p.image,
      label: p.title,
      width: p.w,
      height: p.h,
      variant: 'project',
      delay: i * 0.7,
    }))

    field.appendChild(item)
    return item
  })

  // Scroll-in animation
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in')
        io.unobserve(entry.target)
      }
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 })

  items.forEach((el) => io.observe(el))

  // The observer holds refs to swapped-out nodes otherwise.
  onCleanup(() => io.disconnect())
}

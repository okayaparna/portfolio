import './style.css'
import './blob.css'
import { createBlob } from './blob.js'

// Staggered scroll composition — alternates left/right with varying sizes.
// `xPct` is the LEFT edge of each blob as % of the projects field.
// `y` is absolute top in px.
const projects = [
  { title: 'Index One',    image: 'https://picsum.photos/seed/wip-prj-1/900/900', xPct: 8,  y: 40,   w: 460, h: 520 },
  { title: 'Soft Surface', image: 'https://picsum.photos/seed/wip-prj-2/800/800', xPct: 56, y: 210,  w: 360, h: 400 },
  { title: 'Membrane',     image: 'https://picsum.photos/seed/wip-prj-3/800/800', xPct: 4,  y: 600,  w: 320, h: 360 },
  { title: 'Lattice',      image: 'https://picsum.photos/seed/wip-prj-4/900/900', xPct: 48, y: 720,  w: 480, h: 520 },
  { title: 'Tide',         image: 'https://picsum.photos/seed/wip-prj-5/900/900', xPct: 12, y: 1180, w: 420, h: 440 },
  { title: 'Halftone',     image: 'https://picsum.photos/seed/wip-prj-6/800/800', xPct: 60, y: 1320, w: 360, h: 400 },
  { title: 'Bloom',        image: 'https://picsum.photos/seed/wip-prj-7/900/900', xPct: 26, y: 1720, w: 440, h: 480 },
  { title: 'Ferment',      image: 'https://picsum.photos/seed/wip-prj-8/800/800', xPct: 64, y: 1880, w: 340, h: 380 },
]

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

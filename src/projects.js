import './style.css'
import './blob.css'
import { createBlob } from './blob.js'

// Staggered scroll composition — alternates left/right with varying sizes.
// `xPct` is the LEFT edge of each blob as % of the projects field.
// `y` is absolute top in px.
const projects = []

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

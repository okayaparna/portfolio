import './style.css'
import './blob.css'
import { createBlob } from './blob.js'

// Placeholder project list.
// Replace `image` with real assets once you have them; same for title/desc.
const projects = [
  { title: 'Index One',    image: 'https://picsum.photos/seed/wip-prj-1/700/700', x: 6,   y: 4,  w: 300, h: 320 },
  { title: 'Soft Surface', image: 'https://picsum.photos/seed/wip-prj-2/700/700', x: 38,  y: 12, w: 240, h: 280 },
  { title: 'Membrane',     image: 'https://picsum.photos/seed/wip-prj-3/700/700', x: 70,  y: 2,  w: 280, h: 320 },
  { title: 'Lattice',      image: 'https://picsum.photos/seed/wip-prj-4/700/700', x: 18,  y: 42, w: 320, h: 360 },
  { title: 'Tide',         image: 'https://picsum.photos/seed/wip-prj-5/700/700', x: 56,  y: 38, w: 280, h: 320 },
  { title: 'Halftone',     image: 'https://picsum.photos/seed/wip-prj-6/700/700', x: 4,   y: 78, w: 220, h: 240 },
  { title: 'Bloom',        image: 'https://picsum.photos/seed/wip-prj-7/700/700', x: 44,  y: 76, w: 260, h: 280 },
  { title: 'Ferment',      image: 'https://picsum.photos/seed/wip-prj-8/700/700', x: 76,  y: 64, w: 240, h: 300 },
]

const field = document.getElementById('field')

projects.forEach((p, i) => {
  const item = document.createElement('div')
  item.className = 'projects__item'
  item.style.left = `${p.x}%`
  item.style.top  = `${p.y}%`

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
})

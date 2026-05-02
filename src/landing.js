import './style.css'
import './blob.css'
import { createBlob } from './blob.js'
import { glyphs } from './glyphs.js'
import { startPetals3D } from './petals3d.js'

// Petal field — real WebGL 3D scene
const petalContainer = document.getElementById('petals')
if (petalContainer) startPetals3D(petalContainer, { count: 95 })

const cluster = document.getElementById('cluster')

// === Three primary nav pods =================================================
const pods = [
  {
    href: '/projects.html',
    glyph: glyphs.dots3,
    label: 'Projects',
    image: 'https://picsum.photos/seed/wip-pod-projects/600/700',
    width: 280, height: 360,
    placement: 'top',
  },
  {
    href: '/projects.html#archive',
    glyph: glyphs.flower4,
    label: 'Flower\nArchive',
    image: 'https://picsum.photos/seed/wip-pod-archive/600/600',
    width: 320, height: 300,
    placement: 'left',
  },
  {
    href: '/info.html',
    glyph: glyphs.infoI,
    label: 'Info',
    image: 'https://picsum.photos/seed/wip-pod-info/600/600',
    width: 320, height: 300,
    placement: 'right',
  },
]

pods.forEach((p, i) => {
  const wrap = document.createElement('div')
  wrap.className = `cluster__pod cluster__pod--${p.placement}`
  wrap.appendChild(createBlob({
    href: p.href,
    glyph: p.glyph,
    label: p.label,
    image: p.image,
    width: p.width,
    height: p.height,
    variant: 'pod',
    delay: i * 1.4,
  }))
  cluster.appendChild(wrap)
})

// === Two small accent bubbles ===============================================
const accentMid = document.createElement('div')
accentMid.className = 'cluster__accent cluster__accent--mid'
accentMid.appendChild(createBlob({
  size: 56,
  glyph: glyphs.plusFlower,
  variant: 'accent',
  delay: 2.1,
}))
cluster.appendChild(accentMid)

const accentLow = document.createElement('div')
accentLow.className = 'cluster__accent cluster__accent--low'
accentLow.appendChild(createBlob({
  size: 38,
  glyph: glyphs.cross,
  variant: 'accent',
  delay: 3.4,
}))
cluster.appendChild(accentLow)

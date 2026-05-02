// Blob component — organic soft-edged shape with optional masked image,
// hover-reveal lilac veil, glyph + label slots.
//
// createBlob({
//   width, height,        // px (or pass `size` for a square)
//   image,                // image URL (optional)
//   glyph,                // SVG markup string (optional)
//   label,                // text (optional)
//   href,                 // anchor target (optional)
//   variant,              // 'pod' | 'project' | 'accent'
//   delay,                // animation delay in s
//   shape,                // optional explicit [r1, r2, r3] border-radius strings
// })

const PRESETS = [
  ['62% 38% 55% 45% / 60% 50% 50% 40%', '50% 60% 40% 60% / 55% 45% 65% 45%', '58% 42% 60% 40% / 45% 60% 40% 55%'],
  ['55% 45% 60% 40% / 45% 55% 45% 55%', '40% 60% 50% 50% / 60% 40% 55% 45%', '60% 40% 45% 55% / 50% 60% 50% 40%'],
  ['48% 52% 65% 35% / 55% 45% 55% 45%', '60% 40% 50% 60% / 50% 60% 40% 50%', '50% 50% 40% 60% / 60% 50% 60% 40%'],
  ['65% 35% 50% 50% / 55% 60% 40% 45%', '50% 50% 60% 40% / 65% 35% 60% 40%', '40% 60% 55% 45% / 50% 50% 55% 45%'],
  ['52% 48% 58% 42% / 50% 60% 40% 50%', '60% 40% 45% 55% / 55% 45% 55% 45%', '45% 55% 60% 40% / 60% 40% 50% 50%'],
]

let presetIx = 0
function nextPreset() {
  const p = PRESETS[presetIx % PRESETS.length]
  presetIx++
  return p
}

export function createBlob({
  width,
  height,
  size,
  image,
  glyph = '',
  label = '',
  href,
  variant = 'pod',
  delay = 0,
  shape,
} = {}) {
  const w = width  ?? size ?? 280
  const h = height ?? size ?? 320
  const [r1, r2, r3] = shape ?? nextPreset()

  const tag = href ? 'a' : 'div'
  const el = document.createElement(tag)
  el.className = `blob blob--${variant}`
  if (href) el.setAttribute('href', href)

  el.style.setProperty('--w', `${w}px`)
  el.style.setProperty('--h', `${h}px`)
  el.style.setProperty('--r1', r1)
  el.style.setProperty('--r2', r2)
  el.style.setProperty('--r3', r3)
  el.style.setProperty('--delay', `${delay}s`)

  el.innerHTML = `
    <div class="blob__shape">
      ${image ? `<img class="blob__image" src="${image}" alt="" loading="lazy" decoding="async" />` : ''}
      <div class="blob__veil"></div>
      ${glyph ? `<div class="blob__glyph">${glyph}</div>` : ''}
      ${label ? `<div class="blob__label">${label}</div>` : ''}
    </div>
  `

  // Subtle parallax on cursor inside the blob
  if (image) attachCursorParallax(el)

  return el
}

function attachCursorParallax(el) {
  const shape = el.querySelector('.blob__shape')
  const img   = el.querySelector('.blob__image')
  if (!shape || !img) return

  el.addEventListener('mousemove', (e) => {
    const r = el.getBoundingClientRect()
    const dx = (e.clientX - r.left) / r.width  - 0.5
    const dy = (e.clientY - r.top)  / r.height - 0.5
    img.style.translate = `${dx * 14}px ${dy * 14}px`
  })

  el.addEventListener('mouseleave', () => {
    img.style.translate = '0 0'
  })
}

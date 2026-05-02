import './style.css'
import './blob.css'
import { glyphs } from './glyphs.js'

// Mini-nav glyphs (must match the mini-nav anchors in info.html)
const setGlyph = (id, svg) => {
  const el = document.getElementById(id)
  if (el) el.innerHTML = svg
}
setGlyph('nav-home',     glyphs.home)
setGlyph('nav-projects', glyphs.dots3)
setGlyph('nav-info',     glyphs.infoI)

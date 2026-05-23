/* =========================================================
   About Panel — full-viewport overlay
   ========================================================= */

let panelEl = null
let isOpen = false

export function createAbout() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')

  const el = document.createElement('div')
  el.className = 'about-panel'

  const close = document.createElement('button')
  close.className = 'about-panel__close'
  close.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`
  close.setAttribute('aria-label', 'Close')

  const scroller = document.createElement('div')
  scroller.className = 'about-panel__scroll'

  const content = document.createElement('div')
  content.className = 'about-panel__content'

  content.innerHTML = `
    <div class="about-panel__layout">
      <div class="about-panel__photos">
        <div class="about-panel__photo-grid">
          <img src="${base}/images/about/about-1.png" alt="Aparna photo 1" />
          <img src="${base}/images/about/about-2.png" alt="Aparna photo 2" />
          <img src="${base}/images/about/about-3.png" alt="Aparna photo 3" />
          <img src="${base}/images/about/about-4.png" alt="Aparna photo 4" />
        </div>
      </div>

      <div class="about-panel__text">
        <h1 class="about-panel__heading">
          Hey, It's <span class="about-panel__name">Aparna</span>!
        </h1>

        <section class="about-panel__section">
          <h2>Who?</h2>
          <p>I'm a Product designer based in NYC, with a background in Interaction & Graphic design. Currently designing <a href="https://ash.slingshotai.com" target="_blank" rel="noopener">Ash</a> to change a billion lives.</p>
        </section>

        <section class="about-panel__section">
          <h2>What?</h2>
          <p>I've always been fascinated and deeply curious about human behavior; how people think, feel, and interact with each other and technology. This naturally drives me to design products that enhance or challenge the human experience.</p>
        </section>

        <section class="about-panel__section">
          <h2>And?</h2>
          <p>I'm originally from Kerala, India, grew up in Muscat, Oman and went to school at Parsons School of Design in New York City, which means, you will find me hyper fixated over coffee, fashion, pop-culture and building community outside of work.</p>
        </section>

        <section class="about-panel__section">
          <h2>So?</h2>
          <p><a href="https://www.instagram.com/aparnadoesstuff/" target="_blank" rel="noopener">Let's get coffee sometime.</a></p>
        </section>
      </div>
    </div>
  `

  // Cursor-following tooltip for "Aparna" hover
  const cursorTag = document.createElement('div')
  cursorTag.className = 'about-panel__cursor-tag'
  cursorTag.textContent = 'UH-PURR-NAH'
  el.appendChild(cursorTag)

  const nameEl = content.querySelector('.about-panel__name')
  nameEl.addEventListener('mouseenter', function () {
    cursorTag.classList.add('is-visible')
  })
  nameEl.addEventListener('mouseleave', function () {
    cursorTag.classList.remove('is-visible')
  })
  el.addEventListener('mousemove', function (e) {
    if (cursorTag.classList.contains('is-visible')) {
      cursorTag.style.left = e.clientX + 'px'
      cursorTag.style.top = e.clientY + 'px'
    }
  })

  scroller.appendChild(content)
  el.appendChild(scroller)
  el.appendChild(close)

  panelEl = el
  document.body.appendChild(el)
  return el
}

export function openAbout(onCloseCallback) {
  if (!panelEl) createAbout()
  if (isOpen) return

  const close = panelEl.querySelector('.about-panel__close')
  close.onclick = () => {
    if (onCloseCallback) onCloseCallback()
  }

  panelEl.querySelector('.about-panel__scroll').scrollTop = 0

  requestAnimationFrame(() => {
    panelEl.classList.add('is-open')
    isOpen = true
  })
}

export function closeAbout() {
  if (!panelEl || !isOpen) return

  return new Promise((resolve) => {
    panelEl.classList.remove('is-open')
    isOpen = false
    setTimeout(() => {
      resolve()
    }, 600)
  })
}

const PROJECTS = [
  { slug: 'align-with-ash', title: 'Align with Ash' },
  { slug: 'phia-rewards', title: 'Phia Rewards' },
  { slug: 'disciple', title: 'Disciple' },
  { slug: 'tns-commencement-2025', title: 'The New School Commencement 2025' },
  { slug: 'parsons-benefit-2024', title: 'The 75th Parsons Benefit' },
  { slug: 'wired-rebrand', title: 'WIRED Magazine Rebrand' },
  { slug: 'twingate', title: 'Twingate' },
  { slug: 'gundi-studios', title: 'Gundi Studios' },
]

export function mountModalWidget() {
  const currentSlug = document.body.dataset.project
  const currentIdx = PROJECTS.findIndex(p => p.slug === currentSlug)
  const currentTitle = currentIdx >= 0 ? PROJECTS[currentIdx].title : 'Project'

  const widget = document.createElement('div')
  widget.className = 'modal-widget'
  widget.innerHTML = `
    <button class="modal-widget__trigger" aria-label="Open project tools">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="3"/>
        <line x1="12" y1="2" x2="12" y2="6"/>
        <line x1="12" y1="18" x2="12" y2="22"/>
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
        <line x1="2" y1="12" x2="6" y2="12"/>
        <line x1="18" y1="12" x2="22" y2="12"/>
        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
      </svg>
    </button>
    <div class="modal-widget__panel">
      <div class="mw__project-title">${currentTitle}</div>
      <div class="mw__divider"></div>

      <div class="mw__nav-row">
        <a class="mw__nav-arrow" href="${currentIdx > 0 ? PROJECTS[currentIdx - 1].slug + '.html' : '#'}" ${currentIdx <= 0 ? 'aria-disabled="true"' : ''}>← Prev</a>
        <span class="mw__nav-count">${currentIdx + 1} / ${PROJECTS.length}</span>
        <a class="mw__nav-arrow" href="${currentIdx < PROJECTS.length - 1 ? PROJECTS[currentIdx + 1].slug + '.html' : '#'}" ${currentIdx >= PROJECTS.length - 1 ? 'aria-disabled="true"' : ''}>Next →</a>
      </div>

      <div class="mw__label">Sections</div>
      <div class="mw__section-links"></div>

      <button class="mw__summarize-btn">Summarize</button>
      <div class="mw__summary-text" hidden></div>

      <div class="mw__divider"></div>

      <div class="mw__setting-row">
        <span class="mw__setting-label">Theme</span>
        <div class="mw__setting-pills" data-setting="theme">
          <button data-value="light" class="is-active">Light</button>
          <button data-value="mid">Mid</button>
          <button data-value="dark">Dark</button>
        </div>
      </div>
      <div class="mw__setting-row">
        <span class="mw__setting-label">Text Size</span>
        <div class="mw__setting-pills" data-setting="textsize">
          <button data-value="small">A-</button>
          <button data-value="default" class="is-active">A</button>
          <button data-value="large">A+</button>
        </div>
      </div>
      <div class="mw__setting-row">
        <span class="mw__setting-label">Contrast</span>
        <div class="mw__setting-pills" data-setting="contrast">
          <button data-value="low">Low</button>
          <button data-value="normal" class="is-active">Normal</button>
          <button data-value="high">High</button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(widget)

  let isOpen = false
  const trigger = widget.querySelector('.modal-widget__trigger')

  trigger.addEventListener('click', () => {
    isOpen = !isOpen
    widget.classList.toggle('is-open', isOpen)
    if (isOpen) buildSectionLinks()
  })

  document.addEventListener('click', (e) => {
    if (isOpen && !widget.contains(e.target)) {
      isOpen = false
      widget.classList.remove('is-open')
    }
  })

  function buildSectionLinks() {
    const container = widget.querySelector('.mw__section-links')
    const headings = document.querySelectorAll('.project__content h2')
    container.innerHTML = ''
    headings.forEach((h, i) => {
      if (!h.id) h.id = 'section-' + i
      const link = document.createElement('a')
      link.href = '#' + h.id
      link.textContent = h.textContent
      link.className = 'mw__section-link'
      link.addEventListener('click', (e) => {
        e.preventDefault()
        h.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
      container.appendChild(link)
    })
  }

  const summarizeBtn = widget.querySelector('.mw__summarize-btn')
  const summaryText = widget.querySelector('.mw__summary-text')
  summarizeBtn.addEventListener('click', () => {
    const content = document.querySelector('.project__content')
    if (!content) return
    const paragraphs = content.querySelectorAll('p')
    const firstTwo = Array.from(paragraphs).slice(0, 2).map(p => p.textContent).join(' ')
    const summary = firstTwo.length > 200 ? firstTwo.slice(0, 200) + '…' : firstTwo
    summaryText.textContent = summary
    summaryText.hidden = !summaryText.hidden
  })

  widget.querySelectorAll('.mw__setting-pills').forEach(group => {
    const setting = group.dataset.setting
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('button')
      if (!btn) return
      group.querySelectorAll('button').forEach(b => b.classList.remove('is-active'))
      btn.classList.add('is-active')
      applySetting(setting, btn.dataset.value)
    })
  })

  function applySetting(setting, value) {
    const body = document.body
    if (setting === 'theme') {
      body.classList.remove('theme-dark', 'theme-mid')
      if (value === 'dark') body.classList.add('theme-dark')
      if (value === 'mid') body.classList.add('theme-mid')
    } else if (setting === 'textsize') {
      const scale = value === 'small' ? 0.875 : value === 'large' ? 1.15 : 1
      document.documentElement.style.setProperty('--text-scale', scale)
    } else if (setting === 'contrast') {
      body.classList.remove('contrast-high', 'contrast-low')
      if (value === 'high') body.classList.add('contrast-high')
      if (value === 'low') body.classList.add('contrast-low')
    }
  }
}

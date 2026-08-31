import { pageSignal } from './page-lifecycle.js'
const PROJECTS = [
  { slug: 'align-with-ash', title: 'Align with Ash' },
  { slug: 'disciple', title: 'Disciple' },
  { slug: 'tns-commencement-2025', title: 'The New School Commencement 2025' },
  { slug: 'parsons-benefit-2024', title: 'The 75th Parsons Benefit' },
  { slug: 'wired-rebrand', title: 'WIRED Magazine Rebrand' },
  { slug: 'twingate', title: 'Twingate' },
]

export function mountModalWidget() {
  const currentSlug = document.body.dataset.project
  const currentIdx = PROJECTS.findIndex(p => p.slug === currentSlug)
  const currentTitle = currentIdx >= 0 ? PROJECTS[currentIdx].title : 'Project'

  const prevHref = currentIdx > 0 ? PROJECTS[currentIdx - 1].slug + '.html' : '#'
  const nextHref = currentIdx < PROJECTS.length - 1 ? PROJECTS[currentIdx + 1].slug + '.html' : '#'
  const prevDisabled = currentIdx <= 0
  const nextDisabled = currentIdx >= PROJECTS.length - 1

  const widget = document.createElement('div')
  widget.className = 'modal-widget'
  widget.innerHTML = `
    <button class="modal-widget__trigger" aria-label="Open project tools">
      <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><mask id="mw-mask" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32"><rect width="32" height="32" fill="#D9D9D9"/></mask><g mask="url(#mw-mask)"><path d="M3.17969 14.2821L9.35902 3.3208L15.5384 14.2821H3.17969ZM5.84102 26.2155C4.86213 25.2395 4.37269 24.0584 4.37269 22.6721C4.37269 21.2652 4.86213 20.0771 5.84102 19.1078C6.81991 18.1387 8.0028 17.6541 9.38969 17.6541C10.7766 17.6541 11.9581 18.1421 12.9344 19.1181C13.9104 20.0941 14.3984 21.277 14.3984 22.6668C14.3984 24.0566 13.9104 25.2395 12.9344 26.2155C11.9581 27.1915 10.7766 27.6795 9.38969 27.6795C8.0028 27.6795 6.81991 27.1915 5.84102 26.2155ZM11.7514 25.0325C12.3991 24.3847 12.723 23.5961 12.723 22.6668C12.723 21.7375 12.3991 20.9489 11.7514 20.3011C11.1036 19.6531 10.3149 19.3291 9.38535 19.3291C8.45602 19.3291 7.66747 19.6531 7.01969 20.3011C6.37191 20.9489 6.04802 21.7375 6.04802 22.6668C6.04802 23.5961 6.37191 24.3847 7.01969 25.0325C7.66747 25.6805 8.45602 26.0045 9.38535 26.0045C10.3149 26.0045 11.1036 25.6805 11.7514 25.0325ZM6.04702 12.6071H12.6837L9.35902 6.7598L6.04702 12.6071ZM17.6797 27.6795V17.6541H27.705V27.6795H17.6797ZM19.3547 26.0045H26.03V19.3291H19.3547V26.0045ZM22.6924 14.2821C21.6479 13.4206 20.7407 12.6659 19.9707 12.0181C19.2005 11.3704 18.5641 10.775 18.0617 10.2321C17.559 9.68947 17.1838 9.16514 16.936 8.65914C16.688 8.15314 16.564 7.61813 16.564 7.05413C16.564 6.15658 16.8692 5.40613 17.4797 4.8028C18.0899 4.19925 18.8574 3.89747 19.782 3.89747C20.3329 3.89747 20.8582 4.0298 21.358 4.29447C21.8578 4.55913 22.3026 4.94902 22.6924 5.46413C23.0821 4.95191 23.5297 4.5628 24.035 4.2968C24.5404 4.03058 25.0671 3.89747 25.6154 3.89747C26.5282 3.89747 27.2907 4.20602 27.9027 4.82313C28.5145 5.44025 28.8204 6.19669 28.8204 7.09247C28.8204 7.64802 28.6965 8.17669 28.4487 8.67847C28.2009 9.18002 27.8257 9.70002 27.323 10.2385C26.8206 10.7771 26.1842 11.3704 25.414 12.0181C24.644 12.6659 23.7368 13.4206 22.6924 14.2821ZM22.6924 12.0908C24.4079 10.7175 25.579 9.67902 26.2057 8.97547C26.8321 8.27169 27.1454 7.65347 27.1454 7.1208C27.1454 6.66636 27.0074 6.2948 26.7314 6.00613C26.4554 5.71725 26.0928 5.5728 25.6437 5.5728C25.3601 5.5728 25.0812 5.65536 24.807 5.82047C24.533 5.98558 24.1691 6.28225 23.7154 6.71047L22.6924 7.69247L21.6694 6.71047C21.2178 6.26691 20.8545 5.96636 20.5794 5.8088C20.3042 5.65147 20.0248 5.5728 19.741 5.5728C19.2832 5.5728 18.9185 5.7108 18.6467 5.9868C18.3751 6.2628 18.2394 6.63224 18.2394 7.09513C18.2394 7.64491 18.5526 8.27169 19.179 8.97547C19.8055 9.67902 20.9766 10.7175 22.6924 12.0908Z" fill="currentColor"/></g></svg>
    </button>
    <div class="modal-widget__panel">
      <div class="mw__nav-row">
        <a class="mw__nav-link" href="${prevHref}" ${prevDisabled ? 'aria-disabled="true"' : ''}>Prev</a>
        <button class="mw__scroll-top" aria-label="Scroll to top">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
        <a class="mw__nav-link" href="${nextHref}" ${nextDisabled ? 'aria-disabled="true"' : ''}>Next</a>
      </div>

      <div class="mw__project-title">${currentTitle}</div>
      <div class="mw__divider"></div>

      <div class="mw__label">Quick Links</div>
      <div class="mw__section-links"></div>

      <button class="mw__tldr-btn">TL;DR</button>

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
    <div class="mw__tldr-panel"></div>
  `

  document.body.appendChild(widget)

  let isOpen = false
  const trigger = widget.querySelector('.modal-widget__trigger')

  trigger.addEventListener('click', () => {
    isOpen = !isOpen
    widget.classList.toggle('is-open', isOpen)
    if (isOpen) buildSectionLinks()
    if (!isOpen) closeTldr()
  })

  widget.querySelector('.mw__scroll-top').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })

  document.addEventListener('click', (e) => {
    if (isOpen && !widget.contains(e.target)) {
      isOpen = false
      widget.classList.remove('is-open')
      closeTldr()
    }
  }, { signal: pageSignal() })

  function buildSectionLinks() {
    const container = widget.querySelector('.mw__section-links')
    const labels = document.querySelectorAll('.project__content .project__section-label')
    container.innerHTML = ''
    labels.forEach((label, i) => {
      const text = label.textContent.trim()
      if (!text) return
      const textBlock = label.closest('.project__text')
      if (!textBlock) return
      if (!textBlock.id) textBlock.id = 'section-' + i
      const link = document.createElement('a')
      link.href = '#' + textBlock.id
      link.textContent = text
      link.className = 'mw__section-link'
      link.addEventListener('click', (e) => {
        e.preventDefault()
        textBlock.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
      container.appendChild(link)
    })
  }

  // TL;DR side panel
  const tldrBtn = widget.querySelector('.mw__tldr-btn')
  const tldrPanel = widget.querySelector('.mw__tldr-panel')
  let tldrOpen = false

  tldrBtn.addEventListener('click', () => {
    if (tldrOpen) {
      closeTldr()
    } else {
      const content = document.querySelector('.project__content')
      if (!content) return
      const projectHeadings = Array.from(content.querySelectorAll('h2')).filter(h => /^Project\s+\d/i.test(h.textContent.trim()))
      const parts = projectHeadings.map(h => {
        const textBlock = h.closest('.project__text')
        if (!textBlock) return ''
        const p = textBlock.querySelector('p')
        if (!p) return ''
        const sentence = p.textContent.split(/\.(?:\s|$)/)[0]
        return sentence ? sentence.trim() + '.' : ''
      }).filter(Boolean)
      const html = parts.length
        ? `<p>${parts.join(' ')}</p>`
        : '<p><em>No summary available.</em></p>'
      tldrPanel.innerHTML = html
      tldrPanel.classList.add('is-visible')
      tldrOpen = true
    }
  })

  function closeTldr() {
    tldrPanel.classList.remove('is-visible')
    tldrOpen = false
  }

  // Settings
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

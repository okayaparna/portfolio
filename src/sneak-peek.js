const SNEAK_PEEK_CONTENT = {
  'align-with-ash': {
    tag: 'Ash by Slingshot AI',
    title: 'Align with Ash',
    subtitle: 'Couples therapy, mediated asynchronously by AI.',
    status: 'Beta',
    timeline: 'Spring 2026',
    meta: [
      { label: 'Role', value: 'Product Designer (0→100)' },
      { label: 'Team', value: 'Josh Hsu, Caitlin Stamatis, Jason Liggi, Andrew Hulin' },
      { label: 'Tools', value: 'Claude Code, Cursor, Figma, PostHog, Loops' },
    ],
    hero: '/images/align-with-ash/thumbnail.png',
    body: `<p>It started as a dinner conversation at a company offsite in the French countryside — what would couples therapy look like if it could be experienced asynchronously? Two days later, at our hackathon, we had a foundation. Back in NYC, I led the end-to-end buildout as a one-off web product.</p>`,
    tldr: {
      heading: 'TL;DR',
      cards: [
        { title: 'Design + Engineering', desc: 'Built across Claude Code, Cursor, and Figma.', icon: 'architecture', accent: '#6C63FF' },
        { title: 'Research', desc: 'Started from our in-house therapy model, layered in EFT, IBCT, Gottman, and SFBT modalities with our Head of Research.', icon: 'psychology', accent: '#E87DB5' },
        { title: 'Testing', desc: 'Multiple rounds of medical and technical jailbreak testing plus preliminary user studies on conversation quality and UX.', icon: 'bug_report', accent: '#4ECDC4' },
        { title: 'Data & Privacy', desc: 'Set up a privacy-safe PostHog pipeline, extended to surface qualitative signal for near real-time iteration.', icon: 'analytics', accent: '#FF8A65' },
        { title: 'Launch', desc: '~2,000 couples in 4 days via organic email and LinkedIn marketing.', icon: 'rocket_launch', accent: '#7E57C2' },
      ],
    },
    closing: `The fastest, most experimental feedback loop I've ever run. More on this soon.`,
  },
  'ash-configurations': {
    tag: 'Ash by Slingshot AI',
    title: 'Ash Configurations',
    subtitle: 'Allowing users to personalize their therapy agent as a visual experience first.',
    status: 'Beta',
    timeline: 'Spring 2026',
    meta: [],
    hero: null,
    body: '<p>Content coming soon.</p>',
    tldr: null,
    closing: null,
  },
}

let panelEl = null
let isPanelOpen = false

function buildPanel() {
  // Load Material Symbols if not already present
  if (!document.querySelector('link[href*="Material+Symbols"]')) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,300,0,0'
    document.head.appendChild(link)
  }

  const el = document.createElement('div')
  el.className = 'sneak-peek'

  const close = document.createElement('button')
  close.className = 'sneak-peek__close'
  close.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`
  close.setAttribute('aria-label', 'Close')
  close.addEventListener('click', closeSneakPeek)

  const scroller = document.createElement('div')
  scroller.className = 'sneak-peek__scroll'

  const content = document.createElement('div')
  content.className = 'sneak-peek__content'

  scroller.appendChild(content)
  el.appendChild(scroller)
  el.appendChild(close)

  panelEl = el
  document.body.appendChild(el)
  return el
}

function renderContent(key) {
  const data = SNEAK_PEEK_CONTENT[key]
  if (!data) return

  const content = panelEl.querySelector('.sneak-peek__content')
  const base = typeof import.meta !== 'undefined' ? import.meta.env.BASE_URL.replace(/\/$/, '') : ''

  let html = ''

  // Header
  html += `<header class="sneak-peek__header">`
  html += `  <div class="sneak-peek__header-left">`
  html += `    <span class="sneak-peek__tag">${data.tag}</span>`
  html += `    <h1 class="sneak-peek__title">${data.title}</h1>`
  html += `    <p class="sneak-peek__subtitle">${data.subtitle}</p>`
  html += `    <div class="sneak-peek__status"><span class="sneak-peek__status-dot"></span> ${data.status}</div>`
  html += `  </div>`
  html += `  <div class="sneak-peek__header-right">`
  html += `    <div><div class="sneak-peek__meta-label">Timeline</div><div class="sneak-peek__meta-value">${data.timeline}</div></div>`
  for (const m of data.meta) {
    html += `<div><div class="sneak-peek__meta-label">${m.label}</div><div class="sneak-peek__meta-value">${m.value}</div></div>`
  }
  html += `  </div>`
  html += `</header>`

  // Hero
  if (data.hero) {
    html += `<div class="sneak-peek__hero"><img src="${base}${data.hero}" alt="${data.title}" /></div>`
  }

  // Body
  if (data.body) {
    html += `<div class="sneak-peek__body">${data.body}</div>`
  }

  // TL;DR cards
  if (data.tldr) {
    html += `<div class="sneak-peek__tldr">`
    html += `  <h2>${data.tldr.heading}</h2>`
    html += `  <div class="sneak-peek__tldr-grid">`
    for (const card of data.tldr.cards) {
      html += `<div class="sneak-peek__tldr-card">`
      html += `  <h3 class="sneak-peek__tldr-card-title">${card.title}</h3>`
      html += `  <p>${card.desc}</p>`
      html += `</div>`
    }
    html += `  </div>`
    html += `</div>`
  }

  // Closing
  if (data.closing) {
    html += `<div class="sneak-peek__closing">`
    html += `<p>${data.closing}</p>`
    html += `</div>`
  }

  content.innerHTML = html
}

export function openSneakPeek(key) {
  if (!panelEl) buildPanel()
  if (isPanelOpen) return

  renderContent(key)

  // Scroll to top
  panelEl.querySelector('.sneak-peek__scroll').scrollTop = 0

  requestAnimationFrame(() => {
    panelEl.classList.add('is-open')
    isPanelOpen = true
  })
}

export function closeSneakPeek() {
  if (!panelEl || !isPanelOpen) return

  panelEl.classList.remove('is-open')
  isPanelOpen = false
}

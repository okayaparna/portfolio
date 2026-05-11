// Petal control panel — custom UI matched to the site's soft aesthetic.
// Mounts a floating panel that drives the petal scene config in real time.
//
// Usage:
//   import { mountControls } from './controls.js'
//   mountControls(petalController)

import { DEFAULTS } from './petals3d.js'

const STORAGE_KEY = 'petalControls.v1'

// --- Field schema -----------------------------------------------------------
const SECTIONS = [
  {
    title: 'Field',
    fields: [
      { key: 'count',     label: 'Petal count',  min: 0,    max: 200,  step: 1     },
      { key: 'depthMin',  label: 'Depth min',    min: 0.1,  max: 1.5,  step: 0.05  },
      { key: 'depthMax',  label: 'Depth max',    min: 0.2,  max: 2.0,  step: 0.05  },
    ],
  },
  {
    title: 'Size',
    fields: [
      { key: 'scaleMin',  label: 'Petal min size', min: 0.05, max: 1.0,  step: 0.01 },
      { key: 'scaleMax',  label: 'Petal max size', min: 0.1,  max: 1.5,  step: 0.01 },
    ],
  },
  {
    title: 'Motion',
    fields: [
      { key: 'gravity',     label: 'Gravity',          min: 0,      max: 0.0006, step: 0.00001, fmt: 5 },
      { key: 'drift',       label: 'Drift jitter',     min: 0,      max: 0.005,  step: 0.0001,  fmt: 4 },
      { key: 'initialFall', label: 'Initial fall',     min: 0,      max: 0.02,   step: 0.0005,  fmt: 4 },
      { key: 'rotationSpd', label: 'Tumble speed',     min: 0,      max: 0.06,   step: 0.001,   fmt: 3 },
      { key: 'damping',     label: 'Damping',          min: 0.95,   max: 1.0,    step: 0.001,   fmt: 3 },
    ],
  },
  {
    title: 'Cursor',
    fields: [
      { key: 'mouseEnabled', label: 'Cursor effect', type: 'toggle' },
      { key: 'mouseRadius',  label: 'Repel radius',  min: 0.5, max: 6.0,  step: 0.1  },
      { key: 'mouseForce',   label: 'Repel force',   min: 0,   max: 0.12, step: 0.001, fmt: 3 },
    ],
  },
  {
    title: 'Light',
    fields: [
      { key: 'keyIntensity', label: 'Key light',     min: 0, max: 3, step: 0.05, setter: 'setKeyIntensity' },
      { key: 'envIntensity', label: 'Environment',   min: 0, max: 3, step: 0.05, setter: 'setEnvIntensity' },
      { key: 'exposure',     label: 'Exposure',      min: 0.3, max: 2.5, step: 0.05, setter: 'setExposure' },
    ],
  },
]

// --- Persistence ------------------------------------------------------------
function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function save(config) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)) } catch {}
}

// --- Panel construction -----------------------------------------------------
export function mountControls(controller) {
  const { config } = controller

  // Apply any persisted config before mounting UI
  const saved = loadSaved()
  if (saved) {
    for (const k of Object.keys(saved)) {
      if (k in config) config[k] = saved[k]
    }
    // Re-apply deferred setters that hold side state
    if ('count'        in saved) controller.setCount(saved.count)
    if ('keyIntensity' in saved) controller.setKeyIntensity(saved.keyIntensity)
    if ('envIntensity' in saved) controller.setEnvIntensity(saved.envIntensity)
    if ('exposure'     in saved) controller.setExposure(saved.exposure)
  }

  const root = document.createElement('aside')
  root.className = 'cp'
  root.innerHTML = `
    <header class="cp__head">
      <span class="cp__title">Petal Controls</span>
      <button class="cp__toggle" aria-label="Collapse">−</button>
    </header>
    <div class="cp__body"></div>
    <footer class="cp__foot">
      <button class="cp__btn" data-action="pause">Pause</button>
      <button class="cp__btn" data-action="respawn">Respawn</button>
      <button class="cp__btn cp__btn--ghost" data-action="reset">Reset</button>
    </footer>
  `
  document.body.appendChild(root)

  const body = root.querySelector('.cp__body')
  const fieldRefs = {}    // key → { input, valueEl }

  for (const section of SECTIONS) {
    const sec = document.createElement('section')
    sec.className = 'cp__section'
    sec.innerHTML = `<h3 class="cp__sectionTitle">${section.title}</h3>`
    body.appendChild(sec)

    for (const f of section.fields) {
      const row = document.createElement('div')
      row.className = 'cp__row'

      if (f.type === 'toggle') {
        row.innerHTML = `
          <label class="cp__label">${f.label}</label>
          <button class="cp__switch" role="switch" aria-checked="${config[f.key] ? 'true' : 'false'}"></button>
        `
        const sw = row.querySelector('.cp__switch')
        sw.classList.toggle('is-on', !!config[f.key])
        sw.addEventListener('click', () => {
          config[f.key] = !config[f.key]
          sw.setAttribute('aria-checked', config[f.key] ? 'true' : 'false')
          sw.classList.toggle('is-on', config[f.key])
          save(config)
        })
        sec.appendChild(row)
        continue
      }

      // Slider row
      const fmt  = f.fmt ?? 2
      const v0   = config[f.key]
      row.innerHTML = `
        <label class="cp__label">
          <span>${f.label}</span>
          <span class="cp__value">${formatVal(v0, fmt)}</span>
        </label>
        <input class="cp__slider" type="range"
               min="${f.min}" max="${f.max}" step="${f.step}" value="${v0}">
      `
      const input    = row.querySelector('.cp__slider')
      const valueEl  = row.querySelector('.cp__value')
      fieldRefs[f.key] = { input, valueEl, fmt }

      input.addEventListener('input', () => {
        const v = parseFloat(input.value)
        valueEl.textContent = formatVal(v, fmt)
        if (f.setter && controller[f.setter]) {
          controller[f.setter](v)
        } else if (f.key === 'count') {
          controller.setCount(v)
        } else {
          config[f.key] = v
        }
        save(config)
      })

      sec.appendChild(row)
    }
  }

  // --- Footer actions
  const pauseBtn = root.querySelector('[data-action="pause"]')
  pauseBtn.addEventListener('click', () => {
    config.paused = !config.paused
    pauseBtn.classList.toggle('is-on', config.paused)
    pauseBtn.textContent = config.paused ? 'Resume' : 'Pause'
    save(config)
  })

  root.querySelector('[data-action="respawn"]').addEventListener('click', () => {
    controller.respawnAll()
  })

  root.querySelector('[data-action="reset"]').addEventListener('click', () => {
    for (const k of Object.keys(DEFAULTS)) {
      const v = DEFAULTS[k]
      if (k === 'count')        controller.setCount(v)
      else if (k === 'keyIntensity') controller.setKeyIntensity(v)
      else if (k === 'envIntensity') controller.setEnvIntensity(v)
      else if (k === 'exposure')     controller.setExposure(v)
      else config[k] = v
      // Sync UI
      const ref = fieldRefs[k]
      if (ref) {
        ref.input.value = v
        ref.valueEl.textContent = formatVal(v, ref.fmt)
      }
      // Toggle
      const sw = root.querySelector(`.cp__switch[aria-checked]`)
      if (sw && k === 'mouseEnabled') {
        sw.setAttribute('aria-checked', v ? 'true' : 'false')
        sw.classList.toggle('is-on', v)
      }
    }
    config.paused = false
    pauseBtn.classList.remove('is-on')
    pauseBtn.textContent = 'Pause'
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  })

  // --- Collapse toggle
  const toggle = root.querySelector('.cp__toggle')
  let collapsed = false
  toggle.addEventListener('click', () => {
    collapsed = !collapsed
    root.classList.toggle('is-collapsed', collapsed)
    toggle.textContent = collapsed ? '+' : '−'
  })
}

function formatVal(v, fmt) {
  if (fmt === 0) return String(Math.round(v))
  return Number(v).toFixed(fmt)
}

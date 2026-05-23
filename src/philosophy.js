/* =========================================================
   Philosophy Card — tiny frosted label, bottom-right
   ========================================================= */

const ITEMS = [
  { icon: '△', text: 'Vision first, Systems next, Tools last' },
  { icon: '♡', text: 'Qualitative Data > Quantitative Data' },
  { icon: '○', text: 'Inspiration is all around' },
  { icon: '□', text: 'Execution by hypothesis' },
]

export function createPhilosophy() {
  const card = document.createElement('div')
  card.className = 'philosophy'

  const header = document.createElement('div')
  header.className = 'philosophy__header'
  header.textContent = 'MY DESIGN PHILOSOPHY'

  const list = document.createElement('div')
  list.className = 'philosophy__list'

  for (const item of ITEMS) {
    const row = document.createElement('div')
    row.className = 'philosophy__item'

    const icon = document.createElement('span')
    icon.className = 'philosophy__icon'
    icon.textContent = item.icon

    const label = document.createElement('span')
    label.className = 'philosophy__label'
    label.textContent = item.text.toUpperCase()

    row.appendChild(icon)
    row.appendChild(label)
    list.appendChild(row)
  }

  card.appendChild(header)
  card.appendChild(list)
  document.body.appendChild(card)

  return card
}

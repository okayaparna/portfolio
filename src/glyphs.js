// Custom glyphs — soft, rounded geometry, designed to feel jelly-like.
// Stroke + fill use currentColor so the parent controls coloring.

export const glyphs = {
  // Three pebbles in a cluster (Projects)
  dots3: `
    <svg viewBox="0 0 64 64" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="20"  cy="36" rx="9"  ry="10"/>
      <ellipse cx="32"  cy="28" rx="9"  ry="11"/>
      <ellipse cx="44"  cy="36" rx="9"  ry="10"/>
    </svg>
  `,

  // Four-petal flower (Flower Archive)
  flower4: `
    <svg viewBox="0 0 64 64" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="32" cy="16" rx="9" ry="12"/>
      <ellipse cx="32" cy="48" rx="9" ry="12"/>
      <ellipse cx="16" cy="32" rx="12" ry="9"/>
      <ellipse cx="48" cy="32" rx="12" ry="9"/>
      <circle cx="32" cy="32" r="4.5"/>
    </svg>
  `,

  // Lowercase i (Info)
  infoI: `
    <svg viewBox="0 0 64 64" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="14" r="6"/>
      <rect x="25" y="24" width="14" height="32" rx="7"/>
    </svg>
  `,

  // Tiny plus-flower (accent)
  plusFlower: `
    <svg viewBox="0 0 64 64" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="26" y="14" width="12" height="36" rx="6"/>
      <rect x="14" y="26" width="36" height="12" rx="6"/>
      <circle cx="32" cy="32" r="3"/>
    </svg>
  `,

  // Soft cross (accent)
  cross: `
    <svg viewBox="0 0 64 64" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="28" y="10" width="8" height="44" rx="4" transform="rotate(45 32 32)"/>
      <rect x="28" y="10" width="8" height="44" rx="4" transform="rotate(-45 32 32)"/>
    </svg>
  `,

  // Rounded house (home, used in mini-nav)
  home: `
    <svg viewBox="0 0 64 64" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 10c-2 0-3.6.8-5 2L13 24c-2 1.6-3 4-3 6.6V46c0 4.4 3.6 8 8 8h28c4.4 0 8-3.6 8-8V30.6c0-2.6-1-5-3-6.6L37 12c-1.4-1.2-3-2-5-2z"/>
    </svg>
  `,

  // Rounded square (Work)
  square: `
    <svg viewBox="0 0 64 64" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="15" width="34" height="34" rx="10"/>
    </svg>
  `,

  // Rounded triangle (Contact) — stroke with round joins softens the corners
  triangle: `
    <svg viewBox="0 0 64 64" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 20 L47 45 L17 45 Z"
            stroke="currentColor" stroke-width="11" stroke-linejoin="round"/>
    </svg>
  `,

  // Circle (About)
  circle: `
    <svg viewBox="0 0 64 64" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="17"/>
    </svg>
  `,

  // Tiny bud (decorative)
  bud: `
    <svg viewBox="0 0 64 64" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="32" cy="32" rx="14" ry="18"/>
    </svg>
  `,
}

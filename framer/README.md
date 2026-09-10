# FlowerConsole — Framer code component

`FlowerConsole.tsx` is a viewport-fixed navigation flower. Geometry is taken 1:1
from `Group 9.svg` / `Group 10.svg`, so at scale 1 it is pixel-identical to the
Figma source (verified by difference-blend overlay).

## Adding it to Framer

1. In the Framer project, **Assets → Code → New → New Code File**, name it
   `FlowerConsole`.
2. Paste the whole contents of `FlowerConsole.tsx`.
3. Drag the component onto a page and set **Mode**. Position on the canvas
   doesn't matter — it renders into `document.body` as a fixed overlay. The
   canvas shows a static preview of the pose it rests in, so the layer isn't
   invisible while you work.
4. On the home page, give the work section an **ID** of `work` (Framer: select
   the section → right panel → ID), or point the *Work section* property at
   whatever selector you use.

## Two modes

Set **Mode** in the properties panel.

**Home page** — the full behaviour, two states:

| | stem anchored to | scale | petals |
|---|---|---|---|
| **Hero** (top of page) | bottom of the browser | `Hero size` (1.6) | fan upward, ±20° |
| **Docked** (work section) | top of the browser | `Size (docked)` (1.0) | fan downward, ±20° |

**Project page** — no hero state at all. The console just hangs from the top of
the browser at `Size (docked)`, stem running up off the top edge, and stays put
however far the page scrolls. On load it sprouts downward from above the top
edge. The hero-only properties hide themselves in this mode.

### On the home page

- **On load** it sprouts: stem grows up from the bottom edge, then the head
  blooms open — petals fan out with a stagger while the whole head scales up.
- **Clicking the middle petal** scrolls to the work section. Docking is driven
  by scroll position, not by the click, so manual scrolling triggers it too.
- **Docking** retracts the flower down out of frame, flips the anchor to the top
  edge while it's off-screen, then re-sprouts it hanging from the top.
  Scrolling back up reverses it.
- `prefers-reduced-motion` skips the choreography and snaps between states.

## Properties worth knowing

- **Hero height** — where the joint (base of the head) sits, as a share of the
  viewport measured up from the bottom. `0.38` puts the head near the middle.
- **Docked drop** — how far the docked joint hangs below the top edge. `0` sits
  the petals flush with the top, as in `Group 9.svg`.
- **Dock at** — docks once the work section's top passes this share of the
  viewport. There's built-in hysteresis so a slow scroll can't flap the state.
- **Left / Middle / Right link** — plain text fields. Type a Framer path
  (`/`, `/work/align-with-ash`), a section on a page (`/#work`), a full URL, or
  a `mailto:`. Leave one blank and that petal renders as an inert button.
- **Left / Middle / Right icon** — which glyph sits in each petal.

## Links

Each petal renders as a real `<a href>`, so Framer's router handles page changes
and cmd-click / middle-click / "copy link address" behave normally. The click
handler applies one rule, which means **one setting works in both modes**:

| target | what happens |
|---|---|
| another site, `mailto:`, `tel:` | normal browser behaviour |
| a different page on this site | the link goes through — Framer routes it |
| *this* page, with a `#hash` | smooth-scrolls to that section |
| *this* page, no hash | smooth-scrolls back to the top |

So the three petals want:

| petal | link | on the home page | on a project page |
|---|---|---|---|
| Left | `/` | scrolls to top | navigates home |
| Middle | `/#work` | scrolls to the work section | navigates home, lands at work |
| Right | `mailto:you@example.com` | opens mail | opens mail |

For `/#work` to land correctly, the work section needs the **ID** `work` in
Framer. Links to other sites open in a new tab automatically; `mailto:` doesn't.

There are three petals, fixed. If you ever want a fourth, the fan math already
handles any number — it's a small change.

## Adding icons

Glyphs live in the `ICONS` map. Each entry is `{ vb, vbox?, t?, d }`:

- `vb` — how big the icon draws, in petal units
- `vbox` — the glyph's own viewBox, if it isn't `0 0 vb vb`
- `d` — the path
- `t` — an optional transform, only used by the three glyphs lifted out of the
  original Figma export, where placement was baked into the coordinates

To add a Material Symbol, grab its SVG (e.g.
`https://raw.githubusercontent.com/google/material-design-icons/master/symbols/web/<name>/materialsymbolsrounded/<name>_fill1_24px.svg`),
then add `{ vb: 20, vbox: "0 -960 960 960", d: "<its path>" }` and list the key
in the three icon enums in `addPropertyControls`. Current Material Symbols
glyphs are Rounded, filled.

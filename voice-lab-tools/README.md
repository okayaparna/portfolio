# Tracing the voice paths

`public/voice-lab/paths.json` is not hand-authored — it is traced out of the
rendered `.riv` files. These are the scripts that produced it, kept here so the
paths can be regenerated if the Rive files change.

## How it works

1. Render every voice-mode `.riv` into one grid PNG (headless Chrome, Rive web
   runtime, `Fit.contain`, black-on-white).
2. `ridge.py` follows the centre of each stroke: step along the current heading,
   re-centre across the stroke, and skip the re-centre where the measured width
   blows out — that is how a crossing (River's lasso) is passed straight through
   instead of turning down the other branch.
3. `trace.py` holds the PNG decoder, mask, RDP and resampling helpers.
4. `run_trace.py` drives it and writes the normalised JSON.

Skeleton thinning (Zhang-Suen) was tried first and abandoned: the walk dead-ends
in the diagonal clusters thinning leaves, covering only 13–33% of most shapes.

## Two traps

**Coverage is not enough.** A path that zig-zags across the stroke covers 100%
of the ink while being useless — one run came out 16× longer than the shape's
width with 27 direction reversals, and the trim then revealed disconnected
patches instead of one moving boundary. Score on coverage *and* path length:
`len/span` should sit around 1.6–3.5 with fewer than ~10 reversals.

**Spacing must stay uniform.** The renderer draws Catmull-Rom cubics, whose
tangent estimate `(p2-p0)/6` assumes even spacing, and the trim measures chords
against that curve. Do not run RDP over the final points — it left spacing 9.5×
uneven and wrecked both the shape and the trim.

## Running it

Needs `@rive-app/canvas` (already in package.json) and headless Chrome. The grid
render is the slow part; tracing all 13 takes a few seconds.

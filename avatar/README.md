# Avatar: low-poly self-portrait for the About page

`aparna.glb` is a PS2-style game character: one mesh of about 3.2k triangles with a single
baked texture atlas, like the nic0martins.com reference (2.7k triangles, one texture). It's a rigged figure (5'4", petite build) in a white boxy tee, dark
wide-leg jeans with cuffs, black loafers and a silver bangle. The face is
projected from a front-facing photo, the pixie cut is generated as chunky
locks, and the arms-down pose is baked in as the rest pose. It's driven on the
web by `framer/AboutAvatar.tsx`.

## Current build: Mixamo base (Ch29), restyled

The live `aparna.glb` comes from the Mixamo character Ch29, restyled into a stylised version of
Aparna and reduced to about 3.5k triangles with one baked texture:

```bash
$B -b --python avatar/build/mx1_clean.py -- avatar/Ch29_nonPBR.fbx avatar/mixamo/mx1.blend   # strip beanie/glasses/accessories, tag regions
$B -b avatar/mixamo/mx1.blend --python avatar/build/mx2_style.py -- $PWD/avatar 3500     # reshape jeans, pixie crown, paint, bake, decimate
$B -b avatar/mixamo/mx2.blend --python avatar/build/export.py -- $PWD/avatar/aparna.glb
```

The painted features (eyes, winged liner, brows, lips) and all the garment detail live in
`mx2_style.py`, section 6. The rig is Mixamo's `mixamorig1:*`, so Mixamo animations for Ch29
drop straight on.

## Earlier build (MPFB body, kept for reference)

Needs Blender 4.3 with the MPFB extension (installed from extensions.blender.org).
All commands run from the repo root; `B=/Applications/Blender.app/Contents/MacOS/Blender`.

```bash
$B -b --python avatar/build/stage1.py -- $PWD/avatar/stage1.blend                    # base body + face shape + Mixamo rig
$B -b --python avatar/build/warp.py -- avatar/photos/face_front.jpg avatar/tex/face_proj.png   # align photo to the head
LOWPOLY=1 $B -b avatar/stage1.blend --python avatar/build/stage2.py -- $PWD/avatar   # dressed high-poly source (single-layer clothes), pose
$B -b avatar/stage2.blend --python avatar/build/stage3.py -- $PWD/avatar 3200        # ~3.2k-tri game mesh + baked texture atlas
$B -b avatar/stage3.blend --python avatar/build/export.py -- $PWD/avatar/aparna.glb  # web model
```

Previews: `$B -b avatar/stage2.blend --python avatar/build/render.py -- /tmp/r front,34,face,face34,back`

## Where to tune

| What | Where |
|---|---|
| Height / build | `stage1.py`, `macro.update(...)` (MPFB macro sliders) |
| Face shape | `stage1.py`, `FACE` dict of MPFB targets |
| Photo ↔ head alignment | `warp.py`, `P` landmark pairs (ortho-render px ↔ photo px) |
| Tee hem, jeans rise, hem length | `stage2.py`, `TEE_HEM, JEANS_TOP, HEM` |
| Tee boxiness / sleeve width | `stage2.py`, tee section (`BUST`, sleeve radius `0.058`) |
| Wide-leg width | `stage2.py`, `want_r = 0.070 + 0.022 * t` |
| Hair length / flow / density | `stage2.py`, lock loop (`L`, `flow`, root spacing `0.0115`) |
| Triangle budget | `stage3.py` CLI arg + `BUDGET` split per part |
| Baked detail (stitching, denim fade, tee folds, hair streaks) | `stage3.py`, `*_mat()` detail shaders |
| Skin tone / face punch | `stage3.py`, `image_mat` contrast + saturation |
| Pose | `stage2.py`, `ARM_DOWN` and the `rot_world` calls |

## Web preview

```bash
npx vite --config avatar/preview/vite.config.js
```
Then open http://localhost:5190/preview/index.html. It loads the real
`framer/AboutAvatar.tsx`, with React and Framer stubbed out.

## Putting it in Framer

1. **Assets → Code → New Code File**, name it `AboutAvatar`, and paste in `framer/AboutAvatar.tsx`.
2. Drag it onto the About page and upload `avatar/aparna.glb` in the **Model** property.
3. Tune in the properties panel: framing (full body / waist up / portrait), start (in view / on load), timings, scatter, facet and edge colours, look-at-cursor strength, drag, wave, shadow.

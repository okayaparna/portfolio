# Mixamo route, step 1: import Ch29, strip accessories + beanie, tag garment regions.
# usage: blender -b --python mx1_clean.py -- <Ch29.fbx> <out.blend>
import bpy, bmesh, sys
import numpy as np
from mathutils import Vector

fbx, out = sys.argv[sys.argv.index("--") + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=fbx)
rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
body = next(o for o in bpy.data.objects if o.type == 'MESH')
body.name = "Char"; rig.name = "Rig"
# (FBX transforms are left as-is — rig rot 90°/scale 0.01 — everything below works in world space)

diff = next(i for i in bpy.data.images if "Diffuse" in i.filepath and i.size[0] > 0)
W, H = diff.size
PX = np.array(diff.pixels[:], dtype=np.float32).reshape(H, W, 4)[..., :3]

me = body.data
M = body.matrix_world
uv = me.uv_layers.active.data

def face_colors(me):
    """texture colour at every polygon's UV centroid, via bulk array reads"""
    uvs = np.zeros(len(me.loops) * 2); me.uv_layers.active.data.foreach_get("uv", uvs); uvs = uvs.reshape(-1, 2)
    ls = np.zeros(len(me.polygons), int); lt = np.zeros(len(me.polygons), int)
    me.polygons.foreach_get("loop_start", ls); me.polygons.foreach_get("loop_total", lt)
    idx = np.repeat(np.arange(len(ls)), lt)
    su = np.bincount(idx, uvs[:, 0]) / lt; sv = np.bincount(idx, uvs[:, 1]) / lt
    return PX[((sv % 1) * (H - 1)).astype(int), ((su % 1) * (W - 1)).astype(int)]

# ---- loose parts: keep the body, eyes, hands, shoes; drop glasses, clips, earrings, charm, buttons, badge, laces
bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
seen, comps = set(), []
for v in bm.verts:
    if v.index in seen: continue
    st, ids = [v], []; seen.add(v.index)
    while st:
        u_ = st.pop(); ids.append(u_)
        for e in u_.link_edges:
            w = e.other_vert(u_)
            if w.index not in seen: seen.add(w.index); st.append(w)
    co = np.array([(M @ x.co)[:] for x in ids]); comps.append((ids, co.min(0), co.max(0)))
kill = set()
for ids, lo, hi in comps:
    n = len(ids); size = hi - lo; c = (lo + hi) / 2
    if n > 5000: continue                                        # main body
    if n > 1000: continue                                        # hands (T-pose)
    if size[2] > 0.12 and c[2] < 0.2: continue                   # shoes
    glasses = c[2] > 1.38 and c[2] < 1.48 and lo[1] < -0.115      # frames / lenses sit in front of the eyes
    eyeish = c[2] > 1.42 and c[2] < 1.47 and lo[1] >= -0.119 and abs(c[0]) < 0.065
    if eyeish and not glasses: continue                          # eyeballs, lids, lashes
    kill.update(ids)
bmesh.ops.delete(bm, geom=list(kill), context='VERTS')
bm.to_mesh(me); bm.free()
print("REMOVED_VERTS", len(kill))

# ---- beanie: pink/black knit faces above the brow line
def is_beanie(col, z):
    r, g, b = col
    pink = r > 0.35 and g < 0.25 and b > 0.15 and r > b
    band = max(r, g, b) < 0.12
    return z > 1.49 and (pink or band)
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
uvlay = bm.loops.layers.uv.active
def bm_color(f):
    u = sum(l[uvlay].uv.x for l in f.loops) / len(f.loops); v = sum(l[uvlay].uv.y for l in f.loops) / len(f.loops)
    return PX[int((v % 1) * (H - 1)), int((u % 1) * (W - 1))]
beanie = [f for f in bm.faces if is_beanie(bm_color(f), (M @ f.calc_center_median()).z)]
print("BEANIE_FACES", len(beanie))
bmesh.ops.delete(bm, geom=beanie, context='FACES_ONLY')
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
bm.to_mesh(me); bm.free()

# ---- tag regions from the original texture colours (vertex colour attribute "region")
REG = {"skin": 0, "hair": 1, "top": 2, "trim": 3, "pants": 4, "sock": 5, "shoe": 6, "eye": 7, "other": 8, "sleeve": 9}
def classify(col, z):
    r, g, b = col; mx, mn = max(col), min(col)
    if z < 0.16 and mx > 0: return "shoe" if z < 0.11 else "sock"
    if b > r * 1.05 and b > g * 1.2 and z < 1.0 and z > 0.1: return "pants"
    if b > r * 0.95 and b > g * 1.1 and z > 1.35: return "hair"
    if mn > 0.62 and mx - mn < 0.12: return "top"
    if r > 0.75 and g / r < 0.7 and b / r < 0.7 and z > 0.9: return "sleeve"
    if r > 0.55 and g < 0.45 and b < 0.55 and r - g > 0.2 and z > 0.9: return "trim"
    if r > 0.6 and g > 0.45 and b > 0.35 and r > g > b: return "skin"
    return "other"
attr = me.color_attributes.new("region", 'FLOAT_COLOR', 'CORNER')
counts = {}
FC = face_colors(me)
import random; random.seed(1)
for p in me.polygons:
    zc = (M @ p.center).z
    k = classify(FC[p.index], zc); counts[k] = counts.get(k, 0) + 1
    val = REG[k] / 10.0
    for li in p.loop_indices: attr.data[li].color = (val, 0, 0, 1)
print("REGIONS", counts)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=out)

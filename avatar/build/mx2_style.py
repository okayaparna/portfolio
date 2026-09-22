# Mixamo route, step 2: restyle Ch29 into "Aparna" and bake a PS2-style low-poly.
#   - removes beanie leftovers / choker, adds a chunky pixie crown
#   - reshapes the cropped trousers into dark wide-leg jeans down to the shoe
#   - repaints: warm skin, black hair, white boxy-cropped tee with short sleeves,
#     dark denim (twill, fade, stitching, cuffs), black loafers, silver bangle,
#     dark-brown eyes, berry lips
#   - decimates to ~TARGET triangles and bakes everything into one texture atlas
# usage: blender -b mx1.blend --python mx2_style.py -- <avatar_dir> [target_tris]
import bpy, bmesh, sys, os, math
import numpy as np
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lplib import srgb, only, tri_count, decimate_to, NB, dashes

args = sys.argv[sys.argv.index("--") + 1:]
AV = args[0]; TARGET = int(args[1]) if len(args) > 1 else 3500
TEX = os.path.join(AV, "tex"); os.makedirs(TEX, exist_ok=True)
ATLAS = 2048
HEM, WAIST, TEE_HEM, SLEEVE_X, NECK_Z = 0.03, 0.997, 1.0, 0.255, 1.30
CAT = dict(skin=0, hair=1, tee=2, jeans=4, shoe=6, silver=7, other=8)

char = bpy.data.objects["Char"]; rig = bpy.data.objects["Rig"]; sc = bpy.context.scene
M = np.array(char.matrix_world); Minv = np.linalg.inv(M)
B = {b.name.split(":")[-1]: (np.array(rig.matrix_world @ b.head_local), np.array(rig.matrix_world @ b.tail_local)) for b in rig.data.bones}
diff = next(i for i in bpy.data.images if "Diffuse" in i.filepath and i.size[0] > 0)

def to_world(c): return c @ M[:3, :3].T + M[:3, 3]
def to_local(c): return c @ Minv[:3, :3].T + Minv[:3, 3]
def get_co(me):
    a = np.zeros(len(me.vertices) * 3); me.vertices.foreach_get("co", a); return to_world(a.reshape(-1, 3))
def set_co(me, w): me.vertices.foreach_set("co", to_local(w).ravel()); me.update()
def ramp(v, e0, e1): return np.clip((v - e0) / (e1 - e0), 0, 1)

def region_of_faces(me):
    reg = me.color_attributes["region"].data
    ls = np.zeros(len(me.polygons), int); me.polygons.foreach_get("loop_start", ls)
    return np.array([round(reg[i].color[0] * 10) for i in ls])

def components(bm):
    bm.verts.ensure_lookup_table()
    comp = np.full(len(bm.verts), -1); cid = 0
    for v in bm.verts:
        if comp[v.index] >= 0: continue
        st = [v]; comp[v.index] = cid
        while st:
            u = st.pop()
            for e in u.link_edges:
                w = e.other_vert(u)
                if comp[w.index] < 0: comp[w.index] = cid; st.append(w)
        cid += 1
    return comp

# ---------------------------------------------------------------- 1. clean-up: beanie leftovers, choker, floating bits
me = char.data
cats = region_of_faces(me)
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
Mw = char.matrix_world
kill = []
for f in bm.faces:
    c = Mw @ f.calc_center_median(); k = cats[f.index]
    if k == 3 and c.z > 1.46: kill.append(f)                                  # knit/trim above the brow
    elif k == 8 and c.z > 1.47 and c.y > -0.06: kill.append(f)                # black band at the back
bmesh.ops.delete(bm, geom=kill, context='FACES_ONLY')
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
comp = components(bm)
small = []
for cid in set(comp.tolist()):
    ids = np.where(comp == cid)[0]
    zs = [(Mw @ bm.verts[i].co).z for i in ids]
    xs = [abs((Mw @ bm.verts[i].co).x) for i in ids]
    if len(ids) < 60 and min(zs) > 1.45: small.extend(bm.verts[i] for i in ids)
    elif len(ids) < 1500 and min(zs) > 1.40 and max(zs) < 1.49 and max(xs) < 0.075: small.extend(bm.verts[i] for i in ids)   # eye lenses / lashes
bmesh.ops.delete(bm, geom=small, context='VERTS')
bm.to_mesh(me); bm.free()
print("CLEANED faces removed", len(kill), "floating verts", len(small))

# ---------------------------------------------------------------- 2. geometry: wide-leg jeans + a little tee ease at the midriff
bm = bmesh.new(); bm.from_mesh(me); comp = components(bm); bm.free()
W = get_co(me)
shoe_comps = {c_ for c_ in set(comp.tolist()) if W[comp == c_, 2].max() < 0.17}
is_shoe_v = np.isin(comp, list(shoe_comps))
main = np.bincount(comp).argmax()
legs = (comp == main) & (W[:, 2] < 0.86) & ~is_shoe_v
for sg, s in ((1, "Left"), (-1, "Right")):
    sel = legs & (np.sign(W[:, 0]) == sg)
    zmin = W[sel, 2].min(); ztop = 0.22
    low = sel & (W[:, 2] < ztop)
    W[low, 2] = HEM + (W[low, 2] - zmin) * (ztop - HEM) / (ztop - zmin)     # lengthen down over the shoe
    a = B[f"{s}UpLeg"][0].copy(); b = B[f"{s}Foot"][0].copy(); b[2] = HEM
    d = b - a; L = np.linalg.norm(d); d /= L
    t = (W[sel] - a) @ d; foot = a + np.outer(t, d); rv = W[sel] - foot; r = np.linalg.norm(rv, axis=1)
    tn = np.clip(t / L, 0, 1)
    want = np.maximum(r, 0.066 + 0.026 * tn)
    blend = ramp(W[sel, 2], 0.80, 0.70)
    f = 1 + (want / np.maximum(r, 1e-4) - 1) * blend
    f *= 1 + 0.08 * ramp(W[sel, 2], HEM + 0.055, HEM + 0.04)                # cuff flare
    W[sel] = foot + rv * f[:, None]
set_co(me, W)
me.update()
N = np.zeros(len(me.vertices) * 3); me.vertices.foreach_get("normal", N); N = N.reshape(-1, 3) @ M[:3, :3].T
N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-9
mid = (comp == main) & (W[:, 2] > WAIST - 0.005) & (W[:, 2] < 1.09) & (np.abs(W[:, 0]) < 0.17)
W[mid] += N[mid] * (0.010 * ramp(W[mid, 2], WAIST - 0.005, 1.03)[:, None])
set_co(me, W)

# ---------------------------------------------------------------- 3. pixie crown over the open skull
hc = np.array([0.0, -0.027, 1.472]); rad = np.array([0.108, 0.119, 0.124])
bpy.ops.mesh.primitive_uv_sphere_add(segments=18, ring_count=12, radius=1.0)
crown = bpy.context.active_object; crown.name = "Crown"
cc = np.array([v.co[:] for v in crown.data.vertices]) * rad + hc
phi = np.abs(np.arctan2(cc[:, 0], -(cc[:, 1] - hc[1])))
cut = np.interp(phi, [0, 0.7, 1.2, 1.7, 2.3, np.pi], [1.50, 1.495, 1.46, 1.44, 1.39, 1.37])
rng = np.random.default_rng(3)
outv = (cc - hc) / rad; outv /= np.linalg.norm(outv, axis=1, keepdims=True)
cc += outv * rng.uniform(-0.004, 0.009, (len(cc), 1)) * (0.4 + ramp(cc[:, 2], 1.5, 1.6))[:, None]
for i, v in enumerate(crown.data.vertices): v.co = cc[i]
bmc = bmesh.new(); bmc.from_mesh(crown.data); bmc.verts.ensure_lookup_table()
bmesh.ops.delete(bmc, geom=[v for v in bmc.verts if v.co.z < cut[v.index]], context='VERTS')
bmc.to_mesh(crown.data); bmc.free()
crown.data.color_attributes.new("region", 'FLOAT_COLOR', 'CORNER')
for d_ in crown.data.color_attributes["region"].data: d_.color = (CAT["hair"] / 10, 0, 0, 1)
crown.vertex_groups.new(name="mixamorig1:Head").add(range(len(crown.data.vertices)), 1.0, 'REPLACE')
while crown.data.uv_layers: crown.data.uv_layers.remove(crown.data.uv_layers[0])
crown.data.uv_layers.new(name=me.uv_layers.active.name)

# ---------------------------------------------------------------- 4. bangle on the left wrist (T-pose: forearm runs along +X)
wrist = B["LeftHand"][0] - np.array([0.028, 0, 0])
bpy.ops.mesh.primitive_torus_add(major_radius=0.031, minor_radius=0.005, major_segments=12, minor_segments=4, location=tuple(wrist), rotation=(0, math.pi / 2, 0))
bangle = bpy.context.active_object; bangle.name = "BangleMX"
bangle.data.color_attributes.new("region", 'FLOAT_COLOR', 'CORNER')
for d_ in bangle.data.color_attributes["region"].data: d_.color = (CAT["silver"] / 10, 0, 0, 1)
bangle.vertex_groups.new(name="mixamorig1:LeftHand").add(range(len(bangle.data.vertices)), 1.0, 'REPLACE')
while bangle.data.uv_layers: bangle.data.uv_layers.remove(bangle.data.uv_layers[0])
bangle.data.uv_layers.new(name=me.uv_layers.active.name)
def uv_spot(cat_id):
    """UV centroid of some existing face of the given category (solid colour after baking)"""
    cats_ = region_of_faces(char.data); uvl = char.data.uv_layers[0].data
    for p in char.data.polygons:
        if cats_[p.index] == cat_id and p.area > 0:
            return sum((uvl[li].uv for li in p.loop_indices), Vector((0, 0))) / p.loop_total
for ob, spot in ((crown, uv_spot(CAT["hair"])), (bangle, uv_spot(2))):
    for d_ in ob.data.uv_layers[0].data: d_.uv = spot
only(char); crown.select_set(True); bangle.select_set(True); bpy.ops.object.join()
me = char.data
while len(me.uv_layers) > 1: me.uv_layers.remove(me.uv_layers[-1])
me.uv_layers[0].active = True; me.uv_layers[0].active_render = True
print('UV_LAYERS', [u.name for u in me.uv_layers])

# ---------------------------------------------------------------- 5. final per-face categories from position + original colour
cats = region_of_faces(me)
bm = bmesh.new(); bm.from_mesh(me); comp = components(bm); bm.free()
W = get_co(me)
shoe_v = np.zeros(len(W), bool)
for c_ in set(comp.tolist()):
    if W[comp == c_, 2].max() < 0.17: shoe_v |= comp == c_
reg = me.color_attributes["region"].data
newcat = []
for p in me.polygons:
    vs = list(p.vertices); c = W[vs].mean(0); k = cats[p.index]; ax = abs(c[0])
    if k in (CAT["hair"], CAT["silver"]): nk = k
    elif shoe_v[vs[0]]: nk = CAT["shoe"]
    elif c[2] < WAIST and ax < 0.2: nk = CAT["jeans"]
    elif TEE_HEM <= c[2] <= NECK_Z + 0.012 and ax < SLEEVE_X and not (c[2] > NECK_Z - 0.02 and ax < 0.065 and k == CAT["skin"]): nk = CAT["tee"]
    elif NECK_Z <= c[2] <= 1.318 and ax < 0.1 and k != CAT["skin"]: nk = CAT["tee"]          # mock-neck collar -> tee rib
    else: nk = CAT["skin"]
    newcat.append(nk)
    for li in p.loop_indices: reg[li].color = (nk / 10, 0, 0, 1)
print("CATS", {k: newcat.count(v) for k, v in CAT.items()})

# ---------------------------------------------------------------- 6. the paint job (baked as emission)
m = bpy.data.materials.new("AparnaPaint"); nb = NB(m)
# region is stored in .r only; read it through a separate-colour
sep = nb.nt.nodes.new("ShaderNodeSeparateColor"); nb.link(nb.attr("region")[0], sep.inputs[0])
catv = nb.m('ROUND', nb.m('MULTIPLY', sep.outputs[0], 10.0))
def is_cat(k): return nb.m('COMPARE', catv, float(k), 0.2)
uvn = nb.nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = char.data.uv_layers[0].name
ti = nb.nt.nodes.new("ShaderNodeTexImage"); ti.image = diff; nb.link(uvn.outputs[0], ti.inputs[0]); orig = ti.outputs[0]
olum = nb.lum(orig)
ax = nb.m('ABSOLUTE', nb.x)
front = nb.clamp01(nb.m('MULTIPLY', nb.ny, -1.0))

# skin: warm tan, keeping Ch29's painted shading as a soft multiplier (flattened where we draw new eyes)
SKIN = srgb((0.76, 0.52, 0.42))
eyeband = nb.AND(nb.band(nb.z, 1.418, 1.478, 0.004), nb.m('LESS_THAN', ax, 0.075))
shade_o = nb.m('ADD', 0.55, nb.m('MULTIPLY', nb.clamp01(nb.m('DIVIDE', olum, 0.78)), 0.45))
skin = nb.mix(eyeband, nb.mul(SKIN, shade_o), SKIN)
col = skin

# drawn features (world space, front of the face)
EX, EZ, EW, EH = 0.040, 1.444, 0.020, 0.0085
dx = nb.m('SUBTRACT', ax, EX); dz = nb.m('SUBTRACT', nb.z, EZ)
u_ = nb.m('DIVIDE', dx, EW)
almond_h = nb.m('MULTIPLY', EH, nb.m('SUBTRACT', 1.0, nb.m('MULTIPLY', nb.m('MULTIPLY', u_, u_), 0.35)))
eye_in = nb.m('LESS_THAN', nb.m('ADD', nb.m('MULTIPLY', u_, u_), nb.m('POWER', nb.m('DIVIDE', dz, almond_h), 2.0)), 1.0)
onface = nb.m('GREATER_THAN', front, 0.35)
eye_in = nb.AND(eye_in, onface)
iris_r = nb.m('SQRT', nb.m('ADD', nb.m('POWER', nb.m('ADD', dx, 0.002), 2.0), nb.m('POWER', nb.m('ADD', dz, 0.0005), 2.0)))
eye = nb.mix(nb.m('LESS_THAN', iris_r, 0.0072), srgb((0.93, 0.91, 0.88)), srgb((0.20, 0.11, 0.07)))
eye = nb.mix(nb.m('LESS_THAN', iris_r, 0.0032), eye, srgb((0.03, 0.02, 0.02)))
hl = nb.m('SQRT', nb.m('ADD', nb.m('POWER', nb.m('SUBTRACT', dx, 0.001), 2.0), nb.m('POWER', nb.m('SUBTRACT', dz, 0.0025), 2.0)))
eye = nb.mix(nb.m('LESS_THAN', hl, 0.0014), eye, srgb((1, 1, 1)))
col = nb.mix(eye_in, col, eye)
# upper lid + winged liner: a band hugging the top of the almond that kicks up past the outer corner
top_edge = nb.m('SUBTRACT', dz, almond_h)
lid = nb.AND(nb.m('LESS_THAN', nb.m('ABSOLUTE', nb.m('SUBTRACT', top_edge, 0.0006)), 0.0019), nb.m('LESS_THAN', nb.m('ABSOLUTE', u_), 1.02))
wx = nb.m('SUBTRACT', dx, EW)                                   # distance past the outer corner
wing_y = nb.m('SUBTRACT', dz, nb.m('MULTIPLY', wx, 0.55))                          # liner rises as it leaves the eye
wing_w = nb.m('MULTIPLY', 0.0019, nb.m('SUBTRACT', 1.0, nb.m('DIVIDE', nb.m('MAXIMUM', wx, 0.0), 0.013)))  # and tapers
wing = nb.AND(nb.m('GREATER_THAN', wx, -0.002), nb.m('LESS_THAN', wx, 0.011), nb.m('LESS_THAN', nb.m('ABSOLUTE', wing_y), wing_w))
low_lid = nb.AND(nb.m('LESS_THAN', nb.m('ABSOLUTE', nb.m('ADD', dz, almond_h)), 0.0007), nb.m('LESS_THAN', nb.m('ABSOLUTE', u_), 0.9))
liner = nb.AND(nb.m('MAXIMUM', nb.m('MAXIMUM', lid, wing), low_lid), onface)
col = nb.mix(liner, col, srgb((0.04, 0.03, 0.03)))
# brows: thick, straight, slight lift at the tail
bx = nb.m('SUBTRACT', ax, 0.019)
brow = nb.AND(nb.m('GREATER_THAN', bx, 0.0), nb.m('LESS_THAN', bx, 0.045),
              nb.m('LESS_THAN', nb.m('ABSOLUTE', nb.m('SUBTRACT', nb.z, nb.m('ADD', 1.466, nb.m('MULTIPLY', nb.m('SINE', nb.m('MULTIPLY', bx, 55.0)), 0.003)))),
                   nb.m('SUBTRACT', 0.0034, nb.m('MULTIPLY', bx, 0.03))), onface)
col = nb.mix(brow, col, srgb((0.07, 0.05, 0.045)))
# lips: berry, fuller lower lip
lx = nb.m('DIVIDE', nb.x, 0.0165); lz = nb.m('SUBTRACT', nb.z, 1.389)
lips = nb.m('LESS_THAN', nb.m('ADD', nb.m('MULTIPLY', lx, lx), nb.m('POWER', nb.m('DIVIDE', lz, nb.m('ADD', 0.0052, nb.m('MULTIPLY', nb.m('LESS_THAN', lz, 0.0), 0.0012))), 2.0)), 1.0)
lips = nb.AND(lips, onface)
lipcol = nb.mix(nb.m('LESS_THAN', nb.m('ABSOLUTE', lz), 0.0006), srgb((0.52, 0.22, 0.26)), srgb((0.30, 0.10, 0.13)))
col = nb.mix(lips, col, lipcol)

# hair: near-black with a few warm streaks; keeps Ch29's strand painting as texture
streak = nb.m('POWER', nb.noise(60, 4), 2.2)
hair = nb.mix(nb.m('MULTIPLY', nb.m('MULTIPLY', streak, nb.clamp01(nb.m('ADD', nb.nz, 0.3))), 0.8), srgb((0.07, 0.055, 0.047)), srgb((0.42, 0.31, 0.24)))
hair = nb.mul(hair, nb.m('ADD', 0.75, nb.m('MULTIPLY', olum, 0.35)))
col = nb.mix(is_cat(CAT["hair"]), col, hair)

# tee: off-white, soft vertical folds, collar rib, hem + sleeve stitching
TEE, FOLD = srgb((0.95, 0.94, 0.92)), srgb((0.80, 0.79, 0.78))
tee = nb.mix(nb.m('MULTIPLY', nb.m('POWER', nb.wave(7, 'X', 2.0), 4.0), 0.16), TEE, FOLD)
tee = nb.mix(nb.m('MULTIPLY', nb.noise(60, 3), 0.07), tee, FOLD)
tee = nb.mix(nb.m('MULTIPLY', nb.band(nb.z, NECK_Z - 0.018, NECK_Z + 0.02, 0.002), 0.35), tee, FOLD)
for z0 in (TEE_HEM + 0.006, TEE_HEM + 0.011):
    tee = nb.mix(nb.m('MULTIPLY', nb.band(nb.z, z0 - 0.0008, z0 + 0.0008, 0.0005), dashes(nb, nb.m('ADD', nb.x, nb.y), 900)), tee, FOLD)
for x0 in (SLEEVE_X - 0.006, SLEEVE_X - 0.011):
    tee = nb.mix(nb.m('MULTIPLY', nb.band(ax, x0 - 0.0008, x0 + 0.0008, 0.0005), dashes(nb, nb.m('ADD', nb.z, nb.y), 900)), tee, FOLD)
col = nb.mix(is_cat(CAT["tee"]), col, tee)

# denim
STITCH = srgb((0.66, 0.47, 0.22))
base, light = srgb((0.07, 0.09, 0.155)), srgb((0.20, 0.25, 0.37))
rot = nb.nt.nodes.new("ShaderNodeVectorRotate"); rot.rotation_type = 'Y_AXIS'; rot.inputs["Angle"].default_value = math.radians(35); nb.link(nb.P, rot.inputs["Vector"])
den = nb.mix(nb.m('MULTIPLY', nb.wave(420, 'X', vec=rot.outputs[0]), 0.10), base, light)
den = nb.mix(nb.m('MULTIPLY', nb.m('SUBTRACT', nb.noise(22, 4), 0.35), 0.35), den, light)
den = nb.mix(nb.m('MULTIPLY', nb.AND(nb.band(nb.z, 0.45, 0.85, 0.12), front), nb.m('MULTIPLY', nb.noise(8, 2), 0.55)), den, light)
den = nb.mix(nb.m('MULTIPLY', nb.m('LESS_THAN', nb.z, HEM + 0.05), 0.7), den, srgb((0.17, 0.21, 0.31)))
den = nb.mix(nb.m('MULTIPLY', nb.band(nb.z, WAIST - 0.04, WAIST, 0.002), 0.25), den, light)
along = nb.m('ADD', nb.x, nb.y)
for z0 in (WAIST - 0.004, WAIST - 0.038, HEM + 0.052, HEM + 0.006):
    den = nb.mix(nb.m('MULTIPLY', nb.band(nb.z, z0 - 0.0012, z0 + 0.0012, 0.0006), dashes(nb, along)), den, STITCH)
side = nb.m('GREATER_THAN', nb.m('MULTIPLY', nb.nx, nb.m('SIGN', nb.x)), 0.997)
den = nb.mix(nb.AND(side, nb.m('LESS_THAN', nb.z, WAIST - 0.04), dashes(nb, nb.z)), den, STITCH)
fly = nb.AND(nb.band(nb.x, 0.014, 0.0165, 0.0005), nb.band(nb.z, 0.84, WAIST - 0.04, 0.002), nb.m('LESS_THAN', nb.ny, -0.4))
den = nb.mix(nb.AND(fly, dashes(nb, nb.z)), den, STITCH)
for sgn in (1, -1):
    px = nb.m('MULTIPLY', nb.x, float(sgn))
    arc = nb.m('ABSOLUTE', nb.m('SUBTRACT', nb.m('SQRT', nb.m('ADD', nb.m('POWER', nb.m('SUBTRACT', px, 0.135), 2.0), nb.m('POWER', nb.m('SUBTRACT', nb.z, WAIST), 2.0))), 0.07))
    den = nb.mix(nb.AND(nb.m('LESS_THAN', arc, 0.0012), nb.m('LESS_THAN', nb.ny, -0.3), nb.m('GREATER_THAN', px, 0.03)), den, STITCH)
col = nb.mix(is_cat(CAT["jeans"]), col, den)

# loafers
shoe = nb.mix(nb.m('MULTIPLY', nb.clamp01(nb.m('SUBTRACT', nb.nz, 0.45)), 0.9), srgb((0.035, 0.035, 0.04)), srgb((0.32, 0.32, 0.34)))
shoe = nb.mix(nb.m('LESS_THAN', nb.z, 0.013), shoe, srgb((0.09, 0.07, 0.06)))
col = nb.mix(is_cat(CAT["shoe"]), col, shoe)
col = nb.mix(is_cat(CAT["silver"]), col, srgb((0.80, 0.80, 0.82)))

shade = nb.m('ADD', 0.4, nb.m('MULTIPLY', nb.ao(0.05), 0.6))
shade = nb.m('MULTIPLY', shade, nb.m('ADD', 0.86, nb.m('MULTIPLY', nb.nz, 0.14)))
nb.finish(col, shade)
char.data.materials.clear(); char.data.materials.append(m)

# ---------------------------------------------------------------- 7. bake the paint into Ch29's own UV layout, then decimate
# (self-bake, no ray projection: layered eyes/lids/clothes can't confuse it)
atlas = bpy.data.images.new("aparna_atlas", ATLAS, ATLAS)
tn = m.node_tree.nodes.new("ShaderNodeTexImage"); tn.image = atlas
uvb = m.node_tree.nodes.new("ShaderNodeUVMap"); uvb.uv_map = char.data.uv_layers[0].name
m.node_tree.links.new(uvb.outputs[0], tn.inputs[0]); m.node_tree.nodes.active = tn
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 32
sc.render.bake.use_selected_to_active = False; sc.render.bake.margin = 8
only(char)
bpy.ops.object.bake(type='EMIT')
atlas.filepath_raw = os.path.join(TEX, "aparna_atlas.png"); atlas.file_format = 'PNG'; atlas.save()
low = char; low.name = "Aparna"
final = bpy.data.materials.new("aparna_skin"); final.use_nodes = True; final.use_backface_culling = False
p_ = final.node_tree.nodes["Principled BSDF"]; t_ = final.node_tree.nodes.new("ShaderNodeTexImage"); t_.image = atlas
final.node_tree.links.new(t_.outputs[0], p_.inputs["Base Color"]); p_.inputs["Roughness"].default_value = 0.85
low.data.materials.clear(); low.data.materials.append(final)
if "region" in low.data.color_attributes: low.data.color_attributes.remove(low.data.color_attributes["region"])
low.data.polygons.foreach_set("use_smooth", [True] * len(low.data.polygons))
decimate_to(low, TARGET)
for im in list(bpy.data.images):
    if im is not atlas: bpy.data.images.remove(im)
sc.render.engine = 'BLENDER_EEVEE_NEXT'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(AV, "mixamo", "mx2.blend"))
print("MX2_DONE tris", tri_count(low))

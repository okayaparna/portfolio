# Stage 2: split helpers, build clothes + hair, project face, pose, bake, export.
# usage: blender -b stage1.blend --python stage2.py -- <avatar_dir>
import bpy, bmesh, sys, os, math
import numpy as np
from mathutils import Vector, Matrix

AV = sys.argv[sys.argv.index("--") + 1]
TEX = os.path.join(AV, "tex"); os.makedirs(TEX, exist_ok=True)

def srgb(c): return tuple(((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c) + (1.0,)

SKIN = srgb((0.74, 0.50, 0.41))
FACE_CZ, FACE_OS = 1.53, 0.30        # ortho camera centre / scale the face projection was made for

body = bpy.data.objects["Body"]; rig = body.parent
bpy.context.view_layer.objects.active = body
body.select_set(True)
if body.data.shape_keys:
    bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
body.modifiers.remove(body.modifiers["Hide helpers"])

B = {b.name.replace("mixamorig:", ""): (rig.matrix_world @ b.head_local, rig.matrix_world @ b.tail_local) for b in rig.data.bones}

# ---------------------------------------------------------------- helpers
def vg_index(obj, name): return obj.vertex_groups[name].index

def weights(obj):
    """dominant bone name per vertex + raw group membership sets"""
    names = {g.index: g.name for g in obj.vertex_groups}
    dom, member = [], []
    for v in obj.data.vertices:
        best, bw, mem = None, 0, set()
        for g in v.groups:
            n = names[g.group]
            if g.weight > 0.3: mem.add(n)
            if n.startswith("mixamorig:") and g.weight > bw: best, bw = n[10:], g.weight
        dom.append(best); member.append(mem)
    return dom, member

def dup_keep(src, name, keep):
    """duplicate src keeping only vertices where keep[i] is True"""
    me = src.data.copy(); ob = src.copy(); ob.data = me; ob.name = name
    bpy.context.collection.objects.link(ob)
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not keep[v.index]], context='VERTS')
    bm.to_mesh(me); bm.free()
    return ob

def delete_verts(ob, kill):
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if kill[v.index]], context='VERTS')
    bm.to_mesh(ob.data); bm.free()

def coords(ob):
    a = np.zeros(len(ob.data.vertices) * 3); ob.data.vertices.foreach_get("co", a); return a.reshape(-1, 3)
def set_coords(ob, c): ob.data.vertices.foreach_set("co", c.ravel()); ob.data.update()
def normals(ob):
    ob.data.update(); a = np.zeros(len(ob.data.vertices) * 3); ob.data.vertices.foreach_get("normal", a); return a.reshape(-1, 3)

def mat(name, color, rough=0.6, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = color; p.inputs["Roughness"].default_value = rough; p.inputs["Metallic"].default_value = metal
    return m

def set_mat(ob, m): ob.data.materials.clear(); ob.data.materials.append(m)

def axis_param(P, a, b):
    """param t along segment a->b and radial vector from the axis"""
    a, b = np.array(a), np.array(b); d = b - a; L = np.linalg.norm(d); d /= L
    t = (P - a) @ d
    foot = a + np.outer(t, d)
    return t / L, P - foot, foot

def smooth(x, e0, e1):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

# ---------------------------------------------------------------- split helpers off the base mesh
dom, mem = weights(body)
N = len(dom)
is_body = np.array(["body" in m for m in mem])
is_eye = np.array([("helper-l-eye" in m) or ("helper-r-eye" in m) for m in mem])
eyes = dup_keep(body, "Eyes", is_eye)

P = coords(body)
Z = P[:, 2]
TEE_HEM, JEANS_TOP, HEM = 1.035, 1.045, 0.028
side = np.sign(P[:, 0])

def is_(names): return np.array([d in names for d in dom])

torso_b = is_({"Spine", "Spine1", "Spine2", "LeftShoulder", "RightShoulder", "Hips"})
uparm_l, uparm_r = is_({"LeftArm"}), is_({"RightArm"})
leg_b = is_({"Hips", "LeftUpLeg", "RightUpLeg", "LeftLeg", "RightLeg"})
foot_b = is_({"LeftFoot", "RightFoot", "LeftToeBase", "RightToeBase"}) | (np.array([d is not None and ("Toe" in d) for d in dom]))
head_b = is_({"Head", "HeadTop_End", "Neck"})

# sleeve extent along the upper arm
def arm_t(s):
    a, b = B[f"{s}Arm"]; return axis_param(P, a, b)[0]
tl, tr = arm_t("Left"), arm_t("Right")
neck_axis_r = np.hypot(P[:, 0] - B["Neck"][0].x, P[:, 1] - B["Neck"][0].y)
neckline = (Z > B["Neck"][0].z - 0.035) & (neck_axis_r < 0.068)
tee_sel = is_body & ((torso_b & (Z >= TEE_HEM)) | (uparm_l & (tl < 0.62)) | (uparm_r & (tr < 0.62))) & ~neckline & ~head_b
jeans_sel = is_body & (leg_b | torso_b) & (Z <= JEANS_TOP) & (Z < 1.2)
feet_sel = is_body & foot_b

VN = [[] for _ in range(N)]
for e in body.data.edges:
    a_, b_ = e.vertices; VN[a_].append(b_); VN[b_].append(a_)
def close_holes(sel, iters=3):
    sel = sel.copy()
    for _ in range(iters):
        add = [i for i in range(N) if not sel[i] and VN[i] and np.mean([sel[j] for j in VN[i]]) >= 0.5]
        if not add: break
        sel[add] = True
    return sel
is_nip = np.array([bool({'nipple', 'nippleTip'} & m) for m in mem])
tee_sel = close_holes(tee_sel) & ~neckline & ~is_nip
jeans_sel = close_holes(jeans_sel)
tee = dup_keep(body, "Tee", tee_sel)
bm = bmesh.new(); bm.from_mesh(tee.data)
bmesh.ops.holes_fill(bm, edges=bm.edges[:], sides=24)
bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
bmesh.ops.subdivide_edges(bm, edges=[e for e in bm.edges if any(len(f.verts) == 3 for f in e.link_faces)], cuts=1, use_grid_fill=True)
bm.to_mesh(tee.data); bm.free()
jeans = dup_keep(body, "Jeans", jeans_sel)
shoes = dup_keep(body, "Shoes", feet_sel)

# ---------------------------------------------------------------- tee: boxy, straight fall from the bust
from mathutils.bvhtree import BVHTree
body_bvh = BVHTree.FromPolygons([tuple(v) for v in P], [tuple(p.vertices) for p in body.data.polygons if not any(is_nip[v] for v in p.vertices)])
def smooth_shell(ob, sel, iters, off):
    c = coords(ob); nbrs = [[] for _ in range(len(c))]
    for e in ob.data.edges:
        a, b_ = e.vertices; nbrs[a].append(b_); nbrs[b_].append(a)
    bnd = np.zeros(len(c), bool)
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.verts.ensure_lookup_table()
    for v in bm.verts: bnd[v.index] = v.is_boundary
    bm.free()
    idx = np.where(sel & ~bnd)[0]
    for _ in range(iters):
        m = np.array([c[nbrs[i]].mean(0) for i in idx]); c[idx] = c[idx] * 0.3 + m * 0.7
    set_coords(ob, c)
tc = coords(tee)
smooth_shell(tee, (tc[:, 2] > 1.0) & (tc[:, 2] < 1.36) & (np.abs(tc[:, 0]) < 0.17), 30, 0.009)
c = coords(tee); n = normals(tee)
spine_x, spine_y = 0.0, -0.02
ang = np.arctan2(c[:, 0] - spine_x, -(c[:, 1] - spine_y))
rad = np.hypot(c[:, 0] - spine_x, c[:, 1] - spine_y)
armish = np.zeros(len(c), bool)
for s in ("Left", "Right"):
    a, b = B[f"{s}Arm"]; t, rv, foot = axis_param(c, a, b)
    armish |= (t > 0.05) & (np.linalg.norm(rv, axis=1) < 0.09)
BUST = 1.22
nb = 72; bins = ((ang + np.pi) / (2 * np.pi) * nb).astype(int) % nb
torso_v = ~armish & (np.abs(c[:, 0]) < 0.19)
for k in range(nb):
    idx = np.where((bins == k) & torso_v)[0]
    if len(idx) == 0: continue
    ref = idx[(c[idx, 2] > BUST - 0.06) & (c[idx, 2] < BUST + 0.03)]
    rmax = rad[ref].max() if len(ref) else rad[idx].max()
    low = idx[c[idx, 2] < BUST + 0.03]
    want = np.maximum(rad[low], rmax * 1.02 + 0.004)
    w = smooth(c[low, 2], BUST + 0.03, BUST - 0.06)
    f = 1 + (want / np.maximum(rad[low], 1e-4) - 1) * w
    c[low, 0] = spine_x + (c[low, 0] - spine_x) * f
    c[low, 1] = spine_y + (c[low, 1] - spine_y) * f
# boxy sleeves: widen around the upper-arm axis
for s in ("Left", "Right"):
    a, b = B[f"{s}Arm"]; t, rv, foot = axis_param(c, a, b)
    r = np.linalg.norm(rv, axis=1); sel = (t > -0.05) & (r < 0.1) & (np.sign(c[:, 0]) == (1 if s == "Left" else -1))
    w = smooth(t, -0.05, 0.25)
    want = np.maximum(r, 0.058)
    f = 1 + (want / np.maximum(r, 1e-4) - 1) * w
    c[sel] = foot[sel] + rv[sel] * f[sel, None]
set_coords(tee, c)

# ---------------------------------------------------------------- jeans: wide leg, lengthened to the hem
c = coords(jeans); n = normals(jeans)
c += n * 0.008
knee_z = B["LeftLeg"][0].z
for s, sg in (("Left", 1), ("Right", -1)):
    top = np.array(B[f"{s}UpLeg"][0]); ank = np.array(B[f"{s}Foot"][0]); ank[2] = HEM
    sel = (np.sign(c[:, 0]) == sg) & (c[:, 2] < 0.80)
    # lengthen the lower leg so the shell reaches the hem
    zmin = c[sel, 2].min()
    low = sel & (c[:, 2] < knee_z)
    c[low, 2] = HEM + (c[low, 2] - zmin) * (knee_z - HEM) / (knee_z - zmin)
    t, rv, foot = axis_param(c, top, ank)
    r = np.linalg.norm(rv, axis=1)
    want_r = 0.070 + 0.022 * np.clip(t, 0, 1)            # wide, slightly flaring towards the hem
    blend = smooth(c[:, 2], 0.80, 0.70)                  # hips keep the body shape
    want = np.maximum(r, want_r)
    f = 1 + (want / np.maximum(r, 1e-4) - 1) * blend
    cuff = smooth(c[:, 2], HEM + 0.055, HEM + 0.045) * 0.10
    f = f * (1 + cuff)
    c[sel] = foot[sel] + rv[sel] * f[sel, None]
set_coords(jeans, c)
# cuff material index
jm_body = mat("Denim", srgb((0.055, 0.07, 0.125)), 0.9)
jm_cuff = mat("DenimCuff", srgb((0.12, 0.15, 0.24)), 0.9)
jeans.data.materials.clear(); jeans.data.materials.append(jm_body); jeans.data.materials.append(jm_cuff)
for p in jeans.data.polygons:
    p.material_index = 1 if p.center.z < HEM + 0.05 else 0

# ---------------------------------------------------------------- loafers
c = coords(shoes); n = normals(shoes)
c += n * 0.006
c[:, 2] = np.maximum(c[:, 2], 0.0)
c[c[:, 2] < 0.012, 2] = 0.0
set_coords(shoes, c)

# ---------------------------------------------------------------- hair: thin cap + chunky low-poly locks
from mathutils.bvhtree import BVHTree
phi = np.arctan2(P[:, 0], -(P[:, 1] - B["Head"][0].y))          # 0 = front, +-pi = back
aphi = np.abs(phi)
BROW, EYE, EAR_TOP, NAPE = 1.574, 1.562, 1.565, B["Neck"][0].z + 0.035
cut = np.interp(aphi, [0, 0.45, 0.8, 1.15, 1.5, 2.1, 2.6, np.pi], [1.615, 1.61, 1.595, 1.565, EAR_TOP + 0.01, 1.545, 1.51, 1.50])
is_ear = np.array(["ears" in m for m in mem])
hair_sel = is_body & head_b & (Z > cut) & ~is_ear
hair = dup_keep(body, "Hair", hair_sel)
c = coords(hair); c += normals(hair) * 0.004; set_coords(hair, c)
for md in [m for m in hair.modifiers if m.type != 'ARMATURE']: hair.modifiers.remove(md)

BN = normals(body)
bvh = BVHTree.FromPolygons([tuple(v) for v in P], [tuple(p.vertices) for p in body.data.polygons])
rng = np.random.default_rng(11)
cand = np.where(hair_sel)[0]; rng.shuffle(cand)
roots = []
for vi in cand:
    q = P[vi]
    if all(np.linalg.norm(q - P[r]) > 0.0115 for r in roots): roots.append(vi)
HC = np.array(B["Head"][0]); HC[2] = 1.575
verts, faces = [], []
def add_lock(p0, n0, L, w0, flow, maxo, nseg=5):
    pts = [p0.copy()]; d = n0 * 0.5 + flow * 0.8; d /= np.linalg.norm(d); p = p0.copy()
    for k in range(nseg):
        d = d + flow * 0.55 + np.array([0, 0, -0.18]) * (k / nseg); d /= np.linalg.norm(d)
        p = p + d * (L / nseg)
        hit = bvh.find_nearest(Vector(p))
        if hit[0] is not None:
            loc, nrm = np.array(hit[0]), np.array(hit[1])
            h = (p - loc) @ nrm
            minoff = 0.008 + 0.003 * (1 - k / nseg)
            maxoff = maxo * (1 - 0.5 * k / nseg) + 0.008
            if h < minoff: p = p + nrm * (minoff - h)
            elif h > maxoff: p = p - nrm * (h - maxoff)
            d = d - nrm * (d @ nrm) * 0.6; d /= np.linalg.norm(d)
        # keep the fringe above the brows
        if p[1] < -0.02 and abs(p[0]) < 0.075 and p[2] < BROW + 0.006: break
        pts.append(p.copy())
    if len(pts) < 3: return
    base = len(verts)
    for k, q in enumerate(pts):
        t = k / (len(pts) - 1)
        tan = pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)]; tan /= np.linalg.norm(tan)
        out = q - HC; out /= np.linalg.norm(out)
        side_ = np.cross(tan, out); side_ /= np.linalg.norm(side_)
        up = np.cross(side_, tan)
        w = w0 * (1 - 0.6 * t ** 1.3) + 0.0008; th = w * 0.45
        if k == len(pts) - 1:
            verts.append(tuple(q)); continue
        for (a, b_) in ((1, 0), (0, 1), (-1, 0), (0, -1)):
            verts.append(tuple(q + side_ * a * w + up * b_ * th))
    nr = len(pts) - 1
    for k in range(nr - 1):
        for e in range(4):
            a0 = base + k * 4 + e; a1 = base + k * 4 + (e + 1) % 4
            faces.append((a0, a1, a1 + 4, a0 + 4))
    tip = base + nr * 4
    for e in range(4):
        faces.append((base + (nr - 1) * 4 + e, base + (nr - 1) * 4 + (e + 1) % 4, tip))
for vi in roots:
    q = P[vi]; nn = BN[vi]; ph = abs(math.atan2(q[0], -(q[1] - B["Head"][0].y))); z = q[2]
    out = q - HC; out[2] = 0; out /= (np.linalg.norm(out) + 1e-6)
    if z > 1.635:                                   # crown: long, swept forward and out over the fringe
        L = rng.uniform(0.075, 0.10); flow = np.array([0, -0.85, -0.35]) + out * 0.2; maxo = 0.024
    elif ph < 0.9:                                  # hairline: fringe falling down to the brows
        L = rng.uniform(0.05, 0.065); flow = np.array([0, -0.45, -1.0]); maxo = 0.014
    elif ph < 2.3:                                  # sides: over the top of the ears, a little forward
        L = rng.uniform(0.045, 0.06); flow = np.array([0, -0.4, -1.0]); maxo = 0.010
    else:                                           # back and nape: wispy, longer at the neck
        L = rng.uniform(0.05, 0.065) ; flow = np.array([0, 0.15, -1.0]); maxo = 0.012
    flow = flow + rng.normal(0, 0.07, 3); flow /= np.linalg.norm(flow)
    add_lock(q + nn * 0.003, nn, L, rng.uniform(0.013, 0.019), flow, maxo, 4)
lm = bpy.data.meshes.new("Locks"); lm.from_pydata(verts, [], faces); lm.update(); lm.polygons.foreach_set("use_smooth", [False] * len(lm.polygons))
locks = bpy.data.objects.new("HairLocks", lm); bpy.context.collection.objects.link(locks)
locks.parent = rig
locks.vertex_groups.new(name="mixamorig:Head").add(range(len(verts)), 1.0, 'REPLACE')
locks.modifiers.new("Armature", 'ARMATURE').object = rig
print("LOCKS", len(roots), len(faces))

# ---------------------------------------------------------------- remove skin hidden under clothes
def region_interior(sel):
    kill = sel.copy()
    for p in body.data.polygons:
        vs = list(p.vertices)
        if not all(sel[v] for v in vs):
            for v in vs: kill[v] = False
    return kill
kill = is_nip | region_interior(tee_sel) | region_interior(jeans_sel) | feet_sel | (region_interior(hair_sel) & (Z > 1.60)) | ~(is_body)
kill &= ~is_eye
delete_verts(body, kill)
uv = body.data.uv_layers.active.data
bdom, _ = weights(body)
for p in body.data.polygons:
    if all(bdom[v] in ("Head", "HeadTop_End", "Neck") for v in p.vertices):
        for li in p.loop_indices: uv[li].uv *= 3.0
bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); bpy.context.view_layer.objects.active = body
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.select_all(action='SELECT')
bpy.ops.uv.pack_islands(margin=0.004, rotate=True); bpy.ops.object.mode_set(mode='OBJECT')

# ---------------------------------------------------------------- bangle on the left wrist
a, b = B["LeftHand"]; fa, fb = B["LeftForeArm"]
d = (Vector(fb) - Vector(fa)).normalized()
wrist = Vector(fb) - d * 0.03
bpy.ops.mesh.primitive_torus_add(major_radius=0.034, minor_radius=0.004, major_segments=32, minor_segments=8, location=wrist)
bangle = bpy.context.active_object; bangle.name = "Bangle"
bangle.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# ---------------------------------------------------------------- materials
set_mat(tee, mat("Tee", srgb((0.93, 0.92, 0.90)), 0.9))
set_mat(shoes, mat("Loafer", srgb((0.03, 0.03, 0.03)), 0.25))
hair_m = mat("Hair", srgb((0.06, 0.048, 0.042)), 0.62); set_mat(hair, hair_m); set_mat(locks, hair_m)
set_mat(bangle, mat("Silver", srgb((0.85, 0.85, 0.86)), 0.22, 1.0))
for ob in (tee, jeans, shoes, bangle): ob.data.polygons.foreach_set("use_smooth", [True] * len(ob.data.polygons))

# face projection: object coords -> ortho image uv
face_img = bpy.data.images.load(os.path.join(TEX, "face_proj.png"))
def proj_nodes(m, masked):
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission")
    tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    def math_(op, a, b):
        n_ = nt.nodes.new("ShaderNodeMath"); n_.operation = op
        for i, v in enumerate((a, b)):
            if isinstance(v, (int, float)): n_.inputs[i].default_value = v
            else: nt.links.new(v, n_.inputs[i])
        return n_.outputs[0]
    u = math_('ADD', math_('DIVIDE', sep.outputs[0], FACE_OS), 0.5)
    v = math_('ADD', math_('DIVIDE', math_('SUBTRACT', sep.outputs[2], FACE_CZ), FACE_OS), 0.5)
    comb = nt.nodes.new("ShaderNodeCombineXYZ"); nt.links.new(u, comb.inputs[0]); nt.links.new(v, comb.inputs[1])
    im = nt.nodes.new("ShaderNodeTexImage"); im.image = face_img; im.extension = 'EXTEND'
    nt.links.new(comb.outputs[0], im.inputs[0])
    col = im.outputs[0]
    if masked:
        # ellipse in image space (ortho px / 600): centre (298,312), radii (108,150)
        du = math_('DIVIDE', math_('SUBTRACT', u, 298 / 600), 108 / 600)
        dv = math_('DIVIDE', math_('SUBTRACT', v, 1 - 312 / 600), 150 / 600)
        r = math_('SQRT', math_('ADD', math_('MULTIPLY', du, du), math_('MULTIPLY', dv, dv)), 0)
        m1 = math_('SUBTRACT', 1.0, math_('MINIMUM', 1.0, math_('MAXIMUM', 0.0, math_('DIVIDE', math_('SUBTRACT', r, 0.72), 0.28))))
        geo = nt.nodes.new("ShaderNodeNewGeometry"); sn = nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(geo.outputs["Normal"], sn.inputs[0])
        facing = math_('MINIMUM', 1.0, math_('MAXIMUM', 0.0, math_('DIVIDE', math_('SUBTRACT', math_('MULTIPLY', sn.outputs[1], -1.0), 0.45), 0.3)))
        inner = math_('SUBTRACT', 1.0, math_('MINIMUM', 1.0, math_('MAXIMUM', 0.0, math_('DIVIDE', math_('SUBTRACT', r, 0.55), 0.2))))
        mask = math_('MULTIPLY', math_('MULTIPLY', m1, math_('MAXIMUM', facing, inner)), im.outputs[1])
        mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = 'RGBA'
        nt.links.new(mask, mix.inputs[0]); mix.inputs[6].default_value = SKIN; nt.links.new(col, mix.inputs[7])
        col = mix.outputs[2]
    nt.links.new(col, em.inputs[0]); nt.links.new(em.outputs[0], out.inputs[0])
    return im

skin_bake = bpy.data.materials.new("SkinBake"); skin_bake.use_nodes = True; proj_nodes(skin_bake, True)
set_mat(body, skin_bake)
eye_bake = bpy.data.materials.new("EyeBake"); eye_bake.use_nodes = True; proj_nodes(eye_bake, False)
set_mat(eyes, eye_bake)

# eyes: their helper UVs overlap (both eyes share one island) - give them their own layout
while eyes.data.uv_layers: eyes.data.uv_layers.remove(eyes.data.uv_layers[0])
eyes.data.uv_layers.new(name="UVMap")
bpy.ops.object.select_all(action='DESELECT'); eyes.select_set(True); bpy.context.view_layer.objects.active = eyes
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.smart_project(island_margin=0.02); bpy.ops.object.mode_set(mode='OBJECT')

bangle.parent = rig
bangle.vertex_groups.new(name="mixamorig:LeftHand").add(range(len(bangle.data.vertices)), 1.0, 'REPLACE')
bangle.modifiers.new("Armature", 'ARMATURE').object = rig

# ---------------------------------------------------------------- bake body texture (before posing; emission bake is pose-independent)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.samples = 4; sc.cycles.device = 'CPU'
def bake(ob, name, size):
    img = bpy.data.images.new(name, size, size); img.colorspace_settings.name = 'sRGB'
    m = ob.data.materials[0]; tn = m.node_tree.nodes.new("ShaderNodeTexImage"); tn.image = img
    m.node_tree.nodes.active = tn
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    sc.render.bake.margin = 8
    bpy.ops.object.bake(type='EMIT')
    img.filepath_raw = os.path.join(TEX, name + ".png"); img.file_format = 'PNG'; img.save()
    m.node_tree.nodes.remove(tn)
    return img
body_img = bake(body, "body_color", 2048)
eye_img = bake(eyes, "eye_color", 512)

def textured(name, img, rough):
    m = bpy.data.materials.new(name); m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]; t = m.node_tree.nodes.new("ShaderNodeTexImage"); t.image = img
    m.node_tree.links.new(t.outputs[0], p.inputs["Base Color"]); p.inputs["Roughness"].default_value = rough
    return m
set_mat(body, textured("Skin", body_img, 0.55))
set_mat(eyes, textured("Eyes", eye_img, 0.45))

# ---------------------------------------------------------------- tidy clothing edges, give them thickness
def relax_boundary(ob, iters=6):
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bverts = [v for v in bm.verts if v.is_boundary]
    for _ in range(iters):
        new = {}
        for v in bverts:
            nb = [e.other_vert(v) for e in v.link_edges if e.is_boundary]
            if len(nb) == 2: new[v] = v.co * 0.5 + (nb[0].co + nb[1].co) * 0.25
        for v, co in new.items(): v.co = co
    bm.to_mesh(ob.data); bm.free()
for ob in (tee, jeans, shoes):
    relax_boundary(ob)
    if not os.environ.get("LOWPOLY"):   # the low-poly build wants single-layer shells (double-sided material)
        so = ob.modifiers.new("thick", 'SOLIDIFY'); so.thickness = 0.004; so.offset = 1; so.use_rim = True
for ob in (tee, jeans, shoes, hair):
    for md in list(ob.modifiers):
        if md.type == 'ARMATURE': continue
        bpy.context.view_layer.objects.active = ob; bpy.ops.object.modifier_apply(modifier=md.name)
for ob in (tee, jeans, shoes, bangle):
    ob.data.polygons.foreach_set("use_smooth", [True] * len(ob.data.polygons))

# ---------------------------------------------------------------- relaxed pose baked in as the rest pose
ARM_DOWN = math.radians(27)
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active = rig; rig.select_set(True); bpy.ops.object.mode_set(mode='POSE')
pb = rig.pose.bones
def rot_world(bn, axis, ang):
    b = pb["mixamorig:" + bn]; M = b.matrix.copy(); h = M.translation.copy()
    b.matrix = Matrix.Translation(h) @ Matrix.Rotation(ang, 4, axis) @ Matrix.Translation(-h) @ M
    bpy.context.view_layer.update()
rot_world("LeftArm", 'Y', ARM_DOWN); rot_world("RightArm", 'Y', -ARM_DOWN)
rot_world("LeftForeArm", 'Y', math.radians(8)); rot_world("RightForeArm", 'Y', -math.radians(8))
rot_world("LeftHand", 'Y', math.radians(10)); rot_world("RightHand", 'Y', -math.radians(10))
# relaxed half-fists: curl every finger joint about its own bend axis
for side in ("Left", "Right"):
    for f in ("Index", "Middle", "Ring", "Pinky"):
        for k, deg in ((1, 38), (2, 55), (3, 40)):
            bn = pb.get(f"mixamorig:{side}Hand{f}{k}")
            if bn: bn.rotation_mode = 'XYZ'; bn.rotation_euler.x += math.radians(deg); bpy.context.view_layer.update()
    for k, deg in ((2, 15), (3, 20)):
        bn = pb.get(f"mixamorig:{side}HandThumb{k}")
        if bn: bn.rotation_mode = 'XYZ'; bn.rotation_euler.x += math.radians(deg); bpy.context.view_layer.update()
bpy.ops.object.mode_set(mode='OBJECT')
skinned = [o for o in bpy.data.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)]
for ob in skinned:
    bpy.context.view_layer.objects.active = ob
    md = next(m for m in ob.modifiers if m.type == 'ARMATURE'); bpy.ops.object.modifier_apply(modifier=md.name)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='POSE')
bpy.ops.pose.select_all(action='SELECT'); bpy.ops.pose.armature_apply(selected=False)
bpy.ops.object.mode_set(mode='OBJECT')
for ob in skinned:
    ob.modifiers.new("Armature", 'ARMATURE').object = rig

sc.render.engine = 'BLENDER_EEVEE_NEXT'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(AV, "stage2.blend"))
print("STAGE2_DONE", {o.name: len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH'})

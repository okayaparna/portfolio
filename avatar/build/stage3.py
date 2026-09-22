# Stage 3: turn the dressed high-poly figure into a PS2-style game character —
# one ~3k-triangle mesh, one texture atlas with all detail (face, seams, denim,
# folds, shading) baked in, re-skinned to the same rig.
# usage: blender -b stage2.blend --python stage3.py -- <avatar_dir> [target_tris]
import bpy, bmesh, sys, os, math
import numpy as np
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:]
AV = args[0]; TARGET = int(args[1]) if len(args) > 1 else 3200
TEX = os.path.join(AV, "tex")
ATLAS = 2048

def srgb(c): return tuple(((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c) + (1.0,)

rig = bpy.data.objects["Body.rig"]
HIGH = [bpy.data.objects[n] for n in ("Body", "Eyes", "Hair", "HairLocks", "Tee", "Jeans", "Shoes", "Bangle")]
B = {b.name.replace("mixamorig:", ""): (rig.matrix_world @ b.head_local, rig.matrix_world @ b.tail_local) for b in rig.data.bones}
sc = bpy.context.scene

def only(ob):
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob

def baked_copy(ob, name):
    """evaluated (modifier-applied) copy with no modifiers / parent"""
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    c = bpy.data.objects.new(name, me); sc.collection.objects.link(c); c.matrix_world = ob.matrix_world.copy()
    return c

# ---------------------------------------------------------------- detail shaders on the high-poly (baked as emission)
class NB:
    def __init__(self, m):
        m.use_nodes = True; self.nt = m.node_tree; self.nt.nodes.clear()
        self.out = self.nt.nodes.new("ShaderNodeOutputMaterial"); self.em = self.nt.nodes.new("ShaderNodeEmission")
        self.nt.links.new(self.em.outputs[0], self.out.inputs[0])
        tc = self.nt.nodes.new("ShaderNodeTexCoord"); self.obj = tc.outputs["Object"]
        g = self.nt.nodes.new("ShaderNodeNewGeometry"); self.N = g.outputs["Normal"]
        s = self.nt.nodes.new("ShaderNodeSeparateXYZ"); self.link(self.obj, s.inputs[0]); self.x, self.y, self.z = s.outputs
        s2 = self.nt.nodes.new("ShaderNodeSeparateXYZ"); self.link(self.N, s2.inputs[0]); self.nx, self.ny, self.nz = s2.outputs
    def link(self, a, b): self.nt.links.new(a, b)
    def m(self, op, a, b=0.0, c=None):
        n = self.nt.nodes.new("ShaderNodeMath"); n.operation = op
        for i, v in enumerate((a, b) if c is None else (a, b, c)):
            if isinstance(v, (int, float)): n.inputs[i].default_value = v
            else: self.link(v, n.inputs[i])
        return n.outputs[0]
    def band(self, v, lo, hi, soft=0.0008):
        """1 inside [lo,hi] along scalar v"""
        a = self.m('SMOOTH_MIN', 1.0, self.m('MAXIMUM', 0.0, self.m('DIVIDE', self.m('SUBTRACT', v, lo - soft), soft * 2)), 0.0)
        b = self.m('MINIMUM', 1.0, self.m('MAXIMUM', 0.0, self.m('DIVIDE', self.m('SUBTRACT', hi + soft, v), soft * 2)))
        return self.m('MULTIPLY', self.m('MINIMUM', 1.0, a), b)
    def mix(self, fac, a, b):
        n = self.nt.nodes.new("ShaderNodeMix"); n.data_type = 'RGBA'
        self.link(fac, n.inputs[0]) if not isinstance(fac, (int, float)) else setattr(n.inputs[0], "default_value", fac)
        for i, v in ((6, a), (7, b)):
            if isinstance(v, tuple): n.inputs[i].default_value = v
            else: self.link(v, n.inputs[i])
        return n.outputs[2]
    def mul(self, col, f):
        n = self.nt.nodes.new("ShaderNodeMix"); n.data_type = 'RGBA'; n.blend_type = 'MULTIPLY'; n.inputs[0].default_value = 1.0
        if isinstance(col, tuple): n.inputs[6].default_value = col
        else: self.link(col, n.inputs[6])
        c = self.nt.nodes.new("ShaderNodeCombineColor")
        for i in range(3): self.link(f, c.inputs[i]) if not isinstance(f, (int, float)) else setattr(c.inputs[i], "default_value", f)
        self.link(c.outputs[0], n.inputs[7]); return n.outputs[2]
    def noise(self, scale, detail=2.0, vec=None):
        n = self.nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = scale; n.inputs["Detail"].default_value = detail
        self.link(vec or self.obj, n.inputs["Vector"]); return n.outputs["Fac"]
    def wave(self, scale, direction='X', bands='BANDS', distortion=0.0, vec=None):
        n = self.nt.nodes.new("ShaderNodeTexWave"); n.wave_type = bands; n.bands_direction = direction
        n.inputs["Scale"].default_value = scale; n.inputs["Distortion"].default_value = distortion
        self.link(vec or self.obj, n.inputs["Vector"]); return n.outputs["Fac"]
    def ao(self, dist=0.04):
        n = self.nt.nodes.new("ShaderNodeAmbientOcclusion"); n.only_local = True; n.samples = 16; n.inputs["Distance"].default_value = dist
        return n.outputs["AO"]
    def finish(self, col, ao_amt=0.6, ao_dist=0.04, top_light=0.18):
        shade = self.m('ADD', 1.0 - ao_amt, self.m('MULTIPLY', self.ao(ao_dist), ao_amt))
        shade = self.m('MULTIPLY', shade, self.m('ADD', 1.0 - top_light, self.m('MULTIPLY', self.m('ADD', self.nz, 1.0), top_light * 0.5 + 0.0)))
        shade = self.m('ADD', shade, top_light * 0.5)
        self.link(self.mul(col, shade), self.em.inputs[0])

def dashes(nb, along, freq=700.0):
    return nb.m('GREATER_THAN', nb.m('SINE', nb.m('MULTIPLY', along, freq)), -0.2)

STITCH = srgb((0.66, 0.47, 0.22))

def denim_mat():
    m = bpy.data.materials.new("DenimDetail"); nb = NB(m)
    base = srgb((0.07, 0.09, 0.155)); light = srgb((0.20, 0.25, 0.37))
    # diagonal twill + mottling
    rot = nb.nt.nodes.new("ShaderNodeVectorRotate"); rot.rotation_type = 'Y_AXIS'; rot.inputs["Angle"].default_value = math.radians(35)
    nb.link(nb.obj, rot.inputs["Vector"])
    twill = nb.wave(420, 'X', vec=rot.outputs[0])
    col = nb.mix(nb.m('MULTIPLY', twill, 0.10), base, light)
    col = nb.mix(nb.m('MULTIPLY', nb.m('SUBTRACT', nb.noise(22, 4), 0.35), 0.35), col, light)
    # fade on the front of the thighs and knees
    front = nb.m('MAXIMUM', 0.0, nb.m('MULTIPLY', nb.ny, -1.0))
    thigh = nb.m('MULTIPLY', nb.band(nb.z, 0.52, 0.86, 0.12), front)
    col = nb.mix(nb.m('MULTIPLY', thigh, nb.m('MULTIPLY', nb.noise(8, 2), 0.55)), col, light)
    # cuff
    cuff = nb.m('LESS_THAN', nb.z, 0.028 + 0.05)
    col = nb.mix(nb.m('MULTIPLY', cuff, 0.7), col, srgb((0.17, 0.21, 0.31)))
    # waistband and its stitching
    wb = nb.band(nb.z, 1.0, 1.045, 0.002)
    col = nb.mix(nb.m('MULTIPLY', wb, 0.25), col, light)
    along = nb.m('ADD', nb.x, nb.y)
    for z0 in (1.004, 1.040, 0.028 + 0.052, 0.034):
        col = nb.mix(nb.m('MULTIPLY', nb.band(nb.z, z0 - 0.0012, z0 + 0.0012, 0.0006), dashes(nb, along)), col, STITCH)
    # outseams: where the surface faces straight out to the side
    side = nb.m('GREATER_THAN', nb.m('MULTIPLY', nb.nx, nb.m('SIGN', nb.x)), 0.992)
    col = nb.mix(nb.m('MULTIPLY', nb.m('MULTIPLY', side, nb.m('LESS_THAN', nb.z, 0.98)), dashes(nb, nb.z)), col, STITCH)
    # fly (J-stitch approximated as a vertical run) on the front
    fly = nb.m('MULTIPLY', nb.band(nb.x, 0.017, 0.0195, 0.0005), nb.m('MULTIPLY', nb.band(nb.z, 0.86, 1.0, 0.002), nb.m('LESS_THAN', nb.ny, -0.4)))
    col = nb.mix(nb.m('MULTIPLY', fly, dashes(nb, nb.z)), col, STITCH)
    # front pocket openings: an arc from the waistband down to the side
    for sgn in (1, -1):
        px = nb.m('MULTIPLY', nb.x, float(sgn))
        arc = nb.m('ABSOLUTE', nb.m('SUBTRACT', nb.m('SQRT', nb.m('ADD', nb.m('POWER', nb.m('SUBTRACT', px, 0.16), 2.0), nb.m('POWER', nb.m('SUBTRACT', nb.z, 1.045), 2.0))), 0.085))
        pk = nb.m('MULTIPLY', nb.m('LESS_THAN', arc, 0.0012), nb.m('MULTIPLY', nb.m('LESS_THAN', nb.ny, -0.3), nb.m('GREATER_THAN', px, 0.03)))
        col = nb.mix(pk, col, STITCH)
    nb.finish(col, ao_amt=0.7, ao_dist=0.05)
    return m

def tee_mat():
    m = bpy.data.materials.new("TeeDetail"); nb = NB(m)
    base = srgb((0.95, 0.94, 0.92)); fold = srgb((0.80, 0.79, 0.78))
    folds = nb.wave(6, 'X', 'BANDS', 2.0)
    col = nb.mix(nb.m('MULTIPLY', nb.m('POWER', folds, 4.0), 0.16), base, fold)
    col = nb.mix(nb.m('MULTIPLY', nb.noise(60, 3), 0.08), col, fold)
    # collar rib: near the top of the tee close to the neck
    r = nb.m('SQRT', nb.m('ADD', nb.m('POWER', nb.x, 2.0), nb.m('POWER', nb.m('ADD', nb.y, 0.01), 2.0)))
    collar = nb.m('MULTIPLY', nb.m('GREATER_THAN', nb.z, 1.37), nb.m('LESS_THAN', r, 0.085))
    rib = nb.wave(900, 'X')
    col = nb.mix(nb.m('MULTIPLY', collar, nb.m('ADD', 0.35, nb.m('MULTIPLY', rib, 0.2))), col, fold)
    # hem: double stitch just above the bottom edge
    for z0 in (1.047, 1.053):
        col = nb.mix(nb.m('MULTIPLY', nb.band(nb.z, z0 - 0.0008, z0 + 0.0008, 0.0005), dashes(nb, nb.m('ADD', nb.x, nb.y), 900)), col, fold)
    nb.finish(col, ao_amt=0.75, ao_dist=0.06, top_light=0.22)
    return m

def shoe_mat():
    m = bpy.data.materials.new("LoaferDetail"); nb = NB(m)
    col = nb.mix(nb.m('MULTIPLY', nb.m('MAXIMUM', 0.0, nb.m('SUBTRACT', nb.nz, 0.45)), 0.9), srgb((0.035, 0.035, 0.04)), srgb((0.32, 0.32, 0.34)))
    sole = nb.m('LESS_THAN', nb.z, 0.013)
    col = nb.mix(sole, col, srgb((0.09, 0.07, 0.06)))
    col = nb.mix(nb.band(nb.z, 0.0125, 0.016, 0.0005), col, srgb((0.18, 0.16, 0.15)))
    nb.finish(col, ao_amt=0.5, ao_dist=0.03, top_light=0.1)
    return m

def hair_mat():
    m = bpy.data.materials.new("HairDetail"); nb = NB(m)
    streak = nb.m('POWER', nb.noise(70, 4, None), 2.0)
    col = nb.mix(nb.m('MULTIPLY', nb.m('MULTIPLY', nb.m('MAXIMUM', 0.0, nb.nz), streak), 0.9), srgb((0.07, 0.055, 0.047)), srgb((0.62, 0.48, 0.38)))
    nb.finish(col, ao_amt=0.6, ao_dist=0.03, top_light=0.3)
    return m

def image_mat(name, img, ao_amt=0.45):
    m = bpy.data.materials.new(name); nb = NB(m)
    t = nb.nt.nodes.new("ShaderNodeTexImage"); t.image = img
    uvn = nb.nt.nodes.new("ShaderNodeUVMap"); nb.link(uvn.outputs[0], t.inputs[0])
    bc = nb.nt.nodes.new("ShaderNodeBrightContrast"); bc.inputs["Contrast"].default_value = 0.13; nb.link(t.outputs[0], bc.inputs[0])
    hs = nb.nt.nodes.new("ShaderNodeHueSaturation"); hs.inputs["Saturation"].default_value = 1.04; nb.link(bc.outputs[0], hs.inputs["Color"])
    nb.finish(hs.outputs[0], ao_amt=ao_amt, ao_dist=0.03, top_light=0.12)
    return m

def flat_mat(name, color, ao_amt=0.3):
    m = bpy.data.materials.new(name); nb = NB(m); nb.finish(color, ao_amt=ao_amt); return m

def set_mat(ob, m): ob.data.materials.clear(); ob.data.materials.append(m)
body_img = bpy.data.images["body_color"]; eye_img = bpy.data.images["eye_color"]
set_mat(bpy.data.objects["Body"], image_mat("SkinDetail", body_img))
set_mat(bpy.data.objects["Eyes"], image_mat("EyeDetail", eye_img, 0.2))
set_mat(bpy.data.objects["Tee"], tee_mat())
set_mat(bpy.data.objects["Jeans"], denim_mat())
set_mat(bpy.data.objects["Shoes"], shoe_mat())
hm = hair_mat(); set_mat(bpy.data.objects["Hair"], hm); set_mat(bpy.data.objects["HairLocks"], hm)
set_mat(bpy.data.objects["Bangle"], flat_mat("SilverDetail", srgb((0.78, 0.78, 0.8))))

# ---------------------------------------------------------------- low-poly hull
# Each part is a single-layer shell reduced to its own triangle budget, then all
# are joined into one mesh (double-sided material, like the reference).
def tri_count(ob): return sum(len(p.vertices) - 2 for p in ob.data.polygons)
def decimate_to(ob, tris):
    only(ob)
    for _ in range(3):                                  # collapse overshoots/undershoots a bit; iterate
        cur = tri_count(ob)
        if cur <= tris * 1.05: break
        dm = ob.modifiers.new("dec", 'DECIMATE'); dm.decimate_type = 'COLLAPSE'; dm.ratio = tris / cur; dm.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier="dec")
    return ob
def largest_component(ob):
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.verts.ensure_lookup_table()
    seen, best = set(), []
    for v in bm.verts:
        if v.index in seen: continue
        stack, ids = [v], []; seen.add(v.index)
        while stack:
            u = stack.pop(); ids.append(u)
            for e in u.link_edges:
                w_ = e.other_vert(u)
                if w_.index not in seen: seen.add(w_.index); stack.append(w_)
        if len(ids) > len(best): best = ids
    keepset = set(best)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v not in keepset], context='VERTS')
    bm.to_mesh(ob.data); bm.free()

BUDGET = {"Body": 0.42, "Tee": 0.14, "Jeans": 0.16, "Shoes": 0.07}
parts = []
def fill_face_holes(ob):
    bm = bmesh.new(); bm.from_mesh(ob.data)
    edges = [e for e in bm.edges if e.is_boundary]
    loops, seen = [], set()
    for e in edges:
        if e in seen: continue
        loop, stack = [], [e]; seen.add(e)
        while stack:
            x = stack.pop(); loop.append(x)
            for v in x.verts:
                for y in v.link_edges:
                    if y.is_boundary and y not in seen: seen.add(y); stack.append(y)
        loops.append(loop)
    for loop in loops:
        cs = [v.co for e in loop for v in e.verts]
        cx = sum(c.x for c in cs) / len(cs); cz = sum(c.z for c in cs) / len(cs); cy = sum(c.y for c in cs) / len(cs)
        if abs(cx) < 0.06 and 1.45 < cz < 1.6 and cy < -0.03:
            bmesh.ops.holes_fill(bm, edges=loop, sides=0)
    bm.to_mesh(ob.data); bm.free()
for name, frac in BUDGET.items():
    p_ = baked_copy(bpy.data.objects[name], "lp_" + name); p_.data.materials.clear()
    if name == "Body": fill_face_holes(p_)
    parts.append(decimate_to(p_, int(TARGET * frac)))
# hair: fuse the locks with a thickened cap into one solid, then reduce
hl = baked_copy(bpy.data.objects["HairLocks"], "lp_locks"); hc = baked_copy(bpy.data.objects["Hair"], "lp_cap")
only(hc); so = hc.modifiers.new("s", 'SOLIDIFY'); so.thickness = 0.01; so.offset = -1; bpy.ops.object.modifier_apply(modifier="s")
only(hl); hc.select_set(True); bpy.ops.object.join(); hair_lp = bpy.context.active_object
rm = hair_lp.modifiers.new("vox", 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = 0.005
bpy.ops.object.modifier_apply(modifier="vox"); largest_component(hair_lp)
hair_lp.data.materials.clear(); parts.append(decimate_to(hair_lp, int(TARGET * 0.19)))
for p_ in parts: print("PART", p_.name, tri_count(p_))
only(parts[0]); [p_.select_set(True) for p_ in parts]; bpy.ops.object.join()
hull = bpy.context.active_object; hull.name = "Aparna"
for g in list(hull.vertex_groups): hull.vertex_groups.remove(g)
print("LOWPOLY_TRIS", tri_count(hull))

# low bangle, joined in
a, b = B["LeftHand"]; fa, fb = B["LeftForeArm"]
d = (Vector(fb) - Vector(fa)).normalized(); wrist = Vector(fb) - d * 0.03
bpy.ops.mesh.primitive_torus_add(major_radius=0.031, minor_radius=0.005, major_segments=10, minor_segments=4, location=wrist)
lb = bpy.context.active_object; lb.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
only(hull); lb.select_set(True); bpy.ops.object.join()
hull.data.polygons.foreach_set("use_smooth", [True] * len(hull.data.polygons))

# ---------------------------------------------------------------- UVs: face as one front-projected island, rest smart-projected
me = hull.data
while me.uv_layers: me.uv_layers.remove(me.uv_layers[0])
uvl = me.uv_layers.new(name="UVMap")
face_polys = set()
for p in me.polygons:
    if 1.445 < p.center.z < 1.60 and p.normal.y < -0.35 and abs(p.center.x) < 0.065 and p.center.y < -0.02:
        face_polys.add(p.index)
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
for f in bm.faces: f.select = f.index not in face_polys
bm.to_mesh(me); bm.free()
only(hull)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.uv.smart_project(angle_limit=math.radians(80), island_margin=0.003, area_weight=0.6)
bpy.ops.object.mode_set(mode='OBJECT')
me = hull.data; uvl = me.uv_layers["UVMap"]
for pi in face_polys:
    p = me.polygons[pi]
    for li in p.loop_indices:
        v = me.vertices[me.loops[li].vertex_index].co
        uvl.data[li].uv = (v.x * 3.2 + 0.5, (v.z - 1.52) * 3.2 + 0.5)   # oversized on purpose; pack scales it with the rest
# enlarge the rest of the head / hair too so the face side-planes and hair aren't blurry
for p in me.polygons:
    if p.index in face_polys or p.center.z < 1.42: continue
    for li in p.loop_indices: uvl.data[li].uv = uvl.data[li].uv * 1.6
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.select_all(action='SELECT')
bpy.ops.uv.pack_islands(margin=0.003, rotate=True, scale=True)
bpy.ops.object.mode_set(mode='OBJECT')

# ---------------------------------------------------------------- bake high -> low
atlas = bpy.data.images.new("aparna_atlas", ATLAS, ATLAS)
bake_m = bpy.data.materials.new("AtlasBake"); bake_m.use_nodes = True
tn = bake_m.node_tree.nodes.new("ShaderNodeTexImage"); tn.image = atlas; bake_m.node_tree.nodes.active = tn
set_mat(hull, bake_m)
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 32
sc.render.bake.use_selected_to_active = True
sc.render.bake.cage_extrusion = 0.02; sc.render.bake.max_ray_distance = 0.06; sc.render.bake.margin = 6
bpy.ops.object.select_all(action='DESELECT')
for o in HIGH:
    o.hide_render = False; o.select_set(True)
hull.select_set(True); bpy.context.view_layer.objects.active = hull
bpy.ops.object.bake(type='EMIT')
atlas.filepath_raw = os.path.join(TEX, "aparna_atlas.png"); atlas.file_format = 'PNG'; atlas.save()

final = bpy.data.materials.new("aparna_skin"); final.use_nodes = True
p = final.node_tree.nodes["Principled BSDF"]; t = final.node_tree.nodes.new("ShaderNodeTexImage"); t.image = atlas
final.node_tree.links.new(t.outputs[0], p.inputs["Base Color"]); p.inputs["Roughness"].default_value = 0.6
final.use_backface_culling = False
set_mat(hull, final)

# ---------------------------------------------------------------- skin weights from the high-poly
srcs = [baked_copy(o, "w_" + o.name) for o in HIGH]
for s_, o in zip(srcs, HIGH):
    for g in o.vertex_groups:
        if g.name.startswith("mixamorig:") and g.name not in s_.vertex_groups: s_.vertex_groups.new(name=g.name)
only(srcs[0]); [s_.select_set(True) for s_ in srcs]; bpy.ops.object.join(); wsrc = bpy.context.active_object
for g in wsrc.vertex_groups:
    if g.name.startswith("mixamorig:"): hull.vertex_groups.new(name=g.name)
dt = hull.modifiers.new("wt", 'DATA_TRANSFER'); dt.object = wsrc
dt.use_vert_data = True; dt.data_types_verts = {'VGROUP_WEIGHTS'}; dt.vert_mapping = 'POLYINTERP_NEAREST'
dt.layers_vgroup_select_src = 'ALL'; dt.layers_vgroup_select_dst = 'NAME'
only(hull); bpy.ops.object.modifier_apply(modifier="wt")
bpy.ops.object.vertex_group_clean(group_select_mode='ALL', limit=0.02)
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
bpy.ops.object.vertex_group_normalize_all(lock_active=False)
hull.parent = rig
hull.modifiers.new("Armature", 'ARMATURE').object = rig

for o in HIGH + [wsrc]: bpy.data.objects.remove(o, do_unlink=True)
sc.render.engine = 'BLENDER_EEVEE_NEXT'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(AV, "stage3.blend"))
print("STAGE3_DONE tris", tri_count(hull))

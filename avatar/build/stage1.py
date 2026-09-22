import bpy, sys, math
from mathutils import Vector
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

OUT = sys.argv[sys.argv.index("--")+1]
bpy.ops.wm.read_factory_settings(use_empty=True)

macro = TargetService.get_default_macro_info_dict()
macro.update(gender=0.0, age=0.5, muscle=0.45, weight=0.42, proportions=0.65, height=0.52, cupsize=0.45, firmness=0.6)
macro["race"] = {"asian": 0.45, "caucasian": 0.35, "african": 0.2}
body = HumanService.create_human(macro_detail_dict=macro)
body.name = "Body"
import os
TD = os.path.join(os.path.dirname(__import__("bl_ext.user_default.mpfb", fromlist=["x"]).__file__), "data", "targets")
FACE = {"head/head-scale-horiz-decr":0.7, "head/head-invertedtriangular":0.45, "head/head-oval":0.3,
        "chin/chin-width-decr":0.5, "chin/chin-triangle":0.3, "cheek/l-cheek-bones-incr":0.3, "cheek/r-cheek-bones-incr":0.3,
        "eyes/l-eye-scale-incr":0.35, "eyes/r-eye-scale-incr":0.35,
        "mouth/mouth-upperlip-volume-incr":0.5, "mouth/mouth-lowerlip-volume-incr":0.5, "mouth/mouth-scale-horiz-incr":0.2,
        "nose/nose-point-width-incr":0.2, "neck/neck-scale-horiz-decr":0.3, "eyes/l-eye-trans-out":0.6, "eyes/r-eye-trans-out":0.6, "eyes/l-eye-trans-down":0.3, "eyes/r-eye-trans-down":0.3, "mouth/mouth-trans-up":0.4, "nose/nose-scale-vert-decr":0.2, "chin/chin-height-decr":0.7, "nose/nose-trans-up":0.5}
for k,v in FACE.items():
    TargetService.load_target(body, os.path.join(TD, k + ".target.gz"), weight=v)
deps = bpy.context.evaluated_depsgraph_get()
bb = [body.matrix_world @ Vector(c) for c in body.bound_box]
h = max(v.z for v in bb) - min(v.z for v in bb)
print("HEIGHT_M", h)
HumanService.add_builtin_rig(body, "mixamo")
rig = body.parent
# scale whole character to 1.63 m
s = 1.63 / h
rig.scale = (s, s, s)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True); body.select_set(True)
bpy.ops.object.transform_apply(scale=True)
sc_=1.63/h
rig.scale=(sc_,)*3
bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True); body.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.transform_apply(scale=True)
hb = rig.data.bones["mixamorig:Head"]
print("HEAD", rig.matrix_world @ hb.head_local, rig.matrix_world @ hb.tail_local)
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print("BONES", [b.name for b in rig.data.bones][:12], len(rig.data.bones))

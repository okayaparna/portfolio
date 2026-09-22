# usage: blender -b file.blend --python render.py -- out_prefix [views] [engine]
import bpy, sys, math
from mathutils import Vector
a = sys.argv[sys.argv.index("--")+1:]
out = a[0]; views = (a[1] if len(a)>1 else "front,side,34,face").split(","); engine = a[2] if len(a)>2 else "EEVEE"
sc = bpy.context.scene
sc.render.resolution_x, sc.render.resolution_y = 700, 1000
sc.render.engine = 'BLENDER_EEVEE_NEXT' if engine=="EEVEE" else 'BLENDER_WORKBENCH'
if engine!="EEVEE":
    sc.display.shading.light='STUDIO'; sc.display.shading.color_type='MATERIAL'
sc.view_settings.view_transform = 'Standard'
world = bpy.data.worlds.new("W") if not sc.world else sc.world
sc.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.9,0.9,0.9,1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.35
for n,loc,en in [("Key",(2,-3,3),120),("Fill",(-3,-2,2),40),("Rim",(0,3,3),80)]:
    if n in bpy.data.objects: continue
    L = bpy.data.lights.new(n,'AREA'); L.energy=en; L.size=3
    o = bpy.data.objects.new(n,L); sc.collection.objects.link(o); o.location=loc
    d = Vector((0,0,1)) - Vector(loc); o.rotation_euler = d.to_track_quat('-Z','Y').to_euler()
clay = bpy.data.materials.new("Clay"); clay.use_nodes=True
clay.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value=(0.6,0.45,0.38,1)
for o in sc.objects:
    if o.type=='MESH' and (not o.data.materials or all(m is None for m in o.data.materials)):
        o.data.materials.clear(); o.data.materials.append(clay)
cam = bpy.data.cameras.new("C"); co = bpy.data.objects.new("Cam", cam); sc.collection.objects.link(co); sc.camera = co
cam.lens = 85
V = {"front":((0,-6,0.85),(0,0,0.85),70), "side":((6,0,0.85),(0,0,0.85),70),
     "34":((4.6,-5.6,1.0),(0,0,0.85),85), "face":((0,-1.2,1.47),(0,0,1.47),85), "face34":((0.75,-1.0,1.48),(0,0,1.47),85),
     "back":((0,7.5,0.85),(0,0,0.85),85), "chest":((0.25,-0.9,1.3),(0.05,0,1.22),85), "hand":((0.65,-0.75,0.9),(0.24,-0.2,0.86),85), "neck":((0.25,-0.55,1.42),(0,-0.03,1.36),85)}
for v in views:
    p,t,lens = V[v]; co.location = p; cam.lens=lens
    co.rotation_euler = (Vector(t)-Vector(p)).to_track_quat('-Z','Y').to_euler()
    sc.render.filepath = f"{out}_{v}.png"; bpy.ops.render.render(write_still=True)


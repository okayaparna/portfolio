import bpy, sys
from mathutils import Vector
a=sys.argv[sys.argv.index("--")+1:]; out=a[0]; cz=float(a[1]); os_=float(a[2])
sc=bpy.context.scene; sc.render.resolution_x=sc.render.resolution_y=600
sc.render.engine='BLENDER_WORKBENCH'; sc.display.shading.light='STUDIO'
cam=bpy.data.cameras.new("C"); cam.type='ORTHO'; cam.ortho_scale=os_
co=bpy.data.objects.new("Cam",cam); sc.collection.objects.link(co); sc.camera=co
co.location=(0,-2,cz); co.rotation_euler=(1.5707963,0,0)
sc.render.filepath=out; bpy.ops.render.render(write_still=True)

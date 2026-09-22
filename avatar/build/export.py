# usage: blender -b stage2.blend --python export.py -- out.glb
import bpy, sys
out = sys.argv[sys.argv.index("--") + 1]
for o in list(bpy.data.objects):
    if o.type in ('LIGHT', 'CAMERA'): bpy.data.objects.remove(o)
for im in bpy.data.images:
    if im.name in ("body_color", "eye_color"): im.file_format = 'JPEG'
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_skins=True, export_animations=False,
    export_apply=True, export_image_format='JPEG', export_jpeg_quality=88, export_yup=True,
    export_morph=False, export_extras=False, export_cameras=False, export_lights=False)

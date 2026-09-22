# Shared helpers for the low-poly bake scripts (imported by mx2_style.py).
import bpy, bmesh, math
import numpy as np

def srgb(c): return tuple(((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c) + (1.0,)

def only(ob):
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob

def tri_count(ob): return sum(len(p.vertices) - 2 for p in ob.data.polygons)

def decimate_to(ob, tris):
    only(ob)
    for _ in range(4):
        cur = tri_count(ob)
        if cur <= tris * 1.05: break
        dm = ob.modifiers.new("dec", 'DECIMATE'); dm.decimate_type = 'COLLAPSE'; dm.ratio = tris / cur; dm.use_collapse_triangulate = True
        bpy.ops.object.modifier_move_to_index(modifier="dec", index=0)
        bpy.ops.object.modifier_apply(modifier="dec")
    return ob

class NB:
    """emission-shader builder; works in WORLD space (Geometry Position / Normal)"""
    def __init__(self, m):
        m.use_nodes = True; self.nt = m.node_tree; self.nt.nodes.clear()
        self.out = self.nt.nodes.new("ShaderNodeOutputMaterial"); self.em = self.nt.nodes.new("ShaderNodeEmission")
        self.nt.links.new(self.em.outputs[0], self.out.inputs[0])
        g = self.nt.nodes.new("ShaderNodeNewGeometry"); self.P = g.outputs["Position"]; self.N = g.outputs["Normal"]
        s = self.nt.nodes.new("ShaderNodeSeparateXYZ"); self.link(self.P, s.inputs[0]); self.x, self.y, self.z = s.outputs
        s2 = self.nt.nodes.new("ShaderNodeSeparateXYZ"); self.link(self.N, s2.inputs[0]); self.nx, self.ny, self.nz = s2.outputs
    def link(self, a, b): self.nt.links.new(a, b)
    def m(self, op, a, b=0.0, c=None):
        n = self.nt.nodes.new("ShaderNodeMath"); n.operation = op
        for i, v in enumerate((a, b) if c is None else (a, b, c)):
            if isinstance(v, (int, float)): n.inputs[i].default_value = v
            else: self.link(v, n.inputs[i])
        return n.outputs[0]
    def clamp01(self, v): return self.m('MINIMUM', 1.0, self.m('MAXIMUM', 0.0, v))
    def ramp(self, v, e0, e1): return self.clamp01(self.m('DIVIDE', self.m('SUBTRACT', v, e0), e1 - e0))
    def band(self, v, lo, hi, soft=0.0008):
        return self.m('MULTIPLY', self.ramp(v, lo - soft, lo + soft), self.ramp(self.m('MULTIPLY', v, -1.0), -hi - soft, -hi + soft))
    def AND(self, *fs):
        out = fs[0]
        for f in fs[1:]: out = self.m('MULTIPLY', out, f)
        return out
    def NOT(self, f): return self.m('SUBTRACT', 1.0, f)
    def mix(self, fac, a, b):
        n = self.nt.nodes.new("ShaderNodeMix"); n.data_type = 'RGBA'
        if isinstance(fac, (int, float)): n.inputs[0].default_value = fac
        else: self.link(fac, n.inputs[0])
        for i, v in ((6, a), (7, b)):
            if isinstance(v, tuple): n.inputs[i].default_value = v
            else: self.link(v, n.inputs[i])
        return n.outputs[2]
    def mul(self, col, f):
        n = self.nt.nodes.new("ShaderNodeMix"); n.data_type = 'RGBA'; n.blend_type = 'MULTIPLY'; n.inputs[0].default_value = 1.0
        if isinstance(col, tuple): n.inputs[6].default_value = col
        else: self.link(col, n.inputs[6])
        c = self.nt.nodes.new("ShaderNodeCombineColor")
        for i in range(3):
            if isinstance(f, (int, float)): c.inputs[i].default_value = f
            else: self.link(f, c.inputs[i])
        self.link(c.outputs[0], n.inputs[7]); return n.outputs[2]
    def noise(self, scale, detail=2.0, vec=None):
        n = self.nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = scale; n.inputs["Detail"].default_value = detail
        self.link(vec or self.P, n.inputs["Vector"]); return n.outputs["Fac"]
    def wave(self, scale, direction='X', distortion=0.0, vec=None):
        n = self.nt.nodes.new("ShaderNodeTexWave"); n.wave_type = 'BANDS'; n.bands_direction = direction
        n.inputs["Scale"].default_value = scale; n.inputs["Distortion"].default_value = distortion
        self.link(vec or self.P, n.inputs["Vector"]); return n.outputs["Fac"]
    def ao(self, dist=0.04, local=True):
        n = self.nt.nodes.new("ShaderNodeAmbientOcclusion"); n.only_local = local; n.samples = 16; n.inputs["Distance"].default_value = dist
        return n.outputs["AO"]
    def lum(self, col):
        n = self.nt.nodes.new("ShaderNodeRGBToBW"); self.link(col, n.inputs[0]); return n.outputs[0]
    def attr(self, name):
        n = self.nt.nodes.new("ShaderNodeAttribute"); n.attribute_name = name; return n.outputs["Color"], n.outputs["Fac"]
    def image(self, img):
        t = self.nt.nodes.new("ShaderNodeTexImage"); t.image = img; return t.outputs[0]
    def finish(self, col, shade):
        self.link(self.mul(col, shade), self.em.inputs[0])

def dashes(nb, along, freq=700.0):
    return nb.m('GREATER_THAN', nb.m('SINE', nb.m('MULTIPLY', along, freq)), -0.2)

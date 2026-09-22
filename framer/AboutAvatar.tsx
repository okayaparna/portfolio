import * as React from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import * as THREE from "https://esm.sh/three@0.184.0"
import { GLTFLoader } from "https://esm.sh/three@0.184.0/examples/jsm/loaders/GLTFLoader.js"
import { RoomEnvironment } from "https://esm.sh/three@0.184.0/examples/jsm/environments/RoomEnvironment.js"

/**
 * ABOUT AVATAR — low-poly 3D self-portrait for the About page
 * ─────────────────────────────────────────────────────────────────────────────
 * Loads the rigged `aparna.glb` (built in `avatar/`, see avatar/README.md) and:
 *
 *   1. ASSEMBLES — every triangle flies in from a scattered cloud and snaps
 *      into place, feet first, as flat-shaded lilac facets with drawn edges.
 *   2. SKINS — the real textures (face, tee, denim, hair) sweep up over the
 *      facets and the shading softens from faceted to smooth.
 *   3. LIVES — breathes and sways, turns her head toward the cursor, can be
 *      dragged round (springs back), and waves when clicked.
 *
 * All of it is done in the material shaders on the model's own triangles, so
 * the load-in costs nothing extra to download.
 *
 * FRAMER ──────────────────────────────────────────────────────────────────────
 * Upload `aparna.glb` through the Model property (or paste a hosted URL into
 * Model URL). On the canvas the figure renders in its finished state, with no
 * animation, so it doesn't churn while you edit.
 */

// @framerSupportedLayoutWidth any
// @framerSupportedLayoutHeight any
// @framerIntrinsicWidth 480
// @framerIntrinsicHeight 720

type Framing = "full" | "waist" | "portrait"

export type AvatarOptions = {
    modelUrl: string
    framing: Framing
    start: "load" | "inView"
    delay: number
    assembleDuration: number
    skinDuration: number
    scatter: number
    polyColor: string
    edgeColor: string
    edgeOpacity: number
    lookStrength: number
    draggable: boolean
    waveOnClick: boolean
    shadow: number
    isCanvas?: boolean
    onReady?: () => void
}

const FRAMES: Record<Framing, { y: number; h: number }> = {
    full: { y: 0.84, h: 1.86 },
    waist: { y: 1.3, h: 0.95 },
    portrait: { y: 1.5, h: 0.48 },
}

// ── shader patch ─────────────────────────────────────────────────────────────
const VERT_HEAD = /* glsl */ `
attribute vec3 aCentroid;
attribute vec3 aBary;
attribute float aRand;
attribute float aDelay;
uniform float uAssemble;
uniform float uSkin;
uniform float uScatter;
varying float vSkin;
varying float vRand;
varying vec3 vBary;
vec3 rotAxis(vec3 v, vec3 k, float a) {
    float c = cos(a), s = sin(a);
    return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
}
`
const VERT_BODY = /* glsl */ `
#include <begin_vertex>
{
    float t = clamp((uAssemble * 1.6 - aDelay) / 0.6, 0.0, 1.0);
    float e = 1.0 - pow(1.0 - t, 3.0);
    vec3 radial = aCentroid - vec3(0.0, aCentroid.y, 0.0);
    vec3 jitter = vec3(sin(aRand * 43.1), cos(aRand * 17.3) * 0.6, cos(aRand * 29.7));
    vec3 dir = normalize(radial * 2.0 + jitter);
    vec3 off = dir * uScatter * (0.35 + aRand) + vec3(0.0, (aRand - 0.25) * uScatter * 0.8, 0.0);
    vec3 local = rotAxis(transformed - aCentroid, dir, (1.0 - e) * (2.0 + aRand * 6.0));
    transformed = aCentroid + local * e + off * (1.0 - e);
    vSkin = clamp((uSkin * 1.6 - aDelay) / 0.6, 0.0, 1.0);
    vRand = aRand;
    vBary = aBary;
}
`
const FRAG_HEAD = /* glsl */ `
uniform vec3 uPolyColor;
uniform vec3 uEdgeColor;
uniform float uEdgeOpacity;
varying float vSkin;
varying float vRand;
varying vec3 vBary;
`
const FRAG_MAP = /* glsl */ `
#include <map_fragment>
float skinK = smoothstep(0.0, 1.0, vSkin);
diffuseColor.rgb = mix(uPolyColor * (0.84 + 0.32 * vRand), diffuseColor.rgb, skinK);
`
const FRAG_NORMAL = /* glsl */ `
#include <normal_fragment_begin>
{
    vec3 faceN = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
    normal = normalize(mix(faceN, normal, smoothstep(0.55, 1.0, vSkin)));
}
`
const FRAG_EDGE = /* glsl */ `
{
    vec3 fw = fwidth(vBary);
    vec3 a3 = smoothstep(vec3(0.0), fw * 1.25, vBary);
    float edge = 1.0 - min(min(a3.x, a3.y), a3.z);
    float front = smoothstep(0.0, 0.12, vSkin) * (1.0 - smoothstep(0.12, 0.45, vSkin));
    float k = edge * uEdgeOpacity * (1.0 - smoothstep(0.1, 0.75, vSkin));
    gl_FragColor.rgb = mix(gl_FragColor.rgb, uEdgeColor, k);
    gl_FragColor.rgb += front * 0.18;
}
#include <dithering_fragment>
`

function patchMaterial(mat: any, U: Record<string, { value: any }>) {
    if (mat.userData.avatarPatched) return
    mat.userData.avatarPatched = true
    mat.onBeforeCompile = (shader: any) => {
        Object.assign(shader.uniforms, U)
        shader.vertexShader = VERT_HEAD + shader.vertexShader.replace("#include <begin_vertex>", VERT_BODY)
        shader.fragmentShader =
            FRAG_HEAD +
            shader.fragmentShader
                .replace("#include <map_fragment>", FRAG_MAP)
                .replace("#include <normal_fragment_begin>", FRAG_NORMAL)
                .replace("#include <dithering_fragment>", FRAG_EDGE)
    }
    mat.customProgramCacheKey = () => "avatar-assemble"
    mat.needsUpdate = true
}

/** Split into loose triangles and give each one what the shader needs. */
function explode(mesh: any, heightRange: [number, number], rand: () => number) {
    const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry
    const pos = g.attributes.position
    const n = pos.count
    const centroid = new Float32Array(n * 3)
    const bary = new Float32Array(n * 3)
    const r = new Float32Array(n)
    const delay = new Float32Array(n)
    const [y0, y1] = heightRange
    for (let i = 0; i < n; i += 3) {
        let cx = 0, cy = 0, cz = 0
        for (let k = 0; k < 3; k++) { cx += pos.getX(i + k); cy += pos.getY(i + k); cz += pos.getZ(i + k) }
        cx /= 3; cy /= 3; cz /= 3
        const rr = rand()
        const d = Math.min(1, Math.max(0, ((cy - y0) / (y1 - y0)) * 0.72 + rr * 0.28))
        for (let k = 0; k < 3; k++) {
            const j = i + k
            centroid[j * 3] = cx; centroid[j * 3 + 1] = cy; centroid[j * 3 + 2] = cz
            bary[j * 3 + k] = 1
            r[j] = rr; delay[j] = d
        }
    }
    g.setAttribute("aCentroid", new THREE.BufferAttribute(centroid, 3))
    g.setAttribute("aBary", new THREE.BufferAttribute(bary, 3))
    g.setAttribute("aRand", new THREE.BufferAttribute(r, 1))
    g.setAttribute("aDelay", new THREE.BufferAttribute(delay, 1))
    if (g !== mesh.geometry) mesh.geometry.dispose()
    mesh.geometry = g
    mesh.frustumCulled = false
}

function mulberry(seed: number) {
    return () => {
        seed |= 0; seed = (seed + 0x6d2b79f5) | 0
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function shadowTexture() {
    const c = document.createElement("canvas"); c.width = c.height = 128
    const x = c.getContext("2d")!
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, "rgba(40,30,50,0.55)"); g.addColorStop(0.55, "rgba(40,30,50,0.18)"); g.addColorStop(1, "rgba(40,30,50,0)")
    x.fillStyle = g; x.fillRect(0, 0, 128, 128)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
    return t
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

// ── engine ───────────────────────────────────────────────────────────────────
export function mountAvatar(container: HTMLElement, initial: AvatarOptions) {
    let opts = { ...initial }
    const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches
    const still = !!opts.isCanvas || reduced

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.NeutralToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.setClearColor(0x000000, 0)
    const canvas = renderer.domElement
    Object.assign(canvas.style, { width: "100%", height: "100%", display: "block", touchAction: "pan-y", cursor: opts.draggable ? "grab" : "default" })
    container.appendChild(canvas)

    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envTex
    scene.environmentIntensity = 0.55

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8290, 1.45))
    const key = new THREE.DirectionalLight(0xfff1e6, 1.1); key.position.set(1.6, 2.6, 3.2); scene.add(key)
    const rim = new THREE.DirectionalLight(0xe8ddf0, 0.8); rim.position.set(-2.2, 2.0, -2.5); scene.add(rim)

    const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 50)
    const root = new THREE.Group(); scene.add(root)

    const shTex = shadowTexture()
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: 0 }))
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.001; root.add(shadow)

    const U = {
        uAssemble: { value: still ? 1 : 0 },
        uSkin: { value: still ? 1 : 0 },
        uScatter: { value: opts.scatter },
        uPolyColor: { value: new THREE.Color(opts.polyColor) },
        uEdgeColor: { value: new THREE.Color(opts.edgeColor) },
        uEdgeOpacity: { value: opts.edgeOpacity },
    }

    // bones we drive
    const bones: Record<string, any> = {}
    const rest: Record<string, any> = {}
    const want = ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head", "RightArm", "RightForeArm", "RightHand", "LeftArm", "LeftForeArm"]

    let loaded = false, disposed = false
    let startAt = -1
    const clock = new THREE.Timer()

    function frame() {
        const w = container.clientWidth || 1, h = container.clientHeight || 1
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        const f = FRAMES[opts.framing] || FRAMES.full
        const halfV = THREE.MathUtils.degToRad(camera.fov / 2)
        let dist = f.h / 2 / Math.tan(halfV)
        const needW = f.h * 0.42                      // keep shoulders / hands inside narrow frames
        const halfH = Math.atan(Math.tan(halfV) * camera.aspect)
        dist = Math.max(dist, needW / Math.tan(halfH))
        camera.position.set(0, f.y + 0.02, dist)
        camera.lookAt(0, f.y, 0)
        camera.updateProjectionMatrix()
    }
    frame()
    const ro = new ResizeObserver(frame); ro.observe(container)

    new GLTFLoader().load(opts.modelUrl, (gltf: any) => {
        if (disposed) return
        const model = gltf.scene
        const box = new THREE.Box3().setFromObject(model)
        const rand = mulberry(7)
        model.traverse((o: any) => {
            if (o.isBone) {
                const m = o.name.match(/(Hips|Spine2|Spine1|Spine|Neck|Head|RightForeArm|RightArm|RightHand|LeftForeArm|LeftArm)$/)
                if (m && want.includes(m[1]) && !bones[m[1]]) { bones[m[1]] = o; rest[m[1]] = o.quaternion.clone() }
            }
            if (o.isMesh) {
                explode(o, [box.min.y, box.max.y], rand)
                const mats = Array.isArray(o.material) ? o.material : [o.material]
                mats.forEach((m: any) => {
                    // all shading is baked into the texture: keep real-time light soft and matte
                    m.roughness = Math.max(m.roughness ?? 1, 0.85); m.metalness = 0; m.envMapIntensity = 0.35
                    m.side = THREE.DoubleSide
                    patchMaterial(m, U)
                })
            }
        })
        root.add(model)
        // Mixamo characters rest in a T-pose: measure how far the upper arm sits
        // above "hanging", so the idle can lower it into a relaxed stance.
        model.updateMatrixWorld(true)
        const la = bones.LeftArm, lf = bones.LeftForeArm
        if (la && lf) {
            const a = la.getWorldPosition(new THREE.Vector3()), b = lf.getWorldPosition(new THREE.Vector3())
            const below = Math.atan2(a.y - b.y, Math.abs(b.x - a.x))       // radians below horizontal
            relax = Math.max(0, 1.3 - below)
        }
        loaded = true
        opts.onReady?.()
        if (opts.start === "load") begin()
    }, undefined, (err: any) => console.warn("[AboutAvatar] could not load model", err))

    function begin() {
        if (still) return
        startAt = clock.getElapsed() + opts.delay
        U.uAssemble.value = 0; U.uSkin.value = 0
    }

    // ── interaction ──────────────────────────────────────────────────────────
    const look = { x: 0, y: 0, tx: 0, ty: 0 }
    const spin = { yaw: 0, vel: 0, dragging: false, lastX: 0, downX: 0, downY: 0, moved: 0 }
    let waveAt = -10
    let relax = 0

    const onMove = (e: PointerEvent) => {
        const r = container.getBoundingClientRect()
        const cx = r.left + r.width / 2, cy = r.top + r.height * 0.22
        look.tx = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth * 0.5)))
        look.ty = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight * 0.5)))
        if (spin.dragging) {
            const dx = e.clientX - spin.lastX; spin.lastX = e.clientX
            spin.moved += Math.abs(dx)
            spin.yaw += dx * 0.012; spin.vel = dx * 0.012
        }
    }
    const onDown = (e: PointerEvent) => {
        spin.dragging = opts.draggable; spin.lastX = spin.downX = e.clientX; spin.downY = e.clientY; spin.moved = 0
        if (opts.draggable) { canvas.style.cursor = "grabbing"; canvas.setPointerCapture?.(e.pointerId) }
    }
    const onUp = () => {
        const wasClick = spin.moved < 6
        spin.dragging = false
        canvas.style.cursor = opts.draggable ? "grab" : "default"
        if (!wasClick || !loaded) return
        if (opts.waveOnClick) waveAt = clock.getElapsed()
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    canvas.addEventListener("pointerdown", onDown)
    window.addEventListener("pointerup", onUp)

    let visible = true
    const io = new IntersectionObserver((es) => {
        visible = es[0].isIntersecting
        if (visible && loaded && opts.start === "inView" && startAt < 0 && !still) begin()
    }, { threshold: 0.25 })
    io.observe(container)

    // ── pose helpers ─────────────────────────────────────────────────────────
    const qTmp = new THREE.Quaternion(), qP = new THREE.Quaternion(), qD = new THREE.Quaternion(), eTmp = new THREE.Euler()
    /** rest pose, then a rotation expressed in world axes */
    function worldRot(name: string, x: number, y: number, z: number) {
        const b = bones[name]; if (!b) return
        b.parent.updateWorldMatrix(true, false)
        b.parent.getWorldQuaternion(qP)
        qD.setFromEuler(eTmp.set(x, y, z, "YXZ"))
        qTmp.copy(qP).invert().multiply(qD).multiply(qP)
        b.quaternion.copy(qTmp.multiply(b.quaternion))
    }

    let raf = 0
    function tick(now?: number) {
        raf = requestAnimationFrame(tick)
        clock.update(now)
        if (!visible || !loaded) return
        const dt = Math.min(clock.getDelta(), 0.05)
        const t = clock.getElapsed()

        // load-in timeline
        let intro = 1
        if (!still && startAt >= 0) {
            const lt = t - startAt
            U.uAssemble.value = clamp01(lt / opts.assembleDuration)
            U.uSkin.value = clamp01((lt - opts.assembleDuration * 0.55) / opts.skinDuration)
            intro = easeInOut(clamp01(lt / (opts.assembleDuration + opts.skinDuration * 0.6)))
        } else if (!still && startAt < 0) {
            intro = 0
        }
        U.uScatter.value = opts.scatter
        U.uPolyColor.value.set(opts.polyColor)
        U.uEdgeColor.value.set(opts.edgeColor)
        U.uEdgeOpacity.value = opts.edgeOpacity
        ;(shadow.material as any).opacity = opts.shadow * clamp01(U.uAssemble.value * 1.4)

        // drag spin with spring back
        if (!spin.dragging) {
            spin.yaw += spin.vel                       // coast a little after release…
            spin.vel *= Math.exp(-dt * 6)
            spin.yaw *= Math.exp(-dt * 2.2)            // …then settle back to facing front
        }
        root.rotation.y = spin.yaw + (1 - intro) * -0.7

        // pose
        for (const k in bones) bones[k].quaternion.copy(rest[k])
        if (still) { look.x = look.y = 0 } else {
            const k = 1 - Math.exp(-dt * 5)
            look.x += (look.tx - look.x) * k; look.y += (look.ty - look.y) * k
        }
        const s = opts.lookStrength * intro
        const yaw = look.x * 0.75 * s, pitch = look.y * 0.4 * s
        const breathe = still ? 0 : Math.sin(t * 1.35) * 0.012
        const sway = still ? 0 : Math.sin(t * 0.45) * 0.025
        worldRot("Hips", 0, sway * 0.6 + yaw * 0.06, sway * 0.25)
        worldRot("Spine1", breathe, yaw * 0.12, -sway * 0.3)
        worldRot("Spine2", breathe * 0.6, yaw * 0.12, 0)
        worldRot("Neck", pitch * 0.35, yaw * 0.3, 0)
        worldRot("Head", pitch * 0.65, yaw * 0.45, -look.x * 0.05 * s)
        // arms: lowered from the rest pose into a relaxed hang, elbows soft
        worldRot("LeftArm", 0.12, 0, -relax - breathe * 0.8 - sway * 0.2)
        worldRot("LeftForeArm", 0, relax * 0.25, -relax * 0.12)

        // wave: right arm comes up from the hang, forearm swings
        const wt = t - waveAt
        const env = wt >= 0 && wt < 2.4 ? Math.sin(Math.PI * clamp01(wt / 2.4)) ** 0.6 : 0
        const hang = relax + breathe * 0.8 + sway * 0.2
        worldRot("RightArm", 0.12 * (1 - env), 0, hang * (1 - env) + (relax > 0 ? -0.25 : -1.55) * env)
        worldRot("RightForeArm", 0, -relax * 0.25 * (1 - env), relax * 0.12 * (1 - env) + (-1.15 + Math.sin(wt * 11) * 0.35) * env)
        if (env > 0) worldRot("RightHand", 0, 0, Math.sin(wt * 11 + 0.6) * 0.15 * env)

        renderer.render(scene, camera)
    }
    tick()

    return {
        setOptions(next: Partial<AvatarOptions>) {
            const framingChanged = next.framing && next.framing !== opts.framing
            opts = { ...opts, ...next }
            if (framingChanged) frame()
        },
        replay: begin,
        destroy() {
            disposed = true
            cancelAnimationFrame(raf); clock.dispose?.()
            ro.disconnect(); io.disconnect()
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
            canvas.removeEventListener("pointerdown", onDown)
            scene.traverse((o: any) => {
                o.geometry?.dispose?.()
                const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []
                mats.forEach((m: any) => { Object.values(m).forEach((v: any) => v?.isTexture && v.dispose()); m.dispose() })
            })
            shTex.dispose(); envTex.dispose(); pmrem.dispose(); renderer.dispose()
            canvas.remove()
        },
    }
}

// ── Framer component ─────────────────────────────────────────────────────────
type Props = Partial<AvatarOptions> & { model?: string; style?: React.CSSProperties }

export default function AboutAvatar(props: Props) {
    const ref = React.useRef<HTMLDivElement>(null)
    const inst = React.useRef<ReturnType<typeof mountAvatar> | null>(null)
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const url = props.model || props.modelUrl || ""
    const opts: AvatarOptions = {
        modelUrl: url,
        framing: props.framing ?? "full",
        start: props.start ?? "inView",
        delay: props.delay ?? 0.2,
        assembleDuration: props.assembleDuration ?? 2.4,
        skinDuration: props.skinDuration ?? 1.8,
        scatter: props.scatter ?? 0.9,
        polyColor: props.polyColor ?? "#D8C7E4",
        edgeColor: props.edgeColor ?? "#6B5F76",
        edgeOpacity: props.edgeOpacity ?? 0.55,
        lookStrength: props.lookStrength ?? 1,
        draggable: props.draggable ?? true,
        waveOnClick: props.waveOnClick ?? true,
        shadow: props.shadow ?? 0.6,
        isCanvas,
    }

    React.useEffect(() => {
        if (!ref.current || !url) return
        inst.current = mountAvatar(ref.current, opts)
        return () => { inst.current?.destroy(); inst.current = null }
    }, [url, isCanvas])

    React.useEffect(() => { inst.current?.setOptions(opts) })

    return (
        <div ref={ref} style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", ...props.style }}>
            {!url && (
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", font: "13px/1.4 -apple-system, sans-serif", color: "#A89FB0", textAlign: "center", padding: 24 }}>
                    Add aparna.glb in the Model property
                </div>
            )}
        </div>
    )
}

addPropertyControls(AboutAvatar, {
    model: { type: ControlType.File, title: "Model", allowedFileTypes: ["glb"] },
    modelUrl: { type: ControlType.String, title: "Model URL", placeholder: "https://…/aparna.glb", hidden: (p: any) => !!p.model },
    framing: { type: ControlType.Enum, title: "Framing", options: ["full", "waist", "portrait"], optionTitles: ["Full body", "Waist up", "Portrait"], defaultValue: "full" },
    start: { type: ControlType.Enum, title: "Start", options: ["inView", "load"], optionTitles: ["In view", "On load"], defaultValue: "inView" },
    delay: { type: ControlType.Number, title: "Delay", min: 0, max: 3, step: 0.1, unit: "s", defaultValue: 0.2 },
    assembleDuration: { type: ControlType.Number, title: "Assemble", min: 0.5, max: 6, step: 0.1, unit: "s", defaultValue: 2.4 },
    skinDuration: { type: ControlType.Number, title: "Skin", min: 0.3, max: 5, step: 0.1, unit: "s", defaultValue: 1.8 },
    scatter: { type: ControlType.Number, title: "Scatter", min: 0, max: 2.5, step: 0.05, defaultValue: 0.9 },
    polyColor: { type: ControlType.Color, title: "Facet color", defaultValue: "#D8C7E4" },
    edgeColor: { type: ControlType.Color, title: "Edge color", defaultValue: "#6B5F76" },
    edgeOpacity: { type: ControlType.Number, title: "Edges", min: 0, max: 1, step: 0.05, defaultValue: 0.55 },
    lookStrength: { type: ControlType.Number, title: "Look at cursor", min: 0, max: 1.5, step: 0.05, defaultValue: 1 },
    draggable: { type: ControlType.Boolean, title: "Drag to turn", defaultValue: true },
    waveOnClick: { type: ControlType.Boolean, title: "Wave on click", defaultValue: true },
    shadow: { type: ControlType.Number, title: "Shadow", min: 0, max: 1, step: 0.05, defaultValue: 0.6 },
})

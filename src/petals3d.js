// Real 3D petal field — three.js / WebGL
// ============================================================================
// Returns a controller with a live `config` object + helpers so external UI
// (e.g. the control panel) can tune the scene at runtime.
// ============================================================================

import * as THREE from 'three'
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

// ---------- Default config (all live-tunable) -------------------------------
export const DEFAULTS = {
  count:        95,
  scaleMin:     0.43,
  scaleMax:     0.79,
  depthMin:     0.75,
  depthMax:     1.15,
  gravity:      0.00012,
  drift:        0.0003,
  damping:      0.962,
  rotationSpd:  0.003,
  initialFall:  0.0100,
  mouseRadius:  1.10,
  mouseForce:   0.005,
  mouseEnabled: true,
  paused:       false,
  keyIntensity: 0.80,
  envIntensity: 0.80,
  exposure:     1.05,
  repelRadius:  1.2,
  repelForce:   0.006,
}

// ---------- Petal geometry --------------------------------------------------
function petalSurface(u, v, target) {
  const widthProfile = Math.sin(u * Math.PI) * 0.55
  const x = (v - 0.5) * widthProfile * 2
  const y = (u - 0.5) * 1.4
  const cup  = Math.cos((v - 0.5) * Math.PI) * 0.18
  const curl = Math.sin(u * Math.PI) * 0.32 + (u > 0.7 ? (u - 0.7) * 0.6 : 0)
  const z = -cup - curl
  target.set(x, y, z)
}

// ---------- Brushed metal normal map (procedural) ----------------------------
function generateBrushedNormalMap() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = 'rgb(128, 128, 255)'
  ctx.fillRect(0, 0, size, size)

  const imageData = ctx.getImageData(0, 0, size, size)
  const data = imageData.data

  for (let y = 0; y < size; y++) {
    const lineStrength = (Math.random() - 0.5) * 100
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const grain = (Math.random() - 0.5) * 50
      data[i]     = Math.max(0, Math.min(255, 128 + lineStrength + grain))
      data[i + 1] = Math.max(0, Math.min(255, 128 + (Math.random() - 0.5) * 25))
    }
  }

  ctx.putImageData(imageData, 0, 0)

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(4, 4)
  return tex
}

// ---------- Material variants -----------------------------------------------
function makeMaterials() {
  const M = THREE.MeshPhysicalMaterial
  const normalMap = generateBrushedNormalMap()
  const nScale = new THREE.Vector2(0.9, 0.9)
  return [
    new M({
      color: 0xF2EFE9, metalness: 1.0, roughness: 0.18,
      iridescence: 0.7, iridescenceIOR: 1.45,
      clearcoat: 0.4, clearcoatRoughness: 0.25,
      normalMap, normalScale: nScale,
      side: THREE.DoubleSide,
    }),
    new M({
      color: 0xFFD9C0, metalness: 0.35, roughness: 0.38,
      sheen: 0.8, sheenColor: new THREE.Color(0xFFE6D2), sheenRoughness: 0.4,
      clearcoat: 0.3, clearcoatRoughness: 0.4,
      normalMap, normalScale: nScale,
      side: THREE.DoubleSide,
    }),
    new M({
      color: 0xF8B5C0, metalness: 0.30, roughness: 0.35,
      sheen: 0.6, sheenColor: new THREE.Color(0xFFC8D2),
      clearcoat: 0.5, clearcoatRoughness: 0.25,
      transmission: 0.18, thickness: 0.3, ior: 1.3,
      normalMap, normalScale: nScale,
      side: THREE.DoubleSide,
    }),
    new M({
      color: 0xFCF1DE, metalness: 0.30, roughness: 0.40,
      sheen: 0.55, sheenColor: new THREE.Color(0xFFEFD8),
      normalMap, normalScale: nScale,
      side: THREE.DoubleSide,
    }),
    new M({
      color: 0xF59B8E, metalness: 0.35, roughness: 0.35,
      sheen: 0.55, sheenColor: new THREE.Color(0xFFB7AB),
      clearcoat: 0.35, clearcoatRoughness: 0.3,
      normalMap, normalScale: nScale,
      side: THREE.DoubleSide,
    }),
    new M({
      color: 0xF1E4C2, metalness: 0.7, roughness: 0.3,
      iridescence: 0.4, iridescenceIOR: 1.35,
      normalMap, normalScale: nScale,
      side: THREE.DoubleSide,
    }),
  ]
}

// ---------- Petal -----------------------------------------------------------
class Petal {
  constructor(mesh, bounds, config) {
    this.mesh = mesh
    this.config = config
    this.vel  = new THREE.Vector3()
    this.angVel = new THREE.Vector3()
    this.depth = 0
    this.spawn(bounds, true)
  }

  spawn(bounds, initial = false) {
    const c = this.config
    const { w, h, d } = bounds
    this.depth = c.depthMin + Math.random() * Math.max(0, c.depthMax - c.depthMin)
    this.angVel.set(
      (Math.random() - 0.5) * c.rotationSpd,
      (Math.random() - 0.5) * c.rotationSpd * 1.4,
      (Math.random() - 0.5) * c.rotationSpd,
    )
    this.mesh.position.set(
      (Math.random() - 0.5) * w,
      initial ? h * 0.52 + Math.random() * h * 0.5
              : h * 0.52 + Math.random() * h * 0.08,
      (Math.random() - 0.5) * d,
    )
    this.mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    )
    const s = c.scaleMin + Math.random() * Math.max(0, c.scaleMax - c.scaleMin)
    this.mesh.scale.setScalar(s)
    const baseFall = c.initialFall
    this.vel.set(
      (Math.random() - 0.5) * 0.002,
      initial ? -baseFall * (1.5 + Math.random() * 2.5)
              : -baseFall * (0.4 + Math.random() * 0.9),
      0,
    )
  }

  step(dt, mouse, bounds) {
    const c = this.config

    this.vel.y -= c.gravity * dt
    this.vel.x += (Math.random() - 0.5) * c.drift
    this.vel.z += (Math.random() - 0.5) * c.drift * 0.6

    if (c.mouseEnabled && mouse.active) {
      const dx = this.mesh.position.x - mouse.pos.x
      const dy = this.mesh.position.y - mouse.pos.y
      const dz = this.mesh.position.z
      const distSq = dx*dx + dy*dy + dz*dz
      const r = c.mouseRadius
      if (distSq < r * r) {
        const dist = Math.sqrt(distSq) || 0.001
        const force = (1 - dist / r) * c.mouseForce
        this.vel.x += (dx / dist) * force
        this.vel.y += (dy / dist) * force * 0.6
        this.angVel.x += (Math.random() - 0.5) * 0.005 * force
        this.angVel.z += (Math.random() - 0.5) * 0.005 * force
      }
    }

    this.vel.multiplyScalar(c.damping)

    this.mesh.position.addScaledVector(this.vel, dt * this.depth)
    this.mesh.rotation.x += this.angVel.x * dt
    this.mesh.rotation.y += this.angVel.y * dt
    this.mesh.rotation.z += this.angVel.z * dt

    const { w, h, d } = bounds
    if (this.mesh.position.x < -w * 0.6) this.mesh.position.x =  w * 0.55
    if (this.mesh.position.x >  w * 0.6) this.mesh.position.x = -w * 0.55
    if (this.mesh.position.z < -d * 0.6) this.mesh.position.z =  d * 0.55
    if (this.mesh.position.z >  d * 0.6) this.mesh.position.z = -d * 0.55
    if (this.mesh.position.y < -h * 0.6) this.spawn(bounds)
  }
}

// ---------- Public API ------------------------------------------------------
export function startPetals3D(container, userConfig = {}) {
  const config = { ...DEFAULTS, ...userConfig }

  const renderer = new THREE.WebGLRenderer({
    antialias: true, alpha: true, powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = config.exposure
  container.appendChild(renderer.domElement)

  const scene  = new THREE.Scene()
  scene.background = null

  const pmrem = new THREE.PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()
  const envScene = new RoomEnvironment()
  scene.environment = pmrem.fromScene(envScene, 0.04).texture
  scene.environmentIntensity = config.envIntensity

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
  camera.position.set(0, 0, 9)

  scene.add(new THREE.AmbientLight(0xfff5ed, 0.25))

  const key = new THREE.DirectionalLight(0xffe2cc, config.keyIntensity)
  key.position.set(4, 6, 5)
  scene.add(key)

  const fill = new THREE.DirectionalLight(0xd2dcff, 0.35)
  fill.position.set(-5, 2, 3)
  scene.add(fill)

  const geom = new ParametricGeometry(petalSurface, 22, 22)
  geom.computeVertexNormals()
  const materials = makeMaterials()

  const bounds = { w: 10, h: 6, d: 4 }
  const petals = []

  const addPetal = () => {
    const mat = materials[petals.length % materials.length]
    const mesh = new THREE.Mesh(geom, mat)
    scene.add(mesh)
    petals.push(new Petal(mesh, bounds, config))
  }
  const removePetal = () => {
    const p = petals.pop()
    if (p) scene.remove(p.mesh)
  }

  for (let i = 0; i < config.count; i++) addPetal()

  // Mouse → world-plane projection
  const mouse = { pos: new THREE.Vector3(), active: false }
  const ndc   = new THREE.Vector2()
  const ray   = new THREE.Raycaster()
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)

  const onMove = (e) => {
    const r = renderer.domElement.getBoundingClientRect()
    ndc.x = ((e.clientX - r.left) / r.width)  *  2 - 1
    ndc.y = ((e.clientY - r.top)  / r.height) * -2 + 1
    ray.setFromCamera(ndc, camera)
    const hit = new THREE.Vector3()
    ray.ray.intersectPlane(plane, hit)
    if (hit) {
      mouse.pos.copy(hit)
      mouse.active = true
    }
  }
  const onLeave = () => { mouse.active = false }

  const resize = () => {
    const w = container.clientWidth  || window.innerWidth
    const h = container.clientHeight || window.innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()

    const distance = camera.position.z
    const vH = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * distance
    const vW = vH * camera.aspect
    bounds.w = vW * 1.15
    bounds.h = vH * 1.15
    bounds.d = 2.2
  }

  window.addEventListener('resize', resize)
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseleave', onLeave)
  resize()

  // Pre-simulate ~5 seconds so petals are already mid-fall on first render
  const _dv = new THREE.Vector3()
  const dummyMouse = { pos: new THREE.Vector3(), active: false }
  const PRE_SIM_FRAMES = 300
  for (let f = 0; f < PRE_SIM_FRAMES; f++) {
    const rr = config.repelRadius
    const rf = config.repelForce
    const rrSq = rr * rr
    for (let i = 0; i < petals.length; i++) {
      const pi = petals[i]
      for (let j = i + 1; j < petals.length; j++) {
        const pj = petals[j]
        _dv.subVectors(pi.mesh.position, pj.mesh.position)
        const dSq = _dv.lengthSq()
        if (dSq < rrSq && dSq > 0.0001) {
          const d = Math.sqrt(dSq)
          const strength = (1 - d / rr) * rf
          _dv.divideScalar(d)
          pi.vel.addScaledVector(_dv, strength)
          pj.vel.addScaledVector(_dv, -strength)
        }
      }
      pi.step(1, dummyMouse, bounds)
    }
  }

  // Animation loop
  let last = performance.now()
  let raf  = 0
  const tick = (now) => {
    const dt = Math.min(48, now - last) / 16.67
    last = now
    if (!config.paused) {
      const rr = config.repelRadius
      const rf = config.repelForce
      const rrSq = rr * rr
      for (let i = 0; i < petals.length; i++) {
        const pi = petals[i]
        for (let j = i + 1; j < petals.length; j++) {
          const pj = petals[j]
          _dv.subVectors(pi.mesh.position, pj.mesh.position)
          const dSq = _dv.lengthSq()
          if (dSq < rrSq && dSq > 0.0001) {
            const d = Math.sqrt(dSq)
            const strength = (1 - d / rr) * rf
            _dv.divideScalar(d)
            pi.vel.addScaledVector(_dv, strength)
            pj.vel.addScaledVector(_dv, -strength)
          }
        }
        pi.step(dt, mouse, bounds)
      }
    }
    renderer.render(scene, camera)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  // ----- Controller exposed to the panel -----
  return {
    config,
    setCount(n) {
      n = Math.max(0, Math.min(300, Math.round(n)))
      while (petals.length < n) addPetal()
      while (petals.length > n) removePetal()
      config.count = n
    },
    respawnAll() {
      for (const p of petals) p.spawn(bounds, true)
    },
    setKeyIntensity(v) {
      config.keyIntensity = v
      key.intensity = v
    },
    setEnvIntensity(v) {
      config.envIntensity = v
      scene.environmentIntensity = v
    },
    setExposure(v) {
      config.exposure = v
      renderer.toneMappingExposure = v
    },
    dispose() {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
      geom.dispose()
      materials.forEach((m) => m.dispose())
      renderer.dispose()
      pmrem.dispose()
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
    },
  }
}

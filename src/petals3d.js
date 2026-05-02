// Real 3D petal field — three.js / WebGL
// ============================================================================
// Scene setup mimics a small Blender shoot: a curved parametric petal mesh,
// duplicated with several material variants (silver foil, peach satin, pink
// translucent, cream matte), three-point lighting, and per-petal float +
// tumble physics. Cursor casts a soft repulsion onto the field.
//
// Deps: three, three/addons/geometries/ParametricGeometry.js
// ============================================================================

import * as THREE from 'three'
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

// ---------- Petal geometry ---------------------------------------------------
// Parametric surface: u along length, v across width.
// Tip (u=1) is narrow, base (u=0) is narrow, middle is widest — teardrop.
// The petal cups slightly along v and curls forward at the tip along u.
function petalSurface(u, v, target) {
  const widthProfile = Math.sin(u * Math.PI) * 0.55       // teardrop outline
  const x = (v - 0.5) * widthProfile * 2
  const y = (u - 0.5) * 1.4                               // length
  // Cup across width + curl toward tip
  const cup  = Math.cos((v - 0.5) * Math.PI) * 0.18
  const curl = Math.sin(u * Math.PI) * 0.32 + (u > 0.7 ? (u - 0.7) * 0.6 : 0)
  const z = -cup - curl
  target.set(x, y, z)
}

// ---------- Material variants -----------------------------------------------
function makeMaterials() {
  const M = THREE.MeshPhysicalMaterial
  return [
    new M({ // silver foil — bright, mirror-like
      color: 0xF2EFE9, metalness: 1.0, roughness: 0.18,
      iridescence: 0.7, iridescenceIOR: 1.45,
      clearcoat: 0.4, clearcoatRoughness: 0.25,
      side: THREE.DoubleSide,
    }),
    new M({ // peach satin
      color: 0xFFD9C0, metalness: 0.15, roughness: 0.45,
      sheen: 0.8, sheenColor: new THREE.Color(0xFFE6D2), sheenRoughness: 0.4,
      clearcoat: 0.3, clearcoatRoughness: 0.4,
      side: THREE.DoubleSide,
    }),
    new M({ // soft pink — translucent feel without heavy refraction
      color: 0xF8B5C0, metalness: 0.08, roughness: 0.4,
      sheen: 0.6, sheenColor: new THREE.Color(0xFFC8D2),
      clearcoat: 0.5, clearcoatRoughness: 0.25,
      transmission: 0.18, thickness: 0.3, ior: 1.3,
      side: THREE.DoubleSide,
    }),
    new M({ // cream
      color: 0xFCF1DE, metalness: 0.1, roughness: 0.5,
      sheen: 0.55, sheenColor: new THREE.Color(0xFFEFD8),
      side: THREE.DoubleSide,
    }),
    new M({ // pale coral
      color: 0xF59B8E, metalness: 0.18, roughness: 0.42,
      sheen: 0.55, sheenColor: new THREE.Color(0xFFB7AB),
      clearcoat: 0.35, clearcoatRoughness: 0.3,
      side: THREE.DoubleSide,
    }),
    new M({ // pale gold / bone
      color: 0xF1E4C2, metalness: 0.7, roughness: 0.3,
      iridescence: 0.4, iridescenceIOR: 1.35,
      side: THREE.DoubleSide,
    }),
  ]
}

// ---------- Petal physics ---------------------------------------------------
class Petal {
  constructor(mesh, bounds) {
    this.mesh = mesh
    this.vel  = new THREE.Vector3()
    this.angVel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.012,
      (Math.random() - 0.5) * 0.018,
      (Math.random() - 0.5) * 0.012,
    )
    this.depth = 0.55 + Math.random() * 0.55
    this.spawn(bounds, true)
  }

  spawn(bounds, initial = false) {
    const { w, h, d } = bounds
    this.mesh.position.set(
      (Math.random() - 0.5) * w,
      initial ? (Math.random() - 0.5) * h * 0.95
              : h * 0.42 + Math.random() * h * 0.08,    // right at the top edge
      (Math.random() - 0.5) * d,
    )
    this.mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    )
    const s = 0.28 + Math.random() * 0.42
    this.mesh.scale.setScalar(s)
    this.vel.set((Math.random() - 0.5) * 0.002, -0.0008 - Math.random() * 0.0018, 0)
  }

  step(dt, mouse, bounds) {
    // Gentle gravity + drift — slow enough to feel suspended
    this.vel.y -= 0.00003 * dt
    this.vel.x += (Math.random() - 0.5) * 0.0006
    this.vel.z += (Math.random() - 0.5) * 0.0004

    // Mouse repulsion in 3D — mouse projected onto z=0 plane
    if (mouse.active) {
      const dx = this.mesh.position.x - mouse.pos.x
      const dy = this.mesh.position.y - mouse.pos.y
      const dz = this.mesh.position.z - 0
      const distSq = dx*dx + dy*dy + dz*dz
      const radius = 2.2
      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq) || 0.001
        const force = (1 - dist / radius) * 0.025
        this.vel.x += (dx / dist) * force
        this.vel.y += (dy / dist) * force * 0.6
        // Bonus tumble when poked
        this.angVel.x += (Math.random() - 0.5) * 0.005 * force
        this.angVel.z += (Math.random() - 0.5) * 0.005 * force
      }
    }

    // Damping
    this.vel.multiplyScalar(0.995)

    this.mesh.position.addScaledVector(this.vel, dt * this.depth)
    this.mesh.rotation.x += this.angVel.x * dt
    this.mesh.rotation.y += this.angVel.y * dt
    this.mesh.rotation.z += this.angVel.z * dt

    // Wrap / respawn
    const { w, h, d } = bounds
    if (this.mesh.position.x < -w * 0.6) this.mesh.position.x =  w * 0.55
    if (this.mesh.position.x >  w * 0.6) this.mesh.position.x = -w * 0.55
    if (this.mesh.position.z < -d * 0.6) this.mesh.position.z =  d * 0.55
    if (this.mesh.position.z >  d * 0.6) this.mesh.position.z = -d * 0.55
    if (this.mesh.position.y < -h * 0.6) this.spawn(bounds)
  }
}

// ---------- Public API ------------------------------------------------------
export function startPetals3D(container, { count = 32 } = {}) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  container.appendChild(renderer.domElement)

  const scene  = new THREE.Scene()
  scene.background = null

  // PBR environment map — the key to clean metallic / iridescent reflections
  const pmrem = new THREE.PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()
  const envScene = new RoomEnvironment()
  scene.environment = pmrem.fromScene(envScene, 0.04).texture
  scene.environmentIntensity = 0.9

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
  camera.position.set(0, 0, 9)

  // Soft fills — env map carries most of the lighting work now
  scene.add(new THREE.AmbientLight(0xfff5ed, 0.25))

  const key = new THREE.DirectionalLight(0xffe2cc, 0.9)
  key.position.set(4, 6, 5)
  scene.add(key)

  const fill = new THREE.DirectionalLight(0xd2dcff, 0.35)
  fill.position.set(-5, 2, 3)
  scene.add(fill)

  // Geometry + materials
  const geom = new ParametricGeometry(petalSurface, 22, 22)
  geom.computeVertexNormals()
  const materials = makeMaterials()

  const bounds = { w: 10, h: 6, d: 4 }

  const petals = []
  for (let i = 0; i < count; i++) {
    const mat = materials[i % materials.length]
    const mesh = new THREE.Mesh(geom, mat)
    scene.add(mesh)
    petals.push(new Petal(mesh, bounds))
  }

  // Mouse → world-plane projection
  const mouse = { pos: new THREE.Vector3(), active: false }
  const ndc   = new THREE.Vector2()
  const ray   = new THREE.Raycaster()
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0) // z=0

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

  // Resize
  const resize = () => {
    const w = container.clientWidth  || window.innerWidth
    const h = container.clientHeight || window.innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()

    // Fit world bounds to viewport so petals cover the screen
    const distance = camera.position.z
    const vH = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * distance
    const vW = vH * camera.aspect
    bounds.w = vW * 1.15
    bounds.h = vH * 1.15
    bounds.d = 2.2     /* shallower depth keeps more petals on-camera */
  }

  window.addEventListener('resize', resize)
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseleave', onLeave)
  resize()

  // Animation loop
  let last = performance.now()
  let raf  = 0
  const tick = (now) => {
    const dt = Math.min(48, now - last) / 16.67
    last = now
    for (let i = 0; i < petals.length; i++) {
      petals[i].step(dt, mouse, bounds)
    }
    renderer.render(scene, camera)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseleave', onLeave)
    geom.dispose()
    materials.forEach((m) => m.dispose())
    renderer.dispose()
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }
}

import { Easing, Group, Tween } from '@tweenjs/tween.js'
import * as THREE from 'three'

interface ParticleParams {
  particleCount: number
  initialPoints?: Float32Array
}
function init(target: HTMLElement) {
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 80)
  const scene = new THREE.Scene()
  const renderer = new THREE.WebGLRenderer({ antialias: true })

  renderer.setPixelRatio(window.devicePixelRatio)
  camera.position.z = 5
  renderer.setSize(window.innerWidth, window.innerHeight)
  target.appendChild(renderer.domElement)

  return { renderer, scene, camera }
}

function generateRandomPoints(count: number) {
  const arr = new Float32Array(count * 3)
  for (let i = 0; i < count * 3; i++) {
    arr[i] = THREE.MathUtils.randFloat(-4, 4)
  }
  return arr
}

// 统一采样点数
function samplePoints(source: Float32Array, count: number): Float32Array {
  const result = new Float32Array(count * 3)
  const sourceCount = source.length / 3

  if (sourceCount >= count) {
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * sourceCount)
      result[i * 3] = source[idx * 3]
      result[i * 3 + 1] = source[idx * 3 + 1]
      result[i * 3 + 2] = source[idx * 3 + 2]
    }
  }
  else {
    for (let i = 0; i < count; i++) {
      const idx = i % sourceCount
      result[i * 3] = source[idx * 3]
      result[i * 3 + 1] = source[idx * 3 + 1]
      result[i * 3 + 2] = source[idx * 3 + 2]
    }
  }
  return result
}
export async function createParticles(target: HTMLElement, particleParams: ParticleParams) {
  const { particleCount, initialPoints } = particleParams
  const fromPoints = initialPoints || generateRandomPoints(particleCount)
  const { camera, renderer, scene } = init(target)
  const particleGroup = new THREE.Group()

  // === 2. 创建粒子系统 ===
  const geometry = new THREE.BufferGeometry()
  const positionArray = new Float32Array(fromPoints) // 初始为第一个形状
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positionArray, 3))

  const texture = await new THREE.TextureLoader().loadAsync('/white-dot.png')
  const material = new THREE.PointsMaterial({
    size: 0.03,
    // map: texture,
    // alphaTest: 0.1,
    // opacity: 0.5,
    // transparent: true,
    depthTest: true,
  })

  const points = new THREE.Points(geometry, material)
  particleGroup.add(points)
  scene.add(particleGroup)

  const positionAttribute = geometry.attributes.position as THREE.BufferAttribute

  const transitionTime = 50 // 切换动画持续 4 秒
  const tweeGroup = new Group()
  // === 4. 启动切换循环 ===
  let from = fromPoints
  function startNextTransition(toPoints: Float32Array) {
    // 重置 positionArray 为 "from" 状态（确保起始正确）
    // positionArray.set(from)
    positionAttribute.needsUpdate = true

    // 启动 Tween：0 → 1
    const twee = new Tween({ progress: 0 })
      .to({ progress: 1 }, transitionTime)
      .easing(Easing.Quadratic.InOut)
      .yoyo(true)
      .onUpdate(({ progress }) => {
        const arr = positionAttribute.array as Float32Array
        const len = Math.min(arr.length, from.length, toPoints.length)
        for (let i = 0; i < len; i++) {
          arr[i] = THREE.MathUtils.lerp(from[i], toPoints[i], progress)
        }
        positionAttribute.needsUpdate = true
      })
      .onComplete(() => {
        tweeGroup.remove(twee)
        from = toPoints
      })
      .start()
    tweeGroup.add(twee)
  }
  // === 5. 渲染循环 ===
  function animate() {
    tweeGroup.update()
    renderer.render(scene, camera)
    // scene.rotation.y += 0.1 * Math.PI / 360
    requestAnimationFrame(animate)
  }
  animate()

  return {
    startNextTransition,
  }
}

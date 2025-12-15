import { Easing, Group, Tween } from '@tweenjs/tween.js'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const particleGroup = new THREE.Group()

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

async function generateRandomPoints(count: number): Promise<Float32Array> {
  const arr = new Float32Array(count * 3)
  for (let i = 0; i < count * 3; i++) {
    arr[i] = THREE.MathUtils.randFloat(-4, 4)
  }
  return arr
}

async function loadModelPoints(paths: string[], particleCount: number): Promise<Float32Array[]> {
  const loader = new GLTFLoader()
  const results: Float32Array[] = []

  for (const path of paths) {
    try {
      const gltf = await loader.loadAsync(path)
      let positions: Float32Array | null = null

      gltf.scene.traverse((child) => {
        if (child.type === 'Mesh' && child.geometry.hasAttribute('position')) {
          positions = child.geometry.attributes.position.array as Float32Array
        }
      })

      if (positions) {
        results.push(samplePoints(positions, particleCount))
      }
      else {
        console.warn(`No valid geometry in ${path}, using random points`)
        results.push(await generateRandomPoints(particleCount))
      }
    }
    catch (e) {
      console.error(`Failed to load ${path}`, e)
      results.push(await generateRandomPoints(particleCount))
    }
  }

  return results
}

export async function createParticles(target: HTMLElement, particleCount = 3000) {
  const { camera, renderer, scene } = init(target)

  // === 1. 准备所有形状 ===
  const initialPoints = await generateRandomPoints(particleCount)
  const modelPoints = await loadModelPoints(['/box.glb', '/box1.glb', '/sphere.glb'], particleCount)

  // 形状序列：[初始, 模型1, 模型2, 模型3]
  const shapes: Float32Array[] = [initialPoints, ...modelPoints]
  let currentShapeIndex = 0

  // === 2. 创建粒子系统 ===
  const geometry = new THREE.BufferGeometry()
  const positionArray = new Float32Array(shapes[0]) // 初始为第一个形状
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positionArray, 3))

  const texture = await new THREE.TextureLoader().loadAsync('/white-dot.png')
  const material = new THREE.PointsMaterial({
    size: 0.03,
    map: texture,
    alphaTest: 0.1,
    opacity: 0.5,
    transparent: true,
    depthTest: true,
  })

  const points = new THREE.Points(geometry, material)
  particleGroup.add(points)
  scene.add(particleGroup)

  const positionAttribute = geometry.attributes.position as THREE.BufferAttribute

  // === 3. 切换逻辑参数 ===
  const holdTime = 6000 // 每个模型停留 5 秒
  const transitionTime = 3200 // 切换动画持续 4 秒
  const totalShapes = shapes.length
  const tweeGroup = new Group()
  // === 4. 启动切换循环 ===
  function startNextTransition() {
    const fromIndex = currentShapeIndex
    const toIndex = (currentShapeIndex + 1) % totalShapes
    currentShapeIndex = toIndex

    const from = shapes[fromIndex]
    const to = shapes[toIndex]

    // 重置 positionArray 为 "from" 状态（确保起始正确）
    positionArray.set(from)
    positionAttribute.needsUpdate = true

    // 启动 Tween：0 → 1
    const twee = new Tween({ progress: 0 })
      .to({ progress: 1 }, transitionTime)
      .easing(Easing.Quadratic.InOut)
      .yoyo(true)
      .onUpdate(({ progress }) => {
        const arr = positionAttribute.array as Float32Array
        const len = Math.min(arr.length, from.length, to.length)
        for (let i = 0; i < len; i++) {
          arr[i] = THREE.MathUtils.lerp(from[i], to[i], progress)
        }
        positionAttribute.needsUpdate = true
      })
      .onComplete(() => {
        // 动画结束，保持在目标形状
        // 下一次切换将在 holdTime 后触发
        tweeGroup.remove(twee)
        setTimeout(startNextTransition, holdTime)
      })
      .start()
      tweeGroup.add(twee)
  }

  // 首次切换：从初始 → 第一个模型（2秒后开始）
  setTimeout(startNextTransition, holdTime)

  // === 5. 渲染循环 ===
  function animate() {
    tweeGroup.update()
    renderer.render(scene, camera)
    scene.rotation.y += 0.1 * Math.PI / 360
    requestAnimationFrame(animate)
  }
  animate()
}

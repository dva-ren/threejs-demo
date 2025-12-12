import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const particleGroup = new THREE.Group()
function init(target: HTMLElement) {
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 80)
  const scene = new THREE.Scene()
  const renderer = new THREE.WebGLRenderer()

  // scene.background = backgroundTexture()
  renderer.setPixelRatio(window.devicePixelRatio)
  camera.position.z = 5
  renderer.setSize(window.innerWidth, window.innerHeight)
  target.appendChild(renderer.domElement)

  return {
    renderer,
    scene,
    camera,
  }
}

function backgroundTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createLinearGradient(0, 0, window.innerWidth, 0)
  gradient.addColorStop(0, '#4e22b7')
  gradient.addColorStop(1, '#3292ff')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const canvasTexture = new THREE.CanvasTexture(canvas)
  return canvasTexture
}

async function generatePoints(pointNum: number) {
  const geometry = new THREE.BufferGeometry()
  const vertices = new Float32Array(pointNum * 3)

  for (let i = 0; i < pointNum; i++) {
    vertices[i * 3] = THREE.MathUtils.randFloat(-4, 4)
    vertices[i * 3 + 1] = THREE.MathUtils.randFloat(-4, 4)
    vertices[i * 3 + 2] = THREE.MathUtils.randFloat(-4, 4)
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  const texture = await new THREE.TextureLoader().loadAsync('/white-dot.png')
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    size: 0.03,
    map: texture,
    alphaTest: 0.1,
    opacity: 0.5,
    transparent: true,
    depthTest: true,
  }))
  return {
    points,
    startPoints: vertices,
  }
}
let targetPosition: Float32Array = new Float32Array()

export async function createParticles(target: HTMLElement, pointNum: number) {
  const { camera, renderer, scene } = init(target)
  const bufferArray: Array<Float32Array> = []

  const { points, startPoints: starts } = await generatePoints(pointNum)
  bufferArray.push(starts)
  particleGroup.add(points)
  scene.add(particleGroup)

  const gltflLoader = new GLTFLoader()
  gltflLoader.load('/box.glb', (glb) => {
    glb.scene.traverse((child) => {
      if (child.type === 'Mesh') {
        bufferArray.push(child.geometry.attributes.position.array)
      }
    })
  })

  gltflLoader.load('/box1.glb', (glb) => {
    glb.scene.traverse((child) => {
      if (child.type === 'Mesh') {
        child.geometry.scale(0.5, 0.5, 0.5)
        bufferArray.push(child.geometry.attributes.position.array)
      }
    })
  })

  gltflLoader.load('/sphere.glb', (glb) => {
    glb.scene.traverse((child) => {
      if (child.type === 'Mesh') {
        child.geometry.translate(1, 0, 0)
        bufferArray.push(child.geometry.attributes.position.array)
      }
    })
  })

  const step = 0.01
  let lastTime = 0
  let process = 0
  let flag = false
  let currentIndex = 0
  let startPosition = bufferArray[currentIndex]
  let targetPosition = bufferArray[currentIndex + 1]
  function animate(time: number) {
    const delta = (time - lastTime) * 0.001
    lastTime = time

    if (flag && process < 1) {
      const positionAttribute = points.geometry.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < targetPosition.length; i++) {
        const index = i * 3
        const x = startPosition[index] + (targetPosition[index] - startPosition[index]) * process
        const y = startPosition[index + 1] + (targetPosition[index + 1] - startPosition[index + 1]) * process
        const z = startPosition[index + 2] + (targetPosition[index + 2] - startPosition[index + 2]) * process
        positionAttribute.setXYZ(i, x, y, z)
      }
      positionAttribute.needsUpdate = true
      process += step
    }
    else {
      process = 0
      flag = false
    }
    renderer.render(scene, camera)
    particleGroup.rotation.y += delta * 0.2 // 每秒转 0.5 弧度（约 28.6°/秒
    requestAnimationFrame(animate)
  }
  animate(0)

  setInterval(() => {
    startPosition = bufferArray[currentIndex]
    currentIndex = (currentIndex + 1) % bufferArray.length
    targetPosition = bufferArray[currentIndex]
    flag = true
  }, 6000)
}

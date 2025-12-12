import * as THREE from 'three'
import { OrbitControls, RoomEnvironment } from 'three/examples/jsm/Addons.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { randInt } from 'three/src/math/MathUtils.js'

const randFloat = THREE.MathUtils.randFloat
const mainGroup = new THREE.Group()
// 设定范围和高度

const radius = 6

const CONFIG = {
  treeHeight: 4,
  treeRadius: 1.5,
}
// 生成随机球体坐标
function randomPointInSphere() {
  let x, y, z, r

  do {
    x = Math.random() * 2 - 1 // [-1, 1]
    y = Math.random() * 2 - 1
    z = Math.random() * 2 - 1
    r = x * x + y * y + z * z
  } while (r > 1) // 拒绝采样：只保留单位球内的点

  const scale = Math.cbrt(Math.random()) // 均匀填充体积（重要！）
  return {
    x: x * scale * radius,
    y: y * scale * radius,
    z: z * scale * radius,
  }
}

// 生成随机圣诞树坐标
function randomPointInTree() {
  const { treeHeight, treeRadius } = CONFIG
  const hollowRatio = 0.8 // 内部空心比例（0 = 实心，1 = 全空）
  const y = Math.random() * treeHeight - treeHeight / 2 // Y ∈ [-2, 2]

  const t = (y + treeHeight / 2) / treeHeight
  const maxRadius = (1 - t) * treeRadius

  const minRadius = maxRadius * hollowRatio // 比如底部 min=0.36，顶部 min=0
  const radiusRange = maxRadius - minRadius

  const u = Math.sqrt(Math.random()) // 保证面积均匀
  const radius = minRadius + u * radiusRange

  const theta = Math.random() * Math.PI * 2
  const x = radius * Math.cos(theta)
  const z = radius * Math.sin(theta)

  return { x, y, z }
}

function createMaterialsAndMeshes(pointNum: number, initPositions: { x: number, y: number, z: number }[] = []) {
  const cubes = []
  // 材质
  const goldMat = new THREE.MeshPhysicalMaterial({
    color: 0xFFAA00,
    metalness: 1.0,
    roughness: 0.15,
    clearcoat: 1.0,
    emissive: 0xAA5500,
    emissiveIntensity: 0.1,
  })
  const silverMat = new THREE.MeshPhysicalMaterial({
    color: 0xEEEEEE,
    metalness: 0.9,
    roughness: 0.2,
    clearcoat: 1.0,
    emissive: 0x222222,
    emissiveIntensity: 0.1,
  })
  const gemMat = new THREE.MeshPhysicalMaterial({
    color: 0xFF0044,
    metalness: 0.1,
    roughness: 0.0,
    transmission: 0.5,
    thickness: 1.0,
    emissive: 0x440011,
    emissiveIntensity: 0.3,
  })
  const emeraldMat = new THREE.MeshPhysicalMaterial({
    color: 0x00AA55,
    metalness: 0.2,
    roughness: 0.1,
    transmission: 0.4,
    thickness: 1.5,
    emissive: 0x002211,
    emissiveIntensity: 0.2,
  })

  // 几何体
  const sphereGeo = new THREE.SphereGeometry(randFloat(0.1, 0.2), 3, 3)
  const boxGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1)
  const diamondGeo = new THREE.OctahedronGeometry(0.1)
  const coneGeo = new THREE.ConeGeometry(0.1, 0.01, 1)
  const geos = [sphereGeo, boxGeo, diamondGeo, coneGeo]
  for (let i = 0; i < pointNum; i++) {
    const { x, y, z } = initPositions[i]
    const cube = new THREE.Mesh(
      geos[randInt(0, geos.length - 1)],
      Math.random() > 0.5 ? goldMat : Math.random() > 0.5 ? silverMat : Math.random() > 0.5 ? gemMat : emeraldMat,
    )
    cube.position.set(x, y, z)
    cubes.push(cube)
  }
  return cubes
}

export function main(target: HTMLElement, pointNum: number) {
  const treePositions = Array.from({ length: pointNum }, () => randomPointInTree())
  const spherePositions = Array.from({ length: pointNum }, () => randomPointInSphere())

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  const composer = new EffectComposer(renderer)
  renderer.setSize(window.innerWidth, window.innerHeight)

  function render() {
    renderer.render(scene, camera)
  }
  target.appendChild(renderer.domElement)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.maxDistance = 10
  controls.addEventListener('change', render)
  camera.position.z = 5
  composer.setSize(window.innerWidth, window.innerHeight)

  // 环境反射
  const pmremGenerator = new THREE.PMREMGenerator(renderer)
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture

  // 灯光
  const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.3)
  scene.add(ambientLight)

  // 主暖光
  const spotLight = new THREE.SpotLight(0xFFDDAA, 80)
  spotLight.position.set(30, 60, 50)
  spotLight.angle = Math.PI / 4
  spotLight.penumbra = 1
  scene.add(spotLight)

  // 冷色补光
  const blueLight = new THREE.PointLight(0xAADDFF, 40, 100)
  blueLight.position.set(-30, -20, 30)
  scene.add(blueLight)

  // Bloom
  const renderScene = new RenderPass(scene, camera)
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(target.clientWidth, target.clientHeight), 1.5, 0.4, 0.85)
  bloomPass.threshold = 0
  bloomPass.strength = 1
  bloomPass.radius = 0

  composer.addPass(renderScene)
  composer.addPass(bloomPass)

  mainGroup.add(...createMaterialsAndMeshes(pointNum, treePositions))
  scene.add(mainGroup)
  let lastTime = 0
  let flag = false
  let process = 1
  function changeStatus() {
    process = 0
    flag = !flag
  }
  const step = 0.01
  function animate(time: number) {
    setTimeout(() => {
      const delta = (time - lastTime) * 0.001 // 转为秒
      lastTime = time

      const positions = flag ? spherePositions : treePositions

      if (process < 1) {
        mainGroup.children.forEach((cube, i) => {
          const position = positions[i]
          cube.position.lerpVectors(cube.position, new THREE.Vector3(position.x, position.y, position.z), process)
        })
        process += step
      }
      mainGroup.rotation.y += delta * 0.2 // 每秒转 0.5 弧度（约 28.6°/秒
      composer.render()
      requestAnimationFrame(animate)
    }, 1000 / 60)
  }

  animate(0)

  return {
    changeStatus,
  }
}

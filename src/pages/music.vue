<script setup lang="ts" generic="T extends any, O extends any">
import { createParticles } from '../composables/useParticle'

const threeRef = useTemplateRef('threeRef')
const musicRef = useTemplateRef('musicRef')
let fn = null
async function musicParticle() {
  const audioContext = new AudioContext()
  const source = audioContext.createMediaElementSource(musicRef.value!)

  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 2048
  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  source.connect(analyser)
  analyser.connect(audioContext.destination)

  setInterval(() => {
    const points = new Float32Array(bufferLength * 3)
    analyser.getByteFrequencyData(dataArray)
    for (let i = 0; i < bufferLength; i++) {
      const amplitude = dataArray[i] / window.innerHeight
      points[i * 3] = i * 0.01 - 4
      points[i * 3 + 1] = amplitude * 4 - 0.4
      points[i * 3 + 2] = 0
    }
    fn(points)
  }, 60)

  return {
    analyser,
    dataArray,
  }
}

onMounted(async () => {
  const { startNextTransition } = await createParticles(threeRef.value!, {
    particleCount: 1000,
  })
  musicRef.value!.addEventListener('play', musicParticle)
  // startNextTransition()
  fn = startNextTransition
})
</script>

<template>
  <div ref="threeRef" />
  <audio ref="musicRef" src="/StayWithMe.mp3" controls @change="musicParticle" />
  <button @click="musicParticle">
    Music
  </button>
</template>

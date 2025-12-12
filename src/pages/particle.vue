<script setup lang="ts" generic="T extends any, O extends any">
import { createParticles } from '../composables/particle'

const threeRef = useTemplateRef('threeRef')

onMounted(() => {
  createParticles(threeRef.value!, 20000)
})
</script>

<template>
  <div ref="threeRef" />
</template>

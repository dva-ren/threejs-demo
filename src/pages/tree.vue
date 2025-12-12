<script setup lang="ts" generic="T extends any, O extends any">
import { main } from '../composables/tree'

const threeRef = useTemplateRef('threeRef')
let changeStatus: () => void

onMounted(() => {
  changeStatus = main(threeRef.value!, 100).changeStatus
})
</script>

<template>
  <button bg-pink left-0 top-0 fixed @click="changeStatus()">
    切换
  </button>
  <div ref="threeRef" />
</template>

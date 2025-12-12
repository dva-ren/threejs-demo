<script setup lang="ts" generic="T extends any, O extends any">
const router = useRouter()
</script>

<template>
  <div p-4 left-0 top-0 fixed>
    <template v-for="route in router.getRoutes()" :key="route.path">
      <div v-if="route.path !== '/' && route.name !== '/[...all]'" my-1>
        <RouterLink :to="route.path" my-1 px-2 rounded-xs bg-gray-200>
          {{ route.path }}
        </RouterLink>
      </div>
    </template>
  </div>
</template>

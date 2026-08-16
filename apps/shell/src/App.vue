<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@logistics/auth'

const authStore = useAuthStore()

onMounted(() => {
  authStore.restoreAuth()
})
</script>

<style>
#app {
  width: 100%;
  height: 100vh;
}
</style>

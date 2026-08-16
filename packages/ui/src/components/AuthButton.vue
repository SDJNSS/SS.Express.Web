<template>
  <button v-if="hasPermission" v-bind="$attrs">
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePermissionStore } from '@logistics/permission'

const props = defineProps<{
  permission?: string
}>()

const permissionStore = usePermissionStore()

const hasPermission = computed(() => {
  if (!props.permission) return true
  return permissionStore.hasPermission(props.permission)
})
</script>

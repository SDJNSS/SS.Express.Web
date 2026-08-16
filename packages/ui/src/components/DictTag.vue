<template>
  <span :class="['dict-tag', colorClass]">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDictStore } from '@logistics/dict'

const props = defineProps<{
  dictType: string
  value: string | number
}>()

const dictStore = useDictStore()

const label = computed(() => dictStore.getDictLabel(props.dictType, props.value))

const colorClass = computed(() => {
  const items = dictStore.getDict(props.dictType)
  const item = items.find(i => i.value === props.value)
  return item?.color || ''
})
</script>

<style scoped>
.dict-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}
</style>

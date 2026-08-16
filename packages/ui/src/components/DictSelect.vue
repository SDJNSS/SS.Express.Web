<template>
  <select v-model="selectedValue" v-bind="$attrs" @change="handleChange">
    <option value="">请选择</option>
    <option v-for="item in options" :key="item.value" :value="item.value">
      {{ item.label }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useDict } from '@logistics/dict'

const props = defineProps<{
  dictType: string
  modelValue?: string | number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
}>()

const options = computed(() => useDict(props.dictType))
const selectedValue = ref(props.modelValue || '')

watch(
  () => props.modelValue,
  val => {
    selectedValue.value = val || ''
  }
)

function handleChange() {
  emit('update:modelValue', selectedValue.value)
}
</script>

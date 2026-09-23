<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    value: number
    currency?: string
  }>(),
  { currency: 'CNY' },
)

const formatted = computed(() =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: props.currency,
    minimumFractionDigits: 2,
  }).format(props.value),
)
</script>

<template>
  <span class="money-text">{{ formatted }}</span>
</template>

<style scoped lang="scss">
.money-text {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
</style>

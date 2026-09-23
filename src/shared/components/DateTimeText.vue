<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'

const props = withDefaults(
  defineProps<{
    value: string | number | Date
    format?: string
  }>(),
  { format: 'YYYY-MM-DD HH:mm' },
)

const formatted = computed(() =>
  props.value === '' ? '—' : dayjs(props.value).format(props.format),
)
const dateTime = computed(() => (props.value === '' ? undefined : dayjs(props.value).toISOString()))
</script>

<template>
  <time :datetime="dateTime">{{ formatted }}</time>
</template>

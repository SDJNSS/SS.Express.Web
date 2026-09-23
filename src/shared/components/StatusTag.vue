<script setup lang="ts">
import { computed } from 'vue'
import type { TagProps } from 'element-plus'

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'primary'

const props = withDefaults(
  defineProps<{
    label?: string
    tone?: StatusTone
  }>(),
  { label: '—', tone: 'info' },
)

const tagType = computed<TagProps['type']>(() =>
  props.tone === 'primary' ? 'primary' : props.tone,
)
</script>

<template>
  <el-tag :type="tagType" effect="light" size="small">{{ label }}</el-tag>
</template>

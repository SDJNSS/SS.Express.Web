<script setup lang="ts">
import ExamConfigurationPageView from '../components/ExamConfigurationPageView.vue'
import { useExamConfiguration } from '../composables/useContentPages'

const { records, state, runtime, contextKey, papers } = useExamConfiguration()
</script>

<template>
  <ExamConfigurationPageView
    :key="contextKey"
    :records="records"
    :state="state"
    :runtime="runtime"
    :papers="papers"
  />
</template>

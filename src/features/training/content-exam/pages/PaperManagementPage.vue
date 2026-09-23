<script setup lang="ts">
import PaperManagementPageView from '../components/PaperManagementPageView.vue'
import { usePaperManagement } from '../composables/useContentPages'

const { records, state, runtime, contextKey, questions } = usePaperManagement()
</script>

<template>
  <PaperManagementPageView
    :key="contextKey"
    :records="records"
    :state="state"
    :runtime="runtime"
    :questions="questions"
  />
</template>
